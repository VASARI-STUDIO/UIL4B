// THE PHONE PANEL'S STRIP CONTROLS. Drawn 44px tall, tapped over 56px: the
// stylesheet's `.lp-tap::after` extends the hit area downward without
// making the strip look taller.

const FONT = "'Geist', system-ui, sans-serif"
const INK = '#EFEEEA'
const EASE = 'cubic-bezier(.23,1,.32,1)'
const icon = { position: 'absolute', transition: `opacity 200ms ${EASE}` }

export function PhonePause({ loop, v }) {
  return (
    <button
      type="button"
      className="lp-tap lp-tap-pause"
      onClick={loop.toggle}
      aria-label={v.toggleLabel}
      style={{
        flex: 'none', position: 'relative', width: 74, height: 44, padding: '0 4px', border: 0, background: 'transparent',
        color: INK, cursor: 'pointer', display: v.pauseDisplay, alignItems: 'center', gap: 6, font: `500 12px/16px ${FONT}`,
      }}
    >
      <span
        style={{
          flex: 'none', position: 'relative', width: 32, height: 32, boxSizing: 'border-box', borderRadius: 999,
          border: '1px solid rgba(239,238,234,.2)',
        }}
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ ...icon, left: 9, top: 9, opacity: v.showPause }}>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ ...icon, left: 9, top: 9, opacity: v.showPlay }}>
          <path d="M8 5l11 7-11 7z" />
        </svg>
        <svg
          aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" style={{ ...icon, left: 8, top: 8, opacity: v.showReplay }}
        >
          <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
        </svg>
      </span>
      <span style={{ color: 'rgba(239,238,234,.86)' }}>{v.toggleText}</span>
    </button>
  )
}

export function PhoneChapters({ loop, v }) {
  return v.chapters.map((c) => (
    <button
      key={c.i}
      type="button"
      className="lp-tap lp-tap-ch"
      data-sim={c.sim}
      onClick={() => loop.goChapter(c.i)}
      aria-current={c.on}
      aria-label={c.aria}
      style={{
        flex: '1 1 0', minWidth: 0, position: 'relative', height: 44, padding: 0, border: 0, borderRadius: 10,
        cursor: 'pointer', font: `500 12px ${FONT}`, color: c.color, whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          position: 'absolute', left: 4, right: 4, top: 9, height: 2, borderRadius: 999, background: c.track, overflow: 'hidden',
        }}
      >
        <span
          style={{
            position: 'absolute', inset: 0, background: INK, transformOrigin: '0 50%', transform: `scaleX(${c.fill})`,
            transition: `transform ${c.ms}ms linear`,
          }}
        />
      </span>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 18 }}>{c.n}</span>
    </button>
  ))
}
