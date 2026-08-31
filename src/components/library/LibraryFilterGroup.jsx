import { useCallback, useEffect, useRef } from 'react'
import { isOn, toggleSelection } from './filterSelection'

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
// index: options have different label widths, and the tray wraps on narrow
// screens, so an index-derived offset is wrong the moment anything reflows. It
// is `aria-hidden` decoration — `aria-pressed` on each button is what actually
// reports state, so the control is complete with CSS disabled and correct to a
// screen reader whether or not the measurement ever runs.
//
// BOTH AXES are measured, not just X. The tray wraps rather than scrolling (see
// `.lbry-filters` in global.css), so on a phone the active option is often not
// on the first line — an X-only offset would leave the indicator on line one,
// highlighting an option nobody chose.
//
// ── MULTI-SELECT (opt-in via `multiSelect`) ─────────────────────────────────
// Founder request (2026-08-08): shift-click to pick more than one, and picking
// every option collapses back to the reset option rather than reading as a
// filter that excludes nothing while looking like it excludes something.
//
// `value` then holds an ARRAY of ids and `onChange` is handed one. The
// single-select call sites keep passing and receiving a string; nothing about
// them changes.
//
// THE KEYBOARD EQUIVALENT IS THE SAME GESTURE, NOT A SECOND ONE. A button
// activated with Enter or Space carries the live modifier state on the click
// event it dispatches, so Shift+Enter on a focused option is additive for the
// same reason Shift+Click is — one code path, and no chance of the two drifting
// apart. Ctrl/Cmd are accepted alongside Shift because that is the multi-select
// chord people arrive with from file managers, and neither means anything else
// here. There is a rendered test for Shift+Enter specifically; this is the sort
// of claim that is easy to assume and easy to get wrong.
//
// The sliding indicator hides itself the moment more than one option is on:
// one box cannot point at three things, and leaving it on the first of them
// would report a selection narrower than the real one. `aria-pressed` carries
// the state either way, which is why hiding it costs nothing.

export default function LibraryFilterGroup({
  label,
  value,
  onChange,
  options,
  className = '',
  multiSelect = false,
  // The option that means "no filter". Only consulted in multiSelect mode.
  resetId = 'all',
  hint,
}) {
  const trayRef = useRef(null)
  // 'none' | 'one' | 'multi'. Drives the CSS that has to stand in for the
  // sliding indicator once the indicator can no longer point at the selection.
  const activeOptions = options.filter(o => isOn(value, o.id)).length
  const activeCount = activeOptions === 0 ? 'none' : activeOptions === 1 ? 'one' : 'multi'

  const place = useCallback(() => {
    const tray = trayRef.current
    if (!tray) return
    const on = tray.querySelectorAll('[data-active="true"]')
    const active = on.length === 1 ? on[0] : null
    // No active option, nothing laid out yet, or more than one option on: hide
    // the indicator rather than parking it at x=0 (where it would sit under the
    // first option and claim a selection that is not there) or leaving it on
    // one of several (where it would report a narrower filter than is applied).
    if (!active || !active.offsetWidth) {
      tray.style.setProperty('--lbry-ind-opacity', '0')
      return
    }
    // offsetLeft/offsetTop are relative to the tray, which is the offsetParent
    // (`position:relative`), so the tray's own padding is already included.
    tray.style.setProperty('--lbry-ind-x', `${active.offsetLeft}px`)
    tray.style.setProperty('--lbry-ind-y', `${active.offsetTop}px`)
    tray.style.setProperty('--lbry-ind-w', `${active.offsetWidth}px`)
    tray.style.setProperty('--lbry-ind-h', `${active.offsetHeight}px`)
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
      aria-label={multiSelect && hint ? `${label}. ${hint}` : label}
      data-active-count={activeCount}
      ref={trayRef}
    >
      <span className="lbry-filter-ind" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="lbry-filter"
          data-active={isOn(value, option.id)}
          aria-pressed={isOn(value, option.id)}
          title={multiSelect && hint ? hint : undefined}
          onClick={(event) => {
            if (!multiSelect) { onChange(option.id); return }
            const additive = event.shiftKey || event.metaKey || event.ctrlKey
            onChange(additive
              ? toggleSelection(value, option.id, { options, resetId })
              : [option.id])
          }}
        >
          {option.dot && <span className="lbry-filter-dot" data-dot={option.dot} aria-hidden="true" />}
          {/* `icon` is a character, not a component: the Emoji Library's
              categories are identified by an emoji and always were. Rendering
              it aria-hidden keeps the option's accessible name the label alone
              — a screen reader announcing "grinning face Smileys" reads the
              decoration twice. Dropping the glyphs instead would have been a
              silent regression dressed as consistency. */}
          {option.icon && <span className="lbry-filter-icon" aria-hidden="true">{option.icon}</span>}
          {option.label}
          {option.count != null && <span className="lbry-filter-count" aria-hidden="true">{option.count}</span>}
        </button>
      ))}
      {/* Visible, because a modifier gesture nobody is told about is a gesture
          nobody uses. aria-hidden: the same words are already in the group's
          accessible name, and a screen reader should hear them once. */}
      {multiSelect && hint && <span className="lbry-filter-hint" aria-hidden="true">{hint}</span>}
    </div>
  )
}
