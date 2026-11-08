import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  sqliteView,
  text,
} from 'drizzle-orm/sqlite-core'

import {
  allocationValues,
  attributeValues,
  categoryKindValues,
  conditionTemplateValues,
  dlcValues,
  itemSourceKindValues,
  labelKindValues,
  nicheValues,
  racerAttributeValues,
  rarityValues,
  regionValues,
  subConditionOrderValues,
  variableOperationValues,
} from './enums'

export const region = sqliteTable('region', {
  id: integer().primaryKey(),
  key: text({
    enum: regionValues,
  }),
  nameText: integer('name_text'),
})

export const dlc = sqliteTable('dlc', {
  guid: integer().primaryKey(),
  icon: text(),
  key: text({
    enum: dlcValues,
  }),
  nameText: integer('name_text'),
})

export const patron = sqliteTable('patron', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
})

export const participant = sqliteTable('participant', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
})

export const festival = sqliteTable('festival', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
})

export const assetPool = sqliteTable('asset_pool', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
})

export const monumentEvent = sqliteTable('monument_event', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
})

export const populationLevel = sqliteTable('population_level', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
  regionId: integer('region_id').references(() => region.id),
  tier: integer(),
  workforceProductGuid: integer('workforce_product_guid'),
})

export const attribute = sqliteTable('attribute', {
  id: integer().primaryKey(),
  key: text({
    enum: attributeValues,
  }),
})

export const enumValue = sqliteTable(
  'enum_value',
  {
    name: text(),
    value: text(),
  },
  (table) => [
    primaryKey({
      columns: [table.name, table.value],
      name: 'enum_value_name_value_pk',
    }),
  ],
)

export const lang = sqliteTable('lang', {
  code: text(),
  id: integer().primaryKey(),
})

export const translation = sqliteTable(
  'translation',
  {
    langId: integer('lang_id')
      .notNull()
      .references(() => lang.id),
    lineId: integer('line_id').notNull(),
    value: text(),
  },
  (table) => [
    primaryKey({
      columns: [table.lineId, table.langId],
      name: 'translation_line_id_lang_id_pk',
    }),
  ],
)

export const product = sqliteTable('product', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
  /** English URL slug, the same in every language */
  slug: text(),
})

export const productRegion = sqliteTable(
  'product_region',
  {
    productGuid: integer('product_guid').references(() => product.guid),
    regionId: integer('region_id').references(() => region.id),
  },
  (table) => [
    primaryKey({
      columns: [table.productGuid, table.regionId],
      name: 'product_region_product_guid_region_id_pk',
    }),
  ],
)

export const need = sqliteTable('need', {
  guid: integer().primaryKey(),
  productGuid: integer('product_guid').references(() => product.guid),
})

export const needAttribute = sqliteTable(
  'need_attribute',
  {
    attributeId: integer('attribute_id').references(() => attribute.id),
    needGuid: integer('need_guid').references(() => need.guid),
    value: real(),
  },
  (table) => [index('idx_need_attribute_need').on(table.needGuid)],
)

export const building = sqliteTable('building', {
  categoryText: integer('category_text'),
  descriptionText: integer('description_text'),
  dlcGuid: integer('dlc_guid').references(() => dlc.guid),
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
  radius: integer(),
  regionId: integer('region_id').references(() => region.id),
  /** English URL slug, the same in every language */
  slug: text(),
  streetRadius: integer('street_radius'),
  template: text(),
})

export const buildingRegion = sqliteTable(
  'building_region',
  {
    buildingGuid: integer('building_guid').references(() => building.guid),
    regionId: integer('region_id').references(() => region.id),
  },
  (table) => [
    primaryKey({
      columns: [table.buildingGuid, table.regionId],
      name: 'building_region_building_guid_region_id_pk',
    }),
  ],
)

export const buildingCost = sqliteTable(
  'building_cost',
  {
    amount: real(),
    buildingGuid: integer('building_guid').references(() => building.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [index('idx_building_cost_building').on(table.buildingGuid)],
)

export const buildingMaintenance = sqliteTable(
  'building_maintenance',
  {
    amount: real(),
    buildingGuid: integer('building_guid').references(() => building.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [
    index('idx_building_maintenance_building').on(table.buildingGuid),
  ],
)

export const buildingEffect = sqliteTable(
  'building_effect',
  {
    buildingGuid: integer('building_guid').references(() => building.guid),
    effectGuid: integer('effect_guid'),
  },
  (table) => [index('idx_building_effect_building').on(table.buildingGuid)],
)

export const buildingPhase = sqliteTable(
  'building_phase',
  {
    buildingGuid: integer('building_guid').references(() => building.guid),
    durationSeconds: integer('duration_seconds'),
    guid: integer().primaryKey(),
    nameText: integer('name_text'),
    phase: integer(),
  },
  (table) => [index('idx_building_phase_building').on(table.buildingGuid)],
)

export const buildingPhaseCost = sqliteTable(
  'building_phase_cost',
  {
    amount: real(),
    phaseGuid: integer('phase_guid').references(() => buildingPhase.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [index('idx_building_phase_cost_phase').on(table.phaseGuid)],
)

export const buildingPhaseMaintenance = sqliteTable(
  'building_phase_maintenance',
  {
    amount: real(),
    phaseGuid: integer('phase_guid').references(() => buildingPhase.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [
    index('idx_building_phase_maintenance_phase').on(table.phaseGuid),
  ],
)

export const factory = sqliteTable('factory', {
  baseProductivity: real('base_productivity'),
  buildingGuid: integer('building_guid')
    .primaryKey()
    .references(() => building.guid),
  cycleTime: real('cycle_time'),
  needsFuel: integer('needs_fuel', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  transporterRange: integer('transporter_range'),
})

export const factoryInput = sqliteTable(
  'factory_input',
  {
    amount: real(),
    buildingGuid: integer('building_guid').references(() => building.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [
    index('idx_factory_input_product').on(table.productGuid),
    index('idx_factory_input_building').on(table.buildingGuid),
  ],
)

export const factoryOutput = sqliteTable(
  'factory_output',
  {
    amount: real(),
    buildingGuid: integer('building_guid').references(() => building.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [
    index('idx_factory_output_product').on(table.productGuid),
    index('idx_factory_output_building').on(table.buildingGuid),
  ],
)

export const residence = sqliteTable('residence', {
  buildingGuid: integer('building_guid')
    .primaryKey()
    .references(() => building.guid),
  populationLevelGuid: integer('population_level_guid').references(
    () => populationLevel.guid,
  ),
})

export const residenceNeed = sqliteTable(
  'residence_need',
  {
    buffOnly: integer('buff_only'),
    buildingGuid: integer('building_guid').references(() => building.guid),
    consumptionRate: real('consumption_rate'),
    needGuid: integer('need_guid').references(() => need.guid),
  },
  (table) => [index('idx_residence_need_building').on(table.buildingGuid)],
)

/** ships and troops the player recruits, plus the start flagships */
export const unit = sqliteTable('unit', {
  buildSeconds: integer('build_seconds'),
  cargoSlots: integer('cargo_slots'),
  descriptionText: integer('description_text'),
  guid: integer().primaryKey(),
  /** ships only; troops have health per soldier */
  health: integer(),
  icon: text(),
  itemSockets: integer('item_sockets'),
  moduleSlots: integer('module_slots'),
  morale: integer(),
  nameText: integer('name_text'),
  /** null when recruited in several regions (villa garrisons) */
  regionId: integer('region_id').references(() => region.id),
  /** English URL slug, the same in every language */
  slug: text(),
  soldiers: integer(),
  speed: real(),
})

export const unitCost = sqliteTable(
  'unit_cost',
  {
    amount: real(),
    productGuid: integer('product_guid').references(() => product.guid),
    unitGuid: integer('unit_guid').references(() => unit.guid),
  },
  (table) => [index('idx_unit_cost_unit').on(table.unitGuid)],
)

export const unitMaintenance = sqliteTable(
  'unit_maintenance',
  {
    amount: real(),
    productGuid: integer('product_guid').references(() => product.guid),
    unitGuid: integer('unit_guid').references(() => unit.guid),
  },
  (table) => [index('idx_unit_maintenance_unit').on(table.unitGuid)],
)

export const unitRecruiter = sqliteTable(
  'unit_recruiter',
  {
    buildingGuid: integer('building_guid').references(() => building.guid),
    unitGuid: integer('unit_guid').references(() => unit.guid),
  },
  (table) => [
    primaryKey({
      columns: [table.unitGuid, table.buildingGuid],
      name: 'unit_recruiter_unit_guid_building_guid_pk',
    }),
  ],
)

/** decorations, ground patterns and walls from the ornament menu */
export const ornament = sqliteTable('ornament', {
  descriptionText: integer('description_text'),
  /** the cosmetic pack unlocking it */
  dlcGuid: integer('dlc_guid').references(() => dlc.guid),
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
  /** null when every region's menu lists it (all but the pack's mountain statues) */
  regionId: integer('region_id').references(() => region.id),
  /** English URL slug, the same in every language */
  slug: text(),
  /** Ornament.OrnamentUnit, what it adds towards Prestige; null for ground patterns and walls */
  value: integer(),
})

export const ornamentCost = sqliteTable(
  'ornament_cost',
  {
    amount: real(),
    ornamentGuid: integer('ornament_guid').references(() => ornament.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [index('idx_ornament_cost_ornament').on(table.ornamentGuid)],
)

export const productionChain = sqliteTable('production_chain', {
  buildingGuid: integer('building_guid').references(() => building.guid),
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
  regionId: integer('region_id').references(() => region.id),
  /** English URL slug, the same in every language */
  slug: text(),
})

export const productionChainNode = sqliteTable(
  'production_chain_node',
  {
    buildingGuid: integer('building_guid'),
    chainGuid: integer('chain_guid').references(() => productionChain.guid),
    id: integer().primaryKey(),
    parentId: integer('parent_id'),
    tier: integer(),
  },
  (table) => [index('idx_production_chain_node_chain').on(table.chainGuid)],
)

/** Construction-menu tabs (`menu`: buildings and chains), trading-post filter categories (`product`), recruiting buildings (`unit`) and ornament-menu tabs (`ornament`) */
export const category = sqliteTable('category', {
  guid: integer().primaryKey(),
  icon: text(),
  /** products the trading post doesn't list (Workforce, Service, Meta); named by the client */
  key: text(),
  kind: text({
    enum: categoryKindValues,
  }),
  nameText: integer('name_text'),
  sort: integer(),
})

export const categoryMember = sqliteTable(
  'category_member',
  {
    assetGuid: integer('asset_guid').notNull(),
    categoryGuid: integer('category_guid')
      .notNull()
      .references(() => category.guid),
  },
  (table) => [
    index('idx_category_member_asset').on(table.assetGuid),
    primaryKey({
      columns: [table.categoryGuid, table.assetGuid],
      name: 'category_member_category_guid_asset_guid_pk',
    }),
  ],
)

/** Game names of keys stored elsewhere: attribute, rarity, niche, allocation, modifier (`buff_modifier.path`) … */
export const label = sqliteTable(
  'label',
  {
    icon: text(),
    key: text().notNull(),
    kind: text({
      enum: labelKindValues,
    }).notNull(),
    nameText: integer('name_text'),
  },
  (table) => [
    primaryKey({
      columns: [table.kind, table.key],
      name: 'label_kind_key_pk',
    }),
  ],
)

export const effect = sqliteTable('effect', {
  descriptionText: integer('description_text'),
  /** how long a timed effect lasts; null when permanent */
  durationMs: integer('duration_ms'),
  guid: integer().primaryKey(),
  nameText: integer('name_text'),
})

export const effectBuff = sqliteTable(
  'effect_buff',
  {
    buffGuid: integer('buff_guid'),
    effectGuid: integer('effect_guid').references(() => effect.guid),
  },
  (table) => [
    primaryKey({
      columns: [table.effectGuid, table.buffGuid],
      name: 'effect_buff_effect_guid_buff_guid_pk',
    }),
  ],
)

export const effectTargetPool = sqliteTable(
  'effect_target_pool',
  {
    effectGuid: integer('effect_guid').references(() => effect.guid),
    /** the target's own icon, else its first member's */
    icon: text(),
    /** what the target holds */
    kind: text({
      enum: ['building', 'unit', 'ship'],
    }),
    /** a pool ("Warehouses") or a single asset ("Fishing Hut") */
    nameText: integer('name_text'),
    poolGuid: integer('pool_guid'),
  },
  (table) => [
    primaryKey({
      columns: [table.effectGuid, table.poolGuid],
      name: 'effect_target_pool_effect_guid_pool_guid_pk',
    }),
  ],
)

/** The building a target stands for, one row per regional variant (Roman and Celtic Charcoal Burner). */
export const effectTargetBuilding = sqliteTable(
  'effect_target_building',
  {
    buildingGuid: integer('building_guid').references(() => building.guid),
    effectGuid: integer('effect_guid').references(() => effect.guid),
    poolGuid: integer('pool_guid'),
  },
  (table) => [
    primaryKey({
      columns: [table.effectGuid, table.poolGuid, table.buildingGuid],
      name: 'effect_target_building_effect_guid_pool_guid_building_guid_pk',
    }),
  ],
)

export const poolMember = sqliteTable(
  'pool_member',
  {
    assetGuid: integer('asset_guid').notNull(),
    poolGuid: integer('pool_guid').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.poolGuid, table.assetGuid],
      name: 'pool_member_pool_guid_asset_guid_pk',
    }),
  ],
)

export const buffModifier = sqliteTable(
  'buff_modifier',
  {
    /** templated effects: the fertility added, or the input a new one replaces */
    assetGuid: integer('asset_guid'),
    attributeId: integer('attribute_id').references(() => attribute.id),
    buffGuid: integer('buff_guid'),
    /** templated effects: extra output every this many cycles */
    cycles: integer(),
    isPercent: integer('is_percent'),
    /** templated effects: the incident a building becomes immune to */
    key: text(),
    path: text(),
    /** the good a per-product modifier changes, e.g. the workforce added to a villa */
    productGuid: integer('product_guid').references(() => product.guid),
    value: real(),
  },
  (table) => [index('idx_buff_modifier_buff').on(table.buffGuid)],
)

export const buffFunctionalEffect = sqliteTable(
  'buff_functional_effect',
  {
    buffGuid: integer('buff_guid'),
    effectGuid: integer('effect_guid'),
  },
  (table) => [index('idx_buff_functional_effect_buff').on(table.buffGuid)],
)

export const buffProvidedNeed = sqliteTable(
  'buff_provided_need',
  {
    buffGuid: integer('buff_guid'),
    needGuid: integer('need_guid').references(() => need.guid),
  },
  (table) => [
    primaryKey({
      columns: [table.buffGuid, table.needGuid],
      name: 'buff_provided_need_buff_guid_need_guid_pk',
    }),
  ],
)

export const item = sqliteTable('item', {
  allocation: text({
    enum: allocationValues,
  }),
  boostHintText: integer('boost_hint_text'),
  descriptionText: integer('description_text'),
  dlcGuid: integer('dlc_guid').references(() => dlc.guid),
  effectGuid: integer('effect_guid').references(() => effect.guid),
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
  niche: text({
    enum: nicheValues,
  }),
  rarity: text({
    enum: rarityValues,
  }),
  /** English URL slug, the same in every language */
  slug: text(),
  tradePrice: real('trade_price'),
})

export const itemBoostBuff = sqliteTable(
  'item_boost_buff',
  {
    buffGuid: integer('buff_guid'),
    itemGuid: integer('item_guid').references(() => item.guid),
  },
  (table) => [index('idx_item_boost_buff_item').on(table.itemGuid)],
)

export const itemBoostCondition = sqliteTable(
  'item_boost_condition',
  {
    conditionId: integer('condition_id'),
    itemGuid: integer('item_guid').references(() => item.guid),
  },
  (table) => [index('idx_item_boost_condition_item').on(table.itemGuid)],
)

export const itemSource = sqliteTable(
  'item_source',
  {
    itemGuid: integer('item_guid')
      .notNull()
      .references(() => item.guid),
    kind: text({
      enum: itemSourceKindValues,
    }).notNull(),
    sourceGuid: integer('source_guid').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.itemGuid, table.kind, table.sourceGuid],
      name: 'item_source_item_guid_kind_source_guid_pk',
    }),
  ],
)

/** Hippodrome stat ranges from the item's racer preset; the game rolls the actual values per save */
export const itemRacerAttribute = sqliteTable(
  'item_racer_attribute',
  {
    attribute: text({
      enum: racerAttributeValues,
    }).notNull(),
    /** a new charioteer starts between these */
    initialMax: integer('initial_max').notNull(),
    initialMin: integer('initial_min').notNull(),
    itemGuid: integer('item_guid')
      .notNull()
      .references(() => item.guid),
    /** and can train up to between these */
    potentialMax: integer('potential_max').notNull(),
    potentialMin: integer('potential_min').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.itemGuid, table.attribute],
      name: 'item_racer_attribute_item_guid_attribute_pk',
    }),
  ],
)

export const techCategory = sqliteTable('tech_category', {
  artwork: text(),
  descriptionText: integer('description_text'),
  gateGuid: integer('gate_guid'),
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
  sort: integer(),
  x: integer(),
  y: integer(),
})

export const tech = sqliteTable('tech', {
  categoryGuid: integer('category_guid').references(() => techCategory.guid),
  descriptionText: integer('description_text'),
  dlcGuid: integer('dlc_guid').references(() => dlc.guid),
  gridX: integer('grid_x'),
  gridY: integer('grid_y'),
  guid: integer().primaryKey(),
  icon: text(),
  isGate: integer('is_gate', {
    mode: 'boolean',
  }),
  knowledgeNeeded: real('knowledge_needed'),
  nameText: integer('name_text'),
  regionId: integer('region_id').references(() => region.id),
  showConnectionToCategory: integer('show_connection_to_category', {
    mode: 'boolean',
  }),
  /** English URL slug, the same in every language */
  slug: text(),
})

export const techUnlock = sqliteTable(
  'tech_unlock',
  {
    assetGuid: integer('asset_guid'),
    techGuid: integer('tech_guid').references(() => tech.guid),
  },
  (table) => [
    index('idx_tech_unlock_asset').on(table.assetGuid),
    primaryKey({
      columns: [table.techGuid, table.assetGuid],
      name: 'tech_unlock_tech_guid_asset_guid_pk',
    }),
  ],
)

export const techUnlockReward = sqliteTable(
  'tech_unlock_reward',
  {
    assetGuid: integer('asset_guid'),
    buildingGuid: integer('building_guid').references(() => building.guid),
    descriptionText: integer('description_text'),
    icon: text(),
    idx: integer(),
    nameText: integer('name_text'),
    techGuid: integer('tech_guid').references(() => tech.guid),
  },
  (table) => [
    primaryKey({
      columns: [table.techGuid, table.idx],
      name: 'tech_unlock_reward_tech_guid_idx_pk',
    }),
  ],
)

export const techEffect = sqliteTable(
  'tech_effect',
  {
    effectGuid: integer('effect_guid'),
    techGuid: integer('tech_guid').references(() => tech.guid),
  },
  (table) => [index('idx_tech_effect_tech').on(table.techGuid)],
)

export const techResource = sqliteTable(
  'tech_resource',
  {
    amount: real(),
    productGuid: integer('product_guid'),
    techGuid: integer('tech_guid').references(() => tech.guid),
  },
  (table) => [index('idx_tech_resource_tech').on(table.techGuid)],
)

export const unlock = sqliteTable(
  'unlock',
  {
    assetGuid: integer('asset_guid'),
    conditionId: integer('condition_id'),
    sourceGuid: integer('source_guid'),
  },
  (table) => [
    primaryKey({
      columns: [table.assetGuid, table.sourceGuid],
      name: 'unlock_asset_guid_source_guid_pk',
    }),
  ],
)

export const condition = sqliteTable('condition', {
  id: integer().primaryKey(),
  negate: integer(),
  ownerId: integer('owner_id'),
  ownerKind: text('owner_kind'),
  parentId: integer('parent_id'),
  /** how the sub-conditions combine: Parallel / Linear (all of them) or MutuallyExclusive (one of them) */
  subOrder: text('sub_order', {
    enum: subConditionOrderValues,
  }),
  template: text({
    enum: conditionTemplateValues,
  }).notNull(),
})

/** Name and icon of assets a condition points at that have no table of their own (provinces, volcano phases …) */
export const assetName = sqliteTable('asset_name', {
  guid: integer().primaryKey(),
  icon: text(),
  nameText: integer('name_text'),
})

export const conditionParam = sqliteTable(
  'condition_param',
  {
    conditionId: integer('condition_id').references(() => condition.id),
    key: text(),
    value: text(),
  },
  (table) => [index('idx_condition_param_condition').on(table.conditionId)],
)

export const storyline = sqliteTable('storyline', {
  guid: integer().primaryKey(),
  /** icon of the governor request that announces it */
  icon: text(),
  /** player-facing name: the first decision's headline, else its journal entry */
  titleText: integer('title_text'),
})

export const storylineCondition = sqliteTable(
  'storyline_condition',
  {
    conditionId: integer('condition_id'),
    storylineGuid: integer('storyline_guid').references(() => storyline.guid),
  },
  (table) => [
    index('idx_storyline_condition_storyline').on(table.storylineGuid),
  ],
)

export const quest = sqliteTable(
  'quest',
  {
    guid: integer().primaryKey(),
    icon: text(),
    nameText: integer('name_text'),
    storylineGuid: integer('storyline_guid'),
  },
  (table) => [index('idx_quest_storyline').on(table.storylineGuid)],
)

export const questOption = sqliteTable(
  'quest_option',
  {
    /** requirement to pick the option */
    conditionId: integer('condition_id').references(() => condition.id),
    costAmount: real('cost_amount'),
    /** product paid to pick the option, usually coins */
    costGuid: integer('cost_guid'),
    decisionGuid: integer('decision_guid').references(
      () => questChoice.nodeGuid,
    ),
    idx: integer(),
    textText: integer('text_text'),
  },
  (table) => [index('idx_quest_option_decision').on(table.decisionGuid)],
)

export const questReward = sqliteTable(
  'quest_reward',
  {
    amount: real(),
    amountVariable: text('amount_variable'),
    assetGuid: integer('asset_guid'),
    /** the racer attribute a racer upgrade raises (Speed, Stamina, Boost, Consistency) */
    attribute: text({
      enum: racerAttributeValues,
    }),
    /** the asset's own icon, for assets without a table of their own */
    icon: text(),
    kind: text(),
    /** the asset's own name, for assets without a table of their own (incidents, provinces, ships) */
    nameText: integer('name_text'),
    nodeGuid: integer('node_guid'),
  },
  (table) => [index('idx_quest_reward_node').on(table.nodeGuid)],
)

/** `ActionModifyVariable`: favours, flags and counters a node changes */
export const questVariableChange = sqliteTable(
  'quest_variable_change',
  {
    nodeGuid: integer('node_guid'),
    operation: text({
      enum: variableOperationValues,
    }),
    value: text(),
    /** set when the value is read from another variable */
    valueVariable: text('value_variable'),
    variable: text(),
  },
  (table) => [index('idx_quest_variable_change_node').on(table.nodeGuid)],
)

/** A decision with several options, or a function branching on its condition */
export const questChoice = sqliteTable(
  'quest_choice',
  {
    /** the condition a check tests (holds / fails) */
    conditionId: integer('condition_id').references(() => condition.id),
    headlineText: integer('headline_text'),
    kind: text({
      enum: ['decision', 'check'],
    }),
    nodeGuid: integer('node_guid').primaryKey(),
    /** order within the storyline */
    position: integer(),
    /** who asks on a decision screen (an advisor, a resident …); null for the player or a runtime variable */
    speakerGuid: integer('speaker_guid'),
    storylineGuid: integer('storyline_guid').references(() => storyline.guid),
    textText: integer('text_text'),
  },
  (table) => [index('idx_quest_choice_storyline').on(table.storylineGuid)],
)

/** Nodes run when option `idx` is taken (checks: 0 when the condition holds, 1 when not), up to and including the next choice */
export const questChoiceOutcome = sqliteTable(
  'quest_choice_outcome',
  {
    choiceGuid: integer('choice_guid')
      .notNull()
      .references(() => questChoice.nodeGuid),
    idx: integer().notNull(),
    nodeGuid: integer('node_guid').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.choiceGuid, table.idx, table.nodeGuid],
      name: 'quest_choice_outcome_choice_guid_idx_node_guid_pk',
    }),
  ],
)

/** Narrative storylines linked by the variables they share; guid is the first part's storyline */
export const questline = sqliteTable('questline', {
  dlcGuid: integer('dlc_guid').references(() => dlc.guid),
  guid: integer().primaryKey(),
  icon: text(),
  regionId: integer('region_id').references(() => region.id),
  /** English URL slug, the same in every language */
  slug: text(),
  titleText: integer('title_text'),
})

export const questlineStoryline = sqliteTable(
  'questline_storyline',
  {
    idx: integer(),
    questlineGuid: integer('questline_guid')
      .notNull()
      .references(() => questline.guid),
    storylineGuid: integer('storyline_guid')
      .notNull()
      .references(() => storyline.guid),
  },
  (table) => [
    index('idx_questline_storyline_storyline').on(table.storylineGuid),
    primaryKey({
      columns: [table.questlineGuid, table.storylineGuid],
      name: 'questline_storyline_questline_guid_storyline_guid_pk',
    }),
  ],
)

export const effectTarget = sqliteView('effect_target', {
  buildingGuid: integer('building_guid'),
  effectGuid: integer('effect_guid'),
}).as(
  sql`select etp.effect_guid, pm.asset_guid building_guid from effect_target_pool etp join pool_member pm using(pool_guid)`,
)
