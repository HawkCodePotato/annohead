import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import { query } from '../_generated/server'
import { decorateComments } from '../decorators/comments'

export const list = query({
  args: {
    guid: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  async handler(ctx, args) {
    const comments = await ctx.db
      .query('comments')
      .withIndex('by_guid', (q) => q.eq('guid', args.guid))
      .order('desc')
      .paginate(args.paginationOpts)

    return {
      ...comments,
      page: await decorateComments({
        comments: comments.page,
        ctx,
      }),
    }
  },
})
