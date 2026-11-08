'use client'

import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState, useQueryStates } from 'nuqs'

import { Empty } from '@/components/common/empty'
import { TextBox } from '@/components/common/text-box'
import { type ChainData } from '@/lib/chains'
import { chainFilters } from '@/lib/validators'

import { ChainFiltersCard } from '../filters'
import { Calculator } from './calculator'

type Props = {
  data: ChainData
}

export function AllChains({ data }: Props) {
  const t = useTranslations('component.chains.all')

  const [filters] = useQueryStates(chainFilters)

  const [search, setSearch] = useQueryState(
    'filter',
    parseAsString.withDefault(''),
  )

  const query = search.trim().toLocaleLowerCase()

  const chains = data.chains.filter(
    (chain) =>
      matches(filters.regions, [chain.region?.id]) &&
      matches(filters.dlcs, [chain.dlc?.guid]) &&
      matches(filters.tiers, chain.types) &&
      matches(filters.types, chain.types) &&
      (!query ||
        [
          chain.name,
          chain.product?.name,
          ...chain.nodes.map((node) => node.name),
        ].some((name) => name?.toLocaleLowerCase().includes(query))),
  )

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ChainFiltersCard
          dlcs={data.dlcs}
          refresh={false}
          regions={data.regions}
          tiers={data.tiers}
          types={data.types}
        >
          <TextBox
            className="sm:col-span-2 md:col-span-4"
            onValueChange={async (next) => {
              await setSearch(next)
            }}
            placeholder={t('search')}
            type="search"
            value={search}
          />
        </ChainFiltersCard>

        <div className="flex flex-1 flex-col gap-12">
          {chains.length ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {chains.map((chain) => (
                <Calculator chain={chain} key={chain.guid} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}
        </div>
      </div>
    </div>
  )
}

function matches(
  selected: Array<number> | null,
  values: Array<number | null | undefined>,
) {
  return (
    !selected?.length || selected.some((item) => values.includes(Number(item)))
  )
}
