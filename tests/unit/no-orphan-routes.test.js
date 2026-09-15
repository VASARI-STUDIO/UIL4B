// A page we ask Google to index must be a page a visitor can click to.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS — AND A CORRECTION, BECAUSE THE FIRST VERSION WAS WRONG
// ─────────────────────────────────────────────────────────────────────────────
// This file was written on 2026-09-15 to record a defect: that /community and
// /info were published in sitemap.xml and linked from nowhere.
//
// THAT WAS NOT TRUE, and the mutation test caught it. Both are linked from
// src/pages/SiteMap.jsx, which the footer links — so both were always two
// clicks from any page. The claim came from a search scoped to src/components/
// and src/data/ that never looked in src/pages/. Removing the footer link the
// "fix" had just added left this test green, which is exactly what a test whose
// premise is false looks like.
//
// The footer entries were kept anyway, and as a judgement call rather than a
// repair: Community is a whole public section of the product and the
// Information Centre is the searchable guide to every tool, and reaching either
// only through the sitemap page is a worse answer than reaching it from the
// footer of every page. That is a navigation opinion. It is reversible in one
// edit and nothing depends on it.
//
// WHAT SURVIVES, and why the file is still worth having: an orphan page is a
// real failure mode and nothing else in this repository looks for it. A path in
// sitemap.xml is a request that a search engine crawl and rank a page. If
// nothing internal links to that page, the request is made for a page a visitor
// cannot reach — the work is invisible, the page ranks badly because no internal
// link points at it, and the sitemap contradicts the site's own structure.
// Nothing is orphaned today. This fails on the day something is.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS ASSERTS
// ─────────────────────────────────────────────────────────────────────────────
// Every static path in sitemap.xml appears somewhere in src/ as a LINK TARGET —
// not merely as a string. A route's own <Route path> and its routeMetaMap entry
// are excluded by construction, since those are the two places that exist for
// every route including an orphan.
//
// It deliberately does NOT check that the link is visible, reachable by
// keyboard, or on a page a visitor ever lands on. A test that reads source
// cannot know those things, and claiming otherwise would be worse than the gap
// it closes. What it catches is the whole-class version of the bug above: a
// path published to search engines that nothing in the interface points at.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SRC = path.join(ROOT, 'src')
const SITEMAP = path.join(ROOT, 'public/sitemap.xml')

// Files that mention routes WITHOUT linking to them, and so can never be
// evidence that a route is reachable.
//
// The last two are the interesting ones, and leaving them in made this test
// lie. pipeline.js and moduleBoard.js are engineering prose — one row there
// runs to several thousand words of build history and names routes, slugs and
// files in passing. Three of the seven Learn guides were "linked" only because
// a pipeline row happened to mention their slugs in a sentence about something
// else. A route is not reachable because we wrote about it.
const NOT_EVIDENCE = new Set([
  path.join(SRC, 'App.jsx'), // <Route path="...">
  path.join(SRC, 'data', 'routeMetaMap.js'), // titles and descriptions
  path.join(SRC, 'data', 'pipeline.js'), // engineering log
  path.join(SRC, 'data', 'moduleBoard.js'), // engineering log
])

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(full)
  }
  return out
}

const sources = walk(SRC)
  .filter((f) => !NOT_EVIDENCE.has(f))
  .map((f) => ({ file: path.relative(ROOT, f), text: fs.readFileSync(f, 'utf8') }))

function sitemapPaths() {
  const xml = fs.readFileSync(SITEMAP, 'utf8')
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])
  assert.ok(locs.length > 5, `sitemap.xml yielded only ${locs.length} <loc> entries`)
  return locs
    .map((u) => u.replace(/^https?:\/\/[^/]+/, '') || '/')
    .map((p) => (p.length > 1 ? p.replace(/\/$/, '') : p))
    // The home page is the root; every path is "linked from" it trivially.
    .filter((p) => p !== '/')
    // Deduplicate — the file may list a path more than once.
    .filter((p, i, a) => a.indexOf(p) === i)
}

test('sitemap.xml is readable and lists real paths', () => {
  const paths = sitemapPaths()
  for (const p of paths) {
    assert.match(p, /^\/[\w\-/:]*$/, `"${p}" does not look like an app path`)
  }
})

test('every page in the sitemap is linked from somewhere in the app', () => {
  const orphans = []

  for (const route of sitemapPaths()) {
    // A link target: to="/x", to={'/x'}, href="/x", or the bare quoted path in
    // a nav data table (FOOTER_GROUPS, toolTree). The route's own definition
    // and its metadata are excluded above.
    const quoted = [`'${route}'`, `"${route}"`, `\`${route}\``]
    if (sources.some(({ text }) => quoted.some((q) => text.includes(q)))) continue

    // GENERATED LISTS. A guide at /learn/colour-contrast is never written out:
    // the Learn index maps over learnIndex.js and builds `/learn/${slug}`. So
    // the evidence for a child route is its PARENT being linked plus its final
    // segment existing as a registry key — which is exactly what the index is
    // iterating. Both halves are required: a slug with no linked parent is
    // still unreachable, and a linked parent does not vouch for a slug nobody
    // registered.
    const cut = route.lastIndexOf('/')
    const parent = cut > 0 ? route.slice(0, cut) : null
    const segment = route.slice(cut + 1)
    if (parent) {
      const parentQuoted = [`'${parent}'`, `"${parent}"`, `\`${parent}\``]
      const parentLinked = sources.some(({ text }) => parentQuoted.some((q) => text.includes(q)))
      const registered = sources.some(({ file, text }) =>
        file.includes('data') && (
          text.includes(`slug: '${segment}'`) ||
          text.includes(`id: '${segment}'`) ||
          text.includes(`slug: "${segment}"`)
        ))
      if (parentLinked && registered) continue
    }

    orphans.push(route)
  }

  assert.deepEqual(orphans, [],
    'these paths are published in sitemap.xml but nothing in src/ links to them, ' +
    'so a search engine is told to index a page a visitor cannot click to:\n  ' +
    orphans.join('\n  ') +
    '\n\nEither link the page — src/components/AppFooter.jsx for a footer link, ' +
    'src/pages/SiteMap.jsx for the sitemap page — or take it out of ' +
    'public/sitemap.xml.')
})

test('the exclusion list cannot quietly hide a real orphan', () => {
  // If App.jsx or routeMetaMap.js were ever the ONLY evidence for a route, the
  // test above would be vacuous for it. This proves the exclusions are doing
  // what they claim: both files really do mention a route we know IS linked,
  // so excluding them is a narrowing of evidence, not a removal of it.
  const app = fs.readFileSync(path.join(SRC, 'App.jsx'), 'utf8')
  const meta = fs.readFileSync(path.join(SRC, 'data', 'routeMetaMap.js'), 'utf8')
  assert.ok(app.includes('"/plans"') || app.includes("'/plans'"),
    'App.jsx no longer defines /plans — re-check the exclusion list')
  assert.ok(meta.includes("'/plans'"),
    'routeMetaMap.js no longer titles /plans — re-check the exclusion list')

  // …and /plans is still found by the real scan, i.e. the evidence that counts
  // comes from a navigation surface rather than from those two files.
  const linked = sources.some(({ text }) => text.includes("'/plans'") || text.includes('"/plans"'))
  assert.ok(linked, '/plans is linked from a nav surface — if this fails the scan is broken')
})
