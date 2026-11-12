'use client'

import { useRef, useState } from 'react'

export type Slide = { id: string; kind: 'image' | 'video'; url: string }

export default function Gallery({ slides, title }: { slides: Slide[]; title: string }) {
  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)
  const count = slides.length

  if (count === 0) {
    return <div className="card grid aspect-[4/3] place-items-center text-muted">No photos yet</div>
  }

  const safe = Math.min(index, count - 1)
  const current = slides[safe]
  const go = (n: number) => setIndex((n + count) % count)

  return (
    <div
      className="space-y-2"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title}, photos and video`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(safe - 1)
        if (e.key === 'ArrowRight') go(safe + 1)
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const delta = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(delta) > 50) go(delta < 0 ? safe + 1 : safe - 1)
      }}
    >
      <div className="card gallery-stage">
        {current.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={`${title}, photo ${safe + 1} of ${count}`} />
        ) : (
          <video key={current.id} src={current.url} controls playsInline preload="metadata" />
        )}

        {count > 1 && (
          <>
            <button type="button" className="gallery-nav gallery-prev" onClick={() => go(safe - 1)} aria-label="Previous">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="gallery-nav gallery-next" onClick={() => go(safe + 1)} aria-label="Next">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="gallery-count">{safe + 1} / {count}</span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="gallery-thumbs">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === safe ? 'is-current' : ''}
              onClick={() => setIndex(i)}
              aria-label={s.kind === 'video' ? 'Show video' : `Show photo ${i + 1}`}
              aria-current={i === safe}
            >
              {s.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.url} alt="" />
              ) : (
                <span className="thumb-video">Video</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
