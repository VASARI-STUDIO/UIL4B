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
