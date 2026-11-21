import { Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CREATE_TOOL_SEARCH } from '../../data/toolIndex'
// The Create pane is a miniature of the real style-guide export, read from the
// same gallery palette and the same inkFor/grade the exporter uses.
import { LIBRARY_LEAD } from '../../data/libraryTotals'
import { inkFor, grade } from '../../utils/styleGuideExport'
import NavIcon from '../NavIcon'
import { INTENT_MS, MOMENT_OF, GALLERY_STEP_MS, faceByKey, facesAttr, finePointer, galleryRun, warmFaces } from './menuMoments'
import { menuFootNote, menuPromo, menuStacks, menuViewAll } from './menuModel'
// `lazy` in this file is lazyRoute, not React's: if the file for an overlay
// failed to download, it waits for the recovery reload instead of crashing.
import { lazyRoute as lazy } from '../../utils/lazyRoute'

// Rendered only inside the open Discover and Learn panes.
const DiscoverCounts = lazy(() => import('./DiscoverCounts'))
const DiscoverRecommended = lazy(() => import('./DiscoverRecommended'))
const LearnRecommended = lazy(() => import('./LearnRecommended'))

// THE SHARED MEGA MENU. The app header (PillNav) and the marketing bar
// (SpectrumNav) both draw this one panel, so Create, Discover and Learn open
// the same menus on every page. Each owner keeps its own open, hover and
// keyboard state and passes the handlers in; this file is only the view.

export function ArrowRight({ size = 13 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </svg>
  )
}

// THE CREATE PANE'S PICTURE — a page of what an export looks like, set inside
// the pane layout. A miniature of page 2 of the real style guide, with the ink and ratio computed by the
// exporter's own inkFor and grade, so it cannot show a grade the export would
// not print.
function ExportPreview() {
  const palette = LIBRARY_LEAD.palette
  return (
    <div className="pnav-prev" aria-hidden="true">
      <div className="pnav-prev-page">
        <p className="pnav-prev-eyebrow">01 — Colour</p>
        <p className="pnav-prev-title">The palette</p>
        <div className="pnav-prev-grid">
          {palette.colors.map((hex, i) => {
            const { ink, ratio } = inkFor(hex)
            return (
              <div className="pnav-prev-sw" key={`${hex}-${i}`}>
                <span className="pnav-prev-chip" style={{ background: hex, color: ink }}>
                  {hex.toUpperCase()}
                </span>
                <span className="pnav-prev-meta">{grade(ratio)} · {ratio.toFixed(1)}:1</span>
              </div>
            )
          })}
        </div>
        <div className="pnav-prev-foot">
          <span>Colour</span>
          <span>Made with UI L4B</span>
        </div>
      </div>
    </div>
  )
}

// THE MEGA MENU — `UIL4B App.dc.html` lines 127-216, as ONE surface.
//
// No card inside the tray: the columns, the
// promo content and the foot sit on the one ground, divided by hairlines. The
// file's measures stay: 7px inset, 26px radius, page .98 under a 30px blur,
// 15px/13px column padding, 9.5px mono sentence-case labels at .16em, one-line
// rows with a 26px neutral tile and a 13.5px label, 8.5px mono badges at 8px
// radius on the right, and a foot of the section's own line and its view-all.
//
// It is a function component with a forwarded ref only in name: React 19
// passes `ref` as a prop.
export default function MegaMenu({ ref, section, path, showSoon, onMouseEnter, onMouseLeave, onKeyDown, onPick, onBrandKit, brandKitLabel }) {
  const stacks = menuStacks(section, { showSoon })
  const promo = menuPromo(section)
  // A row is marked only when it is the page the visitor is on: aria-current,
  // which the CSS draws. Hover and keyboard focus light a row separately, and an
  // open menu lights nothing by itself.
  const isHere = (t) => !!t.route && (path === t.route || path.startsWith(t.route + '/') || !!t.views?.includes(path))

  // THE READOUT. One row is "active" while the pointer is on it or keyboard focus
  // is in it; the foot's line then says what that row is for, and goes back to
  // the section's own line when nothing is. Tracked by delegation on the grid
  // (pointerover and focus bubble), not a handler per row. The section id rides
  // along so a row id both menus share (Font Gallery) cannot carry over.
  // `mode` rides along for the hover moments (nav/menuMoments.js): 'pointer' for a
  // fine pointer, 'key' for keyboard focus, null for anything that gets no moment.
  // The same handlers set it, so there is no second tracker.
  const [active, setActive] = useState({ section: section.id, id: null, mode: null })
  const activeId = active.section === section.id ? active.id : null
  const activeMode = active.section === section.id ? active.mode : null
  const rowOf = (el) => el?.closest?.('[data-row-id]')?.getAttribute('data-row-id') || null
  const setRow = (id, mode = null) => setActive((prev) => (
    prev.section === section.id && prev.id === id && prev.mode === (id ? mode : null)
      ? prev
      : { section: section.id, id, mode: id ? mode : null }
  ))
  // Nothing under the pointer: fall back to the row keyboard focus is in, or to none.
  const settleRow = (grid) => {
    const f = grid.contains(document.activeElement) ? document.activeElement : null
    setRow(rowOf(f), keyboardRow(f))
  }
  const keyboardRow = (el) => (el?.matches?.(':focus-visible') ? 'key' : null)
  const pointerMode = (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return null
    if (!finePointer()) return null
    // A pointer arriving on the row keyboard focus is already on keeps that moment.
    const row = e.target.closest?.('[data-row-id]')
    return row && row === document.activeElement ? keyboardRow(row) || 'pointer' : 'pointer'
  }
  const activeRow = activeId
    ? stacks.flat().flatMap((col) => col.tools).find((t) => t.id === activeId)
    : null
  const activeDesc = activeRow
    ? (section.id === 'create' ? CREATE_TOOL_SEARCH[activeRow.id]?.description : null) || activeRow.desc
    : null
  const readoutText = activeRow && activeDesc ? activeDesc : null

  // THE HOVER MOMENT. data-live goes on the active row: at once for keyboard focus,
  // INTENT_MS after a fine pointer arrives. Leaving or blurring clears it at once
  // (activeId changes), and the timer's cleanup drops a pending start.
  const [intentId, setIntentId] = useState(null)
  useEffect(() => {
    if (activeMode !== 'pointer' || !activeId) return undefined
    const t = setTimeout(() => setIntentId(activeId), INTENT_MS)
    return () => { clearTimeout(t); setIntentId(null) }
  }, [activeId, activeMode])
  const liveId = activeMode === 'key' ? activeId : activeMode === 'pointer' && intentId === activeId ? activeId : null

  // Faces for the name moments: warmed once, on the first menu open, and used only
  // once ready. data-faces on the root tells the CSS which are.
  const [faces, setFaces] = useState(facesAttr)
  const warms = section.id === 'create' || section.id === 'discover'
  useEffect(() => {
    if (!warms) return undefined
    let alive = true
    warmFaces().then(() => { if (alive) setFaces(facesAttr()) })
    return () => { alive = false }
  }, [warms])

  // Font Gallery: the name steps through the shuffled ready faces and loops while the
  // row is live. Going quiet resets it; a run of one face (reduced motion) just sets it.
  const [galleryFace, setGalleryFace] = useState(null)
  const galleryLive = liveId === 'font-gallery' && finePointer()
  useEffect(() => {
    if (!galleryLive) return undefined
    const run = galleryRun()
    let step = 0
    let timer = null
    const tick = () => {
      setGalleryFace(run[step % run.length].key)
      step += 1
      if (run.length > 1) timer = setTimeout(tick, GALLERY_STEP_MS)
    }
    if (run.length) timer = setTimeout(tick, 0)
    return () => { clearTimeout(timer); setGalleryFace(null) }
  }, [galleryLive])
  return (
    <div
      ref={ref}
      id="pnav-mega"
      className="pnav-menu"
      data-menu={section.id}
      data-faces={faces || undefined}
      role="region"
      aria-label={`${section.label} menu`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      <div className="pnav-menu-body">
        <div className="pnav-menu-cols">
          <div
            className="pnav-grid"
            data-cols={stacks.length}
            onPointerOver={(e) => { const id = rowOf(e.target); if (id) setRow(id, pointerMode(e)); else settleRow(e.currentTarget) }}
            onPointerLeave={(e) => settleRow(e.currentTarget)}
            onFocus={(e) => { const id = rowOf(e.target); if (id) setRow(id, keyboardRow(e.target)) }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setRow(null) }}
          >
            {stacks.map((stack) => (
              <div className="pnav-colstack" key={stack[0].label}>
                {stack.map((col) => (
                  <div className="pnav-col" key={col.label}>
                    <p className="pnav-col-label">{col.label}</p>
                    <ul className="pnav-toollist">
                      {col.tools.map((t) => {
                        const moment = MOMENT_OF[t.id]
                        const face = moment === 'font-gallery' && t.id === liveId ? faceByKey(galleryFace) : null
                        return (
                        <li key={t.id}>
                          <Link
                            className="pnav-tool"
                            to={t.route}
                            data-soon={t.soon ? 'true' : undefined}
                            data-hue={t.hue}
                            data-row-id={t.id}
                            data-moment={moment}
                            data-live={moment && t.id === liveId ? '' : undefined}
                            aria-describedby={readoutText && t.id === activeId ? 'pnav-readout' : undefined}
                            aria-current={isHere(t) ? 'page' : undefined}
                            aria-label={t.soon ? `${t.label} — coming soon` : t.beta ? `${t.label} — beta` : undefined}
                            onClick={onPick}
                            data-pnav-menuitem
                          >
                            <span className="pnav-tool-ico" aria-hidden="true">
                              <NavIcon id={t.icon} moment={moment} />
                            </span>
                            <span className="pnav-tool-label">
                              {moment === 'font-pair'
                                // A real space between the words, so textContent stays "Font Pair".
                                ? <span className="pnav-tool-nm"><span className="w1">Font</span> <span className="w2">Pair</span></span>
                                : (
                                  <span
                                    className="pnav-tool-nm"
                                    data-face={face ? face.key : undefined}
                                    style={face ? { fontFamily: face.family, fontWeight: face.weight } : undefined}
                                  >{t.label}</span>
                                )}
                            </span>
                            {t.mins && <span className="pnav-tool-mins">{t.mins}</span>}
                            {t.soon && <span className="soon-badge">Soon</span>}
                            {!t.soon && t.beta && <span className="beta-badge">Beta</span>}
                            {isHere(t) && (
                              <span className="pnav-tool-here" aria-hidden="true">
                                <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
                              </span>
                            )}
                          </Link>
                        </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <aside className="pnav-editorial" data-pane={section.id}>
            <div>
              <p className="pnav-editorial-title">{promo.title}</p>
              <p className="pnav-editorial-blurb">{promo.blurb}</p>
            </div>
            {section.id === 'create' && <ExportPreview />}
            {section.id === 'discover' && (
              <div className="pnav-dside">
                <Suspense fallback={<div className="pnav-dcounts pnav-dcounts--wait" />}>
                  <DiscoverCounts />
                </Suspense>
                <Suspense fallback={<div className="pnav-reco pnav-reco--wait" />}>
                  <DiscoverRecommended path={path} onPick={onPick} />
                </Suspense>
              </div>
            )}
            {section.id === 'learn' && (
              <div className="pnav-dside">
                <Suspense fallback={<div className="pnav-reco pnav-reco--wait" />}>
                  <LearnRecommended path={path} onPick={onPick} />
                </Suspense>
              </div>
            )}
            {section.id === 'create' ? (
              <button type="button" className="pnav-editorial-cta" onClick={onBrandKit} data-pnav-menuitem>
                <span>{brandKitLabel || promo.cta}</span>
                <ArrowRight />
              </button>
            ) : (
              <Link className="pnav-editorial-cta" to={promo.href} onClick={onPick} data-pnav-menuitem>
                <span>{promo.cta}</span>
                <ArrowRight />
              </Link>
            )}
          </aside>
        </div>
      </div>
      <div className="pnav-menu-foot">
        <p className="pnav-menu-foot-note pnav-menu-readout" id="pnav-readout">
          {readoutText ? <><b>{activeRow.label}</b>{' '}{readoutText}</> : menuFootNote(section)}
        </p>
        <Link className="pnav-menu-foot-link" to={section.viewAllHref} onClick={onPick} data-pnav-menuitem>
          <span>{menuViewAll(section)}</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
