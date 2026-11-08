import {
  type Buildings,
  type BuildingTypes,
  type Dlcs,
  type PopulationTiers,
  type Regions,
} from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type BuildingFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { BuildingCard } from './card'
import { BuildingFiltersCard } from './filters'

type Props = {
  buildings: Buildings
  dlcs: Dlcs
  filters: BuildingFilters
  types: BuildingTypes
  regions: Regions
  tiers: PopulationTiers
}

export function BuildingList({
  buildings,
  dlcs,
  filters,
  types,
  regions,
  tiers,
}: Props) {
  const t = useTranslations('component.buildings.list')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <BuildingFiltersCard
          dlcs={dlcs}
          regions={regions}
          tiers={tiers}
          types={types}
        />

        <div className="flex flex-1 flex-col gap-12">
          {buildings.rows.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
              {buildings.rows.map((building) => (
                <BuildingCard building={building} key={building.guid} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}

          <Pagination page={filters.page} pages={buildings.pages} />
        </div>
      </div>
    </div>
  )
}
