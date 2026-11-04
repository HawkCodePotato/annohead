'use client'

import {
  UserCircleDashedIcon,
  UserCircleIcon,
} from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'

import { Spinner } from '@/components/common/spinner'
import { NavLink } from '@/intl/nav'

type Props = {
  className?: string
}

export function AuthProfile({ className }: Props) {
  return (
    <div
      className={cn(
        'ring-accent-8 flex size-10 shrink-0 items-center justify-center rounded-lg outline-none focus-within:ring-2 focus-visible:ring-2',
        className,
      )}
    >
      <AuthLoading>
        <Spinner className="size-6" />
      </AuthLoading>

      <Authenticated>
        <NavLink className="outline-none" href="/auth/profile">
          <UserCircleIcon className="size-6" />
        </NavLink>
      </Authenticated>

      <Unauthenticated>
        <NavLink className="outline-none" href="/auth/sign-in">
          <UserCircleDashedIcon className="size-6" />
        </NavLink>
      </Unauthenticated>
    </div>
  )
}
