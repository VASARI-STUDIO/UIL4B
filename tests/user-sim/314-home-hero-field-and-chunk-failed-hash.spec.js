// Two things the homepage owes a visitor that no other spec holds:
//
// 1. A section link still lands when a section's chunk fails to download.
//    main.jsx answers the first failure with one guarded hard reload. A reload
//    reads the URL at that moment, and the router reports a reloaded entry as a
//    back/forward return, so a held fragment used to be dropped and the
//    reloaded page never landed it. These tests fail the Plans chunk on
//    purpose, on a fresh load of /#plans, and read where the page ends up:
//      - once (the download fails, the reload fetches it): the section lands;
//      - every time (the reload fails too): the stand-in that carries the id
//        lands, and no error card replaces the page.
//    The chunk is failed with route.abort(), which the page cannot tell from a
//    404 (see 46-lazy-chunk-recovery.spec.js).
//
// 2. The hero search field is the tap target. Its bar's vertical padding sits
//    on the input, so a touch anywhere along the bar lands in the field, and
//    the field is at least 44px tall on a coarse pointer.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// The Plans section's file, matched on its source name and nothing after the
// hash, so a branch that adds a neighbouring chunk cannot be failed by mistake.
// failPlansChunk records every distinct URL it matched; each test asserts it is
// exactly one.
const PLANS_CHUNK = /\/assets\/HomePlans-[\w-]+\.js(\?.*)?$/
// A ceiling for hanging, not a speed target. The landing is a CPU-bound chain
// (document, failed fetch, reload, hydrate, section mount, scroll), and the
// same chain took about 1s on an idle machine and over 8s with the CPU
// throttled 12x, which is what a shared CI runner looks like partway through
// a long suite. What the tests guard is that the page lands at all, so they
// wait on the landing itself and fail only if it never comes.
const WAIT_MS = 15000
const TOLERANCE_PX = 8

/**
 * Fail the Plans chunk `times` times (Infinity: every time; 'first-document':
 * every request the first document makes and none after its reload) and count
 * what the page asked for, so a test can tell that the failure happened and that the
 * reload followed it.
 */
async function failPlansChunk(page, times) {
  const seen = { aborted: 0, served: 0, documents: 0, urls: new Set() }
  await page.route(PLANS_CHUNK, (route) => {
    seen.urls.add(route.request().url())
    const fail = times === 'first-document' ? seen.documents < 2 : seen.aborted < times
    if (fail) {
      seen.aborted += 1
      return route.abort('failed')
    }
    seen.served += 1
    return route.continue()
  })
  page.on('request', (r) => {
    if (r.resourceType() === 'document' && new URL(r.url()).pathname === '/') seen.documents += 1
  })
  return seen
}

/** Where the target sits against where its own scroll margin says it should. */
const landingOffset = (page) => page.evaluate(() => {
  const target = document.getElementById('plans')
  if (!target) return null
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  const expected = margin + padding
  return { top: target.getBoundingClientRect().top, expected, scrollY }
})

/** Poll until the target holds its place within the tolerance, up to WAIT_MS. */
async function expectLanded(page) {
  await expect.poll(async () => {
    const at = await landingOffset(page)
    if (!at) return 'no #plans element'
    if (at.expected < 40) return `scroll margin ${at.expected}px is too small to prove a header offset`
    if (at.scrollY <= 0) return 'not scrolled'
    return Math.abs(at.top - at.expected) <= TOLERANCE_PX ? 'landed' : `top ${at.top} against ${at.expected}`
  }, { timeout: WAIT_MS, message: 'the #plans target never ended at the header offset' }).toBe('landed')
}

/** Still the same place a moment later: a late reflow must not carry it away. */
async function expectHolds(page) {
  await page.waitForTimeout(600)
  const at = await landingOffset(page)
  expect(Math.abs(at.top - at.expected), 'the target drifted after it landed').toBeLessThanOrEqual(TOLERANCE_PX)
}

const VIEWPORTS = [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

for (const vp of VIEWPORTS) {
  test.describe(`a section hash after a failed section chunk, ${vp.name}`, () => {
    test.use(vp.use)

    test('the chunk fails once: the reload keeps #plans, lands the real section and shows no error card', async ({ page }) => {
      watch(page, 'a visitor opening /#plans while the Plans file fails to download once')
      const seen = await failPlansChunk(page, 'first-document')
      await go(page, '/#plans')

      // POSITIVE CONTROLS: the failure happened, and the page reloaded after it.
      await expect.poll(() => seen.aborted, { timeout: WAIT_MS, message: 'the Plans file was never asked for, so nothing was failed' }).toBeGreaterThanOrEqual(1)
      await expect.poll(() => seen.documents, { timeout: WAIT_MS, message: 'the page did not reload after the failed download' }).toBeGreaterThanOrEqual(2)
      expect([...seen.urls], 'the route matched more than the one Plans file').toHaveLength(1)

      await expect(page).toHaveURL(/\/#plans$/)
      await expect(page.locator('#plans h2'), 'the reloaded page never got the real section').toBeAttached({ timeout: WAIT_MS })
      expect(seen.served, 'the reload did not fetch the Plans file').toBeGreaterThanOrEqual(1)
      await expectLanded(page)
      await expectHolds(page)
      await expect(page).toHaveURL(/\/#plans$/)
      await expect(page.locator('.error-boundary'), 'an error card covers the page').toHaveCount(0)
    })

    test('the chunk fails every time: #plans lands on the stand-in that carries the id and no error card appears', async ({ page }) => {
      watch(page, 'a visitor opening /#plans while the Plans file never downloads')
      const seen = await failPlansChunk(page, Infinity)
      await go(page, '/#plans')

      await expect.poll(() => seen.documents, { timeout: WAIT_MS, message: 'the page did not reload after the failed download' }).toBeGreaterThanOrEqual(2)
      expect([...seen.urls], 'the route matched more than the one Plans file').toHaveLength(1)
      // The reload fails too, and the stand-in is what is left: it keeps the id.
      await expect(page.locator('#plans[data-deferred-failed]'), 'the failed section left no stand-in with its id').toBeAttached({ timeout: WAIT_MS })
      expect(seen.served, 'the Plans file got through, so this is the once-only case').toBe(0)
      await expect(page).toHaveURL(/\/#plans$/)
      await expectLanded(page)
      await expectHolds(page)
      await expect(page.locator('.error-boundary'), 'an error card covers the page').toHaveCount(0)
    })
  })
}

// The hero search field. 49px at 390 and 320, 57px at 1440: the bar keeps its
// height, and the field fills what the bar's padding used to leave empty.
for (const width of [390, 320]) {
  test.describe(`the hero search field on a coarse pointer, ${width}`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true })

    test('is at least 44px tall and fills its bar', async ({ page }) => {
      watch(page, 'a phone visitor tapping the hero search')
      await go(page, '/')
      const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
      expect(coarse, 'POSITIVE CONTROL: the context is not a coarse pointer, so the check proves nothing').toBe(true)
      const input = page.locator('.hh-search input.hcmd-input')
      const bar = page.locator('.hh-search .hcmd-bar')
      await expect(input).toBeVisible()
      const inputBox = await input.boundingBox()
      const barBox = await bar.boundingBox()
      expect(inputBox.height, 'the field is shorter than a 44px touch target').toBeGreaterThanOrEqual(44)
      expect(barBox.height - inputBox.height, 'the bar has empty padding around the field that a tap would miss').toBeLessThanOrEqual(12)
      // A tap on the bar's own top edge, outside the old 21px field, reaches the field.
      await page.touchscreen.tap(inputBox.x + inputBox.width / 2, barBox.y + 4)
      await expect(input).toBeFocused()
    })
  })
}

test.describe('the hero search field at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('is at least 44px tall and fills its bar', async ({ page }) => {
    watch(page, 'a desktop visitor looking at the hero search')
    await go(page, '/')
    const input = page.locator('.hh-search input.hcmd-input')
    const bar = page.locator('.hh-search .hcmd-bar')
    await expect(input).toBeVisible()
    const inputBox = await input.boundingBox()
    const barBox = await bar.boundingBox()
    expect(inputBox.height).toBeGreaterThanOrEqual(44)
    expect(barBox.height - inputBox.height).toBeLessThanOrEqual(12)
  })
})
