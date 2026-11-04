import { parseISO } from 'date-fns'
import { type Metadata } from 'next'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { Logo } from '@/components/common/logo'
import { Navigation } from '@/components/layouts/main/navigation'
import { SearchBox } from '@/components/search/box'
import { routing } from '@/intl'
import { flags } from '@/intl/data'
import { NavLink } from '@/intl/nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('page.landing')

  return {
    description: t('description'),
    title: t('title'),
  }
}

export default function Home() {
  const t = useTranslations('page.landing')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <NavLink
        className="ring-accent-8 ring-offset-gray-1 flex items-center gap-4 rounded-sm ring-offset-8 outline-none focus-visible:ring-2"
        href="/"
      >
        <Logo className="h-8" />

        <h1 className="text-2xl">{t('annohead')}</h1>
      </NavLink>

      <Suspense>
        <SearchBox
          className="w-xl max-w-full"
          inputClassName="rounded-full not-data-list-empty:data-popup-open:rounded-t-lg"
        />
      </Suspense>

      <Navigation className="flex-wrap justify-center" />

      <div className="flex flex-wrap justify-center gap-4">
        {routing.locales.map((item) => (
          <NavLink
            className="ring-accent-8 hover:bg-accent-4 flex rounded-full leading-tight ring-offset-2 ring-offset-white transition-colors outline-none focus-visible:ring-2 dark:ring-offset-black"
            href={item}
            key={item}
          >
            <Image
              alt={item}
              className="size-6"
              height={16}
              src={`https://flags.willa.app/flags/${flags[item]}.svg`}
              unoptimized
              width={16}
            />
          </NavLink>
        ))}
      </div>

      <div className="text-gray-11 flex flex-wrap justify-center gap-4 text-sm">
        <div className="tabular-nums">
          {t('updated', {
            updated: parseISO(process.env.LAST_UPDATED),
          })}
        </div>

        <NavLink
          className="ring-accent-8 hover:text-gray-12 rounded-sm outline-none focus-visible:ring-2"
          href="/changelog"
        >
          {t('changelog')}
        </NavLink>
      </div>
    </main>
  )
}
