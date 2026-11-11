// LEARN, DISCOVER AND EMOJI LIBRARY: FIVE BEHAVIOURS THAT USED TO BREAK.
//
//   MARKER    On every guide the lit contents link is the first on a fresh load,
//             the last after End and the first again after Home.
//   LANDING   Every contents link puts its heading between 88 and 140px from the
//             top, measured 500ms after the click, at 1440 (rail) and 390
//             (disclosure). The tween for in-page links is a fixed 0.45s.
//   TABLES    From 1024 up no table in any guide scrolls sideways.
//   DISCOVER  Every card in view is visible within a second, reduced motion on or off.
//   EMOJI     When the browser cannot decode a sheet the emoji show as text, not blank tiles.
//   FOCUS     Under forced colours a focused search box has a real outline.
//
// ── MUTATIONS ───────────────────────────────────────────────────────────────
// LANDING   change `anchors: { duration: 0.45 }` in src/hooks/useSmoothScroll.js back to
//           `anchors: true`: the long jumps are still moving at 500ms and go red.
// TABLES    remove `lart-table--fit` from LearnParts.jsx's DataTable, or the padding rule
//           under it in learn-article.css: colour-spaces and brand-colour go red at 1024+.
// EMOJI     delete the atlasProbe(sheet) call in src/components/library/emojiAtlas.js: the
//           cells keep `has-bitmap` with nothing painted and the EMOJI test goes red.
// FOCUS     delete the `@media (forced-colors:active)` block under `.lbry-search` in
//           global.css: the outline is `none` and the FOCUS tests go red.
// MARKER / DISCOVER are guarded by 208 and 123 as well; they are repeated here so this one
//           file shows every fix from the same card set.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }
const RAIL_FROM = 1080

// The smooth scroll keeps moving after the marker first changes; a key pressed
// before it stops can be absorbed by the tween still running.
async function settled(page) {
  let last = null
  await expect.poll(async () => {
    const y = await page.evaluate(() => Math.round(window.scrollY))
    const still = y === last
    last = y
    return still
  }, { message: 'the scroll comes to rest', timeout: 10_000, intervals: [200] }).toBe(true)
}

// End scrolls to the bottom the page has at that instant. On a slow runner the guide
// is still reflowing after domcontentloaded (the font-loading guide grows by about
// 2000px when its text swaps font), so a key pressed early lands at an old bottom,
// the page then grows under it, and the marker rightly stays on an earlier section.
// Wait for the fonts and for the page height to hold still before pressing it.
async function layoutSettled(page) {
  await page.evaluate(() => document.fonts.ready)
  let last = -1
  let held = 0
  await expect.poll(async () => {
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    held = h === last ? held + 1 : 0
    last = h
    return held >= 5
  }, { message: 'the page height holds still', timeout: 15_000, intervals: [200] }).toBe(true)
}

const litIds = (page) => page.evaluate(() => [...document.querySelectorAll('.lart-toc a[data-active]')]
  .map((a) => a.getAttribute('href').slice(1)))

test.describe('the contents marker', () => {
  for (const article of LEARN_ARTICLES) {
    test(`${article.slug}: first on load, last after End, first after Home`, async ({ page }) => {
      watch(page, `reader of ${article.slug}`)
      await page.setViewportSize(DESKTOP)
      await go(page, `/learn/${article.slug}`)
      const ids = article.sections.map((s) => s.id)
      expect(await litIds(page), 'fresh load').toEqual([ids[0]])
      await layoutSettled(page)
      // On a loaded runner the smooth scroll can take several seconds to land.
      await page.keyboard.press('End')
      await expect.poll(() => litIds(page), { message: 'after End', timeout: 10_000 }).toEqual([ids.at(-1)])
      await settled(page)
      await page.keyboard.press('Home')
      await expect.poll(() => litIds(page), { message: 'after Home', timeout: 10_000 }).toEqual([ids[0]])
    })
  }
})

test.describe('contents links land their heading at one height', () => {
  for (const article of LEARN_ARTICLES) {
    for (const vp of [DESKTOP, PHONE]) {
      test(`${article.slug} at ${vp.width}: every link lands its heading 88-140px down after 500ms`, async ({ page }) => {
        test.setTimeout(90_000)
        watch(page, `reader of ${article.slug}`)
        await page.setViewportSize(vp)
        await go(page, `/learn/${article.slug}`)
        const rail = vp.width >= RAIL_FROM
        for (const { id, title } of article.sections.slice(1)) {
          if (!rail) {
            await page.evaluate(() => { document.querySelector('details.lart-toc-m').open = true })
          }
          await page.locator(`${rail ? '.lart-toc' : 'details.lart-toc-m'} a[href="#${id}"]`).click()
          await page.waitForTimeout(500)
          const top = await page.evaluate((sid) => document.querySelector(`#${sid} h2`).getBoundingClientRect().top, id)
          expect(top, `${vp.width} #${id} ("${title}") landed ${Math.round(top)}px from the top`).toBeGreaterThanOrEqual(87)
          expect(top, `${vp.width} #${id} ("${title}") landed ${Math.round(top)}px from the top`).toBeLessThanOrEqual(140)
        }
      })
    }
  }
})

test.describe('no guide table scrolls sideways from 1024 up', () => {
  for (const width of [1024, 1280, 1440]) {
    for (const article of LEARN_ARTICLES) {
      test(`${article.slug} at ${width}`, async ({ page }) => {
        watch(page, `reader of ${article.slug}`)
        await page.setViewportSize({ width, height: 900 })
        await go(page, `/learn/${article.slug}`)
        const over = await page.evaluate(() => [...document.querySelectorAll('.lart-table-scroll')]
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => `${el.getAttribute('aria-label') || el.className}: ${el.scrollWidth} > ${el.clientWidth}`))
        expect(over, 'tables that hide a column behind a sideways scroll').toEqual([])
      })
    }
  }
})

test.describe('the Discover cards', () => {
  for (const motion of ['no-preference', 'reduce']) {
    for (const height of [900, 1100]) {
      test(`every card in view is visible within a second at 1440x${height}, motion ${motion}`, async ({ page }) => {
        watch(page, 'a visitor opening Discover')
        await page.emulateMedia({ reducedMotion: motion })
        await page.setViewportSize({ width: 1440, height })
        await go(page, '/discover')
        await expect(page.locator('.surface-card').first()).toBeAttached()
        await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.surface-card')]
          .filter((c) => { const r = c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && Number(getComputedStyle(c).opacity) < 1 })
          .length), { message: 'a card on screen is still invisible', timeout: 1000 }).toBe(0)
      })
    }
  }
})

test('emoji whose sheet will not decode show as text, not blank tiles', async ({ page }) => {
  watch(page, 'a visitor on a browser that cannot decode the emoji sheets')
  // Every sheet the atlas hands to an <img> is a blob: URL; refuse to decode those.
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = function refuse() {
      return this.src.startsWith('blob:') ? Promise.reject(new DOMException('refused', 'EncodingError')) : decode.call(this)
    }
  })
  await page.setViewportSize(DESKTOP)
  await go(page, '/create/emoji')
  await expect(page.locator('.emoji-cell').first()).toBeAttached()
  await expect.poll(() => page.locator('.emoji-cell.has-bitmap').count(), {
    message: 'cells still hide their text behind a bitmap that never painted',
    timeout: 8000,
  }).toBe(0)
  const first = page.locator('.emoji-cell .emoji-char').first()
  await expect(first, 'the first emoji shows as text').toBeVisible()
  expect((await first.textContent()).trim().length).toBeGreaterThan(0)
})

test.describe('search boxes under forced colours', () => {
  for (const [path, label] of [['/learn', 'Learn'], ['/create/emoji', 'the emoji library'], ['/discover/palettes', 'the palette library']]) {
    test(`${label}: a focused search box has an outline`, async ({ page }) => {
      watch(page, 'a high-contrast reader')
      await page.emulateMedia({ forcedColors: 'active' })
      await page.setViewportSize(DESKTOP)
      await go(page, path)
      const input = page.locator('.lbry-search input').first()
      await input.focus()
      const ring = await input.evaluate((el) => {
        const s = getComputedStyle(el.closest('.lbry-search'))
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }
      })
      expect(ring.style, 'no outline on the focused search box').not.toBe('none')
      expect(ring.width).toBeGreaterThanOrEqual(2)
    })
  }
})
