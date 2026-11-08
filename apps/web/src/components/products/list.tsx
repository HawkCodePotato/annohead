import {
  type Dlcs,
  type PopulationTiers,
  type Products,
  type ProductTypes,
  type Regions,
} from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type ProductFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { ProductCard } from './card'
import { ProductFiltersCard } from './filters'

type Props = {
  dlcs: Dlcs
  filters: ProductFilters
  types: ProductTypes
  products: Products
  regions: Regions
  tiers: PopulationTiers
}

export function ProductList({
  dlcs,
  filters,
  types,
  products,
  regions,
  tiers,
}: Props) {
  const t = useTranslations('component.products.list')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ProductFiltersCard
          dlcs={dlcs}
          regions={regions}
          tiers={tiers}
          types={types}
        />

        <div className="flex flex-1 flex-col gap-12">
          {products.rows.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
              {products.rows.map((product) => (
                <ProductCard key={product.guid} product={product} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}

          <Pagination page={filters.page} pages={products.pages} />
        </div>
      </div>
    </div>
  )
}
