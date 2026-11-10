'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { firstIssue, listingSchema } from '@/lib/contracts'

export async function createListing(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const raw: Record<string, FormDataEntryValue> = {}
  formData.forEach((value, key) => {
    if (typeof value === 'string') raw[key] = value
  })

  const parsed = listingSchema.safeParse(raw)
  if (!parsed.success) redirect(`/items/new?error=${encodeURIComponent(firstIssue(parsed.error))}`)

  const v = parsed.data
  // The photo must live in the user's own folder.
  if (v.image_path && !v.image_path.startsWith(`${user.id}/`)) {
    redirect(`/items/new?error=${encodeURIComponent('Invalid photo')}`)
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      owner_id: user.id,
      category_id: v.category_id,
      title: v.title,
      description: v.description,
      condition: v.condition,
      listing_type: v.listing_type,
      rent_price_per_day: v.listing_type === 'sell' ? null : v.rent_price_per_day,
      sale_price: v.listing_type === 'rent' ? null : v.sale_price,
      deposit: v.listing_type === 'sell' ? 0 : v.deposit,
      pickup_area: v.pickup_area,
      image_path: v.image_path ?? null,
    })
    .select('id')
    .single()

  if (error || !data) redirect(`/items/new?error=${encodeURIComponent(error?.message ?? 'Could not save')}`)
  redirect(`/items/${data.id}`)
}
