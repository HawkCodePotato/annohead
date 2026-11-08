import { type QuestOutcome } from '@anno/db/client'
import { useFormatter, useTranslations } from 'next-intl'

import { getIcon } from '@/lib/icons'

import { DataList } from '../../data-list'

const HOUR_MS = 3_600_000

type Props = {
  outcome: QuestOutcome
}

export function QuestOutcomeItem({ outcome }: Props) {
  const t = useTranslations('component.quests.outcome')
  const f = useFormatter()

  if (outcome.kind === 'effect') {
    const description =
      [
        outcome.targets
          .map((target) => target.name)
          .filter(Boolean)
          .join(', '),
        outcome.duration
          ? t('duration', {
              hours: Math.round(outcome.duration / HOUR_MS),
            })
          : null,
      ]
        .filter(Boolean)
        .join(', ') || null

    if (!outcome.modifiers.length) {
      return (
        <DataList.Item
          description={description}
          icon={outcome.icon}
          name={outcome.name ?? t('effect')}
        />
      )
    }

    return (
      <>
        {outcome.modifiers.map((modifier) => (
          <DataList.Item
            description={description}
            icon={
              modifier.attribute
                ? getIcon(`attribute.${modifier.attribute}`)
                : null
            }
            key={`${modifier.name}:${modifier.value}`}
            name={modifier.name}
            value={
              modifier.value
                ? f.number(
                    modifier.isPercent ? modifier.value / 100 : modifier.value,
                    {
                      signDisplay: 'always',
                      style: modifier.isPercent ? 'percent' : undefined,
                    },
                  )
                : undefined
            }
          />
        ))}
      </>
    )
  }

  if (
    outcome.kind === 'reputation' ||
    outcome.kind === 'xp' ||
    outcome.kind === 'power'
  ) {
    return (
      <DataList.Item
        name={t(outcome.kind)}
        value={
          outcome.amount
            ? f.number(outcome.amount, {
                signDisplay: 'always',
              })
            : undefined
        }
      />
    )
  }

  if (outcome.kind === 'goods' || outcome.kind === 'item') {
    return (
      <DataList.Item
        icon={outcome.icon}
        name={outcome.name}
        value={outcome.amount ?? outcome.value ?? undefined}
      />
    )
  }

  if (
    outcome.kind === 'racer' ||
    outcome.kind === 'unlock' ||
    outcome.kind === 'lock' ||
    outcome.kind === 'incident' ||
    outcome.kind === 'storyline'
  ) {
    return (
      <DataList.Item
        description={t(outcome.kind)}
        icon={outcome.icon}
        name={outcome.name ?? t(`${outcome.kind}Fallback`)}
        value={outcome.value ?? undefined}
      />
    )
  }

  return <DataList.Item icon={outcome.icon} name={outcome.name} />
}

type ListProps = {
  outcomes: Array<QuestOutcome>
}

export function QuestOutcomeList({ outcomes }: ListProps) {
  const seen = new Map<string, number>()

  return outcomes.map((outcome) => {
    const id = [
      outcome.kind,
      outcome.guid,
      outcome.name,
      outcome.value,
      outcome.amount,
    ].join(':')
    const count = (seen.get(id) ?? 0) + 1
    seen.set(id, count)

    return <QuestOutcomeItem key={`${id}:${count}`} outcome={outcome} />
  })
}
