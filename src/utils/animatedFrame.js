// The animated icon grid's pure half: what a glyph's markup does over time and
// the still that stands in for it when it is not allowed to move.
//
// The grid draws an animated glyph as an <img> data URI (the sprite sanitiser
// drops <animate>). That URI is the full markup. These helpers read it once and
// remember the answer, so a cell scrolling in and out of view never re-parses it.

const URI_PREFIX = 'data:image/svg+xml;utf8,'

// SMIL timing elements. `set` flips an attribute at a time; the three animate*
// elements interpolate one. Removing them leaves each attribute at its authored
// (resting) value, which for these sets is the finished drawing.
const SMIL = /<(animate|animateTransform|animateMotion|set)\b[^>]*?(?:\/>|>[\s\S]*?<\/\1>)/gi
// Two ways a SMIL icon repeats for ever: repeatCount="indefinite", or a begin
// list that restarts off another animation's end (begin="0;a.end"), which is how
// most of the Spinners set loops without any repeatCount.
const FOREVER = /repeatCount\s*=\s*["']indefinite["']|\bbegin\s*=\s*["'][^"']*;[^"']*[\w-]+\.(?:end|begin)\b/i

const stripSmil = (markup) => markup.replace(SMIL, '')

// Tags, with their attribute text: `<circle cx="1" />` is [name, ' cx="1" ', '/'].
const TAG = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g
const SMIL_NAMES = new Set(['animate', 'animatetransform', 'animatemotion', 'set'])
const SHAPES = new Set(['path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'image'])
const ZERO = '(?:0|0?\\.0+)'
const HIDDEN = new RegExp(`\\s(?:r|opacity|width|height)\\s*=\\s*"${ZERO}"|\\stransform\\s*=\\s*"matrix\\(\\s*0[ ,]+0[ ,]+0[ ,]+0`)

const attrOf = (attrs, name) => attrs.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`))?.[1] ?? null
function withAttr(attrs, name, value) {
  const re = new RegExp(`(\\s${name}\\s*=\\s*)"[^"]*"`)
  return re.test(attrs) ? attrs.replace(re, (_, head) => `${head}"${value}"`) : `${attrs} ${name}="${value}"`
}

/** True when the markup draws something: a shape that is not sized or faded to nothing. */
function drawsSomething(markup) {
  for (const m of markup.matchAll(TAG)) {
    if (!m[1] && SHAPES.has(m[2].toLowerCase()) && !HIDDEN.test(m[3])) return true
  }
  return false
}

// Attributes a still should show at their largest (a dot at full size, a path at full
// opacity) and the one it should show at its smallest (a stroke fully drawn: offset 0).
const PEAK = new Set(['r', 'rx', 'ry', 'width', 'height', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-width'])
const DRAWN = 'stroke-dashoffset'

/**
 * A still for an icon whose animations START from nothing (a dot at r="0", a path at
 * opacity 0: pulses, fades, scale-ins), where simply removing them leaves a blank.
 * Each animated attribute is written onto its element at its most visible value
 * first, then the animations are removed. Rotations and positions are left alone.
 */
function peakFrame(markup) {
  const tags = []
  for (const m of markup.matchAll(TAG)) {
    tags.push({ at: m.index, end: m.index + m[0].length, closing: !!m[1], name: m[2], lower: m[2].toLowerCase(), attrs: m[3], self: !!m[4] })
  }
  const stack = []
  const edits = new Map() // parent tag index -> { attr: value, transform: [parts] }
  tags.forEach((t, i) => {
    if (t.closing) { stack.pop(); return }
    if (SMIL_NAMES.has(t.lower)) {
      const parent = stack[stack.length - 1]
      const name = attrOf(t.attrs, 'attributeName')
      const list = (attrOf(t.attrs, 'values') ?? [attrOf(t.attrs, 'from'), attrOf(t.attrs, 'to')].filter((v) => v != null).join(';')).split(';').map((v) => v.trim()).filter(Boolean)
      if (parent != null && name && list.length) {
        const edit = edits.get(parent) || { transform: [] }
        edits.set(parent, edit)
        if (t.lower === 'animatetransform') {
          const type = attrOf(t.attrs, 'type')
          if (type === 'translate' || type === 'scale') edit.transform.push(`${type}(${list[list.length - 1]})`)
        } else if (PEAK.has(name) || name === DRAWN) {
          const size = (v) => Math.abs(parseFloat(v)) || 0
          const pick = list.reduce((a, b) => ((name === DRAWN ? size(b) < size(a) : size(b) > size(a)) ? b : a))
          const prev = edit[name]
          if (prev == null || (name === DRAWN ? size(pick) < size(prev) : size(pick) > size(prev))) edit[name] = pick
        }
      }
      if (!t.self) stack.push(i)
      return
    }
    if (!t.self) stack.push(i)
  })
  let out = ''
  let cursor = 0
  let skipping = false
  tags.forEach((t, i) => {
    out += markup.slice(cursor, t.at)
    cursor = t.end
    if (skipping) { if (t.closing && SMIL_NAMES.has(t.lower)) skipping = false; return }
    if (!t.closing && SMIL_NAMES.has(t.lower)) { skipping = !t.self; return }
    const edit = edits.get(i)
    if (!edit || t.closing) { out += markup.slice(t.at, t.end); return }
    let attrs = t.attrs
    for (const [k, v] of Object.entries(edit)) if (k !== 'transform') attrs = withAttr(attrs, k, v)
    if (edit.transform.length) attrs = withAttr(attrs, 'transform', edit.transform.join(' '))
    out += `<${t.name}${attrs}${t.self ? '/' : ''}>`
  })
  return out + markup.slice(cursor)
}

/**
 * The icon at rest: every SMIL animation element removed, which leaves each
 * attribute at its authored value. When that leaves nothing drawn (the animation
 * is what grows the shape in), the most visible value of each animated attribute
 * is written in first, so a still is never a blank tile.
 */
export function staticFrame(markup) {
  if (typeof markup !== 'string') return ''
  const stripped = stripSmil(markup)
  if (drawsSomething(stripped)) return stripped
  const peak = peakFrame(markup)
  return drawsSomething(peak) ? peak : stripped
}

/** True when any element repeats for ever (a spinner, a Meteocon loop). */
export function loopsForever(markup) {
  return typeof markup === 'string' && FOREVER.test(markup)
}

/** True when the markup has any SMIL animation at all. */
export function hasAnimation(markup) {
  return typeof markup === 'string' && new RegExp(SMIL.source, 'i').test(markup)
}

function decode(src) {
  if (typeof src !== 'string' || !src.startsWith(URI_PREFIX)) return ''
  try { return decodeURIComponent(src.slice(URI_PREFIX.length)) } catch { return '' }
}

const encode = (markup) => `${URI_PREFIX}${encodeURIComponent(markup)}`

// Bounded like the grid's own URI cache: first in, first out past this size.
const INFO_MAX = 3000
const INFO = new Map()

/**
 * What the grid needs to know about one animated glyph's data URI, memoised per
 * src: `{ animated, looping, still }`. `animated` is false for an icon that does not
 * move at all; `looping` is true when it repeats for ever; `still`
 * is the data URI of the same icon with its animation removed. null when `src`
 * is not a data URI this module can read, so the caller draws it as it is.
 */
export function frameInfo(src) {
  if (INFO.has(src)) return INFO.get(src)
  const markup = decode(src)
  let info = null
  if (markup) {
    info = { animated: hasAnimation(markup), looping: loopsForever(markup), still: encode(staticFrame(markup)) }
  }
  INFO.set(src, info)
  if (INFO.size > INFO_MAX) INFO.delete(INFO.keys().next().value)
  return info
}
