// On dark, Logo.dev brands that Logo.dev only serves on a white app-icon square
// show the transparent SVG Logos mark, so the grid has no white boxes for them.
// Brands whose only mark is dark keep their plate. Light theme is unchanged.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'

const SQUARE = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path fill="#ffffff" d="M0 0h28v28H0z"/></svg>'

async function choosePack(page, pack) {
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  // The pack menu sits on the toolbar when it fits; otherwise it is in the Filters panel.
  const inPanel = !(await page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }).isVisible()) && await filters.isVisible()
  const panel = sheet.or(page.getByRole('group', { name: 'Filters', exact: true }))
  if (inPanel) {
    await filters.click()
    await expect(panel).toBeVisible()
  }
  await chooseMenuOption(page, (inPanel ? panel : page.locator('.ig-toolbar')).getByRole('button', { name: 'Icon pack' }), pack)
  if (await sheet.isVisible()) {
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toBeHidden()
  } else if (inPanel) {
    await filters.click()
    await expect(panel).toBeHidden()
  }
}

async function openLogoDev(page) {
  await signIn(page, { plan: 'pro' })
  await page.route('https://img.logo.dev/**', (route) => route.fulfill({
    contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' }, body: SQUARE,
  }))
  // The SVG Logos mark is answered by the shared Iconify stub (iconify-stub.js).
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  await choosePack(page, 'logodev')
  await expect(page.locator('.ig .ic img.ig-logo').first()).toBeVisible({ timeout: 20_000 })
}

const tile = (page, name) => page.locator(`.ig .ic img.ig-logo[alt="${name}"]`).first()

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`dark at ${width}px: plated brands show their transparent mark, dark-only marks keep the plate`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height } })
    try {
      const page = await ctx.newPage()
      watch(page, `a Pro designer browsing brand logos in dark (${width}px)`)
      await openLogoDev(page)
      for (const name of ['Microsoft', 'YouTube']) {
        // The mark arrives in one batch and replaces the plate in place.
        const mark = page.locator(`.ig .ic [data-mark-source="svg-logos"] img.ig-logo[alt="${name}"]`)
        await expect(mark).toHaveAttribute('src', /^data:image\/svg\+xml/, { timeout: 20_000 })
      }
      // POSITIVE CONTROL: a brand outside the swap still comes from Logo.dev.
      await expect(tile(page, 'Google')).toHaveAttribute('src', /img\.logo\.dev/)
      const paypal = tile(page, 'PayPal')
      await paypal.scrollIntoViewIfNeeded()
      await expect(paypal).toHaveAttribute('src', /img\.logo\.dev/)
      await page.screenshot({ path: test.info().outputPath(`logo-dark-${width}.png`) })
    } finally { await ctx.close() }
  })
}

test('light theme keeps every tile on Logo.dev', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 900 } })
  try {
    const page = await ctx.newPage()
    watch(page, 'a Pro designer browsing brand logos in light')
    await openLogoDev(page)
    const img = tile(page, 'Microsoft')
    await img.scrollIntoViewIfNeeded()
    await expect(img).toHaveAttribute('src', /img\.logo\.dev/)
  } finally { await ctx.close() }
})
