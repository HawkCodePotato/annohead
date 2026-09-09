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
# two bakeries, one per region, same cycle time
assert sorted(
    q(
        "select region_id from building b join translation t on t.line_id=b.name_text and t.lang_id=(select id from lang where code='english') where t.value='Bakery'"
    )
) == [(1,), (2,)]
# famine request: decision options aligned with outputs, rewards are storyline variables
assert q(
    "select option_index, to_guid from quest_edge where from_guid=72091 and kind='DecisionRoot.DecisionRootOutput.Output' order by 1"
) == [(0, 77282), (1, 81925)]
assert q(
    "select value from quest_option qo join translation t on t.line_id=qo.text_text and t.lang_id=(select id from lang where code='english') where decision_guid=77280 and idx=1"
) == [("Decline",)]
assert ("ReputationGainSuccess",) in q(
    "select amount_variable from quest_reward where node_guid=77283"
)
# spinner unlock: 50 Liberti
assert ("CounterAmount", "50") in q(
    "select key, value from unlock u join condition_param cp on cp.condition_id=u.condition_id where u.asset_guid=3187"
)
print("ok")
