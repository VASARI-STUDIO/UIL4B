// Draw the site icons. `npm run icons`.
//
// GENERATED AND COMMITTED, exactly like the share cards in og-cards.mjs and
// vercel.json's rewrites: the outputs are checked-in artefacts, this generator
// is the source of truth for them, and tests/unit/brand-icons.test.js fails if
// they drift. Chromium lives HERE and on the share-card path only — putting a
// browser download on the build path to redraw five files that change about
// once a year would be a bad trade.
//
// ── What it writes, and why each file earns its place ──────────────────────
//
// favicon.svg          The primary icon. Every current browser prefers it, and
//                      one vector file covers every size a tab, a bookmark bar
//                      or a history entry asks for.
// favicon.ico          The fallback, and NOT redundant: browsers and link
//                      scrapers request /favicon.ico from the site root on
//                      their own, with no <link> to tell them to, whenever the
//                      SVG is unsupported or not yet parsed. Carries 16, 32 and
//                      48 so Windows taskbar pinning gets a real icon too.
// apple-touch-icon.png iOS ignores SVG icons entirely. Without this file,
//                      "Add to Home Screen" saves a SCREENSHOT of the page as
//                      the icon. 180 is the size current iPhones ask for.
// icon-512.png         The manifest icon, for an Android home-screen install.
//                      Same reason: without it the launcher invents something.
// site.webmanifest     What names those icons, plus the app name and theme
//                      colour. Three lines of JSON; nothing here makes the site
//                      a PWA and no service worker is implied.
//
// Deliberately NOT written: the 20-file generator dump (favicon-16x16.png,
// android-chrome-192, mstile-*, browserconfig.xml, safari-pinned-tab.svg and
// the rest). Every one of those is either served by the SVG, served by the ICO,
// or targets a platform that has been discontinued — mstile is Windows 8 live
// tiles, safari-pinned-tab was retired in Safari 12. Files that exist only
// because a generator emitted them still have to be kept in step forever.
//
// The mark itself is scripts/brand-mark.mjs. The accent is read out of
// src/styles/global.css rather than restated, so a brand move takes the icons
// with it and the staleness test can prove it did.
import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MARK, iconSvg } from './brand-mark.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')

/** Sizes packed into favicon.ico: tab, retina tab / bookmark, Windows pin. */
export const ICO_SIZES = [16, 32, 48]
export const APPLE_SIZE = 180
export const MANIFEST_SIZE = 512

/** Everything this generator writes, which is also everything index.html links. */
export const ICON_FILES = Object.freeze([
  'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-512.png', 'site.webmanifest',
])

/**
 * Android crops a maskable icon to a shape of its choosing and only guarantees
 * the middle 80% — the "safe zone". The mark's furthest point is the outer edge
 * of the satellite, at ring r + satellite r = 13 of the 16-unit radius, which
 * is 81% and just over the line. 0.92 pulls that back to 11.96 against a safe
 * radius of 12.8. The tile is flat colour, so the crop takes nothing from it,
 * and that is what lets one file serve as both "any" and "maskable".
 */
export const MASKABLE_SCALE = 0.92

/**
 * The live accent, from the light theme block in global.css.
 *
 * Parsed narrowly and failing loudly, for the reason og-cards.mjs records: the
 * stylesheet is large and other work touches it constantly, so matching one
 * declaration inside one known block means an unrelated edit cannot silently
 * produce an icon in the wrong colour.
 *
 * The LIGHT accent specifically. Both themes declare --accent and the dark one
 * is a lighter blue tuned for a dark ground; an icon that changed colour with
 * the visitor's OS setting would stop being recognisable, which is the opposite
 * of what a favicon is for. One mark, one colour, everywhere.
 */
export async function readIconTokens() {
  const css = await readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8')
  const block = css.match(/\[data-theme="light"\]\{([^}]*)\}/)
  if (!block) throw new Error('brand-icons: the [data-theme="light"] token block has moved')
  const pick = (name) => {
    const m = block[1].match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`))
    if (!m) throw new Error(`brand-icons: ${name} is no longer declared in the light theme block`)
    return m[1].toUpperCase()
  }
  return { accent: pick('--accent'), ground: pick('--bg-0') }
}

/** The mark knocked out in white, which is the only ink it ever uses. */
const INK = '#FFFFFF'

/**
 * Pack PNGs into an .ico.
 *
 * An ICO is a 6-byte header, one 16-byte directory entry per image, then the
 * image payloads. Since Vista the payload may be a PNG as-is rather than a BMP,
 * which every browser that still asks for an .ico supports, and which avoids
 * hand-rolling a bottom-up BMP with an AND mask.
 */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(images.length, 4)

  const entries = []
  let offset = 6 + images.length * 16
  for (const { size, png } of images) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // 0 encodes 256
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt8(0, 2) // palette count
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    entries.push(e)
    offset += png.length
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

/** Rasterise one SVG string at its natural size. */
async function raster(page, svg, size) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<!doctype html><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;overflow:hidden}</style>${svg}`,
    { waitUntil: 'load' },
  )
  return page.screenshot({ type: 'png' })
}

async function main() {
  const { accent, ground } = await readIconTokens()

  // The vector, written first — it is the primary icon and the thing the
  // rasters below are renderings OF, so it is also what the staleness test
  // hashes.
  const svg = `${iconSvg({ size: 32, tile: accent, mark: INK })}\n`
  await writeFile(path.join(pub, 'favicon.svg'), svg, 'utf8')
  console.log('icons — wrote public/favicon.svg')

  const browser = await chromium.launch()
  const page = await browser.newPage({ deviceScaleFactor: 1 })

  const icoImages = []
  for (const size of ICO_SIZES) {
    icoImages.push({ size, png: await raster(page, iconSvg({ size, tile: accent, mark: INK }), size) })
  }
  await writeFile(path.join(pub, 'favicon.ico'), buildIco(icoImages))
  console.log(`icons — wrote public/favicon.ico (${ICO_SIZES.join(', ')})`)

  // SQUARE, not rounded. iOS applies its own corner mask to apple-touch-icon,
  // so a pre-rounded source is rounded twice and shows pale wedges in the
  // corners. It also composites onto black rather than honouring transparency,
  // which the opaque tile already satisfies.
  await writeFile(
    path.join(pub, 'apple-touch-icon.png'),
    await raster(page, iconSvg({ size: APPLE_SIZE, tile: accent, mark: INK, radius: 0 }), APPLE_SIZE),
  )
  console.log(`icons — wrote public/apple-touch-icon.png (${APPLE_SIZE})`)

  await writeFile(
    path.join(pub, 'icon-512.png'),
    await raster(page, iconSvg({
      size: MANIFEST_SIZE, tile: accent, mark: INK, radius: 0, scale: MASKABLE_SCALE,
    }), MANIFEST_SIZE),
  )
  console.log(`icons — wrote public/icon-512.png (${MANIFEST_SIZE}, maskable-safe)`)

  await browser.close()

  // The manifest. Generated rather than hand-kept so its colours are the real
  // tokens and its icon list cannot name a file this script does not write.
  //
  // display is "browser" ON PURPOSE. "standalone" is what makes Chrome offer to
  // INSTALL the site, and installing implies an app that works when the network
  // does not — there is no service worker here and nothing offline to fall back
  // on, so that prompt would be a promise the product does not keep. The job
  // this manifest actually has is to make an Android home-screen shortcut use
  // the mark instead of a letter or a screenshot, and "browser" does that.
  await writeFile(
    path.join(pub, 'site.webmanifest'),
    `${JSON.stringify({
      name: 'UI L4B — Design Toolkit',
      short_name: 'UI L4B',
      start_url: '/',
      display: 'browser',
      background_color: ground,
      theme_color: ground,
      icons: [{
        src: '/icon-512.png',
        sizes: `${MANIFEST_SIZE}x${MANIFEST_SIZE}`,
        type: 'image/png',
        // One file for both purposes, which is only correct because the tile is
        // flat opaque colour: the maskable crop takes nothing from it, so the
        // padded artwork is also a perfectly good unmasked icon.
        purpose: 'any maskable',
      }],
    }, null, 2)}\n`,
    'utf8',
  )
  console.log('icons — wrote public/site.webmanifest')

  // The staleness detector, same contract as public/previews/cards.json. A
  // committed PNG cannot fail a build when the brand or the geometry moves
  // underneath it, so record what these were drawn FROM and let a unit test
  // compare that against the live sources.
  await writeFile(
    path.join(pub, 'brand-icons.json'),
    `${JSON.stringify({
      note: 'Generated by `npm run icons`. Do not hand-edit. '
        + 'tests/unit/brand-icons.test.js compares these values against the live '
        + 'accent token and mark geometry and fails if the icons need redrawing.',
      accent,
      ground,
      mark: MARK,
      maskableScale: MASKABLE_SCALE,
      sizes: { ico: ICO_SIZES, apple: APPLE_SIZE, manifest: MANIFEST_SIZE },
      // Newlines normalised before hashing. core.autocrlf is true here, so git
      // stores LF and checks the file out as CRLF — hashing raw bytes would
      // make this fingerprint depend on which side of a checkout you read it
      // from, and the staleness test would fail on a clean tree.
      faviconSvgSha256: createHash('sha256').update(svg.replace(/\r\n/g, '\n')).digest('hex'),
    }, null, 2)}\n`,
    'utf8',
  )
  console.log('icons — wrote public/brand-icons.json')
}

// Run directly only. tests/unit/brand-icons.test.js imports readAccent() from
// this module, and an unguarded main() would mean that import LAUNCHES CHROMIUM
// AND REWRITES THE COMMITTED ICONS as a side effect of running the test suite —
// a test that regenerates the artefact it is checking can never fail. That
// exact trap shipped in #325's og-cards.mjs; same guard, same reason.
if (process.argv[1]?.endsWith('brand-icons.mjs')) {
  main().catch((err) => { console.error('icons failed:', err); process.exit(1) })
}
