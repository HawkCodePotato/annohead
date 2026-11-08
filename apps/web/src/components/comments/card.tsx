import { type Comment } from '@anno/convex'
import { cn } from 'cn'
import { useFormatter, useNow } from 'next-intl'

type Props = {
  className?: string
  comment: Comment
}

export function CommentCard({ className, comment }: Props) {
  const f = useFormatter()
  const now = useNow({
    updateInterval: 60_000,
  })

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-4">
        <div className="text-sm">{comment.user.name}</div>

        <div
          className="text-gray-11 text-sm tabular-nums"
          title={f.dateTime(comment._creationTime, {
            dateStyle: 'medium',
            timeStyle: 'medium',
          })}
        >
          {f.relativeTime(comment._creationTime, {
            now,
            style: 'narrow',
          })}
        </div>
      </div>

      <div>{comment.body}</div>
    </div>
  )
}
