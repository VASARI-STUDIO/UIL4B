// Nav "selected" looks: only the current route looks selected.
//
// What this pins, at 390 (touch), 768 (touch) and 1440 (mouse), in light and dark:
//
//   Desktop Create menu (768 and 1440)
//     · Opening it from a page that is not Palette draws no row as selected:
//       every row has no tile and no bar, none carries aria-current, and focus
//       stays on the trigger. (Cause: a "featured first row" rule lit the first
//       row of every menu; it was neither roving focus nor autofocus.)
//     · On a page that is a menu row, that row, and only that row, has
//       aria-current="page" and the leading bar.
//     · Keyboard focus and hover still light a row (the controls), so the rows
//       are not simply unstyled.
//
//   Phone tab bar and sheet (390)
//     · With the menu sheet open from the Create tab on /projects, only the
//       Dashboard tab (the current route) reads as selected. The Create tab,
//       which is aria-expanded, does not.
//     · Signed out on /create/palette, only the Create tab reads as selected;
//       the You tab matches the other resting tabs, before and after the
//       sign-in dialog opens and closes, with a finger, with a mouse and with
//       the keyboard (the focus ring is a ring, not a selection).
//     · A hovered tab (mouse at 390) differs from the current tab in weight and
//       bar even where the ink is the same.
//
//   Phone menu button and tab bar over the sheet (390)
//     · "Open menu" is drawn 36 x 36 and takes touches within a 44 x 44 area,
//       with a finger and with a mouse at the same width.
//     · A bright block painted under the tab bar does not change a pixel of the
//       bar, and the sheet ends where the bar begins.
//     · From 768 the phone controls are gone.
//
// "Reads as selected" is weight 560 or more, or the bar on the tab's top edge.
// Colour is left out on purpose: a hover inks a tab to the current colour on a
// mouse, and that is allowed so long as weight and bar stay with the current tab.
//
// MUTATIONS (each should fail the named tests, then be put back):
//   · Restore in global.css:
//       .pnav-grid:not(:hover):not(:focus-within) .pnav-tool[data-feat]{background:rgba(var(--ink-rgb),.07)}
//     and give the first row data-feat in PillNav.jsx: "opening the menu draws no
//     row as selected" fails (Palette has a .07 tile) at 768 and 1440.
//   · Remove aria-current from the mega menu rows (isHere in PillNav.jsx): "the
//     row for this page is the only one marked" fails.
//   · Change `.pnav-tab.is-current{...}` back to
//     `.pnav-tab.is-current,.pnav-tab[aria-expanded="true"]{...}`: "with the sheet
//     open, only the current route's tab reads as selected" fails (two tabs).
//   · Add `font-weight:560` to `.pnav-tab[aria-haspopup]` (or give the signed-out
//     You button className 'pnav-tab is-current'): the You-tab tests fail.
//   · Delete the `.pnav-mobile::after` rule inside @media(max-width:767px) in
//     global.css: "takes a tap 20px below its centre with a mouse" fails (the
//     touch context still passes, because a coarse pointer has its own rule).
//   · Put the tab bar back to `background:rgba(var(--page-rgb),.94)` (or add a
//     backdrop-filter): "a bright block under the tab bar does not show through"
//     fails in both themes.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'navsel1')
fs.mkdirSync(SHOTS, { recursive: true })

const PHONE = { name: '390 touch', tag: '390', width: 390, height: 844, touch: true }
const PHONE_MOUSE = { name: '390 mouse', tag: '390m', width: 390, height: 844, touch: false }
const TABLET = { name: '768 touch', tag: '768', width: 768, height: 1024, touch: true }
const DESKTOP = { name: '1440 mouse', tag: '1440', width: 1440, height: 900, touch: false }
const THEMES = ['light', 'dark']
const FREE = { plan: 'free', projects: 1 }

async function openPage(browser, size, theme, who, url) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await ctx.newPage()
  watch(page, `${who ? 'signed in' : 'signed out'} at ${size.name}, ${theme}`)
  await page.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* storage blocked */ } }, theme)
  if (who) await signIn(page, who)
  await go(page, url)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  return { ctx, page }
}

// Viewport only: a full-page capture in a touch context resizes the viewport.
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

const alpha = (css) => {
  const m = /\/\s*([\d.]+)\s*\)/.exec(css) || /rgba\([^)]*,\s*([\d.]+)\)/.exec(css)
  return m ? Number(m[1]) : 1
}

// Every phone tab as the eye reads it.
const readTabs = (page) => page.locator('.pnav-tab').evaluateAll((tabs) => tabs.map((el) => {
  const cs = getComputedStyle(el)
  return {
    label: el.textContent.trim(),
    weight: Number(cs.fontWeight),
    colour: cs.color,
    current: el.getAttribute('aria-current'),
    expanded: el.getAttribute('aria-expanded'),
    bar: getComputedStyle(el, '::before').content !== 'none',
  }
}))
const looksSelected = (t) => t.weight >= 560 || t.bar
const selectedLabels = (tabs) => tabs.filter(looksSelected).map((t) => t.label)

// Every mega menu row as the eye reads it.
const readRows = (page) => page.locator('#pnav-mega .pnav-tool').evaluateAll((rows) => rows.map((el) => {
  const cs = getComputedStyle(el)
  return {
    id: el.getAttribute('data-row-id'),
    tile: cs.backgroundColor,
    bar: cs.boxShadow !== 'none',
    current: el.getAttribute('aria-current'),
    focused: el.matches(':focus'),
  }
}))

async function openCreateMenu(page, size) {
  const trigger = page.locator('.pnav-trigger', { hasText: 'Create' })
  if (size.touch) await trigger.tap()
  else await trigger.click()
  await expect(page.locator('#pnav-mega')).toBeVisible()
  await expect(page.locator('#pnav-mega .pnav-tool').first()).toBeVisible()
  // Let the panel's own entrance finish before anything is read from it.
  await page.waitForTimeout(450)
  return trigger
}

// ── a71a40fbd9: the desktop Create menu ──────────────────────────────────────
for (const size of [TABLET, DESKTOP]) {
  for (const theme of THEMES) {
    test.describe(`Create menu rows at ${size.name}, ${theme}`, () => {
      test('opening it from a page that is not Palette draws no row as selected', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, theme, null, '/discover')
        const trigger = await openCreateMenu(page, size)
        const rows = await readRows(page)
        expect(rows.length, 'the menu lists its rows').toBeGreaterThan(5)
        expect(rows.map((r) => r.id), 'POSITIVE CONTROL: Palette is the first row').toContain('palette')
        for (const row of rows) {
          expect(alpha(row.tile), `${row.id} has a tile behind it`).toBe(0)
          expect(row.bar, `${row.id} has the current-page bar`).toBe(false)
          expect(row.current, `${row.id} is marked as the current page`).toBeNull()
          expect(row.focused, `${row.id} holds focus`).toBe(false)
        }
        // Not roving focus and not autofocus: focus never left the trigger.
        await expect(trigger).toBeFocused()
        await shot(page, `menu-create-open-${size.tag}-${theme}`)
        await ctx.close()
      })

      test('keyboard focus still lights the row it is on (control)', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, theme, null, '/discover')
        const trigger = await openCreateMenu(page, size)
        await trigger.focus()
        await page.keyboard.press('ArrowDown')
        await expect.poll(async () => (await readRows(page)).filter((r) => r.focused).map((r) => r.id)).toEqual(['palette'])
        // The tile fades in on a transition, so wait for it rather than read one frame.
        await expect.poll(async () => (await readRows(page)).filter((r) => alpha(r.tile) > 0).map((r) => r.id),
          { message: 'only the row focus is on is lit' }).toEqual(['palette'])
        expect(await page.locator('#pnav-mega .pnav-tool[data-row-id="palette"]').evaluate((el) => el.matches(':focus-visible')),
          'the ring is keyboard focus-visible').toBe(true)
        await shot(page, `menu-create-keyboard-${size.tag}-${theme}`)
        await ctx.close()
      })
    })
  }
}

test.describe('Create menu rows with a pointer, 1440', () => {
  for (const theme of THEMES) {
    test(`hovering a row lights that row alone (control), ${theme}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, DESKTOP, theme, null, '/discover')
      await openCreateMenu(page, DESKTOP)
      expect(await page.evaluate(() => matchMedia('(hover: hover)').matches), 'this context can hover').toBe(true)
      const target = page.locator('#pnav-mega .pnav-tool[data-row-id="gradient"]')
      await target.hover()
      await expect.poll(async () => (await readRows(page)).filter((r) => alpha(r.tile) > 0).map((r) => r.id)).toEqual(['gradient'])
      await ctx.close()
    })
  }
})

for (const size of [TABLET, DESKTOP]) {
  for (const who of [null, FREE]) {
    test(`the row for this page is the only one marked, ${size.name}, ${who ? 'signed in' : 'signed out'}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, size, 'light', who, '/create/palette')
      await openCreateMenu(page, size)
      const rows = await readRows(page)
      expect(rows.filter((r) => r.current === 'page').map((r) => r.id), 'one row is the current page').toEqual(['palette'])
      const here = rows.find((r) => r.id === 'palette')
      expect(here.bar, 'the current row wears the bar').toBe(true)
      for (const row of rows.filter((r) => r.id !== 'palette')) {
        expect(row.bar, `${row.id} wears the current-page bar`).toBe(false)
        expect(alpha(row.tile), `${row.id} has a tile`).toBe(0)
      }
      await shot(page, `menu-create-on-palette-${size.tag}-${who ? 'in' : 'out'}`)
      await ctx.close()
    })
  }
}

// ── a71a40fbd9: the phone tab bar with the sheet open ────────────────────────
for (const theme of THEMES) {
  for (const who of [null, FREE]) {
    const label = `${theme}, ${who ? 'signed in' : 'signed out'}`
    test.describe(`phone sheet at 390, ${label}`, () => {
      test('with the sheet open, only the current route\'s tab reads as selected', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, PHONE, theme, who, '/projects')
        const before = await readTabs(page)
        expect(selectedLabels(before), 'POSITIVE CONTROL: the bar starts with the current tab drawn').toEqual(['Dashboard'])

        await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
        await expect(page.locator('.pnav-sheet')).toBeVisible()
        await page.waitForTimeout(450)
        const tabs = await readTabs(page)
        const create = tabs.find((t) => t.label === 'Create')
        expect(create.expanded, 'the Create tab is the one that opened the sheet').toBe('true')
        expect(selectedLabels(tabs), 'only one tab reads as selected').toEqual(['Dashboard'])
        expect(tabs.filter((t) => t.current === 'page').map((t) => t.label)).toEqual(['Dashboard'])
        // The opened tab rests like the tabs that are not open.
        const rest = tabs.find((t) => t.label === 'Discover')
        expect(create.colour, 'Create is inked like a resting tab').toBe(rest.colour)
        await shot(page, `sheet-create-from-dashboard-390-${theme}-${who ? 'in' : 'out'}`)
        await ctx.close()
      })

      test('no sheet row is drawn as selected on a touch screen', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, PHONE, theme, who, '/discover')
        await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
        await expect(page.locator('.pnav-sheet')).toBeVisible()
        await page.waitForTimeout(450)
        const rows = await page.locator('.pnav-sheet .pnav-acc-link, .pnav-sheet .pnav-sheet-row').evaluateAll((els) => els.map((el) => ({
          text: el.textContent.trim(),
          tile: getComputedStyle(el).backgroundColor,
          current: el.getAttribute('aria-current'),
        })))
        expect(rows.length).toBeGreaterThan(5)
        for (const row of rows) {
          expect(alpha(row.tile), `${row.text} has a tile`).toBe(0)
          expect(row.current, `${row.text} is marked as the current page`).toBeNull()
        }
        await ctx.close()
      })
    })
  }

  test(`on Create's own page the sheet still shows one selected tab, ${theme}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, PHONE, theme, FREE, '/create/palette')
    expect(selectedLabels(await readTabs(page)), 'the page loads with Create selected').toEqual(['Create'])
    await page.locator('.pnav-tab', { hasText: 'You' }).tap()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await page.waitForTimeout(450)
    const tabs = await readTabs(page)
    expect(tabs.find((t) => t.label === 'You').expanded).toBe('true')
    expect(selectedLabels(tabs), 'You opened the account, Create is still the page').toEqual(['Create'])
    await shot(page, `sheet-account-on-palette-390-${theme}`)
    await ctx.close()
  })
}

// ── ffe77963cb: the You tab when signed out ──────────────────────────────────
for (const theme of THEMES) {
  test.describe(`You tab, signed out on /create/palette at 390, ${theme}`, () => {
    test('only the Create tab reads as selected', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, null, '/create/palette')
      const tabs = await readTabs(page)
      expect(selectedLabels(tabs)).toEqual(['Create'])
      expect(tabs.filter((t) => t.current === 'page').map((t) => t.label)).toEqual(['Create'])
      const you = tabs.find((t) => t.label === 'You')
      const dashboard = tabs.find((t) => t.label === 'Dashboard')
      expect(you.colour, 'You is inked like the other resting tabs').toBe(dashboard.colour)
      expect(you.weight).toBe(dashboard.weight)
      await shot(page, `tabs-signed-out-palette-390-${theme}`)
      await ctx.close()
    })

    test('it still rests after the sign-in dialog opens and a finger dismisses it', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, null, '/create/palette')
      await page.locator('.pnav-tab', { hasText: 'You' }).tap()
      const dialog = page.getByRole('dialog', { name: /log in/i })
      await expect(dialog).toBeVisible()
      await page.getByRole('button', { name: 'Not now' }).tap()
      await expect(dialog).toBeHidden()
      await page.waitForTimeout(300)
      const tabs = await readTabs(page)
      expect(selectedLabels(tabs), 'two tabs read as selected after the dialog closed').toEqual(['Create'])
      const you = tabs.find((t) => t.label === 'You')
      expect(you.colour, 'You was left inked').toBe(tabs.find((t) => t.label === 'Dashboard').colour)
      await shot(page, `tabs-signed-out-after-dialog-390-${theme}`)
      await ctx.close()
    })

    test('it shows a focus ring, not a selection, when the keyboard closes the dialog', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, null, '/create/palette')
      const you = page.locator('.pnav-tab', { hasText: 'You' })
      await you.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('dialog', { name: /log in/i })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: /log in/i })).toBeHidden()
      await expect(you).toBeFocused()
      expect(await you.evaluate((el) => el.matches(':focus-visible')), 'POSITIVE CONTROL: this is keyboard focus').toBe(true)
      expect(await you.evaluate((el) => getComputedStyle(el).outlineStyle), 'the ring is drawn').not.toBe('none')
      const tabs = await readTabs(page)
      expect(selectedLabels(tabs), 'a ring must not also read as the current tab').toEqual(['Create'])
      await shot(page, `tabs-signed-out-focus-ring-390-${theme}`)
      await ctx.close()
    })

    test('with a mouse, hovering You does not draw it as the current tab', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE_MOUSE, theme, null, '/create/palette')
      expect(await page.evaluate(() => matchMedia('(hover: hover)').matches), 'this context can hover').toBe(true)
      const you = page.locator('.pnav-tab', { hasText: 'You' })
      const restColour = (await readTabs(page)).find((t) => t.label === 'You').colour
      await you.hover()
      await expect.poll(async () => (await readTabs(page)).find((t) => t.label === 'You').colour,
        { message: 'POSITIVE CONTROL: a hover inks the tab' }).not.toBe(restColour)
      const tabs = await readTabs(page)
      expect(selectedLabels(tabs), 'hover must not add a second selected tab').toEqual(['Create'])
      await shot(page, `tabs-signed-out-hover-390m-${theme}`)
      await ctx.close()
    })
  })

  test(`signed in on /settings, only You reads as selected, ${theme}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, PHONE, theme, FREE, '/settings')
    const tabs = await readTabs(page)
    expect(selectedLabels(tabs)).toEqual(['You'])
    expect(tabs.filter((t) => t.current === 'page').map((t) => t.label)).toEqual(['You'])
    await shot(page, `tabs-signed-in-settings-390-${theme}`)
    await ctx.close()
  })
}

// ── 42bc9909d2: the Open menu button and the tab bar over the sheet ──────────
for (const size of [PHONE, PHONE_MOUSE]) {
  for (const theme of THEMES) {
    test.describe(`Open menu button at ${size.name}, ${theme}`, () => {
      test('is drawn 36 x 36 and its 44 x 44 area answers at every edge', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, theme, null, '/create/palette')
        const button = page.locator('.pnav-mobile')
        await expect(button).toBeVisible()
        const box = await button.boundingBox()
        expect(box.width, 'the drawn circle keeps its size').toBe(36)
        expect(box.height).toBe(36)
        const hit = await button.evaluate((el) => {
          const area = getComputedStyle(el, '::after')
          const r = el.getBoundingClientRect()
          const cx = r.x + r.width / 2
          const cy = r.y + r.height / 2
          // Just inside the 44px square, outside the 36px circle's bounding box.
          const probes = [[0, -21.5], [0, 21.5], [-21.5, 0], [21.5, 0], [-20, -20], [20, 20]]
          return {
            width: parseFloat(area.width),
            height: parseFloat(area.height),
            reaches: probes.map(([dx, dy]) => {
              const got = document.elementFromPoint(cx + dx, cy + dy)
              return got === el || el.contains(got)
            }),
          }
        })
        expect(hit.width).toBeGreaterThanOrEqual(44)
        expect(hit.height).toBeGreaterThanOrEqual(44)
        expect(hit.reaches, 'every probe inside the 44px square lands on the button').toEqual([true, true, true, true, true, true])
        await shot(page, `open-menu-button-${size.tag}-${theme}`)
        await ctx.close()
      })

      test('takes a tap 20px below its centre', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, theme, null, '/create/palette')
        const box = await page.locator('.pnav-mobile').boundingBox()
        const x = box.x + box.width / 2
        const y = box.y + box.height / 2 + 20
        expect(y, 'the point is outside the drawn circle').toBeGreaterThan(box.y + box.height)
        if (size.touch) await page.touchscreen.tap(x, y)
        else await page.mouse.click(x, y)
        await expect(page.locator('.pnav-sheet')).toBeVisible()
        await expect(page.locator('.pnav-mobile')).toHaveAttribute('aria-expanded', 'true')
        await ctx.close()
      })
    })
  }
}

for (const theme of THEMES) {
  test(`a bright block under the tab bar does not show through, 390, ${theme}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, PHONE, theme, null, '/discover')
    const bar = await page.locator('.pnav-tabs').boundingBox()
    const barClip = { x: bar.x, y: bar.y, width: bar.width, height: bar.height }
    const aboveClip = { x: 0, y: bar.y - 80, width: bar.width, height: 60 }
    const clean = {
      bar: await page.screenshot({ clip: barClip }),
      above: await page.screenshot({ clip: aboveClip }),
    }
    // Sit a solid red slab below the bar's layer (118) and over the page. Text
    // from the sheet (layer 110) is the same kind of thing: anything under the
    // bar must not reach its pixels.
    await page.evaluate(() => {
      const slab = document.createElement('div')
      slab.id = 'under-bar-slab'
      slab.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:160px;z-index:117;background:#ff0000'
      document.body.appendChild(slab)
    })
    await page.waitForTimeout(100)
    const slabbed = {
      bar: await page.screenshot({ clip: barClip }),
      above: await page.screenshot({ clip: aboveClip }),
    }
    expect(slabbed.above.equals(clean.above), 'POSITIVE CONTROL: the slab is painted above the bar').toBe(false)
    expect(slabbed.bar.equals(clean.bar), 'something under the tab bar shows through it').toBe(true)
    const paint = await page.locator('.pnav-tabs').evaluate((el) => {
      const cs = getComputedStyle(el)
      return { background: cs.backgroundColor, filter: cs.backdropFilter || cs.webkitBackdropFilter || 'none' }
    })
    expect(alpha(paint.background), 'the bar\'s fill is solid').toBe(1)
    expect(paint.filter).toBe('none')
    await shot(page, `tabs-over-slab-390-${theme}`)
    await ctx.close()
  })

  test(`the sheet ends where the tab bar begins, 390, ${theme}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, PHONE, theme, null, '/discover')
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await page.waitForTimeout(450)
    const sheet = await page.locator('.pnav-sheet').boundingBox()
    const bar = await page.locator('.pnav-tabs').boundingBox()
    expect(sheet.y + sheet.height, 'no sheet text sits behind the bar').toBeLessThanOrEqual(bar.y + 0.5)
    await shot(page, `sheet-over-tabs-390-${theme}`)
    await ctx.close()
  })
}

// ── from 768 the phone controls are not there ────────────────────────────────
for (const size of [TABLET, DESKTOP]) {
  test(`the phone menu button and tab bar are gone at ${size.name}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, size, 'light', null, '/create/palette')
    await expect(page.locator('.pnav-mobile')).toBeHidden()
    await expect(page.locator('.pnav-tabs')).toBeHidden()
    await shot(page, `no-phone-controls-${size.tag}-light`)
    await ctx.close()
  })
}
