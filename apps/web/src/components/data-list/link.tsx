import { useFormatter } from 'next-intl'
import { type ReactNode } from 'react'

import { NavLink } from '@/intl/nav'

import { Icon } from '../common/icon'

type Props = {
  description?: string | null
  /** see `getUrl` */
  href: string
  icon?: string | null
  name: string | null
  value?: ReactNode | string | number | null
}

export function Link({ description, href, icon, name, value }: Props) {
  const f = useFormatter()

  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 -mx-4 flex items-center justify-between gap-4 rounded-sm px-4 py-1 transition-colors outline-none focus-visible:ring-2"
      href={href}
    >
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
        <div className="grow-0 truncate text-sm tabular-nums">
          {typeof value === 'number' ? f.number(value) : null}

          {typeof value === 'string' ? value : null}
        </div>
      ) : null}

      {typeof value !== 'string' && typeof value !== 'number' ? value : null}
    </NavLink>
  )
}
