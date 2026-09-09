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

export const region = sqliteTable('region', {
  id: integer().primaryKey(),
  key: text(),
  name: text(),
})

export const dlc = sqliteTable('dlc', {
  guid: integer().primaryKey(),
  icon: text(),
  key: text(),
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
  key: text(),
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
  basePrice: real('base_price'),
  categoryText: integer('category_text'),
  guid: integer().primaryKey(),
  icon: text(),
  name: text(),
  nameText: integer('name_text'),
  storageLevel: text('storage_level'),
  transportType: text('transport_type'),
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
  category: text(),
  descriptionText: integer('description_text'),
  guid: integer().primaryKey(),
  name: text(),
  nameText: integer('name_text'),
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
  buildingType: text('building_type'),
  categoryText: integer('category_text'),
  descriptionText: integer('description_text'),
  guid: integer().primaryKey(),
  health: integer(),
  icon: text(),
  kind: text(),
  name: text(),
  nameText: integer('name_text'),
  populationLevelGuid: integer('population_level_guid').references(
    () => populationLevel.guid,
  ),
  radius: integer(),
  regionId: integer('region_id').references(() => region.id),
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
    kind: text(),
  },
  (table) => [index('idx_building_effect_building').on(table.buildingGuid)],
)

export const factory = sqliteTable('factory', {
  baseProductivity: real('base_productivity'),
  buildingGuid: integer('building_guid')
    .primaryKey()
    .references(() => building.guid),
  cycleTime: real('cycle_time'),
  transporterRange: integer('transporter_range'),
})

export const factoryInput = sqliteTable(
  'factory_input',
  {
    amount: real(),
    buildingGuid: integer('building_guid').references(() => building.guid),
    productGuid: integer('product_guid').references(() => product.guid),
    storage: integer(),
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
    storage: integer(),
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
  upgradeToGuid: integer('upgrade_to_guid'),
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

export const residenceUpgradeCost = sqliteTable(
  'residence_upgrade_cost',
  {
    amount: real(),
    buildingGuid: integer('building_guid').references(() => building.guid),
    productGuid: integer('product_guid').references(() => product.guid),
  },
  (table) => [
    index('idx_residence_upgrade_cost_building').on(table.buildingGuid),
  ],
)

export const productionChain = sqliteTable('production_chain', {
  buildingGuid: integer('building_guid').references(() => building.guid),
  guid: integer().primaryKey(),
  icon: text(),
  name: text(),
  nameText: integer('name_text'),
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

export const effect = sqliteTable('effect', {
  descriptionText: integer('description_text'),
  excludeSource: integer('exclude_source'),
  guid: integer().primaryKey(),
  name: text(),
  nameText: integer('name_text'),
  scope: text(),
  sourceCategory: text('source_category'),
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
    poolGuid: integer('pool_guid'),
  },
  (table) => [
    primaryKey({
      columns: [table.effectGuid, table.poolGuid],
      name: 'effect_target_pool_effect_guid_pool_guid_pk',
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

export const effectSource = sqliteTable(
  'effect_source',
  {
    effectGuid: integer('effect_guid')
      .notNull()
      .references(() => effect.guid),
    sourceGuid: integer('source_guid').notNull(),
    sourceKind: text('source_kind'),
  },
  (table) => [
    primaryKey({
      columns: [table.effectGuid, table.sourceGuid],
      name: 'effect_source_effect_guid_source_guid_pk',
    }),
  ],
)

export const buff = sqliteTable('buff', {
  guid: integer().primaryKey(),
  icon: text(),
  name: text(),
  nameText: integer('name_text'),
  sourceCategory: text('source_category'),
})

export const buffModifier = sqliteTable(
  'buff_modifier',
  {
    attributeId: integer('attribute_id').references(() => attribute.id),
    buffGuid: integer('buff_guid').references(() => buff.guid),
    isPercent: integer('is_percent'),
    path: text(),
    value: real(),
  },
  (table) => [index('idx_buff_modifier_buff').on(table.buffGuid)],
)

export const buffFunctionalEffect = sqliteTable(
  'buff_functional_effect',
  {
    buffGuid: integer('buff_guid').references(() => buff.guid),
    effectGuid: integer('effect_guid'),
  },
  (table) => [index('idx_buff_functional_effect_buff').on(table.buffGuid)],
)

export const item = sqliteTable('item', {
  allocation: text(),
  boostHintText: integer('boost_hint_text'),
  descriptionText: integer('description_text'),
  effectGuid: integer('effect_guid').references(() => effect.guid),
  guid: integer().primaryKey(),
  icon: text(),
  itemType: text('item_type'),
  name: text(),
  nameText: integer('name_text'),
  niche: text(),
  rarity: text(),
  template: text(),
  tradePrice: real('trade_price'),
})

export const itemBoostBuff = sqliteTable(
  'item_boost_buff',
  {
    buffGuid: integer('buff_guid').references(() => buff.guid),
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
    sourceGuid: integer('source_guid').notNull(),
    sourceKind: text('source_kind'),
  },
  (table) => [
    primaryKey({
      columns: [table.itemGuid, table.sourceGuid],
      name: 'item_source_item_guid_source_guid_pk',
    }),
  ],
)

export const tech = sqliteTable('tech', {
  descriptionText: integer('description_text'),
  gridX: integer('grid_x'),
  gridY: integer('grid_y'),
  guid: integer().primaryKey(),
  icon: text(),
  isGate: integer('is_gate'),
  knowledgeNeeded: real('knowledge_needed'),
  name: text(),
  nameText: integer('name_text'),
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

export const techRequirement = sqliteTable(
  'tech_requirement',
  {
    conditionId: integer('condition_id'),
    techGuid: integer('tech_guid').references(() => tech.guid),
  },
  (table) => [index('idx_tech_requirement_tech').on(table.techGuid)],
)

export const unlock = sqliteTable(
  'unlock',
  {
    assetGuid: integer('asset_guid'),
    conditionId: integer('condition_id'),
    sourceGuid: integer('source_guid'),
    sourceKind: text('source_kind'),
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
  template: text(),
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
  name: text(),
  system: text(),
})

export const storylineVariable = sqliteTable(
  'storyline_variable',
  {
    name: text(),
    startValue: text('start_value'),
    storylineGuid: integer('storyline_guid').references(() => storyline.guid),
    type: text(),
  },
  (table) => [
    index('idx_storyline_variable_storyline').on(table.storylineGuid),
  ],
)

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

export const questPool = sqliteTable('quest_pool', {
  guid: integer().primaryKey(),
  name: text(),
})

export const questPoolStoryline = sqliteTable(
  'quest_pool_storyline',
  {
    poolGuid: integer('pool_guid').references(() => questPool.guid),
    storylineGuid: integer('storyline_guid'),
    weight: real(),
  },
  (table) => [index('idx_quest_pool_storyline_pool').on(table.poolGuid)],
)

export const quest = sqliteTable(
  'quest',
  {
    category: text(),
    guid: integer().primaryKey(),
    icon: text(),
    name: text(),
    nameText: integer('name_text'),
    storylineGuid: integer('storyline_guid'),
    summaryText: integer('summary_text'),
  },
  (table) => [index('idx_quest_storyline').on(table.storylineGuid)],
)

export const questNode = sqliteTable(
  'quest_node',
  {
    guid: integer().primaryKey(),
    headlineText: integer('headline_text'),
    name: text(),
    questGuid: integer('quest_guid'),
    stepText: integer('step_text'),
    storylineGuid: integer('storyline_guid').references(() => storyline.guid),
    textText: integer('text_text'),
    timeLimitMs: integer('time_limit_ms'),
    type: text(),
  },
  (table) => [
    index('idx_quest_node_quest').on(table.questGuid),
    index('idx_quest_node_storyline').on(table.storylineGuid),
  ],
)

export const questEdge = sqliteTable(
  'quest_edge',
  {
    fromGuid: integer('from_guid').notNull(),
    idx: integer().notNull(),
    kind: text().notNull(),
    optionIndex: integer('option_index'),
    toGuid: integer('to_guid').notNull(),
  },
  (table) => [
    index('idx_quest_edge_to').on(table.toGuid),
    primaryKey({
      columns: [table.fromGuid, table.toGuid, table.kind, table.idx],
      name: 'quest_edge_from_guid_to_guid_kind_idx_pk',
    }),
  ],
)

export const questOption = sqliteTable(
  'quest_option',
  {
    category: text(),
    decisionGuid: integer('decision_guid').references(() => questNode.guid),
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
    kind: text(),
    nodeGuid: integer('node_guid').references(() => questNode.guid),
  },
  (table) => [index('idx_quest_reward_node').on(table.nodeGuid)],
)

export const effectTarget = sqliteView('effect_target', {
  buildingGuid: integer('building_guid'),
  effectGuid: integer('effect_guid'),
}).as(
  sql`select etp.effect_guid, pm.asset_guid building_guid from effect_target_pool etp join pool_member pm using(pool_guid)`,
)
