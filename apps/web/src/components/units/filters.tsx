'use client'

import { type Regions, type UnitTypes } from '@anno/db/client'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'

import { getIcon } from '@/lib/icons'
import { unitFilters } from '@/lib/validators'

import { FiltersCard } from '../common/filters'

type Props = {
  types: UnitTypes
  regions: Regions
}

export function UnitFiltersCard({ types, regions }: Props) {
  const t = useTranslations('component.units.filters')

  const filters = useQueryStates(unitFilters)

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:flex lg:w-64 lg:flex-col">
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
