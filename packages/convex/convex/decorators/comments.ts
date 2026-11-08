import { compact, uniq } from 'lodash'

import { type Doc } from '../_generated/dataModel'
import { type QueryCtx } from '../_generated/server'

type DecorateCommentsProps = {
  ctx: QueryCtx
  comments: Array<Doc<'comments'>>
}

export async function decorateComments({
  ctx,
  comments,
}: DecorateCommentsProps) {
  const userIds = uniq(comments.map((comment) => comment.userId))

  const users = compact(
    await Promise.all(userIds.map((id) => ctx.db.get('users', id))),
  )

  const usersById = new Map(users.map((user) => [user._id, user]))

  return comments.map(({ userId, guid, ...comment }) => {
    const user = usersById.get(userId)

    return {
      ...comment,
      user: {
        id: user?._id ?? userId,
        name: user?.username ?? null,
      },
    }
  })
}

export type Comment = Awaited<ReturnType<typeof decorateComments>>[number]
