// THE SHARED MENU, AS A PERSON USES IT.
//
// One primitive (src/components/menu/Menu.jsx, rules in menuModel.js, skin in
// styles/v3-menus.css) behind every action menu. These are the journeys a person
// makes through it, against the built app: open it with a pointer or a key, move
// round it, back out of it, choose from it, and meet it as a sheet on a phone.
// tests/unit/menu-model.test.js already pins the pure rules; this file proves the
// rules are wired to a real page.
//
// Three real menus carry the journeys, so nothing here mounts the primitive on its
// own:
//   · "Copy or save" on /create/tint (ExportMenu): four rows, signed out, so
//     Copy CSS, Save to project, Download, Export design system….
//   · the project's ⋯ (ProjectActions) on its own page: a section, two hairlines,
//     ten rows, Delete… last.
//   · the tints menu of a gradient stop (StopTintMenu, the `.v3m--tints` skin):
//     eleven rows, each with a colour swatch, opened by right-click or the Tints
//     button.
//
// Not covered: long-press. useLongPress.js exists but no component uses it yet
// (nothing in src/ imports it), so no phone path reaches it. Phones open a menu by
// tapping its visible button, and that is what the phone journeys do.
//
// Run: LANE=menus PLAYWRIGHT_PORT=4799 npx playwright test -c pw-lane.config.js tests/user-sim/v3-menus.spec.js
//
// Each test carries a `// BREAK:` note: the one source change that turns it red.
// Each was made, seen to fail, and put back.
import { test, expect } from './base.js'
import { go, watch, signIn, openProjectFromDashboard } from './helpers.js'

const NAME = 'Seeded Project 1'
const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

// ── seams ───────────────────────────────────────────────────────────────────
const exportTrigger = (page) => page.locator('.tl-export-btn')
const exportMenu = (page) => page.getByRole('menu', { name: 'Copy or save' })
const row = (menu, name) => menu.getByRole('menuitem', { name, exact: true })
const actionsTrigger = (page) => page.getByRole('button', { name: `Actions for ${NAME}` })
const actionsMenu = (page) => page.getByRole('menu', { name: `Actions for ${NAME}` })
const stopButton = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #[0-9A-F]{6}$`) })
const tintsButton = (page) => page.getByRole('button', { name: 'Tints of stop 1', exact: true })
const tintsMenu = (page, n = 1) => page.getByRole('menu', { name: new RegExp(`^Tints of stop ${n},`) })
const toastEl = (page) => page.locator('.toast.show')
const anyMenu = (page) => page.getByRole('menu')

/** The role-menu row that has focus, by its visible label; '' when focus is elsewhere. */
const focusedRow = (page) => page.evaluate(() => {
  const el = document.activeElement
  return el?.closest('[role="menu"]') && el.getAttribute('role')?.startsWith('menuitem') ? el.querySelector('.v3m-l')?.textContent.trim() : ''
})

const box = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }
})
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

/** The tint tool, with its Copy or save button ready. */
async function openTintTool(page) {
  await go(page, '/create/tint')
  await expect(exportTrigger(page), 'the Copy or save button is not in the toolbar').toBeVisible({ timeout: 15000 })
}

/** A project's own page, reached from the dashboard the way a person gets there. */
async function openProjectPage(page) {
  await signIn(page, { plan: 'free', projects: 2 })
  await go(page, '/projects')
  await openProjectFromDashboard(page, NAME)
  await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible()
  await expect(actionsTrigger(page)).toBeVisible()
}

/** The gradient tool as a Pro account (a free one sees the tints locked). */
async function openGradientTool(page) {
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/gradient')
  await expect(stopButton(page, 2)).toBeVisible({ timeout: 15000 })
}

// ── desktop, 1440 ───────────────────────────────────────────────────────────

test.describe('menus at 1440', () => {
  test.use({ viewport: DESKTOP })

  // BREAK: in Menu.jsx onDown, delete `&& !live.current.anchor?.contains?.(e.target)`: the press
  // on the button closes the menu and its click reopens it, so the second click never closes.
  test('a click opens the menu under the button, takes focus to the panel, and a second click closes it', async ({ page }) => {
    watch(page, 'a designer opening and closing Copy or save with the mouse')
    await openTintTool(page)
    const trigger = exportTrigger(page)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await trigger.click()
    const menu = exportMenu(page)
    await expect(menu).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(menu.getByRole('menuitem')).toHaveCount(4)
    await expect(menu, 'a pointer open lands on the panel, so no row looks pressed').toBeFocused()
    expect(await focusedRow(page), 'no row is focused after a click').toBe('')

    const t = await box(trigger)
    const m = await box(menu)
    expect(m.y, 'the panel hangs below its button').toBeGreaterThanOrEqual(t.bottom)
    expect(m.x + m.w, 'the panel stays inside the page').toBeLessThanOrEqual(1440)

    await trigger.click()
    await expect(menu, 'a second click on the button closes it').toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  // BREAK: in ExportMenu.jsx the trigger's onClick: `e.detail === 0` -> `false`, so a key-made
  // click is treated as a pointer open and no row takes focus.
  test('Enter and Space on the button open the menu onto its first row', async ({ page }) => {
    watch(page, 'a keyboard user opening Copy or save')
    await openTintTool(page)
    const trigger = exportTrigger(page)
    const menu = exportMenu(page)

    for (const key of ['Enter', 'Space']) {
      await trigger.focus()
      await page.keyboard.press(key)
      await expect(menu, `${key} should open the menu`).toBeVisible()
      await expect(row(menu, 'Copy CSS'), `${key} lands on the first row`).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(menu).toBeHidden()
    }
  })

  // BREAK: in menuModel.js menuOpenKey, make ArrowUp return 'first' (it must open onto the last row).
  test('ArrowDown on the button opens onto the first row and ArrowUp onto the last', async ({ page }) => {
    watch(page, 'a keyboard user opening Copy or save with the arrows')
    await openTintTool(page)
    const trigger = exportTrigger(page)
    const menu = exportMenu(page)

    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    await expect(row(menu, 'Copy CSS'), 'ArrowDown opens onto the first row').toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    await page.keyboard.press('ArrowUp')
    await expect(row(menu, 'Export design system…'), 'ArrowUp opens onto the last row').toBeFocused()
  })

  // BREAK: in menuModel.js menuKeyTarget, make `case 'End'` return 0, then `case 'Home'` return count - 1.
  test('the arrows move one row, wrap at both ends, and Home and End jump to the first and last', async ({ page }) => {
    watch(page, 'a keyboard user walking round Copy or save')
    await openTintTool(page)
    await exportTrigger(page).focus()
    await page.keyboard.press('Enter')
    const menu = exportMenu(page)
    await expect(row(menu, 'Copy CSS')).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(row(menu, 'Save to project')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(menu, 'Download')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(row(menu, 'Save to project')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(row(menu, 'Export design system…'), 'ArrowUp from the first row wraps to the last').toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(row(menu, 'Copy CSS'), 'ArrowDown from the last row wraps to the first').toBeFocused()

    await page.keyboard.press('End')
    await expect(row(menu, 'Export design system…')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(row(menu, 'Copy CSS')).toBeFocused()
  })

  // BREAK: in Menu.jsx onKey, delete the line `rows[hit.index]?.focus({ preventScroll: true })` in the typeahead branch.
  test('typing jumps to the row that starts with the letters, narrows as more arrive, and a repeated letter cycles', async ({ page }) => {
    watch(page, 'a keyboard user typing to a project action')
    await openProjectPage(page)
    const menu = actionsMenu(page)
    const open = async () => {
      await actionsTrigger(page).focus()
      await page.keyboard.press('Enter')
      await expect(menu).toBeVisible()
      await expect(row(menu, 'Palette'), 'it opens on the first row').toBeFocused()
    }

    await open()
    await page.keyboard.press('r')
    await expect(row(menu, 'Rename'), 'r jumps to Rename').toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    // The buffer is cleared on every open, so "ty" is a fresh two letter search: "t"
    // alone would stop on Tints, and the "y" must carry on to Type scale.
    await open()
    await page.keyboard.type('ty')
    await expect(row(menu, 'Type scale'), 'ty narrows past Tints to Type scale').toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    // Duplicate and Delete… share a first letter: a second d moves to the other, then back.
    await open()
    await page.keyboard.press('d')
    await expect(row(menu, 'Duplicate')).toBeFocused()
    await page.keyboard.press('d')
    await expect(row(menu, 'Delete…'), 'a repeated letter cycles to the next row with it').toBeFocused()
    await page.keyboard.press('d')
    await expect(row(menu, 'Duplicate'), 'and round again').toBeFocused()
  })

  // BREAK: in Menu.jsx onKey, make the Escape branch call `live.current.onClose?.()` instead of `closeToTrigger()`,
  // so the menu closes but focus is dropped on the page.
  test('Escape closes the menu and puts focus back on the button, however the menu was opened', async ({ page }) => {
    watch(page, 'someone backing out of Copy or save')
    await openTintTool(page)
    const trigger = exportTrigger(page)
    const menu = exportMenu(page)

    await trigger.click()
    await expect(menu).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu, 'Escape closes a menu opened by a click').toBeHidden()
    await expect(trigger, 'and focus is on the button again').toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(row(menu, 'Save to project')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu, 'Escape closes a menu opened by a key, from any row').toBeHidden()
    await expect(trigger).toBeFocused()
  })

  // BREAK: in Menu.jsx delete the `document.addEventListener('pointerdown', onDown, true)` line (and its
  // removeEventListener): a click outside no longer closes it.
  test('a click outside closes the menu, runs nothing, and does not pull focus back off the control that was clicked', async ({ page }) => {
    watch(page, 'someone clicking away from Copy or save')
    await openTintTool(page)
    const trigger = exportTrigger(page)
    const menu = exportMenu(page)

    await trigger.click()
    await expect(menu).toBeVisible()
    await page.mouse.click(8, 450) // the blank margin beside the page
    await expect(menu, 'a click outside closes it').toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#ui-login-title'), 'closing must not run a row (Save to project would open sign-in)').toHaveCount(0)
    await expect(toastEl(page), 'closing must not run a row').toHaveCount(0)

    // The spec says an outside press closes and does not refocus: a press on another
    // control keeps the focus it just took.
    await trigger.click()
    await expect(menu).toBeVisible()
    await page.getByRole('button', { name: /search/i }).first().click()
    await expect(menu, 'pressing another control closes it too').toBeHidden()
    await expect(trigger, 'the menu did not drag focus back to its button').not.toBeFocused()
  })

  // BREAK: in Menu.jsx the `run` function, delete the `closeToTrigger()` call: the menu stays open after the choice.
  test('choosing a row runs it, closes the menu, and leaves focus on the button', async ({ page }) => {
    watch(page, 'someone copying the tint variables')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await openTintTool(page)
    const trigger = exportTrigger(page)

    await trigger.click()
    await row(exportMenu(page), 'Copy CSS').click()
    await expect(anyMenu(page), 'choosing closes the menu').toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(toastEl(page)).toContainText('Copied')
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text, 'the row ran: the tint variables are on the clipboard').toMatch(/^:root \{/)
    expect(text).toContain('--tint-500:')
  })

  // BREAK: in ProjectActions.jsx change the Archive row's onSelect to `() => {}`: the menu closes and nothing happens.
  test('the project menu opens on Enter, a typed letter finds Archive, Enter runs it, and focus is back on the dots', async ({ page }) => {
    watch(page, 'a designer archiving a project from the keyboard')
    await openProjectPage(page)
    const trigger = actionsTrigger(page)
    const menu = actionsMenu(page)

    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem'), 'ten actions, a section label and two hairlines').toHaveCount(10)
    await expect(menu.getByRole('separator')).toHaveCount(2)
    await expect(row(menu, 'Delete…'), 'Delete… is the last row').toHaveCount(1)
    expect(await menu.getByRole('menuitem').last().textContent()).toContain('Delete…')

    await page.keyboard.press('a')
    await expect(row(menu, 'Archive')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(anyMenu(page)).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(toastEl(page)).toContainText(`"${NAME}" archived`)
  })

  // BREAK: in StopTintMenu.jsx change `chip: t.hex` to `chip: color`: every swatch shows the stop's own colour, not its tint.
  test('the tints menu: each swatch is its tint, typing a step jumps to it, Enter puts it on the stop', async ({ page }) => {
    watch(page, 'a Pro designer tinting a gradient stop with the keyboard')
    await openGradientTool(page)
    const before = (await stopButton(page, 2).innerText()).match(/#[0-9A-F]{6}/)[0]

    await stopButton(page, 2).click({ button: 'right' })
    const menu = tintsMenu(page, 2)
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveCount(11)
    await expect(menu, 'a right-click opens on the panel').toBeFocused()

    const rows = await menu.getByRole('menuitem').evaluateAll((els) => els.map((el) => {
      const hex = el.getAttribute('aria-label').match(/#[0-9A-F]{6}/)[0]
      const n = Number.parseInt(hex.slice(1), 16)
      const swatch = getComputedStyle(el.querySelector('.v3m-sw')).backgroundColor
      return { hex, swatch, expected: `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})` }
    }))
    expect(rows.length).toBe(11)
    for (const r of rows) expect(r.swatch, `the swatch for ${r.hex}`).toBe(r.expected)
    expect(new Set(rows.map((r) => r.hex)).size, 'eleven different tints').toBe(11)

    await page.keyboard.press('ArrowDown')
    await expect(menu.locator('[data-tint="50"]'), 'ArrowDown from the panel lands on the first tint').toBeFocused()
    await page.keyboard.press('End')
    await expect(menu.locator('[data-tint="950"]')).toBeFocused()
    await page.keyboard.press('Home')
    await page.keyboard.press('9')
    await expect(menu.locator('[data-tint="900"]'), '9 jumps to 900').toBeFocused()

    const want = rows.find((_, i) => i === 9).hex
    await page.keyboard.press('Enter')
    await expect(menu).toBeHidden()
    await expect(stopButton(page, 2), 'the stop took the 900 tint').toContainText(want)
    expect(want, 'a different colour to the one it had').not.toBe(before)
  })

  // BREAK: in Menu.jsx closeToTrigger (first one, line ~94) change `if (target?.isConnected)` to `if (false)`: Escape closes and focus is lost.
  test('the tints menu: Escape closes it and focus goes back to the Tints button, which says it is expanded while open', async ({ page }) => {
    watch(page, 'a Pro designer opening and leaving the tints menu')
    await openGradientTool(page)
    const button = tintsButton(page)
    const menu = tintsMenu(page)

    await button.focus()
    await page.keyboard.press('Enter')
    await expect(menu).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(menu.locator('[data-tint="50"]'), 'a key open lands on the first tint').toBeFocused()

    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(button).toBeFocused()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})

// ── phone, 390 ──────────────────────────────────────────────────────────────

test.describe('menus at 390', () => {
  test.use({ viewport: PHONE, hasTouch: true })

  // BREAK: in v3-menus.css change `.v3m--sheet .v3m-i{min-height:52px` to 36px.
  test('tapping Copy or save raises a bottom sheet with tall rows and a Cancel block under it', async ({ page }) => {
    watch(page, 'a phone user opening Copy or save')
    await openTintTool(page)
    await exportTrigger(page).tap()

    const menu = exportMenu(page)
    await expect(menu).toBeVisible()
    await expect(page.locator('.v3m--sheet'), 'a phone gets the sheet, not the popover').toBeVisible()
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true })
    await expect(cancel).toBeVisible()

    const vh = await page.evaluate(() => window.innerHeight)
    const c = await box(cancel)
    expect(vh - c.bottom, `Cancel sits ${vh - c.bottom}px off the bottom edge`).toBeLessThanOrEqual(16)
    const m = await box(menu)
    expect(m.bottom, 'the rows sit above the Cancel block').toBeLessThanOrEqual(c.y)
    expect(m.x, 'the sheet is inside the left edge').toBeGreaterThanOrEqual(0)
    expect(m.right, 'the sheet is inside the right edge').toBeLessThanOrEqual(390)
    for (const name of ['Copy CSS', 'Save to project', 'Download', 'Export design system…']) {
      const r = await box(row(menu, name))
      expect(r.h, `${name} is ${r.h}px tall`).toBeGreaterThanOrEqual(48)
    }
    expect(c.h, `Cancel is ${c.h}px tall`).toBeGreaterThanOrEqual(48)
    expect(await noSideways(page), 'the page scrolls sideways under the sheet').toBe(true)
  })

  // BREAK: in Menu.jsx change the Cancel button's onClick `() => closeToTrigger()` to `() => {}`.
  test('Cancel closes the sheet and returns focus to the button that opened it', async ({ page }) => {
    watch(page, 'a phone user changing their mind')
    await openTintTool(page)
    const trigger = exportTrigger(page)
    await trigger.tap()
    await expect(exportMenu(page)).toBeVisible()

    await page.getByRole('button', { name: 'Cancel', exact: true }).tap()
    await expect(anyMenu(page)).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  // BREAK: two things close a sheet on a tap above it, so remove both: the scrim's onClick `onClose?.()`
  // and the document pointerdown listener in Menu.jsx. Either one alone leaves this green.
  test('a tap on the dimmed page above the sheet closes it and runs nothing', async ({ page }) => {
    watch(page, 'a phone user tapping away from a sheet')
    await openTintTool(page)
    await exportTrigger(page).tap()
    const menu = exportMenu(page)
    await expect(menu).toBeVisible()

    await page.touchscreen.tap(195, 40)
    await expect(menu, 'a tap on the scrim closes the sheet').toBeHidden()
    await expect(exportTrigger(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(toastEl(page), 'closing must not run a row').toHaveCount(0)
    await expect(page.locator('#ui-login-title')).toHaveCount(0)
  })

  // BREAK: in ExportMenu.jsx change `onSelect: item.onSelect` to `onSelect: () => {}`: the row closes the sheet and does nothing.
  test('tapping a row in the sheet runs it and closes the sheet', async ({ page }) => {
    watch(page, 'a phone user copying the tint variables')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await openTintTool(page)
    await exportTrigger(page).tap()
    await row(exportMenu(page), 'Copy CSS').tap()

    await expect(anyMenu(page), 'the sheet is gone').toHaveCount(0)
    await expect(page.locator('.v3m-sheetwrap')).toHaveCount(0)
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text, 'the row ran').toContain('--tint-500:')
    await expect(toastEl(page)).toContainText('Copied')
  })

  // BREAK: in v3-menus.css change `.v3m--sheet .v3m-i--compact{min-height:44px}` to 30px.
  test('the tints sheet: eleven swatched rows of 44 or more fit the screen, and a tap puts the tint on the stop', async ({ page }) => {
    watch(page, 'a Pro designer tinting a stop on a phone')
    await openGradientTool(page)
    const before = (await stopButton(page, 1).innerText()).match(/#[0-9A-F]{6}/)[0]
    await tintsButton(page).tap()

    const menu = tintsMenu(page)
    await expect(menu).toBeVisible()
    await expect(page.locator('.v3m--sheet.v3m--tints'), 'the tint menu becomes a sheet too').toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveCount(11)
    await expect(menu.locator('.v3m-sw'), 'a swatch on every row').toHaveCount(11)

    const m = await box(menu)
    const vh = await page.evaluate(() => window.innerHeight)
    expect(m.x).toBeGreaterThanOrEqual(0)
    expect(m.right).toBeLessThanOrEqual(390)
    expect(m.y, 'the sheet is inside the top edge').toBeGreaterThanOrEqual(0)
    expect(m.bottom, 'the sheet is inside the bottom edge').toBeLessThanOrEqual(vh)
    const heights = await menu.getByRole('menuitem').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights.filter((h) => h < 44), 'tint rows under 44px').toEqual([])

    await menu.locator('[data-tint="900"]').scrollIntoViewIfNeeded()
    await menu.locator('[data-tint="900"]').tap()
    await expect(anyMenu(page)).toHaveCount(0)
    const after = (await stopButton(page, 1).innerText()).match(/#[0-9A-F]{6}/)[0]
    expect(after, 'the stop took the tint').not.toBe(before)
    await expect(toastEl(page)).toContainText('Tint 900 applied to stop 1')
  })

  // BREAK: in ProjectActions.jsx change the Archive row's onSelect to `() => {}`: the sheet closes and no toast comes.
  test('the project menu is a sheet: a named menu, Delete… last, and a tap on Archive archives', async ({ page }) => {
    watch(page, 'a phone user archiving a project')
    await openProjectPage(page)
    await actionsTrigger(page).tap()

    const menu = actionsMenu(page)
    await expect(menu).toBeVisible()
    await expect(page.locator('.v3m--sheet')).toBeVisible()
    const items = menu.getByRole('menuitem')
    await expect(items).toHaveCount(10)
    expect(await items.last().textContent()).toContain('Delete…')
    await expect(items.last(), 'Delete… is drawn as the dangerous row').toHaveClass(/v3m-i--danger/)
    const vh = await page.evaluate(() => window.innerHeight)
    const m = await box(menu)
    expect(m.bottom, 'the sheet is inside the bottom edge').toBeLessThanOrEqual(vh)

    await row(menu, 'Archive').scrollIntoViewIfNeeded()
    await row(menu, 'Archive').tap()
    await expect(anyMenu(page)).toHaveCount(0)
    await expect(toastEl(page)).toContainText(`"${NAME}" archived`)
  })

  // BREAK: in v3-menus.css add `min-width:420px` to the `.v3m--sheet{` rule (after `max-width:none;`).
  test('at 320 none of the three menus scrolls the page sideways or leaves the screen', async ({ page }) => {
    watch(page, 'someone on the narrowest phone')
    await page.setViewportSize({ width: 320, height: 640 })
    await signIn(page, { plan: 'pro', projects: 2 })

    const fits = async (menu, what) => {
      await expect(menu, `${what} opens`).toBeVisible()
      await expect(page.locator('.v3m--sheet'), `${what} is a sheet`).toBeVisible()
      expect(await noSideways(page), `${what} scrolls the page sideways at 320`).toBe(true)
      const m = await box(menu)
      expect(m.x, `${what} runs off the left edge`).toBeGreaterThanOrEqual(0)
      expect(m.right, `${what} runs off the right edge`).toBeLessThanOrEqual(320)
      const cancel = await box(page.getByRole('button', { name: 'Cancel', exact: true }))
      expect(cancel.x).toBeGreaterThanOrEqual(0)
      expect(cancel.right, `${what}: Cancel runs off the right edge`).toBeLessThanOrEqual(320)
    }

    await go(page, '/create/tint')
    await exportTrigger(page).tap()
    await fits(exportMenu(page), 'Copy or save')
    await page.keyboard.press('Escape')
    await expect(anyMenu(page)).toHaveCount(0)

    await go(page, '/create/gradient')
    await expect(stopButton(page, 1)).toBeVisible({ timeout: 15000 })
    await tintsButton(page).tap()
    await fits(tintsMenu(page), 'the tints menu')
    await page.keyboard.press('Escape')
    await expect(anyMenu(page)).toHaveCount(0)

    await go(page, '/projects')
    await openProjectFromDashboard(page, NAME)
    await expect(actionsTrigger(page)).toBeVisible()
    await actionsTrigger(page).tap()
    await fits(actionsMenu(page), 'the project menu')
  })
})
