'use client'

import {
  type ChainTiers,
  type ChainTypes,
  type Dlcs,
  type Regions,
} from '@anno/db/client'
import { orderBy } from 'lodash'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { type ReactNode } from 'react'

import { getIcon } from '@/lib/icons'
import { chainFilters } from '@/lib/validators'

import { FiltersCard } from '../common/filters'
import { Icon } from '../common/icon'

type Props = {
  children?: ReactNode
  dlcs: Dlcs
  refresh?: boolean
  regions: Regions
  tiers: ChainTiers
  types: ChainTypes
}

export function ChainFiltersCard({
  children,
  dlcs,
  refresh,
  regions,
  tiers,
  types,
}: Props) {
  const t = useTranslations('component.chains.filters')

  const filters = useQueryStates(chainFilters)

  return (
    <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:flex lg:w-64 lg:flex-col">
      {children}

      <FiltersCard
        filters={filters}
        id="regions"
        items={regions.map((item) => ({
          icon: item.key ? getIcon(`region.${item.key}`) : null,
          label: item.name,
          value: item.id,
        }))}
        refresh={refresh}
        title={t('regions')}
      />

      <FiltersCard
        filters={filters}
        id="tiers"
        items={orderBy(tiers, ['region', 'tier'], ['desc', 'asc']).map(
          (item) => ({
            after: (
              <>
                <Icon
                  className="size-6"
                  icon={getIcon(`region.${item.region}`)}
                />

                <Icon className="size-6" icon={getIcon(`tier.${item.tier}`)} />
              </>
            ),
            icon: item.icon,
            label: item.name,
            value: item.guid,
          }),
        )}
        refresh={refresh}
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
        refresh={refresh}
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
        refresh={refresh}
        title={t('types')}
      />
    </div>
  )
}
