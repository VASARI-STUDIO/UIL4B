// THE ADMIN SURFACE TAKES ITS COLOUR, ITS FACE AND ITS MOTION FROM THE TOKENS.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY A SOURCE TEST AND NOT ONLY A RENDERED ONE
// ═══════════════════════════════════════════════════════════════════════════
// tests/user-sim/95-admin-spectrum.spec.js renders this surface and measures
// it, which is the evidence that matters — but it can only measure what is on
// screen at the moment it looks. A literal `rgba(239,68,68,.1)` sitting on a
// branch that needs a rejected prompt, a failed Stripe save or an unrecognised
// subscription status is invisible to it, and those are exactly the branches
// nobody opens for months.
//
// So the two halves are split deliberately:
//
//   the spec    the accent reaches the surface, the faces are right, nothing
//               overflows, nothing was lost — measured in a browser.
//   this file   no literal colour and no out-of-axis weight EXISTS in the
//               three files this surface is made of, on any branch.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT A LITERAL COSTS HERE, SPECIFICALLY
// ═══════════════════════════════════════════════════════════════════════════
// Two things, and the second is a feature rather than a nicety.
//
//   1. A literal has ONE value, and this product has two themes. The three
//      `rgba()` tints this file was written for were the LIGHT theme's amber,
//      emerald and red, frozen — so on dark ground they were a light tint
//      behind light text. Admin.jsx already records that exact fault being
//      fixed once for `#a855f7`, which "had no dark value at all"; the rgba()s
//      survived that sweep because an rgba() reads less like a hardcoded
//      colour than a hex does. It is the same thing.
//
//   2. PREMIUM THEME TEMPLATES WORK BY CHANGING `--accent` AND NOTHING ELSE.
//      That is the whole mechanism — a Pro customer picks a theme, one custom
//      property moves, and every border, wash, hover and chip in the product
//      follows. A blue typed into this surface keeps its old value while
//      everything around it turns, and nobody finds out until somebody has
//      paid for the theme. See the accent-family note in src/styles/global.css.
//
// MUTATION-VERIFIED: each assertion below was watched go red by putting the
// literal, the weight or the removal it names back into the file it names.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const CSS_REL = 'src/styles/deferred/admin.css'
const JSX_RELS = ['src/pages/Admin.jsx', 'src/components/admin/CommunityQueue.jsx']

const CSS = read(CSS_REL)
const SOURCES = [[CSS_REL, CSS], ...JSX_RELS.map((r) => [r, read(r)])]

/** Comments describe the old literals on purpose; they are not call sites. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

test('CONTROL: the three files are real and this test is reading them', () => {
  assert.ok(CSS.length > 20_000, `${CSS_REL} is ${CSS.length} bytes — too small to be the admin sheet`)
  for (const [rel, src] of SOURCES) {
    assert.ok(src.length > 4_000, `${rel} is ${src.length} bytes — this test is reading the wrong file`)
  }
  // The surface really does style itself with the accent family, or "no
  // literal blue" below is satisfied by a sheet that has no colour at all.
  assert.match(CSS, /var\(--accent-wash\)/, 'the sheet never uses the derived accent wash')
  assert.match(CSS, /var\(--accent-text\)/, 'the sheet never uses the derived accent text colour')
})

test('no literal colour anywhere in the admin surface', () => {
  // Hex triples/quads and the rgb()/hsl() families. `#` followed by digits in
  // prose ("#484", "#436") is not a colour, so a hex must be 3, 4, 6 or 8 hex
  // digits AND end at a non-word boundary.
  const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
  const FUNC = /\b(?:rgba?|hsla?)\s*\(/g

  const offenders = []
  for (const [rel, raw] of SOURCES) {
    const src = stripComments(raw)
    for (const m of src.matchAll(HEX)) {
      // A hex that is only digits is an issue number, not a colour.
      if (/^#\d+$/.test(m[0])) continue
      offenders.push(`${rel}: ${m[0]}`)
    }
    for (const m of src.matchAll(FUNC)) offenders.push(`${rel}: ${m[0]}…`)
  }

  assert.deepEqual(offenders, [],
    'a literal colour is back on the admin surface. It has one value and this '
    + 'product has two themes, and it will not follow a premium theme template. '
    + 'Use a token or a color-mix() of one:\n  ' + offenders.join('\n  '))
})

test('no literal font family — the faces come from --font and --mono', () => {
  const offenders = []
  for (const [rel, raw] of SOURCES) {
    const src = stripComments(raw)
    // A quoted family name in a font declaration, in CSS or in JSX.
    for (const m of src.matchAll(/font-?[fF]amily\s*[:=]\s*["'`]?\s*(?!var\()([^;,"'`}\n]+)/g)) {
      const value = m[1].trim()
      if (!value || value.startsWith('var(')) continue
      if (/^(inherit|initial|unset|revert)$/.test(value)) continue
      offenders.push(`${rel}: font-family: ${value}`)
    }
  }
  assert.deepEqual(offenders, [],
    'a font family is named directly instead of through --font / --mono:\n  ' + offenders.join('\n  '))
})

test('every weight the surface asks for is inside Geist\'s 300..700 axis', () => {
  // hero-entrance.test.js walks src/styles/** and covers the CSS half. It
  // cannot see an SVG attribute in JSX — `fontWeight="800"` on the donut total
  // was exactly that, and was being clamped to 700 by the renderer with nobody
  // choosing it. Both spellings are checked here.
  const found = []
  for (const [rel, raw] of SOURCES) {
    const src = stripComments(raw)
    for (const m of src.matchAll(/font-?[wW]eight\s*[:=]\s*["'{]?\s*(\d{3})/g)) {
      found.push({ rel, weight: Number(m[1]), text: m[0] })
    }
  }
  assert.ok(found.length >= 8, `only ${found.length} weights found — the matcher is not reading these files`)
  const out = found.filter((f) => f.weight < 300 || f.weight > 700)
  assert.deepEqual(out.map((f) => `${f.rel}: ${f.text}`), [],
    'a weight outside Geist\'s variable axis. The renderer clamps it silently, '
    + 'so the page ships a weight nobody chose — remap it rather than leaving it.')
})

test('every value a person reads is in the mono face', () => {
  // The rule that makes this surface look like this product. Each selector
  // below is a figure, an id, a date or a status — something read off the
  // screen or copied — and each must be carried by var(--mono).
  const MUST_BE_MONO = [
    '.adm-stat-value',
    '.adm-user-view-n',
    '.adm-bar-value',
    '.adm-donut-count',
    '.adm-list-value',
    '.adm-user-count',
    '.adm-copy-value',
    '.adm-plan-interval',
    '.adm-tab-badge',
  ]
  const missing = MUST_BE_MONO.filter((sel) => {
    // The selector appears in some rule whose block sets the mono family.
    const re = new RegExp(`(^|[,\\s])${sel.replace('.', '\\.')}\\s*[,{][^}]*?font-family:\\s*var\\(--mono\\)`, 's')
    // Rules are authored as selector lists, so search each block that names it.
    const blocks = [...CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    return !blocks.some(([, selector, body]) => (
      selector.split(',').some((s) => s.trim() === sel)
      && /font-family:\s*var\(--mono\)/.test(body)
    )) && !re.test(CSS)
  })
  assert.deepEqual(missing, [],
    'these carry a value a person reads and are not in var(--mono):\n  ' + missing.join('\n  '))

  // AND THE OTHER HALF: the mono rule must not have been applied to the whole
  // surface, which would satisfy the list above and destroy the contrast it
  // exists to create.
  assert.ok(!/^\s*\.adm\s*\{[^}]*font-family:\s*var\(--mono\)/m.test(CSS),
    'the whole .adm surface is set in mono — the value/prose contrast is gone')
})

/* ── READ THE DECLARATIONS, NOT THE PROSE ABOUT THEM ───────────────────────
 * Both assertions below were BLIND in their first form, and mutation is what
 * showed it: this file explains the house curve and the reduced-motion rule in
 * its own comments, so a search of the raw text found `cubic-bezier(.23,1,
 * .32,1)` and `.adm-tab:active` in the COMMENTARY and passed with the real
 * declarations deleted. The comment-stripped copy is the only honest subject. */
const CSS_CODE = stripComments(CSS)

test('the house curve is on the real declarations, not just described in them', () => {
  // MUTATION-VERIFIED: replacing the curve with `ease` in the declarations —
  // and leaving every comment about it in place — turns this red.
  const uses = [...CSS_CODE.matchAll(/cubic-bezier\(\s*\.23\s*,\s*1\s*,\s*\.32\s*,\s*1\s*\)/g)]
  assert.ok(uses.length >= 1,
    'the house motion curve `cubic-bezier(.23,1,.32,1)` appears in no declaration on this surface')

  // And it is actually reached by the controls, rather than defined and unused.
  assert.match(CSS_CODE, /--adm-ease:\s*cubic-bezier/, 'the curve is not bound to --adm-ease')
  assert.match(CSS_CODE, /transition:[^;}]*var\(--adm-ease\)/s,
    '--adm-ease is declared but no transition uses it')
})

test('every press transform has a reduced-motion companion', () => {
  // A `transform` applied in the :active STATE is not a transition, so the
  // global reduced-motion rule — which clamps durations — does not remove it.
  // Without an explicit companion it still snaps for exactly the people who
  // asked for less movement.
  //
  // MUTATION-VERIFIED: renaming a selector inside the companion block so one
  // press is no longer covered turns this red.
  const blocks = [...CSS_CODE.matchAll(/([^{}]+)\{([^}]*)\}/g)]

  const pressed = new Set()
  const guarded = new Set()
  for (const [, selector, body] of blocks) {
    const selectors = selector.split(',').map((s) => s.trim()).filter(Boolean)
    if (/transform:\s*scale\(/.test(body)) {
      for (const s of selectors) {
        if (s.includes(':active') && !s.includes('reduced-motion')) pressed.add(s)
      }
    }
    // A companion is a rule that sets transform:none under a reduced-motion
    // condition. The condition can be the attribute selector or the media
    // query wrapping it, so both spellings count.
    if (/transform:\s*none/.test(body)) {
      for (const s of selectors) {
        if (!/reduced-motion/.test(s)) continue
        // Strip the guard prefix so it can be compared to the pressed selector.
        const bare = s
          .replace(/html\[data-reduced-motion="true"\]\s*/, '')
          .replace(/html:not\(\[data-reduced-motion="false"\]\)\s*/, '')
          .trim()
        if (bare) guarded.add(bare)
      }
    }
  }

  assert.ok(pressed.size >= 4,
    `only ${pressed.size} press states found — the matcher is not reading the sheet`)
  assert.ok(guarded.size >= 4,
    `only ${guarded.size} reduced-motion companions found — the matcher is not reading them`)

  const unguarded = [...pressed].filter((sel) => !guarded.has(sel))
  assert.deepEqual(unguarded, [],
    'these press transforms have no reduced-motion companion, so they still snap '
    + 'for the people who asked for less movement:\n  ' + unguarded.join('\n  '))
})

test('the restyle did not reinstate anything #484 removed', () => {
  // The rebuild three days ago cut ten tabs to six, took this browser's
  // figures off the Overview and rebuilt the plan states. A styling pass is
  // exactly the kind of change that quietly puts a deleted thing back while
  // moving markup around, so the three are asserted here as well as in
  // admin-is-site-wide.test.js — cheaply, and against the file this work owns.
  const admin = stripComments(read('src/pages/Admin.jsx'))
  const tabs = admin.match(/const TABS = \[([\s\S]*?)\n\]/)
  assert.ok(tabs, 'the TABS array is unreadable, so this is checking nothing')
  const ids = [...tabs[1].matchAll(/id:\s*'([a-z]+)'/g)].map((m) => m[1])
  assert.deepEqual(ids, ['overview', 'users', 'submissions', 'community', 'prompts', 'stripe'],
    'the tab set moved — #484 settled it at these six')

  for (const dead of ['getPageViews', 'getSessions', 'getDesignAnalytics']) {
    assert.ok(!admin.includes(`${dead}(`),
      `${dead}() is back on the dashboard — it reads THIS browser's localStorage`)
  }

  assert.match(admin, /planState: planStateOf\(u\.subscription\)/,
    'the Plan column no longer reads the shared plan-state module')
  assert.ok(!/'active'\s*\|\|\s*\w+\s*===\s*'trialing'/.test(admin),
    'the two-way plan expression is back — past-due subscribers read as "Free" again')
})
