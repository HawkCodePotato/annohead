import { type Dlc } from '@anno/db/enums'
import { cn } from 'cn'
import { useTranslations } from 'next-intl'

import { getIcon } from '@/lib/icons'

import { Icon } from '../common/icon'
import { Tooltip } from '../common/tooltip'

type Props = {
  className?: string
  dlc?: Dlc | null
}

export function DlcCard({ className, dlc }: Props) {
  const t = useTranslations('common')

  if (!dlc) {
    return null
  }

  return (
    <Tooltip content={t(`dlc.${dlc}`)} render={<div />}>
      <Icon className={cn('size-6', className)} icon={getIcon(`dlc.${dlc}`)} />
    </Tooltip>
  )
}
