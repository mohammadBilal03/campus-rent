import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ConversationRow, MessageRow } from '@/lib/types'
import ChatThread from './ChatThread'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: conv } = await supabase
    .from('conversations')
    .select(
      'id,buyer_id,owner_id, items(title), buyer:profiles!conversations_buyer_id_fkey(full_name), owner:profiles!conversations_owner_id_fkey(full_name)'
    )
    .eq('id', id)
    .maybeSingle()
  if (!conv) notFound()
  const c = conv as unknown as ConversationRow
  const other = c.buyer_id === user!.id ? c.owner : c.buyer

  const { data: msgs } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_id,body,created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(300)

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div>
        <h1 className="text-2xl font-bold">{c.items?.title}</h1>
        <p className="text-muted">Chat with {other?.full_name || 'a student'}</p>
      </div>
      <ChatThread conversationId={id} userId={user!.id} initial={(msgs ?? []) as MessageRow[]} />
    </div>
  )
}
