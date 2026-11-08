import { getAuthUserId } from '@convex-dev/auth/server'

import { query } from '../_generated/server'

export const profile = query({
  args: {},
  async handler(ctx) {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    return await ctx.db.get('users', userId)
  },
})
