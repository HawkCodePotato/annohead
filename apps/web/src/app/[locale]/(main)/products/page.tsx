import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProductList } from '@/components/products/list'
import { parseProductFilters, validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.products')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
  searchParams,
}: PageProps<'/[locale]/products'>) {
  const { locale } = await params

  const lang = validateLocale(locale)

  const filters = parseProductFilters(await searchParams)

  const [dlcs, regions, tiers, types, products] = await Promise.all([
    anno.dlc.list({
      lang,
      of: 'building',
    }),
    anno.regions.list({
      lang,
    }),
    anno.populationTiers.list({
      lang,
    }),
    anno.products.types({
      lang,
    }),
    anno.products.list({
      dlcs: filters.dlcs ?? undefined,
      lang,
      page: filters.page ?? undefined,
      regions: filters.regions ?? undefined,
      tiers: filters.tiers ?? undefined,
      types: filters.types ?? undefined,
    }),
  ])

  return (
    <ProductList
      dlcs={dlcs}
      filters={filters}
      products={products}
      regions={regions}
      tiers={tiers}
      types={types}
    />
  )
}
