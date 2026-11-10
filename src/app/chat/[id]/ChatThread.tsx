'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MessageRow } from '@/lib/types'

export default function ChatThread({
  conversationId,
  userId,
  initial,
}: {
  conversationId: string
  userId: string
  initial: MessageRow[]
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initial)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const bottom = useRef<HTMLDivElement>(null)

  const add = (m: MessageRow) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => add(payload.new as MessageRow)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setError('')
    const { data, error } = await createClient()
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, body })
      .select('id,conversation_id,sender_id,body,created_at')
      .single()
    if (error) return setError(error.message)
    add(data as MessageRow)
    setText('')
  }

  return (
    <div className="card flex h-[65vh] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && <p className="text-muted">Say hello and agree on a pickup time and place.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === userId
          return (
            <div key={m.id} className={mine ? 'text-right' : 'text-left'}>
              <span
                className={`inline-block max-w-[80%] whitespace-pre-wrap rounded px-3 py-2 text-left ${
                  mine ? 'bg-cobalt text-white' : 'bg-paper border border-line'
                }`}
              >
                {m.body}
              </span>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      {error ? <p role="alert" className="note-error m-3">{error}</p> : null}
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          className="input" value={text} onChange={(e) => setText(e.target.value)}
          maxLength={2000} placeholder="Write a message" aria-label="Message"
        />
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  )
}
