import { useEffect, useReducer } from 'react'
import { INTERVAL_MS, carouselReducer, carouselRunning, createCarousel } from './pageCarousel'

// The page gallery's state over time: pageCarousel.js decides, this runs the clock and follows the motion setting.
// `resetKey` names the set of pages; when it changes the gallery goes back to the first page and advances again.

const motionReduced = () => typeof window !== 'undefined' && (
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reducedMotion === 'true'
)

export default function usePageCarousel(count, resetKey) {
  const [state, dispatch] = useReducer(carouselReducer, undefined, () => createCarousel({ count, reduced: motionReduced() }))

  useEffect(() => { dispatch({ type: 'reset', count }) }, [resetKey, count])

  // The setting can change while the dialog is open: the system query and the app's own switch both count.
  useEffect(() => {
    const sync = () => dispatch({ type: 'reduced', on: motionReduced() })
    sync()
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    query?.addEventListener?.('change', sync)
    const watch = new MutationObserver(sync)
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduced-motion'] })
    return () => { query?.removeEventListener?.('change', sync); watch.disconnect() }
  }, [])

  // One timeout per page: a change of page (by the timer or a click) restarts the five seconds.
  const running = carouselRunning(state)
  useEffect(() => {
    if (!running) return undefined
    const id = setTimeout(() => dispatch({ type: 'tick' }), INTERVAL_MS)
    return () => clearTimeout(id)
  }, [running, state.index])

  return [state, dispatch]
}
