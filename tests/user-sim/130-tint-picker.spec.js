// The Tint tool's back arrow and its colour picker, measured in a browser.
//
// Four things were wrong, found on the live Tint page:
//   · the toolbar's back arrow went to /projects even when the person had just
//     come from the Palette Builder ("Open in Tint Generator");
//   · at 1440, scrolling with the picker open left the panel pinned under the nav
//     over "Copy variables" while its trigger scrolled away;
//   · at 390 the picker was clamped under the nav, covered the tool header and
//     scrolled inside itself, so the second preset row was half hidden;
//   · its hex box, notation button and eyedropper were 32px tall on a touch
//     screen, and the black preset vanished into the dark panel.
//
// MUTATIONS (each should fail the test named after it):
//   · ToolBack: drop the `navigate(-1)` branch                -> "back arrow … palette"
//   · ToolBack: test `key !== 'default'` again              -> "a redirect landing (/tints) …"
//   · usePopover: drop `closeWhenAnchorLeaves` from the picker -> "scrolling … closes"
//   · global.css: delete the `@media(max-width:767px)` cpk sheet block
//                                                              -> "390 · the picker is a sheet …"
//   · global.css: delete the `@media(pointer:coarse)` cpk block -> "390 · … 44px"
//   · global.css: delete the `.cpk-swatch{border-color:color-mix…}` rule -> "dark/light · every preset …"
//   · global.css: delete the `.cpk-swatch{min-width:44px…}` / `.pop.cpk-pop{width:260px}` pair -> "768 · touch swatches"
//   · ColorPickerPop: drop the scrim, the Close button or lockScroll -> "390 · closing the sheet"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const TRIGGER_NAME = 'Pick base colour 1'
const triggerOf = (page) => page.getByRole('button', { name: TRIGGER_NAME, exact: true })
const pickerOf = (page) => page.getByRole('dialog', { name: TRIGGER_NAME, exact: true })

const rect = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const b = el.getBoundingClientRect()
  return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }
}, selector)

const TRIGGER_SEL = '[aria-label="Pick base colour 1"][aria-haspopup]'

// Enter on the hex field commits a colour, which adds the Recent row: the
// state the 390 and 768 reports were measured in.
async function openWithRecent(page) {
  await triggerOf(page).click()
  const picker = pickerOf(page)
  await expect(picker).toBeVisible()
  const hex = picker.locator('.cpk-hex')
  await hex.fill('#22c55e')
  await hex.press('Enter')
  await expect(picker.locator('.cpk-recents')).toBeVisible()
  // getBoundingClientRect includes transforms, so a measurement taken while the
  // entry animation runs (the sheet's 24px slide, the panel's scale-in) reads
  // a few px off the settled layout. Wait for the animations, not for time.
  await picker.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))))
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  return picker
}

test.describe('the Tint back arrow', () => {
  test('back arrow from palette -> tint returns to /create/palette', async ({ page }) => {
    watch(page, 'designer sending a palette colour to the Tint tool and changing their mind')
    await go(page, '/create/palette')
    await page.locator('.plb-ramp').first().click()
    await expect(page.locator('.plb-tintpop')).toBeVisible()
    await page.getByRole('button', { name: 'Open in Tint Generator' }).click()
    await expect(page).toHaveURL(/\/create\/tint$/)

    // Named for where it goes, not for the workspace it used to go to.
    const back = page.locator('[data-tool-toolbar]').getByRole('link', { name: 'Back to previous page' })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/create\/palette$/)
  })

  test('a direct landing on Tint keeps the workspace fallback', async ({ page }) => {
    watch(page, 'designer opening Tint from a bookmark')
    await go(page, '/create/tint')
    const back = page.locator('[data-tool-toolbar]').getByRole('link', { name: 'Back to workspace' })
    await expect(back).toHaveAttribute('href', '/projects')
    await back.click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('a redirect landing (/tints) keeps the workspace fallback, not a dead "previous page"', async ({ page }) => {
    watch(page, 'designer opening an old /tints bookmark')
    await go(page, '/tints')
    await expect(page).toHaveURL(/\/create\/tint$/)
    // The redirect replaced the entry, so nothing in the app is behind it.
    expect(await page.evaluate(() => window.history.state?.idx)).toBe(0)
    const toolbar = page.locator('[data-tool-toolbar]')
    await expect(toolbar.getByRole('link', { name: 'Back to previous page' })).toHaveCount(0)
    const back = toolbar.getByRole('link', { name: 'Back to workspace' })
    await expect(back).toHaveAttribute('href', '/projects')
    await back.click()
    await expect(page).toHaveURL(/\/projects$/)
  })
})

test.describe('1440 · the picker follows its trigger', () => {
  // 520px tall so the page genuinely scrolls: at 900 the tint page fits and
  // there is nothing to scroll.
  test.use({ viewport: { width: 1440, height: 520 } })

  test('a small scroll keeps it attached; scrolling the trigger away closes it', async ({ page }) => {
    watch(page, 'designer scrolling with the tint picker open')
    await go(page, '/create/tint')
    const picker = pickerOf(page)
    await triggerOf(page).click()
    await expect(picker).toBeVisible()

    // Trigger still below the toolbar: the panel hangs off it, wherever it moved to.
    await page.evaluate(() => window.scrollTo({ top: 60, behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(60)
    await expect.poll(async () => {
      const t = await rect(page, TRIGGER_SEL)
      const p = await rect(page, '.cpk-pop')
      if (!p) return 'closed'
      const hangsBelow = Math.abs(p.top - t.bottom) <= 16
      const hangsAbove = Math.abs(p.bottom - t.top) <= 16
      return hangsBelow || hangsAbove ? 'attached' : `detached: trigger ${Math.round(t.top)}-${Math.round(t.bottom)}, panel ${Math.round(p.top)}-${Math.round(p.bottom)}`
    }).toBe('attached')

    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
    await expect.poll(async () => (await rect(page, TRIGGER_SEL)).bottom).toBeLessThan(64)
    // Never left clamped under the nav over the toolbar's "Copy variables".
    await expect(picker).toHaveCount(0)
    await expect(page.locator('.cpk-pop')).toHaveCount(0)
  })

  test('with room to spare it never sits under the tool toolbar', async ({ page }) => {
    watch(page, 'designer opening the tint picker')
    await go(page, '/create/tint')
    await triggerOf(page).click()
    await expect(pickerOf(page)).toBeVisible()
    const toolbar = await rect(page, '[data-tool-toolbar]')
    const pop = await rect(page, '.cpk-pop')
    expect(pop.top).toBeGreaterThanOrEqual(toolbar.bottom)
  })
})

test.describe('390 · the picker on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the picker is a sheet inside the viewport that leaves the trigger and the header clear', async ({ page }) => {
    watch(page, 'designer picking a tint colour on a phone')
    await go(page, '/create/tint')
    const picker = await openWithRecent(page)
    const vh = 844
    const pop = await rect(page, '.cpk-pop')
    const trigger = await rect(page, TRIGGER_SEL)
    const toolbar = await rect(page, '[data-tool-toolbar]')
    const tabs = await rect(page, '.pnav-tabs')

    expect(pop.left, 'inside the viewport on the left').toBeGreaterThanOrEqual(0)
    expect(pop.right, 'inside the viewport on the right').toBeLessThanOrEqual(390)
    expect(pop.bottom, 'above the tab bar').toBeLessThanOrEqual(tabs.top + 1)
    expect(pop.top, 'below the tool header and Copy variables').toBeGreaterThanOrEqual(toolbar.bottom)
    expect(pop.bottom).toBeLessThanOrEqual(vh)
    expect(pop.top >= trigger.bottom, 'the trigger is clear above the sheet').toBe(true)
    expect(trigger.top, 'and it is still below the toolbar').toBeGreaterThanOrEqual(toolbar.bottom)

    // Nothing scrolls inside it: the second preset row is whole.
    const overflow = await picker.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('every preset can be reached and hit', async ({ page }) => {
    watch(page, 'designer picking a preset on a phone')
    await go(page, '/create/tint')
    const picker = await openWithRecent(page)
    const presets = picker.locator('.cpk-section:not(.cpk-recents) .cpk-swatch')
    const count = await presets.count()
    expect(count).toBeGreaterThanOrEqual(10)
    for (let i = 0; i < count; i += 1) {
      const swatch = presets.nth(i)
      await swatch.scrollIntoViewIfNeeded()
      const hit = await swatch.evaluate((el) => {
        const b = el.getBoundingClientRect()
        const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
        return { onTop: at === el, h: b.height, w: b.width, inside: b.bottom <= innerHeight && b.top >= 0 }
      })
      expect(hit.onTop, `preset ${i + 1} is under a finger`).toBe(true)
      expect(hit.inside, `preset ${i + 1} is on screen`).toBe(true)
      expect(Math.min(hit.h, hit.w), `preset ${i + 1} is a touch target`).toBeGreaterThanOrEqual(44)
    }
  })

  test('the hex box, notation button and eyedropper are 44px tall on touch', async ({ page }) => {
    watch(page, 'designer tapping the picker value row on a phone')
    await go(page, '/create/tint')
    const picker = await openWithRecent(page)
    for (const [name, selector] of [['hex field', '.cpk-hex'], ['notation button', '.cpk-format'], ['eyedropper', '.cpk-dropper']]) {
      const el = picker.locator(selector)
      // The eyedropper only exists where the browser has the API.
      if (await el.count() === 0) { expect(name).toBe('eyedropper'); continue }
      const box = await el.boundingBox()
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44)
    }
    // 16px is the floor under which iOS zooms the page when a field is focused.
    expect(await picker.locator('.cpk-hex').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
  })
})

test.describe('390x520 · a short phone', () => {
  test.use({ viewport: { width: 390, height: 520 }, hasTouch: true, isMobile: true })

  test('a picker taller than the screen scrolls, says so, and the last preset is reachable', async ({ page }) => {
    watch(page, 'designer with a short screen')
    await go(page, '/create/tint')
    const picker = await openWithRecent(page)
    const state = () => picker.evaluate((el) => ({
      scrolls: el.scrollHeight - el.clientHeight > 1,
      more: el.hasAttribute('data-more'),
      atEnd: el.scrollHeight - el.scrollTop - el.clientHeight <= 2,
    }))
    const start = await state()
    expect(start.scrolls, 'a 520px screen cannot hold the whole picker').toBe(true)
    expect(start.more, 'content below the fold is signalled').toBe(true)
    await expect(picker).toHaveCSS('overflow-y', 'auto')

    const last = picker.locator('.cpk-section:not(.cpk-recents) .cpk-swatch').last()
    await picker.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect.poll(async () => (await state()).atEnd).toBe(true)
    expect((await state()).more, 'the cue goes once the end is reached').toBe(false)
    const reached = await last.evaluate((el) => {
      const b = el.getBoundingClientRect()
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === el
    })
    expect(reached).toBe(true)
  })
})

// The ratio between a swatch's edge and the panel behind it. The border is
// painted over the swatch's own fill (background-clip is border-box), so the
// edge is composited over the swatch colour, then over the panel, the way the
// browser draws it, and compared with the bare panel.
async function edgeContrast(swatch) {
  const [ring, ground] = await swatch.evaluate((el) => {
    const pixel = (...layers) => {
      const c = document.createElement('canvas')
      c.width = c.height = 1
      const g = c.getContext('2d')
      for (const css of layers) { g.fillStyle = css; g.fillRect(0, 0, 1, 1) }
      const [r, gr, b] = g.getImageData(0, 0, 1, 1).data
      return [r, gr, b]
    }
    const style = getComputedStyle(el)
    const panel = getComputedStyle(el.closest('.cpk-pop')).backgroundColor
    return [pixel(panel, style.backgroundColor, style.borderTopColor), pixel(panel)]
  })
  const luminance = ([r, g, b]) => [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  const [hi, lo] = [luminance(ring), luminance(ground)].sort((a, b) => b - a)
  return { ratio: (hi + 0.05) / (lo + 0.05), ring, ground }
}

for (const theme of ['dark', 'light']) {
  test.describe(`${theme} · the swatches`, () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test(`every preset has a ring that reads against the ${theme} panel`, async ({ page }) => {
      watch(page, `designer using the ${theme} theme`)
      await page.addInitScript((t) => localStorage.setItem('vs-t', t), theme)
      await go(page, '/create/tint')
      await triggerOf(page).click()
      const picker = pickerOf(page)
      await expect(picker).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      const presets = picker.locator('.cpk-section:not(.cpk-recents) .cpk-swatch')
      // #18181b vanished on dark and #f4f4f5 on light: both ends are in the list.
      await expect(presets.nth(0)).toHaveAttribute('aria-label', '#18181b')
      await expect(presets.nth(1)).toHaveAttribute('aria-label', '#f4f4f5')
      const count = await presets.count()
      for (let i = 0; i < count; i += 1) {
        const swatch = presets.nth(i)
        const { ratio, ring, ground } = await edgeContrast(swatch)
        expect(ratio, `${await swatch.getAttribute('aria-label')}: ring ${ring} on ground ${ground}`).toBeGreaterThanOrEqual(3)
      }
    })
  })
}

test.describe('768 · touch swatches', () => {
  // isMobile + hasTouch are what make pointer:coarse true.
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true })

  test('presets and Recent are 44px and the panel grows to hold them', async ({ page }) => {
    watch(page, 'designer picking a tint colour on a tablet')
    await go(page, '/create/tint')
    const picker = await openWithRecent(page)
    const swatches = picker.locator('.cpk-swatch')
    const count = await swatches.count()
    expect(count, 'Recent and presets are both there').toBeGreaterThanOrEqual(11)

    const pop = await rect(page, '.cpk-pop')
    expect(pop.left).toBeGreaterThanOrEqual(0)
    expect(pop.right).toBeLessThanOrEqual(768)
    // Nothing is clipped or pushed sideways inside the panel.
    expect(await picker.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1)

    for (let i = 0; i < count; i += 1) {
      const box = await swatches.nth(i).evaluate((el) => {
        const b = el.getBoundingClientRect()
        const p = el.closest('.cpk-pop').getBoundingClientRect()
        return { w: b.width, h: b.height, inside: b.left >= p.left && b.right <= p.right }
      })
      expect(Math.min(box.w, box.h), `swatch ${i + 1} is a touch target`).toBeGreaterThanOrEqual(44)
      expect(box.inside, `swatch ${i + 1} is inside the panel`).toBe(true)
    }
  })
})

test.describe('390 · closing the sheet', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the Close button is 44px, closes the sheet and gives focus back to the trigger', async ({ page }) => {
    watch(page, 'designer finished with a colour on a phone')
    await go(page, '/create/tint')
    const picker = await openWithRecent(page)
    const close = picker.getByRole('button', { name: 'Close', exact: true })
    await expect(close).toBeVisible()
    const box = await close.boundingBox()
    expect(box.height, 'Close height').toBeGreaterThanOrEqual(44)
    expect(box.width, 'Close width').toBeGreaterThanOrEqual(44)
    await close.tap()
    await expect(picker).toHaveCount(0)
    await expect(triggerOf(page)).toBeFocused()
    await expect(page.locator('.cpk-scrim')).toHaveCount(0)
  })

  test('the page behind is dimmed and locked, and a tap on it only closes the sheet', async ({ page }) => {
    watch(page, 'designer tapping outside the colour sheet')
    await go(page, '/create/tint')
    const picker = await openWithRecent(page)
    const scrim = page.locator('.cpk-scrim')
    await expect(scrim).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.style.overflow), 'page scroll is locked').toBe('hidden')
    const scrimBg = await scrim.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(scrimBg, 'the scrim dims the page').not.toBe('rgba(0, 0, 0, 0)')

    // Any click that reaches something other than the scrim is a tap that fell through.
    await page.evaluate(() => {
      window.__strayClicks = []
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.cpk-scrim')) window.__strayClicks.push(e.target.className || e.target.tagName)
      }, true)
    })
    const pop = await rect(page, '.cpk-pop')
    const url = page.url()
    // A point above the sheet, over the page content (the tool header region).
    await page.touchscreen.tap(195, Math.max(120, pop.top / 2))
    await expect(picker).toHaveCount(0)
    expect(await page.evaluate(() => window.__strayClicks), 'nothing under the scrim was hit').toEqual([])
    expect(page.url()).toBe(url)
    expect(await page.evaluate(() => document.documentElement.style.overflow), 'page scroll is released').toBe('')
  })
})
