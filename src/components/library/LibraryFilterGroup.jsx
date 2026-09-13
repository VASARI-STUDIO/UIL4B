import { useCallback, useEffect, useRef, useState } from 'react'
import { isOn, selectionSummary, toggleSelection } from './filterSelection'
import { trayOverflowsRow } from './filterFit'
import useMediaQuery from '../../hooks/useMediaQuery'
import usePopover from '../../hooks/usePopover'

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
//
// ── THE TABLET BAND COLLAPSES THE TRAY TO A MENU ────────────────────────────
// Founder direction, 2026-09-02: "on tablets and mobile … nest buttons and
// menus if needed."
//
// Between 641 and 980px this tray had no layout of its own. It fell through
// into the desktop row, where the search field beside it has no width ceiling,
// and the result was measured on every consumer: the tray wrapped onto a line
// of its own, then wrapped again inside that line, and the toolbar ran to three
// and four rows of sticky chrome — 192px on /discover/gradients at 834px
// against 68px at 1440.
//
// Capping the search field (see `.lbry-search` in global.css) stops the field
// eating the row but does not put the tray back on it: a 503px mood tray still
// cannot share a 772px row with a 360px search. What fits in the space the cap
// frees is a TRIGGER, so that is what this renders there — the pattern Magnific,
// Care.com, Deel and Vanta all reflow their filter bars into, where a filter
// group narrows to one labelled control that opens its options as a list.
//
// The trigger states the group's label AND its current selection, because a
// collapsed group that does not say what it is filtering by has hidden state
// rather than saved space — Deel's chips carry a count for the same reason, and
// that is the failure mode this pattern has.
//
// The band is 641–980, not "all narrow widths". Below 641 the tray is already
// full-width in a deliberate column stack, the chips all fit, and #298 recorded
// the reasoning for keeping them visible there rather than behind a gesture.
// This changes the width range that had no answer at all.
//
// The options inside the menu are the SAME buttons, rendered by the same
// function, so the multi-select contract (shift/ctrl/cmd-click, and the
// identical Shift+Enter keyboard route) is not reimplemented and cannot drift.
// Dismissal, focus-in, Escape-to-trigger, tab-out and edge flipping come from
// usePopover — the app's non-modal disclosure contract. `arrowNav` is on: this
// is a list of sibling options, which is exactly what it was added for.

// ── AND THE BAND WAS NEVER THE REAL CONDITION ───────────────────────────────
// Founder, 2026-09-04: "the header design changes height switching from the
// emoji to icon library. the bar is broken visually on a standard desktop."
//
// Measured at 1440x900: /create/icons rendered a 68px toolbar and /create/emoji
// a 213px one, so switching tabs moved the whole page by 145px. On the emoji
// side it was exactly the shape described above — a 1321px search field alone
// on line one, the tray wrapped to two chip rows on line two, and the skin-tone
// control orphaned hard right on line three — except at 1440, where the band
// below does not apply and nothing was meant to be wrong.
//
// The band was a proxy. What actually breaks a toolbar is a tray that cannot
// fit the row it is on, and the emoji tray wants 1478px: twelve categories each
// carrying a glyph, a label and a count. No desktop narrower than about 2050px
// can give it a line, so this was never going to come right at a wider
// breakpoint. Meanwhile the icon tray wants 493px and fits comfortably at 1440,
// which is why five of the six surfaces looked fine and the sixth did not.
//
// So the condition is now MEASURED rather than assumed: collapse when this
// group's own tray is wider than the column it has to live in. The band stays
// as a floor — below 981px the collapse is unconditional, which is #318's
// decision and is about touch room rather than about fit.
//
// WHY THIS CANNOT OSCILLATE, which is the obvious hazard in a
// measure-then-change-layout loop. Both sides of the comparison are chosen so
// that collapsing cannot change either of them:
//
//   · The tray's intrinsic width is a property of the OPTIONS. It is measured
//     once with `flex-wrap:nowrap` and cached, so it is still known after the
//     tray has left the DOM.
//   · The budget is the ROW's width less the search field's CEILING (360px,
//     from global.css) and the action's width — never the search field's or the
//     filter container's MEASURED width. Those two do move when this group
//     collapses, which is exactly the feedback that would make a loop; the row
//     and the ceiling do not.
//
// Asking "would the tray fit if the search field were at its cap?" is also the
// honest question, because a search field with no ceiling eats the row and then
// every tray looks like it fits on a line of its own.
//
// The comparison deliberately ignores the group's siblings — a pack `<select>`,
// a second filter group. That makes it slightly optimistic: a group can still
// wrap when a sibling eats the room. It also makes it free of any loop between
// two groups that would each collapse because the other had not yet. The
// optimism costs a wrapped line in a rare layout; the loop would cost a toolbar
// that never settles. And the cost is bounded in one direction only: collapsing
// a group can never make the toolbar TALLER, because the trigger it collapses
// to is the same height as the search field beside it.

// The floor: below this the tray collapses whatever it measures, because the
// reason there is touch room, not fit. Kept in step with the `.lbry-search` cap
// in global.css — they are two halves of one layout.
export const COLLAPSE_QUERY = '(min-width:641px) and (max-width:980px)'

// Both from `.lbry-search{max-width}` and `.lbry-toolbar-row{gap}` in
// global.css. They are the CEILING and the gap, not measurements — see the
// oscillation note above for why that distinction is the whole trick.
const SEARCH_CAP = 360
const ROW_GAP = 10

export default function LibraryFilterGroup({
  label,
  // The visible word on the collapsed trigger. `label` is an ACCESSIBLE name —
  // "Filter by gradient type" — which is the right thing for a screen reader
  // and far too long to print inside a 46px control. Given explicitly per call
  // site rather than derived by trimming "Filter by " off the front: two of the
  // six labels ("Sort families", "Filter palettes") do not survive that trim,
  // and a rule that is wrong a third of the time is not a rule.
  triggerLabel,
  value,
  onChange,
  options,
  className = '',
  multiSelect = false,
  // The option that means "no filter". Only consulted in multiSelect mode.
  resetId = 'all',
  hint,
  // ── OPT IN TO THE MENU AT EVERY WIDTH ──────────────────────────────
  //
  // For a group with too many options to ever be a row of chips. The Palette
  // Library's eight moods are the first: MEASURED before this existed, the tray
  // took the sticky toolbar to 314px at 320px wide and 273px at 390px — more
  // than half a small phone's viewport, permanently on screen — and on desktop
  // it wrapped the toolbar to two rows at 1280px while fitting at 1366 and
  // above, so the page changed height between two ordinary laptop sizes.
  //
  // The measured `overflows` path below cannot fix either case. It is switched
  // off under 641px by design (#298), and above the band it is deliberately
  // blind to sibling groups (see the oscillation note) — which is exactly what
  // let 627px of mood tray sit down beside 223px of collection tray at 1280.
  //
  // So this is a decision about the OPTIONS rather than about a viewport, taken
  // once at the call site: nine options is a menu everywhere, not a row of chips
  // that is a row of chips at some widths. That also removes the shape change
  // itself, which is the fault #323 was fixing when it collapsed the emoji tray.
  alwaysCollapsed = false,
}) {
  const trayRef = useRef(null)
  // The wrapper that exists in BOTH forms, so the column can be measured while
  // the tray itself is not rendered.
  const boxRef = useRef(null)
  // Intrinsic width of the expanded tray, cached against the options identity.
  // Call sites build `options` once at module scope (see the note in
  // IconLibrary.jsx), so this is measured once per surface and then reused.
  const intrinsicRef = useRef({ options: null, width: 0 })
  const narrowBand = useMediaQuery(COLLAPSE_QUERY)
  const [overflows, setOverflows] = useState(false)
  const collapsed = alwaysCollapsed || narrowBand || overflows
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, popRef } = usePopover(open, close, { arrowNav: true })
  // 'none' | 'one' | 'multi'. Drives the CSS that has to stand in for the
  // sliding indicator once the indicator can no longer point at the selection.
  const activeOptions = options.filter(o => isOn(value, o.id)).length
  const activeCount = activeOptions === 0 ? 'none' : activeOptions === 1 ? 'one' : 'multi'

  // Adjust-state-during-render (the documented React pattern), not an effect:
  // a resize past the band while the menu is open would otherwise leave the
  // popover mounted with no trigger to hand focus back to, and re-collapsing
  // later would reopen a menu nobody asked for. Doing it in an effect would
  // paint the wrong tree first, and is what `react-hooks/set-state-in-effect`
  // is pointing at.
  const [wasCollapsed, setWasCollapsed] = useState(collapsed)
  if (wasCollapsed !== collapsed) {
    setWasCollapsed(collapsed)
    setOpen(false)
  }

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

  // Does the expanded tray fit the column it lives in? Runs whether or not the
  // tray is currently rendered: the intrinsic width comes from the cache once it
  // has been taken, and the column comes from the wrapper, which always is.
  const fit = useCallback(() => {
    const box = boxRef.current
    if (!box) return
    const row = box.closest('.lbry-toolbar-row')
    if (!row) return
    // Below the band the tray is a full-width column stack by design (#298), so
    // there is nothing to decide and measuring would only add churn.
    if (window.matchMedia('(max-width:640px)').matches) { setOverflows(false); return }

    let intrinsic = intrinsicRef.current.width
    if (intrinsicRef.current.options !== options) {
      const tray = trayRef.current
      // Only measurable while expanded. When the media query has already
      // collapsed the group there is no tray to measure and no decision to make.
      if (!tray) return
      const prev = tray.style.flexWrap
      tray.style.flexWrap = 'nowrap'
      intrinsic = tray.scrollWidth
      tray.style.flexWrap = prev
      if (!intrinsic) return
      intrinsicRef.current = { options, width: intrinsic }
    }

    const action = row.querySelector('.lbry-toolbar-action')
    setOverflows(trayOverflowsRow({
      intrinsic,
      rowWidth: row.clientWidth,
      actionWidth: action ? action.getBoundingClientRect().width : 0,
      searchCap: SEARCH_CAP,
      gap: ROW_GAP,
    }))
  }, [options])

  useEffect(() => { place() }, [place, value, options, collapsed])

  // No separate mount-time call: ResizeObserver invokes its callback once when
  // observation begins, which is both the first measurement and the only place
  // this state is set. Setting it from an effect body instead would be the
  // cascading-render shape react-hooks/set-state-in-effect exists to catch.
  //
  // The row's width changes with the viewport, and the tray's intrinsic width
  // changes when the UI font swaps in. Neither implies the other, so both are
  // watched — the same reasoning as the indicator's observers below.
  useEffect(() => {
    const row = boxRef.current?.closest('.lbry-toolbar-row')
    if (!row) return undefined
    let obs
    if (typeof ResizeObserver !== 'undefined') {
      obs = new ResizeObserver(fit)
      obs.observe(row)
    }
    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (cancelled) return
      // A font swap changes the option widths, so the cached intrinsic is stale.
      intrinsicRef.current = { options: null, width: 0 }
      fit()
    }).catch(() => {})
    return () => { cancelled = true; obs?.disconnect() }
  }, [fit])

  useEffect(() => {
    const tray = trayRef.current
    // `collapsed` is in the dependency list, not merely read: the tray is not
    // in the tree at all while the group is collapsed, so an effect that ran
    // once at mount would attach its observers to nothing and never re-attach
    // when a resize brings the tray back.
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
  }, [place, collapsed])

  // ONE option renderer for both forms. The multi-select gesture, the reset
  // collapse and the accessible name all live here exactly once, so the
  // collapsed menu cannot drift away from the tray it stands in for.
  const renderOption = (option) => (
    <button
      key={option.id}
      type="button"
      className="lbry-filter"
      data-active={isOn(value, option.id)}
      aria-pressed={isOn(value, option.id)}
      title={multiSelect && hint ? hint : undefined}
      onClick={(event) => {
        if (!multiSelect) {
          onChange(option.id)
          // A SINGLE-SELECT MENU CLOSES ON CHOICE. That is the whole difference
          // between a disclosure and the tray it stands in for: the question
          // has been answered, so the answer sheet goes away and focus comes
          // back to the control that states it.
          //
          // MEASURED 2026-09-13 on /create/emoji at 390, light: picking a
          // category left `aria-expanded="true"` and a 492px menu sitting over
          // the grid it had just filtered — the user's own result hidden behind
          // the control that produced it, on the width where the menu is
          // tallest relative to the screen.
          //
          // MULTI-SELECT DELIBERATELY STAYS OPEN: picking several is the whole
          // gesture there, and closing after the first would make the second
          // pick cost a reopen. That is why this is inside the branch and not
          // after it.
          if (collapsed) {
            setOpen(false)
            requestAnimationFrame(() => triggerRef.current?.focus())
          }
          return
        }
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
  )

  if (collapsed) {
    const on = options.filter(o => isOn(value, o.id))
    const summary = selectionSummary(value, options)
    return (
      <div className={`lbry-filterpop${className ? ` ${className}` : ''}`} ref={boxRef}>
        <button
          type="button"
          ref={triggerRef}
          className="lbry-filtertrig"
          data-active={on.length > 0 && !(on.length === 1 && on[0].id === resetId)}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen(o => !o)}
        >
          <span className="lbry-filtertrig-k">{triggerLabel || label}</span>
          <span className="lbry-filtertrig-v">{summary}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div
            ref={popRef}
            className="lbry-filtermenu"
            tabIndex={-1}
            role="group"
            aria-label={multiSelect && hint ? `${label}. ${hint}` : label}
            data-active-count={activeCount}
          >
            {options.map(renderOption)}
            {multiSelect && hint && <span className="lbry-filter-hint" aria-hidden="true">{hint}</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`lbry-filters${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={multiSelect && hint ? `${label}. ${hint}` : label}
      data-active-count={activeCount}
      ref={(node) => { trayRef.current = node; boxRef.current = node }}
    >
      <span className="lbry-filter-ind" aria-hidden="true" />
      {options.map(renderOption)}
      {/* Visible, because a modifier gesture nobody is told about is a gesture
          nobody uses. aria-hidden: the same words are already in the group's
          accessible name, and a screen reader should hear them once. */}
      {multiSelect && hint && <span className="lbry-filter-hint" aria-hidden="true">{hint}</span>}
    </div>
  )
}
