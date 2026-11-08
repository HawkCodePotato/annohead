import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { mutation } from '../_generated/server'

export const create = mutation({
  args: {
    body: v.string(),
    guid: v.number(),
  },
  async handler(ctx, args) {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    await ctx.db.insert('comments', {
      body: args.body,
      guid: args.guid,
      userId,
    })
  },
})
