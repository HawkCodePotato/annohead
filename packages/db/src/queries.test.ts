import { expect, test } from 'bun:test'

import { getBuildings, getProducts, getSpecialists, getTechs } from './queries'

test('specialists paginate and join effects', async () => {
  const { rows, total } = await getSpecialists({
    lang: 'english',
    perPage: 5,
    rarity: ['Legendary'],
  })
  expect(total).toBeGreaterThan(50)
  expect(rows).toHaveLength(5)
  expect(rows[0]?.name).toBeTruthy()
  expect(rows.some((r) => r.targets.length > 0 && r.modifiers.length > 0)).toBe(
    true,
  )
})

test('specialist filter by target building and attribute', async () => {
  const [bakery] = (
    await getBuildings({ lang: 'english', perPage: 1, search: 'Bakery' })
  ).rows
  const { rows } = await getSpecialists({
    attribute: 'Health',
    lang: 'english',
    targetBuilding: bakery?.guid,
  })
  expect(rows.length).toBeGreaterThan(0)
  for (const r of rows) {
    expect(r.targets.map((t) => t.guid)).toContain(bakery?.guid)
    expect(r.modifiers.map((m) => m.attribute)).toContain('Health')
  }
})

test('buildings join costs, workforce and outputs', async () => {
  const { rows } = await getBuildings({
    kind: ['Production'],
    lang: 'german',
    perPage: 10,
  })
  const bakery = rows.find((r) => r.outputs.length > 0)
  expect(bakery?.costs.length).toBeGreaterThan(0)
  expect(bakery?.populationLevel?.name).toBeTruthy()
  expect(bakery?.cycleTime).toBeGreaterThan(0)
})

test('products and techs', async () => {
  const p = await getProducts({ lang: 'english', search: 'Bread' })
  expect(p.rows[0]?.producedBy.length).toBeGreaterThan(0)
  const t = await getTechs({ lang: 'english', search: 'Armoursmithing' })
  expect(t.rows.some((r) => r.unlocksBuildings.length > 0)).toBe(true)
})
