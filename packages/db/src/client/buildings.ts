import { and, asc, count, eq, exists, inArray } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  attribute,
  buffModifier,
  buffProvidedNeed,
  building,
  buildingCost,
  buildingEffect,
  buildingMaintenance,
  buildingPhase,
  buildingPhaseCost,
  buildingPhaseMaintenance,
  dlc,
  effectBuff,
  factory,
  factoryInput,
  factoryOutput,
  need,
  needAttribute,
  populationLevel,
  product,
  region,
  tech,
  techUnlock,
} from '../schema'
import { labels } from './labels'
import {
  categoriesOf,
  type Get,
  groupBy,
  inCategories,
  localized,
  modifierColumns,
  on,
  type Page,
  paginate,
  regionColumns,
} from './shared'
import { unlockRequirements } from './unlock-requirements'
export type BuildingFilter = {
  lang: Lang
  /** construction-menu tabs (category guids, see `buildings.types`) */
  types?: Array<number>
  regions?: Array<number>
  /** DLC guids */
  dlcs?: Array<number>
  /** workforce tier (population_level guid) */
  tiers?: Array<number>
}

function buildingWhere(f: BuildingFilter) {
  return and(
    f.types?.length ? inCategories(building.guid, f.types) : undefined,
    f.regions?.length ? inArray(building.regionId, f.regions) : undefined,
    f.dlcs?.length ? inArray(building.dlcGuid, f.dlcs) : undefined,
    f.tiers?.length
      ? exists(
          db
            .select({
              buildingGuid: buildingMaintenance.buildingGuid,
            })
            .from(buildingMaintenance)
            .innerJoin(
              populationLevel,
              eq(
                populationLevel.workforceProductGuid,
                buildingMaintenance.productGuid,
              ),
            )
            .where(
              and(
                eq(buildingMaintenance.buildingGuid, building.guid),
                inArray(populationLevel.guid, f.tiers),
              ),
            ),
        )
      : undefined,
  )
}

/** `(product, amount)` rows of `table` owned by `guids`, keyed by the owner column. */
function productRows(
  table:
    | typeof factoryInput
    | typeof factoryOutput
    | typeof buildingCost
    | typeof buildingMaintenance
    | typeof buildingPhaseCost
    | typeof buildingPhaseMaintenance,
  guids: Array<number>,
  lang: Lang,
) {
  const owner = 'phaseGuid' in table ? table.phaseGuid : table.buildingGuid
  const pName = localized('p_name')
  return db
    .select({
      amount: table.amount,
      guid: product.guid,
      icon: product.icon,
      name: pName.value,
      owner,
      slug: product.slug,
    })
    .from(table)
    .innerJoin(product, eq(product.guid, table.productGuid))
    .leftJoin(pName, on(pName, product.nameText, lang))
    .where(inArray(owner, guids))
}

function workforceRows(guids: Array<number>, lang: Lang) {
  const nameT = localized('workforce_name')
  return db
    .select({
      amount: buildingMaintenance.amount,
      buildingGuid: buildingMaintenance.buildingGuid,
      guid: populationLevel.guid,
      icon: populationLevel.icon,
      name: nameT.value,
      tier: populationLevel.tier,
    })
    .from(buildingMaintenance)
    .innerJoin(
      populationLevel,
      eq(populationLevel.workforceProductGuid, buildingMaintenance.productGuid),
    )
    .leftJoin(nameT, on(nameT, populationLevel.nameText, lang))
    .where(inArray(buildingMaintenance.buildingGuid, guids))
    .orderBy(asc(populationLevel.tier), asc(populationLevel.guid))
}

async function phaseRows(guids: Array<number>, lang: Lang) {
  const nameT = localized('ph_name')
  const rows = await db
    .select({
      buildingGuid: buildingPhase.buildingGuid,
      durationSeconds: buildingPhase.durationSeconds,
      guid: buildingPhase.guid,
      name: nameT.value,
      phase: buildingPhase.phase,
    })
    .from(buildingPhase)
    .leftJoin(nameT, on(nameT, buildingPhase.nameText, lang))
    .where(inArray(buildingPhase.buildingGuid, guids))
    .orderBy(asc(buildingPhase.phase))
  const phaseGuids = rows.map((r) => r.guid)
  const [costs, maintenance, requirements] = await Promise.all([
    productRows(buildingPhaseCost, phaseGuids, lang),
    productRows(buildingPhaseMaintenance, phaseGuids, lang),
    unlockRequirements(phaseGuids, lang),
  ])
  const c = groupBy(costs, 'owner')
  const m = groupBy(maintenance, 'owner')
  const u = groupBy(requirements, 'assetGuid')
  return rows.map((r) => ({
    ...r,
    costs: c(r.guid),
    maintenance: m(r.guid),
    unlockRequirements: u(r.guid),
  }))
}

/** Modifiers of the adjacency / service effects a building emits. */
function effectRows(guids: Array<number>) {
  return db
    .select({
      buildingGuid: buildingEffect.buildingGuid,
      ...modifierColumns,
    })
    .from(buildingEffect)
    .innerJoin(effectBuff, eq(effectBuff.effectGuid, buildingEffect.effectGuid))
    .innerJoin(buffModifier, eq(buffModifier.buffGuid, effectBuff.buffGuid))
    .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
    .where(inArray(buildingEffect.buildingGuid, guids))
}

/** Need fulfilment: residence attributes granted by a building's service. */
function buffRows(guids: Array<number>) {
  return db
    .select({
      attribute: attribute.key,
      buildingGuid: buildingEffect.buildingGuid,
      value: needAttribute.value,
    })
    .from(buildingEffect)
    .innerJoin(effectBuff, eq(effectBuff.effectGuid, buildingEffect.effectGuid))
    .innerJoin(
      buffProvidedNeed,
      eq(buffProvidedNeed.buffGuid, effectBuff.buffGuid),
    )
    .innerJoin(
      needAttribute,
      eq(needAttribute.needGuid, buffProvidedNeed.needGuid),
    )
    .leftJoin(attribute, eq(attribute.id, needAttribute.attributeId))
    .where(inArray(buildingEffect.buildingGuid, guids))
}

function productionBuffRows(guids: Array<number>) {
  return db
    .selectDistinct({
      attribute: attribute.key,
      buildingGuid: factoryOutput.buildingGuid,
      value: needAttribute.value,
    })
    .from(factoryOutput)
    .innerJoin(need, eq(need.productGuid, factoryOutput.productGuid))
    .innerJoin(needAttribute, eq(needAttribute.needGuid, need.guid))
    .leftJoin(attribute, eq(attribute.id, needAttribute.attributeId))
    .where(inArray(factoryOutput.buildingGuid, guids))
}

async function buildingDetails(guids: Array<number>, lang: Lang) {
  const tName = localized('t_name')
  const [
    costs,
    maintenance,
    inputs,
    outputs,
    phases,
    effects,
    buffs,
    productionBuffs,
    workforce,
    requirements,
    techs,
  ] = await Promise.all([
    productRows(buildingCost, guids, lang),
    productRows(buildingMaintenance, guids, lang),
    productRows(factoryInput, guids, lang),
    productRows(factoryOutput, guids, lang),
    phaseRows(guids, lang),
    effectRows(guids),
    buffRows(guids),
    productionBuffRows(guids),
    workforceRows(guids, lang),
    unlockRequirements(guids, lang),
    db
      .select({
        buildingGuid: techUnlock.assetGuid,
        guid: tech.guid,
        icon: tech.icon,
        knowledgeNeeded: tech.knowledgeNeeded,
        name: tName.value,
        slug: tech.slug,
      })
      .from(techUnlock)
      .innerJoin(tech, eq(tech.guid, techUnlock.techGuid))
      .leftJoin(tName, on(tName, tech.nameText, lang))
      .where(inArray(techUnlock.assetGuid, guids)),
  ])
  const serviceBuffs = groupBy(buffs, 'buildingGuid')
  // Service bonuses are also encoded as adjacency modifiers in the game data.
  const areaEffects = effects.filter(
    (effect) =>
      effect.isPercent ||
      !serviceBuffs(effect.buildingGuid).some(
        (bonus) =>
          bonus.attribute === effect.attribute && bonus.value === effect.value,
      ),
  )
  return {
    buffs: groupBy([...buffs, ...productionBuffs], 'buildingGuid'),
    costs: groupBy(costs, 'owner'),
    effects: groupBy(areaEffects, 'buildingGuid'),
    inputs: groupBy(inputs, 'owner'),
    maintenance: groupBy(maintenance, 'owner'),
    outputs: groupBy(outputs, 'owner'),
    phases: groupBy(phases, 'buildingGuid'),
    requirements: groupBy(requirements, 'assetGuid'),
    techs: groupBy(techs, 'buildingGuid'),
    workforce: groupBy(workforce, 'buildingGuid'),
  }
}

/** Buildings with costs, maintenance, factory inputs/outputs, area effects, need fulfilment and unlocking techs. */
async function queryBuildings(f: BuildingFilter & Page, id?: number) {
  const nameT = localized('name')
  const descT = localized('desc')
  const catT = localized('cat')
  const dlcT = localized('dlcName')
  const where = and(
    buildingWhere(f),
    id === undefined ? undefined : eq(building.guid, id),
  )
  const { limit, offset } = paginate(f)

  const [[{ total }], rows] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(building)
      .where(where),
    db
      .select({
        baseProductivity: factory.baseProductivity,
        category: catT.value,
        cycleTime: factory.cycleTime,
        description: descT.value,
        dlc: {
          guid: dlc.guid,
          icon: dlc.icon,
          key: dlc.key,
          name: dlcT.value,
        },
        guid: building.guid,
        icon: building.icon,
        name: nameT.value,
        needsFuel: factory.needsFuel,
        radius: building.radius,
        region: regionColumns,
        slug: building.slug,
        streetRadius: building.streetRadius,
        template: building.template,
        transporterRange: factory.transporterRange,
      })
      .from(building)
      .leftJoin(nameT, on(nameT, building.nameText, f.lang))
      .leftJoin(descT, on(descT, building.descriptionText, f.lang))
      .leftJoin(catT, on(catT, building.categoryText, f.lang))
      .leftJoin(region, eq(region.id, building.regionId))
      .leftJoin(dlc, eq(dlc.guid, building.dlcGuid))
      .leftJoin(dlcT, on(dlcT, dlc.nameText, f.lang))
      .leftJoin(factory, eq(factory.buildingGuid, building.guid))
      .where(where)
      .orderBy(asc(nameT.value), asc(building.guid))
      .limit(limit)
      .offset(offset),
  ])
  const [d, l] = await Promise.all([
    buildingDetails(
      rows.map((r) => r.guid),
      f.lang,
    ),
    labels(f.lang),
  ])
  return {
    pages: Math.ceil(total / limit),
    rows: rows.map((r) => ({
      ...r,
      /** Attributes residences gain from the service or produced goods. */
      buffs: d.buffs(r.guid).map((bonus) => ({
        ...bonus,
        name: l('attribute', bonus.attribute)?.name ?? null,
      })),
      costs: d.costs(r.guid),
      dlc: r.dlc?.guid ? r.dlc : null,
      /** area effects: attribute modifiers applied to nearby buildings */
      effects: d.effects(r.guid).map((effect) => ({
        ...effect,
        name: l('attribute', effect.attribute)?.name ?? null,
      })),
      inputs: d.inputs(r.guid),
      maintenance: d.maintenance(r.guid),
      outputs: d.outputs(r.guid),
      /** construction phases of a monument, in order; empty for ordinary buildings */
      phases: d.phases(r.guid),
      unlockedBy: d.techs(r.guid),
      unlockRequirements:
        d.phases(r.guid)[0]?.unlockRequirements ?? d.requirements(r.guid),
      workforce: d
        .workforce(r.guid)
        .map(({ buildingGuid, ...workforce }) => workforce),
    })),
    total,
  }
}

async function get({ id, lang }: Get) {
  return (
    (
      await queryBuildings(
        {
          lang,
          perPage: 1,
        },
        id,
      )
    ).rows[0] ?? null
  )
}

async function list(f: BuildingFilter & Page) {
  return await queryBuildings(f)
}

/** The construction-menu tabs buildings are filed under (Liberti, Materials, Military Buildings …), in game order. */
async function types({ lang }: { lang: Lang }) {
  return await categoriesOf('menu', building.guid, lang)
}

export const buildings = {
  get,
  list,
  types,
}
