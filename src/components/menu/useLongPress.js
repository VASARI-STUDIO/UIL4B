import { useCallback, useEffect, useRef } from 'react'
import { LONG_PRESS_MS } from './menuModel'

// Touch long-press for a target that has a context menu. Spread the result on
// the target:  <div {...useLongPress((point, el) => open(point, el))}>
//
// A press that stays within 10px for 450ms opens the menu at the finger. A mouse
// is left alone (its right-click fires `contextmenu`, which the caller already
// handles). The `click` that follows a long press is swallowed once, so lifting
// the finger does not also run the target's own action.
export default function useLongPress(onLongPress, { ms = LONG_PRESS_MS, disabled = false } = {}) {
  const timer = useRef(0)
  const start = useRef(null)
  const fired = useRef(false)
  const handler = useRef(onLongPress)
  useEffect(() => { handler.current = onLongPress })
  const cancel = useCallback(() => { window.clearTimeout(timer.current); timer.current = 0; start.current = null }, [])
  useEffect(() => cancel, [cancel])

  return {
    onPointerDown: (event) => {
      if (disabled || event.pointerType === 'mouse' || event.button > 0) return
      fired.current = false
      start.current = { x: event.clientX, y: event.clientY }
      const target = event.currentTarget
      const point = { x: event.clientX, y: event.clientY }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = 0
        fired.current = true
        handler.current?.(point, target)
      }, ms)
    },
    onPointerMove: (event) => {
      if (!start.current) return
      if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onClickCapture: (event) => {
      if (!fired.current) return
      fired.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
}
