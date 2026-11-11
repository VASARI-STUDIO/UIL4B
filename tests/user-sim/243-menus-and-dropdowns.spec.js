// The styled dropdowns (MenuSelect) and the custom menus that share their design:
// PageUp / PageDown / Home / End, the phone sheet, the lock on Pro marks, the
// focus ring, and a right-click menu that is built to the same row.
//
// The System list on the Palette Generator is the long list (every harmony, with
// a Pro mark on the locked ones); Rounding in the Type Scale's fine tuning is the
// plain one that carries no icon or hint, so its rows are the dropdown's base row.
//
// Each test names the code to break to see it fail (MUTATION lines).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const SYSTEM = 'button[aria-label^="Colour system"]'

/** A context at an exact width: touch metrics on a phone, a mouse above it. */
async function at(browser, width, { theme = 'light', path = '/create/palette' } = {}) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `menus visitor at ${width}px`)
  await go(page, path)
  return { ctx, page }
}

/** The Colour system trigger, through Extra tools when it is not on the row. */
async function systemTrigger(page) {
  if (!(await page.locator(`[data-tool-toolbar] ${SYSTEM}`).count())) {
    await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'Extra tools' })
    await expect(panel).toBeVisible()
    // the panel moves focus to its first control a frame after it opens
    await expect.poll(() => panel.evaluate((el) => el.contains(document.activeElement)), { message: 'Extra tools has taken focus' }).toBe(true)
  }
  return page.locator(`${SYSTEM}:visible`).first()
}

async function openSystem(page) {
  await expect(page.locator('.plb-col')).toHaveCount(5)
  await (await systemTrigger(page)).click()
  const list = page.getByRole('listbox', { name: 'Colour system' })
  await expect(list).toBeVisible()
  // the phone sheet slides in; wait for it to stop
  const bottom = () => list.evaluate((el) => el.getBoundingClientRect().bottom)
  await expect.poll(async () => { const first = await bottom(); await page.waitForTimeout(120); return first === await bottom() }, { message: 'the list has settled' }).toBe(true)
  return list
}

/** Which row the list has highlighted (its data-option-index), or -1. */
const activeIndex = (list) => list.evaluate((el) => {
  const row = el.querySelector('[role="option"].is-active')
  return row ? Number(row.dataset.optionIndex) : -1
})

for (const width of [1440, 390]) {
  test.describe(`Dropdown keys at ${width}px`, () => {
    // MUTATION: in listboxKeys.js take 'PageUp' and 'PageDown' out of the 'move' list in listboxKeyAction.
    test(`Home, End, PageDown and PageUp move the highlight and clamp at the ends (${width})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      const list = await openSystem(page)
      const count = await list.locator('[role="option"]').count()
      expect(count, 'a list long enough to page').toBeGreaterThan(5)
      await expect(list.locator('[role="option"][aria-disabled="true"]'), 'no disabled rows, so a page is plain').toHaveCount(0)

      // One page is the rows in view less one, at least one: the same sum MenuSelect makes.
      const page1 = await list.evaluate((el) => {
        const row = el.querySelector('[role="option"]')
        return Math.max(Math.floor(el.clientHeight / row.offsetHeight) - 1, 1)
      })

      await page.keyboard.press('Home')
      expect(await activeIndex(list), 'Home').toBe(0)
      await page.keyboard.press('PageDown')
      expect(await activeIndex(list), 'PageDown from the top').toBe(Math.min(page1, count - 1))
      await page.keyboard.press('End')
      expect(await activeIndex(list), 'End').toBe(count - 1)
      await page.keyboard.press('PageDown')
      expect(await activeIndex(list), 'PageDown at the end clamps, it does not wrap').toBe(count - 1)
      await page.keyboard.press('PageUp')
      expect(await activeIndex(list), 'PageUp from the end').toBe(Math.max(count - 1 - page1, 0))
      await page.keyboard.press('Home')
      await page.keyboard.press('PageUp')
      expect(await activeIndex(list), 'PageUp at the top clamps, it does not wrap').toBe(0)
      // the highlighted row stays inside the scrolling list
      await page.keyboard.press('End')
      const inView = await list.evaluate((el) => {
        const row = el.querySelector('[role="option"].is-active').getBoundingClientRect()
        const box = el.getBoundingClientRect()
        return row.top >= box.top - 1 && row.bottom <= box.bottom + 1
      })
      expect(inView, 'the last row scrolled into view').toBe(true)

      // The page keys do not choose anything: Escape leaves the value alone.
      // (the list is open and its scrim covers the page, so read the trigger without clicking anything)
      const trigger = page.locator(`${SYSTEM}:visible`).first()
      const before = await trigger.getAttribute('aria-label')
      await page.keyboard.press('Escape')
      await expect(list).toBeHidden()
      expect(await page.locator(SYSTEM).first().getAttribute('aria-label')).toBe(before)
      await ctx.close()
    })
  })
}

test.describe('Dropdown phone sheet at 390px', () => {
  // MUTATION: in global.css put `calc(16px + env(safe-area-inset-bottom))` back on the
  // `html.has-tabbar .pop.menu-select-list` rule (the lifted sheet counts the inset twice;
  // tests/unit/menu-select-sheet-css.test.js reads the rule text, as env() is 0 in a test browser).
  for (const theme of ['light', 'dark']) {
    test(`a list opened from Extra tools sits on the screen edge, with 44px rows (${theme})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 390, { theme })
      const list = await openSystem(page)
      const r = await list.evaluate((el) => {
        const b = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          bottom: b.bottom, vh: window.innerHeight, inSheet: el.hasAttribute('data-in-sheet'),
          padBottom: parseFloat(cs.paddingBottom), left: b.left, right: b.right, vw: window.innerWidth,
          rows: [...el.querySelectorAll('[role="option"]')].map((o) => Math.round(o.getBoundingClientRect().height)),
        }
      })
      expect(r.inSheet, 'it knows it was opened from a sheet').toBe(true)
      expect(Math.abs(r.bottom - r.vh), 'no lift gap under the list').toBeLessThanOrEqual(1)
      expect(r.padBottom, 'the bottom padding is 16px plus the inset (0 here), once').toBe(16)
      expect(r.left, 'full width').toBe(0)
      expect(r.right).toBe(r.vw)
      expect(Math.min(...r.rows), 'every row is a 44px target').toBeGreaterThanOrEqual(44)
      await page.screenshot({ path: `.claude/scratch/menus1/dropdown-sheet-390-${theme}.png` })
      await ctx.close()
    })
  }
})

test.describe('Pro marks and the focus ring', () => {
  // MUTATION: in MenuSelect.jsx make proMark return the bare span without the ToolIcon.
  test('a Pro row in the dropdown carries the app lock icon, a free row has none', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const list = await openSystem(page)
    const pro = list.locator('[role="option"]').filter({ has: page.locator('.menu-select-mark') })
    expect(await pro.count(), 'a free visitor has locked systems').toBeGreaterThan(0)
    for (const row of await pro.all()) {
      const mark = row.locator('.menu-select-mark')
      await expect(mark).toHaveText('Pro')
      await expect(mark.locator('svg.tl-ico'), 'the lock drawn by ToolIcon').toHaveCount(1)
      // the same outline as the lock beside every other Pro cue (ToolIcon "lock-simple")
      await expect(mark.locator('svg.tl-ico rect')).toHaveCount(1)
      await expect(mark.locator('svg')).toHaveAttribute('aria-hidden', 'true')
      await expect(row, 'the spoken name still ends in Pro').toHaveAccessibleName(/, Pro$/)
    }
    await expect(list.locator('.menu-select-mark svg')).toHaveCount(await pro.count())
    await ctx.close()
  })

  // MUTATION: in global.css put `var(--accent)` back on `.menu-select-trigger:focus-visible`.
  test('the closed trigger ring is the link colour, like the open list and the toolbar', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { path: '/create/type-scale' })
    await page.getByRole('button', { name: 'Fine tuning' }).click()
    const trigger = page.locator('#tsc-round')
    await expect(trigger).toBeVisible()
    await page.keyboard.press('Shift') // the last input was the keyboard, so :focus-visible matches
    await trigger.focus()
    await expect(trigger).toBeFocused()
    const ring = await trigger.evaluate((el) => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--link)'
      document.body.append(probe)
      const link = getComputedStyle(probe).color
      probe.remove()
      const cs = getComputedStyle(el)
      return { link, color: cs.outlineColor, width: cs.outlineWidth, matches: el.matches(':focus-visible') }
    })
    expect(ring.matches, 'focus-visible').toBe(true)
    expect(ring.width).toBe('2px')
    expect(ring.color).toBe(ring.link)
    await ctx.close()
  })
})

test.describe('Right-click menu and the dropdown share one row', () => {
  // MUTATION: in colour.css set `min-height` back to 7px padding with no min-height on `.plb-ctx-item`,
  // or `font-size:12.5px` / `border-radius:8px` on it.
  test('the swatch menu matches a plain dropdown row: height, radius, type, surface (1440)', async ({ browser }) => {
    // the dropdown's base row
    const a = await at(browser, 1440, { path: '/create/type-scale' })
    await a.page.getByRole('button', { name: 'Fine tuning' }).click()
    await a.page.locator('#tsc-round').click()
    const list = a.page.getByRole('listbox', { name: 'Rounding' })
    await expect(list).toBeVisible()
    // offsetHeight, not getBoundingClientRect: a menu opens with a scale-in animation and a
    // transform would shrink the measured box (39 for a 40px row) while it plays.
    const read = (el) => {
      const cs = getComputedStyle(el)
      return { h: el.offsetHeight, radius: cs.borderRadius, size: cs.fontSize, weight: cs.fontWeight, family: cs.fontFamily, padL: cs.paddingLeft, gap: cs.columnGap }
    }
    const surface = (el) => {
      const cs = getComputedStyle(el)
      return { radius: cs.borderRadius, bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopColor}`, pad: cs.paddingTop }
    }
    const row = await list.locator('[role="option"]').first().evaluate(read)
    const listSurface = await list.evaluate(surface)
    await a.ctx.close()

    const b = await at(browser, 1440)
    await expect(b.page.locator('.plb-col')).toHaveCount(5)
    await b.page.locator('.plb-col').nth(1).click({ button: 'right' })
    const menu = b.page.getByRole('menu', { name: 'Colour actions' })
    await expect(menu).toBeVisible()
    const item = await menu.getByRole('menuitem').first().evaluate(read)
    const menuSurface = await menu.evaluate(surface)
    expect(item.h, 'row height').toBe(row.h)
    expect(item.radius, 'row radius').toBe(row.radius)
    expect(item.size, 'row type size').toBe(row.size)
    expect(item.weight, 'row type weight').toBe(row.weight)
    expect(item.family, 'row typeface').toBe(row.family)
    expect(item.padL, 'row padding').toBe(row.padL)
    expect(menuSurface.radius, 'menu radius').toBe(listSurface.radius)
    expect(menuSurface.bg, 'menu background').toBe(listSurface.bg)
    expect(menuSurface.border, 'menu border').toBe(listSurface.border)
    expect(menuSurface.pad, 'menu padding').toBe(listSurface.pad)
    // a hairline between groups, drawn as the dropdown's separator is
    const sep = await menu.locator('.plb-ctx-sep').first().evaluate((el) => { const cs = getComputedStyle(el); return { h: el.offsetHeight, bg: cs.backgroundColor } })
    expect(sep.h).toBe(1)
    // keyboard focus ring on a row: the link colour, inside the row, like the dropdown's active row
    // (a mouse-opened menu leaves focus on the page and the arrow keys are handled on the menu, so
    // put focus on its first row, as a keyboard-opened menu does, then step to the next)
    await menu.getByRole('menuitem').first().focus()
    await b.page.keyboard.press('ArrowDown')
    const ring = await b.page.evaluate(() => {
      const el = document.activeElement
      const probe = document.createElement('span')
      probe.style.color = 'var(--link)'
      document.body.append(probe)
      const link = getComputedStyle(probe).color
      probe.remove()
      const cs = getComputedStyle(el)
      return { role: el.getAttribute('role'), link, color: cs.outlineColor, offset: cs.outlineOffset, visible: el.matches(':focus-visible') }
    })
    expect(ring.role).toBe('menuitem')
    expect(ring.visible).toBe(true)
    expect(ring.color).toBe(ring.link)
    // Soft, so the rest of the test (and the screenshot) still run. Today this reads 2px: the
    // tool pages' `:is(.tl, .tl-sheet-layer) :is(button, a, ...):focus-visible` rule in
    // pages/tool-layout.css (0,3,0) outranks `.plb-ctx-item:focus-visible` (0,2,0).
    expect(ring.offset, 'the ring sits inside the row').toBe('-2px')
    await b.page.screenshot({ path: '.claude/scratch/menus1/ctx-menu-1440.png' })
    await b.ctx.close()
  })

  test('on a phone the swatch menu rows are 44px targets (390)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await page.locator('.plb-col').nth(1).locator('.plb-tool--more').click()
    const menu = page.getByRole('menu', { name: 'Colour actions' })
    await expect(menu).toBeVisible()
    const rows = await menu.getByRole('menuitem').evaluateAll((els) => els.map((el) => el.offsetHeight))
    expect(rows.length).toBeGreaterThan(6)
    expect(Math.min(...rows), 'every row is at least 44px').toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: '.claude/scratch/menus1/ctx-menu-390.png' })
    await ctx.close()
  })

  // MUTATION: in gradient.css put `min-height: 32px` and `font-size: 13px` back on `.grd-tintmenu-item`.
  test('the gradient tints menu rows are the dropdown row too (1440)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { path: '/create/gradient' })
    await expect(page.locator('.grd-stop').first()).toBeVisible()
    const stop = page.locator('.grd-stop').first()
    await stop.click({ button: 'right' })
    const menu = page.locator('.grd-tintmenu')
    await expect(menu).toBeVisible()
    const r = await menu.locator('[role="menuitem"]').first().evaluate((el) => {
      const cs = getComputedStyle(el)
      return { h: el.offsetHeight, size: cs.fontSize, weight: cs.fontWeight, radius: cs.borderRadius }
    })
    expect(r.h).toBe(40)
    expect(r.size).toBe('14px')
    expect(r.weight).toBe('560')
    await ctx.close()
  })
})
