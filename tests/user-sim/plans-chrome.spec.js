// /plans chrome that sits over or beside the page content:
//   · the comparison's sticky head follows the marketing nav (top 0 while the nav
//     is slid away, flush under it while it shows)
//   · the quietest text on the light theme reads at 4.5:1 or better
//   · the docked bar stays on screen from the Retry press until the price lands
//   · "1 coffee" never splits across lines
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

test.use({ locale: 'en-AU' })

const LIVE = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { aud: 10 }, yearly: { aud: 75 },
}
const answer = (body, status = 200) => (route) => route.fulfill({
  status, contentType: 'application/json', body: JSON.stringify(status === 200 ? withAvailability(body) : body),
})
const stubLive = (page) => page.route('**/api/get-prices*', answer(LIVE))

const lightPage = async (browser, options = {}) => {
  const context = await browser.newContext({ colorScheme: 'light', locale: 'en-AU', ...options })
  await context.addInitScript(() => { try { localStorage.setItem('vs-t', 'light') } catch { /* private mode */ } })
  return { context, page: await context.newPage() }
}

test('the comparison head sits at the very top while the nav is away and flush under it while it shows', async ({ page }) => {
  watch(page, 'someone reading the comparison table on a desktop')
  await page.setViewportSize({ width: 1440, height: 900 })
  await stubLive(page)
  await go(page, '/plans')
  const nav = page.locator('.spnav')
  const head = page.locator('.pl-t thead th').first()
  const headTop = async () => Math.round((await head.boundingBox()).y)
  const navBottom = async () => Math.round((await nav.boundingBox()).y + (await nav.boundingBox()).height)
  const tableTop = await page.locator('.pl-t').evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

  await expect(nav).toHaveAttribute('data-nav-hidden', '0')
  await page.evaluate((y) => window.scrollTo(0, y), tableTop + 600)
  await expect(nav).toHaveAttribute('data-nav-hidden', '1')
  await expect.poll(headTop, { message: 'the head left a gap under a nav that has slid away' }).toBe(0)

  await page.evaluate((y) => window.scrollTo(0, y), tableTop + 500)
  await expect(nav).toHaveAttribute('data-nav-hidden', '0')
  const navH = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spnav-h')))
  expect(navH, '--spnav-h is the nav bar height').toBeGreaterThan(40)
  await expect.poll(headTop, { message: 'the head is not flush under the nav' }).toBe(Math.round(navH) + 1)
  expect(Math.abs((await headTop()) - (await navBottom())), 'the head is more than the nav rule away from the nav').toBeLessThanOrEqual(1)
})

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`at ${width} on the light theme the quiet text reads at 4.5:1 or better`, async ({ browser }) => {
    const { context, page } = await lightPage(browser, { viewport: { width, height } })
    watch(page, 'someone reading the plans in daylight')
    await stubLive(page)
    await go(page, '/plans')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('.hpl-pro .pa-amt')).toHaveText(/A\$/)

    // The quiet ink is a custom property, so each element's resolved colour is
    // laid over the nearest opaque surface behind it.
    const rows = await page.evaluate(() => {
      const parse = (css) => {
        const m = css.match(/rgba?\(([^)]+)\)/)
        if (!m) throw new Error(`unreadable colour ${css}`)
        const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
        return { r, g, b, a }
      }
      const over = (top, under) => ({
        r: top.r * top.a + under.r * (1 - top.a),
        g: top.g * top.a + under.g * (1 - top.a),
        b: top.b * top.a + under.b * (1 - top.a),
        a: 1,
      })
      const surface = (el) => {
        const layers = []
        for (let node = el; node; node = node.parentElement) {
          const bg = parse(getComputedStyle(node).backgroundColor)
          if (bg.a > 0) layers.push(bg)
          if (bg.a === 1) break
        }
        return layers.reverse().reduce((under, layer) => over(layer, under), { r: 255, g: 255, b: 255, a: 1 })
      }
      const lum = ({ r, g, b }) => {
        const [R, G, B] = [r, g, b].map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 })
        return 0.2126 * R + 0.7152 * G + 0.0722 * B
      }
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
      const quiet = parseFloat(getComputedStyle(document.querySelector('.pricing')).getPropertyValue('--pa-quiet'))
      const probes = [
        ['the switch, an unselected cadence', '.pl-seg:not(.pl-on)'],
        ['the Free card footnote', '.hpl-freefoot p'],
        ['the comparison head, first cell', '.pl-t thead th:first-child'],
        ['the stacked comparison value label', '.pl-vl'],
      ]
      const out = [{ what: '--pa-quiet', quiet, ratio: null }]
      for (const [what, selector] of probes) {
        const el = [...document.querySelectorAll(selector)].find((node) => node.getClientRects().length && node.textContent.trim())
        if (!el) { out.push({ what, missing: true }); continue }
        const bg = surface(el)
        const fg = over(parse(getComputedStyle(el).color), bg)
        out.push({ what, ratio: ratio(fg, bg) })
      }
      return out
    })

    const measured = rows.filter((row) => !row.missing && row.ratio != null)
    expect(measured.length, `no quiet text was on screen at ${width}`).toBeGreaterThanOrEqual(2)
    for (const row of measured) expect(row.ratio, `${row.what} on the light theme`).toBeGreaterThanOrEqual(4.5)
    await context.close()
  })
}

test('at 390 the docked bar stays on screen from the Retry press until the price lands', async ({ page }) => {
  watch(page, 'someone on a phone pressing Retry from the docked bar')
  await page.setViewportSize({ width: 390, height: 844 })
  let release
  const held = new Promise((resolve) => { release = resolve })
  let calls = 0
  await page.route('**/api/get-prices*', async (route) => {
    calls += 1
    if (calls === 1) return answer({}, 503)(route)
    await held
    return answer(LIVE)(route)
  })
  await go(page, '/plans')
  await expect(page.locator('.hpl-pro .pa-amt')).toHaveText('Unavailable')

  const bar = page.locator('.pl-bar')
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.pl-panel, .pl-srow')?.getBoundingClientRect().top + window.scrollY))
  await expect(bar).toHaveAttribute('data-on', 'true')
  const onScreen = async (what) => {
    const box = await bar.boundingBox()
    const viewport = page.viewportSize()
    expect(box, `${what}: the bar has no box`).not.toBeNull()
    expect(box.y + box.height, `${what}: the bar left the bottom of the screen`).toBeCloseTo(viewport.height, 0)
    await expect(bar, `${what}: the bar is hidden`).toBeVisible()
    await expect(bar, `${what}: the bar faded out`).toHaveAttribute('data-on', 'true')
  }
  await onScreen('before Retry')

  await bar.getByRole('button', { name: 'Retry live pricing' }).click()
  const pressed = bar.getByRole('button')
  await expect(pressed, 'the press has no answer in the bar').toHaveAttribute('aria-busy', 'true')
  await onScreen('while Retry checks')
  await page.waitForTimeout(400)
  await onScreen('400 ms into Retry')

  release()
  await expect(page.locator('.hpl-pro .pa-amt')).toHaveText(/A\$/)
  await expect(bar.getByRole('link')).toBeVisible()
  await onScreen('after the price lands')
  expect(calls, 'Retry made no request').toBe(2)
})

for (const width of [320, 390]) {
  test(`at ${width} "1 coffee" in the headline stays on one line`, async ({ page }) => {
    watch(page, 'someone on a small phone reading the headline')
    await page.setViewportSize({ width, height: 640 })
    await stubLive(page)
    await go(page, '/plans')
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toContainText('1')
    const tops = await h1.evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.data.search(/1[\s\xa0]coffee/)
        if (at < 0) continue
        const range = document.createRange()
        range.setStart(node, at)
        range.setEnd(node, at + '1 coffee'.length)
        return [...range.getClientRects()].map((rect) => Math.round(rect.top))
      }
      return null
    })
    expect(tops, 'the headline has no "1 coffee"').not.toBeNull()
    expect(new Set(tops).size, `"1 coffee" sits on lines at ${tops}`).toBe(1)
  })
}
