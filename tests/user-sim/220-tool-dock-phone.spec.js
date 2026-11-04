// A TOOL'S MAIN BUTTON SITS IN A BAR AT THE FOOT OF THE SCREEN ON A PHONE.
//
// Below 768px ToolLayout (src/components/tool/ToolLayout.jsx) moves each tool's
// primary out of the top toolbar into a fixed bar, `[data-tl-dock]`, where a
// thumb reaches it. From 768px the primary stays in the toolbar and there is no
// dock. For Palette, Gradient, Tint, Contrast, Aspect & Resolution, Alt Text
// and Semantic Colour, on a touch screen at 390 and 360:
//   · the dock shows, its button is at least 44px and the primary is not also
//     in the toolbar; the page does not scroll sideways;
//   · scrolled to the end, the last thing on the page is wholly above the dock;
//   · the dock sits above the phone tab bar, touching neither it nor its taps;
//   · a toast clears the dock, and a sheet opened over it covers it;
//   · the keyboard (the visual viewport shrinking, or a focused text field when
//     the browser has no visual viewport) puts the dock away, and puts it back.
// At 768 and 1440 there is no dock. Font Pair, Type Scale and File Converter
// have no primary on a phone, so no dock and no room kept for one. The brand kit
// walkthrough owns the foot of the screen, so the primary goes back to the
// toolbar and only one fixed bar shows. The toolbar is one row at every phone
// width.
//
// The keyboard is a stand-in: headless Chromium has none, so `visualViewport`
// is replaced by a small object the test shrinks (the browser is outside our
// code). The stand-in leaves the width and scale alone, as a real keyboard does.
//
// MUTATIONS (each seen red, then restored):
//   · delete the `.tl.tl--docked .tl-body` and `.tl-body--bleed` padding rules in
//     tool-layout.css: "the last thing on the page is above the dock" fails;
//   · drop the `body .toast` rule under `html.has-tool-dock`: "a toast clears
//     the dock" fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PHONES = [
  { width: 390, height: 844 },
  { width: 360, height: 780 },
]

// `field` is a text field to focus for the keyboard (none on Semantic Colour);
// `sheet` opens the tool's own sheet where it has one.
const TOOLS = [
  { route: '/create/palette', title: 'Palette Generator', primary: /^Save or share/, sheet: 'Extra tools' },
  { route: '/create/gradient', title: 'Gradient', primary: /^Save or share/, field: (page) => page.getByRole('textbox', { name: 'Stop 1 hex' }), sheet: 'More' },
  { route: '/create/tint', title: 'Tint', primary: /^Copy or save/, field: (page) => page.getByRole('textbox', { name: 'Base colour 1 hex' }) },
  { route: '/create/contrast', title: 'Contrast Checker', primary: /^Copy/, field: (page) => page.locator('.cc-hex-input').first() },
  { route: '/create/aspect-ratio', title: 'Aspect & Resolution', primary: /^Copy size/, field: (page) => page.getByRole('spinbutton', { name: 'Known width in pixels' }) },
  { route: '/create/alt-text', title: 'Alt Text Generator', primary: /^Generate/, field: (page) => page.locator('.alt-field').first() },
  { route: '/create/semantic-color', title: 'Semantic Colour', primary: /^Copy /, field: null },
]

const NO_PRIMARY_ON_A_PHONE = [
  { route: '/create/font-pair', title: 'Font Pair' },
  // Type Scale keeps its own docked bar (.tsc-dock) and its own room for it.
  { route: '/create/type-scale', title: 'Type Scale', ownBar: true },
  { route: '/create/file-converter', title: 'File Converter' },
]

const dock = (page) => page.locator('[data-tl-dock]')
const dockButton = (page) => page.locator('[data-tl-dock] button').first()
const toolbar = (page) => page.locator('[data-tool-toolbar]')

/** A visual viewport the test can shrink, standing in for the on-screen keyboard. */
async function fakeVisualViewport(page) {
  await page.addInitScript(() => {
    const fake = new EventTarget()
    let height = null
    Object.defineProperties(fake, {
      width: { get: () => window.innerWidth },
      height: { get: () => (height == null ? window.innerHeight : height) },
      scale: { get: () => 1 },
      offsetTop: { get: () => 0 },
      offsetLeft: { get: () => 0 },
      pageTop: { get: () => window.scrollY },
      pageLeft: { get: () => 0 },
    })
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake })
    window.__keyboard = (px) => { height = px ? window.innerHeight - px : null; fake.dispatchEvent(new Event('resize')) }
  })
}

/** Lets entrances and transitions finish before anything is measured. */
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations()
  .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
  .map((a) => a.finished.catch(() => {}))))

const box = async (locator) => {
  const b = await locator.boundingBox()
  expect(b, 'the element has a box').toBeTruthy()
  return b
}

/** The lowest painted point of the page's own content, as the eye sees it (clipped by any scroller it sits in). */
const contentBottom = (page) => page.evaluate(() => {
  const clipBottom = (el) => {
    let bottom = el.getBoundingClientRect().bottom
    for (let p = el.parentElement; p && !p.classList.contains('tl-body'); p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') bottom = Math.min(bottom, p.getBoundingClientRect().bottom)
    }
    return bottom
  }
  let low = { bottom: 0, what: '' }
  for (const el of document.querySelectorAll('.tl-body *')) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (r.width <= 0 || r.height <= 0 || cs.position === 'fixed' || cs.visibility !== 'visible' || cs.display === 'contents') continue
    if (el.closest('svg, .sr-only, [aria-hidden="true"]')) continue
    const bottom = clipBottom(el)
    if (bottom > low.bottom) low = { bottom, what: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}` }
  }
  return low
})

for (const phone of PHONES) {
  for (const tool of TOOLS) {
    test.describe(`${tool.route} at ${phone.width}px, touch`, () => {
      test.use({ viewport: phone, hasTouch: true, isMobile: true })

      test.beforeEach(async ({ page }) => {
        watch(page, `someone using ${tool.title} on a ${phone.width}px phone`)
        await fakeVisualViewport(page)
        await go(page, tool.route)
        // POSITIVE CONTROL: the context is a coarse pointer, and the tool has loaded.
        expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context is a touch screen').toBe(true)
        await expect(page.getByRole('heading', { level: 1, name: tool.title })).toBeAttached()
        await expect(dock(page)).toBeVisible()
      })

      test('the primary is in the dock, 44px tall, and not also in the toolbar', async ({ page }) => {
        const button = dockButton(page)
        await expect(button).toBeVisible()
        await expect(button).toHaveAccessibleName(tool.primary)
        const b = await box(button)
        expect(b.height, 'the button is at least 44px tall').toBeGreaterThanOrEqual(44)
        expect(b.width, 'the button is at least 44px wide').toBeGreaterThanOrEqual(44)
        // A tap at the centre, and 21px above and below, lands on it.
        const misses = await button.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          return [[cx, cy - 21], [cx, cy], [cx, cy + 21]].filter(([x, y]) => !el.contains(document.elementFromPoint(x, y))).length
        })
        expect(misses, 'taps on the button land elsewhere').toBe(0)
        await expect(toolbar(page).locator('.tl-primary'), 'the toolbar has no primary slot filled').toHaveCount(0)
        await expect(toolbar(page).getByRole('button', { name: tool.primary }), 'the primary is also on the toolbar').toHaveCount(0)
        const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(sideways, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        const edges = await dock(page).evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, vw: document.documentElement.clientWidth } })
        expect([edges.left, edges.right], 'the dock runs edge to edge').toEqual([0, edges.vw])
      })

      test('scrolled to the end, the last thing on the page is wholly above the dock', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        await expect.poll(() => page.evaluate(() => Math.round(document.documentElement.scrollHeight - window.innerHeight - window.scrollY)), { message: 'the page reaches its end' }).toBeLessThanOrEqual(1)
        await settled(page)
        const top = (await box(dock(page))).y
        const low = await contentBottom(page)
        // POSITIVE CONTROL: something was measured, and it is lower than the dock's own top by no more than the page.
        expect(low.bottom, 'no content was measured').toBeGreaterThan(100)
        expect(low.bottom, `${low.what} runs ${Math.round(low.bottom - top)}px under the dock`).toBeLessThanOrEqual(top + 1)
      })

      test('the dock sits above the tab bar and touches neither it nor its taps', async ({ page }) => {
        const tabs = page.locator('.pnav-tabs')
        await expect(tabs).toBeVisible()
        const d = await box(dock(page))
        const t = await box(tabs)
        expect(d.y + d.height, 'the dock reaches into the tab bar').toBeLessThanOrEqual(t.y + 0.5)
        expect(d.y + d.height, 'a gap between the dock and the tab bar').toBeGreaterThanOrEqual(t.y - 1)
        const hits = await page.evaluate(() => {
          const at = (el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) }
          const d = document.querySelector('[data-tl-dock]')
          const t = document.querySelector('.pnav-tabs')
          return { dockOwnsItsCentre: d.contains(at(d)), tabsOwnTheirCentre: t.contains(at(t)) }
        })
        expect(hits.dockOwnsItsCentre, 'something covers the dock').toBe(true)
        expect(hits.tabsOwnTheirCentre, 'the dock covers the tab bar').toBe(true)
      })

      test('a toast clears the dock', async ({ page }) => {
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message: 'Copied to the clipboard', type: 'success' } })))
        const toast = page.locator('.toast.show')
        await expect(toast).toBeVisible()
        await settled(page)
        const toastBox = await box(toast)
        const dockBox = await box(dock(page))
        expect(toastBox.y + toastBox.height, 'the toast sits on the dock').toBeLessThanOrEqual(dockBox.y)
      })

      test("the tab bar's Create sheet covers the dock", async ({ page }) => {
        await page.locator('.pnav-tabs').getByRole('button', { name: 'Create', exact: true }).tap()
        const sheet = page.locator('.pnav-sheet')
        await expect(sheet).toBeVisible()
        await settled(page)
        await expect.poll(() => page.evaluate(() => {
          const r = document.querySelector('[data-tl-dock]').getBoundingClientRect()
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return !!hit && !!hit.closest('.pnav-sheet')
        }), { message: 'what is at the dock centre is not in the sheet' }).toBe(true)
      })

      if (tool.sheet) {
        test(`the tool's own ${tool.sheet} sheet covers the dock`, async ({ page }) => {
          await toolbar(page).getByRole('button', { name: tool.sheet, exact: true }).tap()
          const sheet = page.getByRole('dialog', { name: tool.sheet })
          await expect(sheet).toBeVisible()
          await settled(page)
          await expect.poll(() => page.evaluate(() => {
            const r = document.querySelector('[data-tl-dock]').getBoundingClientRect()
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            return !!hit && !!hit.closest('[role="dialog"]')
          }), { message: 'what is at the dock centre is not in the sheet' }).toBe(true)
        })
      }

      if (tool.field) {
        test('the dock steps aside while the keyboard is up, and comes back', async ({ page }) => {
          const field = tool.field(page)
          await field.scrollIntoViewIfNeeded()
          await field.tap()
          await expect(field).toBeFocused()
          // The keyboard rises: the visual viewport loses 300px.
          await page.evaluate(() => window.__keyboard(300))
          await expect(dock(page), 'the dock stays over the keyboard').toBeHidden()
          await expect(dock(page), 'the dock was unmounted, so the primary would lose its state').toHaveCount(1)
          await expect(page.locator('html')).not.toHaveClass(/has-tool-dock/)
          await expect(page.locator('.tl')).not.toHaveClass(/tl--docked/)
          // It falls again.
          await page.evaluate(() => window.__keyboard(0))
          await expect(dock(page), 'the dock does not come back').toBeVisible()
          await expect(page.locator('html')).toHaveClass(/has-tool-dock/)
        })
      }
    })
  }
}

test.describe('the keyboard, measured the other ways', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('a smaller visual viewport that is only browser chrome sliding away keeps the dock', async ({ page }) => {
    watch(page, 'someone scrolling a tool while the address bar slides away')
    await fakeVisualViewport(page)
    await go(page, '/create/gradient')
    await expect(dock(page)).toBeVisible()
    await page.evaluate(() => window.__keyboard(90))
    await page.waitForTimeout(150)
    await expect(dock(page), 'a 90px change is the address bar, not a keyboard').toBeVisible()
  })

  test('with no visual viewport, focus in a text field puts the dock away and leaving it brings it back', async ({ page }) => {
    watch(page, 'someone on a browser with no visual viewport')
    await page.addInitScript(() => { Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => undefined }) })
    await go(page, '/create/gradient')
    expect(await page.evaluate(() => window.visualViewport), 'the browser has no visual viewport').toBeUndefined()
    await expect(dock(page)).toBeVisible()
    const field = page.getByRole('textbox', { name: 'Stop 1 hex' })
    await field.scrollIntoViewIfNeeded()
    await field.tap()
    await expect(field).toBeFocused()
    await expect(dock(page), 'the dock stays under a focused text field').toBeHidden()
    await field.evaluate((el) => el.blur())
    await expect(dock(page), 'the dock does not come back').toBeVisible()
  })

  test('focus in a button leaves the dock alone when there is no visual viewport', async ({ page }) => {
    watch(page, 'someone on a browser with no visual viewport pressing a button')
    await page.addInitScript(() => { Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => undefined }) })
    await go(page, '/create/gradient')
    await dockButton(page).focus()
    await page.waitForTimeout(150)
    await expect(dock(page)).toBeVisible()
  })

  test('with no tab bar the dock rests on the foot of the screen with room for the home indicator', async ({ page }) => {
    watch(page, 'someone on a phone with no tab bar')
    await go(page, '/create/gradient')
    await expect(dock(page)).toBeVisible()
    await page.evaluate(() => document.documentElement.classList.remove('has-tabbar'))
    await expect.poll(async () => { const b = await box(dock(page)); return Math.round(b.y + b.height) }, { message: 'the dock is not on the bottom edge' }).toBe(844)
    const pad = await dock(page).evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
    expect(pad, 'less than 12px under the button').toBeGreaterThanOrEqual(12)
  })
})

for (const width of [768, 1440]) {
  for (const tool of TOOLS) {
    test(`${tool.route} at ${width}px: no dock, and the primary is in the toolbar`, async ({ page }) => {
      watch(page, `someone using ${tool.title} at ${width}px`)
      await page.setViewportSize({ width, height: 900 })
      await go(page, tool.route)
      await expect(page.getByRole('heading', { level: 1, name: tool.title })).toBeAttached()
      await expect(toolbar(page).getByRole('button', { name: tool.primary }).first()).toBeVisible()
      await expect(dock(page), `a dock at ${width}px`).toHaveCount(0)
      await expect(page.locator('html')).not.toHaveClass(/has-tool-dock/)
      await expect(page.locator('.tl')).not.toHaveClass(/tl--docked/)
    })
  }
}

for (const tool of NO_PRIMARY_ON_A_PHONE) {
  test(`${tool.route} at 390px: no dock, and no room kept for one`, async ({ page }) => {
    watch(page, `someone using ${tool.title} on a phone`)
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, tool.route)
    await expect(page.getByRole('heading', { level: 1, name: tool.title })).toBeAttached()
    await expect(dock(page)).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveClass(/has-tool-dock/)
    await expect(page.locator('.tl')).not.toHaveClass(/tl--docked/)
    // The layout's own reserve is zero; the body's foot is not the dock's height.
    expect(await page.locator('.tl').evaluate((el) => getComputedStyle(el).getPropertyValue('--tl-dock-h').trim())).toBe('0px')
    if (!tool.ownBar) expect(await page.locator('.tl-body').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)), 'the body keeps room for a dock').toBeLessThan(57)
  })
}

test('the brand kit walkthrough owns the foot of the screen: the primary is in the toolbar and one fixed bar shows', async ({ page }) => {
  watch(page, 'designer building a brand kit on a phone')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('__bkit_seeded') === '1') return
      sessionStorage.setItem('__bkit_seeded', '1')
      localStorage.setItem('vs-uikit-guide', '1')
      localStorage.setItem('vs-uikit-guide-seen', '1')
    } catch { /* private mode */ }
  })
  await go(page, '/create/palette')
  const rail = page.getByRole('region', { name: 'Brand kit walkthrough' })
  await expect(rail).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/bkit-on/)
  await expect(dock(page), 'a dock under the walkthrough').toHaveCount(0)
  await expect(toolbar(page).getByRole('button', { name: /^Save or share/ }), 'the primary is back on the toolbar').toBeVisible()
  // Every element pinned to the foot of the screen and as wide as it: exactly one.
  const bars = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return cs.position === 'fixed' && cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width >= window.innerWidth * 0.9 && r.bottom >= window.innerHeight - 1
  }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`))
  expect(bars, 'fixed bars along the foot of the screen').toHaveLength(1)
})

// The toolbar never wraps. Held on its own here because the primary leaving the
// row changes how much room is left on it: what fits at 320 is not what fit with a button more.
const ROW_WIDTHS = [320, 360, 390, 480, 640, 767]
for (const tool of TOOLS) {
  for (const width of ROW_WIDTHS) {
    test(`${tool.route} at ${width}px: the toolbar is one row, and the dock is on screen`, async ({ page }) => {
      watch(page, `someone using ${tool.title} at ${width}px`)
      await page.setViewportSize({ width, height: 900 })
      await go(page, tool.route)
      await expect(page.getByRole('heading', { level: 1, name: tool.title })).toBeAttached()
      const bar = toolbar(page)
      await expect(bar).toBeVisible()
      await expect(bar).not.toHaveClass(/is-measuring/)
      const row = await bar.evaluate((el) => {
        const kids = [...el.children].filter((k) => { const r = k.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(k).position !== 'absolute' })
        const mids = kids.map((k) => { const r = k.getBoundingClientRect(); return r.top + r.height / 2 })
        return { children: kids.length, spread: Math.max(...mids) - Math.min(...mids), right: Math.max(...kids.map((k) => k.getBoundingClientRect().right)), vw: window.innerWidth, height: el.getBoundingClientRect().height }
      })
      // POSITIVE CONTROL: the row has its parts on it.
      expect(row.children, 'the toolbar rendered its controls').toBeGreaterThanOrEqual(2)
      expect(row.spread, `${width}px: toolbar children sit on more than one line`).toBeLessThanOrEqual(2)
      expect(row.right, `${width}px: the toolbar runs past the screen`).toBeLessThanOrEqual(row.vw)
      expect(row.height, `${width}px: the toolbar is ${Math.round(row.height)}px tall, a second row`).toBeLessThan(72)
      const b = await box(dockButton(page))
      expect(b.x, `${width}px: the dock button starts off screen`).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width, `${width}px: the dock button runs off screen`).toBeLessThanOrEqual(width)
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(sideways, `${width}px: the page scrolls sideways`).toBeLessThanOrEqual(0)
    })
  }
}
