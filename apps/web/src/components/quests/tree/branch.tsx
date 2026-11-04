import { type QuestOption } from '@anno/db/client'
import { CheckIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { type Node, type NodeProps } from '@xyflow/react'
import { cn } from 'cn'
import { useTranslations } from 'next-intl'

import { DataList } from '../../data-list'
import { QuestHandle } from './handle'
import { QuestOutcomeList } from './outcome'
import { usePath } from './path'

export type BranchNode = Node<
  {
    choice: number
    option: QuestOption
  },
  'branch'
>

export function QuestBranchNode({
  data: { choice, option },
  id,
}: NodeProps<BranchNode>) {
  const t = useTranslations('component.quests.choice')

  const { locked, off, pick } = usePath()

  const holds = option.idx === 0
  const label = t(holds ? 'holds' : 'fails')

  return (
    <div
      className={cn(
        'flex items-center transition-opacity',
        off.has(id) && 'opacity-40',
      )}
    >
      <QuestHandle type="target" />

      <div className="flex size-14 shrink-0 items-center justify-center">
        <button
          className={cn(
            'ring-accent-8 ring-offset-gray-2 pointer-events-auto flex size-10 rotate-45 items-center justify-center rounded-md text-white ring-offset-2 outline-none focus-visible:ring-2',
            holds ? 'bg-green-9' : 'bg-red-9',
          )}
          disabled={locked.has(id)}
          onClick={() => pick(choice, option.idx ?? 0)}
          title={label}
          type="button"
        >
          {holds ? (
            <CheckIcon className="size-5 -rotate-45" weight="bold" />
          ) : (
            <XIcon className="size-5 -rotate-45" weight="bold" />
          )}
        </button>
      </div>

      {option.outcomes.length ? (
        <>
          <div className="bg-gray-7 h-0.5 w-8" />

          <DataList.Root className="bg-gray-3 w-72" title={t('outcomes')}>
            <QuestOutcomeList outcomes={option.outcomes} />
          </DataList.Root>
        </>
      ) : null}

      <QuestHandle type="source" />
    </div>
  )
}
