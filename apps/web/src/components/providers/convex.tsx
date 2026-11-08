'use client'

import { api } from '@anno/convex'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { type ReactNode } from 'react'

import { convex } from '@/lib/convex'

type Props = {
  children: ReactNode
}

export function ConvexProvider({ children }: Props) {
  return (
    <ConvexAuthProvider
      api={{
        refreshSession: api.auth.refreshSession,
        signOut: api.auth.signOut,
      }}
      client={convex}
    >
      {children}
    </ConvexAuthProvider>
  )
}
