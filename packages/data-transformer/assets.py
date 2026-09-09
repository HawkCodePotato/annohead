"""Anno 117 asset model: fully resolved assets + texts + reverse references, in SQLite.

Resolution order for every asset (last wins):
  properties.xml DefaultValues[prop]  ->  templates.xml Template.Properties[prop]
  ->  BaseAssetGUID chain (lists merge by VectorElement/InheritedIndex)  ->  the asset itself.
List items additionally receive properties.xml DefaultContainerValues for their path.

Usage: python3 assets.py <extracted_dir> <out.sqlite>
"""

import copy
import json
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

GUID_RE = re.compile(r"^\d{4,}$")


def merge(base, over):
    """Deep-merge XML elements; `over` wins.
    Lists (all children tagged Item): if `over` uses VectorElement/InheritedIndex, items merge by index and the rest
    append; otherwise `over`'s list replaces the inherited one (that is how Costs etc. are authored).
    """
    out = copy.deepcopy(base)
    if (over.text or "").strip():
        out.text = over.text
    is_list = (
        bool(len(over))
        and all(c.tag == "Item" for c in over)
        and all(c.tag == "Item" for c in out)
    )
    if is_list:
        if not any(c.find("VectorElement/InheritedIndex") is not None for c in over):
            out[:] = [copy.deepcopy(c) for c in over]
            return out
        items = list(out)
        for oc in over:
            ie = oc.find("VectorElement/InheritedIndex")
            if ie is not None and int(ie.text) < len(items):
                out[list(out).index(items[int(ie.text)])] = merge(
                    items[int(ie.text)], oc
                )
            else:
                out.append(copy.deepcopy(oc))
        return out
    for oc in over:
        ex = out.find(oc.tag)
        if ex is None or oc.tag == "Item":
            (
                out.append(copy.deepcopy(oc))
                if ex is None
                else out.__setitem__(list(out).index(ex), merge(ex, oc))
            )
        else:
            out[list(out).index(ex)] = merge(ex, oc)
    return out


class Assets:
    def __init__(self, extracted: Path):
        cfg = Path(extracted) / "data/base/config"
        self.raw = {}
        for a in ET.parse(cfg / "export/assets.xml").getroot().iter("Asset"):
            g = a.findtext("Values/Standard/GUID")
            if g:
                self.raw[g] = a
        self.templates = {
            t.findtext("Name"): t.find("Properties")
            for t in ET.parse(cfg / "export/templates.xml").getroot().iter("Template")
        }
        props = ET.parse(cfg / "export/properties.xml").getroot()
        self.prop_defaults = {
            p.tag: p
            for g in props.iter("Group")
            for p in (
                g.find("DefaultValues") if g.find("DefaultValues") is not None else []
            )
        }
        self.container_roots = [
            g.find("DefaultContainerValues")
            for g in props.iter("Group")
            if g.find("DefaultContainerValues") is not None
        ]
        self.texts = {}  # line_id -> {lang: text}
        for f in sorted((cfg / "gui").glob("texts_*.xml")):
            lang = f.stem.split("_", 1)[1]
            if lang == "metadata":
                continue
            for t in ET.parse(f).getroot().iter("Text"):
                lid, txt = t.findtext("LineId"), t.findtext("Text")
                if lid and txt is not None:
                    self.texts.setdefault(lid, {})[lang] = txt
        self._resolved = {}

    def container_default(self, path):
        """Default <Item> for the list at `path` (tags, no Item), from DefaultContainerValues; None if absent.
        `ContainerValues` wrapper nodes are transparent path segments."""
        for root in self.container_roots:
            node = root
            for tag in path:
                nxt = node.find(tag)
                if nxt is None and (cv := node.find("ContainerValues")) is not None:
                    nxt = cv.find(tag)
                if nxt is None:
                    break
                node = nxt
            else:
                kids = [copy.deepcopy(c) for c in node if c.tag != "ContainerValues"]
                if kids:
                    item = ET.Element("Item")
                    item.extend(kids)
                    return item
        return None

    def xml(self, guid):
        """Fully merged <Asset> element for guid (memoised)."""
        if guid in self._resolved:
            return self._resolved[guid]
        a = self.raw[guid]
        base_guid = a.findtext("BaseAssetGUID")
        if base_guid and base_guid in self.raw:
            m = merge(self.xml(base_guid), a)
            if (
                m.find("Template") is None
                and self.xml(base_guid).find("Template") is not None
            ):
                m.append(copy.deepcopy(self.xml(base_guid).find("Template")))
        else:
            m = copy.deepcopy(a)
            tpl = self.templates.get(m.findtext("Template"))
            if tpl is not None:
                defaults = ET.Element("Values")
                for prop in tpl:
                    d = copy.deepcopy(
                        self.prop_defaults.get(prop.tag, ET.Element(prop.tag))
                    )
                    d.tag = prop.tag
                    defaults.append(merge(d, prop))
                vals = m.find("Values")
                merged = merge(
                    defaults, vals if vals is not None else ET.Element("Values")
                )
                if vals is not None:
                    m.remove(vals)
                m.append(merged)
        self._resolved[guid] = m
        return m

    def to_obj(self, el, path=()):
        """XML -> python: leaves become str, Item-lists become lists, else dicts."""
        kids = list(el)
        if not kids:
            return (el.text or "").strip() or None
        if all(c.tag == "Item" for c in kids):
            cd = self.container_default(path)
            out = []
            for c in kids:
                item = merge(cd, c) if cd is not None else c
                out.append(self.to_obj(item, path))
            return out
        d = {}
        for c in kids:
            if c.tag == "VectorElement":
                continue
            d[c.tag] = self.to_obj(c, path + (c.tag,))
        return d

    def obj(self, guid):
        x = self.xml(guid)
        v = x.find("Values")
        o = self.to_obj(v) if v is not None else {}
        std = o.get("Standard") or {}
        text_id = (o.get("Text") or {}).get("OasisId")
        return {
            "guid": int(guid),
            "template": x.findtext("Template"),
            "base_guid": int(self.raw[guid].findtext("BaseAssetGUID") or 0) or None,
            "name": std.get("Name"),
            "text_id": text_id,
            "text": self.texts.get(text_id, {}).get("english") if text_id else None,
            "icon": std.get("IconFilename"),
            "values": o,
        }

    def refs(self, guid):
        """(path, target_guid) for every GUID-looking leaf pointing at a known asset."""
        out = []

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, f"{path}.{k}" if path else k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f"{path}[{i}]")
            elif (
                isinstance(o, str) and GUID_RE.match(o) and o in self.raw and o != guid
            ):
                out.append((path, int(o)))

        walk(self.obj(guid)["values"], "")
        return out


def build_db(extracted, out):
    A = Assets(extracted)
    Path(out).unlink(missing_ok=True)
    db = sqlite3.connect(out)
    db.executescript("""
      create table assets(guid integer primary key, template text, base_guid integer, name text, text_id text, text text, icon text, json text);
      create table refs(from_guid integer, path text, to_guid integer);
      create table texts(line_id text, lang text, text text, primary key(line_id, lang));
      create index refs_to on refs(to_guid); create index refs_from on refs(from_guid); create index assets_tpl on assets(template);
    """)
    for g in A.raw:
        o = A.obj(g)
        db.execute(
            "insert into assets values(?,?,?,?,?,?,?,?)",
            (
                o["guid"],
                o["template"],
                o["base_guid"],
                o["name"],
                o["text_id"],
                o["text"],
                o["icon"],
                json.dumps(o["values"], ensure_ascii=False),
            ),
        )
        db.executemany(
            "insert into refs values(?,?,?)", [(o["guid"], p, t) for p, t in A.refs(g)]
        )
    db.executemany(
        "insert into texts values(?,?,?)",
        [(lid, lang, t) for lid, langs in A.texts.items() for lang, t in langs.items()],
    )
    db.commit()
    n = db.execute(
        "select count(*), (select count(*) from refs), (select count(*) from texts) from assets"
    ).fetchone()
    print(f"assets={n[0]} refs={n[1]} texts={n[2]} -> {out}")
    db.close()
    return A


if __name__ == "__main__":
    build_db(sys.argv[1], sys.argv[2])
