// The front door's prerendered shell carries a static copy of the nav, so the page
// has a nav before React arrives. A visitor must still never meet TWO navs: not a
// screen reader, not the keyboard, and not the DOM once the app is up.
//
// The contract (scripts/home-shell.mjs, shellNav / SHELL_SEARCH):
//   - before hydration the shell nav and search frame are `inert` and
//     `aria-hidden`: nothing in them takes focus, and the accessibility tree
//     holds no navigation landmark; the two hero buttons are real links;
//   - after hydration exactly one `nav.spnav` exists, and it is the live one
//     (not inert, not hidden); no shell copy of the buttons or search remains;
//   - at no moment during the swap do two visible, exposed navs coexist.
//
// Each half reads the page rather than the source text: the first holds the entry
// bundle back so the server's markup is the only thing there (goHoldingApp), the
// second lets it run.
//
// To see this fail: in scripts/home-shell.mjs take `inert` (or `aria-hidden="true"`)
// off the <nav class="spnav"> in shellNav(), or off SHELL_SEARCH, and rebuild.
// The held-shell cases go red (the tab walk lands in the nav, or the tree holds a
// navigation landmark). Leave the shell nav in the page after mount and the
// hydrated cases go red on the count.
import { test, expect } from './base.js'
import { go, goHoldingApp, watch } from './helpers.js'

// What a screen reader or a keyboard can reach: not inert, not aria-hidden, and
// not inside one that is.
const EXPOSED_NAVS = `() => [...document.querySelectorAll('nav.spnav')]
  .filter((n) => !n.closest('[inert], [aria-hidden="true"]')).length`

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`the home shell at ${vp.width}`, () => {
    test.use({ viewport: vp })

    test('before hydration the shell nav and search are inert and hidden from assistive tech', async ({ page }) => {
      watch(page, 'a visitor on a slow link before the app starts')
      await goHoldingApp(page, '/', async () => {
        const nav = page.locator('#boot-shell nav.spnav')
        await expect(nav).toHaveCount(1)
        await expect(nav).toHaveAttribute('aria-hidden', 'true')
        expect(await nav.evaluate((n) => n.hasAttribute('inert')), 'shell nav is inert').toBe(true)

        const search = page.locator('#boot-shell .hh-search')
        await expect(search).toHaveCount(1)
        await expect(search).toHaveAttribute('aria-hidden', 'true')
        expect(await search.evaluate((n) => n.hasAttribute('inert')), 'shell search is inert').toBe(true)

        // The accessibility tree: no navigation landmark, no search field, but
        // the two hero buttons are there as links with real destinations.
        const tree = await page.locator('body').ariaSnapshot()
        expect(tree, 'no navigation landmark before the real nav exists').not.toMatch(/- navigation/)
        expect(tree, 'no textbox from the inert search frame').not.toMatch(/- textbox/)
        await expect(page.getByRole('link', { name: /Open the toolkit/ })).toHaveAttribute('href', '/projects')
        await expect(page.getByRole('link', { name: 'View plans' })).toHaveAttribute('href', '/plans')

        // The keyboard: walk the whole tab order. Focus must never land inside
        // the inert copies, and must reach both hero links.
        const visited = []
        for (let i = 0; i < 8; i++) {
          await page.keyboard.press('Tab')
          visited.push(await page.evaluate(() => {
            const a = document.activeElement
            if (!a || a === document.body) return { tag: 'body', inInert: false, cls: '' }
            return {
              tag: a.tagName.toLowerCase(),
              cls: String(a.className || ''),
              inInert: !!a.closest('.spnav, .hh-search, [inert], [aria-hidden="true"]'),
            }
          }))
        }
        expect(visited.filter((v) => v.inInert), 'focus landed in a hidden shell copy').toEqual([])
        const classes = visited.map((v) => v.cls).join(' ')
        expect(classes).toContain('hh-go')
        expect(classes).toContain('hh-ghost')
      })
    })

    test('once the app is up there is exactly one nav, and it is the live one', async ({ page }) => {
      watch(page, 'a visitor after the home page has loaded')
      await go(page, '/')
      const nav = page.locator('nav.spnav')
      await expect(nav).toHaveCount(1)
      await expect(nav).not.toHaveAttribute('aria-hidden', 'true')
      expect(await nav.evaluate((n) => n.hasAttribute('inert')), 'the live nav is not inert').toBe(false)
      expect(await page.evaluate(`(${EXPOSED_NAVS})()`)).toBe(1)

      // Nothing from the shell is left to double up the page.
      await expect(page.locator('#boot-shell')).toHaveCount(0)
      await expect(page.locator('h1.hh-h1')).toHaveCount(1)
      await expect(page.locator('a.hh-go')).toHaveCount(1)
      await expect(page.locator('a.hh-ghost')).toHaveCount(1)
      await expect(page.locator('.hh-search')).toHaveCount(1)
      expect(await page.locator('.hh-search').evaluate((n) => n.hasAttribute('inert') || n.closest('[inert]') !== null),
        'the live search is not inert').toBe(false)

      const tree = await page.locator('body').ariaSnapshot()
      // One navigation landmark for the top bar (footer navs have their own names).
      const bars = await page.locator('nav.spnav').count()
      expect(bars).toBe(1)
      expect(tree).toMatch(/- navigation/)
    })

    test('through the swap, never two exposed navs at once', async ({ page }) => {
      watch(page, 'a visitor watching the shell hand over to the app')
      // Count on every DOM change from the first parse, so a frame where shell
      // and app navs overlap is caught even if it is gone by the time we look.
      await page.addInitScript(() => {
        window.__maxExposedNavs = 0
        window.__maxAllNavs = 0
        const count = () => {
          const navs = [...document.querySelectorAll('nav.spnav')]
          const exposed = navs.filter((n) => !n.closest('[inert], [aria-hidden="true"]')).length
          if (exposed > window.__maxExposedNavs) window.__maxExposedNavs = exposed
          if (navs.length > window.__maxAllNavs) window.__maxAllNavs = navs.length
        }
        new MutationObserver(count).observe(document, { subtree: true, childList: true, attributes: true })
      })
      await go(page, '/')
      await expect(page.locator('nav.spnav')).toHaveCount(1)
      const seen = await page.evaluate(() => ({ exposed: window.__maxExposedNavs, all: window.__maxAllNavs }))
      expect(seen.exposed, 'exposed navs at any one time').toBe(1)
      // The shell copy is replaced, not kept beside the live one.
      expect(seen.all, 'nav.spnav elements at any one time').toBeLessThanOrEqual(1)
    })
  })
}
