"""Self-check for the resolver: property defaults, template defaults, base-asset inheritance, list rules."""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from assets import Assets  # noqa: E402

PROPS = """<Properties><Groups><Group><Name>G</Name>
 <DefaultValues><Standard/><Text/><Item><Rarity>Common</Rarity></Item><Cost><Costs><Item><Ingredient>1</Ingredient></Item><Item><Ingredient>2</Ingredient></Item></Costs></Cost><Snd><L><Item><S>a</S></Item></L></Snd></DefaultValues>
 <DefaultContainerValues><Cost><Costs><Weight>1</Weight></Costs></Cost></DefaultContainerValues>
</Group></Groups></Properties>"""
TEMPLATES = """<Templates><Group><Template><Name>Thing</Name><Properties><Standard/><Text/><Item><Niche>Finance</Niche></Item><Cost/><Snd/></Properties></Template></Group></Templates>"""
ASSETS = """<AssetList><Groups><Group><Assets>
 <Asset><Template>Thing</Template><Values><Standard><GUID>1000</GUID><Name>Base</Name></Standard>
   <Item><Rarity>Epic</Rarity></Item>
   <Cost><Costs><Item><Ingredient>1</Ingredient><Amount>5</Amount></Item></Costs></Cost>
   <Snd><L><Item><VectorElement><InheritedIndex>0</InheritedIndex></VectorElement><X>1</X></Item><Item><S>b</S></Item></L></Snd>
 </Values></Asset>
 <Asset><BaseAssetGUID>1000</BaseAssetGUID><Values><Standard><GUID>1001</GUID><Name>Derived</Name></Standard><Item><Niche>Culture</Niche></Item></Values></Asset>
</Assets></Group></Groups></AssetList>"""
TEXTS = "<TextExport><Texts><Text><LineId>-5</LineId><Text>Hello</Text></Text></Texts></TextExport>"

with tempfile.TemporaryDirectory() as tmp:
    cfg = Path(tmp) / "data/base/config"
    (cfg / "export").mkdir(parents=True), (cfg / "gui").mkdir()
    (cfg / "export/properties.xml").write_text(PROPS)
    (cfg / "export/templates.xml").write_text(TEMPLATES)
    (cfg / "export/assets.xml").write_text(ASSETS)
    (cfg / "gui/texts_english.xml").write_text(TEXTS)
    A = Assets(tmp)
    base, der = A.obj("1000")["values"], A.obj("1001")["values"]
    assert base["Item"] == {"Rarity": "Epic", "Niche": "Finance"}, base[
        "Item"
    ]  # asset > template > property default
    assert base["Cost"]["Costs"] == [
        {"Ingredient": "1", "Amount": "5", "Weight": "1"}
    ], base[
        "Cost"
    ]  # replace + container default
    assert base["Snd"]["L"] == [{"S": "a", "X": "1"}, {"S": "b"}], base[
        "Snd"
    ]  # InheritedIndex merge + append
    assert (
        der["Item"] == {"Rarity": "Epic", "Niche": "Culture"}
        and A.obj("1001")["template"] == "Thing"
    )
    assert A.texts["-5"]["english"] == "Hello"
    assert A.refs("1001") == []
print("ok")
