import { useEffect, useState } from 'react'

// The family-to-licence table (about 50 KB) is only needed once someone opens a
// family's About panel, so it is a separate chunk fetched on first use and then
// kept for the rest of the session.
let pending = null
let loaded = null

function loadFontLicences() {
  if (!pending) {
    pending = import('../data/fontLicences.json')
      .then(mod => {
        loaded = mod.default
        return loaded
      })
      .catch(err => {
        // Let the next caller try again instead of caching the failure.
        pending = null
        throw err
      })
  }
  return pending
}

/** The licence table, or null until it has loaded. If it cannot load, an empty
 * table, so every family gets the Google Fonts fallback rather than no licence. */
export function useFontLicences() {
  const [table, setTable] = useState(loaded)

  useEffect(() => {
    if (table) return undefined
    let live = true
    loadFontLicences().then(
      next => { if (live) setTable(next) },
      err => {
        console.error('[fonts] licence table failed to load', err)
        if (live) setTable({})
      },
    )
    return () => { live = false }
  }, [table])

  return table
}
