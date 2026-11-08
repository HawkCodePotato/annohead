import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { OrnamentList } from '@/components/ornaments/list'
import { parseOrnamentFilters, validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.ornaments')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
  searchParams,
}: PageProps<'/[locale]/ornaments'>) {
  const { locale } = await params

  const lang = validateLocale(locale)

  const filters = parseOrnamentFilters(await searchParams)

  const [dlcs, regions, types, ornaments] = await Promise.all([
    anno.dlc.list({
      lang,
      of: 'ornament',
    }),
    anno.regions.list({
      lang,
    }),
    anno.ornaments.types({
      lang,
    }),
    anno.ornaments.list({
      dlcs: filters.dlcs ?? undefined,
      lang,
      page: filters.page ?? undefined,
      regions: filters.regions ?? undefined,
      types: filters.types ?? undefined,
    }),
  ])

  return (
    <OrnamentList
      dlcs={dlcs}
      filters={filters}
      ornaments={ornaments}
      regions={regions}
      types={types}
    />
  )
}
