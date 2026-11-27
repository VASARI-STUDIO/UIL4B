// THE ICON LIBRARY'S "EXACT WORDS" SWITCH.
//
// A search is a MEANING search by default: "snowflake" also shows the icons for its related words, and a line
// under the toolbar says which. "Exact words" narrows it to icons whose names hold the typed words, writes
// ?match=exact (replace, only while on) and says so on the same line.
//
// SHOULD FAIL ON origin/main: every test here. The switch, the line (#ig-mode-line) and the related-word
// searches do not exist there, and the unit tests (tests/unit/icon-concept-terms.test.js, U1 and U2) import
// iconConceptTermsFor, which does not exist there either.
//
// Fixture words (tests/user-sim/fixtures/iconify/search.json): "snowflake", "thermometer", "ice" and "winter"
// have icons; "cold" has none, so it is the literal-empty case; "winterGreen" is a substring-only hit.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { isIconifyUrl, isLiveIconify, refuseIconify } from './iconify-stub.js'

const REAL_CELL = '.ig .ic:not(.ig-skel)'
const LIVE = 'the live API decides what it serves; this spec pins the fixture'
const searchBox = (page) => page.getByRole('searchbox', { name: /search icons/i })
const modeSwitch = (page) => page.getByRole('switch', { name: 'Exact words' })
const line = (page) => page.locator('#ig-mode-line')

const names = (page) => page.locator(REAL_CELL).evaluateAll((cells) => cells.map((c) => (c.getAttribute('aria-label') || '').replace(/^Customise /, '').split(',')[0].trim()))

// Every /search the page sends, as its query text, so a spec can see what was asked and in what order.
function recordSearches(page) {
  const seen = []
  page.on('request', (req) => {
    if (!isIconifyUrl(req.url())) return
    const url = new URL(req.url())
    if (url.pathname === '/search') seen.push(url.searchParams.get('query'))
  })
  return seen
}

// Hold one word's /search for `ms`, then let the fixture answer it.
async function slowSearch(page, word, ms) {
  await page.route((u) => isIconifyUrl(u.href) && u.pathname === '/search' && u.searchParams.get('query') === word, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
    await route.fallback().catch(() => { /* page closed while held */ })
  })
}

async function open(page, size, url = '/create/icons') {
  await page.setViewportSize(size)
  await signIn(page, { plan: 'pro' })
  await go(page, url)
  await expect(page.locator(REAL_CELL).first(), 'POSITIVE CONTROL: the grid is up').toBeVisible({ timeout: 20_000 })
}

const WIDE = { width: 1440, height: 900 }

test.describe('Exact words, 1440', () => {
  test.beforeEach(({}, info) => { info.skip(isLiveIconify(), LIVE) })

  // T1
  test('no switch on an empty field or one character', async ({ page }) => {
    watch(page, 'a designer who has not typed yet')
    await open(page, WIDE)
    await expect(modeSwitch(page)).toHaveCount(0)
    await searchBox(page).fill('c')
    await expect(modeSwitch(page)).toHaveCount(0)
    await expect(line(page)).toHaveCount(0)
  })

  // T2, T3
  test('the switch appears inside the field at two characters, and the answer is a meaning search', async ({ page }) => {
    watch(page, 'a designer typing a word with related words')
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    await expect(modeSwitch(page)).toHaveCount(1)
    const place = await modeSwitch(page).evaluate((el) => {
      const field = el.closest('.lbry-search')
      const clear = field && field.querySelector('.lbry-search-clear')
      return { inField: Boolean(field), beforeClear: Boolean(clear) && Boolean(el.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING) }
    })
    expect(place.inField, 'on a wide screen the switch lives in the search field').toBe(true)
    expect(place.beforeClear, 'and comes before the clear button').toBe(true)
    await expect(modeSwitch(page)).toHaveAttribute('aria-checked', 'false')

    await expect(line(page)).toContainText('Also showing:', { timeout: 20_000 })
    await expect(line(page).locator('.ig-related-term').first()).toBeVisible()
    const got = await names(page)
    expect(got[0], 'the icons named for the typed word come first').toContain('snowflake')
    expect(got.some((n) => !n.includes('snowflake')), 'related icons follow').toBe(true)
    // The line lists only related words that have an icon on screen.
    const terms = await line(page).locator('.ig-related-term').allTextContents()
    expect(terms.length).toBeGreaterThan(0)
    for (const t of terms) expect(got.some((n) => n.includes(t)), `${t} has an icon in the grid`).toBe(true)
  })

  // T4
  test('turning it on narrows the answer, writes ?match=exact without a history entry, and says so', async ({ page }) => {
    watch(page, 'a designer who wants only the typed word')
    await open(page, WIDE)
    await searchBox(page).fill('winter')
    await expect.poll(async () => (await names(page)).some((n) => n === 'wintergreen'), { timeout: 20_000, message: 'meaning mode shows the substring hit' }).toBe(true)
    const before = await page.evaluate(() => history.length)
    await modeSwitch(page).click()
    await expect(modeSwitch(page)).toHaveAttribute('aria-checked', 'true')
    await expect(page).toHaveURL(/[?&]match=exact(&|$)/)
    expect(await page.evaluate(() => history.length), 'replace, not push').toBe(before)
    await expect(line(page)).toContainText('Names with “winter” only')
    await expect(line(page).locator('.ig-related-term')).toHaveCount(0)
    await expect.poll(async () => {
      const got = await names(page)
      return got.length > 0 && got.every((n) => n.split('-').includes('winter'))
    }, { timeout: 20_000, message: 'every result holds the word whole' }).toBe(true)
    await expect(page.locator('#ig-result-count')).toContainText('exact words')

    // Off again: the parameter goes, the related icons come back.
    await modeSwitch(page).click()
    await expect(page).not.toHaveURL(/match=/)
    await expect.poll(async () => (await names(page)).some((n) => n === 'wintergreen'), { timeout: 20_000 }).toBe(true)
  })

  // T5
  test('?match=exact is read on arrival', async ({ page }) => {
    watch(page, 'a designer following a link with the switch on')
    await open(page, WIDE, '/create/icons?match=exact')
    await searchBox(page).fill('snowflake')
    await expect(modeSwitch(page)).toHaveAttribute('aria-checked', 'true')
    await expect(line(page)).toContainText('Names with “snowflake” only', { timeout: 20_000 })
  })

  // T6
  test('the switch adds no history entry for Back to undo', async ({ page }) => {
    watch(page, 'a designer pressing Back after toggling')
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    await modeSwitch(page).click()
    await expect(page).toHaveURL(/match=exact/)
    await modeSwitch(page).click()
    await expect(page).not.toHaveURL(/match=/)
    expect(await page.evaluate(() => history.length), 'two toggles, still the history the visit started with').toBeLessThanOrEqual(3)
  })

  // T7
  test('keyboard: Tab reaches the switch from the field, Space toggles, the next Tab is Clear', async ({ page }) => {
    watch(page, 'a keyboard user')
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    await searchBox(page).focus()
    await page.keyboard.press('Tab')
    await expect(modeSwitch(page)).toBeFocused()
    const ring = () => modeSwitch(page).evaluate((el) => { const s = getComputedStyle(el); return { w: parseFloat(s.outlineWidth), off: s.outlineOffset } })
    expect((await ring()).w, 'a visible focus ring when off').toBeGreaterThanOrEqual(2)
    await page.keyboard.press('Space')
    await expect(modeSwitch(page)).toHaveAttribute('aria-checked', 'true')
    const on = await ring()
    expect(on.w).toBeGreaterThanOrEqual(2)
    expect(on.off, 'on, the ring sits inside the ink fill').toBe('-4px')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeFocused()
  })

  // T8
  test('nothing is cut off with the switch in the field', async ({ page }) => {
    watch(page, 'a designer on a laptop')
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    await expect(modeSwitch(page)).toBeVisible()
    const fit = await page.evaluate(() => {
      const row = document.querySelector('.lbry-toolbar-row')
      const input = document.querySelector('.lbry-search input')
      return { over: row.scrollWidth - row.clientWidth, inputW: input.getBoundingClientRect().width }
    })
    expect(fit.over, 'the toolbar row does not overflow').toBeLessThanOrEqual(0)
    expect(fit.inputW, 'the field keeps room to type').toBeGreaterThanOrEqual(96)
  })

  // T9
  test('the switch is big enough to press', async ({ page }) => {
    watch(page, 'a designer')
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    const box = await modeSwitch(page).boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(24)
  })

  // T10
  test('empty states say what the mode searched', async ({ page }) => {
    watch(page, 'a designer who typed a word the catalogue lacks')
    await open(page, WIDE)
    // A word with no icons and no related words.
    await searchBox(page).fill('zzqx')
    await expect(page.locator('.pl-empty')).toContainText('No icons for “zzqx”', { timeout: 20_000 })
    await expect(page.locator('.pl-empty')).not.toContainText('related words')
    await expect(page.locator('.pl-empty')).not.toContainText('Exact words is on')
    // "cold" has related words that DO have icons, so meaning mode is not empty.
    await searchBox(page).fill('cold')
    await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
    await expect(line(page)).toContainText('No icons named “cold”. Showing:')
    // Exact on: empty, and the sentence says how to widen it.
    await modeSwitch(page).click()
    await expect(page.locator('.pl-empty')).toContainText('Exact words is on', { timeout: 20_000 })
    await expect(page.locator('.pl-empty')).toContainText('No icons match “cold”')
  })

  // T11, T17
  test('a stale answer never reaches the line or the grid', async ({ page }) => {
    watch(page, 'a designer who changes their mind mid-search')
    await open(page, WIDE)
    await slowSearch(page, 'thermometer', 2500)
    await searchBox(page).fill('snowflake')
    await expect(line(page)).toContainText('Also showing:', { timeout: 20_000 })
    await searchBox(page).fill('heart')
    // For as long as the slow word could still land, "snowflake"'s words must not appear.
    const deadline = Date.now() + 3500
    while (Date.now() < deadline) {
      const text = (await line(page).textContent()) || ''
      expect(text, 'the line belongs to the current query').not.toMatch(/thermometer|snowflake/)
      await page.waitForTimeout(250)
    }
    const got = await names(page)
    expect(got.length).toBeGreaterThan(0)
    expect(got.some((n) => /snowflake|thermometer/.test(n))).toBe(false)
  })

  // T12
  test('reduced motion: the switch does not transition', async ({ page }) => {
    watch(page, 'a designer who asked for reduced motion')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    const d = await modeSwitch(page).evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(d.split(',').every((s) => parseFloat(s) === 0), `transition-duration is ${d}`).toBe(true)
  })

  // T13
  test('the rest of the toolbar is still there and the category round trip still works', async ({ page }) => {
    watch(page, 'a designer using the whole toolbar')
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible()
    await expect(page.locator('#ig-result-count')).toHaveCount(1)
    await expect(page.locator('.lbry-toolbar')).toHaveCount(1)
    await modeSwitch(page).click()
    await expect(page).toHaveURL(/match=exact/)
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(modeSwitch(page)).toHaveCount(0)
    await expect(page).not.toHaveURL(/match=/)
  })

  // T14
  test('typing does not change the toolbar stage', async ({ page }) => {
    watch(page, 'a designer typing')
    await open(page, WIDE)
    const stage = () => page.locator('.lbry-toolbar').first().getAttribute('data-stage')
    const before = await stage()
    await searchBox(page).fill('snowflake')
    await expect(modeSwitch(page)).toBeVisible()
    expect(await stage(), 'the row reserved room for the switch from the first paint').toBe(before)
  })

  // T15
  test('pressing the switch does not move the grid', async ({ page }) => {
    watch(page, 'a designer toggling the switch')
    await open(page, WIDE)
    await searchBox(page).fill('winter')
    await expect(line(page)).toContainText(/Also showing:|Names and keywords|Including related words/, { timeout: 20_000 })
    await expect(page.locator(REAL_CELL).first()).toBeVisible()
    const top = () => page.locator('.ig').first().evaluate((el) => el.getBoundingClientRect().top)
    const before = await top()
    await modeSwitch(page).click()
    await expect(line(page)).toContainText('Names with “winter” only')
    await expect(page.locator(REAL_CELL).first()).toBeVisible()
    expect(await top(), 'the grid stays where it was').toBe(before)
  })

  // T16
  test('a slow related word does not hold the typed word back', async ({ page }) => {
    watch(page, 'a designer on a slow connection')
    await open(page, WIDE)
    await slowSearch(page, 'thermometer', 3000)
    await searchBox(page).fill('snowflake')
    const started = Date.now()
    await expect.poll(async () => (await names(page)).some((n) => n.includes('snowflake')), { timeout: 2500, message: 'the typed word is on screen before the slow word lands' }).toBe(true)
    expect(Date.now() - started).toBeLessThan(2500)
    await expect.poll(async () => (await names(page)).some((n) => n.includes('thermometer') && !n.includes('snowflake')), { timeout: 10_000, message: 'and the slow word is appended when it lands' }).toBe(true)
  })

  // T18
  test('a toggle inside the 300ms debounce is honoured by the search that fires', async ({ page }) => {
    watch(page, 'a designer who types and presses the switch at once')
    await open(page, WIDE)
    const seen = recordSearches(page)
    await searchBox(page).fill('snowflake')
    await modeSwitch(page).click()
    await expect(line(page)).toContainText('Names with “snowflake” only', { timeout: 20_000 })
    await page.waitForTimeout(800)
    expect(seen, 'the literal word was asked for').toContain('snowflake')
    expect(seen.filter((q) => q === 'thermometer'), 'no related word was asked for in exact mode').toHaveLength(0)
    expect((await names(page)).every((n) => n.split('-').includes('snowflake'))).toBe(true)
  })

  // T19
  test('forced colours: on and off look different', async ({ page }) => {
    watch(page, 'a designer in Windows high contrast')
    await page.emulateMedia({ forcedColors: 'active' })
    await open(page, WIDE)
    await searchBox(page).fill('snowflake')
    const fill = () => modeSwitch(page).evaluate((el) => getComputedStyle(el).backgroundColor)
    const off = await fill()
    await modeSwitch(page).click()
    await expect(modeSwitch(page)).toHaveAttribute('aria-checked', 'true')
    expect(await fill(), 'the on state is not told apart by colour alone, and not by the browser default').not.toBe(off)
  })
})

for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 360, height: 740 }]) {
  test.describe(`Exact words, ${size.width}x${size.height}`, () => {
    test.beforeEach(({}, info) => { info.skip(isLiveIconify(), LIVE) })

    // T2 and T8 on a phone
    test('the switch leads the line under the toolbar, and nothing is cut off', async ({ page }) => {
      watch(page, 'a designer on a phone')
      await open(page, size)
      await searchBox(page).fill('snowflake')
      await expect(modeSwitch(page)).toHaveCount(1)
      const place = await modeSwitch(page).evaluate((el) => ({
        inLine: Boolean(el.closest('.ig-searchline')),
        inField: Boolean(el.closest('.lbry-search')),
        box: el.getBoundingClientRect().toJSON(),
        vw: window.innerWidth,
      }))
      expect(place.inLine).toBe(true)
      expect(place.inField, 'one switch, never two').toBe(false)
      expect(place.box.left).toBeGreaterThanOrEqual(0)
      expect(place.box.right).toBeLessThanOrEqual(place.vw)
      await expect(line(page)).toContainText('Also showing:', { timeout: 20_000 })
      const fit = await page.evaluate(() => {
        const row = document.querySelector('.lbry-toolbar-row')
        const sl = document.querySelector('.ig-searchline')
        const input = document.querySelector('.lbry-search input')
        return { rowOver: row.scrollWidth - row.clientWidth, lineOver: sl.scrollWidth - sl.clientWidth, inputW: input.getBoundingClientRect().width }
      })
      expect(fit.rowOver).toBeLessThanOrEqual(0)
      expect(fit.lineOver).toBeLessThanOrEqual(0)
      expect(fit.inputW, 'the field keeps its width: the switch is not in it').toBeGreaterThanOrEqual(120)
    })

    // T20
    test('the line stays short enough not to push the grid far down', async ({ page }) => {
      watch(page, 'a designer on a phone')
      await open(page, size)
      await searchBox(page).fill('snowflake')
      await expect(line(page)).toContainText('Also showing:', { timeout: 20_000 })
      const h = await page.locator('.ig-searchline').evaluate((el) => el.getBoundingClientRect().height)
      expect(h, `the line is ${h}px tall`).toBeLessThanOrEqual(100)
    })
  })
}

test.describe('Exact words, touch targets on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test.beforeEach(({}, info) => { info.skip(isLiveIconify(), LIVE) })

  // T9 on a phone
  test('the switch and each related word have a 44px press area', async ({ page }) => {
    watch(page, 'a designer on a phone')
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
    await searchBox(page).fill('snowflake')
    await expect(line(page)).toContainText('Also showing:', { timeout: 20_000 })
    // The pill plus the ::before inset on each side.
    const area = await modeSwitch(page).evaluate((el) => {
      const pill = el.getBoundingClientRect().height
      const inset = Math.abs(parseFloat(getComputedStyle(el, '::before').top)) || 0
      return pill + inset * 2
    })
    expect(area).toBeGreaterThanOrEqual(44)
    const heights = await line(page).locator('.ig-related-term').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(heights.length).toBeGreaterThan(0)
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44)
  })
})

test('with the icon service refused, the built-in answer is exact and the line says so', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a visitor whose icon catalogue is refused')
  await page.setViewportSize(WIDE)
  await refuseIconify(page)
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
  await searchBox(page).fill('arrow')
  await expect(modeSwitch(page)).toBeVisible()
  await modeSwitch(page).click()
  await expect(line(page)).toContainText('Names with “arrow” only')
  await expect.poll(async () => (await names(page)).length, { timeout: 20_000 }).toBeGreaterThan(0)
})
