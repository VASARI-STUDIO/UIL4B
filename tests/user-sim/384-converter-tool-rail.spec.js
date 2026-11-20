// FILE CONVERTER, VIDEO TAB: THE TOOL RAIL.
//
// The Video tab's settings are split into groups of edits (Clip, Crop, Turn,
// Time, Size), one open at a time, picked from a rail. A group that holds an
// edit wears a small mark. On a phone the rail is a pinned row of at most five
// slots, the fifth being "More", which opens a sheet of the groups left over.
//
// Each test drives the rail the way a visitor does and reads what the screen
// then says. No encode is run.
//
// The clip is recorded in the page, and a recorded webm carries no length, so
// the Clip group (which needs one) is not on screen here: the tests expect it
// only when the page shows a Duration.
//
// MUTATIONS (each makes a test below go red):
//   - ToolRail.jsx: drop `role="tab"` from the buttons -> "the rail is a tablist" goes red.
//   - ToolRail.jsx, onKey: do nothing for ArrowDown/ArrowRight -> "arrow keys" goes red.
//   - FileConverter.jsx, panel(): drop `hidden={openGroup !== id}` -> "one group's controls at a time" goes red.
//   - railGroups.js, groupMarks(): return all false -> "a group holding an edit wears a mark" goes red.
//   - railGroups.js, PHONE_DIRECT: add 'turn' -> "the phone row holds at most five slots" goes red.
//   - file-converter.css: give .fc-rail--bar .fc-rail-tab a min-width of 90px -> the 320 sideways test goes red.
//   - ToolRail.jsx, MoreSheet: drop `useModalDialog(onClose)` -> the Escape and focus-trap tests go red.
//   - file-converter.css: take `bottom` off .fc-rail--bar -> "sits above the Convert bar" goes red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { openGroup } from './converter-rail-helpers.js'

const PERSONA = 'someone editing a clip with the tool rail'

async function openVideoWithClip(page) {
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Video', exact: true }).click()
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
    const c = canvas.getContext('2d')
    const rec = new MediaRecorder(canvas.captureStream(10)); const chunks = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise((r) => { rec.onstop = r })
    rec.start()
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#1c40f2' : '#f24040'; c.fillRect(0, 0, 64, 64); await new Promise((r) => setTimeout(r, 100)) }
    rec.stop(); await stopped
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  })
  await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from(clip) })
  await expect(page.getByRole('tablist', { name: 'Edit tools' }), 'the clip never loaded').toBeVisible({ timeout: 15000 })
}

const rail = (page) => page.getByRole('tablist', { name: 'Edit tools' })
const tabs = (page) => rail(page).getByRole('tab')
/** The tab names with the spoken ", edited" taken off. */
const names = async (page) => (await tabs(page).allInnerTexts()).map(t => t.replace(/,?\s*edited$/i, '').trim())
const panelsShown = (page) => page.locator('.fc-inspector [role="tabpanel"]:not([hidden])')

test.describe('the tool rail at 1440', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await openVideoWithClip(page)
  })

  test('the rail is a tablist of the groups that have controls, in pipeline order, with none greyed out', async ({ page }) => {
    const got = await names(page)
    const known = ['Clip', 'Crop', 'Turn', 'Time', 'Size']
    expect(got, 'the groups are not in pipeline order').toEqual(known.filter(n => got.includes(n)))
    for (const n of ['Crop', 'Turn', 'Time', 'Size']) expect(got, `${n} is missing from the rail`).toContain(n)
    expect(got, 'Look has no control yet and must be absent').not.toContain('Look')
    expect(got, 'Add has no control yet and must be absent').not.toContain('Add')
    for (const tab of await tabs(page).all()) await expect(tab).toBeEnabled()
    await expect(page.locator('[role="tab"][aria-selected="true"][data-group]')).toHaveCount(1)
  })

  test('the rail sits left of the stage', async ({ page }) => {
    const r = await rail(page).evaluate(el => el.closest('.fc-rail').getBoundingClientRect().toJSON())
    const stage = await page.locator('.fc-bench-main').evaluate(el => el.getBoundingClientRect().toJSON())
    expect(r.right, 'the rail overlaps the stage').toBeLessThanOrEqual(stage.left + 1)
  })

  test('one group\'s controls at a time, and each tab names the panel it opens', async ({ page }) => {
    await openGroup(page, 'Crop')
    await expect(panelsShown(page)).toHaveCount(1)
    await expect(page.getByRole('radiogroup', { name: 'Shape' })).toBeVisible()
    await expect(page.getByLabel('Frame rate (fps)')).toBeHidden()

    await openGroup(page, 'Size')
    await expect(panelsShown(page)).toHaveCount(1)
    await expect(page.getByLabel('Frame rate (fps)')).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Shape' })).toBeHidden()

    const tab = page.getByRole('tab', { name: /^Size\b/ })
    const panelId = await tab.getAttribute('aria-controls')
    await expect(page.locator(`#${panelId}`)).toHaveAttribute('role', 'tabpanel')
    await expect(page.locator(`#${panelId}`)).toBeVisible()
  })

  test('the output format stays on screen whichever group is open', async ({ page }) => {
    for (const group of ['Crop', 'Turn', 'Time', 'Size']) {
      await openGroup(page, group)
      await expect(page.locator('#fc-vid-format'), `Output format vanished under ${group}`).toBeVisible()
    }
  })

  test('every Video setting is still reachable, in its group', async ({ page }) => {
    await openGroup(page, 'Crop')
    await expect(page.getByRole('radiogroup', { name: 'Shape' })).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Cut-out' })).toBeVisible()
    await page.getByRole('radiogroup', { name: 'Shape' }).getByRole('radio', { name: 'Custom', exact: true }).click()
    for (const label of ['Left (px)', 'Top (px)', 'Height (px)']) await expect(page.getByLabel(label)).toBeVisible()
    await expect(page.locator('#fc-vid-box-w')).toBeVisible()
    await page.getByRole('radiogroup', { name: 'Shape' }).getByRole('radio', { name: '16:9' }).click()
    await expect(page.getByRole('radiogroup', { name: 'Crop or fit' })).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Position' })).toBeVisible()

    await openGroup(page, 'Turn')
    await expect(page.getByRole('radiogroup', { name: 'Turn' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Flip horizontal' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Flip vertical' })).toBeVisible()

    await openGroup(page, 'Time')
    await expect(page.getByRole('radiogroup', { name: 'Speed' })).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Direction' })).toBeVisible()

    await openGroup(page, 'Size')
    await expect(page.getByLabel('Frame rate (fps)')).toBeVisible()
    await expect(page.locator('#fc-vid-loop')).toBeVisible()
    await expect(page.locator('#fc-vid-width')).toBeVisible()
    // The default output is a GIF: its colours and dither show, and Quality does not.
    await expect(page.locator('#fc-vid-colours')).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Dither' })).toBeVisible()
  })

  test('arrow keys, Home and End move between the tabs and open the group, with one Tab stop', async ({ page }) => {
    const all = await names(page)
    await openGroup(page, all[0])
    await page.getByRole('tab', { name: new RegExp(`^${all[0]}\\b`) }).focus()
    const stops = await page.locator('[role="tab"][data-group][tabindex="0"]').count()
    expect(stops, 'the rail has more than one Tab stop').toBe(1)

    await page.keyboard.press('ArrowDown')
    const second = page.getByRole('tab', { name: new RegExp(`^${all[1]}\\b`) })
    await expect(second).toBeFocused()
    await expect(second).toHaveAttribute('aria-selected', 'true')
    await expect(panelsShown(page)).toHaveAttribute('data-group', await second.getAttribute('data-group'))

    // Clip joins the rail late, once the browser has worked out the recorded
    // clip's length, so the first and last tabs are found as each step runs.
    await page.keyboard.press('End')
    const last = tabs(page).last()
    await expect(last).toBeFocused()
    await expect(last).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('ArrowDown')
    await expect(tabs(page).first(), 'the arrows did not wrap round').toBeFocused()

    await page.keyboard.press('ArrowUp')
    await expect(last).toBeFocused()
    await page.keyboard.press('Home')
    await expect(tabs(page).first()).toBeFocused()
  })

  test('a group holding an edit wears a mark, and the mark goes when the edit is undone', async ({ page }) => {
    const timeTab = page.getByRole('tab', { name: /^Time\b/ })
    const turnTab = page.getByRole('tab', { name: /^Turn\b/ })
    await expect(timeTab).not.toHaveAttribute('data-edited', 'true')
    await openGroup(page, 'Time')
    await page.getByRole('radio', { name: 'Double speed' }).click()
    await expect(timeTab, 'Time holds an edit and has no mark').toHaveAttribute('data-edited', 'true')
    await expect(timeTab.locator('.fc-rail-mark')).toBeVisible()
    await expect(timeTab, 'a screen reader is not told it is edited').toHaveAccessibleName('Time, edited')
    await expect(turnTab, 'Turn was not touched but is marked').not.toHaveAttribute('data-edited', 'true')

    const undo = page.locator('.fc-editbar [data-edit="undo"]')
    await expect(undo).toHaveAttribute('aria-disabled', 'false')
    await undo.click()
    await expect(timeTab, 'the mark stayed after the edit was undone').not.toHaveAttribute('data-edited', 'true')
  })

  test('every tab has a visible focus ring and is at least 44 px tall', async ({ page }) => {
    // Focus moves by the rail's own keys, so it is always the keyboard's.
    const count = await tabs(page).count()
    await tabs(page).first().focus()
    await page.keyboard.press('Home')
    const seen = new Set()
    for (let i = 0; i < count; i++) {
      await expect(page.locator(':focus')).toHaveAttribute('role', 'tab')
      const out = await page.evaluate(() => {
        const el = document.activeElement
        const cs = getComputedStyle(el)
        return { name: el.textContent.trim(), style: cs.outlineStyle, w: parseFloat(cs.outlineWidth), h: el.getBoundingClientRect().height }
      })
      seen.add(out.name)
      expect(out.style, `focus draws no ring on ${out.name}`).not.toBe('none')
      expect(out.w).toBeGreaterThanOrEqual(2)
      expect(out.h).toBeGreaterThanOrEqual(44)
      await page.keyboard.press('ArrowRight')
    }
    expect(seen.size, 'the arrow keys skipped a tab').toBe(count)
  })
})

test.describe('the tool rail on a tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true })

  test('the rail is a row above the settings and never scrolls sideways', async ({ page }) => {
    watch(page, PERSONA)
    await openVideoWithClip(page)
    const m = await page.evaluate(() => {
      const bar = document.querySelector('.fc-rail')
      const list = bar.querySelector('[role="tablist"]')
      const insp = document.querySelector('.fc-inspector').getBoundingClientRect()
      const b = bar.getBoundingClientRect()
      return {
        barScroll: bar.scrollWidth - bar.clientWidth,
        listScroll: list.scrollWidth - list.clientWidth,
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        above: b.bottom <= insp.top + 1,
        inside: b.left >= 0 && b.right <= window.innerWidth,
        tabs: [...bar.querySelectorAll('[role="tab"]')].map(t => ({ h: t.getBoundingClientRect().height, r: t.getBoundingClientRect().right })),
        overflowX: getComputedStyle(bar).overflowX,
      }
    })
    expect(m.above, 'the rail is not above the settings').toBe(true)
    expect(m.inside, 'the rail leaves the screen').toBe(true)
    expect(m.barScroll, 'the rail scrolls sideways').toBeLessThanOrEqual(0)
    expect(m.listScroll, 'the tab list scrolls sideways').toBeLessThanOrEqual(0)
    expect(m.page, 'the page scrolls sideways').toBeLessThanOrEqual(0)
    expect(['auto', 'scroll'], 'the rail is a horizontal scroller').not.toContain(m.overflowX)
    for (const t of m.tabs) {
      expect(t.h).toBeGreaterThanOrEqual(43.5)
      expect(t.r).toBeLessThanOrEqual(768)
    }
  })
})

for (const width of [320, 360, 390]) {
  test.describe(`the tool rail on a phone at ${width}px`, () => {
    test.use({ hasTouch: true, isMobile: true })

    test.beforeEach(async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 800 })
      await openVideoWithClip(page)
    })

    test('the phone row holds at most five slots and never scrolls sideways', async ({ page }) => {
      const bar = page.locator('.fc-rail--bar')
      await expect(bar, 'no pinned row on a phone').toBeVisible()
      const m = await bar.evaluate((el) => {
        const slots = [...el.querySelectorAll('[role="tab"], .fc-rail-more')]
        return {
          slots: slots.length,
          scroll: el.scrollWidth - el.clientWidth,
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          overflowX: getComputedStyle(el).overflowX,
          rects: slots.map(s => { const r = s.getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height, w: r.width } }),
          labelsCut: slots.map(s => s.querySelector('.fc-rail-label')).filter(Boolean).map(l => l.scrollWidth - l.clientWidth),
          vw: window.innerWidth,
        }
      })
      expect(m.slots, 'more than five slots').toBeLessThanOrEqual(5)
      expect(m.scroll, `the row scrolls sideways by ${m.scroll}px at ${width}px`).toBeLessThanOrEqual(0)
      expect(m.page, `the page scrolls sideways by ${m.page}px at ${width}px`).toBeLessThanOrEqual(0)
      expect(['auto', 'scroll'], 'the row is a horizontal scroller').not.toContain(m.overflowX)
      for (const r of m.rects) {
        expect(r.l, 'a slot starts off the left edge').toBeGreaterThanOrEqual(-0.5)
        expect(r.r, 'a slot runs off the right edge').toBeLessThanOrEqual(m.vw + 0.5)
        expect(r.h, 'a slot is under 44 px tall').toBeGreaterThanOrEqual(43.5)
        expect(r.w, 'a slot is under 44 px wide').toBeGreaterThanOrEqual(43.5)
      }
      // A label that does not fit is cut with an ellipsis, which scrollWidth reports,
      // so the names of the four direct slots are read here: all of them fit at 320.
      for (const cut of m.labelsCut) expect(cut, 'a slot label is cut short').toBeLessThanOrEqual(1)
    })

    test('the pinned row sits above the Convert bar, which sits above the app tab bar', async ({ page }) => {
      const bar = page.locator('.fc-rail--bar')
      await expect(bar).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, 0))
      const m = await page.evaluate(() => {
        const box = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }
        const convert = document.querySelector('.fc-actionbar .fc-btn--primary').getBoundingClientRect()
        return { rail: box('.fc-rail--bar'), actions: box('.fc-actionbar'), tabbar: box('.pnav-tabs'), convert: { top: convert.top, bottom: convert.bottom }, vh: window.innerHeight }
      })
      expect(m.convert.top, 'Convert is off the top of the screen').toBeGreaterThanOrEqual(0)
      expect(m.convert.bottom, 'Convert is off the bottom of the screen').toBeLessThanOrEqual(m.vh)
      expect(m.rail.bottom, 'the rail row overlaps the Convert bar').toBeLessThanOrEqual(m.actions.top + 1)
      if (m.tabbar) expect(m.actions.bottom, 'the Convert bar sits under the app tab bar').toBeLessThanOrEqual(m.tabbar.top + 1)
    })

    test('More opens one sheet of the remaining groups, traps focus, closes on Escape and gives the focus back', async ({ page }) => {
      const more = page.locator('.fc-rail-more')
      await expect(more, 'no More button on a phone').toBeVisible()
      await more.click()
      const sheet = page.getByRole('dialog', { name: 'More tools' })
      await expect(sheet).toBeVisible()
      await expect(sheet.getByRole('button', { name: /^Turn\b/ }), 'Turn is not in the sheet').toBeVisible()

      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab')
        const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"][aria-label="More tools"]'))
        expect(inside, `Tab ${i + 1} left the sheet`).toBe(true)
      }
      await page.keyboard.press('Shift+Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"][aria-label="More tools"]')), 'Shift+Tab left the sheet').toBe(true)

      await page.keyboard.press('Escape')
      await expect(sheet, 'Escape did not close the sheet').toHaveCount(0)
      await expect(more, 'the focus did not return to More').toBeFocused()
    })

    test('a group picked from the sheet opens, and More shows it is the open one', async ({ page }) => {
      await page.locator('.fc-rail-more').click()
      await page.getByRole('dialog', { name: 'More tools' }).getByRole('button', { name: /^Turn\b/ }).click()
      await expect(page.getByRole('dialog', { name: 'More tools' })).toHaveCount(0)
      await expect(page.getByRole('radiogroup', { name: 'Turn' })).toBeVisible()
      await expect(page.locator('.fc-rail-more')).toHaveAttribute('data-active', 'true')
      await expect(page.locator('.fc-rail-more'), 'More does not say which group is open').toHaveAccessibleName('More, Turn open')
      await expect(page.getByRole('button', { name: 'Flip horizontal' })).toBeVisible()
      await page.getByRole('button', { name: 'Flip horizontal' }).tap()
      await expect(page.locator('.fc-rail-more'), 'More does not show the Turn edit').toHaveAttribute('data-edited', 'true')
      await expect(page.locator('.fc-rail-more')).toHaveAccessibleName('More, Turn open, edited')
    })

    test('a picked group scrolls into view above the pinned row', async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, 0))
      const inView = (id) => page.evaluate((panelId) => {
        const p = document.getElementById(panelId)
        if (!p || p.hidden) return 'hidden'
        const r = p.getBoundingClientRect()
        const rail = document.querySelector('.fc-rail--bar').getBoundingClientRect()
        if (r.top < 0) return `top ${Math.round(r.top)} is off the screen`
        // A group taller than the room above the rail starts at the top of that
        // room, under the pinned header, so its first controls are in view.
        const header = (document.querySelector('[data-tool-toolbar]') ?? document.querySelector('.pnav'))?.getBoundingClientRect().bottom ?? 0
        const tooTall = r.height > rail.top - header
        if (tooTall && r.top > header + 48) return `a tall group starts at ${Math.round(r.top)}, not under the header at ${Math.round(header)}`
        if (!tooTall && r.bottom > rail.top + 1) return `bottom ${Math.round(r.bottom)} is under the rail at ${Math.round(rail.top)}`
        return 'ok'
      }, id)

      await page.locator('.fc-rail-more').click()
      await page.getByRole('dialog', { name: 'More tools' }).getByRole('button', { name: /^Turn\b/ }).click()
      await expect.poll(() => inView('fc-vid-panel-turn'), { message: 'Turn opened off screen' }).toBe('ok')

      await page.evaluate(() => window.scrollTo(0, 0))
      await page.locator('.fc-rail--bar').getByRole('tab', { name: /^Size\b/ }).click()
      await expect.poll(() => inView('fc-vid-panel-size'), { message: 'Size opened off screen' }).toBe('ok')
    })
  })
}
