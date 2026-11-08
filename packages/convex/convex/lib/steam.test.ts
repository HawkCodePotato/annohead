import { expect, mock, test } from 'bun:test'

import { verifySteamAssertion } from './steam'

process.env.SITE_URL = 'https://anno.test'

const steamId = '76561197960287930'

function assertion(overrides: Record<string, string> = {}) {
  return {
    'openid.claimed_id': `https://steamcommunity.com/openid/id/${steamId}`,
    'openid.identity': `https://steamcommunity.com/openid/id/${steamId}`,
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
    'openid.response_nonce': `${new Date().toISOString().slice(0, 19)}Zabc`,
    'openid.return_to': 'https://anno.test/auth/steam?state=x',
    'openid.signed':
      'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    ...overrides,
  }
}

test('a Steam assertion is only trusted once Steam confirms it was meant for us', async () => {
  const steam = mock(async () => new Response('ns:...\nis_valid:true\n'))

  globalThis.fetch = steam as unknown as typeof fetch

  expect(await verifySteamAssertion(assertion())).toBe(steamId)

  const forged: Array<Record<string, string>> = [
    // minted for another site
    { 'openid.return_to': 'https://evil.test/auth/steam' },
    // claimed id not covered by the signature
    { 'openid.signed': 'op_endpoint,identity,return_to,response_nonce' },
    // someone else's identity
    { 'openid.identity': 'https://steamcommunity.com/openid/id/1' },
    { 'openid.claimed_id': 'https://evil.test/openid/id/76561197960287930' },
    { 'openid.op_endpoint': 'https://evil.test/openid/login' },
    { 'openid.mode': 'cancel' },
    // replayed long after it was issued
    { 'openid.response_nonce': '2020-01-01T00:00:00Zabc' },
  ]

  const results = await Promise.all(
    forged.map((overrides) => verifySteamAssertion(assertion(overrides))),
  )

  expect(results).toEqual(forged.map(() => null))

  // only the valid assertion reached Steam
  expect(steam).toHaveBeenCalledTimes(1)

  steam.mockImplementation(async () => new Response('is_valid:false\n'))

  expect(await verifySteamAssertion(assertion())).toBeNull()
})
