'use client'

import {
  type Dlcs,
  type ItemNiches,
  type ItemRarities,
  type ItemTypes,
} from '@anno/db/client'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'

import { getIcon } from '@/lib/icons'
import { itemFilters } from '@/lib/validators'

import { FiltersCard } from '../common/filters'

type Props = {
  types: ItemTypes
  dlcs: Dlcs
  niches: ItemNiches
  rarities: ItemRarities
}

export function ItemFiltersCard({ types, dlcs, niches, rarities }: Props) {
  const t = useTranslations('component.items.filters')

  const filters = useQueryStates(itemFilters)

  return (
    <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:flex lg:w-64 lg:flex-col">
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
          icon: getIcon(`type.${item.key}`),
          label: item.name,
          value: item.key,
        }))}
        title={t('types')}
      />

      <FiltersCard
        filters={filters}
        id="niches"
        items={niches.map((item) => ({
          icon: getIcon(`niche.${item.key}`),
          label: item.name,
          value: item.key,
        }))}
        title={t('niches')}
      />

      <FiltersCard
        filters={filters}
        id="rarities"
        items={rarities.map((item) => ({
          label: item.name,
          value: item.key,
        }))}
        title={t('rarities')}
      />
    </div>
  )
}
