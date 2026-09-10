import { useCallback, useEffect, useRef, useState } from 'react'
import usePopover from '../hooks/usePopover'
import { chainFrom, elementSignature, invokedByPointer, nativeMenuWins } from '../utils/elementSignature'

// Right-click anywhere → report THIS, with the context already filled in.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE COST WE ARE PAYING, AND WHAT WE PAY IT WITH
// ─────────────────────────────────────────────────────────────────────────────
// Taking over the context menu removes an affordance people rely on daily.
// Three things keep that cost honest, and all three are load-bearing:
//
//   1. We yield wherever the native menu is worth more — a text selection, any
//      input or textarea, links, images, media, contenteditable. Those are the
//      right-clicks that mean copy / paste / save / open-in-new-tab, and
//      breaking one of those is a worse bug than the one this feature catches.
//      The rules live in nativeMenuWins() so they are testable without a DOM.
//   2. Shift+right-click ALWAYS gives the browser menu back. Firefox honours
//      this convention for pages that override the menu; we honour it too, so
//      there is a way out even if rule 1 misses a case we did not anticipate.
//   3. We yield to any local menu that already handled the event. The sidebar
//      and PaletteBuilder have their own right-click menus; ours is the
//      app-wide default and defers to anything more specific.
//
// ─────────────────────────────────────────────────────────────────────────────
// NOT ONLY A MOUSE EVENT
// ─────────────────────────────────────────────────────────────────────────────
// Shift+F10 and the Menu key fire `contextmenu` too, and report either (0,0)
// or detail 0. Those anchor to the focused element's box instead of the
// viewport corner — the same treatment PaletteBuilder's gap menu already uses.
// A keydown fallback covers browsers that do not synthesise the event at all.
// A feature reachable only by mouse would exclude keyboard and assistive-tech
// users from the one channel we have for hearing that something is broken,
// which would be a particularly bad thing to get wrong.

// Fixed width, because the anchor has to be exactly this wide for the shared
// placement maths to land the menu's LEFT edge on the pointer (see below).
const MENU_W = 260
const EDGE = 8

// A device whose ONLY pointer is a finger. `contextmenu` still fires there —
// from a long-press — so this has to be asked of the device rather than read
// off the event, which looks the same either way. `any-pointer: fine` keeps
// the gesture on a tablet with a mouse or trackpad attached.
function touchOnlyDevice() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: coarse)').matches
    && !window.matchMedia('(any-pointer: fine)').matches
}

export default function FeedbackContextMenu({ onReport, suppressed = false }) {
  const [at, setAt] = useState(null) // { x, y, signature }

  // Where focus was when the gesture happened. usePopover returns focus to the
  // trigger on Escape, but our "trigger" is a zero-height anchor floating at
  // the pointer — handing focus to that, and then unmounting it in the same
  // commit, drops a keyboard user on <body>. Measured 2026-09-10: focus was on
  // `.pop-item` inside the menu, and Escape left it on BODY. For a keyboard
  // invocation the right answer is the control they were on when they pressed
  // Shift+F10 or the Menu key.
  const openerRef = useRef(null)

  const dismiss = useCallback(() => {
    const opener = openerRef.current
    openerRef.current = null
    setAt(null)
    // On a click outside, the browser focuses whatever was clicked after this
    // runs, so that wins. This only decides where focus lands when nothing else
    // claims it — which is the Escape case, the one that was broken.
    if (opener?.isConnected && typeof opener.focus === 'function') opener.focus()
  }, [])

  // dismiss, NOT a bare setAt(null): usePopover owns the Escape key, so passing
  // it a closer that does not restore focus is what made Escape lose it.
  const { triggerRef, popRef } = usePopover(!!at, dismiss, { arrowNav: true })

  const openAt = useCallback((x, y, signature) => {
    // Clamp so the menu cannot hang off either edge. The anchor is MENU_W wide
    // with its LEFT edge here, so placePopover's end-alignment (right edge of
    // panel on right edge of anchor) puts the panel's left edge exactly on the
    // pointer — a context menu opening down-and-right, the way every native one
    // does. Doing it this way means placement, edge-flipping and max-height all
    // still come from usePopover rather than a second placement system.
    const vw = typeof window !== 'undefined' ? window.innerWidth : MENU_W + EDGE * 2
    setAt({ x: Math.max(EDGE, Math.min(x, vw - MENU_W - EDGE)), y, signature })
  }, [])

  useEffect(() => {
    if (suppressed) return undefined

    const onContextMenu = (e) => {
      // A keyboard-triggered contextmenu carries no usable pointer position —
      // but see invokedByPointer(): `detail` is 0 for a REAL right-click in
      // Chromium, so `button` is what actually separates the two. The old
      // `detail === 0` test made every mouse click look synthetic and anchored
      // the menu to <body>.
      const fromPointer = invokedByPointer(e)
      const selection = typeof window !== 'undefined' ? window.getSelection?.() : null
      const hasSelection = !!selection && !selection.isCollapsed && !!String(selection).trim()

      const chain = chainFrom(e.target)
      if (nativeMenuWins(chain, {
        hasSelection,
        defaultPrevented: e.defaultPrevented,
        // Shift is the escape hatch for a POINTER right-click only. Shift+F10
        // is itself one of the keyboard ways to open a context menu, so
        // treating its shiftKey as "they want the native menu" would disable
        // the keyboard path entirely — the exact exclusion this feature is
        // supposed to avoid.
        shiftKey: fromPointer && e.shiftKey,
        touchOnly: touchOnlyDevice(),
      })) return

      e.preventDefault()
      openerRef.current = document.activeElement
      const signature = elementSignature(chain)
      if (fromPointer) {
        openAt(e.clientX, e.clientY, signature)
      } else {
        const r = document.activeElement?.getBoundingClientRect?.()
        openAt(r ? r.left : EDGE, r ? r.bottom : EDGE, signature)
      }
    }

    // Explicit fallback for browsers that do not synthesise `contextmenu` from
    // the Menu key / Shift+F10 — the same belt-and-braces PaletteBuilder uses.
    const onKeyDown = (e) => {
      if (e.key !== 'ContextMenu' && !(e.key === 'F10' && e.shiftKey)) return
      const target = document.activeElement
      const chain = chainFrom(target)
      if (nativeMenuWins(chain, { defaultPrevented: e.defaultPrevented, touchOnly: touchOnlyDevice() })) return
      e.preventDefault()
      openerRef.current = target
      const r = target?.getBoundingClientRect?.()
      openAt(r ? r.left : EDGE, r ? r.bottom : EDGE, elementSignature(chain))
    }

    // Bubble phase, not capture: a local menu that calls stopPropagation has
    // genuinely handled the event and we should never see it, and one that only
    // calls preventDefault is caught by the defaultPrevented check above.
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [suppressed, openAt])

  // Close on scroll. The menu is pinned to a viewport point, so once the page
  // moves underneath it, it is pointing at nothing.
  useEffect(() => {
    if (!at) return undefined
    const onScroll = () => setAt(null)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [at])

  if (!at) return null

  const start = (typeId) => {
    const signature = at.signature
    openerRef.current = null
    setAt(null)
    onReport?.({ typeId, element: signature })
  }

  return (
    <div
      ref={triggerRef}
      className="fbx-anchor"
      style={{ left: `${at.x}px`, top: `${at.y}px` }}
      tabIndex={-1}
      data-feedback-surface=""
    >
      {/* Not role="menu". usePopover's panels keep every control in the tab
          order, and claiming menu semantics for that tells assistive tech to
          expect a single-tab-stop widget this is not — see the note in
          usePopover.js. It is a labelled disclosure with arrow-key movement. */}
      <div
        ref={popRef}
        className="pop fbx-menu"
        role="group"
        aria-label="Send feedback about this"
        tabIndex={-1}
      >
        <div className="pop-head">{at.signature || 'This page'}</div>
        <button type="button" className="pop-item" onClick={() => start('bug')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Report a problem here</span>
        </button>
        <button type="button" className="pop-item" onClick={() => start('feedback')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Share feedback on this</span>
        </button>
        <div className="pop-sep" />
        {/* Said here rather than after the form opens, because this is the
            moment someone decides whether to go further. */}
        <p className="fbx-note">You review everything attached before anything is sent.</p>
        <button type="button" className="fbx-dismiss" onClick={dismiss}>
          Cancel — use the browser menu with Shift+right-click
        </button>
      </div>
    </div>
  )
}
