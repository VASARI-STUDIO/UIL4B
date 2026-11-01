// The Button Library's data: every snippet carries the states a button owes,
// every colour pair is MEASURED (not trusted), and the edits can only reach
// combinations the designs were checked against.
//
// MUTATIONS this file goes red on:
//   - drop the `@media (hover: hover)` wrapper around the hover rule in buttonCss;
//   - change an accent's `hover` or `softHover` to a pale colour (the contrast test);
//   - drop `calm` from the reduced-motion block so a transform stays in it;
//   - let resolveEdits accept any string (the unknown-value test).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  BUTTON_ACCENTS,
  BUTTON_CORNERS,
  BUTTON_DANGER,
  BUTTON_EDIT_GROUPS,
  BUTTON_ITEMS,
  BUTTON_ROLES,
  BUTTON_SIZES,
  BUTTON_STAGE,
  buttonCss,
  buttonHtml,
  buttonPreviewCss,
  buttonPrompt,
  filterButtons,
  isEdited,
  resolveEdits,
} from '../../src/data/buttonLibrary.js'

// ── WCAG contrast, written out ─────────────────────────────────────────────
const channel = (v) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// ── Reading the CSS back ───────────────────────────────────────────────────
const mediaBlocks = (css) => css.match(/@media[^{]+\{[\s\S]*?\n\}/g) || []
const outsideMedia = (css) => mediaBlocks(css).reduce((s, b) => s.replace(b, ''), css)
const mediaBlock = (css, query) => mediaBlocks(css).find((b) => b.startsWith(`@media ${query}`)) || ''
const baseVars = (css) => {
  const first = css.slice(0, css.indexOf('\n}'))
  const out = {}
  for (const m of first.matchAll(/^\s*(--button-[a-z-]+): (#[0-9a-f]{6});$/gm)) out[m[1]] = m[2]
  return out
}

const accentsFor = (item) => (item.edits.includes('accent') ? Object.keys(BUTTON_ACCENTS) : [item.defaults.accent])

test('ten designs, each with a unique id and class', () => {
  assert.equal(BUTTON_ITEMS.length, 10)
  assert.equal(new Set(BUTTON_ITEMS.map((b) => b.id)).size, BUTTON_ITEMS.length)
  assert.equal(new Set(BUTTON_ITEMS.map((b) => b.cls)).size, BUTTON_ITEMS.length)
  const roles = new Set(BUTTON_ROLES.map((r) => r.id))
  for (const b of BUTTON_ITEMS) assert.ok(roles.has(b.role), `${b.id}: unknown role ${b.role}`)
})

for (const item of BUTTON_ITEMS) {
  test(`${item.id}: carries every state a button owes`, () => {
    const css = buttonCss(item)
    const hover = mediaBlock(css, '(hover: hover)')
    assert.ok(hover.includes(`.${item.cls}:hover`), 'hover rule is not inside @media (hover: hover)')
    assert.ok(!outsideMedia(css).includes(':hover'), 'a :hover rule sits outside the hover media query')
    assert.match(css, new RegExp(`\\.${item.cls}:active`), 'no :active')
    assert.match(css, new RegExp(`\\.${item.cls}:focus-visible \\{[^}]*outline: 2px solid`), 'no visible focus ring')
    assert.match(css, new RegExp(`\\.${item.cls}:disabled \\{[^}]*opacity`), 'no disabled state')
    assert.match(mediaBlock(css, '(pointer: coarse)'), /min-height: 44px/, 'no 44px touch floor')
    assert.ok(mediaBlock(css, '(prefers-reduced-motion: reduce)'), 'no reduced-motion block')
    // A disabled button never reacts.
    assert.match(css, new RegExp(`\\.${item.cls}:active:not\\(:disabled\\)`))
  })

  test(`${item.id}: no gradient, no transition: all, no glow`, () => {
    const css = buttonCss(item)
    assert.doesNotMatch(css, /gradient/i)
    assert.doesNotMatch(css, /transition:\s*all/i)
    assert.doesNotMatch(css, /drop-shadow|filter:|text-shadow|backdrop/i)
    // The only shadow is the offset design's hard one: no blur radius.
    for (const m of css.matchAll(/box-shadow: ([^;]+);/g)) {
      assert.match(m[1], /^-?\d+px -?\d+px 0 var\(--button-edge\)$/, `a blurred shadow: ${m[1]}`)
    }
    assert.doesNotMatch(css, /#000000|#000;|#fff(fff)?;/i, 'pure black or white')
  })

  test(`${item.id}: reduced motion drops every movement and keeps a static cue`, () => {
    const css = buttonCss(item)
    const reduced = mediaBlock(css, '(prefers-reduced-motion: reduce)')
    assert.doesNotMatch(reduced, /scale\(|translate/, 'the reduced block still moves something')
    const transition = reduced.match(/transition: ([^;]+);/)
    assert.ok(transition, 'the reduced block does not restate the transition')
    assert.doesNotMatch(transition[1], /transform|box-shadow/, 'the reduced transition still names a movement')
    // Anything that moved at rest-state-change time is put back.
    const normal = css.replace(reduced, '')
    for (const state of ['hover', 'active']) {
      const rule = normal.match(new RegExp(`\\.${item.cls}:${state}:not\\(:disabled\\) \\{([^}]*)\\}`))
      if (rule && /transform: (scale|translate)/.test(rule[1])) {
        assert.match(reduced, new RegExp(`:${state}:not\\(:disabled\\) \\{[^}]*transform: none`), `${state} movement is not settled`)
      }
    }
    // The hover and pressed states still change something that is not movement.
    const hoverRule = normal.match(new RegExp(`\\.${item.cls}:hover:not\\(:disabled\\) \\{([^}]*)\\}`))[1]
    assert.match(hoverRule, /background:|text-decoration-thickness:|svg/, `${item.id} has no static hover cue`)
  })

  test(`${item.id}: text keeps 4.5:1 in every state, in every colour`, () => {
    for (const accent of accentsFor(item)) {
      const css = buttonCss(item, { accent })
      const v = baseVars(css)
      const fg = v['--button-fg']
      assert.ok(fg, `${item.id}/${accent}: no text colour`)
      const backs = [v['--button-bg'], v['--button-bg-hover'], v['--button-bg-active']].filter(Boolean)
      // Transparent at rest: the text sits on the stage.
      if (!v['--button-bg']) backs.push(BUTTON_STAGE)
      for (const bg of backs) {
        const ratio = contrast(fg, bg)
        assert.ok(ratio >= 4.5, `${item.id}/${accent}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`)
      }
      if (v['--button-fg-active']) {
        const ratio = contrast(v['--button-fg-active'], BUTTON_STAGE)
        assert.ok(ratio >= 4.5, `${item.id}/${accent}: pressed text is ${ratio.toFixed(2)}:1`)
      }
    }
  })
}

test('a filled button is 3:1 against the page it sits on, in every colour', () => {
  for (const item of BUTTON_ITEMS.filter((b) => ['solid', 'block', 'arrow', 'danger'].includes(b.id))) {
    for (const accent of accentsFor(item)) {
      const solid = baseVars(buttonCss(item, { accent }))['--button-bg']
      assert.ok(contrast(solid, BUTTON_STAGE) >= 3, `${item.id}/${accent}: ${solid} on the page`)
    }
  }
  // The offset design's outline is the ink.
  assert.ok(contrast(baseVars(buttonCss(BUTTON_ITEMS.find((b) => b.id === 'offset')))['--button-edge'], BUTTON_STAGE) >= 3)
})

test('the stage colour in the page sheet is the stage the contrast is measured on', () => {
  const sheet = fs.readFileSync(new URL('../../src/styles/pages/button-library.css', import.meta.url), 'utf8')
  assert.ok(sheet.includes(`background:${BUTTON_STAGE}`), 'the stage in button-library.css is not BUTTON_STAGE')
})

test('resolveEdits ignores anything outside the closed sets', () => {
  const solid = BUTTON_ITEMS.find((b) => b.id === 'solid')
  assert.deepEqual(resolveEdits(solid, { size: 'huge', corners: 'bevel', accent: 'pink' }), solid.defaults)
  assert.deepEqual(resolveEdits(solid, { size: 'toString', accent: '__proto__', corners: 'constructor' }), solid.defaults)
  assert.deepEqual(resolveEdits(solid, { size: 12, corners: null, accent: ['blue'] }), solid.defaults)
  assert.deepEqual(resolveEdits(solid, undefined), solid.defaults)
  assert.deepEqual(resolveEdits(solid, { size: 'large', corners: 'round', accent: 'green' }), { size: 'large', corners: 'round', accent: 'green' })
  // An edit the design does not offer is dropped, however valid the value.
  const danger = BUTTON_ITEMS.find((b) => b.id === 'danger')
  assert.equal(resolveEdits(danger, { accent: 'blue' }).accent, 'danger')
  const link = BUTTON_ITEMS.find((b) => b.id === 'link')
  assert.equal(resolveEdits(link, { corners: 'round' }).corners, link.defaults.corners)
  assert.ok(!buttonCss(link, { corners: 'round' }).includes('border-radius'))
})

test('an edit rewrites the CSS, and isEdited says so', () => {
  const solid = BUTTON_ITEMS.find((b) => b.id === 'solid')
  assert.equal(isEdited(solid, {}), false)
  assert.equal(isEdited(solid, { size: 'huge' }), false)
  assert.equal(isEdited(solid, { size: 'large' }), true)
  assert.equal(isEdited(solid, { size: solid.defaults.size }), false)
  assert.match(buttonCss(solid, { size: 'large' }), /--button-pad-y: 16px/)
  assert.match(buttonCss(solid, { corners: 'round' }), /--button-radius: 999px/)
  assert.match(buttonCss(solid, { accent: 'violet' }), new RegExp(`--button-bg: ${BUTTON_ACCENTS.violet.solid}`))
  assert.notEqual(buttonCss(solid, { accent: 'green' }), buttonCss(solid))
})

test('the edit groups list exactly the closed sets', () => {
  assert.deepEqual(BUTTON_EDIT_GROUPS.size.options.map((o) => o.id), Object.keys(BUTTON_SIZES))
  assert.deepEqual(BUTTON_EDIT_GROUPS.corners.options.map((o) => o.id), Object.keys(BUTTON_CORNERS))
  assert.deepEqual(BUTTON_EDIT_GROUPS.accent.options.map((o) => o.id), Object.keys(BUTTON_ACCENTS))
  assert.ok(!('danger' in BUTTON_ACCENTS) && BUTTON_DANGER.id === 'danger')
})

test('the prompt carries the exact CSS and HTML the card copies', () => {
  for (const item of BUTTON_ITEMS) {
    for (const edits of [{}, { size: 'small', corners: 'square', accent: 'green' }]) {
      const prompt = buttonPrompt(item, edits)
      assert.ok(prompt.includes(buttonCss(item, edits).trimEnd()), `${item.id}: prompt lacks the CSS`)
      assert.ok(prompt.includes(buttonHtml(item).trimEnd()), `${item.id}: prompt lacks the HTML`)
    }
  }
})

test('the preview sheet is scoped: no rule reaches outside the stage', () => {
  const css = buttonPreviewCss('.blib-stage')
  const selectors = [...css.matchAll(/^\s*([^@\s{}][^{\n]*)\{$/gm)].map((m) => m[1].trim())
  assert.ok(selectors.length > 40)
  for (const s of selectors) assert.ok(s.startsWith('.blib-stage '), `unscoped selector: ${s}`)
  assert.ok(!buttonCss(BUTTON_ITEMS[0]).includes('.blib-stage'), 'the copied snippet is scoped')
})

test('filterButtons narrows by role and by words', () => {
  assert.equal(filterButtons().length, BUTTON_ITEMS.length)
  assert.ok(filterButtons({ role: 'destructive' }).every((b) => b.role === 'destructive'))
  assert.deepEqual(filterButtons({ query: 'forgot' }).map((b) => b.id), ['link'])
  assert.deepEqual(filterButtons({ role: 'primary', query: 'forgot' }), [])
})
