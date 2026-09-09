import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

export const db = drizzle(
  createClient({
    url:
      process.env.ANNO_DB_URL ??
      new URL('../anno.sqlite', import.meta.url).href,
  }),
  { logger: Boolean(process.env.ANNO_DB_LOG) },
)
