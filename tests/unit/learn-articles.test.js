// The Learn article registry has to agree with four other things, and none of
// the disagreements are visible in a browser.
//
// src/data/learnIndex.js is the single record of an article, and four separate
// consumers read parts of it: routeMetaMap.js spreads its titles and
// descriptions in (which is what makes a route prerender at all), the article
// page builds the contents rail from `sections` while the PROSE carries the
// matching `<section id>`, the page maps a slug to a body component, and
// toolTree.js deals the articles into the Learn nav.
//
// Every one of those can drift silently:
//
//   • a section renamed in the prose and not in the registry leaves a contents
//     link that scrolls nowhere — no error, no failed assertion, just a dead
//     anchor;
//   • an article added to the registry and not to the page's BODIES map is a
//     URL that is prerendered, advertised in sitemap.xml, linked from the nav,
//     and renders a 404;
//   • a `words` value that stops matching the prose is a reading estimate that
//     is confidently wrong on a surface whose whole claim is that its figures
//     are checkable.
//
// So this asserts the joins, not the prose.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  LEARN_ARTICLES,
  LEARN_ARTICLE_ROUTES,
  TOPICS,
  findArticle,
  nextArticle,
  readingMinutes,
} from '../../src/data/learnIndex.js'
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { LEARN_DELIVERED, LEARN_GROUPS, LEARN_ROADMAP } from '../../src/data/toolTree.js'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'
import { countWords, proseOf } from '../../scripts/learn-wordcount.mjs'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const proseDir = path.join('src', 'data', 'learn')
const articleSource = (a) => read(path.join(proseDir, a.file))
const pageSource = read(path.join('src', 'pages', 'LearnArticle.jsx'))

/**
 * The body of a named object literal in LearnArticle.jsx.
 *
 * Scoped rather than searched whole: the page holds BOTH a BODIES map (slug ->
 * component) and a TOOL_LEDE map (slug -> sentence), so a plain
 * `pageSource.includes("'type-scales':")` is satisfied by either. That is not a
 * hypothetical — dropping an article from BODIES passed the first version of
 * the "every registered article actually renders" test below, which is exactly
 * the defect it exists to catch.
 */
function objectBody(name) {
  const at = pageSource.indexOf(`const ${name} = {`)
  assert.ok(at !== -1, `LearnArticle.jsx no longer declares ${name}`)
  const close = pageSource.indexOf(`\n}`, at)
  assert.ok(close > at, `${name} in LearnArticle.jsx is not a closed object literal`)
  return pageSource.slice(at, close)
}

test('there is at least one article, and the suite is not passing over an empty list', () => {
  // Every assertion below iterates LEARN_ARTICLES. An empty registry would make
  // all of them vacuously true, which is the failure mode this file exists to
  // avoid rather than to demonstrate.
  assert.ok(LEARN_ARTICLES.length >= 1, 'no Learn articles are registered')
  assert.equal(LEARN_ARTICLE_ROUTES.length, LEARN_ARTICLES.length)
})

test('every article is a complete record', () => {
  const slugs = new Set()
  for (const a of LEARN_ARTICLES) {
    assert.match(a.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${a.slug} is not a URL-safe slug`)
    assert.ok(!slugs.has(a.slug), `${a.slug} appears twice`)
    slugs.add(a.slug)

    for (const field of ['title', 'navLabel', 'dek', 'description', 'file', 'updated', 'toolTo', 'toolLabel']) {
      assert.ok(typeof a[field] === 'string' && a[field].length > 0, `${a.slug} has no ${field}`)
    }
    assert.ok(TOPICS.includes(a.topic), `${a.slug} has topic "${a.topic}", which is not in TOPICS`)
    assert.match(a.updated, /^\d{4}-\d{2}-\d{2}$/, `${a.slug} has an unusable updated date`)
    assert.ok(Number.isInteger(a.words) && a.words > 200, `${a.slug} has an implausible word count`)
    assert.ok(Array.isArray(a.sections) && a.sections.length >= 3, `${a.slug} has too few sections`)
    assert.ok(Array.isArray(a.sources) && a.sources.length >= 1, `${a.slug} cites nothing`)
    // navLabel is what the nav column shows, where the row is about 180px wide.
    assert.ok(a.navLabel.length <= 24, `${a.slug}'s navLabel is too long for a nav row`)
  }
})

test('THE ONE THAT MATTERS: every registered article actually renders', () => {
  // The registry is what makes a URL exist. A slug in it that the page cannot
  // map to a body is a prerendered, advertised, nav-linked 404 — and nothing
  // else in the build says a word about it.
  const bodies = objectBody('BODIES')
  for (const a of LEARN_ARTICLES) {
    assert.ok(
      fs.existsSync(path.join(process.cwd(), proseDir, a.file)),
      `${a.slug} names ${a.file}, which does not exist`,
    )
    assert.ok(
      bodies.includes(`'${a.slug}':`),
      `${a.slug} is registered but LearnArticle.jsx's BODIES map does not carry it — the route would render NotFound`,
    )
    assert.ok(
      pageSource.includes(`from '../data/learn/${a.file.replace(/\.jsx$/, '')}'`),
      `${a.slug}'s body is not imported by LearnArticle.jsx`,
    )
  }
})

test('the contents rail and the prose name the same sections, in the same order', () => {
  for (const a of LEARN_ARTICLES) {
    const src = articleSource(a)
    const inProse = [...src.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1])
    const registered = a.sections.map((s) => s.id)
    assert.deepEqual(inProse, registered,
      `${a.slug}: the <section id>s in ${a.file} do not match the sections in learnIndex.js.`
      + ' Either the contents rail links to an anchor that is not there, or a section'
      + ' of the article is missing from the contents.')
    for (const s of a.sections) {
      assert.ok(s.title && s.title.length > 2, `${a.slug} has a section with no usable title`)
    }
    assert.equal(new Set(registered).size, registered.length, `${a.slug} repeats a section id`)
  }
})

test('the measured word count on disk is the one the reading estimate uses', () => {
  for (const a of LEARN_ARTICLES) {
    const measured = countWords(proseOf(articleSource(a)))
    // A tolerance rather than equality: a one-word edit should not fail the
    // build, but a section added or removed should. 3% of ~1,300 words is
    // about forty, which is a paragraph.
    const drift = Math.abs(measured - a.words) / measured
    assert.ok(drift <= 0.03,
      `${a.slug}: learnIndex.js says ${a.words} words, ${a.file} measures ${measured}`
      + ' — run `node scripts/learn-wordcount.mjs` and update it')
    assert.ok(readingMinutes(a.words) >= 1)
  }
})

test('every source is a real, attributable link', () => {
  for (const a of LEARN_ARTICLES) {
    for (const s of a.sources) {
      assert.ok(s.label && s.label.length > 8, `${a.slug} has a source with no usable label`)
      assert.match(s.href, /^https?:\/\/\S+$/, `${a.slug} has a source with an unusable href: ${s.href}`)
    }
    const hrefs = a.sources.map((s) => s.href)
    assert.equal(new Set(hrefs).size, hrefs.length, `${a.slug} lists the same source twice`)
  }
})

test('every article route carries its own metadata and gets a shell', () => {
  const shells = prerenderRoutes()
  for (const route of LEARN_ARTICLE_ROUTES) {
    assert.ok(PAGE_TITLES[route], `${route} has no title — it would ship the homepage's`)
    assert.ok(PAGE_DESCRIPTIONS[route], `${route} has no description`)
    assert.ok(shells.includes(route), `${route} is a published article and must be prerendered`)
  }
  // /learn itself is the parent and must be there too, or the articles are
  // orphans with a breadcrumb pointing at a page nobody crawled.
  assert.ok(shells.includes('/learn'), '/learn must be prerendered alongside its articles')
})

test('every article ends somewhere that exists', () => {
  for (const a of LEARN_ARTICLES) {
    assert.ok(PAGE_TITLES[a.toolTo],
      `${a.slug} points at ${a.toolTo}, which is not a route with its own metadata`)
    assert.ok(objectBody('TOOL_LEDE').includes(`'${a.slug}': '`),
      `${a.slug} has no sentence in TOOL_LEDE saying what its tool does`)
  }
})

test('the Learn nav offers every article and no article it does not have', () => {
  const tree = read(path.join('src', 'data', 'toolTree.js'))
  assert.match(tree, /LEARN_ARTICLE_ROWS/, 'the Learn menu no longer builds a row per article')
  assert.match(tree, /import \{[^}]*\bLEARN_ARTICLES\b[^}]*\} from '\.\/learnIndex\.js'/,
    'toolTree.js must read the articles rather than keep a copy of them')
  // The icon map is presentation and may legitimately fall back, but an article
  // with no entry is a row wearing a glyph that means nothing.
  for (const a of LEARN_ARTICLES) {
    assert.ok(tree.includes(`'${a.slug}':`),
      `${a.slug} has no NavIcon glyph in LEARN_ARTICLE_ICONS`)
  }
})

test('a roadmap row that has stopped saying Soon points at a guide that renders', () => {
  // The Learn menu, the /learn grid and the visual sitemap all show the topic
  // roadmap. A row is allowed to stop being Soon only when a published guide
  // answers it, and the row records WHICH by carrying that guide's route — so
  // an unflipped `soon: false` is a topic advertised as done with the section
  // landing behind it, which is the exact dishonesty the Soon badge exists to
  // prevent.
  const live = LEARN_GROUPS.filter((g) => !g.soon)
  for (const group of live) {
    assert.ok(LEARN_ARTICLE_ROUTES.includes(group.route),
      `the ${group.id} roadmap row is no longer Soon but points at ${group.route},`
      + ' which is not a published guide')
    assert.ok(findArticle(group.route.replace('/learn/', '')),
      `${group.route} is not a registered article`)
  }
  // LEARN_ROADMAP and LEARN_DELIVERED are what the surfaces render; between
  // them they must account for every row exactly once, or a topic silently
  // disappears from both the roadmap and the guide list.
  assert.equal(LEARN_ROADMAP.length + live.length, LEARN_GROUPS.length)
  assert.deepEqual(LEARN_DELIVERED.map((g) => g.id), live.map((g) => g.id),
    'a delivered row points somewhere that is not one of the article routes')
  assert.ok(LEARN_ROADMAP.every((g) => g.soon), 'LEARN_ROADMAP carries a row that is not Soon')
})

test('no two Learn rows claim the same destination', () => {
  // The failure this is really about: SiteMap.jsx renders one .smap-link per
  // article AND one per roadmap row, keyed by data-route. A delivered row
  // listed in both places puts two elements on one route — a duplicate for the
  // reader, and a strict-mode ambiguity for the spec that walks that column.
  // Roadmap rows legitimately SHARE /learn — they are non-actionable, and the
  // section landing is where a row with nothing behind it points. What must
  // never happen is a roadmap row landing on a GUIDE's route, because the
  // guide is already listed above it under its own title.
  const clashes = LEARN_ROADMAP
    .filter((g) => LEARN_ARTICLE_ROUTES.includes(g.route))
    .map((g) => `${g.id} -> ${g.route}`)
  assert.deepEqual(clashes, [],
    `${clashes.join(', ')}: a Soon row points at a published guide, so the Learn`
    + ' column would render that route twice, once of them wearing a Soon badge')
  assert.equal(new Set(LEARN_ARTICLE_ROUTES).size, LEARN_ARTICLE_ROUTES.length)
})

test('read-next walks every article and returns to the first', () => {
  const seen = new Set()
  let at = LEARN_ARTICLES[0]
  for (let i = 0; i < LEARN_ARTICLES.length; i++) {
    assert.ok(!seen.has(at.slug), 'nextArticle() revisited an article before covering them all')
    seen.add(at.slug)
    at = nextArticle(at.slug)
  }
  assert.equal(at.slug, LEARN_ARTICLES[0].slug, 'nextArticle() does not wrap back to the first')
  assert.equal(seen.size, LEARN_ARTICLES.length)
})

test('an unknown slug resolves to nothing rather than to the first article', () => {
  // The router depends on undefined here: LearnArticle.jsx renders NotFound
  // when findArticle() misses, which is what keeps /learn/nonsense a real 404
  // instead of a 200 carrying real content.
  for (const bad of ['', 'nonsense', '../colour-contrast', 'colour contrast']) {
    assert.equal(findArticle(bad), undefined, `findArticle(${JSON.stringify(bad)}) matched something`)
  }
  assert.equal(findArticle(LEARN_ARTICLES[0].slug.toUpperCase())?.slug, LEARN_ARTICLES[0].slug,
    'a slug in the wrong case should still resolve — URLs are matched lowercased elsewhere')
})
