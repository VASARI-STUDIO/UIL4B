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
  assert.ok((read(SPECTRUM_NAV).match(/<svg\b/g) || []).length >= 3,
    'SpectrumNav should carry its ported Phosphor glyphs as inline <svg>')
})

test('the accent stays swappable — no hardcoded brand blue anywhere in the nav', () => {
  // Premium theme templates work by moving --accent alone. A literal hex in a
  // nav rule is a paid feature quietly not working.
  const css = stripCss(read(GLOBAL_CSS))
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
  const css = stripCss(read(GLOBAL_CSS))
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
  const css = stripCss(read(GLOBAL_CSS))
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
  const css = stripCss(read(GLOBAL_CSS))
  assert.match(css, /html\[data-reduced-motion="true"\] \.spnav\[data-nav-hidden="1"\]\{transform:none;opacity:1\}/)
})

test('menuDescription has ONE implementation, and both navs use it', () => {
  // Its two rules are subtle enough that a second copy drifts the first time a
  // tool ships: a Soon row gets no line at all, and an explicit '' means "the
  // label already says it" — which is NOT the same as deleting the key, because
  // a missing key falls through to landing-page copy in a 180px column.
  const mod = stripJs(read(MENU_DESC))
  assert.match(mod, /export function menuDescription/)
  assert.match(mod, /if \(tool\.soon\) return ''/, 'rule one: a Soon row shows no description')
  assert.match(mod, /if \(tool\.id in MENU_TOOL_COPY\)/,
    'rule two: the `in` test is what makes an explicit \'\' different from a missing key')
  for (const file of [SPECTRUM_NAV, PILL_NAV]) {
    assert.match(stripJs(read(file)), /import \{ menuDescription \} from/,
      `${file} must import the shared menuDescription, never restate it`)
    assert.doesNotMatch(stripJs(read(file)), /const MENU_TOOL_COPY/,
      `${file} carries a second copy of the menu copy table`)
  }
})

test('Beta is not a second Soon, in either nav', () => {
  // One is "not yet", the other is "yes, with a stated limit". They share the
  // badge SHAPE and differ in colour, and a Soon tool can never also be Beta
  // because a tool the tree marks Soon is not mounted.
  for (const file of [SPECTRUM_NAV, PILL_NAV]) {
    const src = stripJs(read(file))
    assert.match(src, /\{t\.soon && <span className="soon-badge">Soon<\/span>\}/, `${file}`)
  }
  assert.match(stripJs(read(SPECTRUM_NAV)), /\{!t\.soon && t\.beta && <span className="beta-badge">Beta<\/span>\}/)
  assert.match(stripJs(read(PILL_NAV)), /\{!t\.soon && t\.beta && <span className="beta-badge">Beta<\/span>\}/)
  const css = stripCss(read(GLOBAL_CSS))
  // The menu-scoped chip changes geometry only; the colours stay with the
  // shared badges, which five other surfaces also render.
  assert.match(css, /\.pnav-tool \.soon-badge,\.pnav-tool \.beta-badge[^{]*\{padding:3px 6px;border-radius:var\(--radius-xs\)\}/)
})

test('the marketing nav keeps every path the app header offers', () => {
  // The founder's number-one constraint. The pill itself carries five
  // controls, so the full-screen menu is what stops the rest being lost.
  const src = stripJs(read(SPECTRUM_NAV))
  const required = [
    ['the whole tool tree', /NAV_SECTIONS\.map/],
    ['search, on the same shortcut', /SEARCH_KEY/],
    ['the command palette', /CommandPalette/],
    ['the three-way theme control', /<ThemeChoice \/>/],
    ['the one-press theme cycle', /<ThemeCycle/],
    ['sign in', /openLogin\(\)/],
    ['sign up', /openLogin\(\{ signup: true \}\)/],
    ['sign out', /logout\(\)/],
    ['the admin link, gated', /isAdmin && /],
    ['scroll lock', /document\.body\.style\.overflow = 'hidden'/],
    ['a focus trap', /event\.key !== 'Tab'/],
    ['focus returned to the trigger on close', /burgerRef\.current\?\.focus\(\)/],
  ]
  for (const [what, re] of required) {
    assert.match(src, re, `the marketing nav dropped ${what}`)
  }
  assert.match(src, /role="dialog"[\s\S]{0,120}aria-modal="true"/,
    'the full-screen menu must declare itself a modal dialog')
})

test('the marketing nav invents no route and no section', () => {
  // Spectrum's third quiet link is "On mobile", against a one-page mock. There
  // is no such section and no such route here, so it is not shipped; the three
  // that are shipped must all be real ids on src/pages/Spectrum.jsx.
  const src = stripJs(read(SPECTRUM_NAV))
  const hashes = [...src.matchAll(/hash: '#([a-z-]+)'/g)].map((m) => m[1])
  assert.deepEqual(hashes, ['bench', 'discover', 'pricing'])
  const page = read('src/pages/Spectrum.jsx')
  for (const id of hashes) {
    assert.match(page, new RegExp(`id="${id}"`), `SpectrumNav links to #${id}, which Spectrum.jsx does not define`)
  }
  assert.doesNotMatch(src, /On mobile/, 'the prototype\'s third link has no destination in this product')
})

test('the preview hook is not in the shipped nav', () => {
  // The marketing nav was verified in a browser through a temporary
  // query-string mount. If that survives a commit it is an undocumented way to
  // swap the navigation on any route.
  assert.doesNotMatch(read(PILL_NAV), /TEMP-SPECTRUMNAV-PREVIEW|spectrumnav=1/,
    'the temporary preview hook is still in PillNav.jsx')
})
