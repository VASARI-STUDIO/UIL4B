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
// NOT COVERED HERE, and why: "Checking your plan..." (planKnown false) needs a
// subscription read that never settles, which this harness cannot hold open; and
// the server-refusal band does not exist yet (no server checks Pro formats).
//
// MUTATION (each break below must fail the test named after it):
//   - Draw the previews without calling bakeBlur (utils/proPreviews.js,
//     renderProPreviews: `blurred ? bakeBlur(canvas) : canvas` -> `canvas`):
//     "the blur is in the pixels" fails, because the free thumbnail is as sharp
//     as the Pro one.
//   - Render `<ExportProTag />` for every account (drop `showPro &&`): the Pro
//     account sees a lock, so "a Pro account sees no lock" fails.
//   - Put role="group" back on .exp-formats, or leave a Soon row in: "exactly
//     five radios in one radiogroup" fails.
//   - Change a format's `group` in config/exportFormats.js so it has no row:
//     "every live format is reachable" fails.
//   - Re-add the eyebrow span or an em dash to the panel copy: "no eyebrow and
//     no em dash" fails.
//   - Remove `tabIndex={active ? 0 : -1}` from the rows: "the rows are one Tab
//     stop" fails.
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

      const opened = await top()
      await chooseFormat(panel, 'png')
      expect(await top(), 'switching the file type leaves the button where it was').toBeCloseTo(opened, 0)

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
