import { type ConditionTemplate, type LabelKind, type Lang } from '../enums'
import { type Labels } from './labels'
import { phrases } from './phrases'

type Parts = {
  type: ConditionTemplate
  /** localized name of the referenced asset, if any */
  name: string | null
  /** raw variant parameter, `;`-separated when the game lists several states */
  variant: string | null
  /** `AtMost` / `LessThan` when the threshold is an upper bound */
  comparison: string | null
}

/** Which game table names a template's variant: the emperor relation's Rebellion is the Rebel state, an incident's the Uprising */
const VARIANT_KINDS: Partial<Record<ConditionTemplate, LabelKind>> = {
  ConditionActiveIncidentCount: 'incident',
  ConditionDiplomacyState: 'diplomacy',
  ConditionEmperorRelation: 'reputation',
  ConditionItemRacerAttribute: 'racer_attribute',
}

/** player counters that count an attribute's group */
const ATTRIBUTE_ALIASES: Record<string, string> = {
  PopulationByGroup: 'Population',
}

const TEMPLATE_PREFIX = /^Condition/u

/** The game's name for each `;`-separated variant, else ours, else the raw key */
function variantLabel(
  type: ConditionTemplate,
  variant: string,
  lang: Lang,
  l: Labels,
) {
  const kind = VARIANT_KINDS[type]
  return variant
    .split(';')
    .map(
      (v) =>
        (kind ? l(kind, v) : null)?.name ??
        l('attribute', ATTRIBUTE_ALIASES[v] ?? v)?.name ??
        (phrases[lang].variants as Record<string, string>)[v] ??
        v,
    )
    .join(', ')
}

function phrase(type: ConditionTemplate, variant: string | null, lang: Lang) {
  const conditions: Record<string, string> = phrases[lang].conditions
  return conditions[`${type}:${variant}`] ?? conditions[type]
}

/** Whether a condition's phrase names an asset ("{name} unlocked"); without one it reads as nothing. */
export function phraseNeedsName(
  type: ConditionTemplate,
  variant: string | null,
) {
  return phrase(type, variant, 'en')?.includes('{name}') ?? false
}

/** Human-readable requirement, e.g. "Worship Cernunnos" or "Ships in the area (at most)". */
export function conditionLabel(
  { type, name, variant, comparison }: Parts,
  lang: Lang,
  l: Labels,
) {
  const label = (
    phrase(type, variant, lang) ?? type.replace(TEMPLATE_PREFIX, '')
  )
    .replace('{name}', name ?? '')
    .replace('{variant}', variant ? variantLabel(type, variant, lang, l) : '')
    .replace(/\s+/gu, ' ')
    .trim()
  return comparison === 'AtMost' || comparison === 'LessThan'
    ? `${label} (${phrases[lang].words.atMost})`
    : label
}

export function negatedLabel(label: string, lang: Lang) {
  return `${phrases[lang].words.not}: ${label}`
}

const VARIABLE_WORD_BREAK = /(?<=[a-z])(?=[A-Z0-9])|(?<=[0-9])(?=[A-Z])/gu

/**
 * Quest variables are internal identifiers ("Colosseum_PatricianFavor", "Colosseum_StoryS6_done"); read as words
 * without the leading questline prefix ("Patrician Favor", "Story S6 done").
 */
// ponytail: English-ish in both languages; the game never shows these names, so there is nothing to localize from
export function variableName(raw: string) {
  const parts = raw.split('_').filter(Boolean)
  return (parts.length > 1 ? parts.slice(1) : parts)
    .join(' ')
    .replace(VARIABLE_WORD_BREAK, ' ')
}

const operators: Record<string, string> = {
  AtLeast: '≥',
  AtMost: '≤',
  Equals: '=',
  LessThan: '<',
  MoreThan: '>',
}

/** "Patrician Favor ≥ Neutral Favor", "Mega Reward = 2", "Killed Favillus" or "Not: Story S6 done" */
export function variableCheckLabel(
  {
    variable,
    comparison,
    value,
    other,
  }: {
    variable: string
    comparison: string
    /** `true` / `false` for flags */
    value: string
    /** compared against another variable instead of a value */
    other: string | null
  },
  lang: Lang,
) {
  const name = variableName(variable)
  if (other) {
    return `${name} ${operators[comparison] ?? comparison} ${variableName(other)}`
  }
  if (value === 'true' || value === 'false') {
    return (value === 'true') === (comparison !== 'LessThan')
      ? name
      : negatedLabel(name, lang)
  }
  return `${name} ${operators[comparison] ?? comparison} ${value}`
}

/** "Equites population: 150 or Nobles population: 150" */
export function anyOfLabel(labels: Array<string>, lang: Lang) {
  return labels.join(` ${phrases[lang].words.or} `)
}
