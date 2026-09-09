"""Self-check for condition-tree preservation in the typed transformer."""
import sqlite3

from transform import T


t = T.__new__(T)
t.conditions = []
t.db = sqlite3.connect(":memory:")
t.db.executescript("""
create table condition(id integer primary key, owner_kind text, owner_id int, template text, negate int, parent_id int);
create table condition_param(condition_id int, key text, value text);
""")

tree = {
    "Condition": {
        "Template": "ConditionRoot",
        "Values": {"ConditionRoot": {"Mode": "And"}},
    },
    "SubConditions": [
        {
            "SubCondition": {
                "Values": {
                    "PreConditionList": {
                        "Condition": {
                            "Template": "ConditionChild",
                            "Values": {"ConditionChild": {"Amount": "3"}},
                        },
                        "SubConditions": [
                            {
                                "SubCondition": {
                                    "Values": {
                                        "PreConditionList": {
                                            "Condition": {
                                                "Template": "ConditionGrandchild",
                                                "Values": {"ConditionGrandchild": {"Target": "159708"}},
                                            }
                                        }
                                    }
                                }
                            }
                        ],
                    }
                }
            }
        }
    ],
}

assert t.condition("item", 123, tree) == 1
t.db.executemany("insert into condition values(?,?,?,?,?,?)", t.conditions)
assert t.db.execute("select id,template,parent_id from condition order by id").fetchall() == [
    (1, "ConditionRoot", None),
    (2, "ConditionChild", 1),
    (3, "ConditionGrandchild", 2),
]
assert t.db.execute("select key,value from condition_param where condition_id=3").fetchall() == [
    ("Target", "159708"),
]
print("ok")
