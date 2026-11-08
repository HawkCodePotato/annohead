import { type TechCategories } from '@anno/db/client'
import { Popover } from '@base-ui/react/popover'
import { type Node, type NodeProps } from '@xyflow/react'

import { Icon } from '../../common/icon'
import { CenterHandles } from './handle'
import { HUB_SIZE } from './helpers'
import { techPopover } from './tooltip/popover'

export type HubNode = Node<
  {
    category: TechCategories[number]
  },
  'hub'
>

export function TechHubNode({ data: { category } }: NodeProps<HubNode>) {
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
          category,
          kind: 'category',
        }}
        render={
          <div className="bg-gray-3 relative size-full overflow-hidden rounded-full outline-hidden" />
        }
      >
        {category.artwork ? (
          <Icon
            className="size-full object-cover"
            icon={category.artwork}
            size={HUB_SIZE}
          />
        ) : null}

        <div className="bg-gray-3/90 absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 pt-2 pb-5">
          <div className="text-sm font-bold">{category.name}</div>

          {category.icon ? (
            <Icon className="size-8" icon={category.icon} />
          ) : null}
        </div>
      </Popover.Trigger>
    </>
  )
}
