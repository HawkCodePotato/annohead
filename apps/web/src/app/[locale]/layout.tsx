import '@/styles/main.css'

import { Analytics } from '@vercel/analytics/next'
import { cn } from 'cn'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { code, text } from '@/assets/fonts'
import { OfflineCache } from '@/components/offline-cache'
import { Providers } from '@/components/providers'
import { routing } from '@/intl'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({
    locale,
  }))
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations()

  return {
    title: t('annohead'),
  }
}

export default async function Layout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params

  return (
    <html
      className={cn(text.variable, code.variable)}
      lang={locale}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <div className="isolate">{children}</div>

          <OfflineCache />
        </Providers>

        <Analytics />
      </body>
    </html>
  )
}
