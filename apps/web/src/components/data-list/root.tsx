import { cn } from 'cn'
import { type ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  title: string
}

export function Root({ children, className, title }: Props) {
  return (
    <div
      className={cn(
        'bg-gray-1 flex flex-col gap-4 rounded-lg p-4 pb-3',
        className,
      )}
    >
      <div className="text-sm leading-tight font-bold">{title}</div>

      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}
