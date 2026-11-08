import { and, eq } from 'drizzle-orm'

import { db } from '../db'
import { type LabelKind, type Lang } from '../enums'
import { label, translation } from '../schema'
import { langId } from './shared'

export type Label = {
  icon: string | null
  name: string
}

/** The game's name (and icon) for a key it labels, e.g. `('rarity', 'Mythic')` → Heroic; null when it has none */
export type Labels = (
  kind: LabelKind,
  key: string | null | undefined,
) => Label | null

// the game ends some labels in a colon or line break ("Cargo Weight Speed Reduction:")
const TRAILING = /[\s:]+$/u

// ponytail: one map per language for the life of the process; the DB is rebuilt offline, so restart after a rebuild
const cache = new Map<Lang, Promise<Labels>>()

async function load(lang: Lang): Promise<Labels> {
  const rows = await db
    .select({
      icon: label.icon,
      key: label.key,
      kind: label.kind,
      name: translation.value,
    })
    .from(label)
    .innerJoin(
      translation,
      and(
        eq(translation.lineId, label.nameText),
        eq(translation.langId, langId(lang)),
      ),
    )
  const map = new Map(
    rows.map((row) => [
      `${row.kind}:${row.key}`,
      {
        icon: row.icon,
        name: (row.name ?? '').replace(TRAILING, ''),
      },
    ]),
  )
  return (kind, key) => (key ? (map.get(`${kind}:${key}`) ?? null) : null)
}

export function labels(lang: Lang) {
  let found = cache.get(lang)
  if (!found) {
    found = load(lang)
    found.catch(() => cache.delete(lang))
    cache.set(lang, found)
  }
  return found
}

/** `{ key, name }` for an enum value the game names; unnamed keys read as themselves */
export function keyed<K extends string>(
  l: Labels,
  kind: LabelKind,
  key: K | null,
) {
  return key === null
    ? null
    : {
        key,
        name: l(kind, key)?.name ?? key,
      }
}
