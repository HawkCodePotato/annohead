import { asc, sql } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import { region } from '../schema'
import { localized, on, regionColumns } from './shared'

export type RegionFilter = {
  lang: Lang
}

/** oldest first; named by the game, except regions it has no name for yet (Egyptian) */
async function list({ lang }: RegionFilter) {
  const nameT = localized('name')
  return await db
    .select({
      ...regionColumns,
      name: sql<string>`coalesce(${nameT.value}, ${region.key})`,
    })
    .from(region)
    .leftJoin(nameT, on(nameT, region.nameText, lang))
    .orderBy(asc(region.id))
}

export const regions = {
  list,
}
