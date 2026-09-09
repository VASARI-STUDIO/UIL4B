import { useState, useCallback, useRef, useEffect } from 'react'
import { toastDuration } from '../utils/toastDuration'

export function useToast() {
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success')
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  // Every message used to get 1.8 seconds, refusals included — the flow audit
  // (#436) watched "Free plan saves up to 3 projects — go Pro for unlimited."
  // vanish before it could be read. The clock now scales with the message and
  // an error stays until it is dismissed or six seconds have passed, whichever
  // is later; see utils/toastDuration.js for the numbers.
  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setVisible(false)
  }, [])

  const toast = useCallback((msg, kind = 'success') => {
    setMessage(msg)
    setType(kind)
    setVisible(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), toastDuration(msg, kind))
  }, [])

  return { message, visible, type, toast, dismiss }
}
