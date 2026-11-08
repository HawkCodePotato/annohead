import {
  and,
  asc,
  count,
  eq,
  exists,
  inArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { db } from '../db'
import {
  type Allocation,
  type Attribute,
  type Lang,
  type Niche,
  type RacerAttribute,
  type Rarity,
} from '../enums'
import {
  attribute,
  buffFunctionalEffect,
  buffModifier,
  building,
  condition,
  dlc,
  effectBuff,
  effectTargetPool,
  festival,
  item,
  itemBoostBuff,
  itemBoostCondition,
  itemRacerAttribute,
  itemSource,
  participant,
  poolMember,
  quest,
  questline,
  questlineStoryline,
  storyline,
  tech,
} from '../schema'
import { describeConditions } from './conditions'
import { type ItemType, niches, rarities, types } from './item-labels'
import { keyed, labels } from './labels'
import { nameModifiers } from './modifiers'
import {
  type Get,
  groupBy,
  langId,
  localized,
  modifierColumns,
  on,
  type Page,
  paginate,
} from './shared'
import { sourceLabel } from './source-labels'
export type ItemFilter = {
  lang: Lang
  rarities?: Array<Rarity>
  niches?: Array<Niche>
  /** allocations, or `Charioteer` for items that can race; see `items.types` */
  types?: Array<ItemType>
  /** DLC guids */
  dlcs?: Array<number>
  /** attribute keys (Money, Knowledge …) the item's effect modifies */
  attributes?: Array<Attribute>
}

function itemWhere(f: ItemFilter): SQL | undefined {
  return and(
    f.rarities?.length ? inArray(item.rarity, f.rarities) : undefined,
    f.niches?.length ? inArray(item.niche, f.niches) : undefined,
    f.types?.length
      ? or(
          inArray(
            item.allocation,
            f.types.filter((t): t is Allocation => t !== 'Charioteer'),
          ),
          f.types.includes('Charioteer')
            ? exists(
                db
                  .select({
                    one: sql`1`,
                  })
                  .from(itemRacerAttribute)
                  .where(eq(itemRacerAttribute.itemGuid, item.guid)),
              )
            : undefined,
        )
      : undefined,
    f.dlcs?.length ? inArray(item.dlcGuid, f.dlcs) : undefined,
    f.attributes?.length
      ? exists(
          db
            .select({
              one: sql`1`,
            })
            .from(effectBuff)
            .innerJoin(
              buffModifier,
              eq(buffModifier.buffGuid, effectBuff.buffGuid),
            )
            .innerJoin(attribute, eq(attribute.id, buffModifier.attributeId))
            .where(
              and(
                eq(effectBuff.effectGuid, item.effectGuid),
                inArray(attribute.key, f.attributes),
              ),
            ),
        )
      : undefined,
  )
}

async function itemDetails(guids: Array<number>, lang: Lang) {
  const bName = localized('b_name')
  const sName = localized('s_name')
  // a buff can pass an area effect on to buildings near the targets (e.g. +1.5 Knowledge near Cookhouses)
  const nearbyBuff = alias(effectBuff, 'nearby_buff')
  const [
    targets,
    modifiers,
    nearbyModifiers,
    boosts,
    nearbyBoosts,
    sources,
    conditions,
    racer,
  ] = await Promise.all([
    db
      .selectDistinct({
        guid: building.guid,
        icon: building.icon,
        itemGuid: item.guid,
        name: bName.value,
        slug: building.slug,
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
      .select({
        itemGuid: item.guid,
        ...modifierColumns,
      })
      .from(item)
      .innerJoin(effectBuff, eq(effectBuff.effectGuid, item.effectGuid))
      .innerJoin(buffModifier, eq(buffModifier.buffGuid, effectBuff.buffGuid))
      .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
      .where(inArray(item.guid, guids)),
    db
      .select({
        itemGuid: item.guid,
        ...modifierColumns,
      })
      .from(item)
      .innerJoin(effectBuff, eq(effectBuff.effectGuid, item.effectGuid))
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
      .where(inArray(item.guid, guids)),
    db
      .select({
        itemGuid: itemBoostBuff.itemGuid,
        ...modifierColumns,
      })
      .from(itemBoostBuff)
      .innerJoin(
        buffModifier,
        eq(buffModifier.buffGuid, itemBoostBuff.buffGuid),
      )
      .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
      .where(inArray(itemBoostBuff.itemGuid, guids)),
    db
      .select({
        itemGuid: itemBoostBuff.itemGuid,
        ...modifierColumns,
      })
      .from(itemBoostBuff)
      .innerJoin(
        buffFunctionalEffect,
        eq(buffFunctionalEffect.buffGuid, itemBoostBuff.buffGuid),
      )
      .innerJoin(
        nearbyBuff,
        eq(nearbyBuff.effectGuid, buffFunctionalEffect.effectGuid),
      )
      .innerJoin(buffModifier, eq(buffModifier.buffGuid, nearbyBuff.buffGuid))
      .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
      .where(inArray(itemBoostBuff.itemGuid, guids)),
    db
      .select({
        guid: itemSource.sourceGuid,
        icon: sql<
          string | null
        >`coalesce(${participant.icon}, ${festival.icon}, ${tech.icon}, ${quest.icon})`,
        itemGuid: itemSource.itemGuid,
        kind: itemSource.kind,
        name: sName.value,
        /** the questline a quest or storyline reward belongs to; null for radiant quests (requests, contracts) */
        questline: sql<
          number | null
        >`(select ${questlineStoryline.questlineGuid} from ${questlineStoryline} where ${questlineStoryline.storylineGuid} = coalesce(${quest.storylineGuid}, case when ${itemSource.kind} = 'storyline' then ${itemSource.sourceGuid} end))`,
        /** English slug of the questline, else of the tech, for linking to it */
        slug: sql<
          string | null
        >`coalesce((select ${questline.slug} from ${questlineStoryline} join ${questline} on ${questline.guid} = ${questlineStoryline.questlineGuid} where ${questlineStoryline.storylineGuid} = coalesce(${quest.storylineGuid}, case when ${itemSource.kind} = 'storyline' then ${itemSource.sourceGuid} end)), ${tech.slug})`,
      })
      .from(itemSource)
      .leftJoin(participant, eq(participant.guid, itemSource.sourceGuid))
      .leftJoin(festival, eq(festival.guid, itemSource.sourceGuid))
      .leftJoin(tech, eq(tech.guid, itemSource.sourceGuid))
      .leftJoin(quest, eq(quest.guid, itemSource.sourceGuid))
      .leftJoin(storyline, eq(storyline.guid, itemSource.sourceGuid))
      .leftJoin(
        sName,
        and(
          eq(
            sName.lineId,
            sql`coalesce(${participant.nameText}, ${festival.nameText}, ${tech.nameText}, ${quest.nameText}, ${storyline.titleText})`,
          ),
          eq(sName.langId, langId(lang)),
        ),
      )
      .where(inArray(itemSource.itemGuid, guids)),
    boostConditions(guids, lang),
    db
      .select()
      .from(itemRacerAttribute)
      .where(inArray(itemRacerAttribute.itemGuid, guids)),
  ])
  const [named, namedBoosts] = await Promise.all([
    nameModifiers(
      [
        ...modifiers.map((m) => ({
          ...m,
          nearby: false,
        })),
        ...nearbyModifiers.map((m) => ({
          ...m,
          nearby: true,
        })),
      ],
      lang,
    ),
    nameModifiers(
      [
        ...boosts.map((m) => ({
          ...m,
          nearby: false,
        })),
        ...nearbyBoosts.map((m) => ({
          ...m,
          nearby: true,
        })),
      ],
      lang,
    ),
  ])
  return {
    boosts: groupBy(namedBoosts, 'itemGuid'),
    conditions: groupBy(conditions, 'itemGuid'),
    modifiers: groupBy(named, 'itemGuid'),
    racer: groupBy(
      racer.toSorted(
        (a, b) =>
          racerOrder.indexOf(a.attribute) - racerOrder.indexOf(b.attribute),
      ),
      'itemGuid',
    ),
    sources: groupBy(sources, 'itemGuid'),
    targets: groupBy(targets, 'itemGuid'),
  }
}

/** the Hippodrome's order, not alphabetical */
const racerOrder: ReadonlyArray<RacerAttribute> = [
  'Speed',
  'Stamina',
  'Boost',
  'Consistency',
]

/** The precondition for an item's boost (`ItemWithBoost.BoostCondition`); one flat node per item. */
async function boostConditions(guids: Array<number>, lang: Lang) {
  const rows = await db
    .select({
      id: condition.id,
      itemGuid: itemBoostCondition.itemGuid,
      type: condition.template,
    })
    .from(itemBoostCondition)
    .innerJoin(condition, eq(condition.id, itemBoostCondition.conditionId))
    .where(inArray(itemBoostCondition.itemGuid, guids))
  return (await describeConditions(rows, lang)).map(
    ({ negative, unnamed, variable, ...requirement }) => requirement,
  )
}

/** Specialists, captains and quest items with effect targets, modifiers, boosts and sources. */
async function queryItems(f: ItemFilter & Page, id?: number) {
  const nameT = localized('name')
  const descT = localized('desc')
  const hintT = localized('hint')
  const dlcT = localized('dlc_name')
  const where = and(
    itemWhere(f),
    id === undefined ? undefined : eq(item.guid, id),
  )
  const { limit, offset } = paginate(f)

  const [[{ total }], rows] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(item)
      .where(where),
    db
      .select({
        allocation: item.allocation,
        description: descT.value,
        dlc: {
          guid: dlc.guid,
          icon: dlc.icon,
          key: dlc.key,
          name: dlcT.value,
        },
        guid: item.guid,
        hint: hintT.value,
        icon: item.icon,
        name: nameT.value,
        niche: item.niche,
        rarity: item.rarity,
        slug: item.slug,
        tradePrice: item.tradePrice,
      })
      .from(item)
      .leftJoin(nameT, on(nameT, item.nameText, f.lang))
      .leftJoin(descT, on(descT, item.descriptionText, f.lang))
      .leftJoin(hintT, on(hintT, item.boostHintText, f.lang))
      .leftJoin(dlc, eq(dlc.guid, item.dlcGuid))
      .leftJoin(dlcT, on(dlcT, dlc.nameText, f.lang))
      .where(where)
      .orderBy(asc(nameT.value), asc(item.guid))
      .limit(limit)
      .offset(offset),
  ])
  const [d, l] = await Promise.all([
    itemDetails(
      rows.map((r) => r.guid),
      f.lang,
    ),
    labels(f.lang),
  ])
  return {
    pages: Math.ceil(total / limit),
    rows: rows.map(({ allocation, hint, ...r }) => ({
      ...r,
      /** stronger modifiers that replace `modifiers` while every one of `conditions` holds; null without a boost */
      boost: d.boosts(r.guid).length
        ? {
            conditions: d.conditions(r.guid).map(({ itemGuid, ...c }) => c),
            hint,
            modifiers: d.boosts(r.guid),
          }
        : null,
      dlc: r.dlc?.guid ? r.dlc : null,
      modifiers: d.modifiers(r.guid),
      niche: keyed(l, 'niche', r.niche),
      /** Hippodrome stat ranges when the item can race; the game rolls the actual values per save */
      racer: d.racer(r.guid).map(({ attribute: key, itemGuid, ...range }) => ({
        ...range,
        attribute: {
          icon: l('racer_attribute', key)?.icon ?? null,
          key,
          name: l('racer_attribute', key)?.name ?? key,
        },
      })),
      rarity: keyed(l, 'rarity', r.rarity),
      /** where the item can be obtained: traders, contracts, ship drops, visitors, festivals, techs, quests */
      sources: d.sources(r.guid).map(({ itemGuid, name, ...source }) => ({
        ...source,
        /** ready-to-render origin, e.g. "Sold by Julia" or "Defeat Dorian" */
        name: sourceLabel(source.kind, name, f.lang),
      })),
      targets: d.targets(r.guid),
      /** Specialist (villa), Captain (ship) or Item */
      type: keyed(l, 'allocation', allocation),
    })),
    total,
  }
}

async function get({ id, lang }: Get) {
  return (
    (
      await queryItems(
        {
          lang,
          perPage: 1,
        },
        id,
      )
    ).rows[0] ?? null
  )
}

async function list(f: ItemFilter & Page) {
  return await queryItems(f)
}

export const items = {
  get,
  list,
  niches,
  rarities,
  types,
}
