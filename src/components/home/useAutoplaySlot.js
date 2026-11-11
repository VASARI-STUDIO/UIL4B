import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { SLOTS, createAutoplayStore, slotQualifies } from './autoplayRules'

// THE SECTION SIDE OF THE PAGE'S ONE AUTOPLAY OWNER (see AutoplayOwner.jsx).
//
//   const playing = useAutoplaySlot('hero', el)
//
// `el` is the element whose visibility decides the slot (the hero's panel
// frame, the tour's stage), or a list of them, where any one qualifying is
// enough (keep a list stable between renders, for example with useMemo). Pass
// each as state (a callback ref that calls setState) so the hook re-observes
// when it mounts or swaps; null means "not mounted" and the slot holds. The return value is true only while this slot
// owns the screen, so a section drives its animation from it and never runs an
// observer of its own. Thresholds and the exclusion are in autoplayRules.js.
//
// Outside a provider the hook still works: it keeps a private store, so the
// slot just follows its own visibility and the tab state.

export const AutoplayContext = createContext(null)

const PHONE_QUERY = '(max-width: 767px)'

export function tabHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

/** Keeps a store's `hidden` flag in step with the tab. */
export function useTabHidden(store, enabled = true) {
  useEffect(() => {
    if (!enabled || !store) return undefined
    const onVisibility = () => store.setHidden(tabHidden())
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [store, enabled])
}

/**
 * @param {'hero'|'tour'} name
 * @param {Element|null|Array<Element|null>} el  the element, or a stable list of elements, to watch
 * @returns {boolean} true while this slot may play
 */
export function useAutoplaySlot(name, el) {
  if (!SLOTS.includes(name)) throw new Error(`autoplay: unknown slot "${name}"`)
  const shared = useContext(AutoplayContext)
  const [own] = useState(() => (shared ? null : createAutoplayStore(tabHidden())))
  const store = shared || own
  useTabHidden(store, !shared)

  useEffect(() => {
    const targets = (Array.isArray(el) ? el : [el]).filter(Boolean)
    if (!targets.length || typeof IntersectionObserver === 'undefined') {
      store.setInView(name, false)
      return undefined
    }
    const phoneMq = window.matchMedia ? window.matchMedia(PHONE_QUERY) : null
    // With several targets the slot qualifies while any one of them does.
    const qualifies = new Map()
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        qualifies.set(entry.target, slotQualifies(name, {
          ratio: entry.intersectionRatio,
          rectHeight: entry.intersectionRect.height,
          height: entry.boundingClientRect.height,
          viewportHeight: window.innerHeight,
          phone: !!phoneMq && phoneMq.matches,
        }))
      })
      store.setInView(name, Array.from(qualifies.values()).some(Boolean))
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) })
    targets.forEach((target) => observer.observe(target))
    return () => {
      observer.disconnect()
      store.setInView(name, false)
    }
  }, [name, el, store])

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return snapshot[name]
}
