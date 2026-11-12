import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { mediaUrl } from '@/lib/media'
import Gallery, { type Slide } from './Gallery'

type MediaRow = { id: string; kind: 'image' | 'video'; storage_path: string }
type Range = { start_date: string; end_date: string }

// Left column of the item page: gallery, rented-out notice, booked dates, owner link.
export default async function ItemExtras({
  itemId,
  title,
  coverPath,
  isOwner,
}: {
  itemId: string
  title: string
  coverPath: string | null
  isOwner: boolean
}) {
  const supabase = await createClient()
  const [mediaRes, rentedRes, rangesRes] = await Promise.all([
    supabase.from('item_media').select('id,kind,storage_path').eq('item_id', itemId).order('position').order('created_at'),
    supabase.rpc('current_rentals', { p_item_ids: [itemId] }),
    supabase.rpc('booked_ranges', { p_item_id: itemId }),
  ])

  const media = (mediaRes.data ?? []) as MediaRow[]
  const slides: Slide[] = media.map((m) => ({ id: m.id, kind: m.kind, url: mediaUrl(m.kind, m.storage_path) }))
  // Works even before the new SQL has been run: fall back to the old single cover photo.
  if (slides.length === 0 && coverPath) slides.push({ id: 'cover', kind: 'image', url: mediaUrl('image', coverPath) })

  const rentedNow = ((rentedRes.data ?? []) as Range[])[0]
  const booked = (rangesRes.data ?? []) as Range[]

  return (
    <div className="space-y-3">
      <Gallery slides={slides} title={title} />

      {rentedNow && (
        <div className="rented-banner" role="status">
          <strong>Rented out</strong> from {formatDate(rentedNow.start_date)} until {formatDate(rentedNow.end_date)}.
          It is not available to rent or buy before then.
        </div>
      )}

      {booked.length > 0 && (
        <div className="note-info">
          <p className="font-semibold">Booked dates</p>
          <ul className="text-sm text-muted">
            {booked.map((r) => (
              <li key={r.start_date + r.end_date}>
                {formatDate(r.start_date)} to {formatDate(r.end_date)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOwner && (
        <Link href={`/items/${itemId}/media`} className="btn btn-quiet btn-sm">
          Manage photos and video
        </Link>
      )}
    </div>
  )
}
