import { validateUsernameFormat } from '@convex-dev/auth/username/validation'

import { env } from '../_generated/server'

// Steam only speaks OpenID 2.0, so we verify its assertion ourselves
// https://partner.steamgames.com/doc/features/auth#website

const endpoint = 'https://steamcommunity.com/openid/login'

const claimedIdPattern =
  /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/u

const requiredSigned = [
  'op_endpoint',
  'claimed_id',
  'identity',
  'return_to',
  'response_nonce',
]

const maxNonceAgeMs = 5 * 60 * 1000

export async function verifySteamAssertion(
  params: Record<string, string>,
): Promise<string | null> {
  const signed = params['openid.signed']?.split(',') ?? []
  const claimedId = params['openid.claimed_id'] ?? ''
  const returnTo = URL.parse(params['openid.return_to'] ?? '')
  const nonceTime = Date.parse(
    params['openid.response_nonce']?.slice(0, 20) ?? '',
  )

  const steamId = claimedIdPattern.exec(claimedId)?.[1]

  if (
    !steamId ||
    params['openid.mode'] !== 'id_res' ||
    params['openid.op_endpoint'] !== endpoint ||
    params['openid.identity'] !== claimedId ||
    // assertions minted for another site must not sign in here
    returnTo?.origin !== new URL(env.SITE_URL).origin ||
    !requiredSigned.every((field) => signed.includes(field)) ||
    !(Date.now() - nonceTime < maxNonceAgeMs)
  ) {
    return null
  }

  const response = await fetch(endpoint, {
    body: new URLSearchParams({
      ...params,
      'openid.mode': 'check_authentication',
    }),
    method: 'POST',
  })

  const body = await response.text()

  return body.includes('is_valid:true') ? steamId : null
}

export async function getSteamPersonaName(steamId: string): Promise<string> {
  const url = new URL(
    'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
  )

  url.searchParams.set('key', env.STEAM_API_KEY)
  url.searchParams.set('steamids', steamId)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Steam GetPlayerSummaries failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    response: {
      players: Array<{
        personaname: string
      }>
    }
  }

  const name = data.response.players[0]?.personaname.trim() ?? ''

  // fall back to the Steam id for names the username component would reject
  return validateUsernameFormat(name) ? steamId : name
}
