// THE ICON CUSTOMISER'S SIZE RAIL: FIVE PRESETS DRAWN AT REAL PIXELS, AND A CUSTOM SIZE.
//
// The slider is gone. The popup shows the icon at 16, 20, 24, 32 and 48 as the pixels it will
// export, and a Custom cell opens one field for any whole size from 8 to 1024. What a person
// relies on, by acceptance criterion (icon library design, slice S3):
//   4. a fresh open is at 24, and the 24 cell says so;
//   5. each preset cell draws its icon in a box of exactly that size; Pro choosing 32 exports 32;
//   6. Pro: Custom, 40, Enter exports 40, the Custom cell shows 40, the stage says "Exports at 40px";
//      typing 24 selects the 24 cell and closes the row; 2000 becomes 1024 with the range note;
//      typing then Escape reverts the edit, keeps focus in the field and keeps the popup open;
//   7. on a phone the field is 16px text (iOS does not zoom) and 44px tall, and sits above the foot;
//   8. at 320 the rail is one row of five cells with no 20 and nothing overflows; at 1440 it holds six.
// The free viewer who commits a custom size is in 179-icon-size-free-custom-blocked.spec.js.
//
// The expected sizes are written out here, not read from src/utils/iconSize.js.
//
// HOW TO SEE EACH FAIL (src/pages/IconLibrary.jsx unless named):
//   DEFAULT_EXPORT_SIZE = 48 (utils/iconSize.js)          -> "a fresh open is at 24"
//   the cell's svg CSS width:var(--art) -> a fixed 24px   -> "each preset cell draws its icon ..."
//   serializeCustomizedSvg gets `size: inspectPx`         -> "as Pro, choosing 32 exports ..." and "Custom then 40 ..."
//   commitSize never closes the row on a preset           -> "typing 24 in Custom selects the 24 cell ..."
//   parseCustomSize stops clamping (utils/iconSize.js)    -> "2000 becomes 1024 and says why"
//   drop the Escape branch in onSizeKey                   -> "Escape reverts an uncommitted edit ..."
//   .icust-size-input font-size 14px / height 36px (css)  -> "on a phone the field is 16px text ..."
//   NARROW_RAIL_BELOW = 0 (utils/iconSize.js)             -> "at 320 the rail drops the 20 cell ..."
//   .icust-stage-foot { display:contents } with .icust-ground and .icust-stage-cap absolute again
//     (src/styles/pages/icon-emoji-library.css)           -> "at 320 the stage caption and the ground switch do not overlap ..."
//   src restored byte for byte                            -> all of them pass again.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'a designer choosing the export size of an icon'
const PRESETS = [16, 20, 24, 32, 48]

/**
 * Open the customiser on the grid's first icon. `plan` is 'pro', 'free' or null (signed out).
 * Every clipboard write is recorded, so what Copy SVG exported can be read back.
 */
async function openCustomiser(browser, { width = 1440, height = 900, touch = false, plan = null } = {}) {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height }, hasTouch: touch, isMobile: touch })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, PERSONA)
  await page.addInitScript(() => {
    window.__clipboardWrites = []
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
    navigator.clipboard.writeText = (text) => { window.__clipboardWrites.push(text); return orig(text) }
  })
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  const cell = page.locator('.ig .ic').first()
  await expect(cell).toBeVisible({ timeout: 20_000 })
  await cell.click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
  // The rail draws the icon's own markup, so wait for it rather than for the frame.
  await expect(page.locator('.icust-size-cell[data-s="16"] svg')).toBeVisible({ timeout: 20_000 })
  return { ctx, page }
}

const radio = (page, name) => page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name })
const customRadio = (page) => page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name: /^Custom(,|$)/ })
const sizeInput = (page) => page.getByRole('textbox', { name: 'Custom size' })
const caption = (page) => page.locator('.icust-stage-cap')

/** Press Copy SVG, then return the last thing written to the clipboard. */
async function copiedSvg(page) {
  const before = (await page.evaluate(() => window.__clipboardWrites)).length
  const copy = page.getByRole('button', { name: 'Copy SVG', exact: true })
  await expect(copy).toBeEnabled({ timeout: 20_000 })
  await copy.click()
  await expect.poll(() => page.evaluate(() => window.__clipboardWrites.length), { timeout: 10_000 }).toBeGreaterThan(before)
  return (await page.evaluate(() => window.__clipboardWrites)).at(-1)
}

test.describe('size rail (desktop)', () => {
  test('a fresh open is at 24, and only the 24 cell says so', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const group = page.getByRole('radiogroup', { name: 'Export size' })
    await expect(group.getByRole('radio'), 'five presets and Custom').toHaveCount(6)
    await expect(radio(page, '24 pixels')).toHaveAttribute('aria-checked', 'true')
    for (const n of [16, 20, 32, 48]) await expect(radio(page, `${n} pixels`), `${n} is not the default`).toHaveAttribute('aria-checked', 'false')
    await expect(customRadio(page)).toHaveAttribute('aria-checked', 'false')
    await expect(page.locator('.icust-size-custom'), 'the custom row is closed on a fresh open').toHaveCount(0)
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 24px.')
    expect(await copiedSvg(page), 'a fresh open exports at 24').toMatch(/<svg[^>]* width="24" height="24"/)
    await ctx.close()
  })

  test('each preset cell draws its icon in a box of exactly its size', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    for (const n of PRESETS) {
      const box = await page.locator(`.icust-size-cell[data-s="${n}"] svg`).boundingBox()
      expect(box.width, `${n} cell: drawing width`).toBeCloseTo(n, 2)
      expect(box.height, `${n} cell: drawing height`).toBeCloseTo(n, 2)
      await expect(radio(page, `${n} pixels`).locator('.icust-size-num')).toHaveText(String(n))
    }
    await expect(customRadio(page).locator('svg'), 'the Custom cell holds no drawing').toHaveCount(0)
    await ctx.close()
  })

  test('as Pro, choosing 32 exports a 32 by 32 file', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { plan: 'pro' })
    await radio(page, '32 pixels').click()
    await expect(radio(page, '32 pixels')).toHaveAttribute('aria-checked', 'true')
    await expect(radio(page, '24 pixels')).toHaveAttribute('aria-checked', 'false')
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 32px.')
    expect(await copiedSvg(page)).toMatch(/<svg[^>]* width="32" height="32"/)
    await ctx.close()
  })

  test('as Pro, Custom then 40 then Enter exports 40, and the cell and stage say 40', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { plan: 'pro' })
    await customRadio(page).click()
    await expect(sizeInput(page), 'pressing Custom goes straight into the field').toBeFocused()
    await sizeInput(page).fill('40')
    await sizeInput(page).press('Enter')
    await expect(customRadio(page)).toHaveAttribute('aria-checked', 'true')
    await expect(customRadio(page)).toHaveAccessibleName('Custom, 40 pixels')
    await expect(customRadio(page).locator('.icust-size-num')).toHaveText('40')
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 40px.')
    for (const n of PRESETS) await expect(radio(page, `${n} pixels`)).toHaveAttribute('aria-checked', 'false')
    expect(await copiedSvg(page)).toMatch(/<svg[^>]* width="40" height="40"/)
    await expect(page.locator('.icust-code code')).toContainText('width="40" height="40"')
    await ctx.close()
  })

  test('typing 24 in Custom selects the 24 cell and closes the row', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { plan: 'pro' })
    await customRadio(page).click()
    await sizeInput(page).fill('40')
    await sizeInput(page).press('Enter')
    await expect(page.locator('.icust-size-custom')).toBeVisible()
    await sizeInput(page).fill('24')
    await sizeInput(page).press('Enter')
    await expect(radio(page, '24 pixels')).toHaveAttribute('aria-checked', 'true')
    await expect(customRadio(page)).toHaveAttribute('aria-checked', 'false')
    await expect(page.locator('.icust-size-custom'), 'the custom row closes').toHaveCount(0)
    await expect(radio(page, '24 pixels'), 'Enter leaves the keyboard on the selected cell').toBeFocused()
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 24px.')
    expect(await copiedSvg(page)).toMatch(/<svg[^>]* width="24" height="24"/)
    await ctx.close()
  })

  test('2000 becomes 1024 and says why', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { plan: 'pro' })
    await customRadio(page).click()
    await sizeInput(page).fill('2000')
    await sizeInput(page).press('Enter')
    await expect(sizeInput(page)).toHaveValue('1024')
    const note = page.locator('.icust-size-note')
    await expect(note).toHaveText('Sizes go from 8 to 1024px. Set to 1024px.')
    await expect(sizeInput(page), 'the note is tied to the field').toHaveAttribute('aria-describedby', /icust-size-note/)
    await expect(page.locator('.icust-size-range')).toHaveText('From 8 to 1024px')
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 1024px.')
    expect(await copiedSvg(page)).toMatch(/<svg[^>]* width="1024" height="1024"/)
    // The note is about the last commit; typing again clears it.
    await sizeInput(page).fill('40')
    await expect(note).toHaveCount(0)
    await ctx.close()
  })

  test('below 8 becomes 8, and an empty field goes back to the last size', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { plan: 'pro' })
    await customRadio(page).click()
    await sizeInput(page).fill('3')
    await sizeInput(page).press('Enter')
    await expect(sizeInput(page)).toHaveValue('8')
    await expect(page.locator('.icust-size-note')).toHaveText('Sizes go from 8 to 1024px. Set to 8px.')
    await sizeInput(page).fill('')
    await sizeInput(page).press('Enter')
    await expect(sizeInput(page), 'empty reverts to the committed size').toHaveValue('8')
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 8px.')
    await ctx.close()
  })

  test('Escape reverts an uncommitted edit and keeps the popup open', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { plan: 'pro' })
    await customRadio(page).click()
    await sizeInput(page).fill('40')
    await sizeInput(page).press('Enter')
    await sizeInput(page).fill('55')
    await expect(sizeInput(page)).toHaveValue('55')
    await sizeInput(page).press('Escape')
    await expect(sizeInput(page), 'the edit goes back to the committed size').toHaveValue('40')
    await expect(sizeInput(page), 'focus stays in the field').toBeFocused()
    await expect(page.locator('.icust-stage'), 'the popup stays open').toBeVisible()
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 40px.')
    // With nothing uncommitted, Escape closes the popup as it does everywhere else.
    await sizeInput(page).press('Escape')
    await expect(page.locator('.icust-stage')).toHaveCount(0)
    await ctx.close()
  })

  test('the arrow keys step the custom size by 1, and by 10 with Shift', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { plan: 'pro' })
    await customRadio(page).click()
    await sizeInput(page).fill('40')
    await sizeInput(page).press('Enter')
    await sizeInput(page).press('ArrowUp')
    await expect(sizeInput(page)).toHaveValue('41')
    await sizeInput(page).press('Shift+ArrowDown')
    await expect(sizeInput(page)).toHaveValue('31')
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 31px.')
    await ctx.close()
  })

  test('at 1440 the rail is one row of six cells that fit', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const rail = page.locator('.icust-size-rail')
    await expect(rail.getByRole('radio')).toHaveCount(6)
    await expect(radio(page, '20 pixels')).toBeVisible()
    const m = await rail.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const cells = [...el.querySelectorAll('[role="radio"]')].map((c) => c.getBoundingClientRect())
      return {
        fits: el.scrollWidth <= el.clientWidth,
        inside: cells.every((c) => c.left >= r.left - 0.5 && c.right <= r.right + 0.5),
        oneRow: new Set(cells.map((c) => Math.round(c.top))).size === 1,
        pageFits: document.documentElement.scrollWidth <= window.innerWidth,
      }
    })
    expect(m.fits, 'the rail scrolls sideways').toBe(true)
    expect(m.inside, 'a cell sticks out of the rail').toBe(true)
    expect(m.oneRow, 'the cells wrapped onto a second row').toBe(true)
    expect(m.pageFits, 'the page scrolls sideways').toBe(true)
    await ctx.close()
  })
})

test.describe('size rail (phone)', () => {
  test('on a phone the field is 16px text, 44px tall, and sits above the pinned foot', async ({ browser }) => {
    // 390 x 664: the viewport the sheet is checked at. Viewport only; no full-page shot.
    const { ctx, page } = await openCustomiser(browser, { width: 390, height: 664, touch: true })
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context is not a touch screen').toBe(true)
    await customRadio(page).tap()
    const input = sizeInput(page)
    await expect(input).toBeFocused()
    await expect(input).toHaveCSS('font-size', '16px')
    const h = (await input.boundingBox()).height
    expect(h, 'the field is shorter than a finger').toBeGreaterThanOrEqual(44)
    const cells = await page.locator('.icust-size-rail [role="radio"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))
    for (const w of cells) expect(w, 'a touch cell narrower than 44px').toBeGreaterThanOrEqual(43.5)
    // The whole field is above the foot (stuck to the bottom of the sheet) once it settles.
    await expect.poll(async () => {
      const f = await input.boundingBox()
      const foot = await page.locator('.icust-body > .icust-foot').boundingBox()
      return foot.y - (f.y + f.height)
    }, { message: 'the field is covered by the foot', timeout: 5_000 }).toBeGreaterThanOrEqual(0)
    const f = await input.boundingBox()
    expect(f.y, 'the field is off the top of the screen').toBeGreaterThanOrEqual(0)
    await ctx.close()
  })

  test('at 320 the rail drops the 20 cell, stays one row, and nothing overflows', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 320, height: 640, touch: true })
    const rail = page.locator('.icust-size-rail')
    await expect(rail.getByRole('radio'), 'four presets and Custom').toHaveCount(5)
    await expect(radio(page, '20 pixels'), 'there is no 20 cell at 320').toHaveCount(0)
    for (const n of [16, 24, 32, 48]) await expect(radio(page, `${n} pixels`)).toBeVisible()
    const m = await rail.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const cells = [...el.querySelectorAll('[role="radio"]')].map((c) => c.getBoundingClientRect())
      const body = document.querySelector('.icust-body')
      return {
        railFits: el.scrollWidth === el.clientWidth,
        inside: cells.every((c) => c.left >= r.left - 0.5 && c.right <= r.right + 0.5),
        oneRow: new Set(cells.map((c) => Math.round(c.top))).size === 1,
        bodyFits: body.scrollWidth === body.clientWidth,
        pageFits: document.documentElement.scrollWidth <= window.innerWidth,
      }
    })
    expect(m.railFits, 'scrollWidth !== clientWidth on the rail').toBe(true)
    expect(m.inside, 'a cell sticks out of the rail').toBe(true)
    expect(m.oneRow, 'the cells wrapped').toBe(true)
    expect(m.bodyFits, 'the popup scrolls sideways').toBe(true)
    expect(m.pageFits, 'the page scrolls sideways').toBe(true)
    await ctx.close()
  })

  test('at 320 the stage caption and the ground switch do not overlap, and both sit inside the stage', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 320, height: 640, touch: true })
    const cap = page.locator('.icust-stage-cap')
    const ground = page.locator('.icust-ground')
    await expect(cap).toBeVisible()
    await expect(ground).toBeVisible()
    const [c, g, s] = await Promise.all([cap.boundingBox(), ground.boundingBox(), page.locator('.icust-stage').boundingBox()])
    const apart = c.x + c.width <= g.x + 0.5 || g.x + g.width <= c.x + 0.5 || c.y + c.height <= g.y + 0.5 || g.y + g.height <= c.y + 0.5
    expect(apart, `caption ${JSON.stringify(c)} overlaps the ground switch ${JSON.stringify(g)}`).toBe(true)
    for (const [name, b] of [['caption', c], ['ground switch', g]]) {
      expect(b.x, `${name} sticks out of the stage on the left`).toBeGreaterThanOrEqual(s.x - 0.5)
      expect(b.x + b.width, `${name} sticks out of the stage on the right`).toBeLessThanOrEqual(s.x + s.width + 0.5)
      expect(b.y + b.height, `${name} sticks out of the stage at the bottom`).toBeLessThanOrEqual(s.y + s.height + 0.5)
    }
    await ctx.close()
  })

  // The 20 cell goes where six touch cells (308px of rail) do not fit, and not a pixel sooner:
  // measured before the fix, 360 held six cells in a rail 14px too narrow.
  for (const [width, cells] of [[321, 5], [360, 5], [374, 5], [375, 6], [390, 6], [430, 6]]) {
    test(`on a ${width}px touch screen the rail holds ${cells} cells and does not overflow`, async ({ browser }) => {
      const { ctx, page } = await openCustomiser(browser, { width, height: 700, touch: true })
      const rail = page.locator('.icust-size-rail')
      await expect(rail.getByRole('radio')).toHaveCount(cells)
      const m = await rail.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
      expect(m.sw, `rail content is ${m.sw}px in a ${m.cw}px rail`).toBe(m.cw)
      await ctx.close()
    })
  }

  test('at 320 a Pro viewer can still reach 20 as a custom size', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 320, height: 640, touch: true, plan: 'pro' })
    await customRadio(page).tap()
    await sizeInput(page).fill('20')
    await sizeInput(page).press('Enter')
    // 20 has no cell on this row, so it shows as the custom value and exports at 20.
    await expect(customRadio(page)).toHaveAccessibleName('Custom, 20 pixels')
    await expect(caption(page)).toHaveText('Drawn large to inspect. Exports at 20px.')
    expect(await copiedSvg(page)).toMatch(/<svg[^>]* width="20" height="20"/)
    await ctx.close()
  })
})
