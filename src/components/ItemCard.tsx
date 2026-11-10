import Link from 'next/link'
import { imageUrl, priceLabel } from '@/lib/format'
import type { ItemCardRow } from '@/lib/types'

export default function ItemCard({ item }: { item: ItemCardRow }) {
  return (
    <Link href={`/items/${item.id}`} className="card block overflow-hidden">
      <div className="relative aspect-[4/3] bg-line">
        {item.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(item.image_path)} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">No photo yet</div>
        )}
        <span className="price-tag absolute bottom-2 left-2">{priceLabel(item)}</span>
      </div>
      <div className="p-3">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <p className="text-sm text-muted">{item.categories?.name}</p>
        {item.pickup_area ? <p className="text-sm text-muted">Pickup: {item.pickup_area}</p> : null}
      </div>
    </Link>
  )
}
