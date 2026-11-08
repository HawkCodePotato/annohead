import { eq, inArray } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import { condition, conditionParam, unlock } from '../schema'
import { populationTiers } from './population-tiers'
import { groupBy } from './shared'

export async function unlockRequirements(guids: Array<number>, lang: Lang) {
  const rows = await db
    .select({
      assetGuid: unlock.assetGuid,
      conditionId: condition.id,
      guid: unlock.sourceGuid,
      negate: condition.negate,
      type: condition.template,
    })
    .from(unlock)
    .innerJoin(condition, eq(condition.id, unlock.conditionId))
    .where(inArray(unlock.assetGuid, guids))
  const [parameters, tiers] = await Promise.all([
    db
      .select()
      .from(conditionParam)
      .where(
        inArray(
          conditionParam.conditionId,
          rows.map((row) => row.conditionId),
        ),
      ),
    populationTiers.list({
      lang,
    }),
  ])
  const params = groupBy(parameters, 'conditionId')
  return rows.map(({ conditionId, negate, ...row }) => {
    const values: Record<string, string | null> = {}
    for (const { key, value } of params(conditionId)) {
      if (key !== null) {
        values[key] = value
      }
    }
    const tier =
      row.type === 'ConditionPlayerCounter' &&
      values.PlayerCounter === 'PopulationByLevel'
        ? tiers.find((entry) => entry.guid === Number(values.Context))
        : undefined
    return {
      ...row,
      conditionId,
      negate: Boolean(negate),
      parameters: values,
      population: tier
        ? {
            ...tier,
            amount: Number(values.CounterAmount),
          }
        : null,
    }
  })
}
