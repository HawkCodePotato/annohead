import { type Unit } from '@anno/db/client'
import { useFormatter, useTranslations } from 'next-intl'

import { getUrl } from '@/lib/url'

import { CommentList } from '../comments/list'
import { Html } from '../common/html'
import { Icon } from '../common/icon'
import { DataList } from '../data-list'
import { RegionCard } from '../shared/region'

type Props = {
  unit: Unit
}

export function UnitPage({ unit }: Props) {
  const t = useTranslations('component.units.page')
  const f = useFormatter()

  const stats = [
    ['health', unit.health],
    ['soldiers', unit.soldiers],
    ['morale', unit.morale],
    ['speed', unit.speed],
    ['cargoSlots', unit.cargoSlots],
    ['itemSockets', unit.itemSockets],
    ['moduleSlots', unit.moduleSlots],
  ] as const

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          {unit.region?.key ? (
            <div className="flex gap-4">
              <RegionCard region={unit.region.key} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {unit.type ? (
              <div className="text-gray-11 text-sm">{unit.type.name}</div>
            ) : null}

            <h1 className="text-4xl leading-tight">{unit.name}</h1>

            {unit.description ? <Html>{unit.description}</Html> : null}
          </div>
        </div>

        {unit.icon ? (
          <Icon className="size-50 lg:size-32" icon={unit.icon} />
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div className="flex flex-col gap-6 empty:hidden">
          {unit.costs.length ? (
            <DataList.Root title={t('costs')}>
              {unit.costs.map((item) => (
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

          {unit.maintenance.length ? (
            <DataList.Root title={t('maintenance')}>
              {unit.maintenance.map((item) => (
                <DataList.Item
                  icon={item.icon}
                  key={item.guid}
                  name={item.name}
                  value={item.amount}
                />
              ))}
            </DataList.Root>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 empty:hidden">
          {unit.recruitedAt.length ? (
            <DataList.Root title={t('recruited')}>
              {unit.recruitedAt.map((item) => (
                <DataList.Link
                  href={getUrl('building', item.guid, item.slug)}
                  icon={item.icon}
                  key={item.guid}
                  name={item.name}
                  value={
                    <RegionCard className="size-5" region={item.region?.key} />
                  }
                />
              ))}
            </DataList.Root>
          ) : null}

          {unit.unlockedBy.length ? (
            <DataList.Root title={t('unlocked')}>
              {unit.unlockedBy.map((item) => (
                <DataList.Link
                  href={getUrl('tech', item.guid, item.slug)}
                  icon={item.icon}
                  key={item.guid}
                  name={item.name}
                />
              ))}
            </DataList.Root>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 empty:hidden">
          <DataList.Root title={t('stats.title')}>
            {stats.map(([key, value]) =>
              value ? (
                <DataList.Item
                  key={key}
                  name={t(`stats.${key}`)}
                  value={f.number(value)}
                />
              ) : null,
            )}

            {unit.buildSeconds ? (
              <DataList.Item
                name={t('stats.buildTime')}
                value={f.number(unit.buildSeconds / 60, {
                  style: 'unit',
                  unit: 'minute',
                })}
              />
            ) : null}
          </DataList.Root>
        </div>
      </div>

      <CommentList guid={unit.guid} />
    </div>
  )
}
