// A contents link clicked the moment a lazy page appears must land on its
// heading, with motion allowed (the smooth-scroll layer is running).
//
// The page first paints as the loading shell, then the real page mounts a few
// frames later and grows. The smooth-scroll layer had measured the shell and
// only re-measures after a pause, so a click inside that pause was clamped to
// the shell's height and the heading stopped far down the screen.
//
// To see this fail: remove the capture-phase click listener in
// src/hooks/useSmoothScroll.js; each jump below stops short of its heading.
import { test, expect } from './base.js'
import { go, watch, restingScrollY } from './helpers.js'

const CASES = [
  { route: '/learn/brand-colour', links: '.lart-toc a' },
  { route: '/terms', links: 'nav[aria-label="On this page"] a' },
]

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

for (const { route, links } of CASES) {
  test(`${route}: a far contents link clicked straight after load lands its heading under the nav`, async ({ page }) => {
    watch(page, `a reader jumping from the contents on ${route} as soon as it opens`)
    await go(page, route)
    const link = page.locator(links).last()
    await expect(link).toBeVisible()
    // No waiting: the click goes in while the page may still be settling.
    const id = decodeURIComponent((await link.getAttribute('href')).split('#')[1])
    await link.click()
    await restingScrollY(page, `the jump to #${id}`)
    const top = await page.evaluate((target) => document.getElementById(target).getBoundingClientRect().top, id)
    const margin = await page.evaluate((target) => parseFloat(getComputedStyle(document.getElementById(target)).scrollMarginTop) || 0, id)
    const atEnd = await page.evaluate(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
    // A last section too short to reach the line ends with the page at its end
    // instead, and above the fold; anything else must sit on the line.
    if (atEnd) expect(top, `#${id} is on screen at the end of the page`).toBeLessThan(900)
    else expect(Math.abs(top - margin), `#${id} lands on its scroll-margin line`).toBeLessThanOrEqual(12)
    expect(await page.evaluate(() => window.scrollY), 'the page moved well past the loading shell height').toBeGreaterThan(600)
  })
}
