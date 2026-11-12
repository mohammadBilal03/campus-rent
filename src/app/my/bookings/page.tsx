
// import Link from 'next/link'
// import { redirect } from 'next/navigation'
// import { createClient } from '@/lib/supabase/server'
// import { formatDate, inr } from '@/lib/format'
// import type { BookingRow } from '@/lib/types'
// import {
//   updateBooking,
//   createPayment,
//   submitPayment,
//   confirmPayment,
// } from './actions'
// import SubmitButton from '@/components/SubmitButton'

// const LABEL: Record<string, string> = {
//   pending: 'Waiting for owner',
//   approved: 'Approved',
//   rejected: 'Rejected',
//   cancelled: 'Cancelled',
//   active: 'In progress',
//   completed: 'Completed',
//   expired: 'Expired',
// }

// type PaymentRow = {
//   id: string
//   booking_id: string
//   payment_method: 'upi' | 'offline'
//   rent_amount_paise: number
//   deposit_amount_paise: number
//   total_amount_paise: number
//   owner_upi_id_snapshot: string | null
//   owner_upi_name_snapshot: string | null
//   payment_status: 'pending' | 'awaiting_confirmation' | 'paid'
//   confirmed_at: string | null
// }

// function Act({
//   id,
//   status,
//   label,
//   tab,
//   danger,
// }: {
//   id: string
//   status: string
//   label: string
//   tab: string
//   danger?: boolean
// }) {
//   return (
//     <form action={updateBooking}>
//       <input type="hidden" name="id" value={id} />
//       <input type="hidden" name="status" value={status} />
//       <input type="hidden" name="tab" value={tab} />
//       <SubmitButton className={`btn btn-sm ${danger ? 'btn-danger' : ''}`} pendingText="Saving…">{label}</SubmitButton>
//     </form>
//   )
// }

// export default async function MyBookings({
//   searchParams,
// }: {
//   searchParams: Promise<{ tab?: string; error?: string; ok?: string }>
// }) {
//   const { tab: tabParam, error, ok } = await searchParams
//   const tab = tabParam === 'rented-out' ? 'rented-out' : 'renting'

//   const supabase = await createClient()

//   const {
//     data: { user },
//   } = await supabase.auth.getUser()

//   if (!user) redirect('/login')

//   const column = tab === 'renting' ? 'renter_id' : 'owner_id'

//   const { data } = await supabase
//     .from('bookings')
//     .select(
//       '*, items(title), renter:profiles!bookings_renter_id_fkey(full_name), owner:profiles!bookings_owner_id_fkey(full_name)'
//     )
//     .eq(column, user.id)
//     .order('created_at', { ascending: false })

//   const bookings = (data ?? []) as unknown as BookingRow[]

//   // Fetch payment records belonging to the bookings visible in this tab.
//   const paymentMap = new Map<string, PaymentRow>()

//   if (bookings.length > 0) {
//     const bookingIds = bookings.map((b) => b.id)

//     const { data: paymentData } = await supabase
//       .from('payments')
//       .select(
//         'id, booking_id, payment_method, rent_amount_paise, deposit_amount_paise, total_amount_paise, owner_upi_id_snapshot, owner_upi_name_snapshot, payment_status, confirmed_at'
//       )
//       .in('booking_id', bookingIds)

//     for (const payment of (paymentData ?? []) as PaymentRow[]) {
//       paymentMap.set(payment.booking_id, payment)
//     }
//   }

//   return (
//     <div className="space-y-4">
//       <h1 className="text-3xl font-bold">My bookings</h1>

//       <div className="flex gap-2">
//         <Link
//           href="/my/bookings?tab=renting"
//           className={`btn btn-sm ${tab === 'renting' ? '' : 'btn-quiet'}`}
//         >
//           I am renting
//         </Link>

//         <Link
//           href="/my/bookings?tab=rented-out"
//           className={`btn btn-sm ${tab === 'rented-out' ? '' : 'btn-quiet'}`}
//         >
//           My items rented out
//         </Link>
//       </div>

//       {error ? <p role="alert" className="note-error">{error}</p> : null}
//       {ok ? <p className="note-info">{ok}</p> : null}

//       {bookings.length === 0 ? (
//         <p className="note-info">Nothing here yet.</p>
//       ) : null}

//       <ul className="space-y-3">
//         {bookings.map((b) => {
//           const payment = paymentMap.get(b.id)
//           const isRenter = tab === 'renting'

//           return (
//             <li key={b.id} className="card flex flex-wrap items-center gap-3 p-4">
//               <div className="min-w-0 flex-1">
//                 <Link
//                   href={`/items/${b.item_id}`}
//                   className="text-lg font-semibold hover:underline"
//                 >
//                   {b.items?.title}
//                 </Link>

//                 <p className="text-sm text-muted">
//                   {formatDate(b.start_date)} to {formatDate(b.end_date)},
//                   {' '}rent {inr(b.total_price)}
//                   {b.deposit_snapshot > 0
//                     ? `, deposit ${inr(b.deposit_snapshot)}`
//                     : ''}
//                 </p>

//                 <p className="text-sm text-muted">
//                   {isRenter
//                     ? `Owner: ${b.owner?.full_name || 'student'}`
//                     : `Renter: ${b.renter?.full_name || 'student'}`}
//                 </p>
//               </div>

//               <span className="pill">{LABEL[b.status] ?? b.status}</span>

//               <div className="flex flex-wrap gap-2">
//                 {tab === 'rented-out' && b.status === 'pending' && (
//                   <>
//                     <Act
//                       id={b.id}
//                       status="approved"
//                       label="Approve"
//                       tab={tab}
//                     />
//                     <Act
//                       id={b.id}
//                       status="rejected"
//                       label="Reject"
//                       tab={tab}
//                       danger
//                     />
//                   </>
//                 )}

//                 {tab === 'rented-out' &&
//                   b.status === 'approved' &&
//                   payment?.payment_status === 'paid' && (
//                     <Act
//                       id={b.id}
//                       status="active"
//                       label="Mark handed over"
//                       tab={tab}
//                     />
//                   )}

//                 {tab === 'rented-out' &&
//                   b.status === 'approved' &&
//                   payment?.payment_status !== 'paid' && (
//                     <p className="note-info">
//                       Waiting for renter payment and your confirmation before handover.
//                     </p>
//                   )}

//                 {tab === 'rented-out' && b.status === 'active' && (
//                   <Act
//                     id={b.id}
//                     status="completed"
//                     label="Mark returned"
//                     tab={tab}
//                   />
//                 )}

//                 {tab === 'renting' &&
//                   (b.status === 'pending' || b.status === 'approved') && (
//                     <Act
//                       id={b.id}
//                       status="cancelled"
//                       label="Cancel request"
//                       tab={tab}
//                       danger
//                     />
//                   )}
//               </div>

//               {/* Payment interface for renter */}
//               {isRenter && b.status === 'approved' && !payment && (
//                 <div className="w-full space-y-3 border-t pt-4">
//                   <h3 className="font-semibold">Choose payment method</h3>

//                   <p className="text-sm text-muted">
//                     Your booking is approved. Select how you want to pay
//                     the rent and security deposit.
//                   </p>

//                   <div className="flex flex-wrap gap-2">
//                     <form action={createPayment}>
//                       <input
//                         type="hidden"
//                         name="booking_id"
//                         value={b.id}
//                       />
//                       <input
//                         type="hidden"
//                         name="payment_method"
//                         value="upi"
//                       />
//                       <button className="btn btn-sm" type="submit">
//                         Pay using UPI
//                       </button>
//                     </form>

//                     <form action={createPayment}>
//                       <input
//                         type="hidden"
//                         name="booking_id"
//                         value={b.id}
//                       />
//                       <input
//                         type="hidden"
//                         name="payment_method"
//                         value="offline"
//                       />
//                       <button
//                         className="btn btn-sm btn-quiet"
//                         type="submit"
//                       >
//                         Pay offline
//                       </button>
//                     </form>
//                   </div>
//                 </div>
//               )}

//               {/* Existing payment details */}
//               {payment && (
//                 <div className="w-full space-y-3 border-t pt-4">
//                   <h3 className="font-semibold">Payment details</h3>

//                   <p className="text-sm">
//                     Method: <strong>
//                       {payment.payment_method === 'upi' ? 'UPI' : 'Offline'}
//                     </strong>
//                   </p>

//                   <p className="text-sm">
//                     Rent: {inr(payment.rent_amount_paise / 100)}
//                     {' '}| Deposit: {inr(payment.deposit_amount_paise / 100)}
//                   </p>

//                   <p className="text-lg font-bold">
//                     Total: {inr(payment.total_amount_paise / 100)}
//                   </p>

//                   {isRenter && payment.payment_method === 'upi' && (
//                     <div className="rounded-lg border p-3 space-y-2">
//                       <p className="font-semibold">Owner's UPI details</p>

//                       <p className="text-sm">
//                         Name: {payment.owner_upi_name_snapshot || 'Owner'}
//                       </p>

//                       <p className="text-sm break-all">
//                         UPI ID: <strong>
//                           {payment.owner_upi_id_snapshot || 'Not available'}
//                         </strong>
//                       </p>

//                       {payment.owner_upi_id_snapshot && (
//                         <a
//                           className="btn btn-sm inline-flex"
//                           href={`upi://pay?pa=${encodeURIComponent(payment.owner_upi_id_snapshot)}&pn=${encodeURIComponent(payment.owner_upi_name_snapshot || 'Owner')}&am=${(payment.total_amount_paise / 100).toFixed(2)}&cu=INR`}
//                         >
//                           Open UPI app
//                         </a>
//                       )}

//                       <p className="text-xs text-muted">
//                         Pay the exact amount. The owner must manually verify
//                         receipt in their UPI app.
//                       </p>
//                     </div>
//                   )}

//                   <p className="text-sm">
//                     Payment status:{' '}
//                     <strong>
//                       {payment.payment_status === 'pending'
//                         ? 'Payment not submitted'
//                         : payment.payment_status === 'awaiting_confirmation'
//                           ? 'Waiting for owner confirmation'
//                           : 'Payment confirmed'}
//                     </strong>
//                   </p>

//                   {/* Renter submits payment */}
//                   {isRenter && payment.payment_status === 'pending' && (
//                     <form action={submitPayment}>
//                       <input
//                         type="hidden"
//                         name="payment_id"
//                         value={payment.id}
//                       />
//                       <button className="btn btn-sm" type="submit">
//                         {payment.payment_method === 'upi'
//                           ? "I've made the UPI payment"
//                           : "I've paid offline"}
//                       </button>
//                     </form>
//                   )}

//                   {/* Owner confirms actual receipt */}
//                   {!isRenter &&
//                     payment.payment_status === 'awaiting_confirmation' && (
//                       <form action={confirmPayment}>
//                         <input
//                           type="hidden"
//                           name="payment_id"
//                           value={payment.id}
//                         />
//                         <button className="btn btn-sm" type="submit">
//                           Confirm payment received
//                         </button>
//                       </form>
//                     )}

//                   {!isRenter && payment.payment_status === 'pending' && (
//                     <p className="text-sm text-muted">
//                       Waiting for the renter to submit payment.
//                     </p>
//                   )}

//                   {payment.payment_status === 'paid' && (
//                     <p className="note-info">
//                       Payment has been confirmed by the owner.
//                     </p>
//                   )}
//                 </div>
//               )}
//             </li>
//           )
//         })}
//       </ul>
//     </div>
//   )
// }


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

      <div className="flex flex-wrap gap-2">
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
                <Link
                  href={`/items/${b.item_id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {b.items?.title}
                </Link>

                <p className="text-sm text-muted">
                  {formatDate(b.start_date)} to {formatDate(b.end_date)},
                  {' '}rent {inr(b.total_price)}
                  {b.deposit_snapshot > 0
                    ? `, deposit ${inr(b.deposit_snapshot)}`
                    : ''}
                </p>

                <p className="text-sm text-muted">
                  {isRenter
                    ? `Owner: ${b.owner?.full_name || 'student'}`
                    : `Renter: ${b.renter?.full_name || 'student'}`}
                </p>

                <span className="pill mt-1">{LABEL[b.status] ?? b.status}</span>
              </div>

              <div className="row-actions">
                {tab === 'rented-out' && b.status === 'pending' && (
                  <>
                    <Act
                      id={b.id}
                      status="approved"
                      label="Approve"
                      tab={tab}
                    />
                    <Act
                      id={b.id}
                      status="rejected"
                      label="Reject"
                      tab={tab}
                      danger
                    />
                  </>
                )}

                {tab === 'rented-out' &&
                  b.status === 'approved' &&
                  payment?.payment_status === 'paid' && (
                    <Act
                      id={b.id}
                      status="active"
                      label="Mark handed over"
                      tab={tab}
                    />
                  )}

                {tab === 'rented-out' &&
                  b.status === 'approved' &&
                  payment?.payment_status !== 'paid' && (
                    <p className="note-info">
                      Waiting for renter payment and your confirmation before handover.
                    </p>
                  )}

                {tab === 'rented-out' && b.status === 'active' && (
                  <Act
                    id={b.id}
                    status="completed"
                    label="Mark returned"
                    tab={tab}
                  />
                )}

                {tab === 'renting' &&
                  (b.status === 'pending' || b.status === 'approved') && (
                    <Act
                      id={b.id}
                      status="cancelled"
                      label="Cancel request"
                      tab={tab}
                      danger
                    />
                  )}
              </div>

              {/* Payment interface for renter */}
              {isRenter && b.status === 'approved' && !payment && (
                <div className="w-full space-y-3 border-t border-line pt-4">
                  <h3 className="font-semibold">Choose payment method</h3>

                  <p className="text-sm text-muted">
                    Your booking is approved. Select how you want to pay
                    the rent and security deposit.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <form action={createPayment}>
                      <input
                        type="hidden"
                        name="booking_id"
                        value={b.id}
                      />
                      <input
                        type="hidden"
                        name="payment_method"
                        value="upi"
                      />
                      <SubmitButton className="btn btn-sm" pendingText="Saving…">
                        Pay using UPI
                      </SubmitButton>
                    </form>

                    <form action={createPayment}>
                      <input
                        type="hidden"
                        name="booking_id"
                        value={b.id}
                      />
                      <input
                        type="hidden"
                        name="payment_method"
                        value="offline"
                      />
                      <SubmitButton className="btn btn-sm btn-quiet" pendingText="Saving…">
                        Pay offline
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              )}

              {/* Existing payment details */}
              {payment && (
                <div className="w-full space-y-3 border-t border-line pt-4">
                  <h3 className="font-semibold">Payment details</h3>

                  <p className="text-sm">
                    Method: <strong>
                      {payment.payment_method === 'upi' ? 'UPI' : 'Offline'}
                    </strong>
                  </p>

                  <p className="text-sm">
                    Rent: {inr(payment.rent_amount_paise / 100)}
                    {' '}| Deposit: {inr(payment.deposit_amount_paise / 100)}
                  </p>

                  <p className="text-lg font-bold">
                    Total: {inr(payment.total_amount_paise / 100)}
                  </p>

                  {isRenter && payment.payment_method === 'upi' && (
                    <div className="space-y-2 rounded-lg border border-line p-3">
                      <p className="font-semibold">Owner&rsquo;s UPI details</p>

                      <p className="text-sm">
                        Name: {payment.owner_upi_name_snapshot || 'Owner'}
                      </p>

                      <p className="text-sm break-all">
                        UPI ID: <strong>
                          {payment.owner_upi_id_snapshot || 'Not available'}
                        </strong>
                      </p>

                      {payment.owner_upi_id_snapshot && (
                        <a
                          className="btn btn-sm inline-flex"
                          href={`upi://pay?pa=${encodeURIComponent(payment.owner_upi_id_snapshot)}&pn=${encodeURIComponent(payment.owner_upi_name_snapshot || 'Owner')}&am=${(payment.total_amount_paise / 100).toFixed(2)}&cu=INR`}
                        >
                          Open UPI app
                        </a>
                      )}

                      <p className="text-xs text-muted">
                        Pay the exact amount. The owner must manually verify
                        receipt in their UPI app.
                      </p>
                    </div>
                  )}

                  <p className="text-sm">
                    Payment status:{' '}
                    <strong>
                      {payment.payment_status === 'pending'
                        ? 'Payment not submitted'
                        : payment.payment_status === 'awaiting_confirmation'
                          ? 'Waiting for owner confirmation'
                          : 'Payment confirmed'}
                    </strong>
                  </p>

                  {/* Renter submits payment */}
                  {isRenter && payment.payment_status === 'pending' && (
                    <form action={submitPayment}>
                      <input
                        type="hidden"
                        name="payment_id"
                        value={payment.id}
                      />
                      <SubmitButton className="btn btn-sm" pendingText="Saving…">
                        {payment.payment_method === 'upi'
                          ? "I've made the UPI payment"
                          : "I've paid offline"}
                      </SubmitButton>
                    </form>
                  )}

                  {/* Owner confirms actual receipt */}
                  {!isRenter &&
                    payment.payment_status === 'awaiting_confirmation' && (
                      <form action={confirmPayment}>
                        <input
                          type="hidden"
                          name="payment_id"
                          value={payment.id}
                        />
                        <SubmitButton className="btn btn-sm" pendingText="Saving…">
                          Confirm payment received
                        </SubmitButton>
                      </form>
                    )}

                  {!isRenter && payment.payment_status === 'pending' && (
                    <p className="text-sm text-muted">
                      Waiting for the renter to submit payment.
                    </p>
                  )}

                  {payment.payment_status === 'paid' && (
                    <p className="note-info">
                      Payment has been confirmed by the owner.
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
