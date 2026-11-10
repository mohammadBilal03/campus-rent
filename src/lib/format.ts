import type { ItemCardRow } from './types'

export const inr = (n: number | null | undefined) =>
  n == null ? '' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n))

export function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/item-images/${path}`
}

export function priceLabel(item: Pick<ItemCardRow, 'listing_type' | 'rent_price_per_day' | 'sale_price'>) {
  if (item.listing_type === 'sell') return inr(item.sale_price)
  if (item.listing_type === 'rent') return `${inr(item.rent_price_per_day)}/day`
  return `${inr(item.rent_price_per_day)}/day or ${inr(item.sale_price)}`
}

export function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayIso() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
