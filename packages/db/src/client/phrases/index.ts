import { type Lang } from '../../enums'
import de from './de.json'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import it from './it.json'
import ja from './ja.json'
import ko from './ko.json'
import pl from './pl.json'
import ptBR from './pt-BR.json'
import ru from './ru.json'
import zhHans from './zh-Hans.json'
import zhHant from './zh-Hant.json'

/**
 * The only hand-written text left: phrasing the game never shows (condition and item-source sentences, statistics
 * it doesn't name, quest placeholders, a few words). Every language must have every key English has.
 */
export type Phrases = typeof en

export const phrases: Record<Lang, Phrases> = {
  de,
  en,
  es,
  fr,
  it,
  ja,
  ko,
  pl,
  'pt-BR': ptBR,
  ru,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
}
