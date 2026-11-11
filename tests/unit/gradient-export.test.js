// What the Gradient tool copies and downloads: an sRGB fallback line under OKLCH
// CSS, and SVG geometry that matches the CSS gradient at any angle on the 600x400
// canvas. The maths is pure, so it is tested without a browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  gradientCssIn, gradientCssText, gradientSvg, linearGradientLine, radialGradientShape, SVG_WIDTH, SVG_HEIGHT,
} from '../../src/utils/gradientExport.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n')
const STOPS = [{ color: '#ffd84d', position: 0 }, { color: '#ff8a3d', position: 55 }, { color: '#f0436a', position: 100 }]
const near = (a, b, msg, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${msg}: ${a} vs ${b}`)

// Where a point falls along the gradient line: 0 at the first stop, 1 at the last.
const along = (g, x, y) => {
  const dx = g.x2 - g.x1, dy = g.y2 - g.y1
  return ((x - g.x1) * dx + (y - g.y1) * dy) / (dx * dx + dy * dy)
}
const corners = (w, h) => [[0, 0], [w, 0], [0, h], [w, h]]

// CSS Images 3: the gradient line passes through the centre, has the angle's
// direction, and is |w sin a| + |h cos a| long.
const cssLength = (angle, w, h) => {
  const rad = angle * Math.PI / 180
  return Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))
}

const SIZES = [[600, 400], [400, 400], [400, 600]]
const ANGLES = [0, 45, 90, 135, 200, 270, 315, 360, -45, 725]

test('the gradient line is as long as the CSS one, through the centre, in the CSS direction', () => {
  for (const [w, h] of SIZES) {
    for (const angle of ANGLES) {
      const g = linearGradientLine(angle, w, h)
      const label = `${angle}deg on ${w}x${h}`
      near(g.length, cssLength(angle, w, h), `${label} length`)
      near(Math.hypot(g.x2 - g.x1, g.y2 - g.y1), g.length, `${label} endpoints`)
      near((g.x1 + g.x2) / 2, w / 2, `${label} centre x`)
      near((g.y1 + g.y2) / 2, h / 2, `${label} centre y`)
      const rad = angle * Math.PI / 180
      near((g.x2 - g.x1) / g.length, Math.sin(rad), `${label} direction x`)
      near((g.y2 - g.y1) / g.length, -Math.cos(rad), `${label} direction y`)
    }
  }
})

test('the 0% and 100% stops sit on the corners CSS puts them on', () => {
  for (const [w, h] of SIZES) {
    for (const angle of ANGLES) {
      const g = linearGradientLine(angle, w, h)
      const t = corners(w, h).map(([x, y]) => along(g, x, y))
      near(Math.min(...t), 0, `${angle}deg on ${w}x${h} first corner`)
      near(Math.max(...t), 1, `${angle}deg on ${w}x${h} last corner`)
    }
  }
})

test('600x400 at the named angles', () => {
  const at = (angle) => linearGradientLine(angle, 600, 400)
  const up = at(0)
  near(up.x1, 300, '0deg x1'); near(up.y1, 400, '0deg y1'); near(up.x2, 300, '0deg x2'); near(up.y2, 0, '0deg y2')
  near(up.length, 400, '0deg length')
  const right = at(90)
  near(right.x1, 0, '90deg x1'); near(right.y1, 200, '90deg y1'); near(right.x2, 600, '90deg x2'); near(right.y2, 200, '90deg y2')
  near(right.length, 600, '90deg length')
  const diag = at(45)
  near(diag.length, 1000 / Math.SQRT2, '45deg length')
  near(diag.x1, 50, '45deg x1'); near(diag.y1, 450, '45deg y1'); near(diag.x2, 550, '45deg x2'); near(diag.y2, -50, '45deg y2')
  const back = at(135)
  near(back.x1, 50, '135deg x1'); near(back.y1, -50, '135deg y1'); near(back.x2, 550, '135deg x2'); near(back.y2, 450, '135deg y2')
  const odd = at(200)
  near(odd.length, 600 * Math.sin(20 * Math.PI / 180) + 400 * Math.cos(20 * Math.PI / 180), '200deg length')
  assert.ok(odd.y1 < odd.y2, '200deg runs downward')
  assert.ok(odd.x1 > odd.x2, '200deg runs to the left')
})

test('a square at 45deg runs corner to corner', () => {
  const g = linearGradientLine(45, 400, 400)
  near(g.length, 400 * Math.SQRT2, 'length')
  near(g.x1, 0, 'x1'); near(g.y1, 400, 'y1'); near(g.x2, 400, 'x2'); near(g.y2, 0, 'y2')
})

test('the default canvas is 600x400', () => {
  assert.equal(SVG_WIDTH, 600)
  assert.equal(SVG_HEIGHT, 400)
  const g = linearGradientLine(135)
  const same = linearGradientLine(135, 600, 400)
  assert.deepEqual(g, same)
})

test('the radial shape is the centred farthest-corner ellipse CSS draws', () => {
  const { cx, cy, r, scaleY } = radialGradientShape(600, 400)
  near(cx, 300, 'cx'); near(cy, 200, 'cy')
  near(r, 600 / Math.SQRT2, 'horizontal radius')
  near(r * scaleY, 400 / Math.SQRT2, 'vertical radius')
  for (const [x, y] of corners(600, 400)) {
    near(((x - cx) / r) ** 2 + ((y - cy) / (r * scaleY)) ** 2, 1, `corner ${x},${y} sits on the 100% ring`)
  }
  const sq = radialGradientShape(400, 400)
  near(sq.scaleY, 1, 'a square is a circle')
  near(sq.r, 400 / Math.SQRT2, 'square radius')
})

const attrs = (svg, tag) => {
  const el = svg.match(new RegExp(`<${tag}\\b[^>]*>`))[0]
  return Object.fromEntries([...el.matchAll(/([\w:]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]))
}

test('the linear SVG is in user space with the endpoints of the CSS gradient line', () => {
  for (const angle of [0, 45, 90, 135, 200]) {
    const svg = gradientSvg('Linear', angle, STOPS, 'srgb')
    const a = attrs(svg, 'linearGradient')
    assert.equal(a.gradientUnits, 'userSpaceOnUse', `${angle}deg units`)
    assert.ok(!/%/.test(`${a.x1}${a.y1}${a.x2}${a.y2}`), `${angle}deg endpoints are not percentages`)
    const g = linearGradientLine(angle)
    near(Number(a.x1), g.x1, `${angle}deg x1`, 0.006)
    near(Number(a.y1), g.y1, `${angle}deg y1`, 0.006)
    near(Number(a.x2), g.x2, `${angle}deg x2`, 0.006)
    near(Number(a.y2), g.y2, `${angle}deg y2`, 0.006)
  }
})

test('the SVG writes 0deg and 90deg as clean numbers', () => {
  const up = attrs(gradientSvg('Linear', 0, STOPS), 'linearGradient')
  assert.deepEqual([up.x1, up.y1, up.x2, up.y2], ['300', '400', '300', '0'])
  const right = attrs(gradientSvg('Linear', 90, STOPS), 'linearGradient')
  assert.deepEqual([right.x1, right.y1, right.x2, right.y2], ['0', '200', '600', '200'])
  assert.ok(!gradientSvg('Linear', 180, STOPS).includes('-0'), 'no negative zero')
})

test('the radial SVG is in user space on the 600x400 canvas', () => {
  const svg = gradientSvg('Radial', 0, STOPS, 'srgb')
  const a = attrs(svg, 'radialGradient')
  assert.equal(a.gradientUnits, 'userSpaceOnUse')
  assert.equal(a.cx, '300')
  assert.equal(a.cy, '200')
  near(Number(a.r), 600 / Math.SQRT2, 'r', 0.006)
  assert.match(a.gradientTransform, /^translate\(300 200\) scale\(1 0\.666667\) translate\(-300 -200\)$/)
  const scaleY = Number(a.gradientTransform.match(/scale\(1 ([\d.]+)\)/)[1])
  near(Number(a.r) * scaleY, 400 / Math.SQRT2, 'written vertical radius', 0.01)
})

test('the SVG keeps its canvas and one stop per position', () => {
  const svg = gradientSvg('Linear', 135, STOPS, 'srgb')
  assert.match(svg, /^<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http:\/\/www\.w3\.org\/2000\/svg">/)
  assert.match(svg, /<rect width="600" height="400" fill="url\(#grad\)" \/>/)
  assert.deepEqual([...svg.matchAll(/offset="(\d+)%" stop-color="(#\w{6})"/g)].map((m) => [m[1], m[2]]), [['0', '#FFD84D'], ['55', '#FF8A3D'], ['100', '#F0436A']])
})

test('an OKLCH SVG is sampled into more sRGB stops than the gradient has', () => {
  const svg = gradientSvg('Linear', 135, STOPS, 'oklch')
  assert.ok((svg.match(/<stop /g) || []).length > STOPS.length)
})

test('OKLCH CSS is two declarations: the sRGB twin first, then the OKLCH one', () => {
  const text = gradientCssText('Linear', 135, STOPS, 'oklch')
  const lines = text.split('\n')
  assert.equal(lines.length, 2)
  assert.equal(lines[0], 'background: linear-gradient(135deg, #FFD84D 0%, #FF8A3D 55%, #F0436A 100%);')
  assert.equal(lines[1], 'background: linear-gradient(135deg in oklch, #FFD84D 0%, #FF8A3D 55%, #F0436A 100%);')
  assert.ok(!lines[0].includes('oklch'), 'the fallback line says nothing about OKLCH')
  assert.ok(lines.every((l) => l.startsWith('background: ') && l.endsWith(';')), 'both lines are declarations on the same property')
})

test('sRGB CSS is one clean line', () => {
  assert.equal(gradientCssText('Linear', 135, STOPS, 'srgb'), 'background: linear-gradient(135deg, #FFD84D 0%, #FF8A3D 55%, #F0436A 100%);')
  assert.equal(gradientCssText('Linear', 135, STOPS, undefined).split('\n').length, 1)
})

test('the fallback follows the type: radial and conic keep their own shape', () => {
  const radial = gradientCssText('Radial', 0, STOPS, 'oklch').split('\n')
  assert.equal(radial[0], 'background: radial-gradient(#FFD84D 0%, #FF8A3D 55%, #F0436A 100%);')
  assert.equal(radial[1], 'background: radial-gradient(in oklch, #FFD84D 0%, #FF8A3D 55%, #F0436A 100%);')
  const conic = gradientCssText('Conic', 90, STOPS, 'oklch').split('\n')
  assert.equal(conic[0], 'background: conic-gradient(from 90deg at 50% 50%, #FFD84D 0%, #FF8A3D 55%, #F0436A 100%);')
  assert.equal(conic[1], 'background: conic-gradient(from 90deg at 50% 50% in oklch, #FFD84D 0%, #FF8A3D 55%, #F0436A 100%);')
})

test('the OKLCH line is the same gradient the canvas paints', () => {
  for (const type of ['Linear', 'Radial', 'Conic']) {
    const lines = gradientCssText(type, 200, STOPS, 'oklch').split('\n')
    assert.equal(lines[1], `background: ${gradientCssIn(type, 200, STOPS, 'oklch')};`)
  }
})

test('the code well and the Save or share menu both use the one function', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /return gradientCssText\(type, angle, stops, space\)/)
  assert.match(src, /copyExport\(gradientCssText\(type, angle, stops, space\)\)/)
  assert.ok(!/`background: \$\{css\};`/.test(src), 'no second hand-built CSS line in the page')
})
