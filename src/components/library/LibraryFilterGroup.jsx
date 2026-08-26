import { useCallback, useEffect, useRef } from 'react'

// A segmented filter tray with a sliding indicator — the one filter idiom for
// every Library browse surface.
//
// It replaces three that were live at once: outlined pills (`.pl-chip`,
// borrowed from the Prompt Library), a brand-filled segmented control
// (`.ch-sort`, borrowed from the Contrast Checker) and the Palette Library's
// own tray (`.pgl-filters`). The Gradient Library used the first two SIDE BY
// SIDE in a single toolbar, so one row asked the same question — "which subset
// am I looking at?" — in two visually unrelated ways.
//
// The indicator is MEASURED off the active button rather than computed from its
// index: options have different label widths, and the tray wraps and scrolls on
// narrow screens, so an index-derived offset is wrong the moment anything
// reflows. It is `aria-hidden` decoration — `aria-pressed` on each button is
// what actually reports state, so the control is complete with CSS disabled and
// correct to a screen reader whether or not the measurement ever runs.

export default function LibraryFilterGroup({
  label,
  value,
  onChange,
  options,
  className = '',
}) {
  const trayRef = useRef(null)

  const place = useCallback(() => {
    const tray = trayRef.current
    if (!tray) return
    const active = tray.querySelector('[data-active="true"]')
    // No active option (or nothing laid out yet) hides the indicator instead of
    // parking it at x=0, where it would sit under the first option and claim a
    // selection that is not there.
    if (!active || !active.offsetWidth) {
      tray.style.setProperty('--lbry-ind-opacity', '0')
      return
    }
    tray.style.setProperty('--lbry-ind-x', `${active.offsetLeft}px`)
    tray.style.setProperty('--lbry-ind-w', `${active.offsetWidth}px`)
    tray.style.setProperty('--lbry-ind-opacity', '1')
  }, [])

  useEffect(() => { place() }, [place, value, options])

  useEffect(() => {
    const tray = trayRef.current
    if (!tray) return undefined

    // The tray's own box changes on viewport reflow; the option widths change
    // when the UI font swaps in. Neither event implies the other, so both are
    // watched — a mis-measured indicator that never corrects itself is worse
    // than no indicator.
    let obs
    if (typeof ResizeObserver !== 'undefined') {
      obs = new ResizeObserver(place)
      obs.observe(tray)
      for (const child of tray.children) obs.observe(child)
    }
    let cancelled = false
    document.fonts?.ready?.then(() => { if (!cancelled) place() }).catch(() => {})

    return () => { cancelled = true; obs?.disconnect() }
  }, [place])

  return (
    <div
      className={`lbry-filters${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={label}
      ref={trayRef}
    >
      <span className="lbry-filter-ind" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="lbry-filter"
          data-active={value === option.id}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.dot && <span className="lbry-filter-dot" data-dot={option.dot} aria-hidden="true" />}
          {option.label}
        </button>
      ))}
    </div>
  )
}
