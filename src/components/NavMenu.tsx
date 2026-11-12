'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const LINKS = [
  { href: '/items/new', label: 'Post an item' },
  { href: '/my/listings', label: 'My listings' },
  { href: '/my/bookings', label: 'My bookings' },
  { href: '/chat', label: 'Messages' },
]

export default function NavMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the menu after every page change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close with the Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!signedIn) {
    return <Link href="/login" className="ml-auto">Sign in</Link>
  }

  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
      </button>

      <div id="site-menu" className={`nav-menu ${open ? 'is-open' : ''}`}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="nav-link"
            aria-current={pathname.startsWith(l.href) ? 'page' : undefined}
          >
            {l.label}
          </Link>
        ))}
        <form action="/auth/signout" method="post" className="nav-signout">
          <button className="btn btn-quiet btn-sm" type="submit">Sign out</button>
        </form>
      </div>
    </>
  )
}