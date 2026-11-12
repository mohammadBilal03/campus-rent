import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, imageUrl, inr, todayIso } from '@/lib/format'
import type { ItemRow } from '@/lib/types'
import { openConversation, requestBooking } from './actions'
import SubmitButton from '@/components/SubmitButton'

const CONDITION: Record<string, string> = { new: 'New', like_new: 'Like new', good: 'Good', fair: 'Fair' }

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { id } = await params
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('items')
    .select('*, categories(name), profiles(full_name)')
    .eq('id', id)
    .maybeSingle()
  if (!data) notFound()
  const item = data as unknown as ItemRow

  const { data: ranges } = await supabase.rpc('booked_ranges', { p_item_id: id })
  const booked = (ranges ?? []) as { start_date: string; end_date: string }[]

  const isOwner = user?.id === item.owner_id
  const canRent = item.listing_type !== 'sell'
  const canBuy = item.listing_type !== 'rent'
  const today = todayIso()

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="card overflow-hidden">
        {item.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(item.image_path)} alt={item.title} className="w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-muted">No photo yet</div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{item.title}</h1>
          <p className="text-muted">
            {item.categories?.name}, {CONDITION[item.condition] ?? item.condition}. Listed by {item.profiles?.full_name || 'a student'}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canRent && <span className="price-tag">{inr(item.rent_price_per_day)}/day</span>}
          {canBuy && <span className="price-tag">{inr(item.sale_price)} to buy</span>}
          {canRent && item.deposit > 0 && <span className="pill">Deposit {inr(item.deposit)}</span>}
          {item.status !== 'active' && <span className="pill">{item.status}</span>}
        </div>

        {item.description ? <p className="whitespace-pre-line">{item.description}</p> : null}
        {item.pickup_area ? <p className="text-sm text-muted">Pickup: {item.pickup_area}</p> : null}

        {error ? <p role="alert" className="note-error">{error}</p> : null}
        {ok ? <p className="note-info">{ok}</p> : null}

        {isOwner ? (
          <p className="note-info">
            This is your listing. <Link href="/my/listings" className="text-cobalt underline">Manage it</Link>
          </p>
        ) : (
          <>
            {canRent && item.status === 'active' && (
              <form action={requestBooking} className="card space-y-3 p-4">
                <h2 className="text-xl font-semibold">Request to rent</h2>
                {booked.length > 0 && (
                  <p className="text-sm text-muted">
                    Already booked: {booked.map((r) => `${formatDate(r.start_date)} to ${formatDate(r.end_date)}`).join(', ')}
                  </p>
                )}
                <input type="hidden" name="item_id" value={item.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field">From
                    <input className="input" type="date" name="start_date" min={today} required />
                  </label>
                  <label className="field">Until (inclusive)
                    <input className="input" type="date" name="end_date" min={today} required />
                  </label>
                </div>
                <SubmitButton pendingText="Sending…">Send rent request</SubmitButton>
              </form>
            )}

            <form action={openConversation}>
              <input type="hidden" name="item_id" value={item.id} />
              <SubmitButton className="btn btn-quiet" pendingText="Opening chat…">
                {canBuy ? 'Message owner to buy or ask a question' : 'Message owner'}
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
