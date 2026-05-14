import { useCallback } from 'react'

export function useClipboard(toast) {
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text.trim()).then(() => {
      if (toast) toast('Copied')
    }).catch(() => {
      if (toast) toast('Failed to copy')
    })
  }, [toast])

  return copy
}
