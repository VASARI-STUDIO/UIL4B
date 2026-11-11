// THE ICON EDITOR ANSWERS ESCAPE ONE LAYER AT A TIME, AND ITS PHONE SHEET IS A SHEET YOU CAN USE.
//
// What a person relies on (expected values written out, not read from src):
//   (a) "Save to a project" is a panel inside the editor. Escape closes the panel and leaves the editor
//       open, focus goes back to Save; the next Escape closes the editor and focus goes back to the icon
//       they opened it from. Wide (1440) and on a touch phone (390). Escape with the caret in the panel's
//       project name field closes the panel too.
//   (b) On a phone (390x844 and 320x568) the editor is a bottom sheet: as wide as the screen up to 560px,
//       centred, on the bottom edge, top corners round and bottom corners square, at least 48px of page
//       left above it; every control is a 44px target; Tab stays inside it (and inside the save panel when
//       that is open); nothing runs off the side.
//
// HOW TO SEE EACH FAIL (each was mutated in the built output and watched go red, then restored byte for byte):
//   the editor's Escape handler closes the editor even with the save panel open
//       -> (a) "Escape closes only the save panel ..." at 1440 and 390, and "Escape in the project name field ..."
//   the editor's Escape handler never closes the editor                       -> (a) the second Escape
//   focus is not handed back to the opener when the editor closes             -> (a) "focus goes back to the icon"
//   `.ied` sheet height loses `- max(48px, ...)`                                -> (b) "at least 48px of page above"
//   `.ied-x` height 44px -> 36px on the sheet                                  -> (b) "every control is a 44px target"
//   the editor's Tab handler returns before it wraps focus                    -> (b) "Tab and Shift+Tab stay inside"
//   `.ied-hd` width 130% of the sheet                                          -> (b) "nothing runs off the side"
//
// Also pinned here (c to g):
//   (c) With the dialog itself holding focus (the state on open, and after a press on a blank part of it),
//       Shift+Tab goes to Copy SVG, the last control, and Tab goes to Close, the first. 1440 and 390.
//   (d) The Download formats menu keeps 16px between its edges and the screen's, at 390 (chevron) and 320x568
//       (the Download button itself opens it).
//   (e) 320x568: Download is one button named "Download, choose a format" (aria-haspopup=menu) with no chevron;
//       its menu holds SVG and PNG 24, 48 and 96; PNG 24px downloads `*-24px.png`; Save reads "Save" in full,
//       keeps its accessible name "Save to project" and does not overflow. At 390x844 the chevron is still there.
//   (f) With the save panel open at 1440, a press inside the dialog but outside the panel closes the panel and
//       leaves the editor open; a press inside the panel does not close it.
//   (g) The custom colour picker's Hue slider is 44px high on the phone sheet (390 and 320).
//
// HOW TO SEE (c) TO (g) FAIL (built output patched, run red, restored byte for byte):
//   the Tab trap wraps only when focus is on `first` or `last` (the dialog and outside are not wrap points) -> (c)
//   the folded-foot media query never matches                                  -> (e) all three, (d) at 320x568
//   `.ied-sv .nm-l` no longer hidden on the phone                              -> (e) "Save reads Save"
//   the menu's width is read during its entrance scale (getBoundingClientRect) -> (d) at 390 and 320x568
//   the save panel's mousedown listener loses its capture flag                 -> (f)
//   `.cpk-hue` height 44px -> 24px on touch                                    -> (g)
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'someone saving an icon from the phone sheet and closing it with the keyboard'

const editor = (page) => page.locator('.ied')
const picker = (page) => page.locator('#ied-spn')
const saveBtn = (page) => page.locator('#ied-save')

/** Open the editor on the grid's first icon and wait until Save is live. Returns the cell it came from. */
async function openEditor(page, { plan = 'free', projects = 2 } = {}) {
  if (plan) await signIn(page, { plan, projects })
  await go(page, '/create/icons')
  const cell = page.locator('.ig .ic').first()
  await expect(cell).toBeVisible({ timeout: 20_000 })
  await cell.click()
  await expect(editor(page)).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ied-stage-host svg')).toBeVisible({ timeout: 20_000 })
  await expect(saveBtn(page)).toBeEnabled({ timeout: 20_000 })
  // The sheet slides up as it opens; read nothing until every finite animation has finished.
  await settle(page)
  return cell
}

/** Let every finite animation and transition finish, so a box read now is where it rests. */
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations()
  .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
  .map((a) => a.finished.catch(() => {}))))

const focusInside = (locator) => locator.evaluate((el) => el.contains(document.activeElement))

const WIDE = { viewport: { width: 1440, height: 900 } }
const PHONE_390 = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const PHONE_320 = { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }

for (const [label, ctx] of [['1440', WIDE], ['390', PHONE_390]]) {
  test.describe(`Escape order at ${label}`, () => {
    test.use(ctx)

    test('Escape closes only the save panel, then the editor, and focus goes back to where it came from', async ({ page }) => {
      watch(page, PERSONA)
      const cell = await openEditor(page)
      const opener = await cell.getAttribute('aria-label')
      expect(opener, 'POSITIVE CONTROL: the opening icon is named').toMatch(/^Customise /)

      await saveBtn(page).click()
      await expect(picker(page), 'Save opens the panel').toBeVisible()
      await expect.poll(() => focusInside(picker(page)), 'focus moves into the panel').toBe(true)

      await page.keyboard.press('Escape')
      await expect(picker(page), 'the first Escape closes the panel').toHaveCount(0)
      await expect(editor(page), 'and leaves the editor open').toBeVisible()
      await expect(saveBtn(page), 'focus goes back to Save').toBeFocused()

      await page.keyboard.press('Escape')
      await expect(editor(page), 'the second Escape closes the editor').toHaveCount(0)
      await expect(page.locator('.ig .ic').first(), 'focus goes back to the icon the editor was opened from').toBeFocused()
      await expect(page.locator('.ig .ic').first()).toHaveAttribute('aria-label', opener)
    })

    test('Escape with the caret in the panel\'s project name field closes the panel and not the editor', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      await saveBtn(page).click()
      await picker(page).getByRole('button', { name: /New project/ }).click()
      const field = picker(page).getByLabel('Project name (required)')
      await expect(field).toBeFocused()
      await field.pressSequentially('Brand')

      await page.keyboard.press('Escape')
      await expect(picker(page), 'Escape in the field closes the panel').toHaveCount(0)
      await expect(editor(page), 'and leaves the editor open').toBeVisible()
      await expect(saveBtn(page)).toBeFocused()

      // The panel opens again empty: the half-typed name did not survive the close.
      await saveBtn(page).click()
      await picker(page).getByRole('button', { name: /New project/ }).click()
      await expect(picker(page).getByLabel('Project name (required)')).toHaveValue('')
    })

    test('Escape with focus on a project in the panel closes the panel first', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page, { projects: 2 })
      await saveBtn(page).click()
      await expect(picker(page)).toBeVisible()
      await expect.poll(() => focusInside(picker(page)), 'focus moves into the panel').toBe(true)
      await settle(page)
      const project = picker(page).locator('.ied-pj').first()
      await project.focus()
      await expect(project).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(picker(page)).toHaveCount(0)
      await expect(editor(page)).toBeVisible()
    })
  })
}

for (const [label, ctx] of [['1440', WIDE], ['390', PHONE_390]]) {
  test.describe(`Tab from the dialog itself at ${label}`, () => {
    test.use(ctx)

    test('Shift+Tab from the dialog wraps to Copy SVG, the last control, and stays in the dialog', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      await editor(page).focus()
      await expect(editor(page), 'POSITIVE CONTROL: the dialog itself holds focus').toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByRole('button', { name: 'Copy SVG', exact: true })).toBeFocused()
      expect(await focusInside(editor(page))).toBe(true)
    })

    test('Tab from the dialog goes to Close, the first control', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      await editor(page).focus()
      await expect(editor(page), 'POSITIVE CONTROL: the dialog itself holds focus').toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Close customiser', exact: true })).toBeFocused()
    })

    test('after a press on a blank part of the dialog, Shift+Tab still wraps to Copy SVG', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      await page.locator('#ied-title').click()
      await editor(page).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByRole('button', { name: 'Copy SVG', exact: true })).toBeFocused()
    })
  })
}

test.describe('Escape with no panel open', () => {
  test.use(WIDE)

  test('one Escape closes the editor and focus goes back to the icon it came from', async ({ page }) => {
    watch(page, PERSONA)
    await openEditor(page)
    await page.keyboard.press('Escape')
    await expect(editor(page)).toHaveCount(0)
    await expect(page.locator('.ig .ic').first()).toBeFocused()
  })
})

/** Every control in the editor that a thumb has to hit, with its box. Hidden and zero-size ones are left out. */
const targetsIn = (page) => page.evaluate(() => {
  const SEL = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="radio"], [role="checkbox"], [role="switch"], [role="tab"], [role="slider"], [role="button"]'
  const root = document.querySelector('.ied')
  const seen = new Set()
  const out = []
  for (const el of root.querySelectorAll(SEL)) {
    if (seen.has(el)) continue
    seen.add(el)
    const cs = getComputedStyle(el)
    if (el.getClientRects().length === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue
    if (el.closest('[hidden], [aria-hidden="true"]')) continue
    const b = el.getBoundingClientRect()
    if (b.width === 0 || b.height === 0) continue
    out.push({
      name: (el.getAttribute('aria-label') || el.textContent || el.id || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
      cls: String(el.className).slice(0, 40),
      tag: el.tagName.toLowerCase(),
      w: Math.round(b.width * 10) / 10,
      h: Math.round(b.height * 10) / 10,
    })
  }
  return out
})

/** Press Tab `n` times and Shift+Tab `n` times; return the focused element's place each time. */
async function tabSweep(page, root, n) {
  const where = []
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 1; i <= n; i++) {
      await page.keyboard.press(key)
      where.push({ key, i, inside: await focusInside(root), id: await page.evaluate(() => {
        const a = document.activeElement
        return a === document.body ? 'body' : `${a.tagName.toLowerCase()}#${a.id || ''}.${String(a.className).split(' ')[0]}[${a.getAttribute('aria-label') || a.textContent.trim().slice(0, 20)}]`
      }) })
    }
  }
  return where
}

/** The widest box of anything in the editor that is not inside its own sideways scroller. */
const overflowOf = (page) => page.evaluate(() => {
  const root = document.querySelector('.ied')
  const rb = root.getBoundingClientRect()
  const scrollsSideways = (el) => {
    for (let n = el.parentElement; n && n !== root; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth) return true
    }
    return false
  }
  const loose = []
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.getClientRects().length === 0) continue
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
    const b = el.getBoundingClientRect()
    if (b.width === 0 || b.height === 0) continue
    if (scrollsSideways(el)) continue
    if (b.right > rb.right + 1 || b.left < rb.left - 1) loose.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(b.left)}..${Math.round(b.right)} in ${Math.round(rb.left)}..${Math.round(rb.right)}`)
  }
  const sw = (sel) => { const el = document.querySelector(sel); return el ? { sw: el.scrollWidth, cw: el.clientWidth } : null }
  return {
    page: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
    panel: sw('.ied'), controls: sw('#ied-scroll'), head: sw('.ied-hd'), stage: sw('.ied-stagecol'), foot: sw('.ied-foot-row'),
    loose: loose.slice(0, 8),
  }
})

for (const [label, ctx] of [['390x844', PHONE_390], ['320x568', PHONE_320]]) {
  test.describe(`the phone sheet at ${label}`, () => {
    test.use(ctx)
    const { width: vw, height: vh } = ctx.viewport

    test('it is a bottom sheet: as wide as the screen up to 560px, centred, on the bottom edge, round on top, square below, 48px of page above', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      const b = await editor(page).evaluate((el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return { x: r.x, y: r.y, w: r.width, b: r.bottom, top: parseFloat(cs.borderTopLeftRadius), bottom: parseFloat(cs.borderBottomLeftRadius) }
      })
      expect(Math.round(b.w), 'sheet width').toBe(Math.min(vw, 560))
      expect(Math.abs(b.x + b.w / 2 - vw / 2), 'the sheet is centred').toBeLessThanOrEqual(1)
      expect(Math.round(b.b), 'the sheet sits on the bottom edge').toBe(vh)
      expect(b.top, 'the top corners are rounded').toBeGreaterThan(0)
      expect(b.bottom, 'the bottom corners are square').toBe(0)
      expect(b.y, `at least 48px of page above the sheet (it starts at ${b.y})`).toBeGreaterThanOrEqual(48 - 0.5)
      await expect(page.locator('.ied-gb'), 'the grabber is there').toBeVisible()
    })

    test('every control is a 44px target, with the code open and with the save panel open', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      const small = (list) => list.filter((t) => t.h < 43.5 || t.w < 43.5).map((t) => `${t.tag} "${t.name}" ${t.w}x${t.h}`)

      const closed = await targetsIn(page)
      expect(closed.length, 'POSITIVE CONTROL: the sheet has controls to measure').toBeGreaterThan(15)
      expect(small(closed), 'controls under 44px with the code closed').toEqual([])

      await page.locator('#ied-sec-code .ied-disc').scrollIntoViewIfNeeded()
      await page.locator('#ied-sec-code .ied-disc').click()
      await expect(page.locator('#ied-code .ied-tn')).toBeVisible()
      const opened = await targetsIn(page)
      expect(opened.length, 'opening the code adds its Copy button').toBeGreaterThan(closed.length)
      expect(small(opened), 'controls under 44px with the code open').toEqual([])

      await saveBtn(page).click()
      await expect(picker(page)).toBeVisible()
      await settle(page)
      const inPanel = await picker(page).evaluate((el) => [...el.querySelectorAll('button, a[href], input')].map((c) => {
        const b = c.getBoundingClientRect()
        return { name: (c.getAttribute('aria-label') || c.textContent).trim().slice(0, 40), tag: c.tagName.toLowerCase(), w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }
      }))
      expect(inPanel.length, 'POSITIVE CONTROL: the panel has controls to measure').toBeGreaterThan(3)
      expect(small(inPanel), 'controls under 44px in the save panel').toEqual([])
    })

    test('Tab and Shift+Tab stay inside the sheet, and inside the save panel once it is open', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      await expect.poll(() => focusInside(editor(page)), 'focus starts in the sheet').toBe(true)

      const sheet = await tabSweep(page, editor(page), 60)
      const outside = sheet.filter((s) => !s.inside).map((s) => `${s.key} ${s.i}: ${s.id}`)
      expect(outside, 'focus left the sheet').toEqual([])
      expect(new Set(sheet.map((s) => s.id)).size, 'POSITIVE CONTROL: the sweep visited many controls').toBeGreaterThan(15)

      await saveBtn(page).scrollIntoViewIfNeeded()
      await saveBtn(page).click()
      await expect(picker(page)).toBeVisible()
      await expect.poll(() => focusInside(picker(page))).toBe(true)
      const panel = await tabSweep(page, picker(page), 30)
      const leaked = panel.filter((s) => !s.inside).map((s) => `${s.key} ${s.i}: ${s.id}`)
      expect(leaked, 'focus left the save panel while it was open').toEqual([])
      expect(new Set(panel.map((s) => s.id)).size, 'POSITIVE CONTROL: the panel sweep visited its controls').toBeGreaterThan(3)
    })

    test('nothing runs off the side, with the code open and with the save panel open', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      const fits = (o) => {
        const bad = []
        for (const k of ['page', 'panel', 'controls', 'head', 'stage', 'foot']) {
          if (o[k] && o[k].sw > o[k].cw + 1) bad.push(`${k} scrolls sideways (${o[k].sw} in ${o[k].cw})`)
        }
        return [...bad, ...o.loose]
      }
      expect(fits(await overflowOf(page)), 'sideways overflow, code closed').toEqual([])

      await page.locator('#ied-sec-code .ied-disc').scrollIntoViewIfNeeded()
      await page.locator('#ied-sec-code .ied-disc').click()
      await expect(page.locator('#ied-code pre')).toBeVisible()
      expect(fits(await overflowOf(page)), 'sideways overflow, code open').toEqual([])

      await saveBtn(page).click()
      await expect(picker(page)).toBeVisible()
      await settle(page)
      expect(fits(await overflowOf(page)), 'sideways overflow, save panel open').toEqual([])
    })
  })
}

const formatsMenu = (page) => page.getByRole('menu', { name: 'Download format' })

for (const [label, ctx, trigger] of [
  ['390x844', PHONE_390, { name: 'Download formats', exact: true }],
  ['320x568', PHONE_320, { name: 'Download, choose a format', exact: true }],
]) {
  test.describe(`the Download formats menu at ${label}`, () => {
    test.use(ctx)
    const { width: vw, height: vh } = ctx.viewport

    test('it opens 16px inside the screen on every side', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      await page.getByRole('button', trigger).click()
      await expect(formatsMenu(page)).toBeVisible()
      await expect(formatsMenu(page).getByRole('menuitemradio')).toHaveCount(4)
      await settle(page)
      const b = await formatsMenu(page).evaluate((el) => {
        const r = el.getBoundingClientRect()
        return { l: r.left, r: r.right, t: r.top, b: r.bottom }
      })
      expect(b.l, `menu left edge ${b.l} is under 16px from the screen's left`).toBeGreaterThanOrEqual(16 - 0.5)
      expect(b.r, `menu right edge ${b.r} is under 16px from the screen's right (${vw})`).toBeLessThanOrEqual(vw - 16 + 0.5)
      expect(b.t, 'menu top is off the screen').toBeGreaterThanOrEqual(0)
      expect(b.b, 'menu bottom is off the screen').toBeLessThanOrEqual(vh)
    })
  })
}

test.describe('the foot at 320x568', () => {
  test.use(PHONE_320)

  test('Download is one button that opens the formats menu: SVG and PNG 24, 48 and 96, no chevron', async ({ page }) => {
    watch(page, PERSONA)
    await openEditor(page)
    const download = page.getByRole('button', { name: 'Download, choose a format', exact: true })
    await expect(download, 'exactly one Download button').toHaveCount(1)
    await expect(download).toHaveAttribute('aria-haspopup', 'menu')
    await expect(download).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.ied-ft .dl-more'), 'there is no formats chevron').toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Download (SVG|formats)/ }), 'no second Download control').toHaveCount(0)

    await download.click()
    await expect(download).toHaveAttribute('aria-expanded', 'true')
    await expect(formatsMenu(page)).toBeVisible()
    await expect(formatsMenu(page).getByRole('menuitemradio')).toHaveText([/^SVG/, /^PNG 24px/, /^PNG 48px/, /^PNG 96px/])

    await page.keyboard.press('Escape')
    await expect(formatsMenu(page), 'Escape closes the menu').toHaveCount(0)
    await expect(editor(page), 'and leaves the editor open').toBeVisible()
    await expect(download, 'focus goes back to the Download button').toBeFocused()
    await expect(download).toHaveAttribute('aria-expanded', 'false')
  })

  test('PNG is reachable: PNG 24px downloads a file named *-24px.png', async ({ page }) => {
    watch(page, PERSONA)
    await openEditor(page)
    await page.getByRole('button', { name: 'Download, choose a format', exact: true }).click()
    const row = formatsMenu(page).getByRole('menuitemradio').filter({ hasText: /^PNG 24px/ })
    await expect(row).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), row.click()])
    expect(download.suggestedFilename()).toMatch(/^[a-z0-9-]+-24px\.png$/)
  })

  test('Save reads "Save", keeps its full accessible name, and nothing in the foot overflows', async ({ page }) => {
    watch(page, PERSONA)
    await openEditor(page)
    await expect(saveBtn(page)).toHaveAccessibleName('Save to project')
    const save = await saveBtn(page).evaluate((el) => {
      const nm = el.querySelector('.nm')
      const shown = [...nm.querySelectorAll('span')].filter((s) => getComputedStyle(s).display !== 'none')
      return {
        text: el.innerText.trim(),
        nmOverflow: nm.scrollWidth - nm.clientWidth,
        shownOverflow: shown.map((s) => s.scrollWidth - s.clientWidth),
        shownCount: shown.length,
      }
    })
    expect(save.text, 'the visible label').toBe('Save')
    expect(save.shownCount, 'one label is drawn').toBe(1)
    expect(save.nmOverflow, 'the label is cut off').toBeLessThanOrEqual(0)
    expect(save.shownOverflow, 'the label is cut off').toEqual([0])

    const foot = await page.evaluate(() => {
      const ft = document.querySelector('.ied-ft')
      const fr = ft.getBoundingClientRect()
      const kids = [...ft.querySelectorAll('button')].filter((b) => b.getClientRects().length > 0)
      const out = kids.filter((b) => { const r = b.getBoundingClientRect(); return r.left < fr.left - 1 || r.right > fr.right + 1 })
      return { sw: ft.scrollWidth, cw: ft.clientWidth, n: kids.length, out: out.length }
    })
    expect(foot.n, 'POSITIVE CONTROL: the foot has its buttons').toBeGreaterThanOrEqual(3)
    expect(foot.sw, 'the foot scrolls sideways').toBeLessThanOrEqual(foot.cw + 1)
    expect(foot.out, 'a foot button runs past the foot').toBe(0)
    await expect(page.getByRole('button', { name: 'Copy SVG', exact: true })).toBeInViewport({ ratio: 1 })
    await expect(saveBtn(page)).toBeInViewport({ ratio: 1 })
  })
})

test.describe('the foot at 390x844', () => {
  test.use(PHONE_390)

  test('Download is still the SVG button with a formats chevron beside it', async ({ page }) => {
    watch(page, PERSONA)
    await openEditor(page)
    await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Download formats', exact: true })).toHaveAttribute('aria-haspopup', 'menu')
    await expect(page.getByRole('button', { name: 'Download, choose a format' })).toHaveCount(0)
  })
})

test.describe('the save panel at 1440', () => {
  test.use(WIDE)

  test('a press inside the dialog but outside the panel closes the panel and leaves the editor open', async ({ page }) => {
    watch(page, PERSONA)
    await openEditor(page)
    await saveBtn(page).click()
    await expect(picker(page)).toBeVisible()
    await settle(page)

    await picker(page).click({ position: { x: 3, y: 3 } })
    await expect(picker(page), 'a press inside the panel keeps it open').toBeVisible()

    await page.locator('.ied-ground').click()
    await expect(picker(page), 'a press on the stage closes the panel').toHaveCount(0)
    await expect(editor(page), 'and leaves the editor open').toBeVisible()
  })

  test('a press on a background choice closes the panel and the choice still lands', async ({ page }) => {
    watch(page, PERSONA)
    await openEditor(page)
    const light = page.getByRole('radiogroup', { name: 'Background', exact: true }).getByRole('radio', { name: 'Light', exact: true })
    await expect(light, 'POSITIVE CONTROL: Light is not the chosen ground yet').not.toBeChecked()
    await saveBtn(page).click()
    await expect(picker(page)).toBeVisible()
    await settle(page)
    await light.click()
    await expect(picker(page)).toHaveCount(0)
    await expect(light).toBeChecked()
    await expect(editor(page)).toBeVisible()
  })
})

for (const [label, ctx] of [['390x844', PHONE_390], ['320x568', PHONE_320]]) {
  test.describe(`the Hue slider at ${label}`, () => {
    test.use(ctx)

    test('is 44px high in the custom colour picker', async ({ page }) => {
      watch(page, PERSONA)
      await openEditor(page)
      await page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { name: 'Custom' }).click()
      const pop = page.getByRole('dialog', { name: 'Custom colour' })
      await expect(pop).toBeVisible()
      const hue = pop.locator('.cpk-hue')
      await expect(hue, 'POSITIVE CONTROL: the Hue control is a slider').toHaveJSProperty('type', 'range')
      await settle(page)
      const box = await hue.boundingBox()
      expect(box.height, `the Hue slider is ${box.height}px high`).toBeGreaterThanOrEqual(43.5)
      expect(box.height, `the Hue slider is ${box.height}px high`).toBeLessThanOrEqual(44.5)
    })
  })
}
