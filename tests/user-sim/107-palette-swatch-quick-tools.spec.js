// The per-swatch quick tools on the Palette Builder: Edit in HCT, Swap, Remove.
//
// They sit beside the lock on each swatch, one press from the colour, and each
// is also an item in the "Colour actions" menu. They are revealed three ways,
// and each way has its own test because each is its own piece of CSS or code:
//
//   1. a pointer hovering the swatch,
//   2. the keyboard reaching a control in the swatch (the tools stay rendered
//      and focusable at rest from 768px up, so focus is what
//      shows them — never `visibility:hidden` or `display:none`),
//   3. a tap on the bare swatch where there is no hover, from 768px up.
// Phones show only Lock and More actions, with quick actions in the menu.
//
// EVERY TEST CARRIES A POSITIVE CONTROL. "The tools are hidden at rest" and
// "nothing overlapped" are both true of a page that never painted, so each test
// first proves five swatches were drawn and the tools exist in the DOM.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

const QUICK = [/^Edit .+ in HCT$/, /^Choose a direction to swap /, /^Remove /]

/** A context at an exact width: touch metrics on a phone, a mouse above it
 *  (or touch at any width with `touch`, as on an iPad). */
async function at(browser, width, { theme = 'light', touch = false } = {}) {
  const ctx = await browser.newContext(width < 700 || touch
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `palette visitor at ${width}px`)
  await go(page, '/create/palette')
  await expect(page.locator('.plb-col')).toHaveCount(5)
  return { ctx, page }
}

/** How each quick tool of one swatch is painted right now. */
const quickState = (col) => col.evaluate((el, patterns) => {
  const tools = [...el.querySelectorAll('.plb-col-quick .plb-tool')]
  return patterns.map(([source]) => {
    const tool = tools.find((t) => new RegExp(source).test(t.getAttribute('aria-label') || ''))
    if (!tool) return null
    const cs = getComputedStyle(tool)
    const r = tool.getBoundingClientRect()
    return { label: tool.getAttribute('aria-label'), visibility: cs.visibility,
      opacity: parseFloat(cs.opacity), width: Math.round(r.width), height: Math.round(r.height) }
  })
}, QUICK.map((re) => [re.source]))

const painted = (s) => !!s && s.width > 0 && s.visibility !== 'hidden' && s.opacity > 0.99

test.describe('the per-swatch quick tools', () => {
  test('hovering a swatch shows Edit in HCT, Swap and Remove, and Swap and Remove work', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(1)

    // POSITIVE CONTROL: the three tools are in the DOM, so "hidden" below is a
    // state of real controls and not an absence.
    const rest = await quickState(col)
    expect(rest.every(Boolean), `all three quick tools exist: ${JSON.stringify(rest)}`).toBe(true)
    expect(rest.some(painted), 'a swatch at rest is clean — no quick tool painted').toBe(false)

    await col.hover()
    await expect.poll(async () => (await quickState(col)).every(painted), { message: 'hover reveals all three quick tools' }).toBe(true)
    const shown = await quickState(col)
    expect(shown.map((s) => s.label)).toEqual([
      expect.stringMatching(QUICK[0]), expect.stringMatching(QUICK[1]), expect.stringMatching(QUICK[2]),
    ])

    // The lock and the actions button keep their place beside the new stack.
    await expect(col.getByRole('button', { name: /^(Lock|Unlock) / })).toBeVisible()
    await expect(col.getByRole('button', { name: /^More actions for / })).toBeVisible()

    // Swap: choose a direction, and the two colours trade places.
    const hexes = () => page.locator('.plb-col .plb-hex').allTextContents()
    const before = await hexes()
    expect(before).toHaveLength(5)
    await col.getByRole('button', { name: /^Choose a direction to swap / }).click()
    await page.getByRole('menu', { name: /^Swap / }).getByRole('menuitem', { name: /Swap right/ }).click()
    await expect.poll(hexes).toEqual([before[0], before[2], before[1], before[3], before[4]])
    await expect(page.getByRole('menu', { name: /^Swap / })).toHaveCount(0)

    // Remove: one press takes the colour out.
    await page.locator('.plb-col').nth(3).hover()
    await page.locator('.plb-col').nth(3).getByRole('button', { name: /^Remove / }).click()
    await expect(page.locator('.plb-col')).toHaveCount(4)
    await ctx.close()
  })

  test('the keyboard reaches the quick tools and they are painted when focused', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(2)

    // POSITIVE CONTROL: at rest the tools are not painted, so what follows is
    // the focus doing the revealing.
    const rest = await quickState(col)
    expect(rest.every(Boolean)).toBe(true)
    expect(rest.some(painted), 'quick tools are not painted before focus arrives').toBe(false)

    await col.getByRole('button', { name: /^(Lock|Unlock) / }).focus()
    await page.keyboard.press('Tab') // More actions
    await page.keyboard.press('Tab') // Edit in HCT — the first quick tool
    const focused = await page.evaluate(() => {
      const el = document.activeElement
      return { label: el.getAttribute('aria-label'), visibility: getComputedStyle(el).visibility }
    })
    expect(focused.label, 'Tab from the lock reaches the quick tools in order').toMatch(QUICK[0])
    expect(focused.visibility).not.toBe('hidden')
    // The reveal is a short fade, so wait for the focused tool's animations to
    // finish (no blind timeout), then read the settled opacity.
    await page.evaluate(() => Promise.all(document.activeElement.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))))
    expect(await page.evaluate(() => {
      let opacity = 1
      for (let n = document.activeElement; n && n !== document.body; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity)
      return opacity
    }), 'the tool that has focus is painted').toBe(1)
    expect((await quickState(col)).every(painted), 'the whole stack shows while focus is inside the swatch').toBe(true)

    // Enter on Swap opens its menu from the keyboard.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu', { name: /^Swap / })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu', { name: /^Swap / })).toHaveCount(0)
    await ctx.close()
  })

  // A transparent tool must not take the pointer. A click on a pointer with no
  // hover lands on whatever element is hit at that spot, so the hit test is the
  // click: it must not be a quick tool while that tool is still hidden.
  /** The quick tool (if any) the pointer would hit at the centre of each tool's box. */
  const hitsOf = (col) => col.evaluate((el) => [...el.querySelectorAll('.plb-col-quick .plb-tool')].map((tool) => {
    const r = tool.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { label: tool.getAttribute('aria-label'), hitTool: !!(hit && hit.closest('.plb-tool--quick')) }
  }))

  test('on desktop a hidden Remove is not hit by the pointer at rest, and a press on its spot removes nothing', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(2)
    await page.mouse.move(5, 5)

    // POSITIVE CONTROL: the three tools exist and none is painted.
    const rest = await quickState(col)
    expect(rest.every(Boolean), 'all three quick tools exist').toBe(true)
    expect(rest.some(painted), 'no quick tool is painted at rest').toBe(false)

    const atRest = await hitsOf(col)
    expect(atRest, 'three tools measured').toHaveLength(3)
    expect(atRest.filter((h) => h.hitTool), 'no hidden tool takes the pointer at rest').toEqual([])

    const remove = await col.getByRole('button', { name: /^Remove / }).evaluate((b) => {
      const r = b.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, hitIsRemove: hit === b || b.contains(hit),
        pointerEvents: getComputedStyle(b).pointerEvents }
    })
    expect(remove.hitIsRemove, 'the element at the Remove centre is not Remove').toBe(false)
    expect(remove.pointerEvents, 'a hidden Remove takes no pointer').toBe('none')

    // A real press on that spot is the LAST step: on the bare swatch it opens
    // the tools (the tap toggle), so nothing after it may rely on them hidden.
    // If Remove were live here it would take the press and a colour would go.
    await page.mouse.click(remove.x, remove.y)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await ctx.close()
  })

  test('on desktop hovering a swatch and pressing its settled Remove takes that one colour out', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(3)
    await col.hover()
    await expect.poll(async () => (await quickState(col)).every(painted), { message: 'hover reveals the quick tools' }).toBe(true)
    // Wait for the reveal animation to finish rather than sleeping.
    const remove = col.getByRole('button', { name: /^Remove / })
    await remove.evaluate((b) => Promise.all(b.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))))
    await remove.click()
    await expect(page.locator('.plb-col')).toHaveCount(4)
    await ctx.close()
  })

  test('on desktop a hidden quick tool beside a revealed sibling is not hit by the pointer', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(2)
    await page.mouse.move(5, 5)
    expect((await quickState(col)).every(Boolean), 'all three quick tools exist').toBe(true)

    // Swap open keeps only Swap revealed: the pressed tool is painted, the
    // other two are still transparent and still must not take the pointer.
    await col.hover()
    await col.getByRole('button', { name: /^Choose a direction to swap / }).click()
    await expect(page.getByRole('menu', { name: /^Swap / })).toBeVisible()
    await page.evaluate(() => document.activeElement?.blur())
    await page.mouse.move(5, 5)
    await expect.poll(async () => {
      const s = await quickState(col)
      return s.map((t) => painted(t))
    }, { message: 'only the pressed Swap tool stays painted' }).toEqual([false, true, false])
    const beside = await hitsOf(col)
    expect(beside.filter((h) => h.hitTool).map((h) => h.label), 'only the revealed Swap tool takes the pointer')
      .toEqual([expect.stringMatching(QUICK[1])])
    await ctx.close()
  })

  // The swap menu's items unmount with it, so focus has to be put back on the
  // Swap button; otherwise it falls to the page and the keyboard loses its place.
  test('Escape from a swap menu item, or choosing a direction, returns focus to the Swap button', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(2)
    const swap = col.getByRole('button', { name: /^Choose a direction to swap / })
    const focusedLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName)

    for (const how of ['Escape', 'Enter']) {
      await swap.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('menu', { name: /^Swap / })).toBeVisible()
      await page.keyboard.press('Tab') // Remove
      await page.keyboard.press('Tab') // the first direction
      expect(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'focus is on a menu item').toBe('menuitem')

      await page.keyboard.press(how)
      await expect(page.getByRole('menu', { name: /^Swap / })).toHaveCount(0)
      expect(await focusedLabel(), `after ${how} focus is back on Swap, not lost to the page`).toMatch(QUICK[1])
    }
    await ctx.close()
  })

  // On phones Tab reaches More actions and its menu; wider touch devices
  // keep Edit, Swap and Remove in the swatch's tab order.
  for (const width of [390, 820]) {
    test(`Tab reaches the colour actions at ${width}px on a touch device`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width, { touch: true })
      const col = page.locator('.plb-col').nth(2)

      // POSITIVE CONTROLS: no hover on this device, the tools exist, and none
      // is painted before focus arrives.
      expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
      const rest = await quickState(col)
      expect(rest.every(Boolean), 'all three quick tools exist').toBe(true)
      expect(rest.some(painted), 'nothing painted before focus arrives').toBe(false)

      await col.getByRole('button', { name: /^(Lock|Unlock) / }).focus()
      if (width < 768) {
        await expect(col.locator('.plb-tool--quick')).toHaveCount(3)
        for (const label of QUICK) await expect(col.getByRole('button', { name: label })).toHaveCount(0)
        await page.keyboard.press('Tab')
        await expect(col.getByRole('button', { name: /^More actions for / })).toBeFocused()
        await page.keyboard.press('Enter')
        const menu = page.getByRole('menu', { name: 'Colour actions', exact: true })
        for (const name of ['Edit in HCT', 'Swap left', 'Swap right', 'Remove']) {
          await expect(menu.getByRole('menuitem', { name, exact: true })).toBeVisible()
        }
        await ctx.close()
        return
      }
      const walk = [['More actions', /^More actions for /], ['Edit in HCT', QUICK[0]], ['Swap', QUICK[1]], ['Remove', QUICK[2]]]
      for (const [name, label] of walk) {
        await page.keyboard.press('Tab')
        const focused = () => page.evaluate(() => {
          const el = document.activeElement
          const r = el.getBoundingClientRect()
          let opacity = 1
          for (let n = el; n && n !== document.body; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity)
          return { tag: el.tagName, label: el.getAttribute('aria-label'), visibility: getComputedStyle(el).visibility,
            opacity, width: Math.round(r.width), height: Math.round(r.height) }
        })
        const now = await focused()
        expect(now.tag, `Tab to ${name} did not drop focus to the page`).toBe('BUTTON')
        expect(now.label, `Tab order reaches ${name}`).toMatch(label)
        expect(now.visibility).not.toBe('hidden')
        expect(now.width, `${name} takes space`).toBeGreaterThan(0)
        expect(now.height).toBeGreaterThan(0)
        // The reveal fades in, so poll rather than sample the first frame.
        await expect.poll(async () => (await focused()).opacity, { message: `${name} is painted while it has focus` }).toBe(1)
      }
      // Focus is still in the swatch, and the whole stack shows.
      await expect.poll(async () => (await quickState(col)).every(painted)).toBe(true)
      await ctx.close()
    })
  }

  for (const theme of ['light', 'dark']) {
    test(`a phone swatch offers Edit, Swap and Remove through More actions (${theme})`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 390, { theme })
      const col = page.locator('.plb-col').nth(1)

      // POSITIVE CONTROL: this really is a no-hover device, and the tools exist.
      expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
      const rest = await quickState(col)
      expect(rest.every(Boolean)).toBe(true)
      expect(rest.some(painted), 'closed on arrival: no quick tool is painted').toBe(false)

      await col.locator('.plb-name').tap()
      for (const s of await quickState(col)) expect(s.width, `${s.label} takes no space on a phone`).toBe(0)
      for (const label of QUICK) await expect(col.getByRole('button', { name: label })).toHaveCount(0)
      await expect(col.locator('.plb-col-tools').getByRole('button')).toHaveCount(2)

      const more = col.getByRole('button', { name: /^More actions for / })
      await more.tap()
      const menu = page.getByRole('menu', { name: 'Colour actions', exact: true })
      for (const name of ['Edit in HCT', 'Swap left', 'Swap right', 'Remove']) {
        await expect(menu.getByRole('menuitem', { name, exact: true })).toBeVisible()
      }
      const hexes = () => page.locator('.plb-col .plb-hex').allTextContents()
      const before = await hexes()
      await menu.getByRole('menuitem', { name: 'Swap right', exact: true }).tap()
      await expect.poll(hexes).toEqual([before[0], before[2], before[1], before[3], before[4]])

      await more.tap()
      await menu.getByRole('menuitem', { name: 'Remove', exact: true }).tap()
      await expect(page.locator('.plb-col')).toHaveCount(4)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'no horizontal overflow').toBeLessThanOrEqual(0)
      await ctx.close()
    })
  }
})
