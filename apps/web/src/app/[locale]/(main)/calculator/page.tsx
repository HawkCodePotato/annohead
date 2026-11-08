import { type Metadata } from 'next'
import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'

import { AllChains } from '@/components/chains/all'
import { fetchChainData } from '@/lib/chains'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.calculator')

  return {
    title: t('title'),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/calculator'>) {
  await connection()

  const { locale } = await params

  const data = await fetchChainData(locale)

  return <AllChains data={data} />
}
