// The Video tab's controls sit in rail groups (Clip, Crop, Turn, Time, Size),
// one open at a time. A spec that wants a control opens its group first.
//
// On a phone the row holds four groups and a "More" button; the groups behind
// it open from a sheet. This helper finds the group wherever the page put it.

const named = (name) => new RegExp(`^${name}\\b`)

/** Open a rail group by its name ('Clip', 'Crop', 'Turn', 'Time', 'Size'). */
export async function openGroup(page, name) {
  await page.getByRole('tablist', { name: 'Edit tools' }).waitFor()
  const tab = page.getByRole('tab', { name: named(name) })
  if (await tab.count()) {
    await tab.first().waitFor({ state: 'visible' })
    if ((await tab.first().getAttribute('aria-selected')) !== 'true') await tab.first().click()
    return
  }
  await page.locator('.fc-rail-more').click()
  await page.getByRole('dialog', { name: 'More tools' }).getByRole('button', { name: named(name) }).click()
}
