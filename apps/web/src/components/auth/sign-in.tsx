'use client'

import { useTranslations } from 'next-intl'
import { Controller } from 'react-hook-form'

import { useSignIn } from '@/hooks/auth/sign-in'
import { NavLink } from '@/intl/nav'

import { Button } from '../common/button'
import { Field } from '../common/field'
import { TextBox } from '../common/text-box'
import { SteamSignIn } from './steam'

export function SignIn() {
  const t = useTranslations('component.auth.signIn')

  const { form, isPending, onSubmit } = useSignIn()

  return (
    <form
      className="flex w-sm flex-col items-stretch gap-4"
      onSubmit={onSubmit}
    >
      <h1 className="text-center text-2xl">{t('action.submit')}</h1>

      <Controller
        control={form.control}
        name="username"
        render={({ field, fieldState }) => (
          <Field
            error={fieldState.error?.message}
            label={t('field.username.label')}
          >
            <TextBox {...field} placeholder={t('field.username.placeholder')} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field
            error={fieldState.error?.message}
            label={t('field.password.label')}
          >
            <TextBox
              {...field}
              placeholder={t('field.password.placeholder')}
              type="password"
            />
          </Field>
        )}
      />

      <Button loading={isPending} type="submit">
        {t('action.submit')}
      </Button>

      <SteamSignIn />

      <NavLink
        className="text-gray-11 text-center text-sm leading-tight"
        href="/auth/sign-up"
      >
        {t('action.signUp')}
      </NavLink>
    </form>
  )
}
