'use client'

import { type TechCategories, type Techs } from '@anno/db/client'
import { Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { useMemo } from 'react'

import { CategoryControls } from './controls'
import { hubId, layout } from './helpers'
import { TechHubNode } from './hub'
import { TechTreeNode } from './tech'
import { TechPopover } from './tooltip/popover'

type Props = {
  categories: TechCategories
  techs: Techs
}

export function TechTree({ categories, techs }: Props) {
  const tree = useMemo(() => layout(categories, techs), [categories, techs])

  return (
    <div className="bg-gray-1 relative h-[80vh] overflow-hidden rounded-2xl select-none">
      <ReactFlowProvider>
        <ReactFlow
          defaultEdgeOptions={{
            focusable: false,
            style: {
              stroke: 'var(--color-gray-6)',
              strokeWidth: 3,
            },
            type: 'straight',
          }}
          edges={tree.edges}
          elementsSelectable={false}
          fitView
          fitViewOptions={{
            nodes: tree.hubs.map((hub) => ({
              id: hubId(hub.guid),
            })),
            padding: 0.5,
          }}
          maxZoom={2}
          minZoom={0.2}
          nodes={tree.nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          nodesFocusable={false}
          nodeTypes={{
            hub: TechHubNode,
            tech: TechTreeNode,
          }}
          proOptions={{
            hideAttribution: true,
          }}
          translateExtent={tree.extent}
        >
          <Controls showInteractive={false} />

          <CategoryControls categories={tree.hubs} />
        </ReactFlow>
      </ReactFlowProvider>

      <TechPopover />
    </div>
  )
}
