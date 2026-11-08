import { anno } from '@anno/db/client'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { ProductPage } from '@/components/products/page'
import { getId, validateLocale } from '@/lib/validators'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/products/[id]/[slug]'>): Promise<Metadata> {
  const { locale, id } = await params

  const product = await anno.products.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!product) {
    notFound()
  }

  const t = await getTranslations('page.product')

  return {
    title: t('title', {
      name: product.name ?? t('fallback'),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<'/[locale]/products/[id]/[slug]'>) {
  const { locale, id } = await params

  const product = await anno.products.get({
    id: getId(id),
    lang: validateLocale(locale),
  })

  if (!product) {
    notFound()
  }

  return <ProductPage product={product} />
}
