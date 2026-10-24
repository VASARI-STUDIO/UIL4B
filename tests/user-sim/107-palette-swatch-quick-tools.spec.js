// The per-swatch quick tools on the Palette Builder: Edit in HCT, Swap, Remove.
//
// From 768px up they sit in ONE ordered column with the lock and the actions
// button: Lock, Edit in HCT, Swap, Remove, "...". Each is also an item in the
// "Colour actions" menu. On a mouse screen they are revealed two ways, and each
// way has its own test because each is its own piece of CSS or code:
//
//   1. a pointer hovering the swatch,
//   2. keyboard focus VISIBLY inside the swatch (`:has(:focus-visible)`; the
//      tools stay rendered and focusable at rest from 768px up, so focus is
//      what shows them — never `visibility:hidden` or `display:none`). A mouse
//      press leaves focus on a button but is not focus-visible, so it does not
//      latch the stack open.
// A device with no hover (`(hover: none)`) has nothing to reveal them with, so
// from 768px up they are on show at rest and pressable. Columns under 80px wide
// (a 10-colour board at 768) hide the stack, and the Colour actions menu still
// holds every action. Phones (767 and under) show only Lock and More actions.
//
// The second half of the file ("the ordered column") pins the behaviour of the
// ordered column itself: Tab order, no focus latch, focus after a keyboard
// Remove, narrow columns, the HCT popover staying on screen, and the phone
// layout. Each of those has a MUTATION line saying what to break to see it red.
//
// EVERY TEST CARRIES A POSITIVE CONTROL. "The tools are hidden at rest" and
// "nothing overlapped" are both true of a page that never painted, so each test
// first proves five swatches were drawn and the tools exist in the DOM.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

const QUICK = [/^Edit .+ in HCT$/, /^Choose a direction to swap /, /^Remove /]

/** A context at an exact width: touch metrics on a phone, a mouse above it
 *  (or touch at any width with `touch`, as on an iPad). */
async function at(browser, width, { theme = 'light', touch = false, height } = {}) {
  const ctx = await browser.newContext(width < 700 || touch
    ? { viewport: { width, height: height ?? 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: height ?? 900 } })
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
    await page.keyboard.press('Tab') // Edit in HCT — the first quick tool, straight after the lock
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
      await page.keyboard.press('Tab') // More actions — the menu is built after it
      await page.keyboard.press('Tab') // the first direction
      expect(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'focus is on a menu item').toBe('menuitem')

      await page.keyboard.press(how)
      await expect(page.getByRole('menu', { name: /^Swap / })).toHaveCount(0)
      expect(await focusedLabel(), `after ${how} focus is back on Swap, not lost to the page`).toMatch(QUICK[1])
    }
    await ctx.close()
  })

  // On phones Tab reaches More actions and its menu, and no quick tool is drawn.
  // On a wider touch device Edit, Swap and Remove are on show at rest, take the
  // pointer, and sit in the swatch's tab order between the lock and More actions.
  for (const width of [390, 820]) {
    test(`Tab reaches the colour actions at ${width}px on a touch device`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width, { touch: true })
      const col = page.locator('.plb-col').nth(2)

      // POSITIVE CONTROLS: no hover on this device, and the tools exist.
      expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
      const rest = await quickState(col)
      expect(rest.every(Boolean), 'all three quick tools exist').toBe(true)
      if (width < 768) {
        expect(rest.some(painted), 'a phone draws no quick tool').toBe(false)
      } else {
        await expect.poll(async () => (await quickState(col)).every(painted), { message: 'a touch tablet shows every quick tool at rest' }).toBe(true)
        const hits = await hitsOf(col)
        expect(hits, 'three tools measured').toHaveLength(3)
        expect(hits.filter((h) => !h.hitTool).map((h) => h.label), 'every quick tool takes the pointer at rest').toEqual([])
      }

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
      const walk = [['Edit in HCT', QUICK[0]], ['Swap', QUICK[1]], ['Remove', QUICK[2]], ['More actions', /^More actions for /]]
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

// ── The ordered column ─────────────────────────────────────────────────────
// Lock, Edit in HCT, Swap, Remove, "..." in one column. Each test below has a
// MUTATION line: the small change to the product that must turn it red.

const LOCK = /^(Lock|Unlock) /
const MORE = /^More actions for /
const SWAP = QUICK[1]
const focusedLabel = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName)

/** A signed-in Pro session (the test Firebase double grants it through the
 *  same subscription document the product reads), grown to `colours` swatches.
 *  Edit in HCT opens a Pro modal for a free account, and 9-10 colours are Pro. */
async function proBoard(browser, width, { colours = 5, height = 900, theme } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } })
  if (theme) await ctx.addInitScript((t) => localStorage.setItem('vs-t', t), theme)
  const page = await ctx.newPage()
  watch(page, `Pro palette designer at ${width}px`)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  await expect(page.locator('.plb-col')).toHaveCount(5)
  for (let n = 5; n < colours; n++) {
    await page.getByRole('button', { name: 'Add a colour' }).click()
    await expect(page.locator('.plb-col')).toHaveCount(n + 1)
  }
  return { ctx, page }
}

/** The box of an element once it has stopped moving (the popover is placed by a
 *  ResizeObserver after it mounts), with the viewport and the header it must
 *  clear. Waits on frames holding still, not on a timer. */
const settledBox = (page, selector) => page.evaluate((sel) => new Promise((resolve, reject) => {
  const key = (r) => [r.left, r.top, r.right, r.bottom].map(Math.round).join()
  let last = ''; let same = 0; let frames = 0
  const tick = () => {
    const el = document.querySelector(sel)
    if (!el) { reject(new Error(`${sel} is not on the page`)); return }
    const r = el.getBoundingClientRect()
    same = key(r) === last ? same + 1 : 0
    last = key(r)
    if (same >= 6) {
      const nav = document.querySelector('.pnav')
      resolve({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
        vw: innerWidth, vh: innerHeight, navBottom: nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0 })
    } else if (++frames > 600) reject(new Error(`${sel} never held still`))
    else requestAnimationFrame(tick)
  }
  tick()
}), selector)

const expectPopoverHits = async (panel) => {
  await expect.poll(() => panel.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const points = [
      ['centre', r.left + r.width / 2, r.top + r.height / 2],
      ['right edge', r.right - 8, r.top + r.height / 2],
      ['header', r.left + r.width / 2, r.top + 12],
    ]
    const close = el.querySelector('.plb-pop-x')
    if (close) {
      const c = close.getBoundingClientRect()
      points.push(['Close button', c.left + c.width / 2, c.top + c.height / 2])
    }
    return points.filter(([, x, y]) => !el.contains(document.elementFromPoint(x, y)))
      .map(([name]) => name)
  }), { message: 'the popover is topmost at its centre, right edge, header and Close button when present' }).toEqual([])
}

test.describe('the ordered column', () => {
  // (a) MUTATION: put `tabIndex={-1}` on the Swap button in PaletteBuilder.jsx
  // (Tab then skips it) and the order reads Lock, Edit, Remove, More; add
  // `order:-1` to `.plb .plb-tool--more` and the column is drawn with More first.
  test('Tab walks Lock, Edit in HCT, Swap, Remove, More actions, and the column is drawn in that order at 1440', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const col = page.locator('.plb-col').nth(2)
    const order = [LOCK, QUICK[0], SWAP, QUICK[2], MORE]

    await col.getByRole('button', { name: LOCK }).focus()
    const walked = [await focusedLabel(page)]
    for (let k = 1; k < order.length; k++) {
      await page.keyboard.press('Tab')
      walked.push(await focusedLabel(page))
    }
    order.forEach((re, k) => expect(walked[k], `stop ${k + 1} of the tab order (walked: ${walked.join(' > ')})`).toMatch(re))

    // The drawn order is the Tab order: one column, each tool below the last,
    // with no tool on top of another. The stack is revealed by the focus that
    // is still inside the swatch, so every box is real.
    const boxes = await col.evaluate((el, sources) => sources.map((source) => {
      const t = [...el.querySelectorAll('.plb-col-tools .plb-tool')].find((b) => new RegExp(source).test(b.getAttribute('aria-label') || ''))
      const r = t.getBoundingClientRect()
      return { label: t.getAttribute('aria-label'), top: r.top, bottom: r.bottom, centre: r.left + r.width / 2, width: r.width }
    }), order.map((re) => re.source))
    for (const b of boxes) expect(b.width, `${b.label} is drawn`).toBeGreaterThan(0)
    for (let k = 1; k < boxes.length; k++) {
      expect(boxes[k].top, `${boxes[k].label} sits below ${boxes[k - 1].label}`).toBeGreaterThanOrEqual(boxes[k - 1].bottom)
      expect(Math.abs(boxes[k].centre - boxes[0].centre), `${boxes[k].label} is in the same column as the lock`).toBeLessThanOrEqual(1)
    }
    await ctx.close()
  })

  // (b) MUTATION: in palette-builder.css change the rule
  // `.plb .plb-col:has(:focus-visible) .plb-tool--quick` to `.plb-col:focus-within`
  // (the old latch) and the clicked swatch keeps its whole stack, so two show.
  test('after a mouse click on Swap, hovering another swatch leaves exactly one swatch showing its quick tools', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const cols = page.locator('.plb-col')
    const clicked = cols.nth(1)
    const hovered = cols.nth(3)

    await clicked.hover()
    await expect.poll(async () => (await quickState(clicked)).every(painted), { message: 'hover reveals the clicked swatch stack' }).toBe(true)
    await clicked.getByRole('button', { name: SWAP }).click()
    await expect(page.getByRole('menu', { name: /^Swap / })).toBeVisible()
    // POSITIVE CONTROL: the mouse press did leave focus on the Swap button, so
    // the old focus-within latch has something to hold on to.
    expect(await focusedLabel(page), 'the click left focus on Swap').toMatch(SWAP)

    await hovered.hover()
    await expect.poll(async () => (await quickState(hovered)).every(painted), { message: 'hover reveals the hovered swatch stack' }).toBe(true)
    const showing = []
    for (let k = 0; k < 5; k++) showing.push((await quickState(cols.nth(k))).every(painted))
    expect(showing, 'which swatches show their whole quick stack').toEqual([false, false, false, true, false])
    // The clicked swatch keeps only the pressed Swap lit (its menu is open).
    expect((await quickState(clicked)).map(painted)).toEqual([false, true, false])
    await ctx.close()
  })

  // (c) MUTATION: delete the line `if (keyboard) removeFocusRef.current = ...`
  // in removeCol (PaletteBuilder.jsx) and focus falls to the page.
  test('Enter on Remove takes out exactly that colour and focus lands on a Lock', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const cols = page.locator('.plb-col')
    const hexes = () => page.locator('.plb-col .plb-hex').allTextContents()
    const before = await hexes()
    expect(before).toHaveLength(5)

    await cols.nth(2).getByRole('button', { name: LOCK }).focus()
    let label = await focusedLabel(page)
    for (let k = 0; k < 6 && !QUICK[2].test(label); k++) {
      await page.keyboard.press('Tab')
      label = await focusedLabel(page)
    }
    expect(label, 'Tab from the lock reaches Remove').toMatch(QUICK[2])
    await page.keyboard.press('Enter')

    await expect(cols).toHaveCount(4)
    await expect.poll(hexes, { message: 'the other four colours are untouched, in order' })
      .toEqual([before[0], before[1], before[3], before[4]])
    await expect.poll(() => page.evaluate(() => {
      const el = document.activeElement
      return { label: el?.getAttribute('aria-label') ?? el?.tagName, inSwatch: !!el?.closest('.plb-col') }
    }), { message: 'focus is on a swatch Lock, not lost to the page' })
      .toEqual({ label: expect.stringMatching(LOCK), inSwatch: true })
    await expect(cols, 'one press removed one colour, not two').toHaveCount(4)
    await ctx.close()
  })

  // (d) MUTATION: in palette-builder.css change `@container (width < 80px)` to
  // `(width < 0px)` and the narrow columns draw a stack again (first message);
  // also put `.plb-col-quick` back to `position:absolute; top:16px; right:58px`
  // and the stack leaves its column (second message).
  test('a 10-colour board at 768: no tool spills out of its own column and the stack is hidden where it cannot fit', async ({ browser }) => {
    const { ctx, page } = await proBoard(browser, 768, { colours: 10 })
    const cols = page.locator('.plb-col')
    await expect(cols).toHaveCount(10)
    const damage = []
    let measured = 0

    for (let i = 0; i < 10; i++) {
      await cols.nth(i).hover()
      // The More button is the hover-revealed control: once it is painted the
      // swatch is in its hovered state.
      await expect.poll(() => cols.nth(i).locator('.plb-tool--more').evaluate((b) => parseFloat(getComputedStyle(b).opacity)), { message: `swatch ${i + 1} reveals on hover` }).toBe(1)
      const m = await cols.nth(i).evaluate((col) => {
        const c = col.getBoundingClientRect()
        const tools = [...col.querySelectorAll('.plb-tool')].map((t) => {
          const r = t.getBoundingClientRect()
          const hit = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null
          return { label: t.getAttribute('aria-label'), quick: !!t.closest('.plb-col-quick'), drawn: r.width > 0,
            left: r.left - c.left, right: r.right - c.right, top: r.top - c.top, bottom: r.bottom - c.bottom,
            takesPointer: getComputedStyle(t).pointerEvents !== 'none', hitsItself: !!hit && t.contains(hit) }
        })
        return { width: c.width, tools }
      })
      for (const t of m.tools) {
        if (!t.drawn) continue
        measured++
        const where = `swatch ${i + 1} (${Math.round(m.width)}px wide) "${t.label}"`
        if (t.left < -0.5 || t.right > 0.5 || t.top < -0.5 || t.bottom > 0.5) damage.push(`${where} spills out of its column (left ${t.left.toFixed(1)}, right ${t.right.toFixed(1)}, top ${t.top.toFixed(1)}, bottom ${t.bottom.toFixed(1)})`)
        if (t.takesPointer && !t.hitsItself) damage.push(`${where} is covered by something else at its centre`)
      }
      if (m.width < 80) {
        const shown = m.tools.filter((t) => t.quick && t.drawn).map((t) => t.label)
        if (shown.length) damage.push(`swatch ${i + 1} is ${Math.round(m.width)}px wide, under the 80px floor, and still draws ${shown.join(', ')}`)
      }
      // POSITIVE CONTROL for this column: the lock and More are drawn, so an
      // empty `damage` is not a board that never painted.
      expect(m.tools.filter((t) => !t.quick && t.drawn).length, `swatch ${i + 1}: Lock and More are drawn`).toBe(2)
    }
    expect(measured, 'tools were measured on all ten swatches').toBeGreaterThanOrEqual(20)
    expect(damage.slice(0, 6), `${damage.length} faults on the 10-colour board, first six shown`).toEqual([])
    await ctx.close()
  })

  // (e) The HCT panels stay on screen at both ends of the board. The first
  // swatch's HCT and Swap popovers take the pointer at the sampled points.
  for (const width of [768, 1440]) {
    for (const [which, index] of [['first', 0], ['last', 4]]) {
      test(`the Edit in HCT popover of the ${which} swatch is fully on screen at ${width}`, async ({ browser }) => {
        const { ctx, page } = await proBoard(browser, width)
        const col = page.locator('.plb-col').nth(index)
        await col.hover()
        await expect.poll(async () => (await quickState(col)).every(painted), { message: 'hover reveals the stack' }).toBe(true)
        await col.getByRole('button', { name: QUICK[0] }).click()
        await expect(page.locator('.plb-picker'), 'the HCT editor opened (a Pro account, so no upgrade modal)').toBeVisible()

        const box = await settledBox(page, '.plb-picker')
        // POSITIVE CONTROL: a real, full-size panel was measured.
        expect(box.width, 'the panel has its width').toBeGreaterThan(200)
        expect(box.height, 'the panel has its height').toBeGreaterThan(100)
        const where = `picker at ${Math.round(box.left)},${Math.round(box.top)} to ${Math.round(box.right)},${Math.round(box.bottom)} in ${box.vw}x${box.vh}`
        expect(box.left, `${where}: starts inside the left edge`).toBeGreaterThanOrEqual(0)
        expect(box.right, `${where}: ends inside the right edge`).toBeLessThanOrEqual(box.vw)
        expect(box.top, `${where}: starts below the header`).toBeGreaterThanOrEqual(box.navBottom)
        expect(box.bottom, `${where}: ends above the bottom edge`).toBeLessThanOrEqual(box.vh)
        if (index === 0) {
          await expectPopoverHits(page.locator('.plb-picker'))
          await page.getByRole('button', { name: 'Close editor', exact: true }).click()
          await col.hover()
          await col.getByRole('button', { name: SWAP }).click()
          await expect(col.locator('.plb-swappop')).toBeVisible()
          await settledBox(page, '.plb-swappop')
          await expectPopoverHits(col.locator('.plb-swappop'))
        }
        await ctx.close()
      })
    }
  }

  // The short viewport places the picker header and Close button over the
  // sticky toolbar; both remain above it and take the pointer.
  test('667x375 light: the first swatch HCT picker is topmost over the toolbar', async ({ browser }) => {
    const { ctx, page } = await proBoard(browser, 667, { height: 375, theme: 'light' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.locator('.plb-col').first().getByRole('button', { name: MORE }).click()
    await page.getByRole('menu', { name: 'Colour actions', exact: true })
      .getByRole('menuitem', { name: 'Edit in HCT', exact: true }).click()
    const panel = page.locator('.plb-picker')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Close editor', exact: true })).toBeVisible()
    await settledBox(page, '.plb-picker')
    await expectPopoverHits(panel)
    await ctx.close()
  })

  // MUTATION: remove the internal-scroll guard in the popover placement
  // effect and resetting the height cap resets the picker's scroll position.
  test('667x375: scrolling a capped HCT picker preserves its scroll position', async ({ browser }) => {
    const { ctx, page } = await proBoard(browser, 667, { height: 375 })
    await page.locator('.plb-col').first().getByRole('button', { name: MORE }).click()
    await page.getByRole('menu', { name: 'Colour actions', exact: true })
      .getByRole('menuitem', { name: 'Edit in HCT', exact: true }).click()
    const panel = page.locator('.plb-picker')
    await expect(panel).toBeVisible()
    await settledBox(page, '.plb-picker')
    expect(await panel.evaluate((el) => el.scrollHeight - el.clientHeight), 'the picker has scrollable content').toBeGreaterThan(0)
    const scrollTop = await panel.evaluate(async (el) => {
      el.scrollTop = 100
      el.dispatchEvent(new Event('scroll'))
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      return el.scrollTop
    })
    expect(scrollTop, 'internal scrolling keeps its position after placement listeners run').toBeGreaterThan(0)
    await ctx.close()
  })

  // MUTATION: always use the ramp rect for tints, including when it has no
  // box, and the phone panel moves away from the fourth swatch to the header.
  test('390x844: View tints stays near the fourth swatch and above the tab bar', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, { height: 844 })
    const col = page.locator('.plb-col').nth(3)
    await col.getByRole('button', { name: MORE }).tap()
    await page.getByRole('menu', { name: 'Colour actions', exact: true })
      .getByRole('menuitem', { name: 'View tints', exact: true }).tap()
    await expect(col.locator('.plb-tintpop')).toBeVisible()
    const box = await settledBox(page, '.plb-tintpop')
    const row = await col.boundingBox()
    const tabs = await page.locator('.pnav-tabs').boundingBox()
    expect(row.height, 'the fourth swatch has a row').toBeGreaterThan(0)
    expect(tabs.height, 'the bottom tab bar is rendered').toBeGreaterThan(0)
    expect(box.height, 'the tints panel has content').toBeGreaterThan(100)
    expect(box.top).toBeGreaterThanOrEqual(box.navBottom)
    expect(box.top).toBeLessThan(box.vh)
    expect(box.bottom).toBeLessThanOrEqual(tabs.y)
    expect(box.top, 'the panel overlaps or sits just below its row').toBeLessThanOrEqual(row.y + row.height + 8)
    expect(box.bottom, 'the panel overlaps or sits just above its row').toBeGreaterThanOrEqual(row.y - 8)
    await ctx.close()
  })

  // (f) MUTATION: delete the two phone rules `.plb .plb-col-quick { display: none; }`
  // and `.plb .plb-tool--quick { display: none; }` in the max-width:767 block and
  // the stack is back (first half, both heights); in placeContextMenu change
  // `bottom` to `window.innerHeight - margin` and the last swatch's menu runs
  // under the tab bar (second half, 390x667 only: on a tall phone the menu is
  // short enough to clear the bar either way).
  for (const height of [844, 667]) {
    test(`390x${height}: a swatch has only Lock and More actions, and the last swatch menu sits above the tab bar`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 390, { touch: true, height })
      const cols = page.locator('.plb-col')
      const last = cols.nth(4)
      await last.scrollIntoViewIfNeeded()

      // POSITIVE CONTROL: the three quick buttons are in the markup but take no
      // space, so "none" below is a hidden stack and not a page that failed to render.
      const rest = await quickState(last)
      expect(rest.every(Boolean), 'the quick tools exist in the DOM').toBe(true)
      for (const s of rest) expect(s.width, `${s.label} takes no space on a phone`).toBe(0)
      const tools = last.locator('.plb-col-tools').getByRole('button')
      await expect(tools).toHaveCount(2)
      await expect(tools.nth(0)).toHaveAccessibleName(LOCK)
      await expect(tools.nth(1)).toHaveAccessibleName(MORE)
      for (const label of QUICK) await expect(last.getByRole('button', { name: label })).toHaveCount(0)

      await last.getByRole('button', { name: MORE }).tap()
      const menu = page.getByRole('menu', { name: 'Colour actions', exact: true })
      for (const name of ['Edit in HCT', 'Swap left', 'Remove']) await expect(menu.getByRole('menuitem', { name, exact: true })).toBeVisible()
      const box = await settledBox(page, '.plb-ctx')
      const tabs = await page.evaluate(() => {
        const bar = document.querySelector('.pnav-tabs')
        const r = bar?.getBoundingClientRect()
        return { shown: !!bar && getComputedStyle(bar).display !== 'none' && r.height > 0, top: r?.top ?? innerHeight }
      })
      expect(tabs.shown, 'POSITIVE CONTROL: the tab bar is on screen at 390').toBe(true)
      expect(box.bottom, `the menu ends at ${Math.round(box.bottom)}, above the tab bar at ${Math.round(tabs.top)}`).toBeLessThanOrEqual(tabs.top)
      expect(box.top, 'and starts below the header').toBeGreaterThanOrEqual(box.navBottom)
      await ctx.close()
    })
  }
})
