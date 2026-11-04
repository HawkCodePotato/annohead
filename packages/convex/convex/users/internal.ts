import { v } from 'convex/values'
import { customAlphabet } from 'nanoid'

import { components, internal } from '../_generated/api'
import { internalMutation, type MutationCtx } from '../_generated/server'

export const createWithPassword = internalMutation({
  args: {
    provider: v.object({
      accountId: v.string(),
      name: v.literal('password'),
      profile: v.object({}),
    }),
  },
  async handler(ctx) {
    const userId = await ctx.db.insert('users', {})

    // the password method stores the username after this returns, so copy it once the sign up commits
    await ctx.scheduler.runAfter(0, internal.users.internal.syncUsername, {
      userId,
    })

    return userId
  },
})

export const syncUsername = internalMutation({
  args: {
    userId: v.id('users'),
  },
  async handler(ctx, args) {
    const username = await ctx.runQuery(
      components.authUsername.public.getUsername,
      {
        userId: args.userId,
      },
    )

    if (username) {
      await ctx.db.patch('users', args.userId, { username })
    }
  },
})

export const createWithSteam = internalMutation({
  args: {
    provider: v.object({
      accountId: v.string(),
      name: v.literal('steam'),
      profile: v.object({
        username: v.string(),
      }),
    }),
  },
  async handler(ctx, args) {
    let username = await findFreeUsername(ctx, args.provider.profile.username)

    const userId = await ctx.db.insert('users', {})

    // registered with the username component so password sign ups see it too
    let result = await ctx.runMutation(
      components.authUsername.public.setUsername,
      {
        userId,
        username,
      },
    )

    // fall back to the Steam id for names the username component rejects
    if (!result.success) {
      username = args.provider.accountId

      result = await ctx.runMutation(
        components.authUsername.public.setUsername,
        {
          userId,
          username,
        },
      )
    }

    if (!result.success) {
      throw new Error(`Could not set username: ${result.userError.error}`)
    }

    await ctx.db.patch('users', userId, { username })

    return userId
  },
})

// Steam names aren't unique, so a taken one gets a random suffix: name_k3x9
const suffix = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4)

async function findFreeUsername(ctx: MutationCtx, name: string) {
  let username = name

  while (
    // biome-ignore lint/performance/noAwaitInLoops: each check depends on the last
    await ctx.runQuery(components.authUsername.public.getUserIdByUsername, {
      username,
    })
  ) {
    username = `${name}_${suffix()}`
  }

  return username
}
