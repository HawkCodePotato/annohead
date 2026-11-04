import { type Techs } from '@anno/db/client'
import { Popover } from '@base-ui/react/popover'
import { type Node, type NodeProps } from '@xyflow/react'
import { cn } from 'cn'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { Icon } from '../../common/icon'
import { CenterHandles } from './handle'
import { techPopover } from './tooltip/popover'

export type TechNode = Node<
  {
    tech: Techs[number]
  },
  'tech'
>

export function TechTreeNode({ data: { tech } }: NodeProps<TechNode>) {
  return (
    <>
      <CenterHandles />

      <Popover.Trigger
        closeDelay={0}
        delay={0}
        handle={techPopover}
        nativeButton={false}
        openOnHover
        payload={{
          kind: 'tech',
          tech,
        }}
        render={
          <NavLink
            className={cn(
              'ring-accent-8 hover:bg-accent-4 flex size-full items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2',
              tech.isGate ? 'bg-gray-5' : 'bg-gray-3',
            )}
            href={getUrl('tech', tech.guid, tech.slug)}
          />
        }
      >
        {tech.icon ? <Icon className="size-12" icon={tech.icon} /> : null}
      </Popover.Trigger>
    </>
  )
}
