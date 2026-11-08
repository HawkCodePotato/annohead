'use client'

import { useTranslations } from 'next-intl'

import { Spinner } from '@/components/common/spinner'
import { useSteamCallback } from '@/hooks/auth/steam'
import { NavLink } from '@/intl/nav'

export default function Page() {
  const t = useTranslations('component.auth')

  const { isError } = useSteamCallback()

  if (!isError) {
    return <Spinner className="size-8 animate-spin" />
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-red-11">{t('steam.error')}</p>

      <NavLink href="/auth/sign-in">{t('signIn.action.submit')}</NavLink>
    </div>
  )
}
