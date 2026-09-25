// The CSS and JSON token files, exported from the nav's Export panel.
//
// Signed in, each format downloads a file named for the project whose contents
// hold the palette on the board. Signed out, choosing either one and pressing
// Export raises the same create-account gate as the style guide, and no file is
// produced. The free files carry the "Made with UIL4B" line; the Pro files do
// not, because that line is what Pro removes.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const PRIMARY = '#1F4B8E'
const BOARD = `/create/palette?c=${PRIMARY.slice(1)},2E7BB8,3FA9A0`

async function readDownload(download) {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

/** Load the board with a known palette and wait until the project holds it. */
async function boardWithPalette(page) {
  await go(page, BOARD)
  await expect.poll(() => page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('vs-current-design') || '{}').palette?.colors?.[0] || '' } catch { return '' }
  }), { message: 'the ?c= palette never reached the working design' }).toBe(PRIMARY)
}

async function exportFormat(page, name, label) {
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  const panel = page.getByRole('dialog', { name: /Export your design system/i })
  await expect(panel).toBeVisible()
  const row = panel.getByRole('radio', { name: new RegExp(name, 'i') })
  await expect(row.locator('.exp-fmt-soon'), `${name} still carries a Soon badge`).toHaveCount(0)
  await row.click()
  const cta = panel.getByRole('button', { name: `Export ${label}`, exact: true })
  await expect(cta).toBeEnabled()
  const [download] = await Promise.all([page.waitForEvent('download'), cta.click()])
  await expect(panel).toHaveCount(0)
  return { filename: download.suggestedFilename(), body: await readDownload(download) }
}

test.describe('token export, signed in', () => {
  test('CSS tokens: a stylesheet holding the board\'s primary colour, with the free credit', async ({ page }) => {
    watch(page, 'a free account taking its palette into code as CSS')
    await signIn(page, { plan: 'free' })
    await boardWithPalette(page)
    const { filename, body } = await exportFormat(page, 'CSS tokens', 'CSS')
    expect(filename).toMatch(/\.tokens\.css$/)
    expect(body.length).toBeGreaterThan(500)
    expect(body).toMatch(/^\/\*/)
    expect(body).toContain(':root {')
    expect(body).toContain(`--color-primary: ${PRIMARY};`)
    expect(body).toMatch(/--color-primary-500: #[0-9A-F]{6};/)
    expect(body).toMatch(/--color-success-500: #[0-9A-F]{6};/)
    expect(body).toMatch(/--font-heading: "/)
    expect(body, 'the free file carries the line Pro removes').toMatch(/Made with UIL4B/)
  })

  test('JSON tokens: a DTCG document holding the same colour', async ({ page }) => {
    watch(page, 'a free account feeding its palette to a token pipeline')
    await signIn(page, { plan: 'free' })
    await boardWithPalette(page)
    const { filename, body } = await exportFormat(page, 'JSON tokens', 'JSON')
    expect(filename).toMatch(/\.tokens\.json$/)
    const doc = JSON.parse(body)
    expect(doc.color.primary.$root.$type).toBe('color')
    expect(doc.color.primary.$root.$value.hex).toBe(PRIMARY)
    expect(doc.color.primary['500'].$value.colorSpace).toBe('srgb')
    expect(doc.font.size.base.$value).toEqual({ value: 16, unit: 'px' })
    expect(doc.$description).toMatch(/Made with UIL4B/)
  })

  test('a Pro account gets both files without the credit line', async ({ page }) => {
    watch(page, 'a Pro subscriber exporting tokens')
    await signIn(page, { plan: 'pro' })
    await boardWithPalette(page)
    const css = await exportFormat(page, 'CSS tokens', 'CSS')
    expect(css.body).toContain(`--color-primary: ${PRIMARY};`)
    expect(css.body).not.toMatch(/Made with UIL4B/)
    const json = await exportFormat(page, 'JSON tokens', 'JSON')
    expect(JSON.parse(json.body).color.primary.$root.$value.hex).toBe(PRIMARY)
    expect(json.body).not.toMatch(/Made with UIL4B/)
  })
})

test.describe('token export, signed out', () => {
  for (const [name, label] of [['CSS tokens', 'CSS'], ['JSON tokens', 'JSON']]) {
    test(`${name}: the same create-account gate as the style guide, and no file`, async ({ page }) => {
      watch(page, 'someone trying the tools before signing up for anything')
      await go(page, '/create/tint')
      await page.evaluate(() => {
        window.__dl = 0
        const real = HTMLAnchorElement.prototype.click
        HTMLAnchorElement.prototype.click = function patched() {
          if (this.hasAttribute('download')) window.__dl += 1
          return real.apply(this, arguments)
        }
      })
      const opener = page.locator('.pnav-export').first()
      await expect(opener).toBeVisible({ timeout: 15000 })
      await opener.click()
      const panel = page.getByRole('dialog', { name: /Export your design system/i })
      await expect(panel).toBeVisible({ timeout: 15000 })
      await panel.getByRole('radio', { name: new RegExp(name, 'i') }).click()
      const cta = panel.getByRole('button', { name: `Export ${label}`, exact: true })
      await expect(cta, 'a free format is not relabelled as a Pro unlock').toBeVisible()
      await cta.click()
      await expect(page.locator('#ui-login-title')).toHaveText(/create your free account/i, { timeout: 10000 })
      expect(await page.evaluate(() => window.__dl || 0), 'a file was produced anyway').toBe(0)
      await expect(page, 'a free format does not send anyone to /plans').not.toHaveURL(/\/plans/)
    })
  }
})
