// A GLYPH THAT HAS NOT LOADED IS A FAINT SKELETON, NEVER A SOLID TILE.
//
// The grid takes its markup from one batched request per pack and composes each
// body into a data: URI. Until that request answers a cell is the wait box; once
// it answers, each <img> carries `ig-glyph-pending` until its own `load` event
// has fired, and then loses it.
//
// The pending window after the batch lands is a few milliseconds, so a poll
// from the test would miss it. A MutationObserver installed before the page
// script runs samples each pending <img> in the microtask after the commit that
// inserted it, which is before the image's `load` task can run, and records its
// computed background at that moment.
//
// MUTATIONS: give `.ic img.ig-glyph-pending` an opaque background in
// library.css and the alpha assertions fail; stop removing the class on load in
// MonoGlyph and the final assertion fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { ICONIFY_HOSTS, isLiveIconify } from './iconify-stub.js'

const PERSONA = 'a designer opening the icon library on a slow connection'
const MAX_SKELETON_ALPHA = 0.2

/** Alpha channel of a computed CSS colour, whatever colour space it came back in. */
function alphaOf(css) {
  if (css === 'transparent') return 0
  const slash = css.match(/\/\s*([\d.]+)(%?)\s*\)/)
  if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1)
  const rgba = css.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/)
  if (rgba) return Number(rgba[1])
  if (/^(rgb|color|oklab|oklch|lab|lch|hsl)\(/.test(css)) return 1
  throw new Error(`unparseable colour: ${css}`)
}

test.describe('the icon grid while glyph images are still loading', () => {
  test.skip(isLiveIconify(), 'the live API decides how long a glyph takes; this spec controls it')

  test('a pending glyph is a faint skeleton and the class is gone once it has loaded', async ({ page }) => {
    watch(page, PERSONA)

    await page.addInitScript(() => {
      const seen = new WeakSet()
      window.__pendingGlyphs = []
      const sample = (img) => {
        if (seen.has(img) || !img.classList.contains('ig-glyph-pending')) return
        seen.add(img)
        window.__pendingGlyphs.push({
          background: getComputedStyle(img).backgroundColor,
          loaded: img.complete && img.naturalWidth > 0,
        })
      }
      const scan = (node) => {
        if (node.nodeType !== 1) return
        if (node.tagName === 'IMG') sample(node)
        node.querySelectorAll?.('img.ig-glyph-pending').forEach(sample)
      }
      new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === 'attributes') scan(r.target)
          else r.addedNodes.forEach(scan)
        }
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
    })

    let release
    const held = new Promise((resolve) => { release = resolve })
    let heldRequests = 0
    await page.route(
      (u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\.json$/.test(u.pathname) && u.search.includes('icons='),
      async (route) => {
        heldRequests += 1
        await held
        await route.fallback()
      },
    )

    await go(page, '/create/icons')

    // While the glyph requests are held the cells are the wait box.
    await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => heldRequests, { timeout: 20_000 }).toBeGreaterThan(0)
    expect(await page.locator('.ig .ic img').count(), 'no glyph has arrived yet').toBe(0)
    const waiting = await page.locator('.ig .ic .ig-glyph-wait').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(alphaOf(waiting), `the wait box paints ${waiting}`).toBeLessThan(MAX_SKELETON_ALPHA)
    expect(alphaOf(waiting), 'the wait box is a tint, not nothing').toBeGreaterThan(0)

    release()

    await expect
      .poll(() => page.evaluate(() => window.__pendingGlyphs.length), { timeout: 20_000 })
      .toBeGreaterThan(8)
    const pending = await page.evaluate(() => window.__pendingGlyphs)
    for (const sample of pending) {
      expect(sample.loaded, 'sampled before the image finished loading').toBe(false)
      expect(alphaOf(sample.background), `a pending glyph paints ${sample.background}`)
        .toBeLessThan(MAX_SKELETON_ALPHA)
    }
    expect(pending.some((s) => alphaOf(s.background) > 0), 'the pending glyph is a tint, not nothing').toBe(true)

    // Once the images have loaded nothing is left pending and the glyphs drew.
    await expect
      .poll(() => page.evaluate(() => {
        const cells = [...document.querySelectorAll('.ig .ic img')]
        return {
          total: cells.length,
          pending: cells.filter((i) => i.classList.contains('ig-glyph-pending')).length,
          painted: cells.filter((i) => i.complete && i.naturalWidth > 0).length,
        }
      }), { timeout: 20_000 })
      .toMatchObject({ pending: 0 })
    const after = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.ig .ic img')]
      return { total: cells.length, painted: cells.filter((i) => i.complete && i.naturalWidth > 0).length }
    })
    expect(after.total, 'the grid drew glyphs').toBeGreaterThan(8)
    expect(after.painted, 'every glyph that is no longer pending has decoded').toBe(after.total)
    await expect(page.locator('.ig .ic .ig-glyph-wait')).toHaveCount(0)
  })
})
