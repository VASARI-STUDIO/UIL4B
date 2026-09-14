import { useEffect, useRef } from 'react'
import OfflineBanner from './OfflineBanner'
import SyncNotice from './SyncNotice'

// THE ONE SLOT THE APP-WIDE CONDITION NOTICES LIVE IN, AND THE THING THAT
// RESERVES ROOM FOR IT.
//
// Both notices used to be their own fixed card at the same coordinate under
// the nav. That coordinate is where every sticky toolbar on the site parks
// itself — .plb-toolbar, .uis-command, .lbry-toolbar, .pgl-section-head all
// derive from the nav height — so a notice covered the toolbar of whatever
// tool was open. The founder reported it on the Palette Builder on 2026-09-14
// and decided the notices move into the page flow.
//
// A notice cannot be a plain flow element here: the nav is position:fixed and
// every page starts its own content below it with --nav-clear, so an element
// at the top of the document would render behind the nav. What it can do is
// take up room. This strip is fixed directly under the nav, and its measured
// height is published as --notice-h, which --chrome-h folds into every "just
// below the nav" offset in global.css. The toolbar parks under the strip; the
// hero pads past it; nothing is covered.
//
// WHY A ResizeObserver RATHER THAN A CONSTANT. The height is not knowable from
// here: the offline sentence wraps to three lines at 320px and one at 1440,
// the sync message is server text of unknown length, and at ≤520 the actions
// wrap onto a second row. A hard-coded height was how the FIRST attempt at
// stacking these was done — see the :has() note in global.css — and it is the
// reason that attempt was abandoned.
//
// The strip is display:none while empty (`.notice-stack:empty`), so with no
// notice showing this writes 0px and every folded offset resolves to exactly
// the value it had before this file existed.
export default function NoticeStack() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    const root = document.documentElement
    // Written on the root element, not on a parent: --chrome-h is declared on
    // :root and a custom property is resolved where it is USED, so a value set
    // anywhere lower would never reach .plb-toolbar in another subtree.
    const clear = () => root.style.removeProperty('--notice-h')
    if (!el) return clear

    const publish = () => {
      const h = el.offsetHeight
      if (h > 0) root.style.setProperty('--notice-h', `${h}px`)
      else clear()
    }
    publish()

    // No ResizeObserver (an old browser, a test harness): the height is still
    // published on every mount and on resize, which covers the two changes
    // that matter — a notice appearing, and the sentence rewrapping.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', publish)
      return () => { window.removeEventListener('resize', publish); clear() }
    }
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => { ro.disconnect(); clear() }
  }, [])

  return (
    <div className="notice-stack" ref={ref}>
      <OfflineBanner />
      <SyncNotice />
    </div>
  )
}
