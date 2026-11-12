import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mediaUrl } from '@/lib/media'
import MediaManager, { type ManagedMedia } from './MediaManager'

export default async function ItemMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: item } = await supabase.from('items').select('id,title,owner_id').eq('id', id).maybeSingle()
  if (!item) notFound()
  const it = item as { id: string; title: string; owner_id: string }
  if (it.owner_id !== user.id) redirect(`/items/${id}`)

  const { data } = await supabase
    .from('item_media')
    .select('id,kind,storage_path')
    .eq('item_id', id)
    .order('position')
    .order('created_at')
  const media: ManagedMedia[] = ((data ?? []) as { id: string; kind: 'image' | 'video'; storage_path: string }[]).map((m) => ({
    id: m.id,
    kind: m.kind,
    url: mediaUrl(m.kind, m.storage_path),
  }))

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Photos and video</h1>
        <p className="text-muted">
          {it.title}.{' '}
          <Link href={`/items/${id}`} className="text-cobalt underline">View listing</Link>
        </p>
      </div>
      <MediaManager itemId={id} userId={user.id} media={media} />
    </div>
  )
}
