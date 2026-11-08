'use client'

import { type Quest } from '@anno/db/client'
import { type QuestPicks, walkQuest } from '@anno/db/walk'
import { layout as dagre, Graph } from '@dagrejs/dagre'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr'
import {
  Controls,
  type Edge,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { type BranchNode, QuestBranchNode } from './branch'
import { type ChoiceNode, QuestChoiceNode } from './choice'
import { type OptionNode, QuestOptionNode } from './option'
import { type PartNode, QuestPartNode } from './part'
import {
  choiceId,
  optionId,
  PathContext,
  partId,
  type QuestPath,
  tracePath,
} from './path'

const nodeTypes = {
  branch: QuestBranchNode,
  choice: QuestChoiceNode,
  option: QuestOptionNode,
  part: QuestPartNode,
}

const PADDING = 24
const NODE_GAP = 24
const RANK_GAP = 64
const PART_GAP = 64
const ORIGIN = {
  x: 0,
  y: 0,
}
// room around the chart before panning stops, as on the tech tree
const EXTENT_PADDING = 100

type FlowNode = BranchNode | ChoiceNode | OptionNode | PartNode

type Size = {
  height: number
  width: number
}

function graph(quest: NonNullable<Quest>) {
  const nodes: Array<FlowNode> = []
  const edges: Array<Edge> = []
  const parts = new Set(quest.parts.map((part) => part.guid))

  for (const part of quest.parts) {
    const parentId = partId(part.guid)
    const choices = new Set(part.choices.map((choice) => choice.guid))

    nodes.push({
      data: {
        part,
      },
      id: parentId,
      position: ORIGIN,
      type: 'part',
    })

    for (const choice of part.choices) {
      const source = choiceId(choice.guid)

      nodes.push({
        data: {
          choice,
        },
        id: source,
        parentId,
        position: ORIGIN,
        type: 'choice',
      })

      for (const option of choice.options) {
        const id = optionId(choice.guid, option.idx)
        const node = {
          data: {
            choice: choice.guid,
            option,
          },
          id,
          parentId,
          position: ORIGIN,
        }

        nodes.push(
          choice.kind === 'check'
            ? {
                ...node,
                type: 'branch',
              }
            : {
                ...node,
                type: 'option',
              },
        )

        edges.push({
          id: `${source}:${id}`,
          source,
          target: id,
        })

        if (option.next !== null && choices.has(option.next)) {
          edges.push({
            id: `${id}:${choiceId(option.next)}`,
            source: id,
            target: choiceId(option.next),
          })
        }

        for (const outcome of option.outcomes) {
          if (
            outcome.kind === 'storyline' &&
            outcome.guid !== null &&
            outcome.guid !== part.guid &&
            parts.has(outcome.guid)
          ) {
            edges.push({
              className: 'follow-up',
              id: `${id}:${partId(outcome.guid)}`,
              source: id,
              target: partId(outcome.guid),
            })
          }
        }
      }
    }
  }

  return {
    edges,
    nodes,
  }
}

function layout(nodes: Array<FlowNode>, edges: Array<Edge>) {
  const sizeOf = (node: FlowNode): Size => ({
    height: node.measured?.height ?? 0,
    width: node.measured?.width ?? 0,
  })
  const position = new Map<
    string,
    {
      x: number
      y: number
    }
  >()
  const frame = new Map<string, Size>()

  let left = 0

  for (const part of nodes.filter((node) => node.type === 'part')) {
    const header = sizeOf(part)
    const members = nodes.filter((node) => node.parentId === part.id)
    const ids = new Set(members.map((node) => node.id))

    const chart = new Graph()
    chart.setGraph({
      marginx: PADDING,
      marginy: PADDING,
      nodesep: NODE_GAP,
      rankdir: 'LR',
      ranksep: RANK_GAP,
    })
    chart.setDefaultEdgeLabel(() => ({}))

    for (const member of members) {
      chart.setNode(member.id, sizeOf(member))
    }

    for (const edge of edges) {
      if (ids.has(edge.source) && ids.has(edge.target)) {
        chart.setEdge(edge.source, edge.target)
      }
    }

    dagre(chart, {
      disableOptimalOrderHeuristic: true,
    })

    for (const member of members) {
      const { x, y } = chart.node(member.id)
      const { height, width } = sizeOf(member)

      position.set(member.id, {
        x: x - width / 2,
        y: header.height + y - height / 2,
      })
    }

    const bounds = chart.graph()
    const width = Math.max(header.width, bounds.width ?? 0)

    position.set(part.id, {
      x: left,
      y: 0,
    })
    frame.set(part.id, {
      height: header.height + (members.length ? (bounds.height ?? 0) : PADDING),
      width,
    })

    left += width + PART_GAP
  }

  return nodes.map((node) => ({
    ...node,
    ...frame.get(node.id),
    position: position.get(node.id) ?? node.position,
  }))
}

/** panning stops this far past the parts; members sit inside their part, so parts alone bound the chart */
function extentOf(
  nodes: Array<FlowNode>,
): [[number, number], [number, number]] {
  const parts = nodes.filter((node) => !node.parentId)
  const left = Math.min(...parts.map((node) => node.position.x))
  const top = Math.min(...parts.map((node) => node.position.y))
  const right = Math.max(
    ...parts.map((node) => node.position.x + (node.width ?? 0)),
  )
  const bottom = Math.max(
    ...parts.map((node) => node.position.y + (node.height ?? 0)),
  )

  return [
    [left - EXTENT_PADDING, top - EXTENT_PADDING],
    [right + EXTENT_PADDING, bottom + EXTENT_PADDING],
  ]
}

/** Edges along the picked path stand out, edges into what it rules out fade; the path's jumps between parts are drawn too. */
function pathEdges(
  edges: Array<Edge>,
  path: QuestPath,
  walk: ReturnType<typeof walkQuest>,
): Array<Edge> {
  const jumps = walk.legs.slice(1).map((leg, index) => {
    const previous = walk.legs[index]
    const from = previous?.steps.findLast((step) => step.picked)
    const source = from
      ? optionId(from.choice.guid, from.picked?.idx ?? null)
      : partId(previous?.part.guid ?? 0)
    const target = partId(leg.part.guid)

    return {
      id: `${source}:${target}`,
      source,
      target,
    }
  })
  const ids = new Set(edges.map((edge) => edge.id))

  return [...edges, ...jumps.filter((jump) => !ids.has(jump.id))].map(
    (edge) => {
      if (path.on.has(edge.source) && path.on.has(edge.target)) {
        return {
          ...edge,
          className: 'on-path',
          zIndex: 1,
        }
      }

      if (path.off.has(edge.target) || path.off.has(edge.source)) {
        return {
          ...edge,
          className: 'off-path',
        }
      }

      return edge
    },
  )
}

type Props = {
  quest: NonNullable<Quest>
}

function Flow({ quest }: Props) {
  const t = useTranslations('component.quests.choice')
  const initial = useMemo(() => graph(quest), [quest])
  const [picks, setPicks] = useState<QuestPicks>({})
  const walk = useMemo(() => walkQuest(quest, picks), [quest, picks])
  const path = useMemo(() => tracePath(quest, walk), [quest, walk])
  const edges = useMemo(
    () => pathEdges(initial.edges, path, walk),
    [initial.edges, path, walk],
  )
  const context = useMemo(
    () => ({
      ...path,
      pick: (choice: number, idx: number) =>
        setPicks((current) => ({
          ...current,
          [choice]: idx,
        })),
    }),
    [path],
  )
  // the decision the walk waits on
  const pending = walk.done
    ? null
    : (walk.legs.at(-1)?.steps.at(-1)?.choice.guid ?? null)
  const touched = Object.keys(picks).length > 0
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const measured = useNodesInitialized()
  const { fitView, getNodes, getZoom } = useReactFlow()
  const [ready, setReady] = useState(false)
  const extent = useMemo(
    () => (ready ? extentOf(nodes) : undefined),
    [ready, nodes],
  )

  useEffect(() => {
    if (measured && !ready) {
      setNodes((current) => layout(current, initial.edges))
      setReady(true)
    }
  }, [measured, ready, setNodes, initial.edges])

  useEffect(() => {
    const [first] = quest.parts

    if (ready && first) {
      requestAnimationFrame(async () => {
        await fitView({
          maxZoom: 1,
          nodes: [
            {
              id: partId(first.guid),
            },
          ],
          padding: 0.05,
        })
      })
    }
  }, [ready, fitView, quest])

  // after a pick, follow the path to the decision it leads to, keeping the zoom
  useEffect(() => {
    if (pending === null || !touched) {
      return
    }

    const zoom = getZoom()
    const focus = getNodes().filter(
      (node) =>
        node.id === choiceId(pending) ||
        node.id.startsWith(`option-${pending}-`),
    )

    requestAnimationFrame(async () => {
      await fitView({
        duration: 400,
        maxZoom: zoom,
        minZoom: zoom,
        nodes: focus,
      })
    })
  }, [pending, touched, fitView, getNodes, getZoom])

  return (
    <PathContext value={context}>
      <ReactFlow
        className={ready ? undefined : 'invisible'}
        edges={edges}
        edgesFocusable={false}
        elementsSelectable={false}
        maxZoom={2}
        minZoom={0.2}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        proOptions={{
          hideAttribution: true,
        }}
        translateExtent={extent}
      >
        <Controls showInteractive={false} />

        <Panel className="bg-gray-3 flex rounded-lg" position="top-left">
          <span className="mx-3 my-2 text-sm leading-tight">
            {t(walk.done ? 'end' : 'pick')}
          </span>

          {Object.keys(picks).length ? (
            <button
              className="ring-accent-8 -ml-3 flex size-8.5 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
              onClick={() => setPicks({})}
              type="button"
            >
              <ArrowsClockwiseIcon weight="bold" />
            </button>
          ) : null}
        </Panel>
      </ReactFlow>
    </PathContext>
  )
}

export function QuestFlow({ quest }: Props) {
  return (
    <div className="bg-gray-1 h-[80vh] overflow-hidden rounded-lg">
      <ReactFlowProvider>
        <Flow quest={quest} />
      </ReactFlowProvider>
    </div>
  )
}
