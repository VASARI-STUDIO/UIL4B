// THE STICKY LIBRARY BAR LEAVES NO STRIP FOR PAGE CONTENT TO SHOW THROUGH.
//
// `.lbry-toolbar` (LibraryToolbar.jsx) pins itself a few pixels BELOW the fixed
// header, so between the header's bottom edge and the bar's top edge there is a
// strip of bare page. Headings and card tops scrolled through it, and past the
// bar's rounded top edge. A reader sees text sliding between two surfaces.
//
// On a library page in dark mode, scrolled until content is passing under the
// bar (and, on a phone, with the bar brought back by scrolling up), every point
// in that strip at the left edge, the middle and the right edge must hit the
// header, the bar or the bar's own backing, never page content.
import { test, expect } from './base.js'
import { go, watch, wheelToRest } from './helpers.js'

const CASES = [
  { route: '/discover/palettes', width: 1440, height: 900 },
  { route: '/discover/palettes', width: 390, height: 844 },
  { route: '/discover/gradients', width: 1440, height: 900 },
  { route: '/discover/buttons', width: 1440, height: 900 },
  { route: '/create/emoji', width: 1440, height: 900 },
  { route: '/discover/gradients', width: 390, height: 844 },
]

for (const { route, width, height } of CASES) {
  test(`${route} at ${width}: nothing shows through between the header and the sticky bar`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height } })
    const page = await ctx.newPage()
    watch(page, `someone scrolling ${route} at ${width}px in dark mode`)
    await go(page, route)
    const bar = page.locator('.lbry-toolbar').first()
    await expect(bar).toBeVisible({ timeout: 20000 })

    // Far enough that the bar is pinned and cards are passing under it.
    for (let i = 0; i < 4; i += 1) await wheelToRest(page, 500, `${route} scrolling down`)
    if (width <= 640) {
      // On a phone the bar rests in the page and is brought back by scrolling up.
      await wheelToRest(page, -160, `${route} scrolling back up`)
      await expect(bar).toHaveAttribute('data-peek', /in|out|.+/, { timeout: 5000 })
      await expect.poll(() => bar.getAttribute('data-peek')).not.toBe('out')
      await page.waitForTimeout(500)
    }

    const m = await page.evaluate(({ w }) => {
      const barEl = document.querySelector('.lbry-toolbar')
      const head = document.querySelector('.pnav')
      const b = barEl.getBoundingClientRect()
      const h = head.getBoundingClientRect()
      const ys = []
      const gap = b.top - h.bottom
      for (let i = 1; i <= 5; i += 1) ys.push(h.bottom + (gap * i) / 6)
      const xs = [4, Math.round(w / 2), w - 4]
      const hits = []
      for (const y of ys) {
        for (const x of xs) {
          const el = document.elementFromPoint(x, y)
          // The bare page ground (the shell itself) is fine; page content is not.
          const ok = !!el && (el.matches('.app-shell, .app-page, body, html') || !!(el.closest('.lbry-toolbar') || el.closest('.pnav')))
          if (!ok) hits.push(`(${x},${y.toFixed(1)}) -> ${el ? `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || '').trim().slice(0, 30)}"` : 'null'}`)
        }
      }
      // The wedges beside the pill's rounded top corners, and the full height of
      // the bar at its sides: only the bar (or its backing) or the header may be
      // there, not even bare ground, since a glyph can sit exactly there.
      const r = Math.min(parseFloat(getComputedStyle(barEl).borderTopLeftRadius) || 0, b.height / 2)
      const wedge = []
      const wys = [b.top + 4, b.top + r / 2, b.top + b.height / 2, b.bottom - 4]
      const wxs = [b.left + 2, b.right - 2, b.left - 4, b.right + 4].filter((x) => x >= 0 && x < w)
      for (const y of wys) {
        for (const x of wxs) {
          const el = document.elementFromPoint(x, y)
          if (!(el && (el.closest('.lbry-toolbar') || el.closest('.pnav')))) wedge.push(`(${x},${y.toFixed(1)}) -> ${el ? `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}` : 'null'}`)
        }
      }
      return { wedge, gap, headBottom: h.bottom, barTop: b.top, hits, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }
    }, { w: width })
    expect(m.gap, `the bar should be pinned below the header (header bottom ${m.headBottom}, bar top ${m.barTop})`).toBeGreaterThanOrEqual(0)

    expect(m.hits, `page content shows through the strip between the header and the bar:\n${m.hits.join('\n')}`).toEqual([])
    expect(m.wedge, `page content shows beside the bar's rounded corners or edges:\n${m.wedge.join('\n')}`).toEqual([])
    expect(m.sw, 'the backing must not add a sideways scroll').toBeLessThanOrEqual(m.cw)
    await ctx.close()
  })
}
