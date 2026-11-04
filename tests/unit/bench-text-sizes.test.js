// THE HOME BENCH SETS TEXT IN THREE SIZES: 12, 13 AND 15.
//
// Inside `.sp-panel` the stylesheet defines --bt-s / --bt-m / --bt-l as 12px,
// 13px and 15px, and every bench rule is meant to use one of the three, either as
// the token or as the literal. This reads spectrum.css and fails on any
// `font-size` in a rule that names a bench class and is not one of those, so a
// 12.5px, 13.5px, 14px, .9375rem or 11px cannot creep back in.
//
// WHAT THIS CATCHES THAT THE BROWSER CHECK CANNOT. tests/user-sim/155-bench-
// acceptance.spec.js measures computed sizes on the rendered bench, which is the
// truth about what a visitor sees, but the cascade can hide a wrong rule: a
// `.sp-quality > span { font-size: 12.5px }` loses to the more specific
// `.sp-panel .sp-quality > .sp-quality-row`, so the page still measures 13px
// while the dead rule waits for someone to move a selector. This test reads the
// rules, the spec reads the page; each fails where the other is blind.
//
// "Bench classes" are every `sp-*` class named in the bench components, so a new
// class added to the JSX is covered without editing this file.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const COMPONENTS = ['SpectrumBench.jsx', 'BenchConverter.jsx', 'ToolFoot.jsx', 'OpenPill.jsx']
const BENCH_CLASSES = new Set(
  COMPONENTS.flatMap((f) => [...read(`src/components/spectrum/${f}`).matchAll(/sp-[a-z0-9-]+/g)].map((m) => m[0])),
)

const CSS = read('src/styles/pages/spectrum.css').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))

const ALLOWED = /^(12px|13px|15px|var\(--bt-[sml]\)|inherit)$/

// Every exemption names the selector and the exact value it excuses, and why.
// An exemption that no longer matches a rule fails the "no stale exemption"
// test, so this list cannot quietly outlive the CSS it covers.
const EXEMPT = [
  // Icon glyph sizes: a font-size on an icon is its drawn size, not text.
  { sel: '.sp-shuffle .sp-ph', value: '14px', why: 'icon glyph' },
  { sel: '.sp-find .sp-ph', value: '14px', why: 'icon glyph' },
  { sel: '.sp-modes .sp-ph', value: '14px', why: 'icon glyph' },
  { sel: '.sp-model-wire .sp-ph', value: '16px', why: 'icon glyph' },
  { sel: '.sp-fontrow-add', value: '14px', why: 'plus / check glyph' },
  { sel: '.sp-role-copy', value: '14px', why: 'copy glyph (the spec draws it at 14px)' },
  { sel: '.sp-panel .sp-shuffle', value: '16px', why: 'shuffle glyph inside the 36px icon button' },
  { sel: '.sp-ico-big', value: '52px', why: 'the picked icon, drawn large' },
  { sel: '.sp-panel .sp-ico-big', value: '128px', why: 'the picked icon, drawn large' },
  { sel: '.sp-panel .sp-ico-big', value: '56px', why: 'the picked icon, drawn large' },
  // Specimens: the text is the thing being shown, set in the family on show.
  { sel: '.sp-fontrow-w', value: '18px', why: 'weight specimen in the previewed family' },
  { sel: '.sp-font-pair b', value: '18px', why: 'pair specimen in the paired family' },
  // The converter's display figure and its units.
  { sel: '.sp-saving', value: '2.25rem', why: 'the saving figure is the window\'s display number' },
  { sel: '.sp-saving', value: 'clamp(36px, 10vw, 40px)', why: 'the saving figure at tablet and phone widths' },
  { sel: '.sp-saving', value: '30px', why: 'the saving figure at the narrowest widths' },
  { sel: '.sp-saving-num.is-noloss', value: '28px', why: '"No loss" in the display figure\'s slot' },
  { sel: '.sp-saving-num.is-noloss', value: '24px', why: '"No loss" in the display figure\'s slot, narrowest' },
  // Text fields at phone widths: 16px stops iOS zooming the page on focus.
  { sel: '.sp-find input, .sp-font-ctl input[type="text"]', value: '16px', why: 'iOS no-zoom floor on a phone' },
  // Not bench text: the heading beside the windows, and a CTA outside them.
  { sel: '.sp-bench-col .sp-h2', value: 'clamp(34px, 4.2vw, 60px)', why: 'the section heading, not a window' },
  { sel: '.sp-disc-cta .sp-pill-icon', value: '16px', why: 'icon glyph in a CTA outside the bench' },
]

/** Every `font-size` declaration in a rule that names a bench class. */
function benchFontSizes(css = CSS) {
  const found = []
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ')
    const classes = [...sel.matchAll(/\.(sp-[a-z0-9-]+)/g)].map((x) => x[1]).filter((c) => BENCH_CLASSES.has(c))
    if (!classes.length) continue
    const line = css.slice(0, m.index + m[0].indexOf(m[1].trim())).split('\n').length
    for (const d of m[2].matchAll(/(?:^|;)\s*font-size\s*:\s*([^;]+)/g)) {
      found.push({ sel, value: d[1].trim().replace(/\s*!important$/, ''), line })
    }
  }
  return found
}

const excused = (f) => EXEMPT.some((e) => e.sel === f.sel && e.value === f.value)

test('the reader finds the bench rules, so the checks below mean something', () => {
  const all = benchFontSizes()
  assert.ok(BENCH_CLASSES.size > 60, `only ${BENCH_CLASSES.size} bench classes were read from the components`)
  assert.ok(all.length > 40, `only ${all.length} bench font-size declarations were found`)
  assert.ok(all.some((f) => f.value === 'var(--bt-m)'), 'the bench no longer uses the middle token')
  assert.match(CSS, /\.sp-panel\s*\{\s*--bt-s:\s*12px;\s*--bt-m:\s*13px;\s*--bt-l:\s*15px;/, 'the three bench sizes are not 12, 13 and 15px')
})

test('every bench font-size is 12, 13 or 15px (or the token for one), bar the named exemptions', () => {
  const bad = benchFontSizes().filter((f) => !ALLOWED.test(f.value) && !excused(f))
  assert.deepEqual(
    bad.map((f) => `spectrum.css:${f.line}  ${f.sel} { font-size: ${f.value} }`),
    [],
    'a bench rule sets a text size outside 12 / 13 / 15px',
  )
})

test('no exemption is stale: each one still matches a rule in the stylesheet', () => {
  const all = benchFontSizes()
  const stale = EXEMPT.filter((e) => !all.some((f) => f.sel === e.sel && f.value === e.value))
  assert.deepEqual(stale.map((e) => `${e.sel} { font-size: ${e.value} }`), [], 'remove the exemption, or fix the selector it names')
})

test('the checker bites: sizes planted into the real stylesheet text are reported', () => {
  const sizes = ['12.5px', '13.5px', '14px', '.9375rem', '11px']
  const planted = sizes.map((v, i) => `\n.sp-quality > span.planted${i} { font-size: ${v}; }`).join('')
  const bad = benchFontSizes(`${CSS}${planted}`).filter((f) => !ALLOWED.test(f.value) && !excused(f))
  const real = benchFontSizes().filter((f) => !ALLOWED.test(f.value) && !excused(f))
  assert.deepEqual(bad.length - real.length, sizes.length, 'a planted off-scale size was let through')
  // The three allowed sizes, and their tokens, are not reported.
  const fine = ['12px', '13px', '15px', 'var(--bt-s)', 'var(--bt-m)', 'var(--bt-l)']
    .map((v, i) => `\n.sp-quality > span.fine${i} { font-size: ${v}; }`).join('')
  assert.equal(benchFontSizes(`${CSS}${fine}`).filter((f) => !ALLOWED.test(f.value) && !excused(f)).length, real.length)
})
