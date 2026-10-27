// A BLOCK THAT IS ON SCREEN MUST BE VISIBLE, WHETHER OR NOT THE VISITOR SCROLLED.
//
// Founder report, 2026-10-21 (card 259702de0b), measured on the live site: after
// a hash link jump or a reload that restores scroll, the reveal block just
// inside the fold stayed at opacity 0 and appeared only after 1-40px of
// scrolling. Seen on /learn/principles (1440, mid-page reload, the 2nd
// .prn-item), /learn#learn-topic-typography (1440), /learn/help#faq (1440) and
// /learn#learn-topic-colour (390).
//
// THE CAUSE. src/hooks/useReveal.js ran its "what is already on screen" pass
// once, at mount, while the page was still at the top. A hash landing or a
// restored scroll position arrives AFTER that pass. The IntersectionObserver it
// leaves behind trims 8% off the bottom of the viewport and wants 15% of the
// node inside what is left, so a block sitting in that band is on screen and
// not "intersecting", and stays at opacity 0 until the next scroll nudges it.
//
// WHAT THIS MEASURES. For each URL, at a phone and a desktop width, either land
// on it with the hash or scroll mid-page and reload (Chromium restores the
// scroll), then ask the browser, with no scrolling of our own: of the
// [data-reveal] / [data-reveal-group] blocks whose box intersects the viewport,
// is every one at computed opacity 1? A web-first poll, so the reveal's own
// transition and the sweep's frame are waited out, not slept through.
//
// The reload case parks the second block that starts below the first screen
// with its top at 95% of the viewport height: inside the screen, inside the 8%
// band the observer ignores. That is the exact geometry of the report, and it
// does not depend on how tall a particular page happens to be.
//
// HOW TO SEE IT FAIL. Revert src/hooks/useReveal.js to its form before this
// spec (git show <this commit>^:src/hooks/useReveal.js). The reload cases and
// the hash cases on /learn/help then report the blocks that stayed at opacity 0.
import { test, expect } from './base.js'
import { go, ready, watch } from './helpers.js'

const PERSONA = 'someone who jumps into the middle of a guide and expects to read it'

const WIDTHS = [
  [390, 844],
  [1440, 900],
]

const URLS = [
  '/learn/principles',
  '/learn#learn-topic-typography',
  '/learn/help#faq',
  '/learn#learn-topic-colour',
]

// Reveal blocks that intersect the viewport, and which of them are not opaque.
const readInView = () => {
  const vh = window.innerHeight
  const inView = [...document.querySelectorAll('[data-reveal], [data-reveal-group]')].filter((el) => {
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.width > 0 && r.top < vh && r.bottom > 0
  })
  return {
    reduced: document.documentElement.getAttribute('data-reduced-motion'),
    inView: inView.length,
    faint: inView
      .map((el) => ({
        what: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`,
        top: Math.round(el.getBoundingClientRect().top),
        opacity: Number(parseFloat(getComputedStyle(el).opacity).toFixed(2)),
      }))
      .filter((b) => b.opacity < 0.99),
  }
}

async function expectEveryBlockInViewVisible(page, label) {
  // Non-vacuous first: something must be in view, and the app must not be in
  // reduced motion (the CSS forces opacity 1 there and this would prove nothing).
  const first = await page.evaluate(readInView)
  expect(first.reduced, `${label}: animation must be on or the test proves nothing`).not.toBe('true')
  expect(first.inView, `${label}: no reveal block in view, so there is nothing to measure`).toBeGreaterThan(0)

  await expect
    .poll(async () => (await page.evaluate(readInView)).faint, {
      message: `${label}: reveal blocks on screen but still faint, with no scrolling`,
      timeout: 3000,
    })
    .toEqual([])
}

test.describe('reveal blocks on screen are visible after a jump', () => {
  for (const [w, h] of WIDTHS) {
    for (const url of URLS) {
      test(`${url} at ${w}: landing on it shows what is in view`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' })
        const page = await ctx.newPage()
        watch(page, PERSONA)
        await go(page, url)
        await expectEveryBlockInViewVisible(page, `${url} @${w}`)
        await ctx.close()
      })

      test(`${url} at ${w}: reloading mid-page shows what is in view`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' })
        const page = await ctx.newPage()
        watch(page, PERSONA)
        await go(page, url.split('#')[0])

        // Park the second block below the first screen with its top at 95% of the
        // viewport: on screen, inside the band the observer trims.
        const parked = await page.evaluate(() => {
          const vh = window.innerHeight
          const below = [...document.querySelectorAll('[data-reveal], [data-reveal-group]')]
            .map((el) => el.getBoundingClientRect().top + window.scrollY)
            .filter((top) => top > vh)
            .sort((a, b) => a - b)
          const target = below[1] ?? below[0]
          if (target === undefined) return null
          window.scrollTo({ top: Math.max(0, target - vh * 0.95), behavior: 'instant' })
          return Math.round(window.scrollY)
        })
        expect(parked, `${url} @${w}: needs reveal blocks below the first screen`).not.toBeNull()
        // Scroll position is saved to history on scroll; let it settle first.
        await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(parked)

        await page.reload({ waitUntil: 'domcontentloaded' })
        await ready(page, url)
        // Wherever the browser put the page (restoration is clamped to however
        // tall the document is at that moment, so it varies run to run, and is
        // sometimes the top), what is in view must already be visible.
        await expectEveryBlockInViewVisible(page, `${url} reload @${w}`)

        // Then do what a late restore does, deterministically: jump to the
        // parked position after the route has mounted. This is the step that
        // fails without the fix, on every run.
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), parked)
        await expectEveryBlockInViewVisible(page, `${url} restored to y=${parked} @${w}`)
        await ctx.close()
      })
    }
  }
})
