// On phones the sales pages' pill nav spans the viewport less a 16px gutter
// each side, with no horizontal scroll, and its controls keep 44px targets on
// a touch screen. Both themes, at 360, 390 and 430, on /, /plans and /mobile.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

for (const theme of ['light', 'dark']) {
  for (const width of [360, 390, 430]) {
    test(`${width}px ${theme}: the pill spans the width less the gutters`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: theme, hasTouch: true, isMobile: true })
      await context.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
      const page = await context.newPage()
      watch(page, `a phone visitor on the sales pages (${width}px, ${theme})`)
      for (const route of ['/', '/plans', '/mobile']) {
        await go(page, route)
        const bar = page.locator('.spnav-bar')
        await expect(bar).toBeVisible()
        const m = await page.evaluate(() => {
          const r = document.querySelector('.spnav-bar').getBoundingClientRect()
          const targets = [...document.querySelectorAll('.spnav-bar .spnav-icon, .spnav-bar .spnav-cta, .spnav-bar .spnav-mark')]
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => {
              const b = el.getBoundingClientRect()
              const after = getComputedStyle(el, '::after')
              const hitW = after.content !== 'none' ? Math.max(b.width, parseFloat(after.width) || 0) : b.width
              const hitH = after.content !== 'none' ? Math.max(b.height, parseFloat(after.height) || 0) : b.height
              return { cls: el.className, hitW, hitH }
            })
          return { left: r.left, right: window.innerWidth - r.right, overflow: document.documentElement.scrollWidth - window.innerWidth, targets }
        })
        expect(Math.round(m.left), `${route}: left gutter`).toBe(16)
        expect(Math.round(m.right), `${route}: right gutter`).toBe(16)
        expect(m.overflow, `${route}: horizontal scroll`).toBeLessThanOrEqual(0)
        expect(m.targets.length, `${route}: no nav controls measured`).toBeGreaterThan(1)
        for (const t of m.targets) {
          expect(Math.min(t.hitW, t.hitH), `${route}: ${t.cls} target`).toBeGreaterThanOrEqual(44)
        }
      }
      await context.close()
    })
  }
}
