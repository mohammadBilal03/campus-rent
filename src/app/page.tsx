import { createClient } from '@/lib/supabase/server'
import ItemCard from '@/components/ItemCard'
import type { Category, ItemCardRow } from '@/lib/types'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string }>
}) {
  const { q, category, type } = await searchParams
  const supabase = await createClient()

  const { data: cats } = await supabase.from('categories').select('id,name').order('id')
  const categories = (cats ?? []) as Category[]

  let query = supabase
    .from('items')
    .select('id,title,listing_type,rent_price_per_day,sale_price,image_path,pickup_area,categories(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(24)

  // if (q?.trim()) query = query.textSearch('search_vector', q.trim(), { type: 'websearch', config: 'english' })
  const term = q?.replace(/[,()%*"\\]/g, ' ').trim()
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,pickup_area.ilike.%${term}%`)
  if (category) query = query.eq('category_id', Number(category))
  if (type === 'rent') query = query.in('listing_type', ['rent', 'both'])
  if (type === 'sell') query = query.in('listing_type', ['sell', 'both'])

  const { data, error } = await query
  const items = (data ?? []) as unknown as ItemCardRow[]
  const { data: rentals } = items.length
    ? await supabase.rpc('current_rentals', { p_item_ids: items.map((i) => i.id) })
    : { data: [] }
  const rentedUntil = new Map(
    ((rentals ?? []) as { item_id: string; end_date: string }[]).map((r) => [r.item_id, r.end_date])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">What do you need this semester?</h1>
        <p className="text-muted">Rent or buy from students on your campus.</p>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_150px_auto]" method="get">
        <input className="input sm:col-span-2 lg:col-span-1" name="q" defaultValue={q} placeholder="Search books, cycles, calculators" aria-label="Search" />
        <select className="input" name="category" defaultValue={category ?? ''} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" name="type" defaultValue={type ?? ''} aria-label="Rent or buy">
          <option value="">Rent or buy</option>
          <option value="rent">Rent</option>
          <option value="sell">Buy</option>
        </select>
        <button className="btn" type="submit">Search</button>
      </form>

      {error ? <p className="note-error">Could not load listings: {error.message}</p> : null}

      {items.length === 0 && !error ? (
        <p className="note-info">No listings match yet. Post the first one from “Post an item”.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            // <ItemCard key={item.id} item={item} />
            <ItemCard key={item.id} item={item} rentedUntil={rentedUntil.get(item.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
