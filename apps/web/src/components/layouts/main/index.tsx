import { type ReactNode } from 'react'

import { AuthProfile } from '@/components/auth/profile'
import { Logo } from '@/components/common/logo'
import { SearchBox } from '@/components/search/box'
import { NavLink } from '@/intl/nav'

import { LanguageSelector } from './language-selector'
import { Navigation } from './navigation'

type Props = {
  children: ReactNode
}

export function MainLayout({ children }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-12 p-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <NavLink
            className="ring-accent-8 ring-offset-gray-1 hidden shrink-0 rounded-lg ring-offset-4 outline-none focus-visible:ring-2 md:block"
            href="/"
          >
            <Logo className="h-8" />
          </NavLink>

          <Navigation className="-m-1 flex-1 overflow-x-scroll p-1 lg:overflow-x-visible" />

          <LanguageSelector />

          <AuthProfile />
        </div>

        <SearchBox />
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
