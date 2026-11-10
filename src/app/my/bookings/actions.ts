'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BOOKING_STATUSES } from '@/lib/contracts'

export async function updateBooking(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  const tab = String(formData.get('tab') ?? 'renting')
  const base = `/my/bookings?tab=${encodeURIComponent(tab)}`

  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) redirect(`${base}&error=Invalid status`)

  const supabase = await createClient()
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
  if (error) {
    // 23P01 = exclusion violation: those dates are already approved for someone else.
    const msg = error.code === '23P01' ? 'Those dates overlap a booking you already approved.' : error.message
    redirect(`${base}&error=${encodeURIComponent(msg)}`)
  }
  revalidatePath('/my/bookings')
  redirect(base)
}
