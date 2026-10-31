// The preview dialog's Escape layers: menus and sheets that sit over the dialog.
//
// One stack, one listener. A layer pushes itself while it is open and pops when it
// closes, and a single document capture listener answers Escape by closing only the
// layer opened last. Each close callback returns focus to its own opener. While the
// stack is empty the listener does nothing, so Escape reaches useModalDialog and
// closes the dialog.
//
// The listener is added when this module loads, which is before any dialog mounts,
// so it runs ahead of useModalDialog's capture listener on the same node.
import { useEffect, useRef } from 'react'

const stack = []

function onKey(e) {
  if (e.key !== 'Escape' || !stack.length) return
  e.preventDefault()
  // Not just stopPropagation: the dialog's listener is on this same node.
  e.stopImmediatePropagation()
  stack[stack.length - 1].close()
}

if (typeof document !== 'undefined') document.addEventListener('keydown', onKey, true)

/**
 * Registers `close` as an Escape layer while `open`. Escape closes the newest open
 * layer; `close` should hand focus back to whatever opened it.
 */
export function useEscapeLayer(open, close) {
  // One entry per hook instance, so its place in the stack holds when `close` changes.
  const entry = useRef({ close })
  useEffect(() => {
    entry.current.close = close
  }, [close])
  useEffect(() => {
    if (!open) return undefined
    const layer = entry.current
    stack.push(layer)
    return () => {
      const at = stack.lastIndexOf(layer)
      if (at !== -1) stack.splice(at, 1)
    }
  }, [open])
}
