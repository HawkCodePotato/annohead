import { type Chain } from '@anno/db/client'

import { CommentList } from '../comments/list'
import { Icon } from '../common/icon'
import { DlcCard } from '../shared/dlc'
import { RegionCard } from '../shared/region'
import { Calculator } from './calculator'
import { ProductionChain } from './production'

type Props = {
  chain: Chain
}

export function ChainPage({ chain }: Props) {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          {chain.region?.key || chain.dlc?.key ? (
            <div className="flex gap-4">
              <RegionCard region={chain.region?.key} />

              <DlcCard dlc={chain.dlc?.key} />
            </div>
          ) : null}

          <h1 className="text-4xl leading-tight">{chain.name}</h1>
        </div>

        {chain.icon ? (
          <Icon className="size-50 lg:size-32" icon={chain.icon} />
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Calculator chain={chain} />

        <ProductionChain chain={chain} />
      </div>

      <CommentList guid={chain.guid} />
    </div>
  )
}
