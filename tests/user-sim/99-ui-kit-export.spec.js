// The UI kit, exported from the nav's Export popup (UI kit).
//
// Signed out, the kit is the panel's default format and pressing Export raises
// the same create-account gate as every other file export, with nothing
// asked of the server and nothing downloaded. With an account the same press asks
// the export route (POST /api/ai?export=document, answered here by a stand-in) for
// the kit in the open theme and saves the zip it sends back as
// `{slug}-ui-kit-{theme}.zip`. The kit's contents (edition mark, embedded fonts,
// no invented shares or slogans) are built and checked on the server; what these
// specs hold is what the dialog asks for, what it saves, and what it says.
import { chooseFormat, exportPanel, primaryButton, dockStatus } from './export-rows.js'
import { test, expect } from './base.js'
import { go, watch, signIn, overlaysSettled, ready } from './helpers.js'
import { mockThemeApi } from './export-theme-mock.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const PRIMARY = '#1F4B8E'
const BOARD = `/create/palette?c=${PRIMARY.slice(1)},2E7BB8,3FA9A0`

async function readDownload(download) {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
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
  return { panel, filename: download.suggestedFilename(), bytes: await readDownload(download) }
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
    const calls = await mockThemeApi(page)
    await go(page, BOARD)
    const panel = await openPanel(page)
    await primaryButton(panel).click()
    await expect(page.locator('#ui-login-title'), 'a file export asks for a free account')
      .toHaveText(/create your free account/i, { timeout: 10000 })
    await expect(page.getByText(/you were about to export this UI kit/i)).toBeVisible()
    expect(calls, 'a signed-out press asks the route for nothing').toEqual([])

    // They make the account; the same press now hands over the kit.
    await signIn(page, { plan: 'free' })
    await go(page, BOARD)
    await expect.poll(() => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('vs-current-design') || '{}').palette?.colors?.[0] || '' } catch { return '' }
    })).toBe(PRIMARY)
    const { filename, bytes } = await exportKit(page)
    // No saved project here, so the file is filed as untitled, in the theme the dialog opened on.
    expect(filename).toBe('untitled-ui-kit-04-standards.zip')
    expect(bytes.subarray(0, 2).toString(), 'the kit is a real zip').toBe('PK')
    expect(calls.map((c) => c.body)).toEqual([expect.objectContaining({ theme: '04-standards', row: 'ui-kit', format: 'zip', projectName: 'Design System' })])
    expect(calls[0].auth, 'asked with the account’s token').toMatch(/^Bearer \S+/)
    expect(calls[0].body.design.palette.colors[0], 'for this board’s colours').toBe(PRIMARY)

    // Recorded in Recent exports, like every other export.
    await expect.poll(() => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('vs-recent-exports') || '[]').map((e) => e.filename) } catch { return [] }
    })).toContain('untitled-ui-kit-04-standards.zip')
  })

  test('free: the kit is asked for and filed under the open project’s name', async ({ page }) => {
    watch(page, 'a free account exporting the UI kit of a saved project called Harbour')
    const calls = await mockThemeApi(page)
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
    expect.soft(download.suggestedFilename(), 'the file is named for the project, not the product').toBe('harbour-ui-kit-04-standards.zip')
    expect.soft((await readDownload(download)).subarray(0, 2).toString()).toBe('PK')

    // The route builds the kit from exactly this; the title and cover heading come from projectName.
    expect(calls.map((c) => c.body)).toEqual([expect.objectContaining({ theme: '04-standards', row: 'ui-kit', format: 'zip', projectName: 'Harbour' })])
    expect.soft(calls[0].body.design.palette.colors, 'the project’s own colours').toEqual([PRIMARY, '#2E7BB8', '#3FA9A0'])
    expect.soft(calls[0].body.design.fonts.heading.family, 'and its own type').toBe('Manrope')
  })

  test('Pro: the kit downloads at once as a zip, with no account gate', async ({ page }) => {
    watch(page, 'a Pro subscriber exporting a kit')
    const calls = await mockThemeApi(page)
    await signIn(page, { plan: 'pro' })
    await go(page, BOARD)
    const { filename, bytes } = await exportKit(page)
    expect(filename).toMatch(/^untitled-ui-kit-[a-z0-9-]+\.zip$/)
    expect(bytes.subarray(0, 2).toString()).toBe('PK')
    expect(calls, 'one request for one press').toHaveLength(1)
    await expect(page.locator('#ui-login-title')).toHaveCount(0)
  })

  test('Pro: the name and description typed in the panel personalise the kit, and stay with the design', async ({ page }) => {
    watch(page, 'a Pro subscriber naming their kit before exporting it')
    const calls = await mockThemeApi(page)
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
    const saved = download.suggestedFilename()
    expect(saved).toMatch(/-ui-kit-[a-z0-9-]+\.zip$/)
    await expect(dockStatus(panel), 'the popup names the file it made').toContainText(saved)
    // The route puts the description into the kit; the dialog's part is to send it.
    expect(calls.map((c) => c.body)).toEqual([expect.objectContaining({ row: 'ui-kit', format: 'zip' })])
    expect(calls[0].body.design.identity).toEqual({ description: 'Moorings and chandlery on the north quay.' })

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

  // The Pro panel promises the kit "with your name, in the kit's identity section", and a Pro kit used to be filed and titled by
  // that name. Themed zips are named from the open project (themedZipName) and the request carries the project's name, so the
  // typed name reaches neither. Red on purpose until the runner (or the design) says which way this should go.
  test('Pro: the name typed in the panel names the kit, in the request and on the file', async ({ page }) => {
    watch(page, 'a Pro subscriber naming their kit before exporting it')
    const calls = await mockThemeApi(page)
    await signIn(page, { plan: 'pro' })
    await go(page, BOARD)
    const panel = await openPanel(page)
    await panel.getByRole('group', { name: 'Identity' }).getByLabel('Name').fill('Harbour Studio')
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), primaryButton(panel).click()])
    expect(calls.map((c) => c.body.projectName), 'the route is told the kit’s name').toEqual(['Harbour Studio'])
    expect(download.suggestedFilename(), 'and the file is filed under it').toMatch(/^harbour-studio-ui-kit-[a-z0-9-]+\.zip$/)
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
      // In the kit's Details step, under the File step and the type in the rail.
      const order = await panel.evaluate((el) => {
        const kit = el.querySelector('.xd-type.is-on')
        const file = [...el.querySelectorAll('.xd-step-l')].find((h) => h.textContent === 'File')
        const fields = el.querySelector('.exp-identity')
        const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
        const step = fields.closest('.xd-step')
        return { afterKit: follows(kit, fields), afterFile: follows(file, fields), inDetails: step?.querySelector('.xd-step-l')?.textContent === 'Details' }
      })
      expect(order).toEqual({ afterKit: true, afterFile: true, inDetails: true })
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
        await mockThemeApi(page)
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
        await expect(notice).toContainText(/^Downloaded untitled-ui-kit-[a-z0-9-]+\.zip\.$/)
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
    await mockThemeApi(page)
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
})
