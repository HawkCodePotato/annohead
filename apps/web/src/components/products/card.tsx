import { type Product } from '@anno/db/client'

import { NavLink } from '@/intl/nav'
import { getUrl } from '@/lib/url'

import { Icon } from '../common/icon'
import { DlcCard } from '../shared/dlc'
import { RegionCard } from '../shared/region'

type Props = {
  product: Product
}

export function ProductCard({ product }: Props) {
  return (
    <NavLink
      className="ring-accent-8 hover:bg-accent-4 relative flex flex-col gap-4 rounded-lg p-4 outline-none focus-visible:ring-2"
      href={getUrl('product', product.guid, product.slug)}
    >
      {product.icon ? <Icon className="size-16" icon={product.icon} /> : null}

      <div className="flex flex-col">
        <div className="font-bold">{product.name}</div>

        {product.type ? (
          <div className="text-gray-11 text-sm">{product.type.name}</div>
        ) : null}
      </div>

      {product.regions.length || product.dlc?.key ? (
        <div className="absolute top-4 right-4 flex gap-2">
          {product.regions.map((region) => (
            <RegionCard key={region.id} region={region.key} />
          ))}

          <DlcCard dlc={product.dlc?.key} />
        </div>
      ) : null}
    </NavLink>
  )
}
