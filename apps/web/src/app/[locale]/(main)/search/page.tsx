import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { SearchPage } from '@/components/search/page'
import { parseSearchFilters, validateLocale } from '@/lib/validators'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.search')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
  searchParams,
}: PageProps<'/[locale]/search'>) {
  const { locale } = await params

  const filters = await parseSearchFilters(searchParams)

  const data = await anno.search({
    lang: validateLocale(locale),
    page: filters.page ?? undefined,
    query: filters.query,
    types: filters.types ?? undefined,
  })

  return <SearchPage data={data} filters={filters} />
}
