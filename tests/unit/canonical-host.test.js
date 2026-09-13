// The site's one origin — asserted on what actually SHIPS, not on the source.
//
// ── The defect this ends ────────────────────────────────────────────────────
//
// Measured 2026-09-13. Every canonical tag, og:url, og:image, twitter:image and
// JSON-LD url on all 40 prerendered shells named `https://www.uil4b.com`, and
// that host does not serve:
//
//   · `curl https://uil4b.com/`      -> 200 in 0.9 s
//   · `curl https://www.uil4b.com/`  -> connection timeout on 443, twice, 21 s
//   · `curl https://example.com/`    -> 200, the control that says the network
//                                       was reachable from where this was run
//   · the Vercel project `ui_l4b` lists `uil4b.com`,
//     `uil4b-dylan-coleman.vercel.app` and
//     `uil4b-git-main-dylan-coleman.vercel.app`. `www.uil4b.com` is not a
//     domain on the project at all.
//   · DNS: `www.uil4b.com` is a CNAME to `ns1.vercel-dns.com` — a NAMESERVER
//     (198.51.44.13), not the serving endpoint `cname.vercel-dns.com`.
//
// So every shared link unfurled with a broken preview image on Slack, LinkedIn,
// X, Discord and iMessage, and every page told crawlers its authoritative URL
// was a host that does not answer. scripts/prerender.mjs already called a wrong
// canonical "an explicit instruction to drop them from the index" — it fixed the
// per-ROUTE half, and the HOST was never checked. Founder decision: point the
// site at the apex, which already serves and is the only configured domain.
//
// ── Why this reads dist/ rather than src/ ───────────────────────────────────
//
// The source could be right and a script could still write the wrong string.
// Every constant here is one import away from something that builds a URL by
// concatenation — prerender.mjs, site-pricing.mjs, route-schema.mjs,
// llms-txt.mjs, sync-sitemap.mjs — and a template that loses its binding is
// silent. The only statement worth making is about the bytes a visitor, a
// crawler or an unfurler receives, so every assertion below is on a built
// artefact: the shells, the JSON-LD inside them, dist/llms.txt,
// dist/sitemap.xml, dist/robots.txt, and the watermark produced by EXECUTING
// the shipped export chunk.
//
// ── Why every group carries a positive control ──────────────────────────────
//
// "X does not appear in these files" is trivially true of an empty list, a
// path that moved, or a glob that matched nothing — and a guard that has quietly
// stopped reading anything looks exactly like a guard that is passing. That
// failure has happened on this repo. So each group first proves it is holding
// the real artefact: the expected number of shells, each one found by ROUTE
// (derived from the same matrix the build uses) rather than by walking whatever
// happens to be on disk, and the CORRECT origin present the expected number of
// times before anything is asserted absent.
//
// NOT ASSERTED BY FETCHING ANYTHING. This is hermetic. The measurements above
// are recorded here as the reason the constant is what it is; nothing in this
// file goes near the network.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { SITE_ORIGIN } from '../../src/utils/routeMeta.js'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'

const REPO = process.cwd()
const DIST = path.join(REPO, 'dist')

// The host that does not serve, spelled once. Outside the two allowlists that
// deliberately still ACCEPT it on arrival (src/utils/environment.js and
// api/_lib/origins.js), a grep for it in this repo should land here and nowhere
// else.
const DEAD_HOST = 'www.uil4b.com'

// These read dist/, so they only mean anything after a build; skip rather than
// fail when run standalone. `npm run build` runs before `npm run test:unit`.
const built = fs.existsSync(path.join(DIST, 'index.html'))
const skip = !built && 'run `npm run build` first'

/** Every HTML document the build publishes, addressed by the route it serves.
 *  Derived from the same matrix prerender.mjs walks, plus the two files that
 *  are not in it: `/` (served as dist/index.html) and the 404 shell. */
function shippedDocuments() {
  const docs = [
    { route: '/', file: path.join(DIST, 'index.html') },
    ...prerenderRoutes().map((route) => ({
      route,
      file: path.join(DIST, ...route.split('/').filter(Boolean), 'index.html'),
    })),
    { route: '/404', file: path.join(DIST, '404.html') },
  ]
  return docs.map((d) => ({ ...d, html: fs.readFileSync(d.file, 'utf8') }))
}

/** One meta tag's content, read by VALUE — index.html writes `content="...">`
 *  and prerender's rewrite normalises to `content="..." />`, so matching the
 *  whole tag would compare formatting rather than meaning. */
function meta(html, attr, key) {
  const m = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`).exec(html)
  return m && m[1]
}

function canonical(html) {
  const m = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html)
  return m && m[1]
}

/** Every string value anywhere inside a parsed JSON-LD block. */
function stringsIn(node, out = []) {
  if (typeof node === 'string') out.push(node)
  else if (Array.isArray(node)) node.forEach((n) => stringsIn(n, out))
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => stringsIn(n, out))
  return out
}

/** The JSON-LD blocks in one shell, parsed. Parsing is itself an assertion:
 *  structured data that does not parse is structured data Google discards. */
function jsonLdOf(html, label) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, body]) => {
      try {
        return JSON.parse(body)
      } catch (err) {
        assert.fail(`${label} carries JSON-LD that does not parse: ${err.message}`)
        return null
      }
    })
}

// ── The shells ──────────────────────────────────────────────────────────────

test('the probe is holding the real build', { skip }, () => {
  const docs = shippedDocuments()
  // 39 route shells + dist/index.html + the 404 shell. If the build stops
  // producing one of these the read throws above rather than passing quietly.
  assert.equal(docs.length, 41, 'the matrix and the published document set disagree')
  assert.equal(prerenderRoutes().length, 39,
    'the route matrix moved — every count in this file is calibrated against 39 route shells')
  for (const { route, html } of docs) {
    assert.ok(html.length > 2000, `${route} is a stub, not a built shell (${html.length} bytes)`)
    // The correct origin IS there, and not once by accident: canonical (except
    // on the noindex 404), og:url, og:image, twitter:image, the noscript link
    // and the JSON-LD all carry it. The floor is deliberately below the
    // observed minimum of 8 so adding a tag cannot make this fail spuriously,
    // but high enough that a shell which lost the origin cannot pass.
    const hits = html.split(SITE_ORIGIN).length - 1
    assert.ok(hits >= 6, `${route} names ${SITE_ORIGIN} only ${hits} times — is this shell written at all?`)
  }
})

test('no published shell names the host that does not serve', { skip }, () => {
  for (const { route, html } of shippedDocuments()) {
    assert.ok(!html.includes(DEAD_HOST),
      `dist${route} still tells crawlers and unfurlers the site lives at ${DEAD_HOST}, `
      + 'which times out on 443')
  }
})

test('canonical, og:url, og:image and twitter:image are on the apex in every shell', { skip }, () => {
  let checked = 0
  for (const { route, html } of shippedDocuments()) {
    const robots = meta(html, 'name', 'robots') || ''
    const tags = {
      'og:url': meta(html, 'property', 'og:url'),
      'og:image': meta(html, 'property', 'og:image'),
      'twitter:image': meta(html, 'name', 'twitter:image'),
    }
    // A noindex shell gets NO canonical, deliberately — see prerender.mjs.
    if (!robots.includes('noindex')) tags.canonical = canonical(html)
    else assert.equal(canonical(html), null, `dist${route} is noindex and must not assert a canonical`)

    for (const [name, value] of Object.entries(tags)) {
      assert.ok(value, `dist${route} has no ${name} at all — the rewrite did not run`)
      assert.ok(value === SITE_ORIGIN || value.startsWith(`${SITE_ORIGIN}/`),
        `dist${route} ${name} is ${value}, which is not on ${SITE_ORIGIN}`)
      checked += 1
    }
  }
  // 41 documents x 3 always-present tags, + a canonical on all but the 404.
  assert.equal(checked, 41 * 3 + 40, 'fewer tags were read than the shells contain')
})

test('every URL in the shipped JSON-LD is on the apex', { skip }, () => {
  const ours = []
  for (const { route, html } of shippedDocuments()) {
    const blocks = jsonLdOf(html, `dist${route}`)
    assert.ok(blocks.length >= 1, `dist${route} ships no structured data`)
    for (const value of stringsIn(blocks)) {
      if (!value.includes('uil4b.com')) continue
      ours.push(value)
      assert.ok(value === SITE_ORIGIN || value.startsWith(`${SITE_ORIGIN}/`),
        `dist${route} publishes structured data pointing at ${value}`)
    }
  }
  // Positive control: the walk found real URLs, so "none of them is wrong" is
  // a statement about something. Every shell carries at least a WebApplication
  // url, and 16 carry a BreadcrumbList whose every item is a URL too.
  assert.ok(ours.length >= 41, `only ${ours.length} JSON-LD URLs were read across 41 shells`)
})

// ── The other published artefacts ───────────────────────────────────────────

test('dist/llms.txt advertises the apex and nothing else', { skip }, () => {
  const served = fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8')
  const rows = served.split(`](${SITE_ORIGIN}`).length - 1
  assert.ok(rows >= 30, `dist/llms.txt has only ${rows} linked rows — is this the generated file?`)
  assert.ok(!served.includes(DEAD_HOST),
    `dist/llms.txt points the one document written FOR a machine at ${DEAD_HOST}`)
  // The served copy and the committed copy are written by the same function, so
  // a stale commit cannot ship — but a divergence here means one of them was
  // hand-edited.
  //
  // COMPARE THE TEXT, NOT THE LINE ENDINGS. `public/llms.txt` is tracked, and
  // git hands it to a Windows checkout as CRLF, while the generator writes LF
  // straight into `dist/`. Those two facts made this assertion fail on `main`
  // over a byte difference that is not a difference in what the file says. It
  // passed in the branch worktree it was written in, which is exactly how it
  // reached main — a guard is only proven on the checkout it will run on.
  // `llms-txt-truth.test.js` has normalised here since it was written; this is
  // the same `eol` for the same reason.
  const eol = (t) => t.replace(/\r\n/g, '\n')
  assert.equal(eol(served), eol(fs.readFileSync(path.join(REPO, 'public', 'llms.txt'), 'utf8')),
    'dist/llms.txt and public/llms.txt disagree — run `npm run sync:llms`')
})

test('dist/sitemap.xml asks for the apex to be crawled', { skip }, () => {
  const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8')
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, url]) => url)
  assert.equal(locs.length, 39, `the sitemap advertises ${locs.length} URLs`)
  for (const url of locs) {
    assert.ok(url.startsWith(`${SITE_ORIGIN}/`),
      `sitemap.xml asks Google to crawl ${url}`)
  }
  assert.ok(!xml.includes(DEAD_HOST))
})

test('dist/robots.txt points at a sitemap that answers', { skip }, () => {
  const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8')
  assert.ok(robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`),
    'robots.txt does not name the sitemap on the serving host')
  assert.ok(!robots.includes(DEAD_HOST))
})

// ── The watermark, taken from the built chunk by running it ─────────────────
//
// Every watermarked style-guide export a free user has ever downloaded carried
// a link back to the site, and it was the dead host. This is the one artefact
// that is not text in dist/ — it is produced at runtime — so the only honest
// way to assert on the SHIPPED version is to import the built chunk and call
// it. Reading src/utils/styleGuideExport.js instead would prove the source and
// nothing about the bundle: the origin arrives there as an imported binding,
// and a build that dropped or rewrote that binding would still leave the
// source reading correctly.

const DESIGN = {
  palette: { base: '#0051FF', colors: ['#0051FF', '#4C8DFF', '#A9C7FF', '#0B1B3A'] },
  fonts: { heading: { family: 'Inter', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5 },
}
const AT = new Date('2026-08-12T00:00:00Z')
const CREDIT = /Made with \[UIL4B\]\(([^)]*)\)/g

/** Every string the built export chunk will produce for this design. The chunk
 *  is minified, so its exports are single letters; rather than guess which one
 *  is the Markdown builder, call them all and keep what comes back as text. */
async function builtExportStrings(options) {
  const dir = path.join(DIST, 'assets')
  const files = fs.readdirSync(dir).filter((f) => /^styleGuideExport-.*\.js$/.test(f))
  assert.equal(files.length, 1,
    `expected exactly one built styleGuideExport chunk, found ${files.length} — `
    + 'the chunk was renamed and this test is reading the wrong file')
  const mod = await import(pathToFileURL(path.join(dir, files[0])).href)
  const out = []
  for (const value of Object.values(mod)) {
    if (typeof value !== 'function') continue
    try {
      const result = value(DESIGN, options)
      if (typeof result === 'string') out.push(result)
    } catch {
      // Not one of the document builders — the chunk also exports contrast(),
      // grade() and friends, which take different arguments.
    }
  }
  assert.ok(out.length >= 2,
    `the built chunk produced ${out.length} documents — it is not being exercised`)
  return out
}

test('the watermark in the SHIPPED export chunk links to the apex', { skip }, async () => {
  const documents = await builtExportStrings({ projectName: 'Acme', watermark: true, date: AT })
  const credits = documents.flatMap((doc) => [...doc.matchAll(CREDIT)].map(([, url]) => url))
  // Positive control, and the one that matters most here: a regex that matches
  // nothing would make every assertion below vacuous.
  assert.ok(credits.length >= 1,
    'no watermark was produced by the built chunk at all — this test proves nothing')
  for (const url of credits) {
    assert.equal(url, SITE_ORIGIN,
      `a watermarked export ships a credit link to ${url}, which is not the serving host`)
  }
  for (const doc of documents) {
    assert.ok(!doc.includes(DEAD_HOST),
      `a built export document still names ${DEAD_HOST}`)
  }
})

test('the watermark probe is reading the real flag, not a constant', { skip }, async () => {
  // If `watermark: false` still produced a credit line, the test above would be
  // asserting on something the shipped code does not actually gate — and a
  // paying user would be getting the free tier's footer.
  const documents = await builtExportStrings({ projectName: 'Acme', watermark: false, date: AT })
  for (const doc of documents) {
    assert.equal([...doc.matchAll(CREDIT)].length, 0,
      'a watermark-free export still carries the credit link')
  }
})
