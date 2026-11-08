import { type Quests } from '@anno/db/client'

import { NavLink } from '@/intl/nav'
import { getIcon } from '@/lib/icons'
import { getUrl } from '@/lib/url'

import { Icon } from '../common/icon'
import { DlcCard } from '../shared/dlc'
import { RegionCard } from '../shared/region'

type Props = {
  quest: Quests['rows'][number]
}

export function QuestCard({ quest }: Props) {
  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 relative flex flex-col gap-4 rounded-lg p-4 outline-none focus-visible:ring-2"
      href={getUrl('quest', quest.guid, quest.slug)}
    >
      <Icon
        className="size-16"
        icon={
          quest.icon && !quest.icon.includes('icon_2d_mark_question')
            ? quest.icon
            : getIcon('common.quest')
        }
      />

      <div className="font-bold">{quest.name}</div>

      {quest.region?.key || quest.dlc?.key ? (
        <div className="absolute top-4 right-4 flex gap-2">
          <RegionCard region={quest.region?.key} />

          <DlcCard dlc={quest.dlc?.key} />
        </div>
      ) : null}
    </NavLink>
  )
}
