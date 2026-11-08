'use client'

import { Menu } from '@base-ui/react/menu'
import { useAuthActions } from '@convex-dev/auth/react'
import {
  SignOutIcon,
  UserCircleDashedIcon,
  UserCircleIcon,
} from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useTranslations } from 'next-intl'

import { Spinner } from '@/components/common/spinner'
import { NavLink, usePathname } from '@/intl/nav'
import { getAuthHref } from '@/lib/url'

type Props = {
  className?: string
}

export function AuthProfile({ className }: Props) {
  const pathname = usePathname()

  const t = useTranslations('component.auth.profile')

  const { signOut } = useAuthActions()

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
        <Menu.Root>
          <Menu.Trigger className="data-popup-open:bg-gray-3 flex size-10 items-center justify-center rounded-lg outline-none data-popup-open:rounded-b-none">
            <UserCircleIcon className="size-6" />
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner
              align="end"
              className="outline-hidden"
              side="bottom"
            >
              <Menu.Popup className="bg-gray-3 overflow-hidden rounded-tl-lg rounded-b-lg outline-hidden">
                <Menu.Item
                  className="data-highlighted:bg-accent-4 flex items-center gap-2 p-3 text-sm leading-tight font-medium outline-none"
                  onClick={() => signOut()}
                >
                  <SignOutIcon className="size-4" />

                  {t('signOut')}
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </Authenticated>

      <Unauthenticated>
        <NavLink
          className="outline-none"
          href={getAuthHref('/auth/sign-in', pathname)}
        >
          <UserCircleDashedIcon className="size-6" />
        </NavLink>
      </Unauthenticated>
    </div>
  )
}
