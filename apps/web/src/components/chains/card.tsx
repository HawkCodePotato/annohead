import { type Chain } from '@anno/db/client'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { Icon } from '../common/icon'
import { DlcCard } from '../shared/dlc'
import { RegionCard } from '../shared/region'

type Props = {
  chain: Chain
}

export function ChainCard({ chain }: Props) {
  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 relative flex flex-col gap-4 rounded-lg p-4 outline-none focus-visible:ring-2"
      href={getUrl('chain', chain.guid, chain.slug)}
    >
      {chain.icon ? <Icon className="size-16" icon={chain.icon} /> : null}

      <div className="font-bold">{chain.name}</div>

      {chain.region?.key || chain.dlc?.key ? (
        <div className="absolute top-4 right-4 flex gap-2">
          <RegionCard region={chain.region?.key} />

          <DlcCard dlc={chain.dlc?.key} />
        </div>
      ) : null}
    </NavLink>
  )
}
