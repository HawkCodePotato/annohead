'use client'

import { type SearchHit, type Suggestions } from '@anno/db/client'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import Form from 'next/form'
import { useLocale, useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { useRef, useState } from 'react'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'
import { searchFilters } from '@/lib/validators'

import { RegionCard } from '../shared/region'
import { SearchIcon } from './icon'

type Props = {
  className?: string
  inputClassName?: string
}

export function SearchBox({ className, inputClassName }: Props) {
  const locale = useLocale()
  const t = useTranslations('component.search')

  const form = useRef<HTMLFormElement>(null)
  const highlighted = useRef<SearchHit>(undefined)

  const [filters] = useQueryStates(searchFilters)

  const [text, setText] = useState(filters.query ?? '')

  const query = text.trim().toLowerCase()

  const suggestions = useQuery({
    enabled: query !== '',
    placeholderData: keepPreviousData,
    async queryFn(context) {
      const url = new URL('/api/search', window.location.href)

      url.searchParams.set('locale', locale)
      url.searchParams.set('query', query)

      const response = await fetch(url, {
        signal: context.signal,
      })

      if (!response.ok) {
        throw new Error(`Search suggestions failed: ${response.status}`)
      }

      return (await response.json()) as Suggestions
    },
    queryKey: [
      'search',
      {
        locale,
        query,
      },
    ],
    staleTime: Number.POSITIVE_INFINITY,
  })

  const items = query ? (suggestions.data ?? []) : []

  return (
    <Form
      action="/search"
      className={cn('flex justify-center gap-4', className)}
      ref={form}
    >
      <Autocomplete.Root
        filter={null}
        items={items}
        itemToStringValue={(item: SearchHit) => item.name}
        onItemHighlighted={(item) => {
          highlighted.current = item
        }}
        onValueChange={(next) => {
          setText(next)
        }}
        value={text}
      >
        <Autocomplete.InputGroup
          className={cn(
            'bg-gray-3 ring-accent-8 flex w-full items-center rounded-lg focus-within:ring-2 not-data-list-empty:data-popup-open:rounded-b-none not-data-list-empty:data-popup-open:ring-0',
            inputClassName,
          )}
        >
          <div className="mx-4 ml-3 flex size-6 items-center justify-center">
            <MagnifyingGlassIcon className="size-5" weight="bold" />
          </div>

          <Autocomplete.Input
            className="h-10 w-full pr-3 outline-none"
            maxLength={32}
            name="query"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !highlighted.current) {
                form.current?.requestSubmit()
              }
            }}
            placeholder={t('box.placeholder')}
            type="search"
          />
        </Autocomplete.InputGroup>

        <Autocomplete.Portal hidden={items.length === 0}>
          <Autocomplete.Positioner className="z-50 outline-none">
            <Autocomplete.Popup className="bg-gray-2 w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-b-lg">
              <Autocomplete.List>
                {(item: SearchHit) => (
                  <Autocomplete.Item
                    className="data-highlighted:bg-accent-4 flex h-10 items-center gap-3 px-3 leading-tight outline-none"
                    key={`${item.type}-${item.guid}`}
                    onClick={() => {
                      setText('')
                    }}
                    render={
                      <NavLink href={getUrl(item.type, item.guid, item.slug)} />
                    }
                    value={item}
                  >
                    <SearchIcon className="size-6 shrink-0" item={item} />

                    <div className="flex min-w-0 flex-1 items-center gap-3 font-medium">
                      <span className="truncate">{item.name}</span>

                      {item.type === 'building' ||
                      item.type === 'chain' ||
                      item.type === 'unit' ? (
                        <div className="flex shrink-0 gap-2">
                          {item.regions.map((region) => (
                            <RegionCard key={region} region={region} />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <span className="text-gray-11 shrink-0 text-sm">
                      {t(`card.type.${item.type}`)}
                    </span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    </Form>
  )
}
