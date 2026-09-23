// THE THINGS THE SPECTRUM PAGE MUST NOT LOSE.
//
// Three properties, each of which has cost this repository something before:
//
//   1. THE FOUNDER'S NOTE STAYS REACHABLE, and stays opt-in. It is an open
//      founder ask ("i also still want my little about message accessable in the
//      footer") and the whole design of FounderNote.jsx is that it never opens
//      itself. Spectrum ships its own footer, so the note has to be carried
//      across rather than inherited.
//   2. NOTHING IS DROPPED FROM THE FOOTER. Spectrum's footer replaces AppFooter
//      on its route. "make sure to not remove any functionality of the app this
//      is important" is the founder's stated top priority for this redesign, and
//      a footer link is functionality.
//   3. THE REDUCED-MOTION COMPANIONS AND THE VISIBLE RESTING STATE SURVIVE. A
//      word reveal is a transform that hides text, and `useReveal`'s own comment
//      records the last time a reveal with a hidden resting state shipped: /learn
//      met a motion-off visitor with 1,659 characters of invisible copy.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'

import { BENCH } from '../../src/components/spectrum/spectrumFacts.js'
import { CREATE_GROUPS, categoryDestination } from '../../src/data/toolTree.js'
// WHERE THE SHEET IS TODAY, FOUND RATHER THAN TYPED.
// It sits in `styles/deferred/` while the old Home page is still routed (see the
// long note on the import in Spectrum.jsx) and moves to `styles/pages/` on the
// commit that makes Spectrum the front door. Both are legitimate; a test that
// pinned one of them would go red on a move that is not a defect. It throws if
// the sheet is in NEITHER place, which is the only state that is actually wrong.
const SPECTRUM_CSS_PATH = ['src/styles/deferred/spectrum.css', 'src/styles/pages/spectrum.css']
  .find((p) => fs.existsSync(p))
if (!SPECTRUM_CSS_PATH) throw new Error('spectrum.css is in neither src/styles/deferred/ nor src/styles/pages/')

const PAGE = stripComments(read('src/pages/Spectrum.jsx'))
const FOOTER = stripComments(read('src/components/spectrum/SpectrumFooter.jsx'))
const APP_FOOTER = stripComments(read('src/components/AppFooter.jsx'))
const WORDS = stripComments(read('src/components/spectrum/SpectrumWords.jsx'))
const BENCH_SRC = stripComments(read('src/components/spectrum/SpectrumBench.jsx'))
// Comments stripped first — see the note in spectrum-truth.test.js. The header
// of spectrum.css quotes the very strings these tests ban.
const CSS = read(SPECTRUM_CSS_PATH).replace(/\/\*[\s\S]*?\*\//g, '')
const SOURCES = {
  'src/pages/Spectrum.jsx': PAGE,
  'src/components/spectrum/SpectrumFooter.jsx': FOOTER,
  'src/components/spectrum/SpectrumBench.jsx': BENCH_SRC,
  'src/components/spectrum/SpectrumWords.jsx': WORDS,
  'src/components/spectrum/SpectrumRamp.jsx': stripComments(read('src/components/spectrum/SpectrumRamp.jsx')),
  'src/components/spectrum/SpectrumIcon.jsx': stripComments(read('src/components/spectrum/SpectrumIcon.jsx')),
}

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

/* ── 1. the founder's note ─────────────────────────────────────────────────── */

test('the Spectrum footer carries the founder\'s note', () => {
  assert.ok(FOOTER.includes("from '../FounderNote'"),
    'SpectrumFooter.jsx no longer imports FounderNote. His "little about message" is an open '
    + 'founder ask and this footer replaces AppFooter on the front door, so dropping it removes '
    + 'the only way to reach it from the homepage.')
  assert.ok(/<FounderNote\s*\/>/.test(FOOTER),
    'SpectrumFooter.jsx imports FounderNote but never renders it')
})

test('nothing on this page opens the founder\'s note by itself', () => {
  // The note is opt-in BY CONSTRUCTION — it owns its own `open` state and
  // exposes no way in from outside. This check is the guard against the
  // temptation that the front door creates: a timer, a scroll depth, a
  // first-visit flag. Any of those would rebuild the welcome popup the founder
  // was offered and turned down.
  for (const [file, src] of Object.entries(SOURCES)) {
    assert.ok(!/FounderNote[^>]*\bopen\b/.test(src),
      `${file} passes an \`open\` prop to FounderNote. It has none, and adding one turns an `
      + 'opt-in note into the popup he declined.')
  }
  const note = stripComments(read('src/components/FounderNote.jsx'))
  // POSITIVE CONTROL on the component itself: it still defaults to closed and
  // still has no storage, so "it cannot open itself" is a fact and not a hope.
  assert.ok(note.includes('useState(false)'), 'FounderNote no longer starts closed')
  assert.ok(!/localStorage|sessionStorage/.test(note),
    'FounderNote has grown a "seen" flag, which is the first step back toward the popup')
})

/* ── 2. footer parity ──────────────────────────────────────────────────────── */

// Every destination a footer can actually reach: the literal `to="/x"` links,
// the `['/x', 'Label']` rows, AND the Create rows, which name a CREATE_GROUPS id
// rather than a URL and resolve through `categoryDestination()`.
//
// THE ID RESOLUTION IS NOT A CONVENIENCE. Reading only the literals is how this
// check failed on its first run: it reported that the Spectrum footer had "lost"
// /create/color, which the Spectrum footer reaches perfectly well — through
// `['colour', 'Colour systems']`. An extractor that cannot see a derived route
// would push an author back toward typing routes out, which is the opposite of
// what the other test in this pair asks for.
function destinations(src) {
  const out = new Set()
  for (const m of src.matchAll(/to="(\/[^"]*)"/g)) out.add(m[1])
  for (const m of src.matchAll(/\['(\/[^']*)',/g)) out.add(m[1])
  const groupIds = new Set(CREATE_GROUPS.map((g) => g.id))
  for (const m of src.matchAll(/\['([a-z-]+)', '[^']*'\]/g)) {
    if (groupIds.has(m[1])) out.add(categoryDestination(m[1]))
  }
  return out
}

test('the Spectrum footer reaches everywhere AppFooter reaches', () => {
  const mine = destinations(FOOTER)
  const theirs = destinations(APP_FOOTER)
  // POSITIVE CONTROL: the extractor found a real footer, not an empty set.
  assert.ok(theirs.size >= 8, `only ${theirs.size} destinations found in AppFooter.jsx — the extractor is blind`)
  const missing = [...theirs].filter((route) => !mine.has(route))
  assert.deepEqual(missing, [],
    `SpectrumFooter.jsx has lost ${missing.join(', ')}, which AppFooter.jsx still links. `
    + 'Spectrum replaces AppFooter on its route, so a destination only AppFooter has is a '
    + 'destination the front door cannot reach.')
})

test('the Spectrum footer reads its Create destinations from the tool tree', () => {
  assert.ok(FOOTER.includes('categoryDestination('),
    'SpectrumFooter.jsx types its Create routes. AppFooter\'s own comment records the trap: '
    + '"Imagery" pointed at /create/imagery, a category home with no screen of its own.')
  assert.ok(!/to="\/create\//.test(FOOTER),
    'SpectrumFooter.jsx carries a literal /create/ route again')
})

test('the founder attribution and the year survive', () => {
  assert.ok(FOOTER.includes('Built in Brisbane by'), 'the Brisbane attribution is gone from the Spectrum footer')
  assert.ok(FOOTER.includes('dylan-coleman.com'), 'the founder portfolio link is gone')
  assert.ok(FOOTER.includes('getFullYear()'), 'the copyright year is typed rather than computed')
  assert.ok(FOOTER.includes('rel="noopener noreferrer"'), 'the external attribution link has lost rel="noopener noreferrer"')
})

/* ── 3. motion, and text that is readable without it ───────────────────────── */

test('the word reveal has a visible resting state', () => {
  // THE WHOLE POINT. `.sp-w` must carry no transform of its own — the movement
  // is a keyframe animation that only exists under `.is-in`. Anything else and
  // the headline is invisible in the prerendered shell and invisible with motion
  // off.
  const resting = /\.sp-w\s*\{([^}]*)\}/.exec(CSS)
  assert.ok(resting, 'spectrum.css no longer declares .sp-w')
  assert.ok(!/transform\s*:\s*translate/i.test(resting[1]),
    `.sp-w rests at "${resting[1].trim()}" — a transform in the RESTING state means the headline `
    + 'is hidden until JavaScript runs. The movement belongs in the keyframes, under .is-in.')
  assert.ok(/@keyframes\s+sp-word-up/.test(CSS), 'the word-reveal keyframes are gone')
  assert.ok(/\.is-in \.sp-w\s*\{[^}]*animation:\s*sp-word-up/.test(CSS),
    'the word reveal is no longer driven by .is-in')
})

test('the hero does not wait on a scroll observer to become visible', () => {
  // `[data-reveal]` starts at opacity:0 in global.css. On the fold that would
  // blank the largest paint of the prerendered shell until hydration.
  assert.ok(!/className=\{heroLit \? 'sp-hero is-in' : 'sp-hero'\}[\s\S]{0,80}data-reveal/.test(PAGE),
    'the hero carries data-reveal, which starts it at opacity:0')
  const heroTag = /<header className=\{heroLit[^>]*>/.exec(PAGE)
  assert.ok(heroTag, 'the hero header no longer toggles its own entrance class')
  assert.ok(!heroTag[0].includes('data-reveal'), 'the hero header has grown a data-reveal attribute')
  assert.ok(PAGE.includes('data-hero-prepainted'),
    'Spectrum.jsx no longer checks data-hero-prepainted, so a prepainted headline will animate a second time')
})

test('every moving thing has a reduced-motion companion, under both spellings', () => {
  // The app has TWO inputs and global.css encodes their precedence. A sheet that
  // answers only the media query disagrees with the stylesheet for anyone who
  // set the preference in Settings.
  assert.ok(CSS.includes('html[data-reduced-motion="true"]'),
    'spectrum.css has no companion for the Settings choice (html[data-reduced-motion="true"])')
  assert.ok(CSS.includes('@media (prefers-reduced-motion: reduce)'),
    'spectrum.css has no companion for the OS preference')
  assert.ok(CSS.includes('html:not([data-reduced-motion="false"])'),
    'the media-query companion is not scoped to visitors who have made no choice, so it would '
    + 'override somebody who deliberately turned motion ON')

  // Every animated property this sheet introduces must appear in the
  // reduced-motion blocks. Read the class names out of the block itself so
  // adding a moving element and forgetting its companion fails here.
  //
  // Anchored on the first reduced-motion SELECTOR, not on a comment heading:
  // comments are stripped above, and anchoring on prose was how this check
  // first reported a false failure against a sheet that had every companion.
  const start = CSS.indexOf('html[data-reduced-motion="true"]')
  assert.ok(start > -1, 'spectrum.css has no reduced-motion block at all')
  const blocks = CSS.slice(start)
  for (const cls of ['.sp-w', '.sp-ramp-bar', '.sp-stack-card', '.sp-cta-icon', '.sp-disc-card', '.sp-chip']) {
    assert.ok(blocks.includes(cls),
      `${cls} moves but is not named in spectrum.css's reduced-motion blocks`)
  }
})

test('the scroll-linked hue rotation stops under reduced motion', () => {
  const ramp = SOURCES['src/components/spectrum/SpectrumRamp.jsx']
  assert.ok(ramp.includes('prefersReducedMotion()'),
    'SpectrumRamp.jsx no longer checks reduced motion before attaching its scroll listener')
  assert.ok(/if \(prefersReducedMotion\(\)\) return undefined/.test(ramp),
    'SpectrumRamp.jsx checks reduced motion but does not return before adding the listener')
  assert.ok(ramp.includes("{ passive: true }"),
    'the ramp scroll listener is no longer passive, which blocks scrolling on touch')
})

/* ── no new origins ────────────────────────────────────────────────────────── */

test('the page adds no third-party origin', () => {
  // The design pulls FIVE Phosphor weight stylesheets and four Google Fonts
  // stylesheets from two CDNs in its <helmet>. index.html self-hosts the type
  // system precisely to avoid that, and the icons are inline SVG here.
  for (const [file, src] of Object.entries(SOURCES)) {
    for (const origin of ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com']) {
      assert.ok(!src.includes(origin), `${file} fetches from ${origin}`)
    }
    assert.ok(!/class(?:Name)?="ph[ -]/.test(src), `${file} uses a Phosphor icon-font class`)
  }
  for (const origin of ['cdn.jsdelivr.net', 'fonts.googleapis.com', '@import url(http']) {
    assert.ok(!CSS.includes(origin), `spectrum.css fetches from ${origin}`)
  }
})

test('every glyph the page asks for is one SpectrumIcon draws', () => {
  // SpectrumIcon renders nothing for an unknown name rather than a fallback
  // circle, so a typo is silently invisible. This is what catches it.
  //
  // The id list is read out of the source rather than imported: `node --test`
  // runs plain Node, which cannot parse JSX, so every other test in this suite
  // that needs a fact out of a .jsx file reads it as text too.
  const iconSrc = SOURCES['src/components/spectrum/SpectrumIcon.jsx']
  const table = /const GLYPHS = \{([\s\S]*?)\n\}/.exec(iconSrc)
  assert.ok(table, 'SpectrumIcon.jsx no longer declares a GLYPHS table; the extractor is blind')
  const drawn = [...table[1].matchAll(/^ {2}'?([a-z-]+)'?:/gm)].map((m) => m[1])
  assert.ok(drawn.length >= 10, `only ${drawn.length} glyphs found in SpectrumIcon.jsx`)

  const asked = new Set()
  for (const [, src] of Object.entries(SOURCES)) {
    for (const m of src.matchAll(/SpectrumIcon name="([^"]+)"/g)) asked.add(m[1])
    for (const m of src.matchAll(/SpectrumIcon name=\{([a-z.]+)\}/gi)) asked.add(`dynamic:${m[1]}`)
  }
  assert.ok(asked.size >= 6, `only ${asked.size} glyph names found — the extractor is blind`)
  const missing = [...asked].filter((n) => !n.startsWith('dynamic:') && !drawn.includes(n))
  assert.deepEqual(missing, [], `SpectrumIcon is asked for ${missing.join(', ')} and draws none of them`)

  // The one dynamic caller is the assurance row, whose icon names live in
  // spectrumFacts.js. Check those against the same table rather than exempting
  // them — a typo there is exactly as invisible.
  const facts = stripComments(read('src/components/spectrum/spectrumFacts.js'))
  const dynamic = [...facts.matchAll(/icon: '([a-z-]+)'/g)].map((m) => m[1])
  assert.ok(dynamic.length >= 2, 'the assurance row no longer names any icon')
  const missingDynamic = dynamic.filter((n) => !drawn.includes(n))
  assert.deepEqual(missingDynamic, [],
    `spectrumFacts.js names glyphs SpectrumIcon does not draw: ${missingDynamic.join(', ')}`)
})

/* ── the bench is an index of what is live ─────────────────────────────────── */

test('the bench shows every live Create category and no empty one', () => {
  const live = CREATE_GROUPS.filter((g) => g.tools.some((t) => !t.soon))
  assert.deepEqual(BENCH.map((p) => p.id), live.map((g) => g.id),
    'the bench no longer matches the live Create groups in tree order')

  const soonOnly = CREATE_GROUPS.filter((g) => g.tools.every((t) => t.soon))
  // POSITIVE CONTROL: there is at least one group with nothing live, so the
  // exclusion below is about something. When the last one ships, this retires.
  assert.ok(soonOnly.length >= 1,
    'every Create group has something live; delete this half with the commit that shipped the last one')
  for (const group of soonOnly) {
    assert.ok(!BENCH.some((p) => p.id === group.id),
      `the bench renders a panel for "${group.label}", whose tools are all Soon — a whole window `
      + 'promising a bench that is not there')
  }

  // And no panel links a Soon tool.
  for (const panel of BENCH) {
    for (const tool of panel.tools) {
      assert.equal(tool.soon, false, `the bench panel "${panel.label}" links ${tool.label}, which is Soon`)
    }
  }
})

test('the bench writes down no route', () => {
  assert.ok(!/to="\/create\//.test(BENCH_SRC), 'SpectrumBench.jsx carries a literal /create/ route')
  assert.ok(!/to="\/discover\//.test(BENCH_SRC), 'SpectrumBench.jsx carries a literal /discover/ route')
  assert.ok(BENCH_SRC.includes('panel.to') && BENCH_SRC.includes('tool.route'),
    'SpectrumBench.jsx no longer reads its destinations off the tool tree')
})

/* ── accessibility structure ───────────────────────────────────────────────── */

test('the split headline keeps one readable sentence for assistive tech', () => {
  assert.ok(WORDS.includes('className="sr-only"'),
    'SpectrumWords no longer carries the whole sentence in a visually-hidden span, so a screen '
    + 'reader gets the headline one word at a time')
  assert.ok(WORDS.includes('aria-hidden="true"'),
    'the visible word split is no longer aria-hidden, so the headline is announced twice')
})

test('the comparison is a real table with row and column headers', () => {
  // The design builds it from divs and injects the plan name with a CSS
  // pseudo-element at phone width, which is not reliably in the accessibility
  // tree — so a screen-reader user hears "3 Unlimited" with no way to tell which
  // number belongs to which plan.
  assert.ok(PAGE.includes('<table className="sp-compare-table">'), 'the plan comparison is no longer a table')
  assert.ok(PAGE.includes('<th scope="col">'), 'the comparison table has no column headers')
  assert.ok(PAGE.includes('<th scope="row">'), 'the comparison table has no row headers')
  assert.ok(PAGE.includes('<caption className="sr-only">'), 'the comparison table has no caption')
})

test('the page never removes an outline', () => {
  assert.ok(!/outline\s*:\s*(none|0)\b/.test(CSS),
    'spectrum.css sets outline:none somewhere. Focus has to stay visible on every control.')
  assert.ok(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/.test(CSS),
    'spectrum.css no longer paints a focus ring on the accent')
})
