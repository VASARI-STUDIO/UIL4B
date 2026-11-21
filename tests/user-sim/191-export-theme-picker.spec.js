// THE EXPORT DIALOG'S TEMPLATES.
//
// The UI kit and the book (PDF and HTML) take any template in the THEMES list below; the slides (PDF and HTML) take those and two more,
// Label and Swiss Field, which draw the guidelines only. The templates are a grid inside the dialog, opened by "View templates" and
// left by choosing a card or "Back to preview": one card per template, its picture, its name and its sample brand. A free account
// sees the templates it can export first, and the Pro ones carry a Pro mark; a Pro account, or one whose plan is still being read, sees
// one plain list. A free account can have the UI kit in Standards (for now) and the guidelines in Label and Swiss Field; every other
// card and file is Pro, and the dock says so with a way out ("Use the free ..."). The files come from POST /api/ai?export=document,
// which every test here answers itself (export-theme-mock.js), so what is checked is what the dialog asks for, what it does with each
// answer, and what a person reads.
//
// Expected names, templates and copy are written out here, not read from src/, so a reworded button or a moved template fails the spec.
//
// MUTATIONS (each break must fail the group named after it):
//   - isThemeExportPro answers false for every theme          -> "a free account ... stays locked" (book, slides) and the kit's Pro templates
//   - isPrintSafe returns true                                -> "a print document that is not the script-free one is refused"
//   - the Retry-After seconds are read with parseFloat        -> "a Retry-After that is not whole seconds"
//   - the grid lists the cards in the theme list's own order  -> "a free account ... Free first" (the free cards stay in place)
//   - the Pro mark is drawn on every card, or on none         -> "the Pro mark matches the dock"
//   - the grid reads the UI kit's free rule for every file    -> "the Pro mark matches the dock" (guidelines, book)
//   - isThemeExportPro ignores a theme's own free flag        -> "free, guidelines in Label" and the free guidelines downloads
//   - the picker lists every theme for every file             -> "Label and Swiss Field are not offered for the UI kit or the book"
//   - choosing a card leaves the grid open                    -> "keyboard" (Space and Enter) and "the grid is in the dialog"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { chooseFormat, chooseTemplate, exportPanel, openDetails, openTemplates, primaryButton, dockStatus, dockError, readTemplates, templateCard } from './export-rows.js'
import { mockThemeApi, cleanHtml, tinyZip, printedDoc, printedCount } from './export-theme-mock.js'
import { MOTION_SETTINGS, MOTION_WIDTHS, motionState, chooseThemeWithKeys } from './export-reduced-motion.js'

const ROUTE = '/projects/harbour/export'

// The templates in the grid's order (a count in a message below is THEMES.length, never a word), and which of them a free account has the UI kit in.
const THEMES = [
  ['01-presentation', 'Presentation'], ['02-poster', 'Ticket'], ['03-broadsheet', 'Broadsheet'], ['04-standards', 'Standards'],
  ['05-specimen', 'Catalogue'], ['06-studio', 'Studio'], ['07-spec', 'Specification'], ['08-monograph', 'Riso'],
  ['09-blueprint', 'Blueprint'], ['10-inuse', 'In use'], ['21-presentation', 'Keynote'], ['22-ticket', 'Stub'],
  ['23-broadsheet', 'Front Page'], ['24-standards', 'Standards Plate'], ['26-notebook', 'Notebook'], ['28-riso', 'Print Shop'], ['29-blueprint', 'Drawing Sheet'],
  ['30-fluted', 'Fluted'], ['31-contact', 'Contact'], ['32-dieline', 'Dieline'],
]
const NAMES = THEMES.map(([, name]) => name)
const FREE_KIT = ['Standards']
// The guidelines list: every template above, then the two guidelines-only templates, which are free.
const GUIDE_NAMES = [...NAMES, 'Label', 'Swiss Field']
const FREE_GUIDE = ['Label', 'Swiss Field']
const GUIDE_LOCK = 'Pro theme. The guidelines are free in Label and Swiss Field.'
const isGuide = (file) => file.startsWith('guidelines')
const namesFor = (file) => (isGuide(file) ? GUIDE_NAMES : NAMES)
const freeFor = (file) => (file === 'kit' ? FREE_KIT : isGuide(file) ? FREE_GUIDE : [])

/** The card names in the order the grid shows them: a free account sees the templates it can export first; a Pro account the plain list. */
const cardsFor = (file, free) => {
  const names = namesFor(file)
  if (!free) return names
  const ok = freeFor(file)
  return [...names.filter((n) => ok.includes(n)), ...names.filter((n) => !ok.includes(n))]
}
/** The names that carry the Pro mark: for a free account every template the file is not free in; for a Pro account none. */
const proFor = (file, free) => (free ? namesFor(file).filter((n) => !freeFor(file).includes(n)) : [])

// The files the templates belong to: what the dialog calls them, the row and format the route is asked for, and the zip they save as.
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
  // A pointer left over a card would highlight it under the cursor.
  await page.mouse.move(0, 0)
  return panel
}

// The templates grid, opened by "View templates": one button card per template, the chosen one aria-pressed.
const grid = (panel) => panel.locator('.xd-tpl-grid')
const cards = (panel) => grid(panel).locator('.xd-tpl-card')
const pressed = (panel) => grid(panel).locator('.xd-tpl-card[aria-pressed="true"]')
/** The template in use, read the way a person does: open the grid, see which card is chosen, go back to the preview. */
const chosenName = async (panel) => (await readTemplates(panel)).chosen
const expectChosen = (panel, name, message) => expect.poll(() => chosenName(panel), { message }).toEqual([name])
/** The first picture or live page on the stage, named for its template ("Catalogue theme, ..." or "Catalogue ... page, with your brand"). */
const stageName = (panel) => panel.locator('.xd-box img, .xd-box iframe').first().evaluate((el) => el.getAttribute('alt') || el.getAttribute('title') || '')
const expectStage = (panel, name, message) => expect.poll(() => stageName(panel), { message }).toMatch(new RegExp(`^${name}\\b`))

/** Choose a template from the grid and check the dialog went back to the preview with it chosen. */
async function pick(panel, name) {
  await chooseTemplate(panel, name)
  await expect(grid(panel), 'choosing a card returns to the preview').toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'View templates' })).toBeVisible()
  await expectChosen(panel, name)
}

/* ── Free and Pro, per template and per file ─────────────────────────────── */

test.describe('Free and Pro', () => {
  test(`a free account sees the UI kit open in Standards, the free card first, and the Pro mark on the other ${THEMES.length - 1}`, async ({ page }) => {
    watch(page, 'a free account reading the templates for the UI kit')
    const panel = await open(page, { plan: 'free', file: 'kit' })
    const read = await readTemplates(panel)
    expect(read.chosen, 'a free account starts on a template it can have').toEqual(['Standards'])
    expect(read.names, `the free template first, then the ${THEMES.length - 1} in Pro`).toEqual(cardsFor('kit', true))
    expect(read.pro, 'the Pro mark is on every template the kit is not free in').toEqual(proFor('kit', true))
    expect(read.pro).toHaveLength(THEMES.length - 1)
  })

  for (const name of FREE_KIT) {
    test(`free, UI kit in ${name}: the button exports, with no lock`, async ({ page }) => {
      watch(page, `a free account on the UI kit in ${name}`)
      const panel = await open(page, { plan: 'free', file: 'kit' })
      await pick(panel, name)
      await expect(primaryButton(panel)).toHaveText('Export UI kit')
      await expect(dockStatus(panel)).toContainText('Free.')
      await expect(panel.locator('.xd-stage-pro')).toHaveCount(0)
      await expect(panel.locator('.xd-wayout'), 'a free file has no way out to offer').toHaveCount(0)
    })
  }

  for (const name of NAMES.filter((n) => !FREE_KIT.includes(n))) {
    test(`free, UI kit in ${name}: Pro, so the button reads Upgrade to Pro, a way out names the free kit, and nothing reaches the server`, async ({ page }) => {
      watch(page, `a free account on the UI kit in the Pro template ${name}`)
      const calls = await mockThemeApi(page)
      const panel = await open(page, { plan: 'free', file: 'kit' })
      await pick(panel, name)
      await expect(primaryButton(panel)).toHaveText('Upgrade to Pro')
      await expect(dockStatus(panel)).toHaveText('Pro theme. The UI kit is free in Standards. The guidelines are free in Label and Swiss Field.')
      await expect(panel.locator('.xd-wayout'), 'the free way back to the kit').toHaveText('Use the free UI kit (Standards)')
      await primaryButton(panel).click()
      await expect(page).toHaveURL(/\/(plans|checkout)(\?|$)/)
      expect(calls, 'a locked template never reaches the route').toHaveLength(0)
    })
  }

  test('the way out of a Pro kit template goes back to the free kit in Standards', async ({ page }) => {
    watch(page, 'a free account taking the way out of a Pro UI kit template')
    const panel = await open(page, { plan: 'free', file: 'kit' })
    await pick(panel, 'Studio')
    await panel.locator('.xd-wayout').click()
    await expect(primaryButton(panel)).toHaveText('Export UI kit')
    await expect(panel.locator('.xd-stage-pro')).toHaveCount(0)
    await expectChosen(panel, 'Standards', 'the free template is chosen again')
  })

  for (const file of ['book', 'book-html', 'guidelines', 'guidelines-html']) {
    for (const name of FREE_KIT) {
      test(`free, ${file} in ${name}: still Pro, because only the UI kit is free there`, async ({ page }) => {
        watch(page, `a free account on ${file} in ${name}, a template the UI kit is free in`)
        const calls = await mockThemeApi(page)
        const panel = await open(page, { plan: 'free', file, saved: false })
        await pick(panel, name)
        const read = await readTemplates(panel)
        expect(read.pro, 'the card says what the dock says').toContain(name)
        await expect(primaryButton(panel)).toHaveText('Upgrade to Pro')
        await expect(dockStatus(panel)).toHaveText(isGuide(file) ? GUIDE_LOCK : 'Pro unlocks this file.')
        await expect(panel.locator('.xd-stage-pro'), 'the sample preview carries its lock').toBeVisible()
        await expect(panel.locator('.xd-wayout'), 'and a way out to a free file').toHaveText(/^Use the free /)
        await primaryButton(panel).click()
        await expect(page).toHaveURL(/\/plans(\?|$)/)
        expect(calls, 'a free account never asks the route for a Pro file').toHaveLength(0)
      })
    }
  }

  for (const file of ['guidelines', 'guidelines-html']) {
    for (const name of FREE_GUIDE) {
      test(`free, ${file} in ${name}: the guidelines export with no lock`, async ({ page }) => {
        watch(page, `a free account on ${file} in ${name}, a guidelines-only template`)
        const panel = await open(page, { plan: 'free', file, saved: false })
        const read = await readTemplates(panel)
        expect(read.chosen, 'a free account starts on the first template the guidelines are free in').toEqual([FREE_GUIDE[0]])
        expect(read.pro, 'and Label and Swiss Field carry no Pro mark').toEqual(proFor(file, true))
        await pick(panel, name)
        await expect(primaryButton(panel)).toHaveText(FILES[file].label)
        await expect(dockStatus(panel)).toContainText('Free.')
        await expect(panel.locator('.xd-stage-pro')).toHaveCount(0)
      })
    }
  }

  test('Label and Swiss Field are not offered for the UI kit or the book', async ({ page }) => {
    watch(page, 'a Pro account reading the templates of each file')
    const panel = await open(page, { plan: 'pro', file: 'kit' })
    for (const file of Object.keys(FILES)) {
      await chooseFormat(panel, file)
      const read = await readTemplates(panel)
      expect(read.names, `${file}: the templates that can draw it`).toEqual(namesFor(file))
    }
  })

  // The card and the dock decide from the same file and template: the UI kit is free in one, the guidelines in the two guidelines-only
  // templates, and the book is Pro in every template (so every card of it carries the mark).
  for (const file of Object.keys(FILES)) {
    const freeTemplates = freeFor(file)
    const names = namesFor(file)
    test(`free, ${file}: the Pro mark matches the dock for every template, and the free ones come first`, async ({ page }) => {
      watch(page, `a free account reading the Pro mark of each template on ${file}`)
      const panel = await open(page, { plan: 'free', file, saved: file === 'kit' })
      const read = await readTemplates(panel)
      expect(read.names, 'a free account sees the templates it can export first').toEqual(cardsFor(file, true))
      expect(read.pro, 'the mark is on exactly the templates the file is Pro in').toEqual(proFor(file, true))
      for (const name of names) {
        const free = freeTemplates.includes(name)
        await pick(panel, name)
        await expect(primaryButton(panel), `${name}: the dock`).toHaveText(free ? FILES[file].label : 'Upgrade to Pro')
        if (file !== 'kit' && !free) await expect(panel.locator('.xd-stage-pro'), `${name}: the lock on the sample preview`).toBeVisible()
        if (free) await expect(panel.locator('.xd-stage-pro'), `${name}: no lock on a free file`).toHaveCount(0)
      }
    })
  }

  for (const file of Object.keys(FILES)) {
    test(`a Pro account on ${file}: starts on Presentation, one plain list with no Pro marks, every template can be exported`, async ({ page }) => {
      watch(page, `a Pro account on ${file}`)
      const panel = await open(page, { plan: 'pro', file })
      const read = await readTemplates(panel)
      expect(read.chosen).toEqual(['Presentation'])
      expect(read.names, 'the plain list, in the picker’s order').toEqual(cardsFor(file, false))
      expect(read.pro, 'no Pro marks for a Pro account').toEqual([])
      await expect(panel.locator('.xd-stage-pro')).toHaveCount(0)
      for (const name of ['Specification', 'Blueprint']) {
        await pick(panel, name)
        await expect(primaryButton(panel)).toHaveText(FILES[file].label)
        await expect(primaryButton(panel)).toBeEnabled()
      }
    })
  }

  test('View templates is on the UI kit, the book and the slides, and on no other file', async ({ page }) => {
    watch(page, 'a Pro account looking for the templates on each file')
    const panel = await open(page, { plan: 'pro', file: 'kit' })
    for (const file of Object.keys(FILES)) {
      await chooseFormat(panel, file)
      await expect(panel.getByRole('button', { name: 'View templates' }), file).toBeVisible()
    }
    for (const file of ['book-png', 'html', 'css', 'json']) {
      await chooseFormat(panel, file)
      await expect(panel.getByRole('button', { name: 'View templates' }), file).toHaveCount(0)
      await expect(grid(panel), file).toHaveCount(0)
    }
    await expect(panel.getByRole('heading', { name: 'Theme', level: 3 }), 'the old Theme step is gone').toHaveCount(0)
  })
})

/* ── keyboard ────────────────────────────────────────────────────────────── */

// Every card is a button, so each is a Tab stop; Space and Enter choose the focused one and the dialog goes back to the preview. The
// same grid is on a wide window and on a phone.
for (const { name: where, size } of MOTION_WIDTHS) test.describe(`keyboard, ${where}`, () => {
  test('every card is a Tab stop, and Tab walks the grid in order without choosing', async ({ page }) => {
    watch(page, 'a keyboard user tabbing through the templates')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await openTemplates(panel)
    expect(await cards(panel).count(), 'one card per template').toBe(THEMES.length)
    const tabIndexes = await cards(panel).evaluateAll((els) => els.map((e) => e.tabIndex))
    expect(tabIndexes.every((t) => t === 0), 'each card can be reached with Tab').toBe(true)
    await cards(panel).first().focus()
    await expect(cards(panel).first(), 'the free card is first').toContainText('Standards')
    await page.keyboard.press('Tab')
    await expect(cards(panel).nth(1), 'Tab goes to the next card').toBeFocused()
    await expect(cards(panel).nth(1)).toContainText('Presentation')
    await expect(pressed(panel), 'focus alone chooses nothing').toContainText('Standards')
    await expect(exportPanel(page), 'the dialog stays open').toBeVisible()
  })

  test('Escape leaves the dialog: there is no grid to close first', async ({ page }) => {
    watch(page, 'a keyboard user pressing Escape in the templates grid')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await openTemplates(panel)
    await cards(panel).first().focus()
    await page.keyboard.press('Escape')
    await expect(exportPanel(page), 'the first Escape closes the dialog').toHaveCount(0)
  })

  test('Space and Enter on a focused card choose it and go back to the preview', async ({ page }) => {
    watch(page, 'a keyboard user using Space and Enter on a template card')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await openTemplates(panel)
    await templateCard(panel, 'Studio').focus()
    await expect(pressed(panel), 'focus alone chooses nothing').toContainText('Standards')
    await page.keyboard.press('Space')
    await expect(grid(panel), 'a pick returns to the preview').toHaveCount(0)
    await expect(exportPanel(page)).toBeVisible()
    await expectChosen(panel, 'Studio')
    await openTemplates(panel)
    await templateCard(panel, 'Specification').focus()
    await page.keyboard.press('Enter')
    await expect(grid(panel)).toHaveCount(0)
    await expectChosen(panel, 'Specification')
  })

  test('each card shows its own thumbnail, and choosing a card changes the picture on the stage', async ({ page }) => {
    watch(page, 'a keyboard user previewing templates')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await expectStage(panel, 'Standards', 'the stage opens on the free template')
    await openTemplates(panel)
    const ids = await cards(panel).locator('img').evaluateAll((imgs) => imgs.map((i) => (/\/export-themes\/([\w-]+)-thumb\.webp$/.exec(i.getAttribute('src')) || [])[1]))
    const order = cardsFor('kit', true).map((n) => THEMES.find(([, name]) => name === n)[0])
    expect(ids, 'each card draws its own public thumbnail, in the grid’s order').toEqual(order)
    await templateCard(panel, 'Catalogue').focus()
    await page.keyboard.press('Enter')
    await expectStage(panel, 'Catalogue', 'choosing changes the stage at once')
    await chooseTemplate(panel, 'Standards')
    await expectStage(panel, 'Standards', 'and back')
  })

  test('Tab out of the grid stays in the dialog', async ({ page }) => {
    watch(page, 'a keyboard user tabbing past the last card')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await openTemplates(panel)
    await cards(panel).last().focus()
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.xd-card'))), 'focus stayed in the dialog').toBe(true)
    await expect(pressed(panel), 'and chose nothing').toContainText('Standards')
  })
})

/* ── reduced motion ──────────────────────────────────────────────────────── */

// Under reduced motion every property change gets a 0.01ms transition. The grid has to take keyboard focus and choose all the same,
// from either setting, on a wide window and on a phone.
for (const setting of MOTION_SETTINGS) for (const { name: where, size } of MOTION_WIDTHS) {
  test(`reduced motion (${setting.name}), ${where}: Tab from the chosen card reaches the next, and Enter chooses it`, async ({ page }) => {
    watch(page, `a keyboard user with reduced motion on, by ${setting.name}`)
    await setting.apply(page)
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    expect(await motionState(page), 'reduced motion is on').toMatchObject({ attribute: 'true' })
    await chooseThemeWithKeys(page, panel)
  })
}

/* ── where the grid sits ─────────────────────────────────────────────────── */

test.describe('the grid is in the dialog', () => {
  const measure = (page) => page.evaluate(() => {
    const g = document.querySelector('.xd-tpl-grid').getBoundingClientRect()
    const card = document.querySelector('.xd-card').getBoundingClientRect()
    const rows = [...document.querySelectorAll('.xd-tpl-card')].map((r) => Math.round(r.getBoundingClientRect().height))
    const dock = document.querySelector('.xd-dock').getBoundingClientRect()
    return {
      left: g.left, right: g.right, card: { l: card.left, r: card.right }, rows,
      dockOnScreen: dock.top >= 0 && dock.bottom <= window.innerHeight,
      sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })

  test(`at 1440 the ${THEMES.length} cards sit in the dialog, in the place of the preview, with the dock still in view`, async ({ page }) => {
    watch(page, 'a designer on a wide window reading the templates grid')
    const panel = await open(page, { plan: 'free', file: 'kit', size: { width: 1440, height: 900 } })
    await openTemplates(panel)
    await expect(page.locator('.xd-theme-pop, .xd-theme-sheet'), 'nothing opens over the dialog').toHaveCount(0)
    await expect(panel.locator('.xd-work'), 'the preview stage gives way to the grid').toHaveCount(0)
    const box = await measure(page)
    expect(box.rows, `${THEMES.length} cards`).toHaveLength(THEMES.length)
    for (const h of box.rows) expect(h, 'a card is a comfortable target').toBeGreaterThanOrEqual(44)
    expect(box.left, 'inside the dialog').toBeGreaterThanOrEqual(box.card.l)
    expect(box.right).toBeLessThanOrEqual(box.card.r)
    expect(box.dockOnScreen, 'the Upgrade and way-out buttons stay on screen').toBe(true)
    expect(box.sideways).toBe(false)
    await panel.getByRole('button', { name: 'Back to preview' }).click()
    await expect(grid(panel)).toHaveCount(0)
    await expect(panel.locator('.xd-work'), 'Back to preview returns the stage').toHaveCount(1)
  })

  test('at 390 the cards fit the phone, each is a 44px target, and picking one returns to the preview', async ({ page }) => {
    watch(page, 'a phone user choosing a template')
    const panel = await open(page, { plan: 'free', file: 'kit', size: { width: 390, height: 844 } })
    await openTemplates(panel)
    const fit = await measure(page)
    expect(fit.rows).toHaveLength(THEMES.length)
    for (const h of fit.rows) expect(h, 'a phone card is a 44px target').toBeGreaterThanOrEqual(44)
    expect(fit.left).toBeGreaterThanOrEqual(0)
    expect(fit.right).toBeLessThanOrEqual(390)
    expect(fit.sideways).toBe(false)
    const back = await panel.getByRole('button', { name: 'Back to preview' }).boundingBox()
    expect(back.height, 'Back to preview is a 44px target').toBeGreaterThanOrEqual(44)

    await templateCard(panel, 'Specification').click()
    await expect(exportPanel(page), 'choosing does not close the dialog').toBeVisible()
    await expect(grid(panel), 'a pick goes back to the preview').toHaveCount(0)
    await expectChosen(panel, 'Specification')
    await expect(dockError(panel)).toHaveCount(0)
  })
})

/* ── downloads: the request, the zip name ───────────────────────────────── */

test.describe('what is asked for and what is saved', () => {
  const zipCases = [
    ['free', 'kit', 'Standards', '04-standards'],
    ['pro', 'kit', 'Studio', '06-studio'],
    ['pro', 'book-html', 'Blueprint', '09-blueprint'],
    ['pro', 'guidelines-html', 'Riso', '08-monograph'],
    ['free', 'guidelines-html', 'Label', '25-label'],
    ['free', 'guidelines-html', 'Swiss Field', '27-swissfield'],
    ['pro', 'guidelines-html', 'Swiss Field', '27-swissfield'],
  ]
  for (const [plan, file, name, id] of zipCases) {
    test(`${plan}: ${file} in ${name} asks for { theme: ${id}, row: ${FILES[file].row}, format: ${FILES[file].format} } and saves harbour-${FILES[file].zip}-${id}.zip`, async ({ page }) => {
      watch(page, `a ${plan} account downloading ${file} in ${name}`)
      // The server names its own zip; the dialog lists, and saves, the name it shows.
      const calls = await mockThemeApi(page, async () => ({ zip: await tinyZip(), name: 'p-harbour-something-else.zip' }))
      const panel = await open(page, { plan, file })
      await pick(panel, name)
      const saved = `harbour-${FILES[file].zip}-${id}.zip`
      await expect((await openDetails(panel)).locator('.xd-man-row[aria-current="true"] .xd-man-n'), 'the file list names it before the click').toHaveText(saved)
      const [download] = await Promise.all([page.waitForEvent('download'), primaryButton(panel).click()])
      expect(download.suggestedFilename()).toBe(saved)
      expect(calls).toHaveLength(1)
      expect(calls[0].method).toBe('POST')
      expect(calls[0].auth).toMatch(/^Bearer .+/)
      expect(calls[0].body).toMatchObject({ theme: id, row: FILES[file].row, format: FILES[file].format, projectName: 'Harbour' })
      expect(calls[0].body.design, 'the project’s design travels with it').toBeTruthy()
      await expect(dockStatus(panel)).toContainText(saved)
      await expect(primaryButton(panel)).toHaveText('Done')
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
    await pick(panel, 'Studio')
    await expect(dockError(panel)).toHaveCount(0)
  })

  test('free: the guidelines in Label as PDF ask for { theme: 25-label, row: slides, format: pdf } and open a print window', async ({ page, context }) => {
    watch(page, 'a free account printing the guidelines in Label')
    await context.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed += 1 } })
    const calls = await mockThemeApi(page, () => ({ html: cleanHtml('Harbour brand guidelines') }))
    const panel = await open(page, { plan: 'free', file: 'guidelines' })
    await pick(panel, 'Label')
    const [popup] = await Promise.all([context.waitForEvent('page'), primaryButton(panel).click()])
    await expect(printedDoc(popup).locator('#printed-doc')).toHaveText('Harbour brand guidelines')
    await expect.poll(() => printedCount(popup)).toBe(1)
    expect(calls).toHaveLength(1)
    expect(calls[0].body).toMatchObject({ theme: '25-label', row: 'slides', format: 'pdf', projectName: 'Harbour' })
  })

  for (const file of ['book', 'guidelines']) {
    test(`Pro: ${file} as PDF asks for { row: ${FILES[file].row}, format: pdf } and opens the document in a print window, saving no file`, async ({ page, context }) => {
      watch(page, `a Pro account printing ${file}`)
      await context.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed += 1 } })
      let downloads = 0
      page.on('download', () => { downloads += 1 })
      const calls = await mockThemeApi(page, () => ({ html: cleanHtml('Harbour brand book') }))
      const panel = await open(page, { plan: 'pro', file })
      await pick(panel, 'Broadsheet')
      await expect((await openDetails(panel)).locator('.xd-man-row[aria-current="true"] .xd-man-n'), 'a print row lists no file name').toHaveText('Print document')
      const [popup] = await Promise.all([context.waitForEvent('page'), primaryButton(panel).click()])
      await expect(printedDoc(popup).locator('#printed-doc')).toHaveText('Harbour brand book')
      await expect.poll(() => printedCount(popup), 'print() is called once the document is in').toBe(1)
      expect(await printedDoc(popup).locator('script').count(), 'the printed document carries no script').toBe(0)
      expect(await popup.locator('script').count(), 'neither does the shell around it').toBe(0)
      const sandbox = await popup.locator('iframe').getAttribute('sandbox')
      expect(sandbox, 'the document sits in a sandboxed iframe').toBeTruthy()
      expect(sandbox.split(/\s+/), 'and the sandbox never allows scripts').not.toContain('allow-scripts')
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
    ['a form element', `<!doctype html><html><head>${CSP}</head><body><form action="https://evil.example/"><input name="a"></form>Sample</body></html>`],
    ['a form element in capitals with a newline after the name', `<!doctype html><html><head>${CSP}</head><body><FORM\naction="https://evil.example/"></FORM></body></html>`],
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
      await pick(panel, 'Broadsheet')
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
    await expect(printedDoc(popup).locator('#printed-doc')).toHaveText('Control')
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
    // A valid wait puts no number in the line (the button carries the one count); a wait of a minute or more reads m:ss on the button.
    const clock = (n) => (n >= 60 ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : `${n}s`)
    const seconds = ['30', '2', '89', '1', '90', '120']
    for (const header of seconds) {
      test(`Retry-After ${header} shows the wait on the button, not in the line`, async ({ page }) => {
        watch(page, `a Pro account told to wait ${header} seconds`)
        await mockThemeApi(page, () => ({ status: 429, headers: { 'Retry-After': header }, body: leaky({ code: 'rate_limited' }) }))
        const panel = await open(page, { plan: 'pro', file: 'kit' })
        await primaryButton(panel).click()
        await expect(dockError(panel)).toHaveText('Too many exports just now.')
        expect(await page.locator('body').innerText()).not.toContain(LEAK)
        // The button is aria-disabled while it counts (readable, not dimmed). (A 1 or 2 second wait can be over before it is read; the
        // test after this one follows a short wait through.)
        if (Number(header) >= 30) {
          const n = Number(header)
          await expect(primaryButton(panel), 'the button counts the wait down').toHaveText(new RegExp(`^Try again in (${clock(n)}|${clock(n - 1)})$`))
          await expect(primaryButton(panel), 'and ignores a press until it is over').toHaveAttribute('aria-disabled', 'true')
        }
      })
    }

    test('a 2 second wait: the button counts down, is disabled, then goes live with the file action again', async ({ page }) => {
      watch(page, 'a Pro account told to wait 2 seconds')
      const calls = await mockThemeApi(page, () => ({ status: 429, headers: { 'Retry-After': '2' }, body: leaky({ code: 'rate_limited' }) }))
      const panel = await open(page, { plan: 'pro', file: 'kit' })
      await primaryButton(panel).click()
      await expect(primaryButton(panel)).toHaveText(/^Try again in [12]s$/)
      await expect(primaryButton(panel)).toHaveAttribute('aria-disabled', 'true')
      await expect(primaryButton(panel), 'when the wait is over the button is the file action again').toHaveText('Export UI kit', { timeout: 6000 })
      await expect(primaryButton(panel)).toBeEnabled()
      await expect(primaryButton(panel)).not.toHaveAttribute('aria-disabled', 'true')
      await expect(dockError(panel), 'and the rate-limit line goes with the wait').toHaveCount(0)
      expect(calls, 'waiting asks the route for nothing').toHaveLength(1)
    })

    // Not whole seconds, or not a wait worth holding the button for (0, or over 600): the plain "in a minute" line, and the button not held.
    const notSeconds = ['', 'abc', '2.5', '-5', '+5', '1e1', '0x10', '5.0', '0', '601', 'Wed, 21 Oct 2026 07:28:00 GMT', '30 seconds', 'NaN', 'Infinity']
    for (const header of notSeconds) {
      test(`a Retry-After that is not whole seconds (${JSON.stringify(header)}) gives the line with no number`, async ({ page }) => {
        watch(page, `a Pro account sent Retry-After ${JSON.stringify(header)}`)
        await mockThemeApi(page, () => ({ status: 429, headers: header ? { 'Retry-After': header } : {}, body: leaky({ code: 'rate_limited' }) }))
        const panel = await open(page, { plan: 'pro', file: 'kit' })
        await primaryButton(panel).click()
        await expect(dockError(panel)).toHaveText(LINES.rate)
        expect(await page.locator('body').innerText()).not.toContain(LEAK)
        await expect(primaryButton(panel), 'no wait was asked for, so no count').toHaveText('Export UI kit')
        await expect(primaryButton(panel)).toBeEnabled()
      })
    }
  })
})
