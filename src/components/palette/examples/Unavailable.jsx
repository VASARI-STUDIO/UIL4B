// Shown in place of an example whose chunk failed to load (offline, a stale
// deploy). Calm and small: the dialog around it still works; a reload
// fetches the chunk again. Colours are the stage's own neutrals.
export default function Unavailable() {
  return (
    <div
      role="status"
      style={{
        display: 'grid', placeItems: 'center', alignContent: 'center', gap: 'var(--s-1)', minHeight: 240, padding: 'var(--s-6)',
        textAlign: 'center', background: 'var(--pv-canvas)', color: 'var(--pv-text)',
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 600 }}>{"This example didn't load"}</p>
      <p style={{ fontSize: 13, color: 'var(--pv-muted)' }}>Check your connection, then reload the page.</p>
    </div>
  )
}
