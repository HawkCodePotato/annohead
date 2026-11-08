import { type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function Label({ children }: Props) {
  return (
    <div className="text-gray-11 text-sm font-bold not-first-of-type:mt-4">
      {children}
    </div>
  )
}
