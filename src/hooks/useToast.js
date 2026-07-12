import { useState, useCallback, useRef, useEffect } from 'react'

export function useToast() {
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success')
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const toast = useCallback((msg, kind = 'success') => {
    setMessage(msg)
    setType(kind)
    setVisible(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 1800)
  }, [])

  return { message, visible, type, toast }
}
