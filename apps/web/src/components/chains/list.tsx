import {
  type Chains,
  type ChainTiers,
  type ChainTypes,
  type Dlcs,
  type Regions,
} from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type ChainFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { ChainCard } from './card'
import { ChainFiltersCard } from './filters'

type Props = {
  chains: Chains
  dlcs: Dlcs
  filters: ChainFilters
  types: ChainTypes
  regions: Regions
  tiers: ChainTiers
}

export function ChainList({
  chains,
  dlcs,
  filters,
  types,
  regions,
  tiers,
}: Props) {
  const t = useTranslations('component.chains.list')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ChainFiltersCard
          dlcs={dlcs}
          regions={regions}
          tiers={tiers}
          types={types}
        />

        <div className="flex flex-1 flex-col gap-12">
          {chains.rows.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
              {chains.rows.map((chain) => (
                <ChainCard chain={chain} key={chain.guid} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}

          <Pagination page={filters.page} pages={chains.pages} />
        </div>
      </div>
    </div>
  )
}
