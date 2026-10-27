// A Contrast Checker pair painted on one of the preview examples (Editorial,
// Product page, Card). The pair is two colours, not a palette, and the picture
// exists to prove the verdict: pairRoles() builds roles that correct nothing, so
// a failing pair looks as bad here as it is.
//
// The legend of this view is "Where each test lands": every piece of the example
// is sorted at runtime into body text, large text or a UI part (data-size), the
// same way the Palette Builder's legend sorts by role (data-role). A class the
// pair fails is outlined by default; hovering a legend chip outlines its parts.
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { contrastRatio } from '../../utils/colors'
import { pairRoles, pvVars } from '../../utils/palettePreviewRoles'
import { PAIR_VIEWS, UI_PARTS, failingSizes, textSizeClass } from '../../utils/palettePairSizes'
import { EXAMPLES } from './examples/registry'
import '../../styles/pages/palette-preview.css'

// The names the pair's swatches and labels carry in an example that names its
// five brand slots.
const SLOT_LABELS = ['Text', '70% text', '45% text', '20% text', 'Text']

const ownText = (el) => {
  for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true
  return false
}
const shown = (el) => el.getClientRects().length > 0

// Tags every visible piece of the example with data-size, then sets data-hit on
// the chosen class and data-fail on each failing one. Idempotent: it clears its
// own marks first, so it can run again after a resize or a late render.
function markSizes(root, uiSelector, highlight, failing) {
  for (const el of root.querySelectorAll('[data-size]')) {
    delete el.dataset.size
    delete el.dataset.hit
    delete el.dataset.fail
  }
  const tagged = []
  for (const el of root.querySelectorAll('*')) {
    if (!ownText(el) || !shown(el)) continue
    const cs = getComputedStyle(el)
    el.dataset.size = textSizeClass(parseFloat(cs.fontSize), parseInt(cs.fontWeight, 10))
    tagged.push(el)
  }
  if (uiSelector) {
    for (const el of root.querySelectorAll(uiSelector)) {
      if (el.dataset.size || !shown(el)) continue
      el.dataset.size = 'ui'
      tagged.push(el)
    }
  }
  for (const el of tagged) {
    const cls = el.dataset.size
    if (highlight && cls === highlight) el.dataset.hit = 'on'
    else if (highlight && !el.querySelector('[data-size]')) el.dataset.hit = 'off'
    if (failing.includes(cls)) el.dataset.fail = 'on'
  }
}

/**
 * @param {{viewId: 'editorial'|'product'|'card', fg: string, bg: string,
 *   highlight?: string|null}} props fg and bg are #rrggbb; highlight is a size
 *   class to outline
 */
export default function PairExample({ viewId, fg, bg, highlight = null }) {
  const roles = useMemo(() => pairRoles(fg, bg), [fg, bg])
  const view = PAIR_VIEWS.find((v) => v.id === viewId)
  const Body = EXAMPLES[viewId]
  const rootRef = useRef(null)
  const failKey = failingSizes(contrastRatio(fg, bg)).join(',')

  // Re-marked when the pair or the chosen class changes, when the example
  // finishes loading (its nodes arrive after this effect) and when the width
  // changes (a container query can move a piece across a size boundary).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const failing = failKey ? failKey.split(',') : []
    let frame = 0
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => markSizes(root, UI_PARTS[viewId], highlight, failing))
    }
    markSizes(root, UI_PARTS[viewId], highlight, failing)
    const mo = new MutationObserver(run)
    mo.observe(root, { childList: true, subtree: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(run)
    ro?.observe(root)
    return () => { cancelAnimationFrame(frame); mo.disconnect(); ro?.disconnect() }
  }, [viewId, failKey, highlight, roles])

  if (!Body || !view) return null
  return (
    <div
      ref={rootRef}
      className="pvs cc-pv"
      style={pvVars(roles)}
      data-scene={viewId}
      data-mode={roles.mode}
      data-pair="true"
      role="img"
      aria-label={`${view.name} example painted in your text and background colours`}
    >
      <Suspense fallback={<div className="cc-pv-wait" aria-hidden="true" />}>
        <Body roles={roles} labels={SLOT_LABELS} />
      </Suspense>
    </div>
  )
}
