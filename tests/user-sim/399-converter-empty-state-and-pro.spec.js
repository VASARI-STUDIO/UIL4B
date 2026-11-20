// THE FILE CONVERTER'S EMPTY STATE, ITS PRO CONTROLS, AND THE WAY THROUGH.
//
// Three promises:
//   1. Before a file arrives the page is a purposeful drop zone: it names what it opens and what
//      it saves as, has a real "Choose a file" button, lights up when a file is dragged over it,
//      and can run a sample.
//   2. A Free account sees the advanced output rows marked Pro, and using one opens the upgrade
//      prompt (gate id converter-background) with a way to /plans. Nothing is applied.
//   3. A Pro account gets real controls: a background fill the encoder paints, and a filename
//      pattern the saved file follows (here with the width and height an exact size set).
//
// HOW TO SEE EACH FAIL:
//   DropZone.jsx: drop the `hero` branch                          -> test 1 (no .fc-drop--hero)
//   DropZone.jsx: setHover(true) removed from onDragOver          -> test 1, drag-over state
//   FileConverter.jsx: askPro stops calling openProModal          -> test 2
//   FileConverter.jsx: proFill = fillOn (ignores isPro)           -> a Free output would be filled
//   FileConverter.jsx: drop proFill from the encoder background   -> test 3 (no fill switch effect)
//   FileConverter.jsx: baseNameFor ignores the pattern            -> test 3 (file name)
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const ROUTE = '/create/file-converter'
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const upload = (page, name = 'dot.png') =>
  page.locator('.fc-drop input[type="file"]').setInputFiles({ name, mimeType: 'image/png', buffer: ONE_PIXEL_PNG })

test.describe('the empty state', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('names its formats, offers a Choose a file button, lights up on drag, and runs a sample', async ({ page }) => {
    watch(page, 'someone arriving at the File Converter with nothing yet')
    await go(page, ROUTE)
    const zone = page.locator('.fc-drop--hero')
    await expect(zone).toBeVisible()
    await expect(zone.getByRole('button', { name: 'Choose a file', exact: true })).toBeVisible()
    for (const f of ['PNG', 'JPEG', 'WebP', 'GIF', 'SVG', 'BMP', 'AVIF', 'ICO']) {
      await expect(zone.locator('.fc-drop-formats').first().locator('.fc-chip', { hasText: new RegExp(`^${f}$`) })).toHaveCount(1)
    }
    expect(await zone.locator('.fc-chip').count()).toBeGreaterThan(8) // what it opens plus what it saves as

    // A file dragged over turns the zone's state on, in words as well as the border.
    await zone.evaluate((el) => {
      const dt = new DataTransfer()
      dt.items.add(new File(['x'], 'x.png', { type: 'image/png' }))
      el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    })
    await expect(zone).toHaveClass(/fc-drop--over/)
    await expect(zone.locator('.fc-drop-hint')).toHaveText('Drop to convert')

    // The sample goes through the same path as a chosen file: it queues, converts and downloads.
    await zone.getByRole('button', { name: 'Try a sample', exact: true }).click()
    await expect(page.locator('.fc-card')).toHaveCount(1)
    await expect(page.locator('.fc-route')).toContainText('PNG')
    await page.getByRole('button', { name: /^Convert 1 image/ }).click()
    await expect(page.getByRole('button', { name: /^Download/ }).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.fc-status')).toContainText('Converted')
  })
})

test.describe('Free sees the Pro rows and gets the prompt', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('using Background fill opens the upgrade prompt and applies nothing', async ({ page }) => {
    watch(page, 'someone without Pro reaching for a background fill')
    await signIn(page, { plan: 'free' })
    await go(page, ROUTE)
    await upload(page)
    const row = page.getByRole('button', { name: /Background fill/ })
    await expect(row).toBeVisible()
    await expect(row).toContainText('Pro')
    await row.click()
    const dialog = page.locator('[role="dialog"][data-gate="converter-background"]')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('a[href="/plans"]').first(), 'the way to /plans is in the prompt').toBeAttached()
    // No number field was added for a Free account: the control is the prompt.
    await expect(page.locator('#fc-adv-fill')).toHaveCount(0)
  })
})

test.describe('Pro gets real controls', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a background fill switch appears and a pattern names the download', async ({ page }) => {
    watch(page, 'a Pro account converting one image with a filename pattern')
    await signIn(page, { plan: 'pro' })
    await go(page, ROUTE)
    await upload(page)
    // The still editor's free exact size sets the width; the Pro pattern then reads it.
    const exact = page.locator('#fc-img-out-w')
    await expect(exact).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('#fc-adv-fill')).toBeVisible()
    await exact.fill('200')
    await exact.press('Enter')
    await expect(page.locator('.fc-outsize')).toContainText('200×200')
    await page.locator('#fc-adv-name').fill('{name}-{width}x{height}')
    await expect(page.locator('.fc-adv-saves')).toContainText('dot-200x200.webp')
    await page.getByRole('button', { name: /^Convert 1 image/ }).click()
    const dl = page.getByRole('button', { name: 'Download WebP' })
    await expect(dl).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.fc-card .fc-meta').first()).toContainText('200×200')
    const [download] = await Promise.all([page.waitForEvent('download'), dl.click()])
    expect(download.suggestedFilename()).toBe('dot-200x200.webp')
  })
})
