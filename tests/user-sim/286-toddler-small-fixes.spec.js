// Six small faults from a first-time-user pass, one test group each.
//
//   1. /create/palette: Randomise with every swatch locked says why it did nothing
//   2. the colour picker's value field and the /create/contrast hex fields say so
//      when they refuse what was typed, and keep the last good colour
//   3. following the AI terms link logs no smooth-scroll warning and still lands on section 8
//   4. the two inline links ("In beta" on /tools, the AI terms link on /info) are 44px to a finger
//   5. the sample tiles on /community open nothing outside the site, and a member's own
//      submission is not shown among them
//   6. the kind filter on /community fits at 320 and 390 and every kind is reachable
//
// MUTATIONS (each seen red, then restored):
//   1. PaletteBuilder.jsx: delete the all-locked branch in `randomize`.
//   2. ColorPickerPop.jsx: make `applyTypedColor` skip `setHexError(true)`.
//      ContrastChecker.jsx: delete the `leave` handler's `setRejectedAt`.
//   3. AltTextGenerator-style links: delete `onClick={crossRouteHashClick(AI_TERMS_PATH)}`
//      from the InfoCentre link; the console warning appears.
//   4. info.css / spectrum-tools.css: delete the `::after` rules in the touch block.
//   5. pieceUi.jsx: give a tile's frame link an outside `href` or `target="_blank"`.
//   6. community.css: give `.cm-selects .cm-select` a `min-width: 240px`; or drop a kind from
//      KINDS in Community.jsx.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { readSeed, seedChip } from './palette-helpers.js'

const LOCKED_MSG = 'Every colour is locked. Unlock one to shuffle.'
const HEX_HINT = 'Use a hex like #1A2B3C'

const phone = (width, height = 844) => ({ viewport: { width, height }, isMobile: true, hasTouch: true })

async function openPhone(browser, route, width) {
  const ctx = await browser.newContext(phone(width))
  const page = await ctx.newPage()
  watch(page, `a first-time visitor on a phone, ${route}`)
  await go(page, route)
  return { ctx, page }
}

// ── 1 ────────────────────────────────────────────────────────────────────────
test.describe('Randomise with everything locked', () => {
  const swatches = (page) => page.locator('.plb-col .plb-tool--key')

  test('says why nothing moved, and still shuffles once one swatch is free', async ({ page }) => {
    watch(page, 'someone who locked every colour and pressed Randomise')
    await go(page, '/create/palette')
    const locks = page.getByRole('button', { name: /^Lock / })
    const n = await locks.count()
    expect(n, 'the five roles').toBeGreaterThanOrEqual(5)
    for (let i = 0; i < n; i += 1) await locks.first().click()
    await expect(page.getByRole('button', { name: /^Lock / })).toHaveCount(0)

    const before = await readSeed(page)
    await page.locator('.plb-random').click()
    await expect(page.locator('.toast.show')).toContainText(LOCKED_MSG)
    expect(await readSeed(page), 'a locked palette does not move').toBe(before)

    // Unlock one: the message is gone from the path, and the palette shuffles.
    await page.getByRole('button', { name: /^Unlock / }).last().click()
    await expect(page.locator('.toast.show'), 'the first toast leaves on its own').toHaveCount(0, { timeout: 10000 })
    // The seed stays locked, so only the freed column may change.
    const cols = page.locator('.plb-col')
    const free = cols.filter({ has: page.getByRole('button', { name: /^Lock / }) })
    const frozen = cols.filter({ hasNot: page.getByRole('button', { name: /^Lock / }) })
    await expect(free).toHaveCount(1)
    await expect(frozen).toHaveCount(n - 1)
    const heldFree = await free.textContent()
    const heldFrozen = await frozen.allTextContents()
    // The last unlock frees DEEP, whose tone is fixed, so a roll can hand it the
    // colour it already holds (about 1 roll in several hundred; CI run
    // 42984819347 hit it, every column identical). Roll again until it moves; a
    // swatch that never moves in 10 seconds of rolls is a real fault, not chance.
    await expect.poll(async () => {
      await page.locator('.plb-random').click()
      return free.textContent()
    }, { message: 'one free swatch shuffles', intervals: [100], timeout: 10000 }).not.toBe(heldFree)
    await expect(page.locator('.toast.show', { hasText: LOCKED_MSG })).toHaveCount(0)
    expect(await frozen.allTextContents(), 'the locked swatches did not move').toEqual(heldFrozen)
    await expect(swatches(page).first()).toBeVisible()
  })
})

// ── 2 ────────────────────────────────────────────────────────────────────────
test.describe('Hex fields that refuse what was typed', () => {
  test('the picker field keeps the colour, says why, and clears on a valid value', async ({ page }) => {
    watch(page, 'someone typing a colour name into the seed picker')
    await go(page, '/create/palette')
    await seedChip(page).click()
    const dialog = page.getByRole('dialog', { name: 'Pick seed colour' })
    const field = dialog.getByRole('textbox', { name: 'Colour value' })
    await expect(field).toBeVisible()
    const good = (await field.inputValue()).toLowerCase()
    const seed = await readSeed(page)
    const hint = dialog.locator('.cpk-hint')

    for (const bad of ['red', 'zzz', '#12345', '😀', '<b>x</b>']) {
      await field.fill(bad)
      await field.press('Enter')
      await expect(hint, `"${bad}"`).toHaveText(HEX_HINT)
      await expect(field).toHaveAccessibleDescription(HEX_HINT)
      await expect(field).toHaveValue(good)
      expect(await readSeed(page), `"${bad}" must not change the seed`).toBe(seed)
    }

    // What is accepted today still is, and the hint goes with it.
    await field.fill('#fff')
    await expect(hint).toHaveText('')
    await field.press('Enter')
    await expect(field).toHaveValue('#ffffff')
    await field.fill('nope')
    await field.press('Enter')
    await expect(hint).toHaveText(HEX_HINT)
    await field.fill('rgb(1,2,3)')
    await expect(hint, 'a readable value clears it as it is typed').toHaveText('')
    await field.press('Enter')
    await expect(field).toHaveValue('#010203')
  })

  test('the contrast field says why a short wrong value went back', async ({ page }) => {
    watch(page, 'someone typing red into a contrast field')
    await go(page, '/create/contrast')
    const input = page.locator('.cc input.cc-hex-input').first()
    const hint = page.locator('.cc .cc-hint').first()
    const kept = await input.inputValue()
    await input.fill('red')
    await expect(hint, 'three characters is not yet a finished attempt').toHaveText('')
    await input.press('Enter')
    await expect(input).toHaveValue(kept)
    await expect(hint).toContainText(HEX_HINT)
    await expect(input).toHaveAccessibleDescription(new RegExp(HEX_HINT))
    await input.fill('#1F2937')
    await expect(hint).toHaveText('')
  })
})

// ── 3 ────────────────────────────────────────────────────────────────────────
test.describe('The AI terms link', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('logs no smooth-scroll warning and lands on section 8', async ({ page }) => {
    watch(page, 'someone checking where their image goes')
    const warnings = []
    page.on('console', (m) => { if (/Lenis/.test(m.text())) warnings.push(m.text()) })
    await go(page, '/info')
    const section = page.locator('#ai .ic-acc-head')
    if ((await section.getAttribute('aria-expanded')) !== 'true') await section.click()
    await page.getByRole('link', { name: 'How providers may use them' }).click()
    await expect(page).toHaveURL(/\/terms#terms-s8$/)
    await expect(page.locator('#terms-s8')).toBeVisible()
    await expect.poll(async () => page.evaluate(() => Math.round(document.getElementById('terms-s8').getBoundingClientRect().top)), {
      message: 'section 8 is under the header', timeout: 5000,
    }).toBeLessThan(300)
    expect(warnings, 'the smooth-scroll layer looked for a target that was not there yet').toEqual([])
  })
})

// ── 4 ────────────────────────────────────────────────────────────────────────
// A probe 21px above and below the link's centre must still reach the link.
async function reachesLink(page, locator) {
  await locator.scrollIntoViewIfNeeded()
  return locator.evaluate((el) => {
    const r = el.getClientRects()[0]
    const cx = r.x + r.width / 2
    const cy = r.y + r.height / 2
    return [-21, 21].map((dy) => {
      const hit = document.elementFromPoint(cx, cy + dy)
      return hit === el || el.contains(hit)
    })
  })
}

for (const width of [390, 768]) {
  test.describe(`Inline links are 44px to a finger at ${width}`, () => {
    test('/tools "In beta" link', async ({ browser }) => {
      const { ctx, page } = await openPhone(browser, '/tools', width)
      try {
        const link = page.locator('.spt-beta a', { hasText: '3D Model Converter' })
        await expect(link).toBeVisible()
        expect(await reachesLink(page, link)).toEqual([true, true])
        await page.screenshot({ path: `.claude/scratch/chrome1/tools-${width}.png` })
      } finally { await ctx.close() }
    })

    test('/info AI terms link', async ({ browser }) => {
      const { ctx, page } = await openPhone(browser, '/info', width)
      try {
        const head = page.locator('#ai .ic-acc-head')
        if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
        const link = page.getByRole('link', { name: 'How providers may use them' })
        await expect(link).toBeVisible()
        expect(await reachesLink(page, link)).toEqual([true, true])
      } finally { await ctx.close() }
    })
  })
}

// ── 5 ────────────────────────────────────────────────────────────────────────
test.describe('Sample tiles on /community', () => {
  test('open nothing outside the site, and a member submission is not shown as a showcase piece', async ({ page }) => {
    // MUTATION: give a tile's frame link an outside `href` (or a `target="_blank"`) in pieceUi.jsx.
    // (The old starter cards linked out to Dribbble and friends and are gone; every piece is now
    // a sample that opens its own page here. What is held is the same: nothing sends a visitor
    // to another site, and a member's own link is theirs, not a showcase card.)
    watch(page, 'someone tapping a sample tile')
    await page.addInitScript(() => {
      localStorage.setItem('vs-community-submissions', JSON.stringify([{
        id: 'mine-1', name: 'My own design', author: 'Test member', category: 'Landing',
        url: 'https://example.com/work', c1: '#111111', c2: '#333333', saves: 0,
      }]))
    })
    await go(page, '/community')
    const tiles = page.locator('.cm-grid .cm-tile')
    await expect(tiles.first()).toBeVisible()
    expect(await tiles.count(), 'positive control: there are tiles to inspect').toBeGreaterThan(5)

    // Every link in the grid stays on the site: a path, never a full address.
    const hrefs = await tiles.locator('a').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target') })))
    expect(hrefs.length, 'positive control: the tiles have links').toBeGreaterThan(5)
    for (const a of hrefs) {
      expect(a.href, 'a tile link leaves the site').toMatch(/^\/(community\/|u\/)/)
      expect(a.target, 'a tile link opens a new tab').toBeNull()
    }
    await expect(page.locator('.cm-grid a[href*="dribbble.com"], .cm-grid a[href*="awwwards.com"], .cm-grid a[href*="behance.net"], .cm-grid a[href*="mobbin.com"], .cm-grid a[href*="example.com"]')).toHaveCount(0)

    // Each tile says it is a sample, and the member's saved submission is not among them.
    await expect(tiles.locator('.cm-sample')).toHaveCount(await tiles.count())
    await expect(page.locator('.cm-grid').getByText('My own design')).toHaveCount(0)
  })
})

// ── 6 ────────────────────────────────────────────────────────────────────────
// The old category chips were a row that scrolled sideways, so this held that the row said so.
// The phone page has no chip row now: Kind and Sort are two pickers that open a sheet. What is
// held at 320 and 390 is the same promise: the filters never overflow, and every kind is reachable.
for (const width of [320, 390]) {
  test(`the kind filter fits and every kind is reachable at ${width}`, async ({ browser }) => {
    // MUTATION: give `.cm-selects .cm-select` a `min-width: 240px` in community.css: "fits" fails.
    // Drop a kind from KINDS in Community.jsx: "every kind is reachable" fails.
    const { ctx, page } = await openPhone(browser, '/community', width)
    try {
      const kind = page.getByRole('button', { name: /^Kind:/ })
      const sort = page.getByRole('button', { name: /^Sort:/ })
      await expect(kind).toBeVisible()
      for (const b of [kind, sort]) {
        const m = await b.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const label = el.querySelector('span')
          return { left: r.left, right: r.right, clipped: label.scrollWidth > label.clientWidth + 1, text: label.textContent }
        })
        expect(m.left, `${m.text} starts off the left edge`).toBeGreaterThanOrEqual(0)
        expect(m.right, `${m.text} runs off the right edge`).toBeLessThanOrEqual(width)
        expect(m.clipped, `${m.text} is cut short`).toBe(false)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page scrolls sideways').toBe(true)
      await page.screenshot({ path: `.claude/scratch/chrome1/community-filters-${width}.png` })

      const before = await page.locator('.cm-grid .cm-tile').count()
      await kind.tap()
      const menu = page.getByRole('menu', { name: 'Kind' })
      await expect(menu).toBeVisible()
      const kinds = await menu.getByRole('menuitemradio').evaluateAll((els) => els.slice(0, 5).map((e) => e.textContent.trim()))
      expect(kinds, 'every kind is reachable from the sheet').toEqual(['All', 'Kits', 'Exports', 'Icons', 'Inspiration'])
      await menu.getByRole('menuitemradio', { name: 'Kits' }).tap()
      await expect(menu).toBeHidden()
      await expect(kind).toContainText('Kind: Kits')
      const metas = await page.locator('.cm-grid .cm-tile-meta').allTextContents()
      expect(metas.length, 'there are kit pieces').toBeGreaterThan(0)
      expect(metas.length, 'the filter narrowed the list').toBeLessThan(before)
      for (const m of metas) expect(m, 'a non-kit piece is still listed').toMatch(/· UI kit\b/)
    } finally { await ctx.close() }
  })
}
