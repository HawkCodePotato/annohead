import { Checkbox } from '@base-ui/react/checkbox'
import { CheckboxGroup } from '@base-ui/react/checkbox-group'
import { type UseQueryStatesKeysMap, type UseQueryStatesReturn } from 'nuqs'
import { type ReactNode } from 'react'

import { useRouter } from '@/intl/nav'

import { Icon } from './icon'

type Item = {
  icon?: string | null
  label?: string | null
  value: string | number
  after?: ReactNode
}

type Props<Type extends UseQueryStatesKeysMap> = {
  filters: UseQueryStatesReturn<Type>
  id: keyof Type
  items: Array<Item>
  refresh?: boolean
  title: string
}

export function FiltersCard<Type extends UseQueryStatesKeysMap>({
  filters,
  id,
  items,
  refresh = true,
  title,
}: Props<Type>) {
  const router = useRouter()

  const [get, set] = filters

  const value = get[id] as Array<string | number> | null

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-bold">{title}</h3>

      <CheckboxGroup
        className="flex flex-col gap-2"
        onValueChange={async (next) => {
          await set({
            [id]: next,
            page: null,
          } as unknown as Parameters<typeof set>[0])

          if (refresh) {
            router.refresh()
          }
        }}
        value={value ? value.map(String) : []}
      >
        {items.map((item) => (
          <Checkbox.Root
            className="ring-accent-8 hover:bg-accent-4 data-checked:bg-accent-5 flex h-8 items-center gap-2 rounded-md px-1 transition-colors outline-none focus-visible:ring-2"
            key={item.value}
            value={String(item.value)}
          >
            {item.icon ? (
              <Icon className="size-6" icon={item.icon} />
            ) : (
              <Checkbox.Indicator
                className="border-gray-12 data-checked:bg-gray-12 mx-0.5 flex size-5 items-center justify-center rounded-full border data-checked:border-0"
                keepMounted
              />
            )}

            <span className="text-sm font-medium">{item.label}</span>

            {item.after}
          </Checkbox.Root>
        ))}
      </CheckboxGroup>
    </div>
  )
}
