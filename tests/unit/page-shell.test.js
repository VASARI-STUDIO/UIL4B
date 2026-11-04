// EVERY PRERENDERED ROUTE CARRIES A HEADING AND AN INTRO, AND EVERY GUIDE ITS TEXT.
//
// Before scripts/page-shell.mjs only `/` had a body; every tool and Learn page
// was served the skeleton and "Loading UIL4B", so a crawler that does not run
// script read nothing. These tests pin the three things that make the shells
// worth having and keep them honest:
//
//   1. no route's shell is a bare skeleton: each has an h1 and a real intro;
//   2. the words come from the data the page renders, never from a copy in the
//      script (the guide text is the guide's own component, rendered);
//   3. the written file keeps the shape the rest of the system relies on: no
//      <main> (the readiness helper reads `main` to tell a shell from a page),
//      no ids that a #fragment link could land on, one h1.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaGated.js'
import { pageName } from '../../src/data/routeMetaMap.js'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'
import { HOME_SHELL_ROUTES } from '../../scripts/home-shell.mjs'
import { renderGuideBodies } from '../../scripts/guide-html.mjs'
import { articleFor, articleJsonLd } from '../../scripts/route-schema.mjs'
import {
  applyPageShell, assertPageShellApplied, guideFor, shellContentFor, stripForShell, wantsPageShell,
} from '../../scripts/page-shell.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8')
const indexHtml = read('index.html')
const ORIGIN = 'https://uil4b.com'

const bodies = await renderGuideBodies()
// React escapes five characters; everything else in the JSX source is already a literal character.
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const shellFor = (route) => applyPageShell(indexHtml, shellContentFor(route, bodies))
const rootOf = (html) => html.slice(html.indexOf('<div id="root">'), html.indexOf('<noscript>'))

const routes = prerenderRoutes().filter((r) => !HOME_SHELL_ROUTES.has(r))
const guideRoutes = routes.filter((r) => guideFor(r))

test('the matrix has tool routes and guide routes to cover', () => {
  assert.ok(routes.some((r) => r.startsWith('/create/')), 'no tool route in the matrix')
  assert.equal(guideRoutes.length, LEARN_ARTICLES.length, 'every registered guide is a prerendered route')
})

for (const route of routes) {
  test(`${route}: the shell has an h1 and an intro, not a bare skeleton`, () => {
    assert.ok(wantsPageShell(route))
    const content = shellContentFor(route, bodies)
    const html = shellFor(route)
    const body = rootOf(html)

    assert.ok(content.h1.length > 3, 'h1 text')
    assert.ok(content.intro.length > 40, `intro is a sentence, got: ${content.intro}`)
    assert.doesNotThrow(() => assertPageShellApplied(html, content, route))

    assert.equal((body.match(/<h1\b/g) || []).length, 1, 'exactly one h1')
    assert.match(body, /<p class="boot-intro">/)
    // The skeleton's empty title and subtitle boxes are what the h1 and intro replace.
    assert.doesNotMatch(body, /boot-title|boot-sub/)
    // The shell keeps its live region, and gains words around it.
    assert.match(body, /id="boot-shell"/)
    assert.ok(plain(body.replace(/<div class="boot-decoration"[\s\S]*?<\/div>\s*<\/div>/, '')).length > 80,
      'visible words beyond "Loading UIL4B"')
    // The readiness helper tells a shell from a page by reading `main`.
    assert.doesNotMatch(body, /<main\b/, 'a <main> in the shell would make it look like an arrived page')
  })
}

test('non-guide routes take their words from the route table', () => {
  for (const route of routes.filter((r) => !guideFor(r))) {
    const { h1, intro, prose } = shellContentFor(route, bodies)
    assert.equal(h1, pageName(PAGE_TITLES[route]), `${route} h1`)
    assert.ok(PAGE_DESCRIPTIONS[route], `${route} has a description of its own`)
    assert.equal(intro, PAGE_DESCRIPTIONS[route], `${route} intro`)
    assert.equal(prose, '', `${route} has no guide text`)
  }
})

for (const article of LEARN_ARTICLES) {
  test(`/learn/${article.slug}: the shell carries the guide itself`, () => {
    const route = `/learn/${article.slug}`
    const content = shellContentFor(route, bodies)
    const html = shellFor(route)
    const body = rootOf(html)

    // The two things LearnArticle.jsx renders under its own <h1>.
    assert.equal(content.h1, article.title)
    assert.equal(content.intro, article.dek)

    // The text: every section heading, and most of the measured word count.
    const text = plain(content.prose)
    for (const s of article.sections) {
      assert.ok(text.includes(s.title), `section "${s.title}" is in the shell`)
    }
    const words = text.split(' ').length
    assert.ok(words >= article.words * 0.8, `${article.slug}: ${words} words in the shell vs ${article.words} measured`)

    // Hand-off and citations come from the registry record.
    assert.ok(content.prose.includes(`href="${article.toolTo}"`), 'links to its tool')
    for (const src of article.sources || []) assert.ok(content.prose.includes(src.href), `cites ${src.href}`)

    // Safe to sit in the document.
    assert.doesNotMatch(body, /\sid="(?!root"|boot-shell")/, 'no ids besides #root and #boot-shell that a #fragment could land on')
    assert.doesNotMatch(content.prose, /NaN|undefined|\[object |<script|<canvas/)
    assert.match(body, /<div class="boot-prose" aria-hidden="true">/)
  })
}

test('stripForShell drops ids, tabindex and label references', () => {
  const out = stripForShell('<section id="a" class="x"><div tabindex="0" aria-labelledby="b" role="group">t</div></section>')
  assert.equal(out, '<section class="x"><div role="group">t</div></section>')
})

test('a guide with no rendered body is an error, not an empty shell', () => {
  assert.throws(() => shellContentFor('/learn/type-scales', {}), /no rendered body/)
})

test('applyPageShell throws when the anchors have moved', () => {
  assert.throws(() => applyPageShell('<html><body></body></html>', { h1: 'x', intro: 'y', prose: '' }), /could not find/)
})

test('assertPageShellApplied fails a file that lost its heading', () => {
  const content = shellContentFor('/create/contrast', bodies)
  assert.throws(() => assertPageShellApplied('<html></html>', content, 'x'), /without the h1, the intro/)
})

test('the script holds no copy of any guide or tool wording', () => {
  const src = ['page-shell.mjs', 'guide-html.mjs', 'guide-render.entry.jsx']
    .map((f) => read('scripts', f)).join('\n')
  for (const a of LEARN_ARTICLES) {
    assert.ok(!src.includes(a.title), `${a.slug} title is typed into the shell script`)
    assert.ok(!src.includes(a.dek), `${a.slug} dek is typed into the shell script`)
  }
  for (const d of Object.values(PAGE_DESCRIPTIONS)) assert.ok(!src.includes(d), 'a route description is typed into the shell script')
})

test('the home shell is untouched: the page shell never claims `/`', () => {
  assert.equal(wantsPageShell('/'), false)
  assert.equal(wantsPageShell('/home'), false)
})

// ── Article structured data ────────────────────────────────────────────────
test('every guide has an Article block built from its registry record', () => {
  for (const a of LEARN_ARTICLES) {
    const ld = articleFor(`/learn/${a.slug}`, ORIGIN)
    assert.equal(ld['@type'], 'Article')
    assert.equal(ld.headline, a.title)
    assert.equal(ld.description, a.description)
    assert.equal(ld.dateModified, a.updated)
    assert.equal(ld.mainEntityOfPage['@id'], `${ORIGIN}/learn/${a.slug}`)
    assert.equal(ld.author['@type'], 'Organization', 'no invented byline')
    assert.equal('datePublished' in ld, false, 'no first-published date is on record')
    assert.match(articleJsonLd(`/learn/${a.slug}`, ORIGIN), /^<script type="application\/ld\+json">/)
  }
})

test('only guides get an Article block', () => {
  for (const r of ['/learn', '/learn/help', '/learn/principles', '/create/contrast', '/plans', '/learn/nonsense']) {
    assert.equal(articleFor(r, ORIGIN), null, r)
    assert.equal(articleJsonLd(r, ORIGIN), '', r)
  }
})

// ── The written files ──────────────────────────────────────────────────────
// Everything above exercises the module on its own. These read what the
// prerender step actually wrote, so a prerender.mjs that stopped calling the
// module is caught here. Skips when there is no build, like the other dist tests.
const DIST = path.join(root, process.env.DIST_DIR || 'dist')
const noBuild = !fs.existsSync(path.join(DIST, 'assets')) && 'run a build first (see DIST_DIR)'

test('the prerender step wrote the shell into every non-home route file', { skip: noBuild }, () => {
  for (const route of routes) {
    const html = fs.readFileSync(path.join(DIST, route.replace(/^\//, ''), 'index.html'), 'utf8')
    const body = rootOf(html)
    assert.match(body, /<h1 class="boot-h1">[^<]{4,}<\/h1>/, `${route}: no h1 in the written file`)
    assert.match(body, /<p class="boot-intro">[^<]{40,}<\/p>/, `${route}: no intro in the written file`)
    assert.doesNotMatch(body, /boot-title|boot-sub/, `${route}: still the bare skeleton`)
  }
})

test('the written guide files carry the guide text and an Article block', { skip: noBuild }, () => {
  for (const a of LEARN_ARTICLES) {
    const html = fs.readFileSync(path.join(DIST, 'learn', a.slug, 'index.html'), 'utf8')
    assert.match(rootOf(html), /<div class="boot-prose" aria-hidden="true">/, `${a.slug}: no guide text`)
    assert.ok(html.includes('"@type": "Article"'), `${a.slug}: no Article block`)
  }
})
