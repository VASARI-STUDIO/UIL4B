// The Iconify fixture stub (tests/user-sim/iconify-stub.js), pinned without a
// browser: what each endpoint answers, that every pack the page browses on
// first paint has a fixture file, and that the stub is installed in exactly one
// place. The rendered half — the page actually fetching through it — is
// tests/user-sim/66-icon-library-offline-fixture.spec.js.
//
// Comment-blind on purpose, like one-tap-stub.test.js: a rule about source is
// asserted against source with comments stripped, so an explanatory comment
// cannot satisfy it.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { answerIconify, fixturePacks, ICONIFY_HOSTS } from '../user-sim/iconify-stub.js'
import { stripJs as strip } from '../helpers/strip-comments.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const HOST = 'https://api.iconify.design'
const json = (a) => JSON.parse(a.body)

test('every pack IconLibrary.jsx browses on first paint has a fixture file', () => {
  const page = read('src/pages/IconLibrary.jsx')
  const groups = page.match(/const ICON_GROUPS = \{[\s\S]*?\n\}/)?.[0]
  assert.ok(groups, 'ICON_GROUPS is gone from IconLibrary.jsx — the fixture no longer knows what the page requests')
  const packs = [...new Set([...groups.matchAll(/packs:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)))]
  assert.ok(packs.length >= 20, `expected the page to browse many packs; parsed ${packs.length}`)
  const have = new Set(fixturePacks())
  const missing = packs.filter((p) => !have.has(p))
  assert.deepEqual(missing, [],
    'These packs are requested by /create/icons on first paint and have no file under '
    + 'tests/user-sim/fixtures/iconify/collection/. Add one, or the page falls back in the suite '
    + 'to a state the product never shows:\n  ' + missing.join('\n  '))
})

test('/collection answers per pack, and Lucide holds a full first page', () => {
  const a = answerIconify(`${HOST}/collection?prefix=lucide`)
  assert.equal(a.status, 200)
  const body = json(a)
  assert.equal(body.prefix, 'lucide')
  const names = Object.values(body.categories || {}).flat().concat(body.uncategorized || [])
  // Lucide leads ALL_PACKS and the page paints pack-by-pack, so the first
  // PAGE_SIZE (120) cells of the default grid are one pack when Lucide has at
  // least that many — the property 25-defect-sweep's pack-label test asserts.
  assert.ok(names.length >= 120, `lucide fixture has ${names.length} names; the default grid's first page needs 120 from one pack`)
  assert.ok(names.includes('zap'), '10-home hands lucide:zap to the editor; the fixture must hold it')
  assert.equal(answerIconify(`${HOST}/collection?prefix=no-such-pack`).status, 404)
})

test('/search filters the fixture index by query and by prefix(es), and a broad query mixes packs', () => {
  const mixed = json(answerIconify(`${HOST}/search?query=arrow&prefixes=logos,simple-icons,lucide,tabler&limit=999`))
  assert.ok(mixed.icons.length > 0)
  for (const id of mixed.icons) {
    const [prefix, name] = id.split(':')
    assert.ok(['logos', 'simple-icons', 'lucide', 'tabler'].includes(prefix), `${id} is outside the requested prefixes`)
    assert.ok(name.includes('arrow'), `${id} does not match the query`)
  }
  assert.ok(new Set(mixed.icons.map((id) => id.split(':')[0])).size > 1, 'a cross-pack search must answer with more than one pack')
  assert.equal(mixed.total, mixed.icons.length)

  const one = json(answerIconify(`${HOST}/search?query=arrow&prefix=lucide&limit=999`))
  assert.deepEqual([...new Set(one.icons.map((id) => id.split(':')[0]))], ['lucide'])

  const capped = json(answerIconify(`${HOST}/search?query=a&limit=3`))
  assert.equal(capped.icons.length, 3)
  assert.ok(capped.total > 3, 'total reports the full match count, limit only trims the page')
})

test('/collections and .svg answer, everything else is a 404', () => {
  const all = json(answerIconify(`${HOST}/collections`))
  for (const p of fixturePacks()) assert.ok(all[p], `${p} missing from /collections`)
  const some = json(answerIconify(`${HOST}/collections?prefixes=lucide,logos`))
  assert.deepEqual(Object.keys(some).sort(), ['logos', 'lucide'])

  const svg = answerIconify(`${HOST}/lucide/zap.svg?height=48`)
  assert.equal(svg.status, 200)
  assert.match(svg.contentType, /image\/svg\+xml/)
  assert.match(svg.body, /^<svg[\s>]/)
  assert.equal(answerIconify(`${HOST}/lucide/zap.json`).status, 404)
  assert.equal(answerIconify(`${HOST}/`).status, 404)
})

test('/{prefix}.json?icons= answers one body per requested name', () => {
  const a = answerIconify(`${HOST}/lucide.json?icons=zap,home,search`)
  assert.equal(a.status, 200)
  const body = json(a)
  assert.equal(body.prefix, 'lucide')
  assert.deepEqual(Object.keys(body.icons).sort(), ['home', 'search', 'zap'])
  for (const n of ['zap', 'home', 'search']) {
    assert.equal(typeof body.icons[n].body, 'string')
    assert.doesNotMatch(body.icons[n].body, /<svg/,
      'a batched icon carries the markup INSIDE the svg root, not a whole document — '
      + 'the page wraps it in its own <svg> with the viewBox from width/height')
  }
  // The page reads these to build the viewBox, so a missing default is a grid
  // of icons drawn at the wrong scale.
  assert.equal(body.width, 24)
  assert.equal(body.height, 24)
  assert.ok(body.aliases, 'aliases must be present — the page walks an alias chain')

  // A pack with no fixture file stays a 404, exactly as /collection does.
  assert.equal(answerIconify(`${HOST}/not-a-real-pack.json?icons=zap`).status, 404)
  // Without `icons=` this is not the batch endpoint and must not be invented.
  assert.equal(answerIconify(`${HOST}/lucide.json`).status, 404)
})

test('the GRID takes its markup from the batch endpoint, never one request per cell', () => {
  // THE REGRESSION THIS EXISTS FOR. Every cell used to be
  // `<img src={`https://api.iconify.design/${pack}/${name}.svg?…`}>`, so a
  // 120-cell first paint fired 120 image requests at one host on top of the 25
  // /collection requests — measured at ~145, which is what Cloudflare answered
  // with error 1015 and what left the founder looking at a grid of blank cells
  // on 2026-09-15. Comment-blind, so the note explaining the change cannot be
  // what satisfies the rule.
  const page = strip(read('src/pages/IconLibrary.jsx'))
  assert.match(page, /\.json\?icons=/,
    'IconLibrary.jsx must request the batched /{prefix}.json?icons=… endpoint')
  assert.doesNotMatch(page, /src=\{`https:\/\/api\.iconify\.design/,
    'A cell must not build its own api.iconify.design URL. That is the one-request-per-icon '
    + 'pattern that rate-limited the page into a grid of blank cells; the glyph comes from the '
    + 'batched endpoint, composed into a data: URI.')

  // The dead mirrors. Both answered 403 to every path when measured on
  // 2026-09-18, so listing them only bought three round trips per failure.
  assert.doesNotMatch(page, /api\.simplesvg\.com|api\.unisvg\.com/,
    'api.simplesvg.com and api.unisvg.com refuse this origin outright (403). They are not a '
    + 'fallback; re-adding one puts a guaranteed-failing hop back in front of every retry.')

  // Third-party markup must never become HTML. The whole repo is free of this
  // and that is a large part of why the 2026-09-16 security review found no XSS.
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/,
    'A batched body is remote third-party markup. It goes into a data: URI inside an <img>, '
    + 'which is a non-scripting context, never into the DOM as HTML.')
})

test('the stub is installed once, in base.js, and checked by the teardown', () => {
  const base = strip(read('tests/user-sim/base.js'))
  assert.match(base, /browser\.newContext\s*=\s*async[\s\S]{0,200}?stubIconify\s*\(/,
    'base.js must install stubIconify inside the browser.newContext wrap — the only place that covers every context')
  const teardown = strip(read('tests/user-sim/global-teardown.js'))
  assert.match(teardown, /assertIconifyNeverLeft\(\)/,
    'global-teardown.js must call assertIconifyNeverLeft(); a stub nothing checks is not evidence')

  // Handled once. The one exemption is the spec that renders the refused
  // state, and it must fulfil (429/403) rather than abort — an abort is a
  // console error the feedback loop reports.
  const EXEMPT = '66-icon-library-offline-fixture.spec.js'
  const dir = path.join(ROOT, 'tests', 'user-sim')
  const hosts = new RegExp(ICONIFY_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|'))
  const offenders = fs.readdirSync(dir).filter((f) => f.endsWith('.spec.js') && f !== EXEMPT)
    .filter((f) => hosts.test(strip(read(path.join('tests', 'user-sim', f)))))
  assert.deepEqual(offenders, [],
    'Iconify is handled once, in tests/user-sim/iconify-stub.js. A per-spec route on one of its hosts '
    + 'silently outranks the fixture:\n  ' + offenders.join('\n  '))
  const exempt = strip(read(path.join('tests', 'user-sim', EXEMPT)))
  assert.match(exempt, /status:\s*429/, `${EXEMPT} must reproduce the measured 429`)
  assert.doesNotMatch(exempt, /\.abort\(/, `${EXEMPT} must fulfil the refusal, not abort it`)
  assert.match(exempt, /\[ICONIFY_STUB_HEADER\]:\s*REFUSED_VALUE/,
    `${EXEMPT} must stamp its refusals with REFUSED_VALUE, or the teardown reads them as requests that reached the network`)
})
