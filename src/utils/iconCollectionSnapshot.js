// Pack lists served from our own site.
//
// The icon library needs each pack's list of icon names (Iconify's
// `/collection?prefix=<pack>&info=1` answer) before it can draw a grid. Asking
// api.iconify.design for all of them on every first visit is what gets one IP
// rate limited, so scripts/snapshot-icon-collections.mjs writes the same answers
// to public/iconify/collections/<pack>.json and this module reads them back
// same-origin. A pack with no usable snapshot returns null, and the caller asks
// Iconify as before.

/** Where the snapshot files are served from, and where the script writes them (under public/). */
export const COLLECTION_SNAPSHOT_PATH = '/iconify/collections'

/** The snapshot URL for one pack. */
export const collectionSnapshotUrl = (pack) => `${COLLECTION_SNAPSHOT_PATH}/${encodeURIComponent(pack)}.json`

/**
 * Does this look like a /collection answer the page can read? The names live in
 * `uncategorized` and `categories`; a body with neither is not a pack list.
 */
export function isCollectionAnswer(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return false
  return Array.isArray(d.uncategorized) || (d.categories != null && typeof d.categories === 'object')
}

/**
 * Read one pack's snapshot, or null when there is none to use: not committed
 * (a pack added after the last snapshot), a failed request, or a 200 that is not
 * JSON (the host's single-page fallback answers an unknown path with the app's
 * own HTML). Never throws, so the caller can fall back to the live API.
 */
export async function fetchCollectionSnapshot(pack, { fetchImpl, timeout = 6000 } = {}) {
  try {
    const doFetch = fetchImpl || globalThis.fetch
    const r = await doFetch(collectionSnapshotUrl(pack), { signal: AbortSignal.timeout(timeout) })
    if (!r.ok) return null
    const d = await r.json()
    return isCollectionAnswer(d) ? d : null
  } catch {
    return null
  }
}
