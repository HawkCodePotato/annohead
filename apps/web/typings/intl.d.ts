/** biome-ignore-all lint/style/useConsistentTypeDefinitions: go away */

import { type routing } from '@/intl'
import type en from '@/intl/locales/en.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof en
  }
}
