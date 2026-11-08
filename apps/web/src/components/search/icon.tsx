import { type SearchHit } from '@anno/db/client'

import { getIcon } from '@/lib/icons'

import { Icon } from '../common/icon'
import { ItemIcon } from '../items/icon'

type Props = {
  className?: string
  item: SearchHit
}

export function SearchIcon({ className, item }: Props) {
  if (item.type === 'item') {
    return (
      <ItemIcon className={className} icon={item.icon} rarity={item.rarity} />
    )
  }

  return (
    <Icon
      className={className}
      icon={item.icon ?? getIcon(`ui.${item.type}`)}
    />
  )
}
