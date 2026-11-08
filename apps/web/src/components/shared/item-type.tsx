import { type Item } from '@anno/db/client'
import { cn } from 'cn'

import { getIcon } from '@/lib/icons'

import { Icon } from '../common/icon'
import { Tooltip } from '../common/tooltip'

type Props = {
  className?: string
  type?: Item['type']
}

export function ItemTypeCard({ className, type }: Props) {
  if (!type || type.key === 'None') {
    return null
  }

  return (
    <Tooltip content={type.name ?? type.key} render={<div />}>
      <Icon
        className={cn('size-6', className)}
        icon={getIcon(`type.${type.key}`)}
      />
    </Tooltip>
  )
}
