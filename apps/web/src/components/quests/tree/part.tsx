import { type QuestPart } from '@anno/db/client'
import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react/dist/ssr'
import { type Node, type NodeProps } from '@xyflow/react'
import { cn } from 'cn'
import { useFormatter, useTranslations } from 'next-intl'

import { Html } from '../../common/html'
import { Icon } from '../../common/icon'
import { QuestHandle } from './handle'
import { usePath } from './path'

export type PartNode = Node<
  {
    part: QuestPart
  },
  'part'
>

export function QuestPartNode({ data: { part }, id }: NodeProps<PartNode>) {
  const t = useTranslations('component.quests.page')
  const f = useFormatter()

  const { off, on } = usePath()

  return (
    <div
      className={cn(
        'bg-gray-2 flex h-full w-full rounded-lg transition-opacity',
        on.has(id) && 'ring-accent-8 ring-2',
        off.has(id) && 'opacity-40',
      )}
    >
      <QuestHandle type="target" />

      <div className="flex h-fit max-w-120 items-start gap-4 p-6">
        {part.icon ? <Icon className="size-10" icon={part.icon} /> : null}

        <div className="flex flex-col gap-2">
          <div className="text-xl leading-tight font-bold">
            {part.name ?? t('untitled')}
          </div>

          {part.story ? (
            <Html className="text-gray-11 text-sm whitespace-pre-line">
              {part.story}
            </Html>
          ) : null}

          {part.requirements.length ? (
            <div className="flex flex-col gap-2">
              {part.requirements.map((item) => (
                <div
                  className="flex items-center gap-2 text-sm"
                  key={item.name}
                >
                  {item.negative ? (
                    <XCircleIcon className="size-5" />
                  ) : (
                    <CheckCircleIcon className="size-5" />
                  )}

                  <span>{item.name}</span>

                  <span className="tabular-nums">
                    {item.value ? f.number(item.value) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {part.choices.length ? null : (
            <div className="text-gray-11 text-sm">{t('empty')}</div>
          )}
        </div>
      </div>

      {/* the walk jumps on from a part it passed through without a pick */}
      <QuestHandle type="source" />
    </div>
  )
}
