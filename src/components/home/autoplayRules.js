// Which autoplay has the screen. Plain module (no React) so the rules are
// testable on their own and the provider in AutoplayOwner.jsx stays thin.
//
// Two autoplays exist on the page: the hero loop (`hero`) and the bookmarks
// tour (`tour`). They never run together. The rules:
//
//   hero  qualifies at HERO_RATIO of its panel visible; on a phone it also
//         qualifies when the visible slice is at least 40% of the panel or of
//         the viewport, whichever is smaller (a panel taller than a short
//         screen can never reach 40% of itself).
//   tour  qualifies at TOUR_RATIO of its stage visible.
//
//   tour plays when it qualifies and the tab is visible.
//   hero plays when it qualifies, the tab is visible and the tour does NOT
//        have the screen. The hero watches the tour with the tour's own rule,
//        so the exclusion holds at any window size rather than by geometry.

export const HERO_RATIO = 0.4
export const TOUR_RATIO = 0.6
export const SLOTS = Object.freeze(['hero', 'tour'])

/**
 * Does one slot's measurement meet its threshold?
 * @param {'hero'|'tour'} name
 * @param {{ratio:number, rectHeight?:number, height?:number, viewportHeight?:number, phone?:boolean}} m
 *   ratio: intersectionRatio; rectHeight: intersectionRect.height;
 *   height: the element's own height; viewportHeight: window.innerHeight.
 */
export function slotQualifies(name, m) {
  const ratio = Number(m.ratio) || 0
  if (name === 'tour') return ratio >= TOUR_RATIO
  if (name !== 'hero') return false
  if (ratio >= HERO_RATIO) return true
  if (!m.phone) return false
  const { rectHeight = 0, height = 0, viewportHeight = 0 } = m
  if (!(height > 0) || !(viewportHeight > 0)) return false
  return rectHeight >= Math.min(HERO_RATIO * height, HERO_RATIO * viewportHeight)
}

/**
 * The arbitration. `hero` and `tour` say whether each slot currently meets its
 * own threshold; the result says which may play.
 * @param {{hero:boolean, tour:boolean, hidden:boolean}} s
 * @returns {{hero:boolean, tour:boolean}}
 */
export function decideAutoplay({ hero, tour, hidden }) {
  if (hidden) return { hero: false, tour: false }
  return { hero: !!hero && !tour, tour: !!tour }
}

/**
 * A tiny external store holding each slot's qualification and the tab state.
 * `getSnapshot()` returns a stable object until something changes, so it is
 * safe for useSyncExternalStore.
 */
export function createAutoplayStore(initialHidden = false) {
  let inView = { hero: false, tour: false }
  let hidden = !!initialHidden
  let snapshot = decideAutoplay({ ...inView, hidden })
  const listeners = new Set()

  const publish = () => {
    const next = decideAutoplay({ ...inView, hidden })
    if (next.hero === snapshot.hero && next.tour === snapshot.tour) return
    snapshot = next
    listeners.forEach((fn) => fn())
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    setInView(name, value) {
      if (!SLOTS.includes(name)) throw new Error(`autoplay: unknown slot "${name}"`)
      if (inView[name] === !!value) return
      inView = { ...inView, [name]: !!value }
      publish()
    },
    setHidden(value) {
      if (hidden === !!value) return
      hidden = !!value
      publish()
    },
  }
}
