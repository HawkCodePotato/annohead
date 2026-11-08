import { type Building } from '@anno/db/client'
import { compact } from 'lodash'
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
  building: Building
}

export function BuildingPage({ building }: Props) {
  const t = useTranslations('component.buildings.page')
  const f = useFormatter()

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          {building.region?.key || building.dlc?.key ? (
            <div className="flex gap-4">
              <RegionCard region={building.region?.key} />

              <DlcCard dlc={building.dlc?.key} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {building.category ? (
              <div className="text-gray-11 text-sm">{building.category}</div>
            ) : null}

            <h1 className="text-4xl leading-tight">{building.name}</h1>

            {building.description ? <Html>{building.description}</Html> : null}
          </div>
        </div>

        {building.icon ? (
          <Icon className="size-50 lg:size-32" icon={building.icon} />
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div className="flex flex-col gap-6 empty:hidden">
          {building.costs.length ? (
            <DataList.Root title={t('details.construction')}>
              {building.costs.map((item) => (
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

          {building.maintenance.length ? (
            <DataList.Root title={t('details.maintenance')}>
              {building.maintenance.map((item) => (
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
          {building.inputs.length ? (
            <DataList.Root title={t('details.inputs')}>
              {building.inputs.map((item) => (
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

          {building.outputs.length ? (
            <DataList.Root title={t('details.outputs')}>
              {building.outputs.map((item) => (
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

          {building.workforce.length ? (
            <DataList.Root title={t('details.workforce')}>
              {building.workforce.map((item) => (
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
          {building.effects.length ? (
            <DataList.Root title={t('details.effects')}>
              {building.effects.map((item) => (
                <DataList.Item
                  icon={
                    item.attribute
                      ? getIcon(`attribute.${item.attribute}`)
                      : null
                  }
                  key={`${item.buildingGuid}:${item.attribute}`}
                  name={item.name}
                  value={
                    item.value
                      ? f.number(
                          item.isPercent ? item.value / 100 : item.value,
                          {
                            signDisplay: 'always',
                            style: item.isPercent ? 'percent' : undefined,
                          },
                        )
                      : undefined
                  }
                />
              ))}
            </DataList.Root>
          ) : null}

          {building.buffs.length ? (
            <DataList.Root title={t('details.buffs')}>
              {building.buffs.map((item) => (
                <DataList.Item
                  icon={
                    item.attribute
                      ? getIcon(`attribute.${item.attribute}`)
                      : undefined
                  }
                  key={`${item.buildingGuid}:${item.attribute}`}
                  name={item.name}
                  value={
                    item.value
                      ? f.number(item.value, {
                          signDisplay: 'always',
                        })
                      : undefined
                  }
                />
              ))}
            </DataList.Root>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 empty:hidden">
          {building.unlockedBy.length ? (
            <DataList.Root title={t('details.unlocked')}>
              {building.unlockedBy.map((item) => (
                <DataList.Link
                  href={getUrl('tech', item.guid, item.slug)}
                  icon={item.icon}
                  key={item.guid}
                  name={item.name}
                />
              ))}
            </DataList.Root>
          ) : null}

          <DataList.Root title={t('other.title')}>
            {building.needsFuel ? (
              <DataList.Item
                icon={getIcon('common.coal')}
                name={t('other.needsFuel')}
              />
            ) : null}

            {building.baseProductivity ? (
              <DataList.Item
                name={t('other.baseProductivity')}
                value={f.number(building.baseProductivity / 100, {
                  style: 'percent',
                })}
              />
            ) : null}

            {building.cycleTime ? (
              <DataList.Item
                name={t('other.cycleTime')}
                value={f.number(building.cycleTime, {
                  style: 'unit',
                  unit: 'second',
                })}
              />
            ) : null}

            {building.radius ? (
              <DataList.Item name={t('other.radius')} value={building.radius} />
            ) : null}

            {building.transporterRange ? (
              <DataList.Item
                name={t('other.transporterRange')}
                value={building.transporterRange}
              />
            ) : null}

            {building.streetRadius ? (
              <DataList.Item
                name={t('other.streetRadius')}
                value={building.streetRadius}
              />
            ) : null}

            {building.category ? (
              <DataList.Item
                code
                name={t('other.category')}
                value={building.category}
              />
            ) : null}

            {building.template ? (
              <DataList.Item
                code
                name={t('other.template')}
                value={building.template}
              />
            ) : null}
          </DataList.Root>
        </div>
      </div>

      {building.phases.length ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl">{t('phases.title')}</h2>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {building.phases.map((phase) => (
              <DataList.Root
                className="flex-1"
                key={phase.guid}
                title={phase.name ?? t('phases.phase')}
              >
                {phase.durationSeconds ? (
                  <DataList.Item
                    name={t('phases.duration')}
                    value={f.number(phase.durationSeconds / 60, {
                      style: 'unit',
                      unit: 'minute',
                    })}
                  />
                ) : null}

                <DataList.Label>{t('details.construction')}</DataList.Label>

                {phase.costs.map((item) => (
                  <DataList.Link
                    href={getUrl('product', item.guid, item.slug)}
                    icon={item.icon}
                    key={item.guid}
                    name={item.name}
                    value={item.amount}
                  />
                ))}

                <DataList.Label>{t('details.maintenance')}</DataList.Label>

                {phase.maintenance.map((item) => (
                  <DataList.Item
                    icon={item.icon}
                    key={item.guid}
                    name={item.name}
                    value={item.amount}
                  />
                ))}

                <DataList.Label>{t('phases.unlock')}</DataList.Label>

                {compact(
                  phase.unlockRequirements.map((item) => item.population),
                ).map((item) => (
                  <DataList.Item
                    icon={item.icon}
                    key={item.guid}
                    name={item.name}
                    value={item.amount}
                  />
                ))}
              </DataList.Root>
            ))}
          </div>
        </div>
      ) : null}

      <CommentList guid={building.guid} />
    </div>
  )
}
