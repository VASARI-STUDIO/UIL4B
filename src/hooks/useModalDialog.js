import { useEffect, useRef } from 'react'
import { getLenis } from './useSmoothScroll.js'
import { markScrollContainers } from '../utils/scrollContainment.js'

// The keyboard contract every modal surface in the app owes its user: a focus
// trap, Escape to close, the background scroll locked while it is open, and
// focus returned to whatever opened it.
//
// Lifted verbatim out of FontGallery, which had the only correct implementation
// of it. Attach the returned ref to the dialog element — the one carrying
// role="dialog" aria-modal="true" and tabIndex={-1}.
//
// Focus lands on the DIALOG, not on its first control: a screen reader then
// announces the dialog's label before its contents, and the close button is one
// Tab away rather than already selected.

// `enabled` exists because several modals stay mounted and toggle on an `open`
// prop rather than unmounting. Hooks cannot be called conditionally, so the
// condition has to live inside the effect — without this the scroll lock would
// apply to a closed dialog and never come off.
// `initialFocus` is a CSS selector for the control that should take focus
// instead of the dialog itself. Default off, because focusing the dialog is
// what lets a screen reader announce its label before its contents. Reach for
// it only where the dialog's whole purpose is one field — the shade editor
// opens onto a hue input, and landing anywhere else would cost a keyboard user
// a tab every time they opened it.
export default function useModalDialog(onClose, { enabled = true, initialFocus = null } = {}) {
  const ref = useRef(null)
  // The restore this hook still owes from its last cleanup — see the end of
  // the effect. Held on a ref so an effect re-run can take it over.
  const pendingRestore = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined
    // The control that opened us — plus its ancestors.
    //
    // A dialog is very often raised from a menu that then unmounts behind it:
    // the Pro modal's most common opener is a row inside PaletteBuilder's
    // colour-system menu, and that whole menu is gone by the time the modal
    // closes. .focus() on a detached node does nothing and reports nothing, so
    // the restore silently dropped the user on <body> — exactly the failure
    // this hook exists to prevent, hidden behind code that looks correct.
    //
    // Remembering the chain costs a handful of nodes and lets us hand focus to
    // the nearest thing that still exists.
    let openerChain
    if (pendingRestore.current) {
      // The effect re-ran before the previous cleanup's frame fired — a caller
      // handed us a fresh onClose, say. activeElement is still inside THIS
      // dialog, so capturing it now would record the dialog as its own
      // opener. Take over the chain that cleanup was about to restore to, and
      // cancel its frame so it cannot fire under a dialog that is still open.
      cancelAnimationFrame(pendingRestore.current.frame)
      openerChain = pendingRestore.current.chain
      pendingRestore.current = null
    } else {
      const opener = document.activeElement
      openerChain = []
      for (let n = opener; n && n !== document.body; n = n.parentElement) openerChain.push(n)
    }
    const node = ref.current

    // THE SCROLL LOCK, and why one line of it was decoration.
    //
    // `document.body.style.overflow = 'hidden'` is the whole lock this hook used
    // to apply, and it does not hold. Measured 2026-09-03 in the production
    // build: with the lock applied, one real wheel gesture over the page moved
    // it from 0 to 600, and `window.scrollTo(0, 600)` moved it too. Lenis does
    // not use the browser's scrolling mechanism — it cancels the wheel event and
    // scrolls the document programmatically — and `overflow: hidden` only
    // withdraws the mechanism, it does not make a box unscrollable. So the lock
    // was aimed at the one layer that was never doing the scrolling.
    //
    // Stopping Lenis is what actually holds: a stopped instance swallows the
    // wheel instead of acting on it, so the page behind the dialog cannot move
    // at all. ExportPanel and IconLibrary had both worked this out and written
    // it by hand; it belongs here, where every dialog gets it.
    //
    // The body lock STAYS, and is not redundant: with reduced motion on, Lenis
    // is never instantiated, `getLenis()` returns null and the browser is doing
    // the scrolling again — which is exactly the case the body lock does hold.
    // The two cover each other's gap.
    //
    // Marking the dialog and its scroll containers `data-lenis-prevent` is what
    // keeps the dialog's OWN content scrollable while Lenis is stopped: Lenis
    // checks for that attribute before it checks whether it is stopped, so the
    // gesture reaches the browser and the dialog scrolls natively. Without it a
    // stopped Lenis would freeze the dialog's body along with the page — the bug
    // wearing its opposite coat.
    document.body.style.overflow = 'hidden'
    getLenis()?.stop()
    const unmark = markScrollContainers(node)

    const focusables = () => Array.from(
      node?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [],
    ).filter(el => el.offsetParent !== null || el === document.activeElement)

    const target = initialFocus ? node?.querySelector(initialFocus) : null
    ;(target || node)?.focus()

    const onKey = (e) => {
      // stopPropagation so a dialog opened from inside another surface closes
      // only itself rather than collapsing the whole stack.
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) { e.preventDefault(); node?.focus(); return }
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = ''
      getLenis()?.start()
      unmark()
      // THE RESTORE WAITS ONE FRAME. It used to run right here, synchronously,
      // and the flow audit (#436) caught what that does, with a trace:
      //
      //   keydown@input → keypress@button[New Project] → click
      //
      // Enter in the dialog's name field closed it; this cleanup put focus on
      // the opener in the SAME tick; the same key's keypress then arrived at
      // the opener — a button, so it clicked — and the dialog reopened over the
      // project it had just created. Projects.jsx cancelled that one keydown
      // locally. The defect belongs to every dialog this hook serves (any
      // control that closes on Enter, restored onto any opener that clicks on
      // Enter), so the fix lives here: hand focus back after the browser has
      // finished dispatching whatever key closed us. LoginPromptContext defers
      // by a frame for exactly this reason.
      //
      // Focus that moved somewhere live in the meantime is left alone. A
      // dialog that opens another in the same event has already claimed it,
      // and taking it back would be this hook fighting itself.
      const chain = openerChain
      const frame = requestAnimationFrame(() => {
        pendingRestore.current = null
        const active = document.activeElement
        if (active && active !== document.body && active.isConnected
          && active !== node && !node?.contains(active)) return
        const restore = chain.find(el => el.isConnected && typeof el.focus === 'function')
        if (!restore) return
        // A surviving ANCESTOR is usually a container, which is not focusable
        // on its own, so give it tabindex="-1" first.
        //
        // The attribute is deliberately LEFT IN PLACE. Removing it straight
        // after .focus() blurs the element right back to <body> — the browser
        // drops focus the moment the node stops being focusable — which is a
        // silent no-op that looks like a working restore in code review.
        // tabindex="-1" means "reachable by script, never by Tab", so leaving
        // it costs nothing: it does not join the tab order and it does not
        // change layout.
        if (restore.tabIndex < 0 && !restore.hasAttribute('tabindex')) {
          restore.setAttribute('tabindex', '-1')
        }
        restore.focus()
      })
      pendingRestore.current = { frame, chain }
    }
  }, [onClose, enabled, initialFocus])

  return ref
}
