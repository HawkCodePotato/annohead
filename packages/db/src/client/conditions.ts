import { inArray, sql } from 'drizzle-orm'

import { db } from '../db'
import { type ConditionTemplate, type Lang } from '../enums'
import {
  assetName,
  assetPool,
  building,
  conditionParam,
  item,
  monumentEvent,
  participant,
  patron,
  populationLevel,
  product,
  tech,
} from '../schema'
import {
  conditionLabel,
  negatedLabel,
  phraseNeedsName,
  variableCheckLabel,
} from './condition-labels'
import { labels } from './labels'
import { groupBy, localized, on } from './shared'

/** Names of game assets a condition parameter or quest outcome may point at, by guid. */
export async function assetNames(guids: Array<number>, lang: Lang) {
  if (!guids.length) {
    return []
  }
  const tables = [
    ['patron', patron],
    ['product', product],
    ['participant', participant],
    ['item', item],
    ['building', building],
    ['tier', populationLevel],
    ['pool', assetPool],
    ['event', monumentEvent],
    ['tech', tech],
    // last: only for assets none of the tables above hold
    ['asset', assetName],
  ] as const
  const aName = localized('a_name')
  const rows = await Promise.all(
    tables.map(([kind, table]) =>
      db
        .select({
          guid: table.guid,
          icon: table.icon,
          kind: sql<(typeof tables)[number][0]>`${kind}`,
          name: aName.value,
        })
        .from(table)
        .leftJoin(aName, on(aName, table.nameText, lang))
        .where(inArray(table.guid, guids)),
    ),
  )
  return rows
    .flat()
    .filter(
      (row, index, all) => all.findIndex((a) => a.guid === row.guid) === index,
    )
}

/** Parameters that say which variant of a template a condition checks (which statistic, attribute, state …). */
const VARIANT_KEYS = [
  'PlayerCounter',
  'NeedAttributeType',
  'DesiredState',
  'AllowedSpecialStates',
  'AllowedZones',
  'WarStates',
  'VariableToCheck',
  'ItemType',
  'ItemRacerAttribute',
  'ActiveIncidentType',
]

/** Values the game assumes when a condition leaves the variant unset (properties.xml `DefaultValues`). */
const DEFAULT_VARIANTS: Partial<Record<ConditionTemplate, string>> = {
  ConditionDiplomacyState: 'War',
  ConditionItemRacerAttribute: 'Speed',
  ConditionPlayerCounter: 'ObjectCount',
}

type Param = {
  key: string | null
  value: string | null
}

const SCOPE_KEY = /^(ConditionLocationFilter|CounterScope)/u

/** `ConditionCompareVariable`: the game defaults an unset operator to AtLeast and an unset second value to false. */
export function variableCheck(params: Array<Param>) {
  const find = (test: (key: string) => boolean) =>
    params.find((p) => p.key !== null && test(p.key))?.value ?? null
  const bool = find((key) => key.endsWith('BoolValue'))
  return {
    comparison: find((key) => key === 'ComparisonOperation') ?? 'AtLeast',
    other: find((key) => key.endsWith('VariableName')),
    value:
      find((key) => key.endsWith('IntValue') || key.endsWith('FloatValue')) ??
      (bool === '1' ? 'true' : 'false'),
    variable: find((key) => key === 'VariableToCheck') ?? '',
  }
}

/**
 * Ready-to-render requirements for condition rows: one entry per referenced asset (a condition may list several,
 * e.g. any of three games), one null entry without. Rows keep their own fields except `id`.
 */
export async function describeConditions<
  T extends {
    id: number
    type: ConditionTemplate
    negate?: number | null
  },
>(rows: Array<T>, lang: Lang) {
  const params = groupBy(
    rows.length
      ? await db
          .select()
          .from(conditionParam)
          .where(
            inArray(
              conditionParam.conditionId,
              rows.map((row) => row.id),
            ),
          )
      : [],
    'conditionId',
  )
  const [assets, l] = await Promise.all([
    assetNames(
      [
        ...new Set(
          rows.flatMap((row) => params(row.id).map((p) => Number(p.value))),
        ),
      ].filter((guid) => Number.isInteger(guid) && guid > 0),
      lang,
    ),
    labels(lang),
  ])
  return rows.flatMap(({ id, negate, ...row }) => {
    // where the condition looks (a province, the counter's scope) is not what it is about
    const values = params(id)
      .filter((p) => !SCOPE_KEY.test(p.key ?? ''))
      .map((p) => p.value)
    /** variant of the template, e.g. `MoneyBalance` for a player counter or `Rebellion;RebellionPending` for emperor relation */
    const variant =
      (params(id).some((p) => p.key === 'CheckAllAttributes' && p.value === '1')
        ? 'AllAttributes'
        : null) ??
      params(id).find((p) => p.key !== null && VARIANT_KEYS.includes(p.key))
        ?.value ??
      DEFAULT_VARIANTS[row.type] ??
      null
    /** threshold of counter conditions: how many ships, how much health, how many trade routes */
    const value =
      Number(
        params(id).find(
          (p) => p.key?.endsWith('Amount') || p.key?.endsWith('Count'),
        )?.value,
      ) || null
    const check =
      row.type === 'ConditionCompareVariable' ? variableCheck(params(id)) : null
    const matched = check
      ? []
      : assets
          .filter((a) => values.includes(String(a.guid)))
          .sort(
            (a, b) =>
              values.indexOf(String(a.guid)) - values.indexOf(String(b.guid)),
          )
    const comparison =
      params(id).find((p) => p.key?.startsWith('ComparisonOp'))?.value ?? null
    // a racer attribute below its maximum reads as "not at maximum" rather than an upper bound
    const negated =
      Boolean(negate) !==
      (row.type === 'ConditionItemRacerAttribute' && comparison === 'LessThan')
    return (matched.length ? matched : [null]).map((asset) => {
      const label = check
        ? variableCheckLabel(check, lang)
        : conditionLabel(
            {
              comparison:
                row.type === 'ConditionItemRacerAttribute' ? null : comparison,
              name: asset?.name ?? null,
              type: row.type,
              variant,
            },
            lang,
            l,
          )
      return {
        ...row,
        /** the game asset the condition refers to, e.g. the patron to worship; null for pure counters */
        guid: asset?.guid ?? null,
        icon: asset?.icon ?? null,
        kind: asset?.kind ?? null,
        /** ready-to-render requirement text, e.g. "Worship Cernunnos"; pair with `value` for thresholds */
        name: negated ? negatedLabel(label, lang) : label,
        /** the requirement asks for something to be absent or unset */
        negative: negated !== (check?.value === 'false'),
        /** the phrase names an asset the game data does not name (internal flags, unnamed pools) */
        unnamed:
          !(check || asset) && phraseNeedsName(row.type, variant ?? null),
        // an incident condition's count is always one, already said by the phrase
        value:
          check || row.type === 'ConditionActiveIncidentCount' ? null : value,
        /** the quest variable a `ConditionCompareVariable` checks */
        variable: check?.variable ?? null,
      }
    })
  })
}
