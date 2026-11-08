import { type ReactNode } from 'react'

type Props = {
  children: ReactNode
  title: string
}

export function Section({ children, title }: Props) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="text-gray-11 text-sm font-bold">{title}</div>

      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}
