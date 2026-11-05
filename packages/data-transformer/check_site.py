"""Regression check on the generated site DB: facts verified by hand against the game data."""

import sqlite3
import sys

db = sqlite3.connect(sys.argv[1] if len(sys.argv) > 1 else "../db/anno.sqlite")
q = lambda sql, *a: db.execute(sql, a).fetchall()  # noqa: E731
# Spinner: adjacency Money +1; tech Sewing Circles adds Knowledge +1 through a functional effect
assert q(
    "select value from building_effect be join effect_buff eb using(effect_guid) join buff_modifier bm using(buff_guid) where be.building_guid=3187 and bm.path like '%.Money'"
) == [(1.0,)]
assert (
    q(
        """select bm.path, bm.value from tech_effect te join effect_target et using(effect_guid) join effect_buff eb using(effect_guid)
            join buff_functional_effect bf using(buff_guid) join effect_buff eb2 on eb2.effect_guid=bf.effect_guid join buff_modifier bm on bm.buff_guid=eb2.buff_guid
            where te.tech_guid=38710 and et.building_guid=3187"""
    )
    == [("BuildingUpgrade.AdditionalAttributes.Knowledge", 1.0)]
)
# three bakeries, one per region, same cycle time
assert sorted(
    q(
        "select region_id from building b join translation t on t.line_id=b.name_text and t.lang_id=(select id from lang where code='english') where t.value='Bakery'"
    )
) == [(1,), (2,), (3,)]
# three bread chains, one per region, taken from the output building
assert sorted(
    q(
        "select region_id from production_chain pc join translation t on t.line_id=pc.name_text and t.lang_id=(select id from lang where code='english') where t.value='Bread'"
    )
) == [(1,), (2,), (3,)]
# one chain per region and output building: Albion keeps Celtic Cheese (6587), not Latium's Roman Cheese copy (8894)
assert q("select count(*) from (select 1 from production_chain group by region_id, building_guid having count(*) > 1)") == [(0,)]
assert q("select guid from production_chain where building_guid=6586") == [(6587,)]
# questlines only: radiant requests (the famine request) are pruned; the Murmillo finale's adopt option leads to the tally
assert q("select count(*) from quest_option where decision_guid=77280") == [(0,)]
assert (1, 50883) in q("select idx, node_guid from quest_choice_outcome where choice_guid=50866")
# spinner unlock: 50 Liberti
assert ("CounterAmount", "50") in q(
    "select key, value from unlock u join condition_param cp on cp.condition_id=u.condition_id where u.asset_guid=3187"
)
# Amphitheatre: instant placement, then three timed construction stages. Costs come from
# factory inputs per microphase, not the cumulative/editor Cost values on target assets.
assert q("select phase, guid, duration_seconds from building_phase where building_guid=3621 order by 1") == [(1, 36908, 0), (2, 36911, 1800), (3, 36912, 1800), (4, 3621, 1800)]
assert q("select count(*) from building where guid in (36908, 97847)") == [(0,)]
expected_costs = {
    36908: {1010017: 75000, 2174: 100, 2178: 60},
    36911: {2174: 150, 2178: 300, 2171: 150},
    36912: {2178: 150, 2176: 300, 2179: 300, 2171: 150},
    3621: {2178: 300, 2176: 300, 2179: 300, 2152: 300, 31698: 60},
}
for guid, costs in expected_costs.items():
    assert dict(q("select product_guid, amount from building_phase_cost where phase_guid=?", guid)) == costs
assert q("select amount from building_cost where building_guid=3621 and product_guid=2174") == [(250.0,)]
assert q("select amount from building_cost where building_guid=3621 and product_guid=1010017") == [(75000.0,)]
assert q("select amount from building_cost where building_guid=3621 and product_guid=31698") == [(60.0,)]
assert q("select product_guid,amount from building_phase_maintenance where phase_guid=36908") == []
assert q("select product_guid,amount from building_phase_maintenance where phase_guid=36911") == [(2181, 350.0)]
assert q("select product_guid,amount from building_phase_maintenance where phase_guid=36912") == [(2184, 200.0)]
assert q("select product_guid,amount from building_phase_maintenance where phase_guid=3621") == [(2185, 150.0)]
assert q("select product_guid,amount from building_maintenance where building_guid=3621") == [(1010017, 400.0)]
assert q("select asset_guid from unlock where source_guid=43128 order by 1") == [(36908,), (36911,)]
assert q("select asset_guid from unlock where source_guid=43129") == [(36912,)]
assert q("select cp.value from unlock u join condition_param cp on cp.condition_id=u.condition_id where u.asset_guid=3621 and cp.key='CounterAmount'") == [('2250',)]
# Hippodrome has 30/40/50/60 construction cycles; don't assume Amphitheatre's duration.
assert q("select duration_seconds from building_phase where building_guid=152714 order by phase") == [(0,), (1800,), (2400,), (3000,), (3600,)]
# DLC ownership follows model paths; base buildings with DLC variants stay unassigned.
assert q("select dlc_guid from building where guid=152714") == [(67903,)]
assert q("select dlc_guid from building where guid=145229") == [(67902,)]
assert q("select dlc_guid from building where guid=3615") == [(None,)]
assert q("select dlc_guid from building where guid=2916") == [(None,)]
# units: shipyard loadouts collapse to their hull (Roman Quinquireme); Roman and Celtic barracks share one category;
# villa garrisons are recruited in both regions; the start flagship is filed under its own name
assert q("select building_guid from unit_recruiter where unit_guid=37224") == [(6054,)]
assert q("select count(*) from unit where guid in (37993, 37994)") == [(0,)]
assert q("select category_guid from category_member where asset_guid in (30456, 37500) order by asset_guid") == [(15519,), (15519,)]
assert q("select region_id from unit where guid=109628") == [(None,)]
assert q("select category_guid from category_member where asset_guid=39573") == [(5473,)]
assert q("select amount from unit_cost where unit_guid=30456 and product_guid=1010017") == [(5000.0,)]
# ornaments: Statue of Kassandra belongs to Echoes of Kassandra; Builder's Obelisk (a Twitch reward built from a
# pack model) to no pack; Eternal Fountain sits under its menu tab and Hall Of Fame; Petrified Gorgo has one copy per region
assert q("select value, dlc_guid, region_id from ornament where guid=174718") == [(4, 67908, None)]
assert q("select dlc_guid from ornament where guid=174502") == [(None,)]
assert q("select category_guid from category_member where asset_guid=80620 order by 1") == [(80617,), (87448,)]
assert q("select guid, region_id from ornament where guid in (160617, 180455) order by 1") == [(160617, 1), (180455, 2)]
assert q("select amount from ornament_cost where ornament_guid=174718 and product_guid=1010017") == [(1000.0,)]
print("ok")
