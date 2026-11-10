'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ITEM_STATUSES } from '@/lib/contracts'

export async function setItemStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!(ITEM_STATUSES as readonly string[]).includes(status)) redirect('/my/listings?error=Invalid status')

  const supabase = await createClient()
  // RLS guarantees only the owner (or an admin) can change this row.
  const { error } = await supabase.from('items').update({ status }).eq('id', id)
  if (error) redirect(`/my/listings?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/my/listings')
  redirect('/my/listings')
}
