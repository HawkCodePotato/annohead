import { type Regions, type Units, type UnitTypes } from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type UnitFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { UnitCard } from './card'
import { UnitFiltersCard } from './filters'

type Props = {
  filters: UnitFilters
  regions: Regions
  types: UnitTypes
  units: Units
}

export function UnitList({ filters, regions, types, units }: Props) {
  const t = useTranslations('component.units.list')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <UnitFiltersCard regions={regions} types={types} />

        <div className="flex flex-1 flex-col gap-12">
          {units.rows.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
              {units.rows.map((unit) => (
                <UnitCard key={unit.guid} unit={unit} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}

          <Pagination page={filters.page} pages={units.pages} />
        </div>
      </div>
    </div>
  )
}
