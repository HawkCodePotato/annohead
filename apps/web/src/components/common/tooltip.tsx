import { Tooltip as Component } from '@base-ui/react/tooltip'
import { type ReactElement, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  content: string
  offset?: number
  render?: ReactElement
}

export function Tooltip({ children, content, offset = 4, render }: Props) {
  return (
    <Component.Root>
      <Component.Trigger render={render}>{children}</Component.Trigger>

      <Component.Portal>
        <Component.Positioner sideOffset={offset}>
          <Component.Popup className="relative rounded-sm bg-black px-1.5 py-0.5 text-sm font-medium text-white dark:bg-white dark:text-black">
            <Component.Arrow className="relative block h-1.5 w-3 overflow-clip before:absolute before:bottom-0 before:left-1/2 before:h-[calc(6px*sqrt(2))] before:w-[calc(6px*sqrt(2))] before:transform-[translate(-50%,50%)_rotate(45deg)] before:bg-black before:content-[''] data-[side=bottom]:-top-1.5 data-[side=left]:-right-2.25 data-[side=left]:rotate-90 data-[side=right]:-left-2.25 data-[side=right]:-rotate-90 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-180 dark:before:bg-white" />

            {content}
          </Component.Popup>
        </Component.Positioner>
      </Component.Portal>
    </Component.Root>
  )
}
