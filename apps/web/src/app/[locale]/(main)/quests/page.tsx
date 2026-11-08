import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { QuestList } from '@/components/quests/list'
import { parseQuestFilters, validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.quests')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
  searchParams,
}: PageProps<'/[locale]/quests'>) {
  const { locale } = await params

  const lang = validateLocale(locale)

  const filters = parseQuestFilters(await searchParams)

  const [dlcs, regions, quests] = await Promise.all([
    anno.dlc.list({
      lang,
      of: 'questline',
    }),
    anno.regions.list({
      lang,
    }),
    anno.quests.list({
      dlcs: filters.dlcs ?? undefined,
      lang,
      page: filters.page ?? undefined,
      regions: filters.regions ?? undefined,
    }),
  ])

  return (
    <QuestList
      dlcs={dlcs}
      filters={filters}
      quests={quests}
      regions={regions}
    />
  )
}
