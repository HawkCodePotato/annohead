import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { TechnologyPage } from '@/components/technologies/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/techs/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const tech = await anno.techs.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!tech) {
    notFound()
  }

  const t = await getTranslations('page.technology')

  return {
    description: tech.description,
    title: t('title', {
      name: tech.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/techs/[id]/[slug]'>) {
  const { locale, id } = await params

  const tech = await anno.techs.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!tech) {
    notFound()
  }

  return <TechnologyPage tech={tech} />
}
