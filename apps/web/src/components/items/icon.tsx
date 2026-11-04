import { type Rarity } from '@anno/db/enums'
import { cn } from 'cn'

import { Icon } from '../common/icon'

type Props = {
  className?: string
  icon: string | null
  rarity?: Rarity | null
}

export function ItemIcon({ className, icon, rarity }: Props) {
  if (
    !(icon?.includes('items_specialist') || icon?.includes('item_specialist'))
  ) {
    return icon ? <Icon className={className} icon={icon} /> : null
  }

  const backgroundColor = rarity
    ? rarity === 'Common'
      ? undefined
      : colors[rarity]
    : undefined

  return (
    <div className={cn('relative size-16', className)}>
      <div
        className={cn(
          'pointer-events-none absolute size-full bg-black mask-[url(/img/anno/bg_item_villa_0.png)] mask-contain mask-center mask-no-repeat dark:bg-white',
          className,
        )}
        style={{
          backgroundColor,
        }}
      />

      {icon ? (
        <Icon className="absolute bottom-1 size-full" icon={icon} />
      ) : null}
    </div>
  )
}

const colors: Record<Rarity, string> = {
  Common: '#ffffff',
  Epic: '#a563a7',
  Legendary: '#c76937',
  Mythic: '#f0a418',
  Quest: '#4a3860',
  Rare: '#3e5496',
  Unique: '#d4d406',
}
