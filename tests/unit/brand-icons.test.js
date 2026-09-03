// The site icons.
//
// ── What was broken ─────────────────────────────────────────────────────────
//
// public/favicon.svg was 491 bytes and the ONLY icon the site shipped, and it
// drew its mark with <text>L4B</text> in `font-family: Inter, system-ui, …`.
// Inter is not one of the faces this project ships — it self-hosts Manrope and
// JetBrains Mono — so the mark fell back to whatever the visitor's OS supplied
// and rendered a DIFFERENT SHAPE ON EVERY MACHINE. Three glyphs set at 248px in
// a 512 viewport, then shown at 16px, is a smudge whichever face won.
//
// It also used #3B82F6 and #0A0A0A, neither of which is a token here. And there
// was no ICO, so /favicon.ico — which browsers and link scrapers request off
// the site root with no <link> telling them to — returned nothing; no
// apple-touch-icon, so an iOS home-screen save used a SCREENSHOT of the page;
// and no manifest, so an Android shortcut invented its own icon.
//
// ── The two failure modes this file exists for ─────────────────────────────
//
// A MARK THAT DEPENDS ON THE VIEWER. The first test below is the one that
// matters: the favicon must contain no text and name no font, ever again.
//
// A GENERATED, COMMITTED ARTEFACT GOING STALE. Same contract as the share
// cards: scripts/brand-icons.mjs writes public/brand-icons.json recording the
// accent and the geometry the icons were drawn from, and the staleness test
// re-reads those from source and compares.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { MARK, pointAt } from '../../scripts/brand-mark.mjs'
import {
  APPLE_SIZE,
  ICON_FILES,
  ICO_SIZES,
  MANIFEST_SIZE,
  MASKABLE_SCALE,
  readIconTokens,
} from '../../scripts/brand-icons.mjs'

const REPO = process.cwd()
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8')
const bin = (p) => fs.readFileSync(path.join(REPO, p))
const pub = (f) => path.join(REPO, 'public', f)
const built = fs.existsSync(path.join(REPO, 'dist', 'index.html'))

/** Width, height and colour type straight out of a PNG's IHDR chunk. */
function pngHeader(file) {
  const buf = fs.readFileSync(file)
  assert.equal(buf.subarray(1, 4).toString('ascii'), 'PNG', `${file} is not a PNG`)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf.readUInt8(24),
    colourType: buf.readUInt8(25),
  }
}

// ── The mark ────────────────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: the favicon draws no text and names no font', () => {
  // The whole defect, stated as a rule rather than as today's code. A mark whose
  // outline is chosen by the viewer's font stack is not a mark, and this is the
  // only place that can be enforced.
  const svg = read('public/favicon.svg')
  assert.ok(!/<text[\s>]/i.test(svg),
    'favicon.svg contains a <text> element. The mark must be paths and circles: '
    + 'text renders in whatever face the visitor happens to have.')
  assert.ok(!/font-family|font-size|font-weight/i.test(svg),
    'favicon.svg names a font. Nothing in an icon may depend on a typeface.')
  // And it is actually drawing something.
  assert.match(svg, /<path\b/, 'favicon.svg has no path — the ring is missing')
  assert.equal((svg.match(/<circle\b/g) || []).length, 2,
    'favicon.svg should carry exactly two circles: the centre dot and the satellite')
})

test('the favicon is drawn in the brand accent and nothing else', async () => {
  const { accent } = await readIconTokens()
  const svg = read('public/favicon.svg')
  const colours = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)].map((m) => m[1].toUpperCase())
  assert.ok(colours.length >= 3, 'favicon.svg declares almost no colours — is it still drawing the mark?')
  for (const c of new Set(colours)) {
    assert.ok(c === accent || c === '#FFFFFF',
      `favicon.svg paints ${c}, which is neither --accent (${accent}) nor the white it `
      + 'knocks the mark out in. The old file hard-coded #3B82F6, a blue this project never had.')
  }
  assert.ok(colours.includes(accent), `favicon.svg never uses --accent (${accent})`)
})

test('the mark stays on the pixel grid at 16px, which is the size it is used at', () => {
  // Designing at 512 and hoping is what produced the smudge this replaces. Every
  // band across the middle of the mark must be a whole device pixel at 16px, so
  // on a 32 grid every band must be an even number of units.
  const { ring, dot, grid } = MARK
  const outer = ring.r + ring.stroke / 2
  const inner = ring.r - ring.stroke / 2
  const bands = {
    margin: grid / 2 - outer,
    stroke: ring.stroke,
    moat: inner - dot.r,
    dotDiameter: dot.r * 2,
  }
  for (const [name, units] of Object.entries(bands)) {
    assert.ok(units >= 2, `the ${name} band is ${units} units — under 1px at 16px, so it disappears`)
    assert.equal(units % 2, 0,
      `the ${name} band is ${units} units, which is a half pixel at 16px and will blur`)
  }
})

test('the ring break actually clears the satellite', () => {
  // The satellite sits ON the ring's centre line, so if the break is too narrow
  // the two merge into a blob and the mark loses the feature that distinguishes
  // it from a plain target.
  const { ring, satellite } = MARK
  const half = (Math.atan2(satellite.r, ring.r) * 180) / Math.PI
  const leading = (satellite.bearing - half) - ring.gapFrom
  const trailing = ring.gapTo - (satellite.bearing + half)
  assert.ok(leading > 4, `only ${leading.toFixed(1)}° of clearance before the satellite`)
  assert.ok(trailing > 4, `only ${trailing.toFixed(1)}° of clearance after the satellite`)
  // And the satellite is on the ring's line, which is what makes it read as
  // sitting IN the break rather than floating beside it.
  const p = pointAt(MARK.cx, MARK.cy, ring.r, satellite.bearing)
  const d = Math.hypot(p.x - MARK.cx, p.y - MARK.cy)
  assert.ok(Math.abs(d - ring.r) < 0.01, 'the satellite has left the ring line')
})

// ── The files ───────────────────────────────────────────────────────────────

test('every icon the site links exists on disk', () => {
  for (const f of ICON_FILES) {
    assert.ok(fs.existsSync(pub(f)),
      `public/${f} is linked but missing — run \`npm run icons\``)
  }
})

test('favicon.ico is a real multi-size ICO, not a renamed PNG', () => {
  // The fallback browsers request on their own. A malformed container fails
  // silently — the browser simply shows its default globe.
  const b = bin('public/favicon.ico')
  assert.equal(b.readUInt16LE(0), 0, 'ICO reserved field is not 0')
  assert.equal(b.readUInt16LE(2), 1, 'ICO type is not 1 (icon)')
  const count = b.readUInt16LE(4)
  assert.equal(count, ICO_SIZES.length, `ICO declares ${count} images, expected ${ICO_SIZES.length}`)

  for (let i = 0; i < count; i += 1) {
    const o = 6 + i * 16
    const declared = b.readUInt8(o) || 256
    const size = b.readUInt32LE(o + 8)
    const offset = b.readUInt32LE(o + 12)
    assert.equal(declared, ICO_SIZES[i], `ICO entry ${i} declares ${declared}px`)
    assert.equal(b.subarray(offset + 1, offset + 4).toString('ascii'), 'PNG',
      `ICO entry ${i} is not a PNG payload`)
    // The directory must not lie about the payload — a mismatch here is what
    // makes an icon render at the wrong size or not at all.
    assert.equal(b.readUInt32BE(offset + 16), declared, `ICO entry ${i} payload width disagrees with its directory`)
    assert.equal(b.readUInt32BE(offset + 20), declared, `ICO entry ${i} payload height disagrees with its directory`)
    assert.ok(offset + size <= b.length, `ICO entry ${i} runs past the end of the file`)
  }
})

test('apple-touch-icon is 180px, square and opaque', () => {
  const h = pngHeader(pub('apple-touch-icon.png'))
  assert.equal(h.width, APPLE_SIZE)
  assert.equal(h.height, APPLE_SIZE)
  // iOS composites this onto black rather than honouring transparency, and it
  // applies its OWN corner mask — so the source must be a full-bleed opaque
  // square. Pre-rounding it rounds it twice and leaves pale corner wedges.
  assert.equal(h.colourType, 2,
    'apple-touch-icon.png carries an alpha channel; iOS will composite it onto black')
  assert.ok(!read('public/favicon.svg').includes('apple'), 'sanity: wrong file read')
})

test('the manifest icon fits the maskable safe zone', () => {
  const h = pngHeader(pub('icon-512.png'))
  assert.equal(h.width, MANIFEST_SIZE)
  assert.equal(h.height, MANIFEST_SIZE)

  // Android crops a maskable icon to a shape of its choosing and only
  // guarantees the middle 80%. The mark's furthest point is the outer edge of
  // the satellite; scaled, it has to stay inside that circle or the launcher
  // will shave a bite out of the logo.
  const furthest = (MARK.ring.r + MARK.satellite.r) * MASKABLE_SCALE
  const safeRadius = MARK.grid * 0.4
  assert.ok(furthest <= safeRadius,
    `the mark reaches ${furthest.toFixed(2)} units but the maskable safe radius is ${safeRadius}`)

  const manifest = JSON.parse(read('public/site.webmanifest'))
  const icon = manifest.icons.find((i) => i.src === '/icon-512.png')
  assert.ok(icon, 'site.webmanifest does not name /icon-512.png')
  assert.equal(icon.sizes, `${MANIFEST_SIZE}x${MANIFEST_SIZE}`)
  assert.match(icon.purpose, /\bmaskable\b/, 'the manifest icon is not declared maskable')
})

test('the manifest does not promise an app the product is not', () => {
  // display:standalone is what makes Chrome offer to INSTALL the site, and an
  // install implies something that still works when the network does not. There
  // is no service worker here and nothing offline to fall back on, so that
  // prompt would be a promise this product does not keep. The manifest exists to
  // give an Android home-screen shortcut the real mark, and nothing more.
  const manifest = JSON.parse(read('public/site.webmanifest'))
  assert.equal(manifest.display, 'browser',
    'the manifest asks to be installed as an app, but nothing here works offline')
  assert.ok(!fs.existsSync(path.join(REPO, 'public', 'sw.js')),
    'a service worker has appeared — revisit the display mode above')
})

// ── How index.html links them ───────────────────────────────────────────────

test('index.html links every icon, with absolute hrefs', () => {
  const html = read('index.html')
  const links = {
    'icon (svg)': /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/,
    'icon (ico)': /<link rel="icon" href="\/favicon\.ico"/,
    'apple-touch-icon': /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/,
    manifest: /<link rel="manifest" href="\/site\.webmanifest">/,
  }
  for (const [name, re] of Object.entries(links)) {
    assert.match(html, re, `index.html does not link the ${name}`)
  }
  // RELATIVE is the trap. Vite treats a relative href in index.html as a bundled
  // asset and fingerprints it into /assets/favicon-<hash>.svg, which shipped the
  // icon twice — once hashed for the tag, once verbatim from public/ — while
  // /favicon.ico went unanswered.
  assert.ok(!/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="(?!\/)/.test(html),
    'an icon link uses a relative href; Vite will fingerprint and duplicate it')
})

test('the built shells serve one favicon, not a hashed duplicate', {
  skip: !built && 'run `npm run build` first',
}, () => {
  // Read out of what is actually served. The absolute href above is only
  // meaningful if Vite really left it alone.
  const html = read('dist/index.html')
  assert.match(html, /href="\/favicon\.svg"/,
    'the built shell no longer points at /favicon.svg')
  // Matched as an href, not as a bare string: index.html's own comment explains
  // this defect and names the /assets/favicon-<hash>.svg shape, and that comment
  // survives into the shell.
  assert.ok(!/href="\/assets\/favicon-/.test(html),
    'the built shell points at a fingerprinted favicon copy again')
  for (const f of ICON_FILES) {
    assert.ok(fs.existsSync(path.join(REPO, 'dist', f)),
      `dist/${f} was not published — the browser will 404 the icon it was told to fetch`)
  }
})

test('theme-color covers both themes and matches the grounds it names', () => {
  // #343 made the dark theme reachable, and a single light theme-color paints
  // the wrong colour behind every dark visitor's status bar.
  const html = read('index.html')
  const tags = [...html.matchAll(/<meta name="theme-color" content="(#[0-9A-Fa-f]{3,8})" media="\(prefers-color-scheme: (light|dark)\)">/g)]
  assert.equal(tags.length, 2, 'index.html should carry a light and a dark theme-color')
  const byScheme = Object.fromEntries(tags.map((m) => [m[2], m[1].toUpperCase()]))

  // They must agree with the critical theme block in the same file, which is
  // itself a deliberate copy of --bg-0 for the pre-paint window.
  const critical = Object.fromEntries(
    [...html.matchAll(/html\[data-theme="(light|dark)"\]\{background:(#[0-9A-Fa-f]{3,8})/g)]
      .map((m) => [m[1], m[2].toUpperCase()]),
  )
  assert.equal(byScheme.light, critical.light,
    'the light theme-color disagrees with the light ground painted before first paint')
  assert.equal(byScheme.dark, critical.dark,
    'the dark theme-color disagrees with the dark ground painted before first paint')
})

test('the runtime chrome tint reads the token instead of restating it', () => {
  // A media query cannot read localStorage, so the two tags above cannot see a
  // visitor whose EXPLICIT light/dark choice disagrees with their OS.
  // ThemeContext covers that case, and tests/unit/theme-resolution.test.js owns
  // the MECHANISM behaviourally — that a media-less tag is created, put first,
  // and kept in step.
  //
  // What is asserted here instead is the thing behaviour cannot see: the colour
  // is read back out of --bg-0 rather than typed in. index.html already keeps a
  // deliberate second copy of the two grounds for the pre-paint window; a third
  // copy living in a context file is the one that would rot unnoticed.
  assert.match(read('src/contexts/ThemeContext.jsx'), /getPropertyValue\('--bg-0'\)/,
    'the runtime theme-color should read --bg-0 rather than hard-code the grounds')
})

// ── Staleness ───────────────────────────────────────────────────────────────

test('THE STALENESS ONE: the committed icons were drawn from today\'s sources', async () => {
  // A committed PNG cannot fail a build when the brand moves underneath it, so
  // the generator records what it drew FROM and this compares against source.
  const manifest = JSON.parse(read('public/brand-icons.json'))
  const { accent, ground } = await readIconTokens()

  assert.equal(manifest.accent, accent,
    'the accent has moved since the icons were drawn, so the favicon is the wrong '
    + 'blue. Run `npm run icons`.')
  assert.equal(manifest.ground, ground,
    'the light ground has moved since the manifest was written. Run `npm run icons`.')
  assert.deepEqual(manifest.mark, JSON.parse(JSON.stringify(MARK)),
    'the mark geometry in scripts/brand-mark.mjs has changed since the icons were '
    + 'drawn, so the ICO and the PNGs no longer match the SVG. Run `npm run icons`.')
  assert.equal(manifest.maskableScale, MASKABLE_SCALE)

  // And the SVG itself, so a hand-edit to the committed file is caught too —
  // the rasters are renderings OF it and would silently disagree.
  const sha = createHash('sha256').update(read('public/favicon.svg')).digest('hex')
  assert.equal(manifest.faviconSvgSha256, sha,
    'public/favicon.svg has been edited by hand since the rasters were generated, '
    + 'so favicon.ico and the PNGs no longer show the same mark. Run `npm run icons`.')
})
