import { Children, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import LibrarySearch from './LibrarySearch'
import { ToolbarModeContext } from './toolbarMode'
import useMediaQuery from '../../hooks/useMediaQuery'
import useModalDialog from '../../hooks/useModalDialog'
import usePopover from '../../hooks/usePopover'

// The control block that sits between a Library masthead and its grid: search,
// then any number of filter groups, then an optional action.
//
// It is STICKY, which the Palette Library already was and the Gradient Library
// was not. That asymmetry is the whole argument for this component: on a page
// of ~100 cards the filters scroll away exactly when you start wanting them,
// and whether that happened depended on which of the two pages you were on.
//
// `children` are the filter groups. Keeping them as children rather than a
// `filters` prop lets a surface pass one group, three, or none without the
// component guessing what a filter is.
//
// `extra` is a second row INSIDE the sticky container, for controls that change
// how the results are rendered rather than which results there are — the Font
// Gallery's preview text and specimen size.
//
// `count` is the quiet line the app design puts beside the search field on the
// icons page — "60 of 200,000" — and it is a SLOT rather than a computation.
// Not aria-live: the result head already announces the same number.
//
// ── THE ROW NEVER WRAPS ─────────────────────────────────────────────────────
// Toolbars never wrap, at any width, desktop included; when the
// controls do not fit they collapse into a menu or a sheet — a popover on
// desktop, a bottom sheet on a phone.
//
// So the row is `nowrap` and steps down through STAGES until it fits:
//
//   0  every filter group as the page wrote it (a group may still choose its
//      own menu form — see LibraryFilterGroup);
//   1  every group collapsed to its one-line trigger ("MOOD · Warm");
//   2  the groups leave the row for one "Filters" control, which opens them
//      as chips in a popover (desktop) or a bottom sheet (phone);
//   3  the action leaves the row too and sits at the foot of that panel.
//
// Each stage's NEED is measured once it has rendered — the widths of
// everything on the row except the search field, plus the search field's
// FLOOR, plus the gaps — and cached. The search field is the one flexible
// thing, so it is counted at its floor rather than its current width: that is
// what keeps a stage's need independent of the row it is measured in, and so
// what stops the choice oscillating. Going down a stage only happens against
// a need that was measured at that stage and fits.
//
// A PHONE STARTS AT STAGE 2, and gets one more row: `quick` names the child
// (by index) that stays on screen as a single horizontally scrolling chip row
// under the search: one scrollable chip row plus a filter sheet. Every other
// group lives in the sheet. A chip row that scrolls sideways is a row that
// never grows, which is the property wanted; a row of chips that wraps is not.

const PHONE_QUERY = '(max-width:640px)'
// The wide floor is not the search field's comfortable width; it is how narrow
// it may get before the filters step down a stage. At 200 the Palette Library's
// collapsed row needed exactly the 700px it had at 768, so a platform whose text
// measures a pixel or two wider tipped it into the Filters control. 180 leaves
// that row 20px of room without changing what it paints where it already fit.
const SEARCH_FLOOR = { phone: 120, wide: 180 }
const MAX_STAGE = 3

function FiltersGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}

export default function LibraryToolbar({
  search,
  count,
  action,
  extra,
  children,
  // Index into `children` of the group a phone keeps on screen as a
  // scrolling chip row. Defaults to the first group, which is the primary
  // split on every surface that has one; pass null to put every group in the
  // sheet.
  quick = 0,
  // How many filters are currently narrowing the results. Printed on the
  // Filters control once the groups have moved behind it, so hidden state is
  // still stated (the same reason a collapsed trigger names its selection).
  activeFilters = 0,
  className = '',
}) {
  const phone = useMediaQuery(PHONE_QUERY)
  const groups = Children.toArray(children).filter(Boolean)
  const quickIndex = phone && Number.isInteger(quick) && groups[quick] ? quick : -1
  const quickGroup = quickIndex >= 0 ? groups[quickIndex] : null
  const panelGroups = quickIndex >= 0 ? groups.filter((_, i) => i !== quickIndex) : groups

  const minStage = phone ? 2 : 0
  const [stage, setStage] = useState(minStage)
  // Crossing the phone query starts the climb again from the new floor. The two
  // modes count the search field at different floors and put different things
  // on the row, so a stage reached in one says nothing about the other: kept,
  // a phone's stage 2 would hold a wide row on the Filters control, with no
  // wide need cached that could ever step it back down.
  const [stageMode, setStageMode] = useState(phone)
  if (stageMode !== phone) {
    setStageMode(phone)
    setStage(minStage)
  }
  const effective = Math.max(stage, minStage)
  const needs = useRef({})
  const rowRef = useRef(null)

  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const hasPanel = panelGroups.length > 0 || (effective >= 3 && !!action)

  // Measure the stage on screen, then move one step if it does not fit or if a
  // lower stage is already known to. Driven by a ResizeObserver on the row AND
  // on each thing in it: the row's width moves with the viewport, and a
  // child's moves with the page's state — a trigger that says
  // "MOOD · Monochrome" is wider than "MOOD · All". The observer fires once
  // when it starts, which is the first measurement of every stage, and its
  // callback runs after layout and before paint, so a stage that does not fit
  // is never seen.
  const decide = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    const width = row.clientWidth
    if (!width) return
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0
    let need = 0
    let items = 0
    for (const el of row.children) {
      if (getComputedStyle(el).display === 'none') continue
      items += 1
      need += el.classList.contains('lbry-search') ? SEARCH_FLOOR[phone ? 'phone' : 'wide'] : el.scrollWidth
    }
    need += gap * Math.max(0, items - 1)
    needs.current[effective] = need
    if (need > width + 1 && effective < MAX_STAGE) { setStage(effective + 1); return }
    for (let s = minStage; s < effective; s += 1) {
      const known = needs.current[s]
      if (known != null && known <= width) { setStage(s); return }
    }
  }, [effective, minStage, phone])

  // Re-attached whenever the stage (and so what is on the row) changes.
  useEffect(() => {
    const row = rowRef.current
    if (!row || typeof ResizeObserver === 'undefined') return undefined
    const obs = new ResizeObserver(() => decide())
    obs.observe(row)
    for (const el of row.children) obs.observe(el)
    return () => obs.disconnect()
  }, [decide, groups.length, count, action])

  // A font swap changes every option's width, so every cached need is stale.
  // Cleared ONCE, when the fonts settle, not every time `decide` changes: it
  // changes with every stage, and `fonts.ready` has long resolved by then, so
  // clearing there emptied the cache on each step and a row that had stepped
  // up could never find a lower stage to step back down to.
  const decideRef = useRef(decide)
  useEffect(() => { decideRef.current = decide }, [decide])
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (cancelled) return
      needs.current = {}
      decideRef.current()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Leaving the stage that owns the panel closes it, rather than leaving a
  // panel open with no control on screen to hand focus back to.
  const [hadPanel, setHadPanel] = useState(effective >= 2)
  if (hadPanel !== (effective >= 2)) {
    setHadPanel(effective >= 2)
    if (open) setOpen(false)
  }

  const rowMode = effective >= 1 ? 'collapse' : 'auto'
  const showFiltersButton = effective >= 2 && hasPanel

  return (
    <div className={`lbry-toolbar${className ? ` ${className}` : ''}`} data-stage={effective}>
      <div className="lbry-toolbar-row" ref={rowRef}>
        {search && (
          <LibrarySearch
            value={search.value}
            onChange={search.onChange}
            onFocus={search.onFocus}
            placeholder={search.placeholder}
            label={search.label}
          />
        )}
        {count && <span className="lbry-count">{count}</span>}
        {effective < 2 && groups.length > 0 && (
          <ToolbarModeContext.Provider value={rowMode}>
            <div className="lbry-toolbar-filters">{groups}</div>
          </ToolbarModeContext.Provider>
        )}
        {showFiltersButton && (
          <FiltersControl
            phone={phone}
            open={open}
            setOpen={setOpen}
            close={close}
            activeFilters={activeFilters}
            groups={panelGroups}
            action={effective >= 3 ? action : null}
          />
        )}
        {action && effective < 3 && <div className="lbry-toolbar-action">{action}</div>}
      </div>
      {quickGroup && (
        <ToolbarModeContext.Provider value="expand">
          <div className="lbry-toolbar-quick">{quickGroup}</div>
        </ToolbarModeContext.Provider>
      )}
      {extra && <div className="lbry-toolbar-row lbry-toolbar-row--extra">{extra}</div>}
    </div>
  )
}

// The one control the groups collapse into, and the panel it opens.
function FiltersControl({ phone, open, setOpen, close, activeFilters, groups, action }) {
  // Desktop: the app's non-modal disclosure (usePopover — dismissal, focus-in,
  // Escape back to the trigger, edge flipping). Phone: a modal bottom sheet
  // (useModalDialog — focus trap, Escape, scroll lock, focus returned).
  const { triggerRef, popRef } = usePopover(open && !phone, close)
  const sheetRef = useModalDialog(close, { enabled: open && phone })
  const panelId = `lbry-panel-${useId().replace(/:/g, '')}`

  // The sheet is portalled so no ancestor's backdrop-filter or transform can
  // become its containing block, into the nearest dialog when the toolbar
  // lives inside one (FontBrowseDialog) so that dialog's focus trap still
  // holds it. `lib-surface` on the layer keeps the chip styling, which is
  // scoped to that class.
  const [host, setHost] = useState(null)

  const panelBody = (
    <ToolbarModeContext.Provider value="expand">
      <div className="lbry-panel-groups">{groups}</div>
      {action && <div className="lbry-panel-action">{action}</div>}
    </ToolbarModeContext.Provider>
  )

  return (
    <div className="lbry-filterpanel">
      <button
        type="button"
        ref={triggerRef}
        className="lbry-filtersbtn"
        aria-expanded={open}
        aria-haspopup={phone ? 'dialog' : 'true'}
        aria-controls={open ? panelId : undefined}
        data-active={activeFilters > 0}
        onClick={(event) => {
          setHost(event.currentTarget.closest('[role="dialog"]') || document.body)
          setOpen((o) => !o)
        }}
      >
        <FiltersGlyph />
        <span className="lbry-filtersbtn-label">Filters</span>
        {activeFilters > 0 && <span className="lbry-filtersbtn-count">{activeFilters}</span>}
      </button>
      {open && !phone && (
        <div ref={popRef} id={panelId} className="lbry-filterpop-panel" tabIndex={-1} role="group" aria-label="Filters">
          {panelBody}
        </div>
      )}
      {open && phone && host && createPortal(
        <div className="lib-surface lbry-sheet-layer">
          <div className="lbry-sheet-scrim" onClick={close} aria-hidden="true" />
          <div
            ref={sheetRef}
            id={panelId}
            className="lbry-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            tabIndex={-1}
          >
            <div className="lbry-sheet-head">
              <h2 className="lbry-sheet-title" id={`${panelId}-title`}>Filters</h2>
              <button type="button" className="lbry-sheet-done" onClick={close}>Done</button>
            </div>
            <div className="lbry-sheet-body">{panelBody}</div>
          </div>
        </div>,
        host,
      )}
    </div>
  )
}
