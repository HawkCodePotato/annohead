import { type SQL, sql } from 'drizzle-orm'

import { db } from '../db'
import { type Lang, type Rarity, type Region, regionValues } from '../enums'
import { type SearchType, SearchTypes } from '../search'
import { questlineName } from './quests'
import { langId, type Page, paginate } from './shared'

export type SearchFilter = {
  lang: Lang
  query: string
  types?: Array<SearchType>
}

export type SearchHit = {
  type: SearchType
  guid: number
  /** English URL slug, the same in every language */
  slug: string | null
  icon: string | null
  name: string
  description: string | null
  /** Item rarity; null for other entity types. */
  rarity: Rarity | null
  /** set for buildings and chains */
  regions: Array<Region>
}

type Row = Omit<SearchHit, 'regions'> & {
  id: number
  regions: string | null
}

/** a `search` row: one entity in one language, `key` its folded name (built by transform.py search()) */
type Entry = {
  id: number
  key: string
  type: SearchType
  guid: number
  name: string
}

const entryColumns = sql`s.id, s.key, e.type, e.guid, n.value as name`

/** entries in the filter's language and types; `e` is the entity */
function scope(f: SearchFilter) {
  const types = f.types?.length
    ? sql`and e.type in (${sql.join(
        f.types.map((t) => sql`${t}`),
        sql`, `,
      )})`
    : sql``
  return sql`s.lang_id = ${langId(f.lang)} ${types}`
}

function rows(f: SearchFilter, where: SQL) {
  return db.all<Row>(
    sql`select s.id, e.type, e.guid, e.slug, e.icon, e.rarity, e.regions, n.value as name, d.value as description
      from search s
      join search_entry e on e.guid = s.guid
      join translation n on n.line_id = e.name_text and n.lang_id = s.lang_id
      left join translation d on d.line_id = e.description_text and d.lang_id = s.lang_id
      where ${scope(f)} and ${where}`,
  )
}

function entries(f: SearchFilter, where: SQL) {
  return db.all<Entry>(
    sql`select ${entryColumns} from search s
      join search_entry e on e.guid = s.guid
      join translation n on n.line_id = e.name_text and n.lang_id = s.lang_id
      where ${scope(f)} and ${where}`,
  )
}

function allKeys(f: SearchFilter) {
  return db.all<Pick<Entry, 'id' | 'key'>>(
    sql`select s.id, s.key from search s join search_entry e on e.guid = s.guid where ${scope(f)}`,
  )
}

function descriptions(f: SearchFilter) {
  return db.all<
    Entry & {
      description: string
    }
  >(
    sql`select ${entryColumns}, d.value as description from search s
      join search_entry e on e.guid = s.guid
      join translation n on n.line_id = e.name_text and n.lang_id = s.lang_id
      join translation d on d.line_id = e.description_text and d.lang_id = s.lang_id
      where ${scope(f)}`,
  )
}

function ids(list: Iterable<number>) {
  return sql`s.id in (${sql.join(
    [...list].map((id) => sql`${id}`),
    sql`, `,
  )})`
}

const DIACRITICS = /\p{M}/gu
// the game separates CJK words with zero-width spaces, which a typed query never has
const INVISIBLE = /[\u200B-\u200D\uFEFF]/gu
const WORD_BREAK = /[^\p{L}\p{N}]+/u
/** no typos in short words, one from 4 characters, two from 8 */
const ONE_TYPO_LENGTH = 4
const TWO_TYPOS_LENGTH = 8
/** shortest word the trigram index can look up */
const TRIGRAM = 3

/** lowercase without diacritics, so "backerei" and "BÄCKEREI" both find Bäckerei; transform.py fold() builds `key` the same way */
function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(INVISIBLE, '')
    .toLowerCase()
    .replaceAll('ß', 'ss')
}

function words(text: string) {
  return text.split(WORD_BREAK).filter(Boolean)
}

function typosAllowed(length: number) {
  if (length < ONE_TYPO_LENGTH) {
    return 0
  }
  return length < TWO_TYPOS_LENGTH ? 1 : 2
}

/** Optimal string alignment distance: insertions, deletions, substitutions and adjacent swaps. */
function distance(a: string, b: string) {
  let beforePrevious: Array<number> = []
  let previous = Array.from(
    {
      length: b.length + 1,
    },
    (_, j) => j,
  )
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )
      const swapped =
        i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]
      if (swapped) {
        best = Math.min(best, (beforePrevious[j - 2] ?? 0) + 1)
      }
      current.push(best)
    }
    beforePrevious = previous
    previous = current
  }
  return previous[b.length] ?? 0
}

/** Typos needed for every query word to match a name word or the start of one; null when over budget. */
function fuzzy(tokens: Array<string>, nameWords: Array<string>) {
  let total = 0
  for (const token of tokens) {
    const best = Math.min(
      ...nameWords.map((word) =>
        Math.min(
          distance(token, word),
          distance(token, word.slice(0, token.length)),
        ),
      ),
    )
    if (best > typosAllowed(token.length)) {
      return null
    }
    total += best
  }
  return total
}

const Tier = {
  Contains: 3,
  Description: 5,
  Exact: 0,
  Fuzzy: 4,
  Prefix: 1,
  WordPrefix: 2,
} as const

/** name tier for a folded name, lower is better; null when it does not contain every query word */
function nameTier(name: string, query: string, tokens: Array<string>) {
  if (name === query) {
    return Tier.Exact
  }
  if (name.startsWith(query)) {
    return Tier.Prefix
  }
  const nameWords = words(name)
  if (tokens.every((t) => nameWords.some((w) => w.startsWith(t)))) {
    return Tier.WordPrefix
  }
  if (name.includes(query)) {
    return Tier.Contains
  }
  return null
}

type Hit = Entry & {
  tier: number
  typos: number
}

/**
 * Ranked exact name, name prefix, word prefix, substring, then description; typo tolerant name matches only when
 * nothing matched as typed. Within a rank, types follow the filter order. Word order, case and diacritics do not matter.
 */
async function match(f: SearchFilter, withDescriptions: boolean) {
  const query = fold(f.query.trim())
  const tokens = words(query)
  const hits = new Map<number, Hit>()
  const add = (entry: Entry, tier: number, typos = 0) =>
    hits.set(entry.id, {
      ...entry,
      tier,
      typos,
    })
  if (tokens.length === 0) {
    for (const entry of await entries(f, sql`1`)) {
      add(entry, Tier.Exact)
    }
    return rank(hits, f.lang)
  }
  // the trigram index narrows to names containing every word; it can't look up words under 3 characters, and
  // scanning it for them reads every language, so those check this language's keys instead
  const contains = (column: SQL, list: Array<string>) =>
    list.length
      ? sql.join(
          list.map((t) => sql`${column} like ${`%${t}%`}`),
          sql` and `,
        )
      : sql`1`
  const long = tokens.filter((t) => t.length >= TRIGRAM)
  const named = await entries(
    f,
    sql`${contains(
      sql`s.key`,
      tokens.filter((t) => t.length < TRIGRAM),
    )} and ${
      long.length
        ? sql`s.id in (select rowid from search_fts where ${contains(sql`search_fts.key`, long)})`
        : sql`1`
    }`,
  )
  for (const entry of named) {
    const tier = nameTier(entry.key, query, tokens)
    if (tier !== null) {
      add(entry, tier)
    }
  }
  if (hits.size === 0) {
    // typos are scored on keys alone; only the few close ones need their names
    const close = new Map<number, number>()
    for (const { id, key } of await allKeys(f)) {
      const typos = fuzzy(tokens, words(key))
      if (typos !== null) {
        close.set(id, typos)
      }
    }
    if (close.size) {
      for (const entry of await entries(f, ids(close.keys()))) {
        add(entry, Tier.Fuzzy, close.get(entry.id))
      }
    }
  }
  if (withDescriptions) {
    for (const entry of await descriptions(f)) {
      const text = fold(entry.description)
      if (!hits.has(entry.id) && tokens.every((t) => text.includes(t))) {
        add(entry, Tier.Description)
      }
    }
  }
  return rank(hits, f.lang)
}

function rank(hits: Map<number, Hit>, lang: Lang) {
  return [...hits.values()].sort(
    (a, b) =>
      a.tier - b.tier ||
      a.typos - b.typos ||
      SearchTypes.indexOf(a.type) - SearchTypes.indexOf(b.type) ||
      a.name.localeCompare(b.name, lang) ||
      a.guid - b.guid,
  )
}

/** full results for the hits shown, in their order */
async function load(f: SearchFilter, shown: Array<Hit>) {
  const found = shown.length ? await rows(f, ids(shown.map((h) => h.id))) : []
  const byId = new Map(found.map((row) => [row.id, row]))
  return shown.flatMap((hit) => {
    const row = byId.get(hit.id)
    if (!row) {
      return []
    }
    const { id: _, regions, ...rest } = row
    const keys = regions?.split(',') ?? []
    return {
      ...rest,
      name:
        rest.type === 'quest'
          ? (questlineName(rest.name, f.lang) ?? rest.name)
          : rest.name,
      regions: regionValues.filter((r) => keys.includes(r)),
    } satisfies SearchHit
  })
}

/** Searches every entity type at once, names and descriptions. */
async function search(f: SearchFilter & Page) {
  const hits = await match(f, true)
  const { limit, offset } = paginate(f)
  return {
    pages: Math.ceil(hits.length / limit),
    rows: await load(f, hits.slice(offset, offset + limit)),
    total: hits.length,
  }
}

const SUGGESTIONS = 8

/** Autocomplete: the best name matches only, for every keystroke. */
async function suggest(f: SearchFilter) {
  if (!f.query.trim()) {
    return []
  }
  return load(f, (await match(f, false)).slice(0, SUGGESTIONS))
}

export { search, suggest }
