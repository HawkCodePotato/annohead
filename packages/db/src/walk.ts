import { type Quest } from './client'
import { type QuestTest } from './client/quests'

type Part = Quest['parts'][number]
type Choice = Part['choices'][number]
type Option = Choice['options'][number]
type Check = Exclude<QuestTest['own'], boolean | null>

/** quest variables as the walk has set them; unset ones read as 0 (false) like in the game */
type State = Map<string, number | string>

/** option index picked at each choice, by choice guid */
export type QuestPicks = Record<number, number>

export type QuestStep = {
  choice: Choice
  /** made for the player: a check earlier choices decide, or the only option they leave. Checks only the running game
   * can tell (goods in storage …) are not forced and assume they hold until picked otherwise. */
  forced: boolean
  /** options earlier choices leave open */
  options: Array<Option>
  picked: Option | null
}

export type QuestLeg = {
  part: Part
  steps: Array<QuestStep>
}

function parse(value: string | null): number | string {
  if (value === 'true') {
    return 1
  }
  if (value === 'false' || value === null) {
    return 0
  }
  const number = Number(value)
  return Number.isNaN(number) ? value : number
}

function read(state: State, variable: string) {
  return state.get(variable) ?? 0
}

function compare(check: Check, state: State) {
  const left = read(state, check.variable)
  const right = check.other ? read(state, check.other) : parse(check.value)
  switch (check.comparison) {
    case 'Equals':
      return left === right
    case 'AtLeast':
      return left >= right
    case 'AtMost':
      return left <= right
    case 'LessThan':
      return left < right
    case 'MoreThan':
      return left > right
    default:
      return null
  }
}

/** three-valued: null when only the running game can tell */
function all(values: Array<boolean | null>) {
  if (values.includes(false)) {
    return false
  }
  return values.includes(null) ? null : true
}

function any(values: Array<boolean | null>) {
  if (!values.length || values.includes(true)) {
    return true
  }
  return values.includes(null) ? null : false
}

/** `ignored` variables read as holding either way */
function evaluate(
  test: QuestTest | null,
  state: State,
  ignored?: Set<string | null>,
): boolean | null {
  if (!test) {
    return true
  }
  const { own: tested } = test
  const check = typeof tested === 'object' ? tested : null
  let own = typeof tested === 'boolean' ? tested : null
  if (check) {
    own = compare(check, state)
  }
  if (own !== null && test.negate) {
    own = !own
  }
  if (check && ignored?.has(check.variable)) {
    own = true
  }
  const subs = test.tests.map((sub) => evaluate(sub, state, ignored))
  return all([own, test.any ? any(subs) : all(subs)])
}

function write(state: State, set: Option['sets'][number]) {
  if (!set.variable) {
    return
  }
  const value = set.valueVariable
    ? read(state, set.valueVariable)
    : parse(set.value)
  const current = Number(read(state, set.variable))
  switch (set.operation) {
    case 'Add':
      state.set(set.variable, current + Number(value))
      break
    case 'Subtract':
      state.set(set.variable, current - Number(value))
      break
    case 'Multiply':
      state.set(set.variable, current * Number(value))
      break
    default:
      state.set(set.variable, value)
  }
}

function step(choice: Choice, picks: QuestPicks, state: State): QuestStep {
  if (choice.kind === 'check') {
    const holds = evaluate(choice.test, state)
    return {
      choice,
      forced: holds !== null,
      options: choice.options,
      picked:
        choice.options[
          holds === null ? (picks[choice.guid] ?? 0) : Number(!holds)
        ] ?? null,
    }
  }
  const options = choice.options.filter(
    (option) => evaluate(option.test, state) !== false,
  )
  if (options.length === 1) {
    return {
      choice,
      forced: true,
      options,
      picked: options[0] ?? null,
    }
  }
  return {
    choice,
    forced: false,
    options,
    picked: options.find((option) => option.idx === picks[choice.guid]) ?? null,
  }
}

/**
 * Plays a questline with the given picks: parts earlier choices rule out are skipped, checks on quest variables
 * decide themselves, and the walk stops at the first decision still to pick (`done` false). A part's independent
 * threads (choices nothing leads to) play one after another.
 */
export function walkQuest(quest: NonNullable<Quest>, picks: QuestPicks) {
  const state: State = new Map()
  const legs: Array<QuestLeg> = []
  for (const part of quest.parts) {
    // a part guards against replays with variables it writes itself; alternatives sharing one guard all stay listed
    const writes = new Set(
      part.choices.flatMap((choice) =>
        choice.options.flatMap((option) =>
          option.sets.map((set) => set.variable),
        ),
      ),
    )
    if (evaluate(part.test, state, writes) === false) {
      continue
    }
    const steps: Array<QuestStep> = []
    legs.push({
      part,
      steps,
    })
    const targets = new Set(
      part.choices.flatMap((choice) => choice.options.map((o) => o.next)),
    )
    const seen = new Set<number>()
    for (const root of part.choices.filter((c) => !targets.has(c.guid))) {
      let choice: Choice | undefined = root
      while (choice && !seen.has(choice.guid)) {
        seen.add(choice.guid)
        const current = step(choice, picks, state)
        steps.push(current)
        const { picked } = current
        if (!picked) {
          return {
            done: false,
            legs,
          }
        }
        for (const set of picked.sets) {
          write(state, set)
        }
        choice = part.choices.find((c) => c.guid === picked.next)
      }
    }
  }
  return {
    done: true,
    legs,
  }
}
