
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BOOKING_STATUSES } from '@/lib/contracts'

const bookingBase = (tab: string) =>
  `/my/bookings?tab=${encodeURIComponent(tab)}`

// Existing booking approval, rejection, cancellation and handover action.
export async function updateBooking(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  const tab = String(formData.get('tab') ?? 'renting')
  const base = bookingBase(tab)

  if (!id || !(BOOKING_STATUSES as readonly string[]).includes(status)) {
    redirect(`${base}&error=Invalid booking details`)
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)

  if (error) {
    const msg =
      error.code === '23P01'
        ? 'Those dates overlap a booking you already approved.'
        : error.message

    redirect(`${base}&error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/my/bookings')
  redirect(base)
}

// Renter chooses UPI or offline payment after owner approval.
export async function createPayment(formData: FormData) {
  const bookingId = String(formData.get('booking_id') ?? '')
  const method = String(formData.get('payment_method') ?? '')

  if (!bookingId || !['upi', 'offline'].includes(method)) {
    redirect('/my/bookings?tab=renting&error=Invalid payment details')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Do not create a second payment for the same booking.
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (existing) {
    redirect('/my/bookings?tab=renting&error=Payment already exists for this booking')
  }

  // The database trigger fills in owner, renter, amounts and UPI snapshot.
  const { error } = await supabase.from('payments').insert({
    booking_id: bookingId,
    payment_method: method,
  })

  if (error) {
    redirect(
      `/my/bookings?tab=renting&error=${encodeURIComponent(error.message)}`
    )
  }

  revalidatePath('/my/bookings')
  redirect('/my/bookings?tab=renting&ok=Payment option selected')
}

// Renter marks that they have made the payment.
export async function submitPayment(formData: FormData) {
  await changePaymentStatus(formData, 'awaiting_confirmation', 'renting')
}

// Owner confirms that the money has actually been received.
export async function confirmPayment(formData: FormData) {
  await changePaymentStatus(formData, 'paid', 'rented-out')
}

async function changePaymentStatus(
  formData: FormData,
  status: 'awaiting_confirmation' | 'paid',
  tab: 'renting' | 'rented-out'
) {
  const paymentId = String(formData.get('payment_id') ?? '')

  if (!paymentId) {
    redirect(`${bookingBase(tab)}&error=Payment ID is missing`)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase
    .from('payments')
    .update({ payment_status: status })
    .eq('id', paymentId)

  if (error) {
    redirect(
      `${bookingBase(tab)}&error=${encodeURIComponent(error.message)}`
    )
  }

  revalidatePath('/my/bookings')

  const message =
    status === 'paid'
      ? 'Payment receipt confirmed.'
      : 'Payment submitted. Waiting for owner confirmation.'

  redirect(`${bookingBase(tab)}&ok=${encodeURIComponent(message)}`)
}
