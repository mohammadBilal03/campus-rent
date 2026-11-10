import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'
import NewListingForm from './NewListingForm'

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data } = await supabase.from('categories').select('id,name').order('id')

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">Post an item</h1>
      {error ? <p role="alert" className="note-error">{error}</p> : null}
      <NewListingForm categories={(data ?? []) as Category[]} userId={user!.id} />
    </div>
  )
}
