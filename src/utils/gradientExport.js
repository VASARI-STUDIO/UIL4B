// What the Gradient tool hands out: the CSS a person copies and the SVG they
// download. Pure functions, shared by the code well and the Save or share menu so
// the two cannot disagree.
import { gradientCss } from '../data/gradientGallery.js'
import { sampleStopsOklch } from '../components/tool/oklch.js'

// The canvas an SVG export is drawn on.
export const SVG_WIDTH = 600
export const SVG_HEIGHT = 400

// A number with at most two decimals (or `digits`) and no trailing zeros ("-0" reads "0").
const num = (n, digits = 2) => String(Number(n.toFixed(digits)))

// CSS gradient value in the chosen space. `in oklch` is a CSS Color 4
// interpolation method and goes after the angle or position part of the function;
// sRGB is the function's default, so it writes nothing.
export function gradientCssIn(type, angle, stops, space) {
  const css = gradientCss(type, angle, stops)
  if (space !== 'oklch') return css
  const open = css.indexOf('(') + 1
  if (type === 'Radial') return `${css.slice(0, open)}in oklch, ${css.slice(open)}`
  const comma = css.indexOf(', ', open)
  return `${css.slice(0, comma)} in oklch${css.slice(comma)}`
}

// The CSS a person copies. An OKLCH gradient gets its sRGB twin on the line
// before it: a browser that cannot read `in oklch` drops the second declaration
// and keeps the first. An sRGB gradient is one clean line.
export function gradientCssText(type, angle, stops, space) {
  const line = `background: ${gradientCssIn(type, angle, stops, space)};`
  if (space !== 'oklch') return line
  return `background: ${gradientCss(type, angle, stops)};\n${line}`
}

// The linear gradient line CSS draws across a w x h box: it runs through the
// centre along (sin a, -cos a), and its length is |w sin a| + |h cos a|, so the
// 0% and 100% stops sit where the corners' projections land.
export function linearGradientLine(angle, w = SVG_WIDTH, h = SVG_HEIGHT) {
  const rad = (((angle % 360) + 360) % 360) * Math.PI / 180
  const dx = Math.sin(rad), dy = -Math.cos(rad)
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2
  const cx = w / 2, cy = h / 2
  return {
    x1: cx - dx * half, y1: cy - dy * half,
    x2: cx + dx * half, y2: cy + dy * half,
    length: half * 2,
  }
}

// The radial gradient CSS draws by default (an ellipse, farthest-corner, centred)
// as an SVG circle squeezed on the y axis: the radii are w/sqrt2 and h/sqrt2.
export function radialGradientShape(w = SVG_WIDTH, h = SVG_HEIGHT) {
  return { cx: w / 2, cy: h / 2, r: w / Math.SQRT2, scaleY: h / w }
}

// Standalone, paste-ready SVG for a linear or radial gradient. Conic has no SVG
// gradient element, so callers only offer SVG for linear and radial. SVG
// gradients interpolate in sRGB only, so an OKLCH gradient is exported as sRGB
// stops sampled every 5% along the OKLCH path.
export function gradientSvg(type, angle, stops, space = 'srgb') {
  const source = space === 'oklch' ? sampleStopsOklch(stops, 5) : stops
  const stopEls = [...source]
    .sort((a, b) => a.position - b.position)
    .map(s => `      <stop offset="${Math.round(s.position)}%" stop-color="${s.color.toUpperCase()}" />`)
    .join('\n')
  let def
  if (type === 'Radial') {
    const { cx, cy, r, scaleY } = radialGradientShape()
    const transform = `translate(${num(cx)} ${num(cy)}) scale(1 ${num(scaleY, 6)}) translate(${num(-cx)} ${num(-cy)})`
    def = `    <radialGradient id="grad" gradientUnits="userSpaceOnUse" cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" gradientTransform="${transform}">\n${stopEls}\n    </radialGradient>`
  } else {
    const { x1, y1, x2, y2 } = linearGradientLine(angle)
    def = `    <linearGradient id="grad" gradientUnits="userSpaceOnUse" x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}">\n${stopEls}\n    </linearGradient>`
  }
  return `<svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">\n  <defs>\n${def}\n  </defs>\n  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="url(#grad)" />\n</svg>`
}
