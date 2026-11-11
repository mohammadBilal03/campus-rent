
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'
import NewListingForm from './NewListingForm'

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('id,name')
    .order('id')

  const { data: paymentDetails } = await supabase
    .from('owner_payment_details')
    .select('upi_id,upi_name,upi_enabled')
    .eq('owner_id', user.id)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">Post an item</h1>

      {error ? <p role="alert" className="note-error">{error}</p> : null}

      <NewListingForm
        categories={(categories ?? []) as Category[]}
        userId={user.id}
        paymentDetails={paymentDetails}
      />
    </div>
  )
}
