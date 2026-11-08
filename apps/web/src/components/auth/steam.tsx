'use client'

import { SteamLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { useTranslations } from 'next-intl'

import { useSteamSignIn } from '@/hooks/auth/steam'

import { Button } from '../common/button'

type Props = {
  next: string
}

export function SteamSignIn({ next }: Props) {
  const t = useTranslations('component.auth.steam')

  const { signIn, isPending } = useSteamSignIn(next)

  return (
    <Button loading={isPending} onClick={signIn} type="button">
      <SteamLogoIcon className="size-6" weight="fill" />

      {t('action.signIn')}
    </Button>
  )
}
