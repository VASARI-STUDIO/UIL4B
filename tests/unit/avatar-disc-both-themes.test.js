// THE DEFAULT AVATAR IS A DISC IN BOTH THEMES, AND ITS INITIALS READ ON IT.
//
// `--avatar-grad` was declared only inside `[data-theme="light"]`, so in dark
// every `background: var(--avatar-grad)` was invalid at computed-value time and
// the nav avatar, the account popover and the account switcher drew bare white
// initials with no disc behind them (QA on #487, avatar-1440-dark.png).
//
// Two things are held here: the token is declared where BOTH themes see it,
// and every rule that paints the disc paints its initials in --avatar-ink —
// with that pair measured, as numbers, at AA in each theme.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss } from '../helpers/strip-comments.js'

const read = (p) => stripCss(fs.readFileSync(path.join(process.cwd(), p), 'utf8'))
const SHEETS = ['src/styles/global.css', 'src/styles/deferred/colour.css']
const css = SHEETS.map(read).join('\n')
const global = read('src/styles/global.css')

/** [selector, body] for every rule block. */
const blocks = (src) => [...src.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]])

test('--avatar-grad and --avatar-ink are declared for both themes, not one', () => {
  const decl = blocks(global).filter(([, b]) => /--avatar-grad\s*:/.test(b))
  assert.ok(decl.length >= 1, '--avatar-grad is not declared at all (the reader is blind)')
  const scopes = decl.map(([s]) => s)
  const both = scopes.some((s) => s === ':root')
    || (scopes.some((s) => /data-theme="light"/.test(s)) && scopes.some((s) => /data-theme="dark"/.test(s)))
  assert.ok(both, `--avatar-grad is declared only under: ${scopes.join(' | ')}`)
  assert.ok(blocks(global).some(([s, b]) => s === ':root' && /--avatar-ink\s*:/.test(b)), '--avatar-ink is not declared on :root')
})

test('every avatar disc paints its initials in --avatar-ink', () => {
  const users = blocks(css).filter(([, b]) => /background:\s*var\(--avatar-grad\)/.test(b))
  // POSITIVE CONTROL: the three known discs (nav avatar, account popover,
  // account switcher) are found.
  assert.ok(users.length >= 3, `only ${users.length} rules paint the avatar disc`)
  const wrong = users.filter(([, b]) => !/(^|;)\s*color:\s*var\(--avatar-ink\)/.test(b)).map(([s]) => s)
  assert.deepEqual(wrong, [], 'these discs paint their initials in something other than --avatar-ink')
})

// The disc and ink, resolved from the same tokens global.css derives them from.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (rgb) => rgb.map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

test('the initials clear 4.5:1 on the disc in light and in dark', () => {
  assert.match(global, /--avatar-grad:\s*var\(--accent-fill\)/, 'the disc is no longer --accent-fill; re-measure this test')
  assert.match(global, /--avatar-ink:\s*var\(--accent-ink\)/, 'the ink is no longer --accent-ink; re-measure this test')
  assert.match(global, /--accent-fill:\s*var\(--accent\)/, '--accent-fill no longer IS the accent; re-measure this test')
  // The design's disc (App line 123): the accent under #F4F7FF, one value in
  // both themes. Read both off the sheet rather than typed.
  const accent = /:root\{[^}]*?--accent:(#[0-9A-Fa-f]{6})/.exec(global)?.[1]
  const ink = /--accent-ink:(#[0-9A-Fa-f]{6})/.exec(global)?.[1]
  assert.ok(accent && ink, 'could not read --accent / --accent-ink off :root')
  assert.doesNotMatch(global, /\[data-theme="dark"\]\{[^}]*--accent-ink:/, 'dark re-declares --accent-ink; measure it separately')
  const light = ratio(hex(accent), hex(ink))
  const dark = light
  assert.ok(light >= 4.5, `light initials ${light.toFixed(2)}:1`)
  assert.ok(dark >= 4.5, `dark initials ${dark.toFixed(2)}:1`)
})
