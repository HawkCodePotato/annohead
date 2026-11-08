import { type Quest } from '@anno/db/client'
import { type walkQuest } from '@anno/db/walk'
import { createContext, useContext } from 'react'

export function partId(guid: number) {
  return `part-${guid}`
}

export function choiceId(guid: number) {
  return `choice-${guid}`
}

export function optionId(guid: number, idx: number | null) {
  return `option-${guid}-${idx}`
}

/** Chart nodes as the picks so far play out: on the path, ruled out (dimmed), or not pickable (decided by the game). */
export type QuestPath = {
  locked: Set<string>
  off: Set<string>
  on: Set<string>
}

export function tracePath(
  quest: NonNullable<Quest>,
  walk: ReturnType<typeof walkQuest>,
): QuestPath {
  const on = new Set<string>()
  const off = new Set<string>()
  const locked = new Set<string>()
  const last = walk.legs.at(-1)
  const reached = quest.parts.findIndex((p) => p.guid === last?.part.guid)

  for (const [index, part] of quest.parts.entries()) {
    const leg = walk.legs.find((l) => l.part.guid === part.guid)
    // the walk is past this part (or done): whatever it did not visit is ruled out; parts ahead stay open
    const settled = walk.done || index < reached

    if (leg) {
      on.add(partId(part.guid))
    } else if (settled) {
      off.add(partId(part.guid))
    }

    const steps = new Map(leg?.steps.map((s) => [s.choice.guid, s]))
    const complete = leg ? leg !== last || walk.done : settled

    for (const choice of part.choices) {
      const step = steps.get(choice.guid)

      if (!step) {
        if (complete) {
          off.add(choiceId(choice.guid))

          for (const option of choice.options) {
            off.add(optionId(choice.guid, option.idx))
            locked.add(optionId(choice.guid, option.idx))
          }
        }

        continue
      }

      on.add(choiceId(choice.guid))

      for (const option of choice.options) {
        const id = optionId(choice.guid, option.idx)
        const offered = step.options.includes(option)

        if (option === step.picked) {
          on.add(id)
        } else if (step.picked || !offered) {
          off.add(id)
        }

        if (step.forced || !offered) {
          locked.add(id)
        }
      }
    }
  }

  return {
    locked,
    off,
    on,
  }
}

export const PathContext = createContext<
  QuestPath & {
    pick: (choice: number, idx: number) => void
  }
>({
  locked: new Set(),
  off: new Set(),
  on: new Set(),
  pick: () => null,
})

export function usePath() {
  return useContext(PathContext)
}
