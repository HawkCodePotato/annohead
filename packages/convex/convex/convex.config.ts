import password from '@convex-dev/auth/components/password/convex.config.js'
import username from '@convex-dev/auth/components/username/convex.config.js'
import auth from '@convex-dev/auth/convex.config.js'
import { defineApp } from 'convex/server'
import { v } from 'convex/values'

const app = defineApp({
  env: {
    AUTH_JWKS: v.string(),
    AUTH_PRIVATE_KEY: v.string(),
    SITE_URL: v.string(),
    STEAM_API_KEY: v.string(),
  },
})

app.use(auth, {
  env: {
    AUTH_JWKS: app.env.AUTH_JWKS,
    AUTH_PRIVATE_KEY: app.env.AUTH_PRIVATE_KEY,
  },
  httpPrefix: '/auth',
})

// the beta renamed this component to authPassword, keep the old mount so existing password hashes stay put
app.use(password, { name: 'authPasswordProvider' })
app.use(username)

export default app
