// NOTHING THIS PRODUCT REDISTRIBUTES MAY SHIP UNCREDITED.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE IS WORTH MORE THAN THE PAGE IT GUARDS
// ─────────────────────────────────────────────────────────────────────────────
// A licence review on 2026-09-23 found four Creative Commons Attribution icon
// sets in the Icon Library — `solar` and `fa6-solid` on the FREE tier, `twemoji`
// and `openmoji` on Pro — six SIL OFL typefaces served from public/fonts/, and
// a Firebase SDK that arrives as `firebase` plus forty-odd Apache-2.0
// `@firebase/*` packages. Attribution is a CONDITION of all three of those
// licences. The app's entire attribution surface was one sentence in
// IconLibrary.jsx that rendered when, and only when, the visitor had selected
// the `logodev` pack.
//
// A /credits page fixes that once. What it cannot do is stay fixed: the next
// pack added to iconPackTiers.js, the next font dropped into public/fonts/, the
// next `npm i` — each one is a new obligation, and none of them fails anything.
// That is the failure mode this file exists for. Every assertion below is of
// the same shape: re-derive the list from the thing that OWNS it, and fail if
// the credit surface does not cover it.
//
// Comment-blind wherever it reads source, per the rule #332 established here: a
// test that passes because an explanatory comment still names the value is not
// an assertion, and this file's comments quote several of the strings it
// checks for.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { buildCreditsManifest } from '../../scripts/sync-credits.mjs'
import {
  ICON_PACK_CREDITS,
  LICENCES,
  allPackCredits,
  iconifyCredit,
  licenceOf,
  packCredit,
} from '../../src/data/iconPackCredits.js'
import { ICON_PACK_TIERS } from '../../src/data/iconPackTiers.js'
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'

const ROOT = process.cwd()
const CREDITS_PAGE = stripComments(read('src/pages/Credits.jsx'))
const ICON_PAGE = stripComments(read('src/pages/IconLibrary.jsx'))
// Read rather than imported: Node needs an import attribute for JSON and the
// point here is to assert what is ON DISK anyway.
const MANIFEST = JSON.parse(read('src/data/creditsManifest.json'))
const { fonts: FONT_CREDITS, dependencies: DIRECT_DEPENDENCIES, firebase: FIREBASE_PACKAGES } = MANIFEST

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

/* ── 1 · ICON PACKS ─────────────────────────────────────────────────────────
 *
 * THE ONE THE BRIEF ASKED FOR: a pack that exists with no credit entry fails.
 * Both directions, because a stale row is its own defect — it credits a set
 * this product no longer shows, which is a claim about somebody else's work
 * that nobody checked. */

test('THE ONE THAT MATTERS: every icon pack the product carries has a credit', () => {
  const packs = Object.keys(ICON_PACK_TIERS).sort()
  const credited = Object.keys(ICON_PACK_CREDITS).sort()
  assert.ok(packs.length >= 20, `only ${packs.length} packs in the tier table — the read is broken`)

  const uncredited = packs.filter((p) => !ICON_PACK_CREDITS[p])
  assert.deepEqual(uncredited, [],
    'These packs are in src/data/iconPackTiers.js and have no row in '
    + 'src/data/iconPackCredits.js, so /create/icons renders their work with no '
    + 'attribution and /credits does not list them:\n  ' + uncredited.join('\n  '))

  const orphaned = credited.filter((p) => !ICON_PACK_TIERS[p])
  assert.deepEqual(orphaned, [],
    'These rows credit a pack that is no longer in the tier table:\n  ' + orphaned.join('\n  '))
})

test('every credit names an author, a link and a licence this module can explain', () => {
  for (const row of allPackCredits()) {
    assert.ok(row.name && row.name !== row.prefix, `${row.prefix} has no human name`)
    assert.ok(row.author, `${row.prefix} names nobody to credit`)
    assert.match(row.url, /^https:\/\//, `${row.prefix}'s attribution link is not an https URL`)
    assert.ok(LICENCES[row.spdx], `${row.prefix} carries licence id "${row.spdx}", which LICENCES has no sentence for`)
    assert.ok(row.licenceAsks.length > 20, `${row.spdx} does not say what it asks of us`)
    assert.match(row.licenceUrl || LICENCES[row.spdx].url || 'x', /^(https:\/\/|x$)/)
  }
})

test('the four Attribution sets are still marked as owed, by licence', () => {
  // Pinned BY VALUE, and deliberately not derived. This is the fact the whole
  // exercise turns on, and a derivation of it would agree with a table that had
  // quietly relabelled one of them. If a pack here genuinely relicenses, this
  // test is the right place to argue about it.
  const owed = {
    solar: 'CC-BY-4.0',
    'fa6-solid': 'CC-BY-4.0',
    twemoji: 'CC-BY-4.0',
    openmoji: 'CC-BY-SA-4.0',
  }
  for (const [prefix, spdx] of Object.entries(owed)) {
    assert.equal(ICON_PACK_CREDITS[prefix]?.spdx, spdx,
      `${prefix} is no longer credited as ${spdx} — if the set really relicensed, say so here`)
    assert.equal(licenceOf(spdx).required, true, `${spdx} is no longer marked as requiring attribution`)
  }
  // …and two of the four are free-tier, which is what makes this owed to a
  // signed-out visitor rather than only to a subscriber.
  assert.equal(ICON_PACK_TIERS.solar.tier, 'free')
  assert.equal(ICON_PACK_TIERS['fa6-solid'].tier, 'free')
})

test('logo.dev is credited as terms rather than as an open licence', () => {
  const row = packCredit('logodev')
  assert.equal(row.spdx, 'proprietary',
    'logodev has been given an open-source licence id. Those are real company '
    + 'trademarks served through a commercial API; calling that MIT is a false claim.')
  assert.match(row.url, /^https:\/\/logo\.dev/, 'the logo.dev attribution link is gone')
  assert.ok(row.note && /free tier/i.test(row.note),
    'the row no longer records that logo.dev’s free tier requires this link')
})

/* ── 2 · THE LIVE LICENCE PATH ──────────────────────────────────────────────
 *
 * The brief's stronger requirement: read the licence from the data we already
 * fetch rather than from a table that goes stale. */

test('IconLibrary asks Iconify for the licence on the request it already makes', () => {
  assert.match(ICON_PAGE, /\/collection\?prefix=\$\{pack\}&info=1/,
    'getCollectionNames() no longer asks for `&info=1`. Without it the /collection '
    + 'response carries no licence at all and every credit on the grid falls back to '
    + 'the committed table, which is exactly the staleness the table is only a floor for.')
  assert.match(ICON_PAGE, /credit: iconifyCredit\(d\)/,
    'the /collection response is fetched with info=1 and the licence in it is discarded again')
})

test('iconifyCredit reads a real response shape, and refuses a broken one', () => {
  // The shape MEASURED against https://api.iconify.design on 2026-09-23.
  const live = iconifyCredit({
    info: {
      name: 'Solar',
      author: { name: '480 Design', url: 'https://www.figma.com/community/file/1166831539721848736' },
      license: { title: 'CC BY 4.0', spdx: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    },
  })
  assert.equal(live.spdx, 'CC-BY-4.0')
  assert.equal(live.author, '480 Design')
  assert.equal(live.licenceUrl, 'https://creativecommons.org/licenses/by/4.0/')

  // The plain endpoint, and the committed fixtures, answer without `info`.
  assert.equal(iconifyCredit({ prefix: 'solar', title: 'Solar' }), null)
  assert.equal(iconifyCredit(null), null)
  // A licence id this module cannot explain is not adopted — rendering a
  // licence name with no statement of what it asks is an attribution that has
  // stopped meaning anything.
  assert.equal(iconifyCredit({ info: { license: { spdx: 'NOT-A-LICENCE' } } }), null)
  // A non-https author URL is not used as an attribution link.
  assert.equal(iconifyCredit({ info: { author: { name: 'x', url: 'javascript:alert(1)' } } }).url, undefined)
})

test('a live answer lays over the table without being able to blank it', () => {
  const merged = packCredit('solar', { spdx: 'MIT' })
  assert.equal(merged.spdx, 'MIT', 'the live licence no longer wins')
  assert.equal(merged.author, '480 Design', 'a partial live answer wiped the author off the credit')
  assert.equal(merged.name, 'Solar')
  assert.equal(packCredit('no-such-pack'), null)
})

/* ── 3 · THE CREDIT ON THE ICON GRID ────────────────────────────────────────
 *
 * The defect in one line: the only attribution string in the app rendered when
 * `pack === 'logodev'` and vanished otherwise. */

test('the attribution under the icon grid is unconditional', () => {
  const rendered = /<IconPackCredit packs=\{packsOnScreen\(([^)]*)\)\} \/>/.exec(ICON_PAGE)
  assert.ok(rendered, 'IconLibrary.jsx no longer renders <IconPackCredit packs={packsOnScreen(...)} />')
  // It must sit OUTSIDE the isMyIcons branch and outside the loading, gated and
  // error conditions. Checked structurally: the render site is after the
  // fragment that closes the icons branch, at the same depth as <UIKitGuide>.
  const at = ICON_PAGE.indexOf('<IconPackCredit')
  const guide = ICON_PAGE.indexOf('<UIKitGuide step="icons" />')
  assert.ok(at > -1 && guide > at,
    'the credit no longer renders immediately before <UIKitGuide>, which is the one '
    + 'place on this surface that is outside every conditional')
  const line = ICON_PAGE.slice(ICON_PAGE.lastIndexOf('\n', at), guide)
  assert.ok(!/\{\s*(loading|gated|pack|source|query|isMyIcons)\b/.test(line),
    `the credit has been wrapped in a condition: ${line.trim()}`)
})

test('the credit names the packs in view, including the fallback grid’s', () => {
  assert.match(ICON_PAGE, /const PREFIX_BY_LABEL = /,
    'the label→prefix resolution is gone, so the 120 built-in icons the offline '
    + 'state renders — Lucide, Tabler, Iconoir, Heroicons and Simple Icons — go '
    + 'uncredited, because renderLocal() sets `pack` to a display name.')
  assert.match(ICON_PAGE, /packsOnScreen\(icons, recents\)/,
    'the credit no longer reads the Recent rail, which renders above every state '
    + 'of this page including the gated one')
})

test('the credit links to /credits, and /credits is a route', () => {
  assert.match(ICON_PAGE, /<Link to="\/credits">/, 'the icon grid no longer links to the credits page')
  assert.ok(PAGE_TITLES['/credits'], '/credits has no title in routeMetaMap.js')
  assert.ok(prerenderRoutes().includes('/credits'),
    '/credits is linked from the icon library but gets no crawlable shell')
})

/* ── 4 · FONTS ──────────────────────────────────────────────────────────────
 *
 * SIL OFL asks that the copyright notice travel with the font files. We serve
 * the .woff2 files from public/fonts/, so we redistribute them, so it is owed
 * for every one of them — including the three families no @font-face currently
 * declares, because serving the file IS the distribution. */

test('every *-OFL.txt in public/fonts has a credit, and its notice is verbatim', () => {
  const dir = path.join(ROOT, 'public', 'fonts')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('-OFL.txt')).sort()
  assert.ok(files.length >= 5, `only ${files.length} OFL files found — the read is broken`)

  const credited = new Set(FONT_CREDITS.map((f) => f.licenceFile))
  const missing = files.filter((f) => !credited.has(`/fonts/${f}`))
  assert.deepEqual(missing, [],
    'These font licences are served from public/fonts/ and are credited nowhere. '
    + 'Run `node scripts/sync-credits.mjs`:\n  ' + missing.join('\n  '))

  // THE COPYRIGHT LINES ARE NOT RETYPED. Each one is asserted against the first
  // line of the file it came from, so a manifest edited by hand — or a font
  // swapped underneath one — fails here rather than shipping the wrong notice.
  for (const font of FONT_CREDITS) {
    const text = fs.readFileSync(path.join(ROOT, 'public', font.licenceFile.replace(/^\//, '')), 'utf8')
    const first = text.split(/\r?\n/).find((l) => l.trim()).trim()
    assert.equal(font.copyright, first,
      `${font.family}'s credit is not the copyright line in ${font.licenceFile}`)
    assert.match(font.copyright, /^Copyright \d{4} /, `${font.family}'s notice does not open on a copyright`)
  }

  // Positive control on the one derivation that could silently mangle a name:
  // GEIST-MONO's own notice says "The Geist Project Authors", so the face's name
  // comes from the filename with JetBrains Mono's casing borrowed for "Mono".
  const families = FONT_CREDITS.map((f) => f.family)
  assert.ok(families.includes('Geist Mono'), `the family names came out as ${families.join(', ')}`)
  assert.ok(families.includes('JetBrains Mono'), 'JetBrains lost its casing in the derivation')
})

/* ── 5 · PACKAGES ───────────────────────────────────────────────────────────*/

test('every shipped dependency is credited with the licence it declares', () => {
  const pkg = JSON.parse(read('package.json'))
  const deps = Object.keys(pkg.dependencies).sort()
  const credited = new Map(DIRECT_DEPENDENCIES.map((d) => [d.name, d.licence]))

  const missing = deps.filter((d) => !credited.has(d))
  assert.deepEqual(missing, [],
    'These packages ship and are credited nowhere. Run `node scripts/sync-credits.mjs`:\n  '
    + missing.join('\n  '))

  for (const name of deps) {
    const installed = JSON.parse(read(path.join('node_modules', name, 'package.json')))
    assert.equal(credited.get(name), installed.license,
      `${name} is credited as "${credited.get(name)}" and declares "${installed.license}"`)
  }
})

test('the whole @firebase scope is named, not counted', () => {
  const pkg = JSON.parse(read('package.json'))
  const dev = new Set(Object.keys(pkg.devDependencies || {}))
  const installed = fs.readdirSync(path.join(ROOT, 'node_modules', '@firebase'))
    .map((n) => `@firebase/${n}`)
    .filter((n) => !dev.has(n))
    .sort()
  assert.ok(installed.length >= 30,
    `only ${installed.length} @firebase packages found — the Apache-2.0 obligation is bigger than that`)

  assert.deepEqual(FIREBASE_PACKAGES.map((p) => p.name), installed,
    'the credited @firebase scope is not the installed one. Run `node scripts/sync-credits.mjs`.')
  for (const p of FIREBASE_PACKAGES) {
    assert.equal(p.licence, 'Apache-2.0', `${p.name} is credited as ${p.licence}`)
  }
})

test('jszip’s dual licence is ELECTED on the page, not merely restated', () => {
  // The obligation here is specific: jszip is "(MIT OR GPL-3.0-or-later)", and
  // which half we take decides which notice we are bound to keep. A credits
  // page that prints the raw string and says nothing has not answered.
  const row = DIRECT_DEPENDENCIES.find((d) => d.name === 'jszip')
  assert.ok(row, 'jszip is no longer a dependency — if it really went, delete this test with it')
  assert.match(row.licence, /MIT OR GPL/, `jszip now declares "${row.licence}"`)
  assert.match(CREDITS_PAGE, /jszip: '[^']*\bMIT\b[^']*'/,
    'Credits.jsx no longer states which half of jszip’s dual licence UIL4B elects')
  assert.match(CREDITS_PAGE, /jszip: '[^']*elects[^']*'/,
    'the jszip note no longer says the election is a choice we made')
})

/* ── 6 · THE GENERATED MANIFEST IS THE GENERATOR'S OUTPUT ───────────────────
 *
 * The same guard public/sitemap.xml, vercel.json and public/llms.txt carry, and
 * for the same reason: a generated file anyone can hand-edit is a hand-written
 * file with a misleading comment on top. Line endings normalised on both sides
 * — this repo has no .gitattributes and checks out CRLF on Windows. */

test('src/data/creditsManifest.json is exactly what the generator writes', async () => {
  const eol = (s) => s.replace(/\r\n/g, '\n')
  assert.equal(eol(read('src/data/creditsManifest.json')), eol(await buildCreditsManifest()),
    'run `node scripts/sync-credits.mjs` — the credits manifest has drifted from '
    + 'public/fonts/, package.json or node_modules/')
})

/* ── 7 · THE PAGE, AND THE WAYS TO IT ───────────────────────────────────────*/

test('the credits page is built from the registries, not typed', () => {
  assert.match(CREDITS_PAGE, /from '\.\.\/data\/iconPackCredits'/,
    'Credits.jsx no longer reads the icon packs from the credit registry')
  assert.match(CREDITS_PAGE, /from '\.\.\/data\/creditsManifest\.json'/,
    'Credits.jsx no longer reads the fonts and packages from the generated manifest')
  // The counts in the tally are the lengths of those lists. A number typed onto
  // this page is the exact defect the page exists to end.
  assert.match(CREDITS_PAGE, /\{packs\.length\}/, 'the icon-set count is typed')
  assert.match(CREDITS_PAGE, /\{FONT_CREDITS\.length\}/, 'the typeface count is typed')
  assert.match(CREDITS_PAGE, /\{DIRECT_DEPENDENCIES\.length \+ FIREBASE_PACKAGES\.length\}/,
    'the package count is typed')
  assert.ok(!/\b(twemoji|openmoji|CC BY 4\.0|Apache 2\.0 licen)/.test(
    CREDITS_PAGE.replace(/https?:\/\/\S+/g, '')),
  'a pack name or a licence label has been typed into Credits.jsx rather than derived')
})

test('both footers reach /credits, so every page discharges the notice', () => {
  // SpectrumFooter replaces AppFooter on the front door, so a link only one of
  // them carries is a notice the other half of the site does not give. The
  // parity test in spectrum-structure.test.js catches the AppFooter→Spectrum
  // direction; this catches both, and says why.
  for (const file of ['src/components/AppFooter.jsx', 'src/components/spectrum/SpectrumFooter.jsx']) {
    assert.match(stripComments(read(file)), /\['\/credits', '[^']+'\]/,
      `${file} does not link /credits. The CC-BY icon sets, the OFL typefaces and the `
      + 'Apache-2.0 SDK all ask that their notices be reachable from wherever the work is, '
      + 'and a footer link on every page is how a website answers that.')
  }
})

test('/credits is a real route in every registry a live route needs', () => {
  const app = stripComments(read('src/App.jsx'))
  assert.match(app, /<Route path="\/credits"/, 'App.jsx mounts no /credits route')
  assert.ok(PAGE_TITLES['/credits'], 'no title in routeMetaMap.js')
  assert.ok(PAGE_DESCRIPTIONS['/credits'], 'no description in routeMetaMap.js')
  assert.ok(prerenderRoutes().includes('/credits'), 'the route matrix does not prerender /credits')
  // The three generated files. Each has its own drift test in
  // prerender-routes.test.js and llms-txt-truth.test.js; this asserts the route
  // actually reached them, which those cannot say on their own.
  assert.match(read('public/sitemap.xml'), /<loc>https:\/\/uil4b\.com\/credits<\/loc>/,
    'run `npm run sync:sitemap`')
  assert.ok(JSON.parse(read('vercel.json')).rewrites.some((r) => r.source === '/credits'),
    'run `npm run sync:rewrites` — without a rewrite the catch-all serves /credits the 404 shell')
  assert.match(read('public/llms.txt'), /\/credits\)/, 'run `npm run sync:llms`')
})

/* ── 8 · THE TWO CREDITS WITH NO FILE TO READ ───────────────────────────────
 *
 * Unicode CLDR and the Iconify API are stated on the page because there is no
 * manifest for either. That makes them the two rows that CAN go stale, so each
 * one is checked against the file that would have to change. */

test('the CLDR credit is still true of the script that builds the emoji index', () => {
  const script = stripComments(read('scripts/build-emoji-index.mjs'))
  assert.match(script, /cldr-json/,
    'scripts/build-emoji-index.mjs no longer sources Unicode CLDR, so the credit on '
    + '/credits describes a source the emoji index does not use any more')
  assert.match(CREDITS_PAGE, /Unicode CLDR/, 'Credits.jsx no longer credits Unicode CLDR')
  assert.match(CREDITS_PAGE, /emojiIndex\.txt/,
    'the CLDR credit no longer names the file it explains, so nobody can check it')
  assert.ok(fs.existsSync(path.join(ROOT, 'src', 'data', 'emojiIndex.txt')),
    'the emoji index is gone — if it really went, this credit should go with it')
})

test('the Iconify credit is still true of the page that fetches through it', () => {
  assert.match(ICON_PAGE, /api\.iconify\.design/,
    'IconLibrary.jsx no longer fetches from Iconify, so the credit on /credits is stale')
  assert.match(CREDITS_PAGE, /Iconify/, 'Credits.jsx no longer credits Iconify')
})
