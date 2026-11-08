'use client'

import { useEffect } from 'react'

import { useRouter } from '@/intl/nav'

type Props = {
  href: string
}

export function Redirect({ href }: Props) {
  const router = useRouter()

  useEffect(() => {
    router.push(href)
  }, [href, router.push])

  return null
}
