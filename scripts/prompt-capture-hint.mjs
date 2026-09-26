// Reads a demo page's capture hint for scripts/prompt-posters.mjs:
//
//   <meta name="uil4b-capture" content='{"mode":"scroll","stops":[0,0.5,"#pricing"]}'>
//
// Returns the parsed hint for mode "run" or "scroll", `{ mode: 'default' }`
// when the page has no hint, and `{ mode: 'default', invalid }` when it has
// one that cannot be used, so the capture can report it rather than guess.
// Attribute order and quoting are free; `&quot;` inside a double-quoted
// content attribute is decoded.

const MODES = new Set(['run', 'scroll'])

function attr(tag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  if (!m) return null
  return m[1] ?? m[2] ?? m[3]
}

function decode(value) {
  return value.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
}

export function readCaptureHint(html) {
  const tags = String(html ?? '').match(/<meta\b[^>]*>/gi) || []
  const tag = tags.find((t) => (attr(t, 'name') || '').toLowerCase() === 'uil4b-capture')
  if (!tag) return { mode: 'default' }
  const raw = attr(tag, 'content')
  if (raw == null) return { mode: 'default', invalid: '(no content attribute)' }
  try {
    const hint = JSON.parse(decode(raw))
    if (!hint || typeof hint !== 'object' || !MODES.has(hint.mode)) return { mode: 'default', invalid: raw }
    if (hint.mode === 'scroll' && !(Array.isArray(hint.stops) && hint.stops.length)) {
      return { mode: 'default', invalid: raw }
    }
    return hint
  } catch {
    return { mode: 'default', invalid: raw }
  }
}
