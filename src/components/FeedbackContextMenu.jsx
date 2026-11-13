import { useCallback, useEffect, useMemo, useState } from 'react'
import useMediaQuery from '../hooks/useMediaQuery'
import Menu from './menu/Menu'
import { keyboardPoint } from './menu/menuModel'
import { chainFrom, elementSignature, invokedByPointer, nativeMenuWins } from '../utils/elementSignature'
import { plainTargetLabel } from '../utils/menuTargetLabel'

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

// Where a keyboard-opened menu goes when the focused element has no box.
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

const BugIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const FeedbackIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

export default function FeedbackContextMenu({ onReport, suppressed = false }) {
  // { x, y, signature, label, opener, viaKeyboard }. It stays set after a close
  // so the menu keeps its content while it plays its exit.
  const [at, setAt] = useState(null)
  const [open, setOpen] = useState(false)
  const phone = useMediaQuery('(max-width: 767px)')

  // Where focus was when the gesture happened: Escape and a chosen row hand
  // focus back there, so a keyboard user is never dropped on <body> (measured
  // 2026-09-10: Escape left focus on BODY). A click outside leaves focus to
  // whatever was clicked.
  const dismiss = useCallback(() => setOpen(false), [])

  const openAt = useCallback((point, signature, label, opener, viaKeyboard) => {
    const back = opener && opener !== document.body ? opener : null
    setAt({ point, signature, label, opener: back, viaKeyboard })
    setOpen(true)
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
      const opener = document.activeElement
      const signature = elementSignature(chain)
      const label = plainTargetLabel(e.target)
      if (fromPointer) {
        openAt({ x: e.clientX, y: e.clientY }, signature, label, opener, false)
      } else {
        openAt(opener?.getBoundingClientRect ? keyboardPoint(opener) : { x: EDGE, y: EDGE }, signature, label, opener, true)
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
      openAt(target?.getBoundingClientRect ? keyboardPoint(target) : { x: EDGE, y: EDGE }, elementSignature(chain), plainTargetLabel(target), target, true)
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

  // The head names what was clicked. The two rows hand a seed to the one
  // feedback modal and stop there. The note is said here rather than after the
  // form opens, because this is the moment someone decides whether to go further.
  // The last row keeps the live wording (the revised Shift+right-click line is
  // not cleared); on a phone the sheet's own Cancel block takes its place.
  const items = useMemo(() => {
    const start = (typeId) => () => {
      const signature = at?.signature
      onReport?.({ typeId, element: signature })
    }
    const rows = [
      { id: 'bug', label: 'Report a problem here', icon: BugIcon, onSelect: start('bug') },
      { id: 'feedback', label: 'Share feedback on this', icon: FeedbackIcon, onSelect: start('feedback') },
      'sep',
      { type: 'note', text: 'You review everything attached before anything is sent.' },
    ]
    if (!phone) rows.push({ id: 'cancel', label: 'Cancel — use the browser menu with Shift+right-click', compact: true, attrs: { 'data-fbx-cancel': '' }, onSelect: () => {} })
    return rows
  }, [at, onReport, phone])

  if (!at) return null

  return (
    <Menu
      open={open}
      onClose={dismiss}
      point={at.point}
      returnTo={at.opener}
      viaKeyboard={at.viaKeyboard}
      label="Send feedback about this"
      head={{ title: at.label || 'This page' }}
      items={items}
      className="fbx-menu"
      attrs={{ 'data-feedback-surface': '' }}
    />
  )
}
