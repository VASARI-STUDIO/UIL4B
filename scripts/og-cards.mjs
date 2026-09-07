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
import { markSvg } from './brand-mark.mjs'
import { DEFAULT_CARD, SECTIONS, toolNamesFor } from './share-cards.mjs'

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
    accent: pick(light[1], /--accent\s*:\s*(#[0-9a-fA-F]{3,8})/, '--accent'),
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
 * The homepage's own hero, read out of src/pages/Home.jsx.
 *
 * ── Why this is parsed rather than typed in here ───────────────────────────
 *
 * The card this replaces was hand-made, and it drifted: it advertised "No more
 * tab hoarding", a headline the site had already stopped using — Onboarding.jsx
 * records it being removed from the anonymous sales page. So for months the
 * front-door share card promised a sentence that did not appear on the page it
 * linked to, and nothing could notice, because a hand-made PNG has no
 * relationship to the product.
 *
 * Restating the headline in this file would rebuild exactly that failure one
 * directory over. Reading it from the page means the card cannot claim
 * something the homepage does not say, and cards.json plus
 * tests/unit/share-cards.test.js turn a hero rewrite into a failing test that
 * names the fix, instead of a silent lie.
 *
 * Parsed NARROWLY and failing LOUDLY, the same contract readTokens() has with
 * global.css: one anchor at a time, and a miss throws here rather than
 * producing a card with a hole in it.
 */
export async function readHero() {
  const src = await readFile(path.join(root, 'src', 'pages', 'Home.jsx'), 'utf8')

  // THE KICKER IS OPTIONAL, AND ITS ABSENCE IS THE NORMAL CASE since
  // 2026-09-07 — the founder removed the "UI system toolkit" tagline from
  // the hero and asked that nothing replace it. This used to throw, which
  // was right while the element was load-bearing: a card that silently lost
  // its eyebrow would have been a hole. Now a missing kicker is a DECISION,
  // so the card drops the eyebrow band with it rather than inventing a
  // stand-in. The h1 and sub below still throw, because those moving IS
  // still a break.
  const kicker = src.match(/<p className="home-hero-kicker">([^<]+)<\/p>/)

  const h1 = src.match(/<h1 className="home-hero-h1">([\s\S]*?)<\/h1>/)
  if (!h1) throw new Error('og-cards: the homepage h1 has moved')

  const sub = src.match(/<p className="home-hero-sub">([\s\S]*?)<\/p>/)
  if (!sub) throw new Error('og-cards: the homepage sub has moved')

  // The h1 is two wrapper spans around the words, with a <mark> on the phrase
  // the page highlights. Drop the wrappers, keep the mark as a flagged run so
  // the card can paint the same highlight the page does.
  const runs = []
  let rest = h1[1].replace(/<\/?span[^>]*>/g, '')
  const markRe = /<mark[^>]*>([\s\S]*?)<\/mark>/g
  let at = 0
  let m
  while ((m = markRe.exec(rest)) !== null) {
    runs.push({ text: rest.slice(at, m.index), hi: false })
    runs.push({ text: m[1], hi: true })
    at = m.index + m[0].length
  }
  runs.push({ text: rest.slice(at), hi: false })

  const tidy = (s) => s.replace(/\s+/g, ' ')
  const headline = runs
    .map((r) => ({ text: tidy(r.text), hi: r.hi }))
    .filter((r) => r.text !== '')
  if (!headline.some((r) => r.hi)) {
    throw new Error('og-cards: the homepage h1 no longer highlights a phrase')
  }

  return {
    kicker: kicker ? tidy(kicker[1]).trim() : null,
    headline,
    // First sentence only. The full sub is two sentences and the second
    // ("Nothing to install.") is a detail the card has no room for; the card
    // never says anything the page does not, but it need not say all of it.
    sub: `${tidy(sub[1]).trim().split('. ')[0]}.`,
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

/**
 * The order the six distinct --hue-* tokens are shown in, and the section that
 * owns each. Plans is absent on purpose: it reuses the colour hue, so it owns
 * no band of its own, and the rail is about the toolkit's AREAS.
 */
export const RAIL_HUES = ['colour', 'type', 'icons', 'imagery', 'ai', 'component']

export function railSections() {
  return RAIL_HUES.map((hue) => {
    const section = SECTIONS.find((s) => s.hue === hue)
    if (!section) throw new Error(`og-cards: no section owns --hue-${hue}`)
    return { hue, label: section.label }
  })
}

/**
 * The homepage card — the front door, and the only card that is not a section.
 *
 * ── Why it is a different composition, inside the same generator ───────────
 *
 * #325 built one generator for seven section cards and left the homepage card
 * outside it as hand-made art. That orphan is what went stale. The answer is
 * not to flatten the homepage into an eighth section card — /home genuinely is
 * a different thing, and a card reading "Home" would say less than the one it
 * replaced — but to bring it INSIDE the generator so it is drawn from the same
 * tokens, the same face and the same page it advertises. One path, two
 * compositions.
 *
 * What is different from a section card, and why:
 *   · the rail carries all SIX section hues rather than one, because the claim
 *     the homepage makes is the breadth — this is the toolkit, not an area of it
 *   · the mark stands beside the wordmark, as it does in the founder's artwork
 *   · the headline is the homepage's real h1, highlight and all, so the picture
 *     and the page say the same sentence
 *   · the foot names the six areas in their own hues instead of tool pills
 */
function homeCardHtml(tokens, hero, fontDataUri) {
  const rail = railSections()
  const bands = rail
    .map((r) => `<i style="background:${tokens.hues[r.hue]}"></i>`).join('')
  const areas = rail.map((r) => `<span class="area">`
    + `<i style="background:${tokens.hues[r.hue]}"></i>${r.label}</span>`).join('')
  const headline = hero.headline
    .map((run) => (run.hi ? `<mark>${run.text}</mark>` : run.text)).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Manrope;src:url(${fontDataUri}) format('woff2');font-weight:200 800;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px}
body{background:${tokens.ground};color:${tokens.ink};font-family:Manrope,system-ui,sans-serif;
  display:grid;grid-template-columns:78px 1fr;overflow:hidden}
/* Six separated blocks, not a continuous ribbon. --hue-type (#0F766E) and
   --hue-icons (#047857) are both dark greens and sit next to each other in the
   product's own section order, so butted together they read as ONE band and the
   rail silently claims five areas instead of six. The gap is the ground showing
   through, so it costs nothing and cannot go wrong when a hue moves. */
.rail{display:flex;flex-direction:column;gap:5px;padding:5px 0 5px 5px}
.rail i{flex:1;border-radius:3px}
.body{padding:64px 76px 58px;display:flex;flex-direction:column;justify-content:space-between}
.lockup{display:flex;align-items:center;gap:16px}
.lockup svg{display:block}
.mark{font-size:34px;font-weight:800;letter-spacing:-.05em;text-transform:uppercase;line-height:1}
.mark span{color:${tokens.accent}}
.eyebrow{font-size:17px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:${tokens.accent};margin-bottom:22px}
/* line-height 1.16, and it is load-bearing rather than taste. The highlight
   below paints a background on an INLINE element, and an inline background
   covers the font's whole content area, not the tight line box — so at 1.04
   the lime slab on the second line rose into the first line and sliced the
   descenders off "type". That is the same mechanism pipeline.js records
   against .home-mark, where #293's line-height:1 did not fix it either.
   Separating the line boxes is what actually fixes it. */
h1{font-size:78px;line-height:1.16;font-weight:800;letter-spacing:-.045em;max-width:17ch}
h1 mark{background:${tokens.hi};color:${tokens.hiFg};border-radius:6px;
  padding:0 .08em;margin:0 -.02em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.blurb{margin-top:24px;font-size:25px;line-height:1.34;font-weight:500;opacity:.66;max-width:40ch}
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:32px}
.areas{display:flex;flex-wrap:wrap;gap:10px 22px;max-width:52ch}
.area{display:flex;align-items:center;gap:9px;font-size:18px;font-weight:600;letter-spacing:-.01em}
.area i{width:13px;height:13px;border-radius:4px;display:block}
.url{font-size:19px;font-weight:700;letter-spacing:-.01em;opacity:.5;white-space:nowrap}
</style></head><body>
<div class="rail">${bands}</div>
<div class="body">
  <div class="lockup">
    ${markSvg({ size: 44, colour: tokens.accent })}
    <span class="mark">UI<span>L4B</span></span>
  </div>
  <div>
    ${hero.kicker ? `<div class="eyebrow">${hero.kicker}</div>` : ''}
    <h1>${headline}</h1>
    <p class="blurb">${hero.sub}</p>
  </div>
  <div class="foot">
    <div class="areas">${areas}</div>
    <div class="url">uil4b.com</div>
  </div>
</div>
</body></html>`
}

async function main() {
  const tokens = await readTokens()
  const hero = await readHero()
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

  // The homepage card first — it is the one every unclassified route falls back
  // to, and since #340 it is drawn here rather than maintained by hand.
  await shoot(homeCardHtml(tokens, hero, fontDataUri), DEFAULT_CARD.file)

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
      // The homepage hero as it was when the front-door card was drawn. This is
      // the half the old hand-made card had no way to keep true.
      hero,
      sections: SECTIONS.map((s) => ({ id: s.id, label: s.label, tools: toolNamesFor(s) })),
    }, null, 2)}\n`,
    'utf8',
  )
  console.log(`og:cards — wrote ${drawn.length} cards (1 homepage + ${SECTIONS.length} section) + cards.json`)
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
