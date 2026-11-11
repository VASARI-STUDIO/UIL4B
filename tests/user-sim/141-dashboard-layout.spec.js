// The /projects dashboard as a DESKTOP LAYOUT: the measured boxes of the kit sheet, the minis, the shelf and
// the plan line at 1440 and 1200, and the order the sections run down the page. 52-user-home reads what each
// part says and does; 146-dashboard-phone-tablet holds the layout below 1200.
//
// Every number is the design board's own, read off its rendered page and then off this one (the numbers are
// written here by hand, none is worked out from the page's CSS):
//
//   1440  sheet 1240 x 512; strip columns 400 / 224 / 280 / 176 with 32 gaps; plates 280 tall;
//         minis 292 x 200 with 24 gaps; shelf columns 548 / 280 / 148 / 168 with 32 gaps, plates 160 tall.
//   1200  sheet 1096 x 512; strip columns 312 / 200 / 280 / 144; minis 256 x 200;
//         shelf columns 436 / 288 / 148 / 128.
//
// MUTATION (each made, the named test went red, then put back byte for byte):
//   dashboard.css   the 1343px strip columns removed                      -> "the strip columns at 1200"
//   dashboard.css   .db-plate height 280 -> 260                           -> "plates are 280 tall"
//   dashboard.css   .db-minis gap 24 -> 16                                -> "four minis a row ..."
//   Projects.jsx    <PlanLine /> before the shelf                         -> "sections run down the page in this order"
//   dashboard.css   .db-go height 36 -> 32                                -> "the pill and New project are 36 tall"
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { MINUTE, ago, complete, half, many } from './fixtures/dashboard-projects.js'

const SIZES = [
  { name: 'laptop', width: 1440, height: 900, sheet: [1240, 512], strip: [400, 224, 280, 176], mini: [292, 200], shelf: [548, 280, 148, 168] },
  { name: 'narrow desktop', width: 1200, height: 900, sheet: [1096, 512], strip: [312, 200, 280, 144], mini: [256, 200], shelf: [436, 288, 148, 128] },
]

const sheetOf = (page, name) => page.getByRole('region', { name })
const shelfOf = (page) => page.getByRole('region', { name: 'Tools and library' })

/** Boxes in document coordinates, rounded to whole pixels. */
const boxes = (locator) => locator.evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }
}))

const withExports = (page, count) => page.addInitScript((n) => {
  try {
    const at = Date.now()
    localStorage.setItem('vs-recent-exports', JSON.stringify(
      ['one', 'two', 'three', 'four', 'five', 'six'].slice(0, n).map((w, i) => ({
        id: `e${i}`, tool: 'palette', toolLabel: 'Palette Builder', format: 'CSS', filename: `${w}-tokens.css`, bytes: 2048, at: at - (5 + i * 10) * 60 * 1000, projectId: null,
      })),
    ))
  } catch { /* private mode */ }
}, count)

/** Pro, one complete lead and six others (so Find shows and four minis sit in a row), with four exports on record. */
async function openPro(page, size) {
  await page.setViewportSize({ width: size.width, height: size.height })
  await withExports(page, 4)
  await signIn(page, { plan: 'pro', projects: [complete('p-done', 'Violet Lime', ago(10 * MINUTE)), half(), ...many(5)] })
  await go(page, '/projects')
  await expectRendered(page, '/projects')
  await expect(sheetOf(page, 'Violet Lime, latest project')).toBeVisible()
  await expect(shelfOf(page).getByText('Exported', { exact: false }).first()).toBeVisible()
}

for (const size of SIZES) {
  test.describe(`the dashboard at ${size.width}px (${size.name})`, () => {
    test('the sheet is the board\'s size, and the page does not scroll sideways', async ({ page }) => {
      watch(page, 'a designer on a laptop opening the dashboard')
      await openPro(page, size)
      const [sheet] = await boxes(sheetOf(page, 'Violet Lime, latest project'))
      expect([sheet.w, sheet.h], 'sheet width and height').toEqual(size.sheet)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `the page scrolls sideways by ${overflow}px`).toBe(0)
    })

    test(`the strip columns at ${size.width} are ${size.strip.join(' / ')} with 32 gaps`, async ({ page }) => {
      watch(page, 'a designer reading the four parts')
      await openPro(page, size)
      const parts = await boxes(sheetOf(page, 'Violet Lime, latest project').locator('.db-kit > .db-part'))
      expect(parts.map((p) => p.w), 'column widths').toEqual(size.strip)
      for (let i = 1; i < parts.length; i += 1) expect(parts[i].x - (parts[i - 1].x + parts[i - 1].w), `gap before column ${i + 1}`).toBe(32)
      expect(new Set(parts.map((p) => p.y)).size, 'the four parts start level').toBe(1)
    })

    test('plates are 280 tall', async ({ page }) => {
      watch(page, 'a designer reading the four parts')
      await openPro(page, size)
      const plates = await boxes(sheetOf(page, 'Violet Lime, latest project').locator('.db-kit > .db-part > .db-plate'))
      expect(plates.length, 'one plate per part').toBe(4)
      expect(plates.map((p) => p.h)).toEqual([280, 280, 280, 280])
    })

    test('the pill and New project are 36 tall', async ({ page }) => {
      watch(page, 'a designer looking for the next step')
      await openPro(page, size)
      const pill = await boxes(sheetOf(page, 'Violet Lime, latest project').getByRole('link', { name: /^Continue:/ }))
      const create = await boxes(page.getByRole('button', { name: 'New project' }).first())
      expect(pill[0].h, 'Continue pill').toBe(36)
      expect(create[0].h, 'New project').toBe(36)
    })

    test('four minis a row, 24 apart, the board\'s size', async ({ page }) => {
      watch(page, 'a designer scanning their other projects')
      await openPro(page, size)
      const minis = await boxes(page.getByTestId('other-projects').getByRole('link'))
      expect(minis.length, 'four show before Show all').toBe(4)
      for (const m of minis) expect([m.w, m.h], 'mini size').toEqual(size.mini)
      expect(new Set(minis.map((m) => m.y)).size, 'all four are in one row').toBe(1)
      for (let i = 1; i < minis.length; i += 1) expect(minis[i].x - (minis[i - 1].x + minis[i - 1].w), `gap before mini ${i + 1}`).toBe(24)
    })

    test(`the shelf columns are ${size.shelf.join(' / ')} with 32 gaps, plates 160 tall`, async ({ page }) => {
      watch(page, 'a designer looking at the tools and library')
      await openPro(page, size)
      const cols = await boxes(shelfOf(page).locator('.db-shelf > *'))
      expect(cols.map((c) => c.w), 'column widths').toEqual(size.shelf)
      for (let i = 1; i < cols.length; i += 1) expect(cols[i].x - (cols[i - 1].x + cols[i - 1].w), `gap before column ${i + 1}`).toBe(32)
      const plates = await boxes(shelfOf(page).locator('.db-shelf .db-plate'))
      expect(plates.length, 'the exports, icons and image plates').toBe(3)
      expect(plates.map((p) => p.h)).toEqual([160, 160, 160])
    })

    test('file rows, the Also line and the plan line are 24 tall', async ({ page }) => {
      watch(page, 'a designer reading the small print')
      await openPro(page, size)
      const files = await boxes(shelfOf(page).locator('.db-files > li'))
      expect(files.length, 'three file rows follow the latest export').toBe(3)
      expect(files.map((f) => f.h)).toEqual([24, 24, 24])
      const also = await boxes(shelfOf(page).locator('.db-also'))
      expect(also[0].h, 'Also in Create').toBe(24)
      const plan = await boxes(page.locator('.db-plan'))
      expect(plan[0].h, 'plan line').toBe(24)
    })

    test('sections run down the page in this order: greeting, sheet, other projects, shelf, plan line', async ({ page }) => {
      watch(page, 'a designer scrolling the dashboard')
      await openPro(page, size)
      const tops = {
        greeting: (await boxes(page.getByTestId('greeting')))[0].y,
        sheet: (await boxes(sheetOf(page, 'Violet Lime, latest project')))[0].y,
        others: (await boxes(page.getByRole('region', { name: 'Other projects' })))[0].y,
        shelf: (await boxes(shelfOf(page)))[0].y,
        plan: (await boxes(page.locator('.db-plan')))[0].y,
      }
      const order = Object.entries(tops).sort((a, b) => a[1] - b[1]).map(([k]) => k)
      expect(order, JSON.stringify(tops)).toEqual(['greeting', 'sheet', 'others', 'shelf', 'plan'])
    })
  })
}

test.describe('the first screen', () => {
  test('at 1440x900 the signed-out example sheet starts at 308 and ends above the fold, with its pill on screen', async ({ page }) => {
    watch(page, 'a first-time visitor on a laptop')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const sheet = sheetOf(page, 'Example brand kit')
    await expect(sheet).toBeVisible()
    const [box] = await boxes(sheet)
    expect(box.y, 'the board puts the sheet at 308').toBe(308)
    expect(box.y + box.h, 'the whole sheet is on the first screen').toBeLessThanOrEqual(900)
    expect([box.w, box.h]).toEqual([1240, 512])
    await expect(sheet.getByRole('link', { name: 'Open in Palette Builder' })).toBeInViewport()
  })

  test('with a project, Continue and New project are both on the first screen at 1440x900', async ({ page }) => {
    watch(page, 'a designer coming back to carry on')
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(sheetOf(page, 'Violet Lime, latest project').getByRole('link', { name: /^Continue:/ })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'New project' }).first()).toBeInViewport()
  })
})

test.describe('the dashboard in each state keeps the sheet\'s size', () => {
  for (const [label, setup, region] of [
    ['an account with no project (the empty example)', (page) => signIn(page, { plan: 'free', projects: 0 }), 'Start your first brand kit'],
    ['a half-built project (three parts say Not set)', (page) => signIn(page, { plan: 'free', projects: [half()] }), 'Harbour Rebrand, latest project'],
  ]) {
    test(`${label} at 1440 is 1240 x 512, strip 400 / 224 / 280 / 176`, async ({ page }) => {
      watch(page, label)
      await page.setViewportSize({ width: 1440, height: 900 })
      await setup(page)
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      const sheet = sheetOf(page, region)
      await expect(sheet).toBeVisible()
      const [box] = await boxes(sheet)
      expect([box.w, box.h]).toEqual([1240, 512])
      const parts = await boxes(sheet.locator('.db-kit > .db-part'))
      expect(parts.map((p) => p.w)).toEqual([400, 224, 280, 176])
    })
  }
})
