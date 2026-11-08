import { type ReactNode } from 'react'

import { getIcon } from '@/lib/icons'

import { Icon } from './icon'

export const emptyIcon = {
  icon: getIcon('ui.notFound'),
  size: 256,
}

type Props = {
  children: ReactNode
}

export function Empty({ children }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <Icon className="size-32" icon={emptyIcon.icon} size={emptyIcon.size} />

      <p className="font-bold">{children}</p>
    </div>
  )
}
