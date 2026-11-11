import { useSyncExternalStore } from 'react'

// WHICH HERO LOOP THE VIEWPORT GETS. One size mounts; the others never do, so
// only the visible loop runs and the page ships one loop's markup. The widths
// and the fixed frame each size draws at are the contract with home-hero.css
// (`.hh-slot[data-size]`), which reserves the same box before the loop module
// arrives so the hero does not move when it does.
//
//   large   1440 and up        1296 x 600
//   wide    1200 to 1439       1136 x 460
//   tablet  768 to 1199        704 x 620   (zoomed in steps by the stylesheet)
//   phone   under 768          358 x 444   (zoomed down on narrow phones)

export const LOOP_SIZES = Object.freeze({
  large: Object.freeze({ width: 1296, height: 600 }),
  wide: Object.freeze({ width: 1136, height: 460 }),
  tablet: Object.freeze({ width: 704, height: 620 }),
  phone: Object.freeze({ width: 358, height: 444 }),
})

// Widest first: the first breakpoint the viewport reaches wins.
const BREAKPOINTS = Object.freeze([
  ['large', 1440],
  ['wide', 1200],
  ['tablet', 768],
])
const query = (min) => `(min-width: ${min}px)`

/** The size for a viewport width in CSS pixels. */
export function loopSizeFor(width) {
  for (const [size, min] of BREAKPOINTS) {
    if (width >= min) return size
  }
  return 'phone'
}

function currentSize() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'wide'
  for (const [size, min] of BREAKPOINTS) {
    if (window.matchMedia(query(min)).matches) return size
  }
  return 'phone'
}

function subscribe(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const lists = BREAKPOINTS.map(([, min]) => window.matchMedia(query(min)))
  lists.forEach((list) => list.addEventListener('change', onChange))
  return () => lists.forEach((list) => list.removeEventListener('change', onChange))
}

/** The loop size for the current viewport, re-read when a breakpoint is crossed. */
export function useLoopSize() {
  return useSyncExternalStore(subscribe, currentSize, () => 'wide')
}
