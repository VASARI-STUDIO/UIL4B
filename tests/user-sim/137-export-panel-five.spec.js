// THE EXPORT PANEL, "FIVE THINGS YOU CAN TAKE".
//
// The panel used to list eleven formats at one weight. It now offers five rows
// (UI kit, Style guide, Design tokens, then the Design system book and Brand
// guidelines below a gap), a file-type switch inside the rows that have more than
// one file, and a real, blurred preview of the person's own system on the two
// Pro rows. This file is the panel's Done-when list:
//
//   1. exactly 5 radios in ONE radiogroup, no Soon row, no disabled button
//   2. every live format is reachable through a row plus its switch
//   3. Free: the book shows a lock, "Pro", three blurred thumbnails, and
//      "Unlock with Pro" goes to /plans. Pro: no lock, sharp thumbnails
//   4. the blur is in the pixels, not in a CSS class
//   5. Style guide, then PNG, then Export downloads <slug>-style-guide.png and
//      the toast names the file
//   6. no em dash and no eyebrow anywhere in the panel
//   7. the button's top does not move between states, at 390, 768 and 1440
//   plus: signed out, keyboard and focus, the walkthrough clause, 390 sheet.
//
// "Checking your plan..." (planKnown false) is held open with
// signIn({ slowReads: [{ path, hold: true }] }), which keeps the entitlement
// listener silent until the page calls window.__UIL4B_TEST_HOLD__.release().
//
// NOT COVERED HERE, and why: the server-refusal band does not exist yet (no
// server checks Pro formats).
//
// MUTATION (each break below must fail the test named after it):
//   - Draw the previews without calling bakeBlur (utils/proPreviews.js,
//     renderProPreviews: `blurred ? bakeBlur(canvas) : canvas` -> `canvas`):
//     "the blur is in the pixels" fails, because the free thumbnail is as sharp
//     as the Pro one.
//   - Render `<ExportProTag />` for every account (drop `showPro &&`): the Pro
//     account sees a lock, so "a Pro account has no intro, no Pro words" and
//     "the blur is in the pixels, and a Pro account sees ... no lock" fail.
//   - Put role="group" back on .exp-formats, or leave a Soon row in: "exactly
//     five radios in one radiogroup" fails.
//   - Change a format's `group` in config/exportFormats.js so it has no row:
//     "every live format is reachable" fails.
//   - Re-add the eyebrow span or an em dash to the panel copy: "no eyebrow and
//     no em dash" fails.
//   - Remove `tabIndex={active ? 0 : -1}` from the rows: "keyboard: focus
//     starts on the title, the rows are one Tab stop..." fails.
//   - Restore "You can change it later in Export" in UIKitGuide.jsx: "the
//     walkthrough no longer promises a rename in Export" fails.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { EXPORT_FORMATS, EXPORT_GROUPS, liveFormats, assertGroupsCoherent } from '../../src/config/exportFormats.js'
import { chooseFormat, exportPanel, rowFor, actionLabel } from './export-rows.js'

const WORKED_BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const SIZES = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

async function open(page) {
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  // The sheet rises in; measuring its buttons before that ends reads a moving box.
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  return panel
}

// Mean absolute difference between neighbouring pixels: high for a sharp
// picture, low once it is blurred. Same-origin blob images do not taint a canvas.
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

test.describe('the five-row export panel', () => {
  test('the config groups every live format into a row', () => {
    expect(assertGroupsCoherent()).toBe(true)
    expect(EXPORT_GROUPS.map((g) => g.id)).toEqual(['kit', 'guide', 'tokens', 'book', 'guidelines'])
  })

  test('exactly five radios in one radiogroup, no Soon row, no disabled button', async ({ page }) => {
    watch(page, 'a free account opening Export')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)

    const group = panel.getByRole('radiogroup', { name: 'Export your design system' })
    await expect(group.getByRole('radio')).toHaveCount(5)
    // Every row radio belongs to that one group (the file-type switch is a second
    // group, in the options region), and nothing wraps them in a plain group.
    await expect(panel.locator('.exp-formats[role="radiogroup"] > [role="radio"]')).toHaveCount(5)
    await expect(panel.locator('[role="group"] [role="radio"]')).toHaveCount(0)
    await expect(panel.locator('.exp-fmt-soon')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: /Soon/ })).toHaveCount(0)
    await expect(panel.locator('.exp-foot .btn-accent')).toBeEnabled()
    // The unbuilt formats are one quiet line.
    await expect(panel.locator('.exp-coming')).toHaveText('A Tailwind theme and an asset bundle are on the way.')
  })

  test('every live format is reachable through a row plus its switch', async ({ page }) => {
    watch(page, 'a free account walking every file type')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    for (const f of liveFormats()) {
      await chooseFormat(panel, f.id)
      const primary = panel.locator('.exp-foot .btn-accent')
      await expect(primary).toHaveText(f.pro ? 'Unlock with Pro' : actionLabel(f.id))
      await expect(primary).toBeEnabled()
    }
    expect(EXPORT_FORMATS.filter((f) => f.live).length).toBe(liveFormats().length)
  })

  test('Free: the book shows a lock, Pro and three blurred thumbnails, and unlocks to /plans', async ({ page }) => {
    watch(page, 'a free account looking at the design system book')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)

    const book = rowFor(panel, 'Design system book')
    await expect(book).toHaveAccessibleName('Design system book, Pro')
    await expect(book.locator('.exp-fmt-pro')).toHaveText('Pro')
    await expect(book.locator('.exp-pro-lock')).toBeVisible()
    await book.click()

    const region = panel.getByRole('region', { name: 'Options for Design system book' })
    const thumbs = region.locator('.exp-thumb[data-blurred="true"]')
    await expect(thumbs).toHaveCount(3)
    for (let i = 0; i < 3; i += 1) {
      await expect(thumbs.nth(i)).toHaveAttribute('alt', /^Blurred preview of your design system book, page \d/)
      expect(await thumbs.nth(i).evaluate((img) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
    }
    const action = panel.getByRole('button', { name: 'Unlock with Pro' })
    await expect(action).toBeEnabled()
    await action.click()
    await expect(page).toHaveURL(/\/plans(\?|$)/)
  })

  test('the blur is in the pixels, and a Pro account sees sharp thumbnails and no lock', async ({ browser }) => {
    // MUTATION: skip bakeBlur and the free sharpness equals the Pro sharpness.
    const measure = async (plan) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      watch(page, `a ${plan} account measuring the guidelines preview`)
      await signIn(page, { plan })
      await go(page, WORKED_BOARD)
      const panel = await open(page)
      await rowFor(panel, 'Brand guidelines').click()
      const thumbs = panel.locator('.exp-thumb[data-blurred]')
      await expect(thumbs).toHaveCount(3)
      if (plan === 'free') {
        // Take the class and the attribute away: nothing sharper is underneath.
        await panel.evaluate((el) => {
          el.querySelectorAll('.exp-thumb').forEach((img) => { img.removeAttribute('class'); img.removeAttribute('data-blurred'); img.removeAttribute('style') })
        })
      }
      const locked = await panel.locator('.exp-pro-lock').count()
      const value = await sharpness(panel.locator('img[alt*="page 2"]'))
      await context.close()
      return { value, locked }
    }
    const free = await measure('free')
    const pro = await measure('pro')
    expect(free.locked, 'a free account sees the lock').toBeGreaterThan(0)
    expect(pro.locked, 'a Pro account sees no lock').toBe(0)
    expect(free.value, `free ${free.value} must be softer than Pro ${pro.value}`).toBeLessThan(pro.value * 0.7)
  })

  test('Style guide, PNG, Export downloads the PNG and the toast names it', async ({ page }) => {
    watch(page, 'a free account exporting the style guide as a PNG')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await chooseFormat(panel, 'png')
    const primary = panel.getByRole('button', { name: 'Export style guide (PNG)', exact: true })
    const [download] = await Promise.all([page.waitForEvent('download'), primary.click()])
    expect(download.suggestedFilename()).toMatch(/-style-guide\.png$/)
    await expect(page.getByText(`Downloaded ${download.suggestedFilename()}`)).toBeVisible()
  })

  test('signed out is the same as Free: Pro rows go to /plans', async ({ page }) => {
    watch(page, 'a visitor with no account opening Export')
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await rowFor(panel, 'Brand guidelines').click()
    await expect(panel.locator('.exp-preview-lock')).toBeVisible()
    await panel.getByRole('button', { name: 'Unlock with Pro' }).click()
    await expect(page).toHaveURL(/\/plans(\?|$)/)
  })

  test('a Pro account has no intro, no Pro words and the real action', async ({ page }) => {
    watch(page, 'a Pro account opening Export')
    await signIn(page, { plan: 'pro' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await expect(panel.locator('.exp-sub')).toHaveCount(0)
    await expect(panel.locator('.exp-fmt-pro, .exp-pro-lock')).toHaveCount(0)
    await rowFor(panel, 'Design system book').click()
    await expect(panel.locator('.exp-thumb[data-blurred="false"]')).toHaveCount(3)
    await expect(panel.locator('.exp-foot .btn-accent')).toHaveText('Export book')
  })

  test('no eyebrow and no em dash anywhere in the panel', async ({ page }) => {
    watch(page, 'a free account reading every row of the panel')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    for (const g of EXPORT_GROUPS) {
      await rowFor(panel, g.name).click()
      const text = await panel.innerText()
      expect(text, `row ${g.id}`).not.toContain('—')
    }
    await expect(panel.locator('.exp-eyebrow')).toHaveCount(0)
    await expect(panel.locator('.exp-sub')).toHaveText('Pick what you need. Free files carry a small UIL4B mark.')
  })

  test('keyboard: focus starts on the title, the rows are one Tab stop, arrows choose', async ({ page }) => {
    watch(page, 'a keyboard user working the panel')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await expect(panel.getByRole('heading', { name: 'Export your design system' })).toBeFocused()

    // The five rows hold one tab stop: the chosen one.
    await expect(panel.locator('.exp-formats [role="radio"][tabindex="0"]')).toHaveCount(1)
    await expect(panel.locator('.exp-formats [role="radio"][tabindex="-1"]')).toHaveCount(4)

    await rowFor(panel, 'UI kit').focus()
    await page.keyboard.press('ArrowDown')
    await expect(rowFor(panel, 'Style guide')).toBeFocused()
    await expect(rowFor(panel, 'Style guide')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('End')
    await expect(rowFor(panel, 'Brand guidelines')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(rowFor(panel, 'UI kit')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(rowFor(panel, 'Brand guidelines')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(rowFor(panel, 'UI kit')).toBeFocused()

    // Style guide: Tab goes from the row to the switch (one stop); arrows choose.
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Tab')
    const switchGroup = panel.getByRole('radiogroup', { name: 'Style guide file type' })
    await expect(switchGroup.getByRole('radio', { name: 'HTML', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(switchGroup.getByRole('radio', { name: 'Markdown', exact: true })).toBeFocused()
    await expect(panel.locator('.exp-foot .btn-accent')).toHaveText('Export style guide (Markdown)')
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
  })

  test('the walkthrough no longer promises a rename in Export', () => {
    const src = fs.readFileSync(path.resolve('src/components/UIKitGuide.jsx'), 'utf8')
    expect(src).not.toMatch(/later in Export/i)
  })
})

for (const size of SIZES) {
  test.describe(`at ${size.width}px`, () => {
    test.use({ viewport: size })

    test('the action does not move between states, and the layout holds', async ({ page }) => {
      watch(page, `a free account at ${size.width}px`)
      await signIn(page, { plan: 'free' })
      await go(page, WORKED_BOARD)
      const panel = await open(page)
      const primary = panel.locator('.exp-foot .btn-accent')
      const top = async () => (await primary.boundingBox()).y

      // A row with a switch is taller than the kit row, so picking it may move the
      // button on a desktop dialog; the file type inside the row must not.
      await chooseFormat(panel, 'html')
      const inRow = await top()
      await chooseFormat(panel, 'png')
      expect(await top(), 'switching the file type leaves the button where it was').toBeCloseTo(inRow, 0)
      await chooseFormat(panel, 'md')
      expect(await top(), 'and so does the next one').toBeCloseTo(inRow, 0)

      // No horizontal overflow of the page, and the switch stays on one line.
      const pills = await panel.locator('.exp-pill').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      expect(new Set(pills).size, 'the file-type pills sit on one line').toBe(1)
      for (const h of await panel.locator('.exp-pill').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
        expect(h).toBeGreaterThanOrEqual(44)
      }

      await rowFor(panel, 'Brand guidelines').click()
      const strip = panel.locator('.exp-preview-strip')
      await expect(strip).toBeVisible()
      const { scrolls } = await strip.evaluate((el) => ({ scrolls: el.scrollWidth > el.clientWidth + 1 }))
      // Three 160px pages and two gaps need 504px: they scroll on a phone and fit at 768 and up.
      expect(scrolls).toBe(size.width < 560)

      if (size.width < 560) {
        const box = await panel.boundingBox()
        expect(Math.round(box.width), 'a phone gets a full-width sheet').toBe(size.width)
        expect(Math.round(box.y + box.height), 'anchored to the foot of the screen').toBe(size.height)
      }
      await page.screenshot({ path: `.claude/scratch/exportpanel/panel-${size.width}.png` })
    })
  })
}

// ─── THE PLAN STILL LOADING, THE ROW MEMORY, THE DOCK, THE PHONE EDGE, THE STRIP ───
//
// What the review of the five-row panel asked for, one test per behaviour.
// Each MUTATION line names the break that must turn its test red.

const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))

// A row is ready to measure once its pictures are in: the box is reserved, but a
// shift when they land would be a real shift, so it is waited for here.
async function showRow(panel, group) {
  await rowFor(panel, group.name).click()
  if (group.preview) await expect(panel.locator('.exp-preview-strip[data-state="ready"]')).toHaveCount(1)
  await settle(panel.page())
}

const FONT_FILE = 'https://fonts.gstatic.com/s/kitfixture/latin.woff2'
const CSS2 = `/* latin */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400 700; font-display: swap; src: url(${FONT_FILE}) format('woff2'); unicode-range: U+0000-00FF; }`
// The kit export fetches its fonts; answer them from fixtures, with no licence
// text, so the export finishes with a "could not be embedded" notice in the dock.
async function fontsWithoutLicence(page) {
  const woff2 = fs.readFileSync('public/fonts/geist-latin.woff2')
  await page.route(/fonts\.googleapis\.com\/css2/, (route) => (route.request().resourceType() === 'fetch'
    ? route.fulfill({ status: 200, contentType: 'text/css', body: CSS2 })
    : route.continue()))
  await page.route(FONT_FILE, (route) => route.fulfill({ status: 200, contentType: 'font/woff2', body: woff2 }))
  await page.route(/cdn\.jsdelivr\.net\/gh\/google\/fonts/, (route) => route.fulfill({ status: 404, body: '' }))
}

test.describe('while the plan is still loading', () => {
  // MUTATION: ExportPanel.jsx `const checking = planKnown === false` ->
  // `Boolean(activeFormat?.pro) && planKnown === false`. The free UI kit row then
  // says "Export UI kit" and is enabled before the account has answered, so a
  // free file could be built (watermarked) for someone who turns out to be Pro:
  // the "free row" step fails. Dropping `|| checking` from `disabled` fails both.
  for (const plan of ['free', 'pro']) {
    test(`a ${plan} account sees "Checking your plan…", disabled, on a free row and a Pro row, until the plan answers`, async ({ page }) => {
      watch(page, `a ${plan} account opening Export before its plan has answered`)
      const uid = `test-uid-held-${plan}`
      await signIn(page, { plan, uid, slowReads: [{ path: `users/${uid}`, hold: true }] })
      await go(page, WORKED_BOARD)
      const panel = await open(page)
      const action = panel.locator('.exp-foot .btn-accent')

      // A free row (the UI kit, chosen on open).
      await expect(rowFor(panel, 'UI kit')).toHaveAttribute('aria-checked', 'true')
      await expect(action, 'free row, plan unknown').toHaveText('Checking your plan…')
      await expect(action).toBeDisabled()
      // A Pro row.
      await rowFor(panel, 'Design system book').click()
      await expect(action, 'Pro row, plan unknown').toHaveText('Checking your plan…')
      await expect(action).toBeDisabled()
      // Nothing was held on the page itself: the plan is the only thing waiting.
      expect(await page.evaluate(() => typeof window.__UIL4B_TEST_HOLD__?.release)).toBe('function')

      await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
      await expect(action).toBeEnabled()
      await expect(action, 'the Pro row once the plan is known').toHaveText(plan === 'pro' ? actionLabel('book') : 'Unlock with Pro')
      await rowFor(panel, 'UI kit').click()
      await expect(action, 'the free row once the plan is known').toHaveText(actionLabel('kit'))
      await expect(action).toBeEnabled()
    })
  }
})

test('a row remembers the file type last chosen in it', async ({ page }) => {
  // MUTATION: ExportPanel.jsx pickGroup -> `pickFormat(groupFormats(groupId)[0].id)`
  // (always the row's first file type). Coming back to Style guide then lands on
  // HTML, and Design tokens on CSS, so both assertions after the round trip fail.
  watch(page, 'a free account choosing a file type, leaving the row and coming back')
  await signIn(page, { plan: 'free' })
  await go(page, WORKED_BOARD)
  const panel = await open(page)
  const fileType = (group, name) => panel.getByRole('radiogroup', { name: `${group} file type` }).getByRole('radio', { name, exact: true })

  await chooseFormat(panel, 'png')
  await chooseFormat(panel, 'json')
  await rowFor(panel, 'UI kit').click()

  await rowFor(panel, 'Style guide').click()
  await expect(fileType('Style guide', 'PNG'), 'Style guide comes back on PNG').toHaveAttribute('aria-checked', 'true')
  await expect(panel.locator('.exp-foot .btn-accent')).toHaveText('Export style guide (PNG)')
  await rowFor(panel, 'Design tokens').click()
  await expect(fileType('Design tokens', 'JSON'), 'Design tokens comes back on JSON').toHaveAttribute('aria-checked', 'true')
  await expect(panel.locator('.exp-foot .btn-accent')).toHaveText('Export JSON tokens')
})

for (const size of [{ width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test.describe(`the dock at ${size.width}px`, () => {
    test.use({ viewport: size })

    test('the action button keeps its top across every row and the downloaded notice', async ({ page }) => {
      // MUTATION: overlay.css `.exp-coming{margin:auto 0 0}` -> `margin:0`. With no
      // free space taken, the dock rides up under a short row and the button's top
      // differs row to row. (Removing `margin-top:auto` from .exp-dock alone does
      // not: `.exp-coming + .exp-dock{margin-top:0}` outranks it while the "on the
      // way" line renders, so the coming line is what holds the dock down.)
      watch(page, `a free account moving across every row at ${size.width}px`)
      await fontsWithoutLicence(page)
      await signIn(page, { plan: 'free' })
      await go(page, WORKED_BOARD)
      const panel = await open(page)
      const top = () => panel.locator('.exp-foot .btn-accent').evaluate((el) => el.getBoundingClientRect().top)

      await expect(rowFor(panel, 'UI kit')).toHaveAttribute('aria-checked', 'true')
      const base = await top()
      expect(base, 'the button is inside the window').toBeLessThan(size.height)
      for (const group of EXPORT_GROUPS) {
        await showRow(panel, group)
        expect(Math.abs((await top()) - base), `the button's top on the ${group.name} row`).toBeLessThanOrEqual(1)
      }

      await showRow(panel, EXPORT_GROUPS[0])
      await Promise.all([page.waitForEvent('download', { timeout: 30000 }), panel.getByRole('button', { name: 'Export UI kit', exact: true }).click()])
      await expect(panel.getByRole('status')).toContainText('Your UI kit downloaded.')
      await settle(page)
      expect(Math.abs((await top()) - base), 'the button after the downloaded notice shows').toBeLessThanOrEqual(1)
    })
  })
}

test.describe('the dock at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the dock stays at the foot of the sheet on every row and after the notice', async ({ page }) => {
    // MUTATION: overlay.css `.exp-dock{position:sticky;bottom:0;...}` ->
    // `position:static`. Where a row makes the sheet scroll, the dock then sits
    // at the end of the content instead of the foot of the visible sheet.
    watch(page, 'a free account moving across every row on a phone')
    await fontsWithoutLicence(page)
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    const gap = () => panel.evaluate((el) => {
      const sheet = el.getBoundingClientRect()
      const dock = el.querySelector('.exp-dock').getBoundingClientRect()
      return { dockToSheet: Math.abs(sheet.bottom - dock.bottom), sheetToScreen: Math.abs(window.innerHeight - sheet.bottom) }
    })

    for (const group of EXPORT_GROUPS) {
      await showRow(panel, group)
      const g = await gap()
      expect(g.dockToSheet, `the dock sits on the sheet's bottom edge on ${group.name}`).toBeLessThanOrEqual(1)
      expect(g.sheetToScreen, `the sheet sits on the screen's bottom edge on ${group.name}`).toBeLessThanOrEqual(1)
    }
    await showRow(panel, EXPORT_GROUPS[0])
    await Promise.all([page.waitForEvent('download', { timeout: 30000 }), panel.getByRole('button', { name: 'Export UI kit', exact: true }).click()])
    await expect(panel.getByRole('status')).toContainText('Your UI kit downloaded.')
    await settle(page)
    expect((await gap()).dockToSheet, 'the dock after the notice').toBeLessThanOrEqual(1)
  })
})

test.describe('the phone gutter', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the title, the row radios, the first option control and the "on the way" line share one 16px edge', async ({ page }) => {
    // MUTATION: overlay.css, put `.exp-options{padding:16px 16px 20px}` (the phone
    // override) back above the base `.exp-options{...padding:12px 24px 16px...}`
    // rule. The base rule then wins and the file-type switch starts at 24px.
    watch(page, 'a free account reading the panel edge on a phone')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await rowFor(panel, 'Style guide').click()
    await expect(panel.getByRole('region', { name: 'Options for Style guide' })).toBeVisible()
    await settle(page)

    const sheetLeft = (await panel.boundingBox()).x
    const edges = await panel.evaluate((el) => {
      const ink = (node) => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect().left }
      const left = (selector) => el.querySelector(selector).getBoundingClientRect().left
      return {
        title: ink(el.querySelector('.exp-title')),
        radio: left('.exp-fmt-check'),
        control: left('.exp-options .exp-pill'),
        onTheWay: ink(el.querySelector('.exp-coming')),
      }
    })
    for (const [name, x] of Object.entries(edges)) {
      expect(Math.abs(x - (sheetLeft + 16)), `${name} starts ${x}px from the left, expected 16px in from the sheet`).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('the preview strip', () => {
  test('is a labelled group a keyboard reaches with Tab, and shows a focus ring', async ({ page }) => {
    // MUTATION: ExportProPreview.jsx, drop `tabIndex={0}` from .exp-preview-strip.
    // Tab from the book row then lands on Cancel, not on the pictures.
    watch(page, 'a keyboard user tabbing from the book row to its pictures')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await rowFor(panel, 'Design system book').click()
    const strip = panel.getByRole('group', { name: 'Pages of your design system book' })
    await expect(strip).toHaveCount(1)
    await expect(strip).toHaveAttribute('data-state', 'ready')

    // The book row now has a template picker between it and the pictures: one Tab stop,
    // on the chosen tile (spec 156 pins that), so the strip is the second stop.
    await rowFor(panel, 'Design system book').focus()
    await page.keyboard.press('Tab')
    await expect(panel.getByRole('radiogroup', { name: 'Template' }).getByRole('radio', { checked: true }), 'the first stop after the row is the chosen template').toBeFocused()
    await page.keyboard.press('Tab')
    await expect(strip, 'the next Tab stop after the template is the strip').toBeFocused()
    const ring = await strip.evaluate((el) => {
      const s = getComputedStyle(el)
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), colour: s.outlineColor }
    })
    expect(ring.style, 'a visible outline, not none').not.toBe('none')
    expect(ring.width).toBeGreaterThanOrEqual(2)
    expect(ring.colour, 'a coloured ring').not.toBe('rgba(0, 0, 0, 0)')
  })
})

test.describe('the divider between free and paid rows', () => {
  // MUTATION: ExportPanel.jsx `const startsPaid = showPro && ...` -> `false` (no
  // band for a free account), or -> `paid && ...` (a band for Pro as well). The
  // free test, or the Pro test, fails.
  test('a free account sees one band, between the free rows and the book', async ({ page }) => {
    watch(page, 'a free account looking for the free and paid divider')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    const band = panel.locator('.exp-fmt-gap')
    await expect(band).toHaveCount(1)
    await expect(band).toBeVisible()
    const order = await band.evaluate((el) => [el.previousElementSibling?.getAttribute('aria-label'), el.nextElementSibling?.getAttribute('aria-label')])
    expect(order, 'between Design tokens and the book').toEqual(['Design tokens', 'Design system book, Pro'])
  })

  test('a Pro account sees no band', async ({ page }) => {
    watch(page, 'a Pro account looking for the free and paid divider')
    await signIn(page, { plan: 'pro' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await expect(panel.getByRole('radio')).toHaveCount(5)
    await expect(panel.locator('.exp-fmt-gap')).toHaveCount(0)
  })
})

test.describe('the sheet head on a phone', () => {
  // A short phone, so the sheet certainly scrolls.
  test.use({ viewport: { width: 390, height: 600 } })

  test('the title and close stay in view after scrolling the sheet to the bottom', async ({ page }) => {
    // MUTATION: overlay.css, drop `position:sticky;top:0` from `.exp-head` in the
    // phone block. Scrolled to the bottom, the head is then above the sheet.
    watch(page, 'a free account scrolling the export sheet on a short phone')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await rowFor(panel, 'Brand guidelines').click()
    await expect(panel.locator('.exp-preview-strip[data-state="ready"]')).toHaveCount(1)

    const room = await panel.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(room, 'the sheet has something to scroll, or this proves nothing').toBeGreaterThan(40)
    await panel.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect.poll(() => panel.evaluate((el) => Math.round(el.scrollTop)), 'scrolled to the bottom').toBe(room)

    const head = await panel.evaluate((el) => {
      const sheet = el.getBoundingClientRect()
      const box = el.querySelector('.exp-head').getBoundingClientRect()
      const close = el.querySelector('.exp-close').getBoundingClientRect()
      const hit = document.elementFromPoint(close.left + close.width / 2, close.top + close.height / 2)
      return { offset: box.top - sheet.top - el.clientTop, closeHit: Boolean(hit?.closest('.exp-close')) }
    })
    expect(Math.abs(head.offset), 'the head is still at the top of the sheet').toBeLessThanOrEqual(1)
    expect(head.closeHit, 'nothing covers the close button').toBe(true)
    await expect(panel.getByRole('heading', { name: 'Export your design system' })).toBeInViewport()
    await expect(panel.getByRole('button', { name: 'Close export' })).toBeInViewport()
  })
})

test.describe('while the plan is still loading, the Pro furniture is held back', () => {
  // MUTATION: ExportPanel.jsx `const showPro = paid && !isPro && !checking` ->
  // `paid && !isPro`. A Pro account then sees the tags and the band while its plan
  // loads, so the "held" step fails. Dropping `showLock` from the preview fails
  // the lock step.
  for (const plan of ['free', 'pro']) {
    test(`a ${plan} account: no tag, band or lock until the plan answers${plan === 'free' ? ', then all of them' : ', and never after'}`, async ({ page }) => {
      watch(page, `a ${plan} account opening Export before its plan has answered`)
      const uid = `test-uid-furniture-${plan}`
      await signIn(page, { plan, uid, slowReads: [{ path: `users/${uid}`, hold: true }] })
      await go(page, WORKED_BOARD)
      const panel = await open(page)
      await rowFor(panel, 'Brand guidelines').click()
      await expect(panel.locator('.exp-preview-strip[data-state="ready"]')).toHaveCount(1)

      await expect(panel.locator('.exp-fmt-pro'), 'held: no Pro tag on any row').toHaveCount(0)
      await expect(panel.locator('.exp-fmt-gap'), 'held: no divider band').toHaveCount(0)
      await expect(panel.locator('.exp-preview-lock'), 'held: no lock over the preview').toHaveCount(0)

      await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
      await expect(panel.locator('.exp-foot .btn-accent')).toBeEnabled()
      const furniture = plan === 'free' ? 1 : 0
      await expect(panel.locator('.exp-fmt-gap')).toHaveCount(furniture)
      await expect(panel.locator('.exp-preview-lock')).toHaveCount(furniture)
      await expect(panel.locator('.exp-fmt-pro')).toHaveCount(furniture * 2)
    })
  }
})

test.describe('an account that signs in at the export gate', () => {
  // MUTATION: ExportPanel.jsx, delete the `if (signedOut) { ... waitForPlan ... }`
  // block in runExport. A Pro account that signs in at the gate then gets a file
  // built on the signed-out visitor's plan, with the credit line, and this test
  // fails on the credit.
  test('a Pro account gets a clean file: the export waits for its plan and reads it again', async ({ page }) => {
    watch(page, 'a Pro visitor, signed out, exporting design tokens and signing in at the gate')
    const uid = 'test-uid-gate-pro'
    await signIn(page, { plan: 'pro', uid, lateSignIn: true, slowReads: [{ path: `users/${uid}`, hold: true }] })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await chooseFormat(panel, 'css')
    const action = panel.locator('.exp-foot .btn-accent')
    await expect(action).toHaveText('Export CSS tokens')

    const downloads = []
    page.on('download', (d) => downloads.push(d))
    await action.click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    // The fixture cannot mint a new account, so this Pro account logs in instead.
    await page.getByRole('button', { name: /Have an account?/ }).click()
    await page.locator('#ui-login-email').fill('someone@uil4b.test')
    await page.locator('#ui-login-password').fill('a-long-password')
    await page.locator('form.auth-form button[type="submit"]').click()
    await expect(page.locator('#ui-login-title')).toHaveCount(0)

    // Signed in, plan not yet read: the panel is open, says so, and has built nothing.
    await expect(action, 'the button reports the plan check').toHaveText('Checking your plan…')
    await page.waitForTimeout(300)
    expect(downloads, 'a file was built before the plan was known').toHaveLength(0)

    const waiting = page.waitForEvent('download')
    await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
    const download = await waiting
    const stream = await download.createReadStream()
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString('utf8')
    expect(body, 'the file holds the palette on the board').toContain('#1F4B8E')
    expect(body, 'a Pro account got the free credit line').not.toContain('Made with UIL4B')
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 600 } })

  // MUTATION: overlay.css, drop `.exp-switch-label{display:block}` from the phone-and-tablet
  // block (the caption then never shows), or `.exp-panel.is-scrolled .exp-head`
  // (the head gets no edge once rows scroll under it).
  test('the file-type switch is captioned, and the head gets an edge once rows scroll under it', async ({ page }) => {
    watch(page, 'a free account on a phone choosing a style guide file type')
    await signIn(page, { plan: 'free' })
    await go(page, WORKED_BOARD)
    const panel = await open(page)
    await rowFor(panel, 'Style guide').click()
    await expect(panel.locator('.exp-switch-label')).toBeVisible()
    await expect(panel.locator('.exp-switch-label')).toHaveText('File type')
    const order = await panel.evaluate((el) => {
      const label = el.querySelector('.exp-switch-label').getBoundingClientRect()
      const group = el.querySelector('.exp-switch').getBoundingClientRect()
      return label.bottom <= group.top
    })
    expect(order, 'the caption sits above the switch').toBe(true)

    const edge = () => panel.evaluate((el) => getComputedStyle(el.querySelector('.exp-head')).boxShadow)
    expect(await edge(), 'at rest the head has no edge').toBe('none')
    await panel.evaluate((el) => { el.scrollTop = 60 })
    await expect.poll(edge, 'scrolled, the head has a hairline').not.toBe('none')
  })
})
