// EXPORT V3: THE ONE EXPORT POPUP.
//
// Every export entry point opens the same dialog (.xd, role=dialog named by its
// h2): a rail (Brand book > Book / Slides / Style guide, UI kit, Code), one
// scrolling column (File, Layout, Details) and a dock with the price line and the
// primary button. This file is the Done-when list of
// memory/designs/design-2026-10-30-export-v3-spec.md section 6, and it replaces
// the old 124-export-panel-polish, 137-export-panel-five and 177-kit-export-gallery
// specs.
//
// Everything is found by role and name. The layout is read from
// .xd[data-layout="rail|menu|strip"]; the dock's pieces are .xd-status (role
// status), .xd-error (role alert) and .xd-primary.
//
// "Checking your plan..." is held open with signIn({ slowReads: [{ path, hold: true }] })
// until the page calls window.__UIL4B_TEST_HOLD__.release().
//
// MUTATIONS (each break must fail the group named after it):
//   - see the comment above each describe block.
import fs from 'node:fs'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import {
  exportPanel, typeRadio, categoryRadio, fileGroup, primaryButton, dockStatus, dockError,
} from './export-rows.js'

const WORKED_BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const PROJECT = '/projects/harbour'
const ROUTE = '/projects/harbour/export'
const PROJECT_NAME = 'Harbour'

/** A saved project with every part filled, so its page offers "Export project". */
function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  const now = new Date().toISOString()
  return { id: 'harbour', name: PROJECT_NAME, design, createdAt: now, updatedAt: now }
}

/** The popup, once it is visible and its entrance has finished moving. */
async function settled(page) {
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  return panel
}

/** Open from the app header's Export button. */
async function openFromHeader(page) {
  await page.locator('.pnav-export').click()
  return settled(page)
}

/**
 * The first checked radio in a group. The first, because a type group may wrap
 * its category group, and the type's own radio comes before its children.
 */
const checkedIn = (group) => group.getByRole('radio', { checked: true }).first()
const firstLine = (text) => text.split('\n')[0].trim()
const textOf = async (locator) => firstLine(await locator.innerText())

/** { type, category, file } as the popup shows it, read from the checked radios. */
async function shownPick(panel) {
  const type = await textOf(checkedIn(panel.getByRole('radiogroup', { name: 'Export type' })))
  const cats = panel.getByRole('radiogroup', { name: /categories$/ })
  const files = panel.getByRole('radiogroup', { name: /file type$/ })
  return {
    type,
    category: (await cats.count()) ? await textOf(checkedIn(cats)) : null,
    file: (await files.count()) ? await textOf(checkedIn(files)) : null,
  }
}

/** The name of the layout tile that is chosen. */
const chosenLayout = (panel) => textOf(checkedIn(panel.getByRole('radiogroup', { name: 'Template' })))

// Criteria 1, 2, 3 and 23: every entry point opens the one popup on its preset.
//   - Make PillNav's Export open nothing: "the header Export" fails.
//   - Open the Tint row on the default pick instead of Code > CSS: "the Tint tool row" fails.
//   - Drop the open-on-arrival effect in ProjectExport.jsx: "the export route" fails.
test.describe('every entry point opens the same popup', () => {
  test('the header Export opens on Brand book, Book, PDF, and reopens on the last pick', async ({ page }) => {
    watch(page, 'a designer exporting from the header')
    await go(page, WORKED_BOARD)
    let panel = await openFromHeader(page)
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText('Export your design system')
    expect(await shownPick(panel)).toEqual({ type: 'Brand book', category: 'Book', file: 'PDF' })
    expect(await chosenLayout(panel)).toMatch(/Specification/)

    await categoryRadio(panel, 'Style guide').click()
    await fileGroup(panel, 'Style guide').getByRole('radio', { name: 'PNG', exact: true }).click()
    await panel.getByRole('button', { name: 'Close export' }).click()
    await expect(exportPanel(page)).toBeHidden()

    panel = await openFromHeader(page)
    expect(await shownPick(panel), 'the same session reopens on the last pick').toEqual({ type: 'Brand book', category: 'Style guide', file: 'PNG' })
  })

  test('both project page buttons open it, named for the project', async ({ page }) => {
    watch(page, 'a designer opening a saved project')
    await signIn(page, { plan: 'free', projects: [savedProject()] })
    for (const area of ['.pjd-head-actions', '.pjd-export']) {
      await go(page, PROJECT)
      await expect(page.getByRole('heading', { level: 1, name: PROJECT_NAME })).toBeVisible()
      await page.locator(area).getByRole('button', { name: 'Export project', exact: true }).click()
      const panel = await settled(page)
      await expect(panel.getByRole('heading', { level: 2 }), `from ${area}`).toHaveText(`Export ${PROJECT_NAME}`)
      expect(await shownPick(panel), `from ${area}`).toEqual({ type: 'Brand book', category: 'Book', file: 'PDF' })
      await panel.getByRole('button', { name: 'Close export' }).click()
      await expect(exportPanel(page)).toBeHidden()
    }
  })

  test('the export route is a short page that opens the popup on arrival', async ({ page }) => {
    watch(page, 'a designer on the export route')
    await signIn(page, { plan: 'free', projects: [savedProject()] })
    await go(page, ROUTE)
    const panel = await settled(page)
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText(`Export ${PROJECT_NAME}`)
    expect(await shownPick(panel)).toEqual({ type: 'Brand book', category: 'Book', file: 'PDF' })

    await panel.getByRole('button', { name: 'Close export' }).click()
    await expect(exportPanel(page)).toBeHidden()
    await expect(page, 'closing the popup does not leave the route').toHaveURL(/\/projects\/harbour\/export$/)
    await expect(page.getByRole('heading', { level: 1, name: `Export ${PROJECT_NAME}` })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open project' })).toHaveAttribute('href', PROJECT)
    // The old gallery's design cards, format cards and price bar are gone.
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expect(page.locator('.pxg-cta')).toHaveCount(1)

    await page.getByRole('button', { name: 'Open export' }).click()
    await expect(await settled(page)).toBeVisible()
  })

  test('the Tint tool row opens it on Code, CSS stylesheet', async ({ page }) => {
    watch(page, 'a designer exporting from the tint tool')
    await go(page, '/create/tint')
    await page.locator('.tl-export-btn').click()
    await page.getByRole('menuitem', { name: 'Export design system…', exact: true }).click()
    const panel = await settled(page)
    expect(await shownPick(panel)).toEqual({ type: 'Code', category: null, file: 'CSS stylesheet' })
  })
})

/** Every category the rail offers, with the clicks that reach it. */
const CATEGORIES = [
  { name: 'Book', go: async (p) => { await typeRadio(p, 'Brand book').click(); await categoryRadio(p, 'Book').click() } },
  { name: 'Slides', go: async (p) => { await typeRadio(p, 'Brand book').click(); await categoryRadio(p, 'Slides').click() } },
  { name: 'Style guide', go: async (p) => { await typeRadio(p, 'Brand book').click(); await categoryRadio(p, 'Style guide').click() } },
  { name: 'UI kit', go: async (p) => { await typeRadio(p, 'UI kit').click() } },
  { name: 'Code', go: async (p) => { await typeRadio(p, 'Code').click() } },
]

const SIZES = [
  { width: 320, height: 700, layout: 'strip' },
  { width: 390, height: 844, layout: 'strip' },
  { width: 768, height: 1024, layout: 'menu' },
  { width: 1440, height: 900, layout: 'rail' },
]

/** Scroll everything inside the popup that can scroll to its end. */
const scrollToEnd = (panel) => panel.evaluate((card) => {
  for (const el of [card, ...card.querySelectorAll('*')]) {
    if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight
  }
})

/** Fail unless a locator's box lies inside the window, saying which edge is out. */
async function expectInWindow(page, locator, what) {
  const box = await locator.boundingBox()
  const { width, height } = page.viewportSize()
  expect(box, `${what} has no box`).not.toBeNull()
  expect(box.x, `${what}: left edge`).toBeGreaterThanOrEqual(-0.5)
  expect(box.y, `${what}: top edge`).toBeGreaterThanOrEqual(-0.5)
  expect(box.x + box.width, `${what}: right edge`).toBeLessThanOrEqual(width + 0.5)
  expect(box.y + box.height, `${what}: bottom edge`).toBeLessThanOrEqual(height + 0.5)
}

// Criteria 17, 18 and 19: the layout follows the window, nothing runs off it, and
// the dock and title stay reachable on every category.
//   - Change a breakpoint in ExportDialog.jsx (fitted): the data-layout assertion fails.
//   - Let .xd-dock scroll away with the column (position:static): the dock test fails.
//   - Give .xd-col a min-width wider than the sheet: the no-sideways-scroll test fails.
for (const size of SIZES) {
  test.describe(`the popup at ${size.width}px`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test(`is laid out as the ${size.layout}, with no sideways scroll, on every category`, async ({ page }) => {
      watch(page, `a designer exporting at ${size.width}px`)
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      await expect(page.locator('.xd')).toHaveAttribute('data-layout', size.layout)
      for (const category of CATEGORIES) {
        await category.go(panel)
        const overflow = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth - window.innerWidth,
          card: document.querySelector('.xd-card').scrollWidth - document.querySelector('.xd-card').clientWidth,
          column: document.querySelector('.xd-scroll').scrollWidth - document.querySelector('.xd-scroll').clientWidth,
        }))
        expect(overflow.page, `${category.name}: the page scrolls sideways`).toBeLessThanOrEqual(0)
        expect(overflow.card, `${category.name}: the card scrolls sideways`).toBeLessThanOrEqual(0)
        expect(overflow.column, `${category.name}: the column scrolls sideways`).toBeLessThanOrEqual(0)
        await expectInWindow(page, panel, `${category.name}: the dialog`)
      }
    })

    test('keeps the dock and the primary button inside the window on every category', async ({ page }) => {
      watch(page, `a designer exporting at ${size.width}px`)
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      for (const category of CATEGORIES) {
        await category.go(panel)
        await expectInWindow(page, panel.locator('.xd-dock'), `${category.name}: the dock`)
        await expectInWindow(page, primaryButton(panel), `${category.name}: the primary button`)
        await scrollToEnd(panel)
        await expectInWindow(page, panel.locator('.xd-dock'), `${category.name}: the dock after scrolling`)
        await expectInWindow(page, primaryButton(panel), `${category.name}: the primary button after scrolling`)
      }
    })

    test('keeps the title and the close button in view after scrolling to the bottom', async ({ page }) => {
      watch(page, `a designer exporting at ${size.width}px`)
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      await scrollToEnd(panel)
      await expectInWindow(page, panel.getByRole('heading', { level: 2 }), 'the title')
      await expectInWindow(page, panel.getByRole('button', { name: 'Close export' }), 'the close button')
    })
  })
}

// Criteria 17, 18 and 19: the sizes the spec names.
//   - Change the card or rail width in export-dialog.css: the 1440 and 768 tests fail.
//   - Drop the 44px min-height on .xd-type / .xd-cat in the strip: the 390 test fails.
test.describe('the sizes the spec names', () => {
  test.describe('at 1440', () => {
    test.use({ viewport: { width: 1440, height: 900 } })
    test('the dialog is 1120 by 820 with a 264px rail', async ({ page }) => {
      watch(page, 'a designer exporting at 1440px')
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      const card = await panel.boundingBox()
      expect([Math.round(card.width), Math.round(card.height)]).toEqual([1120, 820])
      expect(Math.round((await panel.locator('.xd-nav').boundingBox()).width)).toBe(264)
    })

    // To see this fail: make Manifest's `folded` true at every width in ExportSteps.jsx, or drop the formatFileName call.
    test('the File step lists every file in the category by the name it downloads under, open, with the chosen one marked', async ({ page }) => {
      watch(page, 'a designer reading the file list at 1440px')
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      await typeRadio(panel, 'Code').click()
      const rows = panel.locator('.xd-man-row')
      await expect(rows, 'Code lists CSS, JSON, Tailwind and both contrast files').toHaveCount(5)
      await expect(panel.locator('.xd-man-t'), 'the rows are not folded at 1440').toHaveCount(0)
      const names = await panel.locator('.xd-man-n').allInnerTexts()
      expect(names).toEqual([
        'untitled.tokens.css', 'untitled.tokens.json', 'untitled-tailwind.css',
        'untitled-contrast-pairs.csv', 'untitled-contrast-pairs.json',
      ])
      for (const name of names) expect(name, 'no file is named for the product').not.toMatch(/uil4b|-tokens\.(css|json)$/)
      await expect(panel.locator('.xd-man-row[aria-current="true"]')).toHaveCount(1)
      await expect(panel.locator('.xd-man-row[aria-current="true"] .xd-man-n')).toHaveText('untitled.tokens.css')
      // The preview is headed by the exact name of the chosen file.
      await expect(panel.locator('.xfp-file')).toHaveText('untitled.tokens.css')
      await panel.getByRole('radio', { name: 'Tailwind theme' }).click()
      await expect(panel.locator('.xfp-file')).toHaveText('untitled-tailwind.css')
      await expect(panel.locator('.xd-man-row[aria-current="true"] .xd-man-n')).toHaveText('untitled-tailwind.css')
    })
  })

  test.describe('at 768', () => {
    test.use({ viewport: { width: 768, height: 1024 } })
    test('the rail is 208px and every target is at least 44px tall', async ({ page }) => {
      watch(page, 'a designer exporting at 768px')
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      expect(Math.round((await panel.locator('.xd-nav').boundingBox()).width)).toBe(208)
      for (const category of CATEGORIES) {
        await category.go(panel)
        const small = await panel.evaluate((card) => [...card.querySelectorAll('button, [role=radio], a[href], input:not([type=hidden]), select')]
          .filter((el) => el.offsetParent !== null && !el.closest('[inert]'))
          .map((el) => ({ what: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30), h: Math.round(el.getBoundingClientRect().height) }))
          .filter((t) => t.h > 2 && t.h < 44))
        expect(small, `${category.name}: targets under 44px tall`).toEqual([])
      }
    })
  })

  test.describe('at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } })
    test('the type control and category chips are 44px tall; the primary button is full width and 48px', async ({ page }) => {
      watch(page, 'a designer exporting at 390px')
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      for (const type of ['Brand book', 'UI kit', 'Code']) {
        expect(Math.round((await typeRadio(panel, type).boundingBox()).height), `${type} segment`).toBeGreaterThanOrEqual(44)
      }
      for (const name of ['Book', 'Slides', 'Style guide']) {
        expect(Math.round((await categoryRadio(panel, name).boundingBox()).height), `${name} chip`).toBeGreaterThanOrEqual(44)
      }
      for (const category of CATEGORIES) {
        await category.go(panel)
        const button = await primaryButton(panel).boundingBox()
        const dock = await panel.locator('.xd-dock').boundingBox()
        expect(Math.round(button.height), `${category.name}: primary height`).toBe(48)
        if (category.name === 'Code') {
          // Copy sits beside the primary, half and half.
          const copy = await panel.getByRole('button', { name: /^Copy file$/ }).boundingBox()
          expect(Math.abs(copy.width - button.width), 'Copy and the primary share the dock evenly').toBeLessThanOrEqual(2)
          expect(copy.width + button.width, 'together they span the dock').toBeGreaterThan(dock.width - 48)
        } else {
          expect(button.width, `${category.name}: the primary spans the dock`).toBeGreaterThan(dock.width - 48)
        }
      }
    })

    // To see this fail: set `folded` to false in ExportSteps.jsx (the rows show at once), or remove the hidden attribute handling.
    test('the file list folds to one line, "5 files" for Code, and opens in place', async ({ page }) => {
      watch(page, 'a designer reading the file list at 390px')
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      await typeRadio(panel, 'Code').click()
      const toggle = panel.locator('.xd-man-t')
      await expect(toggle).toHaveText('5 files')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(panel.locator('.xd-man-row').first(), 'folded rows are not shown').toBeHidden()
      expect(Math.round((await toggle.boundingBox()).height), 'the fold is one 44px line').toBeGreaterThanOrEqual(44)
      const above = await panel.getByRole('radiogroup', { name: /file type/i }).boundingBox()
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(panel.locator('.xd-man-row')).toHaveCount(5)
      await expect(panel.locator('.xd-man-row').first()).toBeVisible()
      await expect(panel.locator('.xd-man-n').first()).toHaveText('untitled.tokens.css')
      // It opens in place: nothing above it moved.
      const after = await panel.getByRole('radiogroup', { name: /file type/i }).boundingBox()
      expect(Math.round(after.y)).toBe(Math.round(above.y))
      await toggle.click()
      await expect(panel.locator('.xd-man-row').first()).toBeHidden()
      // A category with one file has nothing to fold.
      await typeRadio(panel, 'UI kit').click()
      await expect(panel.locator('.xd-man-t')).toHaveCount(0)
      await expect(panel.locator('.xd-man-n')).toHaveText('untitled-ui-kit.html')
    })

    test('the title, the type control, the file pills and the dock text share one 16px left edge', async ({ page }) => {
      watch(page, 'a designer exporting at 390px')
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      await typeRadio(panel, 'Brand book').click()
      await categoryRadio(panel, 'Style guide').click()
      const edge = async (locator) => Math.round((await locator.boundingBox()).x)
      const edges = {
        title: await edge(panel.getByRole('heading', { level: 2 })),
        type: await edge(panel.getByRole('radiogroup', { name: 'Export type' })),
        stepLabel: await edge(panel.getByRole('heading', { level: 3, name: 'File' })),
        files: await edge(fileGroup(panel, 'Style guide').getByRole('radio').first()),
        status: await edge(dockStatus(panel)),
      }
      expect(edges, 'the left edges that line up').toEqual({ title: 16, type: 16, stepLabel: 16, files: 16, status: 16 })
    })
  })

  // A landscape phone: short and wide. The popup must keep its dock reachable.
  test.describe('in a short window', () => {
    for (const size of [{ width: 844, height: 390 }, { width: 1024, height: 480 }, { width: 500, height: 400 }]) {
      test(`${size.width} by ${size.height} keeps the dock, the title and the close button in view`, async ({ page }) => {
        await page.setViewportSize(size)
        watch(page, 'a designer exporting from a short window')
        await go(page, WORKED_BOARD)
        const panel = await openFromHeader(page)
        for (const category of CATEGORIES) {
          await category.go(panel)
          await scrollToEnd(panel)
          await expectInWindow(page, panel.locator('.xd-dock'), `${category.name}: the dock`)
          await expectInWindow(page, primaryButton(panel), `${category.name}: the primary button`)
          await expectInWindow(page, panel.getByRole('heading', { level: 2 }), `${category.name}: the title`)
          await expectInWindow(page, panel.getByRole('button', { name: 'Close export' }), `${category.name}: the close button`)
        }
      })
    }
  })
})

const FONT_FILE = 'https://fonts.gstatic.com/s/kitfixture/latin.woff2'
const CSS2 = `/* latin */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400 700; font-display: swap; src: url(${FONT_FILE}) format('woff2'); unicode-range: U+0000-00FF; }`

/** Answer the UI kit's font fetches from fixtures, so a kit export never reaches a font host. */
async function stubFonts(page) {
  const woff2 = fs.readFileSync('public/fonts/geist-latin.woff2')
  await page.route(/fonts\.googleapis\.com\/css2/, (route) => (route.request().resourceType() === 'fetch'
    ? route.fulfill({ status: 200, contentType: 'text/css', body: CSS2 })
    : route.continue()))
  await page.route(FONT_FILE, (route) => route.fulfill({ status: 200, contentType: 'font/woff2', body: woff2 }))
  await page.route(/cdn\.jsdelivr\.net\/gh\/google\/fonts/, (route) => route.fulfill({ status: 404, body: '' }))
}

/** Press the primary button and read the file it downloads: { name, bytes, text }. */
async function takeDownload(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), primaryButton(page).click()])
  const bytes = fs.readFileSync(await download.path())
  return { name: download.suggestedFilename(), bytes, text: bytes.toString('utf8') }
}

// Criterion 5 and 11 (free side): the free files build, with the credit, and
// Copy CSS never asks for an account.
//   - Strip the credit from the style guide HTML (utils/exportDocument.js): "HTML carries the credit" fails.
//   - Make Copy CSS open the signup dialog: "Copy CSS signed out" fails.
//   - Drop the credit comment from buildCSSVars output for free: "the CSS file starts with the credit" fails.
test.describe('what a free account can take', () => {
  test('Style guide as PNG downloads a real PNG named -style-guide.png', async ({ page }) => {
    watch(page, 'a free account exporting the style guide as a PNG')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await categoryRadio(panel, 'Style guide').click()
    await fileGroup(panel, 'Style guide').getByRole('radio', { name: 'PNG', exact: true }).click()
    const file = await takeDownload(page)
    expect(file.name).toMatch(/-style-guide\.png$/)
    expect([...file.bytes.subarray(0, 8)], 'the PNG signature').toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(file.bytes.length, 'a drawn page, not an empty canvas').toBeGreaterThan(5000)
  })

  test('Style guide as HTML downloads a page that carries "Made with UIL4B"', async ({ page }) => {
    watch(page, 'a free account exporting the style guide as HTML')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await categoryRadio(panel, 'Style guide').click()
    await fileGroup(panel, 'Style guide').getByRole('radio', { name: 'HTML', exact: true }).click()
    const file = await takeDownload(page)
    expect(file.name).toMatch(/-style-guide\.html$/)
    expect(file.text).toMatch(/Made with UIL4B/)
    expect(file.text).toMatch(/#1F4B8E/i)
  })

  test('the UI kit exports straight away, with the mark', async ({ page }) => {
    watch(page, 'a free account exporting the UI kit')
    await stubFonts(page)
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await typeRadio(panel, 'UI kit').click()
    await expect(primaryButton(panel)).toHaveText('Export UI kit')
    const file = await takeDownload(page)
    expect(file.name).toMatch(/\.html$/)
    expect(file.text).toMatch(/Made with UIL4B/)
  })

  test('the CSS file is a comment-led stylesheet that ends with the credit comment', async ({ page }) => {
    watch(page, 'a free account exporting CSS')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await typeRadio(panel, 'Code').click()
    await expect(primaryButton(panel)).toHaveText('Export CSS')
    const file = await takeDownload(page)
    expect(file.name).toMatch(/\.css$/)
    expect(file.text, 'the file opens with a comment').toMatch(/^\s*\/\*/)
    expect(file.text, 'and closes with the credit comment').toMatch(/\/\* Made with UIL4B[^*]*\*\/\s*$/)
    expect(file.text).toMatch(/--/)
  })

  test('Copy CSS signed out copies, asks for no account, and says Copied', async ({ page }) => {
    watch(page, 'a visitor copying CSS')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await typeRadio(panel, 'Code').click()
    await panel.getByRole('button', { name: 'Copy file', exact: true }).click()
    await expect(page.getByText(/^Copied/).first()).toBeVisible()
    await expect(page.locator('#ui-login-title'), 'Copy never asks for an account').toHaveCount(0)
    await expect(panel).toBeVisible()
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/--/)
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied, 'the copy carries the same credit comment').toMatch(/\/\* Made with UIL4B[^*]*\*\/\s*$/)
  })

  test('Copy file is offered beside the JSON file and copies JSON', async ({ page }) => {
    watch(page, 'a visitor copying JSON')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await typeRadio(panel, 'Code').click()
    await expect(panel.getByRole('button', { name: 'Copy file' })).toHaveCount(1)
    await fileGroup(panel, 'Code').getByRole('radio', { name: 'JSON', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Copy CSS' })).toHaveCount(0)
    await panel.getByRole('button', { name: 'Copy file', exact: true }).click()
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/^\s*\{/)
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(() => JSON.parse(copied)).not.toThrow()
  })
})

/** The analytics events the page queued on window.vaq, by name. */
const eventsNamed = (page, name) => page.evaluate((wanted) => (window.vaq || [])
  .filter((q) => q[0] === 'event' && q[1].name === wanted)
  .map((q) => q[1].data || null), name)

// Mean absolute difference between neighbouring pixels: high for a sharp picture,
// low once it is blurred. Same-origin blob images do not taint a canvas.
const sharpness = (locator) => locator.evaluate((img) => {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const x = c.getContext('2d')
  x.drawImage(img, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height).data
  let sum = 0
  let n = 0
  for (let i = 4; i < d.length; i += 4) {
    sum += Math.abs(d[i] - d[i - 4]) + Math.abs(d[i + 1] - d[i - 3]) + Math.abs(d[i + 2] - d[i - 2])
    n += 1
  }
  return sum / n
})

const PRO_CATEGORIES = [
  { name: 'Book', gate: 'design-system-book-export' },
  { name: 'Slides', gate: 'brand-guidelines-export' },
]

// Criteria 8, 9, 10 and 12: Pro categories for a free account.
//   - Draw the previews without bakeBlur (utils/proPreviews.js): "the blur is in the pixels" fails.
//   - Render .xd-lock / the Pro tags for every account: "a Pro account sees no Pro furniture" fails.
//   - Send a free account on a Pro file to the server instead of /plans: "goes to /plans" fails.
//   - Drop from=kit-gallery from the checkout navigation: "a saved project goes to checkout" fails.
test.describe('Pro categories for a free account', () => {
  for (const { name, gate } of PRO_CATEGORIES) {
    test(`${name}: a blurred preview, a lock, a Pro tag, and the primary leads to /plans when no project is saved`, async ({ page }) => {
      watch(page, `a signed-in free account on ${name}`)
      const asked = []
      await page.route('**/api/ai?export=document', (route) => { asked.push(route.request().url()); route.abort() })
      await signIn(page, { plan: 'free' })
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      await typeRadio(panel, 'Brand book').click()
      await expect(categoryRadio(panel, name)).toHaveAccessibleName(`${name}, ${name === 'Book' ? 'A4 pages' : '16:9'}, Pro`)
      await categoryRadio(panel, name).click()
      await expect(panel.locator('.xd-lock')).toBeVisible()
      await expect(panel.locator('.xd-lock')).toContainText('Pro')
      const thumbs = panel.locator('img[data-blurred]')
      await expect(thumbs.first()).toBeVisible()
      for (const img of await thumbs.all()) {
        await expect(img).toHaveAttribute('data-blurred', 'true')
        expect(await img.evaluate((el) => el.naturalWidth), 'a small picture, blurred before it reaches the page').toBeLessThanOrEqual(400)
      }
      await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
      await primaryButton(panel).click()
      await expect(page).toHaveURL(/\/plans(\?|$)/)
      expect(await eventsNamed(page, 'upgrade_gate_shown')).toContainEqual({ gate })
      expect(asked, 'a free account asked the server for a Pro file').toHaveLength(0)
    })
  }

  test('the Style guide row says free, and its preview is not blurred or locked', async ({ page }) => {
    watch(page, 'a free account on the style guide')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await expect(categoryRadio(panel, 'Style guide')).toHaveAccessibleName('Style guide, A4, free')
    await categoryRadio(panel, 'Style guide').click()
    await expect(panel.locator('.xd-lock')).toHaveCount(0)
    await expect(panel.locator('img[data-blurred="true"]')).toHaveCount(0)
  })

  test('signed out is the same as free: the lock, then /plans', async ({ page }) => {
    watch(page, 'a visitor on Book')
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await expect(panel.locator('.xd-lock')).toBeVisible()
    await primaryButton(panel).click()
    await expect(page).toHaveURL(/\/plans(\?|$)/)
    expect(await eventsNamed(page, 'upgrade_gate_shown')).toContainEqual({ gate: 'design-system-book-export' })
  })

  test('with a saved project the primary offers the trial and lands on checkout from the gallery', async ({ page }) => {
    watch(page, 'a free account with a saved project on Book')
    await signIn(page, { plan: 'free', projects: [savedProject()] })
    await go(page, ROUTE)
    const panel = await settled(page)
    await expect(primaryButton(panel)).toHaveText(/free trial/i)
    await expect(dockStatus(panel)).toContainText(/free/i)
    await expect(dockStatus(panel)).toContainText(/Cancel before/)
    await primaryButton(panel).click()
    await expect(page).toHaveURL(/\/checkout\?plan=yearly&from=kit-gallery$/)
  })

  test('the blur is in the pixels: a Pro account sees the same preview sharp', async ({ browser }) => {
    const sharp = {}
    for (const plan of ['free', 'pro']) {
      const context = await browser.newContext()
      const page = await context.newPage()
      watch(page, `a ${plan} account comparing the Book preview`)
      await signIn(page, { plan })
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      const img = panel.locator('img[data-blurred]').first()
      await expect(img).toBeVisible()
      await expect(img).toHaveAttribute('data-blurred', plan === 'free' ? 'true' : 'false')
      sharp[plan] = await sharpness(img)
      await context.close()
    }
    expect(sharp.pro, `sharpness: free ${sharp.free}, pro ${sharp.pro}`).toBeGreaterThan(sharp.free * 1.5)
  })
})

// Criterion 12 and the Pro file path.
//   - Render the Pro tags for Pro accounts: the first test fails.
//   - Build the book in the browser instead of asking the server: the second test fails.
test.describe('a Pro account', () => {
  test('sees no Pro tags, no free marks, no lock and no blur', async ({ page }) => {
    watch(page, 'a Pro account opening Export')
    await signIn(page, { plan: 'pro' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    for (const name of ['Book', 'Slides', 'Style guide']) {
      await expect(categoryRadio(panel, name)).not.toHaveAccessibleName(/, (Pro|free)$/)
    }
    await expect(panel.locator('.xd-lock, .xd-pro, .xd-free')).toHaveCount(0)
    const thumbs = panel.locator('img[data-blurred]')
    await expect(thumbs.first()).toBeVisible()
    await expect(panel.locator('img[data-blurred="true"]')).toHaveCount(0)
    await expect(primaryButton(panel)).toHaveText('Export PDF')
    await expect(dockStatus(panel)).toContainText('No watermark')
  })

  test('exports the book through the server: a POST with a Bearer token, format book', async ({ page }) => {
    watch(page, 'a Pro subscriber exporting the book')
    await page.addInitScript(() => { window.print = () => {} })
    const asked = []
    await page.route('**/api/ai?export=document', async (route) => {
      const req = route.request()
      asked.push({ method: req.method(), auth: req.headers().authorization, body: req.postDataJSON() })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, format: 'book', html: buildDesignSystemBook({ palette: { base: '#1F4B8E', colors: ['#1F4B8E', '#3FA9A0'] } }, { projectName: 'Stub' }) }),
      })
    })
    await signIn(page, { plan: 'pro' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await expect(primaryButton(panel)).toBeEnabled()
    const [doc] = await Promise.all([page.context().waitForEvent('page'), primaryButton(panel).click()])
    await expect(doc.locator('.cv-title')).toBeVisible()
    expect(asked, 'the popup asks the server exactly once').toHaveLength(1)
    expect(asked[0].method).toBe('POST')
    expect(asked[0].auth).toMatch(/^Bearer .+/)
    expect(asked[0].body.format).toBe('book')
    await expect(panel, 'the popup stays open behind the new tab').toBeVisible()
  })
})

// Criteria 13, 14 and 21: the popup stays open after an export, closes the ways
// a dialog should, hands focus back, and the rail is one Tab stop per group.
//   - Close the popup from useExportRunner when a file is done: "stays open" fails.
//   - Let requestClose ignore `busy`: "while a file builds" fails.
//   - Drop the focus restore in useModalDialog: "focus returns to the opener" fails.
//   - Remove tabIndex={on ? 0 : -1} from the type radios: "the type radios are one Tab stop" fails.
test.describe('opening, closing and keyboard', () => {
  test('the popup stays open after an export, names the file in the dock, and offers Export again', async ({ page }) => {
    watch(page, 'a free account exporting the style guide')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await categoryRadio(panel, 'Style guide').click()
    const file = await takeDownload(page)
    await expect(panel).toBeVisible()
    await expect(dockStatus(panel)).toHaveText(`Downloaded ${file.name}.`)
    await expect(primaryButton(panel)).toHaveText('Export again')
    await expect(dockError(panel)).toHaveCount(0)
    // Choosing something else clears the old file from the dock.
    await fileGroup(panel, 'Style guide').getByRole('radio', { name: 'Markdown', exact: true }).click()
    await expect(dockStatus(panel)).not.toContainText('Downloaded')
    await expect(primaryButton(panel)).toHaveText('Export style guide')
  })

  test('while a file builds the rail holds still, Escape and Close export do nothing, and focus stays inside', async ({ page }) => {
    watch(page, 'a Pro account waiting for the book')
    await page.addInitScript(() => { window.print = () => {} })
    let finish
    const held = new Promise((resolve) => { finish = resolve })
    await page.route('**/api/ai?export=document', async (route) => {
      await held
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, format: 'book', html: buildDesignSystemBook({ palette: { base: '#1F4B8E', colors: ['#1F4B8E', '#3FA9A0'] } }, { projectName: 'Stub' }) }),
      })
    })
    await signIn(page, { plan: 'pro' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    // The print tab is reserved on the click itself, so listen before pressing.
    const opened = page.context().waitForEvent('page')
    await primaryButton(panel).click()
    await expect(primaryButton(panel)).toBeDisabled()
    await expect(dockStatus(panel)).not.toBeEmpty()

    await categoryRadio(panel, 'Style guide').click({ force: true })
    expect((await shownPick(panel)).category, 'the rail ignores a click while a file builds').toBe('Book')
    await page.keyboard.press('Escape')
    await panel.getByRole('button', { name: 'Close export' }).click({ force: true })
    await expect(panel).toBeVisible()
    expect(await page.evaluate(() => !!document.activeElement.closest('.xd-card')), 'focus stays inside the popup').toBe(true)

    finish()
    await (await opened).close()
    await expect(primaryButton(panel)).toBeEnabled()
    await page.keyboard.press('Escape')
    await expect(exportPanel(page)).toBeHidden()
  })

  for (const way of ['Escape', 'Close export']) {
    test(`${way} closes the popup and focus returns to the Export button`, async ({ page }) => {
      watch(page, 'a designer closing the export popup')
      await go(page, WORKED_BOARD)
      const opener = page.locator('.pnav-export')
      await opener.focus()
      await page.keyboard.press('Enter')
      const panel = await settled(page)
      await expect(panel.getByRole('heading', { level: 2 }), 'focus starts on the title').toBeFocused()
      if (way === 'Escape') await page.keyboard.press('Escape')
      else await panel.getByRole('button', { name: 'Close export' }).click()
      await expect(exportPanel(page)).toBeHidden()
      await expect(opener).toBeFocused()
    })
  }

  test('the type radios are one Tab stop and the arrow keys rove and choose across them', async ({ page }) => {
    watch(page, 'a keyboard user in the export rail')
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    const tabStops = await panel.getByRole('radiogroup', { name: 'Export type' })
      .evaluate((group) => [...group.querySelectorAll('[role=radio]')].filter((r) => r.tabIndex === 0 && !r.closest('[role=radiogroup]:not([aria-label="Export type"])')).length)
    expect(tabStops, 'one Tab stop in the type group').toBe(1)

    await typeRadio(panel, 'Brand book').focus()
    await page.keyboard.press('ArrowDown')
    await expect(typeRadio(panel, 'UI kit')).toBeFocused()
    await expect(typeRadio(panel, 'UI kit')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(typeRadio(panel, 'Code')).toBeFocused()
    await expect(typeRadio(panel, 'Code')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(typeRadio(panel, 'Brand book'), 'the end wraps to the start').toBeFocused()
    await page.keyboard.press('End')
    await expect(typeRadio(panel, 'Code')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(typeRadio(panel, 'Brand book')).toBeFocused()
    await expect(typeRadio(panel, 'Brand book')).toHaveAttribute('aria-checked', 'true')
  })

  test('with the keyboard alone: pick a category and a file, then export', async ({ page }) => {
    watch(page, 'a keyboard user exporting')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    await page.locator('.pnav-export').focus()
    await page.keyboard.press('Enter')
    const panel = await settled(page)
    await typeRadio(panel, 'Brand book').focus()
    await categoryRadio(panel, 'Book').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(categoryRadio(panel, 'Style guide')).toBeChecked()
    await fileGroup(panel, 'Style guide').getByRole('radio', { checked: true }).focus()
    await page.keyboard.press('ArrowRight')
    const picked = await shownPick(panel)
    expect(picked.file, 'the arrow chose the next file').not.toBe('HTML')
    await primaryButton(panel).focus()
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
    expect(download.suggestedFilename()).toMatch(/-style-guide\./)
    expect(await page.evaluate(() => {
      const el = document.activeElement
      const s = el ? getComputedStyle(el) : null
      return Boolean(el && el.closest('.xd-card')) && (parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none')
    }), 'focus stays in the popup with a visible ring').toBe(true)
  })
})

// Criterion 6 side and the "Checking your plan…" state.
//   - Drop `|| checking` from the primary's disabled: the disabled assertions fail.
//   - Pass showTags={!isPro} (drop `&& !checking`): "held back" fails for the Pro account.
test.describe('while the plan is still loading', () => {
  for (const plan of ['free', 'pro']) {
    test(`a ${plan} account sees "Checking your plan…", disabled, and no Pro furniture, until the plan answers`, async ({ page }) => {
      watch(page, `a ${plan} account opening Export before its plan has answered`)
      const uid = `test-uid-held-${plan}`
      await signIn(page, { plan, uid, slowReads: [{ path: `users/${uid}`, hold: true }] })
      await go(page, WORKED_BOARD)
      const panel = await openFromHeader(page)
      const tags = panel.locator('.xd-pro, .xd-free, .xd-lock')

      // A Pro category, then a free one.
      await expect(primaryButton(panel), 'Book, plan unknown').toHaveText('Checking your plan…')
      await expect(primaryButton(panel)).toBeDisabled()
      await expect(dockStatus(panel)).toHaveText('Checking your plan…')
      await expect(tags, 'held back: no tag and no lock').toHaveCount(0)
      await expect(categoryRadio(panel, 'Book')).not.toHaveAccessibleName(/, (Pro|free)$/)
      await categoryRadio(panel, 'Style guide').click()
      await expect(primaryButton(panel), 'Style guide, plan unknown').toHaveText('Checking your plan…')
      await expect(primaryButton(panel)).toBeDisabled()
      expect(await page.evaluate(() => typeof window.__UIL4B_TEST_HOLD__?.release)).toBe('function')

      await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
      await expect(primaryButton(panel)).toBeEnabled()
      await expect(primaryButton(panel), 'Style guide once the plan is known').toHaveText('Export style guide')
      await categoryRadio(panel, 'Book').click()
      await expect(primaryButton(panel), 'Book once the plan is known').toHaveText(plan === 'pro' ? 'Export PDF' : 'Unlock with Pro')
      await expect(categoryRadio(panel, 'Book'), 'the tag, free accounts only').toHaveAccessibleName(plan === 'free' ? 'Book, A4 pages, Pro' : 'Book, A4 pages')
      await expect(panel.locator('.xd-lock')).toHaveCount(plan === 'free' ? 1 : 0)
    })
  }
})

// Criteria 6 and 24 (the kept controls): file memory, one layout line, no em dash.
//   - Reset the file to the category's first on every switch (lastFile ref): the memory test fails.
//   - Put an em dash in any step copy: the em dash test names the category.
test.describe('what the popup remembers and says', () => {
  test('each category remembers its file: Style guide on PNG survives a trip to Book', async ({ page }) => {
    watch(page, 'a designer switching categories')
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await categoryRadio(panel, 'Style guide').click()
    await fileGroup(panel, 'Style guide').getByRole('radio', { name: 'PNG', exact: true }).click()
    await categoryRadio(panel, 'Book').click()
    await fileGroup(panel, 'Book').getByRole('radio', { name: 'HTML', exact: true }).click()
    await categoryRadio(panel, 'Style guide').click()
    expect((await shownPick(panel)).file).toBe('PNG')
    await categoryRadio(panel, 'Book').click()
    expect((await shownPick(panel)).file).toBe('HTML')
    await typeRadio(panel, 'Code').click()
    await typeRadio(panel, 'Brand book').click()
    expect((await shownPick(panel)).category, 'back in Brand book').toBe('Book')
  })

  test('PNG pages under Book replace the layout tiles with "PNG pages use one layout."', async ({ page }) => {
    watch(page, 'a designer choosing PNG pages')
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    await expect(panel.getByRole('radiogroup', { name: 'Template' })).toBeVisible()
    await fileGroup(panel, 'Book').getByRole('radio', { name: 'PNG pages', exact: true }).click()
    await expect(panel.getByRole('radiogroup', { name: 'Template' })).toHaveCount(0)
    await expect(panel.getByText('PNG pages use one layout.')).toBeVisible()
  })

  test('the steps are File, Layout and Details, and a category with no layout has none', async ({ page }) => {
    watch(page, 'a designer reading the steps')
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    const steps = async () => panel.getByRole('heading', { level: 3 }).allInnerTexts()
    expect(await steps()).toEqual(['File', 'Layout', 'Details'])
    await categoryRadio(panel, 'Style guide').click()
    expect(await steps()).toEqual(['File', 'Details'])
    await typeRadio(panel, 'Code').click()
    expect((await steps()).slice(0, 1)).toEqual(['File'])
    await expect(panel.getByRole('radiogroup', { name: /categories$/ }), 'Code shows no sub-rows').toHaveCount(0)
    await typeRadio(panel, 'UI kit').click()
    await expect(panel.getByRole('radiogroup', { name: /categories$/ }), 'UI kit shows no sub-rows').toHaveCount(0)
  })

  test('no category says anything with an em dash, free or Pro', async ({ page }) => {
    watch(page, 'a designer reading every category')
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    for (const category of CATEGORIES) {
      await category.go(panel)
      await expect(panel.locator('.xd-swap')).toBeVisible()
      const text = await panel.evaluate((card) => [card.innerText, ...[...card.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label'))].join('\n'))
      expect(text, `${category.name} contains an em dash`).not.toContain('—')
      expect(text.length, `${category.name} drew its text`).toBeGreaterThan(80)
    }
  })
})

const walkthrough = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })

/** Walk the brand kit walkthrough to its end and save the project as "Harbour Studio". */
async function walkToSave(page) {
  await page.addInitScript(() => {
    try { if (window.innerWidth < 900 && !localStorage.getItem('vs-uikit-guide')) localStorage.setItem('vs-uikit-guide', '1') } catch { /* blocked */ }
  })
  await go(page, '/create/palette')
  if (!(await walkthrough(page).count())) {
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.locator('.pnav-editorial-cta').click()
  }
  await expect(walkthrough(page)).toBeVisible()
  for (const [button, url] of [
    [/^Next: Fonts/, /\/create\/font-pair$/],
    [/^Next: Type scale/, /\/create\/type-scale$/],
    [/^Next: Icons/, /\/create\/icons$/],
  ]) {
    await walkthrough(page).getByRole('button', { name: button }).click()
    await expect(page).toHaveURL(url)
  }
  await walkthrough(page).getByRole('button', { name: /^Name your project/ }).click()
  const form = page.getByRole('dialog', { name: 'Name your project' })
  await form.getByRole('textbox', { name: 'Project name' }).fill('Harbour Studio')
  await form.getByRole('button', { name: 'Save project' }).click()
}

// Criterion 9 (return from checkout) and the walkthrough's end.
//   - Point the walkthrough's navigate() back at /projects/:id: "ends on the export route" fails.
//   - Drop the uid or project check in CheckoutReturn.jsx: "Back to your export" fails.
//   - Ignore the stored pick in ProjectExport.jsx: "reopens on the same category and file" fails.
test.describe('the walkthrough and the way back from checkout', () => {
  test('the walkthrough ends on the export route with the popup open and the project saved', async ({ page }) => {
    watch(page, 'a free designer finishing the brand kit')
    await signIn(page, { plan: 'free', projects: 0 })
    await walkToSave(page)
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+\/export$/)
    const panel = await settled(page)
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText('Export Harbour Studio')
    const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat())
    expect(saved).toHaveLength(1)
  })

  test('at the free cap the walkthrough keeps its cap message and never opens the popup', async ({ page }) => {
    watch(page, 'a free designer with three projects')
    await signIn(page, { plan: 'free', projects: 3 })
    await walkToSave(page)
    const refusal = page.getByTestId('brand-kit-save-refusal')
    await expect(refusal).toContainText('Free plan saves up to 3 projects')
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
    await expect(page).not.toHaveURL(/\/export$/)
    await expect(exportPanel(page)).toHaveCount(0)
  })

  test('"Back to your export" is only for the account and project that made the pick, and reopens on that pick', async ({ browser }) => {
    const PAID = JSON.stringify({ status: 'complete', mode: 'subscription', customerEmail: 'free.user@uil4b.test', subscriptionActive: true })
    const visit = async (pickFor) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      watch(page, 'a buyer returning from checkout')
      await page.route('**/api/checkout-status**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: PAID }))
      const session = await signIn(page, { plan: 'free', projects: [savedProject()] })
      await page.addInitScript((value) => { sessionStorage.setItem('uil4b.kitGalleryPick', JSON.stringify({ ...value, at: Date.now() })) }, pickFor(session.uid))
      await go(page, '/checkout/return?session_id=cs_test_paid')
      await expect(page.locator('main h1')).toContainText('You’re on UIL4B Pro')
      return { context, page }
    }
    const back = (page) => page.getByRole('link', { name: 'Back to your export' })

    // Control: the same account and a project it has. The link is there, so "absent" below means something.
    const own = await visit((uid) => ({ projectId: 'harbour', design: 'book', format: 'png', uid }))
    await expect(back(own.page)).toHaveAttribute('href', ROUTE)
    await back(own.page).click()
    const panel = await settled(own.page)
    expect(await shownPick(panel), 'the popup reopens on the same category and file').toEqual({ type: 'Brand book', category: 'Book', file: 'PNG pages' })
    await own.context.close()

    const foreign = await visit(() => ({ projectId: 'harbour', design: 'book', format: 'pdf', uid: 'someone-else' }))
    await expect(foreign.page.getByRole('link', { name: 'Start building' })).toBeVisible()
    await expect(back(foreign.page)).toHaveCount(0)
    await foreign.context.close()

    const gone = await visit((uid) => ({ projectId: 'deleted-project', design: 'book', format: 'pdf', uid }))
    await expect(gone.page.getByRole('link', { name: 'Start building' })).toBeVisible()
    await expect(back(gone.page)).toHaveCount(0)
    await gone.context.close()
  })
})

// Criterion 15: offline, the network exports say so and send nothing; the others still download.
//   - Remove the isOffline() check in useExportRunner.run: the Book / Slides / UI kit cases fail (a request leaves).
//   - Make Style guide or Code need the network: the "still download" case fails.
test.describe('offline', () => {
  test('Book, Slides and the UI kit show the offline line and send nothing; Style guide and Code still download', async ({ page, context }) => {
    watch(page, 'a Pro account exporting with no connection')
    await page.addInitScript(() => { window.print = () => {} })
    await stubFonts(page)
    await signIn(page, { plan: 'pro' })
    await go(page, WORKED_BOARD)
    const panel = await openFromHeader(page)
    // Visit every category first so their code and previews are loaded, then lose the connection.
    for (const category of CATEGORIES) {
      await category.go(panel)
      await expect(panel.locator('.xd-swap')).toBeVisible()
      await page.waitForTimeout(300)
    }
    await context.setOffline(true)
    const sent = []
    // Template pictures may still load lazily from this site; an export would call the API, a font host or Stripe.
    page.on('request', (req) => { if (/\/api\/|fonts\.|jsdelivr|stripe/.test(req.url())) sent.push(req.url()) })

    for (const category of CATEGORIES.slice(0, 2).concat(CATEGORIES[3])) {
      await category.go(panel)
      await primaryButton(panel).click()
      await expect(dockError(panel), `${category.name}: the offline line`).toContainText(/offline/i)
      await expect(dockError(panel)).toContainText('Nothing was exported')
    }
    expect(sent, 'nothing left the page while offline').toEqual([])
    await expect(panel).toBeVisible()

    for (const [category, expected] of [[CATEGORIES[2], /-style-guide\./], [CATEGORIES[4], /\.css$/]]) {
      await category.go(panel)
      const file = await takeDownload(page)
      expect(file.name, `${category.name} still downloads offline`).toMatch(expected)
      await expect(dockError(panel)).toHaveCount(0)
    }
  })
})
