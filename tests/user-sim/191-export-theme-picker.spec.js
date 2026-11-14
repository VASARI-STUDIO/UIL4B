// THE EXPORT DIALOG'S THEME STEP.
//
// The UI kit and the book (PDF and HTML) take one of ten themes; the slides (PDF and HTML) take those ten and two more, Label and
// Swiss Field, which draw the guidelines only. The Theme step is a list in the dialog, one row per theme, and nothing opens or
// closes: choosing a row changes the pictures at once. A free account sees the list in two groups, "Free" (the themes the file is
// free in) then "In Pro", with no row tagged one by one; a Pro account, or one whose plan is still being read, sees one plain
// list. A free account can have the UI kit in Standards (for now) and the guidelines in Label and Swiss Field; every other row
// and theme is Pro. The files come from POST /api/ai?export=document, which every test here answers itself
// (export-theme-mock.js), so what is checked is what the dialog asks for, what it does with each answer, and what a person reads.
//
// Expected names, themes and copy are written out here, not read from src/, so a reworded button or a moved theme fails the spec.
//
// MUTATIONS (each break must fail the group named after it; the built bundle was patched, see the run notes):
//   - isThemeExportPro answers false for every theme          -> "a free account ... stays locked" (book, slides) and the kit's Pro themes
//   - isPrintSafe returns true                                -> "a print document that is not the script-free one is refused"
//   - the Retry-After seconds are read with parseFloat        -> "a Retry-After that is not whole seconds"
//   - End moves to the second-last row                        -> "keyboard" (the arrows, Home and End)
//   - the arrows stop at the ends instead of wrapping         -> "keyboard" (the arrows, Home and End)
//   - the list asks for focus once, with no retry per frame   -> "reduced motion" at 1440 (both settings)
//   - the group reads the UI kit's free rule for every file   -> "the group a theme sits in matches the dock"
//   - isThemeExportPro ignores a theme's own free flag        -> "free, guidelines in Label" and the free guidelines downloads
//   - the picker lists every theme for every file             -> "Label and Swiss Field are not offered for the UI kit or the book"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { chooseFormat, exportPanel, primaryButton, dockStatus, dockError } from './export-rows.js'
import { mockThemeApi, cleanHtml, tinyZip } from './export-theme-mock.js'
import { MOTION_SETTINGS, MOTION_WIDTHS, motionState, chooseThemeWithKeys } from './export-reduced-motion.js'

const ROUTE = '/projects/harbour/export'

// The ten themes in the picker's order, and which of them a free account has the UI kit in.
const THEMES = [
  ['01-presentation', 'Presentation'], ['02-poster', 'Ticket'], ['03-broadsheet', 'Broadsheet'], ['04-standards', 'Standards'],
  ['05-specimen', 'Catalogue'], ['06-studio', 'Studio'], ['07-spec', 'Specification'], ['08-monograph', 'Riso'],
  ['09-blueprint', 'Blueprint'], ['10-inuse', 'In use'],
]
const NAMES = THEMES.map(([, name]) => name)
const FREE_KIT = ['Standards']
// The guidelines list: the ten, then the two guidelines-only themes, which are free.
const GUIDE_NAMES = [...NAMES, 'Label', 'Swiss Field']
const FREE_GUIDE = ['Label', 'Swiss Field']
const GUIDE_LOCK = 'Pro theme. The guidelines are free in Label and Swiss Field.'
const isGuide = (file) => file.startsWith('guidelines')
const namesFor = (file) => (isGuide(file) ? GUIDE_NAMES : NAMES)
const freeFor = (file) => (file === 'kit' ? FREE_KIT : isGuide(file) ? FREE_GUIDE : [])

/** The groups a list shows: a free account gets "Free" then "In Pro" (an empty one is left out); a Pro account one list with no heading. */
const groupsFor = (file, free) => {
  const names = namesFor(file)
  if (!free) return [{ heading: null, names }]
  const ok = freeFor(file)
  return [
    { heading: 'Free', names: names.filter((n) => ok.includes(n)) },
    { heading: 'In Pro', names: names.filter((n) => !ok.includes(n)) },
  ].filter((g) => g.names.length)
}

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
  // A pointer left over a row would highlight it under the cursor.
  await page.mouse.move(0, 0)
  return panel
}

// The Theme step: a radiogroup of rows, the chosen one aria-checked, grouped for an account that is not Pro.
const themes = (panel) => panel.getByRole('radiogroup', { name: 'Theme' })
const row = (panel, name) => themes(panel).getByRole('radio').filter({ hasText: new RegExp(`^${name}`) })
const chosenRow = (panel) => themes(panel).getByRole('radio', { checked: true })
const rowNames = (panel) => themes(panel).locator('.xd-theme-opt-n').allTextContents()
const groupsOf = (panel) => themes(panel).locator('.xd-theme-group').evaluateAll((groups) => groups.map((g) => ({
  heading: g.querySelector('.xd-theme-gh')?.textContent ?? null,
  names: [...g.querySelectorAll('.xd-theme-opt-n')].map((n) => n.textContent),
})))
/** The heading of the group the chosen theme sits in: "Free", "In Pro", or '' when the list has no groups. */
const tierOf = (panel) => chosenRow(panel).evaluate((el) => el.closest('.xd-theme-group')?.querySelector('.xd-theme-gh')?.textContent ?? '')
const expectTier = (panel, tier, message) => expect.poll(() => tierOf(panel), { message }).toBe(tier)
/** The names of the rows a keyboard can Tab to: one, the chosen one. */
const tabStops = (panel) => themes(panel).getByRole('radio').evaluateAll((els) => els.filter((e) => e.tabIndex === 0).map((e) => e.querySelector('.xd-theme-opt-n').textContent))

async function pick(panel, name) {
  await row(panel, name).click()
  await expect(chosenRow(panel)).toHaveText(new RegExp(`^${name}`))
}

/* ── Free and Pro, per row and per theme ─────────────────────────────────── */

test.describe('Free and Pro', () => {
  test('a free account sees the UI kit open in Standards, in a Free group, with the other nine in an In Pro group', async ({ page }) => {
    watch(page, 'a free account reading the theme list for the UI kit')
    const panel = await open(page, { plan: 'free', file: 'kit' })
    await expect(chosenRow(panel), 'a free account starts on a theme it can have').toHaveText(/^Standards/)
    await expectTier(panel, 'Free')
    expect(await groupsOf(panel), 'the free theme first, then the nine in Pro').toEqual(groupsFor('kit', true))
    expect(await rowNames(panel)).toEqual([...FREE_KIT, ...NAMES.filter((n) => !FREE_KIT.includes(n))])
    await expect(themes(panel).locator('.xd-pro, .xd-free, .xd-theme-opt-r'), 'the group is the tier: no row is tagged').toHaveCount(0)
  })

  for (const name of FREE_KIT) {
    test(`free, UI kit in ${name}: the button exports, with no lock`, async ({ page }) => {
      watch(page, `a free account on the UI kit in ${name}`)
      const panel = await open(page, { plan: 'free', file: 'kit' })
      await pick(panel, name)
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
      await pick(panel, name)
      await expectTier(panel, 'In Pro')
      await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
      await expect(dockStatus(panel)).toHaveText('Pro theme. The UI kit is free in Standards. The guidelines are free in Label and Swiss Field.')
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
        await pick(panel, name)
        await expectTier(panel, 'In Pro', 'the group says what the dock says')
        await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
        await expect(dockStatus(panel)).toHaveText(isGuide(file) ? GUIDE_LOCK : 'Pro unlocks this file.')
        await expect(panel.locator('.xd-theme-lock'), 'the blurred preview carries its lock').toBeVisible()
        await primaryButton(panel).click()
        await expect(page).toHaveURL(/\/plans(\?|$)/)
        expect(calls, 'a free account never asks the route for a Pro file').toHaveLength(0)
      })
    }
  }

  for (const file of ['guidelines', 'guidelines-html']) {
    for (const name of FREE_GUIDE) {
      test(`free, ${file} in ${name}: the guidelines export with no lock`, async ({ page }) => {
        watch(page, `a free account on ${file} in ${name}, a guidelines-only theme`)
        const panel = await open(page, { plan: 'free', file, saved: false })
        await expect(chosenRow(panel), 'a free account starts on the first theme the guidelines are free in').toHaveText(new RegExp(`^${FREE_GUIDE[0]}`))
        await expectTier(panel, 'Free', 'and it opens unlocked')
        await pick(panel, name)
        await expectTier(panel, 'Free')
        await expect(primaryButton(panel)).toHaveText(FILES[file].label)
        await expect(dockStatus(panel)).toContainText('Free.')
        await expect(panel.locator('.xd-theme-lock')).toHaveCount(0)
      })
    }
  }

  test('Label and Swiss Field are not offered for the UI kit or the book', async ({ page }) => {
    watch(page, 'a Pro account reading the theme list of each file')
    const panel = await open(page, { plan: 'pro', file: 'kit' })
    for (const file of Object.keys(FILES)) {
      await chooseFormat(panel, file)
      await expect.poll(() => rowNames(panel), `${file}: the themes that can draw it`).toEqual(namesFor(file))
    }
  })

  // The group and the dock decide from the same file and theme: the UI kit is free in one theme, the guidelines in the two
  // guidelines-only themes, and the book is Pro in all ten (so its list has an In Pro group only).
  for (const file of Object.keys(FILES)) {
    const freeThemes = freeFor(file)
    const names = namesFor(file)
    test(`free, ${file}: the group a theme sits in matches the dock for every theme`, async ({ page }) => {
      watch(page, `a free account reading the group of each theme on ${file}`)
      const panel = await open(page, { plan: 'free', file, saved: file === 'kit' })
      expect(await groupsOf(panel), 'the list groups every theme for this file').toEqual(groupsFor(file, true))
      for (const name of names) {
        const free = freeThemes.includes(name)
        await pick(panel, name)
        await expectTier(panel, free ? 'Free' : 'In Pro', `${name}: the group`)
        await expect(primaryButton(panel), `${name}: the dock`).toHaveText(free ? FILES[file].label : 'Unlock with Pro')
        if (file !== 'kit' && !free) await expect(panel.locator('.xd-theme-lock'), `${name}: the lock on the blurred preview`).toBeVisible()
        if (free) await expect(panel.locator('.xd-theme-lock'), `${name}: no lock on a free file`).toHaveCount(0)
      }
    })
  }

  for (const file of Object.keys(FILES)) {
    test(`a Pro account on ${file}: starts on Presentation, one plain list with no tier words, every theme can be exported`, async ({ page }) => {
      watch(page, `a Pro account on ${file}`)
      const panel = await open(page, { plan: 'pro', file })
      await expect(chosenRow(panel)).toHaveText(/^Presentation/)
      expect(await groupsOf(panel), 'no Free or In Pro headings').toEqual(groupsFor(file, false))
      await expectTier(panel, '')
      await expect(panel.locator('.xd-theme-lock')).toHaveCount(0)
      for (const name of ['Specification', 'Blueprint']) {
        await pick(panel, name)
        await expect(primaryButton(panel)).toHaveText(FILES[file].label)
        await expect(primaryButton(panel)).toBeEnabled()
      }
    })
  }

  test('the Theme step is on the UI kit, the book and the slides, and on no other file', async ({ page }) => {
    watch(page, 'a Pro account looking for the Theme step on each file')
    const panel = await open(page, { plan: 'pro', file: 'kit' })
    for (const file of Object.keys(FILES)) {
      await chooseFormat(panel, file)
      await expect(panel.getByRole('heading', { name: 'Theme', level: 3 }), file).toBeVisible()
      await expect(themes(panel), file).toBeVisible()
    }
    for (const file of ['book-png', 'html', 'css', 'json']) {
      await chooseFormat(panel, file)
      await expect(panel.getByRole('heading', { name: 'Theme', level: 3 }), file).toHaveCount(0)
      await expect(themes(panel), file).toHaveCount(0)
    }
  })
})

/* ── keyboard ────────────────────────────────────────────────────────────── */

// The Theme list is a radiogroup with one Tab stop (the chosen row). Arrows choose the next or previous row and move focus to it,
// Home and End jump to the ends, and the ends wrap. The same list is on a wide window and on a phone.
for (const { name: where, size } of MOTION_WIDTHS) test.describe(`keyboard, ${where}`, () => {
  test('the chosen theme is the one Tab stop; arrows choose and take focus, Home and End jump, the ends wrap', async ({ page }) => {
    watch(page, 'a keyboard user choosing a theme')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    expect(await tabStops(panel), 'one Tab stop, on the chosen theme').toEqual(['Standards'])

    // Each step: the chosen row, and focus with it.
    const at = async (name, why) => {
      await expect(chosenRow(panel), why).toHaveText(new RegExp(`^${name}`))
      await expect(chosenRow(panel), `${why}: focus goes with the choice`).toBeFocused()
    }
    await row(panel, 'Standards').focus()
    await page.keyboard.press('ArrowDown')
    await at('Presentation', 'ArrowDown chooses the next theme')
    await expectTier(panel, 'In Pro')
    await expect(primaryButton(panel), 'choosing a Pro theme is a choice, not a purchase').toHaveText('Unlock with Pro')
    await page.keyboard.press('ArrowRight')
    await at('Ticket', 'ArrowRight does the same')
    await page.keyboard.press('ArrowUp')
    await at('Presentation', 'ArrowUp')
    await page.keyboard.press('ArrowLeft')
    await at('Standards', 'ArrowLeft back to the first')
    await expectTier(panel, 'Free')
    await page.keyboard.press('ArrowUp')
    await at('In use', 'the top end wraps to the last theme')
    await page.keyboard.press('ArrowDown')
    await at('Standards', 'the bottom end wraps to the first theme')
    await page.keyboard.press('End')
    await at('In use', 'End')
    await page.keyboard.press('Home')
    await at('Standards', 'Home')
    await expect(exportPanel(page), 'the dialog stays open').toBeVisible()
    expect(await tabStops(panel), 'the Tab stop followed the choice').toEqual(['Standards'])
  })

  test('Escape leaves the dialog: there is no list to close first', async ({ page }) => {
    watch(page, 'a keyboard user pressing Escape in the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await row(panel, 'Standards').focus()
    await page.keyboard.press('End')
    await expect(chosenRow(panel)).toHaveText(/^In use/)
    await page.keyboard.press('Escape')
    await expect(exportPanel(page), 'the first Escape closes the dialog').toHaveCount(0)
  })

  test('Space and Enter on a focused row choose it', async ({ page }) => {
    watch(page, 'a keyboard user using Space and Enter on a theme row')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await row(panel, 'Studio').focus()
    await expect(chosenRow(panel), 'focus alone chooses nothing').toHaveText(/^Standards/)
    await page.keyboard.press('Space')
    await expect(chosenRow(panel)).toHaveText(/^Studio/)
    await row(panel, 'Specification').focus()
    await page.keyboard.press('Enter')
    await expect(chosenRow(panel)).toHaveText(/^Specification/)
  })

  test('focusing a row fetches that theme’s pictures, and choosing it shows them', async ({ page }) => {
    watch(page, 'a keyboard user previewing themes')
    const fetched = []
    page.on('request', (req) => { const m = /\/export-themes\/([\w-]+)\.webp/.exec(req.url()); if (m) fetched.push(m[1]) })
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    const shot = panel.locator('.xd-theme-stage img').first()
    await expect(shot).toHaveAttribute('alt', /^Standards theme UI kit/)
    await row(panel, 'Catalogue').focus()
    await expect.poll(() => fetched, 'the theme’s pictures are asked for on focus, before it is chosen').toContain('05-specimen-kitScreen')
    await expect(shot, 'focus alone does not change the preview').toHaveAttribute('alt', /^Standards theme UI kit/)
    await row(panel, 'Catalogue').click()
    await expect(shot, 'choosing changes the preview at once').toHaveAttribute('alt', /^Catalogue theme UI kit/)
    await row(panel, 'Standards').click()
    await expect(shot).toHaveAttribute('alt', /^Standards theme UI kit/)
  })

  test('Tab leaves the list without choosing', async ({ page }) => {
    watch(page, 'a keyboard user tabbing out of the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    await row(panel, 'Standards').focus()
    await page.keyboard.press('Tab')
    expect(await themes(panel).evaluate((group) => group.contains(document.activeElement)), 'focus left the Theme list').toBe(false)
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.xd-card'))), 'and stayed in the dialog').toBe(true)
    await expect(chosenRow(panel)).toHaveText(/^Standards/)
  })
})

/* ── reduced motion ──────────────────────────────────────────────────────── */

// Under reduced motion every property change gets a 0.01ms transition. The Theme list has to take keyboard focus and move it all
// the same, from either setting, on a wide window and on a phone.
for (const setting of MOTION_SETTINGS) for (const { name: where, size } of MOTION_WIDTHS) {
  test(`reduced motion (${setting.name}), ${where}: focus the chosen theme, ArrowDown chooses the next and focus goes with it`, async ({ page }) => {
    watch(page, `a keyboard user with reduced motion on, by ${setting.name}`)
    await setting.apply(page)
    const panel = await open(page, { plan: 'free', file: 'kit', size })
    expect(await motionState(page), 'reduced motion is on').toMatchObject({ attribute: 'true' })
    await chooseThemeWithKeys(page, panel)
  })
}

/* ── where the list sits ─────────────────────────────────────────────────── */

test.describe('the list is in the dialog', () => {
  test('at 1440 the ten rows sit in the dialog with no popover or Change button, and the preview is above the Theme step, above the File step', async ({ page }) => {
    watch(page, 'a designer on a wide window reading the theme list')
    const panel = await open(page, { plan: 'free', file: 'kit', size: { width: 1440, height: 900 } })
    await expect(page.locator('.xd-theme-pop, .xd-theme-sheet'), 'nothing opens over the dialog').toHaveCount(0)
    await expect(panel.getByRole('button', { name: /^Change theme/ })).toHaveCount(0)
    const box = await page.evaluate(() => {
      const list = document.querySelector('.xd-theme-list').getBoundingClientRect()
      const card = document.querySelector('.xd-card').getBoundingClientRect()
      const rows = [...document.querySelectorAll('.xd-theme-opt')].map((r) => Math.round(r.getBoundingClientRect().height))
      return { left: list.left, right: list.right, card: { l: card.left, r: card.right }, rows }
    })
    expect(box.rows, 'ten rows').toHaveLength(10)
    for (const h of box.rows) expect(h, 'a row is a comfortable target').toBeGreaterThanOrEqual(40)
    expect(box.left, 'inside the dialog').toBeGreaterThanOrEqual(box.card.l)
    expect(box.right).toBeLessThanOrEqual(box.card.r)
    const order = await page.evaluate(() => {
      const prev = document.querySelector('.xd-prev').getBoundingClientRect()
      const step = document.querySelector('.xd-theme').getBoundingClientRect()
      const file = [...document.querySelectorAll('.xd-step-l')].find((h) => h.textContent === 'File').getBoundingClientRect()
      return { previewAboveTheme: prev.top < step.top, themeAboveFile: step.top < file.top }
    })
    expect(order).toEqual({ previewAboveTheme: true, themeAboveFile: true })
  })

  test('at 390 the picture comes first, the list is folded under a Theme row, and picking a theme updates the row and keeps the dialog open', async ({ page }) => {
    watch(page, 'a phone user choosing a theme')
    const panel = await open(page, { plan: 'free', file: 'kit', size: { width: 390, height: 844 } })
    await expect(page.locator('.xd-theme-pop, .xd-theme-sheet'), 'no sheet on a phone either').toHaveCount(0)
    const toggle = panel.getByRole('button', { name: /^Theme:/ })
    await expect(toggle, 'the folded row names the chosen theme and its sample brand').toHaveText(/^Theme: Standards · \S/)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(themes(panel), 'the list is folded at first').toBeHidden()
    const folded = await page.evaluate(() => {
      const prev = document.querySelector('.xd-prev').getBoundingClientRect()
      const t = document.querySelector('.xd-theme > .xd-man-t').getBoundingClientRect()
      return { previewAboveTheme: prev.top < t.top, row: Math.round(t.height), sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth }
    })
    expect(folded.previewAboveTheme, 'the picture is above the Theme row').toBe(true)
    expect(folded.row, 'the Theme row is a 44px target').toBeGreaterThanOrEqual(44)
    expect(folded.sideways).toBe(false)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(themes(panel)).toBeVisible()
    const fit = await page.evaluate(() => {
      const list = document.querySelector('.xd-theme-list').getBoundingClientRect()
      const rows = [...document.querySelectorAll('.xd-theme-opt')].map((r) => Math.round(r.getBoundingClientRect().height))
      return { left: list.left, right: list.right, rows, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth }
    })
    expect(fit.rows).toHaveLength(10)
    for (const h of fit.rows) expect(h, 'a phone row is a 44px target').toBeGreaterThanOrEqual(44)
    expect(fit.left).toBeGreaterThanOrEqual(0)
    expect(fit.right).toBeLessThanOrEqual(390)
    expect(fit.sideways).toBe(false)

    await row(panel, 'Specification').click()
    await expect(exportPanel(page), 'choosing does not close the dialog').toBeVisible()
    await expect(toggle, 'the row follows the choice').toHaveText(/^Theme: Specification · \S/)
    await expect(themes(panel), 'a pick folds the list again, so the picture is back in view').toBeHidden()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
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
      await expect(panel.locator('.xd-man-row[aria-current="true"] .xd-man-n'), 'the file list names it before the click').toHaveText(saved)
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
    await expect(popup.locator('#printed-doc')).toHaveText('Harbour brand guidelines')
    await expect.poll(() => popup.evaluate(() => window.__printed)).toBe(1)
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
