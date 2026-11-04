'use client'

import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'

import { SignUp } from '@/components/auth/sign-up'
import { Loading } from '@/components/common/loading'
import { Redirect } from '@/components/common/redirect'

export default function Page() {
  return (
    <>
      <AuthLoading>
        <Loading />
      </AuthLoading>

      <Authenticated>
        <Redirect href="/" />
      </Authenticated>

      <Unauthenticated>
        <SignUp />
      </Unauthenticated>
    </>
  )
}
