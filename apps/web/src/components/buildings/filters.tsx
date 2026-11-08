'use client'

import {
  type BuildingTypes,
  type Dlcs,
  type PopulationTiers,
  type Regions,
} from '@anno/db/client'
import { orderBy } from 'lodash'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'

import { getIcon } from '@/lib/icons'
import { buildingFilters } from '@/lib/validators'

import { FiltersCard } from '../common/filters'
import { Icon } from '../common/icon'

type Props = {
  dlcs: Dlcs
  types: BuildingTypes
  regions: Regions
  tiers: PopulationTiers
}

export function BuildingFiltersCard({ dlcs, types, regions, tiers }: Props) {
  const t = useTranslations('component.buildings.filters')

  const filters = useQueryStates(buildingFilters)

  return (
    <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:flex lg:w-64 lg:flex-col">
      <FiltersCard
        filters={filters}
        id="regions"
        items={regions.map((item) => ({
          icon: item.key ? getIcon(`region.${item.key}`) : null,
          label: item.name,
          value: item.id,
        }))}
        title={t('regions')}
      />

      <FiltersCard
        filters={filters}
        id="tiers"
        items={orderBy(tiers, ['region', 'tier'], ['desc', 'asc']).map(
          (item) => ({
            after: (
              <>
                {item.region ? (
                  <Icon
                    className="size-6"
                    icon={getIcon(`region.${item.region}`)}
                  />
                ) : null}

                {item.tier ? (
                  <Icon
                    className="size-6"
                    icon={getIcon(`tier.${item.tier}`)}
                  />
                ) : null}
              </>
            ),
            icon: item.icon,
            label: item.name,
            value: item.guid,
          }),
        )}
        title={t('tiers')}
      />

      <FiltersCard
        filters={filters}
        id="dlcs"
        items={dlcs.map((item) => ({
          icon: item.icon,
          label: item.name,
          value: item.guid,
        }))}
        title={t('dlcs')}
      />

      <FiltersCard
        filters={filters}
        id="types"
        items={types.map((item) => ({
          icon: item.icon,
          label: item.name,
          value: item.guid,
        }))}
        title={t('types')}
      />
    </div>
  )
}
