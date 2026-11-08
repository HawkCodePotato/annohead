import { Popover } from '@base-ui/react/popover'

import { Html } from '@/components/common/html'
import { Icon } from '@/components/common/icon'

type Props = {
  description: string | null
  icon: string | null
  subtitle?: string
  title: string | null
}

export function Header({ description, icon, subtitle, title }: Props) {
  return (
    <div className="flex items-center gap-4 p-4">
      {icon ? <Icon className="size-8" icon={icon} /> : null}

      <div className="flex flex-1 flex-col gap-1">
        {subtitle ? (
          <p className="text-gray-11 text-sm font-medium">{subtitle}</p>
        ) : null}

        <Popover.Title className="font-bold">{title}</Popover.Title>

        {description ? (
          <Popover.Description className="text-gray-11 text-sm">
            <Html>{description}</Html>
          </Popover.Description>
        ) : null}
      </div>
    </div>
  )
}
