import {
  and,
  asc,
  count,
  eq,
  exists,
  inArray,
  type SQL,
  sql,
} from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  building,
  categoryMember,
  dlc,
  factoryInput,
  factoryOutput,
  need,
  populationLevel,
  product,
  productRegion,
  region,
  residence,
  residenceNeed,
} from '../schema'
import { phrases } from './phrases'
import {
  categoriesOf,
  type Get,
  groupBy,
  inCategories,
  localized,
  on,
  type Page,
  paginate,
  regionColumns,
} from './shared'
export type ProductFilter = {
  lang: Lang
  regions?: Array<number>
  /** category guids, see `products.types` */
  types?: Array<number>
  /** DLC guids of a producing building */
  dlcs?: Array<number>
  /** population_level guids whose residences need the product */
  tiers?: Array<number>
}

/** Goods by the game's trading-post filter (Consumer Goods, Raw Materials …), then workforce, services and empire goods. */
async function types({ lang }: { lang: Lang }) {
  return (await categoriesOf('product', product.guid, lang)).map(
    ({ key, ...c }) => ({
      ...c,
      // products the trading post doesn't list; the game has no name for these groups
      name:
        c.name ??
        (key
          ? ((phrases[lang].productKinds as Record<string, string>)[key] ?? key)
          : null),
    }),
  )
}

/** skips needs only switched on by a buff (IsOnlyAvailableThroughBuff) */
const regularNeed = sql`coalesce(${residenceNeed.buffOnly}, 0) = 0`

/** some building producing the product matches `condition` */
function producerWhere(condition: SQL) {
  return exists(
    db
      .select({
        one: sql`1`,
      })
      .from(factoryOutput)
      .innerJoin(building, eq(building.guid, factoryOutput.buildingGuid))
      .where(and(eq(factoryOutput.productGuid, product.guid), condition)),
  )
}

/** Products with the buildings that produce and consume them. */
async function queryProducts(f: ProductFilter & Page, id?: number) {
  const nameT = localized('name')
  const bName = localized('b_name')
  const where = and(
    id === undefined ? undefined : eq(product.guid, id),
    f.types?.length ? inCategories(product.guid, f.types) : undefined,
    f.dlcs?.length
      ? producerWhere(inArray(building.dlcGuid, f.dlcs))
      : undefined,
    f.tiers?.length
      ? exists(
          db
            .select({
              one: sql`1`,
            })
            .from(need)
            .innerJoin(residenceNeed, eq(residenceNeed.needGuid, need.guid))
            .innerJoin(
              residence,
              eq(residence.buildingGuid, residenceNeed.buildingGuid),
            )
            .where(
              and(
                eq(need.productGuid, product.guid),
                inArray(residence.populationLevelGuid, f.tiers),
                regularNeed,
              ),
            ),
        )
      : undefined,
    f.regions?.length
      ? exists(
          db
            .select({
              one: sql`1`,
            })
            .from(productRegion)
            .where(
              and(
                eq(productRegion.productGuid, product.guid),
                inArray(productRegion.regionId, f.regions),
              ),
            ),
        )
      : undefined,
  )
  const { limit, offset } = paginate(f)
  const [[{ total }], rows] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(product)
      .where(where),
    db
      .select({
        guid: product.guid,
        icon: product.icon,
        name: nameT.value,
        slug: product.slug,
      })
      .from(product)
      .leftJoin(nameT, on(nameT, product.nameText, f.lang))
      .where(where)
      .orderBy(asc(nameT.value), asc(product.guid))
      .limit(limit)
      .offset(offset),
  ])
  const guids = rows.map((r) => r.guid)
  function usage(table: typeof factoryInput | typeof factoryOutput) {
    return db
      .select({
        amount: table.amount,
        guid: building.guid,
        icon: building.icon,
        name: bName.value,
        productGuid: table.productGuid,
        region: regionColumns,
        slug: building.slug,
      })
      .from(table)
      .innerJoin(building, eq(building.guid, table.buildingGuid))
      .leftJoin(bName, on(bName, building.nameText, f.lang))
      .leftJoin(region, eq(region.id, building.regionId))
      .where(inArray(table.productGuid, guids))
      .orderBy(asc(building.regionId), asc(building.guid))
  }
  const dlcT = localized('dlc_name')
  const tierT = localized('tier_name')
  const [producedBy, consumedBy, regions, producerDlcs, tiers, filed, named] =
    await Promise.all([
      usage(factoryOutput),
      usage(factoryInput),
      db
        .select({
          productGuid: productRegion.productGuid,
          region: regionColumns,
        })
        .from(productRegion)
        .innerJoin(region, eq(region.id, productRegion.regionId))
        .where(inArray(productRegion.productGuid, guids))
        .orderBy(asc(region.id)),
      db
        .select({
          dlc: {
            guid: dlc.guid,
            icon: dlc.icon,
            key: dlc.key,
            name: dlcT.value,
          },
          productGuid: factoryOutput.productGuid,
        })
        .from(factoryOutput)
        .innerJoin(building, eq(building.guid, factoryOutput.buildingGuid))
        .leftJoin(dlc, eq(dlc.guid, building.dlcGuid))
        .leftJoin(dlcT, on(dlcT, dlc.nameText, f.lang))
        .where(inArray(factoryOutput.productGuid, guids))
        .orderBy(asc(dlc.guid)),
      db
        .select({
          consumptionRate: residenceNeed.consumptionRate,
          guid: populationLevel.guid,
          icon: populationLevel.icon,
          level: populationLevel.tier,
          name: tierT.value,
          productGuid: need.productGuid,
          regionId: populationLevel.regionId,
        })
        .from(need)
        .innerJoin(residenceNeed, eq(residenceNeed.needGuid, need.guid))
        .innerJoin(
          residence,
          eq(residence.buildingGuid, residenceNeed.buildingGuid),
        )
        .innerJoin(
          populationLevel,
          eq(populationLevel.guid, residence.populationLevelGuid),
        )
        .leftJoin(tierT, on(tierT, populationLevel.nameText, f.lang))
        .where(and(inArray(need.productGuid, guids), regularNeed))
        .orderBy(asc(populationLevel.regionId), asc(populationLevel.tier)),
      db
        .select()
        .from(categoryMember)
        .where(inArray(categoryMember.assetGuid, guids)),
      types({
        lang: f.lang,
      }),
    ])
  const p = groupBy(producedBy, 'productGuid')
  const c = groupBy(consumedBy, 'productGuid')
  const rg = groupBy(regions, 'productGuid')
  const d = groupBy(producerDlcs, 'productGuid')
  const t = groupBy(tiers, 'productGuid')
  // a product belongs to the lowest tier of each region that needs it; higher tiers keep consuming it
  function tiersOf(guid: number) {
    const all = t(guid)
    const lowest = new Map<number | null, number | null>()
    for (const x of all) {
      if (!lowest.has(x.regionId)) {
        lowest.set(x.regionId, x.level)
      }
    }
    const split = all.map(({ level, productGuid, regionId, ...tier }) => ({
      isLowest: lowest.get(regionId) === level,
      tier,
    }))
    return {
      neededBy: split.filter((x) => x.isLowest).map((x) => x.tier),
      wantedBy: split.filter((x) => !x.isLowest).map((x) => x.tier),
    }
  }
  // a product is DLC content only when every building producing it is
  function productDlc(guid: number) {
    const producers = d(guid)
    return producers.length && producers.every((x) => x.dlc?.guid)
      ? producers[0].dlc
      : null
  }
  return {
    pages: Math.ceil(total / limit),
    rows: rows.map((row) => ({
      ...row,
      ...tiersOf(row.guid),
      consumedBy: c(row.guid),
      dlc: productDlc(row.guid),
      producedBy: p(row.guid),
      regions: rg(row.guid).map((x) => x.region),
      /** the game's goods category, or workforce, service or empire */
      type:
        named.find((category) =>
          filed.some(
            (m) => m.assetGuid === row.guid && m.categoryGuid === category.guid,
          ),
        ) ?? null,
    })),
    total,
  }
}

async function get({ id, lang }: Get) {
  return (
    (
      await queryProducts(
        {
          lang,
          perPage: 1,
        },
        id,
      )
    ).rows[0] ?? null
  )
}

async function list(f: ProductFilter & Page) {
  return await queryProducts(f)
}

export const products = {
  get,
  list,
  types,
}
