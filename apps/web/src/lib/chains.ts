import { anno } from '@anno/db/client'

import { validateLocale } from './validators'

export async function fetchChainData(locale: string) {
  const lang = validateLocale(locale)

  const [dlcs, regions, tiers, types, chains] = await Promise.all([
    anno.dlc.list({
      lang,
      of: 'building',
    }),
    anno.regions.list({
      lang,
    }),
    anno.chains.tiers({
      lang,
    }),
    anno.chains.types({
      lang,
    }),
    anno.chains.list({
      lang,
      perPage: 10_000,
    }),
  ])

  return {
    chains: chains.rows.map((chain) => ({
      building: chain.building,
      dlc: chain.dlc,
      guid: chain.guid,
      icon: chain.icon,
      name: chain.name,
      nodes: chain.nodes.map((node) => ({
        guid: node.guid,
        icon: node.icon,
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        slug: node.slug,
        time: node.cycleTime,
      })),
      product: chain.product,
      region: chain.region,
      types: chain.types,
    })),
    dlcs,
    regions,
    tiers,
    types,
  }
}

export type ChainData = Awaited<ReturnType<typeof fetchChainData>>
