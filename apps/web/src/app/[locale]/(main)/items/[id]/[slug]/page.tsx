import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { ItemPage } from '@/components/items/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/items/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const item = await anno.items.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!item) {
    notFound()
  }

  const t = await getTranslations('page.item')

  return {
    description: item.description,
    title: t('title', {
      name: item.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/items/[id]/[slug]'>) {
  const { locale, id } = await params

  const item = await anno.items.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!item) {
    notFound()
  }

  return <ItemPage item={item} />
}
