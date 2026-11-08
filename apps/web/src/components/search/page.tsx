import { type SearchResults } from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type SearchFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { SearchCard } from './card'
import { SearchFiltersCard } from './filters'

type Props = {
  data: SearchResults
  filters: SearchFilters
}

export function SearchPage({ data, filters }: Props) {
  const t = useTranslations('component.search.page')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <div className="flex flex-col gap-8">
        <div className="flex gap-4">
          <h1 className="text-4xl">{t('title')}</h1>

          {data.total > 0 ? (
            <span className="tabular-nums">
              {t('results', {
                total: data.total,
              })}
            </span>
          ) : null}
        </div>

        <SearchFiltersCard />
      </div>

      {data.rows.length ? (
        <div className="flex flex-col gap-2">
          {data.rows.map((item) => (
            <SearchCard item={item} key={item.guid} />
          ))}
        </div>
      ) : (
        <Empty>{t('empty')}</Empty>
      )}

      <Pagination page={filters.page} pages={data.pages} />
    </div>
  )
}
