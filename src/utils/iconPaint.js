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
  return gradient || paints.size >= 2
}

// Single-colour pack artwork must inherit the same ink as a plain icon.
export function monochromeSvg(svg) {
  return mapPaints(svg, value => normalizePaint(value)
    ? `currentColor${/!important/i.test(value) ? ' !important' : ''}`
    : value)
}
