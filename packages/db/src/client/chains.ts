import { and, asc, count, eq, inArray } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  building,
  categoryMember,
  dlc,
  factory,
  factoryOutput,
  populationLevel,
  product,
  productionChain,
  productionChainNode,
  region,
} from '../schema'
import { populationTiers } from './population-tiers'
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
export type ChainFilter = {
  lang: Lang
  regions?: Array<number>
  /** DLC guids (of the chain's final building) */
  dlcs?: Array<number>
  /** construction-menu tabs listing the chain (category guids, see `chains.types`): Harbour, Materials … */
  types?: Array<number>
  /** population tiers' menu tabs listing the chain (category guids, see `chains.tiers`) */
  tiers?: Array<number>
}

/** The construction-menu tabs chains are filed under, in game order, each tier's tab with its population tier (matched by the tier's workforce icon, else its name). */
async function menuTabs(lang: Lang) {
  const [categories, levels, workforce] = await Promise.all([
    categoriesOf('menu', productionChain.guid, lang),
    populationTiers.list({ lang }),
    db
      .select({ guid: product.guid, icon: product.icon })
      .from(product)
      .innerJoin(
        populationLevel,
        eq(populationLevel.workforceProductGuid, product.guid),
      ),
  ])
  return categories.map((category) => {
    const productGuid = workforce.find((w) => w.icon === category.icon)?.guid
    return {
      category,
      // Egypt's tabs show resident portraits, not workforce icons, but share the tier's name
      tier:
        levels.find((t) => t.workforceProductGuid === productGuid) ??
        levels.find((t) => t.name === category.name),
    }
  })
}

/** Menu tabs that aren't a population tier's: Harbour, Military, Materials */
async function types({ lang }: { lang: Lang }) {
  const tabs = await menuTabs(lang)
  return tabs.filter((tab) => !tab.tier).map((tab) => tab.category)
}

/** Population tiers' menu tabs, keyed by the tab's category guid */
async function tiers({ lang }: { lang: Lang }) {
  const tabs = await menuTabs(lang)
  return tabs.flatMap(({ category, tier }) =>
    tier
      ? [
          {
            guid: category.guid,
            icon: tier.icon,
            name: category.name,
            region: tier.region,
            tier: tier.tier,
          },
        ]
      : [],
  )
}

/** Production chains with their nodes as a flat parent/tier list. */
async function queryChains(f: ChainFilter & Page, id?: number) {
  const nameT = localized('name')
  const bName = localized('b_name')
  const nName = localized('n_name')
  const dlcT = localized('dlc_name')
  const pName = localized('p_name')
  const where = and(
    id === undefined ? undefined : eq(productionChain.guid, id),
    f.regions?.length
      ? inArray(productionChain.regionId, f.regions)
      : undefined,
    f.dlcs?.length ? inArray(building.dlcGuid, f.dlcs) : undefined,
    f.types?.length ? inCategories(productionChain.guid, f.types) : undefined,
    f.tiers?.length ? inCategories(productionChain.guid, f.tiers) : undefined,
  )
  const { limit, offset } = paginate(f)
  const [[{ total }], rows] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(productionChain)
      .leftJoin(building, eq(building.guid, productionChain.buildingGuid))
      .where(where),
    db
      .select({
        building: {
          baseProductivity: factory.baseProductivity,
          cycleTime: factory.cycleTime,
          guid: building.guid,
          icon: building.icon,
          name: bName.value,
        },
        dlc: {
          guid: dlc.guid,
          icon: dlc.icon,
          key: dlc.key,
          name: dlcT.value,
        },
        guid: productionChain.guid,
        icon: productionChain.icon,
        name: nameT.value,
        /** what the final building makes; no building makes more than one product */
        product: {
          guid: product.guid,
          icon: product.icon,
          name: pName.value,
          slug: product.slug,
        },
        region: regionColumns,
        slug: productionChain.slug,
      })
      .from(productionChain)
      .leftJoin(nameT, on(nameT, productionChain.nameText, f.lang))
      .leftJoin(region, eq(region.id, productionChain.regionId))
      .leftJoin(building, eq(building.guid, productionChain.buildingGuid))
      .leftJoin(bName, on(bName, building.nameText, f.lang))
      .leftJoin(factory, eq(factory.buildingGuid, building.guid))
      .leftJoin(dlc, eq(dlc.guid, building.dlcGuid))
      .leftJoin(dlcT, on(dlcT, dlc.nameText, f.lang))
      .leftJoin(factoryOutput, eq(factoryOutput.buildingGuid, building.guid))
      .leftJoin(product, eq(product.guid, factoryOutput.productGuid))
      .leftJoin(pName, on(pName, product.nameText, f.lang))
      .where(where)
      .orderBy(asc(nameT.value), asc(productionChain.guid))
      .limit(limit)
      .offset(offset),
  ])
  const guids = rows.map((r) => r.guid)
  const [nodes, members] = await Promise.all([
    db
      .select({
        baseProductivity: factory.baseProductivity,
        chainGuid: productionChainNode.chainGuid,
        cycleTime: factory.cycleTime,
        guid: building.guid,
        icon: building.icon,
        id: productionChainNode.id,
        name: nName.value,
        needsFuel: factory.needsFuel,
        parentId: productionChainNode.parentId,
        region: regionColumns,
        slug: building.slug,
        tier: productionChainNode.tier,
      })
      .from(productionChainNode)
      .innerJoin(building, eq(building.guid, productionChainNode.buildingGuid))
      .leftJoin(nName, on(nName, building.nameText, f.lang))
      .leftJoin(region, eq(region.id, building.regionId))
      .leftJoin(factory, eq(factory.buildingGuid, building.guid))
      .where(inArray(productionChainNode.chainGuid, guids))
      .orderBy(asc(productionChainNode.tier), asc(productionChainNode.id)),
    db
      .select()
      .from(categoryMember)
      .where(inArray(categoryMember.assetGuid, guids)),
  ])
  const n = groupBy(nodes, 'chainGuid')
  const m = groupBy(members, 'assetGuid')
  return {
    pages: Math.ceil(total / limit),
    rows: rows.map((c) => ({
      ...c,
      dlc: c.dlc?.guid ? c.dlc : null,
      nodes: n(c.guid),
      product: c.product?.guid ? c.product : null,
      /** menu tabs (category guids) the chain is filed under */
      types: m(c.guid).map((x) => x.categoryGuid),
    })),
    total,
  }
}

async function get({ id, lang }: Get) {
  return (
    (
      await queryChains(
        {
          lang,
          perPage: 1,
        },
        id,
      )
    ).rows[0] ?? null
  )
}

async function list(f: ChainFilter & Page) {
  return await queryChains(f)
}

export const chains = {
  get,
  list,
  tiers,
  types,
}
