import { cn } from 'cn'

import { Spinner } from './spinner'

type Props = {
  className?: string
}

export function Loading({ className }: Props) {
  return (
    <div className={cn('flex flex-1 items-center justify-center', className)}>
      <Spinner className="size-8 animate-spin" />
    </div>
  )
}
