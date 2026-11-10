// THE EXPORT DIALOG'S THEME STEP.
//
// The UI kit, the book (PDF and HTML) and the slides (PDF and HTML) take one of ten themes. The Theme step shows the chosen
// theme and a Change button; Change opens a popover on a wide window and a "Theme" sheet on a phone. A free account can have
// the UI kit in Standards and Specification only; every other row and theme is Pro. The files come from
// POST /api/ai?export=document, which every test here answers itself (export-theme-mock.js), so what is checked is what the
// dialog asks for, what it does with each answer, and what a person reads.
//
// Expected names, themes and copy are written out here, not read from src/, so a reworded button or a moved theme fails the spec.
//
// MUTATIONS (each break must fail the group named after it; the built bundle was patched, see the run notes):
//   - isThemeExportPro answers false for every theme          -> "a free account ... stays locked" (book, slides) and the kit's Pro themes
//   - isPrintSafe returns true                                -> "a print document that is not the script-free one is refused"
//   - the Retry-After seconds are read with parseFloat        -> "a Retry-After that is not whole seconds"
//   - End moves to the second-last row                        -> "Home and End"
//   - Escape closes the dialog as well as the list            -> "Escape closes the list"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { chooseFormat, exportPanel, primaryButton, dockStatus, dockError } from './export-rows.js'
import { mockThemeApi, cleanHtml, tinyZip } from './export-theme-mock.js'

const ROUTE = '/projects/harbour/export'

// The ten themes in the picker's order, and which of them a free account has the UI kit in.
const THEMES = [
  ['01-presentation', 'Presentation'], ['02-poster', 'Ticket'], ['03-broadsheet', 'Broadsheet'], ['04-standards', 'Standards'],
  ['05-specimen', 'Catalogue'], ['06-studio', 'Studio'], ['07-spec', 'Specification'], ['08-monograph', 'Riso'],
  ['09-blueprint', 'Blueprint'], ['10-inuse', 'In use'],
]
const NAMES = THEMES.map(([, name]) => name)
const FREE_KIT = ['Standards', 'Specification']

// The files the Theme step belongs to: what the dialog calls them, the row and format the route is asked for, and the zip they save as.
const FILES = {
  kit: { row: 'ui-kit', format: 'zip', zip: 'ui-kit', label: 'Export UI kit' },
  book: { row: 'book', format: 'pdf', zip: null, label: 'Export PDF' },
  'book-html': { row: 'book', format: 'html', zip: 'brand-book', label: 'Export HTML' },
  guidelines: { row: 'slides', format: 'pdf', zip: null, label: 'Export PDF' },
  'guidelines-html': { row: 'slides', format: 'html', zip: 'brand-guidelines', label: 'Export HTML' },
}

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  const now = new Date().toISOString()
  return { id: 'harbour', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

/** Sign in, open the export route (the dialog opens on arrival) and choose a file. */
async function open(page, { plan = 'free', file = 'kit', size, saved = true } = {}) {
  if (size) await page.setViewportSize(size)
  await signIn(page, { plan, projects: saved ? [savedProject()] : [] })
  if (saved) await go(page, ROUTE)
  else {
    // No saved project: a free account's upgrade goes to /plans and the dock says "Pro unlocks this file.".
    await go(page, '/create/palette?c=1F4B8E,2E7BB8,3FA9A0')
    await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  }
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  await chooseFormat(panel, file)
  // A pointer left over a row would highlight it when the list opens under it.
  await page.mouse.move(0, 0)
  return panel
}

const change = (panel) => panel.getByRole('button', { name: /^Change theme, current / })
const themeName = (panel) => panel.locator('.xd-theme-name > span:first-child')
const themeTier = (panel) => panel.locator('.xd-theme-tier')
const list = (page) => page.getByRole('listbox', { name: 'Theme' })
const option = (page, name) => list(page).getByRole('option', { name: new RegExp(`^${name}\\b`) })
const activeName = (page) => list(page).evaluate((el) => document.getElementById(el.getAttribute('aria-activedescendant'))?.querySelector('.xd-theme-opt-n')?.textContent)
const optionNames = (page) => list(page).locator('.xd-theme-opt-n').allTextContents()

async function openList(page, panel) {
  await change(panel).click()
  await expect(list(page)).toBeVisible()
}
async function pick(page, panel, name) {
  await openList(page, panel)
  await option(page, name).click()
  await expect(list(page)).toHaveCount(0)
  await expect(themeName(panel)).toHaveText(name)
}

/* ── Free and Pro, per row and per theme ─────────────────────────────────── */

test.describe('Free and Pro', () => {
  test('a free account sees the UI kit open in Standards and Specification and Pro in the other eight', async ({ page }) => {
    watch(page, 'a free account opening the theme list for the UI kit')
    const panel = await open(page, { plan: 'free', file: 'kit' })
    await expect(themeName(panel), 'a free account starts on a theme it can have').toHaveText('Standards')
    await expect(themeTier(panel)).toHaveText('Free')
    await openList(page, panel)
    expect(await optionNames(page), 'ten themes, in order').toEqual(NAMES)
    const tiers = await list(page).locator('.xd-theme-opt').evaluateAll((rows) => rows.map((r) => ({
      name: r.querySelector('.xd-theme-opt-n').textContent, tier: r.querySelector('.xd-theme-opt-r').textContent.trim(),
    })))
    expect(tiers.filter((t) => t.tier === 'Free').map((t) => t.name)).toEqual(FREE_KIT)
    expect(tiers.filter((t) => t.tier === 'Pro').map((t) => t.name)).toEqual(NAMES.filter((n) => !FREE_KIT.includes(n)))
    await expect(option(page, 'Standards')).toHaveAttribute('aria-selected', 'true')
  })

  for (const name of FREE_KIT) {
    test(`free, UI kit in ${name}: the button exports, with no lock`, async ({ page }) => {
      watch(page, `a free account on the UI kit in ${name}`)
      const panel = await open(page, { plan: 'free', file: 'kit' })
      await pick(page, panel, name)
      await expect(primaryButton(panel)).toHaveText('Export UI kit')
      await expect(dockStatus(panel)).toContainText('Free.')
      await expect(panel.locator('.xd-theme-lock')).toHaveCount(0)
    })
  }

  for (const name of NAMES.filter((n) => !FREE_KIT.includes(n))) {
    test(`free, UI kit in ${name}: Pro, so the button reads Unlock with Pro and goes to /plans without asking the server`, async ({ page }) => {
      watch(page, `a free account on the UI kit in the Pro theme ${name}`)
      const calls = await mockThemeApi(page)
      const panel = await open(page, { plan: 'free', file: 'kit' })
      await pick(page, panel, name)
      await expect(themeTier(panel)).toHaveText('Pro')
      await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
      await expect(dockStatus(panel)).toHaveText('Pro theme. The UI kit is free in Standards and Specification.')
      await primaryButton(panel).click()
      await expect(page).toHaveURL(/\/(plans|checkout)(\?|$)/)
      expect(calls, 'a locked theme never reaches the route').toHaveLength(0)
    })
  }

  for (const file of ['book', 'book-html', 'guidelines', 'guidelines-html']) {
    for (const name of FREE_KIT) {
      test(`free, ${file} in ${name}: still Pro, because only the UI kit is free there`, async ({ page }) => {
        watch(page, `a free account on ${file} in ${name}, a theme the UI kit is free in`)
        const calls = await mockThemeApi(page)
        const panel = await open(page, { plan: 'free', file, saved: false })
        await pick(page, panel, name)
        await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
        await expect(dockStatus(panel)).toHaveText('Pro unlocks this file.')
        await expect(panel.locator('.xd-theme-lock'), 'the blurred preview carries its lock').toBeVisible()
        await primaryButton(panel).click()
        await expect(page).toHaveURL(/\/plans(\?|$)/)
        expect(calls, 'a free account never asks the route for a Pro file').toHaveLength(0)
      })
    }
  }

  for (const file of Object.keys(FILES)) {
    test(`a Pro account on ${file}: starts on Presentation, no tier words anywhere, every theme can be exported`, async ({ page }) => {
      watch(page, `a Pro account on ${file}`)
      const panel = await open(page, { plan: 'pro', file })
      await expect(themeName(panel)).toHaveText('Presentation')
      await expect(themeTier(panel)).toHaveCount(0)
      await openList(page, panel)
      expect((await list(page).locator('.xd-theme-opt-r').allTextContents()).join('').trim(), 'no Free or Pro words in the list').toBe('')
      await expect(panel.locator('.xd-theme-lock')).toHaveCount(0)
      for (const name of ['Specification', 'Blueprint']) {
        await option(page, name).click()
        await expect(primaryButton(panel)).toHaveText(FILES[file].label)
        await expect(primaryButton(panel)).toBeEnabled()
        await change(panel).click()
      }
    })
  }

  test('the Theme step is on the UI kit, the book and the slides, and on no other file', async ({ page }) => {
    watch(page, 'a Pro account looking for the Theme step on each file')
    const panel = await open(page, { plan: 'pro', file: 'kit' })
    for (const file of Object.keys(FILES)) {
      await chooseFormat(panel, file)
      await expect(panel.getByRole('heading', { name: 'Theme', level: 3 }), file).toBeVisible()
    }
    for (const file of ['book-png', 'html', 'css', 'json']) {
      await chooseFormat(panel, file)
      await expect(panel.getByRole('heading', { name: 'Theme', level: 3 }), file).toHaveCount(0)
      await expect(change(panel), file).toHaveCount(0)
    }
  })
})

/* ── keyboard ────────────────────────────────────────────────────────────── */

// On a wide window the open list is a popover and on a phone a sheet; both take focus when they open, so the keys reach the list.
const WIDTHS = [
  { name: 'wide', size: { width: 1440, height: 900 } },
  { name: 'phone', size: { width: 390, height: 844 } },
]
for (const { name: where, size } of WIDTHS) test.describe(`keyboard, ${where}`, () => {
  test('Change opens the list on the chosen theme; arrows, Home and End move, Enter keeps it and gives focus back to Change', async ({ page }) => {
    watch(page, 'a keyboard user choosing a theme')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await change(panel).focus()
    await expect(change(panel)).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Enter')
    await expect(list(page)).toBeVisible()
    await expect(change(panel)).toHaveAttribute('aria-expanded', 'true')
    await expect(list(page), 'the list takes focus').toBeFocused()
    expect(await activeName(page), 'it opens on the chosen theme').toBe('Standards')

    await page.keyboard.press('ArrowDown')
    expect(await activeName(page)).toBe('Catalogue')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    expect(await activeName(page)).toBe('Broadsheet')
    await page.keyboard.press('Home')
    expect(await activeName(page), 'Home').toBe('Presentation')
    await page.keyboard.press('ArrowUp')
    expect(await activeName(page), 'the top end holds still').toBe('Presentation')
    await page.keyboard.press('End')
    expect(await activeName(page), 'End').toBe('In use')
    await page.keyboard.press('ArrowDown')
    expect(await activeName(page), 'the bottom end holds still').toBe('In use')
    expect(await option(page, 'In use').evaluate((el) => el.classList.contains('is-active'))).toBe(true)

    await page.keyboard.press('Enter')
    await expect(list(page)).toHaveCount(0)
    await expect(themeName(panel)).toHaveText('In use')
    await expect(change(panel)).toBeFocused()
    await expect(change(panel)).toHaveAttribute('aria-expanded', 'false')
    await expect(change(panel)).toHaveAccessibleName('Change theme, current In use')
    await expect(exportPanel(page), 'the dialog stays open').toBeVisible()
  })

  test('Escape closes the list, keeps the earlier theme, returns focus to Change and leaves the dialog open', async ({ page }) => {
    watch(page, 'a keyboard user backing out of the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await change(panel).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('End')
    expect(await activeName(page)).toBe('In use')
    await page.keyboard.press('Escape')
    await expect(list(page)).toHaveCount(0)
    await expect(themeName(panel), 'nothing was chosen').toHaveText('Standards')
    await expect(change(panel)).toBeFocused()
    await expect(exportPanel(page), 'the first Escape closes the list, not the dialog').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(exportPanel(page), 'the next Escape closes the dialog').toHaveCount(0)
  })

  test('Space chooses like Enter and closes the list', async ({ page }) => {
    watch(page, 'a keyboard user using Space in the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await change(panel).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space')
    await expect(themeName(panel), 'two rows below Standards').toHaveText('Studio')
    await expect(list(page), 'choosing closes the list').toHaveCount(0)
  })

  // The popover leaves Change reachable, so Change toggles it. The phone's sheet covers the whole dialog (its own close button
  // is exercised below), so a second tap on Change cannot land there.
  if (where === 'wide') test('Change opens the list and a second press shuts it', async ({ page }) => {
    watch(page, 'a pointer user toggling the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await change(panel).click()
    await expect(list(page)).toBeVisible()
    await change(panel).click()
    await expect(list(page)).toHaveCount(0)
  })

  if (where === 'wide') test('highlighting a row fetches and previews that theme, and Escape puts the chosen theme back', async ({ page }) => {
    watch(page, 'a keyboard user previewing themes')
    const fetched = []
    page.on('request', (req) => { const m = /\/export-themes\/([\w-]+)\.webp/.exec(req.url()); if (m) fetched.push(m[1]) })
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    const shot = panel.locator('.xd-theme-stage img').first()
    await expect(shot).toHaveAttribute('alt', /^Standards theme UI kit/)
    await change(panel).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => fetched, 'the next theme’s pictures are asked for on focus').toContain('05-specimen-kitScreen')
    await expect(shot, 'the preview follows the highlighted row once its pictures are in').toHaveAttribute('alt', /^Catalogue theme UI kit/)
    await page.keyboard.press('Escape')
    await expect(shot).toHaveAttribute('alt', /^Standards theme UI kit/)
  })

  test('Tab leaves the list and closes it without choosing', async ({ page }) => {
    watch(page, 'a keyboard user tabbing out of the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await change(panel).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('End')
    await page.keyboard.press('Tab')
    await expect(list(page)).toHaveCount(0)
    await expect(themeName(panel)).toHaveText('Standards')
  })
})

/* ── where the list opens ────────────────────────────────────────────────── */

test.describe('popover and sheet', () => {
  test('at 1440 the list is a 320px popover over the dialog with its right edge on Change, and the preview sits above the Theme step', async ({ page }) => {
    watch(page, 'a designer on a wide window opening the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size: { width: 1440, height: 900 } })
    await openList(page, panel)
    await expect(page.locator('.xd-theme-sheet')).toHaveCount(0)
    const box = await page.evaluate(() => {
      const pop = document.querySelector('.xd-theme-pop').getBoundingClientRect()
      const btn = document.querySelector('.xd-theme-change').getBoundingClientRect()
      const card = document.querySelector('.xd-card').getBoundingClientRect()
      return { width: pop.width, right: pop.right, btnRight: btn.right, top: pop.top, bottom: pop.bottom, btnTop: btn.top, btnBottom: btn.bottom, card: { l: card.left, r: card.right, t: card.top, b: card.bottom } }
    })
    expect(box.width).toBe(320)
    expect(Math.abs(box.right - box.btnRight), 'right edges line up').toBeLessThanOrEqual(2)
    expect(box.top, 'inside the dialog').toBeGreaterThanOrEqual(box.card.t)
    expect(box.bottom).toBeLessThanOrEqual(box.card.b)
    expect(box.top >= box.btnBottom || box.bottom <= box.btnTop, 'it does not cover Change').toBe(true)
    const order = await page.evaluate(() => {
      const prev = document.querySelector('.xd-prev').getBoundingClientRect()
      const step = document.querySelector('.xd-theme').getBoundingClientRect()
      const file = [...document.querySelectorAll('.xd-step-l')].find((h) => h.textContent === 'File').getBoundingClientRect()
      return { previewAboveTheme: prev.top < step.top, themeAboveFile: step.top < file.top }
    })
    expect(order).toEqual({ previewAboveTheme: true, themeAboveFile: true })
    await page.mouse.click(5, 5)
    await expect(list(page), 'a click outside closes it').toHaveCount(0)
  })

  test('at 390 the list is a "Theme" sheet with 52px rows, the Theme step comes before the preview, and a row closes the sheet', async ({ page }) => {
    watch(page, 'a phone user choosing a theme')
    const panel = await open(page, { plan: 'free', file: 'kit', size: { width: 390, height: 844 } })
    const order = await page.evaluate(() => {
      const prev = document.querySelector('.xd-prev').getBoundingClientRect()
      const step = document.querySelector('.xd-theme').getBoundingClientRect()
      return { themeBeforePreview: step.top < prev.top }
    })
    expect(order, 'on a phone Change is in view before the pages').toEqual({ themeBeforePreview: true })
    await openList(page, panel)
    await expect(page.locator('.xd-theme-pop')).toHaveCount(0)
    const sheet = page.locator('.xd-theme-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('heading', { name: 'Theme', level: 3 })).toBeVisible()
    const rows = await list(page).locator('.xd-theme-opt').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(rows).toHaveLength(10)
    for (const h of rows) expect(h, 'a phone row is 52px').toBeGreaterThanOrEqual(52)
    const fit = await page.evaluate(() => {
      const s = document.querySelector('.xd-theme-sheet').getBoundingClientRect()
      return { left: s.left, right: s.right, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth }
    })
    expect(fit.left).toBeGreaterThanOrEqual(0)
    expect(fit.right).toBeLessThanOrEqual(390)
    expect(fit.sideways).toBe(false)

    await option(page, 'Specification').click()
    await expect(sheet).toHaveCount(0)
    await expect(themeName(panel)).toHaveText('Specification')
    await expect(change(panel)).toBeFocused()
  })

  test('at 390 the sheet’s close button and Escape close only the sheet and give focus back to Change', async ({ page }) => {
    watch(page, 'a phone user closing the theme sheet')
    const panel = await open(page, { plan: 'free', file: 'kit', size: { width: 390, height: 844 } })
    await openList(page, panel)
    await page.getByRole('button', { name: 'Close theme list' }).click()
    await expect(page.locator('.xd-theme-sheet')).toHaveCount(0)
    await expect(themeName(panel), 'closing is not choosing').toHaveText('Standards')
    await expect(change(panel)).toBeFocused()
    await expect(exportPanel(page)).toBeVisible()

    await openList(page, panel)
    await page.keyboard.press('End')
    await page.keyboard.press('Escape')
    await expect(page.locator('.xd-theme-sheet')).toHaveCount(0)
    await expect(themeName(panel)).toHaveText('Standards')
    await expect(change(panel)).toBeFocused()
    await expect(exportPanel(page), 'Escape closes the sheet, not the dialog').toBeVisible()
  })
})

/* ── downloads: the request, the zip name ───────────────────────────────── */

test.describe('what is asked for and what is saved', () => {
  const zipCases = [
    ['free', 'kit', 'Standards', '04-standards'],
    ['free', 'kit', 'Specification', '07-spec'],
    ['pro', 'kit', 'Studio', '06-studio'],
    ['pro', 'book-html', 'Blueprint', '09-blueprint'],
    ['pro', 'guidelines-html', 'Riso', '08-monograph'],
  ]
  for (const [plan, file, name, id] of zipCases) {
    test(`${plan}: ${file} in ${name} asks for { theme: ${id}, row: ${FILES[file].row}, format: ${FILES[file].format} } and saves harbour-${FILES[file].zip}-${id}.zip`, async ({ page }) => {
      watch(page, `a ${plan} account downloading ${file} in ${name}`)
      // The server names its own zip; the dialog lists, and saves, the name it shows.
      const calls = await mockThemeApi(page, async () => ({ zip: await tinyZip(), name: 'p-harbour-something-else.zip' }))
      const panel = await open(page, { plan, file })
      await pick(page, panel, name)
      const saved = `harbour-${FILES[file].zip}-${id}.zip`
      await expect(panel.locator('.xd-man-row[aria-current="true"] .xd-man-n'), 'the file list names it before the click').toHaveText(saved)
      const [download] = await Promise.all([page.waitForEvent('download'), primaryButton(panel).click()])
      expect(download.suggestedFilename()).toBe(saved)
      expect(calls).toHaveLength(1)
      expect(calls[0].method).toBe('POST')
      expect(calls[0].auth).toMatch(/^Bearer .+/)
      expect(calls[0].body).toMatchObject({ theme: id, row: FILES[file].row, format: FILES[file].format, projectName: 'Harbour' })
      expect(calls[0].body.design, 'the project’s design travels with it').toBeTruthy()
      await expect(dockStatus(panel)).toContainText(saved)
      await expect(primaryButton(panel)).toHaveText('Export again')
    })
  }

  const badZips = [
    ['a file name with a path in it', { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="../evil name.zip"' }, true],
    ['no file name', { 'Content-Type': 'application/zip' }, true],
    ['no bytes', { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="p-harbour.zip"' }, false],
  ]
  for (const [what, headers, withBytes] of badZips) {
    test(`a zip answer with ${what} is refused with the fixed build line, and nothing is saved`, async ({ page }) => {
      watch(page, `a Pro account whose answer has ${what}`)
      let downloads = 0
      page.on('download', () => { downloads += 1 })
      const bytes = withBytes ? await tinyZip() : Buffer.alloc(0)
      await page.route('**/api/ai?export=document', (route) => route.fulfill({ status: 200, headers, body: bytes }))
      const panel = await open(page, { plan: 'pro', file: 'kit' })
      await primaryButton(panel).click()
      await expect(dockError(panel)).toHaveText('That file didn’t build. Try again.')
      expect(downloads).toBe(0)
    })
  }

  test('changing the theme clears an error from the last try', async ({ page }) => {
    watch(page, 'a Pro account retrying with another theme')
    await mockThemeApi(page, () => ({ status: 500, body: {} }))
    const panel = await open(page, { plan: 'pro', file: 'kit' })
    await primaryButton(panel).click()
    await expect(dockError(panel)).toBeVisible()
    await pick(page, panel, 'Studio')
    await expect(dockError(panel)).toHaveCount(0)
  })

  for (const file of ['book', 'guidelines']) {
    test(`Pro: ${file} as PDF asks for { row: ${FILES[file].row}, format: pdf } and opens the document in a print window, saving no file`, async ({ page, context }) => {
      watch(page, `a Pro account printing ${file}`)
      await context.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed += 1 } })
      let downloads = 0
      page.on('download', () => { downloads += 1 })
      const calls = await mockThemeApi(page, () => ({ html: cleanHtml('Harbour brand book') }))
      const panel = await open(page, { plan: 'pro', file })
      await pick(page, panel, 'Broadsheet')
      await expect(panel.locator('.xd-man-row[aria-current="true"] .xd-man-n'), 'a print row lists no file name').toHaveText('Print document')
      const [popup] = await Promise.all([context.waitForEvent('page'), primaryButton(panel).click()])
      await expect(popup.locator('#printed-doc')).toHaveText('Harbour brand book')
      await expect.poll(() => popup.evaluate(() => window.__printed), 'print() is called once the document is in').toBe(1)
      expect(await popup.locator('script').count(), 'the printed document carries no script').toBe(0)
      expect(calls[0].body).toMatchObject({ theme: '03-broadsheet', row: FILES[file].row, format: 'pdf' })
      expect(downloads).toBe(0)
      expect(await page.evaluate(() => window.__pwned), 'nothing in the document ran').toBeUndefined()
    })
  }
})

/* ── a print document the dialog will not write into a window ───────────── */

test.describe('a print document that is not the script-free one is refused', () => {
  const CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'">'
  const refused = [
    ['a script element', `<!doctype html><html><head>${CSP}</head><body><script>window.opener.__pwned = 1</script>Sample</body></html>`],
    ['a script element in capitals with attributes', `<!doctype html><html><head>${CSP}</head><body><SCRIPT type="text/javascript">window.opener.__pwned = 1</SCRIPT></body></html>`],
    ['an inline event handler', `<!doctype html><html><head>${CSP}</head><body><img src="x" onerror="window.opener.__pwned = 1"></body></html>`],
    ['an inline handler after a newline', `<!doctype html><html><head>${CSP}</head><body><a\nonclick="window.opener.__pwned = 1">x</a></body></html>`],
    ['no Content-Security-Policy meta', '<!doctype html><html><head><title>x</title></head><body>Sample</body></html>'],
    ['the policy meta second in the head', `<!doctype html><html><head><title>x</title>${CSP}</head><body>Sample</body></html>`],
    ['an empty document', ''],
  ]
  for (const [what, html] of refused) {
    test(`${what}: the window is closed, the line says it did not build, and the document never ran`, async ({ page, context }) => {
      watch(page, `a Pro account whose answer has ${what}`)
      await mockThemeApi(page, () => ({ html }))
      const panel = await open(page, { plan: 'pro', file: 'book' })
      const popupP = context.waitForEvent('page')
      await primaryButton(panel).click()
      const popup = await popupP
      await expect(dockError(panel)).toHaveText('That file didn’t build. Try again.')
      await expect.poll(() => popup.isClosed(), 'the reserved window is closed again').toBe(true)
      expect(await page.evaluate(() => window.__pwned), 'no part of the refused document ran').toBeUndefined()
      await expect(exportPanel(page), 'the dialog stays open for another try').toBeVisible()
    })
  }

  const mismatched = [['theme', { theme: '01-presentation' }], ['row', { row: 'slides' }], ['format', { format: 'html' }], ['ok flag', { ok: false }]]
  for (const [what, json] of mismatched) {
    test(`an answer for another ${what} is refused even though its document is clean`, async ({ page, context }) => {
      watch(page, `a Pro account whose answer has the wrong ${what}`)
      await mockThemeApi(page, () => ({ html: cleanHtml(), json }))
      const panel = await open(page, { plan: 'pro', file: 'book' })
      await pick(page, panel, 'Broadsheet')
      const popupP = context.waitForEvent('page')
      await primaryButton(panel).click()
      const popup = await popupP
      await expect(dockError(panel)).toHaveText('That file didn’t build. Try again.')
      await expect.poll(() => popup.isClosed()).toBe(true)
    })
  }

  test('CONTROL: the clean document is the one that opens', async ({ page, context }) => {
    watch(page, 'a Pro account with a clean document')
    await context.addInitScript(() => { window.print = () => {} })
    await mockThemeApi(page, () => ({ html: cleanHtml('Control') }))
    const panel = await open(page, { plan: 'pro', file: 'book' })
    const [popup] = await Promise.all([context.waitForEvent('page'), primaryButton(panel).click()])
    await expect(popup.locator('#printed-doc')).toHaveText('Control')
    await expect(dockError(panel)).toHaveCount(0)
  })
})

/* ── every refusal has one fixed line ───────────────────────────────────── */

const LEAK = 'SERVER-WORDS-MUST-NOT-SHOW'
const LINES = {
  signedOut: 'You’re signed out. Sign in again, then export.',
  unknown: 'That theme or file isn’t available. Pick another and try again.',
  invalid: 'This project can’t be exported yet. Check its colours and fonts, then try again.',
  pro: 'We couldn’t find a Pro plan on this account, so this file wasn’t made.',
  large: 'This design is too large to export. Try a smaller logo.',
  rate: 'Too many exports just now. Try again in a minute.',
  build: 'That file didn’t build. Try again.',
  network: 'The file couldn’t be made. Check your connection and try again.',
}

test.describe('the error line for each answer', () => {
  const leaky = (extra) => ({ error: LEAK, message: LEAK, detail: LEAK, ...extra })
  const cases = [
    ['401 (after the token is refreshed and refused again)', { status: 401, body: leaky({ code: 'auth_required' }) }, LINES.signedOut],
    ['400 with no code', { status: 400, body: leaky() }, LINES.unknown],
    ['400 unknown_theme', { status: 400, body: leaky({ code: 'unknown_theme' }) }, LINES.unknown],
    ['400 unknown_row', { status: 400, body: leaky({ code: 'unknown_row' }) }, LINES.unknown],
    ['400 unknown_format', { status: 400, body: leaky({ code: 'unknown_format' }) }, LINES.unknown],
    ['400 invalid_project', { status: 400, body: leaky({ code: 'invalid_project' }) }, LINES.invalid],
    ['403 pro_required', { status: 403, body: leaky({ code: 'pro_required' }) }, LINES.pro],
    ['403 with no code', { status: 403, body: leaky() }, LINES.pro],
    ['413', { status: 413, body: leaky({ code: 'design_too_large' }) }, LINES.large],
    ['413 with a body that is not JSON', { status: 413, body: LEAK }, LINES.large],
    ['429 with no Retry-After', { status: 429, body: leaky({ code: 'rate_limited' }) }, LINES.rate],
    ['500', { status: 500, body: leaky() }, LINES.build],
    ['500 build_failed', { status: 500, body: leaky({ code: 'build_failed' }) }, LINES.build],
    ['502 with an HTML body', { status: 502, body: `<html>${LEAK}</html>` }, LINES.build],
    ['503 from the platform', { status: 503, body: leaky() }, LINES.build],
  ]
  for (const [what, answer, line] of cases) {
    test(`${what}: "${line}", and none of the server’s words`, async ({ page }) => {
      watch(page, `a Pro account getting ${what}`)
      const calls = await mockThemeApi(page, () => answer)
      const panel = await open(page, { plan: 'pro', file: 'kit' })
      await primaryButton(panel).click()
      await expect(dockError(panel)).toHaveText(line)
      await expect(dockError(panel)).toHaveAttribute('role', 'alert')
      expect(await page.locator('body').innerText(), 'the server’s own text is never shown').not.toContain(LEAK)
      if (answer.status === 401) expect(calls, 'one retry with a fresh token, then give up').toHaveLength(2)
      await expect(primaryButton(panel), 'the person can try again').toBeEnabled()
    })
  }

  test('a connection that fails shows the connection line', async ({ page }) => {
    watch(page, 'a Pro account with no connection')
    await page.route('**/api/ai?export=document', (route) => route.abort('connectionrefused'))
    const panel = await open(page, { plan: 'pro', file: 'kit' })
    await primaryButton(panel).click()
    await expect(dockError(panel)).toHaveText(LINES.network)
  })

  test('the PDF rows show the same lines, and close the window they reserved', async ({ page, context }) => {
    watch(page, 'a Pro account getting a refusal on a print row')
    await mockThemeApi(page, () => ({ status: 403, body: leaky({ code: 'pro_required' }) }))
    const panel = await open(page, { plan: 'pro', file: 'guidelines' })
    const popupP = context.waitForEvent('page')
    await primaryButton(panel).click()
    const popup = await popupP
    await expect(dockError(panel)).toHaveText(LINES.pro)
    await expect.poll(() => popup.isClosed()).toBe(true)
  })

  test.describe('429 and Retry-After', () => {
    const seconds = [['30', 'Too many exports just now. Try again in 30 seconds.'], ['2', 'Too many exports just now. Try again in 2 seconds.'], ['89', 'Too many exports just now. Try again in 89 seconds.'], ['1', 'Too many exports just now. Try again in 1 second.']]
    for (const [header, line] of seconds) {
      test(`Retry-After ${header} shows the seconds`, async ({ page }) => {
        watch(page, `a Pro account told to wait ${header} seconds`)
        await mockThemeApi(page, () => ({ status: 429, headers: { 'Retry-After': header }, body: leaky({ code: 'rate_limited' }) }))
        const panel = await open(page, { plan: 'pro', file: 'kit' })
        await primaryButton(panel).click()
        await expect(dockError(panel)).toHaveText(line)
        expect(await page.locator('body').innerText()).not.toContain(LEAK)
      })
    }

    // Not whole seconds, or not seconds worth printing: the plain "in a minute" line, with no number.
    const notSeconds = ['', 'abc', '2.5', '-5', '+5', '1e1', '0x10', '5.0', '0', '120', '601', 'Wed, 21 Oct 2026 07:28:00 GMT', '30 seconds', 'NaN', 'Infinity']
    for (const header of notSeconds) {
      test(`a Retry-After that is not whole seconds (${JSON.stringify(header)}) gives the line with no number`, async ({ page }) => {
        watch(page, `a Pro account sent Retry-After ${JSON.stringify(header)}`)
        await mockThemeApi(page, () => ({ status: 429, headers: header ? { 'Retry-After': header } : {}, body: leaky({ code: 'rate_limited' }) }))
        const panel = await open(page, { plan: 'pro', file: 'kit' })
        await primaryButton(panel).click()
        await expect(dockError(panel)).toHaveText(LINES.rate)
        expect(await page.locator('body').innerText()).not.toContain(LEAK)
      })
    }
  })
})
