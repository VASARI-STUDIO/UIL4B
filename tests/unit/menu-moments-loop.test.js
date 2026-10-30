// Every mega menu hover moment loops while its row is live, and none of them loops
// under reduced motion.
//
// The moments are CSS (global.css, "HOVER MOMENTS"). A row that is live carries
// [data-live]; the loop is an `animation` with `infinite` on a rule under that
// attribute, inside the hover-capable media query so touch gets nothing. The
// end-state rules beside it are the reduced-motion look, so each moment also needs
// the house pair of overrides (site setting, then the OS query unless the site
// setting says motion is on) that switches its animation off.
//
// Font Gallery is the one moment that is not CSS: PillNav steps the name through the
// ready faces on a timer, and menuMoments.js cuts that to one face under reduced
// motion. It is checked in the source instead.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { MOMENT_OF } from '../../src/components/nav/menuMoments.js'
import { GLOBAL_CSS } from './appStylesheets.js'

const JS_LOOPED = new Set(['font-gallery'])
const IDS = [...new Set(Object.values(MOMENT_OF))]
const CSS_IDS = IDS.filter((id) => !JS_LOOPED.has(id))

// Comments out first (the section is full of prose that mentions these words), then a
// flat list of rules with the at-rule prelude each one sits inside.
const CSS = GLOBAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
function parse(src) {
  const rules = []
  const keyframes = new Map()
  const walk = (text, atRules) => {
    let i = 0
    while (i < text.length) {
      const open = text.indexOf('{', i)
      if (open < 0) break
      // A statement at-rule (`@import x;`) before a rule is not part of that rule's head.
      const before = text.slice(i, open)
      const head = before.slice(before.lastIndexOf(';') + 1).trim()
      let depth = 0
      let close = open
      for (; close < text.length; close++) {
        if (text[close] === '{') depth++
        else if (text[close] === '}' && --depth === 0) break
      }
      const body = text.slice(open + 1, close)
      if (head.startsWith('@keyframes')) keyframes.set(head.split(/\s+/)[1], body)
      else if (head.startsWith('@')) walk(body, [...atRules, head])
      else rules.push({ selector: head, body, atRules })
      i = close + 1
    }
  }
  walk(src, [])
  return { rules, keyframes }
}
const { rules, keyframes } = parse(CSS)
const has = (selector, id) => selector.includes(`[data-moment="${id}"]`)
const animationOf = (body) => (body.match(/(?:^|;)\s*animation\s*:\s*([^;]+)/) || [])[1] || ''

test('the menu has moments to check', () => {
  assert.ok(IDS.length >= 18, `expected all 18 distinct moments, got ${IDS.length}`)
  assert.ok(rules.length > 100, 'the stylesheet parsed into rules')
})

for (const id of CSS_IDS) {
  test(`${id}: loops forever while the row is live, on a fine pointer only`, () => {
    const loops = rules.filter((r) => has(r.selector, id) && r.selector.includes('[data-live]') && /\binfinite\b/.test(animationOf(r.body)))
    assert.ok(loops.length, `no rule under [data-live] gives ${id} an infinite animation`)
    for (const r of loops) {
      assert.ok(r.atRules.some((a) => a.includes('hover:hover') && a.includes('pointer:fine')), `${r.selector} is outside the hover media query`)
      for (const name of animationOf(r.body).split(',').map((a) => a.trim().split(/\s+/)[0])) {
        assert.ok(keyframes.has(name), `${r.selector} names @keyframes ${name}, which does not exist`)
      }
    }
  })

  test(`${id}: switched off under reduced motion, both the site setting and the OS`, () => {
    const off = (guard, inMedia) => rules.some((r) =>
      has(r.selector, id) && r.selector.startsWith(guard) && /^\s*animation\s*:\s*none\s*;?\s*$/.test(r.body)
      && r.atRules.some((a) => a.includes('prefers-reduced-motion')) === inMedia)
    assert.ok(off('html[data-reduced-motion="true"]', false), `no html[data-reduced-motion="true"] override for ${id}`)
    assert.ok(off('html:not([data-reduced-motion="false"])', true), `no OS reduced-motion override (with the guard) for ${id}`)
  })
}

test('font-gallery: loops on a timer and holds one face under reduced motion', () => {
  const root = process.cwd()
  const nav = fs.readFileSync(path.join(root, 'src/components/PillNav.jsx'), 'utf8')
  const moments = fs.readFileSync(path.join(root, 'src/components/nav/menuMoments.js'), 'utf8')
  assert.match(nav, /setTimeout\(tick, GALLERY_STEP_MS\)/)
  assert.match(moments, /if \(reducedMotion\(\)\) return \[/)
})

test('keyframes only move what cannot cause layout (plus the Font Pair face)', () => {
  const allowed = new Set([
    'transform', 'opacity', 'clip-path', 'fill-opacity', 'stroke-width', 'background-position',
    'animation-timing-function', 'font-family', 'font-weight', 'font-size-adjust',
  ])
  const layout = new Set(['font-family', 'font-weight', 'font-size-adjust'])
  for (const [name, body] of keyframes) {
    if (!name.startsWith('mm-')) continue
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1])
    for (const p of props) assert.ok(allowed.has(p), `@keyframes ${name} animates ${p}`)
    if (props.some((p) => layout.has(p))) assert.match(name, /^mm-pair-/, `${name} changes the typeface; only Font Pair may`)
  }
})

test('the moments never use transition: all', () => {
  const start = CSS.indexOf('.pnav-tool-nm{display:inline-block')
  const end = CSS.indexOf('.pnav-editorial{flex:0 0')
  assert.ok(start > 0 && end > start)
  assert.doesNotMatch(CSS.slice(start, end), /transition\s*:\s*all/)
})
