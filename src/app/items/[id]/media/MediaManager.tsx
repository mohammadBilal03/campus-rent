'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image'
import { MAX_IMAGES, MAX_VIDEO_MB, VIDEO_TYPES, type NewMedia } from '@/lib/media'
import { addMedia, removeMedia } from './actions'

export type ManagedMedia = { id: string; kind: 'image' | 'video'; url: string }

export default function MediaManager({
  itemId,
  userId,
  media,
}: {
  itemId: string
  userId: string
  media: ManagedMedia[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const images = media.filter((m) => m.kind === 'image')
  const video = media.find((m) => m.kind === 'video')

  async function finish(uploaded: NewMedia[]) {
    const res = await addMedia(itemId, uploaded)
    if (res.error) throw new Error(res.error)
    router.refresh()
  }

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const room = MAX_IMAGES - images.length
    if (room <= 0) return setError(`You can add up to ${MAX_IMAGES} photos. Remove one first.`)

    const chosen = files.slice(0, room)
    setBusy(true)
    setError('')
    try {
      const supabase = createClient()
      const uploaded: NewMedia[] = []
      for (let i = 0; i < chosen.length; i++) {
        const f = chosen[i]
        setStatus(`Uploading photo ${i + 1} of ${chosen.length}`)
        if (!f.type.startsWith('image/')) throw new Error(`${f.name} is not an image`)
        const blob = await compressImage(f)
        const path = `${userId}/${crypto.randomUUID()}.webp`
        const { error } = await supabase.storage.from('item-images').upload(path, blob, { contentType: 'image/webp' })
        if (error) throw new Error(error.message)
        uploaded.push({ kind: 'image', path })
      }
      await finish(uploaded)
      if (files.length > chosen.length) setError(`Only ${chosen.length} photos were added (limit is ${MAX_IMAGES}).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      setStatus('')
    }
  }

  async function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (video) return setError('This item already has a video. Remove it first.')
    if (!VIDEO_TYPES.includes(f.type)) return setError('Use an MP4, WebM or MOV video')
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) return setError(`Video must be under ${MAX_VIDEO_MB} MB. Record a shorter clip.`)

    setBusy(true)
    setError('')
    setStatus('Uploading video. This can take a minute.')
    try {
      const ext = f.type === 'video/webm' ? 'webm' : f.type === 'video/quicktime' ? 'mov' : 'mp4'
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error } = await createClient().storage.from('item-videos').upload(path, f, { contentType: f.type })
      if (error) throw new Error(error.message)
      await finish([{ kind: 'video', path }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      setStatus('')
    }
  }

  async function onRemove(id: string) {
    if (!window.confirm('Remove this file?')) return
    setBusy(true)
    setError('')
    const res = await removeMedia(id)
    setBusy(false)
    if (res.error) return setError(res.error)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="note-error">{error}</p> : null}
      {status ? <p className="note-info" role="status">{status}</p> : null}

      <section className="card space-y-3 p-4">
        <h2 className="text-xl font-semibold">Photos ({images.length} of {MAX_IMAGES})</h2>
        <p className="text-sm text-muted">The first photo is the cover shown in search results.</p>
        {images.length === 0 ? <p className="text-muted">No photos yet.</p> : null}
        <ul className="media-grid">
          {images.map((m, i) => (
            <li key={m.id} className="media-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={`Photo ${i + 1}`} />
              {i === 0 && <span className="pill media-cover">Cover</span>}
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onRemove(m.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <label className="field">
          Add photos (you can select several)
          <input className="input" type="file" accept="image/*" multiple disabled={busy || images.length >= MAX_IMAGES} onChange={onPhotos} />
        </label>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-xl font-semibold">Video (optional)</h2>
        <p className="text-sm text-muted">One short clip, MP4, WebM or MOV, under {MAX_VIDEO_MB} MB.</p>
        {video ? (
          <div className="space-y-2">
            <video className="w-full rounded" src={video.url} controls playsInline preload="metadata" />
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onRemove(video.id)}>
              Remove video
            </button>
          </div>
        ) : (
          <label className="field">
            Add a video
            <input className="input" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={onVideo} />
          </label>
        )}
      </section>
    </div>
  )
}
