import { and, asc, count, eq, inArray, isNull, or } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  categoryMember,
  dlc,
  ornament,
  ornamentCost,
  product,
  region,
} from '../schema'
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

export type OrnamentFilter = {
  lang: Lang
  /** DLC guids */
  dlcs?: Array<number>
  /** region ids; ornaments every region builds match any of them */
  regions?: Array<number>
  /** category guids, see `ornaments.types` */
  types?: Array<number>
}

/** The ornament menu's tabs (Ground Patterns, Sculpture and Statuary …, Hall Of Fame, Rewards), in menu order. */
async function types({ lang }: { lang: Lang }) {
  return await categoriesOf('ornament', ornament.guid, lang)
}

/** Ornaments with costs and the menu tabs listing them. */
async function queryOrnaments(f: OrnamentFilter & Page, id?: number) {
  const nameT = localized('name')
  const descT = localized('desc')
  const dlcT = localized('dlc_name')
  const where = and(
    id === undefined ? undefined : eq(ornament.guid, id),
    f.types?.length ? inCategories(ornament.guid, f.types) : undefined,
    f.dlcs?.length ? inArray(ornament.dlcGuid, f.dlcs) : undefined,
    f.regions?.length
      ? or(isNull(ornament.regionId), inArray(ornament.regionId, f.regions))
      : undefined,
  )
  const { limit, offset } = paginate(f)
  const [[{ total }], rows] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(ornament)
      .where(where),
    db
      .select({
        description: descT.value,
        dlc: {
          guid: dlc.guid,
          icon: dlc.icon,
          key: dlc.key,
          name: dlcT.value,
        },
        guid: ornament.guid,
        icon: ornament.icon,
        name: nameT.value,
        region: regionColumns,
        slug: ornament.slug,
        value: ornament.value,
      })
      .from(ornament)
      .leftJoin(nameT, on(nameT, ornament.nameText, f.lang))
      .leftJoin(descT, on(descT, ornament.descriptionText, f.lang))
      .leftJoin(region, eq(region.id, ornament.regionId))
      .leftJoin(dlc, eq(dlc.guid, ornament.dlcGuid))
      .leftJoin(dlcT, on(dlcT, dlc.nameText, f.lang))
      .where(where)
      .orderBy(asc(nameT.value), asc(ornament.guid))
      .limit(limit)
      .offset(offset),
  ])
  const guids = rows.map((r) => r.guid)
  const pName = localized('p_name')
  const [costs, filed, named] = await Promise.all([
    db
      .select({
        amount: ornamentCost.amount,
        guid: product.guid,
        icon: product.icon,
        name: pName.value,
        ornamentGuid: ornamentCost.ornamentGuid,
        slug: product.slug,
      })
      .from(ornamentCost)
      .innerJoin(product, eq(product.guid, ornamentCost.productGuid))
      .leftJoin(pName, on(pName, product.nameText, f.lang))
      .where(inArray(ornamentCost.ornamentGuid, guids)),
    db
      .select()
      .from(categoryMember)
      .where(inArray(categoryMember.assetGuid, guids)),
    types({
      lang: f.lang,
    }),
  ])
  const c = groupBy(costs, 'ornamentGuid')
  return {
    pages: Math.ceil(total / limit),
    rows: rows.map((row) => ({
      ...row,
      costs: c(row.guid),
      dlc: row.dlc?.guid ? row.dlc : null,
      /** menu tabs listing it, in menu order: its own tab first, then Hall Of Fame or Rewards */
      types: named.filter((category) =>
        filed.some(
          (x) => x.assetGuid === row.guid && x.categoryGuid === category.guid,
        ),
      ),
    })),
    total,
  }
}

async function get({ id, lang }: Get) {
  return (
    (
      await queryOrnaments(
        {
          lang,
          perPage: 1,
        },
        id,
      )
    ).rows[0] ?? null
  )
}

async function list(f: OrnamentFilter & Page) {
  return await queryOrnaments(f)
}

export const ornaments = {
  get,
  list,
  types,
}
