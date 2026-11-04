'use client'

import { type Chain } from '@anno/db/client'
import { NumberField } from '@base-ui/react/number-field'
import {
  ArrowsHorizontalIcon,
  MinusIcon,
  PlusIcon,
} from '@phosphor-icons/react/dist/ssr'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { Icon } from '../common/icon'

type Props = {
  chain: Chain
}

export function Calculator({ chain }: Props) {
  const t = useTranslations('component.chains.calculator')
  const f = useFormatter()

  const [count, setCount] = useState(1)

  const root = chain.nodes.find((node) => !node.parentId)

  const output =
    (60 / (chain.building?.cycleTime ?? 60)) *
    count *
    ((chain.building?.baseProductivity ?? 100) / 100)

  return (
    <div className="bg-gray-1 flex flex-col gap-4 rounded-lg p-4">
      <div className="text-sm font-bold">{t('title')}</div>

      <NumberField.Root
        className="flex flex-1 items-center justify-between gap-4"
        id={`chain-${chain.guid}`}
        min={1}
        onClick={(event) => {
          event.preventDefault()
        }}
        onValueChange={(next) => {
          setCount(next ?? 1)
        }}
        value={count}
      >
        <NumberField.ScrubArea className="flex min-w-0">
          {root ? (
            <NavLink
              className="ring-accent-8 flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2"
              href={getUrl('building', root.guid, root.slug)}
            >
              {root.icon ? (
                <Icon className="size-6 shrink-0" icon={root.icon} />
              ) : null}

              <span className="truncate">{root.name}</span>
            </NavLink>
          ) : (
            <label className="cursor-ew-resize" htmlFor={`chain-${chain.guid}`}>
              {chain.building?.name}
            </label>
          )}

          <NumberField.ScrubAreaCursor>
            <ArrowsHorizontalIcon className="size-6" />
          </NumberField.ScrubAreaCursor>
        </NumberField.ScrubArea>

        <NumberField.Group className="border-gray-4 bg-gray-2 flex shrink-0 rounded-md border">
          <NumberField.Decrement className="border-gray-4 hover:bg-accent-4 active:bg-accent-5 flex size-8 items-center justify-center rounded-l-md border-r transition-colors">
            <MinusIcon weight="bold" />
          </NumberField.Decrement>

          <NumberField.Input className="ring-accent-8 z-10 w-16 rounded-md px-2 py-1 tabular-nums outline-none focus-visible:ring-2" />

          <NumberField.Increment className="border-gray-4 hover:bg-accent-4 active:bg-accent-5 flex size-8 items-center justify-center rounded-r-md border-l transition-colors">
            <PlusIcon weight="bold" />
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>

      <div className="flex justify-between gap-4">
        <div>{t('cycleTime')}</div>

        {chain.building?.cycleTime ? (
          <div className="tabular-nums">
            {f.number(chain.building.cycleTime, {
              style: 'unit',
              unit: 'second',
            })}
          </div>
        ) : null}
      </div>

      <div className="flex justify-between gap-4">
        <div>{t('output')}</div>

        <div className="tabular-nums">
          {t(
            'tons',
            {
              tons: output,
            },
            {
              number: {
                tons: {
                  maximumFractionDigits: 2,
                },
              },
            },
          )}
        </div>
      </div>

      <div className="mt-4 text-sm font-bold">{t('inputs')}</div>

      <div className="flex flex-col gap-2">
        {chain.nodes
          .filter((node) => Boolean(node.parentId))
          .map((node) => {
            const exact =
              (output * (node.cycleTime ?? 60)) /
              60 /
              ((node.baseProductivity ?? 100) / 100)

            const place = Math.ceil(exact - 1e-9)

            return (
              <div className="flex justify-between gap-4" key={node.id}>
                <NavLink
                  className="ring-accent-8 flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2"
                  href={getUrl('building', node.guid, node.slug)}
                >
                  {node.icon ? (
                    <Icon className="size-6 shrink-0" icon={node.icon} />
                  ) : null}

                  <span className="truncate">{node.name}</span>
                </NavLink>

                <div className="flex shrink-0 gap-2 tabular-nums">
                  {place - exact < 1e-9 ? null : (
                    <span className="text-gray-11">
                      {f.number(exact, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}

                  {t('buildings', {
                    required: place,
                  })}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
