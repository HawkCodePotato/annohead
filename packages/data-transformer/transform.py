"""Transform the generic asset DB (source.sqlite) into the normalized site DB (docs/schema.md).

Usage: python3 transform.py <source.sqlite> <anno.sqlite> [cdn_dir] [--langs english,german]
"""

import json
import os
import re
import sqlite3
import sys
import unicodedata
from collections import defaultdict

GUID = re.compile(r"^\d{4,}$")
DLC_PATH = re.compile(r"/(c?dlc)(\d+)/", re.IGNORECASE)
DLC_NAME = re.compile(r"(?<![A-Za-z])(C?DLC)0*(\d+)(?!\d)")
PARTICIPANTS = (
    "Participant 3rdParty",
    "Participant 3rdParty Pirate",
    "Participant 2ndParty (Rival)",
    "Participant 3rdParty Emperor",
)
REGIONS = {"Roman": 1, "Celtic": 2, "Egyptian": 3}
# where the game names each buff_modifier path: ItemKeywords (the item search keywords, one per upgrade property) or,
# for the per-weapon unit stats it lumps together, the infotip table (ItemInfotipTextFeature.BuffUpgradeTextAndIcons)
K, I = "ItemKeywords.", "ItemInfotipTextFeature.BuffUpgradeTextAndIcons."
MODIFIER_TEXTS = {
    "AqueductUpgrade.AqueductConsumedWaterUpgrade": K + "AqueductConsumedWaterUpgradeKey",
    "AqueductUpgrade.AqueductWaterSupplyUpgrade": K + "AqueductWaterSupplyUpgradeKey",
    "AreaBuff.RadiusEffectRangeUpgrade": K + "AreaRadiusEffectRangeKey",
    "AreaMaintenanceUpgrade.LandTax": K + "AreaMaintenanceLandTaxKey",
    "AreaMaintenanceUpgrade.Workforce.Amount": K + "AreaMaintenanceWorkforceKey",
    "BuildingUpgrade.AttributeModifierInPercent": K + "BuildingTotalAttributeModifierInPercentKey",
    "BuildingUpgrade.WorkforceModifierInPercent": K + "BuildingWorkforceModifierInPercentKey",
    "CityInstitutionUpgrade.ResolverRangeUpgrade": K + "CityInstitutionResolverRangeUpgradeKey",
    "CityInstitutionUpgrade.ResolverRepairDurationUpgrade": K + "CityInstitutionRepairDurationUpgradeKey",
    "CityInstitutionUpgrade.ResolverResolveDurationUpgrade": K + "CityInstitutionResolveDurationUpgradeKey",
    "CityInstitutionUpgrade.ResolverUnitCountUpgrade": K + "CityInstitutionResolverUnitCountUpgradeKey",
    "DistributionUpgrade.AddDeltas": K + "DistributionAddDeltasKey",
    "FactoryUpgrade.FuelDurationPercent": K + "FactoryFuelDurationKey",
    "FactoryUpgrade.NeededAreaUpgrade": K + "FactoryNeededAreaPercentageUpgradeKey",
    "FactoryUpgrade.ProductivityUpgrade": K + "FactoryProductivityUpgradeKey",
    "HealthUpgrade.BaseHealthUpgrade": K + "HealthMaxHitpointsUpgradeKey",
    "HealthUpgrade.EncampedUnitSelfHealMultiplierUpgrade": K + "HealthEncampedUnitSelfHealMultiplierKey",
    "HealthUpgrade.SelfHealUpgrade": K + "HealthSelfHealUpgradeKey",
    "IrrigationUpgrade.PipeCapacityUpgrade": K + "IrrigationPipeCapacityKey",
    "ItemContainerUpgrade.SlotCountUpgrade": K + "ItemContainerSlotCountUpgradeKey",
    "ItemContainerUpgrade.SocketCountUpgrade": K + "ItemContainerSocketCountUpgradeKey",
    "MaintenanceUpgrade.EncampedUnitScalingFactorUpgrade": K + "EncampedUnitScalingFactorUpgradeKey",
    "MaintenanceUpgrade.MaintenanceFactorUpgrade": K + "MaintenanceUpgradeKey",
    "MaintenanceUpgrade.WorkforceMaintenanceFactorUpgrade": K + "MaintenanceWorkforceAmountUpgradeKey",
    "ModuleOwnerUpgrade.ModuleLimitPercent": K + "ModuleOwnerModuleLimitPercentKey",
    "MovementUpgrade.BuffBaseSpeedUpgrade": K + "MovementBaseSpeedKey",
    "MovementUpgrade.BuffFavorableWindAngle": K + "MovementFavorableWindAngleUpgradeKey",
    "MovementUpgrade.BuffReduceCargoImpactUpgrade": K + "MovementCargoImpactKey",
    "MovementUpgrade.BuffReduceDamageImpactUpgrade": K + "MovementDamageImpactKey",
    "MovementUpgrade.BuffReduceNegativeRiverCurrentImpactUpgrade": I + "BuffReduceNegativeSpeedImpactOfRiverCurrent.Text",
    "MovementUpgrade.BuffReduceNegativeWindImpactUpgrade": K + "MovementNegativeWindImpactKey",
    "MovementUpgrade.BuffTransferSpeedUpgrade": K + "MovementTransferSpeedUpgradeKey",
    "RaceTrackUpgrades.TrainingChargesUpgrade": K + "TrainingChargesUpgradeKey",
    "RecruitmentUpgrade.ConstructionCostInPercent": K + "RecruitmentConstructionCostInPercentKey",
    "RecruitmentUpgrade.ConstructionSpeedInPercent": K + "RecruitmentConstructionSpeedInPercentKey",
    "RecruitmentUpgrade.RecruitmentCostInPercent": K + "RecruitmentCostInPercentKey",
    "RecruitmentUpgrade.RecruitmentSpeedInPercent": K + "RecruitmentSpeedInPercentKey",
    "RepairCraneUpgrade.HealBuildingsPerMinuteUpgrade": K + "RepairCraneHealBuildingsPerMinuteKey",
    "RepairCraneUpgrade.HealPerMinuteUpgrade": K + "RepairCraneHealPerMinuteKey",
    "RepairCraneUpgrade.HealRadiusUpgrade": K + "RepairCraneHealRadiusUpgradeKey",
    "RepairCraneUpgrade.MaximumRepairTargetsUpgrade": K + "RepairCraneMaximumRepairTargetsKey",
    "ResidenceUpgrade.ConsumptionModifierInPercent": K + "ResidenceConsumptionModifierKey",
    "ResidenceUpgrade.GoodConsumptionUpgrade.AmountInPercent": K + "ResidenceGoodConsumptionUpgradeKey",
    "TradeShipUpgrade.ActiveTradePriceInPercent": K + "TradeShipActiveTradePriceInPercentKey",
    "TradeShipUpgrade.LoadingSpeedUpgrade": K + "TradeShipLoadingSpeedKey",
    "UnitUpgrade.AccuracyArcherModuleUpgrade": I + "BuffUnitAccuracyArcherModule.Text",
    "UnitUpgrade.AccuracyBallistaModuleUpgrage": I + "BuffUnitAccuracyBallistaModule.Text",
    "UnitUpgrade.AccuracyCatapultModuleUpgrage": I + "BuffUnitAccuracyCatapultModule.Text",
    "UnitUpgrade.AccuracyUpgrade": K + "UnitAccuracyUpgradeKey",
    "UnitUpgrade.ArmorUpgrade": K + "UnitArmorUpgradeKey",
    "UnitUpgrade.AttackCone_BallistaModule": I + "BuffUnitAttackConeBallistaModule.Text",
    "UnitUpgrade.AttackCone_CatapultModule": I + "BuffUnitAttackConeCatapultModule.Text",
    "UnitUpgrade.AttackSpeedArcherModulePercentualUpgrade": I + "BuffUnitAttackSpeedArcherModulePercentual.Text",
    "UnitUpgrade.AttackSpeedBallistaModulePercentualUpgrade": I + "BuffUnitAttackSpeedBallistaModulePercentual.Text",
    "UnitUpgrade.AttackSpeedCatapultModulePercentualUpgrade": I + "BuffUnitAttackSpeedCatapultModulePercentual.Text",
    "UnitUpgrade.AttackSpeedRangedPercentualUpgrade": I + "BuffUnitAttackSpeedRangedPercentual.Text",
    "UnitUpgrade.AttackSpeedTorchPercentualUpgrade": I + "BuffUnitAttackSpeedTorchPercentual.Text",
    "UnitUpgrade.DefenseUpgrade": K + "UnitDefenseUpgradeKey",
    "UnitUpgrade.DiscoveryRadiusUpgrade": K + "UnitDiscoveryRadiusUpgradeKey",
    "UnitUpgrade.DistanceAttackRangeArcherModulePercentualUpgrade": I + "BuffUnitDistanceAttackRangeArcherModulePercentual.Text",
    "UnitUpgrade.DistanceAttackRangeBallistaModulePercentualUpgrade": I + "BuffUnitDistanceAttackRangeBallistaModulePercentual.Text",
    "UnitUpgrade.DistanceAttackRangeCatapultModulePercentualUpgrade": I + "BuffUnitDistanceAttackRangeCatapultModulePercentual.Text",
    "UnitUpgrade.DistanceAttackRangePercentualUpgrade": I + "BuffUnitDistanceAttackRangePercentual.Text",
    "UnitUpgrade.MaximumMoraleUpgrade": K + "UnitMaximumMoraleUpgradeKey",
    "UnitUpgrade.OffenseArcherModuleRangedUpgrade": I + "BuffUnitOffenseArcherModuleRanged.Text",
    "UnitUpgrade.OffenseBallistaModuleRangedUpgrade": I + "BuffUnitOffenseBallistaModuleRanged.Text",
    "UnitUpgrade.OffenseCatapultModuleRangedUpgrade": I + "BuffUnitOffenseCatapultModuleRanged.Text",
    "UnitUpgrade.OffenseChargeUpgrade": I + "BuffUnitOffenseCharge.Text",
    "UnitUpgrade.OffenseMeleeUpgrade": I + "BuffUnitOffenseMelee.Text",
    "UnitUpgrade.OffenseRangedUpgrade": I + "BuffUnitOffenseRanged.Text",
    "UnitUpgrade.RewardMoneyPerDestroyedShipUpgrade": K + "UnitRewardMoneyPerDestroyedShipUpgradeKey",
    "UnitUpgrade.ShieldUpgrade": K + "UnitShieldUpgradeKey",
    "WarehouseUpgrade.AdditionalLoadingSpeedInPercent": K + "WarehouseLoadingSpeedKey",
    "WarehouseUpgrade.OverflowStorageRiskMultiplierUpgrade": I + "BuffOverflowStorageRiskMultiplier.TextThresholds[0].Text",
    # templates, see _templated_modifiers(); the nearby entry wraps modifiers of an area effect a buff passes on
    "BuildingUpgrade.AdditionalFunctionalEffect": I + "BuffAdditionalNeedAttributes.AttributeInRange",
    "FactoryUpgrade.AddedFertility": I + "BuffFertility.Text",
    "FactoryUpgrade.AdditionalOutput": I + "BuffAdditionalFactoryOutput.TextWithSpecifiedProduct",
    "FactoryUpgrade.AdditionalOutput.EveryCycle": I + "BuffAdditionalFactoryOutput.TextWithSpecifiedProductEveryCycle",
    "FactoryUpgrade.AdditionalOutput.Same": I + "BuffAdditionalFactoryOutput.ForceProductSameAsFactoryOutputText",
    "FactoryUpgrade.AdditionalOutput.Same.EveryCycle": I + "BuffAdditionalFactoryOutput.ForceProductSameAsFactoryOutputEveryCycleText",
    "BuildingUpgrade.AdditionalWorkforces": I + "BuffOutputWorkforce.AdditionalText",
    "FactoryUpgrade.ReplaceInputs": I + "BuffFactoryInput.InputReplaceInputText",
    "IncidentInfectableUpgrade.IncidentImmunity": I + "BuffInfectableImmunity.Text",
}
MESH_UPKEEP = re.compile(r"^AreaMaintenanceUpgrade\.MeshGraphUpkeep\.(\w+)\.UpgradePercent$")
# game config tables of names, as (label kind, template, path to the keyed entries, field holding the text)
LABEL_TABLES = [
    ("attribute", "NeedAttributeFeature", "NeedAttributeFeature.NeedAttributeConfig", "Name"),
    ("rarity", "ItemBalancing", "ItemConfig.RarityVisualization", "Text"),
    ("niche", "ItemBalancing", "ItemConfig.NicheVisualization", "Text"),
    ("allocation", "ItemBalancing", "ItemConfig.AllocationText", "Text"),
    ("racer_attribute", "RaceTrackConfig", "RaceTrackConfig.ItemRacerAttributes", "Name"),
    ("diplomacy", "DiplomacyBalancing", "DiplomacyConfig.DiplomacyStates", "DisplayName"),
    ("reputation", "ReputationFeature", "ReputationFeature.ReputationZones", "ZoneName"),
    ("reputation", "ReputationFeature", "ReputationFeature.ReputationSpecialStates", "Name"),
    ("incident", "GeneralIncidentConfiguration", "GeneralIncidentConfiguration.IncidentTypesConfig", "Name"),
]
# "The Mysterious Murmillo Part I" -> "The Mysterious Murmillo", as the client's English phrases do
# the game separates CJK words with zero-width spaces, which a typed query never has
INVISIBLE = re.compile("[\u200b-\u200d\ufeff]")
QUESTLINE_PART = re.compile(r"\s*(?:[–-]\s*)?\bPart\s+[IVXL]+\b.*$", re.IGNORECASE)
# products the trading post filter doesn't list, filed under categories the game has no name for (client phrases)
PRODUCT_KINDS = {"Workforce": -1, "Service": -2, "Meta": -3}
# the game's placeholder for assets whose icon was cut ("Removed Icon")
REMOVED_ICON = "/icon_3d_removed.png"
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
    "ActionLockAsset",
    "ActionChangeReputation",
    "ActionEffect",
    "ActionTriggerParticipantMessage",
    "ActionStartStoryline",
    "ActionIncreaseItemRacerAttributeLevel",
    "ActionReplaceItem",
    "ActionChangeBuildingRank",
    "ActionStartIncident",
    "ActionAddCampaignPowerStruggleReason",
}
# storylines that are not narrative content: cut, test or template assets, tutorials and multiplayer plumbing
NON_STORY = re.compile(
    r"DEPRECATED|UNUSED|NOT USED|COPYPASTE|TEMPLATE|^CUT_|\(OLD\)|Test|Multiplayer|Activation Helper|^Onboarding|PressVersion",
    re.IGNORECASE,
)
# edges followed when collecting what a choice leads to; failure/timeout ports and location refs are not consequences
OUTCOME_EDGES = {
    "QuestComponentConnector.Output",
    "DecisionComponent.DecisionOutputs.SuccessOutput",
    "Function.FunctionSuccessOutput",
    "Objective.SuccessOutput",
    "Starter.AcceptOutput",
    "QuestLine.StartConnector",
}
# ponytail: questline region from the Heartlands/Wetlands prefix of internal storyline names, when no journal entry names a province
REGION_PREFIX = {"HL": 1, "WL": 2}


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
        self.enums = defaultdict(set)
        self.attributes = {}
        self.conditions = []
        self.merged = {}  # what a category name reads in every language -> category guid
        if os.path.exists(out):
            os.unlink(out)
        self.db = sqlite3.connect(out)
        self.db.executescript(SCHEMA + SCRATCH)

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
        if k.endswith(REMOVED_ICON) or (self.icons_dir and not os.path.exists(os.path.join(self.icons_dir, k))):
            return None
        return k

    def region(self, v):
        """single region id from an AssociatedRegions string; None when multi/none."""
        parts = [r for r in str(v or "").split(";") if r in self.regions]
        return self.regions[parts[0]] if len(parts) == 1 else None

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
        return set(self.pool_members(g, seen))

    def insert_target(self, effect, g):
        """Record an effect target: a pool ("Warehouses") or a single asset ("Fishing Hut").

        kind is building, unit or ship by what the target holds; icon is the target's own, else its first member's.
        When the target is one building, including its regional variants that read the same (the Roman and Celtic
        Charcoal Burner), each variant goes to effect_target_building so it can be listed and linked on its own.
        """
        g = self.num(g)
        if not hasattr(self, "_buildings"):
            self._buildings = {b for (b,) in self.db.execute("select guid from building")}
        members = [g, *self.pool_members(g)]
        templates = {D(self.assets.get(m)).get("template") for m in members}
        if any(m in self._buildings for m in members):
            kind = "building"
        elif "LandUnit" in templates:
            kind = "unit"
        elif "NavalUnit" in templates:
            kind = "ship"
        else:
            kind = None
        icon = next(
            (i for m in members if (i := self.icon(D(self.assets.get(m)).get("icon")))),
            None,
        )
        self.db.execute(
            "insert or ignore into effect_target_pool values(?,?,?,?,?)",
            (effect, g, self.text(D(self.assets.get(g)).get("text_id")), kind, icon),
        )
        found = list(dict.fromkeys(m for m in members if m in self._buildings))
        # variants carry their own text lines, so compare what they read as
        names = {
            self.src.execute(
                "select text from texts where line_id=? and lang='english'",
                (self.assets[m]["text_id"],),
            ).fetchone()
            for m in found
        }
        if len(names) == 1:
            for m in found:
                self.db.execute(
                    "insert or ignore into effect_target_building values(?,?,?)",
                    (effect, g, m),
                )

    def pool_members(self, g, seen=None):
        """Leaf assets of a pool, in the pool's own order."""
        seen = seen if seen is not None else set()
        a = self.assets.get(int(g)) if GUID.match(str(g)) else None
        if a is None or a["guid"] in seen:
            return
        seen.add(a["guid"])
        if a["template"] == "AssetPool":
            for it in self.items(D(a["v"].get("AssetPool")).get("AssetList")):
                yield from self.pool_members(it.get("Asset"), seen)
        elif a["template"] == "RewardPool":
            for it in self.items(D(a["v"].get("RewardPool")).get("ItemsPool")):
                yield from self.pool_members(it.get("ItemLink"), seen)
        else:
            yield a["guid"]

    def items(self, x):
        return [i for i in x if isinstance(i, dict)] if isinstance(x, list) else []

    def cost_rows(self, v, guid, prefix):
        """Cost.Costs -> <prefix>_cost, Maintenance.Maintenances -> <prefix>_maintenance."""
        for tbl, prop, lst, key in (
            ("cost", "Cost", "Costs", "Ingredient"),
            ("maintenance", "Maintenance", "Maintenances", "Product"),
        ):
            for c in self.items(D(v.get(prop)).get(lst)):
                if self.num(c.get("Amount"), 0):
                    self.db.execute(
                        f"insert into {prefix}_{tbl} values(?,?,?)",
                        (guid, self.num(c[key]), self.num(c["Amount"])),
                    )

    def condition(self, owner_kind, owner_id, node):
        """Store a PreCondition/TriggerCondition tree as condition rows; returns root condition id."""
        if not isinstance(node, dict):
            return None
        vals = D(node.get("Values")) or node
        # a node without Template still names its kind by the block it carries (ConditionAlwaysTrue: null)
        tpl = self.enum(
            "condition_template",
            node.get("Template")
            or next((k for k in vals if k.startswith("Condition") and k != "Condition"), "ConditionAlwaysTrue"),
        )
        negate = (
            1
            if D(vals.get("ConditionPropsNegatable")).get("NegateCondition") == "1"
            else 0
        )
        # how sub-conditions combine: Parallel (all, the default), Linear (all, in order), MutuallyExclusive (one of them)
        order = self.enum(
            "sub_condition_order",
            D(vals.get("Condition")).get("SubConditionCompletionOrder", "Parallel"),
        )
        cid = len(self.conditions) + 1
        self.conditions.append(cid)
        # inserted right away: sub-conditions below set their parent_id, and questlines() reads the rows
        self.db.execute(
            "insert into condition values(?,?,?,?,?,null,?)",
            (cid, owner_kind, owner_id, tpl, negate, order),
        )
        # the template's own block is stored unprefixed; sibling blocks (ObjectFilter …) keep their name
        body = {
            k: v
            for k, v in vals.items()
            if k not in ("Condition", "SubConditions") and not k.startswith("ConditionProps")
        }
        if tpl and isinstance(body.get(tpl), dict):
            body.update(body.pop(tpl))
        for k, v in self.walk_leaves(body):
            self.db.execute("insert into condition_param values(?,?,?)", (cid, k, v))
        # each sub-condition is a PreConditionList whose own SubConditions nest below it
        for sub in self.items(vals.get("SubConditions")):
            sc = sub.get("SubCondition") if isinstance(sub, dict) else None
            if isinstance(sc, dict):
                child = self.condition(
                    owner_kind,
                    owner_id,
                    self.with_sub_conditions(D(D(sc.get("Values")).get("PreConditionList"))),
                )
                if child:
                    self.db.execute(
                        "update condition set parent_id=? where id=?", (cid, child)
                    )
        return cid

    def with_sub_conditions(self, pcl):
        """A PreConditionList's Condition with its sibling SubConditions moved inside, as condition() reads them."""
        root = D(pcl.get("Condition")) or {"Template": "ConditionAlwaysTrue"}
        vals = D(root.get("Values")) or root
        tpl = root.get("Template") or next(
            (k for k in vals if k.startswith("Condition") and k != "Condition"),
            "ConditionAlwaysTrue",
        )
        subs = self.items(vals.get("SubConditions")) + self.items(pcl.get("SubConditions"))
        return {"Template": tpl, "Values": {**vals, "SubConditions": subs}}

    def precondition_list(self, owner_kind, owner_id, pcl):
        """A PreConditionList (Condition plus sibling SubConditions) as one condition tree; None when always true."""
        node = self.with_sub_conditions(D(pcl))
        vals = node["Values"]
        negated = D(vals.get("ConditionPropsNegatable")).get("NegateCondition") == "1"
        if node["Template"] == "ConditionAlwaysTrue" and not negated and not vals["SubConditions"]:
            return None
        return self.condition(owner_kind, owner_id, node)

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
        # only regions the game defines a Region asset for; unreleased ones (Egyptian, before Dawn of the Delta) have
        # none yet, though base assets already list them in AssociatedRegions
        self.regions = {}
        for a in self.by_template("Region"):
            key = D(a["v"].get("Region")).get("RegionID")
            if key in REGIONS:
                self.regions[key] = REGIONS[key]
                self.db.execute("insert into region values(?,?,?)", (REGIONS[key], key, self.text(a["text_id"])))
        for a in self.by_template("UplayProduct"):
            u = D(a["v"].get("UplayProduct"))
            # IsInstalled marks content shipped in this build; announced DLCs only have a shop entry
            if u.get("IsInstalled") == "1" and (u.get("ProductType", "DLC") == "DLC" or "DLC" in (a["name"] or "")):
                self.db.execute(
                    "insert into dlc values(?,?,?,?)",
                    (
                        a["guid"],
                        a["v"]["Standard"].get("ID") or a["name"],  # cosmetic packs have no ID: CDLC1 …
                        self.text(a["text_id"]),
                        self.icon(a["icon"]),
                    ),
                )
        for tpl, table in (
            ("Patron", "patron"),
            ("Festival", "festival"),
            ("AssetPool", "asset_pool"),  # only pools the game names, e.g. "Ships"
            ("MonumentEvent", "monument_event"),
        ):
            for a in self.by_template(tpl):
                if tpl == "AssetPool" and not a["text_id"]:
                    continue
                self.db.execute(
                    f"insert into {table} values(?,?,?)",
                    (a["guid"], self.text(a["text_id"]), self.icon(a["icon"])),
                )
        for a in self.by_template(*PARTICIPANTS):
            self.db.execute(
                "insert into participant values(?,?,?)",
                (a["guid"], self.text(a["text_id"]), self.icon(a["icon"])),
            )
        for a in self.by_template("PopulationLevel"):
            p = D(a["v"].get("PopulationLevel"))
            tier = self.num(
                str(p.get("PopulationTier", "Level1")).replace("Level", ""), 1
            )
            self.db.execute(
                "insert into population_level values(?,?,?,?,null,?)",
                (
                    a["guid"],
                    self.text(a["text_id"]),
                    self.icon(a["icon"]),
                    tier,
                    self.num(p.get("ConnectedWorkforce")),
                ),
            )

    # ---- products / needs ----------------------------------------------------------------------------------
    def products(self):
        for a in self.by_template("Product"):
            p = D(a["v"].get("Product"))
            # TransportGoodsType is "Raw" on nearly every non-good, so classify by the game's own flags
            if p.get("IsWorkforce") == "1":
                kind = "Workforce"
            elif p.get("IsAbstract") == "1":
                kind = "Service"
            elif p.get("StorageLevel") == "Meta":
                kind = "Meta"
            else:
                kind = "Good"
            self.db.execute(
                "insert into product values(?,?,?,null)",
                (a["guid"], self.text(a["text_id"]), self.icon(a["icon"])),
            )
            if kind != "Good":
                self.db.execute(
                    "insert into category_member values(?,?)", (PRODUCT_KINDS[kind], a["guid"])
                )
            for r in str(p.get("AssociatedRegion") or "").split(";"):
                if r in self.regions:
                    self.db.execute(
                        "insert into product_region values(?,?)",
                        (a["guid"], self.regions[r]),
                    )
        for a in self.by_template("Need"):
            n = D(a["v"].get("Need"))
            self.db.execute(
                "insert into need values(?,?)", (a["guid"], self.num(n.get("NeedProduct")))
            )
            for k, v in D(n.get("NeedAttributes")).items():
                self.db.execute(
                    "insert into need_attribute values(?,?,?)",
                    (a["guid"], self.attribute(k), self.num(D(v).get("Value"), 0)),
                )

    # ---- buildings -----------------------------------------------------------------------------------------
    def building_dlc(self, values):
        """Infer ownership from model paths, excluding base buildings with DLC-only variants."""
        paths = [
            row.get("Filename", "")
            for row in self.items(D(values.get("Object")).get("Variations"))
        ]
        if not paths:
            paths = [D(values.get("Standard")).get("IconFilename", "")]
        names = set()
        for path in paths:
            match = DLC_PATH.search(path)
            if not match:
                return None
            names.add(f"{match[1].upper()}{int(match[2])}")
        if len(names) != 1:
            return None
        return self.dlc_by_name(names.pop())

    def dlc_by_name(self, name):
        """guid of the UplayProduct asset named e.g. DLC1 / CDLC2."""
        for guid, in self.db.execute("select guid from dlc"):
            if self.assets[guid]["name"] == name:
                return guid
        return None

    def item_dlc(self, it):
        """Items name their DLC outright: Item.Origin is BaseRelease, DLC01, DLC02 …"""
        match = re.fullmatch(r"(C?DLC)0*(\d+)", str(it.get("Origin", "")))
        return self.dlc_by_name(f"{match[1]}{match[2]}") if match else None

    def name_dlc(self, name):
        """Quest content names its DLC in the asset name: "DLC01 QL01 QuestEntry", "DLC02 Hippodrome Decision 1" …"""
        match = DLC_NAME.search(name or "")
        return self.dlc_by_name(f"{match[1]}{match[2]}") if match else None

    def province_region(self, guid):
        """region id of a province (Session asset), via Session.Region → Region.RegionID."""
        session = self.assets.get(self.num(guid))
        if not session:
            return None
        reg = self.assets.get(self.num(D(session["v"].get("Session")).get("Region")))
        rid = D(reg["v"].get("Region")).get("RegionID") if reg else None
        return self.regions.get(rid)

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
            if "Monument" in v:  # construction phase, see phases()
                continue
            b, std, es = D(v["Building"]), D(v["Standard"]), D(v.get("EffectSource"))
            self.db.execute(
                "insert into building values(?,?,?,?,?,?,?,?,?,?,null)",
                (
                    a["guid"],
                    self.text(a["text_id"]),
                    self.text(std.get("InfoDescription")),
                    self.icon(a["icon"]),
                    a["template"],
                    self.text(b.get("BuildingCategoryName")),
                    self.region(b.get("AssociatedRegions")),
                    self.num(es.get("RadiusDistance")),
                    self.num(es.get("StreetDistance")),
                    self.building_dlc(v),
                ),
            )
            for r in str(b.get("AssociatedRegions") or "").split(";"):
                if r in self.regions:
                    self.db.execute(
                        "insert into building_region values(?,?)",
                        (a["guid"], self.regions[r]),
                    )
            self.cost_rows(v, a["guid"], "building")
            for fe in self.items(b.get("FunctionalEffects")):
                if self.num(fe.get("FunctionalEffect")):
                    self.db.execute(
                        "insert into building_effect values(?,?)",
                        (a["guid"], self.num(fe["FunctionalEffect"])),
                    )
            ps = D(v.get("PublicService")).get("PublicServiceEffect")
            if self.num(ps):
                self.db.execute(
                    "insert into building_effect values(?,?)",
                    (a["guid"], self.num(ps)),
                )
            fb = v.get("FactoryBase")
            if "FactoryBase" in v:
                fb = D(fb)
                self.db.execute(
                    "insert into factory values(?,?,?,?,?)",
                    (
                        a["guid"],
                        self.num(fb.get("CycleTime"), 30),
                        self.num(fb.get("BaseProductivity"), 100),
                        self.num(fb.get("MaxTransporterRange")),
                        fb.get("NeedsFuelInput") == "1",
                    ),
                )
                for tbl, key in (
                    ("factory_input", "FactoryInputs"),
                    ("factory_output", "FactoryOutputs"),
                ):
                    for i in self.items(fb.get(key)):
                        if self.num(i.get("Product")):
                            self.db.execute(
                                f"insert into {tbl} values(?,?,?)",
                                (a["guid"], self.num(i["Product"]), self.num(i.get("Amount"), 1)),
                            )
            r7 = v.get("Residence7")
            if "Residence7" in v:
                r7 = D(r7)
                self.db.execute(
                    "insert into residence values(?,?)",
                    (a["guid"], self.num(r7.get("PopulationLevel"))),
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
                "insert into production_chain values(?,?,?,?,?,null)",
                (
                    a["guid"],
                    self.text(a["text_id"]),
                    self.icon(a["icon"]),
                    root,
                    None,
                ),
            )
            self._chain_nodes(a["guid"], pc, None, 0)
        # a population tier lives where its residences do
        self.db.execute(
            """update population_level set region_id=(select b.region_id from residence r join building b
               on b.guid=r.building_guid where r.population_level_guid=population_level.guid and b.region_id is not null)"""
        )
        # a chain lives where its output building does (Roman Bread vs Roman Celtic Bread)
        self.db.execute(
            "update production_chain set region_id=(select region_id from building b where b.guid=production_chain.building_guid)"
        )

    # ---- construction menu and trading post filter -----------------------------------------------------------
    def category(self, kind, g, text_id, icon, sort):
        """Insert a filter category; ones that read the same in every language (ignoring case) share the first guid."""
        same = tuple(r.casefold() for (r,) in self.src.execute("select text from texts where line_id=? order by lang", (str(text_id),)))
        key = (kind, same or g)
        if key not in self.merged:
            self.merged[key] = g
            self.db.execute(
                "insert into category(guid, kind, name_text, icon, sort) values(?,?,?,?,?)",
                (g, self.enum("category_kind", kind), self.text(text_id), self.icon(icon), sort),
            )
        return self.merged[key]

    def categories(self):
        """Buildings and chains by construction-menu tab, goods by trading-post filter category.

        Tabs come from the game's ConstructionMenu config: each region's tier tabs, and the named sub-tabs of its
        infrastructure tab (the tab's own buildings go under the tab). A tab lists buildings, production chains (all
        their buildings) and nested categories. Buildings only reached by upgrading (Plebeian Residence, Stone Wall)
        share the tab of what they upgrade from. Tabs and filter categories that read the same in every language
        (Roman and Celtic Military Buildings) are merged.
        """
        chains = defaultdict(set)
        for c, b in self.db.execute("select chain_guid, building_guid from production_chain_node"):
            chains[c].add(b)
        buildings = {g for (g,) in self.db.execute("select guid from building")}

        def listed(g):
            return [self.num(b.get("Building")) for b in self.items(D(self.assets[g]["v"].get("ConstructionCategory")).get("BuildingList"))]

        def is_category(g):
            return D(self.assets.get(g)).get("template") == "ConstructionCategory"

        def members(g, nested=True):
            out = set()
            for i in listed(g):
                if i in buildings or i in chains:
                    out.add(i)
                if i in chains:
                    out |= chains[i]
                if nested and is_category(i):
                    out |= members(i)
            return out

        menu = D(next(iter(self.by_template("ConstructionMenu")), {}).get("v")).get("ConstructionMenu", {})
        tabs = []
        for region in self.regions:
            m = D(D(menu.get("LinearBuildingsMenu")).get(region))
            infra = self.num(m.get("InfrastructureCategory"))
            tabs += [(self.num(t.get("TierCategory")), True) for t in self.items(m.get("NeedCategories"))]
            if infra in self.assets:
                tabs.append((infra, False))
                tabs += [(i, True) for i in listed(infra) if is_category(i) and self.assets[i]["text_id"]]
        found = defaultdict(set)
        for sort, (g, nested) in enumerate(tabs):
            own = members(g, nested)
            if own:
                c = self.category("menu", g, self.assets[g]["text_id"], self.assets[g]["icon"], sort)
                for m in own:
                    found[m].add(c)
        upgrades = defaultdict(set)
        for a in self.assets.values():
            for u in self.items(D(a["v"].get("Upgradable")).get("PossibleUpgrades")):
                if self.num(u.get("UpgradeGUID")):
                    upgrades[a["guid"]].add(self.num(u["UpgradeGUID"]))
                    upgrades[self.num(u["UpgradeGUID"])].add(a["guid"])
        pending = True
        while pending:
            pending = False
            for b in buildings - set(found):
                for o in upgrades[b]:
                    if found.get(o):
                        found[b] |= found[o]
                        pending = True
                        break
        for m, cs in found.items():
            for c in cs:
                self.db.execute("insert or ignore into category_member values(?,?)", (c, m))
        # goods: the trading post filter of each region and of the empire; its first category is "All Goods"
        products = {g for (g,) in self.db.execute("select guid from product")}
        for a in self.by_template("ProductFilter"):
            for sort, c in enumerate(self.items(D(a["v"].get("ProductFilter")).get("Categories"))[1:]):
                lst = self.assets.get(self.num(c.get("ProductList")))
                icon = D(self.assets.get(self.num(c.get("Icon")))).get("icon")
                g = self.category("product", self.num(c.get("ProductList")), c.get("Text"), icon, sort)
                for it in self.items(D(D(lst).get("v")).get("ProductList", {}).get("List")):
                    if self.num(it.get("Product")) in products:
                        self.db.execute("insert or ignore into category_member values(?,?)", (g, self.num(it["Product"])))
        for kind, g in PRODUCT_KINDS.items():
            self.db.execute(
                "insert into category(guid, kind, key, sort) values(?,?,?,?)", (g, "product", kind, 100 - g)
            )

    # ---- units ---------------------------------------------------------------------------------------------
    def hull(self, g):
        """The ship a shipyard loadout (ShipConfiguration) is built on; other assets are their own unit."""
        a = self.assets.get(self.num(g))
        if not a:
            return None
        if a["template"] == "ShipConfiguration":
            return self.num(D(a["v"].get("ShipConfiguration")).get("ShipHullGUID"))
        return a["guid"]

    def units(self):
        """Ships and troops the player gets: whatever a building recruits (barracks, shipyards, villas; ships as their
        hull, not the module loadouts a shipyard offers) and the flagship of each start fleet. Units are filed under
        the building that recruits them, flagships under their own name."""
        recruiters = defaultdict(set)  # unit -> buildings recruiting it
        for (b,) in self.db.execute("select guid from building").fetchall():
            for o in self.items(D(self.assets[b]["v"].get("Recruitment")).get("AssemblyOptions")):
                u = self.hull(o.get("Vehicle"))
                if u in self.assets:
                    recruiters[u].add(b)
        flagships = {}  # unit -> region
        for path, g in self.src.execute("select path, to_guid from refs where path like 'DifficultySettings.StartShips.%'"):
            u = self.hull(g)
            if dict_get(D(self.assets.get(u)).get("v"), "Unit.UnitUniqueType") == "Flagship":
                flagships[u] = self.regions.get(path.split(".Region.")[1].split(".")[0])
        building_region = dict(self.db.execute("select guid, region_id from building"))
        filed = [(b, {u for u, bs in recruiters.items() if b in bs}) for b in sorted(set().union(*recruiters.values()))]
        for sort, (g, members) in enumerate([*filed, *((u, {u}) for u in flagships)]):
            c = self.category("unit", g, self.assets[g]["text_id"], self.assets[g]["icon"], sort)
            for u in members:
                self.db.execute("insert or ignore into category_member values(?,?)", (c, u))
        for u in sorted(recruiters.keys() | flagships.keys()):
            a, v = self.assets[u], self.assets[u]["v"]
            actor = D(dict_get(v, "Unit.Actor.Values.CompositeUnitActor"))
            regions = {building_region[b] for b in recruiters[u]} if u in recruiters else {flagships[u]}
            health = self.num(D(v.get("Health")).get("BaseHealth"))
            crafting = self.num(D(v.get("Craftable")).get("CraftingTime"))
            self.db.execute(
                "insert into unit values(?,?,?,?,?,?,?,?,?,?,?,?,?,null)",
                (
                    u,
                    self.text(a["text_id"]),
                    self.text(D(v.get("Standard")).get("InfoDescription")),
                    self.icon(a["icon"]),
                    regions.pop() if len(regions) == 1 else None,
                    health if health and health > 0 else None,  # troops: -1, their health is per soldier
                    self.num(actor.get("Elements")),
                    self.num(D(actor.get("MoraleConfig")).get("MaximumMorale")),
                    self.num(D(v.get("Movement")).get("BaseSpeed")),
                    crafting // 1000 if crafting else None,
                    self.num(D(v.get("ItemContainer")).get("SlotCount")),
                    self.num(D(v.get("ItemContainer")).get("SocketCount")),
                    self.num(D(v.get("ShipModuleOwner")).get("MaximumModificationCount")),
                ),
            )
            self.cost_rows(v, u, "unit")
            for b in recruiters[u]:
                self.db.execute("insert into unit_recruiter values(?,?)", (u, b))

    # ---- ornaments -----------------------------------------------------------------------------------------
    def ornaments(self):
        """Everything in each region's ornament menu (ConstructionMenu.OrnamentsMenu): decorations, ground patterns and
        walls, filed under the menu tab listing them (Ground Patterns …, and Hall Of Fame / Rewards for the ones those
        hand out). Cosmetic packs own what their UplayProductUnlocks lists; model paths would also claim the Twitch and
        Connect rewards built from pack models."""
        menu = D(dict_get(D(next(iter(self.by_template("ConstructionMenu")), {}).get("v")), "ConstructionMenu.OrnamentsMenu"))
        regions = defaultdict(set)  # ornament -> regions whose menu lists it
        tabs = defaultdict(list)  # ornament -> menu tabs listing it
        sort = {}

        def walk(g, region, tab):
            a = self.assets.get(self.num(g))
            if not a:
                return
            if a["template"] != "ConstructionCategory":
                regions[a["guid"]].add(region)
                if tab:
                    tabs[a["guid"]].append(tab["guid"])
                return
            if tab is not None:  # filters list tabs in menu order
                sort.setdefault(a["guid"], len(sort))
            for b in self.items(dict_get(a["v"], "ConstructionCategory.BuildingList")):
                walk(b.get("Building"), region, a)

        for key, rid in self.regions.items():
            walk(dict_get(D(menu.get(key)), "SortingMode.OrnamentsCategory.Content"), rid, None)
        # in menu order, so tabs every section repeats (Ground Patterns …) merge into the first one
        listed = set().union(*tabs.values())
        category = {
            t: self.category("ornament", t, self.assets[t]["text_id"], self.assets[t]["icon"], i)
            for i, t in enumerate(sorted(listed, key=sort.get))
        }
        owners = {}
        for (dlc,) in self.db.execute("select guid from dlc").fetchall():
            for u in self.items(dict_get(self.assets[dlc]["v"], "UplayProduct.UplayProductUnlocks")):
                owners[self.num(u.get("UplayProductUnlock"))] = dlc
        for g in sorted(regions):
            a, v = self.assets[g], self.assets[g]["v"]
            self.db.execute(
                "insert into ornament values(?,?,?,?,?,?,?,null)",
                (
                    g,
                    self.text(a["text_id"]),
                    self.text(D(v.get("Standard")).get("InfoDescription")),
                    self.icon(a["icon"]),
                    # the menus list most ornaments for every region; pack statues come in one per region
                    next(iter(regions[g])) if len(regions[g]) == 1 else None,
                    self.num(D(v.get("Ornament")).get("OrnamentUnit")),
                    owners.get(g),
                ),
            )
            self.cost_rows(v, g, "ornament")
            for t in tabs[g]:
                self.db.execute("insert or ignore into category_member values(?,?)", (category[t], g))

    # ---- labels --------------------------------------------------------------------------------------------
    def labels(self):
        """Names the game gives keys we store (attributes, rarities, modifier paths, diplomacy states …), from its
        own config tables; the client names everything else it shows with these."""

        def config(template):
            return D(next(iter(self.by_template(template)), {}).get("v"))

        for kind, template, path, field in LABEL_TABLES:
            for key, entry in D(dict_get(config(template), path)).items():
                if D(entry).get(field):
                    icon = D(entry).get("Icon") or D(entry).get("IconFilename")
                    icon = D(self.assets.get(self.num(icon))).get("icon") if self.num(icon) else icon
                    self.db.execute(
                        "insert or ignore into label values(?,?,?,?)",
                        (self.enum("label_kind", kind), key, self.text(entry[field]), self.icon(icon)),
                    )
        tables = {t: config(t) for t in ("ItemKeywords", "ItemInfotipTextFeature")}
        paths = self.db.execute("select distinct path from buff_modifier where attribute_id is null").fetchall()
        for (path,) in [*paths, ("BuildingUpgrade.AdditionalFunctionalEffect",)]:
            mesh = MESH_UPKEEP.match(path)
            ref = f"{K}AreaMaintenanceMeshGraphUpkeep.{mesh[1]}.Key" if mesh else MODIFIER_TEXTS.get(path)
            tid = dict_get(tables.get(ref.split(".")[0], {}), ref) if ref else None
            if not tid:
                print(f"warning: no game text for modifier {path}", file=sys.stderr)
                continue
            self.db.execute("insert into label values(?,?,?,null)", (self.enum("label_kind", "modifier"), path, self.text(tid)))

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
                "insert into effect values(?,?,?,?)",
                (
                    a["guid"],
                    self.text(a["text_id"]),
                    self.text(a["v"]["Standard"].get("InfoDescription")),
                    self.num(D(e.get("TimedEffect")).get("EffectDuration")),
                ),
            )
            for b in self.items(e.get("Buffs")):
                if self.num(b.get("GUID")):
                    self.db.execute(
                        "insert into effect_buff values(?,?)",
                        (a["guid"], self.num(b["GUID"])),
                    )
            # area effects name no targets; their buffs say which buildings' range they change (e.g. Markets)
            targets = [self.num(t.get("GUID")) for t in self.items(e.get("Targets"))] or [
                self.num(t.get("Target"))
                for b in self.items(e.get("Buffs"))
                for t in self.items(
                    D(D(D(self.assets.get(self.num(b.get("GUID")))).get("v")).get("AreaBuff")).get(
                        "RadiusEffectRangeTarget"
                    )
                )
            ]
            for t in dict.fromkeys(g for g in targets if g):
                self.insert_target(a["guid"], t)
        for a in self.assets.values():
            if not (a["template"] or "").endswith("Buff") or "Buff" not in a["v"]:
                continue
            for prop, body in a["v"].items():
                if (
                    not prop.endswith("Upgrade")
                    and prop not in ("RaceTrackUpgrades", "AreaBuff", "AreaNeedAttributeBuff")
                    or not isinstance(body, dict)
                ):
                    continue
                for path, val in self.walk_leaves(body, prop):
                    # list entries name the good they change, e.g. AddDeltas[0].Product or GoodConsumptionUpgrade[0].ProvidedNeedProduct
                    parent = dict_get(a["v"], path.rsplit(".", 1)[0]) if "[" in path else None
                    product = self.num(
                        D(parent).get("Product") or D(parent).get("ProvidedNeedProduct")
                    )
                    leaf = path.rsplit(".", 1)[-1]
                    if (
                        leaf.endswith("Percent")
                        and leaf not in ("FertilityPercent", "AreaFertilityPercent")
                        and self.num(val, 0)
                    ):
                        # a bare percentage, e.g. FactoryUpgrade.FuelDurationPercent = 20
                        self.db.execute(
                            "insert into buff_modifier(buff_guid, path, attribute_id, value, is_percent, product_guid) values(?,?,?,?,?,?)",
                            (a["guid"], re.sub(r"\[\d+\]", "", path), None, self.num(val), 1, product),
                        )
                    elif re.search(r"AddDeltas\[\d+\]\.Amount$", path) and self.num(val, 0):
                        # an added amount of a good, e.g. villa workforce
                        self.db.execute(
                            "insert into buff_modifier(buff_guid, path, attribute_id, value, is_percent, product_guid) values(?,?,?,?,?,?)",
                            (a["guid"], "DistributionUpgrade.AddDeltas", None, self.num(val), 0, product),
                        )
                    elif path.endswith(".Value") or path.endswith(
                        "AmountOrPercent.Value"
                    ):
                        base = path[: -len(".Value")]
                        pct = 1 if dict_get(a["v"], base + ".Percental") == "1" else 0
                        base = base.replace(".AmountOrPercent", "").replace(".ValueOrPercent", "")
                        attr = re.search(r"(?:AdditionalAttributes|NeedAttributes|BonusAttributes)\.(\w+)$", base)
                        attr_id = self.attribute(attr[1]) if attr else None
                        # list entries (AreaMaintenanceUpgrade.Workforce[0].Amount) name their good
                        product = self.num(D(dict_get(a["v"], base.rsplit(".", 1)[0])).get("Product")) if "[" in base else None
                        base = re.sub(r"\[\d+\]", "", base)
                        self.db.execute(
                            "insert into buff_modifier(buff_guid, path, attribute_id, value, is_percent, product_guid) values(?,?,?,?,?,?)",
                            (
                                a["guid"],
                                base,
                                attr_id,
                                self.num(val, 0),
                                pct,
                                product,
                            ),
                        )
                    elif path.endswith("AdditionalFunctionalEffect") and self.num(val):
                        self.db.execute(
                            "insert into buff_functional_effect values(?,?)",
                            (a["guid"], self.num(val)),
                        )
                    elif path.endswith(".ProvidedNeed") and self.num(val):
                        self.db.execute(
                            "insert or ignore into buff_provided_need values(?,?)",
                            (a["guid"], self.num(val)),
                        )
            self._templated_modifiers(a)

    def _templated_modifiers(self, a):
        """Buff effects the game phrases with its item infotip templates ("Additional {}t {} every {} cycles"): rows
        carry the template's arguments, the path names the template (see MODIFIER_TEXTS)."""
        v = a["v"]
        fu, bu = D(v.get("FactoryUpgrade")), D(v.get("BuildingUpgrade"))

        def row(path, value=None, product=None, asset=None, cycles=None, key=None):
            self.db.execute(
                "insert into buff_modifier(buff_guid, path, value, is_percent, product_guid, asset_guid, cycles, key) values(?,?,?,0,?,?,?,?)",
                (a["guid"], path, value, product, asset, cycles, key),
            )

        if self.num(fu.get("AddedFertility")):
            row("FactoryUpgrade.AddedFertility", asset=self.num(fu["AddedFertility"]))
        for o in self.items(fu.get("AdditionalOutput")):
            cycles = self.num(o.get("AdditionalOutputCycle"), 1)
            # no product, or ForceProductSameAsFactoryOutput: more of what the building makes
            product = None if o.get("ForceProductSameAsFactoryOutput") == "1" else self.num(o.get("Product"))
            path = "FactoryUpgrade.AdditionalOutput" + ("" if product else ".Same") + (".EveryCycle" if cycles == 1 else "")
            row(path, self.num(o.get("Amount"), 1), product, cycles=cycles)
        for w in self.items(bu.get("AdditionalWorkforces")):
            if self.num(w.get("WorkforceGUID")):
                row("BuildingUpgrade.AdditionalWorkforces", product=self.num(w["WorkforceGUID"]))
        for r in self.items(fu.get("ReplaceInputs")):
            if self.num(r.get("NewInput")) and self.num(r.get("OldInput")):
                row("FactoryUpgrade.ReplaceInputs", product=self.num(r["NewInput"]), asset=self.num(r["OldInput"]))
        for incident in str(D(v.get("IncidentInfectableUpgrade")).get("IncidentImmunity") or "").split(";"):
            if incident:
                row("IncidentInfectableUpgrade.IncidentImmunity", key=incident)

    # ---- items ---------------------------------------------------------------------------------------------
    def items_(self):
        written = {int(r[0]) for r in self.src.execute("select distinct line_id from texts")}
        # a stat an item's racer preset doesn't overwrite keeps the Hippodrome default; none goes past MaximumValue
        racer = D(D(D(next(iter(self.by_template("RaceTrackConfig")), {}).get("v")).get("RaceTrackConfig")).get(
            "ItemRacerAttributes"
        ))
        for a in self.by_template("Item", "ItemWithBoost", "ItemWithUI", "ItemQuest"):
            if self.num(a["text_id"]) not in written:
                continue  # the game never shows an item it has no name for (cut props, unused specialists, test items)
            it, e = D(a["v"].get("Item")), a["v"].get("Effect")
            eff_guid = (
                a["guid"] if e else None
            )  # the item asset itself carries the Effect property
            if e:
                self.db.execute(
                    "insert or ignore into effect values(?,?,?,?)",
                    (
                        a["guid"],
                        self.text(a["text_id"]),
                        None,
                        self.num(D(e.get("TimedEffect")).get("EffectDuration")),
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
                        self.insert_target(a["guid"], t["GUID"])
            boost = D(a["v"].get("ItemWithBoost"))
            self.db.execute(
                "insert into item values(?,?,?,?,?,?,?,?,?,?,?,null)",
                (
                    a["guid"],
                    self.text(a["text_id"]),
                    self.text(a["v"]["Standard"].get("InfoDescription")),
                    self.icon(a["icon"]),
                    self.enum("rarity", it.get("Rarity")),
                    self.enum("niche", it.get("Niche")),
                    self.enum("allocation", it.get("Allocation")),
                    self.num(it.get("TradePrice")),
                    eff_guid,
                    self.text(boost.get("BoostHint")),
                    self.item_dlc(it),
                ),
            )
            # templates give every item a racer preset, but the Hippodrome's socket only takes specialists
            racer_preset = D(it.get("RaceTrackConfig")).get("ItemRacerPreset") if it.get("Allocation") == "Villa" else None
            preset = D(D(self.assets.get(self.num(racer_preset))).get("v"))
            overwrites = D(D(preset.get("ItemRacerPreset")).get("RacerAttributeOverwrites"))
            for key, base in racer.items() if preset else ():
                o, base = D(overwrites.get(key)), D(base)
                lo = self.num(o.get("MinInitialValue"), self.num(base.get("MinimumInitialValue"), 0))
                hi = self.num(o.get("MaxInitialValue"), self.num(base.get("MaximumInitialValue"), 0))
                cap = self.num(base.get("MaximumValue"), 10)
                self.db.execute(
                    "insert into item_racer_attribute values(?,?,?,?,?,?)",
                    (
                        a["guid"],
                        self.enum("racer_attribute", key),
                        lo,
                        hi,
                        min(cap, lo + self.num(o.get("MinAddedPotential"), self.num(base.get("MinimumAddedPotential"), 0))),
                        min(cap, hi + self.num(o.get("MaxAddedPotential"), self.num(base.get("MaximumAddedPotential"), 0))),
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
                    (a["guid"], self.condition("item", a["guid"], bc["Condition"])),
                )

    # ---- item sources --------------------------------------------------------------------------------------
    def sources(self):
        """Where an item can be obtained: traders, contracts, ship drops, defeated rivals, visitors, festivals, techs, quests."""
        item_guids = {g for (g,) in self.db.execute("select guid from item")}

        def add(kind, source, pool):
            for g in self.flatten_pool(pool) & item_guids:
                self.db.execute(
                    "insert or ignore into item_source values(?,?,?)",
                    (g, self.enum("item_source_kind", kind), source),
                )

        for a in self.by_template(*PARTICIPANTS):
            p, v = D(a["v"].get("Participant")), a["v"]
            add("trader", a["guid"], D(v.get("Trader")).get("OfferedItems"))
            for r in self.items(D(v.get("ContractProvider")).get("ItemRewards")):
                add("contract", a["guid"], r.get("ItemRewardPool"))
            add("shipDrop", a["guid"], p.get("ShipDropRewardPool"))
            add("defeated", a["guid"], p.get("ItemGainedWhenDefeated"))
        for a in self.by_template("Festival"):
            add("festival", a["guid"], D(a["v"].get("Festival")).get("ItemRewardPool"))
        for a in self.by_template("VisitorsFeature"):
            for p in self.items(D(a["v"].get("VisitorsConfig")).get("VisitorPools")):
                add("visitor", a["guid"], p.get("Pool"))
        for a in self.by_template("Tech"):
            for it in self.items(D(D(a["v"].get("Tech")).get("Rewards")).get("Items")):
                add("tech", a["guid"], it.get("ItemAsset"))
        # rewards of quest nodes; nodes outside a quest are attributed to their storyline
        for quest, story, g in self.db.execute(
            """select distinct n.quest_guid, n.storyline_guid, r.asset_guid from quest_reward r
               join quest_node n on n.guid=r.node_guid where r.kind in ('goods', 'item')"""
        ).fetchall():
            if quest:
                add("quest", quest, g)
            elif story:
                add("storyline", story, g)

    # ---- techs & unlocks -----------------------------------------------------------------------------------
    def techs(self):
        # category hubs: the tree places each hub at Position (pixels) and its techs' GridPosition relative to it
        order = [
            self.num(c.get("Category"))
            for f in self.by_template("TechsFeature")
            for c in self.items(D(f["v"].get("TechFeature")).get("CategoryOrder"))
        ]
        def asset_icon(g):
            return D(self.assets.get(self.num(g))).get("icon")

        # a category's opening gate isn't in its Techs list or linked from it; the game names it "Gate <type> Early"
        tech_by_name = {a["name"]: a["guid"] for a in self.by_template("Tech")}

        # a building's own guid, or a monument phase's (e.g. Hippodrome Phase 0) -> the building it belongs to
        buildings = {g: g for (g,) in self.db.execute("select guid from building")}
        buildings |= dict(self.db.execute("select guid, building_guid from building_phase"))

        category = {}
        tech_dlc = {}
        for a in self.by_template("TechCategory"):
            c = D(a["v"].get("TechCategory"))
            pos = D(c.get("Position"))
            self.db.execute(
                "insert into tech_category values(?,?,?,?,?,?,?,?,?)",
                (
                    a["guid"],
                    self.text(c.get("CategoryName")),
                    self.text(D(a["v"].get("Standard")).get("InfoDescription")),
                    tech_by_name.get(f"Gate {c.get('CategoryType')} Early"),
                    self.icon(asset_icon(c.get("CategoryIcon")) or a["icon"]),
                    self.icon(asset_icon(c.get("CategoryArtwork"))),
                    self.num(pos.get("X"), 0),
                    self.num(pos.get("Y"), 0),
                    order.index(a["guid"]) if a["guid"] in order else len(order),
                ),
            )
            for it in self.items(c.get("Techs")):
                category[self.num(it.get("Tech"))] = a["guid"]
            # DLC categories (DLC01, DLC02 …) own their techs, opening gate included
            match = re.fullmatch(r"DLC0*(\d+)", str(c.get("CategoryType")))
            if match:
                owner = self.dlc_by_name(f"DLC{match[1]}")
                gate = tech_by_name.get(f"Gate {c.get('CategoryType')} Early")
                for it in self.items(c.get("Techs")):
                    tech_dlc[self.num(it.get("Tech"))] = owner
                tech_dlc[gate] = owner
        for a in self.by_template("Tech"):
            t = D(a["v"].get("Tech"))
            gp = D(t.get("GridPosition"))
            self.db.execute(
                "insert into tech values(?,?,?,?,?,?,?,?,?,?,?,?,null)",
                (
                    a["guid"],
                    self.text(t.get("TechName")),
                    self.text(t.get("TechDescription")),
                    self.icon(a["icon"]),
                    self.num(t.get("KnowledgeNeeded")),
                    1 if t.get("IsGate") == "1" else 0,
                    self.num(gp.get("X"), 0),
                    self.num(gp.get("Y"), 0),
                    category.get(a["guid"]),
                    1 if t.get("ShowConnectionToCategory") == "1" else 0,
                    # Culture is None, Roman or Celtic
                    self.region(t.get("Culture")),
                    tech_dlc.get(a["guid"]),
                ),
            )
            rw = D(t.get("Rewards"))
            for idx, u in enumerate(self.items(rw.get("Unlocks"))):
                # the asset as the game lists it (e.g. "Warehouse Upgrade"), before pools are flattened
                shown = self.assets.get(self.num(u.get("UnlockReward")))
                if shown:
                    # the game describes the entry with the first building in the pool (e.g. the wall in "Stone Walls")
                    building = next(
                        (buildings[g] for g in self.pool_members(shown["guid"]) if g in buildings),
                        None,
                    )
                    self.db.execute(
                        "insert into tech_unlock_reward values(?,?,?,?,?,?,?)",
                        (
                            a["guid"],
                            idx,
                            shown["guid"],
                            self.text(shown["text_id"]),
                            # its own text (e.g. "Unlocks all buildings necessary to produce armour."), else its first member's
                            next(
                                (
                                    self.text(desc)
                                    for g in [shown["guid"], *self.pool_members(shown["guid"])]
                                    if (
                                        desc := D(self.assets[g]["v"].get("Standard")).get(
                                            "InfoDescription"
                                        )
                                    )
                                ),
                                None,
                            ),
                            self.icon(shown["icon"]),
                            building,
                        ),
                    )
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
                            "insert or ignore into unlock values(?,?,?)",
                            (g, a["guid"], cid),
                        )

    # ---- monument construction phases ----------------------------------------------------------------------
    def phases(self):
        """Separate instant placement from timed construction, using factory input per microphase."""
        for a in self.assets.values():
            m = D(a["v"].get("Monument"))
            if self.num(m.get("BaseAsset")) != a["guid"] or (a["name"] or "").startswith(
                "Campaign"
            ):
                continue  # chain roots only; the campaign chain is a scripted copy of the Amphitheatre's
            chain, g = [], a["guid"]
            while "Monument" in D(D(self.assets.get(g)).get("v")):
                chain.append(self.assets[g])
                g = self.num(D(self.assets[g]["v"]["Monument"]).get("UpgradeTarget"))
            chain.append(self.assets[g])
            for i, p in enumerate(chain, 1):
                # Each row describes reaching the target asset. Construction happens on its predecessor.
                source = chain[i - 2] if i > 1 else p
                factory = D(source["v"].get("FactoryBase"))
                cycles = self.num(D(source["v"].get("Monument")).get("MicrophaseCount"), 0)
                duration = cycles * self.num(factory.get("CycleTime"), 0) if i > 1 else 0
                self.db.execute(
                    "insert into building_phase values(?,?,?,?,?)",
                    (p["guid"], g, i, self.text(source["text_id"]), duration),
                )
                if i == 1:
                    self.cost_rows(
                        {"Cost": source["v"].get("Cost")}, p["guid"], "building_phase"
                    )
                else:
                    self.cost_rows(
                        {"Maintenance": source["v"].get("Maintenance")},
                        p["guid"],
                        "building_phase",
                    )
                    for item in self.items(factory.get("FactoryInputs")):
                        amount = self.num(item.get("Amount"), 1) * cycles
                        if amount:
                            self.db.execute(
                                "insert into building_phase_cost values(?,?,?)",
                                (p["guid"], self.num(item.get("Product")), amount),
                            )
                self.db.execute(
                    "update or replace tech_unlock set asset_guid=? where asset_guid=?",
                    (g, p["guid"]),
                )
            self.db.execute("delete from building_cost where building_guid=?", (g,))
            self.db.execute(
                """insert into building_cost select ?, product_guid, sum(amount) from building_phase_cost
                   where phase_guid in (select guid from building_phase where building_guid=?) group by product_guid""",
                (g, g),
            )

    # ---- quests --------------------------------------------------------------------------------------------
    def quests(self):
        node_story = {}
        for a in self.by_template("StoryLine"):
            sl = D(a["v"].get("StoryLine"))
            self.db.execute("insert into storyline(guid) values(?)", (a["guid"],))
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
                            "insert into storyline_variable values(?,?,?)",
                            (a["guid"], var["Name"], var.get("StartValue")),
                        )
            cid = self.precondition_list(
                "storyline", a["guid"], a["v"].get("PreConditionList")
            )
            if cid:
                self.db.execute(
                    "insert into storyline_condition values(?,?)", (a["guid"], cid)
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
                            "insert or ignore into quest_edge values(?,?,?,?)",
                            (g, self.num(val), kind, idx),
                        )
                        queue.append(self.num(val))
        for a in self.by_template("QuestEntry"):
            q = D(a["v"].get("QuestEntry"))
            self.db.execute(
                "insert into quest values(?,?,?,null,?)",
                (
                    a["guid"],
                    self.text(q.get("QuestName")),
                    self.icon(a["icon"]),
                    self.province_region(q.get("QuestProvince")),
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
            fn = D(v.get("Function"))
            # a function with a failure port branches on its precondition; one without only waits for it
            branch = (
                self.precondition_list("quest_node", g, v.get("PreConditionList"))
                if fn.get("FunctionFailureOutput")
                else None
            )
            self.db.execute(
                "insert into quest_node values(?,?,?,?,?,?,?,?)",
                (
                    g,
                    story,
                    a["template"],
                    quest,
                    self.text(dsc.get("Headline") or cq.get("ObjectiveTextHeadline")),
                    self.text(
                        D(dsc.get("Text")).get("Value") or cq.get("ObjectiveTextFull")
                    ),
                    branch,
                    self.speaker(dsc),
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
                cost = D(opt.get("CostData")) if opt.get("HasCost") == "1" else {}
                self.db.execute(
                    "insert into quest_option values(?,?,?,?,?,?)",
                    (
                        g,
                        i,
                        self.text(opt.get("OptionText")),
                        next(
                            (
                                self.num(p.get("GUID"))
                                for p in self.items(cost.get("Products"))
                            ),
                            None,
                        ),
                        self.num(D(cost.get("Amount")).get("Value")),
                        self.precondition_list(
                            "quest_option",
                            g,
                            D(
                                D(
                                    D(opt.get("UnlockRequirement")).get("Conditions")
                                ).get("Values")
                            ).get("PreConditionList"),
                        ),
                    ),
                )
            for rw in self.items(D(v.get("Reward")).get("RewardAssets")):
                if self.num(rw.get("Reward")):
                    self.db.execute(
                        "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                        (
                            g,
                            "item",
                            self.num(rw["Reward"]),
                            self.num(rw.get("Amount"), 1),
                            None,
                        ),
                    )
            # actions run by sequences and by decision screens once shown (an option's outcome screen)
            for d in self.walk_dicts(
                [D(v.get("Sequence")), D(v.get("DecisionComponent"))]
            ):
                for act in REWARD_ACTIONS & set(d):
                    self._reward(g, act, d[act])
                if isinstance(d.get("ActionModifyVariable"), dict):
                    self._variable_change(g, d["ActionModifyVariable"])
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
        # the rewarded asset's own name and icon, for assets without a table of their own (incidents, provinces, ships)
        for (g,) in self.db.execute(
            "select distinct asset_guid from quest_reward where asset_guid is not null"
        ).fetchall():
            a = self.assets.get(g)
            if a:
                self.db.execute(
                    "update quest_reward set name_text=?, icon=? where asset_guid=?",
                    (self.text(a["text_id"]), self.icon(a["icon"]), g),
                )
        # amounts read from a storyline's own variable that nothing changes are constants: use the start value
        written = {
            (node_story.get(n), var)
            for n, var in self.db.execute("select node_guid, variable from quest_variable_change")
        } | {
            (s, d["ActionSetVariable"]["VariableName"])
            for g, s in node_story.items()
            for d in self.walk_dicts(self.assets[g]["v"])
            if isinstance(d.get("ActionSetVariable"), dict)
            and d["ActionSetVariable"].get("VariableName")
        }
        starts = {
            (s, name): self.num(v)
            for s, name, v in self.db.execute(
                "select storyline_guid, name, start_value from storyline_variable where start_value is not null"
            )
        }
        for rowid, node, var in self.db.execute(
            "select rowid, node_guid, amount_variable from quest_reward where amount_variable is not null"
        ).fetchall():
            key = (node_story.get(node), var)
            if key in starts and key not in written:
                self.db.execute(
                    "update quest_reward set amount=?, amount_variable=null where rowid=?",
                    (starts[key], rowid),
                )
        # unlocking an unnamed asset flips internal state (campaign flags, diplomacy reasons) the player never sees
        self.db.execute(
            "delete from quest_reward where kind in ('unlock', 'lock') and name_text is null"
        )
        self.storyline_titles(node_story)
        self.choices(node_story)
        self.questlines(node_story)

    def storyline_titles(self, node_story):
        """Player-facing name of a storyline: its first decision's headline, else its journal entry, plus the
        governor request text and icon that announce it."""
        by_story = defaultdict(list)
        for g, s in node_story.items():  # BFS order from the storyline start
            by_story[s].append(g)
        # some headlines point at lines the game never wrote
        written = {int(r[0]) for r in self.src.execute("select distinct line_id from texts")}

        def line(tid):
            tid = self.text(tid)
            return tid if tid in written else None

        for s, nodes in by_story.items():
            title = request = icon = None
            for g in nodes:
                root = D(self.assets[g]["v"].get("DecisionRoot"))
                if not root:
                    continue
                req = D(
                    D(D(root.get("DecisionGovernorRequest")).get("Values")).get(
                        "GovernorRequest"
                    )
                )
                start = self.assets.get(self.num(root.get("DecisionRootStartComponent")))
                screen = D(D(start["v"].get("Decision")).get("DecisionScreenConfig")) if start else {}
                title = title or line(screen.get("Headline"))
                request = request or line(req.get("RequestDescription"))
                icon = icon or self.icon(D(self.assets.get(self.num(req.get("RequestIcon")))).get("icon"))
            if not title:
                title = next(
                    (
                        t
                        for (t,) in self.db.execute(
                            "select name_text from quest where storyline_guid=? and name_text is not null order by guid",
                            (s,),
                        )
                        if t in written
                    ),
                    None,
                )
            self.db.execute(
                "update storyline set title_text=?, request_text=?, icon=? where guid=?",
                (title, request, icon, s),
            )

    def choices(self, node_story):
        """Decisions offering several options and functions branching on a condition, each with the nodes that
        run when an option is taken (or the condition holds / fails) up to the next choice or decision event."""
        edges = defaultdict(list)
        for f, t, kind, idx in self.db.execute(
            "select from_guid, to_guid, kind, idx from quest_edge"
        ):
            edges[f].append((t, kind, idx))
        types = dict(self.db.execute("select guid, type from quest_node"))
        options = defaultdict(int)
        for (g,) in self.db.execute("select decision_guid from quest_option"):
            options[g] += 1
        branches = {
            g
            for (g,) in self.db.execute(
                "select guid from quest_node where condition_id is not null"
            )
        }
        # the start screen of each decision event; its option i also continues at the event's output i
        root_of = {}
        for g, t in types.items():
            if t == "DecisionRoot":
                start = self.num(
                    D(self.assets[g]["v"].get("DecisionRoot")).get(
                        "DecisionRootStartComponent"
                    )
                )
                if start:
                    root_of[start] = g

        start_of = {root: start for start, root in root_of.items()}

        def is_choice(g):
            return (types.get(g) == "Decision" and options[g] > 1) or g in branches

        def reach(starts):
            out, queue, seen = [], list(starts), set()
            while queue:
                g = queue.pop(0)
                if (
                    g in seen
                    or g not in types
                    or types[g] in ("Exit", "StateChecker", "Loop")
                ):
                    continue
                seen.add(g)
                # a decision event opens on its start screen; a start screen with one option carries on at its outputs
                if types[g] == "DecisionRoot":
                    start = start_of.get(g)
                    if start:
                        queue.append(start)
                        if not is_choice(start):
                            queue += [
                                t for t, k, _ in edges[g] if k == "DecisionRoot.DecisionRootOutput.Output"
                            ]
                    continue
                out.append(g)
                # the next choice is kept as the outcome's last node ("then …") but not walked into
                if is_choice(g):
                    continue
                queue += [t for t, kind, _ in edges[g] if kind in OUTCOME_EDGES]
            return out

        position = defaultdict(int)
        for g, story in node_story.items():
            if not is_choice(g):
                continue
            if g in branches:
                kind = "check"
                starts = [
                    [t for t, k, _ in edges[g] if k == "Function.FunctionSuccessOutput"],
                    [t for t, k, _ in edges[g] if k == "Function.FunctionFailureOutput"],
                ]
            else:
                kind = "decision"
                root = root_of.get(g)
                starts = [
                    [
                        t
                        for t, k, idx in edges[g]
                        if k == "DecisionComponent.DecisionOutputs.SuccessOutput"
                        and idx == i
                    ]
                    + [
                        t
                        for t, k, idx in edges[root] if root
                        and k == "DecisionRoot.DecisionRootOutput.Output"
                        and idx == i
                    ]
                    for i in range(options[g])
                ]
            self.db.execute(
                """insert into quest_choice select guid, storyline_guid, ?, ?, headline_text, text_text, condition_id,
                   speaker_guid from quest_node where guid=?""",
                (kind, position[story], g),
            )
            position[story] += 1
            for i, s in enumerate(starts):
                for n in reach(s):
                    self.db.execute(
                        "insert or ignore into quest_choice_outcome values(?,?,?)",
                        (g, i, n),
                    )

    def questlines(self, node_story):
        """Group narrative storylines into questlines: storylines are linked when one writes a global variable
        another reads (favours, flags, "part done") or when one starts the other. Radiant storylines (random
        requests and contracts), cut content and tutorials are left out."""
        story_of = dict(node_story)
        names = {s: self.assets[s]["name"] for (s,) in self.db.execute("select guid from storyline")}
        by_story = defaultdict(list)
        for g, s in node_story.items():
            by_story[s].append(g)

        def radiant(s):
            return D(self.assets[s]["v"].get("StoryLine")).get("System") == "Contracts" or any(
                isinstance(d.get("SetVariableTo"), dict)
                and re.search(r"Random|PoolEntry", json.dumps(d["SetVariableTo"]))
                for g in by_story[s]
                for d in self.walk_dicts(self.assets[g]["v"])
            )

        keep = {
            s
            for s in names
            if by_story[s] and not NON_STORY.search(names[s] or "") and not radiant(s)
        }
        local = defaultdict(set)
        for s, name in self.db.execute("select storyline_guid, name from storyline_variable"):
            local[s].add(name)
        writes, reads = defaultdict(set), defaultdict(set)
        for node, var in self.db.execute("select node_guid, variable from quest_variable_change"):
            if story_of.get(node) in keep and var not in local[story_of[node]]:
                writes[var].add(story_of[node])
        for kind, owner, var in self.db.execute(
            """select c.owner_kind, c.owner_id, p.value from condition c join condition_param p on p.condition_id=c.id
               where c.template='ConditionCompareVariable' and (p.key='VariableToCheck' or p.key like '%VariableName')"""
        ):
            s = owner if kind == "storyline" else story_of.get(owner)
            if s in keep and var not in local[s]:
                reads[var].add(s)
        after = defaultdict(set)  # storyline -> storylines that come after it
        for var, ws in writes.items():
            for w in ws:
                after[w] |= reads[var] - {w}
        for node, target in self.db.execute(
            "select node_guid, asset_guid from quest_reward where kind='storyline'"
        ):
            if story_of.get(node) in keep and target in keep and target != story_of[node]:
                after[story_of[node]].add(target)
        parent = {s: s for s in keep}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        for a, bs in after.items():
            for b in bs:
                parent[find(a)] = find(b)
        # variables several storylines write but none reads still tie them together (the favours of a questline)
        for ws in writes.values():
            first, *rest = sorted(ws)
            for b in rest:
                parent[find(b)] = find(first)
        groups = defaultdict(list)
        for s in keep:
            groups[find(s)].append(s)
        choice_stories = {
            s for (s,) in self.db.execute("select storyline_guid from quest_choice where kind='decision'")
        }
        titled = {
            s: (t, r, i)
            for s, t, r, i in self.db.execute("select guid, title_text, request_text, icon from storyline")
        }
        for members in groups.values():
            if not choice_stories & set(members):
                continue
            # parts in dependency order (Kahn), ties and cycles broken by guid
            pending = {s: {a for a in members if s in after[a]} for s in members}
            order = []
            while pending:
                ready = sorted(s for s, deps in pending.items() if not deps) or [min(pending)]
                s = ready[0]
                order.append(s)
                del pending[s]
                for deps in pending.values():
                    deps.discard(s)
            parts = [s for s in order if s in choice_stories or titled[s][0]]
            name = next((titled[s][0] for s in parts if titled[s][0]), None) or next(
                (titled[s][1] for s in parts if titled[s][1]), None
            )
            if not name:  # prototypes and experiments the game never names
                continue
            first = parts[0]
            regions = [
                r
                for (r,) in self.db.execute(
                    f"select region_id from quest where region_id is not null and storyline_guid in ({','.join('?' * len(parts))})",
                    parts,
                )
            ]
            prefix = (names[first] or "").split(" ")[0]
            self.db.execute(
                "insert into questline values(?,?,?,?,?,null)",
                (
                    first,
                    name,
                    next((titled[s][2] for s in parts if titled[s][2]), None),
                    max(set(regions), key=regions.count) if regions else REGION_PREFIX.get(prefix),
                    next((d for d in map(self.name_dlc, (names[s] for s in parts)) if d), None)
                    or next(
                        (
                            self.dlc_by_name(f"{m[1].upper()}{int(m[2])}")
                            for m in (DLC_PATH.search(f"/{titled[s][2] or ''}") for s in parts)
                            if m
                        ),
                        None,
                    ),
                ),
            )
            for i, s in enumerate(parts):
                self.db.execute(
                    "insert into questline_storyline values(?,?,?)", (first, s, i)
                )
            # journal entries renamed mid-quest ("Folk Of The Great River" becomes "Breadbasket"), for search
            for s in members:
                for g in by_story[s]:
                    for d in self.walk_dicts(self.assets[g]["v"]):
                        new = self.text(D(D(d.get("ActionUpdateQuestEntry")).get("QuestName")).get("NewName"))
                        if new:
                            self.db.execute("insert into questline_alias values(?,?)", (first, new))

    def speaker(self, screen):
        """Who asks on a decision screen: its left portrait, else its right one; never the player, and not a
        variable (the active emperor …), which only resolves in a running game."""
        for side in ("LeftParticipant", "RightParticipant"):
            g = self.num(D(screen.get(side)).get("Value"))
            if g in self.assets and self.assets[g]["template"] != "Participant Human":
                return g
        return None

    def _variable_change(self, node, body):
        """ActionModifyVariable: `Modifier` defaults to Set, an unset value to 0 / false (properties.xml defaults)."""
        mv = D(body.get("ModifierVariable"))
        is_bool = "Bool" in json.dumps(mv)
        value = value_variable = None
        for k, val in self.walk_leaves(mv):
            if k.endswith("VariableName"):
                value_variable = val
            elif k.endswith("Value") and not k.endswith("VariableOrValue"):
                value = val
        if value is None and not value_variable:
            value = "0"
        if is_bool and value is not None:
            value = "true" if value == "1" else "false"  # flags read as yes / no, not 1 / 0
        if body.get("VariableName"):
            self.db.execute(
                "insert into quest_variable_change values(?,?,?,?,?)",
                (
                    node,
                    body["VariableName"],
                    self.enum("variable_operation", body.get("Modifier", "Set")),
                    value,
                    value_variable,
                ),
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
                    "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                    (node, "goods", self.num(D(gd.get("Good")).get("Value")), a, var),
                )
        elif act == "ActionChangeReputation":
            a, var = amt(body.get("Amount"))
            self.db.execute(
                "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                (node, "reputation", None, a, var),
            )
        elif act == "ActionEffect":
            self.db.execute(
                "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                (node, "effect", self.num(body.get("EffectAsset")), None, None),
            )
        elif act == "ActionUnlockAsset":
            for it in self.items(body.get("UnlockAssets")):
                for g in self.flatten_pool(it.get("Asset")):
                    self.db.execute(
                        "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                        (node, "unlock", g, None, None),
                    )
        elif act == "ActionAddItemToMetaStorage":
            for it in self.items(body.get("Items")) or [{"Item": body.get("ItemGUID")}]:
                self.db.execute(
                    "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
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
                    "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                    (
                        node,
                        "message_reward",
                        self.num(D(it.get("Asset")).get("Value")),
                        a,
                        var,
                    ),
                )
        elif act == "ActionLockAsset":
            for it in self.items(body.get("LockAssets")):
                for g in self.flatten_pool(it.get("Asset")):
                    self.db.execute(
                        "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                        (node, "lock", g, None, None),
                    )
        elif act == "ActionStartStoryline":
            if self.num(body.get("StorylineAsset")):
                self.db.execute(
                    "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                    (node, "storyline", self.num(body["StorylineAsset"]), None, None),
                )
        elif act == "ActionIncreaseItemRacerAttributeLevel":
            # properties.xml defaults: Speed, one level
            a, var = amt(body.get("IncreaseLevels") or {"Value": "1"})
            self.db.execute(
                "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable, attribute) values(?,?,?,?,?,?)",
                (
                    node,
                    "racer",
                    self.num(D(body.get("ItemGuid")).get("Value")),
                    a,
                    var,
                    self.enum("racer_attribute", body.get("ItemRacerAttribute", "Speed")),
                ),
            )
        elif act == "ActionReplaceItem":
            for it in self.items(body.get("ReplaceItemList")):
                if self.num(it.get("NewItem")):
                    self.db.execute(
                        "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                        (node, "racer", self.num(it["NewItem"]), 1, None),
                    )
        elif act == "ActionChangeBuildingRank":
            a, var = amt(body.get("AddXp"))
            if a or var:
                self.db.execute(
                    "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                    (node, "xp", None, a, var),
                )
        elif act == "ActionStartIncident":
            if self.num(body.get("Incident")):
                self.db.execute(
                    "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                    (node, "incident", self.num(body["Incident"]), None, None),
                )
        elif act == "ActionAddCampaignPowerStruggleReason":
            self.db.execute(
                "insert into quest_reward(node_guid, kind, asset_guid, amount, amount_variable) values(?,?,?,?,?)",
                (node, "power", self.num(body.get("EmperorParticipant")), self.num(body.get("PowerGain")), None),
            )

    # ---- finish --------------------------------------------------------------------------------------------
    def prune(self):
        """Drop what the site never reads: scratch tables, quest data outside questlines, effects and buffs
        nothing grants."""
        self.db.executescript(
            """
            drop table quest_edge; drop table quest_node; drop table storyline_variable;
            -- props (no villa or ship allocation) nothing hands out: campaign letters, trophies …
            delete from item where allocation = 'None' and guid not in (select item_guid from item_source);
            delete from item_boost_buff where item_guid not in (select guid from item);
            delete from item_boost_condition where item_guid not in (select guid from item);
            delete from item_racer_attribute where item_guid not in (select guid from item);
            delete from condition where owner_kind = 'item' and owner_id not in (select guid from item);
            alter table quest drop column region_id;
            alter table storyline drop column request_text;
            -- questlines only
            delete from quest_choice where storyline_guid not in (select storyline_guid from questline_storyline);
            delete from storyline_condition where storyline_guid not in (select storyline_guid from questline_storyline);
            delete from quest_choice_outcome where choice_guid not in (select node_guid from quest_choice);
            delete from quest_option where decision_guid not in (select node_guid from quest_choice);
            delete from quest_reward where node_guid not in (select node_guid from quest_choice_outcome);
            delete from quest_variable_change where node_guid not in (select node_guid from quest_choice_outcome);
            delete from condition where owner_kind in ('quest_option', 'quest_node') and owner_id not in (select node_guid from quest_choice)
              or owner_kind = 'storyline' and owner_id not in (select storyline_guid from questline_storyline);
            -- quests and storylines are only named as item sources, questline parts and follow-up rewards
            delete from quest where guid not in (select source_guid from item_source where kind = 'quest');
            delete from storyline where guid not in (
              select storyline_guid from questline_storyline
              union select source_guid from item_source where kind = 'storyline'
              union select asset_guid from quest_reward where kind = 'storyline');
            -- effects granted by buildings, items, techs and quests, plus the effects their buffs pass on to nearby buildings
            create temp table used_effect as
              select effect_guid guid from building_effect union select effect_guid from item where effect_guid is not null
              union select effect_guid from tech_effect union select asset_guid from quest_reward where kind = 'effect';
            insert into used_effect select bf.effect_guid from buff_functional_effect bf
              where bf.buff_guid in (select buff_guid from effect_buff where effect_guid in (select guid from used_effect)
                union select buff_guid from item_boost_buff);
            delete from effect where guid not in (select guid from used_effect);
            delete from effect_buff where effect_guid not in (select guid from used_effect);
            delete from effect_target_pool where effect_guid not in (select guid from used_effect);
            delete from effect_target_building where effect_guid not in (select guid from used_effect);
            create temp table used_buff as select buff_guid guid from effect_buff union select buff_guid from item_boost_buff;
            delete from buff_modifier where buff_guid not in (select guid from used_buff);
            delete from buff_functional_effect where buff_guid not in (select guid from used_buff);
            delete from buff_provided_need where buff_guid not in (select guid from used_buff);
            delete from condition_param where condition_id not in (select id from condition);
            -- each menu (Latium, Celtic Albion, Roman Albion) ships its own copy of a chain; keep one per region and
            -- output building, the one built most from that region's buildings (Celtic Cheese over Latium's Roman Cheese)
            create temp table chain_rank as
              select pc.guid, row_number() over (partition by pc.region_id, pc.building_guid
                order by sum(b.region_id is pc.region_id) desc, pc.guid) n
              from production_chain pc join production_chain_node pn on pn.chain_guid = pc.guid
              left join building b on b.guid = pn.building_guid group by pc.guid;
            delete from production_chain where guid in (select guid from chain_rank where n > 1);
            delete from production_chain_node where chain_guid not in (select guid from production_chain);
            delete from category_member where asset_guid in (select guid from chain_rank where n > 1);
            """
        )

    def slugs(self):
        """English URL slugs for linkable pages, the same in every language so analytics groups them
        ("Der mysteriöse Murmillo" and "謎のムルミロ戦士" both link to the-mysterious-murmillo)."""
        english = dict(self.db.execute(
            "select t.line_id, t.value from translation t join lang l on l.id = t.lang_id where l.code = 'english'"
        ))

        def slug(text):
            text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
            return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or None

        for table, column in (
            ("building", "name_text"),
            ("product", "name_text"),
            ("unit", "name_text"),
            ("ornament", "name_text"),
            ("item", "name_text"),
            ("tech", "name_text"),
            ("production_chain", "name_text"),
            ("questline", "title_text"),
        ):
            rows = self.db.execute(f"select guid, {column} from {table}").fetchall()
            for guid, tid in rows:
                name = english.get(tid)
                if table == "questline" and name:
                    # a questline is named after its first part (client quests.ts questlineName)
                    name = QUESTLINE_PART.sub("", name)
                self.db.execute(f"update {table} set slug=? where guid=?", (slug(name), guid))

    def search(self):
        """Each searchable entity once per language under its folded name, for the trigram index client search.ts
        queries. Variants that read the same (Infantry Camp ×2) collapse to the lowest guid."""
        self.db.create_function("fold", 1, fold, deterministic=True)
        self.db.executescript(
            """
            create temp table search_source as
              select 'building' type, b.guid, b.slug, b.icon, null rarity, b.name_text, b.description_text,
                (select group_concat(key) from (select r.key from building_region br join region r on r.id = br.region_id
                  where br.building_guid = b.guid order by r.id)) regions from building b
              union all select 'item', guid, slug, icon, rarity, name_text, description_text, null from item
              union all select 'product', guid, slug, icon, null, name_text, null, null from product
              union all select 'tech', guid, slug, icon, null, name_text, description_text, null from tech
              union all select 'quest', guid, slug, icon, null, title_text, null, null from questline
              union all select 'chain', c.guid, c.slug, c.icon, null, c.name_text, null,
                (select key from region where id = c.region_id) from production_chain c
              union all select 'unit', u.guid, u.slug, u.icon, null, u.name_text, u.description_text,
                (select key from region where id = u.region_id) from unit u
              union all select 'ornament', o.guid, o.slug, o.icon, null, o.name_text, o.description_text,
                (select key from region where id = o.region_id) from ornament o;
            insert into search(lang_id, guid, key)
              select n.lang_id, min(s.guid), fold(n.value) from search_source s
              join translation n on n.line_id = s.name_text
              left join translation d on d.line_id = s.description_text and d.lang_id = n.lang_id
              group by n.lang_id, s.type, n.value, d.value, s.rarity, s.regions order by 1, 3;
            -- a questline is also found by the names its journal entry takes on later
            insert into search(lang_id, guid, key)
              select distinct n.lang_id, a.questline_guid, fold(n.value) from questline_alias a
              join translation n on n.line_id = a.name_text
              where fold(n.value) not in (select key from search where guid = a.questline_guid and lang_id = n.lang_id);
            drop table questline_alias;
            insert into search_entry select guid, type, slug, icon, rarity, regions, name_text, description_text
              from search_source where guid in (select guid from search);
            insert into search_fts(search_fts) values('rebuild');
            """
        )

    def finish(self):
        # names of assets conditions point at, and of decision speakers, that have no table of their own
        # (provinces, volcano phases, narrative characters …)
        for (value,) in self.db.execute(
            """select distinct value from condition_param union select speaker_guid from quest_choice where speaker_guid is not null
               union select asset_guid from buff_modifier where asset_guid is not null"""
        ).fetchall():
            a = self.assets.get(self.num(value))
            if a and a["text_id"]:
                self.db.execute(
                    "insert or ignore into asset_name values(?,?,?)",
                    (a["guid"], self.text(a["text_id"]), self.icon(a["icon"])),
                )
        for k, v in self.attributes.items():
            self.db.execute("insert into attribute values(?,?)", (v, k))
        for name, vals in self.enums.items():
            for v in sorted(vals):
                self.db.execute("insert into enum_value values(?,?)", (name, v))
        # every text line a *_text column still points at
        used = set()
        for (t,) in self.db.execute("select name from sqlite_master where type='table'").fetchall():
            for (c,) in self.db.execute("select name from pragma_table_info(?) where name like '%\\_text' escape '\\'", (t,)).fetchall():
                used |= {r for (r,) in self.db.execute(f"select distinct {c} from {t} where {c} is not null")}
        q = ",".join("?" * len(used))
        # stable ids: English and German first (the site's first languages), then the rest alphabetically
        present = {lang for (lang,) in self.src.execute("select distinct lang from texts")}
        order = sorted(present & (self.langs or present), key=lambda x: (x not in ("english", "german"), x != "english", x))
        langs = {lang: i for i, lang in enumerate(order, 1)}
        self.db.executemany("insert into lang values(?,?)", [(i, lang) for lang, i in langs.items()])
        for lid, lang, val in self.src.execute(
            f"select line_id,lang,text from texts where line_id in ({q})",
            list(used),
        ):
            if lang not in langs:
                continue
            self.db.execute(
                "insert into translation values(?,?,?)", (int(lid), langs[lang], val)
            )
        # lines left untranslated (debug cheat items) read as English instead of sorting first as blanks
        self.db.execute(
            "update translation set value = e.value from translation e"
            " where e.line_id = translation.line_id and e.lang_id = ? and translation.value = ''",
            (langs.get("english"),),
        )
        self.slugs()
        self.search()
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


def fold(text):
    """Lowercase without diacritics, as client search.ts folds a query: "BÄCKEREI" and "backerei" both read backerei."""
    text = "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.category(c).startswith("M"))
    return INVISIBLE.sub("", text).lower().replace("ß", "ss")


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


SCHEMA = """
create table region(id integer primary key, key text, name_text integer);
create table dlc(guid integer primary key, key text, name_text integer, icon text);
create table patron(guid integer primary key, name_text integer, icon text);
create table participant(guid integer primary key, name_text integer, icon text);
create table festival(guid integer primary key, name_text integer, icon text);
create table asset_pool(guid integer primary key, name_text integer, icon text);
create table monument_event(guid integer primary key, name_text integer, icon text);
create table population_level(guid integer primary key, name_text integer, icon text, tier int, region_id int references region(id), workforce_product_guid int);
create table attribute(id integer primary key, key text unique);
create table enum_value(name text, value text, primary key(name,value));
create table lang(id integer primary key, code text);
create table translation(line_id integer, lang_id integer references lang(id), value text, primary key(line_id,lang_id)) without rowid;

create table product(guid integer primary key, name_text integer, icon text, slug text);
create table product_region(product_guid int references product(guid), region_id int references region(id), primary key(product_guid,region_id));
create table need(guid integer primary key, product_guid int references product(guid));
create table need_attribute(need_guid int references need(guid), attribute_id int references attribute(id), value real);

create table building(guid integer primary key, name_text integer, description_text integer, icon text, template text,
  category_text integer, region_id int references region(id), radius int, street_radius int, dlc_guid int references dlc(guid), slug text);
create table building_region(building_guid int references building(guid), region_id int references region(id), primary key(building_guid,region_id));
create table building_cost(building_guid int references building(guid), product_guid int references product(guid), amount real);
create table building_maintenance(building_guid int references building(guid), product_guid int references product(guid), amount real);
create table building_effect(building_guid int references building(guid), effect_guid int);
create table building_phase(guid integer primary key, building_guid int references building(guid), phase int, name_text integer, duration_seconds int);
create table building_phase_cost(phase_guid int references building_phase(guid), product_guid int references product(guid), amount real);
create table building_phase_maintenance(phase_guid int references building_phase(guid), product_guid int references product(guid), amount real);
create table factory(building_guid integer primary key references building(guid), cycle_time real, base_productivity real, transporter_range int, needs_fuel int not null default 0);
create table factory_input(building_guid int references building(guid), product_guid int references product(guid), amount real);
create table factory_output(building_guid int references building(guid), product_guid int references product(guid), amount real);
create table residence(building_guid integer primary key references building(guid), population_level_guid int references population_level(guid));
create table residence_need(building_guid int references building(guid), need_guid int references need(guid), consumption_rate real, buff_only int);
create table unit(guid integer primary key, name_text integer, description_text integer, icon text, region_id int references region(id),
  health int, soldiers int, morale int, speed real, build_seconds int, cargo_slots int, item_sockets int, module_slots int, slug text);
create table unit_cost(unit_guid int references unit(guid), product_guid int references product(guid), amount real);
create table unit_maintenance(unit_guid int references unit(guid), product_guid int references product(guid), amount real);
create table unit_recruiter(unit_guid int references unit(guid), building_guid int references building(guid), primary key(unit_guid, building_guid)) without rowid;
create table production_chain(guid integer primary key, name_text integer, icon text, building_guid int references building(guid), region_id int references region(id), slug text);
create table production_chain_node(id integer primary key, chain_guid int references production_chain(guid), parent_id int, building_guid int, tier int);
create table ornament(guid integer primary key, name_text integer, description_text integer, icon text, region_id int references region(id),
  value int, dlc_guid int references dlc(guid), slug text);
create table ornament_cost(ornament_guid int references ornament(guid), product_guid int references product(guid), amount real);
-- construction-menu tabs (kind menu: buildings and chains), trading-post filter categories (kind product), recruiting buildings (kind unit)
-- and ornament-menu tabs (kind ornament)
create table category(guid integer primary key, kind text, name_text integer, key text, icon text, sort int);
create table category_member(category_guid int references category(guid), asset_guid int, primary key(category_guid, asset_guid)) without rowid;
-- game names of keys stored elsewhere: attribute, rarity, niche, allocation, modifier (buff_modifier.path) …
create table label(kind text, key text, name_text integer, icon text, primary key(kind, key)) without rowid;

create table effect(guid integer primary key, name_text integer, description_text integer, duration_ms int);
create table effect_buff(effect_guid int references effect(guid), buff_guid int, primary key(effect_guid,buff_guid));
create table effect_target_pool(effect_guid int references effect(guid), pool_guid int, name_text integer, kind text, icon text, primary key(effect_guid,pool_guid));
create table effect_target_building(effect_guid int references effect(guid), pool_guid int, building_guid int references building(guid), primary key(effect_guid,pool_guid,building_guid)) without rowid;
create table pool_member(pool_guid int, asset_guid int, primary key(pool_guid,asset_guid)) without rowid;
create view effect_target as select etp.effect_guid, pm.asset_guid building_guid from effect_target_pool etp join pool_member pm using(pool_guid);
-- asset_guid, cycles, key: arguments of templated effects (fertility or replaced input, output cycles, incident)
create table buff_modifier(buff_guid int, path text, attribute_id int references attribute(id), value real, is_percent int, product_guid int references product(guid),
  asset_guid int, cycles int, key text);
create table buff_functional_effect(buff_guid int, effect_guid int);
create table buff_provided_need(buff_guid int, need_guid int references need(guid), primary key(buff_guid,need_guid));

create table item(guid integer primary key, name_text integer, description_text integer, icon text, rarity text, niche text,
  allocation text, trade_price real, effect_guid int references effect(guid), boost_hint_text integer, dlc_guid int references dlc(guid), slug text);
create table item_boost_buff(item_guid int references item(guid), buff_guid int);
create table item_boost_condition(item_guid int references item(guid), condition_id int);
create table item_source(item_guid int references item(guid), kind text, source_guid int, primary key(item_guid,kind,source_guid)) without rowid;
-- Hippodrome stat ranges from the item's racer preset: a new charioteer starts between initial_min and initial_max and
-- can train up to between potential_min and potential_max (the game rolls both per save)
create table item_racer_attribute(item_guid int references item(guid), attribute text, initial_min int, initial_max int,
  potential_min int, potential_max int, primary key(item_guid,attribute)) without rowid;

create table tech_category(guid integer primary key, name_text integer, description_text integer, gate_guid int, icon text, artwork text, x int, y int, sort int);
create table tech(guid integer primary key, name_text integer, description_text integer, icon text, knowledge_needed real, is_gate int, grid_x int, grid_y int,
  category_guid int references tech_category(guid), show_connection_to_category int,
  region_id int references region(id), dlc_guid int references dlc(guid), slug text);
create table tech_unlock_reward(tech_guid int references tech(guid), idx int, asset_guid int, name_text integer, description_text integer, icon text, building_guid int references building(guid), primary key(tech_guid,idx)) without rowid;
create table tech_unlock(tech_guid int references tech(guid), asset_guid int, primary key(tech_guid,asset_guid));
create table tech_effect(tech_guid int references tech(guid), effect_guid int);
create table tech_resource(tech_guid int references tech(guid), product_guid int, amount real);
create table unlock(asset_guid int, source_guid int, condition_id int, primary key(asset_guid,source_guid));
create table condition(id integer primary key, owner_kind text, owner_id int, template text not null, negate int, parent_id int, sub_order text);
create table condition_param(condition_id int references condition(id), key text, value text);
create table asset_name(guid integer primary key, name_text integer, icon text);

create table storyline(guid integer primary key, title_text integer, request_text integer, icon text); -- request_text: build only
create table storyline_condition(storyline_guid int references storyline(guid), condition_id int);
create table quest(guid integer primary key, name_text integer, icon text, storyline_guid int, region_id int); -- region_id: build only
create table quest_option(decision_guid int references quest_choice(node_guid), idx int, text_text integer,
  cost_guid int, cost_amount real, condition_id int references condition(id));
create table quest_variable_change(node_guid int, variable text, operation text, value text, value_variable text);
create table quest_choice(node_guid integer primary key, storyline_guid int references storyline(guid), kind text, position int,
  headline_text integer, text_text integer, condition_id int references condition(id), speaker_guid int);
create table quest_choice_outcome(choice_guid int references quest_choice(node_guid), idx int, node_guid int, primary key(choice_guid, idx, node_guid)) without rowid;
create table questline(guid integer primary key, title_text integer, icon text, region_id int references region(id), dlc_guid int references dlc(guid), slug text);
create table questline_storyline(questline_guid int references questline(guid), storyline_guid int references storyline(guid), idx int, primary key(questline_guid, storyline_guid)) without rowid;
create table quest_reward(node_guid int, kind text, asset_guid int, amount real, amount_variable text,
  name_text integer, icon text, attribute text);
-- child tables looked up by parent (composite primary keys already cover the rest)
create index idx_need_attribute_need on need_attribute(need_guid);
create index idx_building_cost_building on building_cost(building_guid);
create index idx_building_maintenance_building on building_maintenance(building_guid);
create index idx_building_effect_building on building_effect(building_guid);
create index idx_building_phase_building on building_phase(building_guid);
create index idx_building_phase_cost_phase on building_phase_cost(phase_guid);
create index idx_building_phase_maintenance_phase on building_phase_maintenance(phase_guid);
create index idx_unit_cost_unit on unit_cost(unit_guid);
create index idx_unit_maintenance_unit on unit_maintenance(unit_guid);
create index idx_ornament_cost_ornament on ornament_cost(ornament_guid);
create index idx_factory_input_building on factory_input(building_guid);
create index idx_factory_input_product on factory_input(product_guid);
create index idx_factory_output_building on factory_output(building_guid);
create index idx_factory_output_product on factory_output(product_guid);
create index idx_residence_need_building on residence_need(building_guid);
create index idx_production_chain_node_chain on production_chain_node(chain_guid);
create index idx_category_member_asset on category_member(asset_guid);
create index idx_buff_modifier_buff on buff_modifier(buff_guid);
create index idx_buff_functional_effect_buff on buff_functional_effect(buff_guid);
create index idx_item_boost_buff_item on item_boost_buff(item_guid);
create index idx_item_boost_condition_item on item_boost_condition(item_guid);
create index idx_tech_unlock_asset on tech_unlock(asset_guid);
create index idx_tech_effect_tech on tech_effect(tech_guid);
create index idx_tech_resource_tech on tech_resource(tech_guid);
create index idx_condition_param_condition on condition_param(condition_id);
create index idx_storyline_condition_storyline on storyline_condition(storyline_guid);
create index idx_quest_storyline on quest(storyline_guid);
create index idx_quest_option_decision on quest_option(decision_guid);
create index idx_quest_reward_node on quest_reward(node_guid);
create index idx_quest_variable_change_node on quest_variable_change(node_guid);
create index idx_quest_choice_storyline on quest_choice(storyline_guid);
create index idx_questline_storyline_storyline on questline_storyline(storyline_guid);

-- site search (client search.ts): the trigram index narrows a query to names containing it, detail=none keeps it small
-- (fts5 checks the match against search.key itself)
create table search_entry(guid integer primary key, type text, slug text, icon text, rarity text, regions text,
  name_text integer, description_text integer);
create table search(id integer primary key, lang_id integer references lang(id), guid integer references search_entry(guid), key text);
create virtual table search_fts using fts5(key, content='search', content_rowid='id', tokenize='trigram', detail='none', columnsize=0);
"""
# build-time scratch tables, dropped by prune()
SCRATCH = """
create table storyline_variable(storyline_guid int, name text, start_value text);
create table questline_alias(questline_guid int, name_text integer);
create table quest_node(guid integer primary key, storyline_guid int, type text, quest_guid int, headline_text integer, text_text integer,
  condition_id int, speaker_guid int);
create table quest_edge(from_guid int, to_guid int, kind text, idx int, primary key(from_guid,to_guid,kind,idx)) without rowid;
"""

if __name__ == "__main__":
    args = sys.argv[1:]
    langs = (
        args.pop(args.index("--langs") + 1).split(",") if "--langs" in args else None
    )
    args = [a for a in args if a != "--langs"]
    t = T(args[0], args[1], args[2] if len(args) > 2 else None, langs)
    for step in (
        t.lookups,
        t.products,
        t.buildings,
        t.categories,
        t.units,
        t.ornaments,
        t.effects,
        t.items_,
        t.phases,  # before techs: unlocks resolve monument phases to their building
        t.techs,
        t.quests,
        t.sources,
        t.prune,
        t.labels,  # after prune: only paths still used
        t.finish,
    ):
        step()
