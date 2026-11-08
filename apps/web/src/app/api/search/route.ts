import { anno } from '@anno/db/client'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { routing } from '@/intl'

const schema = z.object({
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
  query: z.string().min(1).max(32),
})

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const { locale, query } = schema.parse({
    locale: params.get('locale'),
    query: params.get('query'),
  })

  const suggestions = await anno.suggest({
    lang: locale,
    query,
  })

  return Response.json(suggestions, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=31536000',
    },
  })
}
