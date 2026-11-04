import { type Unit } from '@anno/db/client'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { Icon } from '../common/icon'
import { RegionCard } from '../shared/region'

type Props = {
  unit: Unit
}

export function UnitCard({ unit }: Props) {
  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 relative flex flex-col gap-4 rounded-lg p-4 outline-none focus-visible:ring-2"
      href={getUrl('unit', unit.guid, unit.slug)}
    >
      {unit.icon ? <Icon className="size-16" icon={unit.icon} /> : null}

      <div className="flex flex-col">
        <div className="font-bold">{unit.name}</div>

        {unit.type ? (
          <div className="text-gray-11 text-sm">{unit.type.name}</div>
        ) : null}
      </div>

      {unit.region?.key ? (
        <div className="absolute top-4 right-4 flex gap-2">
          <RegionCard region={unit.region.key} />
        </div>
      ) : null}
    </NavLink>
  )
}
