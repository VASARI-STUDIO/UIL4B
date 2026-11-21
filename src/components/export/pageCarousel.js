// The page gallery's state, with no React: which page is the main image, whether it advances on its own, and what stops it.
//
// It advances every INTERVAL_MS while `auto` is on, nobody hovers the gallery, the motion setting allows it and there is
// more than one page. A click on a page, a press of an arrow or a Pause turns `auto` off for good (the visitor chose a
// page); Play turns it back on. A hover only holds the timer for as long as the pointer is there.
//
//   let s = createCarousel({ count: 3, reduced: false })
//   s = carouselReducer(s, { type: 'tick' })   // 0 -> 1
//   s = carouselReducer(s, { type: 'select', index: 2 })
//   carouselRunning(s)                          // false: a pick stopped it

export const INTERVAL_MS = 5000
export const WINDOW = 3

const clampIndex = (i, count) => Math.max(0, Math.min(Math.max(0, count - 1), Number.isInteger(i) ? i : 0))

/** Fresh state for `count` pages. Reduced motion starts with auto-advance off, and Play is not offered to turn it on. */
export function createCarousel({ count = 0, reduced = false, auto = true } = {}) {
  return { index: 0, count: Math.max(0, count | 0), auto: Boolean(auto), hover: false, reduced: Boolean(reduced) }
}

/** True while the timer should be running. */
export const carouselRunning = (s) => s.auto && !s.hover && !s.reduced && s.count > 1

/** Whether Play and Pause are worth showing: not for one page, and not when motion is reduced. */
export const carouselCanPlay = (s) => s.count > 1 && !s.reduced

/**
 * Events: tick | select (index) | step (delta: -1 or 1) | hover (on) | toggle | reduced (on) | count (n) | reset (count).
 * reset starts another set of pages: the first page, advancing again. tick wraps from the last page to the first; step stops at the ends (the arrow beside it is disabled there).
 */
export function carouselReducer(s, e) {
  switch (e.type) {
    case 'tick':
      return carouselRunning(s) ? { ...s, index: (s.index + 1) % s.count } : s
    case 'select':
      return { ...s, index: clampIndex(e.index, s.count), auto: false }
    case 'step':
      return { ...s, index: clampIndex(s.index + (e.delta < 0 ? -1 : 1), s.count), auto: false }
    case 'hover':
      return s.hover === Boolean(e.on) ? s : { ...s, hover: Boolean(e.on) }
    case 'toggle':
      return s.reduced ? s : { ...s, auto: !s.auto }
    case 'reduced':
      return { ...s, reduced: Boolean(e.on) }
    case 'reset':
      return createCarousel({ count: e.count ?? s.count, reduced: s.reduced })
    case 'count': {
      const count = Math.max(0, e.count | 0)
      return { ...s, count, index: clampIndex(s.index, count) }
    }
    default:
      return s
  }
}

/** The first of the `size` thumbnails shown, so the chosen page is always among them. */
export function windowStart(index, count, size = WINDOW) {
  const last = Math.max(0, count - size)
  return Math.max(0, Math.min(last, index - Math.floor(size / 2)))
}

/** The pages the window shows: [start, start + size) within the count. */
export function windowIndexes(index, count, size = WINDOW) {
  const start = windowStart(index, count, size)
  const out = []
  for (let i = start; i < Math.min(count, start + size); i += 1) out.push(i)
  return out
}
