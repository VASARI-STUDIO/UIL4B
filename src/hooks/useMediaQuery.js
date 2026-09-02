import { useCallback, useMemo, useSyncExternalStore } from 'react'

// A media query as reactive state, for the cases CSS genuinely cannot reach.
//
// Almost every responsive decision in this app belongs in a `@media` block and
// should stay there. This hook is for the small set that cannot: swapping one
// piece of MARKUP for another, where the two forms are different controls
// rather than the same control restyled. A segmented tray of eight buttons and
// a single trigger that opens a menu of eight options are not one element with
// two looks — they have different roles, different names and different keyboard
// contracts, so CSS cannot turn one into the other.
//
// The obvious alternative — render both and `display:none` the wrong one — was
// rejected. `display:none` does keep the hidden branch out of the accessibility
// tree, so that part is sound, but it leaves both trees mounted: every option
// exists twice in the DOM, every `querySelector` in the app and its tests picks
// up whichever comes first regardless of which one the user can see, and the
// popover's measuring effects run against a box that has no layout. One tree,
// chosen once, is the honest version.
//
// `useSyncExternalStore` rather than useState+useEffect: it reads the query at
// render time, so the first paint is already correct. The effect-based shape
// paints the desktop branch and then corrects itself, which on a phone is a
// visible flash of the wrong toolbar on every navigation.
//
// SSR/prerender note: `getServerSnapshot` returns false, i.e. "not matched" —
// the wide branch. `scripts/prerender.mjs` emits route shells only and the app
// mounts with `createRoot`, not `hydrateRoot`, so no tree is ever reconciled
// against that value; it exists so the hook cannot throw if it is ever called
// where `window` is absent.

const NOOP = () => () => {}

export function subscribeToQuery(query) {
  return (onChange) => {
    const mq = window.matchMedia?.(query)
    if (!mq) return () => {}
    // addEventListener over the deprecated addListener, with a fallback: Safari
    // only grew the modern form in 14, and this file is reached on iOS.
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }
}

export default function useMediaQuery(query) {
  // useMemo, not useCallback: the value IS a function, produced by a factory
  // rather than written inline, and useCallback only accepts inline function
  // expressions.
  const subscribe = useMemo(
    () => (typeof window === 'undefined' ? NOOP() : subscribeToQuery(query)),
    [query],
  )
  const getSnapshot = useCallback(
    () => (typeof window === 'undefined' ? false : (window.matchMedia?.(query)?.matches ?? false)),
    [query],
  )
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
