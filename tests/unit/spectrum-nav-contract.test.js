// The two navs, guarded at the source.
//
// WHY A SOURCE TEST AND NOT ONLY A BROWSER ONE. The marketing nav
// (SpectrumNav.jsx) is built and finished but NOT YET MOUNTED: `/` still
// renders the old Home page, and the swap is a one-line change in
// src/pages/Spectrum.jsx that belongs to whoever moves Spectrum to `/` (see
// 96-spectrum-nav.spec.js, which skips until then). An unmounted component is
// exactly the kind of file that rots quietly — `green-build-is-not-a-rendered-page`
// in reverse — so the contracts that CAN be read off the source are read here,
// today, and the ones that need a browser are in the spec.
//
// These are the constraints the Spectrum brief names by hand, not a
// restatement of the design.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss, stripJs } from '../helpers/strip-comments.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

const SPECTRUM_NAV = 'src/components/SpectrumNav.jsx'
const PILL_NAV = 'src/components/PillNav.jsx'
const THEME_CYCLE = 'src/components/nav/ThemeCycle.jsx'
const MENU_DESC = 'src/components/nav/menuDescription.js'
const GLOBAL_CSS = 'src/styles/global.css'
// The marketing chrome's sheet: SpectrumNav's rules live here, apart from
// global.css, so the marketing and app chromes stay separate.
const CHROME_CSS = 'src/styles/pages/spectrum-chrome.css'
// Both navs' rules, for the sweeps that hold the two to one standard.
const navCss = () => `${stripCss(read(GLOBAL_CSS))}\n${stripCss(read(CHROME_CSS))}`

const NAV_JS = [SPECTRUM_NAV, PILL_NAV, THEME_CYCLE]

test('NO NEW ORIGIN AND NO ICON FONT — Phosphor is ported, not linked', () => {
  // Spectrum draws its icons with `<span class="ph ph-x">` off a CDN. The app
  // ships every glyph inline and holds a no-new-origins rule on the first-paint
  // path, which the nav is on by definition: it is on every page.
  for (const file of NAV_JS) {
    const src = stripJs(read(file))
    assert.doesNotMatch(src, /https?:\/\//,
      `${file} names an external origin; the nav is on the first-paint path of every route`)
    // `ph ph-<name>` is the whole Phosphor contract, and it has to be matched as
    // that pair: `\bph\b` alone also hits `.pnav-search-ph`, the typed-placeholder
    // span, which is not an icon at all.
    assert.doesNotMatch(src, /\bph ph-/,
      `${file} uses a Phosphor icon-font class; port the glyph to inline SVG instead`)
    // Case-SENSITIVE, and `rel=` is required: `/<link\b/i` also matches react-router's
    // `<Link>`, which every nav in this app uses and which fetches nothing.
    assert.doesNotMatch(src, /@import|<link[^>]*\brel=/, `${file} pulls in a stylesheet`)
  }
  // And the glyphs it does need are really there, so this cannot pass by the
  // file having no icons at all.
  assert.ok((read(SPECTRUM_NAV).match(/<svg\b/g) || []).length >= 2,
    'SpectrumNav should carry its ported Phosphor glyphs as inline <svg>')
})

test('the accent stays swappable — no hardcoded brand blue anywhere in the nav', () => {
  // Premium theme templates work by moving --accent alone. A literal hex in a
  // nav rule is a paid feature quietly not working.
  const css = navCss()
  const navRules = css.split('\n').filter((l) => /^\.(pnav|spnav)[-{ .:[]/.test(l.trim()))
  assert.ok(navRules.length > 60, 'the nav rule sweep found almost nothing — it is not reading the nav')
  for (const rule of navRules) {
    assert.doesNotMatch(rule, /#(0F6FFF|6FA8FF|2A60E8)\b/i,
      `a nav rule hardcodes an accent blue instead of var(--accent): ${rule.slice(0, 110)}`)
  }
  for (const file of NAV_JS) {
    assert.doesNotMatch(stripJs(read(file)), /#(0F6FFF|6FA8FF|2A60E8)\b/i,
      `${file} hardcodes an accent blue`)
  }
  /* BOTH WORDMARKS NOW READ THE SAME DERIVED TOKEN, and that is the fix rather
   * than a relaxation.
   *
   * The app header's rule pinned `var(--accent)`, which measured 4.36:1 on the
   * light ground at 19px/600 — under AA on eleven route-and-width rows. The
   * comment that justified it claimed 19px counts as large text; it does not,
   * unless the weight is 700 or more, and that mistaken premise WAS the defect.
   *
   * It moved to `--accent-mid`, NOT `--accent-strong`, and the distinction is
   * load-bearing: `--accent-strong` is a per-theme literal that does not track
   * `--accent`, so a premium theme moving the accent alone would repaint the
   * wordmark's letters and strand the "4" on the old brand blue. `--accent-mid`
   * is color-mix()'d off `--accent`, which is what makes the derivation the
   * theme mechanism. The marketing wordmark already read it, so the two are now
   * one token instead of two that happened to look alike. */
  assert.match(css, /\.pnav-word-mark\{color:var\(--accent-mid\)\}/,
    'the app header wordmark must take the accent from the derived family')
  assert.match(css, /\.spnav-word-mark\{color:var\(--accent-mid\)\}/,
    'the marketing wordmark must take the accent from the derived family')
})

test('every nav weight sits inside Geist\'s 300..700 axis', () => {
  // A weight outside the axis is clamped silently, so the page renders at a
  // weight nobody chose. hero-entrance.test.js sweeps all of src/styles; this
  // covers the nav's JSX, which that sweep does not reach.
  const css = navCss()
  const navWeights = css.split('\n')
    .filter((l) => /\.(pnav|spnav)[-{ .:[]/.test(l))
    .flatMap((l) => [...l.matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1])))
  assert.ok(navWeights.length > 5, 'no nav weights were read — the sweep is not reaching the rules')
  for (const w of navWeights) {
    assert.ok(w >= 300 && w <= 700, `nav weight ${w} is outside Geist's 300..700 axis and will be clamped`)
  }
})

test('every nav animation ships a reduced-motion companion', () => {
  // The brief names the burger morph and the staggered menu-item entrances by
  // hand. Both mechanisms this repo uses are checked: the OS media query and
  // the stored Settings choice (html[data-reduced-motion]).
  const css = stripCss(read(CHROME_CSS))
  const companions = [
    ['the burger morph', /\.spnav-burger-ico > span\{transition:none\}/],
    ['the staggered menu entrance', /\.spnav-menu \[data-mi\]\{animation:none\}/],
    ['the CTA icon rotation', /\.spnav-cta:hover \.spnav-cta-icon\{transform:none\}/],
    ['the hide-on-scroll transform', /\.spnav\[data-nav-hidden="1"\]\{transform:none;opacity:1\}/],
  ]
  for (const [what, re] of companions) {
    const hits = css.match(new RegExp(re.source, 'g')) || []
    assert.ok(hits.length >= 2,
      `${what} has ${hits.length} reduced-motion companion(s); it needs both the ` +
      '@media(prefers-reduced-motion) one and the html[data-reduced-motion="true"] one')
  }
  // The animations they cancel must actually exist, or this test is toothless.
  assert.match(css, /\.spnav-burger-ico > span\{[^}]*transition:transform \.34s/)
  assert.match(css, /@keyframes spnav-mi-in/)
})

test('the hide-on-scroll bar does NOT hide under reduced motion', () => {
  // Spectrum's own script makes this choice (setNav): a bar that teleports
  // away with no transition reads as a rendering fault, and asking for less
  // motion is not asking for less navigation.
  const css = stripCss(read(CHROME_CSS))
  assert.match(css, /html\[data-reduced-motion="true"\] \.spnav\[data-nav-hidden="1"\]\{transform:none;opacity:1\}/)
})

test('neither nav renders menu descriptions, and neither carries a copy table', () => {
  // The app header draws one-line rows and the marketing menu no longer lists
  // tools, so the shared description helper has no consumer and was removed.
  // A description line coming back in either nav, or a local copy of the old
  // copy table, fails here.
  assert.ok(!fs.existsSync(MENU_DESC), `${MENU_DESC} is back with no consumer`)
  for (const file of [SPECTRUM_NAV, PILL_NAV]) {
    const src = stripJs(read(file))
    assert.doesNotMatch(src, /menuDescription|pnav-tool-desc/, `${file} renders tool descriptions again`)
    assert.doesNotMatch(src, /const MENU_TOOL_COPY/, `${file} carries a copy of the menu copy table`)
  }
})

test('Beta is not a second Soon, in the app header', () => {
  // One is "not yet", the other is "yes, with a stated limit". They share the
  // badge SHAPE and differ in colour, and a Soon tool can never also be Beta
  // because a tool the tree marks Soon is not mounted.
  const src = stripJs(read(PILL_NAV))
  assert.match(src, /\{t\.soon && <span className="soon-badge">Soon<\/span>\}/, PILL_NAV)
  assert.match(src, /\{!t\.soon && t\.beta && <span className="beta-badge">Beta<\/span>\}/)
  const css = stripCss(read(GLOBAL_CSS))
  // The menu-scoped chip changes geometry only; the colours stay with the
  // shared badges, which five other surfaces also render.
  assert.match(css, /\.pnav-tool \.soon-badge,\.pnav-tool \.beta-badge[^{]*\{padding:3px 6px;border-radius:var\(--radius-xs\)\}/)
})

test('the full-screen menu is the design\'s four items and its note — not a mega menu', () => {
  // The design file is the spec, and it has no mega-menu. The design's menu (UIL4B - Spectrum.dc.html 248-257) is Tools, Pricing,
  // On mobile, "Open the toolkit ↗" and the note EVERY CORE TOOL IS FREE,
  // FOREVER. An earlier pass hung the tool tree, search, the three-way theme and
  // the account block under it; this fails if any of that comes back.
  const src = stripJs(read(SPECTRUM_NAV))
  for (const [what, re] of [
    ['the tool tree', /NAV_SECTIONS/],
    ['the three-way theme segment', /<ThemeChoice/],
    ['an account block', /logout\(\)|openLogin\(/],
  ]) {
    assert.doesNotMatch(src, re, `the marketing menu has grown ${what} again`)
  }
  assert.match(src, /EVERY CORE TOOL IS FREE, FOREVER/, 'the design\'s menu note is gone')
  assert.match(src, /className="spnav-mi spnav-mi--accent"[\s\S]{0,80}Open the toolkit/,
    'the fourth big item, "Open the toolkit ↗" in the accent, is gone')
  // What a dialog has to do, whatever is in it.
  for (const [what, re] of [
    ['scroll lock', /document\.body\.style\.overflow = 'hidden'/],
    ['a focus trap', /event\.key !== 'Tab'/],
    ['focus returned to the trigger on close', /burgerRef\.current\?\.focus\(\)/],
    ['the design\'s exit, held mounted', /menu !== 'closed' &&/],
    ['the one-press theme cycle on the pill', /<ThemeCycle[^>]*glyphs="phosphor"/],
  ]) {
    assert.match(src, re, `the marketing nav dropped ${what}`)
  }
  assert.match(src, /role="dialog"[\s\S]{0,120}aria-modal="true"/,
    'the full-screen menu must declare itself a modal dialog')
})

test('"Open the toolkit" enters the app, with no sign-up gate', () => {
  // Signed out or in, it lands on
  // /projects, the workspace; sign-up happens only on save or export.
  const src = stripJs(read(SPECTRUM_NAV))
  assert.match(src, /const TOOLKIT = '\/projects'/)
  assert.match(src, /<Link className="spnav-cta" data-cta to=\{TOOLKIT\}/)
  const footer = stripJs(read('src/components/spectrum/SpectrumFooter.jsx'))
  assert.match(footer, /toolkitTo = '\/projects'/)
  assert.doesNotMatch(footer, /onOpenToolkit/, 'the footer CTA opens the sign-up dialog again')
})

test('the quiet links are the design\'s three, and each one goes somewhere real', () => {
  // Spectrum's quiet links are Tools / Pricing / On mobile (lines 226-228).
  // Tools is the sales page's bench; Pricing is the design's separate Pricing screen,
  // the route /plans; On mobile is the design's "mobile" screen, the route /mobile.
  // Every destination must exist: the hash as an id on Spectrum.jsx, each
  // route as a page App.jsx renders AND a title in routeMetaMap.js (without
  // which the route matrix would not prerender it and vercel.json would 404 it).
  const src = stripJs(read(SPECTRUM_NAV))
  const labels = [...src.matchAll(/\{ id: '[a-z]+', label: '([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(labels, ['Tools', 'Pricing', 'On mobile'], 'the quiet links are the design\'s three, in its order')
  const hashes = [...src.matchAll(/hash: '#([a-z-]+)'/g)].map((m) => m[1])
  assert.deepEqual(hashes, ['bench'])
  const page = read('src/pages/Spectrum.jsx')
  for (const id of hashes) {
    assert.match(page, new RegExp(`id="${id}"`), `SpectrumNav links to #${id}, which Spectrum.jsx does not define`)
  }
  const routes = [...src.matchAll(/to: '(\/[a-z-]+)'/g)].map((m) => m[1])
  assert.deepEqual(routes, ['/plans', '/mobile'])
  const app = stripJs(read('src/App.jsx'))
  assert.match(app, /=== '\/mobile'[\s\S]{0,400}<SpectrumMobile \/>/, 'App.jsx does not render a page at /mobile')
  assert.match(app, /=== '\/plans'[\s\S]{0,400}<Pricing \/>/, 'App.jsx does not render a page at /plans')
  const titles = read('src/data/routeMetaMap.js')
  assert.match(titles, /'\/mobile': 'UI L4B \| On mobile'/, '/mobile has no title in routeMetaMap.js')
  assert.match(titles, /'\/plans': /, '/plans has no title in routeMetaMap.js')
})

test('the screen you are on is announced as well as painted', () => {
  // The design colours the current screen's quiet link with --ink and the
  // rest with --ink-faint (navLanding / navPricing / navMobile). Colour alone
  // is not a state a screen reader can hear, so the link also carries
  // aria-current.
  const src = stripJs(read(SPECTRUM_NAV))
  assert.match(src, /'aria-current': current \? 'page' : undefined/)
  assert.match(src, /if \(onSalesPage\(p\)\) return 'tools'/)
  assert.match(src, /if \(p === '\/plans'\) return 'pricing'/)
  assert.match(src, /if \(p === '\/mobile'\) return 'mobile'/)
  const css = stripCss(read(CHROME_CSS))
  assert.match(css, /\.spnav-quiet-link\.is-active\{color:var\(--t0\)\}/)
})

test('the preview hook is not in the shipped nav', () => {
  // The marketing nav was verified in a browser through a temporary
  // query-string mount. If that survives a commit it is an undocumented way to
  // swap the navigation on any route.
  assert.doesNotMatch(read(PILL_NAV), /TEMP-SPECTRUMNAV-PREVIEW|spectrumnav=1/,
    'the temporary preview hook is still in PillNav.jsx')
})
