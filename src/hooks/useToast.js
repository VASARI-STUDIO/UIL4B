import { useState, useCallback, useRef, useEffect } from 'react'
import { toastDuration } from '../utils/toastDuration'

export function useToast() {
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success')
  const [visible, setVisible] = useState(false)
  const [action, setAction] = useState(null)
  const timer = useRef(null)
  const lastMs = useRef(0)

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  // The clock scales with the message, and an error stays until it is
  // dismissed or six seconds have passed, whichever is later; see
  // utils/toastDuration.js for the numbers.
  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setVisible(false)
  }, [])

  // `options.action` = { label, onAction } puts one action button on the
  // toast (Undo). An action toast holds for TOAST_ACTION_MIN_MS at least, and
  // the clock stops while the pointer or focus is on it (hold/release), so the
  // action cannot vanish under a person who is reaching for it.
  const toast = useCallback((msg, kind = 'success', options = null) => {
    const act = options?.action && typeof options.action.onAction === 'function' ? options.action : null
    setMessage(msg)
    setType(kind)
    setAction(act)
    setVisible(true)
    clearTimeout(timer.current)
    const ms = toastDuration(msg, kind, { action: !!act })
    lastMs.current = ms
    timer.current = setTimeout(() => setVisible(false), ms)
  }, [])

  const hold = useCallback(() => { clearTimeout(timer.current) }, [])
  const release = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), lastMs.current || 1800)
  }, [])

  return { message, visible, type, action, toast, dismiss, hold, release }
}
