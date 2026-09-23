// THE SKIP LINK PAINTS NOTHING UNTIL IT IS FOCUSED.
//
// Every screenshot of every page carried a faint grey smudge along the top
// edge, x 16-160 and y 0-5. It was `.skip-link`'s drop shadow: at rest the box
// is translated to 8px ABOVE the viewport, and a 24px blur reaches further
// than 8px, so the shadow of an invisible link was painted onto the page. The
// shadow now belongs to the focused state only.
//
// Measured, not reasoned: the strip is screenshotted as the page renders it,
// then again with the skip link removed from layout. Any difference is paint
// the skip link is responsible for. Seen failing on the unfixed build in both
// themes on all three routes this was tried on.
import { test, expect } from './base.js'
import { go } from './helpers.js'

for (const theme of ['light', 'dark']) {
  test(`an unfocused skip link leaves the top of the page untouched (${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: theme, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await go(page, '/privacy')
    const link = page.locator('.skip-link')
    // POSITIVE CONTROL: the thing under test is mounted, and at rest.
    await expect(link).toHaveCount(1)
    const box = await link.boundingBox()
    expect(box.y + box.height, 'the resting link sits above the viewport').toBeLessThanOrEqual(0)

    const clip = { x: 0, y: 0, width: 260, height: 14 }
    const withLink = await page.screenshot({ clip })
    await page.addStyleTag({ content: '.skip-link{display:none!important}' })
    const without = await page.screenshot({ clip })
    expect(withLink.equals(without), 'the resting skip link painted pixels onto the page').toBe(true)
    await ctx.close()
  })
}

test('the focused skip link still lifts off the page with its shadow', async ({ page }) => {
  await go(page, '/privacy')
  await page.keyboard.press('Tab')
  const link = page.locator('.skip-link')
  await expect(link).toBeFocused()
  await expect.poll(async () => (await link.boundingBox()).y).toBeGreaterThanOrEqual(0)
  expect(await link.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none')
})
