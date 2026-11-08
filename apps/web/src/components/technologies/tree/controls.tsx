'use client'

import { type TechCategories } from '@anno/db/client'
import { useReactFlow } from '@xyflow/react'

import { Icon } from '../../common/icon'
import { HUB_FOCUS_ZOOM } from './helpers'

type Props = {
  categories: Array<
    TechCategories[number] & {
      x: number
      y: number
    }
  >
}

export function CategoryControls({ categories }: Props) {
  const { setCenter } = useReactFlow()

  return (
    <div className="bg-gray-4 pointer-events-none absolute right-4 bottom-4 z-10 flex flex-wrap gap-1 rounded-sm">
      {categories.map((category) => (
        <button
          className="ring-accent-8 enabled:hover:bg-gray-5 pointer-events-auto flex size-8 items-center justify-center rounded-sm outline-none focus-visible:ring-2"
          key={category.guid}
          onClick={async () => {
            await setCenter(category.x, category.y, {
              duration: 300,
              zoom: HUB_FOCUS_ZOOM,
            })
          }}
          type="button"
        >
          {category.icon ? (
            <Icon className="size-6" icon={category.icon} />
          ) : null}
        </button>
      ))}
    </div>
  )
}
