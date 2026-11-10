// Six small faults from a first-time-user pass, one test group each.
//
//   1. /create/palette: Randomise with every swatch locked says why it did nothing
//   2. the colour picker's value field and the /create/contrast hex fields say so
//      when they refuse what was typed, and keep the last good colour
//   3. following the AI terms link logs no smooth-scroll warning and still lands on section 8
//   4. the two inline links ("In beta" on /tools, the AI terms link on /info) are 44px to a finger
//   5. the starter cards on /community open nothing; a member's submission still does
//   6. the category chips on /community show, at 320 and 390, that the row scrolls
//
// MUTATIONS (each seen red, then restored):
//   1. PaletteBuilder.jsx: delete the all-locked branch in `randomize`.
//   2. ColorPickerPop.jsx: make `applyTypedColor` skip `setHexError(true)`.
//      ContrastChecker.jsx: delete the `leave` handler's `setRejectedAt`.
//   3. AltTextGenerator-style links: delete `onClick={crossRouteHashClick(AI_TERMS_PATH)}`
//      from the InfoCentre link; the console warning appears.
//   4. info.css / spectrum-tools.css: delete the `::after` rules in the touch block.
//   5. CommunityCard.jsx: put `safeHttpUrl(item.url)` back as the starter card's href.
//   6. community.css / Community.jsx: take `rail-overflow` off `.ch-filters`.
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
    await page.waitForTimeout(3500) // let the first toast leave
    await expect(page.locator('.toast.show')).toHaveCount(0)
    // The seed stays locked, so compare every column: the freed one changes.
    const columns = () => page.locator('.plb-col').allTextContents()
    const held = await columns()
    await page.locator('.plb-random').click()
    await expect(page.locator('.toast.show', { hasText: LOCKED_MSG })).toHaveCount(0)
    await expect.poll(columns, { message: 'one free swatch shuffles' }).not.toEqual(held)
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
test.describe('Starter cards on /community', () => {
  test('open nothing outside the site; a member submission still links', async ({ page }) => {
    watch(page, 'someone tapping a starter card')
    await page.addInitScript(() => {
      localStorage.setItem('vs-community-submissions', JSON.stringify([{
        id: 'mine-1', name: 'My own design', author: 'Test member', category: 'Landing',
        url: 'https://example.com/work', c1: '#111111', c2: '#333333', saves: 0,
      }]))
    })
    await go(page, '/community')
    const starter = page.locator('.ch-card', { hasText: 'Dashboard & analytics UI' })
    await expect(starter).toBeVisible()
    await expect(starter.locator('a')).toHaveCount(0)
    await expect(starter.locator('.ch-card-source')).toHaveText('Dribbble')
    await expect(starter.locator('.ch-heart')).toBeVisible()
    await expect(page.locator('.ch-card a[href*="dribbble.com"], .ch-card a[href*="awwwards.com"], .ch-card a[href*="behance.net"], .ch-card a[href*="mobbin.com"]')).toHaveCount(0)
    const mine = page.locator('.ch-card', { hasText: 'My own design' })
    await expect(mine.locator('a.ch-thumb')).toHaveAttribute('href', 'https://example.com/work')
  })
})

// ── 6 ────────────────────────────────────────────────────────────────────────
for (const width of [320, 390]) {
  test(`the category chips show that the row scrolls at ${width}`, async ({ browser }) => {
    const { ctx, page } = await openPhone(browser, '/community', width)
    try {
      const rail = page.locator('.ch-spectrum .ch-filters')
      await expect(rail).toBeVisible()
      const at = (scrollToEnd) => rail.evaluate(async (el, end) => {
        el.scrollLeft = end ? el.scrollWidth : 0
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        const box = el.getBoundingClientRect()
        const clipped = [...el.children].filter((c) => c.getBoundingClientRect().right > box.right + 1).length
        return { mask: getComputedStyle(el).maskImage, clipped, scrolls: el.scrollWidth > el.clientWidth + 1 }
      }, scrollToEnd)
      const start = await at(false)
      expect(start.scrolls, 'the row overflows here').toBe(true)
      expect(start.clipped, 'a chip runs past the edge').toBeGreaterThan(0)
      expect(start.mask, 'a fade says there is more').toMatch(/gradient/)
      await page.screenshot({ path: `.claude/scratch/chrome1/community-chips-${width}.png` })
      const end = await at(true)
      expect(end.mask, 'the fade changes once the row has been scrolled').not.toBe(start.mask)
      expect(end.clipped, 'at the end no chip is cut off').toBe(0)
    } finally { await ctx.close() }
  })
}
