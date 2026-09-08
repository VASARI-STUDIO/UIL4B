// The search over the Learn guides, on disk.
//
// tests/user-sim/67-learn-index-search-card.spec.js drives the field in a
// browser. What is asserted here is the half a browser cannot show cheaply:
// that the text the field searches is the guides' PROSE and not a copy of
// their metadata, that a match on something only the body says reaches the
// body, and that the page is wired to the extractor rather than to a list
// somebody typed. The last of those is the one that matters — a search field
// that quietly searched titles only would pass every render assertion and
// return "no guide mentions" for a sentence the guide plainly contains.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LEARN_ARTICLES, TOPICS } from '../../src/data/learnIndex.js'
import { PLACES, normalise, searchGuides, snippetAround, termsOf } from '../../src/utils/learnSearch.js'
import { VIRTUAL_ID, learnSearchText, searchableProse } from '../../scripts/learn-search-text.mjs'
import { bodyOnlyPhrase, metadataOf } from './helpers/learn-search-phrases.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const bodies = await learnSearchText()

// ── The extracted text ──────────────────────────────────────────────────────

test('every registered guide has searchable prose, and it is prose', () => {
  assert.deepEqual(Object.keys(bodies), LEARN_ARTICLES.map((a) => a.slug),
    'the extractor does not cover exactly the registered guides, in registry order')
  for (const a of LEARN_ARTICLES) {
    const text = bodies[a.slug]
    const words = text.split(/\s+/).filter(Boolean).length
    assert.ok(words >= 800, `${a.slug}: only ${words} words were extracted — the prose is not reaching the index`)
    // What must NOT be in it: the scaffolding a JSX module is made of.
    for (const residue of ['<', '>', '{', '}', 'className', 'import ', 'export default', '=>']) {
      assert.ok(!text.includes(residue), `${a.slug}: the search text carries "${residue}" — markup leaked into the prose`)
    }
    // The article's own section headings are prose and must survive.
    for (const s of a.sections) {
      assert.ok(normalise(text).includes(normalise(s.title)),
        `${a.slug}: the heading "${s.title}" is not in the extracted text`)
    }
  }
})

test('quote entities become the mark they stand for, and non-breaking spaces stay spaces', () => {
  // proseOf() drops entities outright, which is right for a word COUNT and
  // wrong for a word SEARCH: "WCAG&rsquo;s" would index as "wcags".
  const text = searchableProse('<p>WCAG&rsquo;s font&nbsp;size &ldquo;quoted&rdquo; 4.5&thinsp;:&thinsp;1</p>')
  assert.equal(normalise(text), "wcag's font size \"quoted\" 4.5 : 1")
})

test('a module-level constant is not prose', () => {
  const text = searchableProse("const WCAG = 'https://www.w3.org/TR/WCAG22'\nexport default function X() {\n  return (\n    <p>Real words here.</p>\n  )\n}")
  assert.equal(text, 'Real words here.')
})

// ── The matcher ─────────────────────────────────────────────────────────────

test('normalise() makes curly quotes, diacritics and case irrelevant', () => {
  assert.equal(normalise('Typeface’s “Métrics”  Björn'), 'typeface\'s "metrics" bjorn')
  assert.deepEqual(termsOf('  Contrast   RATIO '), ['contrast', 'ratio'])
  assert.deepEqual(termsOf(''), [])
})

test('THE ONE THAT MATTERS: a phrase only the body says finds exactly its guide, through the body', () => {
  let checked = 0
  for (const a of LEARN_ARTICLES) {
    const phrase = bodyOnlyPhrase(a, LEARN_ARTICLES, bodies)
    assert.ok(phrase, `${a.slug}: no four-word run is unique to this guide's body — the extraction is too thin to search`)
    assert.ok(phrase.split(' ').some((w) => !metadataOf(a).includes(w)), `${a.slug}: every word of "${phrase}" is in the card's own text`)
    const hits = searchGuides(phrase, LEARN_ARTICLES, bodies)
    assert.deepEqual(hits.map((h) => h.article.slug), [a.slug],
      `"${phrase}" should find only ${a.slug}, found ${hits.map((h) => h.article.slug).join(', ') || 'nothing'}`)
    assert.equal(hits[0].place, 'body', `"${phrase}" was matched somewhere other than the body`)
    assert.ok(hits[0].snippet, `${a.slug}: a body-only match carries no snippet, so the card cannot show why it matched`)
    // The mark covers the whole word the term sits in, so "scales" for "scale".
    assert.ok(phrase.split(' ').some((t) => normalise(hits[0].snippet.match).includes(t)),
      `${a.slug}: the snippet marks "${hits[0].snippet.match}", which carries no term of the query`)
    assert.match(hits[0].snippet.match, /^\S+$/, `${a.slug}: the mark "${hits[0].snippet.match}" is not one whole word`)
    // And the negative control: the same search with NO bodies finds nothing.
    assert.deepEqual(searchGuides(phrase, LEARN_ARTICLES, {}), [],
      `"${phrase}" matched without any body text — the phrase is in the metadata after all`)
    checked += 1
  }
  assert.equal(checked, LEARN_ARTICLES.length)
})

test('every term has to match, and the strongest field decides the order', () => {
  // Registry order for a blank query — it is the reading order the landing uses.
  assert.deepEqual(searchGuides('', LEARN_ARTICLES, bodies).map((h) => h.article.slug),
    LEARN_ARTICLES.map((a) => a.slug))
  assert.ok(searchGuides('   ', LEARN_ARTICLES, bodies).every((h) => h.place === null))

  // AND, computed independently of the matcher.
  const q = 'oklch luminance'
  const expected = LEARN_ARTICLES.filter((a) => {
    const hay = `${metadataOf(a)} ${normalise(bodies[a.slug])}`
    return hay.includes('oklch') && hay.includes('luminance')
  }).map((a) => a.slug)
  assert.ok(expected.length >= 1 && expected.length < LEARN_ARTICLES.length,
    `"${q}" is not a discriminating query on this registry any more — pick another`)
  assert.deepEqual(searchGuides(q, LEARN_ARTICLES, bodies).map((h) => h.article.slug).sort(), expected.sort())

  // A title hit outranks a body hit for the same term.
  const titled = LEARN_ARTICLES.find((a) => a.slug === 'type-scales')
  const hits = searchGuides('scale', LEARN_ARTICLES, bodies)
  assert.ok(hits.length > 1, '"scale" should match more than one guide')
  assert.equal(hits[0].article.slug, titled.slug, 'the guide with "scale" in its title is not first')
  assert.equal(hits[0].place, 'title')
  assert.ok(hits.every((h) => PLACES.includes(h.place)))

  // Nothing matches nonsense, and nothing throws on odd input.
  assert.deepEqual(searchGuides('qzxvw', LEARN_ARTICLES, bodies), [])
  assert.doesNotThrow(() => searchGuides('(clamp)', LEARN_ARTICLES, bodies))
})

test('a snippet keeps the guide\'s own casing and snaps to word boundaries', () => {
  const s = snippetAround('The linearisation threshold reads 0.04045. WCAG’s own definition said 0.03928 until 2021.', "wcag's", 40)
  assert.equal(s.match, 'WCAG’s')
  // A term inside a longer word marks the whole word, not a stub of it.
  const whole = snippetAround('two relative luminances differ', 'luminance')
  assert.equal(whole.match, 'luminances')
  assert.equal(whole.after, ' differ')
  assert.ok(/^…\S/.test(s.before), `the before-text opens mid-word: "${s.before}"`)
  assert.ok(/\S…$/.test(s.after), `the after-text closes mid-word: "${s.after}"`)
  assert.ok(s.before.startsWith('…') && s.after.endsWith('…'), 'a mid-text snippet is ellipsised at both ends')
  assert.equal(snippetAround('nothing here', 'absent'), null)
})

// ── The wiring ──────────────────────────────────────────────────────────────

test('the page reaches the extractor through the virtual module, lazily, and hands the bodies to the matcher', () => {
  const config = read('vite.config.js')
  assert.match(config, /learnSearchTextPlugin\(\)/, 'vite.config.js does not register the Learn search text plugin')
  assert.match(config, /from '\.\/scripts\/learn-search-text\.mjs'/)

  const page = read('src/components/LearnGuideIndex.jsx')
  assert.ok(page.includes(`import('${VIRTUAL_ID}')`),
    `LearnGuideIndex.jsx must import ${VIRTUAL_ID} DYNAMICALLY — a static import puts 51 KB of prose on the landing's first paint`)
  assert.ok(!new RegExp(`^import .* from '${VIRTUAL_ID}'`, 'm').test(page),
    'LearnGuideIndex.jsx imports the search text statically')
  assert.match(page, /searchGuides\(query, LEARN_ARTICLES, bodies \|\| \{\}\)/,
    'the component no longer hands the loaded bodies to searchGuides — the search has silently become title-only')
  assert.match(page, /onFocus=\{ensureBodies\}/, 'the bodies are not requested on focus, so the first keystroke pays for the fetch')

  // One search field for the whole product, not a fourth implementation.
  assert.match(page, /import LibrarySearch from '\.\/library\/LibrarySearch'/)
  assert.ok(!/<input/.test(page), 'LearnGuideIndex.jsx renders its own <input> instead of the shared LibrarySearch')

  // And the landing renders it where the flat grid used to be.
  const landing = read('src/pages/SurfaceLanding.jsx')
  assert.match(landing, /<LearnGuideIndex \/>/, 'SurfaceLanding.jsx no longer renders the guide index')
  assert.ok(!/LEARN_ARTICLES\.map\(\(a\) => \(\s*<Link className="lidx-card"/.test(landing),
    'SurfaceLanding.jsx still renders the flat, ungrouped card grid beside the index')
})

test('the index groups by the registry\'s TOPICS and every topic is a labelled section', () => {
  const page = read('src/components/LearnGuideIndex.jsx')
  assert.match(page, /import \{[^}]*\bTOPICS\b[^}]*\} from '\.\.\/data\/learnIndex'/,
    'the component must take the topics from learnIndex.js rather than keep its own list')
  assert.ok(!/\[\s*'Colour'\s*,/.test(page), 'a hand-typed topic list has appeared in the component')
  assert.match(page, /<section className="lidx-topic-sec" id=\{g\.id\}[^>]*aria-labelledby=\{`\$\{g\.id\}-h`\}/,
    'each topic is not a <section> labelled by its own heading')
  assert.match(page, /<h3 className="lidx-topic-h" id=\{`\$\{g\.id\}-h`\}/, 'the topic heading is not a real heading element')
  assert.match(page, /role="status" aria-live="polite"/, 'the result count is not announced to assistive technology')
  // The empty state has to say what to do next, not just that nothing matched.
  assert.match(page, /className="lidx-empty"/)
  assert.match(page, /Show all \{LEARN_ARTICLES\.length\} guides/, 'the empty state offers no way back to the full index')
  for (const t of TOPICS) assert.ok(TOPICS.includes(t))
})

test('the index copy stays in Learn\'s neutral register', () => {
  // The founder's decision of 2026-09-05: neutral, no first person, no
  // marketing. tests/unit/learn-figures.test.js holds the guides to it; this
  // holds the index that fronts them.
  // What is checked is the COPY: the JSX text after the component's `return (`
  // with expression containers and tags removed, plus every string and
  // template literal in the file (the status sentences are built in code).
  // Not the code itself — `!!bodies` is a boolean cast, not an exclamation.
  const page = read('src/components/LearnGuideIndex.jsx')
  const code = page.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const at = code.indexOf('return (')
  assert.ok(at !== -1, 'LearnGuideIndex.jsx has no return (')
  const jsxText = code.slice(at).replace(/\{[^}]*\}/g, ' ').replace(/<[^>]*>/g, ' ')
  const literals = [...code.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]).join(' ')
  const copy = `${jsxText} ${literals}`
  assert.ok(copy.replace(/\s+/g, '').length > 200, 'the copy extraction came back nearly empty — the guard is vacuous')
  for (const banned of [/\b(we|our|us|I)\b/, /\b(effortless|supercharge|reimagine|unlock|powerful|amazing)\b/i, /!/]) {
    assert.ok(!banned.test(copy), `LearnGuideIndex.jsx copy matches ${banned}`)
  }
})
