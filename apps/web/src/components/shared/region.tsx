import { type Region } from '@anno/db/enums'
import { cn } from 'cn'
import { useTranslations } from 'next-intl'
import { type ReactElement } from 'react'

import { getIcon } from '@/lib/icons'

import { Icon } from '../common/icon'
import { Tooltip } from '../common/tooltip'

type Props = {
  className?: string
  region?: Region | null
  render?: ReactElement
}

export function RegionCard({ className, region, render }: Props) {
  const t = useTranslations('common')

  if (!region) {
    return null
  }

  return (
    <Tooltip content={t(`region.${region}`)} render={render ?? <div />}>
      <Icon
        className={cn('size-6', className)}
        icon={getIcon(`region.${region}`)}
      />
    </Tooltip>
  )
}
