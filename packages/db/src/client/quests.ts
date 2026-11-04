import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  assetName,
  attribute,
  buffModifier,
  condition,
  conditionParam,
  dlc,
  effect,
  effectBuff,
  effectTargetPool,
  questChoice,
  questChoiceOutcome,
  questline,
  questlineStoryline,
  questOption,
  questReward,
  questVariableChange,
  region,
  storyline,
  storylineCondition,
} from '../schema'
import { anyOfLabel, variableName } from './condition-labels'
import { assetNames, describeConditions, variableCheck } from './conditions'
import { type Labels, labels } from './labels'
import { nameModifiers } from './modifiers'
import { phrases } from './phrases'
import { questQuestion, questStory, questText } from './quest-text'
import {
  type Get,
  groupBy,
  localized,
  modifierColumns,
  on,
  type Page,
  paginate,
  regionColumns,
} from './shared'

// ---------------------------------------------------------------- questlines

export type QuestFilter = {
  lang: Lang
  regions?: Array<number>
  /** DLC guids */
  dlcs?: Array<number>
}

const partSuffixes = new Map<Lang, RegExp>()

/** A questline is named after its first part: "The Mysterious Murmillo Part I" → "The Mysterious Murmillo" */
export function questlineName(title: string | null, lang: Lang) {
  let suffix = partSuffixes.get(lang)
  if (!suffix) {
    // "Part I", "– Teil I", ", partie I", "第1部" …: each language's pattern lives with its phrases
    suffix = new RegExp(phrases[lang].partSuffix, 'iu')
    partSuffixes.set(lang, suffix)
  }
  return title?.replace(suffix, '') ?? null
}

const partCount = db.$count(
  questlineStoryline,
  eq(questlineStoryline.questlineGuid, questline.guid),
)
const choiceCount = db.$count(
  questChoice,
  and(
    eq(questChoice.kind, 'decision'),
    inArray(
      questChoice.storylineGuid,
      db
        .select({
          guid: questlineStoryline.storylineGuid,
        })
        .from(questlineStoryline)
        .where(eq(questlineStoryline.questlineGuid, questline.guid)),
    ),
  ),
)

/** Questlines: narrative storylines linked by the choices they remember, longest first. */
async function queryQuestlines(f: QuestFilter & Page, id?: number) {
  const titleT = localized('title')
  const dlcT = localized('dlc_name')
  const where = and(
    id === undefined ? undefined : eq(questline.guid, id),
    f.regions?.length ? inArray(questline.regionId, f.regions) : undefined,
    f.dlcs?.length ? inArray(questline.dlcGuid, f.dlcs) : undefined,
  )
  const { limit, offset } = paginate(f)
  const [[{ total }], rows] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(questline)
      .where(where),
    db
      .select({
        /** decisions with several options across all parts */
        choices: choiceCount,
        dlc: {
          guid: dlc.guid,
          icon: dlc.icon,
          key: dlc.key,
          name: dlcT.value,
        },
        guid: questline.guid,
        icon: questline.icon,
        name: titleT.value,
        parts: partCount,
        region: regionColumns,
        slug: questline.slug,
      })
      .from(questline)
      .leftJoin(titleT, on(titleT, questline.titleText, f.lang))
      .leftJoin(region, eq(region.id, questline.regionId))
      .leftJoin(dlc, eq(dlc.guid, questline.dlcGuid))
      .leftJoin(dlcT, on(dlcT, dlc.nameText, f.lang))
      .where(where)
      .orderBy(
        desc(partCount),
        desc(choiceCount),
        asc(titleT.value),
        asc(questline.guid),
      )
      .limit(limit)
      .offset(offset),
  ])
  return {
    pages: Math.ceil(total / limit),
    rows: rows.map((row) => ({
      ...row,
      dlc: row.dlc?.guid ? row.dlc : null,
      name: questlineName(row.name, f.lang),
      region: row.region?.id ? row.region : null,
    })),
    total,
  }
}

// "part done" flags only sequence a questline's parts, which their order already shows
const PART_DONE = /done$/iu

/** A condition tree a questline walk can evaluate: the node's own test, and its sub-tests (all, or any one of them). */
export type QuestTest = {
  any: boolean
  negate: boolean
  /** true / false when known ahead, a quest variable comparison, or null when only the running game can tell (storage, session …) */
  own: boolean | ReturnType<typeof variableCheck> | null
  tests: Array<QuestTest>
}

/** Requirements of options, branch checks and storylines, flattened per condition tree root, and their `QuestTest`. */
async function requirementRows(ownerGuids: Array<number>, lang: Lang) {
  const rows = ownerGuids.length
    ? await db
        .select({
          id: condition.id,
          negate: condition.negate,
          parentId: condition.parentId,
          subOrder: condition.subOrder,
          type: condition.template,
        })
        .from(condition)
        .where(
          and(
            inArray(condition.ownerKind, [
              'quest_option',
              'quest_node',
              'storyline',
            ]),
            inArray(condition.ownerId, ownerGuids),
          ),
        )
    : []
  const described = groupBy(
    await describeConditions(
      rows
        .filter((row) => row.type !== 'ConditionAlwaysTrue')
        .map(({ parentId, subOrder, ...row }) => ({
          ...row,
          conditionId: row.id,
        })),
      lang,
    ),
    'conditionId',
  )
  const variableIds = rows
    .filter((row) => row.type === 'ConditionCompareVariable')
    .map((row) => row.id)
  const params = groupBy(
    variableIds.length
      ? await db
          .select()
          .from(conditionParam)
          .where(inArray(conditionParam.conditionId, variableIds))
      : [],
    'conditionId',
  )
  const children = groupBy(rows, 'parentId')
  const byId = new Map(rows.map((row) => [row.id, row]))
  const orderOf = new Map(rows.map((row) => [row.id, row.subOrder]))
  type Requirement = Omit<
    ReturnType<typeof described>[number],
    'conditionId' | 'type' | 'unnamed' | 'variable'
  >
  function own(id: number): Array<Requirement> {
    return (
      described(id)
        // quest variables are resolved by the walk (`test`); conditions on assets the game never names are internal switches
        .filter((row) => !(row.variable || row.unnamed))
        .map(
          ({ conditionId, type, unnamed, variable, ...requirement }) =>
            requirement,
        )
    )
  }
  /** a node's own requirement, then its sub-conditions: all of them, or one line listing the alternatives */
  function collect(id: number): Array<Requirement> {
    const subs = children(id)
      .map((child) => collect(child.id))
      .filter((list) => list.length)
    if (orderOf.get(id) === 'MutuallyExclusive' && subs.length > 1) {
      return [
        ...own(id),
        {
          guid: null,
          icon: null,
          kind: null,
          name: anyOfLabel(
            [
              ...new Set(
                subs.map((list) =>
                  list
                    .map((r) => (r.value ? `${r.name}: ${r.value}` : r.name))
                    .join(', '),
                ),
              ),
            ],
            lang,
          ),
          negative: false,
          value: null,
        },
      ]
    }
    return [...own(id), ...subs.flat()]
  }
  function test(id: number): QuestTest {
    const row = byId.get(id)
    const check =
      row?.type === 'ConditionCompareVariable'
        ? variableCheck(params(id))
        : null
    let tested: QuestTest['own'] = null
    if (row?.type === 'ConditionAlwaysTrue' || !row) {
      tested = true
    } else if (row.type === 'ConditionAlwaysFalse') {
      tested = false
    } else if (check) {
      tested = PART_DONE.test(check.variable) ? true : check
    }
    return {
      any: orderOf.get(id) === 'MutuallyExclusive',
      negate: Boolean(row?.negate),
      own: tested,
      tests: children(id).map((child) => test(child.id)),
    }
  }
  return {
    // the game may check the same thing twice with different location scopes (the tagged island, then the current one),
    // which read the same here
    requirements: (root: number) =>
      collect(root).filter(
        (requirement, index, list) =>
          list.findIndex(
            (other) =>
              other.name === requirement.name &&
              other.value === requirement.value,
          ) === index,
      ),
    test,
  }
}

function rewardValue(
  racerAttribute: string | null,
  amount: number | null,
  amountVariable: string | null,
  l: Labels,
) {
  const levels =
    amountVariable === null
      ? `${amount !== null && amount < 0 ? '' : '+'}${amount ?? 1}`
      : `+ ${variableName(amountVariable)}`
  if (racerAttribute) {
    return `${l('racer_attribute', racerAttribute)?.name ?? racerAttribute} ${levels}`
  }
  return amountVariable ? variableName(amountVariable) : null
}

/** What quest nodes do that a player notices: rewards, buffs, reputation, unlocks, follow-up storylines. */
async function outcomeRows(nodeGuids: Array<number>, lang: Lang) {
  const rName = localized('r_name')
  const rewards = nodeGuids.length
    ? await db
        .select({
          amount: questReward.amount,
          amountVariable: questReward.amountVariable,
          assetGuid: questReward.assetGuid,
          attribute: questReward.attribute,
          icon: questReward.icon,
          kind: questReward.kind,
          name: rName.value,
          nodeGuid: questReward.nodeGuid,
        })
        .from(questReward)
        .leftJoin(rName, on(rName, questReward.nameText, lang))
        .where(
          and(
            inArray(questReward.nodeGuid, nodeGuids),
            // the in-game message repeating a reward already listed
            ne(questReward.kind, 'message_reward'),
          ),
        )
    : []
  const assetGuids = [
    ...new Set(
      rewards.flatMap((reward) => (reward.assetGuid ? [reward.assetGuid] : [])),
    ),
  ]
  const effectGuids = rewards.flatMap((reward) =>
    reward.kind === 'effect' && reward.assetGuid ? [reward.assetGuid] : [],
  )
  const tName = localized('t_name')
  const sName = localized('s_name')
  const [assets, storylineNames, effects, modifiers, targets, l] =
    await Promise.all([
      assetNames(assetGuids, lang),
      db
        .select({
          guid: storyline.guid,
          icon: storyline.icon,
          name: sName.value,
        })
        .from(storyline)
        .leftJoin(sName, on(sName, storyline.titleText, lang))
        .where(inArray(storyline.guid, assetGuids)),
      db
        .select({
          duration: effect.durationMs,
          guid: effect.guid,
        })
        .from(effect)
        .where(inArray(effect.guid, effectGuids)),
      db
        .select({
          effectGuid: effectBuff.effectGuid,
          ...modifierColumns,
        })
        .from(effectBuff)
        .innerJoin(buffModifier, eq(buffModifier.buffGuid, effectBuff.buffGuid))
        .leftJoin(attribute, eq(attribute.id, buffModifier.attributeId))
        .where(inArray(effectBuff.effectGuid, effectGuids)),
      db
        .select({
          effectGuid: effectTargetPool.effectGuid,
          icon: effectTargetPool.icon,
          name: tName.value,
        })
        .from(effectTargetPool)
        .leftJoin(tName, on(tName, effectTargetPool.nameText, lang))
        .where(inArray(effectTargetPool.effectGuid, effectGuids)),
      labels(lang),
    ])
  const named = new Map(
    [...assets, ...storylineNames].map((a) => [a.guid, a] as const),
  )
  const duration = new Map(effects.map((e) => [e.guid, e.duration]))
  const mods = groupBy(await nameModifiers(modifiers, lang), 'effectGuid')
  const tgts = groupBy(targets, 'effectGuid')
  const rewardsOf = groupBy(rewards, 'nodeGuid')
  return (node: number) =>
    rewardsOf(node).map(
      ({
        assetGuid,
        attribute: racerAttribute,
        kind,
        amount,
        amountVariable,
        icon,
        name,
      }) => ({
        amount,
        /** timed effects only, in milliseconds */
        duration: (assetGuid && duration.get(assetGuid)) || null,
        guid: assetGuid,
        icon: (assetGuid && named.get(assetGuid)?.icon) || icon,
        /** effect, goods, item, reputation, unlock, lock, storyline, racer, xp, incident, power or variable */
        kind,
        /** what a buff changes, e.g. +9 Happiness */
        modifiers: assetGuid
          ? mods(assetGuid).map((m) => ({
              attribute: m.attribute,
              isPercent: m.isPercent,
              name: m.name,
              value: m.value,
            }))
          : [],
        name: (assetGuid && named.get(assetGuid)?.name) || name,
        /** buildings a buff applies to */
        targets: assetGuid
          ? tgts(assetGuid).map(({ effectGuid, ...target }) => target)
          : [],
        /** racer upgrades: "speed +1"; amounts read from a variable set by earlier choices: that variable */
        value: rewardValue(racerAttribute, amount, amountVariable, l),
      }),
    )
}

/** Choices of storylines: each decision's options (checks: holds / fails) with cost, requirements and outcomes. */
async function choiceRows(storylineGuids: Array<number>, lang: Lang) {
  const hText = localized('h_text')
  const tText = localized('t_text')
  const oText = localized('o_text')
  const pName = localized('p_name')
  const choices = await db
    .select({
      conditionId: questChoice.conditionId,
      guid: questChoice.nodeGuid,
      headline: hText.value,
      kind: questChoice.kind,
      speaker: {
        guid: assetName.guid,
        icon: assetName.icon,
        name: pName.value,
      },
      storylineGuid: questChoice.storylineGuid,
      text: tText.value,
    })
    .from(questChoice)
    .leftJoin(hText, on(hText, questChoice.headlineText, lang))
    .leftJoin(tText, on(tText, questChoice.textText, lang))
    .leftJoin(assetName, eq(assetName.guid, questChoice.speakerGuid))
    .leftJoin(pName, on(pName, assetName.nameText, lang))
    .where(inArray(questChoice.storylineGuid, storylineGuids))
    .orderBy(asc(questChoice.storylineGuid), asc(questChoice.position))
  const guids = choices.map((c) => c.guid)
  const [options, outcomes, { requirements, test }] = await Promise.all([
    db
      .select({
        conditionId: questOption.conditionId,
        costAmount: questOption.costAmount,
        costGuid: questOption.costGuid,
        decisionGuid: questOption.decisionGuid,
        idx: questOption.idx,
        text: oText.value,
      })
      .from(questOption)
      .leftJoin(oText, on(oText, questOption.textText, lang))
      .where(inArray(questOption.decisionGuid, guids))
      .orderBy(asc(questOption.idx)),
    db
      .select()
      .from(questChoiceOutcome)
      .where(inArray(questChoiceOutcome.choiceGuid, guids)),
    requirementRows(guids, lang),
  ])
  const nodeGuids = [...new Set(outcomes.map((o) => o.nodeGuid))]
  const [costs, results, changes] = await Promise.all([
    assetNames(
      [...new Set(options.flatMap((o) => (o.costGuid ? [o.costGuid] : [])))],
      lang,
    ),
    outcomeRows(nodeGuids, lang),
    nodeGuids.length
      ? db
          .select({
            nodeGuid: questVariableChange.nodeGuid,
            operation: questVariableChange.operation,
            value: questVariableChange.value,
            valueVariable: questVariableChange.valueVariable,
            variable: questVariableChange.variable,
          })
          .from(questVariableChange)
          .where(inArray(questVariableChange.nodeGuid, nodeGuids))
          .then((changed) =>
            changed.filter((row) => !PART_DONE.test(row.variable ?? '')),
          )
      : [],
  ])
  const changesOf = groupBy(changes, 'nodeGuid')
  const isChoice = new Set(guids)
  const reached = groupBy(
    outcomes.map((o) => ({
      ...o,
      key: `${o.choiceGuid}:${o.idx}`,
    })),
    'key',
  )
  function lead(choice: number, idx: number) {
    const nodes = reached(`${choice}:${idx}`).map((o) => o.nodeGuid)
    return {
      /** the choice this option leads to next, if any */
      next: nodes.find((n) => isChoice.has(n)) ?? null,
      outcomes: nodes.flatMap(results),
      /** quest variables the option writes, which later checks and parts read */
      sets: nodes.flatMap(changesOf).map(({ nodeGuid, ...change }) => change),
    }
  }
  const opts = groupBy(options, 'decisionGuid')
  const rows = choices.map(({ conditionId, speaker, text, ...choice }) => ({
    ...choice,
    headline: questText(choice.headline, lang),
    options:
      choice.kind === 'check'
        ? [0, 1].map((idx) => ({
            cost: null,
            idx,
            requirements: [] as ReturnType<typeof requirements>,
            test: null as QuestTest | null,
            text: null as string | null,
            ...lead(choice.guid, idx),
          }))
        : opts(choice.guid).map(
            ({
              conditionId: optionCondition,
              costAmount,
              costGuid,
              decisionGuid,
              ...option
            }) => {
              const cost = costs.find((c) => c.guid === costGuid)
              return {
                ...option,
                /** coins or goods paid to pick the option */
                cost: cost
                  ? {
                      amount: costAmount,
                      guid: cost.guid,
                      icon: cost.icon,
                      name: cost.name,
                    }
                  : null,
                requirements: optionCondition
                  ? requirements(optionCondition)
                  : [],
                /** whether earlier choices offer the option at all */
                test: optionCondition ? test(optionCondition) : null,
                text: questText(option.text, lang),
                ...lead(choice.guid, option.idx ?? 0),
              }
            },
          ),
    /** what the decision screen asks, e.g. "What will you do with Favillus?" */
    question: questQuestion(text, lang),
    /** what a check tests; its options are 0 = holds, 1 = does not */
    requirements: conditionId ? requirements(conditionId) : [],
    /** who asks: an advisor, a resident, a trader */
    speaker: speaker?.guid ? speaker : null,
    /** the rest of the screen's text: the story leading up to the question, with the game's <i> / <b> markup */
    story: questStory(text, lang),
    /** checks: what holds / fails branches on */
    test: conditionId ? test(conditionId) : null,
  }))
  // a check nothing depends on (text variants for the governor's gender …) is noise, and so is one that only leads to noise
  const kept = new Set(rows.map((row) => row.guid))
  let pruned = true
  while (pruned) {
    pruned = false
    for (const row of rows) {
      const matters = row.options.some(
        (o) =>
          o.outcomes.length ||
          o.sets.length ||
          (o.next !== null && kept.has(o.next)),
      )
      if (row.kind === 'check' && kept.has(row.guid) && !matters) {
        kept.delete(row.guid)
        pruned = true
      }
    }
  }
  return groupBy(
    rows
      .filter((row) => kept.has(row.guid))
      .map((row) => ({
        ...row,
        options: row.options.map((option) => ({
          ...option,
          next:
            option.next !== null && kept.has(option.next) ? option.next : null,
        })),
      })),
    'storylineGuid',
  )
}

/** One questline: its parts in order, each with its choices, what every option costs and requires, and what it leads to. */
async function getQuestline({ id, lang }: Get) {
  const head =
    (
      await queryQuestlines(
        {
          lang,
          perPage: 1,
        },
        id,
      )
    ).rows[0] ?? null
  const titleT = localized('title')
  const parts = await db
    .select({
      conditionId: storylineCondition.conditionId,
      guid: storyline.guid,
      icon: storyline.icon,
      name: titleT.value,
    })
    .from(questlineStoryline)
    .innerJoin(storyline, eq(storyline.guid, questlineStoryline.storylineGuid))
    .leftJoin(
      storylineCondition,
      eq(storylineCondition.storylineGuid, storyline.guid),
    )
    .leftJoin(titleT, on(titleT, storyline.titleText, lang))
    .where(eq(questlineStoryline.questlineGuid, id))
    .orderBy(asc(questlineStoryline.idx))
  const guids = parts.map((part) => part.guid)
  const [choices, { requirements, test }] = await Promise.all([
    choiceRows(guids, lang),
    requirementRows(guids, lang),
  ])
  return (
    head && {
      ...head,
      parts: parts.map(({ conditionId, ...part }) => ({
        ...part,
        // the game names a part's first decision after the part
        choices: choices(part.guid).map((choice) =>
          choice.headline === questText(part.name, lang)
            ? {
                ...choice,
                headline: null,
              }
            : choice,
        ),
        name: questText(part.name, lang),
        /** what the game must have for this part to start; "not yet played" guards left out */
        requirements: conditionId
          ? requirements(conditionId).filter((r) => !r.negative)
          : [],
        /** the story the part opens with: the text of the decision it is named after */
        story:
          choices(part.guid).find(
            (choice) => choice.headline === questText(part.name, lang),
          )?.story ?? null,
        /** whether earlier choices lead to this part */
        test: conditionId ? test(conditionId) : null,
      })),
    }
  )
}

function listQuestlines(f: QuestFilter & Page) {
  return queryQuestlines(f)
}

export const quests = {
  get: getQuestline,
  list: listQuestlines,
}
