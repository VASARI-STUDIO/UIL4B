import { useState, useCallback, useRef, useEffect } from 'react'

export function useToast() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const toast = useCallback((msg) => {
    setMessage(msg)
    setVisible(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 1400)
  }, [])

  return { message, visible, toast }
}
