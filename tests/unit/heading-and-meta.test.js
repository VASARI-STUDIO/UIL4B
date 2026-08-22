// Document structure and search-result copy — two things that only fail
// silently, and only for people who are not looking at the page.
//
// docs/audit-2026-08-11.md, P4:
//   • /privacy, /terms and /create/emoji went h1 -> h3. A screen-reader user
//     navigating by heading hears a level-3 with no level-2 above it and cannot
//     tell where the outline broke (WCAG 1.3.1).
//   • /create/icons and /create/emoji shipped an IDENTICAL <h1>. Two separate indexable URLs
//     announcing the same headline, to a crawler and to anyone browsing by
//     heading.
//   • /plans' description was 192 chars, so the sentence naming what Pro
//     actually buys was the part Google cut off.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaMap.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// A comment may legitimately quote the headline it explains removing; only
// shipped JSX can BE it.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

// ── Heading structure ───────────────────────────────────────────────────────

test('the legal pages do not skip from h1 straight to h3', () => {
  for (const file of ['src/pages/Privacy.jsx', 'src/pages/Terms.jsx']) {
    const src = read(file)
    assert.ok(!/<h3[\s>]/.test(src),
      `${file} still uses <h3> for a top-level section; a heading level is document structure, not a size`)
    assert.ok(/<h2 className="legal-h/.test(src), `${file} should mark its sections as h2`)
  }
})

test('the heading SIZE was preserved — only the level changed', () => {
  // Downgrading the visual weight to satisfy a checker would trade one problem
  // for a worse one.
  const css = read('src/styles/global.css')
  assert.match(css, /\.legal-h\{[^}]*font-size:22px/)
  assert.match(css, /\.legal-h--sm\{[^}]*font-size:16px/)
})

test('the section headings carry no inline styles', () => {
  // They were style={{}} objects, which is also why the level was easy to pick
  // for its size rather than its meaning.
  for (const file of ['src/pages/Privacy.jsx', 'src/pages/Terms.jsx']) {
    assert.ok(!/<h2 style=\{\{/.test(read(file)), `${file} still styles a heading inline`)
  }
})

// ── One headline per URL ────────────────────────────────────────────────────

test('/create/icons and /create/emoji do not share an h1', () => {
  const src = stripComments(read('src/pages/IconEmojiLibrary.jsx'))
  const h1 = /<h1>([\s\S]*?)<\/h1>/.exec(src)?.[1] || ''
  assert.ok(/tab === 'icon'/.test(h1),
    'the h1 must differ per tab — the two tabs are two separate indexable URLs')
  assert.ok(!/Find the right symbol\. Keep building\./.test(src),
    'the shared headline is back on both pages')
})

test('every route still has a distinct title', () => {
  const titles = Object.entries(PAGE_TITLES)
  const seen = new Map()
  const dupes = []
  for (const [route, title] of titles) {
    // /home is a deliberate alias of / and canonicals to it.
    if (route === '/home') continue
    if (seen.has(title)) dupes.push(`${seen.get(title)} and ${route} both use "${title}"`)
    else seen.set(title, route)
  }
  assert.deepEqual(dupes, [], dupes.join('\n'))
})

// ── Search-result copy ──────────────────────────────────────────────────────

test('no description is long enough to be truncated in a search result', () => {
  // Google renders roughly 155-160 characters. Past that the tail is dropped,
  // and the tail is usually the part that says what the page is FOR.
  const long = Object.entries(PAGE_DESCRIPTIONS)
    .filter(([, d]) => d.length > 160)
    .map(([r, d]) => `${r} (${d.length} chars)`)
  assert.deepEqual(long, [], `these will be cut off in SERPs:\n  ${long.join('\n  ')}`)
})

test('no description is so short it says nothing', () => {
  const short = Object.entries(PAGE_DESCRIPTIONS)
    .filter(([, d]) => d.length < 50)
    .map(([r, d]) => `${r} (${d.length})`)
  assert.deepEqual(short, [], short.join(', '))
})

test('/plans still names what Pro buys, now inside the limit', () => {
  const d = PAGE_DESCRIPTIONS['/plans']
  assert.ok(d.length <= 160, `${d.length} chars`)
  assert.match(d, /free forever/i, 'the free tier is the lead')
  assert.match(d, /Pro adds/i, 'and what Pro adds survived the trim')
})
