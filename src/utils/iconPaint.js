import { parseColor } from './colorFormats.js'

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

// A paint that starts like a hex, rgb() or hsl() colour. parseColor also takes a bare run
// of hex digits, which is not a paint, so the start is checked first.
const COLOUR_PAINT = /^(?:#|(?:rgb|hsl)a?\s*\()/i

// WCAG relative luminance (0 black, 1 white) of a plain colour: black, white, a hex
// (alpha ignored), rgb() or hsl(). Anything else (a url() paint, a name this does not
// know) is null.
export function paintLuminance(paint) {
  if (paint === 'black') return 0
  if (paint === 'white') return 1
  const text = String(paint || '').trim()
  if (!COLOUR_PAINT.test(text)) return null
  // A 4-digit #rgba is not one parseColor knows; it widens like #rgb does, alpha last.
  const wide = /^#[\da-f]{4}$/i.test(text) ? '#' + [...text.slice(1)].map((c) => c + c).join('') : text
  const parsed = parseColor(wide)
  if (!parsed) return null
  const [r, g, b] = [1, 3, 5].map(i => toLinear(parseInt(parsed.hex.slice(i, i + 2), 16)))
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

// The key a paint is listed and recoloured under: lowercase hex for black, white and any
// opaque hex, rgb() or hsl() colour, so "#FFF", "white" and "rgb(255,255,255)" are one
// swatch. A paint this cannot name (a url() gradient, none, currentColor) is null.
// Other colour names and a translucent colour keep their own lowercase text.
function paintKey(value) {
  const paint = normalizePaint(value)
  if (!paint || /^url\(/i.test(paint)) return null
  if (paint === 'black') return '#000000'
  if (paint === 'white') return '#ffffff'
  if (/^(?:rgb|hsl)a?\s*\(/i.test(paint)) {
    const parsed = parseColor(paint)
    if (parsed && (parsed.alpha === undefined || parsed.alpha === 1)) return parsed.hex.toLowerCase()
  }
  return paint
}

// Each distinct plain colour the artwork paints with, in the order it first appears, so
// the customiser can offer one swatch per colour. Gradients (url() paints) are not listed:
// their stops are not paint attributes. Shapes with no paint of their own are black, so a
// '#000000' entry is added for them when no explicit black is there.
export function listPaints(svg) {
  if (!svg) return []
  const keys = []
  mapPaints(svg, value => {
    const key = paintKey(value)
    if (key && !keys.includes(key)) keys.push(key)
    return value
  })
  if (!keys.includes('#000000') && hasUnpaintedShape(svg)) keys.push('#000000')
  return keys
}

// The artwork with each listed colour swapped for the one the map gives it (map keys are
// listPaints keys, values are hex). A colour with no entry stays. `!important` is kept.
// Black that is only the default (shapes with no paint) is swapped by giving the root
// <svg> a fill, which those shapes inherit; shapes that name a colour keep it.
export function remapPaints(svg, map) {
  if (!svg || !map) return svg
  const keys = Object.keys(map).filter(k => map[k] && map[k].toLowerCase() !== k)
  if (!keys.length) return svg
  let out = mapPaints(svg, value => {
    const key = paintKey(value)
    if (!key || !keys.includes(key)) return value
    return `${map[key]}${/!important/i.test(value) ? ' !important' : ''}`
  })
  if (keys.includes('#000000') && hasUnpaintedShape(svg)) {
    out = out.replace(/<svg\b([^>]*)>/i, (tag, attrs) => (
      setsProperty(attrs, 'fill') ? tag : `<svg${attrs} fill="${map['#000000']}">`
    ))
  }
  return out
}

// Single-colour pack artwork must inherit the same ink as a plain icon.
export function monochromeSvg(svg) {
  return mapPaints(svg, value => normalizePaint(value)
    ? `currentColor${/!important/i.test(value) ? ' !important' : ''}`
    : value)
}
