import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, inr } from '@/lib/format'
import type { BookingRow } from '@/lib/types'
import { updateBooking } from './actions'

const LABEL: Record<string, string> = {
  pending: 'Waiting for owner',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  active: 'In progress',
  completed: 'Completed',
  expired: 'Expired',
}

function Act({ id, status, label, tab, danger }: { id: string; status: string; label: string; tab: string; danger?: boolean }) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="tab" value={tab} />
      <button className={`btn btn-sm ${danger ? 'btn-danger' : ''}`} type="submit">{label}</button>
    </form>
  )
}

export default async function MyBookings({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; ok?: string }>
}) {
  const { tab: tabParam, error, ok } = await searchParams
  const tab = tabParam === 'rented-out' ? 'rented-out' : 'renting'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const column = tab === 'renting' ? 'renter_id' : 'owner_id'
  const { data } = await supabase
    .from('bookings')
    .select(
      '*, items(title), renter:profiles!bookings_renter_id_fkey(full_name), owner:profiles!bookings_owner_id_fkey(full_name)'
    )
    .eq(column, user!.id)
    .order('created_at', { ascending: false })
  const bookings = (data ?? []) as unknown as BookingRow[]

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">My bookings</h1>

      <div className="flex gap-2">
        <Link href="/my/bookings?tab=renting" className={`btn btn-sm ${tab === 'renting' ? '' : 'btn-quiet'}`}>I am renting</Link>
        <Link href="/my/bookings?tab=rented-out" className={`btn btn-sm ${tab === 'rented-out' ? '' : 'btn-quiet'}`}>My items rented out</Link>
      </div>

      {error ? <p role="alert" className="note-error">{error}</p> : null}
      {ok ? <p className="note-info">{ok}</p> : null}
      {bookings.length === 0 ? <p className="note-info">Nothing here yet.</p> : null}

      <ul className="space-y-3">
        {bookings.map((b) => (
          <li key={b.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/items/${b.item_id}`} className="text-lg font-semibold hover:underline">{b.items?.title}</Link>
              <p className="text-sm text-muted">
                {formatDate(b.start_date)} to {formatDate(b.end_date)}, total {inr(b.total_price)}
                {b.deposit_snapshot > 0 ? `, deposit ${inr(b.deposit_snapshot)}` : ''}
              </p>
              <p className="text-sm text-muted">
                {tab === 'renting' ? `Owner: ${b.owner?.full_name || 'student'}` : `Renter: ${b.renter?.full_name || 'student'}`}
              </p>
            </div>
            <span className="pill">{LABEL[b.status] ?? b.status}</span>

            <div className="flex flex-wrap gap-2">
              {tab === 'rented-out' && b.status === 'pending' && (
                <>
                  <Act id={b.id} status="approved" label="Approve" tab={tab} />
                  <Act id={b.id} status="rejected" label="Reject" tab={tab} danger />
                </>
              )}
              {tab === 'rented-out' && b.status === 'approved' && <Act id={b.id} status="active" label="Mark handed over" tab={tab} />}
              {tab === 'rented-out' && b.status === 'active' && <Act id={b.id} status="completed" label="Mark returned" tab={tab} />}
              {tab === 'renting' && (b.status === 'pending' || b.status === 'approved') && (
                <Act id={b.id} status="cancelled" label="Cancel request" tab={tab} danger />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
