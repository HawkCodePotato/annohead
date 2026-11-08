import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { BuildingList } from '@/components/buildings/list'
import { parseBuildingFilters, validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.buildings')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
  searchParams,
}: PageProps<'/[locale]/buildings'>) {
  const { locale } = await params

  const lang = validateLocale(locale)

  const filters = parseBuildingFilters(await searchParams)

  const [dlcs, regions, tiers, types, buildings] = await Promise.all([
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
    anno.buildings.types({
      lang,
    }),
    anno.buildings.list({
      dlcs: filters.dlcs ?? undefined,
      lang,
      page: filters.page ?? undefined,
      regions: filters.regions ?? undefined,
      tiers: filters.tiers ?? undefined,
      types: filters.types ?? undefined,
    }),
  ])

  return (
    <BuildingList
      buildings={buildings}
      dlcs={dlcs}
      filters={filters}
      regions={regions}
      tiers={tiers}
      types={types}
    />
  )
}
