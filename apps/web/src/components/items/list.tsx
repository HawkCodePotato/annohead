import {
  type Dlcs,
  type ItemNiches,
  type ItemRarities,
  type Items,
  type ItemTypes,
} from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type ItemFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { ItemCard } from './card'
import { ItemFiltersCard } from './filters'

type Props = {
  types: ItemTypes
  dlcs: Dlcs
  filters: ItemFilters
  items: Items
  niches: ItemNiches
  rarities: ItemRarities
}

export function ItemList({
  types,
  dlcs,
  filters,
  items,
  niches,
  rarities,
}: Props) {
  const t = useTranslations('component.items.list')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ItemFiltersCard
          dlcs={dlcs}
          niches={niches}
          rarities={rarities}
          types={types}
        />

        <div className="flex flex-1 flex-col gap-12">
          {items.rows.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
              {items.rows.map((item) => (
                <ItemCard item={item} key={item.guid} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}

          <Pagination page={filters.page} pages={items.pages} />
        </div>
      </div>
    </div>
  )
}
