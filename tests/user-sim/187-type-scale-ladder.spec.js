// The Type Scale ladder, panel, phone sheet and default preview width
// (fonts build spec, criteria 10 to 13), the docked bar at
// 390, 768 and 1024+, and source order matching screen order below 1024.
//
// Test seam: the /create/type-scale page itself. Every check reads computed
// styles and geometry in a real browser.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { settleTypeScaleView, showTypeScaleCode, showTypeScalePage } from './type-scale-view.js'

const SIZES = [[1440, 900], [1024, 800], [768, 1024], [390, 844]]

test.describe('Type Scale · ladder, panel, sheet and default width', () => {
  // The ladder draws each step at the width the preview is set to, and prints
  // that size. Written out by hand for the defaults (desktop base 15 and golden
  // ratio 1.618, mobile base 15 and ratio 1.2, joined between 375 and 1440, four
  // steps up and one down): the top step is 102.8 on Desktop, 31.1 on Mobile, and
  // 31.1 + (102.8 - 31.1) x (768 - 375) / (1440 - 375) = 57.56 on Tablet. A
  // window opens on its own device's width. The ladder draws no step above 96px,
  // so the 102.8 step is printed at 102.8 and drawn at 96 with a note saying so.
  const PREVIEW_CAP = 96
  const LARGEST = { 1440: 102.8, 1024: 102.8, 768: 57.56, 390: 31.1 }
  for (const [w, h] of SIZES) {
    test(`10. every step is drawn at the size it prints, for the width the window opens on, unscaled, at ${w}`, async ({ page }) => {
      watch(page, 'designer reading the ladder')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      // The heading rows read "Loading <family>" at 15px until the face is in.
      await expect(page.locator('.tsc-row-text.is-loading')).toHaveCount(0)
      const rows = await page.locator('.tsc-row').evaluateAll(els => els.map(el => {
        const text = el.querySelector('.tsc-row-text')
        const transforms = []
        // From the sample itself up: a scale on the sample is the one that matters.
        for (let n = text; n; n = n.parentElement) {
          const cs = getComputedStyle(n)
          if (cs.transform !== 'none' || (cs.zoom && cs.zoom !== '1')) transforms.push(n.className)
        }
        return { px: parseFloat(el.dataset.px), fs: parseFloat(getComputedStyle(text).fontSize), label: el.querySelector('.tsc-row-num').textContent, transforms }
      }))
      expect(rows, 'four steps up, the base and one down').toHaveLength(6)
      if (w < 768) {
        // A phone prints the scale's own size, the one the code keeps ("102.8px"
        // down to "9.27px"), whatever width the preview is drawn at. The rows are
        // drawn at the Mobile width it opens on (top step 31.1), never above their
        // printed size, and nothing is fitted yet, so there is no note.
        expect(rows.map(r => r.label), `${w}px: rows print the scale's own px`).toEqual(['102.8px', '63.54px', '39.27px', '24.27px', '15px', '9.27px'])
        for (const r of rows) {
          expect(r.label, `${w}px: the label is the step's own size`).toBe(`${r.px}px`)
          expect(r.fs, `${w}px: no step is larger on a phone than on desktop`).toBeLessThanOrEqual(r.px)
          expect(r.transforms, 'nothing is scaled with transform or zoom').toEqual([])
        }
        expect(Math.round(rows[0].fs * 10) / 10, `${w}px: the top step is drawn at the Mobile width's size`).toBe(LARGEST[390])
        await expect(page.locator('.tsc-fit-note')).toHaveCount(0)
        // Desktop width puts the 102.8 step past the cap: drawn at 96, still printed 102.8px.
        await page.locator('#tsc-width').getByRole('button', { name: /Desktop/ }).click()
        await expect(page.locator('.tsc-fit-note')).toHaveText('Preview sizes are fitted between 8px and 96px to keep the preview readable. The code keeps the true values.')
        const top = page.locator('.tsc-row').first()
        await expect(top.locator('.tsc-row-num')).toHaveText('102.8px')
        expect(parseFloat(await top.locator('.tsc-row-text').evaluate(el => getComputedStyle(el).fontSize)), 'a step past the cap is drawn at the cap').toBe(PREVIEW_CAP)
        return
      }
      const printed = rows.map(r => parseFloat(r.label))
      expect(printed[0], `${w}px: the top step prints the size for the previewed width`).toBeCloseTo(LARGEST[w], 2)
      for (const [i, r] of rows.entries()) {
        const drawn = Math.round(r.fs * 100) / 100
        if (printed[i] <= PREVIEW_CAP) {
          expect(r.label, `${w}px: the printed size is the drawn size`).toMatch(new RegExp(`^${drawn} /`))
        } else {
          expect(drawn, `${w}px: a step past the cap is drawn at the cap`).toBe(PREVIEW_CAP)
        }
        expect(r.fs, `${w}px: no step is larger than its desktop size`).toBeLessThanOrEqual(r.px)
        expect(r.transforms, 'nothing is scaled with transform or zoom').toEqual([])
      }
      expect(rows[0].px, 'the top step is 102.8px on desktop').toBe(102.8)
      // The note shows exactly when a step is past the cap.
      const capped = printed.some(n => n > PREVIEW_CAP)
      await expect(page.locator('.tsc-fit-note'), `${w}px: the cap note shows only when a step is capped`).toHaveCount(capped ? 1 : 0)
      if (capped) await expect(page.locator('.tsc-fit-note')).toContainText('fitted between 8px and 96px')
    })
  }

  // The spec's rule is that nothing on a step is cut. The token is the one thing
  // on a row that is set to truncate, so check it reads whole at every width
  // (`--text-base` is the longest).
  for (const [w, h] of SIZES) {
    test(`every token reads whole, never cut with an ellipsis, at ${w}`, async ({ page }) => {
      watch(page, 'designer reading the token names')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      const cut = await page.locator('.tsc-row-name').evaluateAll(els => els
        .map(el => ({ text: el.textContent, over: el.scrollWidth - el.clientWidth }))
        .filter(t => t.over > 0))
      expect(cut, `${w}px: tokens cut short`).toEqual([])
    })
  }

  test('11. the preview opens on the visitor\'s own device size', async ({ page }) => {
    watch(page, 'visitor on a phone, a tablet and a desktop')
    for (const [w, h, want, label] of [[390, 844, 'mobile', 'Mobile'], [768, 1024, 'tablet', 'Tablet'], [1440, 900, 'full', 'Desktop']]) {
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      await expect(page.locator('#tsc-view-panel')).toHaveAttribute('data-width', want)
      // Below the split Page is a tab; at 1440 it is already beside the ladder.
      await showTypeScalePage(page)
      await expect(page.locator('#tsc-width button[aria-pressed="true"]')).toContainText(label)
    }
  })

  for (const [w, h] of SIZES) {
    test(`12. Base and Ratio read in full ink; Base is a native range with a value at ${w}`, async ({ page }) => {
      watch(page, 'designer reading the panel')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      const ink = await page.evaluate(() => getComputedStyle(document.querySelector('.tsc-page')).getPropertyValue('--t0').trim())
      const probe = await page.evaluate(() => {
        const t0 = document.createElement('span')
        t0.style.color = 'var(--t0)'
        document.body.appendChild(t0)
        const full = getComputedStyle(t0).color
        t0.remove()
        const colour = el => getComputedStyle(el).color
        return {
          full,
          base: colour(document.querySelector('#tsc-base + .snapv-value')),
          ratio: colour(document.querySelector('#tsc-ratio')),
          type: document.querySelector('#tsc-base').type,
        }
      })
      expect(ink).not.toBe('')
      expect(probe.type).toBe('range')
      expect(probe.base).toBe(probe.full)
      expect(probe.ratio).toBe(probe.full)
      await expect(page.locator('#tsc-base + .snapv-value')).toHaveText('15 px')
    })
  }

  test('13. the 390 settings sheet is at most 56% of the screen (480px) and the last step can still scroll above it', async ({ page }) => {
    watch(page, 'designer changing a family on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/type-scale')
    // Exact: the sheet's own name ("Families, preview text and fine tuning")
    // also contains these words, so the loose label matches two elements.
    const sample = page.getByLabel('Preview text', { exact: true })
    await sample.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: /Scale, families and fine tuning/ }).click()
    const sheet = page.locator('#tsc-sheet')
    await expect(sheet).toBeVisible()
    await page.getByRole('button', { name: 'Fine tuning', exact: true }).click()
    const sheetBox = () => page.evaluate(() => {
      const box = document.querySelector('#tsc-sheet').getBoundingClientRect()
      return { top: box.top, height: box.height }
    })
    const { top: sheetTop, height: sheetH } = await sheetBox()
    // The sheet is min(56dvh, 480px) tall: 472.64px on an 844px screen.
    expect(sheetH, 'the sheet is capped at 56% of the viewport and 480px').toBeLessThanOrEqual(Math.min(844 * 0.56, 480) + 1)
    expect(sheetTop, 'the sheet leaves the top of the screen showing').toBeGreaterThan(200)
    // The page is one scroll (width, page, ladder), so the sheet must not make the
    // foot of it unreachable: the last step scrolls up clear of the sheet.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const last = await page.locator('.tsc-row').last().evaluate(el => el.getBoundingClientRect().bottom)
    expect(last, 'the last step ends above the sheet').toBeLessThanOrEqual(sheetTop + 1)
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toBeHidden()
  })

  // While the brand kit walkthrough is on, its bar takes the foot of a phone, the
  // tab bar goes, and the docked bar lifts onto the walkthrough's bar. The
  // sheet has to lift with it, or its last controls sit under the docked bar.
  // The tool's own dock keeps the screen's bottom edge and the walkthrough bar
  // sits on it; the sheet ends above both.
  test('13b. with the brand kit bar showing, the 390 sheet ends where the walkthrough bar begins', async ({ page }) => {
    watch(page, 'designer changing a family on a phone, mid walkthrough')
    await page.addInitScript(() => {
      try {
        if (sessionStorage.getItem('__fs_seeded') === '1') return
        sessionStorage.setItem('__fs_seeded', '1')
        localStorage.setItem('vs-uikit-guide', '1')
        localStorage.setItem('vs-uikit-guide-seen', '1')
      } catch { /* private mode */ }
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/type-scale')
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' })).toBeVisible()
    await page.getByRole('button', { name: /Scale, families and fine tuning/ }).click()
    const sheet = page.locator('#tsc-sheet')
    await expect(sheet).toBeVisible()
    const m = await page.evaluate(() => ({
      sheetBottom: document.querySelector('#tsc-sheet').getBoundingClientRect().bottom,
      railTop: document.querySelector('[aria-label="Brand kit walkthrough"]').getBoundingClientRect().top,
      railBottom: document.querySelector('[aria-label="Brand kit walkthrough"]').getBoundingClientRect().bottom,
      vh: window.innerHeight,
    }))
    expect(Math.round(m.sheetBottom), 'the sheet stops at the walkthrough bar, not under it').toBeLessThanOrEqual(Math.round(m.railTop) + 1)
  })

  test('K17 and K19: letter spacing survives Reset, and no step is larger on a phone', async ({ page }) => {
    watch(page, 'designer resetting the scale')
    await go(page, '/create/type-scale')
    const tracking = () => page.locator('.tsc-row-text--heading').first().evaluate(el => getComputedStyle(el).letterSpacing)
    const first = await tracking()
    await page.getByRole('button', { name: 'Reset scale' }).click()
    expect(await tracking(), 'same letter spacing on first load and after Reset').toBe(first)
    await showTypeScaleCode(page)
    const code = await page.locator('#tsc-export').textContent()
    expect(code, 'no "+ -" in a clamp').not.toContain('+ -')
    for (const m of code.matchAll(/\/\* ([\d.]+)px → ([\d.]+)px \*\//g)) {
      expect(Number(m[1]), 'a step is never larger on a phone than on desktop').toBeLessThanOrEqual(Number(m[2]))
    }
  })
})

// ── Where Save to a project lives ─────────────────────────────────────────────
// From 768 it is the right-hand button of the docked bar at the foot of the
// screen, with Code and the status line on the left; the toolbar has no Save.
// The dock is sticky, so it is on screen however far the page has scrolled, and
// the Save menu opens upward from the button. A phone has its own dock (spec 306).
// The viewport is short on purpose, so the page is taller than the screen and a
// dock that is meant to stick has to.
//
// MUTATION: move Save back into the toolbar and the dock check goes red; drop the
// dock's sticky position and the "stays on screen" check goes red.
const DOCK_SIZES = [[768, 700], [1024, 700], [1200, 700], [1440, 900]]

test.describe('Type Scale · where Save to a project lives', () => {

  for (const [w, h] of DOCK_SIZES) {
    test(`${w}: Save to a project is the docked bar's right-hand button, stays on screen at the end of the page, and the toolbar has none`, async ({ page }) => {
      watch(page, 'designer keeping a scale')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      const dock = page.locator('.tsc-dock')
      const save = dock.getByRole('button', { name: 'Save to a project' })
      await expect(save).toBeVisible()
      await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Save to a project' })).toHaveCount(0)

      const boxes = await page.evaluate(() => {
        const rect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height } }
        return {
          dock: rect(document.querySelector('.tsc-dock')),
          code: rect(document.querySelector('.tsc-dock .tsc-code-btn')),
          save: rect(document.querySelector('.tsc-dock .tsc-save')),
          vw: document.documentElement.clientWidth,
          vh: window.innerHeight,
        }
      })
      expect(boxes.code.right, `${w}px: Code is left of Save`).toBeLessThanOrEqual(boxes.save.left)
      expect(Math.abs(boxes.save.top - boxes.code.top), `${w}px: Code and Save are on one row`).toBeLessThanOrEqual(2)
      expect(boxes.save.right, `${w}px: Save is at the right of the dock`).toBeGreaterThan(boxes.vw - 40)
      expect(boxes.save.right).toBeLessThanOrEqual(boxes.vw)
      expect(Math.round(boxes.dock.bottom), `${w}px: the dock is the foot of the screen`).toBe(boxes.vh)
      expect(boxes.dock.height, `${w}px: the dock is 64px tall`).toBe(64)

      expect(await settleTypeScaleView(page), `${w}px is the ${w >= 1440 ? "split" : "switch"} layout`).toBe(w >= 1440 ? 'split' : 'switch')

      // The dock is sticky: still in view after the page scrolls to the end.
      const tall = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
      expect(tall, 'the page is taller than the screen, so the dock has to stick').toBeGreaterThan(100)
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await expect(save, `${w}px: Save stays in the viewport at the end of the page`).toBeInViewport()
    })
  }

  for (const [w, h] of [[768, 700], [1200, 700]]) {
    test(`Save opens its menu upward from the docked button, whole on the screen, at ${w}`, async ({ page }) => {
      watch(page, 'signed in designer keeping a scale')
      await signIn(page, { plan: 'free', projects: 1 })
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      const trigger = page.locator('.tsc-dock .tsc-save')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const menu = page.locator('.svt-menu')
      await expect(menu).toBeVisible()
      const m = await page.evaluate(() => {
        const r = document.querySelector('.svt-menu').getBoundingClientRect()
        const t = document.querySelector('.tsc-dock .tsc-save').getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, triggerTop: t.top, triggerRight: t.right, vw: document.documentElement.clientWidth }
      })
      expect(m.bottom, 'the menu opens above the button').toBeLessThanOrEqual(m.triggerTop)
      expect(m.top, 'the menu is not cut off at the top of the screen').toBeGreaterThanOrEqual(0)
      expect(m.left).toBeGreaterThanOrEqual(0)
      expect(m.right, 'the menu is not cut off at the right').toBeLessThanOrEqual(m.vw)
      expect(Math.abs(m.right - m.triggerRight), 'the menu hangs from the right, under which Save sits').toBeLessThanOrEqual(24)
      await page.keyboard.press('Escape')
      await expect(menu).toBeHidden()
    })
  }
})

// ── Source order is screen order ──────────────────────────────────────────────
// Below 1024 the panel (Base, Ratio, families) is above the ladder on screen.
// It is also first in the source, with no CSS `order`, so a screen reader reads
// it first and Tab reaches it first. From 1024 it sits in the right-hand
// column; its place in the source stays first, as on Font Pair.
//
// MUTATION: move <ToolPanel> back after <ToolMain> in TypeScale.jsx and give
// `.tsc-config` / `.tsc-sec-scale` an `order`, and the source and Tab checks
// go red at 768 and 1023 while the screen check stays green.
test.describe('Type Scale · source order, Tab order and screen order agree below 1024', () => {
  for (const [w, h] of [[768, 1024], [1023, 800]]) {
    test(`at ${w}`, async ({ page }) => {
      watch(page, 'keyboard designer on a phone and a tablet')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      await expect(page.locator('.tsc-row').first()).toBeVisible()

      // 1. Source order: the panel's first section, then the work column.
      const source = await page.evaluate(() => {
        const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
        const cfg = document.querySelector('.tsc-config')
        const scale = document.querySelector('.tsc-sec-scale')
        const out = document.querySelector('.tsc-output')
        const tabs = document.querySelector('.tsc-view-switch')
        const dock = document.querySelector('[data-tl-dock]')
        return {
          panelThenWork: follows(cfg, out),
          scaleThenTabs: follows(scale, tabs),
          // Only a phone has a bar at the foot below 1024.
          hasDock: !!dock,
          workThenDock: dock ? follows(out, dock) : null,
          orders: [...document.querySelectorAll('.tsc-config, .tsc-config *, .tsc-output')].filter(el => getComputedStyle(el).order !== '0').map(el => el.className),
        }
      })
      expect(source.panelThenWork, 'the panel comes before the ladder in the source').toBe(true)
      expect(source.scaleThenTabs).toBe(true)
      expect(source.hasDock, 'a bar at the foot is a phone thing, and a phone has its own test below').toBe(false)
      expect(source.workThenDock).toBeNull()
      // The one `order` left is the value beside a slider's track, inside one control.
      expect(source.orders.filter(c => !/snapv-value/.test(c)), 'nothing is reordered with CSS').toEqual([])

      // 2. Screen order: Base and Ratio, then the view switch, then the ladder.
      const tops = await page.evaluate(() => {
        const top = sel => document.querySelector(sel).getBoundingClientRect().top + window.scrollY
        return { scale: top('.tsc-sec-scale'), tabs: top('.tsc-view-switch'), row: top('.tsc-row') }
      })
      expect(tops.scale, 'Base and Ratio are above the view switch').toBeLessThan(tops.tabs)
      expect(tops.tabs, 'the view switch is above the ladder').toBeLessThan(tops.row)

      // 3. Tab order: from the last toolbar button, Tab goes through the panel,
      // then the view switch, then the first ladder row, and each stop is no
      // higher on the page than the one before (14px for controls that share a row).
      await page.locator('[data-tool-toolbar] button:visible').last().focus()
      const stops = []
      for (let i = 0; i < 80; i += 1) {
        await page.keyboard.press('Tab')
        const stop = await page.evaluate(() => {
          const el = document.activeElement
          const zone = el.closest('.tsc-row') ? 'row' : el.closest('.tsc-view-switch') ? 'tabs' : el.closest('.tsc-config') ? 'panel' : 'other'
          const fam = el.closest('.tsc-fam')
          return { zone, fam: fam ? fam.getBoundingClientRect().top + window.scrollY : null, famId: fam ? [...document.querySelectorAll('.tsc-fam')].indexOf(fam) : -1, top: el.getBoundingClientRect().top + window.scrollY, name: (el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 40) }
        })
        stops.push(stop)
        if (stop.zone === 'row') break
      }
      const seen = stops.filter(s => s.zone !== 'other')
      const zones = seen.map(s => s.zone).filter((z, i, all) => z !== all[i - 1])
      expect(zones, `Tab walked ${stops.map(s => `${s.zone}:${s.name}`).join(' > ')}`).toEqual(['panel', 'tabs', 'row'])
      for (let i = 1; i < seen.length; i += 1) {
        // Family cards side by side are read one card at a time: stepping into
        // the next card, which starts on the same line, goes back up to its top.
        const nextCard = seen[i].famId >= 0 && seen[i - 1].famId >= 0 && seen[i].famId !== seen[i - 1].famId
        if (nextCard && Math.abs(seen[i].fam - seen[i - 1].fam) <= 1) continue
        expect(seen[i].top, `${seen[i].name} is higher on the page than ${seen[i - 1].name}, which Tab visited first`).toBeGreaterThanOrEqual(seen[i - 1].top - 14)
      }
    })
  }

  // A phone is one scroll: the width segment, then the Kerbside screen, then the
  // ladder. Base, Ratio and the families are in the settings sheet the dock opens,
  // which stays out of the way (and out of the Tab order) until it is opened.
  test('at 390 the width, the page and the ladder are one scroll in that order, and the closed sheet is out of reach', async ({ page }) => {
    watch(page, 'keyboard designer on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/type-scale')
    await expect(page.locator('.tsc-row').first()).toBeVisible()

    const source = await page.evaluate(() => {
      const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
      const width = document.querySelector('.tsc-width-bar')
      const screen = document.querySelector('.tsk')
      const ladder = document.querySelector('.tsc-ladder')
      const dock = document.querySelector('[data-tl-dock]')
      return {
        widthThenScreen: follows(width, screen),
        screenThenLadder: follows(screen, ladder),
        ladderThenDock: !!dock && follows(ladder, dock),
        tabs: document.querySelectorAll('.tsc-view-switch, [role="tab"]').length,
        orders: [...document.querySelectorAll('.tsc-config, .tsc-config *, .tsc-output, .tsc-output *')].filter(el => getComputedStyle(el).order !== '0').map(el => el.className),
      }
    })
    expect(source.widthThenScreen, 'Preview width is above the screen').toBe(true)
    expect(source.screenThenLadder, 'the screen is above the ladder').toBe(true)
    expect(source.ladderThenDock, 'the dock is last, as it is on screen').toBe(true)
    expect(source.tabs, 'a phone has no page-level tabs').toBe(0)
    expect(source.orders.filter(c => !/snapv-value/.test(c)), 'nothing is reordered with CSS').toEqual([])

    const tops = await page.evaluate(() => {
      const top = sel => document.querySelector(sel).getBoundingClientRect().top + window.scrollY
      return { width: top('#tsc-width'), screen: top('.tsk'), row: top('.tsc-row') }
    })
    expect(tops.width, 'Preview width is above the screen').toBeLessThan(tops.screen)
    expect(tops.screen, 'the screen is above the ladder').toBeLessThan(tops.row)

    await expect(page.locator('#tsc-sheet')).toBeHidden()
    await page.locator('[data-tool-toolbar] button:visible').last().focus()
    const stops = []
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab')
      const stop = await page.evaluate(() => {
        const el = document.activeElement
        const zone = el.closest('.tsc-row') ? 'row' : el.closest('.tsc-sheet') ? 'sheet' : el.closest('.tsc-width-bar') ? 'width' : 'other'
        return { zone, name: (el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 40) }
      })
      stops.push(stop)
      if (stop.zone === 'row') break
    }
    const zones = stops.map(s => s.zone).filter(z => z !== 'other').filter((z, i, all) => z !== all[i - 1])
    expect(zones, `Tab walked ${stops.map(s => `${s.zone}:${s.name}`).join(' > ')}`).toEqual(['width', 'row'])
  })

  for (const [w, h] of [[1024, 800], [1200, 900], [1440, 900]]) {
    test(`from 1024 the panel stays in the right-hand column, as before, at ${w}`, async ({ page }) => {
      watch(page, 'designer on a laptop')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      await expect(page.locator('.tsc-row').first()).toBeVisible()
      const g = await page.evaluate(() => {
        const out = document.querySelector('.tsc-output').getBoundingClientRect()
        const cfg = document.querySelector('.tsc-config').getBoundingClientRect()
        return { outLeft: out.left, outRight: out.right, outTop: out.top, cfgLeft: cfg.left, cfgTop: cfg.top, cfgWidth: cfg.width }
      })
      expect(g.outLeft, 'the ladder is the left column').toBeLessThan(g.cfgLeft)
      expect(g.outRight).toBeLessThanOrEqual(g.cfgLeft)
      expect(Math.abs(g.outTop - g.cfgTop), 'both columns start on the same line').toBeLessThanOrEqual(1)
      expect(Math.round(g.cfgWidth), 'the panel is 336px').toBe(336)
    })
  }
})

// ── The split and its Scale | Page switch ────────────────────────────────────────
// The work column is measured, not the viewport. From 1024px of column (a 1440
// window) the ladder and the page sit side by side with no Scale / Page switch.
// Code is a drawer opened from the docked bar at every width from 768. Below the
// split the switch stays. The 1024 test is the other half of every claim here: it
// is what makes "no switch at 1440" a statement about the width and not about the page.
//
// MUTATION: raise SPLIT_MIN in TypeScale.jsx past any column and the 1440 tests
// go red while the 1024 one stays green; spec 306 pins the Code drawer at 1440.
//
test.describe('Type Scale · the split and its Scale | Page switch', () => {
  test('at 1440 the ladder and the page sit side by side and there is no tablist', async ({ page }) => {
    watch(page, 'designer on a wide screen')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('split')

    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(page.locator('.tsc-view-switch')).toHaveCount(0)
    await expect(page.locator('#tsc-view-panel')).not.toHaveAttribute('role', 'tabpanel')

    // Both halves are rendered at once, not one at a time.
    await expect(page.locator('.tsc-row')).toHaveCount(6)
    await expect(page.locator('.tsk')).toBeVisible()

    const g = await page.evaluate(() => {
      const box = sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, width: r.width } }
      return { ladder: box('.tsc-ladder'), page: box('.tsc-page-col'), out: box('.tsc-output') }
    })
    expect(g.ladder.right, 'the ladder is the left half').toBeLessThanOrEqual(g.page.left + 1)
    expect(Math.abs(g.ladder.top - g.page.top), 'the halves start on the same line').toBeLessThanOrEqual(80)
    expect(g.ladder.width, 'the ladder has room for its samples').toBeGreaterThan(400)
    expect(g.page.width, 'the page has room for its article').toBeGreaterThan(400)
    expect(g.page.right, 'neither half spills out of the work column').toBeLessThanOrEqual(g.out.right + 1)
  })

  test('at 1440 the page opens on Desktop width and says it is wider than its half', async ({ page }) => {
    watch(page, 'designer judging a desktop page in half a column')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('split')

    // Visible with no tab to press, and already on the visitor's own size.
    await expect(page.locator('#tsc-view-panel')).toHaveAttribute('data-width', 'full')
    await expect(page.locator('#tsc-width')).toBeVisible()
    await expect(page.locator('#tsc-width button[aria-pressed="true"]')).toContainText('Desktop')
    // The half is narrower than the 1440px page it shows, and the note says so.
    await expect(page.locator('.tsc-width-note')).toBeVisible()
    await expect(page.locator('.tsc-width-note')).toContainText('Sizes as on a 1440px screen')
  })


  test('at 1024 the Scale / Page switch is still there and Code is a drawer from the docked bar', async ({ page }) => {
    watch(page, 'designer on a laptop')
    await page.setViewportSize({ width: 1024, height: 800 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('switch')

    await expect(page.getByRole('tablist', { name: 'Output view' })).toBeVisible()
    await expect(page.getByRole('tab')).toHaveText(['Scale', 'Page'])
    await expect(page.locator('#tsc-view-panel')).toHaveAttribute('data-view', 'scale')
    await expect(page.locator('#tsc-view-panel')).toHaveAttribute('role', 'tabpanel')
    // Code is not a view of the switch: it is a drawer, closed until the dock's Code is pressed.
    await expect(page.locator('.tsc-dock .tsc-code-btn')).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#tsc-code-drawer')).toBeHidden()
    await expect(page.locator('.tsc-dock').getByRole('button', { name: 'Save to a project' })).toBeVisible()

    await showTypeScaleCode(page)
    await expect(page.locator('#tsc-view-panel')).toHaveAttribute('data-view', 'scale')
    await expect(page.locator('#tsc-export')).toContainText('--text-base')
  })
})
