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
import { logoSvg } from '../src/config/brandLogo.js'
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

  // --accent and --hi are declared in BOTH theme blocks, so these two are
  // scoped to the light one rather than matched across the whole file — the
  // dark block is declared first, and an unscoped match would quietly draw
  // every card in the dark theme's lighter blue.
  const light = css.match(/\[data-theme="light"\]\{([^}]*)\}/)
  if (!light) throw new Error('og-cards: the [data-theme="light"] token block has moved')

  return {
    hues,
    // The accent, for the mark. The homepage card is the one card that carries
    // the logo, and it wears the brand's own blue rather than a section hue.
    // --brand-mark, not --accent: the mark has its own token (see
    // scripts/brand-icons.mjs).
    accent: pick(light[1], /--brand-mark\s*:\s*(#[0-9a-fA-F]{3,8})/, '--brand-mark'),
    // The highlight the homepage paints behind "one system" — see .home-mark in
    // global.css. Reusing it is what ties the card to the page it links to.
    hi: pick(light[1], /--hi\s*:\s*(#[0-9a-fA-F]{3,8})/, '--hi'),
    hiFg: pick(light[1], /--hi-fg\s*:\s*(#[0-9a-fA-F]{3,8})/, '--hi-fg'),
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
/**
 * The label a section card prints above its name, or null for no band.
 *
 * EXPORTED so a test can read the rule rather than the picture. Until the
 * 2026-09-09 anti-slop audit every section without its own `eyebrow` fell back
 * to "Design toolkit" — the retired framing ("a free browser-based design
 * toolkit" is the story docs/reference/positioning.md replaced), set as a
 * letter-spaced category label above a headline, which is the exact kicker
 * the homepage card dropped when the founder retired "UI system toolkit" as
 * "a huge AI Slop feature". A section that has something true to say above
 * its name (Learn: "Reference guides") still says it; the rest say nothing.
 */
export function sectionEyebrow(section) {
  return section.eyebrow || null
}

function cardHtml(section, tokens, fontDataUri) {
  const hue = tokens.hues[section.hue]
  const tools = toolNamesFor(section)
  const eyebrow = sectionEyebrow(section)
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Manrope;src:url(${fontDataUri}) format('woff2');font-weight:200 800;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px}
body{background:${tokens.ground};color:${tokens.ink};font-family:Manrope,system-ui,sans-serif;
  display:grid;grid-template-columns:78px 1fr;overflow:hidden}
.rail{background:${hue}}
.body{padding:72px 76px 64px;display:flex;flex-direction:column;justify-content:space-between}
.mark svg{display:block;height:30px;width:auto}
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
  <div class="mark">${logoSvg({ colour: tokens.ink })}</div>
  <div>
    ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}
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
  const shoot = async (html, file) => {
    await page.setContent(html, { waitUntil: 'load' })
    // The face is inlined as a data URI, so this resolves immediately — but
    // screenshotting before it does would silently ship cards set in
    // Times New Roman, and nothing downstream could tell.
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(out, file), type: 'png' })
    drawn.push(file)
    console.log(`og:cards — wrote public/previews/${file}`)
  }

  for (const section of SECTIONS) {
    await shoot(cardHtml(section, tokens, fontDataUri), `og-${section.id}.png`)
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
      sections: SECTIONS.map((s) => ({ id: s.id, label: s.label, blurb: s.blurb, tools: toolNamesFor(s) })),
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
