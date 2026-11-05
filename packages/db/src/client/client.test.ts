import { expect, test } from 'bun:test'

import { langValues } from '../enums'
import { anno } from './index'

/** "Part I" in every game language */
const PART_NUMBER = /\b(?:Part|Teil|Parte|partie|część|часть)\b|第.*部|\d부/iu
// typed queries have no zero-width spaces, which the game puts between CJK words
const INVISIBLE = /[\u200B-\u200D\uFEFF]/gu

test('specialists paginate and join effects', async () => {
  const { rows, total } = await anno.items.list({
    lang: 'en',
    perPage: 5,
    rarities: ['Legendary'],
    types: ['Villa'],
  })
  expect(total).toBeGreaterThan(50)
  expect(rows).toHaveLength(5)
  const second = await anno.items.list({
    lang: 'en',
    page: 2,
    perPage: 5,
    rarities: ['Legendary'],
    types: ['Villa'],
  })
  expect(second.rows.map((r) => r.guid)).not.toContain(rows[0]?.guid)
})

test('specialist filter by attribute', async () => {
  const { rows } = await anno.items.list({
    attributes: ['Health'],
    lang: 'en',
    types: ['Villa'],
  })
  expect(rows.length).toBeGreaterThan(0)
  for (const r of rows) {
    expect(r.modifiers.map((m) => m.attribute)).toContain('Health')
  }
})

test('buildings join costs, workforce and outputs', async () => {
  const { rows } = await anno.buildings.list({
    lang: 'de',
    perPage: 10,
    types: [41_362],
  })
  const bakery = rows.find((r) => r.outputs.length > 0)
  expect(bakery?.costs.length).toBeGreaterThan(0)
  expect(bakery?.workforce[0]?.name).toBeTruthy()
  expect(bakery?.cycleTime).toBeGreaterThan(0)
  const guid = bakery?.guid ?? 0
  expect(
    (
      await anno.buildings.get({
        id: guid,
        lang: 'en',
      })
    )?.guid,
  ).toBe(guid)
  expect(
    await anno.buildings.get({
      id: 1,
      lang: 'en',
    }),
  ).toBeNull()
})

test.each([
  {
    id: 50_972,
    names: ['Liberti', 'Plebeians'],
    tiers: [1499, 1496],
  },
  {
    id: 50_974,
    names: ['Waders', 'Mercators'],
    tiers: [1500, 1503],
  },
])(
  'buildings include every workforce tier for $id',
  async ({ id, tiers, names }) => {
    const building = await anno.buildings.get({
      id,
      lang: 'en',
    })
    expect(building?.workforce.map((entry) => entry.guid)).toEqual([...tiers])
    expect(building?.workforce.map((entry) => entry.name)).toEqual([...names])
    expect(building?.workforce.map((entry) => entry.amount)).toEqual([6, 16])
    expect(building).not.toHaveProperty('populationLevel')
    const localized = await anno.buildings.get({
      id,
      lang: 'de',
    })
    const populationTiers = await anno.populationTiers.list({
      lang: 'de',
    })
    expect(localized?.workforce.map((entry) => entry.name)).toEqual(
      tiers.map(
        (guid) =>
          populationTiers.find((tier) => tier.guid === guid)?.name ?? null,
      ),
    )
  },
)

test.each([1499, 1496])(
  'workforce filter matches either required tier: %s',
  async (tier) => {
    const result = await anno.buildings.list({
      lang: 'en',
      perPage: 1000,
      tiers: [tier],
    })
    expect(result.rows.map((row) => row.guid)).toContain(50_972)
    expect(
      result.rows.every((row) =>
        row.workforce.some((entry) => entry.guid === tier),
      ),
    ).toBe(true)
    expect(result.total).toBe(result.rows.length)
  },
)

test('workforce filters avoid duplicate buildings and ignore empty filters', async () => {
  const result = await anno.buildings.list({
    lang: 'en',
    perPage: 1000,
    tiers: [1499, 1496],
  })
  expect(result.rows.filter((row) => row.guid === 50_972)).toHaveLength(1)
  expect(result.total).toBe(result.rows.length)
  const empty = await anno.buildings.list({
    lang: 'en',
    perPage: 1,
    tiers: [],
  })
  const unfiltered = await anno.buildings.list({
    lang: 'en',
    perPage: 1,
  })
  expect(empty).toEqual(unfiltered)
  const residence = await anno.buildings.get({
    id: 3087,
    lang: 'en',
  })
  expect(residence).not.toBeNull()
  expect(residence?.workforce).toEqual([])
})

test.each([
  {
    lang: 'en',
    military: 'Military Buildings',
  },
  {
    lang: 'de',
    military: 'Militärgebäude',
  },
] as const)(
  'building types are the game construction tabs in $lang',
  async ({ lang, military }) => {
    const types = await anno.buildings.types({
      lang,
    })
    expect(types[0]?.guid).toBe(41_362)
    // the Roman, Celtic and Egyptian tabs read the same, so they are one
    expect(types.filter((m) => m.name === military)).toHaveLength(1)
    const listed = await anno.buildings.list({
      lang,
      perPage: 1000,
      types: [41_368],
    })
    expect(listed.total).toBe(56)
    expect(listed.rows.map((row) => row.guid)).toContain(2794)
  },
)

test('buildings filter by DLC and ignore an empty DLC filter', async () => {
  const hippodrome = await anno.buildings.list({
    dlcs: [67_903],
    lang: 'en',
  })
  expect(hippodrome.rows.map((row) => row.guid)).toContain(152_714)
  expect(hippodrome.rows.every((row) => row.dlc?.guid === 67_903)).toBe(true)
  const multiple = await anno.buildings.list({
    dlcs: [67_902, 67_903],
    lang: 'en',
    perPage: 100,
  })
  expect(multiple.rows.map((row) => row.guid)).toContain(145_229)
  expect(multiple.rows.map((row) => row.guid)).toContain(152_714)
  expect(multiple.rows.map((row) => row.guid)).not.toContain(3615)
  const unfiltered = await anno.buildings.list({
    lang: 'en',
    perPage: 1,
  })
  const empty = await anno.buildings.list({
    dlcs: [],
    lang: 'en',
    perPage: 1,
  })
  expect(empty.total).toBe(unfiltered.total)
  expect(empty.rows).toEqual(unfiltered.rows)
})

test.each(['en', 'de'] as const)(
  'buildings include localized DLC details in %s',
  async (lang) => {
    const dlcs = await anno.dlc.list({
      lang,
      of: 'building',
    })
    const building = await anno.buildings.get({
      id: 152_714,
      lang,
    })
    expect(building?.dlc).toEqual(
      dlcs.find((dlc) => dlc.guid === 67_903) ?? null,
    )
    expect(building?.dlc?.name).toBeTruthy()
    const baseGameBuilding = await anno.buildings.get({
      id: 3615,
      lang,
    })
    expect(baseGameBuilding).not.toBeNull()
    expect(baseGameBuilding?.dlc).toBeNull()
  },
)

test.each(['building', 'item', 'questline', 'tech'] as const)(
  'DLC filters for %s skip packs without content',
  async (of) => {
    const dlcs = await anno.dlc.list({
      lang: 'en',
      of,
    })
    // 67_906-67_908 are the cosmetic packs, which only add ornaments
    expect(dlcs.map((d) => d.guid)).toEqual([67_902, 67_903, 67_904])
  },
)

test('buildings carry effects and buffs', async () => {
  const lavender = await anno.buildings.get({
    id: 2698,
    lang: 'en',
  })
  const [mod] = lavender?.effects ?? []
  const attr: 'Happiness' | undefined =
    mod?.attribute === 'Happiness' ? mod.attribute : undefined
  expect(attr).toBe('Happiness')
  const market = await anno.buildings.get({
    id: 3527,
    lang: 'en',
  })
  expect(market?.effects).toEqual([])
  expect(market?.buffs).toEqual([
    {
      attribute: 'Population',
      buildingGuid: 3527,
      name: 'Population',
      value: 1,
    },
    {
      attribute: 'Money',
      buildingGuid: 3527,
      name: 'Income',
      value: 1,
    },
  ])
  expect(lavender?.category).toBe('Plantation')
})

test('production buffs include output need fulfillment without duplicate needs', async () => {
  const caelator = await anno.buildings.get({
    id: 145_229,
    lang: 'en',
  })
  expect(
    caelator?.effects.map(({ attribute, value }) => ({
      attribute,
      value,
    })),
  ).toEqual(
    expect.arrayContaining([
      {
        attribute: 'Prestige',
        value: 2,
      },
      {
        attribute: 'Health',
        value: -1,
      },
    ]),
  )
  expect(caelator?.buffs).toHaveLength(3)
  expect(caelator?.buffs).toEqual(
    expect.arrayContaining([
      {
        attribute: 'Population',
        buildingGuid: 145_229,
        name: 'Population',
        value: 1,
      },
      {
        attribute: 'Money',
        buildingGuid: 145_229,
        name: 'Income',
        value: 3,
      },
      {
        attribute: 'Belief',
        buildingGuid: 145_229,
        name: 'Belief',
        value: 2,
      },
    ]),
  )
  const listed = await anno.buildings.list({
    lang: 'en',
    perPage: 1000,
  })
  expect(listed.rows.find((row) => row.guid === 145_229)?.buffs).toEqual(
    caelator?.buffs ?? [],
  )
})

test.each([
  {
    health: 'Health',
    income: 'Income',
    lang: 'en',
  },
  {
    health: 'Gesundheit',
    income: 'Einkommen',
    lang: 'de',
  },
] as const)(
  'building buffs and effects have localized names in $lang',
  async ({ lang, income, health }) => {
    const building = await anno.buildings.get({
      id: 145_229,
      lang,
    })
    expect(
      building?.buffs.find((bonus) => bonus.attribute === 'Money')?.name,
    ).toBe(income)
    expect(
      building?.effects.find((effect) => effect.attribute === 'Health')?.name,
    ).toBe(health)
    const listed = await anno.buildings.list({
      dlcs: [67_902],
      lang,
      perPage: 1000,
    })
    expect(listed.rows.find((row) => row.guid === 145_229)?.buffs).toEqual(
      building?.buffs ?? [],
    )
  },
)

test('modifier percentage flags are booleans', async () => {
  const lavender = await anno.buildings.get({
    id: 2698,
    lang: 'en',
  })
  const effects = lavender?.effects ?? []
  expect(effects.length).toBeGreaterThan(0)
  expect(effects.every((effect) => effect.isPercent === false)).toBe(true)
  const item = await anno.items.get({
    id: 41_350,
    lang: 'en',
  })
  expect(item?.modifiers.some((modifier) => modifier.isPercent === true)).toBe(
    true,
  )
  expect(
    item?.modifiers.every(
      (modifier) => typeof modifier.isPercent === 'boolean',
    ),
  ).toBe(true)
})

test('Amphitheatre phases expose construction inputs, time, workforce and unlocks', async () => {
  const building = await anno.buildings.get({
    id: 3621,
    lang: 'en',
  })
  expect(building?.phases.map((phase) => phase.name)).toEqual([
    'Foundation',
    'Foundation',
    'Outer Walls',
    'Arena',
  ])
  expect(building?.phases.map((phase) => phase.durationSeconds)).toEqual([
    0, 1800, 1800, 1800,
  ])
  expect(
    building?.phases.map((phase) =>
      Object.fromEntries(phase.costs.map((cost) => [cost.guid, cost.amount])),
    ),
  ).toEqual([
    {
      2174: 100,
      2178: 60,
      1010017: 75_000,
    },
    {
      2171: 150,
      2174: 150,
      2178: 300,
    },
    {
      2171: 150,
      2176: 300,
      2178: 150,
      2179: 300,
    },
    {
      2152: 300,
      2176: 300,
      2178: 300,
      2179: 300,
      31698: 60,
    },
  ])
  expect(
    building?.phases.map((phase) =>
      phase.maintenance.map((entry) => [entry.guid, entry.amount]),
    ),
  ).toEqual([[], [[2181, 350]], [[2184, 200]], [[2185, 150]]])
  expect(
    building?.phases.map((phase) =>
      phase.unlockRequirements.map((requirement) => [
        requirement.population?.guid,
        requirement.population?.amount,
      ]),
    ),
  ).toEqual([[[1498, 1]], [[1498, 1]], [[1498, 750]], [[1498, 2250]]])
  expect(building?.unlockRequirements[0]?.population?.amount).toBe(1)
  expect(building?.costs.find((cost) => cost.guid === 1_010_017)?.amount).toBe(
    75_000,
  )
  expect(building?.costs.find((cost) => cost.guid === 31_698)?.amount).toBe(60)
  expect(
    building?.maintenance.find((entry) => entry.guid === 1_010_017)?.amount,
  ).toBe(400)
  const german = await anno.buildings.get({
    id: 3621,
    lang: 'de',
  })
  const tiers = await anno.populationTiers.list({
    lang: 'de',
  })
  expect(german?.phases[3]?.unlockRequirements[0]?.population?.name).toBe(
    tiers.find((tier) => tier.guid === 1498)?.name ?? null,
  )
  const listed = await anno.buildings.list({
    lang: 'en',
    perPage: 1000,
  })
  expect(listed.rows.find((row) => row.guid === 3621)?.phases).toEqual(
    building?.phases ?? [],
  )
})

test('Hippodrome phase time uses each stage microphase count', async () => {
  const building = await anno.buildings.get({
    id: 152_714,
    lang: 'en',
  })
  expect(building?.phases.map((phase) => phase.durationSeconds)).toEqual([
    0, 1800, 2400, 3000, 3600,
  ])
  expect(building?.phases[0]?.maintenance).toEqual([])
})

test('products and techs', async () => {
  const bread = await anno.products.get({
    id: 2137,
    lang: 'en',
  })
  expect(bread?.producedBy.length).toBeGreaterThan(0)
  const p = await anno.products.list({
    lang: 'en',
    perPage: 1000,
  })
  expect(p.rows.find((r) => r.guid === 2137)?.name).toBe(bread?.name)
  const meta = await anno.products.list({
    lang: 'en',
    types: [-3],
  })
  expect(meta.total).toBe(7)
  expect(
    (
      await anno.products.list({
        lang: 'en',
        types: [-1],
      })
    ).total,
  ).toBe(14)
  const dlcProducts = await anno.products.list({
    dlcs: [67_902],
    lang: 'en',
  })
  expect(dlcProducts.rows.map((r) => r.name)).toEqual([
    'Latrunculi Sets',
    'Statuettes',
  ])
  expect(dlcProducts.rows.every((r) => r.dlc?.guid === 67_902)).toBe(true)
  const wineRow = await anno.products.get({
    id: 2138,
    lang: 'en',
  })
  expect(wineRow?.dlc).toBeNull()
  // Wine is on the Equites (Roman) and Aldermen/Nobles (Celtic) menus; Patricians still consume it
  expect(wineRow?.neededBy.map((tier) => tier.guid)).toEqual([
    1497, 1502, 1504, 150_542,
  ])
  expect(wineRow?.wantedBy.map((tier) => tier.guid)).toEqual([1498])
  expect(wineRow?.producedBy.map((b) => b.region?.id)).toEqual([1, 2, 3])
  expect(wineRow?.regions.length).toBeGreaterThan(0)
  // Plebeians only get Wine through a buff, so they don't count
  async function needsWine(tier: number) {
    const r = await anno.products.list({
      lang: 'en',
      tiers: [tier],
    })
    return r.rows.some((row) => row.guid === 2138)
  }
  expect(await needsWine(1499)).toBe(false)
  expect(await needsWine(1496)).toBe(false)
  expect(await needsWine(1497)).toBe(true)
  expect(await needsWine(1498)).toBe(true)
  const roman = await anno.products.list({
    lang: 'en',
    regions: [1],
  })
  expect(roman.total).toBe(101)
  expect(roman.rows.every((r) => r.regions.some((x) => x.id === 1))).toBe(true)
  expect(
    await anno.products.types({
      lang: 'de',
    }),
  ).toContainEqual(
    expect.objectContaining({
      guid: -2,
      name: 'Dienstleistung',
    }),
  )
  // Barley is filed by the trading post filter
  const farmed = await anno.products.list({
    lang: 'en',
    perPage: 1000,
    types: [29_303],
  })
  expect(farmed.rows.find((r) => r.guid === 2093)?.type?.name).toBe(
    'Agricultural Goods',
  )
  const armoursmithing = await anno.techs.get({
    id: 81_220,
    lang: 'en',
  })
  expect(armoursmithing?.unlocks.some((u) => u.buildingGuid)).toBe(true)
  const t = await anno.techs.list({
    lang: 'en',
  })
  expect(t.find((r) => r.guid === 81_220)?.unlocks).toEqual(
    armoursmithing?.unlocks ?? [],
  )
})

test('questlines group the Mysterious Murmillo parts in order', async () => {
  const { rows } = await anno.quests.list({
    lang: 'en',
    perPage: 500,
  })
  const murmillo = rows.find((r) => r.guid === 50_806)
  expect(murmillo?.name).toBe('The Mysterious Murmillo')
  expect(murmillo?.parts).toBe(9)
  const radiant = rows.some((r) => r.name?.includes('Emperor Request'))
  expect(radiant).toBe(false)
  const q = await anno.quests.get({
    id: 50_806,
    lang: 'en',
  })
  expect(q?.parts[0]?.name).toBe('The Mysterious Murmillo Part I')
  expect(q?.parts.at(-1)?.name).toBe('The Mysterious Murmillo Part VI')
})

test('options read the text the quest fills in, with inline icons on the CDN', async () => {
  const q = await anno.quests.get({
    id: 152_815,
    lang: 'en',
  })
  const options = q?.parts.flatMap((p) => p.choices.flatMap((c) => c.options))
  const texts = options?.map((o) => o.text) ?? []
  expect(texts).toContain('Kashtan Weapon')
  expect(texts).toContain('Ornate Blade')
  expect(texts).toContain(
    `<img src="data/ui/fhd/dlc03/icon_content/crew_mainfest/icon_2d_crew_manifest_diamond.png" width='26' height='26'/> Nekht (Diamond Symbol)`,
  )
  expect(texts.filter((t) => t?.includes('{') || t?.includes('[…]'))).toEqual(
    [],
  )
})

test('questline choices carry costs, requirements and outcomes', async () => {
  const q = await anno.quests.get({
    id: 50_806,
    lang: 'en',
  })
  const finale = q?.parts.at(-1)?.choices ?? []
  const fate = finale.find((c) => c.guid === 50_866)
  // adopting Favillus hands over his specialist and wins the neutral crowd
  const adopt = fate?.options[1]
  expect(adopt?.outcomes.find((o) => o.kind === 'goods')?.guid).toBe(50_890)
  expect(adopt?.sets).toContainEqual(
    expect.objectContaining({
      operation: 'Add',
      value: '1',
      variable: 'Colosseum_NeutralFavor',
    }),
  )
  expect(adopt?.outcomes.some((o) => o.kind === 'variable')).toBe(false)
  expect(adopt?.next).toBe(50_883)
  // the favour tally picks the reward
  const tally = finale.find((c) => c.guid === 50_883)
  expect(tally?.kind).toBe('check')
  expect(tally?.test?.own).toEqual(
    expect.objectContaining({
      comparison: 'AtLeast',
      other: 'Colosseum_NeutralFavor',
      variable: 'Colosseum_PatricianFavor',
    }),
  )
  // quest variables are for the walk to resolve, not requirements to read
  expect(tally?.requirements).toEqual([])
  const reward = finale.find((c) => c.guid === 144_501)
  expect(reward?.options[0]?.requirements).toEqual([])
  expect(reward?.options[0]?.test).not.toBeNull()
  const happiness = reward?.options[0]?.outcomes[0]
  expect(happiness?.kind).toBe('effect')
  expect(happiness?.modifiers).toEqual([
    expect.objectContaining({
      name: 'Happiness',
      value: 9,
    }),
  ])
  expect(happiness?.duration).toBe(43_200_000)
  // the Hippodrome's claques cost coins
  const standing = (
    await anno.quests.list({
      dlcs: [67_903],
      lang: 'en',
      perPage: 500,
    })
  ).rows.find((r) => r.guid === 154_738)
  const part = (
    await anno.quests.get({
      id: standing?.guid ?? 0,
      lang: 'en',
    })
  )?.parts[0]
  expect(part?.choices[0]?.options[0]?.cost).toEqual(
    expect.objectContaining({
      amount: 50_000,
      guid: 1_010_017,
    }),
  )
})

test('chains join final building and nodes', async () => {
  const { rows } = await anno.chains.list({
    lang: 'en',
  })
  expect(rows.length).toBeGreaterThan(0)
  const chain = await anno.chains.get({
    id: 3222,
    lang: 'en',
  })
  expect(chain?.building?.guid).toBe(3089)
  expect(chain?.building?.cycleTime).toBeGreaterThan(0)
  expect(chain?.building?.baseProductivity).toBe(100)
  expect(chain?.nodes.every((n) => n.cycleTime !== null)).toBe(true)
  expect(chain?.nodes.length).toBeGreaterThan(1)
  expect(chain?.nodes[0]?.parentId).toBeNull()
  expect(
    await anno.chains.get({
      id: 1,
      lang: 'en',
    }),
  ).toBeNull()
})

test('chains filter by type, tier, region and dlc', async () => {
  const military = await anno.chains.list({
    lang: 'en',
    types: [41_368],
  })
  expect(military.rows.map((r) => r.guid)).toContain(3253)
  expect(military.total).toBe(6)
  // Roman Celtic Wine is on both the Aldermen and Nobles menus
  const nobles = await anno.chains.list({
    lang: 'en',
    tiers: [41_327],
  })
  expect(nobles.rows.map((r) => r.guid)).toContain(6668)
  const roman = await anno.chains.list({
    lang: 'en',
    regions: [1],
    types: [42_434],
  })
  expect(roman.rows.every((r) => r.region?.id === 1)).toBe(true)
  expect(
    (
      await anno.chains.list({
        dlcs: [-1],
        lang: 'en',
      })
    ).total,
  ).toBe(0)
  const types = await anno.chains.types({
    lang: 'en',
  })
  expect(types.map((t) => t.name)).toEqual([
    'Harbour Buildings',
    'Military Buildings',
    'Materials',
  ])
  // every tier's menu tab matches its population tier by workforce icon or name; a patch changing both breaks this
  const tiers = await anno.chains.tiers({
    lang: 'en',
  })
  expect(tiers).toHaveLength(
    (await anno.populationTiers.list({ lang: 'en' })).length,
  )
})

test('search ranks name matches, dedupes variants, filters by type and paginates', async () => {
  const bread = await anno.search({
    lang: 'en',
    query: 'bread',
  })
  expect(bread.rows[0]?.name).toBe('Bread')
  expect(bread.total).toBeGreaterThan(
    bread.rows.filter((r) => r.name === 'Bread').length,
  )
  const breadChains = bread.rows.filter(
    (r) => r.type === 'chain' && r.name === 'Bread',
  )
  expect(breadChains.map((r) => r.regions).sort()).toEqual([
    ['Celtic'],
    ['Egyptian'],
    ['Roman'],
  ])

  const camps = await anno.search({
    lang: 'en',
    query: 'Infantry Camp',
  })
  expect(camps.rows.map((r) => [r.type, r.guid, r.regions])).toEqual([
    ['building', 32_606, ['Roman', 'Celtic', 'Egyptian']],
  ])

  const items = await anno.search({
    lang: 'en',
    perPage: 3,
    query: 'a',
    types: ['item'],
  })
  expect(items.rows).toHaveLength(3)
  expect(items.rows.every((r) => r.type === 'item')).toBe(true)
  const next = await anno.search({
    lang: 'en',
    page: 2,
    perPage: 3,
    query: 'a',
    types: ['item'],
  })
  expect(next.total).toBe(items.total)
  expect(next.rows.map((r) => r.guid)).not.toContain(items.rows[0]?.guid)

  const german = await anno.search({
    lang: 'de',
    query: 'bäckerei',
  })
  expect(german.rows.some((r) => r.type === 'building')).toBe(true)
  expect(
    (
      await anno.search({
        lang: 'en',
        // `%` is no LIKE wildcard (not '100%': Egyptian techs ask for 1000 Knowledge)
        query: 'qzx%',
      })
    ).total,
  ).toBe(0)
})

test('search finds a questline by the name its journal entry takes on later', async () => {
  const { rows } = await anno.search({
    lang: 'en',
    query: 'Breadbasket',
    types: ['quest'],
  })
  expect(rows.map((r) => [r.guid, r.name])).toEqual([
    [152_815, 'Folk Of The Great River'],
  ])
  const both = await anno.search({
    lang: 'en',
    query: 'river',
    types: ['quest'],
  })
  expect(both.rows.filter((r) => r.guid === 152_815)).toHaveLength(1)
})

test('item rarities, niches and allocations are named by the game', async () => {
  const rarities = await anno.items.rarities({
    lang: 'en',
  })
  expect(rarities.map((r) => r.key)).toEqual([
    'Common',
    'Rare',
    'Epic',
    'Legendary',
    'Mythic',
    'Unique',
    'Quest',
  ])
  expect(rarities.find((r) => r.key === 'Mythic')?.name).toBe('Heroic')
  const niches = await anno.items.niches({
    lang: 'de',
  })
  expect(niches.map((n) => n.key)).not.toContain('None')
  expect(niches.find((n) => n.key === 'Nautics')?.name).toBe('Seefahrt')
  expect(
    await anno.items.types({
      lang: 'de',
    }),
  ).toEqual([
    {
      key: 'None',
      name: 'Item',
    },
    {
      key: 'Ship',
      name: 'Kapitän',
    },
    {
      key: 'Villa',
      name: 'Spezialist',
    },
    {
      key: 'Charioteer',
      name: 'Wagenlenker',
    },
  ])
})

test('specialists carry their racer preset stat ranges', async () => {
  // Dorian races on the Epic preset: starts at 2–4, trains up to 4–10 (the cap)
  const dorian = await anno.items.get({
    id: 41_350,
    lang: 'en',
  })
  expect(
    dorian?.racer.map((s) => [
      s.attribute.key,
      s.attribute.name,
      s.initialMin,
      s.initialMax,
      s.potentialMin,
      s.potentialMax,
    ]),
  ).toEqual([
    ['Speed', 'Speed', 2, 4, 4, 10],
    ['Stamina', 'Stamina', 2, 4, 4, 10],
    ['Boost', 'Sprint', 2, 4, 4, 10],
    ['Consistency', 'Reliability', 2, 4, 4, 10],
  ])
  expect(dorian?.racer[0]?.attribute.icon).toContain('icon_2d_racer_speed')
  const charioteers = await anno.items.list({
    lang: 'en',
    perPage: 1000,
    types: ['Charioteer'],
  })
  expect(charioteers.total).toBeGreaterThan(400)
  expect(charioteers.rows.every((r) => r.racer.length === 4)).toBe(true)
  // the Hippodrome's socket only takes specialists
  expect(charioteers.rows.every((r) => r.type?.key === 'Villa')).toBe(true)
  // types combine like every other filter: any of them
  const props = await anno.items.list({
    lang: 'en',
    types: ['None'],
  })
  const either = await anno.items.list({
    lang: 'en',
    types: ['None', 'Charioteer'],
  })
  expect(either.total).toBe(props.total + charioteers.total)
})

test('item rarity, niche and allocation are localized label objects', async () => {
  const dorian = await anno.items.get({
    id: 41_350,
    lang: 'de',
  })
  expect(dorian?.rarity).toEqual({
    key: 'Unique',
    name: 'Einzigartig',
  })
  expect(dorian?.niche?.key).toBeTruthy()
  expect(dorian?.type).toEqual({
    key: 'Villa',
    name: 'Spezialist',
  })
})

test('items filter by DLC and carry localized DLC details', async () => {
  const { rows, total } = await anno.items.list({
    dlcs: [67_903],
    lang: 'de',
    perPage: 100,
  })
  expect(total).toBe(33)
  expect(rows.every((r) => r.dlc?.guid === 67_903)).toBe(true)
  expect(rows[0]?.dlc?.name).toBeTruthy()
  const both = await anno.items.list({
    dlcs: [67_902, 67_903],
    lang: 'en',
  })
  expect(both.total).toBe(85)
  const base = await anno.items.get({
    id: 41_350,
    lang: 'en',
  })
  expect(base?.dlc).toBeNull()
})

test('search includes item rarity and null for other entity types', async () => {
  const items = await anno.search({
    lang: 'en',
    query: 'Dorian',
    types: ['item'],
  })
  expect(items.rows.find((row) => row.guid === 41_350)?.rarity).toBe('Unique')
  const buildings = await anno.search({
    lang: 'en',
    query: 'Bakery',
    types: ['building'],
  })
  expect(buildings.rows.length).toBeGreaterThan(0)
  expect(buildings.rows.every((row) => row.rarity === null)).toBe(true)
})

test('search tolerates typos, word order, case and diacritics', async () => {
  const first = async (query: string, lang: 'en' | 'de' = 'en') =>
    (
      await anno.search({
        lang,
        query,
      })
    ).rows[0]?.name
  expect(await first('bakry')).toBe('Bakery')
  expect(await first('infantry cmap')).toBe('Infantry Camp')
  expect(await first('camp infantry')).toBe('Infantry Camp')
  expect(await first('backerei', 'de')).toBe('Bäckerei')
  expect(await first('BÄCKEREI', 'de')).toBe('Bäckerei')
  expect(
    (
      await anno.search({
        lang: 'en',
        query: 'xyzzyq',
      })
    ).total,
  ).toBe(0)
  const all = await anno.search({
    lang: 'en',
    perPage: 5,
    query: '',
  })
  expect(all.total).toBeGreaterThan(1000)
  expect(all.rows).toHaveLength(5)
})

test.each([
  {
    lang: 'en',
    names: ['Productivity', 'Required Area', 'Workforce Needed'],
  },
  {
    lang: 'de',
    names: ['Produktivität', 'Erforderliche Fläche', 'Arbeitskräfte benötigt'],
  },
] as const)(
  'item modifiers and boosts are named in $lang',
  async ({ lang, names }) => {
    const item = await anno.items.get({
      id: 160_051,
      lang,
    })
    expect(item?.modifiers.map((m) => m.name)).toEqual([...names])
    expect(item?.boost?.modifiers.map((m) => m.name)).toEqual([...names])
    expect(item?.modifiers.map((m) => m.value)).toEqual([40, -25, 25])
    expect(item?.modifiers.every((m) => m.isPercent)).toBe(true)
  },
)

test.each([
  {
    lang: 'en',
    name: 'Worship Cernunnos',
  },
  {
    lang: 'de',
    name: 'Cernunnos verehren',
  },
] as const)(
  'item boost condition resolves its patron in $lang',
  async ({ lang, name }) => {
    const item = await anno.items.get({
      id: 160_051,
      lang,
    })
    expect(item?.boost?.hint).toBeTruthy()
    expect(item?.boost?.conditions).toEqual([
      {
        guid: 50_242,
        icon: expect.stringContaining('cernunnos'),
        kind: 'patron',
        name,
        type: 'ConditionReligion',
        value: null,
      },
    ])
    expect(item?.sources.map((s) => s.kind)).toEqual(['visitor'])
  },
)

test('a condition listing several assets yields one entry each', async () => {
  const amyntas = await anno.items.get({
    id: 106_956,
    lang: 'en',
  })
  expect(
    amyntas?.boost?.conditions.map((c) => [c.type, c.kind, c.name]),
  ).toEqual([
    ['ConditionMonumentEventActive', 'event', 'The Great Naumachia is running'],
    [
      'ConditionMonumentEventActive',
      'event',
      'Grand Gladiator Games is running',
    ],
    [
      'ConditionMonumentEventActive',
      'event',
      'Local Gladiator Games is running',
    ],
  ])
  const praetor = await anno.items.get({
    id: 106_716,
    lang: 'en',
  })
  expect(praetor?.boost?.conditions).toEqual([
    {
      guid: 38_995,
      icon: null,
      kind: 'pool',
      name: 'Ships in the area',
      type: 'ConditionObjectCount',
      value: 1,
    },
  ])
})

test('item sources name the participant, festival or tech they come from', async () => {
  const dorian = await anno.items.get({
    id: 41_350,
    lang: 'en',
  })
  expect(dorian?.boost?.conditions).toEqual([
    {
      guid: null,
      icon: null,
      kind: null,
      name: 'Health on the island',
      type: 'ConditionNeedAttributeCounter',
      value: 1000,
    },
  ])
  expect(dorian?.sources).toEqual([
    expect.objectContaining({
      guid: 31_099,
      kind: 'defeated',
      name: 'Defeat Dorian',
    }),
  ])
  const german = await anno.items.get({
    id: 41_350,
    lang: 'de',
  })
  expect(german?.sources[0]?.name).toBe('Dorian besiegen')
  const { rows } = await anno.items.list({
    lang: 'en',
    perPage: 200,
  })
  const kinds = new Set(rows.flatMap((r) => r.sources.map((s) => s.kind)))
  expect(kinds).toContain('trader')
  expect(kinds).toContain('festival')
  const traded = rows.find((r) => r.sources.some((s) => s.kind === 'trader'))
  expect(traded?.sources.find((s) => s.kind === 'trader')?.name).toBeTruthy()
  const festival = rows.find((r) =>
    r.sources.some((s) => s.kind === 'festival'),
  )
  expect(
    festival?.sources.find((s) => s.kind === 'festival')?.name,
  ).toBeTruthy()
})

test.each([
  {
    id: 107_337,
    name: 'Emperor relation: Rebel, Rebellion pending',
    type: 'ConditionEmperorRelation',
  },
  {
    id: 144_878,
    name: 'Denarii in stock',
    type: 'ConditionPlayerCounter',
  },
  {
    id: 42_046,
    name: 'Alliance with Tarragon',
    type: 'ConditionDiplomacyState',
  },
] as const)(
  'condition name describes the checked state for $id',
  async ({ id, type, name }) => {
    const item = await anno.items.get({
      id,
      lang: 'en',
    })
    expect(item?.boost?.conditions[0]?.type).toBe(type)
    expect(item?.boost?.conditions[0]?.name).toBe(name)
  },
)

test('specialists show area effects and templated effects in the game wording', async () => {
  const magnus = await anno.items.get({
    id: 42_043,
    lang: 'en',
  })
  expect(magnus?.modifiers).toContainEqual(
    expect.objectContaining({
      name: 'Knowledge Area Effect',
      nearby: true,
      value: 1.5,
    }),
  )
  const waronheri = await anno.items.get({
    id: 156_714,
    lang: 'de',
  })
  expect(waronheri?.modifiers.map((m) => m.name)).toContain(
    'Holz ersetzt Unterbau',
  )
  expect(
    waronheri?.modifiers.find((m) => m.name === 'Holz ersetzt Unterbau')?.value,
  ).toBeNull()
  const casponia = await anno.items.get({
    id: 51_282,
    lang: 'en',
  })
  expect(casponia?.modifiers.map((m) => m.name)).toContain(
    'Additional 1t Flax every 10 cycles',
  )
})

test('items the game never names and props nothing hands out are left out', async () => {
  // a campaign prop whose name line the game never wrote, and one no quest gives
  const dropped = await Promise.all(
    [39_801, 40_603].map((id) =>
      anno.items.get({
        id,
        lang: 'en',
      }),
    ),
  )
  expect(dropped.every((item) => item === null)).toBe(true)
  const { rows } = await anno.items.list({
    lang: 'en',
    perPage: 1000,
  })
  expect(rows.every((r) => r.name)).toBe(true)
  expect(rows.some((r) => r.icon?.includes('icon_3d_removed'))).toBe(false)
})

test.each([...langValues])(
  'questline names drop the part number and search finds names in %s',
  async (lang) => {
    const murmillo = await anno.quests.get({
      id: 50_806,
      lang,
    })
    expect(murmillo?.name).toBeTruthy()
    expect(murmillo?.name).not.toMatch(PART_NUMBER)
    const spinner = await anno.buildings.get({
      id: 3187,
      lang,
    })
    // typed queries have no zero-width spaces, which the game puts between CJK words
    const query = (spinner?.name ?? '').replace(INVISIBLE, '').slice(0, 4)
    const { rows } = await anno.search({
      lang,
      perPage: 1000,
      query,
    })
    expect(rows.map((r) => r.guid)).toContain(3187)
  },
)

test('ornaments carry their pack, value, costs and menu tabs', async () => {
  const kassandra = await anno.ornaments.get({
    id: 174_718,
    lang: 'en',
  })
  expect(kassandra?.name).toBe('Statue of Kassandra')
  expect(kassandra?.value).toBe(4)
  expect(kassandra?.dlc?.guid).toBe(67_908)
  expect(kassandra?.costs.map((c) => [c.guid, c.amount])).toEqual([
    [1_010_017, 1000],
  ])
  // Eternal Fountain: its own tab first, then Hall Of Fame
  const fountain = await anno.ornaments.get({
    id: 80_620,
    lang: 'en',
  })
  expect(fountain?.dlc).toBeNull()
  expect(fountain?.types.map((t) => t.guid)).toEqual([80_617, 87_448])
})

test('ornaments filter by menu tab and DLC', async () => {
  const types = await anno.ornaments.types({
    lang: 'en',
  })
  expect(types[0]?.name).toBe('Ground Patterns')
  const walls = await anno.ornaments.list({
    lang: 'en',
    perPage: 1000,
    types: [80_618],
  })
  expect(walls.total).toBe(15)
  expect(walls.rows.every((r) => r.types.some((t) => t.guid === 80_618))).toBe(
    true,
  )
  const mosaics = await anno.ornaments.list({
    dlcs: [67_906],
    lang: 'en',
    perPage: 1000,
  })
  expect(mosaics.total).toBe(30)
  expect(mosaics.rows.every((r) => r.dlc?.guid === 67_906)).toBe(true)
  const packs = await anno.dlc.list({
    lang: 'en',
    of: 'ornament',
  })
  expect(packs.map((d) => d.guid)).toEqual([67_906, 67_907, 67_908])
})

test('search finds ornaments', async () => {
  const { rows } = await anno.search({
    lang: 'en',
    query: 'Kassandra',
    types: ['ornament'],
  })
  expect(rows.map((r) => r.guid)).toContain(174_718)
})

test('ornaments every region builds match any region filter', async () => {
  const all = await anno.ornaments.list({
    lang: 'en',
    perPage: 1000,
  })
  const latium = await anno.ornaments.list({
    lang: 'en',
    perPage: 1000,
    regions: [1],
  })
  // everything but the Albion and Egypt copies of Petrified Gorgo and Sisyphus
  expect(latium.total).toBe(all.total - 4)
  expect(latium.rows.every((r) => !r.region || r.region.id === 1)).toBe(true)
})
