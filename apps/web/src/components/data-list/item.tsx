import { cn } from 'cn'
import { useFormatter } from 'next-intl'
import { type ReactNode } from 'react'

import { Icon } from '../common/icon'

type Props = {
  code?: boolean
  description?: string | null
  icon?: string | null
  name: string | null
  value?: ReactNode | string | number | null
}

export function Item({ code, description, name, icon, value }: Props) {
  const f = useFormatter()

  return (
    <div className="flex items-center justify-between gap-4 rounded-sm py-1">
      <div className="flex flex-1 items-center gap-2">
        {icon ? <Icon className="size-6" icon={icon} /> : null}

        <div className="flex flex-1 flex-col gap-1">
          <div className="text-sm">{name}</div>

          {description ? (
            <div className="text-gray-11 text-xs">{description}</div>
          ) : null}
        </div>
      </div>

      {typeof value === 'string' || typeof value === 'number' ? (
        <div
          className={cn(
            'grow-0 truncate text-sm tabular-nums',
            code && 'font-code',
          )}
        >
          {typeof value === 'number' ? f.number(value) : null}

          {typeof value === 'string' ? value : null}
        </div>
      ) : null}

      {typeof value !== 'string' && typeof value !== 'number' ? value : null}
    </div>
  )
}
