import { useSyncExternalStore } from 'react'

// The sort choice the Icon and Emoji libraries share.
//
// ONE CHOICE FOR BOTH. IconEmojiLibrary keeps both libraries mounted and only
// hides the one that is not showing, so a sort picked in one has to be there
// when the visitor switches to the other. A module-level store read through
// useSyncExternalStore does that without lifting state into the host page or
// threading a prop through the tab panels. It lives for the session and is not
// written to localStorage: nothing about it needs to survive a reload, and a
// stored key would have to be classified for account sync and for the data
// export (utils/accountSync.js, utils/dataExport.js) for no gain.
//
// The values are the stable ids; what a person reads is `sortOptions` below.
//   recommended  the order the library already produces (browse order, or the
//                search's own ranking). "Best match" while a search is typed.
//   az / za      by name
//   pack         by pack (icons) or by category (emoji), then the library's own
//                order inside each
export const SORT_KEYS = ['recommended', 'az', 'za', 'pack']

let current = 'recommended'
const listeners = new Set()

export const getLibrarySort = () => current

export function setLibrarySort(next) {
  if (!SORT_KEYS.includes(next) || next === current) return
  current = next
  listeners.forEach((listener) => listener())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** [sort, setSort] for the shared choice. */
export function useLibrarySort() {
  const sort = useSyncExternalStore(subscribe, getLibrarySort, () => 'recommended')
  return [sort, setLibrarySort]
}

/** The rows of the sort menu. `searching` renames the default; `packLabel` is "Pack" for icons, "Category" for emoji. */
export function sortOptions(searching, packLabel = 'Pack') {
  return [
    { value: 'recommended', label: searching ? 'Best match' : 'Recommended' },
    { value: 'az', label: 'Name A to Z' },
    { value: 'za', label: 'Name Z to A' },
    { value: 'pack', label: packLabel },
  ]
}

// Natural, case-blind order: "icon-2" before "icon-10", "Arrow" beside "arrow".
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/** Text comparison used by every sort here (and by the spec that checks it, in the page). */
export const compareLibraryText = (a, b) => collator.compare(a, b)

/**
 * `list` in the chosen order, as a new array; the SAME array for 'recommended', so the library's own order (and
 * the identity memoised on it) is untouched. Array.prototype.sort is stable, so equal keys keep their order.
 * `nameOf(item)` is the name to sort by; `packOf(item)` the pack or category label, or '' for none (sorted last).
 * An item with no name goes last in both directions.
 */
export function sortLibraryList(list, sort, { nameOf, packOf }) {
  if (sort === 'az' || sort === 'za') {
    const dir = sort === 'az' ? 1 : -1
    return [...list].sort((a, b) => {
      const x = nameOf(a) || ''
      const y = nameOf(b) || ''
      if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1)
      return dir * collator.compare(x, y)
    })
  }
  if (sort === 'pack') {
    return [...list].sort((a, b) => {
      const x = packOf(a) || ''
      const y = packOf(b) || ''
      if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1)
      return collator.compare(x, y)
    })
  }
  return list
}
