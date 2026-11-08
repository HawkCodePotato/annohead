import { type ReactNode } from 'react'

import { Logo } from '@/components/common/logo'
import { NavLink } from '@/intl/nav'

type Props = {
  children: ReactNode
}

export function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12">
      <NavLink
        className="ring-accent-8 ring-offset-gray-1 rounded-sm ring-offset-8 outline-none focus-visible:ring-2"
        href="/"
      >
        <Logo className="h-8" />
      </NavLink>

      {children}
    </div>
  )
}
