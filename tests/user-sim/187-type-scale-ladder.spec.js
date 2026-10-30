// The Type Scale ladder, panel, phone sheet and default preview width
// (fonts build spec, criteria 10 to 13; board card 42c6599fe4), the docked bar at
// 390, 768 and 1024+, and source order matching screen order below 1024.
//
// Test seam: the /create/type-scale page itself. Every check reads computed
// styles and geometry in a real browser.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { settleTypeScaleView, showTypeScaleCode, showTypeScalePage } from './type-scale-view.js'

const SIZES = [[1440, 900], [1024, 800], [768, 1024], [390, 844]]

test.describe('Type Scale · ladder, panel, sheet and default width', () => {
  for (const [w, h] of SIZES) {
    test(`10. every step's computed size equals its px, unscaled, at ${w}`, async ({ page }) => {
      watch(page, 'designer reading the ladder')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
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
      expect(rows).toHaveLength(9)
      for (const r of rows) {
        expect(r.fs, `${w}px: font-size matches the px value`).toBe(r.px)
        expect(r.label).toContain(`${r.px}px`)
        expect(r.transforms, 'nothing is scaled with transform or zoom').toEqual([])
      }
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
      await expect(page.locator('#tsc-width')).toContainText(label)
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
      await expect(page.locator('#tsc-base + .snapv-value')).toHaveText('16px')
    })
  }

  test('13. the 390 settings sheet is at most 55% of the screen and 3 steps stay above it', async ({ page }) => {
    watch(page, 'designer changing a family on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/type-scale')
    // Exact: the sheet's own name ("Families, preview text and fine tuning")
    // also contains these words, so the loose label matches two elements.
    const sample = page.getByLabel('Preview text', { exact: true })
    await sample.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Families, preview text and fine tuning' }).click()
    const sheet = page.locator('#tsc-sheet')
    await expect(sheet).toBeVisible()
    // The default sample is left alone on purpose: under 768 it is the short
    // "Scale it", so every step is one line and 3 fit above the sheet.
    await page.getByRole('button', { name: 'Fine tuning', exact: true }).click()
    const { sheetTop, sheetH, visibleRows } = await page.evaluate(() => {
      const box = document.querySelector('#tsc-sheet').getBoundingClientRect()
      const top = document.querySelector('.tl-toolbar').getBoundingClientRect().bottom
      const rows = [...document.querySelectorAll('.tsc-row')].filter(el => {
        const r = el.getBoundingClientRect()
        return r.top < box.top - 4 && r.bottom > top
      })
      return { sheetTop: box.top, sheetH: box.height, visibleRows: rows.length }
    })
    expect(sheetH, 'the sheet is capped at 55% of the viewport').toBeLessThanOrEqual(844 * 0.55 + 1)
    expect(sheetTop).toBeGreaterThan(0)
    expect(visibleRows, 'at least 3 ladder rows stay visible above the sheet').toBeGreaterThanOrEqual(3)
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toBeHidden()
  })

  // While the brand kit walkthrough is on, its bar takes the foot of a phone, the
  // tab bar goes, and the docked bar lifts onto the walkthrough's bar. The
  // sheet has to lift with it, or its last controls sit under the docked bar.
  test('13b. with the brand kit bar showing, the 390 sheet ends where the docked bar begins', async ({ page }) => {
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
    await page.getByRole('button', { name: 'Families, preview text and fine tuning' }).click()
    const sheet = page.locator('#tsc-sheet')
    await expect(sheet).toBeVisible()
    const m = await page.evaluate(() => ({
      sheetBottom: document.querySelector('#tsc-sheet').getBoundingClientRect().bottom,
      dockTop: document.querySelector('.tsc-dock').getBoundingClientRect().top,
      railTop: document.querySelector('[aria-label="Brand kit walkthrough"]').getBoundingClientRect().top,
    }))
    expect(m.dockTop, 'the docked bar sits on the walkthrough bar').toBeLessThanOrEqual(m.railTop)
    expect(Math.round(m.sheetBottom), 'the sheet stops at the docked bar, not under it').toBeLessThanOrEqual(Math.round(m.dockTop) + 1)
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

// ── The docked bar ────────────────────────────────────────────────────────────
// Spec section 3: 1024 to 1439 and 768 carry Save to a project in a bar docked
// to the foot of the screen; 390 carries Save and Copy CSS. Save is never in the
// toolbar. The viewport is short on purpose, so the page is taller than the
// screen and the bar has to stick.
//
// MUTATION: put the Save item back into `items` in TypeScale.jsx, or drop the
// `.tsc-dock` position rule, and these go red.
const DOCK_SIZES = [[390, 700], [768, 700], [1024, 700], [1200, 700]]

test.describe('Type Scale · the docked bar', () => {
  for (const [w, h] of DOCK_SIZES) {
    test(`the bar is docked to the foot of the screen with ${w < 768 ? 'Save and Copy CSS' : 'Save to a project'} at ${w}`, async ({ page }) => {
      watch(page, 'designer keeping a scale')
      await page.setViewportSize({ width: w, height: h })
      await go(page, '/create/type-scale')
      const dock = page.locator('.tsc-dock')
      await expect(dock).toBeVisible()

      const names = await dock.getByRole('button').evaluateAll(els => els.map(el => el.textContent.trim()))
      expect(names, `${w}px: what the bar holds`).toEqual(w < 768 ? ['Save', 'Copy CSS'] : ['Save to a project'])

      // Save is never in the toolbar, and Copy CSS is there only where the bar
      // does not carry it.
      const bar = page.locator('[data-tool-toolbar]')
      await expect(bar.getByRole('button', { name: /^Save/ })).toHaveCount(0)
      await expect(bar.getByRole('button', { name: /^Copy CSS/ })).toHaveCount(w < 768 ? 0 : 1)

      const box = await dock.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          left: r.left, right: r.right, bottom: r.bottom, vw: document.documentElement.clientWidth, vh: window.innerHeight,
          // On a phone the tab bar owns the foot of the screen and the bar sits on it.
          floor: (() => { const t = document.querySelector('.pnav-tabs'); const b = t && t.getBoundingClientRect(); return b && b.height > 0 ? b.top : window.innerHeight })(),
          position: cs.position, tall: document.documentElement.scrollHeight - window.innerHeight,
        }
      })
      expect(box.tall, 'the page is taller than the screen, so the bar has to stick').toBeGreaterThan(100)
      expect(['sticky', 'fixed']).toContain(box.position)
      expect(Math.round(box.bottom), `${w}px: the bar sits on the foot of the screen (on the tab bar, on a phone)`).toBe(Math.round(box.floor))
      if (w < 768) expect(box.floor, 'a phone has its tab bar under the bar').toBeLessThan(box.vh)
      expect(box.left).toBeLessThanOrEqual(1)
      expect(box.right).toBeGreaterThanOrEqual(box.vw - 1)

      // Still there after the page scrolls to the end.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const after = await dock.evaluate(el => Math.round(el.getBoundingClientRect().bottom))
      expect(after, `${w}px: the bar stays on the screen at the end of the page`).toBe(Math.round(box.floor))
      await expect(dock).toBeInViewport()
    })
  }

  for (const [w, h] of [[768, 700], [1200, 700]]) {
    test(`Save opens its menu upward from the bar, whole on the screen, at ${w}`, async ({ page }) => {
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
        const d = document.querySelector('.tsc-dock').getBoundingClientRect()
        const t = document.querySelector('.tsc-dock .tsc-save').getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, dockTop: d.top, triggerRight: t.right, vw: document.documentElement.clientWidth }
      })
      expect(m.bottom, 'the menu opens above the bar').toBeLessThanOrEqual(m.dockTop)
      expect(m.top, 'the menu is not cut off above the screen').toBeGreaterThanOrEqual(0)
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
// go red at 390, 768 and 1023 while the screen check stays green.
test.describe('Type Scale · source order, Tab order and screen order agree below 1024', () => {
  for (const [w, h] of [[390, 844], [768, 1024], [1023, 800]]) {
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
        const sheetRow = document.querySelector('.tsc-sheet-row')
        const dock = document.querySelector('.tsc-dock')
        return {
          panelThenWork: follows(cfg, out),
          scaleThenTabs: follows(scale, tabs),
          sheetRowThenTabs: follows(sheetRow, tabs),
          workThenDock: follows(out, dock),
          orders: [...document.querySelectorAll('.tsc-config, .tsc-config *, .tsc-output')].filter(el => getComputedStyle(el).order !== '0').map(el => el.className),
        }
      })
      expect(source.panelThenWork, 'the panel comes before the ladder in the source').toBe(true)
      expect(source.scaleThenTabs).toBe(true)
      expect(source.sheetRowThenTabs).toBe(true)
      expect(source.workThenDock, 'the docked bar is last, as it is on screen').toBe(true)
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
          return { zone, top: el.getBoundingClientRect().top + window.scrollY, name: (el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 40) }
        })
        stops.push(stop)
        if (stop.zone === 'row') break
      }
      const seen = stops.filter(s => s.zone !== 'other')
      const zones = seen.map(s => s.zone).filter((z, i, all) => z !== all[i - 1])
      expect(zones, `Tab walked ${stops.map(s => `${s.zone}:${s.name}`).join(' > ')}`).toEqual(['panel', 'tabs', 'row'])
      for (let i = 1; i < seen.length; i += 1) {
        expect(seen[i].top, `${seen[i].name} is higher on the page than ${seen[i - 1].name}, which Tab visited first`).toBeGreaterThanOrEqual(seen[i - 1].top - 14)
      }
    })
  }

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

// ── The split and the Code drawer ─────────────────────────────────────────────
// The work column is measured, not the viewport. From 1024px of column (a 1440
// window) the ladder and the page sit side by side with no Scale / Page / Code
// switch, and Code is a drawer opened from the docked bar. Below that the switch
// stays. The 1024 test is the other half of every claim here: it is what makes
// "no switch at 1440" a statement about the width and not about the page.
//
// MUTATION: raise SPLIT_MIN in TypeScale.jsx past any column and the 1440 tests
// go red while the 1024 one stays green; drop `hidden={!drawerOpen}` or the Escape
// branch and the drawer tests go red.
test.describe('Type Scale · the split and the Code drawer', () => {
  test('at 1440 the ladder and the page sit side by side and there is no tablist', async ({ page }) => {
    watch(page, 'designer on a wide screen')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('split')

    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(page.locator('.tsc-view-switch')).toHaveCount(0)
    await expect(page.locator('#tsc-view-panel')).not.toHaveAttribute('role', 'tabpanel')

    // Both halves are rendered at once, not one at a time.
    await expect(page.locator('.tsc-row')).toHaveCount(9)
    await expect(page.locator('.tsc-article')).toBeVisible()

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
    await expect(page.locator('#tsc-width')).toContainText('Desktop')
    // The half is narrower than the 1440px page it shows, and the note says so.
    await expect(page.locator('.tsc-width-note')).toBeVisible()
    await expect(page.locator('.tsc-width-note')).toContainText('Sizes as on a 1440px screen')
  })

  test('at 1440 the docked bar is named for Code and save and holds both buttons', async ({ page }) => {
    watch(page, 'designer keeping a scale on a wide screen')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('split')

    const dock = page.getByRole('group', { name: 'Code and save' })
    await expect(dock).toBeVisible()
    const names = await dock.getByRole('button').evaluateAll(els => els.map(el => el.textContent.trim()))
    expect(names).toEqual(['Code', 'Save to a project'])
  })

  test('the Code drawer opens with focus inside, does not trap Tab, and Escape closes it and returns focus', async ({ page }) => {
    watch(page, 'keyboard designer reading the export')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('split')

    const button = page.locator('.tsc-code-btn')
    const drawer = page.locator('#tsc-code-drawer')
    const inDrawer = () => drawer.evaluate(el => el.contains(document.activeElement))

    // Closed: the button says what it controls and the drawer is not on screen.
    await expect(button).toHaveAttribute('aria-controls', 'tsc-code-drawer')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('dialog', { name: 'Code' })).toHaveCount(0)

    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('dialog', { name: 'Code' })).toBeVisible()
    await expect(drawer.locator('#tsc-export')).toContainText('--text-base')
    await expect(drawer.locator('.tsc-drawer-copy')).toBeVisible()
    await expect(drawer.locator('.tsc-drawer-close')).toBeVisible()

    // Focus moved into it. It is non-modal: no trap, so Tab walks on out of it.
    await expect.poll(inDrawer, { message: 'focus is inside the drawer once it opens' }).toBe(true)
    await expect(drawer).toHaveAttribute('aria-modal', 'false')
    for (let i = 0; i < 12 && await inDrawer(); i += 1) await page.keyboard.press('Tab')
    expect(await inDrawer(), 'Tab is not trapped in the drawer').toBe(false)

    await drawer.locator('.tsc-drawer-copy').focus()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button, 'focus goes back to the button that opened the drawer').toBeFocused()
  })

  test('the Close button and a press outside also close the drawer, but a press in the panel does not', async ({ page }) => {
    watch(page, 'designer dismissing the export')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('split')

    const button = page.locator('.tsc-code-btn')
    const drawer = page.locator('#tsc-code-drawer')

    await button.click()
    await expect(drawer).toBeVisible()
    await page.locator('.tsc-drawer-close').click()
    await expect(drawer).toBeHidden()
    await expect(button, 'Close returns focus to the button').toBeFocused()

    await button.click()
    await expect(drawer).toBeVisible()
    // A press in the settings panel beside it leaves it open, and the code follows the control.
    const exportText = () => drawer.locator('#tsc-export').innerText()
    const before = await exportText()
    await page.locator('#tsc-ratio').click()
    await page.getByRole('listbox').getByRole('option', { name: /^Perfect fifth/ }).click()
    await expect(drawer, 'a press in the panel keeps the drawer open').toBeVisible()
    await expect.poll(exportText, { message: 'the code updates as the ratio changes' }).not.toBe(before)
    await expect(button).toHaveAttribute('aria-expanded', 'true')

    // A press outside both closes it.
    await page.locator('.tsc-dock').click({ position: { x: 400, y: 4 } })
    await expect(drawer).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')

    // The button is a toggle: a second press closes what the first opened.
    await button.click()
    await expect(drawer).toBeVisible()
    await button.click()
    await expect(drawer).toBeHidden()
  })

  test('at 1024 the switch is still there, Code is a tab, and there is no drawer', async ({ page }) => {
    watch(page, 'designer on a laptop')
    await page.setViewportSize({ width: 1024, height: 800 })
    await go(page, '/create/type-scale')
    expect(await settleTypeScaleView(page)).toBe('switch')

    await expect(page.getByRole('tablist', { name: 'Output view' })).toBeVisible()
    await expect(page.getByRole('tab')).toHaveText(['Scale', 'Page', 'Code'])
    await expect(page.locator('#tsc-view-panel')).toHaveAttribute('data-view', 'scale')
    await expect(page.locator('#tsc-view-panel')).toHaveAttribute('role', 'tabpanel')
    await expect(page.locator('.tsc-code-btn')).toHaveCount(0)
    await expect(page.locator('#tsc-code-drawer')).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Save', exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Code' }).click()
    await expect(page.locator('#tsc-view-panel')).toHaveAttribute('data-view', 'code')
    await expect(page.locator('#tsc-export')).toContainText('--text-base')
  })
})
