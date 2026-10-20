import { useState, useCallback, useRef, useEffect } from 'react'
import { toastDuration } from '../utils/toastDuration'

export function useToast({ listen = true } = {}) {
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success')
  const [visible, setVisible] = useState(false)
  const [action, setAction] = useState(null)
  const timer = useRef(null)
  const lastMs = useRef(0)
  const actionRef = useRef(null)

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
    actionRef.current = act
    setVisible(true)
    clearTimeout(timer.current)
    const ms = toastDuration(msg, kind, { action: !!act })
    lastMs.current = ms
    timer.current = setTimeout(() => setVisible(false), ms)
  }, [])

  // Components with no toast of their own (the header) ask for one with
  //   window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message, type } }))
  // `detail.action` ({ label, onAction }) adds the action button, and the
  // listener marks `detail.handled` so a sender can tell a toast was shown.
  // `listen: false` is for a caller that shows its own toast on demand.
  useEffect(() => {
    if (!listen) return undefined
    const onToast = (event) => {
      const { message: msg, type: kind, action: act } = event.detail || {}
      if (!msg) return
      event.detail.handled = true
      toast(msg, kind, act ? { action: act } : null)
    }
    window.addEventListener('uil4b:toast', onToast)
    return () => window.removeEventListener('uil4b:toast', onToast)
  }, [toast, listen])

  // A sender whose action no longer applies (a retry for an account that has
  // signed out) takes its own toast down: `detail.onAction` names the action.
  useEffect(() => {
    if (!listen) return undefined
    const onDismiss = (event) => {
      const onAction = event.detail?.onAction
      if (onAction && actionRef.current?.onAction === onAction) dismiss()
    }
    window.addEventListener('uil4b:toast-dismiss', onDismiss)
    return () => window.removeEventListener('uil4b:toast-dismiss', onDismiss)
  }, [dismiss, listen])

  const hold = useCallback(() => { clearTimeout(timer.current) }, [])
  const release = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), lastMs.current || 1800)
  }, [])

  return { message, visible, type, action, toast, dismiss, hold, release }
}
