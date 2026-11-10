import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ConversationRow } from '@/lib/types'

export default async function ChatList() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('conversations')
    .select(
      'id,buyer_id,owner_id, items(title), buyer:profiles!conversations_buyer_id_fkey(full_name), owner:profiles!conversations_owner_id_fkey(full_name)'
    )
    .order('created_at', { ascending: false })
  const chats = (data ?? []) as unknown as ConversationRow[]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">Messages</h1>
      {chats.length === 0 ? (
        <p className="note-info">No conversations yet. Open an item and choose “Message owner”.</p>
      ) : null}
      <ul className="space-y-2">
        {chats.map((c) => {
          const other = c.buyer_id === user!.id ? c.owner : c.buyer
          return (
            <li key={c.id}>
              <Link href={`/chat/${c.id}`} className="card block p-4">
                <p className="font-semibold">{c.items?.title}</p>
                <p className="text-sm text-muted">With {other?.full_name || 'a student'}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
