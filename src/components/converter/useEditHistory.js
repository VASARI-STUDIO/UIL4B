// Undo and redo for the Video tab's edits (the pure history is utils/editHistory.js).
//
// The edit controls stay ordinary state in the page. This hook watches the
// recipe they add up to and keeps the steps; stepping back calls `apply` with an
// earlier recipe, which puts every control back at once. Because the restored
// recipe is the history's own present, the watcher sees "nothing changed" and
// does not count the undo as a new edit (which would empty the redo line).
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  canRedo, canUndo, changedEditNames, describeEdits, record, redo, startHistory, undo,
} from '../../utils/editHistory.js'

// Ctrl or Cmd with Z undoes, with Shift redoes; Ctrl+Y redoes. Typing in a field
// keeps its own undo, so none of this fires while one has the focus.
const TEXT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number'])
export function isTyping(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return el.tagName === 'INPUT' && TEXT_TYPES.has((el.getAttribute('type') || 'text').toLowerCase())
}

/** 'undo', 'redo' or null for a key press. */
export function historyKey(e) {
  if (e.altKey || !(e.ctrlKey || e.metaKey)) return null
  const k = String(e.key).toLowerCase()
  if (k === 'z') return e.shiftKey ? 'redo' : 'undo'
  if (k === 'y' && e.ctrlKey && !e.metaKey && !e.shiftKey) return 'redo'
  return null
}

/**
 * @param recipe  the current edits, an object that is replaced when any of them changes
 * @param apply   puts a recipe back into the controls
 * @returns canUndo, canRedo, undo, redo, the edits as phrases, a line for screen readers and reset(changes)
 * @param active  whether the keyboard shortcuts are live (a file is loaded and nothing is running)
 */
export default function useEditHistory(recipe, apply, active) {
  const [hist, setHist] = useState(() => startHistory(recipe))
  const [said, setSaid] = useState('')
  const live = useRef({ hist, apply, active, recipe })
  useEffect(() => { live.current = { hist, apply, active, recipe } })

  useEffect(() => { setHist(h => record(h, recipe, Date.now())) }, [recipe])

  const step = useCallback((kind) => {
    const { hist: h, apply: put, active: on } = live.current
    if (!on) return
    const next = kind === 'undo' ? undo(h) : redo(h)
    if (next === h) return
    live.current.hist = next
    setHist(next)
    put(next.present)
    const names = changedEditNames(h.present, next.present)
    setSaid(`${kind === 'undo' ? 'Undid' : 'Redid'} ${names.join(' and ') || 'an edit'}`)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || isTyping(e.target)) return
      const kind = historyKey(e)
      if (!kind || !live.current.active) return
      e.preventDefault()
      step(kind)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [step])

  // A new file starts a new history. `changes` are the settings the new file
  // opens with, laid over the current ones; the caller sets the same values.
  const reset = useCallback((changes) => {
    live.current.hist = startHistory({ ...live.current.recipe, ...changes })
    setHist(live.current.hist)
    setSaid('')
  }, [])

  return {
    canUndo: canUndo(hist),
    canRedo: canRedo(hist),
    undo: useCallback(() => step('undo'), [step]),
    redo: useCallback(() => step('redo'), [step]),
    edits: describeEdits(recipe),
    said,
    reset,
  }
}
