import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ItemList } from '@/components/items/list'
import { parseItemFilters, validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.items')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
  searchParams,
}: PageProps<'/[locale]/items'>) {
  const { locale } = await params

  const lang = validateLocale(locale)

  const filters = parseItemFilters(await searchParams)

  const [dlcs, types, niches, rarities, items] = await Promise.all([
    anno.dlc.list({
      lang,
      of: 'item',
    }),
    anno.items.types({
      lang,
    }),
    anno.items.niches({
      lang,
    }),
    anno.items.rarities({
      lang,
    }),
    anno.items.list({
      attributes: filters.attributes ?? undefined,
      dlcs: filters.dlcs ?? undefined,
      lang,
      niches: filters.niches ?? undefined,
      page: filters.page ?? undefined,
      rarities: filters.rarities ?? undefined,
      types: filters.types ?? undefined,
    }),
  ])

  return (
    <ItemList
      dlcs={dlcs}
      filters={filters}
      items={items}
      niches={niches}
      rarities={rarities}
      types={types}
    />
  )
}
