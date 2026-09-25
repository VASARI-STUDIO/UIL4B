import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { readSeed, seedChip, paletteToolbar, openPaletteTools } from './palette-helpers.js'
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

    const firstHex = page.locator('.plb-col .plb-hex').first()
    await expect(seedChip(page)).toHaveText(/#[0-9A-F]{6}/)
    await expect(firstHex).toHaveText(await readSeed(page))

    const initial = await readSeed(page)
    const pickerColour = await page.locator('.plb-seedchip-sw').evaluate(
      element => getComputedStyle(element).backgroundColor,
    )
    // The column paints its colour through `--plb-c` (a gradient, so a vision
    // check can split it); resolve that to the same rgb() the chip reports.
    const firstColour = await page.locator('.plb-col').first().evaluate((element) => {
      const probe = document.createElement('span')
      probe.style.color = getComputedStyle(element).getPropertyValue('--plb-c').trim()
      document.body.append(probe)
      const rgb = getComputedStyle(probe).color
      probe.remove()
      return rgb
    })
    expect(firstColour).toMatch(/^rgb\(/)
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
    await expect.poll(() => readSeed(page)).not.toBe(initial)
    const chosen = await readSeed(page)
    // The project write is debounced ~200ms. Wait for the value to actually be
    // in storage rather than for a duration — reloading a moment early would
    // fail this for a reason that has nothing to do with what it tests.
    await waitForSavedSeed(page, chosen)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.plb-seedchip-hex')).toHaveText(chosen)
    await expect(firstHex).toHaveText(chosen)
  })

  test('the shell aligns, controls stay level, and the toolbar holds one row', async ({ page }) => {
    watch(page, 'precision-focused desktop designer')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const toolbar = paletteToolbar(page)
    await expect(toolbar).toBeVisible()
    await expect(toolbar).not.toHaveClass(/is-measuring/)

    // The palette is a full-bleed workspace (D:947): its toolbar runs edge to
    // edge directly under the nav, with its own clamp(12px,2vw,18px) inset,
    // rather than inside the site's content column. The h1 names the board
    // for assistive tech and is not painted.
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('.pnav')
      const toolbar = document.querySelector('.plb [data-tool-toolbar]')
      const title = document.querySelector('h1#plb-page-title')
      const controls = [
        document.querySelector('.plb-seedchip'),
        document.querySelector('.plb .tl-select'),
        document.querySelector('.plb-random'),
        document.querySelector('.plb-save'),
      ]
      const board = document.querySelector('.plb-board')
      const box = toolbar.getBoundingClientRect()
      return {
        gap: box.top - nav.getBoundingClientRect().bottom,
        left: box.left,
        right: window.innerWidth - box.right,
        inset: parseFloat(getComputedStyle(toolbar).paddingLeft),
        toolbarWidth: box.width,
        rowHeight: box.height,
        titlePresent: !!title,
        titleText: title ? title.textContent.trim() : null,
        titleBox: title ? Math.round(title.getBoundingClientRect().width) : null,
        titleDisplay: title ? getComputedStyle(title).display : null,
        boardLabelledBy: board ? board.getAttribute('aria-labelledby') : null,
        heights: controls.map(element => (element ? element.getBoundingClientRect().height : 0)),
      }
    })
    expect(geometry.titlePresent, 'the h1 still exists for the board to be named by').toBe(true)
    expect(geometry.titleText).toBe('Palette Generator')
    expect(geometry.titleDisplay, 'sr-only, not display:none').not.toBe('none')
    expect(geometry.titleBox, 'the h1 is visually clipped').toBeLessThanOrEqual(2)
    expect(geometry.boardLabelledBy, 'the board still takes its name from the h1').toBe('plb-page-title')
    expect(geometry.toolbarWidth, 'the toolbar is actually painted').toBeGreaterThan(100)
    expect(Math.abs(geometry.gap), 'the toolbar is flush to the nav').toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.left), 'the toolbar starts at the viewport edge').toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.right), 'the toolbar ends at the viewport edge').toBeLessThanOrEqual(1)
    expect(geometry.inset, 'the drawn inset, clamp(12px, 2vw, 18px)').toBe(18)
    expect(geometry.heights.every(h => h > 0), 'every measured control is on the row').toBe(true)
    expect(new Set(geometry.heights.map(value => Math.round(value))).size).toBe(1)
    // The drawn toolbar measures 61px at 1440 (9px padding, the 42px undo
    // tray, a hairline); a second row would at least double it.
    expect(geometry.rowHeight, 'one row, as drawn').toBeLessThanOrEqual(62)

    // The toolbar is sticky: scroll away and it must sit flush under the nav.
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForFunction(() => {
      const nav = document.querySelector('.pnav')
      const toolbar = document.querySelector('.plb [data-tool-toolbar]')
      return Math.abs(toolbar.getBoundingClientRect().top - nav.getBoundingClientRect().bottom) <= 1
    })
    await page.evaluate(() => window.scrollTo(0, 0))

    // No site footer under a tool.
    await expect(page.locator('.app-footer')).toHaveCount(0)
  })

  test('shared chrome uses the wide desktop span', async ({ page }) => {
    watch(page, 'designer using a large desktop display')
    await page.setViewportSize({ width: 1909, height: 900 })
    await go(page, '/create/palette')
    await expect(paletteToolbar(page)).toBeVisible()
    await expect(page.locator('.plb-adjust')).toBeVisible()

    // The nav keeps the shared 1680px content span; the palette's toolbar and
    // its Adjust bar are the workspace's own full-bleed chrome (D:947, D:1037)
    // and are not boxed into that span on a large display.
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('.pnav-inner')
      const inset = element => parseFloat(getComputedStyle(element).paddingLeft)
      const span = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { left: r.left, right: window.innerWidth - r.right } }
      return {
        navContentWidth: nav.clientWidth - inset(nav) * 2,
        navInset: inset(nav),
        toolbar: span('.plb [data-tool-toolbar]'),
        footer: span('.plb-adjust'),
      }
    })

    expect(geometry.navContentWidth, 'large screens expose the new 1680px shared span').toBeGreaterThanOrEqual(1679)
    for (const [name, box] of Object.entries({ toolbar: geometry.toolbar, footer: geometry.footer })) {
      expect(Math.abs(box.left), `${name} starts at the edge`).toBeLessThanOrEqual(1)
      expect(Math.abs(box.right), `${name} ends at the edge`).toBeLessThanOrEqual(1)
    }
    // The header sits on its own clamp(14px,2vw,22px) gutter: 22px here.
    expect(geometry.navInset).toBe(22)
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

    // The value beside the slider reads the signed amount (D:1043).
    await expect(temperature.locator('xpath=..').locator('.tl-slider-v')).toHaveText(/^\+\d+$/)
  })

  // The drawn Adjust bar (D:1037-1044) gives each slider its own row with a
  // flex basis of 210px, so tracks are as long as their label allows rather
  // than equal, and carries no centre tick. What still holds is that every
  // track explains itself: it paints the gradient of what it does.
  test('adjustment tracks explain what they do', async ({ page }) => {
    watch(page, 'designer tuning colour relationships')
    await go(page, '/create/palette')

    const tracks = page.locator('.plb-adjust input[type="range"]')
    await expect(tracks).toHaveCount(4)
    const details = await tracks.evaluateAll(elements => elements.map((element) => {
      const track = element.style.getPropertyValue('--tl-track')
      return { name: element.getAttribute('aria-label'), track, width: element.getBoundingClientRect().width }
    }))
    for (const item of details) {
      expect(item.track, `${item.name} carries a gradient track`).toContain('linear-gradient')
      expect(item.width, `${item.name} keeps a usable length`).toBeGreaterThanOrEqual(100)
    }
  })

  test('Space activates interactive Palette controls without invoking the global randomise shortcut', async ({ page }) => {
    watch(page, 'keyboard designer using controls, popovers and modals')
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col .plb-hex')).toHaveCount(5)
    const before = await page.locator('.plb-col .plb-hex').allTextContents()

    // Preview lives in the Tools overflow; both the trigger and the row are
    // pressed with Space, and neither may reach the page's randomise.
    const tools = paletteToolbar(page).getByRole('button', { name: 'Tools' })
    await expect(paletteToolbar(page)).not.toHaveClass(/is-measuring/)
    await tools.focus()
    await page.keyboard.press('Space')
    const row = page.getByRole('dialog', { name: 'Tools' }).getByRole('button', { name: 'Preview on a UI' })
    await expect(row).toBeVisible()
    expect(await page.locator('.plb-col .plb-hex').allTextContents()).toEqual(before)
    await row.focus()
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
    // Swapping is in each colour's actions menu; the first colour offers
    // only the direction it can move in.
    await page.getByRole('button', { name: 'More actions for PRIMARY' }).click()
    const actions = page.getByRole('menu', { name: 'Colour actions' })
    await expect(actions.getByRole('menuitem', { name: 'Swap right' })).toBeVisible()
    await expect(actions.getByRole('menuitem', { name: 'Swap left' })).toHaveCount(0)
    await actions.getByRole('menuitem', { name: 'Swap right' }).click()
    await expect(page.locator('.plb-col .plb-hex').first()).toHaveText(before[1])
    await expect(page.locator('.plb-seedchip-hex')).toHaveText(before[1])

    await page.locator('.plb-gap').first().click({ button: 'right' })
    const insertMenu = page.getByRole('menu', { name: 'Insert colours' })
    await expect(insertMenu).toBeVisible()
    await expect(insertMenu.getByRole('menuitem')).toHaveCount(4)

    await page.keyboard.press('Escape')
    await (await openPaletteTools(page)).getByRole('button', { name: 'Preview on a UI' }).click()
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

    await expect(paletteToolbar(page).getByRole('button', { name: /Contrast/i })).toHaveCount(0)
    // The AA chip on each colour (D:1032) is the Pro contrast check; free, it
    // says so on the chip and opens the explanation.
    const chip = page.locator('.plb-col').first().getByRole('button', { name: 'Contrast of PRIMARY — a Pro check' })
    await expect(chip).toHaveText(/AA · Pro/)
    await chip.click()
    await expect(page.getByRole('dialog', { name: 'Check contrast, light and dark' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()

    await page.getByRole('button', { name: 'More actions for PRIMARY' }).click()
    await page.getByRole('menu', { name: 'Colour actions' }).getByRole('menuitem', { name: 'Edit in HCT' }).click()
    await expect(page.getByRole('dialog', { name: 'Fine-tune any colour in HCT' })).toBeVisible()
  })

  for (const width of [980, 768, 480, 380]) {
    test(`the shared shell remains contained at ${width}px`, async ({ page }) => {
      watch(page, `palette designer at ${width}px`)
      await page.setViewportSize({ width, height: 820 })
      await go(page, '/create/palette')
      await expect(paletteToolbar(page)).toBeVisible()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(1)

      // No site footer under a tool; the header's gutter is the
      // App file's clamp(14px,2vw,22px), or 16px on a phone header.
      await expect(page.locator('.app-footer')).toHaveCount(0)
      const navPad = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.pnav-inner')).paddingLeft))
      expect(navPad).toBeCloseTo(width < 768 ? 16 : Math.min(22, Math.max(14, width * 0.02)), 0)
    })
  }

  // Every tool's toolbar opens on the design's drawn back
  // button, which returns to the workspace (D:613). The Palette Builder is one
  // press away in the Create menu; what is held here is that the tool still
  // offers an immediate way out, at the start of its toolbar.
  test('Tint offers an immediate route back, at the start of its toolbar', async ({ page }) => {
    watch(page, 'designer moving between colour tools')
    await go(page, '/create/tint')
    const back = page.locator('[data-tool-toolbar]').getByRole('link', { name: 'Back to workspace' })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/projects$/)
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
    await expect(page.getByRole('combobox', { name: 'Colour system' })).toHaveValue('auto')
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

    // Reset is a Tools row ("Reset palette"), next to History.
    const reset = async () => (await openPaletteTools(page)).getByRole('button', { name: 'Reset palette' }).click()
    await reset()
    const afterFirst = await boardColors(page)
    expect(afterFirst).not.toEqual(before)
    await expect(page.getByRole('combobox', { name: 'Colour system' })).toHaveValue('auto')
    await expect(page.locator('[aria-label^="Unlock "]')).toHaveCount(0)

    // Pressing it again draws again: Reset randomises the colour, it does not
    // return to one fixed board.
    await reset()
    await expect
      .poll(async () => (await boardColors(page)).join(), { timeout: 5000 })
      .not.toBe(afterFirst.join())
  })
})
