import { useEffect, useRef } from 'react'

// Makes the system Back button close a full-screen dialog instead of leaving
// the page. While `active`, one history entry is pushed (a copy of the current
// state plus a marker, so the router sees the same entry and the URL does not
// change); Back pops it and `onClose` runs. When the dialog closes any other
// way, the entry is taken off again, but only if it is still the current one.
//
// Strict Mode runs an effect, its cleanup, then the effect again. The cleanup
// therefore waits a tick and checks whether the effect has come back before it
// pops the entry, so a dev double-run does not close the dialog it just opened.
const MARKER = 'dialogBack'

export default function useBackClosesDialog(active, onClose) {
  const live = useRef(false)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!active) return undefined
    live.current = true
    if (!window.history.state?.[MARKER]) {
      window.history.pushState({ ...window.history.state, [MARKER]: 1 }, '')
    }
    const onPop = () => closeRef.current()
    window.addEventListener('popstate', onPop)
    return () => {
      live.current = false
      window.removeEventListener('popstate', onPop)
      window.setTimeout(() => {
        if (!live.current && window.history.state?.[MARKER]) window.history.back()
      }, 0)
    }
  }, [active])
}
