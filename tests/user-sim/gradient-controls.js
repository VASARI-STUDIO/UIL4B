// Open the same toolbar controls a designer uses before exercising the advanced settings.
export async function openRandomSettings(page) {
  if (await page.locator('.grd-tune-tray').isVisible()) return
  const action = page.getByRole('button', { name: 'Random settings', exact: true })
  if (!await action.isVisible()) await page.locator('[data-tl-more] button').first().click()
  await action.click()
}

export async function openGeometry(page) {
  const disclosure = page.getByRole('button', { name: 'Angle and interpolation' })
  if (await disclosure.isVisible() && await disclosure.getAttribute('aria-expanded') === 'false') await disclosure.click()
}
