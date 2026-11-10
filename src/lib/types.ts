export type Category = { id: number; name: string }

export type ItemCardRow = {
  id: string
  title: string
  listing_type: 'rent' | 'sell' | 'both'
  rent_price_per_day: number | null
  sale_price: number | null
  image_path: string | null
  pickup_area: string | null
  categories: { name: string } | null
}

export type ItemRow = ItemCardRow & {
  description: string
  condition: string
  deposit: number
  status: string
  owner_id: string
  profiles: { full_name: string } | null
}

export type BookingRow = {
  id: string
  item_id: string
  renter_id: string
  owner_id: string
  start_date: string
  end_date: string
  status: string
  total_price: number
  deposit_snapshot: number
  items: { title: string } | null
  renter: { full_name: string } | null
  owner: { full_name: string } | null
}

export type ConversationRow = {
  id: string
  buyer_id: string
  owner_id: string
  items: { title: string } | null
  buyer: { full_name: string } | null
  owner: { full_name: string } | null
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}
