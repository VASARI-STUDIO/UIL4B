// The four state roles, checked as NUMBERS — and checked against the value the
// CASCADE lands on, not the first one the file happens to declare.
//
// WHY THAT DISTINCTION IS THE WHOLE POINT OF THIS FILE.
// --ok / --warn / --err are each declared TWICE for the light theme: once in the
// [data-theme="light"] block at the top of global.css (#16a34a / #ca8a04 /
// #dc2626) and again in the Foundry [data-theme="light"] block much further
// down (#15803D / #A16207 / #DC2626). Both selectors are (0,1,0), so the LATER
// one wins and the early trio has been dead for as long as both have existed.
//
// That is not a hypothetical. The backlog item this test closes was filed with
// measurements of the DEAD values — --ok at 2.84:1 on the page ground — and the
// remedy it proposed was sized against them. The live --ok was already 4.32
// there. Reading a token out of global.css by grepping for its name gives you
// whichever declaration you happen to hit first, and that is how a whole item
// came to be written about colours the app does not paint. So this file
// RESOLVES each token the way a browser would (last matching declaration wins)
// and then does the arithmetic on the result.
//
// It also guards the sizing rule that makes two tokens per role necessary:
// nearly every state badge in this codebase paints its text on a color-mix TINT
// OF ITS OWN COLOUR, which is a darker ground in light theme than the card it
// sits on. A 16% --err tint drops --err from 4.83:1 to 3.76:1. Checking the
// bare grounds alone would call that safe.
//
// The rendered half is tests/user-sim/43-state-token-contrast.spec.js, which
// walks real text nodes. This half is the cheap one.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')
// Blank out comments before parsing. global.css documents these tokens with
// measurement tables full of hex literals, and this file's own prose names the
// dead values — both would otherwise parse as declarations.
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

const srgb = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
const rgb = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const lumOf = (c) => 0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2])
const ratio = (a, b) => {
  const hi = Math.max(lumOf(a), lumOf(b))
  const lo = Math.min(lumOf(a), lumOf(b))
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}
const mix = (fg, pct, bg) => fg.map((c, i) => c * (pct / 100) + bg[i] * (1 - pct / 100))

// Every `selector{...}` block, in source order.
const blocks = []
{
  let depth = 0, selStart = 0, bodyStart = 0, sel = ''
  for (let i = 0; i < CSS.length; i++) {
    const c = CSS[i]
    if (c === '{') { if (depth === 0) { sel = CSS.slice(selStart, i).trim(); bodyStart = i + 1 } depth++ }
    else if (c === '}') { depth--; if (depth === 0) { blocks.push({ sel, body: CSS.slice(bodyStart, i) }); selStart = i + 1 } }
  }
}

// Resolve a custom property for one theme the way the cascade does: every block
// whose selector matches (`:root`, or that theme's [data-theme]) contributes,
// and the last declaration wins. All the selectors involved are (0,1,0), so
// source order is the only tie-break — which is exactly the trap being guarded.
const resolve = (name, theme) => {
  let value = null
  for (const b of blocks) {
    const s = b.sel
    const matches = s === ':root' || s === `[data-theme="${theme}"]`
      || s === `:root,[data-theme="${theme}"]` || s === `:root, [data-theme="${theme}"]`
    if (!matches) continue
    const re = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*(?:;|$)`, 'g')
    let m
    while ((m = re.exec(b.body)) !== null) value = m[1]
  }
  return value
}

const GROUNDS = {
  light: { '--bg-0': '#EFEEE9', 'card': '#FFFFFF', '--bg-2': '#F6F5F1', '--bg-3': '#E4E2DA' },
  dark: { '--bg-0': '#101012', '--bg-1': '#151619', '--bg-2': '#191A1D', '--bg-3': '#212327' },
}
// The tint percentages global.css actually pairs with these tokens.
const TINTS = [6, 7, 8, 10, 12, 14, 15, 16, 18]
const ROLES = ['ok', 'warn', 'err']
const AA = 4.5

test('the light state tokens resolve to the Foundry block, not the dead early one', () => {
  // If someone "fixes" contrast by editing the early block, this fails and says
  // why: that block is unreachable for these three tokens.
  assert.equal(resolve('--ok', 'light'), '#15803D')
  assert.equal(resolve('--warn', 'light'), '#A16207')
  assert.equal(resolve('--err', 'light'), '#DC2626')

  // And prove the early block really is overridden rather than absent, so this
  // test cannot quietly start passing because the duplication was removed
  // without anyone re-checking which value survived.
  const lightBlocks = blocks.filter((b) => b.sel === '[data-theme="light"]' && /(?:^|;)\s*--ok\s*:/.test(b.body))
  assert.ok(lightBlocks.length >= 2,
    'expected --ok to be declared in more than one [data-theme="light"] block; '
    + 'if that is no longer true, re-read which value the page paints before editing this test')
  assert.match(lightBlocks[0].body, /--ok:#16a34a/, 'the first (dead) declaration')
})

test('every state role declares a -strong companion and an -fg in both themes', () => {
  for (const theme of ['light', 'dark']) {
    for (const r of ROLES) {
      for (const suffix of ['-strong', '-fg']) {
        const v = resolve(`--${r}${suffix}`, theme)
        assert.ok(v, `--${r}${suffix} is not declared for the ${theme} theme`)
      }
    }
  }
})

test('-strong clears AA as small text on every bare ground, in both themes', () => {
  const bad = []
  for (const theme of ['light', 'dark']) {
    for (const r of ROLES) {
      const ink = rgb(resolve(`--${r}-strong`, theme))
      for (const [name, g] of Object.entries(GROUNDS[theme])) {
        const v = ratio(ink, rgb(g))
        if (v < AA) bad.push(`${theme} --${r}-strong on ${name}: ${v}`)
      }
    }
  }
  assert.deepEqual(bad, [])
})

test('-strong clears AA on its own tint, which is the ground these badges use', () => {
  // The case bare grounds miss. .tag-pass, .sub-save, .cs-sw-badge.*,
  // .smap-stage and ~20 more paint their text on a
  // color-mix tint of the SAME token, so the ground moves with the colour.
  const bad = []
  for (const theme of ['light', 'dark']) {
    for (const r of ROLES) {
      const ink = rgb(resolve(`--${r}-strong`, theme))
      const base = rgb(resolve(`--${r}`, theme))
      for (const [name, g] of Object.entries(GROUNDS[theme])) {
        for (const t of TINTS) {
          const v = ratio(ink, mix(base, t, rgb(g)))
          if (v < AA) bad.push(`${theme} --${r}-strong on ${t}% --${r} over ${name}: ${v}`)
        }
      }
    }
  }
  assert.deepEqual(bad, [])
})

test('the base tokens stay usable at the 3:1 floor they are kept for', () => {
  // The base token still paints fills, borders, dots and glyph marks. Moving
  // text off it is only correct while it still clears 3:1 in those roles — if a
  // future retune drops it below that, the split stops being a fix.
  const bad = []
  for (const theme of ['light', 'dark']) {
    for (const r of ROLES) {
      const ink = rgb(resolve(`--${r}`, theme))
      for (const [name, g] of Object.entries(GROUNDS[theme])) {
        const v = ratio(ink, rgb(g))
        if (v < 3) bad.push(`${theme} --${r} on ${name}: ${v}`)
      }
    }
  }
  assert.deepEqual(bad, [])
})

test('-fg clears AA as the ink ON a filled state control', () => {
  // White is right in light and WRONG in dark: white on the dark --ok #4ade80
  // is 1.74:1. That inversion is the reason these are tokens rather than a
  // hard-coded #fff at each call site.
  const bad = []
  for (const theme of ['light', 'dark']) {
    for (const r of ROLES) {
      const fill = rgb(resolve(`--${r}`, theme))
      const ink = rgb(resolve(`--${r}-fg`, theme))
      const v = ratio(ink, fill)
      if (v < AA) bad.push(`${theme} --${r}-fg on --${r}: ${v}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('no rule paints a state token as small text without the -strong companion', () => {
  // The source half of the sweep. A new `color:var(--err)` added to a text rule
  // should fail here rather than wait to be measured in a browser. Rules that
  // legitimately keep the base token colour a glyph or an icon, so they are
  // matched by shape (svg / -ico / -icon / -mark) rather than by an allowlist
  // of names that would rot.
  const offenders = []
  for (const b of blocks) {
    if (/^@/.test(b.sel) || !b.sel) continue
    const m = b.body.match(/(?:^|;)\s*color:var\(--(ok|warn|err)\)/)
    if (!m) continue
    const glyph = /\bsvg\b|-ico\b|-icon\b|-glyph\b|-mark\b|-dot\b/.test(b.sel)
    if (!glyph) offenders.push(`${b.sel} { color:var(--${m[1]}) }`)
  }
  assert.deepEqual(offenders, [],
    'these paint a state token as text; use --<role>-strong, or make it a glyph')
})
