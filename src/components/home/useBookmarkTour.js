import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../spectrum/reducedMotion.js'
import { useAutoplaySlot } from './useAutoplaySlot.js'
import { FOLDERS, INTENT_MS, RESUME_MS } from './bookmarksData.js'

// THE FOLDER TOUR OF THE BOOKMARKS SECTION.
//
// One folder is open at a time. While the tour runs, the active folder's run
// bar fills over STEP_MS (a CSS animation) and its `animationend` opens the next
// folder, so the bar is the clock. Whether the tour may run at all is decided by
// the page's one autoplay owner (`useAutoplaySlot('tour', stageEl)`); this hook
// watches nothing itself.
//
//   mode    'run'      the tour advances
//           'stopped'  a folder was clicked, or Pause was pressed: it holds
//           'off'      reduced motion: folder 1 stays open, nothing moves, no
//                      pause button (folders still open when picked)
//
// Holds pause the fill in place and let it carry on from there:
//   - a finger down on the section, until RESUME_MS after it lifts
//   - keyboard focus (focus-visible) in the section, until RESUME_MS after it leaves
// A mouse or pen over the section never pauses the tour. Hover opens a folder
// after INTENT_MS, and so does focus. A click stops the tour.

const FINE = '(hover: hover) and (pointer: fine)'
const finePointer = (e) =>
  (e.pointerType === 'mouse' || e.pointerType === 'pen') &&
  typeof window !== 'undefined' && window.matchMedia(FINE).matches

/** Reduced motion, read on mount and kept in step with the app setting and the system. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const sync = () => setReduced(prefersReducedMotion())
    sync()
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (mq && mq.addEventListener) mq.addEventListener('change', sync)
    const attr = new MutationObserver(sync)
    attr.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduced-motion'] })
    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener('change', sync)
      attr.disconnect()
    }
  }, [])
  return reduced
}

/**
 * @param {Element|null|Array<Element|null>} stageEl  what decides the tour: the desktop stage, or on a phone
 *   the stage or the pane, whichever shows (state, not a ref; keep a list stable)
 * @param {(tool: number) => number} groupOf  the folder a tool belongs to
 * @param {(tool: number) => number[]} rowsOf  the rows in that folder that a tool replaces
 */
export function useBookmarkTour(stageEl, groupOf, rowsOf) {
  const playing = useAutoplaySlot('tour', stageEl)
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(0)
  const [seen, setSeen] = useState(false)
  const [chosen, setChosen] = useState('run')
  const [hot, setHotState] = useState(null)
  const [touchHold, setTouchHold] = useState(false)
  const [focusHold, setFocusHold] = useState(false)
  const timers = useRef({ intent: 0, touch: 0, focus: 0 })
  const mode = reduced ? 'off' : chosen

  useEffect(() => {
    const t = timers.current
    return () => {
      clearTimeout(t.intent)
      clearTimeout(t.touch)
      clearTimeout(t.focus)
    }
  }, [])

  const pick = useCallback((i) => {
    clearTimeout(timers.current.intent)
    setOpen((cur) => {
      if (cur !== i) setSeen(true)
      return i
    })
  }, [])

  // Hover map: a bookmark row lights its tool and its line, a tool lights its rows.
  const setHot = useCallback((tool, rows, src) => {
    setHotState((cur) => {
      if (tool == null) return cur && (!src || cur.src === src) ? null : cur
      if (cur && cur.j === tool && cur.src === src && cur.ks.join() === rows.join()) return cur
      return { j: tool, ks: rows, src }
    })
  }, [])

  const holdTouch = useCallback((on) => {
    clearTimeout(timers.current.touch)
    if (on) setTouchHold(true)
    else timers.current.touch = setTimeout(() => setTouchHold(false), RESUME_MS)
  }, [])

  const stop = () => setChosen((m) => (m === 'run' ? 'stopped' : m))

  // Phone: tapping a pair of bookmarks lights its tool and card, and takes the
  // tour over. A second tap puts the light out, and so does a change of folder.
  const togglePair = (tool) => {
    stop()
    setHotState((cur) => (cur && cur.j === tool && cur.src === 'tap' && cur.at === open ? null : { j: tool, ks: rowsOf(tool), src: 'tap', at: open }))
  }
  // A tapped light belongs to the folder it was tapped in.
  const lit = hot && hot.src === 'tap' && hot.at !== open ? null : hot

  const section = {
    // A finger down holds the tour (a scroll starts as a touch) and lets go a second after it lifts.
    onPointerDown: (e) => { if (e.pointerType === 'touch' && mode !== 'off') holdTouch(true) },
    onPointerUp: (e) => { if (e.pointerType === 'touch' && mode !== 'off') holdTouch(false) },
    onPointerCancel: (e) => { if (e.pointerType === 'touch' && mode !== 'off') holdTouch(false) },
    onFocus: (e) => {
      const t = e.target
      if (mode !== 'off' && t.matches && t.matches(':focus-visible')) {
        clearTimeout(timers.current.focus)
        setFocusHold(true)
      }
      const tool = t.closest ? t.closest('[data-tool]') : null
      if (tool) {
        const j = Number(tool.dataset.tool)
        if (groupOf(j) !== open) pick(groupOf(j))
        setHot(j, rowsOf(j), 'focus')
      }
    },
    onBlur: (e) => {
      setHot(null, null, 'focus')
      if (mode === 'off') return
      if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return
      clearTimeout(timers.current.focus)
      timers.current.focus = setTimeout(() => setFocusHold(false), RESUME_MS)
    },
  }

  // Pointing at a bookmark or a tool lights its pair; leaving the stage clears it.
  const stage = {
    onPointerLeave: () => setHot(null, null, 'ptr'),
    onPointerOver: (e) => {
      if (!finePointer(e)) return
      const target = e.target
      if (!target || !target.closest) return
      const mark = target.closest('[data-mark]')
      if (mark) {
        setHot(Number(mark.dataset.j), [Number(mark.dataset.k)], 'ptr')
        return
      }
      const owner = target.closest('[data-card],[data-tool]')
      const j = owner ? Number(owner.dataset.card ?? owner.dataset.tool) : null
      if (j != null && groupOf(j) === open) setHot(j, rowsOf(j), 'ptr')
      else setHot(null, null, 'ptr')
    },
  }

  const folder = (i) => ({
    // The fill ending is the loop's clock: it opens the next folder.
    onFillEnd: (e) => {
      if (e.target !== e.currentTarget || mode !== 'run') return
      setOpen((cur) => (cur + 1) % FOLDERS.length)
      setSeen(true)
    },
    // A click, tap, Enter or Space is the reader taking control: the tour stops.
    onClick: () => { stop(); pick(i) },
    onFocus: () => pick(i),
    onPointerEnter: (e) => {
      if (!finePointer(e)) return
      clearTimeout(timers.current.intent)
      timers.current.intent = setTimeout(() => pick(i), INTENT_MS)
    },
    onPointerLeave: () => clearTimeout(timers.current.intent),
  })

  const toggle = () => {
    if (mode === 'run') {
      setChosen('stopped')
      return
    }
    // Play: the reader asked for it, so the holds lift and the tour goes on from the next folder.
    clearTimeout(timers.current.touch)
    clearTimeout(timers.current.focus)
    setTouchHold(false)
    setFocusHold(false)
    setChosen('run')
    setOpen((cur) => (cur + 1) % FOLDERS.length)
    setSeen(true)
  }

  return {
    open,
    seen,
    mode,
    hot: lit,
    // The fill and the travelling light only run while the owner says so and no hold is on.
    playing,
    paused: !playing || touchHold || focusHold,
    away: !playing,
    pick,
    toggle,
    togglePair,
    folder,
    section,
    stage,
  }
}
