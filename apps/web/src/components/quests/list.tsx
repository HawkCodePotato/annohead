import { type Dlcs, type Quests, type Regions } from '@anno/db/client'
import { useTranslations } from 'next-intl'

import { type QuestFilters } from '@/lib/validators'

import { Empty } from '../common/empty'
import { Pagination } from '../common/pagination'
import { QuestCard } from './card'
import { QuestFiltersCard } from './filters'

type Props = {
  dlcs: Dlcs
  filters: QuestFilters
  quests: Quests
  regions: Regions
}

export function QuestList({ dlcs, filters, quests, regions }: Props) {
  const t = useTranslations('component.quests.list')

  return (
    <div className="flex flex-1 flex-col gap-12">
      <h1 className="text-4xl">{t('title')}</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <QuestFiltersCard dlcs={dlcs} regions={regions} />

        <div className="flex flex-1 flex-col gap-12">
          {quests.rows.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
              {quests.rows.map((quest) => (
                <QuestCard key={quest.guid} quest={quest} />
              ))}
            </div>
          ) : (
            <Empty>{t('empty')}</Empty>
          )}

          <Pagination page={filters.page} pages={quests.pages} />
        </div>
      </div>
    </div>
  )
}
