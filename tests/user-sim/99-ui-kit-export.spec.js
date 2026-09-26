// The UI kit, exported from the nav's Export panel.
//
// Signed out, the kit is the panel's default format and pressing Export raises
// the same create-account gate as every other file export, with nothing
// downloaded. With a free account the same press hands over one HTML file that
// carries the UIL4B attribution and embeds its fonts; with Pro the attribution
// is gone. A font whose licence cannot be fetched is not embedded, and both the
// panel and the kit say so.
//
// The font requests the export makes (fetch, not the app's own stylesheet
// links) are answered from fixtures, so the result does not depend on Google.
import fs from 'node:fs'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const PRIMARY = '#1F4B8E'
const BOARD = `/create/palette?c=${PRIMARY.slice(1)},2E7BB8,3FA9A0`
const FONT_FILE = 'https://fonts.gstatic.com/s/kitfixture/latin.woff2'
const CSS2 = `/* latin */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400 700; font-display: swap; src: url(${FONT_FILE}) format('woff2'); unicode-range: U+0000-00FF; }`
const WOFF2 = fs.readFileSync('public/fonts/geist-latin.woff2')

async function fontFixtures(page, { licence }) {
  await page.route(/fonts\.googleapis\.com\/css2/, (route) => (route.request().resourceType() === 'fetch'
    ? route.fulfill({ status: 200, contentType: 'text/css', body: CSS2 })
    : route.continue()))
  await page.route(FONT_FILE, (route) => route.fulfill({ status: 200, contentType: 'font/woff2', body: WOFF2 }))
  await page.route(/cdn\.jsdelivr\.net\/gh\/google\/fonts/, (route) => (licence
    ? route.fulfill({ status: 200, contentType: 'text/plain', body: 'Copyright 2020 The Inter Project Authors\nSIL OPEN FONT LICENSE Version 1.1' })
    : route.fulfill({ status: 404, body: '' })))
}

async function readDownload(download) {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function openPanel(page) {
  // On a phone the nav folds Export into its menu sheet.
  const opener = page.locator('.pnav-export:visible, .pnav-mobile:visible').first()
  await expect(opener).toBeVisible({ timeout: 15000 })
  if (await opener.evaluate((el) => el.classList.contains('pnav-export'))) {
    await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  } else {
    await opener.click()
    await page.locator('.pnav-sheet-row', { hasText: 'Export' }).click()
  }
  const panel = page.getByRole('dialog', { name: /Export your design system/i })
  await expect(panel).toBeVisible()
  // The kit is the default: selected before anything is touched.
  await expect(panel.getByRole('radio', { name: /^UI kit/ })).toHaveAttribute('aria-checked', 'true')
  return panel
}

async function exportKit(page) {
  const panel = await openPanel(page)
  const cta = panel.getByRole('button', { name: 'Export UI kit', exact: true })
  await expect(cta).toBeEnabled()
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
  return { panel, filename: download.suggestedFilename(), body: await readDownload(download) }
}

// Where an element sits against the part of the panel a person can see without
// scrolling: below the panel's top edge, above the sticky footer and the window.
async function placeInPanel(locator) {
  return locator.evaluate((el) => {
    const panel = el.closest('.exp-panel')
    const p = panel.getBoundingClientRect()
    const foot = panel.querySelector('.exp-foot').getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return {
      scrollTop: panel.scrollTop,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      viewTop: Math.round(Math.max(p.top, 0)),
      viewBottom: Math.round(Math.min(foot.top, window.innerHeight)),
    }
  })
}

const SIZES = [{ width: 390, height: 844 }, { width: 1440, height: 900 }]

test.describe('the UI kit export', () => {
  test('signed out, a tool, the kit: the free account gate, then the kit itself', async ({ page }) => {
    watch(page, 'a visitor trying the palette tool who wants the kit')
    await fontFixtures(page, { licence: true })
    await go(page, BOARD)
    const panel = await openPanel(page)
    await panel.getByRole('button', { name: 'Export UI kit', exact: true }).click()
    await expect(page.locator('#ui-login-title'), 'a file export asks for a free account')
      .toHaveText(/create your free account/i, { timeout: 10000 })
    await expect(page.getByText(/you were about to export this UI kit/i)).toBeVisible()

    // They make the account; the same press now hands over the kit.
    await signIn(page, { plan: 'free' })
    await go(page, BOARD)
    await expect.poll(() => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('vs-current-design') || '{}').palette?.colors?.[0] || '' } catch { return '' }
    })).toBe(PRIMARY)
    const { filename, body } = await exportKit(page)
    expect(filename).toBe('uil4b-ui-kit.html')
    expect(body.length, 'the kit is a real, self-contained document').toBeGreaterThan(60000)
    expect(body).toContain('<span class="edition">Free edition</span>')
    expect(body).toContain('<span class="section-watermark">Made with')
    expect(body).toContain('content:"Made with UIL4B / Free UI kit"')
    expect(body).toContain(PRIMARY)
    expect(body).toMatch(/@font-face\{font-family:"Inter";src:url\(data:font\/woff2;base64,/)
    expect(body, 'no font or stylesheet is left on the network').not.toMatch(/url\(\s*['"]?https?:/)
    expect(body).toContain('The selected font is embedded in this HTML.')

    // Recorded in Recent exports, like every other export.
    await expect.poll(() => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('vs-recent-exports') || '[]').map((e) => e.filename) } catch { return [] }
    })).toContain('uil4b-ui-kit.html')
  })

  test('Pro: the same kit without the attribution', async ({ page }) => {
    watch(page, 'a Pro subscriber exporting a clean kit')
    await fontFixtures(page, { licence: true })
    await signIn(page, { plan: 'pro' })
    await go(page, BOARD)
    const { filename, body } = await exportKit(page)
    expect(filename).toMatch(/ui-kit\.html$/)
    expect(body.length).toBeGreaterThan(60000)
    expect(body).toContain('<span class="edition">Personal edition</span>')
    expect(body).not.toContain('class="section-watermark"')
    expect(body).not.toContain('Made with UIL4B')
    expect(body).not.toContain('uil4b.com')
  })

  test('Pro: the name and description typed in the panel personalise the kit, and stay with the design', async ({ page }) => {
    watch(page, 'a Pro subscriber naming their kit before exporting it')
    await fontFixtures(page, { licence: true })
    await signIn(page, { plan: 'pro' })
    await go(page, BOARD)
    const panel = await openPanel(page)
    const identity = panel.getByRole('group', { name: 'Identity' })
    await expect(identity, 'a Pro kit offers its identity fields').toBeVisible()
    await identity.getByLabel('Name').fill('Harbour Studio')
    await identity.getByLabel(/^Description/).fill('Moorings and chandlery on the north quay.')
    await expect(panel.getByText(/with your name, in the kit’s identity section/)).toBeVisible()

    // Written into the working design, the record that follows the account.
    await expect.poll(() => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('vs-current-design') || '{}').identity || null } catch { return null }
    })).toEqual({ name: 'Harbour Studio', description: 'Moorings and chandlery on the north quay.' })

    const cta = panel.getByRole('button', { name: 'Export UI kit', exact: true })
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
    expect(download.suggestedFilename()).toBe('harbour-studio-ui-kit.html')
    const body = await readDownload(download)
    expect(body).toContain('<div class="identity-name">Harbour Studio</div>')
    expect(body).toContain('<p>Moorings and chandlery on the north quay.</p>')
    expect(body).toContain('<span class="pro-title">Harbour Studio</span>')

    // Reopened, the panel still holds what was typed.
    await page.reload()
    const again = await openPanel(page)
    await expect(again.getByRole('group', { name: 'Identity' }).getByLabel('Name')).toHaveValue('Harbour Studio')
  })

  for (const size of SIZES) {
    test(`Pro at ${size.width}: the name, description and logo row are in view the moment the panel opens`, async ({ page }) => {
      watch(page, `a Pro subscriber at ${size.width}px opening Export to name their kit`)
      await page.setViewportSize(size)
      await signIn(page, { plan: 'pro' })
      await go(page, BOARD)
      const panel = await openPanel(page)
      const identity = panel.getByRole('group', { name: 'Identity' })
      const targets = {
        name: identity.getByLabel('Name'),
        description: identity.getByLabel(/^Description/),
        logo: panel.getByText('Your logo', { exact: true }),
      }
      await expect(panel.getByRole('button', { name: 'Add logo', exact: true })).toBeVisible()
      for (const [what, target] of Object.entries(targets)) {
        await expect(target, `${what} is offered`).toBeVisible()
        const at = await placeInPanel(target)
        expect(at.scrollTop, 'the panel opens unscrolled').toBe(0)
        expect(at.top, `${what} starts inside the panel: ${JSON.stringify(at)}`).toBeGreaterThanOrEqual(at.viewTop)
        expect(at.bottom, `${what} ends above the footer and the fold: ${JSON.stringify(at)}`).toBeLessThanOrEqual(at.viewBottom)
      }
      // Directly under the kit row, before any other format.
      const order = await panel.evaluate((el) => {
        const kit = el.querySelector('.exp-fmt[aria-checked="true"]')
        const fields = el.querySelector('.exp-identity')
        const next = kit.parentElement.querySelectorAll('.exp-fmt')[1]
        const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
        return { afterKit: follows(kit, fields), beforeNext: follows(fields, next) }
      })
      expect(order).toEqual({ afterKit: true, beforeNext: true })
    })

    test(`free at ${size.width}: the panel opens with no identity fields`, async ({ page }) => {
      watch(page, `a free account at ${size.width}px opening Export`)
      await page.setViewportSize(size)
      await signIn(page, { plan: 'free' })
      await go(page, BOARD)
      const panel = await openPanel(page)
      await expect(panel.getByRole('group', { name: 'Identity' }), 'a free kit is not personalised').toHaveCount(0)
      await expect(panel.getByRole('button', { name: 'Add logo', exact: true }), 'nor asked for a logo').toHaveCount(0)
    })
  }

  test('free: no identity fields, and a finished export with a notice offers Close', async ({ page }) => {
    watch(page, 'a free account exporting the kit')
    await fontFixtures(page, { licence: false })
    await signIn(page, { plan: 'free' })
    await go(page, BOARD)
    const panel = await openPanel(page)
    await expect(panel.getByRole('group', { name: 'Identity' }), 'a free kit is not personalised').toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    const cta = panel.getByRole('button', { name: 'Export UI kit', exact: true })
    await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
    await expect(panel.getByRole('status')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true }), 'nothing is left to cancel').toHaveCount(0)
    await panel.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(panel).toHaveCount(0)
  })

  test('a font without a licence falls back, and the panel says so', async ({ page }) => {
    watch(page, 'a free account exporting while the font licence cannot be fetched')
    await fontFixtures(page, { licence: false })
    await signIn(page, { plan: 'free' })
    await go(page, BOARD)
    const { panel, body } = await exportKit(page)
    expect(body).toContain('Inter could not be embedded, so it is shown in the reader’s sans-serif font.')
    expect(body).not.toMatch(/font-family:"Inter";src/)
    await expect(panel.getByRole('status')).toContainText('Inter could not be embedded')
  })
})
