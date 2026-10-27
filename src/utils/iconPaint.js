const IGNORED_PAINTS = new Set(['none', 'currentcolor', 'transparent', 'inherit'])

function normalizePaint(value) {
  const paint = value.replace(/\s*!important\s*$/i, '').trim().toLowerCase()
  if (!paint || IGNORED_PAINTS.has(paint)) return null
  return paint.replace(/^#([\da-f])([\da-f])([\da-f])$/i, (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
}

// Visit presentation attributes and inline declarations without requiring a DOM.
function mapPaints(svg, visit) {
  return svg.replace(/<[^>]+>/g, tag => tag.replace(/(\s)(fill|stroke|style)\s*=\s*(["'])([\s\S]*?)\3/gi,
    (attribute, space, name, quote, value) => {
      if (name.toLowerCase() === 'style') {
        const style = value.replace(/(^|;)\s*(fill|stroke)\s*:\s*([^;]+)/gi,
          (declaration, start, property, paint) => `${start}${property}:${visit(paint)}`)
        return `${space}${name}=${quote}${style}${quote}`
      }
      return `${space}${name}=${quote}${visit(value)}${quote}`
    }))
}

const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline'])
const NON_RENDERED = new Set(['defs', 'clippath', 'mask', 'symbol', 'pattern', 'marker'])
const BLACKS = new Set(['black', '#000000'])

// True when the attribute or an inline declaration sets this property.
function setsProperty(attrs, property) {
  if (new RegExp(`\\s${property}\\s*=`, 'i').test(attrs)) return true
  const style = attrs.match(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i)
  return !!style && new RegExp(`(^|;)\\s*${property}\\s*:`, 'i').test(style[2])
}

// A drawable shape with no fill or stroke of its own and no fill from an ancestor paints black.
function hasUnpaintedShape(svg) {
  const stack = []
  for (const [, closing, rawName, attrs, selfClosing] of svg.matchAll(/<(\/?)([a-z][\w:-]*)([^>]*?)(\/?)>/gi)) {
    const name = rawName.toLowerCase()
    if (closing) {
      const open = stack.map(item => item.name).lastIndexOf(name)
      if (open >= 0) stack.length = open
      continue
    }
    const fill = setsProperty(attrs, 'fill')
    if (SHAPES.has(name) && !fill && !setsProperty(attrs, 'stroke')
      && !stack.some(item => item.fill || NON_RENDERED.has(item.name))) return true
    if (!selfClosing) stack.push({ name, fill })
  }
  return false
}

export function isMulticolourSvg(svg) {
  if (!svg) return false
  if (/<(?:linearGradient|radialGradient)\b/i.test(svg)) return true
  const paints = new Set()
  let gradient = false
  mapPaints(svg, value => {
    const paint = normalizePaint(value)
    if (paint) {
      if (/url\(\s*["']?#/i.test(paint)) gradient = true
      paints.add(paint)
    }
    return value
  })
  if (gradient) return true
  // Unpainted shapes are black, a second colour beside any explicit non-black one.
  if (paints.size && ![...paints].some(paint => BLACKS.has(paint)) && hasUnpaintedShape(svg)) paints.add('#000000')
  return paints.size >= 2
}

// The one paint colour of single-colour artwork (lowercase, as normalizePaint
// writes it), or null when it has several, a gradient or none. Shapes with no paint
// of their own are black, so they are the colour of an icon that sets none.
// Art coloured some way the attributes do not show (a <style> block, an <image>,
// <text>, a <use> or a <foreignObject>) is null: its colour is not knowable here.
const HIDDEN_PAINT = /<(?:style|image|text|use|foreignObject)[\s>/]/i
export function singlePaint(svg) {
  if (!svg || HIDDEN_PAINT.test(svg) || isMulticolourSvg(svg)) return null
  const paints = new Set()
  mapPaints(svg, value => {
    const paint = normalizePaint(value)
    if (paint) paints.add(paint)
    return value
  })
  if (paints.size === 0) return hasUnpaintedShape(svg) ? '#000000' : null
  return paints.size === 1 ? [...paints][0] : null
}

const toLinear = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }

// WCAG relative luminance (0 black, 1 white) of a plain colour: #rrggbb, black or
// white. Anything else (a url() paint, a name this does not know) is null.
export function paintLuminance(paint) {
  if (paint === 'black') return 0
  if (paint === 'white') return 1
  const m = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(paint || '')
  if (!m) return null
  const [r, g, b] = m.slice(1).map(h => toLinear(parseInt(h, 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// True when the whole artwork is ONE colour and that colour is near-black (linear
// luminance below `max`). Such art is recoloured in the page's own ink where it is
// shown, the way a mono icon is; a lockup that mixes a dark wordmark with a coloured
// mark has more than one paint, so it is never this.
export function isNearBlackMono(svg, max) {
  const luminance = paintLuminance(singlePaint(svg))
  return luminance !== null && luminance < max
}

// Single-colour pack artwork must inherit the same ink as a plain icon.
export function monochromeSvg(svg) {
  return mapPaints(svg, value => normalizePaint(value)
    ? `currentColor${/!important/i.test(value) ? ' !important' : ''}`
    : value)
}
