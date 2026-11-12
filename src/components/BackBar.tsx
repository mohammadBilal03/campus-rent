'use client'

import { usePathname, useRouter } from 'next/navigation'

// A Back button on every page except the home and login pages.
export default function BackBar() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/auth')) return null

  function goBack() {
    // If the page was opened directly (no history), go home instead of doing nothing.
    if (window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <div className="mb-4">
      <button type="button" className="back-link" onClick={goBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>
    </div>
  )
}
