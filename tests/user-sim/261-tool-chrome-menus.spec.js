// Tool chrome and menus:
//   · a tool's back arrow always leads to the tools index
//   · the controls on one toolbar row share a height and a corner radius
//   · PageUp / PageDown / Home / End move the highlight in a styled dropdown
//   · the lock icon on a Pro mark
//   · a page's own right-click menu leaves a link to the browser; elsewhere the
//     app's menu opens
//   · both right-click menus are built to the dropdown's row and surface
//
// The System list on the Palette Generator is the long list (every harmony, with a
// Pro mark on the locked ones); Rounding in the Type Scale's fine tuning is the
// plain one, so its rows are the dropdown's base row.
//
// Each test names the code to break to see it fail (MUTATION lines).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const SYSTEM = 'button[aria-label^="Colour system"]'
const BAR = '[data-tool-toolbar]'

/** A context at an exact width: touch metrics on a phone, a mouse above it. */
async function at(browser, width, { path = '/create/palette', theme = null } = {}) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  if (theme) await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `tool chrome visitor at ${width}px`)
  await go(page, path)
  return { ctx, page }
}

/** The Colour system trigger, through Extra tools when it is not on the row. */
async function systemTrigger(page) {
  if (!(await page.locator(`${BAR} ${SYSTEM}`).count())) {
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

/** A right-click event on `el`; true when the page called preventDefault on it. */
const rightClickPrevented = (el) => el.evaluate((node) => !node.dispatchEvent(
  new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: 60, clientY: 60 }),
))

// ── Back arrow ─────────────────────────────────────────────────────────────
test.describe('The back arrow goes to the tools index', () => {
  // MUTATION: in PaletteBuilder.jsx give the back item `<ToolBack to="/projects" />` again.
  for (const path of ['/create/palette', '/create/gradient', '/create/type-scale']) {
    test(`${path} (1440)`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 1440, { path })
      const back = page.locator(BAR).getByRole('link', { name: 'Back to all tools', exact: true })
      await expect(back).toBeVisible()
      await expect(back).toHaveAttribute('href', '/tools')
      await back.click()
      await expect(page).toHaveURL(/\/tools$/)
      await ctx.close()
    })
  }

  // MUTATION: in PaletteBuilder.jsx point the back item's menu `onSelect` at '/projects'.
  test('the palette back item in Extra tools goes there too (390)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'Extra tools' })
    await expect(panel).toBeVisible()
    await panel.getByRole('button', { name: 'Back to all tools', exact: true }).click()
    await expect(page).toHaveURL(/\/tools$/)
    await ctx.close()
  })
})

// ── One height and one radius on a toolbar row ─────────────────────────────
for (const width of [1440, 390]) {
  test.describe(`Toolbar controls are one size at ${width}px`, () => {
    // MUTATION: in tool-layout.css give `.tl-select` a `height: 32px`, or drop the
    // `.tl-toolbar .tl-select` radius rule.
    for (const path of ['/create/palette', '/create/gradient', '/create/type-scale']) {
      test(`${path}`, async ({ browser }) => {
        const { ctx, page } = await at(browser, width, { path })
        await expect(page.locator(BAR)).toBeVisible()
        const controls = await page.locator(BAR).evaluate((bar) => Array.from(bar.querySelectorAll('.tl-btn, .tl-select'))
          .filter((el) => el.offsetHeight > 0 && el.offsetWidth > 0)
          .map((el) => ({
            name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 24),
            h: el.offsetHeight,
            radius: getComputedStyle(el).borderTopLeftRadius,
          })))
        // Type Scale on a phone keeps Reset scale in More, so its row is Back and More;
        // every other row here has a third control.
        const rowMin = width < 700 && path === '/create/type-scale' ? 2 : 3
        expect(controls.length, 'a toolbar with several controls').toBeGreaterThanOrEqual(rowMin)
        const heights = new Set(controls.map((c) => c.h))
        const radii = new Set(controls.map((c) => c.radius))
        expect([...heights], `one height on the row: ${JSON.stringify(controls)}`).toHaveLength(1)
        expect([...radii], `one radius on the row: ${JSON.stringify(controls)}`).toHaveLength(1)
        // 36px with a mouse, a 44px target on a phone
        expect([...heights][0]).toBe(width < 700 ? 44 : 36)
        await ctx.close()
      })
    }
  })
}

// ── Keys in a styled dropdown ──────────────────────────────────────────────
for (const width of [1440, 390]) {
  // MUTATION: in listboxKeys.js take 'PageUp' and 'PageDown' out of the 'move' list in listboxKeyAction.
  test(`Home, End, PageDown and PageUp move the highlight in a dropdown (${width})`, async ({ browser }) => {
    const { ctx, page } = await at(browser, width)
    const list = await openSystem(page)
    const count = await list.locator('[role="option"]').count()
    expect(count, 'a list long enough to page').toBeGreaterThan(5)

    await page.keyboard.press('Home')
    expect(await activeIndex(list), 'Home').toBe(0)
    await page.keyboard.press('PageDown')
    const down = await activeIndex(list)
    expect(down, 'PageDown moves down').toBeGreaterThan(0)
    expect(down, 'PageDown stays in the list').toBeLessThanOrEqual(count - 1)
    await page.keyboard.press('End')
    expect(await activeIndex(list), 'End').toBe(count - 1)
    await page.keyboard.press('PageDown')
    expect(await activeIndex(list), 'PageDown at the end does not wrap').toBe(count - 1)
    await page.keyboard.press('PageUp')
    expect(await activeIndex(list), 'PageUp moves up').toBeLessThan(count - 1)
    await page.keyboard.press('Home')
    await page.keyboard.press('PageUp')
    expect(await activeIndex(list), 'PageUp at the top does not wrap').toBe(0)
    await ctx.close()
  })
}

// ── The lock on a Pro mark, a hairline between groups ──────────────────────
test.describe('Pro marks', () => {
  // MUTATION: in MenuSelect.jsx make proMark return the bare span without the ToolIcon.
  test('a Pro row in the dropdown carries the app lock icon (1440)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const list = await openSystem(page)
    const pro = list.locator('[role="option"]').filter({ has: page.locator('.menu-select-mark') })
    expect(await pro.count(), 'a free visitor has locked systems').toBeGreaterThan(0)
    for (const row of await pro.all()) {
      const mark = row.locator('.menu-select-mark')
      await expect(mark).toHaveText('Pro')
      await expect(mark.locator('svg.tl-ico rect'), 'the lock drawn by ToolIcon').toHaveCount(1)
      await expect(mark.locator('svg')).toHaveAttribute('aria-hidden', 'true')
    }
    await ctx.close()
  })

  // MUTATION: in global.css delete the `.menu-select-list [role="group"]:not(:first-child)` rule.
  test('a grouped dropdown draws a hairline above each group after the first (1440)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { path: '/create/icons' })
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    const trigger = page.getByRole('button', { name: 'Icon pack' })
    await expect(trigger).toBeVisible()
    await trigger.click()
    const list = page.locator('.menu-select-list[role="listbox"]')
    await expect(list).toBeVisible()
    const groups = await list.locator('[role="group"]').evaluateAll((els) => els.map((el) => ({
      first: el === el.parentElement.firstElementChild,
      line: getComputedStyle(el).borderTopWidth,
    })))
    expect(groups.length, 'the pack list has groups').toBeGreaterThan(1)
    for (const group of groups) expect(group.line, 'hairline above a group that follows something').toBe(group.first ? '0px' : '1px')
    await ctx.close()
  })
})

// ── Right-click ────────────────────────────────────────────────────────────
test.describe('Right-click on a link keeps the browser menu', () => {
  // MUTATION: in PaletteBuilder.jsx delete `if (isOnLink(e.target)) return` from the column's onContextMenu.
  test('a link inside a palette column is left alone; the column itself opens the page menu (1440)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    const col = page.locator('.plb-col').nth(1)
    const link = await col.evaluateHandle((node) => {
      const a = document.createElement('a')
      a.href = '/tools'
      a.textContent = 'link'
      node.append(a)
      return a
    })
    expect(await rightClickPrevented(link.asElement()), 'the link keeps the native menu').toBe(false)
    await link.evaluate((a) => a.remove())
    expect(await rightClickPrevented(col), 'the column opens the swatch menu').toBe(true)
    await expect(page.getByRole('menu', { name: 'Colour actions' })).toBeVisible()
    await ctx.close()
  })

  // MUTATION: in GradientGenerator.jsx delete `if (isOnLink(e.target)) return` from the stop row's onContextMenu.
  test('a link inside a gradient stop row is left alone; the row opens the tints menu (1440)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { path: '/create/gradient' })
    const stop = page.locator('.grd-stop').first()
    await expect(stop).toBeVisible()
    const link = await stop.evaluateHandle((node) => {
      const a = document.createElement('a')
      a.href = '/tools'
      a.textContent = 'link'
      node.append(a)
      return a
    })
    expect(await rightClickPrevented(link.asElement()), 'the link keeps the native menu').toBe(false)
    await link.evaluate((a) => a.remove())
    expect(await rightClickPrevented(stop), 'the row opens the tints menu').toBe(true)
    await expect(page.getByRole('menu', { name: /^Tints of stop/ })).toBeVisible()
    await ctx.close()
  })

  // MUTATION: in elementSignature.js take 'a' out of NATIVE_TAGS and the href check in nativeMenuWins.
  test('the app menu yields on a link and opens on a plain surface (1440)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { path: '/create/type-scale' })
    const link = page.locator('a[href]:visible').first()
    await expect(link).toBeVisible()
    expect(await rightClickPrevented(link), 'the link keeps the native menu').toBe(false)
    await expect(page.locator('.fbx-menu')).toHaveCount(0)

    const point = await page.evaluate(() => {
      const bad = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'A', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'EMBED', 'OBJECT', 'IFRAME', 'BUTTON', 'OPTION'])
      for (let y = Math.round(innerHeight * 0.25); y < innerHeight * 0.8; y += 30) {
        for (let x = Math.round(innerWidth * 0.15); x < innerWidth * 0.85; x += 40) {
          let n = document.elementFromPoint(x, y)
          let ok = !!n
          for (let i = 0; i < 8 && n; i += 1) {
            if (bad.has(n.tagName) || n.isContentEditable || n.dataset?.feedbackSurface != null) { ok = false; break }
            n = n.parentElement
          }
          if (ok) return { x, y }
        }
      }
      return null
    })
    expect(point, 'a plain surface to right-click').not.toBeNull()
    await page.mouse.click(point.x, point.y, { button: 'right' })
    await expect(page.locator('.fbx-menu')).toBeVisible()
    await ctx.close()
  })
})

// ── Right-click menus are built to the dropdown's row ──────────────────────
test.describe('Right-click menus share the dropdown row', () => {
  const read = (el) => {
    const cs = getComputedStyle(el)
    return { h: el.offsetHeight, radius: cs.borderRadius, size: cs.fontSize, weight: cs.fontWeight, family: cs.fontFamily, padL: cs.paddingLeft }
  }
  const surface = (el) => {
    const cs = getComputedStyle(el)
    return { radius: cs.borderRadius, bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopColor}` }
  }

  /** The base row and surface of a plain dropdown (Rounding, Type Scale). */
  async function dropdownBase(browser) {
    const a = await at(browser, 1440, { path: '/create/type-scale' })
    await a.page.getByRole('button', { name: 'Fine tuning' }).click()
    await a.page.locator('#tsc-round').click()
    const list = a.page.getByRole('listbox', { name: 'Rounding' })
    await expect(list).toBeVisible()
    // offsetHeight, not getBoundingClientRect: a menu opens with a scale-in animation
    const base = { row: await list.locator('[role="option"]').first().evaluate(read), surface: await list.evaluate(surface), page: a.page }
    await a.page.keyboard.press('Escape')
    return { base, ctx: a.ctx }
  }

  // MUTATION: in colour.css drop `min-height:40px` or set `font-size:12.5px` on `.plb-ctx-item`.
  test('the swatch menu row is the dropdown row: height, radius, type, surface (1440)', async ({ browser }) => {
    const { base, ctx: baseCtx } = await dropdownBase(browser)
    await baseCtx.close()

    const { ctx, page } = await at(browser, 1440)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await page.locator('.plb-col').nth(1).click({ button: 'right' })
    const menu = page.getByRole('menu', { name: 'Colour actions' })
    await expect(menu).toBeVisible()
    const item = await menu.getByRole('menuitem').first().evaluate(read)
    expect(item).toEqual(base.row)
    expect(await menu.evaluate(surface)).toEqual(base.surface)
    await ctx.close()
  })

  // MUTATION: in v3-menus.css change `.v3m-i`'s `min-height:36px`, or give `.fbx-menu` its own radius.
  test('the app right-click menu row is the dropdown row: height, radius, type, surface (1440)', async ({ browser }) => {
    const { base, ctx } = await dropdownBase(browser)
    const page = base.page
    const point = await page.evaluate(() => {
      const bad = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'A', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'EMBED', 'OBJECT', 'IFRAME', 'BUTTON', 'OPTION'])
      for (let y = Math.round(innerHeight * 0.25); y < innerHeight * 0.8; y += 30) {
        for (let x = Math.round(innerWidth * 0.15); x < innerWidth * 0.85; x += 40) {
          let n = document.elementFromPoint(x, y)
          let ok = !!n
          for (let i = 0; i < 8 && n; i += 1) {
            if (bad.has(n.tagName) || n.isContentEditable || n.dataset?.feedbackSurface != null) { ok = false; break }
            n = n.parentElement
          }
          if (ok) return { x, y }
        }
      }
      return null
    })
    expect(point, 'a plain surface to right-click').not.toBeNull()
    await page.mouse.click(point.x, point.y, { button: 'right' })
    const menu = page.locator('.fbx-menu')
    await expect(menu).toBeVisible()
    const item = await menu.getByRole('menuitem').first().evaluate(read)
    expect(item).toEqual(base.row)
    expect(await menu.evaluate(surface)).toEqual(base.surface)
    await ctx.close()
  })

  // BREAK: in PaletteBuilder.jsx render the `.plb-ctx` div on phones again (drop the `phone` branch
  // that mounts `<Menu label="Colour actions">`), or drop the Cancel button from Menu.jsx's sheet,
  // or make Cancel not return focus to the trigger.
  test('on a phone "More actions" opens the shared menu sheet with Cancel, and Cancel closes it and returns focus (390)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    const trigger = page.locator('.plb-col').nth(1).locator('.plb-tool--more')
    await trigger.click()
    const sheet = page.locator('.v3m-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('menu', { name: 'Colour actions' })).toBeVisible()
    await expect(page.locator('.plb-ctx')).toHaveCount(0)
    const cancel = sheet.getByRole('button', { name: 'Cancel' })
    await expect(cancel).toBeVisible()
    await cancel.click()
    await expect(page.locator('.v3m-sheet')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await ctx.close()
  })

  // MUTATION: in v3-menus.css drop the sheet row's `min-height` (rows fall under 44px), or make
  // PaletteBuilder.jsx render the old `.plb-ctx` list on phones with rows under 44px.
  test('on a phone the swatch menu rows are 44px targets (390)', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await page.locator('.plb-col').nth(1).locator('.plb-tool--more').click()
    const menu = page.getByRole('menu', { name: 'Colour actions' })
    await expect(menu).toBeVisible()
    const rows = await menu.getByRole('menuitem').evaluateAll((els) => els.map((el) => el.offsetHeight))
    expect(rows.length).toBeGreaterThan(6)
    expect(Math.min(...rows), 'every row is at least 44px').toBeGreaterThanOrEqual(44)
    await ctx.close()
  })
})

// ── Dropdowns and the swatch menu against the shared menu row ───────────────
// The rows are checked against a real `.v3m-i` row (the row of the page's own
// right-click menu), read live in the same theme, and against the hand-checked
// V3 values: 36px tall, 8px radius, 15px / 500, 12px left padding, on a 16px
// surface. The live row keeps the three in step with each other; the fixed
// values keep all of them from drifting together.
test.describe('Dropdown rows share the shared menu row', () => {
  const ROW = { h: 36, radius: '8px', size: '15px', weight: '500', padL: '12px' }
  const SURFACE_RADIUS = '16px'

  const rowsOf = (locator) => locator.evaluateAll((els) => els.map((el) => {
    const cs = getComputedStyle(el)
    return { h: el.offsetHeight, radius: cs.borderTopLeftRadius, size: cs.fontSize, weight: cs.fontWeight, padL: cs.paddingLeft }
  }))
  const surfaceOf = (locator) => locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, borderWidth: cs.borderTopWidth }
  })

  /** The right-click menu's own `.v3m-i` row and its surface, on a Type Scale page in the same context. */
  async function sharedRow(ctx, theme) {
    const page = await ctx.newPage()
    watch(page, `menu reference in ${theme}`)
    await go(page, '/create/type-scale')
    expect(await page.evaluate(() => document.documentElement.dataset.theme), 'the theme took effect').toBe(theme)
    const point = await page.evaluate(() => {
      const bad = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'A', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'EMBED', 'OBJECT', 'IFRAME', 'BUTTON', 'OPTION'])
      for (let y = Math.round(innerHeight * 0.25); y < innerHeight * 0.8; y += 30) {
        for (let x = Math.round(innerWidth * 0.15); x < innerWidth * 0.85; x += 40) {
          let n = document.elementFromPoint(x, y)
          let ok = !!n
          for (let i = 0; i < 8 && n; i += 1) {
            if (bad.has(n.tagName) || n.isContentEditable || n.dataset?.feedbackSurface != null) { ok = false; break }
            n = n.parentElement
          }
          if (ok) return { x, y }
        }
      }
      return null
    })
    expect(point, 'a plain surface to right-click').not.toBeNull()
    await page.mouse.click(point.x, point.y, { button: 'right' })
    const menu = page.locator('.fbx-menu')
    await expect(menu).toBeVisible()
    const first = menu.locator('.v3m-i').first()
    await expect(first).toBeVisible()
    // The menu opens with a scale-in: offsetHeight is not scaled by it.
    const ref = { row: (await rowsOf(first))[0], surface: await surfaceOf(menu) }
    await page.close()
    return ref
  }

  /** Every row's reading must equal the reference row and the fixed V3 row. */
  function expectSharedRows(rows, surface, ref, what) {
    expect(rows.length, `${what}: has rows`).toBeGreaterThan(2)
    expect(ref.row, 'the reference is the V3 row').toEqual(ROW)
    expect(ref.surface.radius, 'the reference surface radius').toBe(SURFACE_RADIUS)
    for (const row of rows) expect(row, `${what}: a row is the shared menu row`).toEqual(ref.row)
    expect(surface.radius, `${what}: surface radius`).toBe(ref.surface.radius)
    expect(surface.bg, `${what}: surface fill`).toBe(ref.surface.bg)
    expect(surface.borderWidth, `${what}: no border on the surface`).toBe('0px')
  }

  for (const theme of ['light', 'dark']) {
    // MUTATION: in global.css set `.pop-item` min-height back to 40px, or give
    // `.pop.menu-select-list` its own radius.
    test(`the Rounding dropdown rows and surface are the shared menu row (1440, ${theme})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 1440, { path: '/create/type-scale', theme })
      const ref = await sharedRow(ctx, theme)
      await page.getByRole('button', { name: 'Fine tuning' }).click()
      await page.locator('#tsc-round').click()
      const list = page.getByRole('listbox', { name: 'Rounding' })
      await expect(list).toBeVisible()
      expectSharedRows(await rowsOf(list.locator('[role="option"]')), await surfaceOf(list), ref, 'Rounding')
      await ctx.close()
    })

    // MUTATION: in global.css set `.pop-item` min-height back to 40px, or take
    // the `@media(min-width:768px)` surface block off `.pop.menu-select-list`.
    test(`a MenuSelect list's rows and surface are the shared menu row (1440, ${theme})`, async ({ browser }) => {
      // The Icon pack list: plain one-line rows in groups. (The Colour system list
      // carries a hint under each name, so its rows are taller on purpose.)
      const { ctx, page } = await at(browser, 1440, { path: '/create/icons', theme })
      const ref = await sharedRow(ctx, theme)
      await expect(page.locator('.ig .ic').first()).toBeVisible()
      await page.getByRole('button', { name: 'Icon pack' }).click()
      const list = page.locator('.menu-select-list[role="listbox"]')
      await expect(list).toBeVisible()
      expectSharedRows(await rowsOf(list.locator('[role="option"]')), await surfaceOf(list), ref, 'Icon pack')
      await ctx.close()
    })

    // MUTATION: in colour.css give `.plb-ctx-item` its own `border-radius:4px`,
    // or `.plb-ctx` its own `border-radius`.
    test(`the swatch context menu rows and surface are the shared menu row (1440, ${theme})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 1440, { theme })
      const ref = await sharedRow(ctx, theme)
      await expect(page.locator('.plb-col')).toHaveCount(5)
      await page.locator('.plb-col').nth(1).click({ button: 'right' })
      const menu = page.getByRole('menu', { name: 'Colour actions' })
      await expect(menu).toBeVisible()
      expectSharedRows(await rowsOf(menu.getByRole('menuitem')), await surfaceOf(menu), ref, 'Colour actions')
      await ctx.close()
    })
  }

  // MUTATION: in global.css change the two `.menu-select-option{min-height:44px}`
  // rules (pointer:coarse, and the narrow-width block) to 36px.
  test('on a phone the Scale ratio and Colour system rows are 44px targets (390)', async ({ browser }) => {
    const a = await at(browser, 390, { path: '/create/type-scale' })
    // On a phone Fine tuning opens the settings sheet, whose first dropdown is the ratio.
    await a.page.getByRole('button', { name: 'Fine tuning' }).click()
    await a.page.locator('button[aria-haspopup="listbox"]:visible').first().click()
    const ratio = a.page.locator('.menu-select-list[role="listbox"]')
    await expect(ratio).toBeVisible()
    const ratioRows = await ratio.locator('[role="option"]').evaluateAll((els) => els.map((el) => el.offsetHeight))
    expect(ratioRows.length).toBeGreaterThan(2)
    expect(Math.min(...ratioRows), 'every Scale ratio row is at least 44px').toBeGreaterThanOrEqual(44)
    await a.ctx.close()

    const b = await at(browser, 390)
    const list = await openSystem(b.page)
    const sysRows = await list.locator('[role="option"]').evaluateAll((els) => els.map((el) => el.offsetHeight))
    expect(sysRows.length).toBeGreaterThan(5)
    expect(Math.min(...sysRows), 'every Colour system row is at least 44px').toBeGreaterThanOrEqual(44)
    await b.ctx.close()
  })
})
