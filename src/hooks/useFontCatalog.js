import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFontCatalog } from '../utils/googleFonts'

// One catalog loader shared by all three typography tools, so they tell the
// same story about the same network. It owns the four Murphy's-law states:
//
//   loading   — `status === 'loading'`, the first fetch is in flight.
//   ready     — the catalog resolved. `source` says whether it's the real thing.
//   degraded  — `source === 'fallback'`: Google and the /api/fonts proxy both
//               failed, so the bundled list is standing in. The tool still
//               works; the UI must say so and offer `retry()`.
//   offline   — `online === false`, tracked live off the browser's own events.
//
// `retry()` forces a genuine re-fetch (both the in-memory and localStorage
// caches are dropped first) and is safe to double-click: `retrying` guards it.
// Nothing here ever throws or hangs — fetchFontCatalog always resolves, which
// is what keeps a blocked font host from leaving a tool spinning forever.
export function useFontCatalog() {
  const [fonts, setFonts] = useState([])
  const [status, setStatus] = useState('loading')
  const [source, setSource] = useState('live')
  const [retrying, setRetrying] = useState(false)
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  const alive = useRef(true)
  const request = useRef(null)
  // Mirrors `source` so the online listener can branch on it without taking it
  // as a dependency (which would re-subscribe on every catalog change) and
  // without running a side effect inside a setState updater.
  const sourceRef = useRef('live')

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      request.current?.abort()
    }
  }, [])

  const load = useCallback(async (force) => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    if (force) setRetrying(true)
    const { fonts: list, source: src } = await fetchFontCatalog({ force, signal: controller.signal })
    if (!alive.current || request.current !== controller) return
    request.current = null
    sourceRef.current = src
    setFonts(list)
    setSource(src)
    setStatus('ready')
    setRetrying(false)
  }, [])

  useEffect(() => { load(false) }, [load])

  // Coming back online is the moment a fallback catalog is most likely to be
  // replaceable — retry automatically rather than making the user notice.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      if (sourceRef.current === 'fallback') load(true)
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [load])

  const retry = useCallback(() => {
    if (retrying) return
    load(true)
  }, [load, retrying])

  return {
    fonts,
    status,
    source,
    degraded: status === 'ready' && source === 'fallback',
    online,
    retry,
    retrying,
  }
}
