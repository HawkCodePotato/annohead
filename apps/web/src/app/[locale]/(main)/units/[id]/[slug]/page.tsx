import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { UnitPage } from '@/components/units/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/units/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const unit = await anno.units.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!unit) {
    notFound()
  }

  const t = await getTranslations('page.unit')

  return {
    title: t('title', {
      name: unit.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/units/[id]/[slug]'>) {
  const { locale, id } = await params

  const unit = await anno.units.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!unit) {
    notFound()
  }

  return <UnitPage unit={unit} />
}
