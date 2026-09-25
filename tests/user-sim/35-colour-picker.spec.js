// The shared colour picker's new controls, measured in a browser.
//
// The picker offers Solid / Gradient / Image tabs, an SV field, hue and alpha
// sliders, a format dropdown and saved swatches.
//
// The SV field, hue slider and presets already existed. What is asserted here
// is what was added — the notation dropdown and the shared recent swatches —
// plus, deliberately, the ABSENCE of the two controls that were declined, so a
// later stub cannot appear without someone deciding to add one. The scoping
// argument is in the component's own header; the short version is that nothing
// downstream can store an alpha or consume a gradient, and a control no surface
// can consume is dead code that merely looks finished.
//
// The notation maths is asserted without a browser in
// tests/unit/color-formats.test.js, and the recents list in
// tests/unit/recent-colors.test.js. What needs a browser is that the picker is
// wired to both.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const TRIGGER = '.cpk-trigger'
const PANEL = '.cpk-pop'
const FIELD = '.cpk-hex'
const FORMAT = '.cpk-format'

async function openPicker(page) {
  await go(page, ROUTE)
  await page.locator(TRIGGER).first().click()
  await expect(page.locator(PANEL)).toBeVisible()
}

test.describe('colour picker', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'designer mixing a colour') })

  test('the notation dropdown rewrites the field without changing the colour', async ({ page }) => {
    await openPicker(page)
    const swatch = page.locator('.grd-pick-swatch .cpk-trigger-chip').first()
    const before = await swatch.evaluate(el => getComputedStyle(el).backgroundColor)

    await expect(page.locator(FIELD)).toHaveValue(/^#[0-9a-f]{6}$/i)
    await page.locator(FORMAT).selectOption('rgb')
    await expect(page.locator(FIELD)).toHaveValue(/^rgb\(\d+ \d+ \d+\)$/)
    await page.locator(FORMAT).selectOption('hsl')
    await expect(page.locator(FIELD)).toHaveValue(/^hsl\(\d+ \d+% \d+%\)$/)

    // A lens, not a second value: the colour itself never moved.
    expect(await swatch.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(before)
  })

  test('typing any notation is accepted whatever the dropdown says', async ({ page }) => {
    await openPicker(page)
    // Still on hex, pasting rgb — the case of someone copying out of devtools.
    await page.locator(FIELD).fill('rgb(67 56 224)')
    await page.locator(FIELD).press('Enter')
    await expect.poll(() => page.locator('.grd-pick-swatch .cpk-trigger-chip').first()
      .evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(67, 56, 224)')
  })

  test('an unreadable value snaps back instead of destroying the colour', async ({ page }) => {
    await openPicker(page)
    const before = await page.locator(FIELD).inputValue()
    await page.locator(FIELD).fill('not a colour')
    await page.locator(FIELD).press('Enter')
    await expect(page.locator(FIELD)).toHaveValue(before)
  })

  test('a colour committed here comes back as a recent swatch', async ({ page }) => {
    await openPicker(page)
    await page.locator(FIELD).fill('#4338e0')
    await page.locator(FIELD).press('Enter')

    const recents = page.locator('.cpk-recents .cpk-swatch')
    await expect(recents.first()).toBeVisible()
    await expect(recents.first()).toHaveAttribute('aria-label', '#4338e0')
  })

  // The point of the list being shared rather than per-control.
  test('recents follow you to another tool', async ({ page }) => {
    await openPicker(page)
    await page.locator(FIELD).fill('#4338e0')
    await page.locator(FIELD).press('Enter')
    await page.keyboard.press('Escape')

    await go(page, '/create/palette')
    await page.locator(TRIGGER).first().click()
    await expect(page.locator(PANEL)).toBeVisible()
    await expect(page.locator('.cpk-recents .cpk-swatch').first())
      .toHaveAttribute('aria-label', '#4338e0')
  })

  test('the recents list has a name of its own, beside the presets', async ({ page }) => {
    await openPicker(page)
    await page.locator(FIELD).fill('#4338e0')
    await page.locator(FIELD).press('Enter')
    // Two listboxes in one panel: an unnamed second one is indistinguishable
    // from the first to a screen reader.
    const named = await page.locator(`${PANEL} [role="listbox"]`).evaluateAll(
      (boxes) => boxes.map((b) => {
        const by = b.getAttribute('aria-labelledby')
        return by ? document.getElementById(by)?.textContent?.trim() : b.getAttribute('aria-label')
      }),
    )
    expect(named).toContain('Recent')
    expect(named).toContain('Preset colours')
  })

  // Declined, and asserted as declined. See the component header: no surface
  // can store an alpha (a gradient stop is `{ color, position }`; a palette
  // swatch must stay opaque for the contrast maths and the exports) and none
  // can consume a gradient or an image from this control.
  test('no alpha slider and no Solid/Gradient/Image tabs have appeared', async ({ page }) => {
    await openPicker(page)
    await expect(page.locator('.cpk-alpha')).toHaveCount(0)
    const text = await page.locator(PANEL).innerText()
    expect(text).not.toMatch(/\bImage\b/)
    expect(text).not.toMatch(/\bGradient\b/)
    // Also by ROLE, not only by text. The panel now shows a title supplied
    // by its caller, so a future ariaLabel containing one of those words
    // could fire the text assertion for an innocent reason — and, worse, a
    // tab strip labelled "Fill"/"Blend" would slip past it entirely. A
    // tablist is what "tabs have appeared" actually means.
    await expect(page.locator(`${PANEL} [role="tablist"], ${PANEL} [role="tab"]`)).toHaveCount(0)
    // The only range control in this panel is the hue. A second one is the
    // shape an alpha track would arrive in.
    await expect(page.locator(`${PANEL} input[type="range"]`)).toHaveCount(1)
  })

  test('the panel keeps its keyboard contract', async ({ page }) => {
    await openPicker(page)
    // usePopover lands focus on the pad, which is this popover's whole purpose.
    await expect(page.locator('.cpk-pad')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.locator(TRIGGER).first()).toBeFocused()
  })

  // -- The hue strip actually paints a hue -----------------------------------
  // Regression guard for a defect that shipped from the day this component was
  // written. `input[type="range"]` near the top of global.css is (0,1,1) and
  // sets `background:transparent`; a bare `.cpk-hue` is (0,1,0), so the app's
  // generic slider won every contested declaration and the strip rendered as a
  // 4px grey track with the standard blue thumb. Every rainbow declaration was
  // present in the stylesheet and none of them applied - which is why reading
  // the CSS never revealed it and rendering the panel did, in one look.
  test('the hue strip is a hue strip, not the app default slider', async ({ page }) => {
    await openPicker(page)
    const hue = page.locator('.cpk-hue')
    await expect(hue).toBeVisible()
    const painted = await hue.evaluate((el) => ({
      image: getComputedStyle(el).backgroundImage,
      height: Math.round(el.getBoundingClientRect().height),
    }))
    expect(painted.image).toContain('gradient')
    // A hue wheel, not a two-stop fade: red round through to red again.
    expect(painted.image.match(/rgb\(/g)?.length || 0).toBeGreaterThanOrEqual(5)
    // And it is the strip, not the 32px generic slider box.
    expect(painted.height).toBeLessThan(32)
  })

  // -- One picker, everywhere ------------------------------------------------
  // The founder's second half: "i want this one used for all colour pickers".
  // A native <input type="color"> opens the OPERATING SYSTEM's dialog, so any
  // that survive are surfaces where the app's own picker - and the shared
  // recents with it - is simply not on offer.
  for (const route of ['/create/contrast', '/create/tint', '/create/palette', '/create/gradient']) {
    test(`${route} offers the app own picker and no OS colour dialog`, async ({ page }) => {
      await go(page, route)
      await expect(page.locator(TRIGGER).first()).toBeVisible()
      await expect(page.locator('input[type="color"]')).toHaveCount(0)
    })
  }

  // The point of the shared list, measured across two tools that BOTH used to
  // open the OS picker and so could not participate in it at all.
  test('a colour mixed in the contrast checker reaches the tint tool', async ({ page }) => {
    await go(page, '/create/contrast')
    await page.locator(TRIGGER).first().click()
    await expect(page.locator(PANEL)).toBeVisible()
    await page.locator(FIELD).fill('#4338e0')
    await page.locator(FIELD).press('Enter')
    await page.keyboard.press('Escape')

    await go(page, '/create/tint')
    await page.locator(TRIGGER).first().click()
    await expect(page.locator(PANEL)).toBeVisible()
    await expect(page.locator('.cpk-recents .cpk-swatch').first())
      .toHaveAttribute('aria-label', '#4338e0')
  })

  // ── Every route to a colour reaches the shared list ────────────────────────
  // [colour-picker-ui] The three recents tests above all commit through the HEX
  // FIELD, and that is the one route that always worked. `remember()` was wired
  // to the pad's POINTER release, a swatch press, an eyedropper pick and a typed
  // value — so mixing with the arrow keys, or moving only the hue strip, changed
  // the colour on screen and left the Recent grid empty. These two drive the
  // CONTROLS rather than the helper: they assert on `.cpk-recents`, which is
  // rendered from `getRecentColors()`, so reverting either handler in
  // ColorPickerPop.jsx fails them.
  //
  // Neither asserts a specific hex. The pad's arrow step is 2% of saturation and
  // the strip's is one degree of hue, and pinning the exact colour those produce
  // would be a test of hsvToHex's rounding rather than of the wiring. What must
  // be true is that a colour arrives at all, and that it is the one now shown in
  // the field.
  test('a colour mixed on the pad with the keyboard reaches the recents list', async ({ page }) => {
    await openPicker(page)
    // The panel opens with focus on the pad (asserted above), and this tool's
    // first stop is a saturated colour, so there is room to move in both axes.
    await expect(page.locator('.cpk-pad')).toBeFocused()
    await expect(page.locator('.cpk-recents .cpk-swatch')).toHaveCount(0)

    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowDown')

    const mixed = await page.locator(FIELD).inputValue()
    const recents = page.locator('.cpk-recents .cpk-swatch')
    await expect(recents.first()).toBeVisible()
    await expect(recents.first()).toHaveAttribute('aria-label', mixed.toLowerCase())
  })

  test('a colour set on the hue strip alone reaches the recents list', async ({ page }) => {
    await openPicker(page)
    await expect(page.locator('.cpk-recents .cpk-swatch')).toHaveCount(0)

    // Focus the strip and move it — the hue-only route, which recorded nothing
    // at all before. Tab from the pad rather than clicking, so the assertion
    // cannot be satisfied by a stray pointerup landing on the pad instead.
    await page.locator('.cpk-hue').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    const mixed = await page.locator(FIELD).inputValue()
    const recents = page.locator('.cpk-recents .cpk-swatch')
    await expect(recents.first()).toBeVisible()
    await expect(recents.first()).toHaveAttribute('aria-label', mixed.toLowerCase())
  })

  // Tab and Escape raise keyup on these controls too. A colour the user only
  // LOOKED at must not take a slot in a twelve-slot shared list.
  test('opening the panel and leaving it records nothing', async ({ page }) => {
    await openPicker(page)
    await expect(page.locator('.cpk-recents .cpk-swatch')).toHaveCount(0)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Escape')

    await page.locator(TRIGGER).first().click()
    await expect(page.locator(PANEL)).toBeVisible()
    await expect(page.locator('.cpk-recents .cpk-swatch')).toHaveCount(0)
  })

  // `role="slider"` REQUIRES aria-valuenow. Without it the node is invalid and
  // some screen readers announce nothing for it at all. The pad is 2D, so
  // valuenow carries saturation and aria-valuetext carries both axes — this
  // asserts the required attribute exists AND that it tracks the control,
  // rather than being a constant that satisfies a linter.
  test('the saturation pad exposes a value a screen reader can read', async ({ page }) => {
    await openPicker(page)
    const pad = page.locator('.cpk-pad')
    await expect(pad).toHaveAttribute('aria-valuemin', '0')
    await expect(pad).toHaveAttribute('aria-valuemax', '100')

    const before = Number(await pad.getAttribute('aria-valuenow'))
    expect(Number.isFinite(before)).toBe(true)
    await pad.press('ArrowLeft')
    const after = Number(await pad.getAttribute('aria-valuenow'))
    expect(after).toBeLessThan(before)
    await expect(pad).toHaveAttribute('aria-valuetext', new RegExp(`Saturation ${after}%`))
  })

  // The panel says WHICH of the many colours on a surface it is editing. A
  // gradient opens one of these per stop, and before this they were identical.
  test('the panel names the colour it is editing', async ({ page }) => {
    await go(page, ROUTE)
    // The rebuilt gradient edits the SELECTED stop with one
    // picker, so choose stop 2 first; the panel must then say so.
    await page.getByRole('button', { name: /^Select stop 2,/ }).click()
    await page.locator(TRIGGER).first().click()
    await expect(page.locator(PANEL)).toBeVisible()
    await expect(page.locator('.cpk-head-name')).toHaveText('Stop 2 colour')
  })
})
