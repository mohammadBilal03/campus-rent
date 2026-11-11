
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

  if (!parsed.success) {
    redirect(`/items/new?error=${encodeURIComponent(firstIssue(parsed.error))}`)
  }

  const v = parsed.data

  // The photo must live in the user's own folder.
  if (v.image_path && !v.image_path.startsWith(`${user.id}/`)) {
    redirect(`/items/new?error=${encodeURIComponent('Invalid photo')}`)
  }

  // Save or update the owner's UPI details.
  if (v.listing_type !== 'sell') {
    if (v.upi_enabled) {
      const { error: upiError } = await supabase
        .from('owner_payment_details')
        .upsert(
          {
            owner_id: user.id,
            upi_id: v.upi_id,
            upi_name: v.upi_name,
            upi_enabled: true,
          },
          { onConflict: 'owner_id' }
        )

      if (upiError) {
        redirect(
          `/items/new?error=${encodeURIComponent('Could not save UPI details: ' + upiError.message)}`
        )
      }
    } else {
      // Disable UPI for this owner's rental listings.
      const { error: upiError } = await supabase
        .from('owner_payment_details')
        .update({ upi_enabled: false })
        .eq('owner_id', user.id)

      if (upiError) {
        redirect(
          `/items/new?error=${encodeURIComponent('Could not update UPI settings: ' + upiError.message)}`
        )
      }
    }
  }

  // Create the item using your existing listing logic.
  const { data, error } = await supabase
    .from('items')
    .insert({
      owner_id: user.id,
      category_id: v.category_id,
      title: v.title,
      description: v.description,
      condition: v.condition,
      listing_type: v.listing_type,
      rent_price_per_day:
        v.listing_type === 'sell' ? null : v.rent_price_per_day,
      sale_price: v.listing_type === 'rent' ? null : v.sale_price,
      deposit: v.listing_type === 'sell' ? 0 : v.deposit,
      pickup_area: v.pickup_area,
      image_path: v.image_path ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    redirect(
      `/items/new?error=${encodeURIComponent(error?.message ?? 'Could not save')}`
    )
  }

  redirect(`/items/${data.id}`)
}
