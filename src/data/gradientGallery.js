// Gradient gallery helpers — the filter tags, the CSS composer and the Gradient
// Generator hand-off. The gradients themselves are NOT in this file any more.
//
// The full 100-gradient set lives in api/_lib/library/gradientGallery.js and
// reaches the browser by entitlement: the first ten (free) and name-only stubs
// for the rest are in src/data/gradientLibrary.js, and a Pro account fetches the
// whole set from the server. See api/_lib/library/serve.js. Keeping the helpers
// here means the Generator, the token exporter and the admin queue do not import
// a single gallery value.

export const GRADIENT_TAGS = ['warm', 'cool', 'dark', 'light', 'pastel', 'vivid', 'mono']

const GRAD_FN = { Linear: 'linear-gradient', Radial: 'radial-gradient', Conic: 'conic-gradient' }

// Compose the production CSS value for a gradient. Stops are sorted so a
// dragged-past handle still reads left→right. Shared with the Gradient
// Generator so the gallery, the tool and every copied snippet agree.
export function gradientCss(type, angle, stops) {
  const fn = GRAD_FN[type] || 'linear-gradient'
  const prefix = type === 'Linear' ? `${angle}deg, ` : type === 'Conic' ? `from ${angle}deg at 50% 50%, ` : ''
  const parts = [...stops]
    .sort((a, b) => a.position - b.position)
    .map(s => `${s.color.toUpperCase()} ${Math.round(s.position)}%`)
    .join(', ')
  return `${fn}(${prefix}${parts})`
}

// Build the Gradient Generator hand-off URL — ?gs=RRGGBB-pos_RRGGBB-pos with the
// type and angle alongside, decoded by decodeGradientParams below.
//
// `gn` (the name) is left off when there is no name. The style keys are written
// only when the gradient has them, so a plain gradient's link is the short one:
//   st  style family      sp  its parameters
//   sd  seed              fx  finishes
// Callers do not pass them yet; the decoder reads none of them yet either.
export function gradientToolUrl(g) {
  const gs = g.stops.map(s => `${s.color.replace('#', '')}-${Math.round(s.position)}`).join('_')
  const optional = [['gn', g.name], ['st', g.st], ['sp', g.sp], ['sd', g.sd], ['fx', g.fx]]
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
    .join('')
  return `/create/gradient?gs=${gs}&gt=${g.type.toLowerCase()}&ga=${Math.round(g.angle)}${optional}`
}

// Most stops a link may carry; the generator's own limit.
const MAX_STOPS = 12

// Parse a gallery hand-off out of the tool's search params. Returns
// { type, angle, stops, name } or null when there is no (valid) hand-off —
// every field is validated so a mangled URL can never produce broken stops.
export function decodeGradientParams(params) {
  const gs = params.get('gs')
  if (!gs) return null
  const stops = gs.split('_').slice(0, MAX_STOPS).map(part => {
    const m = /^([0-9a-f]{6})-(\d{1,3})$/i.exec(part)
    return m ? { color: `#${m[1].toUpperCase()}`, position: Math.min(100, +m[2]) } : null
  })
  if (stops.length < 2 || stops.some(s => !s)) return null
  const type = { linear: 'Linear', radial: 'Radial', conic: 'Conic' }[(params.get('gt') || 'linear').toLowerCase()] || 'Linear'
  const angle = Math.min(360, Math.max(0, parseInt(params.get('ga'), 10) || 0))
  const name = (params.get('gn') || '').slice(0, 60) || null
  return { type, angle, stops, name }
}
