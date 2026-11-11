// /CREDITS AND /LEARN/HELP: SOFT FIXES THAT LIFT BOTH TO 8 AT EVERY WIDTH.
//
// Credits: a row stretched to a taller neighbour keeps its lines at the top, and a long
// licence name wraps instead of squeezing the author column. Help: on the phone and
// tablet accordion a closed row shows its arrow, since there is no hover to reveal it.
//
// MUTATIONS (each one turns a test below red):
//   .crd-row loses align-content: start     -> "keep their lines together"
//   .crd-row-side loses its max-width        -> "keep their lines together"
//   .hlr-chev leaves its svg unturned when a row opens -> "closed rows show their arrow"
//   .hlr-grid is not capped at 768             -> "the arrow stays near its label"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

test.describe('credits at 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('rows keep their lines together and the licence link wraps', async ({ page }) => {
    watch(page, 'a developer checking licences on a tablet')
    await go(page, '/credits')
    const row = page.locator('.crd-row').first()
    await expect(row).toBeAttached()
    expect(await row.evaluate((el) => getComputedStyle(el).alignContent)).toBe('start')
    const side = page.locator('.crd-row-side').first()
    if (await side.count()) {
      expect(parseFloat(await side.evaluate((el) => getComputedStyle(el).maxWidth))).toBeLessThanOrEqual(11 * 16)
    }
  })
})

for (const [width, touch] of [[390, true], [768, false]]) {
  test.describe(`help at ${width}`, () => {
    test.use(touch ? { viewport: { width, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width, height: 1024 } })

    test('closed rows show their arrow, and it turns once a row is open', async ({ page }) => {
      watch(page, `someone looking for help at ${width}px`)
      await go(page, '/learn/help')
      // The first row may open by itself; a closed one is what a thumb has to find.
      const job = page.locator('.hlr-job[aria-expanded="false"]').first()
      await expect(job).toBeVisible()
      await expect(job.locator('.hlr-chev svg')).toBeVisible()
      const name = (await job.textContent()).trim()
      await job.click()
      const opened = page.locator('.hlr-job', { hasText: name }).first()
      await expect(opened).toHaveAttribute('aria-expanded', 'true')
      await expect.poll(() => opened.locator('.hlr-chev svg').evaluate((el) => getComputedStyle(el).transform)).not.toBe('none')
    })
  })
}

test.describe('help at 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('the arrow stays near its label', async ({ page }) => {
    watch(page, 'someone looking for help on a tablet')
    await go(page, '/learn/help')
    const grid = page.locator('.hlr-grid').first()
    await expect(grid).toBeVisible()
    expect((await grid.boundingBox()).width).toBeLessThanOrEqual(640)
  })
})
