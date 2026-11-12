import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { priceLabel } from '@/lib/format'
import type { ItemCardRow } from '@/lib/types'
import { setItemStatus } from './actions'

type Row = ItemCardRow & { status: string }

function StatusButton({ id, status, label, danger }: { id: string; status: string; label: string; danger?: boolean }) {
  return (
    <form action={setItemStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-quiet'}`} type="submit">{label}</button>
    </form>
  )
}

export default async function MyListings({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('items')
    .select('id,title,listing_type,rent_price_per_day,sale_price,image_path,pickup_area,status,categories(name)')
    .eq('owner_id', user!.id)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
  const items = (data ?? []) as unknown as Row[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My listings</h1>
        <Link href="/items/new" className="btn">Post an item</Link>
      </div>
      {error ? <p role="alert" className="note-error">{error}</p> : null}
      {items.length === 0 ? <p className="note-info">You have not posted anything yet.</p> : null}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="card row-card p-4">
            <div className="row-main">
              <Link href={`/items/${item.id}`} className="text-lg font-semibold hover:underline">{item.title}</Link>
              <p className="text-sm text-muted">{priceLabel(item)}</p>
              <span className="pill mt-1">{item.status}</span>
            </div>
            <div className="row-actions">
              {item.status === 'active' && <StatusButton id={item.id} status="unavailable" label="Pause" />}
              {item.status === 'unavailable' && <StatusButton id={item.id} status="active" label="Make active" />}
              {item.status !== 'sold' && <StatusButton id={item.id} status="sold" label="Mark sold" />}
              <StatusButton id={item.id} status="removed" label="Remove" danger />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
