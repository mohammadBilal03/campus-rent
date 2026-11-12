export default function Loading() {
  return (
    <div className="flex items-center gap-3 py-16 text-muted" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  )
}