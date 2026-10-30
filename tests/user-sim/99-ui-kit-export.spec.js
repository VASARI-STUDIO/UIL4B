// The UI kit, exported from the nav's Export popup (UI kit).
//
// Signed out, the kit is the panel's default format and pressing Export raises
// the same create-account gate as every other file export, with nothing
// downloaded. With a free account the same press hands over one HTML file that
// carries the UIL4B attribution and embeds its fonts; with Pro the attribution
// is gone. Either way the kit is titled with the project's name and saved as
// `{slug}-ui-kit.html`, and it shows no invented usage shares or slogans. A font whose licence cannot be fetched is not embedded, and both the
// panel and the kit say so.
//
// The font requests the export makes (fetch, not the app's own stylesheet
// links) are answered from fixtures, so the result does not depend on Google.
import fs from 'node:fs'
import { chooseFormat, exportPanel, primaryButton, dockStatus } from './export-rows.js'
import { test, expect } from './base.js'
import { go, watch, signIn, overlaysSettled, ready } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

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
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  // The header Export opens on the Brand book; the kit is a pick like any other.
  await chooseFormat(page, 'kit')
  await expect(panel.getByRole('radio', { name: /^UI kit/ })).toHaveAttribute('aria-checked', 'true')
  return panel
}

async function exportKit(page) {
  const panel = await openPanel(page)
  const cta = primaryButton(panel)
  await expect(cta).toHaveText('Export UI kit')
  await expect(cta).toBeEnabled()
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
  return { panel, filename: download.suggestedFilename(), body: await readDownload(download) }
}

// Where an element sits against the part of the popup a person can see: inside the
// scrolling column, above the dock that is always in view, and inside the window.
async function placeInPanel(locator) {
  return locator.evaluate((el) => {
    const column = el.closest('.xd-scroll')
    const c = column.getBoundingClientRect()
    const dock = document.querySelector('.xd-dock').getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      viewTop: Math.round(Math.max(c.top, 0)),
      viewBottom: Math.round(Math.min(dock.top, window.innerHeight)),
    }
  })
}

// What a person reads in the kit, with its styles, scripts and markup taken away.
const visibleText = (html) => html
  .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')

function savedProject(name) {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = [PRIMARY, '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = [PRIMARY, '#2E7BB8', '#3FA9A0']
  const now = new Date().toISOString()
  return { id: 'kit-project', name, design, createdAt: now, updatedAt: now }
}

const SIZES = [{ width: 390, height: 844 }, { width: 1440, height: 900 }]

test.describe('the UI kit export', () => {
  test('signed out, a tool, the kit: the free account gate, then the kit itself', async ({ page }) => {
    watch(page, 'a visitor trying the palette tool who wants the kit')
    await fontFixtures(page, { licence: true })
    await go(page, BOARD)
    const panel = await openPanel(page)
    await primaryButton(panel).click()
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
    // No saved project here, so the export runner's own fallback name is the title.
    expect(filename).toBe('design-system-ui-kit.html')
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
    })).toContain('design-system-ui-kit.html')
  })

  test('free: the kit is titled with the open project’s name and invents no usage shares or slogans', async ({ page }) => {
    watch(page, 'a free account exporting the UI kit of a saved project called Harbour')
    await fontFixtures(page, { licence: true })
    // The saved project sets its type in Manrope, so the font request is answered for Manrope.
    await page.route(/fonts\.googleapis\.com\/css2/, (route) => (route.request().resourceType() === 'fetch'
      ? route.fulfill({ status: 200, contentType: 'text/css', body: CSS2.replace("'Inter'", "'Manrope'") })
      : route.continue()))
    await signIn(page, { plan: 'free', projects: [savedProject('Harbour')] })
    await go(page, '/projects')
    await page.locator('.uh-card-name[data-project="Harbour"]').click()
    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
    await page.locator('.pjd-head-actions').getByRole('button', { name: 'Export project', exact: true }).click()
    const panel = exportPanel(page)
    await expect(panel).toBeVisible()
    await chooseFormat(panel, 'kit')
    const cta = primaryButton(panel)
    await expect(cta).toHaveText('Export UI kit')
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
    expect.soft(download.suggestedFilename(), 'the file is named for the project, not the product').toBe('harbour-ui-kit.html')
    const body = await readDownload(download)

    // Each check below is reported on its own, so a kit that breaks several says so at once.
    expect.soft(body).toContain('<title>Harbour | UI kit</title>')
    const heading = body.match(/<h1 class="cover-title"[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''
    expect.soft(heading.replace(/<[^>]+>/g, ''), 'the cover heading is the project name').toBe('Harbour')
    expect.soft(body).toContain(PRIMARY)

    const text = visibleText(body)
    expect.soft(text, 'no usage-share percentage anywhere a person can read').not.toMatch(/\d\s*%/)
    expect.soft(body, 'no share bar').not.toMatch(/class="proportion/)
    expect.soft(text, 'no proportions section').not.toMatch(/proportion/i)
    expect.soft(text, 'the invented tagline is gone').not.toContain('From selections to a system')
    expect.soft(text, 'the invented website headline is gone').not.toContain('A place for your next idea')
    expect.soft(body.match(/<title>[^<]*<\/title>/)?.[0] ?? '','the product name is not the kit’s title').not.toMatch(/UIL4B/i)
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

    const cta = primaryButton(panel)
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
    expect(download.suggestedFilename()).toBe('harbour-studio-ui-kit.html')
    await expect(dockStatus(panel), 'the popup names the file it made').toContainText('harbour-studio-ui-kit.html')
    const body = await readDownload(download)
    expect(body).toContain('<div class="identity-name">Harbour Studio</div>')
    expect(body).toContain('<p>Moorings and chandlery on the north quay.</p>')
    expect(body).toContain('<span class="pro-title">Harbour Studio</span>')

    // Reopened, the panel still holds what was typed. The popup stays open after a
    // download, so closing it is a step of its own; it gives its history entry back
    // asynchronously, and a reload that starts before that settles is cancelled by it.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await overlaysSettled(page, 'the closed Export panel')
    await page.reload()
    await ready(page, 'the palette tool after the reload')
    const again = await openPanel(page)
    await expect(again.getByRole('group', { name: 'Identity' }).getByLabel('Name')).toHaveValue('Harbour Studio')
  })

  for (const size of SIZES) {
    test(`Pro at ${size.width}: the name, description and logo row can be reached in the column, above the dock`, async ({ page }) => {
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
        await target.scrollIntoViewIfNeeded()
        const at = await placeInPanel(target)
        expect(at.top, `${what} starts inside the panel: ${JSON.stringify(at)}`).toBeGreaterThanOrEqual(at.viewTop)
        expect(at.bottom, `${what} ends above the footer and the fold: ${JSON.stringify(at)}`).toBeLessThanOrEqual(at.viewBottom)
      }
      // In the kit's Details step, under the Layout step and the type in the rail.
      const order = await panel.evaluate((el) => {
        const kit = el.querySelector('.xd-type.is-on')
        const layout = [...el.querySelectorAll('.xd-step-l')].find((h) => h.textContent === 'Layout')
        const fields = el.querySelector('.exp-identity')
        const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
        const step = fields.closest('.xd-step')
        return { afterKit: follows(kit, fields), afterLayout: follows(layout, fields), inDetails: step?.querySelector('.xd-step-l')?.textContent === 'Details' }
      })
      expect(order).toEqual({ afterKit: true, afterLayout: true, inDetails: true })
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

  for (const theme of ['light', 'dark']) {
    for (const size of [...SIZES, { width: 768, height: 900 }]) {
      test(`downloaded notice stays in view at ${size.width} in ${theme}`, async ({ page }) => {
        watch(page, `a free account reading the download confirmation at ${size.width}px in ${theme}`)
        await page.setViewportSize(size)
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript((value) => localStorage.setItem('vs-t', value), theme)
        await fontFixtures(page, { licence: false })
        await signIn(page, { plan: 'free' })
        await go(page, BOARD)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        const panel = await openPanel(page)
        await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished)))
        // The export button must not move when the notice appears: the dock keeps
        // its height and the line sits beside the button, so a notice never shoves it.
        const readActions = (el) => {
          const right = el.querySelector('.xd-primary').getBoundingClientRect().toJSON()
          return { scrollTop: el.querySelector('.xd-scroll').scrollTop, buttons: { top: right.top, bottom: right.bottom, height: right.height } }
        }
        const before = await panel.evaluate(readActions)
        const cta = primaryButton(panel)
        await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
        const notice = dockStatus(panel)
        await expect(notice).toContainText('Your UI kit downloaded.')
        await expect(primaryButton(panel)).toHaveText('Export again')
        // Read geometry without scrolling the notice into view. DOM visibility
        // alone also passes when the status is clipped below the format list.
        await expect.poll(async () => notice.evaluate((el) => {
          const panel = el.closest('.xd-card')
          const p = panel.getBoundingClientRect()
          const r = el.getBoundingClientRect()
          const buttons = panel.querySelector('.xd-primary').getBoundingClientRect()
          // Beside the button on a wide dock, above it on a narrow one; never under it.
          const clear = r.right <= buttons.left + 0.5 || r.bottom <= buttons.top + 0.5
          return r.top >= Math.max(p.top + panel.clientTop, 0)
            && r.bottom <= Math.min(p.top + panel.clientTop + panel.clientHeight, window.innerHeight)
            && r.left >= Math.max(p.left + panel.clientLeft, 0)
            && r.right <= Math.min(p.left + panel.clientLeft + panel.clientWidth, window.innerWidth)
            && clear
        }), 'the whole notice is inside the visible popup and clear of the export button').toBe(true)
        const after = await panel.evaluate(readActions)
        expect(after.scrollTop, 'reading the notice needs no panel scroll').toBe(before.scrollTop)
        expect(after.buttons, 'the actions keep their position and size').toEqual(before.buttons)
      })
    }
  }

  test('free: no identity fields, and a finished export with a notice offers another go and the X', async ({ page }) => {
    watch(page, 'a free account exporting the kit')
    await fontFixtures(page, { licence: false })
    await signIn(page, { plan: 'free' })
    await go(page, BOARD)
    const panel = await openPanel(page)
    await expect(panel.getByRole('group', { name: 'Identity' }), 'a free kit is not personalised').toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Close export', exact: true })).toBeVisible()
    const cta = primaryButton(panel)
    await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
    await expect(dockStatus(panel)).toBeVisible()
    await expect(cta, 'the button offers another go').toHaveText('Export again')
    await panel.getByRole('button', { name: 'Close export', exact: true }).click()
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
    await expect(dockStatus(panel)).toContainText('Inter could not be embedded')
  })
})
