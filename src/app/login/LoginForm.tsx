'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm({ domain }: { domain: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (mode === 'signup' && domain && !email.trim().toLowerCase().endsWith('@' + domain.toLowerCase())) {
      setError(`Use your @${domain} email address.`)
      return
    }

    setBusy(true)
    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      setBusy(false)
      if (error) return setError(error.message)
      return setInfo('Check your inbox and click the verification link, then sign in.')
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) return setError(error.message)
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      {mode === 'signup' && (
        <label className="field">
          Full name
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
        </label>
      )}
      <label className="field">
        University email
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label className="field">
        Password
        <input
          className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
      </label>

      {error ? <p role="alert" className="note-error">{error}</p> : null}
      {info ? <p className="note-info">{info}</p> : null}

      <button className="btn w-full" disabled={busy} type="submit">
        {busy ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button" className="text-sm text-cobalt underline"
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}
      >
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </form>
  )
}
