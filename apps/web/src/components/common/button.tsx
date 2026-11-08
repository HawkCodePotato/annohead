import { type ButtonProps, Button as Component } from '@base-ui/react/button'
import { cn } from 'cn'

import { Spinner } from './spinner'

type Props = ButtonProps & {
  loading?: boolean
}

export function Button({
  children,
  className,
  disabled,
  loading,
  ...props
}: Props) {
  return (
    <Component
      {...props}
      className={cn(
        'bg-accent-9 text-accent-contrast outline-accent-8 enabled:active:bg-accent-9 enabled:hover:bg-accent-10 relative flex h-10 items-center justify-center gap-3 overflow-hidden rounded-lg px-3 font-bold outline-offset-4',
        loading && 'cursor-progress',
        className,
      )}
      disabled={disabled || loading}
    >
      {children}

      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center bg-inherit">
          <Spinner className="size-4" />
        </span>
      ) : null}
    </Component>
  )
}
