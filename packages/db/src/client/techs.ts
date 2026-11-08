import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  attribute,
  buffFunctionalEffect,
  buffModifier,
  building,
  dlc,
  effect,
  effectBuff,
  effectTargetBuilding,
  effectTargetPool,
  product,
  region,
  tech,
  techCategory,
  techEffect,
  techResource,
  techUnlockReward,
} from '../schema'
import { nameModifiers } from './modifiers'
import {
  type Get,
  groupBy,
  localized,
  modifierColumns,
  on,
  regionColumns,
} from './shared'

export type TechFilter = {
  lang: Lang
}

/** Techs with what they unlock, their effects and the resources they grant. */
async function queryTechs(f: TechFilter, id?: number) {
  const nameT = localized('name')
  const descT = localized('desc')
  const pName = localized('p_name')
  const dlcT = localized('dlc_name')
  const where = id === undefined ? undefined : eq(tech.guid, id)
  const rows = await db
    .select({
      categoryGuid: tech.categoryGuid,
      description: descT.value,
      dlc: {
        guid: dlc.guid,
        icon: dlc.icon,
        key: dlc.key,
        name: dlcT.value,
      },
      gridX: tech.gridX,
      gridY: tech.gridY,
      guid: tech.guid,
      icon: tech.icon,
      isGate: tech.isGate,
      knowledgeNeeded: tech.knowledgeNeeded,
      name: nameT.value,
      region: regionColumns,
      showConnectionToCategory: tech.showConnectionToCategory,
      slug: tech.slug,
    })
    .from(tech)
    .leftJoin(nameT, on(nameT, tech.nameText, f.lang))
    .leftJoin(descT, on(descT, tech.descriptionText, f.lang))
    .leftJoin(region, eq(region.id, tech.regionId))
    .leftJoin(dlc, eq(dlc.guid, tech.dlcGuid))
    .leftJoin(dlcT, on(dlcT, dlc.nameText, f.lang))
    .where(where)
    .orderBy(asc(tech.knowledgeNeeded), asc(tech.guid))
  const guids = rows.map((r) => r.guid)
  const rName = localized('r_name')
  const eName = localized('e_name')
  const eDesc = localized('e_desc')
  const uDesc = localized('u_desc')
  const tName = localized('t_name')
  const tbName = localized('tb_name')
  const mpName = localized('mp_name')
  // a buff can give its building a functional effect whose own buffs apply to buildings near it (e.g. Custodes +1 Happiness)
  const nearbyBuff = alias(effectBuff, 'nearby_buff')
  const [
    resources,
    unlocks,
    effects,
    effectTargets,
    effectModifiers,
    nearbyModifiers,
  ] = await Promise.all([
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
    db
      .select({
        /** the building the game describes this entry with; null for upgrades, units, goods … */
        buildingGuid: techUnlockReward.buildingGuid,
        description: uDesc.value,
        guid: techUnlockReward.assetGuid,
        icon: techUnlockReward.icon,
        idx: techUnlockReward.idx,
        name: rName.value,
        /** English slug of `buildingGuid`, for linking to it */
        slug: building.slug,
        techGuid: techUnlockReward.techGuid,
      })
      .from(techUnlockReward)
      .leftJoin(building, eq(building.guid, techUnlockReward.buildingGuid))
      .leftJoin(rName, on(rName, techUnlockReward.nameText, f.lang))
      .leftJoin(uDesc, on(uDesc, techUnlockReward.descriptionText, f.lang))
      .where(inArray(techUnlockReward.techGuid, guids))
      .orderBy(asc(techUnlockReward.idx)),
    db
      .select({
        description: eDesc.value,
        guid: effect.guid,
        name: eName.value,
        techGuid: techEffect.techGuid,
      })
      .from(techEffect)
      .innerJoin(effect, eq(effect.guid, techEffect.effectGuid))
      .leftJoin(eName, on(eName, effect.nameText, f.lang))
      .leftJoin(eDesc, on(eDesc, effect.descriptionText, f.lang))
      .where(inArray(techEffect.techGuid, guids)),
    db
      .selectDistinct({
        /** set per regional variant when the target is one building, for linking to it */
        buildingGuid: effectTargetBuilding.buildingGuid,
        effectGuid: effectTargetPool.effectGuid,
        guid: effectTargetPool.poolGuid,
        icon: sql<
          string | null
        >`coalesce(${building.icon}, ${effectTargetPool.icon})`,
        kind: effectTargetPool.kind,
        name: sql<string | null>`coalesce(${tbName.value}, ${tName.value})`,
        region: regionColumns,
        /** English slug of `buildingGuid`, for linking to it */
        slug: building.slug,
      })
      .from(techEffect)
      .innerJoin(
        effectTargetPool,
        eq(effectTargetPool.effectGuid, techEffect.effectGuid),
      )
      .leftJoin(tName, on(tName, effectTargetPool.nameText, f.lang))
      .leftJoin(
        effectTargetBuilding,
        and(
          eq(effectTargetBuilding.effectGuid, effectTargetPool.effectGuid),
          eq(effectTargetBuilding.poolGuid, effectTargetPool.poolGuid),
        ),
      )
      .leftJoin(building, eq(building.guid, effectTargetBuilding.buildingGuid))
      .leftJoin(tbName, on(tbName, building.nameText, f.lang))
      .leftJoin(region, eq(region.id, building.regionId))
      .where(inArray(techEffect.techGuid, guids)),
    db
      .selectDistinct({
        effectGuid: effectBuff.effectGuid,
        ...modifierColumns,
        productIcon: product.icon,
        productName: mpName.value,
      })
      .from(techEffect)
      .innerJoin(effectBuff, eq(effectBuff.effectGuid, techEffect.effectGuid))
      .innerJoin(buffModifier, eq(buffModifier.buffGuid, effectBuff.buffGuid))
      .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
      .leftJoin(product, eq(product.guid, buffModifier.productGuid))
      .leftJoin(mpName, on(mpName, product.nameText, f.lang))
      .where(inArray(techEffect.techGuid, guids)),
    db
      .selectDistinct({
        effectGuid: effectBuff.effectGuid,
        ...modifierColumns,
        productIcon: product.icon,
        productName: mpName.value,
      })
      .from(techEffect)
      .innerJoin(effectBuff, eq(effectBuff.effectGuid, techEffect.effectGuid))
      .innerJoin(
        buffFunctionalEffect,
        eq(buffFunctionalEffect.buffGuid, effectBuff.buffGuid),
      )
      .innerJoin(
        nearbyBuff,
        eq(nearbyBuff.effectGuid, buffFunctionalEffect.effectGuid),
      )
      .innerJoin(buffModifier, eq(buffModifier.buffGuid, nearbyBuff.buffGuid))
      .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
      .leftJoin(product, eq(product.guid, buffModifier.productGuid))
      .leftJoin(mpName, on(mpName, product.nameText, f.lang))
      .where(inArray(techEffect.techGuid, guids)),
  ])
  const res = groupBy(resources, 'techGuid')
  const unl = groupBy(unlocks, 'techGuid')
  const eff = groupBy(effects, 'techGuid')
  const targets = groupBy(effectTargets, 'effectGuid')
  const modifiers = groupBy(
    await nameModifiers(
      [
        ...effectModifiers.map((m) => ({
          ...m,
          nearby: false,
        })),
        ...nearbyModifiers.map((m) => ({
          ...m,
          /** applies to buildings near the targets, not to the targets themselves */
          nearby: true,
        })),
      ],
      f.lang,
    ),
    'effectGuid',
  )
  return rows.map((t) => ({
    ...t,
    dlc: t.dlc?.guid ? t.dlc : null,
    effects: eff(t.guid).map((e) => ({
      ...e,
      modifiers: modifiers(e.guid),
      /** what the effect applies to, e.g. "Warehouses" */
      targets: targets(e.guid),
    })),
    resources: res(t.guid),
    /** what the game lists under "Unlocks", e.g. "Warehouse Upgrade" or "Stone Walls" */
    unlocks: unl(t.guid),
  }))
}

async function get({ id, lang }: Get) {
  return (
    (
      await queryTechs(
        {
          lang,
        },
        id,
      )
    )[0] ?? null
  )
}

async function list(f: TechFilter) {
  return await queryTechs(f)
}

/** Tech tree hubs; `x`/`y` place the hub, techs sit on a hex grid relative to it. */
async function categories({ lang }: { lang: Lang }) {
  const nameT = localized('name')
  const descT = localized('desc')
  const gate = alias(tech, 'gate')
  const gateNameT = localized('gate_name')
  const gateDescT = localized('gate_desc')
  return await db
    .select({
      artwork: techCategory.artwork,
      description: descT.value,
      /** the opening gate: its name titles the category and its description is the requirement */
      gate: {
        description: gateDescT.value,
        guid: gate.guid,
        name: gateNameT.value,
      },
      guid: techCategory.guid,
      icon: techCategory.icon,
      name: nameT.value,
      x: techCategory.x,
      y: techCategory.y,
    })
    .from(techCategory)
    .leftJoin(nameT, on(nameT, techCategory.nameText, lang))
    .leftJoin(descT, on(descT, techCategory.descriptionText, lang))
    .leftJoin(gate, eq(gate.guid, techCategory.gateGuid))
    .leftJoin(gateNameT, on(gateNameT, gate.nameText, lang))
    .leftJoin(gateDescT, on(gateDescT, gate.descriptionText, lang))
    .orderBy(asc(techCategory.sort))
}

export const techs = {
  categories,
  get,
  list,
}
