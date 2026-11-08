import { type Attribute, type Lang } from '../enums'
import { assetNames } from './conditions'
import { type Labels, labels } from './labels'

type Modifier = {
  assetGuid: number | null
  attribute: Attribute | null
  cycles: number | null
  key: string | null
  path: string | null
  productGuid: number | null
  value: number | null
  /** applies to buildings near the targets, through an area effect the buff passes on */
  nearby?: boolean
}

/** the game's "{} Area Effect", wrapped around modifiers of an effect passed on to nearby buildings */
const NEARBY = 'BuildingUpgrade.AdditionalFunctionalEffect'
const PLACEHOLDER = /\{\}/gu

/** What fills a templated path's game text ("Additional {}t {} every {} cycles"), in the text's order; null for plain modifiers */
function templateArgs(
  m: Modifier,
  l: Labels,
  nameOf: (guid: number | null) => string,
) {
  switch (m.path) {
    case 'FactoryUpgrade.AddedFertility':
      return [nameOf(m.assetGuid)]
    case 'FactoryUpgrade.AdditionalOutput':
      return [m.value, nameOf(m.productGuid), m.cycles]
    case 'FactoryUpgrade.AdditionalOutput.EveryCycle':
      return [m.value, nameOf(m.productGuid)]
    case 'FactoryUpgrade.AdditionalOutput.Same':
      return [m.value, m.cycles]
    case 'FactoryUpgrade.AdditionalOutput.Same.EveryCycle':
      return [m.value]
    case 'BuildingUpgrade.AdditionalWorkforces':
      return [nameOf(m.productGuid)]
    case 'FactoryUpgrade.ReplaceInputs':
      return [nameOf(m.productGuid), nameOf(m.assetGuid)]
    case 'IncidentInfectableUpgrade.IncidentImmunity':
      return [l('incident', m.key)?.name ?? m.key]
    default:
      return null
  }
}

function fill(template: string, values: Array<unknown>) {
  let index = -1
  return template.replace(PLACEHOLDER, () => {
    index += 1
    return String(values[index] ?? '')
  })
}

/**
 * Ready-to-render modifiers: an attribute's name, else the game's name for the path. Templated effects read as the
 * game's sentence ("Additional fertility: Herbs") and carry their amount in it, so their `value` is null.
 */
export async function nameModifiers<T extends Modifier>(
  rows: Array<T>,
  lang: Lang,
) {
  const guids = [
    ...new Set(
      rows.flatMap((m) =>
        [m.productGuid, m.assetGuid].filter((g): g is number => g !== null),
      ),
    ),
  ]
  const [l, assets] = await Promise.all([labels(lang), assetNames(guids, lang)])
  const names = new Map(assets.map((a) => [a.guid, a.name ?? '']))
  const nameOf = (guid: number | null) =>
    guid === null ? '' : (names.get(guid) ?? '')
  return rows.map((m) => {
    const args = templateArgs(m, l, nameOf)
    const base =
      l('attribute', m.attribute)?.name ?? l('modifier', m.path)?.name ?? m.path
    const name = args && base ? fill(base, args) : base
    return {
      ...m,
      name:
        m.nearby && name
          ? fill(l('modifier', NEARBY)?.name ?? '{}', [name])
          : name,
      value: args ? null : m.value,
    }
  })
}
