import { asc, inArray } from 'drizzle-orm'

import { db } from '../db'
import { type Lang } from '../enums'
import {
  building,
  dlc as dlcTable,
  item,
  ornament,
  questline,
  tech,
} from '../schema'
import { localized, on } from './shared'

// products and chains take their DLC from the producing building
const owners = {
  building,
  item,
  ornament,
  questline,
  tech,
}

export type DlcFilter = {
  lang: Lang
  /** only DLCs that own at least one row of this kind, so empty packs never show up as filters */
  of: keyof typeof owners
}

async function list({ lang, of }: DlcFilter) {
  const owner = owners[of]
  const nameT = localized('name')
  const rows = await db
    .select({
      guid: dlcTable.guid,
      icon: dlcTable.icon,
      key: dlcTable.key,
      name: nameT.value,
    })
    .from(dlcTable)
    .leftJoin(nameT, on(nameT, dlcTable.nameText, lang))
    .where(
      inArray(
        dlcTable.guid,
        db.selectDistinct({ guid: owner.dlcGuid }).from(owner),
      ),
    )
    .orderBy(asc(dlcTable.guid))
  return rows
}

export const dlc = {
  list,
}
