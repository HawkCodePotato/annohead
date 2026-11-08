'use client'

import { type Chain } from '@anno/db/client'
import { groupBy } from 'lodash'
import Arrow from 'react-xarrows'

import { ChainNode } from './node'

type Props = {
  chain: Chain
}

export function ProductionChain({ chain }: Props) {
  const final = chain.nodes.find((node) => !node.parentId)

  const tiers = Object.keys(groupBy(chain.nodes, 'tier')).length

  return (
    <>
      {final ? (
        <div className="bg-gray-1 relative flex overflow-x-scroll rounded-lg lg:justify-center">
          <div className="absolute">
            {chain.nodes.map((node) =>
              node.parentId ? (
                <Arrow
                  color="var(--color-gray-6)"
                  curveness={0}
                  end={`node-${node.parentId}`}
                  endAnchor="middle"
                  key={node.id}
                  passProps={{
                    pointerEvents: 'none',
                  }}
                  showHead={false}
                  showTail={false}
                  start={`node-${node.id}`}
                  startAnchor="middle"
                />
              ) : null,
            )}
          </div>

          <div
            className="p-4"
            style={{
              width: tiers * 96 + tiers * 32,
            }}
          >
            <ChainNode chain={chain} node={final} />
          </div>
        </div>
      ) : null}
    </>
  )
}
