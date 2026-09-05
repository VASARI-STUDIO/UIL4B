// THE UPLOADED LOGO — the only asset UIL4B accepts that it did not generate.
//
// Three things have to hold, and each is a section below:
//
//  1. IT CANNOT BECOME AN INJECTION. The mark ends up inside an HTML attribute
//     in a document that is then OPENED IN A BROWSER. `readLogo` is the only
//     path to that attribute, so if it will accept a string that is not a strict
//     base64 data: URI, the export has a hole in it.
//  2. IT CANNOT BREAK SYNC. contexts/ProjectContext.jsx pushes every project —
//     each carrying a deep clone of the design — into ONE Firestore document
//     with a 1 MiB ceiling, inside a catch that swallows failures. An oversized
//     logo would not error; it would silently stop the user's work syncing
//     between devices. The cap is the thing that prevents that, so the cap is
//     tested rather than trusted.
//  3. IT CANNOT SILENTLY DEGRADE THE DOCUMENT. A logo with no readable
//     dimensions must lose the one page that needs the geometry and keep the
//     rest, rather than drawing a keep-out box to a guessed proportion.
//
// The mutation record for this file is in the PR. Every assertion here was run
// against a deliberately broken version of the code first — an assertion nobody
// has seen fail is not an assertion.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  ACCEPT_TYPES, CLEAR_SPACE_RATIO, MAX_LOGO_BYTES, MAX_LOGO_LABEL,
  clearSpace, describeLogo, logoBytes, readLogo, sanitiseSvg, svgIntrinsicSize,
} from '../../src/utils/brandLogo.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')
const svgSrc = (body) => `data:image/svg+xml;base64,${b64(body)}`
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><rect width="240" height="60"/></svg>'
const GOOD = { src: svgSrc(SVG), width: 240, height: 60, type: 'image/svg+xml', name: 'mark.svg' }

/* ── 1 · it cannot become an injection ───────────────────────────────────── */

test('readLogo accepts a real base64 data URI', () => {
  // THE POSITIVE CONTROL for every rejection below. Without it, a readLogo()
  // that returned null for absolutely everything would pass this whole section.
  const logo = readLogo({ logo: GOOD })
  assert.ok(logo, 'the happy path is rejected — every rejection test below is now vacuous')
  assert.equal(logo.type, 'image/svg+xml')
  assert.equal(logo.aspect, 4)
})

test('readLogo refuses anything that is not a strict base64 image data URI', () => {
  // Each of these would end up inside src="…" in a document a browser opens.
  // The quote and the angle bracket are the attribute break-out; the rest are
  // the ways a "data:" prefix check that is not anchored and not charset-limited
  // gets fooled.
  const hostile = [
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    `data:image/svg+xml;base64,${b64(SVG)}" onerror="alert(1)`,
    `data:image/svg+xml;base64,${b64(SVG)}"><script>alert(1)</script>`,
    'data:image/svg+xml,%3Csvg onload%3D%22alert(1)%22%3E',
    ' data:image/png;base64,iVBORw0KGgo=',
    'https://example.com/logo.svg',
    '',
    null,
    42,
  ]
  for (const src of hostile) {
    assert.equal(readLogo({ logo: { ...GOOD, src } }), null,
      `readLogo accepted ${JSON.stringify(src)} — that string reaches an HTML attribute in the export`)
  }
})

test('readLogo refuses a MIME type outside the accepted set', () => {
  // The regex is the gate, not the `type` field the caller happened to pass, so
  // this is asserted through the src rather than through the metadata.
  assert.equal(readLogo({ logo: { ...GOOD, src: `data:image/gif;base64,${b64('x')}` } }), null)
  assert.equal(readLogo({ logo: { ...GOOD, src: `data:application/pdf;base64,${b64('x')}` } }), null)
  for (const mime of ACCEPT_TYPES) {
    assert.ok(readLogo({ logo: { ...GOOD, src: `data:${mime};base64,${b64('x')}` } }),
      `${mime} is advertised as accepted but readLogo rejects it`)
  }
})

test('a hostile file NAME cannot travel either', () => {
  const logo = readLogo({ logo: { ...GOOD, name: '<img src=x onerror=alert(1)>'.repeat(20) } })
  assert.ok(logo)
  assert.ok(logo.name.length <= 120, 'an unbounded name reaches the export')
  // It is not sanitised here on purpose — the document escapes it — so the
  // contract this asserts is only the length bound. describeLogo() is UI text.
  assert.ok(describeLogo(logo).includes('SVG'))
})

test('sanitiseSvg refuses the markup an <img> would neutralise anyway', () => {
  // Defence in depth: the mark is always rendered in an <img>, which is what
  // actually stops any of this executing. This refuses it regardless, because a
  // stored artefact that a future feature might inline should never have been
  // storable — and because the user should hear about it while they still have
  // the original file open.
  assert.equal(sanitiseSvg(SVG), null, 'plain artwork is refused — every case below is vacuous')
  const bad = [
    '<svg><script>alert(1)</script></svg>',
    '<svg onload="alert(1)"></svg>',
    '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml">x</body></foreignObject></svg>',
    '<svg><image href="https://evil.example/pixel.png"/></svg>',
    '<svg><image xlink:href="//evil.example/p.png"/></svg>',
    '<svg><iframe src="x"></iframe></svg>',
  ]
  for (const src of bad) {
    assert.ok(typeof sanitiseSvg(src) === 'string' && sanitiseSvg(src).length > 0,
      `sanitiseSvg accepted: ${src}`)
  }
  // A reference INTO the same document, and a data: URI, are ordinary artwork.
  assert.equal(sanitiseSvg('<svg><use href="#glyph"/></svg>'), null)
  assert.equal(sanitiseSvg('<svg><image href="data:image/png;base64,iVBOR"/></svg>'), null)
  // And something that is not an SVG at all is refused rather than passed.
  assert.ok(sanitiseSvg('GIF89a'))
})

/* ── 2 · it cannot break sync ────────────────────────────────────────────── */

test('the cap is small enough that a full Pro account still fits one Firestore doc', () => {
  // The arithmetic the cap exists for, written down so a future increase has to
  // argue with it. ProjectContext pushes the whole project list into ONE
  // document; Firestore's limit is 1 MiB; Pro has no project cap.
  const FIRESTORE_DOC_LIMIT = 1024 * 1024
  const PLAUSIBLE_PRO_PROJECTS = 30
  assert.ok(MAX_LOGO_BYTES * PLAUSIBLE_PRO_PROJECTS < FIRESTORE_DOC_LIMIT,
    `${MAX_LOGO_LABEL} × ${PLAUSIBLE_PRO_PROJECTS} projects exceeds Firestore's 1 MiB document limit — `
    + 'cross-device sync would stop, silently, because the push in ProjectContext.jsx swallows its errors')
  // …and not so small it is useless. A flat SVG wordmark is 2-20 KB.
  assert.ok(MAX_LOGO_BYTES >= 24 * 1024, 'the cap is now below the size of an ordinary SVG wordmark')
})

test('readLogo drops a logo over the cap instead of exporting it', () => {
  const huge = `data:image/png;base64,${'A'.repeat(MAX_LOGO_BYTES + 1)}`
  assert.ok(logoBytes(huge) > MAX_LOGO_BYTES)
  assert.equal(readLogo({ logo: { ...GOOD, src: huge } }), null)
  // Positive control: one byte under the cap is kept, so the assertion above is
  // measuring the cap and not merely rejecting long strings.
  const justUnder = `data:image/png;base64,${'A'.repeat(MAX_LOGO_BYTES - 'data:image/png;base64,'.length)}`
  assert.equal(logoBytes(justUnder), MAX_LOGO_BYTES)
  assert.ok(readLogo({ logo: { ...GOOD, src: justUnder } }))
})

test('the component states the same cap the module enforces', () => {
  // The Deel reading is that the ceiling is printed before anything is chosen.
  // That is only useful if the printed number is the enforced one, so the field
  // must DERIVE it rather than type it.
  const field = stripComments(read('src/components/BrandLogoField.jsx'))
  assert.match(field, /import \{[\s\S]*?MAX_LOGO_LABEL[\s\S]*?\} from '\.\.\/utils\/brandLogo'/,
    'BrandLogoField no longer imports the cap it prints')
  assert.match(field, /\{MAX_LOGO_LABEL\}/, 'the cap is no longer rendered from the shared constant')
  assert.equal(/\b\d+\s?KB\b/.exec(field), null,
    'BrandLogoField types a size in KB — it must come from MAX_LOGO_LABEL or it will contradict the cap')
})

/* ── 3 · it cannot silently degrade the document ─────────────────────────── */

test('svgIntrinsicSize prefers the viewBox over stale width/height', () => {
  assert.deepEqual(svgIntrinsicSize('<svg viewBox="0 0 240 60" width="99" height="99">'), { width: 240, height: 60 })
  assert.deepEqual(svgIntrinsicSize('<svg width="120" height="40">'), { width: 120, height: 40 })
  assert.deepEqual(svgIntrinsicSize('<svg viewBox="0 0 10 5"/>'), { width: 10, height: 5 })
  // Neither present: null, so the caller has no clear-space page rather than a
  // guessed one.
  assert.equal(svgIntrinsicSize('<svg>'), null)
  assert.equal(svgIntrinsicSize('<svg viewBox="0 0 0 0">'), null)
})

test('a logo with no readable size keeps its mark page and loses only the geometry one', () => {
  const sized = readLogo({ logo: GOOD })
  const unsized = readLogo({ logo: { ...GOOD, width: null, height: null } })
  assert.ok(unsized, 'a logo without dimensions is still a logo')
  assert.equal(unsized.aspect, null)
  assert.equal(clearSpace(unsized), null, 'a keep-out box was drawn to a guessed proportion')
  // Positive control: with an aspect ratio there IS a box, so the null above is
  // the missing geometry and not clearSpace() always returning null.
  const cs = clearSpace(sized, 30)
  assert.ok(cs)
  assert.equal(cs.x, 30 * CLEAR_SPACE_RATIO)
  assert.equal(cs.markWidth, 120)
  assert.equal(cs.boxWidth, 120 + 30)
  assert.equal(cs.boxHeight, 30 + 30)
})

test('a junk design produces no logo rather than a broken one', () => {
  for (const design of [null, undefined, {}, { logo: null }, { logo: 'x' }, { logo: {} }, { logo: { src: {} } }]) {
    assert.equal(readLogo(design), null, `readLogo returned something for ${JSON.stringify(design)}`)
  }
})
