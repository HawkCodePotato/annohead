import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

// resolved via path, not `new URL(..., import.meta.url)`, which bundlers rewrite into an asset url
const defaultUrl = `file:${resolve(fileURLToPath(import.meta.url), '../../anno.sqlite')}`

export const db = drizzle(
  createClient({
    url: process.env.ANNO_DB_URL ?? defaultUrl,
  }),
  {
    logger: Boolean(process.env.ANNO_DB_LOG),
  },
)
