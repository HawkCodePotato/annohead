import { type Building } from '@anno/db/client'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { Icon } from '../common/icon'
import { DlcCard } from '../shared/dlc'
import { RegionCard } from '../shared/region'

type Props = {
  building: Building
}

export function BuildingCard({ building }: Props) {
  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 relative flex flex-col gap-4 rounded-lg p-4 outline-none focus-visible:ring-2"
      href={getUrl('building', building.guid, building.slug)}
    >
      {building.icon ? <Icon className="size-16" icon={building.icon} /> : null}

      <div className="flex flex-col">
        <div className="font-bold">{building.name}</div>

        {building.category ? (
          <div className="text-gray-11 text-sm">{building.category}</div>
        ) : null}
      </div>

      {building.region?.key || building.dlc?.key ? (
        <div className="absolute top-4 right-4 flex gap-2">
          <RegionCard region={building.region?.key} />

          <DlcCard dlc={building.dlc?.key} />
        </div>
      ) : null}
    </NavLink>
  )
}
