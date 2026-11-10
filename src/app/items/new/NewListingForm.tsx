'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/types'
import { createListing } from './actions'

// Shrinks a photo to at most 1280px wide and re-encodes it as WebP before upload.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo'))), 'image/webp', 0.8)
  )
}

export default function NewListingForm({ categories, userId }: { categories: Category[]; userId: string }) {
  const [type, setType] = useState('rent')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const photo = formData.get('photo')
    formData.delete('photo')

    try {
      if (photo instanceof File && photo.size > 0) {
        if (!photo.type.startsWith('image/')) throw new Error('Please choose an image file')
        const blob = await compressImage(photo)
        const path = `${userId}/${crypto.randomUUID()}.webp`
        const { error } = await createClient().storage
          .from('item-images')
          .upload(path, blob, { contentType: 'image/webp' })
        if (error) throw new Error(error.message)
        formData.set('image_path', path)
      }
      await createListing(formData) // redirects to the new listing on success
    } catch (err) {
      // Next.js redirects are thrown internally; let them through.
      if (err && typeof err === 'object' && 'digest' in err) throw err
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <label className="field">Title
        <input className="input" name="title" required minLength={3} maxLength={120} placeholder="Engineering Mathematics, 3rd edition" />
      </label>
      <label className="field">Description
        <textarea className="input" name="description" rows={4} maxLength={2000} placeholder="Condition details, what is included, notes for the renter" />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">Category
          <select className="input" name="category_id" required defaultValue="">
            <option value="" disabled>Choose</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">Condition
          <select className="input" name="condition" defaultValue="good">
            <option value="new">New</option>
            <option value="like_new">Like new</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </label>
        <label className="field">Listing type
          <select className="input" name="listing_type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="rent">Rent</option>
            <option value="sell">Sell</option>
            <option value="both">Rent or sell</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {type !== 'sell' && (
          <label className="field">Rent per day (₹)
            <input className="input" name="rent_price_per_day" type="number" min={0} step="1" required />
          </label>
        )}
        {type !== 'rent' && (
          <label className="field">Sale price (₹)
            <input className="input" name="sale_price" type="number" min={0} step="1" required />
          </label>
        )}
        {type !== 'sell' && (
          <label className="field">Deposit (₹)
            <input className="input" name="deposit" type="number" min={0} step="1" defaultValue={0} />
          </label>
        )}
      </div>

      <label className="field">Pickup spot
        <input className="input" name="pickup_area" maxLength={100} placeholder="Library gate, Hostel 3 lobby" />
      </label>
      <label className="field">Photo
        <input className="input" name="photo" type="file" accept="image/*" />
      </label>

      <p className="text-sm text-muted">Meet in public campus spots and settle payment in cash or UPI at handover.</p>
      {error ? <p role="alert" className="note-error">{error}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Posting' : 'Post item'}</button>
    </form>
  )
}
