// PALETTE BUILDER: "NEAREST NAMED COLOURS" PANEL FOR ONE SWATCH.
//
// The swatch "..." menu has a Pro item that opens a panel with the closest entry
// of five colour systems (Tailwind v4, CSS, Material 2, Munsell, ISCC-NBS). The
// colour data is five hashed JSON files (/assets/<system>-<hash>.json, from
// src/data/nearest/<system>.json) that only a Pro person's panel fetches.
//
// What this pins:
//   1. Pro: the panel opens from "...", focus goes to its close button, five rows
//      fill, pressing a row copies that system's code and shows the "Copied"
//      toast, and Escape closes the panel and returns focus to that "...".
//   2. Free: the panel is the locked preview. Five placeholder rows, no real
//      match anywhere in the DOM, no request for any of the five files, and the
//      wall's button goes to /plans.
//   3. Offline: with the chunks refused every row says it failed and has its own
//      "Try again"; pressing one fills that row and leaves the others failed.
//   4. At 390 on a touch screen the panel sits inside the screen and the things
//      to press (rows, close, "How this works", the wall button, "Try again") are
//      44px or more both ways.
//
// The swatch is #6495ED on purpose: it IS the CSS colour "cornflowerblue", so the
// CSS row's name and copy value are known by hand, not worked out by the engine.
//
// MUTATIONS (what to break to see each go red):
//   1. In NearestMatchPanel.jsx drop the `onClick={() => onCopy?.(m.copy)}` of the row
//      button (copy test); in PaletteBuilder.jsx openColPanel remove the 'match' branch
//      (opens nothing); drop the focus() in the [colPanel] effect (focus test).
//   2. In NearestMatchPanel.jsx change `useSystems(isPro && planKnown)` to `useSystems(planKnown)`
//      (a Free person's panel now requests all five chunks: "makes no request" goes red);
//      or point the wall Link at another route.
//   3. In nearestLoader.js stop deleting a failed promise from the cache (Try again
//      re-rejects at once: the recovery tests go red); or make `retry` start every id
//      instead of the one asked.
//   4. Drop the `@media (pointer: coarse)` min-height block for .plb-match-* in
//      palette-builder.css, or `width: calc(100% - 24px)` in the 767px block.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// Swatch 1 is cornflowerblue exactly. The rest are ordinary palette colours.
const BOARD = '/create/palette?c=6495ED,14224A,F2C14E,2563EB,C0392B'
const SYSTEMS = ['tailwind', 'css', 'material', 'munsell', 'iscc-nbs']

// A colour-system file as the build emits it: /assets/<id>-<8 hash characters>.json.
// The fixed hash length keeps material-symbols-<hash>.js, a different file, out.
const CHUNK = /\/assets\/(tailwind|css|material|munsell|iscc-nbs)-[\w-]{8}\.json$/

/** A visitor at an exact width: touch metrics on a phone, a mouse above it. */
async function at(browser, width, { plan, height } = {}) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: height ?? 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: height ?? 900 } })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, `${plan || 'signed-out'} palette visitor at ${width}px`)
  // Every request for a colour-system file, whether or not it was answered.
  const chunks = []
  page.on('request', (req) => { if (CHUNK.test(new URL(req.url()).pathname)) chunks.push(new URL(req.url()).pathname) })
  if (plan) await signIn(page, { plan })
  await go(page, BOARD)
  await expect(page.locator('.plb-col')).toHaveCount(5)
  return { ctx, page, chunks }
}

const menuItem = (page) => page.getByRole('menuitem', { name: /^Nearest named colours/ })
const panelOf = (page, i = 0) => page.locator('.plb-col').nth(i).locator('.plb-matchpop')
const rows = (panel) => panel.locator('.plb-match-btn')

/** Open swatch `i`'s "..." with the keyboard and choose "Nearest named colours". */
async function openPanel(page, i = 0) {
  await page.locator('.plb-col').nth(i).locator('.plb-tool--more').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu', { name: 'Colour actions' })).toBeVisible()
  await menuItem(page).click()
  const panel = panelOf(page, i)
  await expect(panel).toBeVisible()
  return panel
}

/** The same on a phone: tap the "..." (always on screen on touch), then the item. */
async function tapOpenPanel(page, i = 0) {
  await page.locator('.plb-col').nth(i).locator('.plb-tool--more').tap()
  await expect(page.getByRole('menu', { name: 'Colour actions' })).toBeVisible()
  await menuItem(page).tap()
  const panel = panelOf(page, i)
  await expect(panel).toBeVisible()
  return panel
}

const sizeOf = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }
})

/** Where keyboard focus is: inside the panel, or on which swatch's "...". */
const focusPlace = (page) => page.evaluate(() => {
  const el = document.activeElement
  const col = el?.closest?.('.plb-col')
  return {
    col: col ? [...document.querySelectorAll('.plb-col')].indexOf(col) : -1,
    onMore: !!el?.classList?.contains('plb-tool--more'),
    inPanel: !!el?.closest?.('.plb-matchpop'),
    label: el?.getAttribute?.('aria-label') || '',
  }
})

test.describe('Pro: nearest named colours', () => {
  test('opens from "...", fills five rows, a row copies and toasts, Escape returns focus to "..."', async ({ browser }) => {
    const { ctx, page, chunks } = await at(browser, 1440, { plan: 'pro' })
    // The menu names the item and it carries no Pro chip for a Pro person.
    await page.locator('.plb-col').first().locator('.plb-tool--more').focus()
    await page.keyboard.press('Enter')
    await expect(menuItem(page)).toBeVisible()
    await expect(menuItem(page).locator('.plb-ctx-pro')).toHaveCount(0)
    await menuItem(page).click()

    const panel = panelOf(page, 0)
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('role', 'dialog')
    await expect(panel).toHaveAccessibleName('Nearest named colours for #6495ED')
    // Focus goes into the panel, onto its close button.
    await expect.poll(() => focusPlace(page), { message: 'focus after opening' })
      .toEqual({ col: 0, onMore: false, inPanel: true, label: 'Close nearest named colours' })

    // Five rows, one per system, in the data's order, none still loading or failed.
    await expect(rows(panel)).toHaveCount(5)
    await expect(panel.locator('.plb-match-row--loading, .plb-match-row--failed, .plb-match-row--locked')).toHaveCount(0)
    const cssRow = panel.getByRole('button', { name: /^CSS: cornflowerblue, very close, difference 0\.0\. Copy cornflowerblue$/ })
    await expect(cssRow).toBeVisible()
    await expect(cssRow.locator('.plb-match-word')).toHaveText('Very close')
    // A row is a list row: 8px corners, not the pill radius buttons take.
    expect(await cssRow.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('8px')
    // ISCC-NBS names read with a capital ("Moderate blue"); its "No." is text and only the number is code.
    const isccRow = panel.getByRole('button', { name: /^ISCC-NBS: [A-Z][a-z]/ })
    await expect(isccRow).toBeVisible()
    await expect(isccRow.locator('.plb-match-name')).toHaveText(/^[A-Z]/)
    await expect(isccRow.locator('.plb-match-meta')).toContainText(/ISCC-NBS · No\. \d+$/)
    await expect(isccRow.locator('.plb-match-meta code')).toHaveText(/^\d+$/)
    // The caveat sits on its own line under the group title.
    await expect(panel.locator('.plb-match-h-note')).toHaveText('Approximate. Check a physical swatch.')
    // One live region, mounted from the start and empty while nothing has failed.
    await expect(panel.locator('[role="status"]')).toHaveCount(1)
    await expect(panel.locator('[role="status"]')).toHaveText('')
    // "How this works" has a caret that turns over when it opens.
    const how = panel.locator('.plb-match-how')
    await expect(how.locator('.plb-match-caret svg')).toHaveCount(1)
    await how.locator('summary').click()
    await expect(how.locator('.plb-match-caret')).toHaveCSS('transform', /^matrix\(-1, /)
    await expect(how).toContainText('black and white match the nearest dark and light samples')
    await how.locator('summary').click()
    // Positive control for the Free test's "no request": a Pro panel asks for each file once.
    expect([...new Set(chunks.map((c) => c.split('/').pop().replace(/-[\w-]{8}\.json$/, '')))].sort()).toEqual([...SYSTEMS].sort())

    // Pressing the CSS row copies its code and shows the toast.
    await cssRow.click()
    await expect(page.getByText('Copied', { exact: true }).first()).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('cornflowerblue')

    // Escape closes it and puts focus back on this swatch's "...".
    await rows(panel).first().focus()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect.poll(() => focusPlace(page), { message: 'focus after Escape' })
      .toMatchObject({ col: 0, onMore: true, inPanel: false })
    await ctx.close()
  })

  test('a panel for another swatch names that swatch\'s colour, and the close button closes it', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { plan: 'pro' })
    const panel = await openPanel(page, 4)
    await expect(panel).toHaveAccessibleName('Nearest named colours for #C0392B')
    await expect(rows(panel)).toHaveCount(5)
    await panel.getByRole('button', { name: 'Close nearest named colours' }).click()
    await expect(panel).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('Free: the locked panel', () => {
  test('shows placeholders only, requests no colour-system file, and the wall button goes to /plans', async ({ browser }) => {
    const { ctx, page, chunks } = await at(browser, 1440, { plan: 'free' })
    await page.locator('.plb-col').first().locator('.plb-tool--more').focus()
    await page.keyboard.press('Enter')
    // The menu item is marked Pro.
    await expect(menuItem(page).locator('.plb-ctx-pro')).toHaveText('Pro')
    await menuItem(page).click()
    const panel = panelOf(page, 0)
    await expect(panel).toBeVisible()
    await expect(panel.locator('.plb-pop-title')).toContainText('Pro')

    // Five placeholder rows with the real system names; no pressable row.
    await expect(panel.locator('.plb-match-row--locked')).toHaveCount(5)
    await expect(rows(panel)).toHaveCount(0)
    for (const label of ['Tailwind v4', 'CSS', 'Material', 'Munsell', 'ISCC-NBS']) {
      await expect(panel.locator('.plb-match-row--locked .plb-match-meta', { hasText: new RegExp(`^${label}$`) })).toHaveCount(1)
    }
    // Nothing in the DOM is a real match: #6495ED would read as cornflowerblue.
    expect((await panel.innerText()).toLowerCase()).not.toContain('cornflowerblue')
    expect(await panel.locator('.plb-match-word, .plb-match-de, .plb-match-name').count()).toBe(0)

    // Give a stray request time to start, then check none did.
    await page.waitForLoadState('networkidle').catch(() => {})
    expect(chunks, 'a Free person asked for colour-system data').toEqual([])

    // The wall.
    const wall = panel.getByRole('link', { name: 'Upgrade to Pro' })
    await expect(wall).toHaveAttribute('href', '/plans')
    // Tab order: "How this works" first, then the Upgrade link (it is after it on the page too).
    await panel.locator('.plb-match-how summary').focus()
    await page.keyboard.press('Tab')
    await expect(wall).toBeFocused()
    await wall.click()
    await expect(page).toHaveURL(/\/plans(\?|#|$)/)
    expect(chunks, 'still no colour-system request after the wall').toEqual([])
    await ctx.close()
  })

  test('a signed-out visitor gets the same locked panel and no request either', async ({ browser }) => {
    const { ctx, page, chunks } = await at(browser, 1440)
    const panel = await openPanel(page, 0)
    await expect(panel.locator('.plb-match-row--locked')).toHaveCount(5)
    await expect(rows(panel)).toHaveCount(0)
    await page.waitForLoadState('networkidle').catch(() => {})
    expect(chunks).toEqual([])
    await ctx.close()
  })
})

// A person with no connection: the browser reports offline AND the files fail.
// The loader uses fetch(), so a failure here is a rejected fetch. It never
// reaches vite:preloadError, so the page is not reloaded under the person. The
// tests prove that with a window marker that only survives while the page stays
// the same document.
const refuse = async (ctx) => {
  await ctx.route(CHUNK, (route) => route.abort('internetdisconnected'))
  await ctx.setOffline(true)
}
const restore = async (ctx) => {
  await ctx.setOffline(false)
  await ctx.unroute(CHUNK)
}
// Two systems refused while the network works for the other three.
const refuseTwo = async (ctx, page) => {
  await ctx.route(/\/assets\/(munsell|iscc-nbs)-[\w-]{8}\.json$/, (route) => route.abort('internetdisconnected'))
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }))
}
const restoreTwo = (ctx) => ctx.unroute(/\/assets\/(munsell|iscc-nbs)-[\w-]{8}\.json$/)
const systemOf = (chunk) => chunk.split('/').pop().replace(/-[\w-]{8}\.json$/, '')

test.describe('Offline: the colour systems cannot load', () => {
  test('all five failing gives one message and one "Try again", and no rows', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { plan: 'pro' })
    await refuse(ctx)
    const panel = await openPanel(page, 0)

    const all = panel.locator('.plb-match-allfail')
    await expect(all).toBeVisible()
    await expect(all).toContainText('Couldn’t load the colour systems. Check your connection.')
    await expect(all.getByRole('button', { name: 'Try again' })).toHaveCount(1)
    await expect(rows(panel)).toHaveCount(0)
    await expect(panel.locator('.plb-match-row')).toHaveCount(0)
    // The page did not reload under the person: the panel is still the one for swatch 1.
    await expect(panel).toHaveAccessibleName('Nearest named colours for #6495ED')
    await ctx.close()
  })

  // Recovery. The loader fetch()es each file and drops a failed load from its
  // cache, so "Try again" is a real request each time. (With import() the browser
  // would cache the failure and the retry would never reach the network.)
  test('a "Try again" that fails again stays failed; once the connection is back the next one fills all five rows without reloading the page', async ({ browser }) => {
    const { ctx, page, chunks } = await at(browser, 1440, { plan: 'pro' })
    await refuse(ctx)
    const panel = await openPanel(page, 0)
    const all = panel.locator('.plb-match-allfail')
    await expect(all).toBeVisible()
    // Survives only while this is the same document: a reload clears it.
    await page.evaluate(() => { window.__nmStillHere = true })

    // Still offline: pressing it asks for all five again (a real request each) and fails again.
    const afterFirstFail = chunks.length
    await all.getByRole('button', { name: 'Try again' }).click()
    await expect.poll(() => chunks.length - afterFirstFail, { message: 'a retry while offline is a real request for each system' }).toBe(5)
    await expect(all).toBeVisible()
    await expect(rows(panel)).toHaveCount(0)

    // The connection comes back; the same button now works.
    await restore(ctx)
    const before = chunks.length
    await all.getByRole('button', { name: 'Try again' }).click()
    await expect(rows(panel)).toHaveCount(5)
    await expect(all).toHaveCount(0)
    await expect(panel.getByRole('button', { name: /^CSS: cornflowerblue, very close/ })).toBeVisible()
    expect(await page.evaluate(() => window.__nmStillHere), 'the page was reloaded').toBe(true)
    expect(chunks.length - before, 'a retry is a real request for each system').toBe(5)
    // Same panel, same swatch, same URL: nothing re-opened or navigated under the person.
    await expect(panel).toHaveAccessibleName('Nearest named colours for #6495ED')
    await expect(page).toHaveURL(/\/create\/palette\?c=6495ED/)
    await ctx.close()
  })

  test('two systems failing leaves three filled, and each failed row says so with its own "Try again"', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { plan: 'pro' })
    await refuseTwo(ctx, page)
    const panel = await openPanel(page, 0)

    await expect(rows(panel)).toHaveCount(3)
    const failed = panel.locator('.plb-match-row--failed')
    await expect(failed).toHaveCount(2)
    await expect(panel.locator('.plb-match-allfail')).toHaveCount(0)
    await expect(failed.nth(0)).toContainText('Couldn’t load Munsell.')
    await expect(failed.nth(1)).toContainText('Couldn’t load ISCC-NBS.')
    await expect(failed.nth(0).getByRole('button', { name: 'Try again' })).toHaveCount(1)
    await expect(failed.nth(1).getByRole('button', { name: 'Try again' })).toHaveCount(1)
    // Said once to a screen reader, naming both.
    await expect(panel.locator('[role="status"]', { hasText: 'Couldn’t load Munsell. Couldn’t load ISCC-NBS' })).toHaveCount(1)
    await ctx.close()
  })

  test('a row\'s "Try again" fills only that row, asking for that one system, then the other', async ({ browser }) => {
    const { ctx, page, chunks } = await at(browser, 1440, { plan: 'pro' })
    await refuseTwo(ctx, page)
    const panel = await openPanel(page, 0)
    const failed = panel.locator('.plb-match-row--failed')
    await expect(failed).toHaveCount(2)
    await page.evaluate(() => { window.__nmStillHere = true })

    await restoreTwo(ctx)
    const before = chunks.length
    await failed.nth(0).getByRole('button', { name: 'Try again' }).click()
    await expect(rows(panel)).toHaveCount(4)
    await expect(failed).toHaveCount(1)
    await expect(failed.first()).toContainText('Couldn’t load ISCC-NBS.')
    expect(chunks.slice(before).map(systemOf), 'it asked for Munsell again and nothing else').toEqual(['munsell'])

    await failed.first().getByRole('button', { name: 'Try again' }).click()
    await expect(rows(panel)).toHaveCount(5)
    await expect(failed).toHaveCount(0)
    expect(await page.evaluate(() => window.__nmStillHere), 'the page was reloaded').toBe(true)
    await ctx.close()
  })
})

test.describe('On a phone (390)', () => {
  // Each target is measured as drawn, not read from the CSS.
  const expectTargets = async (locators, floor = 44) => {
    for (const [what, loc] of locators) {
      const count = await loc.count()
      expect(count, `${what}: found`).toBeGreaterThan(0)
      for (let n = 0; n < count; n++) {
        const { w, h } = await sizeOf(loc.nth(n))
        expect(h, `${what} #${n} height`).toBeGreaterThanOrEqual(floor)
        expect(w, `${what} #${n} width`).toBeGreaterThanOrEqual(floor)
      }
    }
  }
  const expectFits = async (page, panel) => {
    const box = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: innerWidth, vh: innerHeight, docW: document.documentElement.scrollWidth }
    })
    expect(box.left, 'panel left edge').toBeGreaterThanOrEqual(0)
    expect(box.right, 'panel right edge').toBeLessThanOrEqual(box.vw)
    expect(box.docW, 'no sideways scroll on the page').toBeLessThanOrEqual(box.vw)
    // Nothing inside the panel pokes out of it sideways.
    const wide = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return [...el.querySelectorAll('*')].filter((n) => {
        const b = n.getBoundingClientRect()
        return b.width > 0 && (b.left < r.left - 0.5 || b.right > r.right + 0.5) && !n.closest('.plb-match-sr')
      }).map((n) => n.className || n.tagName).slice(0, 5)
    })
    expect(wide, 'children outside the panel').toEqual([])
  }

  test('Pro: the panel fits and every target is 44px', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, { plan: 'pro' })
    const panel = await tapOpenPanel(page, 2)
    await expect(rows(panel)).toHaveCount(5)
    await expectFits(page, panel)
    await expectTargets([
      ['row', rows(panel)],
      ['close', panel.getByRole('button', { name: 'Close nearest named colours' })],
    ])
    const { h } = await sizeOf(panel.locator('.plb-match-how summary'))
    expect(h, 'How this works summary height').toBeGreaterThanOrEqual(44)
    await ctx.close()
  })

  test('Free: the locked panel fits and its button and close are 44px', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, { plan: 'free' })
    const panel = await tapOpenPanel(page, 2)
    await expect(panel.locator('.plb-match-row--locked')).toHaveCount(5)
    await expectFits(page, panel)
    await expectTargets([
      ['upgrade', panel.getByRole('link', { name: 'Upgrade to Pro' })],
      ['close', panel.getByRole('button', { name: 'Close nearest named colours' })],
    ])
    const { h } = await sizeOf(panel.locator('.plb-match-how summary'))
    expect(h, 'How this works summary height').toBeGreaterThanOrEqual(44)
    await ctx.close()
  })


  test('Offline: the message fits and its "Try again" is 44px', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, { plan: 'pro' })
    await refuse(ctx)
    const panel = await tapOpenPanel(page, 2)
    const all = panel.locator('.plb-match-allfail')
    await expect(all).toBeVisible()
    await expectFits(page, panel)
    await expectTargets([['Try again', all.getByRole('button', { name: 'Try again' })]])
    await ctx.close()
  })

  test('Two rows failed: the failed rows fit and each "Try again" is 44px', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, { plan: 'pro' })
    await refuseTwo(ctx, page)
    const panel = await tapOpenPanel(page, 2)
    await expect(panel.locator('.plb-match-row--failed')).toHaveCount(2)
    await expect(rows(panel)).toHaveCount(3)
    await expectFits(page, panel)
    const retry = panel.getByRole('button', { name: 'Try again' })
    await expect(retry).toHaveCount(2)
    for (let n = 0; n < 2; n++) {
      const { h } = await sizeOf(retry.nth(n))
      expect(h, `Try again #${n} height`).toBeGreaterThanOrEqual(44)
    }
    await ctx.close()
  })
})
