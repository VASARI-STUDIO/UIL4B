// The brand kit walkthrough bar below 1024px: 60px, and what it holds.
//
//   · Below 1024px the bar is 60px high (plus the safe-area inset, 0 in a test
//     browser), on the foot of the viewport, in both themes. On a phone the tab
//     bar steps aside for it.
//   · Phone (under 768px): a four-segment progress strip, ONE steps trigger and
//     Next. The old Close, help button, step chips and lead are not rendered.
//     The trigger opens an upward, non-modal panel that holds the step links,
//     the help line and "Close the walkthrough".
//   · Tablet (768 to 1023px): one row, four step links on one line, Next at its
//     content width, "Step N of 4" read out and not drawn.
//   · No horizontal scroll at 360, 390 or 768px.
//
// What would make each test fail:
//
//   · "60px": changing --bkit-h or the .bkit-rail padding in tool-shell.css, or
//     bringing back a second row or a band above the steps.
//   · "tab bar is hidden": dropping the bkit-on rule that hides .pnav-tabs.
//   · "phone bar holds": rendering the old X, help button, chips or lead on a
//     phone, or giving the strip anything but four segments.
//   · "tablet row": letting the chips wrap onto a second line, or putting the
//     stretch back on Next (the old grid made it as wide as the bar).
//   · "panel": moving the panel off the bar's top edge, dropping its Escape
//     handler or the trigger's aria-expanded, adding aria-modal, or not sending
//     focus to the trigger / #main.
//   · "no horizontal scroll": any bar control wider than the viewport.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { kitRail, stepsTrigger, stepsPanel, expectOnStep } from './kit-bar.js'

const GUIDE_KEY = 'vs-uikit-guide'
const SEEN_KEY = 'vs-uikit-guide-seen'
const THEMES = ['dark', 'light']

/** A context at this width and theme, with the walkthrough already begun and its panel seen. */
async function open(browser, { width, height, theme, seen = true }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    hasTouch: width < 1024,
  })
  await ctx.addInitScript(({ theme, keys, seen }) => {
    try {
      if (sessionStorage.getItem('__kitbar_seeded') === '1') return
      sessionStorage.setItem('__kitbar_seeded', '1')
      localStorage.setItem('vs-t', theme)
      localStorage.setItem(keys.guide, '1')
      if (seen) localStorage.setItem(keys.seen, '1')
    } catch { /* private mode */ }
  }, { theme, keys: { guide: GUIDE_KEY, seen: SEEN_KEY }, seen })
  return { ctx, page: await ctx.newPage() }
}

const box = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, right: r.right }
})

// ─── 60px, on the foot of the viewport, in both themes ───
for (const theme of THEMES) {
  for (const { width, height } of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
    test(`${width}px ${theme}: the walkthrough bar is 60px high and sits on the foot of the viewport`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, theme })
      try {
        watch(page, `designer on the brand kit at ${width}px in ${theme}`)
        await go(page, '/create/palette')
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(kitRail(page)).toBeVisible()
        // Polled: the bar mounts with the tool and a node caught mid-mount measures its old height.
        await expect.poll(async () => Math.round((await box(kitRail(page))).height), { message: 'the bar is not 60px' }).toBe(60)
        await page.screenshot({ path: test.info().outputPath(`kit-bar-${width}-${theme}-colours.png`), fullPage: false })
        const b = await box(kitRail(page))
        expect(b.height, 'bar height').toBeGreaterThanOrEqual(59)
        expect(b.height, 'bar height').toBeLessThanOrEqual(61)
        // On Colours from 768px the Adjust-all toolbar is pinned to the foot and the bar sits directly on it.
        const lift = await page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue('--bkit-toolbar-h')) || 0)
        expect(Math.abs(b.bottom + lift - height), 'the bar is not on the foot of the viewport (or on the toolbar that is)').toBeLessThanOrEqual(1)
        expect(b.width, 'the bar is not the width of the viewport').toBe(width)
        // The 60px follows through the four tools: no step has a taller bar.
        for (const route of ['/create/font-pair', '/create/type-scale', '/create/icons']) {
          await go(page, route)
          await expect.poll(async () => Math.round((await box(kitRail(page))).height), { message: `${route}: the bar is not 60px` }).toBe(60)
          // No bottom toolbar on Icons: the bar is flush with the foot of the viewport.
          if (route === '/create/icons') expect(Math.abs((await box(kitRail(page))).bottom - height), 'the bar is not on the foot of the viewport').toBeLessThanOrEqual(1)
        }
        await page.screenshot({ path: test.info().outputPath(`kit-bar-${width}-${theme}.png`), fullPage: false })
      } finally {
        await ctx.close()
      }
    })
  }
}

// ─── Phone: the tab bar steps aside; the bar holds the strip, the trigger and Next ───
test.describe('Brand kit bar on a phone (390px)', () => {
  test('the tab bar is hidden during the walkthrough and comes back after it', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, theme: 'dark' })
    try {
      watch(page, 'designer on a phone')
      await go(page, '/create/palette')
      await expect(kitRail(page)).toBeVisible()
      await expect(page.locator('.pnav-tabs'), 'the tab bar is showing under the walkthrough').toBeHidden()
      await stepsTrigger(page).click()
      await page.getByRole('button', { name: /^Close the walkthrough/ }).click()
      await expect(kitRail(page)).toBeHidden()
      await expect(page.locator('.pnav-tabs'), 'the tab bar did not come back').toBeVisible()
    } finally {
      await ctx.close()
    }
  })

  test('the bar holds the progress strip, the steps trigger and Next, and none of the old controls', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, theme: 'dark' })
    try {
      watch(page, 'designer on a phone')
      await go(page, '/create/font-pair')
      const rail = kitRail(page)
      await expectOnStep(page, 'Fonts', 2)

      // Not rendered at all on a phone (not merely hidden).
      for (const gone of ['.bkit-rail-close', '.bkit-rail-help', '.bkit-steps', '.bkit-rail-head', '.bkit-step']) {
        await expect(rail.locator(gone), `${gone} is still rendered on a phone`).toHaveCount(0)
      }
      await expect(rail.getByRole('button', { name: 'Leave the walkthrough' })).toHaveCount(0)
      await expect(rail.getByRole('button', { name: /What.s this\?/ })).toHaveCount(0)

      // The strip: four segments, decoration, the second the current one.
      const strip = rail.locator('.bkit-progress')
      await expect(strip).toHaveAttribute('aria-hidden', 'true')
      await expect(strip.locator('.bkit-progress-seg')).toHaveCount(4)
      await expect(strip.locator('.bkit-progress-seg.is-current')).toHaveCount(1)
      await expect(strip.locator('.bkit-progress-seg').nth(1)).toHaveClass(/is-current/)

      // The trigger: named for the step, the position and what is built; closed.
      const trigger = stepsTrigger(page)
      await expect(trigger).toHaveAccessibleName('Fonts, step 2 of 4, 0 built. Steps and help.')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).not.toHaveAttribute('aria-controls', /./)

      // The actions hold Next and nothing else.
      const actions = rail.locator('.bkit-rail-actions')
      await expect(actions.locator('> *')).toHaveCount(1)
      await expect(actions.locator('> .bkit-rail-next')).toHaveCount(1)
      await expect(rail.getByRole('button', { name: /^Next: Type scale/ })).toBeVisible()
    } finally {
      await ctx.close()
    }
  })

  test('Next counts the step as built, and the trigger and the panel say so', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, theme: 'light' })
    try {
      watch(page, 'designer pressing Next on a phone')
      await go(page, '/create/palette')
      await expect(stepsTrigger(page)).toHaveAccessibleName('Colours, step 1 of 4, 0 built. Steps and help.')
      await kitRail(page).getByRole('button', { name: /^Next: Fonts/ }).click()
      await expect(page).toHaveURL(/\/create\/font-pair$/)
      await expectOnStep(page, 'Fonts', 2)
      await expect(stepsTrigger(page)).toHaveAccessibleName('Fonts, step 2 of 4, 1 built. Steps and help.')
      await stepsTrigger(page).click()
      await expect(stepsPanel(page)).toContainText('1 of 4 parts')
    } finally {
      await ctx.close()
    }
  })

  test('Next is hidden while the project is being named, and the bar stays 60px', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, theme: 'dark' })
    try {
      watch(page, 'designer naming a project on a phone')
      await go(page, '/create/icons')
      await expectOnStep(page, 'Icons', 4)
      await kitRail(page).getByRole('button', { name: /^Name your project/ }).click()
      await expect(page.getByRole('dialog', { name: 'Name your project' })).toBeVisible()
      await expect(kitRail(page).locator('.bkit-rail-next'), 'Next shows under the name sheet').toBeHidden()
      expect(Math.round((await box(kitRail(page))).height)).toBe(60)
    } finally {
      await ctx.close()
    }
  })

  test('the trigger opens the steps panel on the bar, and Escape and Close the walkthrough close it properly', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, theme: 'dark' })
    try {
      watch(page, 'designer using the steps panel on a phone')
      await go(page, '/create/font-pair')
      await expectOnStep(page, 'Fonts', 2)
      const trigger = stepsTrigger(page)
      const panel = stepsPanel(page)
      await expect(panel, 'the panel is open before it was asked for').toBeHidden()

      // Opens.
      await trigger.click()
      await expect(panel).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(panel).toHaveClass(/bkit-card--steps/)
      await expect(trigger).toHaveAttribute('aria-controls', (await panel.getAttribute('id')) || 'missing')
      // Non-modal: no aria-modal, no scrim, and the page behind is not made inert.
      await expect(panel).not.toHaveAttribute('aria-modal', /.*/)
      expect(await panel.evaluate((el) => !el.closest('[aria-hidden="true"], [inert]')), 'the panel is inside an inert region').toBe(true)

      // It stands on the bar: its foot is the bar's top edge (within 2px).
      await expect.poll(async () => {
        const p = await box(panel)
        const r = await box(kitRail(page))
        return Math.abs(p.bottom - r.top) <= 2
      }, { message: 'the panel does not sit on the top of the bar' }).toBe(true)

      // What is in it.
      await expect(panel.getByRole('heading', { name: 'Brand kit' })).toBeVisible()
      await expect(panel).toContainText('0 of 4 parts')
      await expect(panel.locator('.bkit-sheet-help')).toHaveText('This step uses what you chose in the steps before it.')
      const links = panel.locator('ol.bkit-card-steps').getByRole('link')
      await expect(links).toHaveCount(4)
      for (const name of [/Colours/, /Fonts/, /Type scale/, /Icons/]) await expect(panel.getByRole('link', { name })).toBeVisible()
      await expect(panel.locator('a[aria-current="step"]')).toHaveCount(1)
      await expect(panel.getByRole('link', { name: /Fonts/ })).toHaveAttribute('aria-current', 'step')
      await expect(panel.getByRole('button', { name: /^Close the walkthrough/ })).toBeVisible()
      await page.screenshot({ path: test.info().outputPath('kit-bar-390-panel-open.png'), fullPage: false })

      // Escape closes it and gives focus back to the trigger.
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).toBeFocused()
      await expect(kitRail(page), 'Escape took the whole walkthrough away').toBeVisible()

      // Opened again: the trigger toggles it shut.
      await trigger.click()
      await expect(panel).toBeVisible()
      await trigger.click()
      await expect(panel).toBeHidden()

      // Close the walkthrough ends it in place, with focus on the page's main landmark.
      await trigger.click()
      const url = page.url()
      await panel.getByRole('button', { name: /^Close the walkthrough/ }).click()
      await expect(kitRail(page)).toBeHidden()
      await expect(panel).toBeHidden()
      expect(page.url(), 'Close the walkthrough navigated').toBe(url)
      await expect(page.locator('#main')).toBeFocused()
    } finally {
      await ctx.close()
    }
  })

  test('a link in the panel goes to its step', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, theme: 'light' })
    try {
      watch(page, 'designer jumping to a step from the panel')
      await go(page, '/create/palette')
      await stepsTrigger(page).click()
      await stepsPanel(page).getByRole('link', { name: /Type scale/ }).click()
      await expect(page).toHaveURL(/\/create\/type-scale$/)
      await expectOnStep(page, 'Type scale', 3)
    } finally {
      await ctx.close()
    }
  })
})

// ─── Tablet: one 60px row ───
for (const theme of THEMES) {
  test(`768px ${theme}: the four steps are on one row and Next is not stretched`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 768, height: 1024, theme })
    try {
      watch(page, `designer on a tablet in ${theme}`)
      await go(page, '/create/type-scale')
      const rail = kitRail(page)
      await expectOnStep(page, 'Type scale', 3)

      const links = rail.locator('.bkit-steps').getByRole('link')
      await expect(links).toHaveCount(4)
      for (let i = 0; i < 4; i++) await expect(links.nth(i)).toBeVisible()
      await expect.poll(async () => {
        const tops = []
        for (let i = 0; i < 4; i++) tops.push((await box(links.nth(i))).top)
        return Math.max(...tops) - Math.min(...tops) <= 2
      }, { message: 'the four step links are not on one row' }).toBe(true)

      // Next: a button at its content width, not the stretched pill.
      const next = await box(rail.locator('.bkit-rail-next'))
      expect(next.width, 'Next is stretched').toBeLessThan(240)
      expect(next.width, 'Next has no width').toBeGreaterThan(80)
      // Same row as the steps, and the row is the 60px bar.
      const first = await box(links.nth(0))
      expect(Math.abs((next.top + next.height / 2) - (first.top + first.height / 2)), 'Next is on another row from the steps').toBeLessThanOrEqual(2)

      // Help and Close stay on the tablet row; the phone's trigger and strip do not exist.
      await expect(rail.getByRole('button', { name: /What.s this\?/ })).toBeVisible()
      await expect(rail.getByRole('button', { name: 'Leave the walkthrough' })).toBeVisible()
      await expect(rail.locator('.bkit-rail-steps, .bkit-progress')).toHaveCount(0)

      // "Step N of 4" is read out, not drawn.
      await expect(rail).toContainText('Step 3 of 4')
      const lead = await box(rail.locator('.bkit-rail-head'))
      expect(lead.width, 'the count is drawn on a tablet').toBeLessThanOrEqual(1)
    } finally {
      await ctx.close()
    }
  })
}

// ─── No horizontal scroll ───
for (const { width, height } of [{ width: 360, height: 780 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  test(`${width}px: the bar adds no horizontal scroll, on each of the four tools`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height, theme: 'dark' })
    try {
      watch(page, `designer at ${width}px`)
      for (const [route, label, n] of [['/create/palette', 'Colours', 1], ['/create/font-pair', 'Fonts', 2], ['/create/type-scale', 'Type scale', 3], ['/create/icons', 'Icons', 4]]) {
        await go(page, route)
        await expectOnStep(page, label, n)
        const over = await page.evaluate(() => {
          const bar = document.querySelector('.bkit-rail')
          return {
            page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            bar: bar.scrollWidth - bar.clientWidth,
          }
        })
        expect(over.page, `${route}: the page scrolls sideways`).toBeLessThanOrEqual(0)
        expect(over.bar, `${route}: the bar overflows sideways`).toBeLessThanOrEqual(0)
      }
    } finally {
      await ctx.close()
    }
  })
}
