import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { OrnamentPage } from '@/components/ornaments/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/ornaments/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const ornament = await anno.ornaments.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!ornament) {
    notFound()
  }

  const t = await getTranslations('page.ornament')

  return {
    title: t('title', {
      name: ornament.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/ornaments/[id]/[slug]'>) {
  const { locale, id } = await params

  const ornament = await anno.ornaments.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!ornament) {
    notFound()
  }

  return <OrnamentPage ornament={ornament} />
}
