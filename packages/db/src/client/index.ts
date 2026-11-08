import { buildings } from './buildings'
import { chains } from './chains'
import { dlc } from './dlc'
import { items } from './items'
import { ornaments } from './ornaments'
import { populationTiers } from './population-tiers'
import { products } from './products'
import { quests } from './quests'
import { regions } from './regions'
import { search, suggest } from './search'
import { techs } from './techs'
import { units } from './units'

export type { BuildingFilter } from './buildings'
export type { ChainFilter } from './chains'
export type { DlcFilter } from './dlc'
export type { ItemFilter } from './items'
export type { OrnamentFilter } from './ornaments'
export type { PopulationTierFilter } from './population-tiers'
export type { ProductFilter } from './products'
export type { QuestFilter } from './quests'
export type { RegionFilter } from './regions'
export type { SearchFilter, SearchHit } from './search'
export type { Get, Page } from './shared'
export type { TechFilter } from './techs'
export type { UnitFilter } from './units'

export type Buildings = Awaited<ReturnType<typeof buildings.list>>
export type Building = Awaited<ReturnType<typeof buildings.get>>
export type BuildingTypes = Awaited<ReturnType<typeof buildings.types>>
export type Chains = Awaited<ReturnType<typeof chains.list>>
export type Chain = Awaited<ReturnType<typeof chains.get>>
export type ChainTypes = Awaited<ReturnType<typeof chains.types>>
export type ChainTiers = Awaited<ReturnType<typeof chains.tiers>>
export type Dlcs = Awaited<ReturnType<typeof dlc.list>>
export type Items = Awaited<ReturnType<typeof items.list>>
export type Item = Awaited<ReturnType<typeof items.get>>
export type ItemTypes = Awaited<ReturnType<typeof items.types>>
export type ItemNiches = Awaited<ReturnType<typeof items.niches>>
export type ItemRarities = Awaited<ReturnType<typeof items.rarities>>
export type Ornaments = Awaited<ReturnType<typeof ornaments.list>>
export type Ornament = Awaited<ReturnType<typeof ornaments.get>>
export type OrnamentTypes = Awaited<ReturnType<typeof ornaments.types>>
export type PopulationTiers = Awaited<ReturnType<typeof populationTiers.list>>
export type Products = Awaited<ReturnType<typeof products.list>>
export type Product = Awaited<ReturnType<typeof products.get>>
export type ProductTypes = Awaited<ReturnType<typeof products.types>>
export type Quests = Awaited<ReturnType<typeof quests.list>>
export type Quest = Awaited<ReturnType<typeof quests.get>>
export type QuestPart = Quest['parts'][number]
export type QuestChoice = QuestPart['choices'][number]
export type QuestOption = QuestChoice['options'][number]
export type QuestOutcome = QuestOption['outcomes'][number]
export type Regions = Awaited<ReturnType<typeof regions.list>>
export type SearchResults = Awaited<ReturnType<typeof search>>
export type Suggestions = Awaited<ReturnType<typeof suggest>>
export type Techs = Awaited<ReturnType<typeof techs.list>>
export type Tech = Awaited<ReturnType<typeof techs.get>>
export type TechCategories = Awaited<ReturnType<typeof techs.categories>>
export type Units = Awaited<ReturnType<typeof units.list>>
export type Unit = Awaited<ReturnType<typeof units.get>>
export type UnitTypes = Awaited<ReturnType<typeof units.types>>

export const anno = {
  buildings,
  chains,
  dlc,
  items,
  ornaments,
  populationTiers,
  products,
  quests,
  regions,
  search,
  suggest,
  techs,
  units,
}
