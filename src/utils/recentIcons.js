// Tracks the icons a user has most recently copied or edited in the Icon Library
// so the library rail and the dashboard can surface them as a "quick access"
// strip. Stored locally; capped to keep the list tight and the preview legible.
const KEY = 'vs-recent-icons'
const MAX = 20

export function getRecentIcons() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function addRecentIcon(icon, action = 'copy') {
  if (!icon) return
  try {
    // Stable identity: pack:name for CDN icons, name for embedded ones.
    const key = icon.cdn ? `${icon.pack}:${icon.name}` : `local:${icon.name}`
    const ts = Date.now()
    const entry = icon.cdn
      ? { key, action, ts, cdn: true, pack: icon.pack, name: icon.name }
      : { key, action, ts, cdn: false, name: icon.name, d: icon.d, filled: !!icon.filled }
    // Re-inserting an existing key promotes it to the front with the latest action.
    const next = [entry, ...getRecentIcons().filter(i => i.key !== key)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / serialisation errors */
  }
}

// Wipe the recent-icons strip. One call, one confirm-free clear — the rail hides
// itself the moment the list is empty. Safe if storage is disabled/full.
export function clearRecentIcons() {
  try { localStorage.removeItem(KEY) } catch { /* ignore quota/access errors */ }
}

// The one built-in set drawn as solid shapes (Simple Icons); the others are
// single-stroke outlines, whose open paths turn into a wedge if they are filled.
export const SOLID_BUILTIN_PACK = 'S'

// Whether an embedded recent is drawn solid. The built-in set decides, matched by
// name and path, rather than the flag stored with the entry: an outline-only glyph
// must never inherit a fill. An entry the set no longer holds keeps its own flag.
export function recentIsFilled(entry, builtIns = []) {
  if (!entry || entry.cdn) return false
  const source = builtIns.find((i) => i.n === entry.name && i.d === entry.d)
  return source ? source.p === SOLID_BUILTIN_PACK : !!entry.filled
}

// Rebuild the copyable SVG markup for an embedded icon. CDN icons are fetched
// on demand (their markup isn't stored), so this returns null for them.
export function iconToSvg(icon) {
  if (!icon || icon.cdn) return null
  return icon.filled
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
}
