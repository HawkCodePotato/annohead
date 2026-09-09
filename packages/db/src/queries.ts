import {
  and,
  asc,
  count,
  eq,
  exists,
  inArray,
  like,
  type SQL,
  sql,
} from 'drizzle-orm'
import { alias, type SQLiteColumn } from 'drizzle-orm/sqlite-core'

import { db } from './db'
import {
  attribute,
  buff,
  buffModifier,
  building,
  buildingCost,
  buildingMaintenance,
  effect,
  effectBuff,
  effectTargetPool,
  factory,
  factoryInput,
  factoryOutput,
  item,
  itemBoostBuff,
  itemSource,
  poolMember,
  populationLevel,
  product,
  productRegion,
  region,
  tech,
  techResource,
  techUnlock,
  translation,
} from './schema'

export type Lang = 'english' | 'german'
export type Page = { page?: number; perPage?: number }
const PER_PAGE = 50

const langId = (lang: Lang) => sql`(select id from lang where code = ${lang})`
/** Aliased `text` table; join with `on(t, table.nameText, lang)`. */
const localized = (name: string) => alias(translation, name)
const on = (
  t: ReturnType<typeof localized>,
  lineId: SQLiteColumn,
  lang: Lang,
) => and(eq(t.lineId, lineId), eq(t.langId, langId(lang)))

const paginate = ({ page = 1, perPage = PER_PAGE }: Page) => ({
  limit: perPage,
  offset: (page - 1) * perPage,
})

const groupBy = <T, K extends keyof T>(rows: Array<T>, key: K) => {
  const map = new Map<T[K], Array<T>>()
  for (const row of rows) {
    const list = map.get(row[key]) ?? []
    list.push(row)
    map.set(row[key], list)
  }
  return (k: T[K]) => map.get(k) ?? []
}

// ---------------------------------------------------------------- items

export type ItemFilter = {
  lang: Lang
  search?: string
  rarity?: Array<string>
  niche?: Array<string>
  itemType?: string
  allocation?: string
  /** building guid the item's effect targets */
  targetBuilding?: number
  /** attribute key (Money, Knowledge …) the item's effect modifies */
  attribute?: string
}

const itemWhere = (
  f: ItemFilter,
  nameT: ReturnType<typeof localized>,
): SQL | undefined =>
  and(
    f.search ? like(nameT.value, `%${f.search}%`) : undefined,
    f.rarity?.length ? inArray(item.rarity, f.rarity) : undefined,
    f.niche?.length ? inArray(item.niche, f.niche) : undefined,
    f.itemType ? eq(item.itemType, f.itemType) : undefined,
    f.allocation ? eq(item.allocation, f.allocation) : undefined,
    f.targetBuilding
      ? exists(
          db
            .select({ one: sql`1` })
            .from(effectTargetPool)
            .innerJoin(
              poolMember,
              eq(poolMember.poolGuid, effectTargetPool.poolGuid),
            )
            .where(
              and(
                eq(effectTargetPool.effectGuid, item.effectGuid),
                eq(poolMember.assetGuid, f.targetBuilding),
              ),
            ),
        )
      : undefined,
    f.attribute
      ? exists(
          db
            .select({ one: sql`1` })
            .from(effectBuff)
            .innerJoin(
              buffModifier,
              eq(buffModifier.buffGuid, effectBuff.buffGuid),
            )
            .innerJoin(attribute, eq(attribute.id, buffModifier.attributeId))
            .where(
              and(
                eq(effectBuff.effectGuid, item.effectGuid),
                eq(attribute.key, f.attribute),
              ),
            ),
        )
      : undefined,
  )

const modifierColumns = {
  attribute: attribute.key,
  buffGuid: buff.guid,
  isPercent: buffModifier.isPercent,
  path: buffModifier.path,
  value: buffModifier.value,
}

const itemDetails = async (guids: Array<number>, lang: Lang) => {
  const bName = localized('b_name')
  const [targets, modifiers, boosts, sources] = await Promise.all([
    db
      .selectDistinct({
        guid: building.guid,
        icon: building.icon,
        itemGuid: item.guid,
        kind: building.kind,
        name: bName.value,
      })
      .from(item)
      .innerJoin(
        effectTargetPool,
        eq(effectTargetPool.effectGuid, item.effectGuid),
      )
      .innerJoin(poolMember, eq(poolMember.poolGuid, effectTargetPool.poolGuid))
      .innerJoin(building, eq(building.guid, poolMember.assetGuid))
      .leftJoin(bName, on(bName, building.nameText, lang))
      .where(inArray(item.guid, guids)),
    db
      .select({ itemGuid: item.guid, ...modifierColumns })
      .from(item)
      .innerJoin(effectBuff, eq(effectBuff.effectGuid, item.effectGuid))
      .innerJoin(buff, eq(buff.guid, effectBuff.buffGuid))
      .innerJoin(buffModifier, eq(buffModifier.buffGuid, buff.guid))
      .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
      .where(inArray(item.guid, guids)),
    db
      .select({ itemGuid: itemBoostBuff.itemGuid, ...modifierColumns })
      .from(itemBoostBuff)
      .innerJoin(buff, eq(buff.guid, itemBoostBuff.buffGuid))
      .innerJoin(buffModifier, eq(buffModifier.buffGuid, buff.guid))
      .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
      .where(inArray(itemBoostBuff.itemGuid, guids)),
    db
      .select({
        guid: itemSource.sourceGuid,
        itemGuid: itemSource.itemGuid,
        kind: itemSource.sourceKind,
      })
      .from(itemSource)
      .where(inArray(itemSource.itemGuid, guids)),
  ])
  return {
    boosts: groupBy(boosts, 'itemGuid'),
    modifiers: groupBy(modifiers, 'itemGuid'),
    sources: groupBy(sources, 'itemGuid'),
    targets: groupBy(targets, 'itemGuid'),
  }
}

/** Specialists, captains and quest items with effect targets, modifiers, boosts and sources. */
export async function getItems(f: ItemFilter & Page) {
  const nameT = localized('name')
  const descT = localized('desc')
  const hintT = localized('hint')
  const where = itemWhere(f, nameT)
  const { limit, offset } = paginate(f)

  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(item)
      .leftJoin(nameT, on(nameT, item.nameText, f.lang))
      .where(where),
    db
      .select({
        allocation: item.allocation,
        boostHint: hintT.value,
        description: descT.value,
        effectScope: effect.scope,
        guid: item.guid,
        icon: item.icon,
        itemType: item.itemType,
        name: nameT.value,
        niche: item.niche,
        rarity: item.rarity,
        tradePrice: item.tradePrice,
      })
      .from(item)
      .leftJoin(nameT, on(nameT, item.nameText, f.lang))
      .leftJoin(descT, on(descT, item.descriptionText, f.lang))
      .leftJoin(hintT, on(hintT, item.boostHintText, f.lang))
      .leftJoin(effect, eq(effect.guid, item.effectGuid))
      .where(where)
      .orderBy(asc(nameT.value), asc(item.guid))
      .limit(limit)
      .offset(offset),
  ])
  const d = await itemDetails(
    rows.map((r) => r.guid),
    f.lang,
  )
  return {
    rows: rows.map((r) => ({
      ...r,
      boosts: d.boosts(r.guid),
      modifiers: d.modifiers(r.guid),
      sources: d.sources(r.guid),
      targets: d.targets(r.guid),
    })),
    total,
  }
}

export const getSpecialists = (f: Omit<ItemFilter, 'itemType'> & Page) =>
  getItems({ ...f, itemType: 'Specialist' })

export const getCaptains = (f: Omit<ItemFilter, 'itemType'> & Page) =>
  getItems({ ...f, itemType: 'Captains' })

// ---------------------------------------------------------------- buildings

export type BuildingFilter = {
  lang: Lang
  search?: string
  kind?: Array<string>
  buildingType?: string
  regionId?: number
  /** workforce tier (population_level guid) */
  populationLevel?: number
  /** product guid consumed / produced / needed to build */
  inputProduct?: number
  outputProduct?: number
  costProduct?: number
}

const hasProduct = (
  table: typeof factoryInput | typeof factoryOutput | typeof buildingCost,
  productGuid: number,
) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(table)
      .where(
        and(
          eq(table.buildingGuid, building.guid),
          eq(table.productGuid, productGuid),
        ),
      ),
  )

const buildingWhere = (
  f: BuildingFilter,
  nameT: ReturnType<typeof localized>,
) =>
  and(
    f.search ? like(nameT.value, `%${f.search}%`) : undefined,
    f.kind?.length ? inArray(building.kind, f.kind) : undefined,
    f.buildingType ? eq(building.buildingType, f.buildingType) : undefined,
    f.regionId ? eq(building.regionId, f.regionId) : undefined,
    f.populationLevel
      ? eq(building.populationLevelGuid, f.populationLevel)
      : undefined,
    f.inputProduct ? hasProduct(factoryInput, f.inputProduct) : undefined,
    f.outputProduct ? hasProduct(factoryOutput, f.outputProduct) : undefined,
    f.costProduct ? hasProduct(buildingCost, f.costProduct) : undefined,
  )

const productRows = (
  table:
    | typeof factoryInput
    | typeof factoryOutput
    | typeof buildingCost
    | typeof buildingMaintenance,
  guids: Array<number>,
  lang: Lang,
) => {
  const pName = localized('p_name')
  return db
    .select({
      amount: table.amount,
      buildingGuid: table.buildingGuid,
      guid: product.guid,
      icon: product.icon,
      name: pName.value,
    })
    .from(table)
    .innerJoin(product, eq(product.guid, table.productGuid))
    .leftJoin(pName, on(pName, product.nameText, lang))
    .where(inArray(table.buildingGuid, guids))
}

const buildingDetails = async (guids: Array<number>, lang: Lang) => {
  const tName = localized('t_name')
  const [costs, maintenance, inputs, outputs, techs] = await Promise.all([
    productRows(buildingCost, guids, lang),
    productRows(buildingMaintenance, guids, lang),
    productRows(factoryInput, guids, lang),
    productRows(factoryOutput, guids, lang),
    db
      .select({
        buildingGuid: techUnlock.assetGuid,
        guid: tech.guid,
        icon: tech.icon,
        knowledgeNeeded: tech.knowledgeNeeded,
        name: tName.value,
      })
      .from(techUnlock)
      .innerJoin(tech, eq(tech.guid, techUnlock.techGuid))
      .leftJoin(tName, on(tName, tech.nameText, lang))
      .where(inArray(techUnlock.assetGuid, guids)),
  ])
  return {
    costs: groupBy(costs, 'buildingGuid'),
    inputs: groupBy(inputs, 'buildingGuid'),
    maintenance: groupBy(maintenance, 'buildingGuid'),
    outputs: groupBy(outputs, 'buildingGuid'),
    techs: groupBy(techs, 'buildingGuid'),
  }
}

/** Buildings with costs, maintenance, factory inputs/outputs and unlocking techs. */
export async function getBuildings(f: BuildingFilter & Page) {
  const nameT = localized('name')
  const descT = localized('desc')
  const catT = localized('cat')
  const plT = localized('pl')
  const where = buildingWhere(f, nameT)
  const { limit, offset } = paginate(f)

  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(building)
      .leftJoin(nameT, on(nameT, building.nameText, f.lang))
      .where(where),
    db
      .select({
        baseProductivity: factory.baseProductivity,
        buildingType: building.buildingType,
        category: catT.value,
        cycleTime: factory.cycleTime,
        description: descT.value,
        guid: building.guid,
        icon: building.icon,
        kind: building.kind,
        name: nameT.value,
        populationLevel: {
          guid: populationLevel.guid,
          icon: populationLevel.icon,
          name: plT.value,
          tier: populationLevel.tier,
        },
        radius: building.radius,
        region: { id: region.id, key: region.key, name: region.name },
        streetRadius: building.streetRadius,
        template: building.template,
        transporterRange: factory.transporterRange,
      })
      .from(building)
      .leftJoin(nameT, on(nameT, building.nameText, f.lang))
      .leftJoin(descT, on(descT, building.descriptionText, f.lang))
      .leftJoin(catT, on(catT, building.categoryText, f.lang))
      .leftJoin(region, eq(region.id, building.regionId))
      .leftJoin(
        populationLevel,
        eq(populationLevel.guid, building.populationLevelGuid),
      )
      .leftJoin(plT, on(plT, populationLevel.nameText, f.lang))
      .leftJoin(factory, eq(factory.buildingGuid, building.guid))
      .where(where)
      .orderBy(asc(nameT.value), asc(building.guid))
      .limit(limit)
      .offset(offset),
  ])
  const d = await buildingDetails(
    rows.map((r) => r.guid),
    f.lang,
  )
  return {
    rows: rows.map((r) => ({
      ...r,
      costs: d.costs(r.guid),
      inputs: d.inputs(r.guid),
      maintenance: d.maintenance(r.guid),
      outputs: d.outputs(r.guid),
      unlockedBy: d.techs(r.guid),
    })),
    total,
  }
}

// ---------------------------------------------------------------- products

export type ProductFilter = { lang: Lang; search?: string; regionId?: number }

/** Products with the buildings that produce and consume them. */
export async function getProducts(f: ProductFilter & Page) {
  const nameT = localized('name')
  const catT = localized('cat')
  const bName = localized('b_name')
  const where = and(
    f.search ? like(nameT.value, `%${f.search}%`) : undefined,
    f.regionId
      ? exists(
          db
            .select({ one: sql`1` })
            .from(productRegion)
            .where(
              and(
                eq(productRegion.productGuid, product.guid),
                eq(productRegion.regionId, f.regionId),
              ),
            ),
        )
      : undefined,
  )
  const { limit, offset } = paginate(f)
  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(product)
      .leftJoin(nameT, on(nameT, product.nameText, f.lang))
      .where(where),
    db
      .select({
        basePrice: product.basePrice,
        category: catT.value,
        guid: product.guid,
        icon: product.icon,
        name: nameT.value,
        storageLevel: product.storageLevel,
        transportType: product.transportType,
      })
      .from(product)
      .leftJoin(nameT, on(nameT, product.nameText, f.lang))
      .leftJoin(catT, on(catT, product.categoryText, f.lang))
      .where(where)
      .orderBy(asc(nameT.value), asc(product.guid))
      .limit(limit)
      .offset(offset),
  ])
  const guids = rows.map((r) => r.guid)
  const usage = (table: typeof factoryInput | typeof factoryOutput) =>
    db
      .select({
        amount: table.amount,
        guid: building.guid,
        icon: building.icon,
        name: bName.value,
        productGuid: table.productGuid,
      })
      .from(table)
      .innerJoin(building, eq(building.guid, table.buildingGuid))
      .leftJoin(bName, on(bName, building.nameText, f.lang))
      .where(inArray(table.productGuid, guids))
  const [producedBy, consumedBy] = await Promise.all([
    usage(factoryOutput),
    usage(factoryInput),
  ])
  const p = groupBy(producedBy, 'productGuid')
  const c = groupBy(consumedBy, 'productGuid')
  return {
    rows: rows.map((r) => ({
      ...r,
      consumedBy: c(r.guid),
      producedBy: p(r.guid),
    })),
    total,
  }
}

// ---------------------------------------------------------------- techs

export type TechFilter = { lang: Lang; search?: string }

/** Techs with the buildings they unlock and the resources they cost. */
export async function getTechs(f: TechFilter & Page) {
  const nameT = localized('name')
  const descT = localized('desc')
  const bName = localized('b_name')
  const pName = localized('p_name')
  const where = f.search ? like(nameT.value, `%${f.search}%`) : undefined
  const { limit, offset } = paginate(f)
  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(tech)
      .leftJoin(nameT, on(nameT, tech.nameText, f.lang))
      .where(where),
    db
      .select({
        description: descT.value,
        gridX: tech.gridX,
        gridY: tech.gridY,
        guid: tech.guid,
        icon: tech.icon,
        isGate: tech.isGate,
        knowledgeNeeded: tech.knowledgeNeeded,
        name: nameT.value,
      })
      .from(tech)
      .leftJoin(nameT, on(nameT, tech.nameText, f.lang))
      .leftJoin(descT, on(descT, tech.descriptionText, f.lang))
      .where(where)
      .orderBy(asc(tech.knowledgeNeeded), asc(tech.guid))
      .limit(limit)
      .offset(offset),
  ])
  const guids = rows.map((r) => r.guid)
  const [unlocks, resources] = await Promise.all([
    db
      .select({
        guid: building.guid,
        icon: building.icon,
        name: bName.value,
        techGuid: techUnlock.techGuid,
      })
      .from(techUnlock)
      .innerJoin(building, eq(building.guid, techUnlock.assetGuid))
      .leftJoin(bName, on(bName, building.nameText, f.lang))
      .where(inArray(techUnlock.techGuid, guids)),
    db
      .select({
        amount: techResource.amount,
        guid: product.guid,
        icon: product.icon,
        name: pName.value,
        techGuid: techResource.techGuid,
      })
      .from(techResource)
      .innerJoin(product, eq(product.guid, techResource.productGuid))
      .leftJoin(pName, on(pName, product.nameText, f.lang))
      .where(inArray(techResource.techGuid, guids)),
  ])
  const u = groupBy(unlocks, 'techGuid')
  const res = groupBy(resources, 'techGuid')
  return {
    rows: rows.map((t) => ({
      ...t,
      resources: res(t.guid),
      unlocksBuildings: u(t.guid),
    })),
    total,
  }
}
