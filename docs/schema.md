# Anno 117 data schema (proposal)

Status: proposal, not final. Everything below is derived from the resolved game data in `data/source.sqlite`
(built by `packages/data-transformer/assets.py`). The generic transformer that fills the site database is written once
this document is agreed.

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
  `data-extractor/publish.py` resizes each to a 256px WebP named `sha1(source path)[:12].png` and syncs the
  set to Cloudflare R2. The `icon` column in every site table holds that key, so the URL is
  `https://<cdn-host>/<icon>.png`.
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
| `translation`       | `texts`                                       | line_id, lang, text                                          |

### product

From template `Product` (155). `guid, name, icon, category, base_price, regions[], storage_level,
transport_type`. Derived: `produced_by[]`, `consumed_by[]` from FactoryBase inputs/outputs.

### building

Any asset with `Building` + `Constructable` properties (~250 incl. variants and DLC).
Core: `guid, name, description, icon, template, kind, type, category, regions[], dlc,
radius, street_radius, health, cost[] (product, amount), maintenance[] (money, workforce product, amount),
skins[], variant_group` (buildings sharing a display name).
`kind` is our UI grouping derived from template: Production, Residence, Public Service, City Watch
(`CityInstitutionBuilding`), Harbour, Military, Monument, Marvel, Aqueduct, Marsh, Ornament, Road.
Building results expose `kind` and `type` as nullable `{ id, name }` objects. The `id` is the
existing enum key and `name` is localized to the requested language. Filters continue to accept enum keys.
Building results expose `workforce[]` in place of `populationLevel`. Each entry contains the
population tier's `guid`, `icon`, localized `name`, `tier`, and required `amount`, joined from
maintenance products via `population_level.workforce_product_guid`. Buildings without workforce
requirements return `[]`. `anno.buildings.list` accepts `workforce: number[]` of population tier GUIDs
and matches any required tier; an empty array applies no filter. Construction-phase requirements
remain in each phase's `maintenance[]`.

`dlc_guid` references `dlc.guid`, inferred when all model paths belong to the same DLC
(falling back to the icon path when no models exist). Base-game or mixed model paths
remain null. Building results include a nullable `dlc` object with `guid`, `key`, `icon`, and localized `name`, like the nested `region` object. `anno.buildings.list` accepts `dlc: number[]`; an empty array applies no filter.

`buffs[]` contains need-fulfillment attributes granted to residences by public services or by
consuming a production building's output goods. Repeated output needs with the same attribute and
value appear once per building; these values are not summed. Area modifiers remain in `effects[]`.
Both `buffs[]` and `effects[]` include a localized `name` alongside the stable `attribute` key
(`Money` displays as `Income` in English). Null attributes have a null name.

Area effects exclude flat modifiers that duplicate the same building's service need-fulfillment attribute and value.

Sub-tables:

- `building_production` (FactoryBase): `inputs[] (product, amount, storage)`, `outputs[]`, `cycle_time`,
  `base_productivity`, `transporter_range`, `needs_fuel` (`NeedsFuelInput`: coal-fired), fertility/field requirements for farms.
- `building_residence` (Residence7): `population_level`, `needs[] (need, consumption_rate, buff_only)`,
  `upgrade_thresholds`, `upgrades_to (building, cost[])`.
- `building_public_service` (PublicService): service effect.
- `building_phase` (template `Monument`): instant foundation placement followed by timed construction
  stages. A row's `guid` is the target asset reached after the stage; its name, construction inputs,
  and workforce come from the preceding `Monument` asset. Placement uses the root asset's `Cost`;
  later `building_phase_cost[]` values are `FactoryInputs.Amount × MicrophaseCount`.
  `durationSeconds` is `CycleTime × MicrophaseCount` at base productivity (zero for placement).
  `building_phase_maintenance[]` holds construction workforce, not the completed building's upkeep.
  The monument's `building_cost[]` sums these actual stage costs. For Amphitheatre this includes
  75,000 Denarii once, 300 ropes, and 60 gold. Its operational 400-Denarii maintenance remains on the building.
  `unlockRequirements[]` exposes each target's unlock condition, raw parameters, and localized
  `population` with its required `amount` when the condition is `PopulationByLevel`. The building's
  requirements use its first phase; Amphitheatre phase 3 requires 750 Patricians and phase 4 requires 2,250.
  Ordinary buildings also expose `unlockRequirements[]`; technology unlocks remain in `unlockedBy[]`.
  The campaign's scripted copy of the Amphitheatre chain is skipped.
- `building_unlock`: how it becomes buildable, see Unlocks.

### production_chain

Template `ProductionChain` (77): `guid, name, icon, output_building, region, tiers` (tree of buildings).
`region` is the output building's region, which is what tells the two Bread chains apart. Rates for
the calculator come from `building_production` (output per minute = 60 / cycle_time × amount).

### unit (2026-09-26)

What the player recruits: every `Recruitment.AssemblyOptions[].Vehicle` of a site building (barracks, Equitum
Campus, siege workshop, shipyard, governor villa), plus the `UnitUniqueType` Flagship of each
`DifficultySettings.StartShips` fleet. Shipyard options are `ShipConfiguration` loadouts; they collapse to their
`ShipHullGUID`, so a page shows the hull. `unit(guid, name_text, description_text, icon, region_id, health,
soldiers, morale, speed, build_seconds, cargo_slots, item_sockets, module_slots, slug)` (`health` ships only, troops
have it per soldier; `region_id` null for villa garrisons, recruited in both regions), `unit_cost`,
`unit_maintenance`, `unit_recruiter(unit_guid, building_guid)`. Categories of kind `unit` are the recruiting
buildings, and the flagship under its own name. AI, pirate and quest-only units are left out.

### ornament (2026-09-28)

Everything the ornament menu lists: the tree under each region's `ConstructionMenu.OrnamentsMenu` root (sections
Classic, one per cosmetic pack and Special, each holding tabs of `OrnamentalBuilding`, `PolygonObject` ground patterns
and `Hedge` walls). `ornament(guid, name_text, description_text, icon, region_id, value, dlc_guid, slug)` (`value` is
`Ornament.OrnamentUnit`, what it adds towards Prestige, null for patterns and walls; `region_id` null unless only one
region's menu lists it; `dlc_guid` from the pack's `UplayProduct.UplayProductUnlocks`, not model paths, which Twitch
and Connect rewards share with the packs), `ornament_cost`. Categories of kind `ornament` are the menu tabs, merged
by name across sections and sorted in menu order; Hall Of Fame and Rewards list ornaments that also sit in a regular
tab. Cosmetic packs have no `Standard.ID`, so their `dlc.key` is the asset name (CDLC1 …).

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
- `buff_provided_need`: `(buff, need)` from `ResidenceUpgrade.ProvidedNeedUpgrade`. A public building's
  service effect buff carries this; the need's `need_attribute` rows are its "need fulfilment" values.
- `effect_source`: who grants the effect and when: `(effect, source_kind, source_guid, unlock)` where
  source_kind ∈ building adjacency (`Building.FunctionalEffects`), item, tech reward, patron/religion,
  festival, monument event, city status, incident.

Per building the site can then list: base adjacency effects, plus every conditional effect and what unlocks it
(tech "Sewing Circles", 8,000 knowledge → Knowledge +1 near Spinners).

### item (specialists, captains, quest items)

Templates `Item`, `ItemWithBoost`, `ItemWithUI`, `ItemQuest` (~660).
`guid, name, description, icon (portrait), rarity, niche (category), type (Specialist, Captains,
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
  Region follows `QuestProvince` → `Session.Region` → `Region.RegionID`; DLC comes from a `DLC01`/`DLC02` prefix
  in the quest's name, else its storyline's name (quests carry no DLC field).

This is enough for the flowchart view: nodes, typed edges, option labels, rewards per branch.

#### Questlines (choices and their consequences)

Radiant storylines (random requests and contracts) are left out; what the site shows are the narrative ones where
choices lead somewhere.

- `quest_option` also carries the option's `cost` (product, amount) and `condition` (its `UnlockRequirement`).
- `quest_reward` also collects the actions on decision outcome screens (`DecisionComponent.DecisionActions`), plus
  locks, follow-up storylines, racer upgrades (`attribute`), building XP, incidents and campaign power. Each row keeps
  the rewarded asset's own `name_text` / `icon` for assets without a table. Amounts read from a storyline variable
  nothing writes resolve to its start value; unlocks of unnamed assets (internal flags) are dropped.
- `quest_variable_change`: `ActionModifyVariable` (`Set` by default; flags stored as `true` / `false`).
- `quest_node.condition`: the condition a branching `Function` checks (it has a failure port).
- `quest_choice`: every decision with several options and every branching function (`kind` decision / check), in
  storyline order. `quest_choice_outcome` lists the nodes option `i` runs (checks: 0 holds, 1 fails): outputs are
  followed through sequences, waits, "continue" screens and objectives up to and including the next choice. A start
  screen's option `i` also continues at its `DecisionRoot` output `i`.
- `storyline`: `title` (first decision headline, else journal entry, only lines the game wrote), `request` text and
  `icon` of the governor request that announces it.
- `questline` → `questline_storyline(idx)`: storylines linked when one writes a global variable another reads, or
  starts another, ordered by those dependencies. Region from journal provinces (else the HL/WL name prefix), DLC from
  names or `/dlcNN/` icon paths. Questlines without a written title are dropped.
- `effect.duration_ms`: `TimedEffect.EffectDuration`; null when permanent.
- `asset_name`: name text and icon of assets conditions point at that have no table of their own (provinces,
  volcano phases, participants' profiles …); the client falls back to it when naming a condition's subject.
- `condition.sub_order`: how sub-conditions combine (`Parallel` / `Linear`: all, `MutuallyExclusive`: one of them).

### Pruning (2026-09-26)

The site DB only keeps what `packages/db/src/client` reads; `transform.py` `prune()` runs last. So several tables
above no longer ship:

- Internal asset `name` columns are gone everywhere; the build reads them from `source.sqlite`. Region names come
  from the game's `Region` assets (`region.name_text`).
- `quest_node`, `quest_edge` and `storyline_variable` are build-time scratch. A choice's screen (headline, text,
  speaker, check condition) is copied onto `quest_choice`.
- Quest rows outside questlines (radiant requests, contracts) are deleted, as are their conditions. `quest` keeps
  only journal entries that reward items (for `item_source`); `storyline` only questline parts, item sources and
  follow-up rewards.
- Effects nothing grants (building, item, tech, quest reward, or a buff's nearby effect of those) and modifiers of
  buffs no kept effect or item boost uses are deleted. The `buff` table itself is gone; `buff_guid` stays as a key.
- Dropped outright: `effect_source`, `quest_pool*`, `residence_upgrade_cost`, `tech_requirement`, and the columns
  building `type`/`health`/`population_level_guid`, product `base_price`/`category_text`, need
  `name_text`/`category`/`description_text`, effect `scope`/`source_category`, item `template`, tech `image`,
  `tech_category.type`, `unlock.source_kind`, factory `storage`, `quest_option.category`.
- `translation` only holds lines some remaining `*_text` column points at.
- Unreleased content is left out: a DLC only when its `UplayProduct.IsInstalled` is set (Dawn of the Delta is
  announced but not shipped), a region only when the game has a `Region` asset for it (Egyptian has none yet, though
  base buildings and goods already list it). Both appear on their own once a patch ships them.

### Labels and categories (2026-09-26)

Display names come from the game's own config tables, not hand-written ones, so every game language works:

- `label(kind, key, name_text, icon)`: attribute (`NeedAttributeFeature`), rarity, niche and allocation
  (`ItemBalancing.ItemConfig`), modifier (`buff_modifier.path` → `ItemKeywords`, or the infotip table
  `ItemInfotipTextFeature.BuffUpgradeTextAndIcons` for per-weapon unit stats; the path → key map is `MODIFIER_TEXTS`
  in transform.py and holds keys only), racer attribute (`RaceTrackConfig`), diplomacy state (`DiplomacyBalancing`),
  reputation zone and state (`ReputationFeature`), incident (`GeneralIncidentConfiguration`). The transformer warns
  about modifier paths without a game text.
- `item_racer_attribute(item_guid, attribute, initial_min/max, potential_min/max)`: Hippodrome stat ranges from the
  item's `RaceTrackConfig.ItemRacerPreset` (templates default every item to the Common preset; only specialists are kept, as the Hippodrome's socket takes
  nothing else);
  stats a preset leaves out fall back to `RaceTrackConfig.ItemRacerAttributes`, and potential is initial plus added
  potential capped at `MaximumValue`. The game rolls actual stats per save, so only ranges ship.
- `category(guid, kind, name_text, key, icon, sort)` + `category_member`: kind `menu` is the construction menu of
  each released region (`ConstructionMenu.LinearBuildingsMenu`: tier tabs and the infrastructure tab's sub-tabs),
  listing buildings, production chains (and their buildings) and nested categories; buildings only reached by
  upgrading take the tab of what they upgrade from. Kind `product` is the trading-post filter (`ProductFilter`,
  "All Goods" skipped); workforce, services and empire products get key-only categories the client names.
  Categories that read the same in every language (ignoring case) are merged. These replace building kinds, chain types,
  product kinds and item types (items use `allocation`). Kind `unit`: see unit.
- Hand-written text left in the client lives in `packages/db/src/client/phrases/<lang>.json`, one file per language
  typed against `en.json`: condition and item-source phrasing ("Worship {name}", "Sold by {name}"), statistics and
  war-state names the game never shows, the singular "Charioteer" item type, quest placeholders, the three unnamed product groups, a few words, and the
  regex that strips "Part I" from a questline's first title in that language.
- `slug` on building, product, unit, item, tech, production_chain and questline: the English name kebab-cased (questlines
  without "Part I"), so a page has the same URL path in every language and analytics groups it. Regional variants
  may share a slug; the guid in the URL tells them apart.
- All 12 game languages ship (`lang` ids: English 1, German 2, the rest alphabetical); the DB grows from 2.4 MB with
  English and German to 6.4 MB, all of it in `translation`.

### Search (2026-09-27)

- `search_entry(guid, type, slug, icon, rarity, regions, name_text, description_text)`: every searchable entity
  (building, item, product, tech, questline, chain, unit) once; `regions` is comma-separated region keys.
- `search(id, lang_id, guid, key)`: the entity once per language, `key` its name folded (lowercase, no diacritics or
  zero-width spaces, ß → ss; transform.py `fold()` and client search.ts `fold()` must agree). Variants that read the
  same in a language (Infantry Camp ×2) share one row pointing at the lowest guid.
- `search_fts`: FTS5 trigram index over `search.key` (external content, `detail='none'`, `columnsize=0`) that finds
  names containing a word of 3+ characters with `like '%word%'`; fts5 checks candidates against `search.key`, and the
  client ranks them. +1.2 MB. The macOS `sqlite3` CLI lacks fts5, so query `search_fts` from Python or libsql.

## Decisions (2026-09-09)

1. **Storylines and quests are separate tables**, Wowhead-style. `storyline` = game `StoryLine` (the chain,
   all three systems, tagged). `quest` = game `QuestEntry` (the journal entry a player sees: name, summary,
   category, icon), with `quest.storyline_id`. Objectives link to a quest via `LinkedQuestEntry`; the node/edge
   graph hangs off the storyline, and each node carries `quest_id` when it belongs to one, so a storyline page
   renders the flowchart and a quest page renders its own steps, choices and rewards.
2. **SQLite** is the site database (shared by the Next.js site and the Expo app).
3. **Region variants stay separate rows**; every entity table gets a `region` column (lookup id).
   No `variant_group` table for v1; the UI groups by display name if it wants to.
4. **Ornaments are out of v1.** Military units were added 2026-09-26 (see unit).
5. Anno 1800 is ignored for now. Multi-game support (one DB, `game_id`, attributes as rows) is deferred.

## Normalization rule

Third normal form throughout: every list becomes its own table with foreign keys (`building_cost`,
`building_maintenance`, `factory_input`, `factory_output`, `effect_target`, `buff_modifier`, `item_source`,
`quest_edge` …). No JSON columns except an optional `raw_guid` back to `source.sqlite`. Enums (region, rarity,
niche, building kind, edge kind, attribute) become lookup tables. Texts live once in `translation(line_id, lang, value)`.
