// biome-ignore lint/performance/noNamespaceImport: go away
import * as params from 'next/root-params'
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from '.'

export default getRequestConfig(async ({ locale }) => {
  let resolved = locale

  if (!resolved) {
    const param = await params.locale()

    if (hasLocale(routing.locales, param)) {
      resolved = param
    } else {
      resolved = routing.defaultLocale
    }
  }

  return {
    locale: resolved,
    messages: (await import(`./locales/${resolved}.json`)).default,
    timeZone: 'UTC',
  }
})
