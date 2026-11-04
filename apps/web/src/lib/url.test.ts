import { expect, test } from 'bun:test'

import { getSafeNext } from './url'

test('getSafeNext keeps same-site paths', () => {
  expect(getSafeNext('/buildings/1/farm')).toBe('/buildings/1/farm')
  expect(getSafeNext('/de/quests')).toBe('/de/quests')
})

test('getSafeNext rejects anything that can leave the site', () => {
  for (const value of [
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    'evil.com',
    '',
    undefined,
    ['/a'],
  ]) {
    expect(getSafeNext(value)).toBe('/')
  }
})
