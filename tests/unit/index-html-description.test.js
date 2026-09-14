// `index.html` IS THE ONE PAGE PRERENDERING NEVER TOUCHES, WHICH IS WHY THIS
// EXISTS.
//
// `scripts/prerender.mjs` classifies `/` as `prerender:false` — "the root shell
// itself, dist/index.html is served directly" — so every other route gets its
// head written from `src/data/routeMetaMap.js` and the highest-traffic URL on
// the site ships whatever was hand-typed into the root HTML.
//
// MEASURED 2026-09-14, before this guard: `/` shipped FOUR different
// descriptions for one page.
//
//   <meta name="description">        "…colour systems, icons, emoji, image
//                                     conversion, aspect ratios, gradients and
//                                     contrast checks."            (131 chars)
//   og:description / twitter:description
//                                    "Browser-based tools for colour systems,
//                                     icons, emoji, imagery and interface
//                                     validation."                  (89 chars)
//   JSON-LD WebApplication.description
//                                    "…for building colour systems, browsing
//                                     icons and emoji, converting imagery…"
//   DEFAULT_DESCRIPTION              what every OTHER page ships   (158 chars)
//
// `src/App.jsx` rewrites `document.title` and the description/og/twitter META
// tags on hydration, so a crawler that executes JS eventually sees the right
// text. TWO AUDIENCES NEVER DO:
//
//   1. Social unfurlers that read raw HTML without running JS — Slack, X,
//      LinkedIn, Discord, iMessage — which is every preview of the most-shared
//      link the product has.
//   2. Structured-data consumers, because NOTHING rewrites JSON-LD at runtime.
//      That variant shipped permanently regardless of hydration.
//
// This mirrors `index-html-pricing.test.js`, which pins `index.html`'s price to
// `planLadder.js` for exactly the same reason: a fact duplicated into the root
// shell has no other way of staying true.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_DESCRIPTION } from '../../src/data/routeMetaMap.js'

const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')

const content = (re) => {
  const m = html.match(re)
  return m ? m[1] : null
}

test('index.html description tags all carry DEFAULT_DESCRIPTION', () => {
  const description = content(/<meta name="description" content="([^"]+)"/)
  const og = content(/<meta property="og:description" content="([^"]+)"/)
  const twitter = content(/<meta name="twitter:description" content="([^"]+)"/)

  assert.ok(description, 'index.html has no <meta name="description">')
  assert.ok(og, 'index.html has no og:description')
  assert.ok(twitter, 'index.html has no twitter:description')

  assert.equal(description, DEFAULT_DESCRIPTION,
    'index.html\'s description has drifted from routeMetaMap.js')
  assert.equal(og, DEFAULT_DESCRIPTION,
    'og:description has drifted — this is what Slack, X and LinkedIn show')
  assert.equal(twitter, DEFAULT_DESCRIPTION,
    'twitter:description has drifted from routeMetaMap.js')
})

test('the canonical on the root shell carries the trailing slash', () => {
  // `canonicalUrl('/')` produces `https://uil4b.com/`, which is what /home
  // points at. The root shell is the one page that never runs through it, so it
  // shipped the bare origin and disagreed with its own duplicate.
  const canonical = content(/<link rel="canonical" href="([^"]+)"/)
  assert.equal(canonical, 'https://uil4b.com/')
})

test('this guard is not toothless — it reads real tags, and they are distinct', () => {
  // POSITIVE CONTROL. Every assertion above is an equality against one
  // constant, so a file that had lost all three tags, or a regex that silently
  // stopped matching, would fail loudly rather than pass — but only if the
  // tags are really there and really separate elements. Two of them being the
  // SAME match would make one assertion meaningless.
  const all = [...html.matchAll(/<meta (?:name|property)="(?:og:)?(?:twitter:)?description" content="[^"]+"/g)]
  assert.equal(all.length, 3, 'expected exactly three description tags in the root shell')
  assert.ok(DEFAULT_DESCRIPTION.length > 100,
    'DEFAULT_DESCRIPTION is suspiciously short — the import may have resolved to nothing')
})
