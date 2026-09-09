"""Transform the generic asset DB (source.sqlite) into the normalized site DB (docs/schema.md).

Usage: python3 transform.py <source.sqlite> <anno.sqlite> [cdn_dir] [--langs english,german]
"""

import json
import os
import re
import sqlite3
import sys
import time
from collections import defaultdict
from pathlib import Path

GUID = re.compile(r"^\d{4,}$")
REGIONS = {"Roman": (1, "Latium"), "Celtic": (2, "Albion"), "Egyptian": (3, "Delta")}
BUILDING_KIND = [  # (template regex, kind); first match wins
    (r"^Production|^SlotFactory|^Slot_?Marsh|^Slot$", "Production"),
    (r"Residence|VillaUrban", "Residence"),
    (r"^CityInstitution", "City Watch"),
    (r"^PublicService|MiniInstitution", "Public Service"),
    (
        r"Harbor|Harbour|RepairCrane|Warehouse|TradeBuilding|GuestHouse|Transporter",
        "Harbour",
    ),
    (r"Military|Recruitment|UnitCamp", "Military"),
    (r"^Monument|Hippodrome", "Monument"),
    (r"Aqueduct", "Aqueduct"),
    (r"Marsh|Irrigation|Canal", "Marsh"),
    (r"^Street", "Road"),
]
EXCLUDED_BUILDINGS = r"^Ornamental|^PolygonObject|^Hedge|^QuestLighthouse|^DEPRECATED|^Pirate|^SimpleBuilding|^TestData"
QUEST_TEMPLATES = {
    "StoryLine",
    "QuestLine",
    "Sequence",
    "SequenceCharNotif",
    "Objective",
    "Decision",
    "DecisionRoot",
    "Exit",
    "Function",
    "FunctionImmediate",
    "Loop",
    "Starter",
    "StateChecker",
    "DenyAndExit",
    "Success",
    "TextPopup",
    "ComplexCombination",
    "DummySequenceAsset",
}
REWARD_ACTIONS = {
    "ActionAddGoodsToItemContainer",
    "ActionAddItemToMetaStorage",
    "ActionUnlockAsset",
    "ActionChangeReputation",
    "ActionEffect",
    "ActionTriggerParticipantMessage",
}


class T:
    def __init__(self, src, out, icons_dir, langs=None):
        self.langs = set(langs) if langs else None
        self.src = sqlite3.connect(src)
        self.assets = {}
        for g, tpl, name, tid, icon, js in self.src.execute(
            "select guid,template,name,text_id,icon,json from assets"
        ):
            self.assets[g] = {
                "guid": g,
                "template": tpl,
                "name": name,
                "text_id": tid,
                "icon": icon,
                "v": json.loads(js),
            }
        self.refs_to = defaultdict(list)  # to -> [(from, path)]
        for f, p, t in self.src.execute("select from_guid,path,to_guid from refs"):
            self.refs_to[t].append((f, p))
        self.icons_dir = icons_dir
        self.used_texts = set()
        self.enums = defaultdict(set)
        self.attributes = {}
        self.conditions = []
        if os.path.exists(out):
            os.unlink(out)
        self.db = sqlite3.connect(out)
        self.db.executescript(SCHEMA)

    # ---- helpers -------------------------------------------------------------------------------------------
    def by_template(self, *tpls):
        return [a for a in self.assets.values() if a["template"] in tpls]

    def text(self, tid):
        if tid in (None, ""):
            return None
        try:
            tid = int(tid)
        except (TypeError, ValueError):
            return None  # a variable name, not a line id
        self.used_texts.add(str(tid))
        return tid

    def num(self, x, default=None):
        try:
            return float(x) if "." in str(x) else int(x)
        except (TypeError, ValueError):
            return default

    def icon(self, path):
        """CDN path of an asset icon: the game's own icon path, as written by data-extractor/publish.py."""
        if not path:
            return None
        k = path.replace("\\", "/").rsplit(".", 1)[0] + ".png"
        if self.icons_dir and not os.path.exists(os.path.join(self.icons_dir, k)):
            return None
        return k

    def region(self, v):
        """single region id from an AssociatedRegions string; None when multi/none."""
        parts = [r for r in str(v or "").split(";") if r in REGIONS]
        return REGIONS[parts[0]][0] if len(parts) == 1 else None

    def enum(self, name, value):
        if value is None:
            return None
        self.enums[name].add(str(value))
        return str(value)

    def attribute(self, key):
        if key not in self.attributes:
            self.attributes[key] = len(self.attributes) + 1
        return self.attributes[key]

    def flatten_pool(self, g, seen=None):
        seen = seen if seen is not None else set()
        a = self.assets.get(int(g)) if GUID.match(str(g)) else None
        if a is None or a["guid"] in seen:
            return set()
        seen.add(a["guid"])
        if a["template"] != "AssetPool":
            return {a["guid"]}
        out = set()
        for it in self.items(D(a["v"].get("AssetPool")).get("AssetList")):
            out |= self.flatten_pool(it.get("Asset"), seen)
        return out

    def items(self, x):
        return [i for i in x if isinstance(i, dict)] if isinstance(x, list) else []

    def condition(self, owner_kind, owner_id, node, parent_id=None):
        """Store a PreCondition/TriggerCondition tree as condition rows; returns root condition id."""
        if not isinstance(node, dict):
            return None
        # PreConditionList keeps its first condition and the remaining conditions
        # as siblings. Accept either the wrapper or a bare condition so callers do
        # not accidentally discard the sibling list.
        if not node.get("Template") and (
            "Condition" in node or "SubConditions" in node
        ):
            condition_node = node.get("Condition") or {"Template": "ConditionAlwaysTrue"}
            sibling_nodes = node.get("SubConditions")
        else:
            condition_node = node
            sibling_nodes = None
        if not isinstance(condition_node, dict):
            return None
        tpl = condition_node.get("Template")
        vals = D(condition_node.get("Values")) or condition_node
        negate = (
            1
            if D(vals.get("ConditionPropsNegatable")).get("NegateCondition") == "1"
            else 0
        )
        cid = len(self.conditions) + 1
        self.conditions.append((cid, owner_kind, owner_id, tpl, negate, parent_id))
        body = (
            vals.get(tpl)
            if tpl and isinstance(vals.get(tpl), dict)
            else {k: v for k, v in vals.items() if k != "Condition"}
        )
        for k, v in self.walk_leaves(body or {}):
            self.db.execute("insert into condition_param values(?,?,?)", (cid, k, v))
        subconditions = sibling_nodes if sibling_nodes is not None else vals.get("SubConditions")
        for sub in self.items(subconditions):
            sc = sub.get("SubCondition") if isinstance(sub, dict) else None
            if isinstance(sc, dict):
                inner = D(D(sc.get("Values")).get("PreConditionList"))
                if not inner:
                    inner = D(sc.get("PreConditionList"))
                self.condition(owner_kind, owner_id, inner or sc, parent_id=cid)
        return cid

    def walk_leaves(self, o, path=""):
        if isinstance(o, dict):
            for k, v in o.items():
                yield from self.walk_leaves(v, f"{path}.{k}" if path else k)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                yield from self.walk_leaves(v, f"{path}[{i}]")
        elif o is not None:
            yield path, str(o)

    def walk_dicts(self, o):
        if isinstance(o, dict):
            yield o
            for v in o.values():
                yield from self.walk_dicts(v)
        elif isinstance(o, list):
            for v in o:
                yield from self.walk_dicts(v)

    # ---- lookups -------------------------------------------------------------------------------------------
    def lookups(self):
        for key, (rid, name) in REGIONS.items():
            self.db.execute("insert into region values(?,?,?)", (rid, key, name))
        for a in self.by_template("UplayProduct"):
            u = D(a["v"].get("UplayProduct"))
            if u.get("ProductType", "DLC") == "DLC" or "DLC" in (a["name"] or ""):
                self.db.execute(
                    "insert into dlc values(?,?,?,?)",
                    (
                        a["guid"],
                        a["v"]["Standard"].get("ID"),
                        self.text(a["text_id"]),
                        self.icon(a["icon"]),
                    ),
                )
        for a in self.by_template("PopulationLevel"):
            p = D(a["v"].get("PopulationLevel"))
            tier = self.num(
                str(p.get("PopulationTier", "Level1")).replace("Level", ""), 1
            )
            wf = self.num(p.get("ConnectedWorkforce"))
            reg = None
            for r in REGIONS:
                if r in (a["name"] or ""):
                    reg = REGIONS[r][0]
            self.db.execute(
                "insert into population_level values(?,?,?,?,?,?)",
                (
                    a["guid"],
                    self.text(a["text_id"]),
                    self.icon(a["icon"]),
                    tier,
                    reg,
                    wf,
                ),
            )

    # ---- products / needs ----------------------------------------------------------------------------------
    def products(self):
        for a in self.by_template("Product"):
            p = D(a["v"].get("Product"))
            self.db.execute(
                "insert into product values(?,?,?,?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(a["text_id"]),
                    self.icon(a["icon"]),
                    self.text(p.get("ProductCategory")),
                    self.num(p.get("BasePrice")),
                    self.enum("storage_level", p.get("StorageLevel")),
                    self.enum("transport_type", p.get("TransportGoodsType")),
                ),
            )
            for r in str(p.get("AssociatedRegion") or "").split(";"):
                if r in REGIONS:
                    self.db.execute(
                        "insert into product_region values(?,?)",
                        (a["guid"], REGIONS[r][0]),
                    )
        for a in self.by_template("Need"):
            n = D(a["v"].get("Need"))
            self.db.execute(
                "insert into need values(?,?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(a["text_id"]),
                    self.num(n.get("NeedProduct")),
                    self.enum("need_category", n.get("NeedCategoryType")),
                    self.text(n.get("NeedDescription")),
                ),
            )
            for k, v in D(n.get("NeedAttributes")).items():
                self.db.execute(
                    "insert into need_attribute values(?,?,?)",
                    (a["guid"], self.attribute(k), self.num(D(v).get("Value"), 0)),
                )

    # ---- buildings -----------------------------------------------------------------------------------------
    def buildings(self):
        for a in self.assets.values():
            v = a["v"]
            if (
                "Building" not in v
                or "Constructable" not in v
                or re.search(EXCLUDED_BUILDINGS, a["template"] or "")
            ):
                continue
            if v.get("Building", {}).get("BuildingType") == "BuildingModule":
                continue
            kind = next(
                (k for rx, k in BUILDING_KIND if re.search(rx, a["template"] or "")),
                "Other",
            )
            b, std, es, h = (
                D(v["Building"]),
                D(v["Standard"]),
                D(v.get("EffectSource")),
                D(v.get("Health")),
            )
            self.db.execute(
                "insert into building values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(a["text_id"]),
                    self.text(std.get("InfoDescription")),
                    self.icon(a["icon"]),
                    a["template"],
                    self.enum("building_kind", kind),
                    self.enum("building_type", b.get("BuildingType")),
                    self.text(b.get("BuildingCategoryName")),
                    self.region(b.get("AssociatedRegions")),
                    self.num(es.get("RadiusDistance")),
                    self.num(es.get("StreetDistance")),
                    self.num(h.get("BaseHealth")),
                    self.num(D(v.get("AttributeProvider")).get("Population")),
                ),
            )
            for r in str(b.get("AssociatedRegions") or "").split(";"):
                if r in REGIONS:
                    self.db.execute(
                        "insert into building_region values(?,?)",
                        (a["guid"], REGIONS[r][0]),
                    )
            for c in self.items(D(v.get("Cost")).get("Costs")):
                if self.num(c.get("Amount"), 0):
                    self.db.execute(
                        "insert into building_cost values(?,?,?)",
                        (a["guid"], self.num(c["Ingredient"]), self.num(c["Amount"])),
                    )
            for m in self.items(D(v.get("Maintenance")).get("Maintenances")):
                if self.num(m.get("Amount"), 0):
                    self.db.execute(
                        "insert into building_maintenance values(?,?,?)",
                        (a["guid"], self.num(m["Product"]), self.num(m["Amount"])),
                    )
            for fe in self.items(b.get("FunctionalEffects")):
                if self.num(fe.get("FunctionalEffect")):
                    self.db.execute(
                        "insert into building_effect values(?,?,?)",
                        (a["guid"], self.num(fe["FunctionalEffect"]), "adjacency"),
                    )
            ps = D(v.get("PublicService")).get("PublicServiceEffect")
            if self.num(ps):
                self.db.execute(
                    "insert into building_effect values(?,?,?)",
                    (a["guid"], self.num(ps), "service"),
                )
            fb = v.get("FactoryBase")
            if "FactoryBase" in v:
                fb = D(fb)
                self.db.execute(
                    "insert into factory values(?,?,?,?)",
                    (
                        a["guid"],
                        self.num(fb.get("CycleTime"), 30),
                        self.num(fb.get("BaseProductivity"), 100),
                        self.num(fb.get("MaxTransporterRange")),
                    ),
                )
                for tbl, key in (
                    ("factory_input", "FactoryInputs"),
                    ("factory_output", "FactoryOutputs"),
                ):
                    for i in self.items(fb.get(key)):
                        if self.num(i.get("Product")):
                            self.db.execute(
                                f"insert into {tbl} values(?,?,?,?)",
                                (
                                    a["guid"],
                                    self.num(i["Product"]),
                                    self.num(i.get("Amount"), 1),
                                    self.num(i.get("StorageAmount")),
                                ),
                            )
            r7 = v.get("Residence7")
            if "Residence7" in v:
                r7 = D(r7)
                up = next(
                    iter(self.items(D(v.get("Upgradable")).get("PossibleUpgrades"))), {}
                )
                self.db.execute(
                    "insert into residence values(?,?,?)",
                    (
                        a["guid"],
                        self.num(r7.get("PopulationLevel")),
                        self.num(up.get("UpgradeGUID")),
                    ),
                )
                for c in self.items(up.get("Cost")):
                    if self.num(c.get("Amount"), 0):
                        self.db.execute(
                            "insert into residence_upgrade_cost values(?,?,?)",
                            (
                                a["guid"],
                                self.num(c["Ingredient"]),
                                self.num(c["Amount"]),
                            ),
                        )
                for n in self.items(r7.get("NeedsList")):
                    if self.num(n.get("Need")):
                        self.db.execute(
                            "insert into residence_need values(?,?,?,?)",
                            (
                                a["guid"],
                                self.num(n["Need"]),
                                self.num(n.get("NeedConsumptionRate")),
                                1 if n.get("IsOnlyAvailableThroughBuff") == "1" else 0,
                            ),
                        )
        for a in self.by_template("ProductionChain"):
            pc = D(a["v"].get("ProductionChain"))
            root = self.num(pc.get("Building"))
            self.db.execute(
                "insert into production_chain values(?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(a["text_id"]),
                    self.icon(a["icon"]),
                    root,
                ),
            )
            self._chain_nodes(a["guid"], pc, None, 0)

    def _chain_nodes(self, chain, node, parent, tier):
        nid = self.db.execute(
            "insert into production_chain_node(chain_guid,parent_id,building_guid,tier) values(?,?,?,?) returning id",
            (chain, parent, self.num(node.get("Building")), tier),
        ).fetchone()[0]
        for k in ("Tier1", "Tier2", "Tier3", "Tier4", "Tier5"):
            for child in self.items(node.get(k)):
                self._chain_nodes(chain, child, nid, tier + 1)

    # ---- effects & buffs -----------------------------------------------------------------------------------
    def effects(self):
        for a in self.by_template("Effect"):
            e = D(a["v"].get("Effect"))
            self.db.execute(
                "insert into effect values(?,?,?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(a["text_id"]),
                    self.text(a["v"]["Standard"].get("InfoDescription")),
                    self.enum("effect_scope", e.get("EffectScope")),
                    self.enum("source_category", e.get("SourceCategory")),
                    1 if e.get("ExcludeEffectSourceGUID") == "1" else 0,
                ),
            )
            for b in self.items(e.get("Buffs")):
                if self.num(b.get("GUID")):
                    self.db.execute(
                        "insert into effect_buff values(?,?)",
                        (a["guid"], self.num(b["GUID"])),
                    )
            for t in self.items(e.get("Targets")):
                if self.num(t.get("GUID")):
                    self.db.execute(
                        "insert into effect_target_pool values(?,?)",
                        (a["guid"], self.num(t["GUID"])),
                    )
            # who grants it: any non-effect/buff asset referencing this effect
            for f, path in self.refs_to[a["guid"]]:
                src = self.assets[f]
                if src["template"] in (
                    "Effect",
                    "BuildingBuff",
                    "AreaBuff",
                    "ShipBuff",
                    "TroopBuff",
                    "DefenseBuildingBuff",
                    "WarehouseBuff",
                    "MetaBuff",
                    "ForwardBuff",
                ):
                    continue
                self.db.execute(
                    "insert or ignore into effect_source values(?,?,?)",
                    (a["guid"], src["template"], f),
                )
        for a in self.assets.values():
            if not (a["template"] or "").endswith("Buff") or "Buff" not in a["v"]:
                continue
            self.db.execute(
                "insert into buff values(?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(a["text_id"]),
                    self.icon(a["icon"]),
                    self.enum(
                        "source_category", D(a["v"]["Buff"]).get("SourceCategory")
                    ),
                ),
            )
            for prop, body in a["v"].items():
                if (
                    not prop.endswith("Upgrade")
                    and prop != "RaceTrackUpgrades"
                    or not isinstance(body, dict)
                ):
                    continue
                for path, val in self.walk_leaves(body, prop):
                    if path.endswith(".Value") or path.endswith(
                        "AmountOrPercent.Value"
                    ):
                        base = path[: -len(".Value")]
                        pct = 1 if dict_get(a["v"], base + ".Percental") == "1" else 0
                        attr = re.search(
                            r"AdditionalAttributes\.(\w+)|NeedAttributes\.(\w+)", base
                        )
                        attr_id = (
                            self.attribute(next(g for g in attr.groups() if g))
                            if attr
                            else None
                        )
                        self.db.execute(
                            "insert into buff_modifier values(?,?,?,?,?)",
                            (
                                a["guid"],
                                base.replace(".AmountOrPercent", ""),
                                attr_id,
                                self.num(val, 0),
                                pct,
                            ),
                        )
                    elif path.endswith("AdditionalFunctionalEffect") and self.num(val):
                        self.db.execute(
                            "insert into buff_functional_effect values(?,?)",
                            (a["guid"], self.num(val)),
                        )

    # ---- items ---------------------------------------------------------------------------------------------
    def items_(self):
        for a in self.by_template("Item", "ItemWithBoost", "ItemWithUI", "ItemQuest"):
            it, e = D(a["v"].get("Item")), a["v"].get("Effect")
            eff_guid = (
                a["guid"] if e else None
            )  # the item asset itself carries the Effect property
            if e:
                self.db.execute(
                    "insert or ignore into effect values(?,?,?,?,?,?,?)",
                    (
                        a["guid"],
                        a["name"],
                        self.text(a["text_id"]),
                        None,
                        self.enum("effect_scope", e.get("EffectScope")),
                        self.enum("source_category", e.get("SourceCategory")),
                        0,
                    ),
                )
                for b in self.items(e.get("Buffs")):
                    if self.num(b.get("GUID")):
                        self.db.execute(
                            "insert or ignore into effect_buff values(?,?)",
                            (a["guid"], self.num(b["GUID"])),
                        )
                for t in self.items(e.get("Targets")):
                    if self.num(t.get("GUID")):
                        self.db.execute(
                            "insert or ignore into effect_target_pool values(?,?)",
                            (a["guid"], self.num(t["GUID"])),
                        )
                self.db.execute(
                    "insert or ignore into effect_source values(?,?,?)",
                    (a["guid"], a["template"], a["guid"]),
                )
            boost = D(a["v"].get("ItemWithBoost"))
            self.db.execute(
                "insert into item values(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(a["text_id"]),
                    self.text(a["v"]["Standard"].get("InfoDescription")),
                    self.icon(a["icon"]),
                    a["template"],
                    self.enum("rarity", it.get("Rarity")),
                    self.enum("niche", it.get("Niche")),
                    self.enum("item_type", it.get("ItemType")),
                    self.enum("allocation", it.get("Allocation")),
                    self.num(it.get("TradePrice")),
                    eff_guid,
                    self.text(boost.get("BoostHint")),
                ),
            )
            for b in self.items(boost.get("BoostBuffs")):
                if self.num(b.get("GUID")):
                    self.db.execute(
                        "insert into item_boost_buff values(?,?)",
                        (a["guid"], self.num(b["GUID"])),
                    )
            bc = D(
                D(D(boost.get("BoostCondition")).get("Values")).get("PreConditionList")
            )
            if bc.get("Condition"):
                self.db.execute(
                    "insert into item_boost_condition values(?,?)",
                    (a["guid"], self.condition("item", a["guid"], bc)),
                )
            for f, path in self.refs_to[a["guid"]]:
                src = self.assets[f]
                if src["template"] in ("RewardPool", "HallOfFameItem") or src[
                    "template"
                ].startswith("Participant"):
                    self.db.execute(
                        "insert or ignore into item_source values(?,?,?)",
                        (a["guid"], src["template"], f),
                    )

    # ---- techs & unlocks -----------------------------------------------------------------------------------
    def techs(self):
        for a in self.by_template("Tech"):
            t = D(a["v"].get("Tech"))
            gp = D(t.get("GridPosition"))
            self.db.execute(
                "insert into tech values(?,?,?,?,?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(t.get("TechName")),
                    self.text(t.get("TechDescription")),
                    self.icon(a["icon"]),
                    self.num(t.get("KnowledgeNeeded")),
                    1 if t.get("IsGate") == "1" else 0,
                    self.num(gp.get("X"), 0),
                    self.num(gp.get("Y"), 0),
                ),
            )
            rw = D(t.get("Rewards"))
            for u in self.items(rw.get("Unlocks")):
                for g in self.flatten_pool(u.get("UnlockReward")):
                    self.db.execute(
                        "insert or ignore into tech_unlock values(?,?)", (a["guid"], g)
                    )
            for e in self.items(rw.get("Effects")):
                if self.num(e.get("EffectAsset")):
                    self.db.execute(
                        "insert into tech_effect values(?,?)",
                        (a["guid"], self.num(e["EffectAsset"])),
                    )
            for r in self.items(rw.get("Resources")):
                if self.num(r.get("Resource")):
                    self.db.execute(
                        "insert into tech_resource values(?,?,?)",
                        (
                            a["guid"],
                            self.num(r["Resource"]),
                            self.num(r.get("Amount"), 1),
                        ),
                    )
            trig = self.assets.get(self.num(t.get("TechResearchableTrigger")))
            if trig and D(trig["v"].get("Trigger")).get("TriggerCondition"):
                self.db.execute(
                    "insert into tech_requirement values(?,?)",
                    (
                        a["guid"],
                        self.condition(
                            "tech", a["guid"], trig["v"]["Trigger"]["TriggerCondition"]
                        ),
                    ),
                )
        # every ActionUnlockAsset anywhere
        for a in self.assets.values():
            trig_cond = D(a["v"].get("Trigger")).get("TriggerCondition")
            cid = None
            for d in self.walk_dicts(a["v"]):
                if "ActionUnlockAsset" not in d:
                    continue
                act = D(d.get("ActionUnlockAsset"))
                if cid is None and trig_cond:
                    cid = self.condition("unlock", a["guid"], trig_cond)
                for it in self.items(act.get("UnlockAssets")):
                    for g in self.flatten_pool(it.get("Asset")):
                        self.db.execute(
                            "insert or ignore into unlock values(?,?,?,?)",
                            (g, a["template"], a["guid"], cid),
                        )

    # ---- quests --------------------------------------------------------------------------------------------
    def quests(self):
        for a in self.by_template("QuestPool"):
            self.db.execute(
                "insert into quest_pool values(?,?)", (a["guid"], a["name"])
            )
            for s in self.items(D(a["v"].get("QuestPool")).get("StoryLines")):
                if self.num(s.get("StoryLine")):
                    self.db.execute(
                        "insert into quest_pool_storyline values(?,?,?)",
                        (
                            a["guid"],
                            self.num(s["StoryLine"]),
                            self.num(s.get("Weight"), 1),
                        ),
                    )
        node_story = {}
        for a in self.by_template("StoryLine"):
            sl = D(a["v"].get("StoryLine"))
            self.db.execute(
                "insert into storyline values(?,?,?)",
                (a["guid"], a["name"], self.enum("storyline_system", sl.get("System"))),
            )
            vc = D(
                D(D(sl.get("StorylineVariables")).get("Values")).get(
                    "ConditionVariableConfiguration"
                )
            )
            for kind in (
                "IntVariables",
                "FloatVariables",
                "AssetVariables",
                "BoolVariables",
            ):
                for var in self.items(vc.get(kind)):
                    if var.get("Name"):
                        self.db.execute(
                            "insert into storyline_variable values(?,?,?,?)",
                            (
                                a["guid"],
                                var["Name"],
                                kind[:-9].lower(),
                                var.get("StartValue"),
                            ),
                        )
            pc = D(a["v"].get("PreConditionList"))
            if pc.get("Condition"):
                self.db.execute(
                    "insert into storyline_condition values(?,?)",
                    (
                        a["guid"],
                        self.condition("storyline", a["guid"], pc),
                    ),
                )
            # BFS over Component references
            queue, seen = [a["guid"]], set()
            while queue:
                g = queue.pop(0)
                if g in seen or g not in self.assets:
                    continue
                seen.add(g)
                node_story.setdefault(g, a["guid"])
                for path, val in self.walk_leaves(self.assets[g]["v"]):
                    if (
                        path.endswith("Component")
                        and self.num(val) in self.assets
                        and self.assets[self.num(val)]["template"] in QUEST_TEMPLATES
                    ):
                        m = re.search(r"\[(\d+)\]", path)
                        kind = re.sub(r"\[\d+\]", "", path).removesuffix(".Component")
                        idx = int(m.group(1)) if m else None
                        self.db.execute(
                            "insert or ignore into quest_edge values(?,?,?,?,?)",
                            (
                                g,
                                self.num(val),
                                kind,
                                idx,
                                (
                                    idx
                                    if kind == "DecisionRoot.DecisionRootOutput.Output"
                                    else None
                                ),
                            ),
                        )
                        queue.append(self.num(val))
        for a in self.by_template("QuestEntry"):
            q = D(a["v"].get("QuestEntry"))
            self.db.execute(
                "insert into quest values(?,?,?,?,?,?,?)",
                (
                    a["guid"],
                    a["name"],
                    self.text(q.get("QuestName")),
                    self.text(q.get("SummaryText")),
                    self.enum("quest_category", q.get("Category", "Quests")),
                    self.icon(a["icon"]),
                    None,
                ),
            )
        for g, story in node_story.items():
            a, v = self.assets[g], self.assets[g]["v"]
            obj = D(
                D(D(D(v.get("Objective")).get("Objective")).get("Values")).get(
                    "ConditionQuestObjective"
                )
            )
            starter = D(
                D(D(D(v.get("Starter")).get("StarterObjectConfig")).get("Values")).get(
                    "ConditionQuestObjective"
                )
            )
            cq = obj or starter
            dsc = D(D(v.get("Decision")).get("DecisionScreenConfig"))
            quest = self.num(cq.get("LinkedQuestEntry"))
            self.db.execute(
                "insert into quest_node values(?,?,?,?,?,?,?,?,?)",
                (
                    g,
                    story,
                    self.enum("node_type", a["template"]),
                    a["name"],
                    quest,
                    self.text(dsc.get("Headline") or cq.get("ObjectiveTextHeadline")),
                    self.text(
                        D(dsc.get("Text")).get("Value") or cq.get("ObjectiveTextFull")
                    ),
                    self.text(cq.get("ObjectiveTextStep")),
                    self.num(D(v.get("Objective")).get("ObjectiveTimeLimit")),
                ),
            )
            if quest:
                self.db.execute(
                    "update quest set storyline_guid=? where guid=? and storyline_guid is null",
                    (story, quest),
                )
            for i, opt in enumerate(
                self.items(D(v.get("Decision")).get("DecisionOptions"))
            ):
                self.db.execute(
                    "insert into quest_option values(?,?,?,?)",
                    (
                        g,
                        i,
                        self.text(opt.get("OptionText")),
                        self.enum("option_category", opt.get("Category")),
                    ),
                )
            for rw in self.items(D(v.get("Reward")).get("RewardAssets")):
                if self.num(rw.get("Reward")):
                    self.db.execute(
                        "insert into quest_reward values(?,?,?,?,?)",
                        (
                            g,
                            "item",
                            self.num(rw["Reward"]),
                            self.num(rw.get("Amount"), 1),
                            None,
                        ),
                    )
            for d in self.walk_dicts(D(v.get("Sequence"))):
                for act in REWARD_ACTIONS & set(d):
                    self._reward(g, act, d[act])
        # nodes that only touch a quest via journal updates
        for g, story in node_story.items():
            for d in self.walk_dicts(self.assets[g]["v"]):
                if "ActionUpdateQuestEntry" in d and self.num(
                    D(d["ActionUpdateQuestEntry"]).get("QuestEntry")
                ):
                    q = self.num(D(d["ActionUpdateQuestEntry"]).get("QuestEntry"))
                    self.db.execute(
                        "update quest_node set quest_guid=? where guid=? and quest_guid is null",
                        (q, g),
                    )
                    self.db.execute(
                        "update quest set storyline_guid=? where guid=? and storyline_guid is null",
                        (story, q),
                    )

    def _reward(self, node, act, body):
        body = D(body)

        def amt(x):
            x = x if isinstance(x, dict) else {"Value": x}
            return (
                (None, x.get("Value"))
                if x.get("IsVariable") == "1"
                else (self.num(x.get("Value")), None)
            )

        if act == "ActionAddGoodsToItemContainer":
            for gd in self.items(body.get("Goods")):
                a, var = amt(gd.get("Amount"))
                self.db.execute(
                    "insert into quest_reward values(?,?,?,?,?)",
                    (node, "goods", self.num(D(gd.get("Good")).get("Value")), a, var),
                )
        elif act == "ActionChangeReputation":
            a, var = amt(body.get("Amount"))
            self.db.execute(
                "insert into quest_reward values(?,?,?,?,?)",
                (node, "reputation", None, a, var),
            )
        elif act == "ActionEffect":
            self.db.execute(
                "insert into quest_reward values(?,?,?,?,?)",
                (node, "effect", self.num(body.get("EffectAsset")), None, None),
            )
        elif act == "ActionUnlockAsset":
            for it in self.items(body.get("UnlockAssets")):
                for g in self.flatten_pool(it.get("Asset")):
                    self.db.execute(
                        "insert into quest_reward values(?,?,?,?,?)",
                        (node, "unlock", g, None, None),
                    )
        elif act == "ActionAddItemToMetaStorage":
            for it in self.items(body.get("Items")):
                self.db.execute(
                    "insert into quest_reward values(?,?,?,?,?)",
                    (
                        node,
                        "item",
                        self.num(D(it.get("Item")).get("Value") or it.get("Item")),
                        1,
                        None,
                    ),
                )
        elif act == "ActionTriggerParticipantMessage":
            for it in self.items(body.get("RewardList")):
                a, var = amt(it.get("Amount"))
                self.db.execute(
                    "insert into quest_reward values(?,?,?,?,?)",
                    (
                        node,
                        "message_reward",
                        self.num(D(it.get("Asset")).get("Value")),
                        a,
                        var,
                    ),
                )

    # ---- finish --------------------------------------------------------------------------------------------
    def finish(self):
        for k, v in self.attributes.items():
            self.db.execute("insert into attribute values(?,?)", (v, k))
        for name, vals in self.enums.items():
            for v in sorted(vals):
                self.db.execute("insert into enum_value values(?,?)", (name, v))
        self.db.executemany(
            "insert into condition values(?,?,?,?,?,?)", self.conditions
        )
        q = ",".join("?" * len(self.used_texts))
        langs = {}
        for lid, lang, val in self.src.execute(
            f"select line_id,lang,text from texts where line_id in ({q})",
            list(self.used_texts),
        ):
            if self.langs and lang not in self.langs:
                continue
            if lang not in langs:
                langs[lang] = len(langs) + 1
                self.db.execute("insert into lang values(?,?)", (langs[lang], lang))
            self.db.execute(
                "insert into translation values(?,?,?)", (int(lid), langs[lang], val)
            )
        # pools referenced by effects, flattened once
        for (pool,) in self.db.execute(
            "select distinct pool_guid from effect_target_pool"
        ).fetchall():
            for g in self.flatten_pool(pool):
                self.db.execute("insert into pool_member values(?,?)", (pool, g))
        self.db.commit()
        self.db.execute("vacuum")
        self.db.commit()
        for (t,) in self.db.execute(
            "select name from sqlite_master where type='table' order by 1"
        ):
            print(
                f"{t:<28}{self.db.execute(f'select count(*) from {t}').fetchone()[0]:>8}"
            )


def D(x):
    return x if isinstance(x, dict) else {}


def dict_get(o, path):
    for part in re.split(r"\.|\[|\]", path):
        if part == "":
            continue
        try:
            o = o[int(part)] if isinstance(o, list) else o.get(part)
        except (AttributeError, IndexError, ValueError):
            return None
        if o is None:
            return None
    return o


def build_site_db(src, out, icons_dir=None, langs=None):
    """Build and validate beside the destination, then replace it atomically."""
    target = Path(out)
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = target.with_name(f".{target.name}.{os.getpid()}.tmp")
    staging.unlink(missing_ok=True)
    transformer = None
    try:
        transformer = T(src, staging, icons_dir, langs)
        for step in (
            transformer.lookups,
            transformer.products,
            transformer.buildings,
            transformer.effects,
            transformer.items_,
            transformer.techs,
            transformer.quests,
            transformer.finish,
        ):
            step()
        integrity = transformer.db.execute("pragma integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {integrity}")
        foreign_key_errors = transformer.db.execute("pragma foreign_key_check").fetchall()
        if foreign_key_errors:
            raise RuntimeError(f"SQLite foreign-key check found {len(foreign_key_errors)} violation(s)")
        transformer.db.close()
        transformer.src.close()
        transformer = None
        last_error = None
        for delay in (0.0, 0.1, 0.25, 0.5, 1.0):
            if delay:
                time.sleep(delay)
            try:
                os.replace(staging, target)
                break
            except PermissionError as exc:
                last_error = exc
        else:
            raise last_error
        print(f"validated -> {target}")
    except Exception:
        if transformer is not None:
            transformer.db.close()
            transformer.src.close()
        staging.unlink(missing_ok=True)
        raise


SCHEMA = """
create table region(id integer primary key, key text, name text);
create table dlc(guid integer primary key, key text, name_text integer, icon text);
create table population_level(guid integer primary key, name_text integer, icon text, tier int, region_id int references region(id), workforce_product_guid int);
create table attribute(id integer primary key, key text unique);
create table enum_value(name text, value text, primary key(name,value));
create view enum as select name,value from enum_value;
create table lang(id integer primary key, code text);
create table translation(line_id integer, lang_id integer references lang(id), value text, primary key(line_id,lang_id)) without rowid;
create view text as select line_id,lang_id,value from translation;

create table product(guid integer primary key, name text, name_text integer, icon text, category_text integer, base_price real, storage_level text, transport_type text);
create table product_region(product_guid int references product(guid), region_id int references region(id), primary key(product_guid,region_id));
create table need(guid integer primary key, name text, name_text integer, product_guid int references product(guid), category text, description_text integer);
create table need_attribute(need_guid int references need(guid), attribute_id int references attribute(id), value real);

create table building(guid integer primary key, name text, name_text integer, description_text integer, icon text, template text, kind text, building_type text,
  category_text integer, region_id int references region(id), radius int, street_radius int, health int, population_level_guid int references population_level(guid));
create table building_region(building_guid int references building(guid), region_id int references region(id), primary key(building_guid,region_id));
create table building_cost(building_guid int references building(guid), product_guid int references product(guid), amount real);
create table building_maintenance(building_guid int references building(guid), product_guid int references product(guid), amount real);
create table building_effect(building_guid int references building(guid), effect_guid int, kind text);
create table factory(building_guid integer primary key references building(guid), cycle_time real, base_productivity real, transporter_range int);
create table factory_input(building_guid int references building(guid), product_guid int references product(guid), amount real, storage int);
create table factory_output(building_guid int references building(guid), product_guid int references product(guid), amount real, storage int);
create table residence(building_guid integer primary key references building(guid), population_level_guid int references population_level(guid), upgrade_to_guid int);
create table residence_need(building_guid int references building(guid), need_guid int references need(guid), consumption_rate real, buff_only int);
create table residence_upgrade_cost(building_guid int references building(guid), product_guid int references product(guid), amount real);
create table production_chain(guid integer primary key, name text, name_text integer, icon text, building_guid int references building(guid));
create table production_chain_node(id integer primary key, chain_guid int references production_chain(guid), parent_id int, building_guid int, tier int);

create table effect(guid integer primary key, name text, name_text integer, description_text integer, scope text, source_category text, exclude_source int);
create table effect_buff(effect_guid int references effect(guid), buff_guid int, primary key(effect_guid,buff_guid));
create table effect_target_pool(effect_guid int references effect(guid), pool_guid int, primary key(effect_guid,pool_guid));
create table pool_member(pool_guid int, asset_guid int, primary key(pool_guid,asset_guid)) without rowid;
create view effect_target as select etp.effect_guid, pm.asset_guid building_guid from effect_target_pool etp join pool_member pm using(pool_guid);
create table effect_source(effect_guid int references effect(guid), source_kind text, source_guid int, primary key(effect_guid,source_guid)) without rowid;
create table buff(guid integer primary key, name text, name_text integer, icon text, source_category text);
create table buff_modifier(buff_guid int references buff(guid), path text, attribute_id int references attribute(id), value real, is_percent int);
create table buff_functional_effect(buff_guid int references buff(guid), effect_guid int);

create table item(guid integer primary key, name text, name_text integer, description_text integer, icon text, template text, rarity text, niche text, item_type text,
  allocation text, trade_price real, effect_guid int references effect(guid), boost_hint_text integer);
create table item_boost_buff(item_guid int references item(guid), buff_guid int references buff(guid));
create table item_boost_condition(item_guid int references item(guid), condition_id int);
create table item_source(item_guid int references item(guid), source_kind text, source_guid int, primary key(item_guid,source_guid)) without rowid;

create table tech(guid integer primary key, name text, name_text integer, description_text integer, icon text, knowledge_needed real, is_gate int, grid_x int, grid_y int);
create table tech_unlock(tech_guid int references tech(guid), asset_guid int, primary key(tech_guid,asset_guid));
create table tech_effect(tech_guid int references tech(guid), effect_guid int);
create table tech_resource(tech_guid int references tech(guid), product_guid int, amount real);
create table tech_requirement(tech_guid int references tech(guid), condition_id int);
create table unlock(asset_guid int, source_kind text, source_guid int, condition_id int, primary key(asset_guid,source_guid));
create table condition(id integer primary key, owner_kind text, owner_id int, template text, negate int, parent_id int);
create table condition_param(condition_id int references condition(id), key text, value text);

create table storyline(guid integer primary key, name text, system text);
create table storyline_variable(storyline_guid int references storyline(guid), name text, type text, start_value text);
create table storyline_condition(storyline_guid int references storyline(guid), condition_id int);
create table quest_pool(guid integer primary key, name text);
create table quest_pool_storyline(pool_guid int references quest_pool(guid), storyline_guid int, weight real);
create table quest(guid integer primary key, name text, name_text integer, summary_text integer, category text, icon text, storyline_guid int);
create table quest_node(guid integer primary key, storyline_guid int references storyline(guid), type text, name text, quest_guid int, headline_text integer, text_text integer, step_text integer, time_limit_ms int);
create table quest_edge(from_guid int, to_guid int, kind text, idx int, option_index int, primary key(from_guid,to_guid,kind,idx)) without rowid;
create table quest_option(decision_guid int references quest_node(guid), idx int, text_text integer, category text);
create table quest_reward(node_guid int references quest_node(guid), kind text, asset_guid int, amount real, amount_variable text);
-- child tables looked up by parent (composite primary keys already cover the rest)
create index idx_need_attribute_need on need_attribute(need_guid);
create index idx_building_cost_building on building_cost(building_guid);
create index idx_building_maintenance_building on building_maintenance(building_guid);
create index idx_building_effect_building on building_effect(building_guid);
create index idx_factory_input_building on factory_input(building_guid);
create index idx_factory_input_product on factory_input(product_guid);
create index idx_factory_output_building on factory_output(building_guid);
create index idx_factory_output_product on factory_output(product_guid);
create index idx_residence_need_building on residence_need(building_guid);
create index idx_residence_upgrade_cost_building on residence_upgrade_cost(building_guid);
create index idx_production_chain_node_chain on production_chain_node(chain_guid);
create index idx_buff_modifier_buff on buff_modifier(buff_guid);
create index idx_buff_functional_effect_buff on buff_functional_effect(buff_guid);
create index idx_item_boost_buff_item on item_boost_buff(item_guid);
create index idx_item_boost_condition_item on item_boost_condition(item_guid);
create index idx_tech_unlock_asset on tech_unlock(asset_guid);
create index idx_tech_effect_tech on tech_effect(tech_guid);
create index idx_tech_resource_tech on tech_resource(tech_guid);
create index idx_tech_requirement_tech on tech_requirement(tech_guid);
create index idx_condition_param_condition on condition_param(condition_id);
create index idx_storyline_variable_storyline on storyline_variable(storyline_guid);
create index idx_storyline_condition_storyline on storyline_condition(storyline_guid);
create index idx_quest_pool_storyline_pool on quest_pool_storyline(pool_guid);
create index idx_quest_storyline on quest(storyline_guid);
create index idx_quest_node_storyline on quest_node(storyline_guid);
create index idx_quest_node_quest on quest_node(quest_guid);
create index idx_quest_edge_to on quest_edge(to_guid);
create index idx_quest_option_decision on quest_option(decision_guid);
create index idx_quest_reward_node on quest_reward(node_guid);
"""

if __name__ == "__main__":
    args = sys.argv[1:]
    langs = (
        args.pop(args.index("--langs") + 1).split(",") if "--langs" in args else None
    )
    args = [a for a in args if a != "--langs"]
    build_site_db(args[0], args[1], args[2] if len(args) > 2 else None, langs)
