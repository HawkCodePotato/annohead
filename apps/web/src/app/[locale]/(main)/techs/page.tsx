import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { TechTree } from '@/components/technologies/tree'
import { validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.technologies')

  return {
    title: t('title'),
  }
}

export default async function Page({ params }: PageProps<'/[locale]/techs'>) {
  const { locale } = await params

  const lang = validateLocale(locale)

  const [categories, techs] = await Promise.all([
    anno.techs.categories({
      lang,
    }),
    anno.techs.list({
      lang,
    }),
  ])

  return <TechTree categories={categories} techs={techs} />
}
