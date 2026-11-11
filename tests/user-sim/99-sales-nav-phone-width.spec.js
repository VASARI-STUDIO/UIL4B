// On phones the sales pages' bar spans the viewport edge to edge, with no horizontal scroll: the logo starts 20px in and the last button ends 12px from the right edge, and its controls keep 44px targets on a touch screen. Both themes, at 360, 390 and 430, on /, /plans and /mobile.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

for (const theme of ['light', 'dark']) {
  for (const width of [360, 390, 430]) {
    test(`${width}px ${theme}: the bar spans the width and its controls sit inside the gutters`, async ({ browser }) => {
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
          const targets = [...document.querySelectorAll('.spnav-bar .spnav-icon, .spnav-bar .spnav-mark')]
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => {
              const b = el.getBoundingClientRect()
              const after = getComputedStyle(el, '::after')
              const hitW = after.content !== 'none' ? Math.max(b.width, parseFloat(after.width) || 0) : b.width
              const hitH = after.content !== 'none' ? Math.max(b.height, parseFloat(after.height) || 0) : b.height
              return { cls: el.className, hitW, hitH }
            })
          const mark = document.querySelector('.spnav-mark').getBoundingClientRect()
          const last = document.querySelector('.spnav-burger').getBoundingClientRect()
          return { left: r.left, right: window.innerWidth - r.right, markGutter: mark.left, burgerGutter: window.innerWidth - last.right, overflow: document.documentElement.scrollWidth - window.innerWidth, targets }
        })
        expect([Math.round(m.left), Math.round(m.right)], `${route}: the bar spans the viewport`).toEqual([0, 0])
        expect(Math.round(m.markGutter), `${route}: the logo's left gutter`).toBe(20)
        expect(Math.round(m.burgerGutter), `${route}: the menu button's right gutter`).toBe(12)
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
