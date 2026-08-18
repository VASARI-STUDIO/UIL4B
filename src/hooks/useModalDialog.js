import { useEffect, useRef } from 'react'

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
    const opener = document.activeElement
    const openerChain = []
    for (let n = opener; n && n !== document.body; n = n.parentElement) openerChain.push(n)
    const node = ref.current
    document.body.style.overflow = 'hidden'

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
      const restore = openerChain.find(el => el.isConnected && typeof el.focus === 'function')
      if (!restore) return
      // A surviving ANCESTOR is usually a container, which is not focusable on
      // its own, so give it tabindex="-1" first.
      //
      // The attribute is deliberately LEFT IN PLACE. Removing it straight after
      // .focus() blurs the element right back to <body> — the browser drops
      // focus the moment the node stops being focusable — which is a silent
      // no-op that looks like a working restore in code review. tabindex="-1"
      // means "reachable by script, never by Tab", so leaving it costs nothing:
      // it does not join the tab order and it does not change layout.
      if (restore.tabIndex < 0 && !restore.hasAttribute('tabindex')) {
        restore.setAttribute('tabindex', '-1')
      }
      restore.focus()
    }
  }, [onClose, enabled, initialFocus])

  return ref
}
