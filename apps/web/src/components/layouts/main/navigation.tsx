'use client'

import { cn } from 'cn'
import { useTranslations } from 'next-intl'

import { NavLink, usePathname } from '@/intl/nav'
import { navigation } from '@/lib/url'

type Props = {
  className?: string
}

export function Navigation({ className }: Props) {
  const path = usePathname()

  const t = useTranslations('component.layouts.main.nav')

  return (
    <nav
      className={cn(
        'flex items-center text-nowrap lg:justify-center',
        className,
      )}
    >
      {navigation.map((section) => (
        <NavLink
          className={cn(
            'ring-accent-8 hover:bg-accent-4 flex h-10 items-center rounded-lg px-3 leading-tight font-medium transition-colors outline-none focus-visible:ring-2',
            path.startsWith(section.href) && 'text-accent-11',
          )}
          href={section.href}
          key={section.key}
        >
          {t(section.key)}
        </NavLink>
      ))}
    </nav>
  )
}
