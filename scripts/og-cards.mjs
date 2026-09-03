// Draw the section share cards. `npm run og:cards`.
//
// GENERATED AND COMMITTED, not built. The same contract vercel.json has with
// `npm run sync:rewrites`: the output is a checked-in artefact, the generator
// is the source of truth for it, and a unit test fails if they drift. Chromium
// lives HERE and nowhere else — putting it on the build path would mean a
// browser download in CI on every deploy, to redraw seven images that change
// about twice a year. scripts/share-cards.mjs holds the route map and imports
// nothing heavy, so prerender.mjs and the tests can read it freely.
//
// ── Everything on a card is read from the app ───────────────────────────────
//
// The hues come out of src/styles/global.css's own `--hue-*` declarations, the
// ground and ink out of the critical theme block in index.html, and the tool
// names out of src/data/toolTree.js. Nothing about the brand is restated here,
// so a palette change moves the cards rather than quietly leaving them wrong —
// and the manifest this writes lets tests/unit/share-cards.test.js detect
// exactly that, because a committed image cannot fail a build on its own.
//
// The typeface is the site's own self-hosted Manrope, loaded from
// public/fonts/. A card set in a system font would be the one surface of the
// brand not wearing the brand.
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SECTIONS, toolNamesFor } from './share-cards.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public', 'previews')

// 1200x630 is the size every unfurler crops to: Facebook, LinkedIn, Slack,
// X's summary_large_image, Discord. Anything else gets cropped by someone.
const W = 1200
const H = 630

/**
 * The design tokens the cards are drawn from, read from the files that own
 * them.
 *
 * Parsed narrowly ON PURPOSE. global.css is a large file that other work
 * touches constantly; matching one custom property at a time means an unrelated
 * edit cannot break this, and a missing token fails loudly here rather than
 * producing a card with a black hole in it.
 */
export async function readTokens() {
  const css = await readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8')
  const html = await readFile(path.join(root, 'index.html'), 'utf8')

  const pick = (source, re, name) => {
    const m = source.match(re)
    if (!m) throw new Error(`og-cards: could not read ${name} — the token it lives in has moved`)
    return m[1].toUpperCase()
  }

  const hues = {}
  for (const id of ['colour', 'type', 'component', 'imagery', 'ai', 'icons']) {
    hues[id] = pick(css, new RegExp(`--hue-${id}\\s*:\\s*(#[0-9a-fA-F]{3,8})`), `--hue-${id}`)
  }
  return {
    hues,
    // The light ground and ink, from index.html's critical theme block — the
    // same two values global.css carries as --bg-0/--t0, duplicated there by
    // design so first paint has them before the stylesheet arrives.
    ground: pick(html, /html\[data-theme="light"\]\{background:(#[0-9a-fA-F]{3,8})/, 'the light ground'),
    ink: pick(html, /html\[data-theme="light"\]\{background:#[0-9a-fA-F]{3,8};color:(#[0-9a-fA-F]{3,8})/, 'the light ink'),
  }
}

/**
 * One card, as a standalone HTML document.
 *
 * Swiss/modernist, which is the direction the brand already runs on: a heavy
 * hue field, the section name set large and tight, the real tool names as a
 * measured row beneath, and the wordmark small in the corner. No gradients, no
 * glow, no stock geometry — the composition is a grid and the type carries it.
 */
function cardHtml(section, tokens, fontDataUri) {
  const hue = tokens.hues[section.hue]
  const tools = toolNamesFor(section)
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Manrope;src:url(${fontDataUri}) format('woff2');font-weight:200 800;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px}
body{background:${tokens.ground};color:${tokens.ink};font-family:Manrope,system-ui,sans-serif;
  display:grid;grid-template-columns:78px 1fr;overflow:hidden}
.rail{background:${hue}}
.body{padding:72px 76px 64px;display:flex;flex-direction:column;justify-content:space-between}
.mark{font-size:23px;font-weight:800;letter-spacing:-.05em;text-transform:uppercase}
.mark span{color:${hue}}
.eyebrow{font-size:17px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${hue};margin-bottom:26px}
h1{font-size:104px;line-height:.94;font-weight:800;letter-spacing:-.045em;max-width:14ch}
.blurb{margin-top:26px;font-size:29px;line-height:1.3;font-weight:500;opacity:.66;max-width:26ch}
.tools{display:flex;flex-wrap:wrap;gap:10px}
.tool{font-size:19px;font-weight:600;letter-spacing:-.01em;padding:9px 18px;border-radius:999px;
  border:2px solid ${hue};color:${hue}}
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:32px}
.url{font-size:19px;font-weight:700;letter-spacing:-.01em;opacity:.5}
</style></head><body>
<div class="rail"></div>
<div class="body">
  <div class="mark">UI<span>L4B</span></div>
  <div>
    <div class="eyebrow">${section.eyebrow || 'Design toolkit'}</div>
    <h1>${section.label}</h1>
    <p class="blurb">${section.blurb}.</p>
  </div>
  <div class="foot">
    <div class="tools">${tools.map((t) => `<span class="tool">${t}</span>`).join('')}</div>
    <div class="url">uil4b.com</div>
  </div>
</div>
</body></html>`
}

async function main() {
  const tokens = await readTokens()
  const font = await readFile(path.join(root, 'public', 'fonts', 'manrope-latin.woff2'))
  const fontDataUri = `data:font/woff2;base64,${font.toString('base64')}`

  await mkdir(out, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

  const drawn = []
  for (const section of SECTIONS) {
    await page.setContent(cardHtml(section, tokens, fontDataUri), { waitUntil: 'load' })
    // The face is inlined as a data URI, so this resolves immediately — but
    // screenshotting before it does would silently ship seven cards set in
    // Times New Roman, and nothing downstream could tell.
    await page.evaluate(() => document.fonts.ready)
    const file = `og-${section.id}.png`
    await page.screenshot({ path: path.join(out, file), type: 'png' })
    drawn.push(file)
    console.log(`og:cards — wrote public/previews/${file}`)
  }
  await browser.close()

  // The staleness detector. A committed PNG cannot fail a build when the brand
  // moves underneath it, so record what it was drawn FROM and let a unit test
  // compare that against the live tokens. Without this the cards rot silently,
  // which is the standing objection to generated-and-committed artefacts.
  await writeFile(
    path.join(out, 'cards.json'),
    `${JSON.stringify({
      note: 'Generated by `npm run og:cards`. Do not hand-edit. '
        + 'tests/unit/share-cards.test.js compares these values against the live '
        + 'design tokens and fails if the cards need redrawing.',
      tokens,
      sections: SECTIONS.map((s) => ({ id: s.id, label: s.label, tools: toolNamesFor(s) })),
    }, null, 2)}\n`,
    'utf8',
  )
  console.log(`og:cards — wrote ${drawn.length} section cards + cards.json`)
}

// Run directly only. tests/unit/share-cards.test.js imports readTokens() from
// this module to detect stale cards, and an unguarded main() meant that import
// LAUNCHED CHROMIUM AND REWROTE THE COMMITTED PNGs as a side effect of running
// the test suite — a test that quietly regenerates the artefact it is checking
// can never fail. Same guard scripts/sync-vercel-rewrites.mjs uses, for the
// same reason.
if (process.argv[1]?.endsWith('og-cards.mjs')) {
  main().catch((err) => { console.error('og:cards failed:', err); process.exit(1) })
}
