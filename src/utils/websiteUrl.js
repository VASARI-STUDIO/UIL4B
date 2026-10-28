// The profile's website field. It is stored as the person typed it and may
// one day be rendered as an href, so the only schemes it may hold are http and
// https: `javascript:` and `data:` URLs run script when followed.

const ERROR_TEXT = 'Enter a web address, like https://yoursite.com.'

// A scheme: letters, digits, "+", "." or "-" then a colon, where the colon is
// not a port ("example.com:8080" is a host with a port, not a scheme).
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i

function parseHttp(text) {
  let url
  try { url = new URL(text) } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname || url.username || url.password) return null
  return url
}

/**
 * Check what was typed into the website field.
 * An empty value is fine (it clears the field). An address with no scheme gets
 * "https://"; any other scheme is refused.
 * Returns { ok: true, value } with the text to store, or { ok: false, error }.
 */
export function checkWebsite(input) {
  const text = String(input ?? '').trim()
  if (!text) return { ok: true, value: '' }
  if (/\s/.test(text)) return { ok: false, error: ERROR_TEXT }
  const candidate = HAS_SCHEME.test(text) ? text : `https://${text.replace(/^\/\//, '')}`
  if (!parseHttp(candidate)) return { ok: false, error: ERROR_TEXT }
  return { ok: true, value: candidate }
}

/**
 * The value to put in an href: the stored website if it is an http(s) URL,
 * else ''. A stored value from before this check, or one written some other
 * way, never reaches a link as `javascript:`.
 */
export function safeHttpUrl(stored) {
  const text = String(stored ?? '').trim()
  return text && parseHttp(text) ? text : ''
}
