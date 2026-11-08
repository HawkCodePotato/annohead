import {
  allocationValues,
  attributeValues,
  nicheValues,
  rarityValues,
} from '@anno/db/enums'
import { SearchTypes } from '@anno/db/search'
import { hasLocale } from 'next-intl'
import {
  createLoader,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'
import { z } from 'zod'

import { routing } from '@/intl'

export function validateLocale(locale: string) {
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
}

const IdSchema = z.coerce.number()

export function getId(id: string) {
  return IdSchema.parse(id)
}

export const searchFilters = {
  page: parseAsInteger,
  query: parseAsString.withDefault(''),
  types: parseAsArrayOf(parseAsStringLiteral(SearchTypes)),
}

export const parseSearchFilters = createLoader(searchFilters)

export type SearchFilters = Awaited<ReturnType<typeof parseSearchFilters>>

export const buildingFilters = {
  dlcs: parseAsArrayOf(parseAsInteger),
  page: parseAsInteger,
  regions: parseAsArrayOf(parseAsInteger),
  tiers: parseAsArrayOf(parseAsInteger),
  types: parseAsArrayOf(parseAsInteger),
}

export const parseBuildingFilters = createLoader(buildingFilters)

export type BuildingFilters = Awaited<ReturnType<typeof parseBuildingFilters>>

export const itemFilters = {
  attributes: parseAsArrayOf(parseAsStringLiteral(attributeValues)),
  dlcs: parseAsArrayOf(parseAsInteger),
  niches: parseAsArrayOf(parseAsStringLiteral(nicheValues)),
  page: parseAsInteger,
  rarities: parseAsArrayOf(parseAsStringLiteral(rarityValues)),
  types: parseAsArrayOf(
    parseAsStringLiteral([...allocationValues, 'Charioteer'] as const),
  ),
}

export const parseItemFilters = createLoader(itemFilters)

export type ItemFilters = Awaited<ReturnType<typeof parseItemFilters>>

export const chainFilters = {
  dlcs: parseAsArrayOf(parseAsInteger),
  page: parseAsInteger,
  regions: parseAsArrayOf(parseAsInteger),
  tiers: parseAsArrayOf(parseAsInteger),
  types: parseAsArrayOf(parseAsInteger),
}

export const parseChainFilters = createLoader(chainFilters)

export type ChainFilters = Awaited<ReturnType<typeof parseChainFilters>>

export const productFilters = {
  dlcs: parseAsArrayOf(parseAsInteger),
  page: parseAsInteger,
  regions: parseAsArrayOf(parseAsInteger),
  tiers: parseAsArrayOf(parseAsInteger),
  types: parseAsArrayOf(parseAsInteger),
}

export const parseProductFilters = createLoader(productFilters)

export type ProductFilters = Awaited<ReturnType<typeof parseProductFilters>>

export const ornamentFilters = {
  dlcs: parseAsArrayOf(parseAsInteger),
  page: parseAsInteger,
  regions: parseAsArrayOf(parseAsInteger),
  types: parseAsArrayOf(parseAsInteger),
}

export const parseOrnamentFilters = createLoader(ornamentFilters)

export type OrnamentFilters = Awaited<ReturnType<typeof parseOrnamentFilters>>

export const questFilters = {
  dlcs: parseAsArrayOf(parseAsInteger),
  page: parseAsInteger,
  regions: parseAsArrayOf(parseAsInteger),
}

export const parseQuestFilters = createLoader(questFilters)

export type QuestFilters = Awaited<ReturnType<typeof parseQuestFilters>>

export const unitFilters = {
  page: parseAsInteger,
  regions: parseAsArrayOf(parseAsInteger),
  types: parseAsArrayOf(parseAsInteger),
}

export const parseUnitFilters = createLoader(unitFilters)

export type UnitFilters = Awaited<ReturnType<typeof parseUnitFilters>>
