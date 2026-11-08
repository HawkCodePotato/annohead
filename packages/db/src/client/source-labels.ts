import { type ItemSourceKind, type Lang } from '../enums'
import { phrases } from './phrases'

/** Human-readable origin, e.g. "Sold by Julia" or "Defeat Dorian". */
export function sourceLabel(
  kind: ItemSourceKind,
  name: string | null,
  lang: Lang,
) {
  // a storyline reward reads like a quest reward once the storyline has a title
  const phrase =
    phrases[lang].sources[kind === 'storyline' && name ? 'quest' : kind]
  return phrase.replace('{name}', name ?? '').trim()
}
