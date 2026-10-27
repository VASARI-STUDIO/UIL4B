// The site icons: the brand kit's files, with the favicon placed on a whole-pixel
// grid and its ICO drawn from the SVG by scripts/favicon-ico.mjs.
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
import zlib from 'node:zlib'
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

/** Alpha at any pixel of a PNG payload, decoded for real (8-bit, not interlaced). */
function pngAlpha(png) {
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG', 'not a PNG payload')
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  const depth = png.readUInt8(24)
  const colourType = png.readUInt8(25)
  assert.equal(depth, 8, `PNG bit depth ${depth} is not covered by this decoder`)
  assert.equal(png.readUInt8(28), 0, 'interlaced PNG is not covered by this decoder')
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colourType]
  assert.ok(channels, `PNG colour type ${colourType} is not covered by this decoder`)

  const idat = []
  let trns = null
  for (let o = 8; o < png.length;) {
    const len = png.readUInt32BE(o)
    const type = png.subarray(o + 4, o + 8).toString('ascii')
    const data = png.subarray(o + 8, o + 8 + len)
    if (type === 'IDAT') idat.push(data)
    if (type === 'tRNS') trns = data
    o += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const rows = []
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    const prev = y ? rows[y - 1] : Buffer.alloc(stride)
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? line[i - channels] : 0
      const b = prev[i]
      const c = i >= channels ? prev[i - channels] : 0
      let add = 0
      if (filter === 1) add = a
      else if (filter === 2) add = b
      else if (filter === 3) add = (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else assert.equal(filter, 0, `unknown PNG filter ${filter}`)
      line[i] = (line[i] + add) & 255
    }
    rows.push(line)
  }
  const alphaAt = (x, y) => {
    const row = rows[y]
    if (colourType === 6) return row[x * 4 + 3]
    if (colourType === 4) return row[x * 2 + 1]
    if (colourType === 3) return trns && row[x] < trns.length ? trns[row[x]] : 255
    return 255 // grey or RGB with no alpha channel: every pixel is opaque
  }
  return { width, height, alphaAt }
}

/** Alpha at the four corners of a PNG payload. */
function pngCornerAlpha(png) {
  const { width, height, alphaAt } = pngAlpha(png)
  return [alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)]
}

/** Alpha at the four corners of a BMP payload (the DIB form an ICO entry uses). */
function bmpCornerAlpha(dib) {
  const headerSize = dib.readUInt32LE(0)
  const width = dib.readInt32LE(4)
  const height = dib.readInt32LE(8) / 2 // an ICO's DIB height covers the image and its AND mask
  const bpp = dib.readUInt16LE(14)
  assert.ok(bpp === 32 || bpp === 24, `BMP icon at ${bpp} bits per pixel is not covered by this decoder`)
  const xorStride = Math.ceil((width * bpp) / 32) * 4
  const andStride = Math.ceil(width / 32) * 4
  const xorStart = headerSize
  const andStart = xorStart + xorStride * height
  const at = (x, y) => {
    const fromBottom = height - 1 - y // rows are stored bottom-up
    if (bpp === 32) return dib[xorStart + fromBottom * xorStride + x * 4 + 3]
    const masked = (dib[andStart + fromBottom * andStride + (x >> 3)] >> (7 - (x & 7))) & 1
    return masked ? 0 : 255
  }
  return [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)]
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

test('every image inside favicon.ico is transparent at its four corners', () => {
  // The mark is the bare symbol. A background tile would show as an opaque
  // corner, and a tab strip would then draw a coloured square around the mark.
  // Each directory entry is decoded, whichever container it uses (PNG or BMP).
  const b = bin('public/favicon.ico')
  const count = b.readUInt16LE(4)
  assert.ok(count > 0, 'favicon.ico holds no images')
  for (let i = 0; i < count; i += 1) {
    const o = 6 + i * 16
    const size = b.readUInt32LE(o + 8)
    const offset = b.readUInt32LE(o + 12)
    const payload = b.subarray(offset, offset + size)
    const isPng = payload.subarray(1, 4).toString('ascii') === 'PNG'
    const corners = isPng ? pngCornerAlpha(payload) : bmpCornerAlpha(payload)
    assert.deepEqual(corners, [0, 0, 0, 0],
      `favicon.ico image ${i} (${b.readUInt8(o) || 256}px) has an opaque corner; the mark must not sit on a tile`)
  }
})

test('the SVG favicon recolours for a dark browser chrome and draws no background tile', () => {
  const svg = read('public/favicon.svg')
  assert.match(svg, /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{[^}]*\{[^}]*fill\s*:/i,
    'favicon.svg has no dark prefers-color-scheme rule; a dark-ink mark vanishes on a dark tab strip')
  assert.ok(!/<rect[\s>/]/i.test(svg), 'favicon.svg draws a <rect>; the mark must not sit on a background tile')
})

test('the SVG favicon puts every straight edge of the mark on a whole pixel at 16, 32 and 48px', () => {
  // The mark's straight edges sit at these coordinates in its own units: the
  // left edge, the gap between the two strokes, the inner corner, the top and the
  // foot. Between pixels, a tab-size render softens each one into a grey column.
  const svg = read('public/favicon.svg')
  const view = Number(svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) /)[1])
  const placed = svg.match(/transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)"/)
  assert.ok(placed, 'favicon.svg no longer places the mark with translate(x y) scale(s)')
  const [, tx, ty, s] = placed.map(Number)
  const near = (v) => Math.abs(v - Math.round(v)) < 1e-6
  for (const px of [16, 32, 48]) {
    const k = px / view
    for (const x of [0, 100, 125, 225]) assert.ok(near((tx + x * s) * k), `x=${x} lands at ${(tx + x * s) * k}px at ${px}px`)
    for (const y of [0, 125, 200]) assert.ok(near((ty + y * s) * k), `y=${y} lands at ${(ty + y * s) * k}px at ${px}px`)
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
    'icon (svg)': /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" sizes="any">/,
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

test('the 16px image in favicon.ico is drawn from the pixel-snapped SVG, not left stale', () => {
  // Read off the ICO itself, so an SVG change without `npm run icons:ico` fails
  // here. At 16px the mark's left stroke fills columns 2-5 from row 4, the gap
  // between the strokes is column 6, and nothing sits above row 4 or left of 2.
  const ico = bin('public/favicon.ico')
  const count = ico.readUInt16LE(4)
  const entry = [...Array(count)].map((_, i) => 6 + 16 * i).find((o) => ico[o] === 16)
  assert.ok(entry !== undefined, 'favicon.ico has no 16px image')
  const png = ico.subarray(ico.readUInt32LE(entry + 12), ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8))
  const { alphaAt } = pngAlpha(png)
  for (let x = 0; x < 16; x += 1) assert.equal(alphaAt(x, 3), 0, `row 3 is above the mark, but x=${x} has alpha`)
  for (let y = 0; y < 16; y += 1) assert.equal(alphaAt(1, y), 0, `column 1 is left of the mark, but y=${y} has alpha`)
  for (let x = 2; x <= 5; x += 1) assert.equal(alphaAt(x, 4), 255, `the top edge of the left stroke is soft at x=${x}`)
  for (let y = 4; y <= 8; y += 1) {
    assert.equal(alphaAt(2, y), 255, `the left edge is soft at y=${y}`)
    assert.equal(alphaAt(6, y), 0, `the gap between the strokes is filled at y=${y}`)
  }
})
