// THE ICON CUSTOMISER'S PHONE POLISH: FOUR DEFECTS FROM THE DONE-GATE DESIGN REVIEW.
//
// What a person relies on, by finding (design review 2026-11-06, icon library gate):
//   1. On a phone the four colour chips sit in a 2 by 2 grid, not three on a row with "Custom" alone below.
//   2. A "hard to see" note arrives in the stage's caption slot: the stage and everything under it stay
//      exactly where they were, and no empty band is held between the stage and "Export size" while there
//      is no note.
//   3. The Stroke caption starts at the same left edge as the other help lines at every width.
//   4. "Custom size is Pro" stays on the "Export size" header line, never alone on the line below.
//
// The artwork is a hand-written fixture (tests/user-sim/fixtures/iconify/samples), so the Stroke control
// is there and the sizes are known. The note is raised by Black on the dark page (the page is dark here).
//
// MUTATIONS (each one run against this spec and seen red, then the source restored byte for byte;
// all in src/styles/pages/icon-emoji-library.css unless named):
//   delete the `@media(max-width:560px)` block that makes `.icust-chips` a grid
//       -> "the four colour chips are a 2 by 2 grid" (Custom wraps alone, three chips share a row)
//   give `.icust-left .icust-ground-note` back `min-height:calc(2em * 1.4)` and a visible, in-flow box
//       -> "no empty band" (a 48px gap at 390) and "the stage and the rail do not move" (the stage shrinks)
//   render the note in its old place below the stage (IconLibrary.jsx: a `.icust-ground-note` with the
//       sentence, and the caption left as it was)
//       -> "the stage and the rail do not move" at 768 and 1440, and "the note shows in the stage's caption slot"
//   `#ied-stroke-note{padding-left:68px}` at 641 to 800px
//       -> "the Stroke note starts at the left edge of the other help lines" at 768
//   delete the `@media(min-width:801px){ .icust-size-sub{display:none} }` rule
//       -> "Custom size is Pro stays on the header line" at 1440
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { FIXTURE_DIR, ICONIFY_HOSTS, ICONIFY_STUB_HEADER, isLiveIconify } from './iconify-stub.js'

test.skip(isLiveIconify(), 'the artwork is served from the fixture so the sizes are known')

const PERSONA = 'a designer tuning an icon in the Customise popup'
const SAMPLE = fs.readFileSync(path.join(FIXTURE_DIR, 'samples', 'stroke-line-24.svg'), 'utf8')
const CORS = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }
const SIZES = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]
const touchAt = (width) => width <= 768
// The wide dialog from 900px; below it the phone sheet.
const wide = (size) => size.width >= 900

/** Answer every glyph .svg of every pack with the stroked sample. */
async function serveSample(page) {
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\/[^/]+\.svg$/.test(u.pathname), (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml; charset=utf-8', headers: CORS, body: SAMPLE })
      .catch(() => { /* page closed mid-flight */ }))
}

// Up to tablet width the pack control sits behind Filters: a sheet on a phone, a panel at 768. Wider, it
// is on the toolbar row.
async function choosePack(page, pack) {
  const filters = page.getByRole('button', { name: 'Filters', exact: true })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const packMenu = page.getByRole('button', { name: 'Icon pack' })
  const behindFilters = await filters.isVisible()
  // On a slow runner the Filters sheet can close again while the page settles after
  // sign-in (CI at 390 saw the pack control appear, then vanish before the click). So the
  // whole open-and-choose is retried with short steps until the chosen pack is applied.
  const list = page.locator('.menu-select-list[role="listbox"]')
  await expect(async () => {
    if (behindFilters && await filters.getAttribute('aria-expanded') !== 'true') await filters.click({ timeout: 3_000 })
    if (!(await list.isVisible())) await packMenu.click({ timeout: 3_000 })
    await list.locator(`[role="option"][data-value="${pack}"]`).click({ timeout: 3_000 })
    await expect(packMenu).not.toHaveText(/All packs/, { timeout: 3_000 })
  }).toPass({ timeout: 40_000 })
  if (behindFilters) {
    if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toBeHidden()
  }
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
}

/** Open the popup on the first icon, dark theme. `plan` is 'pro' or null (signed out); `pack` is optional. */
async function openPopup(browser, { width, height, plan = null, pack = null }) {
  const touch = touchAt(width)
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height }, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  watch(page, `${PERSONA} at ${width}px`)
  await serveSample(page)
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  if (pack) await choosePack(page, pack)
  const cell = page.locator('.ig .ic:not(.ig-skel)').first()
  await expect(cell).toBeVisible({ timeout: 20_000 })
  await cell.click()
  await expect(page.locator('.ied-ground')).toBeVisible({ timeout: 20_000 })
  // The rail draws the icon's own markup, so wait for it rather than for the frame.
  await expect(page.locator('.ied-cell-s[data-s="16"] svg')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ied-colnote')).toBeVisible({ timeout: 20_000 })
  await settle(page)
  return { ctx, page }
}

// The popup slides in and the phone overlay scrolls a few px as it opens: wait until every animation
// has finished and nothing is scrolling, so a box read now is where the person sees it.
async function settle(page) {
  // Finite ones only: a loading shimmer elsewhere on the page runs forever.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
    .map((a) => a.finished.catch(() => {}))))
  await expect.poll(() => page.evaluate(() => new Promise((done) => {
    const at = () => [...document.querySelectorAll('.ied-overlay, #ied-scroll, .ied-ground')].map((el) => `${el.scrollTop}:${el.getBoundingClientRect().y}`).join()
    const first = at()
    requestAnimationFrame(() => requestAnimationFrame(() => done(first === at())))
  }))).toBe(true)
}

const colourChips = (page) => page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio')
const box = async (loc) => {
  const b = await loc.boundingBox()
  expect(b, 'the element has a box').not.toBeNull()
  return b
}

test.describe('colour chips on a phone', () => {
  // MUTATION: delete the `@media(max-width:560px)` grid block -> Custom wraps alone onto a second row.
  test('the four colour chips are a 2 by 2 grid, with no lone chip', async ({ browser }) => {
    const { ctx, page } = await openPopup(browser, { width: 390, height: 844 })
    await expect(colourChips(page)).toHaveCount(4)
    const boxes = []
    for (let i = 0; i < 4; i++) boxes.push(await box(colourChips(page).nth(i)))
    const rows = [...new Set(boxes.map((b) => Math.round(b.y)))]
    expect(rows, `the chips are on ${rows.length} rows: ${JSON.stringify(boxes)}`).toHaveLength(2)
    for (const y of rows) {
      expect(boxes.filter((b) => Math.round(b.y) === y), `a row of the chips at y=${y} is not two chips`).toHaveLength(2)
    }
    // Two columns: the chips of one column share a left edge, and the two columns are the same width.
    const [a, b, c, d] = boxes
    expect(Math.abs(a.x - c.x), 'the left column is not aligned').toBeLessThanOrEqual(1)
    expect(Math.abs(b.x - d.x), 'the right column is not aligned').toBeLessThanOrEqual(1)
    expect(Math.abs(a.width - b.width), 'the two columns are not the same width').toBeLessThanOrEqual(1)
    // Touch targets stay 44px tall, and the group is two chips and one gap: the height the wrapped row had.
    for (const bx of boxes) expect(bx.height, 'a chip is under 44px tall').toBeGreaterThanOrEqual(43.5)
    const group = await box(page.getByRole('radiogroup', { name: 'Colour', exact: true }))
    expect(group.height, 'the chip group is not two rows and a gap').toBeLessThanOrEqual(44 * 2 + 8 + 2)
    await ctx.close()
  })
})

test.describe('the "hard to see" note', () => {
  for (const size of SIZES) {
    // MUTATION: make `.ied-contrast` (wide) or `.ied-ctrow` (sheet) take a row in the stage column, or let the
    // wide note push `.ied-fig` down -> the stage or the size strip moves when Black is pressed.
    test(`the stage and the size strip do not move when the note arrives, ${size.width}`, async ({ browser }) => {
      const { ctx, page } = await openPopup(browser, size)
      const stage = page.locator('.ied-ground')
      const rail = page.locator('.ied-sizes-rail')
      // Wide: a note over the stage's top edge. Sheet: a row at the head of the inspector.
      const note = page.locator(wide(size) ? '.ied-contrast' : '.ied-ctrow')
      await page.getByRole('radio', { name: 'Default', exact: true }).click()
      await expect(note).toHaveCount(0)
      const before = { stage: await box(stage), rail: await box(rail) }

      await colourChips(page).filter({ hasText: 'Black' }).click()
      await expect(note, 'the note shows').toBeVisible()
      await settle(page)
      await expect(note).toContainText('Hard to see on this background.')
      await expect(note.getByRole('button', { name: 'Show on Light', exact: true })).toBeVisible()
      await expect(page.locator('.ied-cap'), 'the caption stays').toContainText('Exports at 24px')
      const after = { stage: await box(stage), rail: await box(rail), note: await box(note) }

      expect(after.stage.height, 'the note changed the stage height').toBeCloseTo(before.stage.height, 0)
      expect(after.stage.y, 'the note moved the stage').toBeCloseTo(before.stage.y, 0)
      expect(after.rail.y, 'the note moved the size strip').toBeCloseTo(before.rail.y, 0)
      if (wide(size)) {
        // The note sits over the stage column, not hanging out of it.
        const col = await box(page.locator('.ied-stagecol'))
        expect(after.note.x).toBeGreaterThanOrEqual(col.x - 0.5)
        expect(after.note.x + after.note.width).toBeLessThanOrEqual(col.x + col.width + 0.5)
        expect(after.note.y + after.note.height).toBeLessThanOrEqual(col.y + col.height + 0.5)
      } else {
        // On the sheet it is a row of the inspector, clear of the pinned stage card.
        const card = await box(page.locator('.ied-stagecol'))
        expect(after.note.y, 'the note sits under the stage card').toBeGreaterThanOrEqual(card.y + card.height - 0.5)
      }

      // Taking the offer removes the note, and still nothing moves.
      await note.getByRole('button', { name: 'Show on Light', exact: true }).click()
      await expect(note).toHaveCount(0)
      await expect(page.locator('.ied-cap')).toContainText('Exports at 24px')
      await settle(page)
      // The Light ground fills the stage box, so its height is not compared; the strip below must not move.
      const back = { rail: await box(rail) }
      expect(back.rail.y, 'taking the offer moved the size strip').toBeCloseTo(before.rail.y, 0)
      await ctx.close()
    })
  }
})

test.describe('the Stroke caption', () => {
  // Signing in as Pro and choosing a pack on a slow runner needs more than the default 30s.
  test.describe.configure({ timeout: 60_000 })
  for (const size of SIZES) {
    // MUTATION: `#ied-stroke-note{padding-left:68px}` from 641 to 800px -> red at 768.
    test(`the Stroke note starts at the left edge of the other help lines, ${size.width}`, async ({ browser }) => {
      const { ctx, page } = await openPopup(browser, { ...size, plan: 'pro', pack: 'lucide' })
      const note = page.locator('#ied-stroke-note')
      const help = page.locator('.ied-colnote')
      await expect(note).toBeVisible({ timeout: 20_000 })
      await expect(help).toBeVisible()
      const [n, h] = [await box(note), await box(help)]
      expect(n.x, `the Stroke note starts at x=${n.x}, the colour help at x=${h.x}`).toBeCloseTo(h.x, 0)
      // The text itself is flush too: no padding-left is left on the element.
      const pad = await note.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))
      expect(pad, 'the Stroke note has a left indent').toBe(0)
      await ctx.close()
    })
  }
})

test.describe('the Pro mark on the Custom cell', () => {
  for (const size of SIZES) {
    // MUTATION: give `.ied-tag` `white-space:normal` and a 24px max width in the cell, or `.ied-cell-s--custom`
    // a `width:40px` -> the mark wraps or hangs out of its cell.
    test(`"Pro" sits inside the Custom cell on one line, ${size.width}`, async ({ browser }) => {
      const { ctx, page } = await openPopup(browser, size)
      const cell = page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name: /^Custom(,|$)/ })
      const mark = cell.locator('.ied-tag')
      await expect(mark).toHaveText('Pro')
      const [c, m] = [await box(cell), await box(mark)]
      expect(m.x, 'the mark hangs out of the cell on the left').toBeGreaterThanOrEqual(c.x - 0.5)
      expect(m.x + m.width, 'the mark hangs out of the cell on the right').toBeLessThanOrEqual(c.x + c.width + 0.5)
      expect(m.y, 'the mark is above the cell').toBeGreaterThanOrEqual(c.y - 0.5)
      expect(m.y + m.height, 'the mark is below the cell').toBeLessThanOrEqual(c.y + c.height + 0.5)
      expect(m.height, 'the mark wraps over more than one line').toBeLessThan(24)
      await ctx.close()
    })
  }
})
