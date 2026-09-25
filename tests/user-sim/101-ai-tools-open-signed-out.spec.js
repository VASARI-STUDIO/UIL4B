// THE TWO AI TOOLS OPEN WITHOUT AN ACCOUNT; GENERATE IS WHERE ONE IS ASKED FOR.
//
// Alt Text and the Brand Starter used to wrap the whole tool in <AuthGate>, so
// a signed-out visitor met a lock and two buttons instead of the tool. Now the
// tool renders signed out and works up to the step that spends an allowance:
// pressing Generate opens the sign-in dialog, and no request reaches /api/ai
// until there is an account to meter it against.
//
// MUTATION: wrap either page's tool back in <AuthGate …> — the dropzone / the
// brief field is gone and the "usable up to Generate" half fails. Drop the
// ensureAccount call from generateAll / generate — the dialog never opens and
// a request reaches the stubbed /api/ai, which the second half fails on.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const BRIEF = 'A booking app for independent dog groomers. Calm and practical, readable all day.'

/** A 320x200 PNG made in the page: a real image the tool has to decode. */
async function pngBytes(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200
    const x = c.getContext('2d'); x.fillStyle = '#1c40f2'; x.fillRect(0, 0, 320, 200)
    return c.toDataURL('image/png').split(',')[1]
  })
  return Buffer.from(b64, 'base64')
}

/** Every /api/ai request the page makes, answered with a refusal so none can succeed. */
async function countAi(page) {
  const calls = []
  await page.route('**/api/ai', (route) => {
    calls.push(route.request().url())
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"no session"}' })
  })
  return calls
}

for (const width of [390, 1440]) {
  test(`${width}px · Alt Text: signed out, the tool works up to Generate, and Generate asks for an account`, async ({ page }) => {
    watch(page, `a signed-out visitor trying Alt Text on a ${width}px screen`)
    await page.setViewportSize({ width, height: 844 })
    const calls = await countAi(page)
    await go(page, '/create/alt-text')

    await expect(page.getByRole('heading', { level: 1, name: 'Alt Text Generator' })).toBeAttached()
    await expect(page.locator('.auth-gate-prompt')).toHaveCount(0)
    const zone = page.locator('.alt-dropzone')
    await expect(zone).toBeVisible()
    await page.locator('.alt-dropzone input[type="file"]')
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: await pngBytes(page) })
    await expect(page.locator('.alt-card-ready')).toHaveCount(1, { timeout: 10000 })
    // The settings are usable signed out too.
    await page.getByRole('button', { name: 'Detailed', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Detailed', exact: true })).toHaveAttribute('aria-pressed', 'true')

    const generate = page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Generate/ })
    await expect(generate).toBeEnabled()
    await generate.click()
    await expect(page.locator('.ui-login'), 'Generate did not ask for an account').toBeVisible()
    expect(calls, 'a signed-out Generate reached /api/ai').toEqual([])

    // Dismissing the dialog leaves the work where it was.
    await page.locator('.ui-login-x').click()
    await expect(page.locator('.ui-login')).toHaveCount(0)
    await expect(page.locator('.alt-card')).toHaveCount(1)
    expect(calls).toEqual([])
  })

  test(`${width}px · Brand Starter: signed out, the brief is written and Generate asks for an account`, async ({ page }) => {
    watch(page, `a signed-out visitor trying the Brand Starter on a ${width}px screen`)
    await page.setViewportSize({ width, height: 844 })
    const calls = await countAi(page)
    await go(page, '/create/auto-builder')

    await expect(page.getByRole('heading', { level: 1, name: 'Brand Starter' })).toBeAttached()
    await expect(page.locator('.auth-gate-prompt')).toHaveCount(0)
    const generate = page.getByTestId('brand-starter-generate')
    await expect(generate).toBeDisabled()
    await page.locator('#bs-brief').fill(BRIEF)
    await expect(generate).toBeEnabled()
    await generate.click()
    await expect(page.locator('.ui-login'), 'Generate did not ask for an account').toBeVisible()
    expect(calls, 'a signed-out Generate reached /api/ai').toEqual([])

    await page.locator('.ui-login-x').click()
    await expect(page.locator('.ui-login')).toHaveCount(0)
    await expect(page.locator('#bs-brief'), 'dismissing the dialog lost the brief').toHaveValue(BRIEF)
    await expect(page.getByTestId('brand-starter-error')).toHaveCount(0)
    expect(calls).toEqual([])
  })
}
