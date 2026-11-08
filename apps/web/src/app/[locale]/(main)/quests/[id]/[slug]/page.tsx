import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { QuestPage } from '@/components/quests/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/quests/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const quest = await anno.quests.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!quest) {
    notFound()
  }

  const t = await getTranslations('page.quest')

  return {
    title: t('title', {
      name: quest.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/quests/[id]/[slug]'>) {
  const { locale, id } = await params

  const quest = await anno.quests.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!quest) {
    notFound()
  }

  return <QuestPage quest={quest} />
}
