import { type AuthConfig } from 'convex/server'

const url = process.env.CONVEX_SITE_URL

if (!url) {
  throw new Error('CONVEX_SITE_URL not found')
}

export default {
  providers: [
    {
      algorithm: 'RS256',
      applicationID: 'convex',
      issuer: url,
      jwks: `${url}/auth/.well-known/jwks.json`,
      type: 'customJwt',
    },
  ],
} satisfies AuthConfig
