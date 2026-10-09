// A live Create tool is counted once when it is opened, and once more when
// something is first done in it. The two figures are kept apart: arriving is
// traffic, a pointer or key press inside the tool is use.
//
// Read from the design-analytics blob the trackers write in this browser, so it
// sees the counts the page itself produced.
import { test, expect } from './base.js'
import { go } from './helpers.js'

const counts = (page) => page.evaluate(() => {
  const blob = JSON.parse(localStorage.getItem('vs-design-analytics') || '{}')
  return { opens: blob.toolOpens || {}, used: blob.toolUsage || {} }
})

test('opening a tool counts one open and no use; the first press counts one use', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await go(page, '/create/gradient')
  await expect.poll(async () => (await counts(page)).opens.gradient).toBe(1)
  expect((await counts(page)).used.gradient, 'arriving is not using').toBeUndefined()

  const copy = page.locator('[data-tool-toolbar] .tl-primary button')
  await expect(copy).toBeVisible()
  await copy.click()
  await expect.poll(async () => (await counts(page)).used.gradient).toBe(1)

  await copy.click()
  await page.waitForTimeout(300)
  const after = await counts(page)
  expect(after.used.gradient, 'one use per open, not per press').toBe(1)
  expect(after.opens.gradient, 'pressing inside is not another open').toBe(1)
})

test('opening the same tool again is a second open', async ({ page }) => {
  await go(page, '/create/gradient')
  await expect.poll(async () => (await counts(page)).opens.gradient).toBe(1)
  await go(page, '/create/gradient')
  await expect.poll(async () => (await counts(page)).opens.gradient).toBe(2)
})
