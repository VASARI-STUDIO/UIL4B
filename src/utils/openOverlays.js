// Positioned popovers and mounted menu/dialog surfaces share these hooks.
// The guide's own dialogs must never count as an obstruction to themselves.
// `.plb-sx` is the Suggest/Explore panel: docked, it is a complementary region
// rather than a dialog, but it still fills the corner the card sits in.
export const OPEN_OVERLAY_SELECTOR = '[data-pop-side], [role="dialog"], [role="menu"], [role="listbox"], .pnav-menu, .plb-sx'

export function hasOpenOverlays(root) {
  return Array.from(root.querySelectorAll(OPEN_OVERLAY_SELECTOR)).some(panel =>
    !panel.closest('.bkit-card, [hidden], [aria-hidden="true"]'),
  )
}

export function observeOpenOverlays(root, onChange, Observer = MutationObserver) {
  let previous
  const update = () => {
    const open = hasOpenOverlays(root)
    if (open === previous) return
    previous = open
    onChange(open)
  }
  const observer = new Observer(update)
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'role', 'hidden', 'aria-hidden', 'data-pop-side'],
  })
  update()
  return () => observer.disconnect()
}

export function suspendGuideForOverlays(document, cards, Observer = MutationObserver) {
  let suspendedFocus = null
  return observeOpenOverlays(document.body, open => {
    if (open && cards.some(card => card.contains(document.activeElement))) {
      suspendedFocus = document.activeElement
      suspendedFocus.blur()
    }
    for (const card of cards) {
      if (open || card.dataset.overlayHidden) card.dataset.overlayHidden = String(open)
      card.inert = open
      if (open) card.setAttribute('aria-hidden', 'true')
      else card.removeAttribute('aria-hidden')
    }
    if (!open && suspendedFocus) {
      if (suspendedFocus.isConnected && document.activeElement === document.body) {
        suspendedFocus.focus({ preventScroll: true })
      }
      suspendedFocus = null
    }
  }, Observer)
}
