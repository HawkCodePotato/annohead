import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { BuildingPage } from '@/components/buildings/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/buildings/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const building = await anno.buildings.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!building) {
    notFound()
  }

  const t = await getTranslations('page.building')

  return {
    description: building.description,
    title: t('title', {
      name: building.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/buildings/[id]/[slug]'>) {
  const { locale, id } = await params

  const building = await anno.buildings.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!building) {
    notFound()
  }

  return <BuildingPage building={building} />
}
