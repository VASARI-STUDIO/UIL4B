// A SLOW DEVICE THAT SCROLLS ONCE MUST NOT BE LEFT LOOKING AT EMPTY STAND-INS.
//
// The first wheel, touch or key press opens every below-the-fold section at once
// (useBelowFoldReady). Each opens through Suspense: the stand-in is the fallback and the
// section replaces it when React retries. React's retry lanes never expire, and the hero keeps
// feeding the default lane (the typed search phrase, the loop), so on a CPU about 8x slower than
// a desktop the retry was starved: every chunk and stylesheet had arrived and four stand-ins
// stayed for 20s or more. Without hero motion (reduced motion) the same page clears in about 4s.
//
// Each test is a fresh load, because the starvation is a race: with the bug about five of six
// loads stay stuck, so three loads in a row cannot all pass by luck.
import { test, expect } from './base.js'
import { goRaw, watch, HOME_LAZY_SECTIONS } from './helpers.js'

const RATE = 8
// What clears in about 4-5s when the page is healthy at this rate (6x was borderline: about five loads in six stuck in a bare browser, one in three in the suite).
const BUDGET_MS = 12000

const holds = (page) => page.evaluate(() => document.querySelectorAll('[data-deferred-hold]').length)

test.describe('homepage sections after one wheel on a slow device', () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  test.setTimeout(90000)

  for (const load of [1, 2, 3]) {
    test(`${RATE}x CPU, load ${load}: every stand-in is replaced within ${BUDGET_MS / 1000}s`, async ({ page, context }) => {
      watch(page, 'a visitor on a slow device who scrolls once')
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })
      // The first thing a visitor on a slow phone does: the moment the page is on screen, they move it.
      // (go() would wait for the page to settle first, which gives the retry the quiet it needs.)
      await goRaw(page, '/', { waitUntil: 'commit' })
      await page.locator('main#main').waitFor({ state: 'visible' })
      await page.mouse.move(640, 400)
      await page.mouse.wheel(0, 300)
      await expect.poll(() => holds(page), { message: 'stand-ins left after one wheel', timeout: BUDGET_MS, intervals: [250] }).toBe(0)
      for (const id of HOME_LAZY_SECTIONS) await expect(page.locator(`#${id} h2`), `${id} never mounted`).toBeAttached()
    })
  }
})
