import { cn } from 'cn'
import Image from 'next/image'

import { getIconUrl } from '@/lib/icons'

type Props = {
  className?: string
  icon: string
  size?: number
}

export function Icon({ className, icon, size = 64 }: Props) {
  return (
    <Image
      alt={icon}
      className={cn(
        'size-16',
        icon.includes('2d') && 'invert dark:invert-0',
        icon.includes('portraits') && 'bg-gray-3 rounded-full',
        className,
      )}
      height={size}
      src={icon.startsWith('/img/') ? icon : getIconUrl(icon)}
      unoptimized={!icon.startsWith('/img/')}
      width={size}
    />
  )
}
