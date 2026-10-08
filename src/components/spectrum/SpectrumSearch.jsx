import { useEffect, useRef, useState } from 'react'
import HomeCommandBar from '../HomeCommandBar'
import { useAppearance } from '../../contexts/AppearanceContext'

// THE HERO SEARCH, IN THE DESIGN'S PILL — HomeCommandBar wrapped, not forked.
//
// HomeCommandBar keeps everything it does: the tool index, the ⌘K key, the
// keyboard walk through results, the live count. This wrapper only changes the
// look (spectrum.css, `.sp-search …`) and adds the design's ghost line — "Search
// for" and an accent phrase from the design's six. The bar's own placeholder is
// still there for assistive tech and is painted transparent; the ghost is
// aria-hidden, so the field's name never changes while the phrase does.
//
// The phrase TYPES ITSELF: it holds with a blinking caret, backspaces, and
// types the next one. One pass through the six, then the first phrase is typed
// back in and stays. The ghost is absolutely positioned inside the bar, so the
// changing text never moves anything around it.
//
// It STOPS, once and for good, when the visitor takes the bar or the field
// holds a value — a one-way stop, so blurring never restarts it (WCAG 2.2.2) —
// and never starts under reduced motion, where the first phrase simply stays.
const ROTATIONS = ['a contrast ratio', 'a tint and shade ramp', 'an OKLCH gradient', 'a type scale', 'an icon set', 'a WebP export']

// Per character typed and erased, the caret blink while a phrase is held, and
// the wait for the hero's entrance to land before the first erase.
const TYPE_MS = 55
const ERASE_MS = 28
const BLINK_MS = 420
const HOLD_BLINKS = 3
const START_MS = 1200

export default function SpectrumSearch({ labelledBy }) {
  const { reducedMotion } = useAppearance()
  const rootRef = useRef(null)
  // null is the resting phrase with no caret. A string is the animation's frame.
  const [typed, setTyped] = useState(null)
  const [caret, setCaret] = useState(false)
  // One-way: set when the pass ends, the bar is taken, or it holds a value.
  const [stopped, setStopped] = useState(false)

  const running = !reducedMotion && !stopped

  // Every setState runs inside a timer callback; the reset is in the cleanup.
  useEffect(() => {
    if (!running) return undefined
    let cancelled = false
    let timer
    // The pass: the resting phrase is already on screen, so it is held and
    // erased first, then each of the others, then the first is typed back.
    const order = [...ROTATIONS.keys(), 0]
    let step = 0
    const word = () => ROTATIONS[order[step]]
    const hasValue = () => !!rootRef.current?.querySelector('input')?.value

    const finish = () => { setTyped(null); setCaret(false); setStopped(true) }

    const type = (i) => {
      if (cancelled) return
      if (hasValue()) { finish(); return }
      setTyped(word().slice(0, i))
      setCaret(true)
      if (i < word().length) timer = setTimeout(() => type(i + 1), TYPE_MS)
      else if (step === order.length - 1) finish()
      else timer = setTimeout(() => blink(1), BLINK_MS)
    }

    const blink = (n) => {
      if (cancelled) return
      if (hasValue()) { finish(); return }
      setTyped(word())
      setCaret(n % 2 === 0)
      if (n < HOLD_BLINKS * 2) timer = setTimeout(() => blink(n + 1), BLINK_MS)
      else timer = setTimeout(() => erase(word().length - 1), ERASE_MS)
    }

    const erase = (i) => {
      if (cancelled) return
      if (hasValue()) { finish(); return }
      setTyped(word().slice(0, i))
      setCaret(true)
      if (i > 0) timer = setTimeout(() => erase(i - 1), ERASE_MS)
      else {
        step += 1
        timer = setTimeout(() => type(1), TYPE_MS)
      }
    }

    timer = setTimeout(() => blink(0), START_MS)
    return () => { cancelled = true; clearTimeout(timer); setTyped(null); setCaret(false) }
  }, [running])

  const shown = typed ?? ROTATIONS[0]

  return (
    <div className="sp-search" ref={rootRef} onFocus={() => setStopped(true)}>
      <HomeCommandBar labelledBy={labelledBy} demo={false} demoRunning={running} />
      <span className="sp-search-ghost" aria-hidden="true" data-typing={running || undefined}>
        Search for<span className="sp-search-rot" data-caret={caret || undefined}>{shown}</span>
      </span>
    </div>
  )
}
