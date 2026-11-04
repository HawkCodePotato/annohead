import { Field as Component } from '@base-ui/react/field'
import { type ReactNode } from 'react'

type Props = {
  children: ReactNode
  label: string
  hint?: string
  error?: string
}

export function Field({ children, label, error, hint }: Props) {
  return (
    <Component.Root className="flex flex-col gap-1">
      <Component.Label className="text-sm font-bold">{label}</Component.Label>

      {children}

      {error ? (
        <Component.Error className="text-red-11 text-sm" match>
          {error}
        </Component.Error>
      ) : null}

      {hint ? (
        <Component.Description className="text-gray-11 text-sm">
          Visible on your profile
        </Component.Description>
      ) : null}
    </Component.Root>
  )
}
