import { api } from '@anno/convex'
import { DEFAULT_MIN_PASSWORD_LENGTH } from '@convex-dev/auth/methods/username-password'
import { useSignUpWithUsernamePassword } from '@convex-dev/auth/methods/username-password/react'
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

export function useSignUp() {
  const t = useTranslations('hook.auth.error')

  const { signUp } = useSignUpWithUsernamePassword(api.auth)

  const form = useForm({
    defaultValues: {
      password: '',
      username: '',
    },
    resolver: zodResolver(schema),
  })

  const { mutate, isPending, error } = useMutation<unknown, Error, Variables>({
    async mutationFn(variables) {
      const result = await signUp(variables)

      if (result.status === 'complete') {
        return
      }

      if (result.userError.error === 'PASSWORD_HAS_SURROUNDING_WHITESPACE') {
        form.setError('password', {
          message: t(result.userError.error),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'PASSWORD_TOO_COMMON') {
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

      if (result.userError.error === 'USERNAME_HAS_INVALID_CHARACTERS') {
        form.setError('username', {
          message: t(result.userError.error),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'USERNAME_HAS_SURROUNDING_WHITESPACE') {
        form.setError('username', {
          message: t(result.userError.error),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'USERNAME_TAKEN') {
        form.setError('username', {
          message: t(result.userError.error),
          type: 'custom',
        })

        return
      }

      if (result.userError.error === 'USERNAME_TOO_SHORT') {
        form.setError('username', {
          message: t(result.userError.error, {
            min: result.userError.minimumLength,
          }),
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
