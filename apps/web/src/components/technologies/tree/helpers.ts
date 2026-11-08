import { type TechCategories, type Techs } from '@anno/db/client'
import { type Edge } from '@xyflow/react'

import { type HubNode } from './hub'
import { type TechNode } from './tech'

export const TILE_WIDTH = 134
export const TILE_HEIGHT = 155
export const TECH_SIZE = 88
export const GATE_SIZE = TECH_SIZE * 1.25
export const HUB_SIZE = 200
export const PADDING = HUB_SIZE / 2
export const HUB_FOCUS_ZOOM = 1

export function hubId(guid: number) {
  return `hub-${guid}`
}

function techId(guid: number) {
  return `tech-${guid}`
}

export function position(
  gridX: number,
  gridY: number,
  hub: {
    x: number
    y: number
  },
) {
  const shift = Math.abs(gridX) % 2 === 1 ? 0.5 : 0

  return {
    x: hub.x + gridX * TILE_WIDTH,
    y: hub.y + (gridY + shift) * TILE_HEIGHT,
  }
}

export function neighbors(x: number, y: number) {
  const diagonal = Math.abs(x) % 2 === 1 ? y + 1 : y - 1

  return [
    [x, y + 1],
    [x + 1, y],
    [x + 1, diagonal],
  ]
}

const interactive = {
  pointerEvents: 'all',
} as const

function corner(
  center: {
    x: number
    y: number
  },
  size: number,
) {
  return {
    x: center.x - size / 2,
    y: center.y - size / 2,
  }
}

export function layout(categories: TechCategories, techs: Techs) {
  const hubs = new Map(
    categories.map((category) => [
      category.guid,
      {
        ...category,
        x: category.x ?? 0,
        y: category.y ?? 0,
      },
    ]),
  )

  const nodes: Array<HubNode | TechNode> = [...hubs.values()].map((hub) => ({
    data: {
      category: hub,
    },
    height: HUB_SIZE,
    id: hubId(hub.guid),
    position: corner(hub, HUB_SIZE),
    style: interactive,
    type: 'hub',
    width: HUB_SIZE,
  }))

  const cells = new Map<string, Techs[number]>()

  const centers: Array<{
    x: number
    y: number
  }> = [...hubs.values()]

  for (const tech of techs) {
    const hub = tech.categoryGuid ? hubs.get(tech.categoryGuid) : undefined

    if (!hub) {
      continue
    }

    const center = position(tech.gridX ?? 0, tech.gridY ?? 0, hub)
    const size = tech.isGate ? GATE_SIZE : TECH_SIZE

    nodes.push({
      data: {
        tech,
      },
      height: size,
      id: techId(tech.guid),
      position: corner(center, size),
      style: interactive,
      type: 'tech',
      width: size,
    })
    centers.push(center)
    cells.set(`${hub.guid}:${tech.gridX}:${tech.gridY}`, tech)
  }

  const edges: Array<Edge> = []

  for (const tech of cells.values()) {
    if (tech.showConnectionToCategory && tech.categoryGuid) {
      edges.push({
        id: `${hubId(tech.categoryGuid)}:${techId(tech.guid)}`,
        source: hubId(tech.categoryGuid),
        target: techId(tech.guid),
      })
    }

    for (const [x, y] of neighbors(tech.gridX ?? 0, tech.gridY ?? 0)) {
      const other = cells.get(`${tech.categoryGuid}:${x}:${y}`)

      if (other) {
        edges.push({
          id: `${techId(tech.guid)}:${techId(other.guid)}`,
          source: techId(tech.guid),
          target: techId(other.guid),
        })
      }
    }
  }

  const xs = centers.map((point) => point.x)
  const ys = centers.map((point) => point.y)

  return {
    edges,
    extent: [
      [Math.min(...xs) - PADDING, Math.min(...ys) - PADDING],
      [Math.max(...xs) + PADDING, Math.max(...ys) + PADDING],
    ] as [[number, number], [number, number]],
    hubs: [...hubs.values()],
    nodes,
  }
}
