import { Input, type InputProps } from '@base-ui/react/input'
import { cn } from 'cn'

type Props = InputProps

export function TextBox({ className, ...props }: Props) {
  return (
    <Input
      {...props}
      className={cn(
        'bg-gray-3 ring-accent-8 h-10 min-w-3xs rounded-lg px-3 outline-none focus-visible:ring-2',
        className,
      )}
    />
  )
}
