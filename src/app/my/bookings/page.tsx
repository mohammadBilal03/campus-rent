
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, inr } from '@/lib/format'
import type { BookingRow } from '@/lib/types'
import {
  updateBooking,
  createPayment,
  submitPayment,
  confirmPayment,
} from './actions'
import SubmitButton from '@/components/SubmitButton'

const LABEL: Record<string, string> = {
  pending: 'Waiting for owner',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  active: 'In progress',
  completed: 'Completed',
  expired: 'Expired',
}

type PaymentRow = {
  id: string
  booking_id: string
  payment_method: 'upi' | 'offline'
  rent_amount_paise: number
  deposit_amount_paise: number
  total_amount_paise: number
  owner_upi_id_snapshot: string | null
  owner_upi_name_snapshot: string | null
  payment_status: 'pending' | 'awaiting_confirmation' | 'paid'
  confirmed_at: string | null
}

function Act({
  id,
  status,
  label,
  tab,
  danger,
}: {
  id: string
  status: string
  label: string
  tab: string
  danger?: boolean
}) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="tab" value={tab} />
      <SubmitButton className={`btn btn-sm ${danger ? 'btn-danger' : ''}`} pendingText="Saving…">{label}</SubmitButton>
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

  if (!user) redirect('/login')

  const column = tab === 'renting' ? 'renter_id' : 'owner_id'

  const { data } = await supabase
    .from('bookings')
    .select(
      '*, items(title), renter:profiles!bookings_renter_id_fkey(full_name), owner:profiles!bookings_owner_id_fkey(full_name)'
    )
    .eq(column, user.id)
    .order('created_at', { ascending: false })

  const bookings = (data ?? []) as unknown as BookingRow[]

  // Fetch payment records belonging to the bookings visible in this tab.
  const paymentMap = new Map<string, PaymentRow>()

  if (bookings.length > 0) {
    const bookingIds = bookings.map((b) => b.id)

    const { data: paymentData } = await supabase
      .from('payments')
      .select(
        'id, booking_id, payment_method, rent_amount_paise, deposit_amount_paise, total_amount_paise, owner_upi_id_snapshot, owner_upi_name_snapshot, payment_status, confirmed_at'
      )
      .in('booking_id', bookingIds)

    for (const payment of (paymentData ?? []) as PaymentRow[]) {
      paymentMap.set(payment.booking_id, payment)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">My bookings</h1>

      <div className="flex gap-2">
        <Link
          href="/my/bookings?tab=renting"
          className={`btn btn-sm ${tab === 'renting' ? '' : 'btn-quiet'}`}
        >
          I am renting
        </Link>

        <Link
          href="/my/bookings?tab=rented-out"
          className={`btn btn-sm ${tab === 'rented-out' ? '' : 'btn-quiet'}`}
        >
          My items rented out
        </Link>
      </div>

      {error ? <p role="alert" className="note-error">{error}</p> : null}
      {ok ? <p className="note-info">{ok}</p> : null}

      {bookings.length === 0 ? (
        <p className="note-info">Nothing here yet.</p>
      ) : null}

      <ul className="space-y-3">
        {bookings.map((b) => {
          const payment = paymentMap.get(b.id)
          const isRenter = tab === 'renting'

          return (
            <li key={b.id} className="card row-card p-4">
              <div className="row-main">
                <Link href={`/items/${b.item_id}`} className="text-lg font-semibold hover:underline">{b.items?.title}</Link>
                <p className="text-sm text-muted">
                  {formatDate(b.start_date)} to {formatDate(b.end_date)}, total {inr(b.total_price)}
                  {b.deposit_snapshot > 0 ? `, deposit ${inr(b.deposit_snapshot)}` : ''}
                </p>
                <p className="text-sm text-muted">
                  {tab === 'renting' ? `Owner: ${b.owner?.full_name || 'student'}` : `Renter: ${b.renter?.full_name || 'student'}`}
                </p>
                <span className="pill mt-1">{LABEL[b.status] ?? b.status}</span>
              </div>

              <div className="row-actions">
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
          )
        })}
      </ul>
    </div>
  )
}
