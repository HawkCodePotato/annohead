# Anno 117 data schema

Status: implemented but evolving. Everything below is derived from the resolved game data in `data/source.sqlite`
(built by `packages/data-transformer/assets.py`) and normalized by `packages/data-transformer/transform.py`.
The table definitions in `transform.py` are authoritative where this design document differs from the code.

## Layers

1. **Extracted files** (`data/extracted`): raw XML + DDS icons pulled from the RDAs in load order.
2. **Generic model** (`data/source.sqlite`): every asset fully resolved (property defaults → template defaults →
   base-asset inheritance), plus `refs` (every GUID reference with its JSON path) and `texts` (11 languages).
   This layer is complete and lossless. Anything the site needs can be derived from it, so the transformer
   never has to touch XML again.
3. **Site model** (this document): the typed tables the site reads. Filled by the transformer.

## How the game data is organised

- Every game object is an **asset**: a GUID, a **template** (its type, 545 of them), and properties.
- Values inherit: `properties.xml` gives per-property defaults, `templates.xml` gives per-template defaults,
  `BaseAssetGUID` lets an asset inherit from another asset (used by ~1,900 assets, mostly quests).
- Names live in `texts_<lang>.xml` keyed by a 64-bit **line id** (`Values/Text/OasisId`).
- Icons are referenced as `data/ui/fhd/.../name.png` and exist on disk as `data/ui/4k/.../name_0.dds`
  (1,895 of 2,071 referenced icons resolve this way; the rest are UI backgrounds, not entity icons).
  `data-extractor/publish.py` resizes each to a 256px PNG under the normalized original game path.
  The `icon` column in every site table holds that relative path. Remote upload is intentionally separate from
  database generation; the cross-platform `pipeline.py` never modifies a CDN.
- Groups of things are **AssetPools** (705), nested. Effects, unlocks and quest rewards target pools, so
  "which buildings does this affect" always means "flatten the pool".
- Regions: `Roman` = Latium, `Celtic` = Albion, `Egyptian` = Delta (DLC 3). Region variants of a building are
  separate assets with the same display name (Bakery 3174 Roman vs 5960 Celtic), different inputs.

## Site tables

### Lookups

| table               | source                                        | notes                                                        |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `region`            | datasets `Region`                             | Roman, Celtic, Egyptian + display names                      |
| `dlc`               | template `UplayProduct` where ProductType=DLC | 3 DLCs + cosmetic DLCs                                       |
| `population_level`  | template `PopulationLevel` (9)                | tier, region, workforce product, icon                        |
| `product_category`  | text ids on `Product.ProductCategory`         | Raw Material, Need, Construction …                           |
| `building_category` | text ids on `Building.BuildingCategoryName`   | Clothier, Smelter, Kitchen … (Toolkit "building categories") |
| `text`              | `texts`                                       | line_id, lang, text                                          |

### product

From template `Product` (155). `guid, name, icon, category, base_price, regions[], storage_level,
transport_type`. Derived: `produced_by[]`, `consumed_by[]` from FactoryBase inputs/outputs.

### building

Any asset with `Building` + `Constructable` properties (~250 incl. variants and DLC).
Core: `guid, name, description, icon, template, kind, building_type, category, regions[],
radius, street_radius, health, cost[] (product, amount), maintenance[] (money, workforce product, amount),
  Buildings do not yet have a direct DLC relation, skins table, or variant group; consumers should derive or
  curate those fields separately until an authoritative relationship is added.
`kind` is our UI grouping derived from template: Production, Residence, Public Service, City Watch
(`CityInstitutionBuilding`), Harbour, Military, Monument, Marvel, Aqueduct, Marsh, Ornament, Road.

Sub-tables:

- `building_production` (FactoryBase): `inputs[] (product, amount, storage)`, `outputs[]`, `cycle_time`,
  `base_productivity`, `transporter_range`, fertility/field requirements for farms.
- `building_residence` (Residence7): `population_level`, `needs[] (need, consumption_rate, buff_only)`,
  `upgrade_thresholds`, `upgrades_to (building, cost[])`.
- `building_public_service` (PublicService): service effect.
- `building_unlock`: how it becomes buildable, see Unlocks.

### production_chain

Template `ProductionChain` (77): `guid, name, icon, output_building, tiers` (tree of buildings). Rates for
the calculator come from `building_production` (output per minute = 60 / cycle_time × amount).

### need

Template `Need` (88): `guid, name, product, category, attributes provided (Population, Money, …)`.

### effect / buff (the "spinner gives knowledge" case)

Everything that modifies a building is an **Effect** (1,110) that applies **Buffs** to a target pool.

- `effect`: `guid, name, scope (Radius, ObjectsInMeta, Local …), source_category (Adjacency, Item, Tech,
Religion, Wonder, Festival, Volcano …), targets[]` (flattened building GUIDs).
- `buff`: `guid, name, modifiers[]` where each modifier is `(path, value, percental)` for every leaf under
  the `*Upgrade` properties, e.g. `BuildingUpgrade.AdditionalAttributes.Knowledge = +1`,
  `FactoryUpgrade.ProductivityUpgrade = +25%`, `ResidenceUpgrade.NeedProvidedNeedAttributes …`.
  A buff may point at another effect via `AdditionalFunctionalEffect` (the spinner tech does), so recurse.
- `effect_source`: who grants the effect and when: `(effect, source_kind, source_guid, unlock)` where
  source_kind ∈ building adjacency (`Building.FunctionalEffects`), item, tech reward, patron/religion,
  festival, monument event, city status, incident.

Per building the site can then list: base adjacency effects, plus every conditional effect and what unlocks it
(tech "Sewing Circles", 8,000 knowledge → Knowledge +1 near Spinners).

### item (specialists, captains, quest items)

Templates `Item`, `ItemWithBoost`, `ItemWithUI`, `ItemQuest` (~660).
`guid, name, description, icon (portrait), rarity, niche (category), item_type (Specialist, Captains,
NonSocketable …), allocation (Villa, Ship), trade_price, dlc, origin, effect (targets + buffs),
boost (condition summary, boosted buffs), sources[]` (reward pools, hall of fame, traders, quests).
Portraits: `items_specialist/<group>/icon_3d_*.dds`, 4K, already extracted.

### tech

Template `Tech` (207): `guid, name, description, icon, category, knowledge_needed, is_gate, grid_x, grid_y,
rewards { unlocks[] (flattened), effects[], resources[] }, requirements` (visibility / researchable triggers).

### unlock

Every `ActionUnlockAsset` / `ActionLockAsset` in triggers (`TriggerIntermediateLevel`, `FeatureUnlock`,
`Tech` rewards, quest sequences): `(asset, condition)` with condition kept as a small typed summary
(population level X reaches N, tech researched, DLC active, romanization …) plus the raw JSON.

### quests

Quest content is a graph of **components** connected by output ports. Nodes and edges are extracted
generically: every `…Component` reference in a quest-template asset is an edge, its JSON path is the kind.

- `storyline` (367): `guid, name, system (Quests, GovernorDecisions, Contracts), dlc, preconditions, variables`.
- `quest_pool` → `(pool, storyline, weight, conditions)`; how random requests are offered.
- `quest_node`: `guid, storyline, type` (StoryLine, Sequence, Objective, Decision, DecisionRoot, Function,
  StateChecker, Starter, Loop, Exit …), `name, headline, text, objective_text, time_limit, payload` (raw JSON).
- `quest_edge`: `from, to, kind, index, label` where kind is the port:
  `StoryLine.StartConnector`, `QuestComponentConnector.Output`, `Objective.SuccessOutput/FailureOutput/
TimedOutOutput`, `DecisionRoot.DecisionRootOutput[i]` (option i, label = `Decision.DecisionOptions[i].OptionText`),
  `DecisionRoot.DecisionTimeOutOutput`, `Function.FunctionSuccessOutput`, `StateChecker.States[i].*`,
  `Starter.AcceptOutput` …
- `quest_option`: `(decision, index, text, category, requirement)`.
- `quest_reward`: rewards found on the path: `Objective.Reward.RewardAssets`, sequence actions
  `ActionAddGoodsToItemContainer`, `ActionAddItemToMetaStorage`, `ActionUnlockAsset`, `ActionChangeReputation`,
  `ActionEffect`, `ActionTriggerParticipantMessage.RewardList`. Stored as `(node, kind, asset, amount)`.
- `quest_entry`: the journal entry (`QuestEntry`: name, summary, category, icon) linked from objectives.

This is enough for the flowchart view: nodes, typed edges, option labels, rewards per branch.

## Decisions (2026-09-09)

1. **Storylines and quests are separate tables**, Wowhead-style. `storyline` = game `StoryLine` (the chain,
   all three systems, tagged). `quest` = game `QuestEntry` (the journal entry a player sees: name, summary,
   category, icon), with `quest.storyline_id`. Objectives link to a quest via `LinkedQuestEntry`; the node/edge
   graph hangs off the storyline, and each node carries `quest_id` when it belongs to one, so a storyline page
   renders the flowchart and a quest page renders its own steps, choices and rewards.
2. **SQLite** is the site database (shared by the Next.js site and the Expo app).
3. **Region variants stay separate rows**; every entity table gets a `region` column (lookup id).
   No `variant_group` table for v1; the UI groups by display name if it wants to.
4. **Ornaments and military units are out of v1.**
5. Anno 1800 is ignored for now. Multi-game support (one DB, `game_id`, attributes as rows) is deferred.

## Normalization rule

Third normal form throughout: every list becomes its own table with foreign keys (`building_cost`,
`building_maintenance`, `factory_input`, `factory_output`, `effect_target`, `buff_modifier`, `item_source`,
`quest_edge` …). No JSON columns except an optional `raw_guid` back to `source.sqlite`. Enums (region, rarity,
niche, building kind, edge kind, attribute) become lookup tables. Texts live once in `text(line_id, lang, value)`.
