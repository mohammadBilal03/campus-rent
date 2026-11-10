'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { bookingSchema, firstIssue } from '@/lib/contracts'

const back = (id: string, key: 'error' | 'ok', msg: string) =>
  `/items/${id}?${key}=${encodeURIComponent(msg)}`

export async function requestBooking(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const itemId = String(formData.get('item_id') ?? '')
  const parsed = bookingSchema.safeParse({
    item_id: itemId,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
  })
  if (!parsed.success) redirect(back(itemId, 'error', firstIssue(parsed.error)))

  // Owner, status and prices are filled in by a database trigger, never by the client.
  const { error } = await supabase.from('bookings').insert({
    item_id: parsed.data.item_id,
    renter_id: user.id,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
  })
  if (error) redirect(back(itemId, 'error', error.message))

  revalidatePath('/my/bookings')
  redirect('/my/bookings?tab=renting&ok=' + encodeURIComponent('Request sent. The owner will approve or reject it.'))
}

export async function openConversation(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const itemId = String(formData.get('item_id') ?? '')
  const { data: item } = await supabase.from('items').select('owner_id').eq('id', itemId).single()
  if (!item) redirect(back(itemId, 'error', 'Item not found'))
  if (item.owner_id === user.id) redirect(back(itemId, 'error', 'This is your own listing'))

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('item_id', itemId)
    .eq('buyer_id', user.id)
    .maybeSingle()
  if (existing) redirect(`/chat/${existing.id}`)

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ item_id: itemId, buyer_id: user.id, owner_id: item.owner_id })
    .select('id')
    .single()
  if (error || !created) redirect(back(itemId, 'error', error?.message ?? 'Could not start the chat'))
  redirect(`/chat/${created.id}`)
}
