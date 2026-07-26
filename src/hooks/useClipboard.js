import { useCallback } from 'react'

export function normalizeClipboardText(value) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return ''
}

export function useClipboard(toast) {
  const copy = useCallback((text) => {
    const value = normalizeClipboardText(text)
    if (!value) {
      toast?.('Nothing to copy')
      return Promise.resolve(false)
    }
    if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
      toast?.('Clipboard is not available in this browser')
      return Promise.resolve(false)
    }
    try {
      return Promise.resolve(navigator.clipboard.writeText(value))
        .then(() => {
          toast?.('Copied')
          return true
        })
        .catch(() => {
          toast?.('Failed to copy')
          return false
        })
    } catch {
      toast?.('Failed to copy')
      return Promise.resolve(false)
    }
  }, [toast])

  return copy
}
