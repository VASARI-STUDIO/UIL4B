// /create/gradient: the angle wheel, the stop tints menu, the Explore panel and
// the OKLCH presets.
//
// Each block drives the page the way a person would and reads the RESULT: the
// angle that reaches the copied CSS, the colour a stop ends up with, the modal a
// free account meets, the route a link leads to, the space a preset switches on,
// and (on a phone) the size of every new target and whether the page scrolls
// sideways. The source-text checks in tests/unit/angle-wheel.test.js and
// gradient-stop-actions.test.js cannot see any of that.
//
// MUTATION (angle): in src/utils/angleWheel.js make ArrowRight subtract; the
// keyboard test goes red. MUTATION (tints): in StopTintMenu.jsx apply the tint
// for a free account too; "a free account sees the ramp" goes red.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const ROUTE = '/create/gradient'
// Tests start from Indigo Night's angle, 160deg; the first-visit stops are
// stops #0A0F2C / #27348B / #6E6BFF.
const FIRST_ANGLE = 160

const wheelOf = (page) => page.getByRole('slider', { name: 'Gradient angle' })
const fieldOf = (page) => page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
const codeOf = (page) => page.locator('.grd-code-text')
const stopHex = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #[0-9A-F]{6}$`) })

/** The angle the copied CSS carries. Null when the CSS has no linear angle. */
async function cssAngle(page) {
  const text = await codeOf(page).innerText()
  const m = text.match(/linear-gradient\((\d+)deg/)
  return m ? Number(m[1]) : null
}

async function open(page) {
  await go(page, ROUTE)
  await expect(wheelOf(page)).toBeVisible()
  // The first visit opens at 135deg (the preset's stops, not its angle), so set a known angle.
  await fieldOf(page).fill(String(FIRST_ANGLE))
  await fieldOf(page).press('Enter')
  await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', String(FIRST_ANGLE))
}

test.describe('the angle wheel', () => {
  test('the arrow keys, Shift, Home, End and the Page keys move the CSS angle and wrap', async ({ page }) => {
    watch(page, 'a developer setting an angle from the keyboard')
    await open(page)
    expect(await cssAngle(page), 'the CSS starts at the wheel angle').toBe(FIRST_ANGLE)

    const wheel = wheelOf(page)
    await wheel.focus()
    const steps = [
      ['ArrowRight', 161], ['ArrowLeft', 160], ['ArrowUp', 161], ['ArrowDown', 160],
      ['Shift+ArrowRight', 175], ['Shift+ArrowLeft', 160],
      ['PageUp', 175], ['PageDown', 160],
      ['Home', 0], ['ArrowLeft', 359], // wraps below 0
      ['End', 359], ['ArrowRight', 0], // wraps above 359
      ['Shift+ArrowLeft', 345],
    ]
    for (const [key, expected] of steps) {
      await page.keyboard.press(key)
      await expect(wheel, `after ${key}`).toHaveAttribute('aria-valuenow', String(expected))
      await expect.poll(() => cssAngle(page), { message: `the CSS after ${key}` }).toBe(expected)
    }
    await expect(wheel).toHaveAttribute('aria-valuetext', '345 degrees')
  })

  test('dragging round the dial sets the angle: right is 90, down is 180, left is 270, up is 0', async ({ page }) => {
    watch(page, 'a designer dragging the angle')
    await open(page)
    const box = await wheelOf(page).boundingBox()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const r = box.width / 2 - 4

    await page.mouse.move(cx, cy - r)
    await page.mouse.down()
    for (const [x, y, expected] of [[cx + r, cy, 90], [cx, cy + r, 180], [cx - r, cy, 270], [cx, cy - r, 0]]) {
      await page.mouse.move(x, y, { steps: 4 })
      await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', String(expected))
      await expect.poll(() => cssAngle(page)).toBe(expected)
    }
    await page.mouse.up()

    // Released: moving the pointer no longer turns the dial.
    await page.mouse.move(cx + r, cy, { steps: 3 })
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', '0')
  })

  test('the number field sets an exact angle, wraps out-of-range values and ignores half-typed ones', async ({ page }) => {
    watch(page, 'a developer typing an angle')
    await open(page)
    const field = fieldOf(page)
    await expect(field).toHaveValue(String(FIRST_ANGLE))

    await field.fill('45')
    await expect.poll(() => cssAngle(page)).toBe(45)
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', '45')

    await field.fill('370') // wraps, as the wheel does
    await expect.poll(() => cssAngle(page)).toBe(10)

    await field.fill('-10')
    await expect.poll(() => cssAngle(page)).toBe(350)

    // A half-typed value changes nothing.
    await field.fill('')
    expect(await cssAngle(page), 'an empty field leaves the angle alone').toBe(350)

    // Arrow keys in the field take the wheel's steps, so 0 wraps to 359.
    await field.fill('0')
    await expect.poll(() => cssAngle(page)).toBe(0)
    await field.press('ArrowDown')
    await expect.poll(() => cssAngle(page)).toBe(359)
    await field.press('Shift+ArrowUp')
    await expect.poll(() => cssAngle(page)).toBe(14)

    // Enter leaves the field showing the live angle, not the draft.
    await field.fill('7')
    await field.press('Enter')
    await expect(field).toHaveValue('7')
    await expect(field).not.toBeFocused()
  })

  test('on a gallery gradient the wheel is locked for a free account and raises the Pro modal', async ({ page }) => {
    watch(page, 'a free user trying to edit a gallery gradient')
    await signIn(page, { plan: 'free' })
    await go(page, `${ROUTE}?gs=FF0000-0_0000FF-100&gt=linear&ga=90&gn=Test`)
    const wheel = wheelOf(page)
    await expect(wheel).toHaveAttribute('aria-valuenow', '90')
    // POSITIVE CONTROL: this really is the locked state, else "unchanged" proves nothing.
    await expect(wheel).toHaveAttribute('aria-disabled', 'true')
    await expect(fieldOf(page)).toHaveAttribute('readonly', '')

    await wheel.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(wheel).toHaveAttribute('aria-valuenow', '90')
    expect(await cssAngle(page), 'the CSS did not move').toBe(90)
  })

  test('the same gallery gradient lets a Pro account turn the wheel', async ({ page }) => {
    watch(page, 'a Pro user editing a gallery gradient')
    await signIn(page, { plan: 'pro' })
    await go(page, `${ROUTE}?gs=FF0000-0_0000FF-100&gt=linear&ga=90&gn=Test`)
    const wheel = wheelOf(page)
    await expect(wheel).toHaveAttribute('aria-valuenow', '90')
    await expect(wheel).not.toHaveAttribute('aria-disabled', 'true')
    await wheel.focus()
    await page.keyboard.press('ArrowRight')
    await expect(wheel).toHaveAttribute('aria-valuenow', '91')
  })
})

test.describe('the stop tints menu', () => {
  test('right-click on a stop opens eleven tints; Pro applies one and focus returns', async ({ page }) => {
    watch(page, 'a Pro designer tinting a stop')
    await signIn(page, { plan: 'pro' })
    await open(page)
    const before = (await stopHex(page, 2).innerText()).trim()

    await stopHex(page, 2).click({ button: 'right' })
    const menu = page.getByRole('menu', { name: /^Tints of stop 2, #[0-9A-F]{6}$/ })
    await expect(menu).toBeVisible()
    const items = menu.getByRole('menuitem')
    await expect(items).toHaveCount(11)
    await expect(items.first()).toHaveAccessibleName(/^Apply tint 50, #[0-9A-F]{6}$/)

    await items.nth(8).click() // 800
    await expect(menu).toBeHidden()
    const after = (await stopHex(page, 2).innerText()).trim()
    expect(after, 'the stop took the tint').not.toBe(before)
    expect(after).toMatch(/#[0-9A-F]{6}/)
    await expect.poll(() => codeOf(page).innerText()).toContain(after.match(/#[0-9A-F]{6}/)[0])
  })

  test('the Tints button opens the same menu on the keyboard, lands on the first tint and Escape returns focus', async ({ page }) => {
    watch(page, 'a Pro designer using the keyboard')
    await signIn(page, { plan: 'pro' })
    await open(page)

    const button = page.getByRole('button', { name: 'Tints of stop 1', exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('menu', { name: /^Tints of stop 1,/ })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem').first()).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem').nth(1)).toBeFocused()
    await page.keyboard.press('End')
    await expect(menu.getByRole('menuitem').last()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(button).toBeFocused()
  })

  test('a free account sees the ramp, and pressing a tint raises the Pro modal and leaves the stop alone', async ({ page }) => {
    watch(page, 'a free designer meeting the Tints gate')
    await signIn(page, { plan: 'free' })
    await open(page)
    const before = (await stopHex(page, 1).innerText()).trim()

    const button = page.getByRole('button', { name: 'Tints of stop 1 (Pro)', exact: true })
    await button.click()
    const menu = page.getByRole('menu', { name: /^Tints of stop 1,/ })
    await expect(menu).toBeVisible()
    await expect(menu.getByText('Tints are a Pro tool')).toBeVisible()
    const items = menu.getByRole('menuitem')
    await expect(items).toHaveCount(11)
    await expect(items.first()).toHaveAttribute('aria-disabled', 'true')
    await expect(items.first()).toHaveAccessibleName(/\(Pro\)$/)

    // aria-disabled rows still take a press (it raises the gate); reach one by keyboard.
    await items.nth(4).focus()
    await page.keyboard.press('Enter')
    const modal = page.getByRole('dialog', { name: 'Tint any stop' })
    await expect(modal).toBeVisible()
    await expect(menu).toBeHidden()
    expect((await stopHex(page, 1).innerText()).trim(), 'a free account does not get the tint').toBe(before)
  })

  test('right-click on a free account also shows the locked ramp, and a press outside closes it', async ({ page }) => {
    watch(page, 'a free designer right-clicking a stop')
    await signIn(page, { plan: 'free' })
    await open(page)
    await stopHex(page, 3).click({ button: 'right' })
    const menu = page.getByRole('menu', { name: /^Tints of stop 3,/ })
    await expect(menu).toBeVisible()
    await expect(menu.getByText('Tints are a Pro tool')).toBeVisible()
    await page.mouse.click(5, 300)
    await expect(menu).toBeHidden()
  })
})

test.describe('the Explore the library panel', () => {
  test('it is a named region under the presets and its button opens the gradient library', async ({ page }) => {
    watch(page, 'a designer looking for more gradients')
    await go(page, ROUTE)
    const presets = page.getByRole('region', { name: 'Start from a preset' })
    const explore = page.getByRole('region', { name: 'Explore the library' })
    await expect(explore).toBeVisible()
    const above = await Promise.all([presets, explore].map((l) => l.evaluate((el) => el.getBoundingClientRect().top)))
    expect(above[0], 'the presets sit above the Explore panel').toBeLessThan(above[1])

    const link = explore.getByRole('link', { name: 'Explore the library' })
    await expect(link).toHaveAttribute('href', '/discover/gradients')
    await link.click()
    await expect(page).toHaveURL(/\/discover\/gradients$/)
  })
})

test.describe('the presets', () => {
  test('there are 8 to 12, and a preset switches the interpolation to OKLCH even after sRGB was chosen', async ({ page }) => {
    watch(page, 'a designer picking a preset')
    await go(page, ROUTE)
    const tiles = page.locator('.grd-preset')
    const count = await tiles.count()
    expect(count).toBeGreaterThanOrEqual(8)
    expect(count).toBeLessThanOrEqual(12)

    const oklch = page.getByRole('button', { name: 'Perceived (OKLCH)', exact: true })
    const srgb = page.getByRole('button', { name: 'Standard (sRGB)', exact: true })
    await srgb.click()
    await expect(codeOf(page)).not.toContainText('in oklch')
    await expect(srgb).toHaveAttribute('aria-pressed', 'true')

    const rose = page.getByRole('button', { name: /^Rose Quartz/ })
    await rose.click()
    await expect(rose).toHaveAttribute('aria-pressed', 'true')
    await expect(oklch).toHaveAttribute('aria-pressed', 'true')
    await expect(codeOf(page)).toContainText('in oklch')
    await expect(stopHex(page, 1)).toContainText('#FFE3EC')
    expect(await cssAngle(page), 'the preset brings its own angle').toBe(135)
  })

  test('a radial preset applies as Radial and hides the angle wheel', async ({ page }) => {
    watch(page, 'a designer picking a spotlight preset')
    await go(page, ROUTE)
    await page.getByRole('button', { name: /^Lilac Halo/ }).click()
    await expect(codeOf(page)).toContainText('radial-gradient(in oklch')
    await expect(wheelOf(page)).toHaveCount(0)
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the wheel, angle field, stop swatches, Tints button and Explore button are all 44px, and the page does not scroll sideways', async ({ page }) => {
    watch(page, 'a designer on a phone')
    await signIn(page, { plan: 'pro' })
    await open(page)
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context must present a coarse pointer').toBe(true)

    const sizes = await page.evaluate(() => {
      const size = (sel) => [...document.querySelectorAll(sel)].map((el) => {
        const b = el.getBoundingClientRect()
        return { sel, w: Math.round(b.width), h: Math.round(b.height), font: parseFloat(getComputedStyle(el).fontSize) }
      })
      return [
        ...size('.grd-wheel'), ...size('.grd-angle-input'), ...size('.grd-stop-swatch'),
        ...size('.grd-tints-btn'), ...size('.grd-explore-cta'),
      ]
    })
    // POSITIVE CONTROL: every kind of target was found (3 stop swatches).
    for (const sel of ['.grd-wheel', '.grd-angle-input', '.grd-tints-btn', '.grd-explore-cta']) {
      expect(sizes.filter((s) => s.sel === sel).length, `${sel} found`).toBe(1)
    }
    expect(sizes.filter((s) => s.sel === '.grd-stop-swatch').length).toBe(3)
    expect(sizes.filter((s) => s.w < 44 || s.h < 44), 'targets under 44px').toEqual([])
    expect(sizes.find((s) => s.sel === '.grd-angle-input').font, 'iOS zooms a field under 16px').toBeGreaterThanOrEqual(16)

    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    expect(overflow.scroll, 'no horizontal overflow at 390').toBeLessThanOrEqual(overflow.client)
  })

  test('the tints menu fits the screen, its rows are 44px, and the page still does not scroll sideways', async ({ page }) => {
    watch(page, 'a designer opening tints on a phone')
    await signIn(page, { plan: 'pro' })
    await open(page)
    await page.getByRole('button', { name: 'Tints of stop 1', exact: true }).tap()
    const menu = page.getByRole('menu', { name: /^Tints of stop 1,/ })
    await expect(menu).toBeVisible()

    const read = await page.evaluate(() => {
      const m = document.querySelector('.grd-tintmenu')
      const b = m.getBoundingClientRect()
      return {
        left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom),
        vw: innerWidth, vh: innerHeight,
        short: [...m.querySelectorAll('[role="menuitem"]')].map((i) => Math.round(i.getBoundingClientRect().height)).filter((h) => h < 44),
        scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
      }
    })
    expect(read.left, 'inside the left edge').toBeGreaterThanOrEqual(0)
    expect(read.right, 'inside the right edge').toBeLessThanOrEqual(read.vw)
    expect(read.top).toBeGreaterThanOrEqual(0)
    expect(read.bottom, 'inside the bottom edge').toBeLessThanOrEqual(read.vh)
    expect(read.short, 'menu rows under 44px').toEqual([])
    expect(read.scroll).toBeLessThanOrEqual(read.client)
  })
})
