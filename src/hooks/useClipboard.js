import { useCallback } from 'react'

export function normalizeClipboardText(value) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return ''
}

// copy(text) writes the clipboard and says so. copy(text, { written: true }) is for a
// tool that has already written it (with its own fallback): it only says so, so one
// press never writes twice.
export function useClipboard(toast) {
  const copy = useCallback((text, { written = false } = {}) => {
    const value = normalizeClipboardText(text)
    if (!value) {
      toast?.('Nothing to copy')
      return Promise.resolve(false)
    }
    if (written) {
      toast?.('Copied')
      return Promise.resolve(true)
    }
    if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
      toast?.('Clipboard is not available in this browser', 'error')
      return Promise.resolve(false)
    }
    try {
      return Promise.resolve(navigator.clipboard.writeText(value))
        .then(() => {
          toast?.('Copied')
          return true
        })
        .catch(() => {
          toast?.('Failed to copy', 'error')
          return false
        })
    } catch {
      toast?.('Failed to copy', 'error')
      return Promise.resolve(false)
    }
  }, [toast])

  return copy
}
