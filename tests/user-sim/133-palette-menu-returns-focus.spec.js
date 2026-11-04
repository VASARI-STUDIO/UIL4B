// A swatch's "..." menu hands focus back. Choosing an item unmounts the
// focused item with the menu, so focus must land on a swatch's "..." (the
// swatch the action was for, or after Remove the one that took its place),
// and ArrowDown / End must leave the focused item clear of the 16px fade
// that marks "more below".
//
// Each test names the code to break to see it fail (MUTATION lines).
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** A context at an exact width: touch metrics on a phone, a mouse above it. */
async function at(browser, width, { theme = 'light', height, plan } = {}) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: height ?? 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: height ?? 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `palette visitor at ${width}px`)
  if (plan) await signIn(page, { plan })
  await go(page, '/create/palette')
  await expect(page.locator('.plb-col')).toHaveCount(5)
  return { ctx, page }
}

/** Where keyboard focus is: the swatch it is in, and whether it is on that swatch's "...". */
const focusPlace = (page) => page.evaluate(() => {
  const el = document.activeElement
  const col = el?.closest?.('.plb-col')
  return {
    col: col ? [...document.querySelectorAll('.plb-col')].indexOf(col) : -1,
    onMore: !!el?.classList?.contains('plb-tool--more'),
    tag: el?.tagName,
  }
})

/** Open swatch `i`'s "..." menu from the keyboard; the first item takes focus. */
async function openMenu(page, i) {
  await page.locator('.plb-col').nth(i).locator('.plb-tool--more').focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Colour actions' })
  await expect(menu).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('menuitem')
  return menu
}

/** Choose a menu item by keyboard (focus it, press Enter). */
async function choose(page, name) {
  await page.getByRole('menuitem', { name, exact: true }).focus()
  await page.keyboard.press('Enter')
}

test.describe('swatch "..." menu hands focus back', () => {
  // MUTATION: in PaletteBuilder.jsx change closeCtxMenu to only call setCtxMenu(null).
  const STAYS = [
    ['Copy hex', 2, 2],
    ['Use as seed', 2, 2],
    ['Lock', 2, 2],
    ['Swap left', 2, 1],   // the swatch moved left, focus follows it
    ['Swap right', 2, 3],  // ... and right
    ['Insert left', 2, 3], // the new colour goes in at 2, the swatch it was for is now at 3
    ['Insert right', 2, 2],
  ]
  for (const [item, from, to] of STAYS) {
    test(`${item}: focus lands on the "..." of swatch ${to + 1} (the one it was for)`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 1440)
      await openMenu(page, from)
      await choose(page, item)
      await expect(page.getByRole('menu', { name: 'Colour actions' })).toHaveCount(0)
      await expect.poll(() => focusPlace(page), { message: `focus after ${item}` }).toEqual({ col: to, onMore: true, tag: 'BUTTON' })
      await ctx.close()
    })
  }

  // View tints and Colour values open a panel, so focus goes into it (its close
  // button) and comes back to that swatch's "..." when the panel closes.
  // MUTATION: drop the focus call in the panel's open effect, or the return in its close.
  for (const item of ['View tints', 'Colour values']) {
    test(`${item}: focus goes into the panel, then back to the "..." of swatch 3 on Escape`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 1440)
      await openMenu(page, 2)
      await choose(page, item)
      await expect(page.getByRole('menu', { name: 'Colour actions' })).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => {
        const el = document.activeElement
        return { col: el?.closest('.plb-col') ? [...document.querySelectorAll('.plb-col')].indexOf(el.closest('.plb-col')) : -1, inPanel: !!el?.closest('.plb-tintpop'), tag: el?.tagName }
      }), { message: `focus after ${item}` }).toEqual({ col: 2, inPanel: true, tag: 'BUTTON' })
      await page.keyboard.press('Escape')
      await expect.poll(() => focusPlace(page), { message: `focus after closing ${item}` }).toEqual({ col: 2, onMore: true, tag: 'BUTTON' })
      await ctx.close()
    })
  }

  test('Edit in HCT (Pro): focus lands back on the "..." of that swatch', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440, { plan: 'pro' })
    await openMenu(page, 1)
    await choose(page, 'Edit in HCT')
    await expect(page.getByRole('menu', { name: 'Colour actions' })).toHaveCount(0)
    await expect.poll(() => focusPlace(page)).toEqual({ col: 1, onMore: true, tag: 'BUTTON' })
    await ctx.close()
  })

  // MUTATION: in removeCol drop the `fromMenu` line (or the ctxReturnRef assignment).
  test('Remove: focus goes to the next swatch\'s "...", or the previous one if the last was removed', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    await openMenu(page, 1)
    await choose(page, 'Remove')
    await expect(page.locator('.plb-col')).toHaveCount(4)
    // swatch 1 is gone; the old swatch 2 now sits in slot 1
    await expect.poll(() => focusPlace(page), { message: 'focus after removing a middle swatch' }).toEqual({ col: 1, onMore: true, tag: 'BUTTON' })

    await openMenu(page, 3) // now the last of four
    await choose(page, 'Remove')
    await expect(page.locator('.plb-col')).toHaveCount(3)
    await expect.poll(() => focusPlace(page), { message: 'focus after removing the last swatch' }).toEqual({ col: 2, onMore: true, tag: 'BUTTON' })
    await ctx.close()
  })

  // A mouse press must not light a focus ring on the "..." it hands focus to.
  test('a mouse-chosen item leaves focus on the "..." without a keyboard ring', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(2)
    await col.hover()
    await col.locator('.plb-tool--more').click()
    await page.getByRole('menuitem', { name: 'Lock', exact: true }).click()
    await expect.poll(() => focusPlace(page)).toEqual({ col: 2, onMore: true, tag: 'BUTTON' })
    expect(await page.evaluate(() => document.activeElement.matches(':focus-visible')), 'no ring after a mouse choice').toBe(false)
    await ctx.close()
  })

  // MUTATION: delete `scroll-padding-block-end` from `.plb .plb-ctx` in palette-builder.css.
  test('ArrowDown and End leave the focused item clear of the 16px scroll fade', async ({ browser }) => {
    // Short enough that the menu scrolls (about 11 items at 31px each).
    const { ctx, page } = await at(browser, 1440, { height: 340 })
    const menu = await openMenu(page, 1)
    await expect(menu).toHaveAttribute('data-scroll-more', 'true')

    const clearance = () => page.evaluate(() => {
      const m = document.querySelector('.plb-ctx')
      const it = document.activeElement
      const mr = m.getBoundingClientRect()
      const ir = it.getBoundingClientRect()
      const max = m.scrollHeight - m.clientHeight
      return { gap: mr.bottom - ir.bottom, more: m.dataset.scrollMore, atEnd: m.scrollTop >= max - 1, top: ir.top - mr.top, label: it.textContent.trim() }
    })
    const items = await page.getByRole('menuitem').count()
    expect(items, 'enough items to scroll').toBeGreaterThan(6)
    for (let k = 1; k < items; k++) {
      await page.keyboard.press('ArrowDown')
      // the cue is refreshed on the scroll event, so wait for it to settle
      await expect.poll(async () => {
        const c = await clearance()
        // while the fade is on, the item sits above it; once at the end there is no fade
        return c.more === 'true' ? c.gap >= 16 - 0.5 : c.atEnd && c.gap >= -0.5
      }, { message: `item ${k + 1} clear of the fade` }).toBe(true)
    }
    await page.keyboard.press('Home')
    await page.keyboard.press('End')
    await expect.poll(async () => {
      const c = await clearance()
      return c.more === 'false' && c.gap >= -0.5
    }, { message: 'End: the last item shows in full with no fade over it' }).toBe(true)
    await ctx.close()
  })
})
