import { expect, test } from 'bun:test'

import { anno } from './client'
import { walkQuest } from './walk'

test('a questline walk follows remembered choices to their parts and reward', async () => {
  const murmillo = await anno.quests.get({
    id: 50_806,
    lang: 'en',
  })
  if (!murmillo) {
    throw new Error('The Mysterious Murmillo is missing')
  }
  // nothing picked: the walk waits at the first decision
  const start = walkQuest(murmillo, {})
  expect(start.done).toBe(false)
  expect(start.legs.map((leg) => leg.part.guid)).toEqual([50_806])
  // side with the patricians throughout
  const walk = walkQuest(murmillo, {
    50807: 0,
    50814: 0,
    50821: 0,
    50833: 0,
    50848: 0,
    50854: 0,
    50866: 2,
  })
  expect(walk.done).toBe(true)
  // removing Favillus in Part III leads to the "against" Parts IV and V only
  expect(walk.legs.map((leg) => leg.part.guid)).toEqual([
    50_806, 50_813, 50_820, 50_832, 50_847, 50_853, 50_865,
  ])
  const finale = walk.legs.at(-1)?.steps ?? []
  // the favour tally decides itself, and only the patrician reward is left
  expect(finale.find((s) => s.choice.guid === 50_883)?.forced).toBe(true)
  const reward = finale.find((s) => s.choice.guid === 144_501)
  expect(reward?.forced).toBe(true)
  expect(reward?.picked?.idx).toBe(0)
})
