import { Button, type ButtonProps } from '@base-ui/react/button'
import { cn } from 'cn'

import { Spinner } from './spinner'

type Props = ButtonProps & {
  loading?: boolean
}

export function IconButton({
  children,
  className,
  disabled,
  loading,
  ...props
}: Props) {
  return (
    <Button
      {...props}
      className={cn(
        'bg-accent-9 text-accent-contrast outline-accent-8 enabled:active:bg-accent-9 enabled:hover:bg-accent-10 relative flex size-10 items-center justify-center overflow-hidden rounded-lg outline-offset-4',
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
    </Button>
  )
}
