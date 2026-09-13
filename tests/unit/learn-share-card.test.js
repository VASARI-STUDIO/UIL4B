// The Learn section's share card.
//
// tests/unit/share-cards.test.js covers every card the same way — exists, is
// 1200x630, is light enough, was drawn from today's tokens and today's tool
// list. What is added here is what is particular to Learn: that /learn and
// EVERY guide unfurl as the Learn card rather than the homepage's (the gap the
// learn-content row in pipeline.js carried from the first guide), and that
// what the card shows is DERIVED from the guide registry — so a guide added
// tomorrow lands on the card, and lands the staleness test until the card is
// redrawn with it, rather than being left off a picture that says "7".
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LEARN_ARTICLES, LEARN_ARTICLE_ROUTES, TOPICS } from '../../src/data/learnIndex.js'
import { DEFAULT_CARD, SECTIONS, cardFor, learnBlurb, toolNamesFor } from '../../scripts/share-cards.mjs'
import { railSections } from '../../scripts/og-cards.mjs'

const REPO = process.cwd()
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8')
const built = fs.existsSync(path.join(REPO, 'dist', 'learn', 'index.html'))
const learn = SECTIONS.find((s) => s.id === 'learn')

const meta = (html, attrName, key) => {
  const m = html.match(new RegExp(`<meta\\s+${attrName}="${key}"\\s+content="([^"]*)"`))
  return m ? m[1].replace(/&amp;/g, '&') : null
}

test('there is a Learn section, and it is the last one so the rail still finds AI Tools first', () => {
  assert.ok(learn, 'scripts/share-cards.mjs has no Learn section')
  assert.equal(SECTIONS[SECTIONS.length - 1].id, 'learn')
  // Learn shares --hue-ai with AI Tools and owns no band of its own.
  const rail = railSections()
  assert.equal(rail.length, 6)
  assert.ok(!rail.some((r) => r.label === 'Learn'), 'Learn has taken a homepage rail band')
  assert.equal(rail.find((r) => r.hue === learn.hue)?.label, 'AI Tools')
})

test('THE ONE THAT MATTERS: /learn and every guide unfurl as the Learn card, not the homepage', () => {
  for (const route of ['/learn', ...LEARN_ARTICLE_ROUTES]) {
    const card = cardFor(route)
    assert.equal(card.id, 'learn', `${route} unfurls as ${card.id}`)
    assert.equal(card.file, 'og-learn.png')
    assert.notEqual(card.id, DEFAULT_CARD.id)
  }
  // Positive control: a route that is NOT Learn's has not been swept in.
  assert.equal(cardFor('/discover').id, 'discover')
  assert.equal(cardFor('/help').id, DEFAULT_CARD.id)
})

test('the routes, the guide names and the count are derived from the registry, not typed', () => {
  assert.deepEqual([...learn.routes], ['/learn', ...LEARN_ARTICLE_ROUTES],
    'the Learn section claims a different set of routes than the registry publishes')
  assert.deepEqual(toolNamesFor(learn), LEARN_ARTICLES.map((a) => a.navLabel),
    'the guide names on the card are not every published guide, in order')
  assert.equal(learn.blurb, learnBlurb())
  assert.ok(learn.blurb.startsWith(`${LEARN_ARTICLES.length} guides`), `the blurb does not count the guides: "${learn.blurb}"`)
  for (const t of TOPICS) {
    assert.ok(learn.blurb.includes(t.toLowerCase()), `the blurb does not name the ${t} topic`)
  }
  // No guide route is written out by hand in the section map.
  const src = read('scripts/share-cards.mjs')
  assert.ok(!/'\/learn\/[a-z-]+'/.test(src),
    'a /learn/<slug> route is typed into share-cards.mjs — it must come from LEARN_ARTICLE_ROUTES')
  assert.match(src, /LEARN_ARTICLES\.map\(\(a\) => a\.navLabel\)/, 'the guide names are not read from the registry')
})

test('the card says what the section is, in the section\'s own register', () => {
  // The alt is what a screen-reader user gets instead of the picture.
  const { alt } = cardFor('/learn')
  assert.match(alt, /^UI L4B Learn — \d+ guides on /)
  assert.ok(learn.eyebrow && learn.eyebrow.length > 3, 'the Learn card falls back to the "Design toolkit" eyebrow, which is not what Learn is')
  // Neutral: no exclamation, no first person, no sales vocabulary anywhere on it.
  const copy = [learn.label, learn.eyebrow, learn.blurb, ...toolNamesFor(learn)].join(' ')
  assert.ok(!/[!]/.test(copy) && !/\b(we|our|you|your)\b/i.test(copy), `marketing register on the Learn card: "${copy}"`)
  assert.ok(!/\b(effortless|supercharge|master|ultimate)\b/i.test(copy))
})

test('the committed Learn card was drawn from today\'s registry', () => {
  const file = path.join(REPO, 'public', 'previews', 'og-learn.png')
  assert.ok(fs.existsSync(file), 'public/previews/og-learn.png is missing — run `npm run og:cards`')
  const buf = fs.readFileSync(file)
  assert.equal(buf.readUInt32BE(16), 1200)
  assert.equal(buf.readUInt32BE(20), 630)
  const manifest = JSON.parse(read('public/previews/cards.json'))
  const drawn = manifest.sections.find((s) => s.id === 'learn')
  assert.ok(drawn, 'cards.json records no Learn card')
  assert.deepEqual(drawn, { id: 'learn', label: learn.label, blurb: learn.blurb, tools: toolNamesFor(learn) },
    'the Learn card was drawn from a different guide list or count than the registry holds now. Run `npm run og:cards`.')
})

test('the built shells point Learn and every guide at the Learn card', {
  skip: !built && 'run `npm run build` first',
}, () => {
  for (const route of ['/learn', ...LEARN_ARTICLE_ROUTES]) {
    const html = read(`dist${route}/index.html`)
    assert.equal(meta(html, 'property', 'og:image'), 'https://uil4b.com/previews/og-learn.png',
      `dist${route}/index.html does not unfurl as the Learn card`)
    assert.equal(meta(html, 'name', 'twitter:image'), 'https://uil4b.com/previews/og-learn.png')
    assert.equal(meta(html, 'property', 'og:image:alt'), cardFor(route).alt)
  }
  // Control: the shell next door still carries its own card.
  assert.equal(meta(read('dist/discover/index.html'), 'property', 'og:image'),
    'https://uil4b.com/previews/og-discover.png')
})
