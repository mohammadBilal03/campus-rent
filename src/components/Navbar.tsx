import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b border-line bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          campus-rent
        </Link>
        {user ? (
          <>
            <Link href="/items/new">Post an item</Link>
            <Link href="/my/listings">My listings</Link>
            <Link href="/my/bookings">My bookings</Link>
            <Link href="/chat">Messages</Link>
            <form action="/auth/signout" method="post" className="ml-auto">
              <button className="btn btn-quiet btn-sm" type="submit">Sign out</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="ml-auto">Sign in</Link>
        )}
      </nav>
    </header>
  )
}
