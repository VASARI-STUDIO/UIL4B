import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { hexToHct } from '../../src/utils/colors.js'

/** The Palette Builder writes the board into the saved project on a ~200ms
 *  debounce. Anything that reloads or re-navigates to prove the board SURVIVED
 *  has to wait for that write to land — waiting on the stored value rather than
 *  on a duration, so the test fails only for the reason it is about. */
const waitForSavedSeed = (page, hex) => expect
  .poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('vs-current-design') || 'null')?.palette?.colors?.[0] || ''
  ).toUpperCase()), { timeout: 5000 })
  .toBe(hex.toUpperCase())

test.describe('Palette Builder recovery and tool continuity', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('palette-test-cleaned')) return
      localStorage.removeItem('vs-current-design')
      localStorage.removeItem('vs-palette-history')
      sessionStorage.clear()
      sessionStorage.setItem('palette-test-cleaned', 'true')
    })
  })

  test('a first session starts from one random seed and every seed representation matches', async ({ page }) => {
    watch(page, 'first-time palette designer')
    await go(page, '/create/palette')

    const seed = page.getByRole('textbox', { name: 'Seed colour hex' })
    const firstHex = page.locator('.plb-col .plb-hex').first()
    await expect(seed).toHaveValue(/^#[0-9A-F]{6}$/)
    await expect(firstHex).toHaveText(await seed.inputValue())

    const initial = await seed.inputValue()
    const pickerColour = await page.locator('.plb-seedpick .cpk-trigger-chip').evaluate(
      element => getComputedStyle(element).backgroundColor,
    )
    const firstColour = await page.locator('.plb-col').first().evaluate(
      element => getComputedStyle(element).backgroundColor,
    )
    expect(pickerColour).toBe(firstColour)

    // This used to assert the seed SURVIVED a reload, which was true because
    // `vs-palette-session-seed` pinned the first draw to the tab. The founder's
    // 2026-09-03 request is that the page auto-loads a random palette, so an
    // untouched board is now redrawn on arrival — and it must be, because the
    // board was also being persisted on mount, which meant "random on load"
    // held exactly once per device and never again.
    //
    // What replaces it is the guarantee that actually protects a person's work:
    // once they have TOUCHED the board it survives a reload. An untouched draw
    // is not work; a randomised one is.
    await page.getByRole('button', { name: /Randomise/ }).click()
    await expect(seed).not.toHaveValue(initial)
    const chosen = await seed.inputValue()
    // The project write is debounced ~200ms. Wait for the value to actually be
    // in storage rather than for a duration — reloading a moment early would
    // fail this for a reason that has nothing to do with what it tests.
    await waitForSavedSeed(page, chosen)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(seed).toHaveValue(chosen)
    await expect(firstHex).toHaveText(chosen)
  })

  test('the shell aligns, controls stay level, and a hover label grows its own button', async ({ page }) => {
    watch(page, 'precision-focused desktop designer')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    await expect(page.locator('.plb-toolbar')).toBeVisible()

    // WHAT MOVED, AND WHY THIS STILL GUARDS THE SAME THING. The page's h1 was
    // `.plb-title` (15px, inside the toolbar), then `.plb-hero h1` (a 38-64px
    // heading ABOVE the toolbar). On 2026-09-14 the founder struck the words
    // "Palette Generator" off a screenshot of this page: a workspace does not
    // spend a display heading restating the route's own name. The heading area
    // now renders ONLY when PALETTE_LEDE has a sentence in it; with the lede
    // still empty the h1 is sr-only and the toolbar is once again the first
    // thing under the nav.
    //
    // Both halves of the original guarantee survive: the content edge still
    // lines up with the nav's, and the h1 still exists and still names the
    // board. What changed is which element sits flush to the nav.
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('.pnav')
      const navInner = document.querySelector('.pnav-inner')
      const toolbar = document.querySelector('.plb-toolbar')
      const title = document.querySelector('h1#plb-page-title')
      const toolbarGroup = document.querySelector('.plb-toolbar-group')
      const controls = [
        document.querySelector('.plb-seedpick .cpk-trigger'),
        document.querySelector('.plb-hexfield'),
        document.querySelector('.plb-harm'),
      ]
      const navLeft = navInner.getBoundingClientRect().left + parseFloat(getComputedStyle(navInner).paddingLeft)
      const board = document.querySelector('.plb-board')
      return {
        heroPresent: !!document.querySelector('.plb-hero'),
        gap: toolbar.getBoundingClientRect().top - nav.getBoundingClientRect().bottom,
        toolbarLeftDelta: toolbarGroup.getBoundingClientRect().left - navLeft,
        // POSITIVE CONTROL for the delta above: a probe that read a detached or
        // zero-width node would report 0 and pass. The toolbar group has to be
        // a real, painted, non-trivial box first.
        toolbarWidth: toolbarGroup.getBoundingClientRect().width,
        titlePresent: !!title,
        titleText: title ? title.textContent.trim() : null,
        // The h1 is hidden from sight but NOT from the accessibility tree: the
        // board is aria-labelledby it, so a clipped-to-1px box is the pass and
        // display:none would be a regression that takes the board's name away.
        titleBox: title ? Math.round(title.getBoundingClientRect().width) : null,
        titleDisplay: title ? getComputedStyle(title).display : null,
        boardLabelledBy: board ? board.getAttribute('aria-labelledby') : null,
        heights: controls.map(element => element.getBoundingClientRect().height),
      }
    })
    expect(geometry.heroPresent, 'no heading area paints while the lede is empty').toBe(false)
    expect(geometry.titlePresent, 'the h1 still exists for the board to be named by').toBe(true)
    expect(geometry.titleText).toBe('Palette Generator')
    expect(geometry.titleDisplay, 'sr-only, not display:none').not.toBe('none')
    expect(geometry.titleBox, 'the h1 is visually clipped').toBeLessThanOrEqual(2)
    expect(geometry.boardLabelledBy, 'the board still takes its name from the h1').toBe('plb-page-title')
    expect(geometry.toolbarWidth, 'the toolbar group is actually painted').toBeGreaterThan(100)
    expect(Math.abs(geometry.gap), 'the toolbar is flush to the nav').toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.toolbarLeftDelta)).toBeLessThanOrEqual(1)
    expect(new Set(geometry.heights.map(value => Math.round(value))).size).toBe(1)

    // The toolbar is sticky: scroll the heading area away and it must sit flush
    // under the nav, which is where it used to start.
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForFunction(() => {
      const nav = document.querySelector('.pnav')
      const toolbar = document.querySelector('.plb-toolbar')
      return Math.abs(toolbar.getBoundingClientRect().top - nav.getBoundingClientRect().bottom) <= 1
    })
    await page.evaluate(() => window.scrollTo(0, 0))

    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(800)
    const preview = page.getByRole('button', { name: 'Preview' })
    const next = page.getByRole('button', { name: 'Gradient' })
    // The label sits in the button's normal flow (founder batch 2): hovering
    // EXPANDS the button rather than floating a pill over its neighbour. What
    // must still hold is that the toolbar stays exactly one line tall and full
    // width, and that the group is right-anchored so the controls to the right
    // of the hovered one do not move under the pointer.
    const collapsedLabel = await preview.locator('.plb-lbl').evaluate(element => {
      const style = getComputedStyle(element)
      return {
        position: style.position,
        opacity: style.opacity,
        width: element.getBoundingClientRect().width,
      }
    })
    expect(collapsedLabel.position).toBe('static')
    expect(collapsedLabel.opacity).toBe('0')
    expect(collapsedLabel.width).toBeLessThan(1)
    const before = await page.evaluate(() => ({
      toolbar: document.querySelector('.plb-toolbar').getBoundingClientRect().toJSON(),
      preview: document.querySelector('.plb-icobtn[aria-label="Preview"]').getBoundingClientRect().toJSON(),
      next: document.querySelector('[title="Open this palette in the Gradient Generator"]').getBoundingClientRect().toJSON(),
    }))
    await preview.hover()
    await expect.poll(
      async () => Number(await preview.locator('.plb-lbl').evaluate(el => getComputedStyle(el).opacity)),
      { timeout: 4000 },
    ).toBe(1)
    const after = await page.evaluate(() => ({
      toolbar: document.querySelector('.plb-toolbar').getBoundingClientRect().toJSON(),
      preview: document.querySelector('.plb-icobtn[aria-label="Preview"]').getBoundingClientRect().toJSON(),
      next: document.querySelector('[title="Open this palette in the Gradient Generator"]').getBoundingClientRect().toJSON(),
    }))
    expect(after.toolbar.height, 'the toolbar never gains a second row').toBe(before.toolbar.height)
    expect(after.toolbar.width).toBe(before.toolbar.width)
    expect(after.preview.width, 'the hovered button holds its own label').toBeGreaterThan(before.preview.width)
    expect(after.next.x, 'controls to the right of it stay put').toBe(before.next.x)
    await expect(next).toBeVisible()

    await page.locator('.app-footer').scrollIntoViewIfNeeded()
    const footerDelta = await page.evaluate(() => {
      const navInner = document.querySelector('.pnav-inner')
      const navLeft = navInner.getBoundingClientRect().left + parseFloat(getComputedStyle(navInner).paddingLeft)
      return document.querySelector('.app-footer-mark').getBoundingClientRect().left - navLeft
    })
    expect(Math.abs(footerDelta)).toBeLessThanOrEqual(1)
  })

  test('shared chrome uses the wide desktop span', async ({ page }) => {
    watch(page, 'designer using a large desktop display')
    await page.setViewportSize({ width: 1909, height: 900 })
    await go(page, '/create/palette')
    await expect(page.locator('.plb-toolbar')).toBeVisible()
    await expect(page.locator('.plb-adjust')).toBeVisible()

    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('.pnav-inner')
      const toolbar = document.querySelector('.plb-toolbar')
      const footer = document.querySelector('.plb-adjust')
      const inset = element => parseFloat(getComputedStyle(element).paddingLeft)
      return {
        navInset: inset(nav),
        toolbarInset: inset(toolbar),
        footerInset: inset(footer),
        navContentWidth: nav.clientWidth - inset(nav) * 2,
      }
    })

    expect(geometry.navContentWidth, 'large screens expose the new 1680px shared span').toBeGreaterThanOrEqual(1679)
    expect(Math.abs(geometry.toolbarInset - geometry.navInset)).toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.footerInset - geometry.navInset)).toBeLessThanOrEqual(1)
  })

  test('temperature stays under the pointer for the entire first drag', async ({ page }) => {
    watch(page, 'designer warming and cooling a palette with the pointer')
    await page.setViewportSize({ width: 1909, height: 900 })
    await go(page, '/create/palette')

    const temperature = page.getByRole('slider', { name: 'Temperature adjustment' })
    const reset = page.locator('.plb-adjust-reset')
    const footer = page.locator('.plb-adjust')
    await expect(temperature).toHaveValue('0')
    await expect(reset).toBeHidden()
    // Measure interaction geometry after the production font swap, rather
    // than accidentally treating the page's initial font load as slider motion.
    await page.evaluate(() => document.fonts.ready)

    const before = {
      slider: await temperature.boundingBox(),
      footer: await footer.boundingBox(),
    }
    await page.mouse.move(
      before.slider.x + before.slider.width * .2,
      before.slider.y + before.slider.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      before.slider.x + before.slider.width * .8,
      before.slider.y + before.slider.height / 2,
      { steps: 12 },
    )
    await page.mouse.up()

    const after = {
      slider: await temperature.boundingBox(),
      footer: await footer.boundingBox(),
    }
    expect(Number(await temperature.inputValue())).toBeGreaterThan(50)
    expect(after.slider).toEqual(before.slider)
    expect(after.footer).toEqual(before.footer)
    await expect(reset).toBeVisible()

    // THE EDITED VALUE IS EMPHASISED — asserted as a COMPARISON against an
    // untouched sibling rather than against a typed weight.
    //
    // This said `toHaveCSS('font-weight', '800')` and measured 700. That is not
    // a regression: the Spectrum foundation swapped the type stack, and
    // `.snapv-value` is set in `var(--mono)`, which is Geist Mono — a variable
    // face whose weight axis stops at 600 (read off the page's own @font-face
    // rules: `Geist Mono 300 600`, against `Geist 300 700`). Asking a browser
    // for 800 there buys a synthetic bold, not a cut, so the rule moved to 700
    // with the foundation. The number was never the guarantee; the guarantee is
    // that a value you have MOVED reads differently from one you have not, and
    // there are three untouched sliders on this strip to prove it against.
    const value = temperature.locator('xpath=..').locator('.snapv-value')
    const weights = await page.locator('.snapv').evaluateAll((wraps) => wraps.map((w) => ({
      edited: w.classList.contains('snapv--edited'),
      weight: Number(getComputedStyle(w.querySelector('.snapv-value')).fontWeight),
    })))
    const edited = weights.filter((w) => w.edited)
    const resting = weights.filter((w) => !w.edited)
    // ANTI-VACUITY, both ways: one drag must have marked exactly one control as
    // edited, and there must be an untouched one left to compare it with.
    expect(edited.length, 'the drag did not mark its own control as edited').toBe(1)
    expect(resting.length, 'every control reads as edited, so there is nothing to compare against').toBeGreaterThan(0)
    await expect(value).toBeVisible()
    expect(
      edited[0].weight,
      `the edited value is set at ${edited[0].weight} and the untouched ones at`
      + ` ${[...new Set(resting.map((r) => r.weight))].join(', ')} — a moved control reads exactly like an unmoved one`,
    ).toBeGreaterThan(Math.max(...resting.map((r) => r.weight)))

    await expect(page.locator('label[for="plb-temp"]')).not.toHaveCSS('text-shadow', 'none')
  })

  test('adjustment tracks are equal, explanatory, and mark the neutral centre', async ({ page }) => {
    watch(page, 'designer tuning colour relationships')
    await go(page, '/create/palette')

    const tracks = page.locator('.plb-adjust input[type="range"]')
    await expect(tracks).toHaveCount(4)
    const details = await tracks.evaluateAll(elements => elements.map((element) => ({
      width: element.getBoundingClientRect().width,
      background: getComputedStyle(element).backgroundImage,
    })))
    expect(Math.max(...details.map(item => item.width)) - Math.min(...details.map(item => item.width))).toBeLessThan(0.1)
    for (const item of details) {
      expect(item.background).toContain('linear-gradient')
      expect(item.background).toContain('50%')
    }
  })

  test('Space activates interactive Palette controls without invoking the global randomise shortcut', async ({ page }) => {
    watch(page, 'keyboard designer using controls, popovers and modals')
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col .plb-hex')).toHaveCount(5)
    const before = await page.locator('.plb-col .plb-hex').allTextContents()

    const previewButton = page.getByRole('button', { name: 'Preview' })
    await previewButton.focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('dialog', { name: 'Palette preview' })).toBeVisible()
    await page.getByRole('button', { name: 'Dark', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const close = page.getByRole('button', { name: 'Close preview' })
    await close.focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('dialog', { name: 'Palette preview' })).toHaveCount(0)

    expect(await page.locator('.plb-col .plb-hex').allTextContents()).toEqual(before)
  })

  test('swap direction, right-click insertion and preview gating are explicit', async ({ page }) => {
    watch(page, 'keyboard-and-pointer palette editor')
    await go(page, '/create/palette')

    const swatchHexes = page.locator('.plb-col .plb-hex')
    await expect(swatchHexes).toHaveCount(5)
    const before = await swatchHexes.allTextContents()
    await page.getByRole('button', { name: 'Choose a direction to swap PRIMARY' }).click()
    await expect(page.getByRole('menuitem', { name: 'Swap left' })).toHaveCount(0)
    await page.getByRole('menuitem', { name: 'Swap right' }).click()
    await expect(page.locator('.plb-col .plb-hex').first()).toHaveText(before[1])
    await expect(page.getByRole('textbox', { name: 'Seed colour hex' })).toHaveValue(before[1])

    await page.locator('.plb-gap').first().click({ button: 'right' })
    const insertMenu = page.getByRole('menu', { name: 'Insert colours' })
    await expect(insertMenu).toBeVisible()
    await expect(insertMenu.getByRole('menuitem')).toHaveCount(4)

    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.locator('.plb-preview-item')).toHaveCount(6)
    await expect(page.locator('.plb-preview-item--locked')).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Unlock preview' })).toHaveCount(3)
    await expect(page.locator('[data-preview-scene="Commerce checkout"]')).toContainText('Order summary')
    await expect(page.locator('[data-preview-scene="Account settings"]')).toContainText('Email address')
    await expect(page.locator('[data-preview-scene="Support inbox"]')).toContainText('Unable to export tokens')
    await expect(page.locator('[data-preview-scene="Finance overview"]')).toContainText('Recent transactions')
    await page.getByRole('tab', { name: 'Brand' }).click()
    await expect(page.locator('.plb-preview-item')).toHaveCount(6)
    await expect(page.locator('.plb-preview-item--locked')).toHaveCount(3)
    await expect(page.locator('[data-preview-scene="Architecture studio"]')).toContainText('Courtyard House')
    await expect(page.locator('[data-preview-scene="Conference"]')).toContainText('Opening keynote')
    await expect(page.locator('[data-preview-scene="Hospitality"]')).toContainText('Check rooms')
    await page.getByRole('tab', { name: 'Graphic Design' }).click()
    await expect(page.locator('[data-preview-scene="Album cover"]')).toContainText('Signal One')
    await expect(page.locator('[data-preview-scene="Packaging"]')).toContainText('ORIGIN')
    await expect(page.locator('[data-preview-scene="Magazine cover"]')).toContainText('Brisbane')
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('contrast and HCT stay attached to each swatch with clear Pro explanations', async ({ page }) => {
    watch(page, 'free designer discovering advanced colour checks')
    await go(page, '/create/palette')

    await expect(page.locator('.plb-toolbar').getByRole('button', { name: /Contrast/i })).toHaveCount(0)
    await page.getByRole('button', { name: 'Show contrast guidance for PRIMARY' }).click()
    await expect(page.getByRole('dialog', { name: 'Check contrast, light and dark' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()

    await page.getByRole('button', { name: 'Edit PRIMARY in HCT' }).click()
    await expect(page.getByRole('dialog', { name: 'Fine-tune any colour in HCT' })).toBeVisible()
  })

  for (const width of [980, 768, 480, 380]) {
    test(`the shared shell remains contained at ${width}px`, async ({ page }) => {
      watch(page, `palette designer at ${width}px`)
      await page.setViewportSize({ width, height: 820 })
      await go(page, '/create/palette')
      await expect(page.locator('.plb-toolbar')).toBeVisible()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(1)

      await page.locator('.app-footer').scrollIntoViewIfNeeded()
      const gutterDelta = await page.evaluate(() => {
        const navInner = document.querySelector('.pnav-inner')
        const navLeft = navInner.getBoundingClientRect().left + parseFloat(getComputedStyle(navInner).paddingLeft)
        return document.querySelector('.app-footer-mark').getBoundingClientRect().left - navLeft
      })
      expect(Math.abs(gutterDelta)).toBeLessThanOrEqual(1)
    })
  }

  test('Tint Generator offers an immediate route back to the Palette Builder', async ({ page }) => {
    watch(page, 'designer moving between colour tools')
    await go(page, '/create/tint')
    const back = page.getByRole('link', { name: 'Back to Palette Builder' })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/create\/palette$/)
  })
})

// Founder request, 2026-09-03: "the pallete page should auto load a random
// pallete on the default free settings. reset should reset the settings to
// default but randomise the colour."
//
// The two rules with teeth — that the default settings are the FREE ones, and
// that a shared link outranks the draw — are enumerated in
// tests/unit/palette-defaults.test.js, where they can be run over every input
// rather than the handful a browser can afford. What is here is the part only a
// browser can answer: that the page a person actually opens behaves that way.
//
// Nothing below pins a colour. Assertions are on the PROPERTY — a palette is
// present, two arrivals differ, the shared colours survived — because a test
// that pinned a random draw would be flaky by construction.
test.describe('the Palette Builder opens on a random palette', () => {
  // addInitScript runs on EVERY navigation, so the clear is guarded: without the
  // flag it would wipe the saved project before each `go()`, and the test below
  // that proves a touched board survives could never pass.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('palette-random-test-cleaned')) return
      localStorage.removeItem('vs-current-design')
      localStorage.removeItem('vs-palette-history')
      sessionStorage.setItem('palette-random-test-cleaned', 'true')
    })
  })

  const boardColors = (page) => page.locator('.plb-col .plb-hex').allTextContents()

  test('two arrivals with nothing saved draw two different palettes', async ({ page }) => {
    watch(page, 'designer opening the Palette Builder cold')
    await go(page, '/create/palette')
    await page.locator('.plb-col').first().waitFor()
    const first = await boardColors(page)
    expect(first.length).toBeGreaterThanOrEqual(5)

    // Up to three further arrivals: a genuine randomiser will differ on the
    // first, and three chances make a false red vanishingly unlikely while a
    // regression to a fixed seed still fails every time.
    let differed = false
    for (let i = 0; i < 3 && !differed; i += 1) {
      await go(page, '/create/palette')
      await page.locator('.plb-col').first().waitFor()
      differed = (await boardColors(page)).join() !== first.join()
    }
    expect(differed, 'every arrival produced the same board — the page is not randomising').toBe(true)
  })

  test('the board it draws came out of the FREE engine, not just a free label', async ({ page }) => {
    watch(page, 'free user opening the Palette Builder')
    await go(page, '/create/palette')
    await page.locator('.plb-col').first().waitFor()

    // The chip is the easy half, and on its own it proves nothing: it is fed by
    // ProjectContext, so it read "Auto" for months while the board was actually
    // being built by `generateHarmony(seed, 'analogous')` — a PAID system. A
    // free user was looking at output they could not themselves produce.
    await expect(page.locator('.plb-harm')).toContainText('Auto')
    await expect(page.locator('.plb-collapsed')).toHaveCount(0)

    // So this checks the ENGINE, through a signature only the tonal engine
    // leaves. autoTonalPalette pins SUBTLE at tone 90 / chroma 8; measured over
    // 300 draws of each, Auto lands at tone 89.8–90.1 and chroma 7.4–8.5 while
    // Analogous never gets lighter than tone 83.2 or below chroma 24.5. The
    // bounds below sit in that gap, so this is a property, not a pinned colour.
    const hexes = await boardColors(page)
    const [, chroma, tone] = hexToHct(hexes[3])
    expect(tone, `SUBTLE tone ${tone} — not the tonal engine`).toBeGreaterThan(85)
    expect(chroma, `SUBTLE chroma ${chroma} — not the tonal engine`).toBeLessThan(15)
  })

  test('a shared link still beats the random draw', async ({ page }) => {
    watch(page, 'designer opening a palette a colleague sent')
    const shared = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']

    // Three times: if the draw ever raced the link, a single pass could hide it.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await go(page, `/create/palette?c=${shared.map(c => c.slice(1)).join(',')}`)
      await page.locator('.plb-col').first().waitFor()
      expect(await boardColors(page)).toEqual(shared)
    }
  })

  test('a board the user touched survives, and is never drawn over', async ({ page }) => {
    watch(page, 'designer returning to work they left open')
    await go(page, '/create/palette')
    await page.locator('.plb-col').first().waitFor()
    await page.getByRole('button', { name: /Randomise/ }).click()
    const mine = await boardColors(page)
    await waitForSavedSeed(page, mine[0])

    await go(page, '/create/palette')
    await page.locator('.plb-col').first().waitFor()
    expect(await boardColors(page)).toEqual(mine)
  })

  test('Reset restores the default settings and draws a new colour', async ({ page }) => {
    watch(page, 'designer clearing the board to start again')
    await go(page, '/create/palette')
    await page.locator('.plb-col').first().waitFor()

    // Move a setting away from its default first, so "reset the settings" is a
    // claim with something to prove. A lock is the sharpest one available: its
    // own tooltip says "keep this colour through randomise", so if Reset left
    // it standing, the redraw would come back carrying the old colour.
    await page.getByRole('button', { name: 'Lock PRIMARY' }).click()
    await expect(page.getByRole('button', { name: 'Unlock PRIMARY' })).toHaveCount(1)
    const before = await boardColors(page)

    const reset = page.getByRole('button', { name: 'Reset' })
    await reset.click()
    const afterFirst = await boardColors(page)
    expect(afterFirst).not.toEqual(before)
    await expect(page.locator('.plb-harm')).toContainText('Auto')
    await expect(page.locator('[aria-label^="Unlock "]')).toHaveCount(0)

    // Pressing it again draws again: Reset randomises the colour, it does not
    // return to one fixed board.
    await reset.click()
    await expect
      .poll(async () => (await boardColors(page)).join(), { timeout: 5000 })
      .not.toBe(afterFirst.join())
  })
})
