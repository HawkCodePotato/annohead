import { type SignInComplete, type SignInError } from '@convex-dev/auth'
import { setupUsernamePassword } from '@convex-dev/auth/methods/username-password/server'
import { setupConvexAuth } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { components, internal } from './_generated/api'
import { getSteamPersonaName, verifySteamAssertion } from './lib/steam'

const core = setupConvexAuth({
  component: components.auth,
})

export const { signOut, refreshSession, isAuthenticated } = core

export const {
  signUpWithUsernamePassword,
  signInWithUsernamePassword,
  changePassword,
} = setupUsernamePassword(core, {
  component: components.authPasswordProvider,
  usernameComponent: components.authUsername,
}).attachUserCallbacks({
  createUser: internal.users.internal.createWithPassword,
})

type SteamProfile = { username: string }

type SteamResult = SignInComplete | SignInError<{ error: 'INVALID_ASSERTION' }>

// bindProvider is internal in the beta, its types come from the convex-auth-internal-types condition in tsconfig
// the annotations break the type cycle through internal.users
const steam: ReturnType<typeof core.bindProvider<'steam', SteamProfile>> =
  core.bindProvider({
    createUser: internal.users.internal.createWithSteam,
    name: 'steam',
  })

export const signInWithSteam = steam.authAction({
  args: {
    params: v.record(v.string(), v.string()),
  },
  async handler(ctx, args): Promise<SteamResult> {
    const steamId = await verifySteamAssertion(args.params)

    if (!steamId) {
      return {
        status: 'error',
        userError: { error: 'INVALID_ASSERTION' },
      }
    }

    const profile = {
      username: await getSteamPersonaName(steamId),
    }

    const userId = await ctx.convexAuth.resolveUserId(steamId)

    const tokens = userId
      ? await ctx.convexAuth.completeSignIn({
          profile,
          providerAccountId: steamId,
        })
      : await ctx.convexAuth.completeSignUp({
          profile,
          providerAccountId: steamId,
        })

    return { status: 'complete', tokens }
  },
})
