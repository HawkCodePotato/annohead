import { type Ornament } from '@anno/db/client'
import { useFormatter, useTranslations } from 'next-intl'

import { getIcon } from '@/lib/icons'
import { getUrl } from '@/lib/url'

import { CommentList } from '../comments/list'
import { Html } from '../common/html'
import { Icon } from '../common/icon'
import { DataList } from '../data-list'
import { DlcCard } from '../shared/dlc'
import { RegionCard } from '../shared/region'

type Props = {
  ornament: Ornament
}

export function OrnamentPage({ ornament }: Props) {
  const t = useTranslations('component.ornaments.page')
  const f = useFormatter()

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          {ornament.region?.key || ornament.dlc?.key ? (
            <div className="flex gap-4">
              <RegionCard region={ornament.region?.key} />

              <DlcCard dlc={ornament.dlc?.key} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {ornament.types.length ? (
              <div className="text-gray-11 text-sm">
                {f.list(
                  ornament.types.map((type) => type.name ?? ''),
                  {
                    type: 'unit',
                  },
                )}
              </div>
            ) : null}

            <h1 className="text-4xl leading-tight">{ornament.name}</h1>

            {ornament.description ? <Html>{ornament.description}</Html> : null}
          </div>
        </div>

        {ornament.icon ? (
          <Icon className="size-50 lg:size-32" icon={ornament.icon} />
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {ornament.costs.length ? (
          <DataList.Root title={t('costs')}>
            {ornament.costs.map((item) => (
              <DataList.Link
                href={getUrl('product', item.guid, item.slug)}
                icon={item.icon}
                key={item.guid}
                name={item.name}
                value={item.amount}
              />
            ))}
          </DataList.Root>
        ) : null}

        {ornament.value ? (
          <DataList.Root title={t('stats.title')}>
            <DataList.Item
              icon={getIcon('attribute.Prestige')}
              name={t('stats.value')}
              value={f.number(ornament.value)}
            />
          </DataList.Root>
        ) : null}
      </div>

      <CommentList guid={ornament.guid} />
    </div>
  )
}
