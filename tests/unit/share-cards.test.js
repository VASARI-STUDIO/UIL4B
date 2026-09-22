// Share cards and per-route structured data.
//
// ── What was broken ─────────────────────────────────────────────────────────
//
// scripts/prerender.mjs rewrote every per-route head tag EXCEPT og:image and
// twitter:image, so all the shells pointed at one card and a link to any tool
// unfurled as the homepage. The words were per-route and the picture was not,
// and the picture is the half people look at.
//
// ── The two failure modes this file exists for ─────────────────────────────
//
// A GENERATED, COMMITTED ARTEFACT GOES STALE SILENTLY. The cards are drawn by
// `npm run og:cards` and checked in, which is the same contract vercel.json
// has, and it has the same weakness: a PNG cannot fail a build when the brand
// moves underneath it. So the generator writes public/previews/cards.json
// recording the tokens and tool names each card was drawn from, and the tests
// below re-read those from source and compare. A hue change, a renamed tool or
// a newly-shipped tool now fails here with "run `npm run og:cards`" rather than
// leaving a wrong picture live for months.
//
// INVENTED STRUCTURED DATA. Fabricated ratings, review counts and availability
// are the most common lie in schema markup and carry a site-wide manual-action
// risk. The last test in this file reads the BUILT shells and fails if any of
// those words appear anywhere in them — which is a rule about what we will
// never claim, not a rule about today's code.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'
import {
  DEFAULT_CARD,
  SECTIONS,
  allCardFiles,
  cardFor,
  cardUrl,
  toolNamesFor,
} from '../../scripts/share-cards.mjs'
import {
  breadcrumbFor,
  breadcrumbRoutes,
  crumbName,
  parentOf,
} from '../../scripts/route-schema.mjs'
import { railSections, readHero, readTokens } from '../../scripts/og-cards.mjs'

const REPO = process.cwd()
const ORIGIN = 'https://uil4b.com'
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8')
const previews = (f) => path.join(REPO, 'public', 'previews', f)
const built = fs.existsSync(path.join(REPO, 'dist', 'index.html'))

// Read one meta tag's content out of a served document, by VALUE rather than by
// matching the whole tag. index.html writes `content="...">` and prerender's
// rewrite normalises to `content="..." />`, so a whole-tag comparison would
// fail on the self-closing slash and report a formatting difference as a wrong
// picture. The entities are decoded for the same reason: "Icons & Emoji" is
// served as "Icons &amp; Emoji", which is correct escaping, not a mismatch.
function meta(html, attrName, key) {
  const m = html.match(new RegExp(`<meta\\s+${attrName}="${key}"\\s+content="([^"]*)"`))
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>') : null
}

/** Width and height straight out of a PNG's IHDR chunk. */
function pngSize(file) {
  const buf = fs.readFileSync(file)
  assert.equal(buf.subarray(1, 4).toString('ascii'), 'PNG', `${file} is not a PNG`)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

// ── The cards ───────────────────────────────────────────────────────────────

test('every card the site references exists on disk', () => {
  for (const file of allCardFiles()) {
    assert.ok(fs.existsSync(previews(file)),
      `public/previews/${file} is referenced but missing — run \`npm run og:cards\``)
  }
})

test('every card is a real 1200x630 PNG', () => {
  // 1200x630 is what every unfurler crops to — Facebook, LinkedIn, Slack,
  // X's summary_large_image, Discord. A card at any other size is cropped by
  // someone, and a zero-byte or half-written file passes an existence check.
  for (const file of allCardFiles()) {
    const { width, height } = pngSize(previews(file))
    assert.equal(width, 1200, `${file} is ${width}px wide`)
    assert.equal(height, 630, `${file} is ${height}px tall`)
  }
})

test('THE ONE THAT MATTERS: no prerendered route unfurls as the wrong picture', () => {
  // Every route gets a card, every card file exists, and the count that
  // actually improved is asserted rather than assumed — a refactor that quietly
  // sent every route back to the default would otherwise still be green here.
  const routes = prerenderRoutes()
  let carded = 0
  for (const route of routes) {
    const card = cardFor(route)
    assert.ok(card && card.file, `${route} resolves to no share card at all`)
    assert.ok(fs.existsSync(previews(card.file)),
      `${route} points at public/previews/${card.file}, which does not exist`)
    assert.match(cardUrl(ORIGIN, card), /^https:\/\/uil4b\.com\/previews\/.+\.png$/,
      `${route}'s og:image is not an absolute URL — relative og:image is ignored by most unfurlers`)
    if (card.id !== DEFAULT_CARD.id) carded += 1
  }
  assert.ok(carded >= 15,
    `only ${carded} of ${routes.length} routes get a section card — the section map has `
    + 'shrunk and most tools are back to unfurling as the homepage')
})

test('every route a section claims is actually prerendered', () => {
  // A section pointing at a route with no shell is a card nobody will ever see,
  // and it is how a section quietly stops covering the tool it was drawn for.
  const routes = new Set(prerenderRoutes())
  for (const section of SECTIONS) {
    assert.ok(section.routes.length >= 1, `section ${section.id} claims no routes`)
    for (const route of section.routes) {
      assert.ok(routes.has(route),
        `section ${section.id} claims ${route}, which gets no prerendered shell`)
    }
  }
})

test('no two sections claim the same route, and every alt is distinct', () => {
  const seen = new Map()
  for (const section of SECTIONS) {
    for (const route of section.routes) {
      assert.ok(!seen.has(route),
        `${route} is claimed by both ${seen.get(route)} and ${section.id}`)
      seen.set(route, section.id)
    }
  }
  // The alt text is what a screen-reader user gets instead of the picture. Two
  // cards sharing one description means one of them is described wrongly.
  const alts = SECTIONS.map((s) => cardFor(s.routes[0]).alt)
  assert.equal(new Set(alts).size, alts.length, 'two sections share alt text')
  for (const alt of alts) {
    assert.ok(alt.length > 20 && alt.startsWith('UI L4B'), `weak alt text: "${alt}"`)
  }
})

test('THE STALENESS ONE: the committed cards were drawn from today\'s tokens', async () => {
  // The standing objection to a generated-and-committed artefact, answered.
  // A PNG cannot fail when the brand moves under it, so the generator records
  // what it drew from and this compares that against the live source.
  const manifest = JSON.parse(read('public/previews/cards.json'))
  const tokens = await readTokens()
  assert.deepEqual(manifest.tokens, tokens,
    'the design tokens have moved since the share cards were drawn, so the '
    + 'committed cards are the wrong colours. Run `npm run og:cards`.')

  // And the tool names printed on each card, which change whenever a tool ships
  // or is renamed.
  const live = SECTIONS.map((s) => ({ id: s.id, label: s.label, blurb: s.blurb, tools: toolNamesFor(s) }))
  assert.deepEqual(manifest.sections, live,
    'a section\'s label, blurb or tool list has changed since the cards were drawn, '
    + 'so a card is advertising the wrong tools. Run `npm run og:cards`.')
})

test('THE OTHER STALENESS ONE: the homepage card quotes the homepage', async () => {
  // ── What this is for ─────────────────────────────────────────────────────
  //
  // The homepage card used to be hand-made art sitting outside the generator,
  // and it drifted exactly the way a hand-made artefact does: it advertised
  // "No more tab hoarding" for weeks after the homepage stopped saying it —
  // src/pages/Onboarding.jsx records that line being removed from the anonymous
  // sales page. The front door's share card promised a sentence that appeared
  // nowhere on the page it linked to, and nothing could notice.
  //
  // The card is now drawn from Home.jsx's own hero, and this is what makes a
  // hero rewrite fail loudly here instead of silently mis-selling the product.
  const manifest = JSON.parse(read('public/previews/cards.json'))
  const hero = await readHero()
  assert.deepEqual(manifest.hero, hero,
    'the homepage hero has changed since the front-door card was drawn, so the '
    + 'card is quoting a headline the page no longer shows. Run `npm run og:cards`.')

  // The highlighted phrase is the claim the page stakes itself on, so the card
  // has to carry it as a highlight rather than flattening it into plain words.
  assert.ok(hero.headline.some((run) => run.hi && run.text.length > 2),
    'the homepage no longer highlights a phrase in its h1 — the card composition '
    + 'in og-cards.mjs assumes one and would print an unremarkable sentence')
})

test('the homepage rail names every toolkit area exactly once', () => {
  // The rail is the front-door card's whole claim: this is the toolkit, not one
  // area of it. A hue losing its section, or two sections claiming one hue,
  // would quietly shrink that claim.
  const rail = railSections()
  assert.equal(rail.length, 6, `the rail shows ${rail.length} areas, expected 6`)
  assert.equal(new Set(rail.map((r) => r.hue)).size, 6, 'a hue appears twice in the rail')
  assert.equal(new Set(rail.map((r) => r.label)).size, 6, 'two rail bands carry the same label')
  // Plans is deliberately absent: it reuses the colour hue and owns no band.
  assert.ok(!rail.some((r) => r.label === 'Plans'),
    'Plans has taken a rail band, but it shares --hue-colour and owns none')
})

test('no card is heavy enough to be dropped or to cost a reader real bandwidth', () => {
  // The defect that started this: the hand-made homepage card was 785 KB — about
  // twenty times the generated section cards — on a 1200x630 image that is flat
  // colour and type. Several scrapers cap the file size they will fetch, and
  // every unfurl anywhere pays for it. 200 KB is deliberately loose; the point is
  // to catch a return to that ORDER of weight, not to police a few kilobytes.
  const LIMIT = 200 * 1024
  for (const file of allCardFiles()) {
    const bytes = fs.statSync(previews(file)).size
    assert.ok(bytes <= LIMIT,
      `public/previews/${file} is ${(bytes / 1024).toFixed(0)} KB. A share card this `
      + 'heavy gets skipped by some unfurlers. Redraw it with `npm run og:cards` '
      + 'rather than shipping hand-exported art.')
  }
})

test('index.html declares the card dimensions', () => {
  // twitter:card is already summary_large_image, but some platforms will not
  // commit to the large card without explicit dimensions and fall back to a
  // small square thumbnail. Every card is 1200x630 (asserted above), so these
  // are constants rather than something prerender rewrites per route.
  const html = read('index.html')
  assert.match(html, /<meta property="og:image:width" content="1200">/,
    'index.html does not declare og:image:width')
  assert.match(html, /<meta property="og:image:height" content="630">/,
    'index.html does not declare og:image:height')
})

test('the built shells carry the card dimensions too', {
  skip: !built && 'run `npm run build` first',
}, () => {
  for (const route of prerenderRoutes()) {
    const html = read(`dist${route}/index.html`)
    assert.equal(meta(html, 'property', 'og:image:width'), '1200',
      `dist${route}/index.html does not declare its card width`)
    assert.equal(meta(html, 'property', 'og:image:height'), '630',
      `dist${route}/index.html does not declare its card height`)
  }
})

// ── The structured data ─────────────────────────────────────────────────────

test('a breadcrumb is emitted only where there is a real three-level trail', () => {
  const routes = prerenderRoutes()
  const crumbed = breadcrumbRoutes(routes, ORIGIN)
  assert.ok(crumbed.length >= 6,
    `only ${crumbed.length} routes carry a BreadcrumbList — the parent rule has broken`)
  for (const route of crumbed) {
    const crumb = breadcrumbFor(route, ORIGIN)
    assert.equal(crumb.itemListElement.length, 3,
      `${route}'s trail is not three levels — "Home > Page" is the URL restated, not a hierarchy`)
    // Only the LAST item may omit `item`. An intermediate crumb without a URL
    // is a link in the hierarchy that is not a page.
    const [home, parent, leaf] = crumb.itemListElement
    assert.ok(home.item && parent.item, `${route} has an intermediate crumb with no URL`)
    assert.equal(leaf.item, undefined,
      `${route}'s final crumb names its own URL, which adds nothing`)
    assert.deepEqual(crumb.itemListElement.map((i) => i.position), [1, 2, 3])
  }
})

test('THE ONE THAT KEEPS IT TRUE: every parent crumb points at a page that exists', () => {
  // The trap this rules out. Four Create category homes REDIRECT to their first
  // tool (see scripts/route-matrix.mjs), so a breadcrumb naming
  // /create/typography as a parent would put a bounce in the middle of a
  // hierarchy. They are excluded by the parent rule, and this asserts the rule
  // rather than trusting it.
  const prerendered = new Set(prerenderRoutes())
  for (const route of breadcrumbRoutes(prerenderRoutes(), ORIGIN)) {
    const parent = parentOf(route)
    assert.ok(prerendered.has(parent),
      `${route}'s breadcrumb names ${parent} as its parent, but ${parent} has no `
      + 'shell of its own — it is a redirect, not a page')
  }
  // Stated by name, because it is the specific mistake being avoided.
  //
  // `/create/contrast` JOINED THIS LIST on 2026-09-18 and it used to be the
  // counter-example below it. Its parent was `/create/color`, the one Create
  // category home that rendered a page; the founder deleted that landing when
  // Spectrum became `/`, so all five colour tools are now in the same position
  // as the four already named here — a category home that only redirects, and
  // therefore no parent rather than a fabricated one.
  for (const tool of [
    '/create/font-pair', '/create/emoji', '/create/aspect-ratio', '/create/alt-text',
    '/create/contrast', '/create/palette', '/create/tint', '/create/gradient',
  ]) {
    assert.equal(parentOf(tool), null,
      `${tool}'s category home redirects, so it must not get a fabricated parent`)
  }
  // And the one that DOES have a real parent still does. /discover is a page in
  // its own right, which is what makes it a legitimate middle crumb.
  assert.equal(parentOf('/discover/palettes'), '/discover')
})

test('crumb names come from the page\'s own title, without the site name', () => {
  assert.equal(crumbName('/create/contrast'), 'Colour Contrast Checker')
  assert.equal(crumbName('/discover'), 'Discover')
  assert.equal(crumbName('/nope'), null)
  // No crumb repeats the site name on every level.
  for (const route of breadcrumbRoutes(prerenderRoutes(), ORIGIN)) {
    for (const item of breadcrumbFor(route, ORIGIN).itemListElement) {
      assert.ok(!item.name.includes('UI L4B'), `"${item.name}" carries the site name`)
    }
  }
})

// ── What we will never claim ────────────────────────────────────────────────

test('NO INVENTED STRUCTURED DATA: no shell claims a rating, a review or stock', {
  skip: !built && 'run `npm run build` first',
}, () => {
  // A rule about what we will never say, checked against what is actually
  // served. aggregateRating is the single most common piece of fabricated
  // schema on the web and the one that would earn /plans a rich result — which
  // is exactly why it must be absent rather than merely unwritten today.
  //
  // Read out of the BUILT shells, not the source, because that is the document
  // a crawler receives and the only place a claim can actually be made.
  const forbidden = ['aggregateRating', 'ratingValue', 'reviewCount', 'ratingCount', 'availability']
  const shells = ['dist/index.html', 'dist/404.html',
    ...prerenderRoutes().map((r) => `dist${r}/index.html`)]
  let checked = 0
  for (const shell of shells) {
    const html = read(shell)
    for (const word of forbidden) {
      assert.ok(!html.includes(word),
        `${shell} claims "${word}". We do not have ratings, reviews or stock, and `
        + 'inventing them is a site-wide manual-action risk, not a shortcut.')
    }
    checked += 1
  }
  assert.ok(checked >= 25, `only read ${checked} shells — this passed by finding nothing`)
})

test('NO FAQPage on /help, and the built shell proves it', {
  skip: !built && 'run `npm run build` first',
}, () => {
  // /help does hold genuine Q&A. It still gets no FAQPage, and since 2026-09-06
  // it rests on ONE reason rather than two — see scripts/route-schema.mjs.
  // Google restricted FAQ rich results to authoritative government and health
  // sites in 2023, so the markup earns nothing here and carries a policy risk.
  //
  // THE SECOND REASON IS GONE AND THIS TEST CHANGED WITH IT. It used to quote
  // `{tab === 'faq' && <FAQTab />}` to keep "the answers are not in the DOM"
  // checkable. /help is no longer a tabbed document: HELP_ANSWERS renders
  // unconditionally. Asserting the old conditional would now be asserting that
  // a page stays worse so a comment can stay true, so what is pinned instead is
  // the pair of facts that are actually load-bearing today — the answers ARE
  // rendered on load, and no shell claims a FAQPage anyway.
  const help = read('src/pages/HelpCentre.jsx')
  assert.match(help, /HELP_ANSWERS\.map\(/,
    'HelpCentre.jsx no longer renders the answers from HELP_ANSWERS')
  assert.ok(!/tab === 'faq'/.test(help),
    'the FAQ is behind a tab again — reason 2 in route-schema.mjs was retired on the '
    + 'basis that it is not, so restore that reason or restore this render')

  // Not just /help: no shell anywhere may claim a FAQPage. The old assertion
  // read one file, so a FAQPage emitted onto every route would have passed
  // everywhere except the one page it was written about.
  const shells = ['dist/index.html', 'dist/404.html',
    ...prerenderRoutes().map((r) => `dist${r}/index.html`)]
  let checked = 0
  for (const shell of shells) {
    assert.ok(!read(shell).includes('FAQPage'), `${shell} claims a FAQPage it does not render`)
    checked += 1
  }
  assert.ok(checked >= 25, `only read ${checked} shells — this passed by finding nothing`)
})

test('the built shells carry the images and the breadcrumbs', {
  skip: !built && 'run `npm run build` first',
}, () => {
  // End to end, out of the served document. Everything above tests the
  // functions; this tests that prerender.mjs actually used them.
  const routes = prerenderRoutes()
  for (const route of routes) {
    const html = read(`dist${route}/index.html`)
    const card = cardFor(route)
    const src = cardUrl(ORIGIN, card)
    assert.equal(meta(html, 'property', 'og:image'), src,
      `dist${route}/index.html does not point og:image at ${card.file}`)
    assert.equal(meta(html, 'name', 'twitter:image'), src,
      `dist${route}/index.html does not point twitter:image at ${card.file}`)
    assert.equal(meta(html, 'property', 'og:image:alt'), card.alt,
      `dist${route}/index.html describes a different card than it shows`)
    const wantsCrumb = !!breadcrumbFor(route, ORIGIN)
    assert.equal(html.includes('"BreadcrumbList"'), wantsCrumb,
      `dist${route}/index.html ${wantsCrumb ? 'is missing its' : 'carries an unexpected'} BreadcrumbList`)
  }
  // The shells must not all be identical on this, which is the bug being fixed.
  const images = new Set(routes.map((r) => cardFor(r).file))
  assert.ok(images.size >= 6,
    `all ${routes.length} shells resolve to only ${images.size} distinct images — `
    + 'this is the single-card bug returning')
})
