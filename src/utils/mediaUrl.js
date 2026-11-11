// Whether a prompt's stored media link is one UIL4B itself produced, and so safe
// to load in the admin queue. Media is either an inline data URL (the legacy
// fallback when Storage is unavailable) or a Firebase Storage download URL. The
// stored field is a free string, so anything else, including an http link, a
// link to another host or a script URL, is not loaded.
const STORAGE_HOST = 'firebasestorage.googleapis.com'
// Storage URLs name their bucket, and any Firebase project shares the same host,
// so the bucket must be this project's: the configured one, or the project's
// older appspot.com name that earlier uploads carry.
const OWN_BUCKETS = new Set([
  import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || 'uil4b-357c5.firebasestorage.app',
  'uil4b-357c5.appspot.com',
])

export function isTrustedMediaUrl(value) {
  if (typeof value !== 'string') return false
  const url = value.trim()
  if (/^data:(image|video)\//i.test(url)) return true
  let parsed
  try { parsed = new URL(url) } catch { return false }
  return parsed.protocol === 'https:'
    && parsed.hostname === STORAGE_HOST
    && !parsed.username
    && !parsed.password
    && OWN_BUCKETS.has(parsed.pathname.split('/')[3])
    && parsed.pathname.split('/')[4] === 'o'
}
