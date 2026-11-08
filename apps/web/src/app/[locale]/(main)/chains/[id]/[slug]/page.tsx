import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { ChainPage } from '@/components/chains/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/chains/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const chain = await anno.chains.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!chain) {
    notFound()
  }

  const t = await getTranslations('page.chain')

  return {
    title: t('title', {
      name: chain.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/chains/[id]/[slug]'>) {
  const { locale, id } = await params

  const chain = await anno.chains.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!chain) {
    notFound()
  }

  return <ChainPage chain={chain} />
}
