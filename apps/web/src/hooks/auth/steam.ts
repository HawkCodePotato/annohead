import { api } from '@anno/convex'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { useLocale } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { getPathname, useRouter } from '@/intl/nav'
import { getSafeNext } from '@/lib/url'

const stateKey = 'steam-openid-state'
const nextKey = 'steam-openid-next'

const identifierSelect = 'http://specs.openid.net/auth/2.0/identifier_select'

export function useSteamSignIn(next: string) {
  const locale = useLocale()

  const [isPending, setPending] = useState(false)

  // coming back from Steam with the back button restores this page from bfcache, still pending
  useEffect(() => {
    function reset() {
      setPending(false)
    }

    window.addEventListener('pageshow', reset)

    return () => {
      window.removeEventListener('pageshow', reset)
    }
  }, [])

  function signIn() {
    setPending(true)

    // ties the response to this browser so a forwarded link can't sign us in
    const state = crypto.randomUUID()

    sessionStorage.setItem(stateKey, state)
    sessionStorage.setItem(nextKey, next)

    const returnTo = new URL(
      getPathname({ href: '/auth/steam', locale }),
      window.location.origin,
    )

    returnTo.searchParams.set('state', state)

    const url = new URL('https://steamcommunity.com/openid/login')

    url.search = new URLSearchParams({
      'openid.claimed_id': identifierSelect,
      'openid.identity': identifierSelect,
      'openid.mode': 'checkid_setup',
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.realm': window.location.origin,
      'openid.return_to': returnTo.href,
    }).toString()

    window.location.assign(url)
  }

  return { isPending, signIn }
}

// Steam sends the user back to /auth/steam with the assertion
export function useSteamCallback() {
  const router = useRouter()

  const { setSession } = useAuthActions()

  const signInWithSteam = useAction(api.auth.signInWithSteam)

  const started = useRef(false)

  const { mutate, isError } = useMutation({
    async mutationFn(search: Record<string, string>) {
      const state = sessionStorage.getItem(stateKey)
      const next = getSafeNext(sessionStorage.getItem(nextKey))

      sessionStorage.removeItem(stateKey)
      sessionStorage.removeItem(nextKey)

      if (!state || search.state !== state) {
        throw new Error('Steam sign in state mismatch')
      }

      const params = Object.fromEntries(
        Object.entries(search).filter(([key]) => key.startsWith('openid.')),
      )

      const result = await signInWithSteam({
        params,
      })

      if (result.status === 'error') {
        throw new Error(result.userError.error)
      }

      await setSession(result.tokens)

      return next
    },
    onSuccess(next) {
      router.replace(next)
    },
  })

  useEffect(() => {
    // the assertion nonce is single use, so this must only run once
    if (started.current) {
      return
    }

    started.current = true

    const search = Object.fromEntries(
      new URLSearchParams(window.location.search),
    )

    window.history.replaceState(null, '', window.location.pathname)

    mutate(search)
  }, [mutate])

  return { isError }
}
