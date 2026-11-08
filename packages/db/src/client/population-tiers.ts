import { asc, eq } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import { populationLevel, region } from '../schema'
import { localized, on } from './shared'

export type PopulationTierFilter = {
  lang: Lang
}

async function list({ lang }: PopulationTierFilter) {
  const nameT = localized('name')
  const rows = await db
    .select({
      guid: populationLevel.guid,
      icon: populationLevel.icon,
      name: nameT.value,
      region: region.key,
      tier: populationLevel.tier,
      workforceProductGuid: populationLevel.workforceProductGuid,
    })
    .from(populationLevel)
    .leftJoin(region, eq(region.id, populationLevel.regionId))
    .leftJoin(nameT, on(nameT, populationLevel.nameText, lang))
    .orderBy(
      asc(populationLevel.regionId),
      asc(populationLevel.tier),
      asc(populationLevel.guid),
    )
  return rows.map((row) => {
    const { tier, region: regionKey } = row
    if (tier !== 1 && tier !== 2 && tier !== 3 && tier !== 4) {
      throw new Error(`Invalid population tier ${tier} for ${row.guid}`)
    }
    if (regionKey === null) {
      throw new Error(`Missing region for population tier ${row.guid}`)
    }
    return {
      ...row,
      region: regionKey,
      tier,
    } as const
  })
}

export const populationTiers = {
  list,
}
