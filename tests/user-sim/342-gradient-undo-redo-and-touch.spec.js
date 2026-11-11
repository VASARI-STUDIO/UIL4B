// /create/gradient: every committed edit can be undone and redone (Back and Redo), and the
// tool works under a finger at 390 and 768.
//
//   1. At 1440: a stop drag (one step per drag), a hex commit, add and remove a stop, the
//      angle (a wheel drag, and a keyboard run), the type and the interpolation each undo
//      with Back and come back with Redo. Ctrl+Z and Shift+Ctrl+Z do the same off a field,
//      and inside the hex field Ctrl+Z is the field's own undo.
//   2. At 390 and 768 in a touch context (hasTouch, pointer: coarse; viewport screenshots
//      only, a full-page one turns pointer: coarse off): every control is at least 44px,
//      the rail, handles and wheel have touch-action: none, nothing runs sideways, and the
//      docked bar clears the bottom inset.
//
// MUTATIONS (each turns the tests named red):
//   beginEdit is not called by updateStop                 -> "a stop drag ...", "a hex commit ..."
//   the burst key ignores the pointer being held           -> "a stop drag is one step ..."
//   addStopAt does not record a step                       -> "adding and removing a stop ..."
//   the angle onChange does not record a step              -> "the angle ..."
//   the type or interpolation onChange does not record     -> "the type and the interpolation ..."
//   goForward does nothing / a new edit keeps Redo         -> "Redo ..."
//   the key listener does not skip text fields             -> "Ctrl+Z inside the hex field ..."
//   .grd-rail, .grd-handle or .grd-wheel lose touch-action -> "the rail, the handles and the wheel ..."
//   a coarse control drops under 44px                      -> "every control is at least 44px ..."
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const CITRUS = {
  type: 'Linear', angle: 90, space: 'oklch', source: 'own',
  stops: [{ color: '#FFD84D', position: 0 }, { color: '#F0436A', position: 60 }, { color: '#6E6BFF', position: 100 }],
}
// Longer than the page's edit-run window, so two keyboard edits are two steps.
const PAUSE = 700

const seed = (page, gradient) => page.addInitScript((g) => {
  localStorage.setItem('vs-current-design', JSON.stringify({ gradient: g }))
}, gradient)

async function open(page) {
  await seed(page, CITRUS)
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Gradient controls' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

const back = (page) => page.locator('[data-tool-toolbar]').first().getByRole('button', { name: 'Back to the previous gradient' })
const redo = (page) => page.locator('[data-tool-toolbar]').first().getByRole('button', { name: 'Redo', exact: true })
const hexField = (page, n = 1) => page.getByRole('textbox', { name: `Stop ${n} hex` })
const angleInput = (page) => page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
const wheel = (page) => page.getByRole('slider', { name: 'Gradient angle' })
const stopButtons = (page) => page.getByRole('button', { name: /^Select stop \d+, #/ })

/** What is on screen: the canvas paint, the stop list's labels and the angle. */
const look = async (page) => ({
  paint: await page.locator('.grd-canvas').evaluate((el) => el.style.background),
  stops: await stopButtons(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label'))),
})

const settle = (page) => page.waitForTimeout(PAUSE)

/** Press and drag the handle of stop `n` (1-based, in list order) by `dx` pixels. */
async function dragHandle(page, n, dx) {
  const rail = await page.locator('.grd-rail').boundingBox()
  const pos = await stopButtons(page).nth(n - 1).locator('.grd-stop-pos').innerText()
  const x = rail.x + (rail.width * parseFloat(pos)) / 100
  const y = rail.y + rail.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) await page.mouse.move(x + (dx * i) / 6, y)
  await page.mouse.up()
}

test.describe('Back and Redo for every edit, at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a stop drag is one step, however many pointer moves it takes', async ({ page }) => {
    watch(page, 'a designer nudging a stop by hand')
    await open(page)
    const start = await look(page)
    await dragHandle(page, 2, -80)
    const moved = await look(page)
    expect(moved.paint, 'the drag changed the gradient').not.toBe(start.paint)
    await back(page).click()
    expect(await look(page), 'one Back undoes the whole drag').toEqual(start)
    await expect(back(page), 'and there was only that one step').toHaveAttribute('aria-disabled', 'true')
    await redo(page).click()
    expect(await look(page), 'Redo puts the drag back').toEqual(moved)
  })

  test('a hex commit, and an angle typed in the field, undo and redo', async ({ page }) => {
    watch(page, 'a designer changing a colour and an angle')
    await open(page)
    const start = await look(page)
    await hexField(page, 1).fill('2f6bff')
    await hexField(page, 1).press('Enter')
    const afterHex = await look(page)
    expect(afterHex.stops[0]).toContain('#2F6BFF')
    await settle(page)
    await angleInput(page).fill('161')
    await angleInput(page).press('Enter')
    const afterAngle = await look(page)
    expect(afterAngle.paint).not.toBe(afterHex.paint)
    await back(page).click()
    expect(await look(page), 'Back undoes the angle first').toEqual(afterHex)
    await back(page).click()
    expect(await look(page), 'then the colour').toEqual(start)
    await redo(page).click()
    await redo(page).click()
    expect(await look(page), 'two Redos return to the end').toEqual(afterAngle)
    await expect(redo(page)).toHaveAttribute('aria-disabled', 'true')
  })

  test('adding and removing a stop', async ({ page }) => {
    watch(page, 'a designer adding then removing a stop')
    await open(page)
    const start = await look(page)
    await page.getByRole('button', { name: 'Add a stop' }).click()
    await expect(stopButtons(page)).toHaveCount(4)
    const added = await look(page)
    await page.getByRole('button', { name: 'Remove stop 4' }).click()
    await expect(stopButtons(page)).toHaveCount(3)
    await back(page).click()
    expect(await look(page), 'Back restores the removed stop').toEqual(added)
    await back(page).click()
    expect(await look(page), 'Back removes the added stop').toEqual(start)
  })

  test('the angle: a wheel drag is one step and a keyboard run is one step', async ({ page }) => {
    watch(page, 'a designer turning the wheel')
    await open(page)
    const start = await look(page)
    const box = await wheel(page).boundingBox()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx, cy - 20)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(cx + 20 * Math.sin((i * Math.PI) / 8), cy - 20 * Math.cos((i * Math.PI) / 8))
    await page.mouse.up()
    const afterWheel = await look(page)
    expect(afterWheel.paint).not.toBe(start.paint)
    await settle(page)
    await wheel(page).focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    const afterKeys = await look(page)
    expect(afterKeys.paint).not.toBe(afterWheel.paint)
    await back(page).click()
    expect(await look(page), 'five arrow presses undo together').toEqual(afterWheel)
    await back(page).click()
    expect(await look(page), 'the wheel drag undoes together').toEqual(start)
  })

  test('the type and the interpolation', async ({ page }) => {
    watch(page, 'a designer switching type and interpolation')
    await open(page)
    const start = await look(page)
    await page.getByRole('button', { name: 'Standard (sRGB)', exact: true }).click()
    const afterSpace = await look(page)
    await page.getByRole('group', { name: 'Gradient type' }).getByRole('button', { name: 'Radial' }).click()
    const afterType = await look(page)
    expect(afterType.paint).not.toBe(afterSpace.paint)
    await back(page).click()
    expect(await look(page)).toEqual(afterSpace)
    await back(page).click()
    expect(await look(page)).toEqual(start)
    await expect(page.getByRole('button', { name: 'Perceived (OKLCH)', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('Redo is emptied by a new edit, and Ctrl+Z and Shift+Ctrl+Z work off a field', async ({ page }) => {
    watch(page, 'a designer using the keyboard shortcuts')
    await open(page)
    const start = await look(page)
    await hexField(page, 1).fill('2f6bff')
    await hexField(page, 1).press('Enter')
    const edited = await look(page)
    await page.locator('.grd-canvas').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Control+z')
    expect(await look(page), 'Ctrl+Z goes back').toEqual(start)
    await page.keyboard.press('Control+Shift+z')
    expect(await look(page), 'Shift+Ctrl+Z redoes').toEqual(edited)
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+y')
    expect(await look(page), 'Ctrl+Y redoes').toEqual(edited)
    await page.keyboard.press('Control+z')
    await hexField(page, 2).fill('00ff88')
    await hexField(page, 2).press('Enter')
    await expect(redo(page), 'a new edit empties Redo').toHaveAttribute('aria-disabled', 'true')
  })

  test('Ctrl+Z inside the hex field does the field\'s own undo, not the tool\'s', async ({ page }) => {
    watch(page, 'a designer typing in the hex field')
    await open(page)
    await hexField(page, 1).fill('2f6bff')
    await hexField(page, 1).press('Enter')
    const edited = await look(page)
    await hexField(page, 1).click()
    await page.keyboard.press('Control+z')
    expect(await look(page), 'the gradient did not step back').toEqual(edited)
  })

  test('ten edits then ten Backs return to the start, and an eleventh has nowhere to go', async ({ page }) => {
    watch(page, 'a designer stepping back through ten edits')
    await open(page)
    const start = await look(page)
    const hexes = ['112233', '223344', '334455', '445566', '556677', '667788', '778899', '8899AA', '99AABB', 'AABBCC']
    for (const h of hexes) {
      await hexField(page, 1).fill(h)
      await hexField(page, 1).press('Enter')
    }
    for (let i = 0; i < 10; i++) await back(page).click()
    expect(await look(page)).toEqual(start)
    await expect(back(page)).toHaveAttribute('aria-disabled', 'true')
  })
})

for (const width of [390, 768]) {
  test.describe(`under a finger at ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 1024 }, hasTouch: true, isMobile: true })

    test('the pointer is coarse, and every control is at least 44px', async ({ page }) => {
      watch(page, `someone using the gradient tool on a ${width}px touch screen`)
      await open(page)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'a touch context').toBe(true)
      const small = await page.locator('.grd').evaluate((root) => {
        const sel = 'button, [role="slider"], input:not([type="hidden"]), select, a[href], [role="button"]'
        const out = []
        for (const el of root.querySelectorAll(sel)) {
          const cs = getComputedStyle(el)
          const r = el.getBoundingClientRect()
          if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue
          if (el.closest('.sr-only') || el.closest('[aria-hidden="true"]')) continue
          if (el.matches('.grd-ctx-more-gauge *')) continue
          // A text link inside running copy is exempt (WCAG 2.5.8 inline); a control is not.
          if (el.matches('a') && getComputedStyle(el).display === 'inline') continue
          if (r.width < 43.5 || r.height < 43.5) out.push(`${el.className || el.tagName} ${Math.round(r.width)}x${Math.round(r.height)} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}`)
        }
        return out
      })
      expect(small, `controls under 44px at ${width}`).toEqual([])
      await page.screenshot({ path: `.claude/scratch/grad_s45/tool-${width}.png` })
    })

    test('the rail, the handles and the wheel have touch-action: none, so a drag does not scroll the page', async ({ page }) => {
      watch(page, 'someone dragging a stop with a finger')
      await open(page)
      const actions = await page.evaluate(() => ({
        rail: getComputedStyle(document.querySelector('.grd-rail')).touchAction,
        handles: [...document.querySelectorAll('.grd-handle')].map((el) => getComputedStyle(el).touchAction),
        wheel: getComputedStyle(document.querySelector('.grd-wheel')).touchAction,
      }))
      expect(actions.rail).toBe('none')
      expect(actions.handles.length).toBeGreaterThanOrEqual(2)
      for (const a of actions.handles) expect(a).toBe('none')
      expect(actions.wheel).toBe('none')
    })

    test('no sideways scroll, from 320 to 768', async ({ page }) => {
      watch(page, 'someone on a narrow phone')
      await open(page)
      for (const w of [320, 360, width]) {
        await page.setViewportSize({ width: w, height: 844 })
        await page.waitForTimeout(150)
        const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
        expect(sizes.scroll, `${w}px: the page is ${sizes.scroll - sizes.client}px wider than the screen`).toBeLessThanOrEqual(sizes.client)
      }
    })

    test('the docked bar clears the bottom inset and stays under 768', async ({ page }) => {
      watch(page, 'someone with a home indicator')
      await open(page)
      if (width >= 768) return
      const dock = page.locator('[data-tl-dock]')
      await expect(dock).toBeVisible()
      const pad = await dock.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
      expect(pad, 'room under the primary, at least the 12px floor the inset raises').toBeGreaterThanOrEqual(12)
      const box = await dock.boundingBox()
      expect(Math.round(box.y + box.height), 'the bar sits on the bottom of the screen').toBeLessThanOrEqual(844)
    })

    test('Back and Redo are reachable, 44px, and undo a finger drag of a stop', async ({ page }) => {
      watch(page, 'someone undoing a drag with a finger')
      await open(page)
      const start = await look(page)
      const rail = await page.locator('.grd-rail').boundingBox()
      const pos = parseFloat(await stopButtons(page).nth(1).locator('.grd-stop-pos').innerText().catch(() => '60'))
      const x = rail.x + (rail.width * (Number.isFinite(pos) ? pos : 60)) / 100
      const y = rail.y + rail.height / 2
      const cdp = await page.context().newCDPSession(page)
      const touch = (type, px) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y }] })
      await touch('touchStart', x)
      for (let i = 1; i <= 5; i++) await touch('touchMove', x - i * 8)
      await touch('touchEnd', x)
      const moved = await look(page)
      expect(moved.paint, 'a finger drag moved the stop').not.toBe(start.paint)
      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY, 'the page did not scroll with the drag').toBe(0)
      const b = back(page)
      if (await b.isVisible().catch(() => false)) {
        await b.click()
        expect(await look(page)).toEqual(start)
      } else {
        await page.getByRole('button', { name: 'More' }).click()
        await page.getByRole('button', { name: /^Back/ }).click()
        expect(await look(page)).toEqual(start)
      }
    })
  })
}
