import { cn } from 'cn'

type Props = {
  className?: string
}

export function Spinner({ className }: Props) {
  return (
    <div className={cn('@container size-8 animate-spin', className)}>
      <div className="size-full rounded-full border-[10cqw] border-b-transparent" />
    </div>
  )
}
