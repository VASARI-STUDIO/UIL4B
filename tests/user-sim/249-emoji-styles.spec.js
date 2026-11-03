// THE EMOJI DIALOG'S STYLES ROW: THIS DEVICE FOR EVERYONE, FOUR ART SETS ON PRO.
//
// Free and signed-out viewers see "Your device" and one locked tile that names the four sets and links to
// /plans; no set is requested for them. A Pro viewer sees a tile per set (Noto Emoji, Twemoji, Fluent Emoji,
// OpenMoji) drawn from the Iconify fixture, a set with no icon for this emoji gets no tile, and choosing a
// skin tone swaps every tile's image. The row never wraps and every tile keeps its box.
//
// Each icon is given its own drawing by answerIconifyBatches, so the tone test compares real images,
// and a "missing" set answers not_found exactly as the live API does. Run at 1440 and 390, light and dark.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   EmojiStyles.jsx the canSeePack gate removed (visible = all sets)  -> "free: ... no set is requested"
//   EmojiStyles.jsx the locked tile's to="/plans" -> "/pricing"        -> "free: the locked tile links to /plans"
//   EmojiStyles.jsx a missing set still renders its <li>              -> "a set with no icon hides its tile"
//   EmojiStyles.jsx key drops toneId                                  -> "the tone changes the tile images"
//   utils/emojiStyleNames.js Fluent toneSuffix '' -> '-skin-tone'     -> "Fluent's toned name" (not_found, no tile)
//   styles .emd-styles-row flex-wrap:nowrap -> wrap                   -> "the row never wraps"
//   styles .emd-style-art width/height changes when .is-loading       -> "no layout shift while loading"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { answerIconifyBatches } from './iconify-stub.js'

const ROUTE = '/create/emoji'
const SEARCH = 'input[type="search"]'
const DIALOG = '.emd-panel'
const SHOTS = '.claude/scratch/emojistyle1'
const SETS = ['Noto Emoji', 'Twemoji', 'Fluent Emoji', 'OpenMoji']

const VIEWS = [
  { name: 'desktop', width: 1440, height: 900, ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'phone', width: 390, height: 844, ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

/** Search for the waving hand, open its dialog. */
async function openWave(page) {
  const field = page.locator(SEARCH)
  await field.click()
  await field.fill('waving hand')
  const cell = page.locator('.emoji-cell[title^="Details for \u{1F44B}"]')
  await expect(cell).toHaveCount(1, { timeout: 15_000 })
  await cell.click()
  const dialog = page.locator(DIALOG)
  await expect(dialog).toBeVisible()
  return dialog
}

/** The dialog's open animation has finished, so a screenshot shows it at rest and not half faded in. */
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))

/** The icon's name is in its drawing, so a tile's src says which icon it came from. */
const drawing = (prefix, name) => `<title>${prefix}/${name}</title><circle cx="12" cy="12" r="8"/>`

for (const view of VIEWS) {
  for (const scheme of ['light', 'dark']) {
    test.describe(`${view.name} ${view.width} · ${scheme}`, () => {
      test.use({ colorScheme: scheme, ...view.ctx })

      test('free: the locked tile links to /plans, names the sets, and no set is requested', async ({ page }) => {
        watch(page, 'a free visitor looking at emoji styles')
        const seen = await answerIconifyBatches(page, drawing)
        await go(page, ROUTE)
        const dialog = await openWave(page)
        const row = dialog.locator('.emd-styles-row')
        await expect(row.getByText('Your device')).toBeVisible()
        const lock = dialog.getByRole('link', { name: /More styles on Pro/ })
        await expect(lock, 'free viewers get the locked tile').toBeVisible()
        await expect(lock).toHaveAttribute('href', '/plans')
        for (const label of SETS) await expect(lock).toContainText(label)
        expect(await dialog.locator('.emd-style-img').count(), 'no art is drawn for a free viewer').toBe(0)
        expect(seen.filter(s => ['noto', 'twemoji', 'fluent-emoji', 'openmoji'].includes(s.prefix)), 'a locked set is never requested').toEqual([])
        const box = await lock.boundingBox()
        expect(box.height, 'the locked tile is a touch target').toBeGreaterThanOrEqual(44)
        // Free viewers have nothing to scroll to: the lock must sit wholly inside the row, with its list of sets readable.
        const fit = await row.evaluate((r) => {
          const l = r.querySelector('.emd-lock').getBoundingClientRect()
          const rr = r.getBoundingClientRect()
          return { over: l.right - rr.right, scrollable: r.scrollWidth - r.clientWidth }
        })
        expect(fit.over, 'the locked tile is not cut off by the edge of the row').toBeLessThanOrEqual(0.5)
        expect(fit.scrollable, 'a free row has nothing to scroll sideways to').toBeLessThanOrEqual(1)
        await settled(page)
        await page.screenshot({ path: `${SHOTS}/free-${view.width}-${scheme}.png` })
      })

      test('Pro: four set tiles render beside Your device, in one line', async ({ page }) => {
        watch(page, 'a Pro member looking at emoji styles')
        await answerIconifyBatches(page, drawing)
        await signIn(page, { plan: 'pro' })
        await go(page, ROUTE)
        const dialog = await openWave(page)
        const tiles = dialog.locator('.emd-style-img')
        await expect(tiles).toHaveCount(4)
        for (const label of SETS) await expect(dialog.locator('.emd-style-label', { hasText: label })).toBeVisible()
        await expect(dialog.getByRole('link', { name: /More styles on Pro/ })).toHaveCount(0)
        await expect(dialog.locator('.emd-styles-credit')).toContainText('Twemoji')
        // One row: every tile shares a top edge, and no tile is under 44px.
        const tops = await dialog.locator('.emd-style').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)))
        expect(new Set(tops).size, 'the row never wraps').toBe(1)
        const sizes = await dialog.locator('.emd-style-art').evaluateAll(els => els.map(e => e.getBoundingClientRect().width))
        for (const w of sizes) expect(w).toBeGreaterThanOrEqual(44)
        // Every tile is in view without a sideways scroll, so the credit line
        // never names a style the reader cannot see.
        const fit = await dialog.locator('.emd-styles-row').evaluate((row) => {
          const box = row.getBoundingClientRect()
          return {
            scrolls: row.scrollWidth > row.clientWidth + 1,
            outside: [...row.children].filter((tile) => {
              const r = tile.getBoundingClientRect()
              return r.left < box.left - 1 || r.right > box.right + 1
            }).length,
          }
        })
        expect(fit, 'all five tiles fit the row').toEqual({ scrolls: false, outside: 0 })
        await settled(page)
        await page.screenshot({ path: `${SHOTS}/pro-${view.width}-${scheme}.png` })
      })

      test('Pro: a set with no icon for this emoji hides its tile', async ({ page }) => {
        watch(page, 'a Pro member opening an emoji one set does not draw')
        await answerIconifyBatches(page, (prefix, name) => (prefix === 'twemoji' ? null : drawing(prefix, name)))
        await signIn(page, { plan: 'pro' })
        await go(page, ROUTE)
        const dialog = await openWave(page)
        await expect(dialog.locator('.emd-style-img')).toHaveCount(3)
        await expect(dialog.locator('.emd-style-label', { hasText: 'Twemoji' })).toHaveCount(0)
        await expect(dialog.locator('.emd-style-label', { hasText: 'Noto Emoji' })).toBeVisible()
      })

      test("the tone changes the tile images, and Fluent's toned name has no -skin-tone", async ({ page }) => {
        watch(page, 'a Pro member trying skin tones on emoji styles')
        await answerIconifyBatches(page, drawing)
        await signIn(page, { plan: 'pro' })
        await go(page, ROUTE)
        const dialog = await openWave(page)
        const srcs = () => dialog.locator('.emd-style-img').evaluateAll(els => els.map(e => decodeURIComponent(e.getAttribute('src'))))
        await expect(dialog.locator('.emd-style-img')).toHaveCount(4)
        const before = await srcs()
        expect(before.join('|')).toContain('noto/waving-hand<')
        await dialog.getByRole('button', { name: 'Medium-dark skin tone' }).click()
        await expect.poll(async () => (await srcs()).join('|')).toContain('noto/waving-hand-medium-dark-skin-tone')
        await expect(dialog.locator('.emd-style-img')).toHaveCount(4)
        const after = (await srcs()).join('|')
        expect(after).toContain('twemoji/waving-hand-medium-dark-skin-tone')
        expect(after).toContain('openmoji/waving-hand-medium-dark-skin-tone')
        expect(after, "Fluent's toned name has no -skin-tone").toContain('fluent-emoji/waving-hand-medium-dark<')
        expect(after).not.toBe(before.join('|'))
      })

      test('the row keeps its height while loading', async ({ page }) => {
        watch(page, 'a Pro member opening the dialog while styles load')
        await signIn(page, { plan: 'pro' })
        let release
        const gate = new Promise(r => { release = r })
        await page.route(u => u.pathname.endsWith('.json') && u.searchParams.has('icons'), async (route) => {
          await gate
          await route.fallback()
        })
        await go(page, ROUTE)
        const dialog = await openWave(page)
        const row = dialog.locator('.emd-styles-row')
        await expect(dialog.locator('.emd-style-art.is-loading').first()).toBeVisible()
        const loadingH = (await row.boundingBox()).height
        release()
        await expect(dialog.locator('.emd-style-img')).toHaveCount(4)
        const doneH = (await row.boundingBox()).height
        // The row is 97.59px tall (fractional line-height); the engine rounds layout to 1/64 px, so two reads
        // can differ by a hair. Under half a pixel is the same height; a real shift is a whole pixel or more.
        expect(Math.abs(doneH - loadingH), `no layout shift when the art arrives (${loadingH} -> ${doneH})`).toBeLessThan(0.5)
      })
    })
  }
}
