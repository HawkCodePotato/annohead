import { api } from '@anno/convex'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { useEffect } from 'react'

const stateKey = 'steam-openid-state'

const identifierSelect = 'http://specs.openid.net/auth/2.0/identifier_select'

export function useSteamSignIn() {
  const { setSession } = useAuthActions()

  const signInWithSteam = useAction(api.auth.signInWithSteam)

  const { mutate, isPending, isError } = useMutation({
    async mutationFn(search: Record<string, string>) {
      const state = sessionStorage.getItem(stateKey)

      sessionStorage.removeItem(stateKey)

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
    },
  })

  // Steam sends the user back to the page they started on with the assertion
  useEffect(() => {
    const search = new URLSearchParams(window.location.search)

    if (!search.has('openid.mode')) {
      return
    }

    // the assertion nonce is single use, so drop it before anything can rerun this
    window.history.replaceState(null, '', window.location.pathname)

    mutate(Object.fromEntries(search))
  }, [mutate])

  function signIn() {
    // ties the response to this browser so a forwarded link can't sign us in
    const state = crypto.randomUUID()

    sessionStorage.setItem(stateKey, state)

    const returnTo = new URL(window.location.pathname, window.location.origin)

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

  return { isError, isPending, signIn }
}
