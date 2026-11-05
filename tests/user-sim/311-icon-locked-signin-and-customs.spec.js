// A SIGNED-OUT VISITOR ON A PRO PACK LOGS IN FIRST, EMOJI IS NOT AN ICON PACK, AND
// SAVED CUSTOM ICONS ARE CLEANED ON LOAD AND DRAWN FROM THE SPRITE.
//
// Cards 6457cc18d9 and 578fced35e (src/pages/IconLibrary.jsx, src/utils/customIcons.js).
//
//   (a) Signed out, choosing a Pro pack shows the gate wall with a "Log in"
//       primary button (it opens the sign-in dialog) and a "See Pro plans" link
//       to /plans. Its copy says the pack is Pro. The pack menu holds no emoji set.
//   (b) A hostile record in localStorage `vs-custom-icons` runs nothing when My
//       icons opens, nothing hostile reaches the page, and a clean record draws as
//       <svg><use></svg> inside the grid.
//
// MUTATION: in IconLibrary.jsx make `anonOnPro` always false -> (a) fails on the
//   primary button being "See what Pro includes" and on the missing secondary link.
// MUTATION: in IconLibrary.jsx put ['twemoji', 'Twemoji'] back into PACK_MENU's 'Flat' group
//   -> (a) fails on the twemoji option count.
// MUTATION: in browseCustom replace `cleanCustomIcons(readCustomIcons())` with
//   `readCustomIcons()` -> (b) fails on the script text / on* attribute being in the DOM.
// MUTATION: in cellGlyph make `customSymbolRef(icon)` return '' -> (b) fails: the clean
//   record draws as <img>, not <use>.
import { test, expect } from './base.js'
import { chooseMenuOption, go, watch } from './helpers.js'

const ROUTE = '/create/icons'
const STORE = 'vs-custom-icons'
const SVG = (body, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${attrs}>${body}</svg>`

// The stored shape is what handleSaveToProject writes: a record per icon with a unique `key`, the
// display `name`, the `base` it came from, and the baked `svg`. `colored: false` is a plain line icon.
const record = (key, name, svg) => ({ key, ts: 1, name, base: name, iteration: 1, projectId: null, pack: null, cdn: false, svg, color: '', size: 24, isStroke: true, colored: false })
const CLEAN = record(`${STORE}:1:clean`, 'Clean line', SVG('<path d="M5 12h14"/>', 'fill="none" stroke="currentColor" stroke-width="2"'))
const HOSTILE = [
  record(`${STORE}:2:script`, 'Hostile script', SVG('<script>window.__pwned="script"</script><path d="M0 0h24v24H0z"/>')),
  record(`${STORE}:3:onattr`, 'Hostile handler', SVG('<path onclick="window.__pwned=\'on\'" onmouseover="window.__pwned=\'on\'" d="M2 2h20v20H2z"/>', 'onload="window.__pwned=\'load\'"')),
  record(`${STORE}:4:href`, 'Hostile href', SVG('<use href="javascript:window.__pwned=\'href\'"/><circle cx="12" cy="12" r="8"/>')),
  record(`${STORE}:5:foreign`, 'Hostile foreign', SVG('<foreignObject width="24" height="24"><img src="x" onerror="window.__pwned=\'fo\'"/></foreignObject><rect x="4" y="4" width="16" height="16"/>')),
]

test.describe('(a) a Pro pack for a signed-out visitor', () => {
  test('the wall logs in first, offers the plans second, and the pack menu has no emoji set', async ({ page }) => {
    watch(page, 'a signed-out visitor meeting a Pro pack')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, ROUTE)
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20_000 })

    // Emoji is not an icon category: no emoji set in the menu. POSITIVE CONTROL: the menu is open and has packs.
    await page.getByRole('button', { name: 'Icon pack' }).click()
    const list = page.locator('.menu-select-list[role="listbox"]')
    await expect(list.locator('[role="option"][data-value="simple-icons"]'), 'POSITIVE CONTROL: the menu is open').toHaveCount(1)
    for (const pack of ['twemoji', 'noto', 'openmoji', 'fluent-emoji']) {
      await expect(list.locator(`[role="option"][data-value="${pack}"]`), `${pack} is not in the pack menu`).toHaveCount(0)
    }
    await page.keyboard.press('Escape')

    // A Pro pack: the wall says it is Pro, its primary button is Log in, its second link is the plans.
    await chooseMenuOption(page, page.locator('.lbry-select'), 'simple-icons')
    const wall = page.locator('.ig-gate')
    await expect(wall).toBeVisible()
    await expect(wall).toContainText('Simple Icons is a Pro pack')
    await expect(wall.getByRole('link', { name: 'See Pro plans' })).toHaveAttribute('href', '/plans')
    await expect(wall.getByRole('link', { name: 'See what Pro includes' }), 'no straight-to-plans primary').toHaveCount(0)

    await wall.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('dialog'), 'the primary button opens the sign-in dialog').toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${ROUTE}$`))
    await page.keyboard.press('Escape')

    await wall.getByRole('link', { name: 'See Pro plans' }).click()
    await expect(page).toHaveURL(/\/plans$/)
  })

  test('a pack that needs only a free account still says so and logs in', async ({ page }) => {
    watch(page, 'a signed-out visitor meeting a free-account pack')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, ROUTE)
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20_000 })
    await chooseMenuOption(page, page.locator('.lbry-select'), 'solar')
    const wall = page.locator('.ig-gate')
    await expect(wall).toContainText('needs a free account')
    await expect(wall.getByRole('link', { name: 'See Pro plans' }), 'the free wall has no plans link').toHaveCount(0)
    await wall.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

test.describe('(b) saved custom icons', () => {
  test('hostile records run nothing and draw nothing hostile, a clean one draws as <use>', async ({ page }) => {
    watch(page, 'a visitor whose saved icons were written by another path')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript(({ key, list }) => {
      localStorage.setItem(key, JSON.stringify(list))
    }, { key: STORE, list: [CLEAN, ...HOSTILE] })
    await go(page, ROUTE)
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20_000 })

    await page.locator('button.ig-mine').click()
    await expect(page.locator('button.ig-mine')).toHaveAttribute('aria-pressed', 'true')
    const cell = page.locator('.ig .ic', { hasText: 'Clean line' })
    await expect(cell, 'the clean record is listed by its name').toHaveCount(1)
    // Let a hover/focus and a beat of time pass: an inline handler would have fired by now.
    await cell.hover()
    await page.waitForTimeout(500)

    expect(await page.evaluate(() => window.__pwned), 'nothing the stored markup carried ran').toBeUndefined()

    // POSITIVE CONTROL for the absence checks: the clean record IS drawn, as a sprite use, in the grid.
    const use = cell.locator('svg.ig-sym use')
    await expect(use).toHaveCount(1)
    const href = await use.getAttribute('href')
    expect(href).toMatch(/^#ics\d+$/)
    expect(await page.evaluate((h) => !!document.querySelector(`#ig-sprite symbol${h}`), href), 'the symbol is in the sprite').toBe(true)
    await expect(cell.locator('img'), 'the clean record is not an <img> any more').toHaveCount(0)

    // Nothing hostile reached the page: not in the grid, not in the sprite, not anywhere in the DOM.
    const html = await page.evaluate(() => document.documentElement.outerHTML)
    expect(html).not.toMatch(/__pwned/)
    expect(html).not.toMatch(/foreignObject/i)
    expect(html).not.toMatch(/javascript:/i)
    expect(await page.locator('.ig svg [onclick], .ig svg [onload], #ig-sprite [onclick], #ig-sprite [onload]').count()).toBe(0)

    // Clicking the clean one still opens the customiser on it, with its name.
    await cell.click()
    await expect(page.getByRole('dialog').or(page.locator('.icust')).first()).toBeVisible({ timeout: 10_000 })
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined()
  })

  test('storage is not rewritten by looking: a record the page would not show is still stored', async ({ page }) => {
    watch(page, 'a visitor with a stored record that fails the sanitiser')
    await page.addInitScript(({ key, list }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(list))
    }, { key: STORE, list: [CLEAN, HOSTILE[0]] })
    await go(page, ROUTE)
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20_000 })
    await page.locator('button.ig-mine').click()
    await expect(page.locator('.ig .ic', { hasText: 'Clean line' })).toHaveCount(1)
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]').length, STORE)
    expect(stored, 'viewing My icons does not delete a stored record').toBe(2)
  })
})
