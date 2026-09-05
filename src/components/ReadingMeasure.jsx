// The type article's measurement of its own column.
//
// The line-length section states a target in characters and a cap set in `ch`,
// and those two are not the same thing — `ch` is the advance measure of the
// glyph "0", which in most proportional faces is wider than the average letter,
// so a cap of 56ch buys rather more than 56 characters. Rather than assert the
// gap, this measures it on the paragraph the reader is looking at.
//
// ── Why the node arrives through a ref callback into state ────────────────
//
// The component renders INSIDE .lart-prose, so on the first render pass the
// paragraph it wants to measure is not in the document yet. Measuring during
// that render returned null and, with nothing to re-trigger it, the table never
// appeared on a cold load — intermittently, which is the worst version. A ref
// callback runs after the node is attached, which is the earliest honest moment
// to measure; it puts the node in STATE rather than a ref, because a ref read
// during render is a lint error and, more to the point, would not re-render
// when it changed.
//
// Resize is a separate signal: useSyncExternalStore on the viewport width,
// whose snapshot is an integer (stable between renders), which re-runs the
// measurement whenever the window changes — which is exactly when the numbers
// change and when someone is most likely to be watching.

import { useCallback, useState, useSyncExternalStore } from 'react'

function subscribe(onChange) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('resize', onChange, { passive: true })
  return () => window.removeEventListener('resize', onChange)
}

const getSnapshot = () => (typeof window === 'undefined' ? 0 : Math.round(window.innerWidth))
const getServerSnapshot = () => 0

/** Measure the reading column that contains `node`. */
function measure(node) {
  const prose = node?.closest('.lart-prose')
  if (!prose) return null
  // The longest paragraph in the article, so the count is not distorted by a
  // two-line one that happens to end early. Asides are excluded — they are set
  // at a different size.
  const paras = [...prose.querySelectorAll('p')].filter((p) => !p.classList.contains('lart-aside'))
  const p = paras.sort((a, b) => b.textContent.length - a.textContent.length)[0]
  if (!p) return null

  const probe = document.createElement('span')
  probe.textContent = '0'.repeat(100)
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'
  p.appendChild(probe)
  const ch = probe.getBoundingClientRect().width / 100
  probe.remove()

  // Lines are counted from the paragraph's HEIGHT, not from its client rects.
  //
  // getClientRects() returns one rect per inline box, so a paragraph carrying
  // four <code> chips returns a dozen rects for four lines. Counting them gave
  // 26 characters per line on a column that holds about 60. Collapsing them by
  // rounded top edge was not enough either — a padded inline chip sits a pixel
  // or two off its own line's baseline box, so the fragments did not merge and
  // the answer moved to 32. Height over line-height has neither problem:
  // inline padding does not change the height of a line box, so a block of text
  // is exactly its line count times its line height.
  const cs = getComputedStyle(p)
  const lineHeight = parseFloat(cs.lineHeight)
  const box = p.getBoundingClientRect()
  const lines = Number.isFinite(lineHeight) && lineHeight > 0
    ? Math.max(1, Math.round(box.height / lineHeight))
    : 0
  const chars = p.textContent.trim().length
  const width = box.width
  const size = parseFloat(cs.fontSize)
  if (!lines || !ch || !width) return null

  return {
    ch: ch.toFixed(2),
    size: size.toFixed(1),
    width: Math.round(width),
    charsPerLine: Math.round(chars / lines),
    chCap: Math.round(width / ch),
  }
}

export default function ReadingMeasure() {
  // The attached node is STATE, not a ref: a ref read during render is both a
  // lint error and a real hazard (nothing re-renders when it changes), and the
  // node is genuinely needed for rendering here.
  const [node, setNode] = useState(null)
  // Re-render on resize; the width itself is only a change signal.
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const mount = useCallback((el) => setNode(el), [])

  const m = node ? measure(node) : null

  return (
    <figure className="lart-table-wrap" ref={mount}>
      {m && (
        <>
          <div className="lart-table-scroll" tabIndex={0} role="group" aria-label="Measurements of this article's own reading column">
            <table className="lart-table">
              <tbody>
                <tr><th scope="row">Body size</th><td data-num="true">{m.size}px</td></tr>
                <tr><th scope="row">One <code>ch</code> in this face</th><td data-num="true">{m.ch}px</td></tr>
                <tr><th scope="row">Column width</th><td data-num="true">{m.width}px ({m.chCap}ch)</td></tr>
                <tr><th scope="row">Characters per line</th><td data-num="true">{m.charsPerLine}</td></tr>
              </tbody>
            </table>
          </div>
          <figcaption className="lart-table-cap">
            Measured on the longest paragraph in this article, in this window, at this moment.
            Resize the window and the last two rows change. The gap between the column&rsquo;s
            width in <code>ch</code> and the characters it actually holds is what the
            paragraph above is about.
          </figcaption>
        </>
      )}
    </figure>
  )
}
