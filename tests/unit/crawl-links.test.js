// THE SERVED SHELLS CARRY REAL LINKS A CRAWLER CAN FOLLOW BEFORE ANY SCRIPT RUNS.
//
// The mega menu builds its links once React has mounted, so the shells used to
// have none: a crawler that does not run JavaScript saw no way into any tool
// from the homepage and none between tools. scripts/home-shell.mjs now writes a
// <nav aria-label="Tools"> and scripts/page-shell.mjs a Related block, both
// drawn from src/data/crawlLinks.js, the list src/components/CrawlLinks.jsx
// renders visibly. The counts here are the audit's done-check (the SEO audit,
// F3), run on the shell string itself rather than a built dist.
//
// To see this fail: in src/data/crawlLinks.js drop the `.slice(0, MAX_TOOLS)`
// cap to `.slice(0, 2)` (a tool page then links 2 siblings), or remove a tool
// from the tree; or delete the `${crawlHtml('/')}` line in
// scripts/home-shell.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { homeShellRoot } from '../../scripts/home-shell.mjs'
import { pageShellRoot, shellContentFor } from '../../scripts/page-shell.mjs'
import { crawlBlock, toolLinks, guideLinks, relatedFor } from '../../src/data/crawlLinks.js'

const hrefs = (html, pattern) => [...new Set(html.match(pattern) || [])]
const shellFor = (route) => pageShellRoot(shellContentFor(route))

test('the homepage shell links to 13 or more tools, as real anchors', () => {
  const html = homeShellRoot()
  assert.ok(hrefs(html, /href="\/create\/[^"]*"/g).length >= 13)
  assert.match(html, /<nav class="crawl crawl--home" aria-label="Tools">/)
})

test('the homepage shell links every live tool, the guides, /tools and /learn', () => {
  const html = homeShellRoot()
  for (const t of toolLinks()) assert.ok(html.includes(`href="${t.href}"`), t.href)
  for (const g of guideLinks()) assert.ok(html.includes(`href="${g.href}"`), g.href)
  for (const to of ['/tools', '/learn']) assert.ok(html.includes(`href="${to}"`), to)
})

test('the homepage links sit outside the inert, aria-hidden skeleton nav', () => {
  const html = homeShellRoot()
  const navEnd = html.indexOf('</nav>')
  assert.ok(html.indexOf('aria-hidden="true" inert') < navEnd)
  assert.ok(html.indexOf('<nav class="crawl') > navEnd, 'the Tools nav must come after the inert one')
})

test('the palette shell has 5 or more internal links', () => {
  const html = shellFor('/create/palette')
  assert.ok(hrefs(html, /href="\/[a-z/-]*"/g).length >= 5)
  assert.match(html, /<nav class="crawl crawl--related" aria-label="Related">/)
})

test('every live tool shell links 3 to 5 tools and 1 or 2 guides', () => {
  for (const t of toolLinks()) {
    const rel = relatedFor(t.href)
    assert.ok(rel.tools.length >= 3 && rel.tools.length <= 5, `${t.href} tools: ${rel.tools.length}`)
    assert.ok(rel.guides.length >= 1 && rel.guides.length <= 2, `${t.href} guides: ${rel.guides.length}`)
    assert.ok(!rel.tools.some((l) => l.href === t.href), `${t.href} links itself`)
    const html = shellFor(t.href)
    for (const l of [...rel.tools, ...rel.guides]) assert.ok(html.includes(`href="${l.href}"`), `${t.href} -> ${l.href}`)
  }
})

test('/create/icons links its Sets tab, and /tools links /seo', () => {
  assert.ok(shellFor('/create/icons').includes('href="/create/icons/groups"'))
  assert.ok(shellFor('/create/icons/groups').includes('href="/create/icons"'))
  assert.ok(shellFor('/tools').includes('href="/seo"'))
})

test('a guide, the plans page and the 404 get no Related block', () => {
  assert.equal(relatedFor('/plans'), null)
  assert.equal(crawlBlock('/learn/colour-contrast'), null)
})

test('the shell and the rendered component draw one list', () => {
  const block = crawlBlock('/create/palette')
  const html = shellFor('/create/palette')
  for (const s of block.sections) for (const l of s.links) assert.ok(html.includes(`href="${l.href}"`))
  assert.equal(block.label, 'Related')
})
