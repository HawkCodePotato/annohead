import { type Ornament } from '@anno/db/client'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { Icon } from '../common/icon'
import { DlcCard } from '../shared/dlc'
import { RegionCard } from '../shared/region'

type Props = {
  ornament: Ornament
}

export function OrnamentCard({ ornament }: Props) {
  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 relative flex flex-col gap-4 rounded-lg p-4 outline-none focus-visible:ring-2"
      href={getUrl('ornament', ornament.guid, ornament.slug)}
    >
      {ornament.icon ? <Icon className="size-16" icon={ornament.icon} /> : null}

      <div className="flex flex-col">
        <div className="font-bold">{ornament.name}</div>

        {ornament.types[0] ? (
          <div className="text-gray-11 text-sm">{ornament.types[0].name}</div>
        ) : null}
      </div>

      {ornament.region?.key || ornament.dlc?.key ? (
        <div className="absolute top-4 right-4 flex gap-2">
          <RegionCard region={ornament.region?.key} />

          <DlcCard dlc={ornament.dlc?.key} />
        </div>
      ) : null}
    </NavLink>
  )
}
