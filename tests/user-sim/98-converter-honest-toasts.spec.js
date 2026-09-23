// THE CONVERTER'S TOASTS SAY WHAT ACTUALLY HAPPENED.
//
// Two defects, both fixed in src/pages/FileConverter.jsx by #485 and neither
// ever guarded by a test, so either could come back in a refactor and nothing
// would go red:
//
//   1. "Downloaded ZIP with N images" rendered BEHIND the sign-up dialog. The
//      batch download called the account gate without awaiting it and toasted
//      success on the next line. A signed-out visitor was told a file had
//      arrived while the dialog explaining why it had not sat on top of it.
//
//   2. Failure toasts wore the default `success` kind — a green tick on bad
//      news, and, worse for anyone on a screen reader, role="status" /
//      aria-live="polite" instead of role="alert" (Toast.jsx). An error is also
//      held on screen for six seconds (toastDuration.js); a mis-kinded one
//      vanished at the success clock.
//
//   3. The "Heads up: over 50 MB" warnings wore the success kind too — a green
//      tick on a caution. They are `info` now, which Toast.jsx has always
//      styled and nothing had ever used.
//
// Each case below drives the tool to the exact point the toast fires. A case
// that only loaded the page would pass against the broken code too.
import fs from 'node:fs'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'someone converting files before signing up'

// A 1x1 transparent PNG — real bytes the browser decodes.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const png = (name) => ({ name, mimeType: 'image/png', buffer: PNG })
const notMedia = { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') }

async function openTab(page, name) {
  await go(page, '/create/file-converter')
  if (name) await page.getByRole('tab', { name, exact: true }).click()
  await expect(page.locator('.fc-drop').first()).toBeVisible({ timeout: 15000 })
}

/** The toast on screen now, with the two properties that make it an error. */
async function expectErrorToast(page, text) {
  const t = page.locator('.toast.show')
  await expect(t, `no toast appeared for "${text}"`).toContainText(text, { timeout: 15000 })
  await expect(t, `"${text}" is a failure wearing the success kind`).toHaveClass(/toast-error/)
  await expect(t, `"${text}" is not announced as an alert`).toHaveAttribute('role', 'alert')
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
    // POSITIVE CONTROL for the claim check below: the SAME locator, filtered
    // the same way, does find a real success toast — the conversion's own.
    // Without this, a renamed toast class would let the "no Downloaded ZIP
    // toast" check pass against anything.
    const shown = page.locator('.toast.show')
    await expect(shown.filter({ hasText: /converted 2 images/i }), 'the toast probe cannot see a success toast')
      .toHaveCount(1, { timeout: 10000 })
    // Let the "Converted 2 images" success toast clear so it cannot be confused
    // with the one this test is about.
    await expect(shown).toHaveCount(0, { timeout: 10000 })

    await zip.click()
    await expect(page.locator('#ui-login-title'), 'the ZIP left without asking for an account')
      .toBeVisible({ timeout: 10000 })
    // The ZIP is built before the gate is asked, and the toast would follow it
    // within a frame. A second and a half is generous.
    await page.waitForTimeout(1500)
    const claimed = await shown.filter({ hasText: /downloaded zip/i }).count()
    expect(claimed, 'a "Downloaded ZIP" success toast fired while the sign-up dialog was '
      + 'withholding the file. gatedDownload must be awaited and its result checked.').toBe(0)
  })
})

test.describe('failure toasts are errors', () => {
  test('Image: a file that is not an image', async ({ page }) => {
    watch(page, PERSONA)
    await openTab(page)
    await page.locator('.fc-drop input[type="file"]').setInputFiles([notMedia])
    await expectErrorToast(page, 'Please choose PNG')
  })

  test('Video: a file that is not a video', async ({ page }) => {
    watch(page, PERSONA)
    await openTab(page, 'Video')
    await page.locator('.fc-drop input[type="file"]').setInputFiles([notMedia])
    await expectErrorToast(page, 'Please choose a video')
  })

  test('Frames: a file that is not a video', async ({ page }) => {
    watch(page, PERSONA)
    await openTab(page, 'Extract frames')
    await page.locator('.fc-drop input[type="file"]').setInputFiles([notMedia])
    await expectErrorToast(page, 'Please choose a video file')
  })

  test('Video: pressing Convert while offline', async ({ page, context }) => {
    watch(page, PERSONA)
    await openTab(page, 'Video')
    // Any bytes will do: the offline check fires before the engine or the file
    // is touched. The name passes the type filter.
    await page.locator('.fc-drop input[type="file"]')
      .setInputFiles([{ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from('x') }])
    const convert = page.getByRole('button', { name: /^convert to /i })
    await expect(convert).toBeVisible({ timeout: 10000 })
    await context.setOffline(true)
    await convert.click()
    await expectErrorToast(page, 'You appear to be offline')
    await context.setOffline(false)
  })

  test('Video: the engine cannot be fetched', async ({ page }) => {
    // No watch(): the two 503s below are the scenario, and watch() would file
    // the browser's own "Failed to load resource" lines as findings.
    // The CDN answers 503 for both core files, which is what an outage looks
    // like from the page. Nothing is fetched from our own origin either way.
    await page.route((url) => url.href.startsWith('https://cdn.jsdelivr.net/'),
      (route) => route.fulfill({ status: 503, body: '' }))
    await openTab(page, 'Video')
    await page.locator('.fc-drop input[type="file"]')
      .setInputFiles([{ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from('x') }])
    await page.getByRole('button', { name: /^convert to /i }).click()
    await expectErrorToast(page, 'Could not load the converter engine')
  })

  test('Video: an engine that arrives altered is refused, and says so', async ({ page }) => {
    // The real core, with ONE byte flipped in each file. Served with a 200 and
    // the right headers, so the only thing wrong is the bytes — which is what
    // a compromised CDN looks like. The page must refuse to run it.
    const dir = `${process.cwd()}/node_modules/@ffmpeg/core/dist/esm`
    const served = []
    await page.route((url) => url.href.startsWith('https://cdn.jsdelivr.net/'), (route) => {
      const name = route.request().url().split('/').pop()
      served.push(name)
      const body = fs.readFileSync(`${dir}/${name}`)
      body[body.length >> 1] ^= 0x01
      return route.fulfill({
        status: 200,
        headers: { 'content-type': name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', 'access-control-allow-origin': '*' },
        body,
      })
    })
    await openTab(page, 'Video')
    await page.locator('.fc-drop input[type="file"]')
      .setInputFiles([{ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from('x') }])
    await page.getByRole('button', { name: /^convert to /i }).click()
    await expectErrorToast(page, 'did not match its pinned fingerprint')
    // POSITIVE CONTROL: the altered files really were what the page fetched.
    expect(served.sort()).toEqual(['ffmpeg-core.js', 'ffmpeg-core.wasm'])
  })
})

test.describe('a caution is not a success', () => {
  test('Image: a file over 50 MB is queued with an info toast, not a green tick', async ({ page }, info) => {
    watch(page, PERSONA)
    // Written to disk rather than passed as a buffer: Playwright refuses an
    // in-memory file over 50 MB, which is exactly the size that triggers this.
    const big = info.outputPath('large.png')
    fs.writeFileSync(big, Buffer.alloc(51 * 1024 * 1024))
    await openTab(page)
    await page.locator('.fc-drop input[type="file"]').setInputFiles(big)
    const t = page.locator('.toast.show')
    await expect(t).toContainText('Heads up', { timeout: 15000 })
    await expect(t, 'the over-50 MB caution wears the success kind').toHaveClass(/toast-info/)
    // And the file WAS accepted: a caution, not a refusal.
    await expect(page.locator('.fc-card'), 'the large file was not queued').toHaveCount(1)
  })
})
