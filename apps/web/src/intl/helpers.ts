import { type Locale } from 'next-intl'

export function formatRange(locale: Locale, from: number, to: number) {
  const f = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  })

  return f.formatRange(from, to)
}
