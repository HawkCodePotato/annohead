export const SearchTypes = [
  'building',
  'item',
  'product',
  'tech',
  'quest',
  'chain',
  'unit',
  'ornament',
] as const

export type SearchType = (typeof SearchTypes)[number]
