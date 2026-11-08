'use client'

import { cn } from 'cn'
import { clamp, range } from 'lodash'
import { useSearchParams } from 'next/navigation'

import { NavLink, usePathname } from '@/intl/nav'

type Props = {
  page: number | null
  pages: number
}

export function Pagination({ page, pages }: Props) {
  const path = usePathname()
  const search = useSearchParams()

  const pagination = getPagination(pages, page ?? 1)

  if (pagination.length > 1) {
    return (
      <div className="flex justify-center gap-2">
        {pagination.map((index) => {
          if (typeof index === 'string') {
            return (
              <div
                className="bg-accent-2 pointer-events-none flex size-8 items-center justify-center rounded-lg text-sm"
                key={index}
              >
                &#8230;
              </div>
            )
          }

          const params = new URLSearchParams(search)

          if (index > 1) {
            params.set('page', String(index))
          } else {
            params.delete('page')
          }

          return (
            <NavLink
              className={cn(
                'bg-accent-3 ring-accent-8 flex size-8 items-center justify-center rounded-lg text-sm tabular-nums outline-none focus-visible:ring-2',
                index === page && 'bg-accent-5',
                index === 1 && !page && 'bg-accent-5',
              )}
              href={params.size ? `${path}?${params}` : path}
              key={index}
            >
              {index}
            </NavLink>
          )
        })}
      </div>
    )
  }

  return null
}

function getPagination(pages: number, page: number) {
  if (pages <= 7) {
    return range(1, pages + 1)
  }

  const middle = clamp(page - 1, 3, pages - 4)

  return [
    1,
    middle > 3 ? 'start' : 2,
    middle,
    middle + 1,
    middle + 2,
    middle + 2 < pages - 2 ? 'end' : pages - 1,
    pages,
  ] as const
}
