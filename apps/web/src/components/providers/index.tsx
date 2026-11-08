import { Tooltip } from '@base-ui/react'
import { ThemeProvider } from '@wrksz/themes/next'
import { NextIntlClientProvider } from 'next-intl'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { type ReactNode } from 'react'

import { ConvexProvider } from './convex'
import { QueryProvider } from './query'

type Props = {
  children: ReactNode
}

export function Providers({ children }: Props) {
  return (
    <NuqsAdapter>
      <NextIntlClientProvider>
        <ConvexProvider>
          <QueryProvider>
            <ThemeProvider attribute="class">
              <Tooltip.Provider>{children}</Tooltip.Provider>
            </ThemeProvider>
          </QueryProvider>
        </ConvexProvider>
      </NextIntlClientProvider>
    </NuqsAdapter>
  )
}
