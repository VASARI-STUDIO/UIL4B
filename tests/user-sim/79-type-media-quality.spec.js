// The 2026-09-11 quality pass over the TYPE and MEDIA tools: /create/type-scale,
// /create/font-pair, /create/font-gallery, /create/icons, /create/emoji,
// /create/file-converter, /create/alt-text, /create/aspect-ratio, /seo and
// /create/auto-builder.
//
// Every surface was rated out of ten on eight dimensions before anything was
// changed, from rendered evidence rather than from the source: 220 signed-out
// cells (eleven widths — 320, 390, 430, 768, 1024, 1097, 1120, 1136, 1280, 1440,
// 1920 — in both themes) plus 80 more with reduced motion on, measuring
// horizontal overflow, controls under 24px, text contrast against its painted
// ground, clipped text, elements outside the viewport, heading order and page
// errors; a keyboard walk of all ten surfaces (321 tab stops, every one with a
// visible focus ring); an ARIA-pattern probe of every tablist, popover and
// dialog; and the AI tools driven signed out, free and Pro, with a file dropped,
// while working, and with /api/ai refused.
//
// The breakpoint work in #429, #430 and #435 had already taken the geometry
// clean: no overflow, no sub-24px target and no contrast failure was found in
// any of the 300 cells. What that pass could not see is what this file pins —
// the things a keyboard or a screen reader meets, and one sentence that was not
// true. Each test below states the barrier, the state it was measured in, and
// the mutation that turns it red.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture and the Iconify catalogue is served from
// tests/user-sim/fixtures/iconify/.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/** What has focus right now, named the way a failure message can be read. */
const focused = (page) => page.evaluate(() => {
  const el = document.activeElement
  if (!el || el === document.body) return 'BODY'
  const cls = typeof el.className === 'string' && el.className
    ? `.${el.className.trim().split(/\s+/)[0]}`
    : ''
  return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`
})

// ─────────────────────────────────────────────────────────────────────────────
// /seo — a tablist that keeps the contract its role announces
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/seo · the three tools are a real tablist', () => {
  // MEASURED 2026-09-11 at 1280 in light: all three `[role=tab]` sat at
  // tabIndex 0, and ArrowRight with "Meta & SERP" focused left focus on
  // button#seo-tab-meta and the panel unchanged. A screen reader announces
  // "tab, 1 of 3" and the reader reaches for the arrow keys; there were none.
  //
  // MUTATION: drop `onKeyDown={onTabKeyDown}` and the `tabIndex` line from
  // SeoInspector.jsx's tab button — the first test fails on the arrow key
  // moving nothing, the second on all three tabs being in the tab sequence.
  test('arrow keys, Home and End move the selection and the focus', async ({ page }) => {
    watch(page, 'someone driving the SEO tools from the keyboard')
    await go(page, '/seo')

    await page.locator('#seo-tab-meta').focus()
    await expect(page.locator('h1')).toHaveText('Meta & SERP Inspector')

    await page.keyboard.press('ArrowRight')
    await expect(page.locator('#seo-tab-schema')).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => focused(page)).toBe('button#seo-tab-schema.seo-tab')
    await expect(page.locator('h1')).toHaveText('Structured Data Generator')

    // Three tabs, so ArrowRight wraps rather than stopping.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('#seo-tab-meta')).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('End')
    await expect(page.locator('#seo-tab-content')).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => focused(page)).toBe('button#seo-tab-content.seo-tab')

    await page.keyboard.press('Home')
    await expect(page.locator('#seo-tab-meta')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('h1')).toHaveText('Meta & SERP Inspector')
  })

  test('the strip is one tab stop, and no tab points at a panel that is absent', async ({ page }) => {
    watch(page, 'someone driving the SEO tools from the keyboard')
    await go(page, '/seo')

    const roving = await page.evaluate(() => [...document.querySelectorAll('[role=tab]')]
      .map((t) => ({ id: t.id, ti: t.tabIndex, selected: t.getAttribute('aria-selected') })))
    expect(roving.filter((t) => t.ti === 0).map((t) => t.id),
      'exactly the selected tab is in the sequential tab order').toEqual(['seo-tab-meta'])
    expect(roving.filter((t) => t.ti === -1)).toHaveLength(2)

    // Only ONE panel is rendered, so `aria-controls` on the other two used to
    // name ids the document does not carry. An IDREF that resolves to nothing
    // tells assistive technology there is somewhere to go and then has nowhere.
    const broken = await page.evaluate(() => [...document.querySelectorAll('[role=tab]')]
      .map((t) => t.getAttribute('aria-controls'))
      .filter((id) => id && !document.getElementById(id)))
    expect(broken, 'every aria-controls on /seo must resolve to an element').toEqual([])
    expect(await page.locator('#seo-tab-meta').getAttribute('aria-controls')).toBe('seo-panel-meta')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/icons — the grid emptying is a status message
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/create/icons · a search that matches nothing says so out loud', () => {
  // MEASURED 2026-09-11 at 1280/light and 390/dark: typing a query the
  // catalogue does not carry took the grid from 120 cells to 0 and rendered
  // `.pl-empty` with the sentence and the way back — and the page's only live
  // region was the app toast, empty. The EMOJI tab of the same surface, one
  // click away under the same masthead, has announced its result count since it
  // shipped (`#emoji-search-status`).
  //
  // MUTATION: remove `role="status" aria-live="polite"` from `.pl-empty` in
  // IconLibrary.jsx — this test fails on getByRole('status').
  for (const [width, theme] of [[390, 'dark'], [1280, 'light']]) {
    test(`the no-result message is a status region at ${width} in ${theme}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })
      await context.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
      const page = await context.newPage()
      watch(page, 'developer searching the icon catalogue for a word it does not carry')
      await go(page, '/create/icons')

      const grid = page.locator('.ic')
      await expect.poll(() => grid.count(), { timeout: 20000 }).toBeGreaterThan(20)

      await page.locator('.lbry-search input').first().fill('zzzqqqxyz')
      await expect.poll(() => grid.count(), { timeout: 20000 }).toBe(0)

      const empty = page.getByRole('status').filter({ hasText: /No icons match/ })
      await expect(empty).toBeVisible()
      await expect(empty).toHaveText(/No icons match “zzzqqqxyz”\. Try another word, or clear the search to browse everything\./)
      await expect(empty).toHaveAttribute('aria-live', 'polite')

      await context.close()
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/emoji — heading levels, and a claim that was not true
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/create/emoji · the category headings sit one level under the page', () => {
  // MEASURED 2026-09-11 at eleven widths in both themes, reduced motion on and
  // off: 30 of 30 cells stepped h1 to h3 with nothing between. A screen
  // reader's heading list is the fastest way through 1,655 unlabelled buttons,
  // and a skipped level says a level exists that the reader has missed.
  //
  // MUTATION: put the category heading back to <h3> in EmojiLibrary.jsx — both
  // tests fail, the first on the tag and the second on the level jump.
  for (const width of [390, 1280]) {
    test(`no heading level is skipped at ${width}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await context.newPage()
      watch(page, 'someone navigating the emoji grid by heading')
      await go(page, '/create/emoji')

      await expect(page.locator('.emoji-vhead h2').first()).toBeVisible({ timeout: 20000 })

      const jumps = await page.evaluate(() => {
        const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
        const out = []
        let prev = 0
        for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
          if (!shown(h)) continue
          const level = Number(h.tagName[1])
          if (prev && level > prev + 1) out.push(`h${prev} -> h${level}: ${(h.innerText || '').trim().slice(0, 30)}`)
          prev = level
        }
        return out
      })
      expect(jumps, 'the emoji grid must not skip a heading level').toEqual([])
      await expect(page.locator('.emoji-vhead h3')).toHaveCount(0)

      await context.close()
    })
  }

  // The size, weight and tracking are set by `.emoji-vhead h2` in global.css,
  // and the universal reset zeroes the margin either tag would carry — so the
  // heading is the same 14px/700 it was as an h3. A paint change here would
  // move 64-computed-style-snapshot's baseline, and it does not.
  test('the heading paints exactly as it did', async ({ page }) => {
    watch(page, 'someone navigating the emoji grid by heading')
    await go(page, '/create/emoji')
    const head = page.locator('.emoji-vhead h2').first()
    await expect(head).toBeVisible({ timeout: 20000 })
    const style = await head.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { size: cs.fontSize, weight: cs.fontWeight, spacing: cs.letterSpacing, margin: cs.margin }
    })
    expect(style.size).toBe('14px')
    expect(style.weight).toBe('700')
    expect(style.margin).toBe('0px')
  })
})

test.describe('/create/emoji · the masthead claims no connection it does not have', () => {
  // #435 fixed the ICON half of this reading — the pill said "Live library
  // connected" in green directly above the notice saying the icon service could
  // not be reached — and recorded the emoji half as left, because no existing
  // sentence fitted a set that is compiled into the bundle and none was
  // invented. Measured again 2026-09-11 at 1280: `.lib-net is-online` on
  // /create/emoji, whose 1,655 emoji are a local module asking for nothing.
  //
  // Omitting a claim needs no sentence, which is why omitting it is the fix.
  //
  // MUTATION: drop the `(!online || tab === 'icon')` guard in
  // IconEmojiLibrary.jsx — the first test fails on the pill being present.
  test('there is no live-library pill on the emoji tab, and there is on the icon tab', async ({ page }) => {
    watch(page, 'visitor reading what the library says about itself')

    await go(page, '/create/emoji')
    await expect(page.locator('.emoji-virt')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.lib-net')).toHaveCount(0)
    await expect(page.getByText('Live library connected')).toHaveCount(0)

    await go(page, '/create/icons')
    await expect(page.locator('.lib-net')).toHaveText(/Live library connected/, { timeout: 20000 })
  })

  // The OFFLINE reading is shared and is true of both libraries, because both
  // are built in. Removing the online claim must not have taken it with it.
  //
  // MUTATION: change the guard to `tab === 'icon'` alone — this test fails on
  // the emoji tab having no pill while offline.
  test('the offline reading still reaches the emoji tab', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    watch(page, 'visitor whose connection drops while browsing emoji')
    await go(page, '/create/emoji')
    await expect(page.locator('.emoji-virt')).toBeVisible({ timeout: 20000 })

    // navigator.onLine first, then the socket — the ordering
    // 07-public-shell-library-palette.spec.js documents at length.
    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
    })
    await context.setOffline(true)

    await expect.poll(async () => {
      const el = page.locator('.lib-net')
      return (await el.count()) ? (await el.first().textContent()) : '(no .lib-net in the DOM)'
    }, {
      timeout: 15000,
      intervals: [100, 200, 300, 500],
      message: 'the emoji tab never said it was offline',
    }).toMatch(/Offline · built-in assets remain available/)

    await context.setOffline(false)
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/aspect-ratio — a listbox that answers the arrow keys
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/create/aspect-ratio · the preset listbox is operable as a listbox', () => {
  // MEASURED 2026-09-11 at 1280 in light: the panel is `role="listbox"` and
  // every row is `role="option"`, so a screen reader says "listbox, 11 items"
  // and the reader presses the arrow keys — which moved nothing. Tab reached
  // the rows one at a time; the Devices list is fourteen presses deep.
  //
  // MUTATION: remove `onKeyDown={onTriggerKeyDown}` from the trigger and
  // `onKeyDown={onListKeyDown}` from `.arc-select-pop` in RatioCalculator.jsx —
  // this test fails on the first ArrowDown leaving focus on the trigger.
  test('ArrowDown opens it, the arrows walk it, Home and End reach its ends', async ({ page }) => {
    watch(page, 'someone picking a preset without a mouse')
    await go(page, '/create/aspect-ratio')

    const trigger = page.locator('.arc-select-btn').first()
    await trigger.focus()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.keyboard.press('ArrowDown')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const rows = page.locator('.arc-select-pop [role=option]')
    await expect(rows.first()).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(rows.nth(1)).toBeFocused()

    await page.keyboard.press('End')
    await expect(rows.last()).toBeFocused()

    await page.keyboard.press('Home')
    await expect(rows.first()).toBeFocused()

    // Clamped, not wrapped: running off the end of a list back to its start is
    // how someone loses their place in it.
    await page.keyboard.press('ArrowUp')
    await expect(rows.first()).toBeFocused()
  })

  // Closing a subtree that holds the focused element sends focus to <body>,
  // which is the end of the keyboard road: the next Tab restarts from the top
  // of the document and Enter on the control you were just using does nothing.
  // It could not happen before the arrow keys existed, because focus never left
  // the trigger; it can now, so Escape and a pick both put it back.
  //
  // MUTATION: drop `trigger.current?.focus()` from the Escape branch in
  // RatioCalculator.jsx — this test fails with focus on BODY.
  test('Escape and picking a row both put focus back on the trigger', async ({ page }) => {
    watch(page, 'someone picking a preset without a mouse')
    await go(page, '/create/aspect-ratio')

    const trigger = page.locator('.arc-select-btn').first()
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.arc-select-pop [role=option]').first()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.locator('.arc-select-pop')).toHaveCount(0)
    await expect(trigger).toBeFocused()

    // And the trigger still works from there, which is the property the
    // focus-to-body failure actually cost.
    await page.keyboard.press('ArrowDown')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.arc-select-pop')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/alt-text — a refusal that is heard, not only seen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/create/alt-text · a refused generation is announced', () => {
  // #435 gave this message its own class (it had been painting its red tint
  // over the whole card) and stopped the green "Generated 1 alt text" toast
  // from landing over a card that had failed. Both fixed what a SIGHTED user
  // saw. Measured 2026-09-11 signed in free with /api/ai answering 500: the
  // card read "The generator is unavailable right now." and the page's only
  // live region was the app toast, deliberately empty — so pressing Generate
  // and hearing nothing was indistinguishable from a press that did not
  // register. WCAG 4.1.3.
  //
  // status rather than alert: a batch fails card by card, and three assertive
  // interruptions for one press is worse than three queued sentences.
  // `.alt-card-warn` in the same card already announces politely.
  //
  // MUTATION: remove `role="status" aria-live="polite"` from
  // `.alt-card-error-msg` in AltTextGenerator.jsx — this test fails on
  // getByRole('status').
  test('the card error is a status region carrying the message that was on screen', async ({ page }) => {
    watch(page, 'a free account whose generation is refused')
    await signIn(page, { plan: 'free' })
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      (route) => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'The generator is unavailable right now.' }),
      }),
    )
    await go(page, '/create/alt-text')

    await page.locator('.alt-dropzone input[type=file]')
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.locator('.alt-card')).toHaveCount(1)

    await page.getByRole('button', { name: /^Generate/ }).last().click()

    const message = page.getByRole('status').filter({ hasText: /generator is unavailable/ })
    await expect(message).toBeVisible({ timeout: 20000 })
    await expect(message).toHaveClass(/alt-card-error-msg/)
    await expect(message).toHaveAttribute('aria-live', 'polite')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Both libraries — one h1 per route, and no unreachable second masthead
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the icon and emoji libraries carry one masthead between them', () => {
  // IconLibrary.jsx and EmojiLibrary.jsx each held a standalone masthead behind
  // `{!embedded && ...}` — an eyebrow, an h1 and the subtitle — for a route
  // that has not existed since the two merged: the only import of either module
  // is IconEmojiLibrary.jsx, which passed `embedded` unconditionally. The
  // eyebrow was `sec-h-eyebrow`, the element the founder marked "AI" and #382
  // deleted from every tool masthead it reached.
  //
  // This asserts the PROPERTY that made the block dead rather than its absence
  // from the source, so it also catches a second masthead arriving any other
  // way.
  //
  // IT WAITS FOR THE LIBRARY ITSELF FIRST, and that wait is the test.
  // Written without it, both of these passed WHILE MUTATED — the masthead
  // restored and rendering two h1s and an eyebrow, confirmed by hand on the
  // same build. `go()` returns when the ROUTE is on screen, and the route here
  // is the wrapper; the library underneath is a second lazy chunk, so
  // `toHaveCount(1)` was answered by the wrapper's own h1 before the thing
  // being measured existed. A count assertion that runs before the DOM it
  // counts has arrived passes for the same reason an empty page would.
  //
  // MUTATION: restore either `{!embedded && (...)}` block in IconLibrary.jsx or
  // EmojiLibrary.jsx while IconEmojiLibrary.jsx keeps this branch's version (so
  // `embedded` is undefined and the branch renders) — that route's test fails
  // on 2 h1s and 1 `.sec-h-eyebrow`.
  for (const [route, heading, mounted] of [
    ['/create/icons', 'Icon Library', '.ic'],
    ['/create/emoji', 'Emoji Library', '.emoji-virt'],
  ]) {
    test(`${route} renders exactly one h1 and no taxonomy eyebrow`, async ({ page }) => {
      watch(page, 'visitor arriving at the asset libraries')
      await go(page, route)
      await expect(page.locator(mounted).first()).toBeVisible({ timeout: 20000 })
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('.sec-h-eyebrow')).toHaveCount(0)
    })
  }
})
// EIGHTEEN BUTTONS CARRIED THEIR SELECTION IN A CSS CLASS AND NOWHERE ELSE.
//
// /create/aspect-ratio marks the chosen tab, ratio card and side toggle with an
// `on` class. That is invisible to everything that is not an eye: measured
// 2026-09-15 through Chrome's own accessibility tree, NOT ONE of the four
// .rc-tab, eleven .arc-ratio-card or three .pt-t buttons exposed a pressed,
// selected or current state. Pressing a shape confirmed nothing, and this was
// the only one of the nine Create surfaces doing it.
//
// Asserted through CDP rather than off the attribute, because the attribute is
// not the guarantee — a button can carry aria-pressed and still not surface it
// if the role is overridden. The tree is what a screen reader is handed.
test('every selection on /create/aspect-ratio is announced, not just painted', async ({ page }) => {
  watch(page, 'someone choosing a ratio with a screen reader')
  await go(page, '/create/aspect-ratio')
  await page.waitForSelector('.arc-ratio-card', { timeout: 15000 })

  const counts = await page.evaluate(() => ({
    tabs: document.querySelectorAll('.rc-tab').length,
    cards: document.querySelectorAll('.arc-ratio-card').length,
    sides: document.querySelectorAll('.pt-t').length,
  }))
  // POSITIVE CONTROL: a page that rendered none of these satisfies every
  // "nothing is unannounced" assertion below.
  expect(counts.tabs + counts.cards + counts.sides,
    'the selection controls did not render, so this test is guarding nothing')
    .toBeGreaterThan(14)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Accessibility.enable')
  const { nodes } = await cdp.send('Accessibility.getFullAXTree')
  await cdp.detach().catch(() => {})
  const pressed = nodes.filter((n) => (n.properties || [])
    .some((p) => p.name === 'pressed' || p.name === 'selected' || p.name === 'checked'))

  expect(pressed.length, `only ${pressed.length} of the ${counts.tabs + counts.cards + counts.sides} `
    + 'selection controls expose a state to the accessibility tree. The `on` class is '
    + 'not a state — see the aria-pressed note in RatioCalculator.jsx.')
    .toBe(counts.tabs + counts.cards + counts.sides)

  // And exactly one of each group reads as chosen, which is what makes it a
  // selection rather than a row of independent toggles that all happen to be on.
  const on = await page.evaluate(() => ({
    tabs: document.querySelectorAll('.rc-tab[aria-pressed="true"]').length,
    cards: document.querySelectorAll('.arc-ratio-card[aria-pressed="true"]').length,
    sides: document.querySelectorAll('.pt-t[aria-pressed="true"]').length,
  }))
  expect(on.tabs, 'exactly one tab reads as chosen').toBe(1)
  expect(on.sides, 'exactly one side toggle reads as chosen').toBe(1)
  expect(on.cards, 'at most one ratio card reads as chosen').toBeLessThanOrEqual(1)

  // Pressing one moves the state, rather than the attribute being a constant.
  const second = page.locator('.rc-tab').nth(1)
  const label = (await second.textContent()).trim()
  await second.click()
  await expect(second, `pressing "${label}" did not move the pressed state`)
    .toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.rc-tab[aria-pressed="true"]'),
    'two tabs read as chosen at once').toHaveCount(1)
})
