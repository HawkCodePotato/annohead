'use client'

import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { use } from 'react'

import { SignIn } from '@/components/auth/sign-in'
import { Loading } from '@/components/common/loading'
import { Redirect } from '@/components/common/redirect'
import { getSafeNext } from '@/lib/url'

export default function Page({
  searchParams,
}: PageProps<'/[locale]/auth/sign-in'>) {
  const next = getSafeNext(use(searchParams).next)

  return (
    <>
      <AuthLoading>
        <Loading />
      </AuthLoading>

      <Authenticated>
        <Redirect href={next} />
      </Authenticated>

      <Unauthenticated>
        <SignIn next={next} />
      </Unauthenticated>
    </>
  )
}
