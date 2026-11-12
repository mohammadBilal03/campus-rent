'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { NewMedia } from '@/lib/media'

type Client = Awaited<ReturnType<typeof createClient>>

// Keeps items.image_path (the cover shown on search cards) equal to the first photo.
async function syncCover(supabase: Client, itemId: string) {
  const { data } = await supabase
    .from('item_media')
    .select('storage_path')
    .eq('item_id', itemId)
    .eq('kind', 'image')
    .order('position')
    .order('created_at')
    .limit(1)
  const first = ((data ?? []) as { storage_path: string }[])[0]
  await supabase.from('items').update({ image_path: first?.storage_path ?? null }).eq('id', itemId)
}

function refresh(itemId: string) {
  revalidatePath(`/items/${itemId}`)
  revalidatePath(`/items/${itemId}/media`)
  revalidatePath('/')
  revalidatePath('/my/listings')
}

export async function addMedia(itemId: string, files: NewMedia[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again' }
  if (!Array.isArray(files) || files.length === 0) return { error: 'No files to add' }

  const valid = files.every(
    (f) => (f.kind === 'image' || f.kind === 'video') && typeof f.path === 'string' && f.path.startsWith(`${user.id}/`)
  )
  if (!valid) return { error: 'Invalid file' }

  const { data: last } = await supabase
    .from('item_media')
    .select('position')
    .eq('item_id', itemId)
    .order('position', { ascending: false })
    .limit(1)
  let pos = ((last ?? []) as { position: number }[])[0]?.position ?? -1

  const rows = files.map((f) => ({ item_id: itemId, kind: f.kind, storage_path: f.path, position: ++pos }))
  const { error } = await supabase.from('item_media').insert(rows)
  if (error) return { error: error.message }

  await syncCover(supabase, itemId)
  refresh(itemId)
  return {}
}

export async function removeMedia(mediaId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again' }

  const { data: row } = await supabase
    .from('item_media')
    .select('id,item_id,kind,storage_path')
    .eq('id', mediaId)
    .maybeSingle()
  if (!row) return { error: 'File not found' }
  const r = row as { id: string; item_id: string; kind: 'image' | 'video'; storage_path: string }

  // RLS only lets the item owner delete; confirm a row was really removed.
  const { data: deleted, error } = await supabase.from('item_media').delete().eq('id', mediaId).select('id')
  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) return { error: 'You can only edit your own listings' }

  await supabase.storage.from(r.kind === 'video' ? 'item-videos' : 'item-images').remove([r.storage_path])
  await syncCover(supabase, r.item_id)
  refresh(r.item_id)
  return {}
}
