// A FILLED CONTROL'S HOVER KEEPS ITS LABEL READABLE, IN BOTH THEMES.
//
// The hover mixes 14% toward ink (#0B0C0E), the value the /plans Pro CTA
// uses, so every filled hover in the app is one
// colour and #F4F7FF on it clears AA. A "24% toward paper" hover would put
// that label at 3.39:1. Read off global.css, not typed here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss } from '../helpers/strip-comments.js'

const css = stripCss(fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8'))
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (rgb) => rgb.map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

function resolveMix(expr, vars) {
  const m = /color-mix\(in srgb,var\(--([\w-]+)\) (\d+)%,var\(--([\w-]+)\)\)/.exec(expr)
  assert.ok(m, `--accent-fill-hover is not a two-token color-mix any more: ${expr}`)
  const [a, b] = [vars[m[1]], vars[m[3]]]
  assert.ok(a && b, `could not resolve --${m[1]} / --${m[3]} to hexes`)
  const p = Number(m[2]) / 100
  return hex(a).map((v, i) => Math.round(v * p + hex(b)[i] * (1 - p)))
}

test('#F4F7FF on the filled hover clears 4.5:1, in both themes', () => {
  const root = /:root\{[^}]*?--accent:(#[0-9A-Fa-f]{6})[^}]*\}/.exec(css)?.[0]
  assert.ok(root, 'the accent family :root block was not found')
  const pick = (name) => new RegExp(`--${name}:([^;}]+)`).exec(root)?.[1]
  let expr = pick('accent-fill-hover')
  if (/^var\(--accent-hover\)$/.test(expr)) expr = pick('accent-hover')
  const vars = { accent: pick('accent'), 'accent-deep': pick('accent-deep'), 'accent-paper': pick('accent-paper') }
  assert.doesNotMatch(css, /\[data-theme="dark"\]\{[^}]*--accent-fill-hover:/, 'dark re-declares the fill hover; measure it separately')
  const hover = resolveMix(expr, vars)
  const r = ratio(hex('#F4F7FF'), hover)
  assert.ok(r >= 4.5, `#F4F7FF on the filled hover is ${r.toFixed(2)}:1`)
})
