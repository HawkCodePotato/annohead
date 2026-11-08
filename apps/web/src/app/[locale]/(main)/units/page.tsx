import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { UnitList } from '@/components/units/list'
import { parseUnitFilters, validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.units')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
  searchParams,
}: PageProps<'/[locale]/units'>) {
  const { locale } = await params

  const lang = validateLocale(locale)

  const filters = parseUnitFilters(await searchParams)

  const [regions, types, units] = await Promise.all([
    anno.regions.list({
      lang,
    }),
    anno.units.types({
      lang,
    }),
    anno.units.list({
      lang,
      page: filters.page ?? undefined,
      regions: filters.regions ?? undefined,
      types: filters.types ?? undefined,
    }),
  ])

  return (
    <UnitList filters={filters} regions={regions} types={types} units={units} />
  )
}
