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

import { EX_FILES, ICONS, IMG_MODES } from '../../src/components/spectrum/spectrumKit.js'
import { PH_REGULAR } from '../../src/components/spectrum/phosphorRegular.js'
import { PH_WEIGHTS } from '../../src/components/spectrum/phosphorWeights.js'
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
const CONVERTER_SRC = stripComments(read('src/components/spectrum/BenchConverter.jsx'))
const EXPORTS_SRC = stripComments(read('src/components/spectrum/SpectrumExports.jsx'))
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
  'src/components/spectrum/BenchConverter.jsx': CONVERTER_SRC,
  'src/components/spectrum/SpectrumExports.jsx': EXPORTS_SRC,
  'src/components/spectrum/SpectrumSearch.jsx': stripComments(read('src/components/spectrum/SpectrumSearch.jsx')),
  'src/components/spectrum/PhIcon.jsx': stripComments(read('src/components/spectrum/PhIcon.jsx')),
  'src/components/spectrum/OpenPill.jsx': stripComments(read('src/components/spectrum/OpenPill.jsx')),
  'src/components/spectrum/SpectrumProof.jsx': stripComments(read('src/components/spectrum/SpectrumProof.jsx')),
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
  for (const cls of ['.sp-w', '.sp-ramp-bar', '.sp-stack-card', '.sp-panel', '.sp-pill-icon', '.sp-cta-icon', '.sp-disc-card', '.sp-disc-cta', '.sp-chip']) {
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

test('every glyph the page asks for is one the page ships', () => {
  // The landing's glyphs are real Phosphor paths now
  // (phosphorRegular.js, generated), drawn by PhIcon; SpectrumIcon still draws
  // the terms rows' arrow and the footer's. Either component renders NOTHING for
  // an unknown name, so a typo is silently invisible — this is what catches it.
  const asked = new Set()
  for (const [, src] of Object.entries(SOURCES)) {
    for (const m of src.matchAll(/PhIcon name="([^"]+)"/g)) asked.add(m[1])
  }
  // The tables the windows draw their icons from, checked the same way.
  for (const [, icon] of IMG_MODES) if (icon) asked.add(icon)
  for (const [icon] of EX_FILES) asked.add(icon)
  for (const [slug] of ICONS) asked.add(slug)
  assert.ok(asked.size >= 30, `only ${asked.size} glyph names found — the extractor is blind`)
  const missing = [...asked].filter((n) => !PH_REGULAR[n])
  assert.deepEqual(missing, [], `PhIcon is asked for ${missing.join(', ')}, which phosphorRegular.js does not carry`)

  // The Icon panel's other four weights exist for every glyph it offers, so
  // picking Thin or Fill can never draw an empty tile.
  for (const w of ['thin', 'light', 'bold', 'fill']) {
    const gone = ICONS.filter(([slug]) => !PH_WEIGHTS[w][slug]).map(([slug]) => slug)
    assert.deepEqual(gone, [], `phosphorWeights.js has no ${w} for ${gone.join(', ')}`)
  }

  const iconSrc = SOURCES['src/components/spectrum/SpectrumIcon.jsx']
  const table = /const GLYPHS = \{([\s\S]*?)\n\}/.exec(iconSrc)
  assert.ok(table, 'SpectrumIcon.jsx no longer declares a GLYPHS table; the extractor is blind')
  const drawn = [...table[1].matchAll(/^ {2}'?([a-z-]+)'?:/gm)].map((m) => m[1])
  // The landing and its footer draw with PhIcon / PhGlyph now; SpectrumIcon's
  // callers are the reading pages, so those are read as well.
  const spCallers = ['src/pages/DesignPrinciples.jsx', 'src/pages/HelpCentre.jsx', 'src/pages/InfoCentre.jsx']
    .map((p) => stripComments(read(p)))
  const spAsked = new Set()
  for (const src of [...Object.values(SOURCES), ...spCallers]) {
    for (const m of src.matchAll(/SpectrumIcon name="([^"]+)"/g)) spAsked.add(m[1])
  }
  assert.ok(spAsked.size >= 1, 'no SpectrumIcon name found — the extractor is blind')
  const spMissing = [...spAsked].filter((n) => !drawn.includes(n))
  assert.deepEqual(spMissing, [], `SpectrumIcon is asked for ${spMissing.join(', ')} and draws none of them`)
})

/* ── the bench is the design's four tool windows ─────────────────────────────────────── */

test('the bench is the design\'s four tool windows, in order, beside a four-row rail', () => {
  // The design's 4 bench tool windows, not the 5 category panels.
  const names = [...BENCH_SRC.matchAll(/<Chrome\s+no="(\d\d)"\s+name="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`)
  assert.deepEqual(names, ['01 Palette builder', '02 Icon library', '03 Font Gallery', '04 File converter'])
  const panels = [...BENCH_SRC.matchAll(/data-panel="(\d)"/g)].map((m) => m[1])
  assert.deepEqual(panels, ['0', '1', '2', '3'], 'the bench no longer renders four [data-panel] windows')
  assert.match(BENCH_SRC, /const RAIL = \['Palette builder', 'Icon library', 'Font gallery', 'File conversion'\]/,
    'the rail no longer lists the design\'s four rows')
  // AI Studio is not one of the design's windows.
  assert.ok(!/AI Studio/.test(BENCH_SRC), 'the bench has an AI Studio window again')
})

test('the bench writes down no route', () => {
  // Every window CTA reads its destination off the tool tree through route(),
  // so a renamed tool fails the build rather than shipping a dead link.
  for (const [file, src] of [['SpectrumBench.jsx', BENCH_SRC], ['BenchConverter.jsx', CONVERTER_SRC]]) {
    assert.ok(!/to="\/create\//.test(src), `${file} carries a literal /create/ route`)
    assert.ok(!/to="\/discover\//.test(src), `${file} carries a literal /discover/ route`)
  }
  const called = [...(BENCH_SRC + CONVERTER_SRC).matchAll(/route\('([a-z-]+)'\)/g)].map((m) => m[1]).sort()
  assert.deepEqual(called, ['file-converter', 'font-gallery', 'font-pair', 'gradient', 'icons', 'palette', 'ratio'],
    'the four windows no longer open their seven destinations through route()')
})

test('the split headline keeps one readable sentence for assistive tech', () => {
  assert.ok(WORDS.includes('className="sr-only"'),
    'SpectrumWords no longer carries the whole sentence in a visually-hidden span, so a screen '
    + 'reader gets the headline one word at a time')
  assert.ok(WORDS.includes('aria-hidden="true"'),
    'the visible word split is no longer aria-hidden, so the headline is announced twice')
})

test('the landing is the design\'s six blocks in order, and pricing is not one of them', () => {
  // In the design the plan comparison and FAQ live on the Pricing screen,
  // which is /plans. The landing is hero, bench, discover,
  // exports (#specimens), the terms band (#index) and the handoff.
  const ids = [...PAGE.matchAll(/<section id="([a-z]+)"/g)].map((m) => m[1])
  assert.deepEqual(ids, ['bench', 'discover', 'specimens'],
    'the landing sections are no longer bench, discover, specimens in that order')
  // Then the design's proof band (#index, SpectrumProof.jsx), then the handoff.
  const proofAt = PAGE.indexOf('<SpectrumProof />')
  assert.ok(proofAt > PAGE.indexOf('id="specimens"') && proofAt < PAGE.indexOf('className="sp-close"'),
    'the proof band no longer sits between the exports and "Start your first project today."')
  assert.match(stripComments(read('src/components/spectrum/SpectrumProof.jsx')), /<section id="index"/,
    'the proof band lost the #index anchor the footer links to')
  for (const gone of ['id="pricing"', 'id="faq"', '<table', 'sp-compare', 'sp-plans']) {
    assert.ok(!PAGE.includes(gone), `Spectrum.jsx carries ${gone} again — pricing belongs on /plans`)
  }
  // THE STACK NESTS. A sticky card pins only inside its own containing block,
  // so each card must sit in a wrapper that also holds the cards after it.
  const nests = EXPORTS_SRC.split('<div className="sp-stack-nest">').length - 1
  assert.equal(nests, 3, 'the exports stack no longer nests its three cards (A ⊃ B ⊃ C)')
  const order = ['<Card index={0}', '<div className="sp-stack-nest">', '<Card index={1}', '<Card index={2}', 'sp-stack-pad--tail']
  let at = EXPORTS_SRC.indexOf('<div className="sp-stack-nest">')
  for (const needle of order) {
    const next = EXPORTS_SRC.indexOf(needle, at)
    assert.ok(next > -1, `the stack lost ${needle}, or it moved out of order`)
    at = next
  }
  assert.match(EXPORTS_SRC, /const TOPS = \[84, 116, 148\]/, 'the cards no longer pin at 84 / 116 / 148')
  assert.match(EXPORTS_SRC, /1 - docked \* 0\.045/, 'covered cards no longer shrink by .045 per card')
  assert.match(EXPORTS_SRC, /1 - docked \* 0\.05/, 'covered cards no longer dim by .05 per card')
})

test('the page never removes an outline', () => {
  assert.ok(!/outline\s*:\s*(none|0)\b/.test(CSS),
    'spectrum.css sets outline:none somewhere. Focus has to stay visible on every control.')
  assert.ok(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/.test(CSS),
    'spectrum.css no longer paints a focus ring on the accent')
})
