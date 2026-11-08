import { and, asc, count, eq, inArray } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  building,
  categoryMember,
  product,
  region,
  tech,
  techUnlock,
  unit,
  unitCost,
  unitMaintenance,
  unitRecruiter,
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

export type UnitFilter = {
  lang: Lang
  regions?: Array<number>
  /** category guids, see `units.types` */
  types?: Array<number>
}

/** Where units come from: the recruiting buildings (Shipyard, Barracks …) and the start flagship. */
async function types({ lang }: { lang: Lang }) {
  return await categoriesOf('unit', unit.guid, lang)
}

function productRows(
  table: typeof unitCost | typeof unitMaintenance,
  guids: Array<number>,
  lang: Lang,
) {
  const pName = localized('p_name')
  return db
    .select({
      amount: table.amount,
      guid: product.guid,
      icon: product.icon,
      name: pName.value,
      slug: product.slug,
      unitGuid: table.unitGuid,
    })
    .from(table)
    .innerJoin(product, eq(product.guid, table.productGuid))
    .leftJoin(pName, on(pName, product.nameText, lang))
    .where(inArray(table.unitGuid, guids))
}

/** Units with costs, maintenance, recruiting buildings and unlocking techs. */
async function queryUnits(f: UnitFilter & Page, id?: number) {
  const nameT = localized('name')
  const descT = localized('desc')
  const where = and(
    id === undefined ? undefined : eq(unit.guid, id),
    f.types?.length ? inCategories(unit.guid, f.types) : undefined,
    f.regions?.length ? inArray(unit.regionId, f.regions) : undefined,
  )
  const { limit, offset } = paginate(f)
  const [[{ total }], rows] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(unit)
      .where(where),
    db
      .select({
        buildSeconds: unit.buildSeconds,
        cargoSlots: unit.cargoSlots,
        description: descT.value,
        guid: unit.guid,
        health: unit.health,
        icon: unit.icon,
        itemSockets: unit.itemSockets,
        moduleSlots: unit.moduleSlots,
        morale: unit.morale,
        name: nameT.value,
        region: regionColumns,
        slug: unit.slug,
        soldiers: unit.soldiers,
        speed: unit.speed,
      })
      .from(unit)
      .leftJoin(nameT, on(nameT, unit.nameText, f.lang))
      .leftJoin(descT, on(descT, unit.descriptionText, f.lang))
      .leftJoin(region, eq(region.id, unit.regionId))
      .where(where)
      .orderBy(asc(nameT.value), asc(unit.guid))
      .limit(limit)
      .offset(offset),
  ])
  const guids = rows.map((r) => r.guid)
  const bName = localized('b_name')
  const tName = localized('t_name')
  const [costs, maintenance, recruiters, techs, filed, named] =
    await Promise.all([
      productRows(unitCost, guids, f.lang),
      productRows(unitMaintenance, guids, f.lang),
      db
        .select({
          guid: building.guid,
          icon: building.icon,
          name: bName.value,
          region: regionColumns,
          slug: building.slug,
          unitGuid: unitRecruiter.unitGuid,
        })
        .from(unitRecruiter)
        .innerJoin(building, eq(building.guid, unitRecruiter.buildingGuid))
        .leftJoin(bName, on(bName, building.nameText, f.lang))
        .leftJoin(region, eq(region.id, building.regionId))
        .where(inArray(unitRecruiter.unitGuid, guids))
        .orderBy(asc(building.regionId), asc(building.guid)),
      db
        .select({
          guid: tech.guid,
          icon: tech.icon,
          name: tName.value,
          slug: tech.slug,
          unitGuid: techUnlock.assetGuid,
        })
        .from(techUnlock)
        .innerJoin(tech, eq(tech.guid, techUnlock.techGuid))
        .leftJoin(tName, on(tName, tech.nameText, f.lang))
        .where(inArray(techUnlock.assetGuid, guids)),
      db
        .select()
        .from(categoryMember)
        .where(inArray(categoryMember.assetGuid, guids)),
      types({
        lang: f.lang,
      }),
    ])
  const c = groupBy(costs, 'unitGuid')
  const m = groupBy(maintenance, 'unitGuid')
  const recruitedAt = groupBy(recruiters, 'unitGuid')
  const t = groupBy(techs, 'unitGuid')
  return {
    pages: Math.ceil(total / limit),
    rows: rows.map((row) => ({
      ...row,
      costs: c(row.guid),
      maintenance: m(row.guid),
      recruitedAt: recruitedAt(row.guid),
      /** the recruiting building (or Flagship) the unit is filed under */
      type:
        named.find((category) =>
          filed.some(
            (x) => x.assetGuid === row.guid && x.categoryGuid === category.guid,
          ),
        ) ?? null,
      unlockedBy: t(row.guid),
    })),
    total,
  }
}

async function get({ id, lang }: Get) {
  return (
    (
      await queryUnits(
        {
          lang,
          perPage: 1,
        },
        id,
      )
    ).rows[0] ?? null
  )
}

async function list(f: UnitFilter & Page) {
  return await queryUnits(f)
}

export const units = {
  get,
  list,
  types,
}
