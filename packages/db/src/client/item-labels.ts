import {
  type Allocation,
  allocationValues,
  type Lang,
  type Niche,
  type Rarity,
} from '../enums'
import { labels } from './labels'
import { phrases } from './phrases'

/** game order, not alphabetical */
const rarityOrder = [
  'Common',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
  'Unique',
  'Quest',
] as const satisfies ReadonlyArray<Rarity>

/** `None` is not a category, so it's excluded from the filter list */
const nicheOrder = [
  'Diplomacy',
  'Economy',
  'Religion',
  'Culture',
  'Finance',
  'Military',
  'Agriculture',
  'Research',
  'Nautics',
] as const satisfies ReadonlyArray<Niche>

/** the game's allocations, plus `Charioteer`: specialists that can race in the Hippodrome */
const itemTypeValues = [...allocationValues, 'Charioteer'] as const
export type ItemType = Allocation | 'Charioteer'

export async function types({ lang }: { lang: Lang }) {
  const l = await labels(lang)
  return itemTypeValues.map((key) => ({
    key,
    // the game only says "Charioteers", so the singular is hand-written
    name:
      key === 'Charioteer'
        ? phrases[lang].words.charioteer
        : (l('allocation', key)?.name ?? key),
  }))
}

export async function rarities({ lang }: { lang: Lang }) {
  const l = await labels(lang)
  return rarityOrder.map((key) => ({
    key,
    name: l('rarity', key)?.name ?? key,
  }))
}

export async function niches({ lang }: { lang: Lang }) {
  const l = await labels(lang)
  return nicheOrder.map((key) => ({
    key,
    name: l('niche', key)?.name ?? key,
  }))
}
