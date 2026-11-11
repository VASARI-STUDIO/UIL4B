import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../spectrum/reducedMotion'
import { buildLoopModel } from './loopModel'

// THE LOOP ENGINE SHARED BY EVERY SIZE OF THE HERO PANEL.
//
// A size supplies a config; buildLoopModel turns it into the timeline tables
// and useLoop runs them. The panel's JSX reads the returned beat helpers
// (P, at, pressed, ...) to derive what it draws.

export { buildLoopModel }

const initial = (model, reduced) => (reduced
  ? { k: model.settleK, playing: false, done: true, loop: 0, cut: false, say: '' }
  : { k: 0, playing: true, done: false, loop: 0, cut: false, say: '' })

/**
 * @param {ReturnType<typeof buildLoopModel>} model
 * @param {{active:boolean, speed?:number}} opts  active: from useAutoplaySlot('hero', el)
 */
export function useLoop(model, { active, speed = 1 }) {
  const { TL, LAST, IDX, FIRST, END, CHAP_OF, chapters, nextStep, DUR, CH_LEN, CUM } = model
  const [reduced] = useState(() => prefersReducedMotion())
  const [s, setS] = useState(() => initial(model, reduced))
  const [armed, setArmed] = useState(false)
  // [k, ms] left in a beat that was frozen part-way (state, for the progress bar).
  const [kept, setKept] = useState(null)
  const timer = useRef(null)
  const beat = useRef({ k: -1, end: 0 })
  const remain = useRef(null)
  const held = !active

  // One frame at zero progress, so the first chapter's bar fills instead of appearing full.
  useEffect(() => {
    let b = 0
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setArmed(true)) })
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [])

  // Schedule the next beat. Cleanup freezes the beat's remaining time, so
  // Pause, scrolling away and a hidden tab all resume where they stopped.
  useEffect(() => {
    if (!s.playing || s.done || held) return undefined
    const k = s.k
    const ms = beat.current.k === k && remain.current != null ? remain.current : DUR[k] / speed
    remain.current = null
    beat.current = { k, end: Date.now() + ms }
    timer.current = setTimeout(() => {
      timer.current = null
      setS((p) => (p.k < LAST ? { ...p, k: p.k + 1, cut: false } : { ...p, k: 0, loop: p.loop + 1, cut: true }))
    }, ms)
    return () => {
      if (timer.current && beat.current.k === k) remain.current = Math.max(0, beat.current.end - Date.now())
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [s.k, s.playing, s.done, s.loop, held, speed, DUR, LAST])

  // Mirror the frozen time for the progress bar.
  const running = s.playing && !s.done && !held
  useEffect(() => {
    setKept(!running && remain.current != null ? [beat.current.k, remain.current] : null)
  }, [running, s.k])

  const goChapter = useCallback((c) => {
    remain.current = null
    const say = `Chapter ${c + 1} of ${chapters.length}: ${chapters[c].name}`
    if (reduced) setS((p) => ({ ...p, k: END[c], playing: false, done: true, cut: false, say }))
    else setS((p) => ({ ...p, k: FIRST[c], playing: true, done: false, cut: true, loop: p.done ? 0 : p.loop, say }))
  }, [reduced, chapters, END, FIRST])

  // Next: the next chapter or extra step; after the last, scroll the page past the panel.
  const next = useCallback((e, rootSelector = '.lp-root') => {
    remain.current = null
    const n = nextStep(s.k)
    if (n && FIRST.includes(n.k)) { goChapter(CHAP_OF[n.k]); return }
    if (n) { setS((p) => ({ ...p, k: n.k, playing: true, done: false, cut: true, loop: p.done ? 0 : p.loop, say: n.name })); return }
    const panel = e && e.currentTarget && e.currentTarget.closest(rootSelector)
    if (panel) window.scrollBy({ top: panel.getBoundingClientRect().bottom, behavior: reduced ? 'auto' : 'smooth' })
  }, [s.k, nextStep, FIRST, CHAP_OF, goChapter, reduced])

  // Pause holds the beat; Play finishes it with the time it had left; Replay restarts.
  const toggle = useCallback(() => {
    if (s.done) { remain.current = null; setS((p) => ({ ...p, k: 0, playing: true, done: false, loop: 0, cut: true })); return }
    setS((p) => ({ ...p, playing: !p.playing }))
  }, [s.done])

  const { k, playing, done } = s
  const row = TL[k]
  const chap = CHAP_OF[k]
  const rewound = k === LAST
  const left = kept && kept[0] === k ? kept[1] * speed : DUR[k]
  // Progress of chapter i, 0..1, and the linear transition that fills the rest of it.
  const chapterFill = (i) => {
    const cur = i === chap
    const fill = rewound ? 0 : i < chap ? 1 : i > chap ? 0
      : done ? 1 : running ? (CUM[k] + DUR[k]) / CH_LEN[i] : (CUM[k] + DUR[k] - left) / CH_LEN[i]
    return { cur, fill, ms: cur && running && !rewound ? Math.round(left / speed) : 0 }
  }

  return useMemo(() => ({
    ...s,
    reduced, armed, held, running, rewound, chap,
    scene: row[0], beat: row[1], cx: row[3], cy: row[4], press: row[5],
    // The first beat of a chapter and the closing rewind reset state without animating.
    fresh: FIRST.includes(k) || rewound,
    P: (name) => k >= IDX[name],
    at: (...names) => names.includes(row[1]),
    pressed: (name) => row[1] === name && row[5] === 1,
    // Marks the panel root for the CSS that stops carets and shimmer.
    rootProps: held || !playing ? { 'data-held': '' } : {},
    chapterFill, goChapter, next, toggle,
    nextInfo: nextStep(k),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [s, reduced, armed, held, running, kept, goChapter, next, toggle])
}
