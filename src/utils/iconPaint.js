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

// Single-colour pack artwork must inherit the same ink as a plain icon.
export function monochromeSvg(svg) {
  return mapPaints(svg, value => normalizePaint(value)
    ? `currentColor${/!important/i.test(value) ? ' !important' : ''}`
    : value)
}
