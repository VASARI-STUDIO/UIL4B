// ICON LIBRARY: THE PREVIEW GROUND AND THE ONE-ROW TOOLBAR.
//
// 1. With the default icon colour the customizer's preview sits on the page's
//    own background in both themes, not on a fixed dark or white gradient. A
//    chosen colour keeps a contrast ground.
// 2. The toolbar above the grid stays on one row at every width, each control
//    is whole (a visible control is never narrower than its glyph and padding
//    say), and on a coarse pointer every control is at least 44px both ways.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const WIDTHS = [320, 360, 390, 640, 641, 768, 961, 999, 1440]

const openCustomizer = async (page) => {
  await go(page, '/create/icons')
  await page.locator('.ig .ic').first().click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20000 })
}

const stageAndPage = (page) => page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.icust-stage'))
  return {
    bg: s.backgroundColor,
    image: s.backgroundImage,
    page: getComputedStyle(document.body).backgroundColor,
  }
})

test.describe('the customizer preview ground', () => {
  for (const scheme of ['light', 'dark']) {
    test(`default colour previews on the ${scheme} page background`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `someone opening an icon in ${scheme} mode`)
      await openCustomizer(page)
      await expect(page.getByRole('button', { name: 'Default', exact: true })).toHaveClass(/active/)
      const { bg, image, page: pageBg } = await stageAndPage(page)
      expect(image, 'the stage is painting a gradient').toBe('none')
      expect(bg, 'the stage is not the page background').toBe(pageBg)
      await ctx.close()
    })
  }

  test('a chosen colour keeps a contrast ground, and Default brings the page ground back', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'someone picking white for an icon')
    await openCustomizer(page)
    await page.getByRole('button', { name: 'White', exact: true }).click()
    const picked = await stageAndPage(page)
    expect(picked.image, 'white on the page ground would be invisible').not.toBe('none')
    await page.getByRole('button', { name: 'Default', exact: true }).click()
    const back = await stageAndPage(page)
    expect(back.bg).toBe(back.page)
    await ctx.close()
  })
})

const measureToolbar = (page) => page.evaluate(() => {
  const tb = document.querySelector('.ig-toolbar')
  const row = tb.querySelector('.lbry-toolbar-row')
  const rr = row.getBoundingClientRect()
  const controls = [...tb.querySelectorAll('button, input, select, a[href]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    .map((e) => {
      const r = e.getBoundingClientRect()
      return { name: e.getAttribute('aria-label') || e.textContent.trim() || e.className, w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    })
  const add = tb.querySelector('.ig-addbtn')
  const slot = tb.querySelector('.lbry-toolbar-action')
  return {
    coarse: matchMedia('(pointer:coarse)').matches,
    rowH: rr.height, rowRight: rr.right, rowLeft: rr.left,
    pageOverflow: document.documentElement.scrollWidth - innerWidth,
    controls,
    addW: add ? add.getBoundingClientRect().width : null,
    slotW: slot ? slot.getBoundingClientRect().width : null,
    addLabelVisible: add ? (() => { const l = add.querySelector('.ig-addbtn-label'); const r = l.getBoundingClientRect(); return r.width > 8 && r.height > 8 })() : null,
  }
})

test.describe('the icon toolbar', () => {
  for (const [scheme, widths] of [['light', WIDTHS], ['dark', [390, 1440]]]) {
    for (const w of widths) {
      test(`one row, whole controls, 44px targets on touch at ${w} ${scheme}`, async ({ browser }) => {
        const touch = w <= 768
        const ctx = await browser.newContext({
          colorScheme: scheme, viewport: { width: w, height: 900 }, hasTouch: touch, isMobile: touch,
        })
        const page = await ctx.newPage()
        watch(page, `someone browsing icons at ${w}px`)
        await go(page, '/create/icons')
        await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
        await expect(page.locator('.ig-addbtn')).toBeVisible()
        const m = await measureToolbar(page)

        // One row: no control starts below another's bottom edge on the row.
        const rowControls = m.controls.filter((c) => !/Regular|Bold|Fill|Duo/.test(c.name))
        const tops = rowControls.map((c) => c.top)
        expect(Math.max(...tops) - Math.min(...tops), 'a control sits on a second row').toBeLessThan(12)
        // Nothing runs past the row or the screen.
        for (const c of m.controls) {
          expect(c.right, `${c.name} runs past the toolbar`).toBeLessThanOrEqual(m.rowRight + 1)
          expect(c.left, `${c.name} starts before the toolbar`).toBeGreaterThanOrEqual(m.rowLeft - 1)
        }
        expect(m.pageOverflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        // The Add icon control is a whole control, not a sliver.
        expect(m.addW, 'Add icon is squeezed').toBeGreaterThanOrEqual(44)
        expect(m.slotW, 'the action slot is squeezed').toBeGreaterThanOrEqual(44)
        if (w > 640) expect(m.addLabelVisible, 'the Add icon word is clipped').toBe(true)
        if (touch) {
          expect(m.coarse).toBe(true)
          for (const c of m.controls) {
            expect(c.h, `${c.name} is under 44px tall`).toBeGreaterThanOrEqual(43.5)
            expect(c.w, `${c.name} is under 44px wide`).toBeGreaterThanOrEqual(43.5)
          }
        }
        await ctx.close()
      })
    }
  }
})
