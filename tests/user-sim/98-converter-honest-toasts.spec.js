// THE CONVERTER'S TOASTS SAY WHAT ACTUALLY HAPPENED.
//
// Fixed in src/pages/FileConverter.jsx by #485 and never guarded by a test,
// so it could come back in a refactor and nothing would go red:
//
//   "Downloaded ZIP with N images" rendered BEHIND the sign-up dialog. The
//   batch download called the account gate without awaiting it and toasted
//   success on the next line. A signed-out visitor was told a file had
//   arrived while the dialog explaining why it had not sat on top of it.
//
// Each case below drives the tool to the exact point the toast fires. A case
// that only loaded the page would pass against the broken code too.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'someone converting files before signing up'

// A 1x1 transparent PNG — real bytes the browser decodes.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const png = (name) => ({ name, mimeType: 'image/png', buffer: PNG })

async function openTab(page, name) {
  await go(page, '/create/file-converter')
  if (name) await page.getByRole('button', { name }).click()
  await expect(page.locator('.fc-drop').first()).toBeVisible({ timeout: 15000 })
}

test.describe('the batch download never claims a file the gate withheld', () => {
  test('two converted images, signed out: the dialog opens and no success toast is behind it', async ({ page }) => {
    watch(page, PERSONA)
    await openTab(page)
    await page.locator('.fc-drop input[type="file"]').setInputFiles([png('one.png'), png('two.png')])
    await page.getByRole('button', { name: /^convert 2 images/i }).click()

    const zip = page.getByRole('button', { name: /download all \(2\) as zip/i })
    // POSITIVE CONTROL: the batch control only exists once both converted.
    await expect(zip, 'the batch download never appeared').toBeVisible({ timeout: 30000 })
    // Let the "Converted 2 images" success toast clear so it cannot be confused
    // with the one this test is about.
    await expect(page.locator('.toast.show')).toHaveCount(0, { timeout: 10000 })

    await zip.click()
    await expect(page.locator('#ui-login-title'), 'the ZIP left without asking for an account')
      .toBeVisible({ timeout: 10000 })
    // The ZIP is built before the gate is asked, and the toast would follow it
    // within a frame. A second and a half is generous.
    await page.waitForTimeout(1500)
    const claimed = await page.locator('.toast.show').filter({ hasText: /downloaded zip/i }).count()
    expect(claimed, 'a "Downloaded ZIP" success toast fired while the sign-up dialog was '
      + 'withholding the file. gatedDownload must be awaited and its result checked.').toBe(0)
  })
})
