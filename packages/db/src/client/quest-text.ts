import { type Lang } from '../enums'
import { phrases } from './phrases'

type Role = 'governor' | 'emperor' | 'island' | 'unknown'

const PLACEHOLDER = /\{[^{}]*\}/gu
const LINE_BREAK = /<br\s*\/?>/gu
// inline icons transform.py could not point at a CDN icon (a runtime lookup like "{AssetData(183440).Icon}")
const UNRESOLVED_IMAGE = /<img(?![^>]*\bsrc=["']data\/)[^>]*>\s*/gu

function role(placeholder: string): Role {
  if (placeholder.includes('LocationName')) {
    return 'island'
  }
  if (placeholder.includes('ActiveEmperor')) {
    return 'emperor'
  }
  if (placeholder.includes('QuestAssignee')) {
    return 'governor'
  }
  return 'unknown'
}

/** Quest text ready to render: runtime placeholders ("{Static.Tags.LocationName(…)}") become roles, `<br/>` newlines, inline icons without a CDN icon go. */
export function questText(text: string | null, lang: Lang) {
  return (
    text
      ?.replace(LINE_BREAK, '\n')
      .replace(UNRESOLVED_IMAGE, '')
      .replace(
        PLACEHOLDER,
        (placeholder) => phrases[lang].roles[role(placeholder)],
      ) ?? null
  )
}

const BOLD = /<b>([\s\S]*?)<\/b>/gu
const TAG = /<[^>]+>/gu
// CJK texts end sentences with full-width marks
const QUESTION = /[^.!?。！？\n]*[?？]+/gu

/** The question a decision screen ends on: its last bold line, else its last sentence ending in "?". */
export function questQuestion(text: string | null, lang: Lang) {
  if (!text) {
    return null
  }
  const bold = [...text.matchAll(BOLD)].at(-1)?.[1]
  const question =
    bold ??
    text.replace(LINE_BREAK, '\n').replace(TAG, '').match(QUESTION)?.at(-1)
  return question ? questText(question.replace(TAG, '').trim(), lang) : null
}

/** A decision screen's narrative: its text without the closing question `questQuestion` reads, markup kept. */
export function questStory(text: string | null, lang: Lang) {
  if (!text) {
    return null
  }
  const bold = [...text.matchAll(BOLD)].at(-1)
  const question = bold?.[0] ?? text.match(QUESTION)?.at(-1)
  const cut = question ? text.lastIndexOf(question) : -1
  const story =
    cut < 0
      ? text
      : text.slice(0, cut) + text.slice(cut + (question?.length ?? 0))
  return questText(story, lang)?.trim() || null
}
