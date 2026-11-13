// The /projects dashboard below 1200px: the tablet (768 to 1199) and the phone (under 768), the phone in a REAL
// touch context (hasTouch + isMobile, so the coarse-pointer rules and the mobile viewport apply).
// 141-dashboard-layout holds the desktop boxes; 52-user-home reads what each part says and does.
//
//   phone   the four parts as a 2 x 2 of 120px plates; the head pill gone and a docked bar holding the 44px
//           pill; the bar hidden while a popover is open; the name form a sheet in the flow; New project a
//           44px plus; minis one to a row; the shelf's palettes two across; 44px targets; the 360px and
//           320px rules; the Tints ramp unrolling once the part is 60% in view
//   tablet  the same 2 x 2 sheet with wider gutters, minis two to a row, no sideways scroll across the band
//
// Every number is worked out by hand from the board's rules, not read back from the page:
//   gutter 16 below 768 and 40 from 768; sheet padding 16 side on a phone, 24 on a tablet; kit gap 12;
//   390: sheet 390 - 32 = 358, inner 326, plate (326 - 12) / 2 = 157;  320: sheet 288, inner 256, plate 122;
//   768: sheet 768 - 80 = 688, inner 640, plate 314;  1024: sheet 944, inner 896, plate 442;
//   minis: phone one column 358 wide, 168 tall, 72 strip; tablet two across, (688 - 24) / 2 = 332 x 200;
//   shelf palettes on a phone: (358 - 12) / 2 = 173 wide, 120 tall.
//
// MUTATION (each made, the named test went red, then put back byte for byte):
//   dashboard.css   `.db-kit .db-plate { height: 120px }` -> 100px                 -> "the four parts are a 2 x 2 of 120px plates"
//   dashboard.css   `.db-head .db-go { display: none }` removed                    -> "the head pill is gone ..."
//   dashboard.css   `.db:has(.db-pop) .db-bar` rule removed                        -> "the docked bar hides while the name sheet is open"
//   dashboard.css   `.db-minis` single column -> two                               -> "minis are one to a row ..."
//   dashboard.css   `.db-newwrap .db-ghost { width: 44px }` -> 30px                -> "New project is a 44px plus"
//   dashboard.css   `.db-opent { display: inline-flex; min-height: 44px ... }` in the coarse 359 block -> `display: inline` -> "Open project is a 44px target on touch at 320 / 340 / 359px"
//   dashboard.css   `.db-name` line-clamp / white-space: normal in the phone block removed -> "a lead name that does not fit one line wraps to two ..."
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { MINUTE, ago, complete, half, noTints, many } from './fixtures/dashboard-projects.js'

const LONG_NAME = 'A very long project name that has to be cut short rather than push the page sideways'
const LEAD = () => complete('p-done', 'Violet Lime', ago(10 * MINUTE))
const FREE = () => [LEAD(), half()]
const PRO = () => [LEAD(), half(), ...many(5)]

const sheetOf = (page, name) => page.getByRole('region', { name })
const shelfOf = (page) => page.getByRole('region', { name: 'Tools and library' })

/**
 * Boxes in document coordinates, rounded to whole pixels. evaluateAll does not wait, and the dashboard shows
 * its "Loading your projects" skeleton until the projects arrive (that passes expectRendered), so wait for the
 * first match to be in the page before measuring. A locator that never matches still gives [] after the wait,
 * so a missing part still fails its own length or [0] check.
 */
const boxes = async (locator) => {
  await locator.first().waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {})
  return locator.evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }
  }))
}
const distinct = (list) => new Set(list).size
const overflowOf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const withExports = (page) => page.addInitScript(() => {
  try {
    const at = Date.now()
    localStorage.setItem('vs-recent-exports', JSON.stringify(
      ['one', 'two', 'three', 'four'].map((w, i) => ({
        id: `e${i}`, tool: 'palette', toolLabel: 'Palette Builder', format: 'CSS', filename: `${w}-tokens.css`, bytes: 2048, at: at - (5 + i * 10) * 60 * 1000, projectId: null,
      })),
    ))
  } catch { /* private mode */ }
})

/** A phone in a real touch context, signed in, on /projects. Closes the context after `run`. */
async function onPhone(browser, size, run, opts = {}) {
  const { plan = 'free', projects = FREE(), noName = false, reducedMotion } = opts
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, hasTouch: true, isMobile: true, locale: 'en-AU',
    ...(reducedMotion ? { reducedMotion } : {}),
  })
  try {
    const page = await context.newPage()
    watch(page, `a thumb on a ${size.width}px phone`)
    await withExports(page)
    await signIn(page, { plan, projects, noName })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await run(page)
  } finally {
    await context.close()
  }
}

const PHONE = { width: 390, height: 844 }
const LEAD_SHEET = 'Violet Lime, latest project'

test.describe('on a 390px phone, in a real touch context', () => {
  test('the four parts are a 2 x 2 of 120px plates, 157 wide, 12 apart', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const sheet = sheetOf(page, LEAD_SHEET)
      const [box] = await boxes(sheet)
      expect(box.w, 'sheet width').toBe(358)
      const plates = await boxes(sheet.locator('.db-kit > .db-part > .db-plate'))
      expect(plates.length).toBe(4)
      for (const p of plates) expect([p.w, p.h]).toEqual([157, 120])
      expect(distinct(plates.map((p) => p.x)), 'two columns').toBe(2)
      expect(distinct(plates.map((p) => p.y)), 'two rows').toBe(2)
      const [a, b] = [plates[0], plates[1]]
      expect(b.x - (a.x + a.w), 'gap between the columns').toBe(12)
      expect(await overflowOf(page), 'no sideways scroll').toBe(0)
    })
  })

  test('the head pill is gone and a docked bar holds the 44px pill, on screen at the top and at the foot of the page', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const sheet = sheetOf(page, LEAD_SHEET)
      await expect(sheet.getByRole('link', { name: /^Continue:/ }), 'the sheet head keeps no pill on a phone').toBeHidden()
      const bar = page.locator('.db-bar').getByRole('link', { name: /^Continue:/ })
      await expect(bar).toBeVisible()
      await expect(bar).toBeInViewport()
      const [pill] = await boxes(bar)
      expect([pill.w, pill.h], 'the pill is the bar\'s width less the gutters, 44 tall').toEqual([358, 44])
      const look = await page.locator('.db-bar').evaluate((el) => {
        const cs = getComputedStyle(el)
        return { position: cs.position, bg: cs.backgroundColor, shadow: cs.boxShadow, blur: cs.backdropFilter }
      })
      expect(look.position).toBe('sticky')
      expect(look.bg, 'solid, not see-through').not.toMatch(/rgba\(.*, 0\)|transparent/)
      expect(look.shadow, 'no shadow').toBe('none')
      expect(look.blur, 'no blur').toBe('none')

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await expect(bar, 'the bar stays on screen at the foot of the page').toBeInViewport()
    })
  })

  test('the docked bar hides while the name sheet is open', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const bar = page.locator('.db-bar')
      await expect(bar).toBeVisible()
      await page.getByRole('button', { name: 'Add your name' }).click()
      await expect(page.getByRole('dialog', { name: 'Your first name' })).toBeVisible()
      await expect(bar, 'a popover is open: the bar steps aside').toBeHidden()
      await page.keyboard.press('Escape')
      await expect(bar).toBeVisible()
    }, { noName: true })
  })

  test('the name sheet sits in the flow, keeps focus, and Escape returns it to the button', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const ask = page.getByRole('button', { name: 'Add your name' })
      await ask.click()
      const form = page.getByRole('dialog', { name: 'Your first name' })
      await expect(form).toBeVisible()
      await expect(form.getByRole('textbox', { name: 'Your first name' })).toBeFocused()
      expect(await form.evaluate((el) => getComputedStyle(el).position), 'a sheet in the flow, not floating').toBe('static')
      // The sheet opens at scale(.97) and settles over 180ms; measure the box once the animation has finished,
      // not mid-way (44px x .97 reads as 43).
      await form.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
      const [save] = await boxes(form.getByRole('button', { name: 'Save', exact: true }))
      expect(save.h, 'Save is a thumb target').toBeGreaterThanOrEqual(44)
      await page.keyboard.press('Escape')
      await expect(form).toHaveCount(0)
      await expect(ask).toBeFocused()

      await ask.click()
      await expect(form).toBeVisible()
      const inside = await form.locator('input, button').count()
      for (let i = 0; i < inside; i += 1) await page.keyboard.press('Tab')
      await expect(form, 'tabbing out of the sheet closes it').toHaveCount(0)
    }, { noName: true })
  })

  test('New project is a 44px plus that is still named New project', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const [plus] = await boxes(page.getByRole('button', { name: 'New project' }).first())
      expect([plus.w, plus.h]).toEqual([44, 44])
    })
  })

  test('minis are one to a row, 358 x 168 under a 72px strip, 12 apart', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const minis = await boxes(page.getByTestId('other-projects').getByRole('link'))
      expect(minis.length, 'four show before Show all').toBe(4)
      for (const m of minis) expect([m.w, m.h]).toEqual([358, 168])
      expect(distinct(minis.map((m) => m.x)), 'one column').toBe(1)
      for (let i = 1; i < minis.length; i += 1) expect(minis[i].y - (minis[i - 1].y + minis[i - 1].h), `gap before mini ${i + 1}`).toBe(12)
      const [strip] = await boxes(page.getByTestId('other-projects').locator('.db-strip').first())
      expect(strip.h).toBe(72)
    }, { plan: 'pro', projects: PRO() })
  })

  test('the shelf\'s palettes are two across, 173 x 120', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const swatches = await boxes(shelfOf(page).locator('.db-dp'))
      expect(swatches.length).toBe(4)
      for (const s of swatches) expect([s.w, s.h]).toEqual([173, 120])
      expect(distinct(swatches.map((s) => s.x)), 'two columns').toBe(2)
    }, { plan: 'pro', projects: PRO() })
  })

  test('the touch targets are 44px: the pill, Open project, Find, Show all and each export row', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const sizes = {
        pill: await boxes(page.locator('.db-bar').getByRole('link', { name: /^Continue:/ })),
        open: await boxes(sheetOf(page, LEAD_SHEET).locator('.db-head').getByRole('link', { name: /^Open project/ })),
        find: await boxes(page.getByTestId('project-find')),
        showAll: await boxes(page.getByRole('button', { name: /^Show all/ })),
        rows: await boxes(shelfOf(page).locator('.db-files > li')),
      }
      for (const [what, list] of Object.entries(sizes)) {
        expect(list.length, `${what} is drawn`).toBeGreaterThan(0)
        for (const b of list) expect(b.h, `${what} height`).toBeGreaterThanOrEqual(44)
      }
    }, { plan: 'pro', projects: PRO() })
  })

  test('a long project name wraps inside the sheet and the page does not scroll sideways', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const sheet = sheetOf(page, `${LONG_NAME}, latest project`)
      const [box] = await boxes(sheet)
      const [name] = await boxes(sheet.getByRole('heading', { level: 2 }))
      expect(name.x + name.w, 'the name stays inside the sheet').toBeLessThanOrEqual(box.x + box.w)
      expect(await overflowOf(page)).toBe(0)
    }, { projects: [complete('p-long', LONG_NAME, ago(10 * MINUTE)), half()] })
  })

  for (const width of [360, 320]) {
    test(`no sideways scroll at ${width}px`, async ({ browser }) => {
      await onPhone(browser, { width, height: 700 }, async (page) => {
        expect(await overflowOf(page)).toBe(0)
      }, { plan: 'pro', projects: PRO() })
    })
  }

  test('at 320px the plates are 122 wide and Open project is a text link, not a button', async ({ browser }) => {
    await onPhone(browser, { width: 320, height: 700 }, async (page) => {
      const sheet = sheetOf(page, LEAD_SHEET)
      const plates = await boxes(sheet.locator('.db-kit > .db-part > .db-plate'))
      for (const p of plates) expect([p.w, p.h]).toEqual([122, 120])
      await expect(sheet.locator('.db-head .db-ghost'), 'the button form is not drawn').toBeHidden()
      await expect(sheet.locator('.db-opent'), 'the text link is').toBeVisible()
      await expect(sheet.getByRole('link', { name: /^Open project/ }).filter({ visible: true }).first()).toHaveAttribute('href', '/projects/p-done')
    })
  })

  for (const width of [320, 340, 359]) {
    test(`Open project is a 44px target on touch at ${width}px`, async ({ browser }) => {
      await onPhone(browser, { width, height: 700 }, async (page) => {
        const [link] = await boxes(sheetOf(page, LEAD_SHEET).locator('.db-opent'))
        expect(link.h, 'Open project height').toBeGreaterThanOrEqual(44)
        expect(link.w, 'Open project width').toBeGreaterThanOrEqual(44)
        expect(await overflowOf(page), 'no sideways scroll').toBe(0)
      })
    })
  }

  test('at 360px Open project is the 44px button and the text link is not drawn', async ({ browser }) => {
    await onPhone(browser, { width: 360, height: 700 }, async (page) => {
      const sheet = sheetOf(page, LEAD_SHEET)
      await expect(sheet.locator('.db-opent'), 'the text link is for 320-359').toBeHidden()
      const [button] = await boxes(sheet.locator('.db-head .db-ghost'))
      expect(button.h).toBeGreaterThanOrEqual(44)
    })
  })

  test('a lead name that does not fit one line wraps to two, and a short one stays on one', async ({ browser }) => {
    const lines = (heading) => heading.evaluate((el) => {
      const cs = getComputedStyle(el)
      return Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight))
    })
    await onPhone(browser, PHONE, async (page) => {
      const name = sheetOf(page, 'Shallow End, latest project').getByRole('heading', { level: 2 })
      expect(await lines(name), 'Shallow End on 390').toBe(2)
      expect(await overflowOf(page)).toBe(0)
    }, { projects: [complete('p-shallow', 'Shallow End', ago(10 * MINUTE)), half()] })
    await onPhone(browser, PHONE, async (page) => {
      const name = sheetOf(page, 'Violet, latest project').getByRole('heading', { level: 2 })
      expect(await lines(name), 'a short name on 390').toBe(1)
    }, { projects: [complete('p-short', 'Violet', ago(10 * MINUTE)), half()] })
  })

  test('the Tints ramp unrolls once the part is 60% in view, and with reduced motion it only fades', async ({ browser }) => {
    await onPhone(browser, { width: 390, height: 600 }, async (page) => {
      const tints = sheetOf(page, 'Offcut, latest project').locator('.db-tn')
      const ramp = tints.locator('.db-ramp:not(.rest)')
      await expect(tints, 'below the fold: not played').not.toHaveClass(/\bplay\b/)
      expect(await ramp.evaluate((el) => getComputedStyle(el).clipPath), 'rolled up before').toMatch(/inset\(0px 0px 100%/)
      await tints.scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy(0, 150))
      await expect(tints).toHaveClass(/\bplay\b/)
      await expect.poll(() => ramp.evaluate((el) => getComputedStyle(el).clipPath), { message: 'unrolled after' }).toMatch(/inset\(0px\)|inset\(0%\)|none/)
    }, { projects: [noTints()] })

    await onPhone(browser, { width: 390, height: 600 }, async (page) => {
      const tints = sheetOf(page, 'Offcut, latest project').locator('.db-tn')
      await tints.scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy(0, 150))
      await expect(tints).toHaveClass(/\bplay\b/)
      const ramp = tints.locator('.db-ramp:not(.rest)')
      expect(await ramp.evaluate((el) => getComputedStyle(el).clipPath), 'no clip movement under reduced motion').toBe('none')
      await expect.poll(() => ramp.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    }, { projects: [noTints()], reducedMotion: 'reduce' })
  })
})

test.describe('on a tablet', () => {
  const open = async (page, width, opts = {}) => {
    watch(page, `a designer on a ${width}px screen`)
    await page.setViewportSize({ width, height: 1024 })
    await withExports(page)
    await signIn(page, { plan: opts.plan || 'pro', projects: opts.projects || PRO() })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
  }

  test('at 768px the parts are a 2 x 2 of 314 x 120 plates inside a 688px sheet', async ({ page }) => {
    await open(page, 768)
    const sheet = sheetOf(page, LEAD_SHEET)
    const [box] = await boxes(sheet)
    expect(box.w).toBe(688)
    const plates = await boxes(sheet.locator('.db-kit > .db-part > .db-plate'))
    for (const p of plates) expect([p.w, p.h]).toEqual([314, 120])
    expect(distinct(plates.map((p) => p.x)), 'two columns').toBe(2)
    expect(distinct(plates.map((p) => p.y)), 'two rows').toBe(2)
  })

  test('at 768px the minis are two across, 332 x 200, 24 apart', async ({ page }) => {
    await open(page, 768)
    const minis = await boxes(page.getByTestId('other-projects').getByRole('link'))
    expect(minis.length).toBe(4)
    for (const m of minis) expect([m.w, m.h]).toEqual([332, 200])
    expect(distinct(minis.map((m) => m.x)), 'two columns').toBe(2)
    expect(distinct(minis.map((m) => m.y)), 'two rows').toBe(2)
    expect(minis[1].x - (minis[0].x + minis[0].w), 'column gap').toBe(24)
    expect(minis[2].y - (minis[0].y + minis[0].h), 'row gap').toBe(24)
  })

  test('at 1024px the parts are a 2 x 2 of 442 x 120 plates, and the docked bar is still the only pill', async ({ page }) => {
    await open(page, 1024)
    const sheet = sheetOf(page, LEAD_SHEET)
    const plates = await boxes(sheet.locator('.db-kit > .db-part > .db-plate'))
    for (const p of plates) expect([p.w, p.h]).toEqual([442, 120])
    await expect(sheet.getByRole('link', { name: /^Continue:/ })).toBeHidden()
    await expect(page.locator('.db-bar').getByRole('link', { name: /^Continue:/ })).toBeVisible()
  })

  for (const width of [768, 1024, 1199]) {
    test(`no sideways scroll at ${width}px`, async ({ page }) => {
      await open(page, width)
      expect(await overflowOf(page)).toBe(0)
    })
  }

  test('at 1200px the desktop sheet takes over: four parts in a row and no docked bar', async ({ page }) => {
    await open(page, 1200)
    const sheet = sheetOf(page, LEAD_SHEET)
    const parts = await boxes(sheet.locator('.db-kit > .db-part'))
    expect(distinct(parts.map((p) => p.y)), 'one row').toBe(1)
    await expect(page.locator('.db-bar')).toBeHidden()
    await expect(sheet.getByRole('link', { name: /^Continue:/ })).toBeVisible()
  })
})
