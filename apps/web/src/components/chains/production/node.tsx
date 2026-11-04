'use client'

import { type Chain } from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { NavLink } from '@/intl/nav'
import { getIcon } from '@/lib/icons'
import { getUrl } from '@/lib/url'

import { Icon } from '../../common/icon'
import { Tooltip } from '../../common/tooltip'
import { RegionCard } from '../../shared/region'

type Props = {
  chain: Chain
  node: Chain['nodes'][number]
}

export function ChainNode({ chain, node }: Props) {
  const t = useTranslations('common')

  return (
    <div className="flex items-center justify-end gap-8">
      <div className="flex flex-col gap-8">
        {chain.nodes
          .filter((item) => item.parentId === node.id)
          .map((item) => (
            <ChainNode chain={chain} key={item.guid} node={item} />
          ))}
      </div>

      <Tooltip
        content={node.name ?? ''}
        key={node.guid}
        render={
          <NavLink
            className="bg-gray-3 relative flex size-24 shrink-0 items-center justify-center rounded-full"
            href={getUrl('building', node.guid, node.slug)}
            id={`node-${node.id}`}
          />
        }
      >
        {node.icon ? <Icon icon={node.icon} /> : null}

        {node.needsFuel ? (
          <Tooltip
            content={t('needsFuel')}
            render={
              <div className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-white dark:bg-black" />
            }
          >
            <Icon className="size-6" icon={getIcon('common.coal')} />
          </Tooltip>
        ) : null}

        <RegionCard
          region={node.region?.key}
          render={
            <div className="absolute -top-1 -left-1 flex size-8 items-center justify-center rounded-full bg-white dark:bg-black" />
          }
        />
      </Tooltip>
    </div>
  )
}
