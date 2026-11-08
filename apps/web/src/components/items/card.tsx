import { type Item } from '@anno/db/client'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { DlcCard } from '../shared/dlc'
import { ItemTypeCard } from '../shared/item-type'
import { ItemIcon } from './icon'

type Props = {
  item: Item
}

export function ItemCard({ item }: Props) {
  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 relative flex flex-col gap-4 rounded-lg p-4 outline-none focus-visible:ring-2"
      href={getUrl('item', item.guid, item.slug)}
    >
      <ItemIcon icon={item.icon} rarity={item.rarity?.key} />

      <div className="flex flex-col">
        <div className="font-bold">{item.name}</div>

        {item.type ? (
          <div className="text-gray-11 text-sm">{item.type.name}</div>
        ) : null}
      </div>

      {(item.type && item.type.key !== 'None') || item.dlc?.key ? (
        <div className="absolute top-4 right-4 flex gap-2">
          <ItemTypeCard type={item.type} />

          <DlcCard dlc={item.dlc?.key} />
        </div>
      ) : null}
    </NavLink>
  )
}
