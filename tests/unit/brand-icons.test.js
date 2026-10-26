// The site icons: the UI L4B brand kit's own files, committed as exported.
//
// Two failure modes this file guards:
//
// A MARK THAT DEPENDS ON THE VIEWER. The favicon must contain no text and name
// no font: a mark whose outline is chosen by the visitor's font stack is not a
// mark. (An earlier favicon set <text> in Inter, which this project never
// shipped, and drew a different shape on every machine.)
//
// A LINKED ICON THAT DOES NOT EXIST. Browsers and scrapers fail silently on a
// 404 icon, so every file index.html and the manifest name is checked here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { logoMarkup } from '../../src/config/brandLogo.js'

const ICO_SIZES = [16, 32, 48, 64]
const APPLE_SIZE = 180
const ICON_FILES = ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'site.webmanifest']
const MANIFEST_ICONS = [
  ['web-app-192.png', 192, 'any'], ['web-app-512.png', 512, 'any'],
  ['web-app-maskable-192.png', 192, 'maskable'], ['web-app-maskable-512.png', 512, 'maskable'],
]

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
  const svg = read('public/favicon.svg')
  assert.ok(!/<text[s>]/i.test(svg), 'favicon.svg contains <text>; the mark must be paths')
  assert.ok(!/font-family|font-size|font-weight/i.test(svg), 'favicon.svg names a font')
  assert.equal((svg.match(/<path[ >]/g) || []).length, 2, 'favicon.svg should carry the two symbol paths')
})

test('the favicon draws the same symbol the components draw', () => {
  // One geometry source: src/config/brandLogo.js. A hand edit to either side fails here.
  const symbol = logoMarkup('symbol').match(/d="([^"]+)"/g)
  const fav = read('public/favicon.svg').match(/d="([^"]+)"/g)
  assert.deepEqual(fav, symbol)
})

test('the boot shell in index.html carries the same lockup the components draw', () => {
  assert.ok(read('index.html').includes(logoMarkup('lockup')),
    'index.html boot-mark SVG has drifted from src/config/brandLogo.js')
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

test('the manifest names the four web-app icons, and each is the size it claims', () => {
  const manifest = JSON.parse(read('public/site.webmanifest'))
  assert.equal(manifest.icons.length, MANIFEST_ICONS.length)
  for (const [file, size, purpose] of MANIFEST_ICONS) {
    const icon = manifest.icons.find((i) => i.src === `/${file}`)
    assert.ok(icon, `site.webmanifest does not name /${file}`)
    assert.equal(icon.sizes, `${size}x${size}`)
    assert.equal(icon.purpose, purpose)
    const h = pngHeader(pub(file))
    assert.equal(h.width, size)
    assert.equal(h.height, size)
  }
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

