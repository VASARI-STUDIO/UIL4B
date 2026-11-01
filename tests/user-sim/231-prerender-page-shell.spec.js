// The served HTML of a tool or Learn page says what the page is, before any
// script runs.
//
// Every prerendered route except the front door used to ship a grey skeleton and
// "Loading UIL4B". Crawlers and answer engines that do not run JavaScript read
// nothing on a tool page or a guide. Now each shell carries the page's h1 and
// intro, and a Learn guide carries its own text.
//
// Both halves are read from the written files (`<route>/index.html`, asked for
// by name so a preview server's single-page fallback cannot answer with the
// front door's shell) and then from a browser whose entry bundle is held back,
// so what is on screen is the server's markup and nothing else.
//
// To see this fail: in scripts/prerender.mjs skip the `wantsPageShell` branch;
// every case below finds only the skeleton.
import { test, expect } from './base.js'
import { goHoldingApp, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const TOOLS = ['/create/contrast', '/create/type-scale', '/create/palette']
const shellUrl = (route) => `${route}/index.html`

for (const route of TOOLS) {
  test(`${route}: the HTML a crawler fetches has an h1 and an intro`, async ({ request }) => {
    const res = await request.get(shellUrl(route))
    expect(res.ok()).toBe(true)
    const html = await res.text()
    const root = html.slice(html.indexOf('<div id="root">'), html.indexOf('<noscript>'))
    expect(root).toMatch(/<h1 class="boot-h1">[^<]{4,}<\/h1>/)
    const intro = /<p class="boot-intro">([^<]+)<\/p>/.exec(root)
    expect(intro, 'an intro paragraph').not.toBeNull()
    expect(intro[1].length, 'a sentence, not a stub').toBeGreaterThan(40)
    expect(root, 'not the empty skeleton boxes').not.toMatch(/boot-title|boot-sub/)
  })
}

for (const article of LEARN_ARTICLES) {
  test(`/learn/${article.slug}: the HTML a crawler fetches carries the guide`, async ({ request }) => {
    const res = await request.get(shellUrl(`/learn/${article.slug}`))
    expect(res.ok()).toBe(true)
    const html = await res.text()
    const root = html.slice(html.indexOf('<div id="root">'), html.indexOf('<noscript>'))
    expect(root).toContain(`<h1 class="boot-h1">`)
    expect(root).toContain('<div class="boot-prose" aria-hidden="true">')
    for (const s of article.sections) {
      expect(root, `section "${s.title}"`).toContain(s.title.replace(/&/g, '&amp;'))
    }
    expect(html, 'Article structured data').toContain('"@type": "Article"')
    expect(root, 'no ids a #fragment could land on').not.toMatch(/\sid="(?!root"|boot-shell")/)
  })
}

test.describe('the shell on screen, with the app held back', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a guide shell shows its heading and intro and keeps the article off-screen', async ({ page }) => {
    watch(page, 'a crawler-like visitor whose script never runs')
    const article = LEARN_ARTICLES[0]
    // goHoldingApp keeps the entry bundle from running while this callback reads
    // the page, so what it sees is the server's markup and nothing else.
    await goHoldingApp(page, shellUrl(`/learn/${article.slug}`), async () => {
      const h1 = page.locator('#boot-shell h1.boot-h1')
      await expect(h1).toHaveText(article.title)
      await expect(page.locator('#boot-shell .boot-intro')).toHaveText(article.dek)

      // The article is in the document but takes no room and is not exposed.
      const prose = page.locator('#boot-shell .boot-prose')
      await expect(prose).toHaveCount(1)
      const box = await prose.boundingBox()
      expect(box.width).toBeLessThanOrEqual(1)
      expect(box.height).toBeLessThanOrEqual(1)
      expect(await prose.getAttribute('aria-hidden')).toBe('true')

      // No horizontal overflow at 390.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      // The shell must still read as a shell to the readiness helper: no <main>.
      await expect(page.locator('#boot-shell main')).toHaveCount(0)
    })
  })
})
