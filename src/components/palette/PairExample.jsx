// A Contrast Checker pair painted on one of the preview examples (Editorial,
// Product page, Card). The pair is two colours, not a palette, and the picture
// exists to prove the verdict: pairRoles() builds roles that correct nothing, so
// a failing pair looks as bad here as it is.
//
// The legend of this view is "Where each test lands": every piece of the example
// is sorted at runtime into body text, large text or a UI part (data-size), the
// same way the Palette Builder's legend sorts by role (data-role). At rest the
// largest part of each class the pair fails is outlined; choosing a legend chip
// outlines every part of that class.
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { contrastRatio } from '../../utils/colors'
import { pairRoles, pvVars } from '../../utils/palettePreviewRoles'
import { PAIR_VIEWS, UI_PARTS, failingSizes, pickOutlineColour, textSizeClass } from '../../utils/palettePairSizes'
import { prefersReducedMotion } from '../spectrum/reducedMotion'
import { EXAMPLES } from './examples/registry'
import '../../styles/pages/palette-preview.css'

// The names the pair's swatches and labels carry in an example that names its
// five brand slots.
const SLOT_LABELS = ['Text', '70% text', '45% text', '20% text', 'Text']

const ownTextNodes = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim())
const shown = (el) => el.getClientRects().length > 0

// Area of the element's own text lines, not of its box: a full-width block with
// one short line in it is a small piece of text.
function textArea(el, nodes) {
  const range = document.createRange()
  let area = 0
  for (const n of nodes) {
    range.selectNodeContents(n)
    for (const r of range.getClientRects()) area += r.width * r.height
  }
  return area
}

// Works out which pieces of the example are text of which size class, which
// are UI parts, which are outlined by the chosen class and which carry the
// at-rest failure mark; then applies only what differs from the marks already
// on the page, so an outline whose state is unchanged does not restart its
// fade when a resize or a late render runs this again.
//
// With a class chosen, data-hit outlines every part of it and the others dim, so
// no failure marks are added. At rest each failing class marks only its largest
// visible part: a pair that fails body text would otherwise outline every line
// of the picture. "Largest" is by the part's own text, and a row as wide as the
// example itself that is mostly empty (a breadcrumb) only counts when nothing
// else of its class exists; a full-width paragraph is real text and still counts.
function markSizes(root, uiSelector, highlight, failing) {
  const plan = new Map() // element -> { size, hit, fail }
  const area = new Map() // element -> how big it reads
  for (const el of root.querySelectorAll('*')) {
    const own = ownTextNodes(el)
    if (!own.length || !shown(el)) continue
    const cs = getComputedStyle(el)
    const cls = textSizeClass(parseFloat(cs.fontSize), parseInt(cs.fontWeight, 10))
    // A box nested in a box that already carries the same class (a price and its
    // tax note, a label and its value) is covered by the outer outline; its own
    // would draw a second box inside the first.
    let covered = false
    for (let up = el.parentElement; up && up !== root; up = up.parentElement) {
      if (plan.get(up)?.size === cls) { covered = true; break }
    }
    if (covered) continue
    plan.set(el, { size: cls, hit: null, fail: null })
    area.set(el, textArea(el, own))
  }
  if (uiSelector) {
    for (const el of root.querySelectorAll(uiSelector)) {
      if (plan.has(el) || !shown(el)) continue
      plan.set(el, { size: 'ui', hit: null, fail: null })
      const r = el.getBoundingClientRect()
      area.set(el, r.width * r.height)
    }
  }
  // Containers never dim, only leaves.
  const hasPart = new Set()
  for (const el of plan.keys()) {
    for (let up = el.parentElement; up && up !== root; up = up.parentElement) hasPart.add(up)
  }
  for (const [el, p] of plan) {
    if (highlight && p.size === highlight) p.hit = 'on'
    else if (highlight && !hasPart.has(el)) p.hit = 'off'
  }
  if (!highlight) {
    const rootW = root.getBoundingClientRect().width
    for (const cls of failing) {
      let best = null
      let bestArea = 0
      let bestSolid = false
      for (const [el, p] of plan) {
        if (p.size !== cls) continue
        const box = el.getBoundingClientRect()
        const a = area.get(el)
        const solid = !(box.width > rootW * 0.9 && a < box.width * box.height * 0.45)
        if ((solid && !bestSolid) || (solid === bestSolid && a > bestArea)) { best = el; bestArea = a; bestSolid = solid }
      }
      if (best) plan.get(best).fail = 'on'
    }
  }
  const set = (el, key, value) => {
    if (value) { if (el.dataset[key] !== value) el.dataset[key] = value } else if (key in el.dataset) delete el.dataset[key]
  }
  for (const el of root.querySelectorAll('[data-size]')) {
    if (!plan.has(el)) { delete el.dataset.size; delete el.dataset.hit; delete el.dataset.fail }
  }
  for (const [el, p] of plan) {
    set(el, 'size', p.size)
    set(el, 'hit', p.hit)
    set(el, 'fail', p.fail)
  }
}

/**
 * @param {{viewId: 'editorial'|'product'|'card', fg: string, bg: string,
 *   highlight?: string|null, pinned?: string|null}} props fg and bg are
 *   #rrggbb; highlight is a size class to outline; pinned is the class a click
 *   or tap holds, whose first part is brought into view
 */
export default function PairExample({ viewId, fg, bg, highlight = null, pinned = null }) {
  const roles = useMemo(() => pairRoles(fg, bg), [fg, bg])
  const outline = useMemo(() => pickOutlineColour(bg, fg), [bg, fg])
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

  // A pinned class can sit below the fold of a tall example: bring its first
  // visible part into view (instantly under reduced motion), and leave the page
  // where it is when that part is already in sight. Declared after the marking
  // effect so the marks are there.
  useEffect(() => {
    const root = rootRef.current
    if (!pinned || !root) return
    const first = [...root.querySelectorAll('[data-hit="on"]')].find((el) => el.getBoundingClientRect().height > 0)
    first?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [pinned, viewId])

  if (!Body || !view) return null
  return (
    <div
      ref={rootRef}
      className="pvs cc-pv"
      style={{ ...pvVars(roles), '--pv-hit': outline, '--pv-error': outline }}
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
