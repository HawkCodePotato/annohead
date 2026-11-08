import {
  type Dlcs,
  type Ornaments,
  type OrnamentTypes,
  type Regions,
} from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type OrnamentFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { OrnamentCard } from './card'
import { OrnamentFiltersCard } from './filters'

type Props = {
  dlcs: Dlcs
  filters: OrnamentFilters
  ornaments: Ornaments
  regions: Regions
  types: OrnamentTypes
}

export function OrnamentList({
  dlcs,
  filters,
  ornaments,
  regions,
  types,
}: Props) {
  const t = useTranslations('component.ornaments.list')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <OrnamentFiltersCard dlcs={dlcs} regions={regions} types={types} />

        <div className="flex flex-1 flex-col gap-12">
          {ornaments.rows.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
              {ornaments.rows.map((ornament) => (
                <OrnamentCard key={ornament.guid} ornament={ornament} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}

          <Pagination page={filters.page} pages={ornaments.pages} />
        </div>
      </div>
    </div>
  )
}
