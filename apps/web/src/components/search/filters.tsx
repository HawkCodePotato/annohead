'use client'

import { type SearchType, SearchTypes } from '@anno/db/search'
import { Checkbox } from '@base-ui/react/checkbox'
import { CheckboxGroup } from '@base-ui/react/checkbox-group'
import { isEqual, sortBy } from 'lodash'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'

import { useRouter } from '@/intl/nav'
import { searchFilters } from '@/lib/validators'

export function SearchFiltersCard() {
  const router = useRouter()

  const t = useTranslations('component.search.filters')

  const [filters, setFilters] = useQueryStates(searchFilters)

  return (
    <CheckboxGroup
      className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:flex"
      onValueChange={async (next) => {
        await setFilters({
          page: null,
          types: isEqual(sortBy(next), sortBy(SearchTypes))
            ? null
            : (next as Array<SearchType>),
        })

        router.refresh()
      }}
      value={filters.types ?? SearchTypes.map(String)}
    >
      {SearchTypes.map((item) => (
        <Checkbox.Root
          className="ring-accent-8 hover:bg-accent-4 data-checked:bg-accent-5 flex h-8 items-center gap-2 rounded-md pr-2 pl-1 transition-colors outline-none focus-visible:ring-2"
          key={item}
          value={item}
        >
          <Checkbox.Indicator
            className="border-gray-12 data-checked:bg-gray-12 mx-0.5 flex size-5 items-center justify-center rounded-full border data-checked:border-0"
            keepMounted
          />

          <span className="text-sm font-bold">{t(item)}</span>
        </Checkbox.Root>
      ))}
    </CheckboxGroup>
  )
}
