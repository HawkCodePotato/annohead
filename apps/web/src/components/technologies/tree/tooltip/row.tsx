import { Html } from '@/components/common/html'
import { Icon } from '@/components/common/icon'
import { NavLink } from '@/intl/nav'

type Props = {
  description?: string | null
  href?: string
  icon?: string | null
  name: string | null
}

export function Row({ description, href, icon, name }: Props) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        {icon ? <Icon className="size-6" icon={icon} /> : null}

        <span className="font-bold">{name}</span>
      </div>

      {description ? <Html className="text-sm">{description}</Html> : null}
    </>
  )

  if (!href) {
    return <div className="flex flex-col gap-1">{content}</div>
  }

  return (
    <NavLink
      className="hover:bg-accent-4 -mx-4 -my-2 flex flex-col gap-1 rounded-sm px-4 py-2 transition-colors"
      href={href}
    >
      {content}
    </NavLink>
  )
}
