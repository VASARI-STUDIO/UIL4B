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

// Rebuild the copyable SVG markup for an embedded icon. CDN icons are fetched
// on demand (their markup isn't stored), so this returns null for them.
export function iconToSvg(icon) {
  if (!icon || icon.cdn) return null
  return icon.filled
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
}
