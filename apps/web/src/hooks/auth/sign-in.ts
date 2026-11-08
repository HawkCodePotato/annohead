import { api } from '@anno/convex'
import { DEFAULT_MIN_PASSWORD_LENGTH } from '@convex-dev/auth/methods/username-password'
import { useSignInWithUsernamePassword } from '@convex-dev/auth/methods/username-password/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { type FunctionArgs } from 'convex/server'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

type Variables = FunctionArgs<typeof api.auth.signInWithUsernamePassword>

const schema = z.object({
  password: z.string().min(DEFAULT_MIN_PASSWORD_LENGTH),
  username: z.string().min(4),
})

export function useSignIn() {
  const t = useTranslations('hook.auth.error')

  const { signIn } = useSignInWithUsernamePassword(api.auth)

  const form = useForm({
    defaultValues: {
      password: '',
      username: '',
    },
    resolver: zodResolver(schema),
  })

  const { mutate, isPending, error } = useMutation<unknown, Error, Variables>({
    async mutationFn(variables) {
      const result = await signIn(variables)

      if (result.status === 'complete') {
        return
      }

      if (result.userError.error === 'INVALID_CREDENTIALS') {
        form.setError('password', {
          message: t(result.userError.error),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'PASSWORD_HAS_SURROUNDING_WHITESPACE') {
        form.setError('password', {
          message: t(result.userError.error),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'PASSWORD_TOO_LONG') {
        form.setError('password', {
          message: t(result.userError.error, {
            max: result.userError.maximumLength,
          }),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'PASSWORD_TOO_SHORT') {
        form.setError('password', {
          message: t(result.userError.error, {
            min: result.userError.minimumLength,
          }),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'RATE_LIMITED') {
        form.setError('username', {
          message: t(result.userError.error, {
            seconds: result.userError.retryAfterMs / 1000,
          }),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'USER_NOT_FOUND') {
        form.setError('username', {
          message: t(result.userError.error),
          type: 'custom',
        })

        return
      }

      form.setError('password', {
        message: t(result.userError.error),
        type: 'custom',
      })
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    if (isPending) {
      return
    }

    mutate(data)
  })

  return {
    error,
    form,
    isPending,
    onSubmit,
    signIn: mutate,
  }
}
