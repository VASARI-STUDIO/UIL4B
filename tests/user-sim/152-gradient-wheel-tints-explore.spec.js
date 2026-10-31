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
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'
import { tintRampForHex } from '../../src/utils/tintRamp.js'

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
  // A first visit opens on the first preset, angle included (Indigo Night, 160deg).
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
    // At 1440x900 the wheel sits below the fold (about y 943 to 1007), so a press
    // aimed at its box would land off screen. Bring it into view, then read the box.
    await wheelOf(page).scrollIntoViewIfNeeded()
    const box = await wheelOf(page).boundingBox()
    expect(box.y + box.height, 'the wheel is on screen before the drag').toBeLessThanOrEqual(900)
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

    await field.fill('360') // a full turn is 0, and the field and the dial agree (max 359)
    await expect.poll(() => cssAngle(page)).toBe(0)
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', '0')
    await expect(field).toHaveAttribute('max', await wheelOf(page).getAttribute('aria-valuemax'))

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

  test('the Tints button has a visible label, and pressing it again closes the menu it opened', async ({ page }) => {
    watch(page, 'a Pro designer opening and closing tints with the mouse')
    // At the suite's 1440x900 the 406px menu does not fit under the Tints button, so
    // it opens beside it. It must never cover its own opener, or the second press
    // would land on a tint row instead of closing the menu.
    await signIn(page, { plan: 'pro' })
    await open(page)

    const button = page.getByRole('button', { name: 'Tints of stop 1', exact: true })
    await expect(button).toContainText('Tints')
    const menu = page.getByRole('menu', { name: /^Tints of stop 1,/ })

    await button.click()
    await expect(menu).toBeVisible()
    const [m, b] = await Promise.all([menu.boundingBox(), button.boundingBox()])
    const overlaps = m.x < b.x + b.width && b.x < m.x + m.width && m.y < b.y + b.height && b.y < m.y + m.height
    expect(overlaps, `the menu ${JSON.stringify(m)} covers its button ${JSON.stringify(b)}`).toBe(false)
    await button.click() // used to close on pointerdown and reopen on click
    await expect(menu).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()
    await expect(menu).toBeVisible()
  })

  test('Tab leaves the menu with focus back on the Tints button, not lost off the page', async ({ page }) => {
    watch(page, 'a Pro designer tabbing out of the tints menu')
    await signIn(page, { plan: 'pro' })
    await open(page)

    const button = page.getByRole('button', { name: 'Tints of stop 1', exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('menu', { name: /^Tints of stop 1,/ })
    await expect(menu.getByRole('menuitem').first()).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(menu).toBeHidden()
    // Focus carried on from the opener into the page: it is on a real control, not <body>.
    const tag = await page.evaluate(() => document.activeElement?.tagName)
    expect(tag, 'focus fell off the page').not.toBe('BODY')
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
    await expect(modal, 'the modal leads with tints').toContainText('Eleven tints')
    await expect(modal, 'and drops the unrelated bullets').not.toContainText('Unlimited saved projects')
    await expect(menu).toBeHidden()
    expect((await stopHex(page, 1).innerText()).trim(), 'a free account does not get the tint').toBe(before)
  })

  // The ramp's hexes are the Pro value. MUTATION: in StopTintMenu.jsx print
  // t.hex in the locked row (or put it back in the aria-label); the free test goes red.
  test('a free account\'s tint menu holds none of the real tint hexes, in text or names, and the stand-in is blurred', async ({ page }) => {
    watch(page, 'a free designer reading the locked tints')
    await signIn(page, { plan: 'free' })
    await open(page)
    const stop = (await stopHex(page, 1).innerText()).match(/#[0-9A-F]{6}/)[0]
    const real = tintRampForHex(stop, 11).map((t) => t.hex.toUpperCase())
    expect(new Set(real).size, 'POSITIVE CONTROL: eleven distinct real tints to look for').toBe(11)

    await page.getByRole('button', { name: 'Tints of stop 1 (Pro)', exact: true }).click()
    const menu = page.getByRole('menu', { name: /^Tints of stop 1,/ })
    await expect(menu.getByRole('menuitem')).toHaveCount(11)

    const read = await menu.evaluate((el) => ({
      html: el.innerHTML.toUpperCase(),
      text: el.textContent.toUpperCase(),
      names: [...el.querySelectorAll('[role="menuitem"]')].map((i) => i.getAttribute('aria-label')),
      slots: [...el.querySelectorAll('.grd-tintmenu-hex')].map((s) => {
        const cs = getComputedStyle(s)
        return { hidden: s.getAttribute('aria-hidden'), filter: cs.filter, select: cs.userSelect || cs.webkitUserSelect, text: s.textContent }
      }),
    }))
    for (const hex of real) {
      // The chip paints its colour as rgb(), so its hex never reaches the markup either.
      expect(read.html, `${hex} is in the locked menu markup`).not.toContain(hex)
      expect(read.text, `${hex} is readable in the locked menu`).not.toContain(hex)
      expect(read.names.join('|').toUpperCase(), `${hex} is in an accessible name`).not.toContain(hex)
    }
    expect(read.names.every((n) => /^Tint \d+ \(Pro\)$/.test(n)), `names: ${read.names}`).toBe(true)
    expect(read.slots, 'a hex slot on every row').toHaveLength(11)
    for (const s of read.slots) {
      expect(s.hidden, 'the stand-in is hidden from a screen reader').toBe('true')
      expect(s.filter, 'the stand-in is blurred').toMatch(/blur\(/)
      expect(s.select, 'and cannot be selected').toBe('none')
      expect(s.text).not.toMatch(/[0-9A-F]{6}/i)
    }
  })

  test('a Pro account sees the real tint hexes in the same menu', async ({ page }) => {
    watch(page, 'a Pro designer reading the tints')
    await signIn(page, { plan: 'pro' })
    await open(page)
    const stop = (await stopHex(page, 1).innerText()).match(/#[0-9A-F]{6}/)[0]
    const real = tintRampForHex(stop, 11).map((t) => t.hex.toUpperCase())

    await page.getByRole('button', { name: 'Tints of stop 1', exact: true }).click()
    const menu = page.getByRole('menu', { name: /^Tints of stop 1,/ })
    await expect(menu.getByRole('menuitem')).toHaveCount(11)
    const shown = await menu.locator('.grd-tintmenu-hex').allInnerTexts()
    expect(shown.map((t) => t.trim()), 'the hex column is the real ramp').toEqual(real)
    await expect(menu.locator('.grd-tintmenu-hex--locked')).toHaveCount(0)
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
  test('it is a named region under the presets, its button opens the library and a signed-out visitor sees the three mood chips they can open', async ({ page }) => {
    watch(page, 'a designer looking for more gradients')
    await go(page, ROUTE)
    const presets = page.getByRole('region', { name: 'Start from a preset' })
    const explore = page.getByRole('region', { name: 'Explore the library' })
    await expect(explore).toBeVisible()
    const above = await Promise.all([presets, explore].map((l) => l.evaluate((el) => el.getBoundingClientRect().top)))
    expect(above[0], 'the presets sit above the Explore panel').toBeLessThan(above[1])

    // One way in from the presets: the header carries no second link to the library.
    await expect(presets.getByRole('link', { name: /Gradient Library/ })).toHaveCount(0)
    expect(await explore.evaluate((el) => parseFloat(getComputedStyle(el.querySelector('h2')).fontSize)), 'the panel heading is no bigger than the presets heading').toBeLessThanOrEqual(
      await presets.evaluate((el) => parseFloat(getComputedStyle(el.querySelector('h2')).fontSize)))

    // Signed out, the library opens only its first three rows (Sunset Blaze,
    // Golden Hour, Mango Pulp), so only the moods they carry get a chip: Warm,
    // Light, Vivid. Cool, Dark and Pastel would land on an empty list.
    const chips = explore.getByRole('list', { name: 'Browse the library by mood' }).getByRole('link')
    await expect(chips).toHaveCount(3)
    await expect(chips.locator('.grd-explore-mood')).toHaveText(['warm', 'light', 'vivid'])
    const hrefs = await chips.evaluateAll((els) => els.map((el) => el.getAttribute('href')))
    expect(hrefs).toEqual(['/discover/gradients?mood=warm', '/discover/gradients?mood=light', '/discover/gradients?mood=vivid'])
    // No withheld row's colours reach the page: Sun Flare (row 8) is withheld
    // from a signed-out visitor and ends on #7C2D12.
    const swatchStyles = (await explore.locator('.grd-explore-swatch').evaluateAll((els) => els.map((el) => el.getAttribute('style') || ''))).join(' ').toLowerCase()
    expect(swatchStyles, 'the chips are painted').toContain('gradient')
    expect(swatchStyles).not.toMatch(/7c2d12|rgb\(124,\s*45,\s*18\)/)
    // And the other way round: every colour in the chips is a stop of a row the
    // visitor can open (the first GALLERY_TIER_LIMITS.anonymous rows), whichever
    // withheld row a change might reach for.
    const toHex = (n) => Number(n).toString(16).padStart(2, '0')
    const found = [
      ...[...swatchStyles.matchAll(/#([0-9a-f]{6})(?![0-9a-f])/gi)].map((m) => m[1].toUpperCase()),
      ...[...swatchStyles.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)].map((m) => (toHex(m[1]) + toHex(m[2]) + toHex(m[3])).toUpperCase()),
    ]
    const openHexes = new Set(GALLERY_GRADIENTS.slice(0, GALLERY_TIER_LIMITS.anonymous).flatMap((g) => g.stops.map((st) => st.color.replace('#', '').toUpperCase())))
    expect(found.length, 'the chips carry colours to check').toBeGreaterThan(0)
    expect(found.filter((h) => !openHexes.has(h)), 'a chip colour from a row a signed-out visitor cannot open').toEqual([])

    const link = explore.getByRole('link', { name: 'Browse all gradients' })
    await expect(link).toHaveAttribute('href', '/discover/gradients')
    await link.click()
    await expect(page).toHaveURL(/\/discover\/gradients$/)
  })

  test('a mood chip lands on the library already filtered to that mood', async ({ page }) => {
    watch(page, 'a designer following a mood chip')
    await go(page, ROUTE)
    // Light, because a signed-out visitor is shown only the first three library
    // rows (Sunset Blaze, Golden Hour, Mango Pulp) and Mango Pulp is the only
    // one of them tagged light. Dark, cool and pastel match none of the three.
    await page.getByRole('link', { name: 'Light gradients in the library' }).click()
    await expect(page).toHaveURL(/\/discover\/gradients\?mood=light$/)
    await expect(page.getByRole('button', { name: 'Mood Light' })).toBeVisible()
    // The filter is on: the light gradient is listed and a warm-only one is not.
    await expect(page.getByText('Mango Pulp').first()).toBeVisible()
    await expect(page.getByText('Sunset Blaze')).toHaveCount(0)
  })

  // MUTATION: in src/pages/GradientGenerator.jsx render EXPLORE_TASTE instead of
  // exploreTaste; the chip-list check here and the three-chip count above go red.
  test('every chip a signed-out visitor is shown lands on a grid with gradients in it', async ({ page }) => {
    watch(page, 'a signed-out designer trying every mood chip')
    const chipsOf = (p) => p.getByRole('list', { name: 'Browse the library by mood' }).getByRole('link')
    await go(page, ROUTE)
    const names = await chipsOf(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
    // POSITIVE CONTROL: three chips to try, so the loop below is not vacuous.
    expect(names).toEqual(['Warm gradients in the library', 'Light gradients in the library', 'Vivid gradients in the library'])
    for (const label of names) {
      const mood = label.split(' ')[0]
      await go(page, ROUTE)
      await page.getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(new RegExp(`/discover/gradients\\?mood=${mood.toLowerCase()}$`))
      await expect(page.locator('.grg-card').first(), `${mood} lists a gradient`).toBeVisible()
      await expect(page.locator('.lbry-empty'), `${mood} is not an empty state`).toHaveCount(0)
    }
  })

  test('a Pro account sees all six chips, and so does a free one', async ({ page }) => {
    watch(page, 'a signed-in designer opening Explore')
    for (const plan of ['pro', 'free']) {
      await signIn(page, { plan })
      await go(page, ROUTE)
      const chips = page.getByRole('region', { name: 'Explore the library' }).getByRole('list', { name: 'Browse the library by mood' }).getByRole('link')
      // Auth and the plan resolve after the page paints, so the count settles.
      await expect(chips, plan).toHaveCount(6)
      await expect(chips.locator('.grd-explore-mood')).toHaveText(['warm', 'cool', 'dark', 'light', 'pastel', 'vivid'])
    }
  })

  test('the Browse all gradients caret follows the label', async ({ page }) => {
    watch(page, 'a designer reading the Browse button')
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, ROUTE)
      const cta = page.getByRole('link', { name: 'Browse all gradients' })
      await expect(cta).toBeVisible()
      const at = await cta.evaluate((el) => {
        const ico = el.querySelector('.tl-btn-ico')
        const label = el.querySelector('.tl-btn-label')
        if (!ico || !label) return null
        return { labelRight: label.getBoundingClientRect().right, iconLeft: ico.getBoundingClientRect().left }
      })
      // POSITIVE CONTROL: both the icon and the label text were found.
      expect(at, `${width}px: icon and label found`).not.toBeNull()
      expect(at.iconLeft, `${width}px: the caret sits right of the label`).toBeGreaterThanOrEqual(at.labelRight - 0.5)
    }
  })
})

test.describe('the generator layout', () => {
  // The palette row shows nine slots at most on a fine pointer (six on a finger), and
  // the "+N more" link takes the last slot. The ramp's eleven shades sit under it.
  // Every one must stay inside the Stops section and the page must not scroll sideways.
  // MUTATION: in gradient.css make .grd-chips nowrap (or .grd-chips--shades a
  // wider chip) and the chips run past the panel's edge.
  const THIRTEEN = [
    '#2F6BFF', '#E0784E', '#3FAFA0', '#0B0C0E', '#F7F7F4', '#D9B93C', '#8B5CF0',
    '#52A069', '#E894AC', '#1B3FA8', '#7A7A7A', '#B0C4DE', '#CD5C5C',
  ]
  const RAMP = [
    '#EEF3FF', '#D9E5FF', '#B8CEFF', '#8FB0FF', '#5F8BFF', '#2F6BFF',
    '#2556D1', '#1B41A3', '#142F78', '#0D1E4F', '#071230',
  ]
  for (const width of [390, 768, 1440]) {
    test(`at ${width}px thirteen palette colours show eight chips and "+5 more", the eleven shades stay inside the panel, and the page does not scroll sideways`, async ({ page }) => {
      watch(page, 'a designer with a full palette')
      await page.addInitScript(([colors, scale]) => {
        localStorage.setItem('vs-current-design', JSON.stringify({
          palette: { base: colors[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors },
          tints: { from: colors[0], scale },
        }))
      }, [THIRTEEN, RAMP])
      await page.setViewportSize({ width, height: 900 })
      await go(page, ROUTE)
      const paint = page.locator('.grd-paint')
      await expect(paint.locator('.grd-chips:not(.grd-chips--shades) .grd-chip'), 'nine slots: eight palette chips and the +N link').toHaveCount(8)
      await expect(paint.locator('.grd-chips--shades .grd-chip'), 'eleven shades').toHaveCount(11)
      // On a fine pointer the count is visible, with its word: "+5 more", not a bare "+5".
      const more = paint.getByRole('link', { name: /^\+5 .*colours in Palette Builder$/ })
      await expect(more).toBeVisible()
      await expect(more).toHaveAttribute('href', '/create/palette')
      await expect(more).toContainText('+5 more')
      const geo = await page.evaluate(() => {
        const panel = document.querySelector('.grd-paint').getBoundingClientRect()
        const mark = (el, kind) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: Math.round(r.top), kind } }
        const all = [
          ...[...document.querySelectorAll('.grd-paint .grd-chips:not(.grd-chips--shades) .grd-chip')].map((el) => mark(el, 'palette')),
          ...[...document.querySelectorAll('.grd-paint .grd-chips-more')].map((el) => mark(el, 'palette')),
          ...[...document.querySelectorAll('.grd-paint .grd-chips--shades .grd-chip')].map((el) => mark(el, 'shade')),
        ]
        const rowsOf = (list) => {
          const rows = new Map()
          for (const c of list) rows.set(c.top, (rows.get(c.top) || 0) + 1)
          return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)
        }
        return {
          outside: all.filter((c) => c.left < panel.left - 0.5 || c.right > panel.right + 0.5).length,
          paletteRows: rowsOf(all.filter((c) => c.kind === 'palette')),
          shadeRows: rowsOf(all.filter((c) => c.kind === 'shade')),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
      })
      expect(geo.outside, `${width}px: chips outside the palette row`).toBe(0)
      expect(geo.overflow, `${width}px: no sideways scroll`).toBeLessThanOrEqual(0)
      // Hand-checked from the design (7.2): 304px of chips, 28px chips with a 6px gap fit
      // nine to a row (9 x 28 + 8 x 6 = 300), so eight chips and the link make one row;
      // the 24px shade chips with a 3px gap fit all eleven on one row (294 of 304).
      if (width === 1440) {
        expect(geo.paletteRows, 'palette slots per row').toEqual([9])
        expect(geo.shadeRows, 'shade chips per row').toEqual([11])
      }
    })
  }

  // MUTATION: delete the `@media (min-width: 901px)` block in gradient.css that
  // grows the preview; the code box floats above a blank block and the gap is
  // well over 48px.
  test('at 1440 the code box sits within 48px of the presets, with no blank block between', async ({ page }) => {
    watch(page, 'a designer scrolling from the code to the presets')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, ROUTE)
    await expect(page.locator('.grd-code')).toBeVisible()
    const gap = await page.evaluate(() => {
      const code = document.querySelector('.grd-code').getBoundingClientRect()
      const presets = document.querySelector('.grd-presets').getBoundingClientRect()
      return presets.top - code.bottom
    })
    expect(gap, 'px between the code box and the presets').toBeGreaterThan(0)
    expect(gap, 'px between the code box and the presets').toBeLessThan(48)
  })
})

test.describe('the live position over a dragged stop', () => {
  // 12px type on a 3px-padded scrim sits above the handle, whole, and on screen,
  // for the middle stop and for the two at the ends of the rail.
  for (const width of [390, 1440]) test(`at ${width}px the position label is readable and clear of the handle while a stop is dragged`, async ({ page }) => {
    watch(page, 'a designer dragging a stop')
    await page.setViewportSize({ width, height: 900 })
    await go(page, ROUTE)
    for (const [n, toPct] of [[2, 40], [1, 0], [3, 100]]) {
      const handle = page.getByRole('button', { name: new RegExp(`^Gradient stop ${n} at`) })
      const rail = page.locator('.grd-rail')
      await expect(handle).toBeVisible()
      // The stops row can sit below the fold at 1440x900; a press aimed at an
      // off-screen box lands on nothing. Scroll it in, then read the boxes.
      await handle.scrollIntoViewIfNeeded()
      const hb = await handle.boundingBox()
      const rb = await rail.boundingBox()
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
      await page.mouse.down()
      await page.mouse.move(rb.x + (rb.width * toPct) / 100, hb.y + hb.height / 2, { steps: 6 })
      await expect(handle, `stop ${n} is being dragged`).toHaveClass(/is-dragging/)
      const val = handle.locator('.grd-handle-val')
      await expect(val).toHaveCSS('visibility', 'visible')
      await expect.poll(() => val.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      const m = await val.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const h = el.parentElement.getBoundingClientRect()
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, handleTop: h.top, font: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth, text: el.textContent, vw: innerWidth }
      })
      expect(m.font, `stop ${n}: the label is 12px`).toBe(12)
      expect(m.text, `stop ${n}: it reads the live position`).toBe(`${toPct}%`)
      expect(m.bottom, `stop ${n}: the label ends above the handle`).toBeLessThanOrEqual(m.handleTop)
      expect(m.top, `stop ${n}: the label is on screen`).toBeGreaterThanOrEqual(0)
      expect(m.left, `stop ${n}: inside the left edge`).toBeGreaterThanOrEqual(0)
      expect(m.right, `stop ${n}: inside the right edge`).toBeLessThanOrEqual(m.vw)
      expect(m.clipped, `stop ${n}: the text fits its box`).toBe(false)
      await page.mouse.up()
    }
  })
})

test.describe('the library when the signed-out cap empties a mood', () => {
  const LIBRARY = '/discover/gradients'
  const emptyOf = (page) => page.locator('.grg-empty')

  // MUTATION: in src/pages/GradientGallery.jsx make accountMatches return 0
  // always; the title reverts to "No gradients match those filters." and the
  // sign-in button is gone, so this goes red.
  test('?mood=dark signed out says the cap is the reason, keeps Clear filters, and the button opens the sign-in prompt', async ({ page }) => {
    watch(page, 'a signed-out visitor who followed a Dark link')
    await go(page, `${LIBRARY}?mood=dark`)
    const empty = emptyOf(page)
    await expect(empty).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mood Dark' }), 'the filter really is on').toBeVisible()
    await expect(page.locator('.grg-card'), 'nothing listed').toHaveCount(0)

    await expect(empty).toContainText('Nothing open to you matches those filters.')
    // The first ten rows carry two dark ones (Bloody Mary, Ember Fade).
    await expect(empty).toContainText('A free account opens 2 that fit these filters.')
    await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible()
    // The sign-in action is the primary: Clear filters is the quiet secondary
    // (no fill, a 1px ring).
    const clearStyle = await empty.getByRole('button', { name: 'Clear filters' }).evaluate((el) => {
      const cs = getComputedStyle(el)
      return { bg: cs.backgroundColor, ring: cs.borderTopWidth }
    })
    expect(clearStyle.bg, 'Clear filters has no fill beside the sign-in action').toBe('rgba(0, 0, 0, 0)')
    expect(clearStyle.ring).toBe('1px')
    const signInBtn = empty.getByRole('button', { name: 'Open 2 with a free account' })
    await expect(signInBtn).toBeVisible()
    await expect(page.getByRole('dialog'), 'no prompt before the click').toHaveCount(0)

    await signInBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('textbox').first()).toBeVisible()
  })

  test('Clear filters from that state brings the three open gradients back', async ({ page }) => {
    watch(page, 'a signed-out visitor undoing a Dark link')
    await go(page, `${LIBRARY}?mood=dark`)
    await expect(emptyOf(page)).toBeVisible()
    await emptyOf(page).getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.grg-card').first()).toBeVisible()
    await expect(emptyOf(page)).toHaveCount(0)
  })

  // MUTATION: drop `|| query` from the accountMatches guard in GradientGallery.jsx;
  // the sign-in button turns up under a typed search, and this goes red.
  test('?mood=dark with a typed search that matches nothing open is the plain "No gradients match", with no sign-in button', async ({ page }) => {
    watch(page, 'a signed-out visitor searching inside Dark')
    await go(page, `${LIBRARY}?mood=dark`)
    // POSITIVE CONTROL: the sign-in state is what this page shows before the search.
    await expect(emptyOf(page).getByRole('button', { name: 'Open 2 with a free account' })).toBeVisible()

    // Ember Fade is a withheld dark gradient: a search that names it must not be
    // answered with a count of withheld rows matching, however it is worded.
    await page.getByLabel('Search gradients').fill('Ember')
    const empty = emptyOf(page)
    await expect(empty).toContainText('No gradients match “Ember”.')
    await expect(empty).not.toContainText('Nothing open to you')
    await expect(empty.getByRole('button', { name: /with a free account$/ })).toHaveCount(0)
    await expect(empty.getByRole('button', { name: 'Clear filters' })).toBeVisible()
  })

  test('a free account on ?mood=dark gets the dark gradients, not the sign-in state', async ({ page }) => {
    watch(page, 'a signed-in free visitor following a Dark link')
    await signIn(page, { plan: 'free' })
    await go(page, `${LIBRARY}?mood=dark`)
    await expect(page.locator('.grg-card').filter({ hasText: 'Ember Fade' })).toHaveCount(1)
    await expect(emptyOf(page)).toHaveCount(0)
  })

  // MUTATION: drop `authLoading ||` from the accountMatches guard in
  // GradientGallery.jsx; the button shows while the session is still resolving
  // and the observer catches it.
  for (const plan of ['free', 'pro']) test(`a ${plan} account landing on ?mood=dark is never offered "with a free account", even while auth is still resolving`, async ({ page }) => {
    watch(page, 'a signed-in visitor following a Dark link before the session has answered')
    {
      await signIn(page, { plan, authDelay: 4000 })
      // Records every moment the offer is on screen, from the first mutation on.
      await page.addInitScript(() => {
        window.__offerSeen = false
        const look = () => {
          for (const b of document.querySelectorAll('.grg-empty button')) {
            if (/with a free account/.test(b.textContent || '')) window.__offerSeen = true
          }
        }
        new MutationObserver(look).observe(document, { subtree: true, childList: true, characterData: true })
      })
      await go(page, `${LIBRARY}?mood=dark`)
      // POSITIVE CONTROL: the page is inside the loading window. The session has
      // not answered, but this is a returning session (the hint), so the library
      // shows the neutral loading block rather than reading as signed out: no
      // "No gradients match" and no offer, and no card has appeared yet.
      await expect(page.locator('.lockt-status'), `${plan}: the neutral loading block shows while auth is pending`).toContainText('Loading the gradient library')
      await expect(emptyOf(page), `${plan}: no empty state while the plan is unknown`).toHaveCount(0)
      await expect(page.locator('.grg-card')).toHaveCount(0)
      // Then the account answers and the dark gradients arrive.
      await expect(page.locator('.grg-card').filter({ hasText: 'Ember Fade' }), `${plan}: Ember Fade after auth`).toHaveCount(1, { timeout: 10000 })
      await expect(emptyOf(page)).toHaveCount(0)
      expect(await page.evaluate(() => window.__offerSeen), `${plan}: the sign-up offer was never on screen`).toBe(false)
    }
  })
})

test.describe('the presets', () => {
  test('there are exactly 12, and a preset switches the interpolation to OKLCH even after sRGB was chosen', async ({ page }) => {
    watch(page, 'a designer picking a preset')
    await go(page, ROUTE)
    const tiles = page.locator('.grd-preset')
    const count = await tiles.count()
    expect(count, 'twelve fills 6x2, 4x3 and 2x6 with no short row').toBe(12)

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

  // MUTATION: set the 1200px column count in gradient.css to 5; this goes red at
  // 1440 and 1280 (and the 1440 rail test in spec 36 does too). Set
  // .grd-preset-meta back to 10.5px; the text-size check goes red.
  test('the grid is 2 columns by 6 rows, 4 by 3, then 6 by 2, and no preset name is cut short', async ({ page }) => {
    watch(page, 'a designer at three widths')
    const shape = () => page.locator('.grd-preset-grid .grd-preset').evaluateAll((els) => {
      const rows = new Set(els.map((el) => Math.round(el.getBoundingClientRect().top)))
      const names = els.map((el) => el.querySelector('.grd-preset-name'))
      return {
        count: els.length,
        rows: rows.size,
        cols: els.length / rows.size,
        cut: names.filter((n) => n.scrollWidth > n.clientWidth).map((n) => n.textContent),
      }
    })
    for (const [width, cols, rows] of [[390, 2, 6], [768, 4, 3], [1200, 6, 2], [1280, 6, 2], [1440, 6, 2]]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, ROUTE)
      const s = await shape()
      expect(s, `${width}px`).toMatchObject({ count: 12, cols, rows, cut: [] })
    }
  })

  test('no text in the presets or the Explore panel is under 12px', async ({ page }) => {
    watch(page, 'a designer reading the small print')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, ROUTE)
    const small = await page.locator('.grd-preset, .grd-explore').evaluateAll((roots) => {
      const out = []
      for (const root of roots) {
        for (const el of [root, ...root.querySelectorAll('*')]) {
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
          const px = parseFloat(getComputedStyle(el).fontSize)
          if (own && px < 12) out.push(`${el.className || el.tagName}: ${px}px`)
        }
      }
      return out
    })
    expect(small).toEqual([])
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
    // Measured straight away, with the entrance animation still running: the menu
    // fades in but never scales, so a 44px row reads 44px from the first frame.

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

test.describe('one starting gradient, one focus ring', () => {
  test('a first visit and Reset draw the same gradient: 160deg and identical CSS', async ({ page }) => {
    watch(page, 'a designer resetting the gradient')
    await go(page, ROUTE)
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', String(FIRST_ANGLE))
    const first = await codeOf(page).innerText()
    expect(first).toContain(`linear-gradient(${FIRST_ANGLE}deg in oklch`)

    await wheelOf(page).focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', String(FIRST_ANGLE + 15))
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', String(FIRST_ANGLE))
    expect(await codeOf(page).innerText(), 'Reset matches the first visit').toBe(first)
  })

  test('the angle field shows exactly one focus ring: an outline, no halo, no border change', async ({ page }) => {
    watch(page, 'a keyboard user in the angle field')
    await go(page, ROUTE)
    const field = fieldOf(page)
    await expect(field).toBeVisible()
    const look = () => field.evaluate((el) => {
      const s = getComputedStyle(el)
      return { outline: `${s.outlineStyle} ${s.outlineWidth}`, shadow: s.boxShadow, border: s.borderTopColor }
    })
    const rest = await look()
    await page.keyboard.press('Tab') // land on a control, then move focus in by keyboard
    await field.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(field).toBeFocused()
    await expect.poll(async () => (await look()).outline).toMatch(/^solid [1-9]/)
    const on = await look()
    expect(on.shadow, 'no halo stacked on the outline').toBe('none')
    expect(on.border, 'the border does not also change colour').toBe(rest.border)
  })
})

// A saved gradient owns its angle only when it has real stops. The design's
// untouched default carries a placeholder angle and two stops with no colour, and
// that must read as "nothing saved" (160deg), not as a saved angle.
//
// MUTATION: in src/pages/GradientGenerator.jsx make the saved-angle initialiser
// return DEFAULT_ANGLE unconditionally; the first and third tests go red.
const DESIGN_KEY = 'vs-current-design'

async function seedGradient(page, gradient) {
  await page.addInitScript(([key, value]) => {
    try {
      if (sessionStorage.getItem('__grd_seeded') === '1') return
      sessionStorage.setItem('__grd_seeded', '1')
      localStorage.setItem(key, value)
    } catch { /* private mode */ }
  }, [DESIGN_KEY, JSON.stringify({ gradient })])
}

test.describe('a saved gradient keeps its angle', () => {
  test('90deg set in the tool is still 90deg after a reload, not the 160deg first-visit angle', async ({ page }) => {
    watch(page, 'a designer returning to a saved gradient')
    await open(page)
    await fieldOf(page).fill('90')
    await fieldOf(page).press('Enter')
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', '90')
    // The tool writes the design as it changes; wait for the write, then leave.
    await expect.poll(() => page.evaluate((k) => {
      const g = JSON.parse(localStorage.getItem(k) || '{}').gradient
      return g && g.angle
    }, DESIGN_KEY)).toBe(90)

    await page.reload()
    await expect(wheelOf(page)).toBeVisible()
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', '90')
    await expect.poll(() => cssAngle(page), { message: "the CSS carries the saved angle" }).toBe(90)
  })

  test('a design whose stops have no colour is nothing saved: its placeholder angle gives 160', async ({ page }) => {
    watch(page, 'a visitor whose design has an empty gradient')
    await seedGradient(page, {
      type: 'Linear', angle: 45, space: 'oklch',
      stops: [{ color: null, position: 0 }, { color: null, position: 100 }],
    })
    await go(page, ROUTE)
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', String(FIRST_ANGLE))
    await expect.poll(() => cssAngle(page)).toBe(FIRST_ANGLE)
  })

  test('a saved angle of 0 is kept: 0 is an angle, not a missing one', async ({ page }) => {
    watch(page, 'a designer who saved a vertical gradient')
    await seedGradient(page, {
      type: 'Linear', angle: 0, space: 'srgb',
      stops: [{ color: '#112233', position: 0 }, { color: '#AABBCC', position: 100 }],
    })
    await go(page, ROUTE)
    await expect(wheelOf(page)).toHaveAttribute('aria-valuenow', '0')
    await expect.poll(() => cssAngle(page)).toBe(0)
  })
})

// At 360px and under the word "Tints" goes so the hex field keeps its width, and the
// Pro cue stays visible: a free account sees "Pro" on the button, not only in its
// aria-label. MUTATION: hide `.grd-pro-tag` again in the `max-width: 360px` block of
// gradient.css and the free tests go red; show `.grd-tints-label` and the label test does.
for (const [width, touch] of [[360, true], [320, true], [360, false], [320, false]]) {
  test.describe(`Tints at ${width}px${touch ? ' on a finger' : ''}`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: touch, isMobile: touch })

    test('a free account sees the word Pro on the button, and not the word Tints', async ({ page }) => {
      watch(page, `a free designer at ${width}px`)
      await signIn(page, { plan: 'free' })
      await go(page, ROUTE)
      const button = page.getByRole('button', { name: 'Tints of stop 1 (Pro)', exact: true })
      await expect(button).toBeVisible()
      // innerText leaves out what is display:none, so this is the text a person can read.
      await expect.poll(() => button.evaluate((el) => el.innerText.trim())).toBe('Pro')
      await expect(button.locator('.grd-tints-label')).toBeHidden()
      // It fits: inside the screen, clear of the hex field, and 44px on a finger.
      const [b, hex] = await Promise.all([button.boundingBox(), page.getByRole('textbox', { name: 'Stop 1 hex' }).boundingBox()])
      expect(b.x + b.width, 'the button runs past the screen').toBeLessThanOrEqual(width)
      expect(hex.x + hex.width, 'the hex field runs under the button').toBeLessThanOrEqual(b.x + 0.5)
      if (touch) {
        expect(b.height, 'button height').toBeGreaterThanOrEqual(44)
        expect(b.width, 'button width').toBeGreaterThanOrEqual(44)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'the page scrolls sideways').toBeLessThanOrEqual(width)
    })

    test('a Pro account has no Pro tag to read', async ({ page }) => {
      watch(page, `a Pro designer at ${width}px`)
      await signIn(page, { plan: 'pro' })
      await go(page, ROUTE)
      const button = page.getByRole('button', { name: 'Tints of stop 1', exact: true })
      await expect(button).toBeVisible()
      await expect.poll(() => button.evaluate((el) => el.innerText.trim())).toBe('')
    })
  })
}
