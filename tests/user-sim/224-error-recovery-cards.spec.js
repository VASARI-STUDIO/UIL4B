// THE WAY OUT OF AN ERROR: the crash card, the load-failed card, the slow-load
// line and the 404.
//
// What a person needs when a page fails is the same each time: to be told what
// happened in plain words, to land on that message (a keyboard or screen reader
// user is otherwise left on <body>), and to have ways on: reload the page, report
// it, go to the home page, or the help centre. Offline, a reload would replace
// the page with the browser's own error, so the card removes every way on and
// says it is waiting for a connection.
//
// Every state is read at 390 on a touch device and at 1440, in the light and
// the dark theme, because the card's colours and its tap targets are different
// in each. 320 has its own block at the end.
//
// How each state is made:
//   crash          the page's chunk is served as a module that throws. The one
//                  automatic reload is already spent (sessionStorage guard), so
//                  the crash lands on the first try.
//   load-failed    the chunk request is aborted, guard spent likewise.
//   offline        navigator.onLine is pinned and the context goes offline.
//   slow           the chunk request is held and never answered.
//   404            a path the router does not know.
//
// "In-app" navigation is a real history PUSH through the router's own history
// object, found on the React tree: the router offers no handle on the page, and
// a pushState with a dispatched popstate is a POP, which is the one case the
// 404 treats differently.
import { test, expect } from './base.js'
import { go, goRaw, expectRendered } from './helpers.js'
import fs from 'node:fs'
import path from 'node:path'

import {
  CREDITS_CHUNK, SETTINGS_CHUNK, PALETTE_CHUNK, COMMAND_PALETTE_CHUNK, PROBE, TITLE_CRASH, TITLE_LOAD,
  pushInApp, spendReload, crashChunk, failChunk, setConnection,
} from './edge-cards.js'

const BODY_CRASH = 'Reloading usually fixes it.'
const BODY_LOAD = 'Part of this page couldn’t be downloaded. Trying again usually fixes it.'
const BODY_OFFLINE_CRASH = 'You’re offline. Reconnect and you can reload.'
const BODY_OFFLINE_LOAD = 'You’re offline. Reconnect and you can try again.'
const SAFE_LINE = 'Saved projects are fine. Changes you hadn’t saved may be lost.'
const SLOW_LINE = 'Still loading. Your connection may be slow.'

const VARIANTS = [
  { id: '390 touch, light', viewport: { width: 390, height: 844 }, touch: true, scheme: 'light' },
  { id: '390 touch, dark', viewport: { width: 390, height: 844 }, touch: true, scheme: 'dark' },
  { id: '1440, light', viewport: { width: 1440, height: 900 }, touch: false, scheme: 'light' },
  { id: '1440, dark', viewport: { width: 1440, height: 900 }, touch: false, scheme: 'dark' },
]

/** A page in its own context for one variant, closed afterwards. */
async function withPage(browser, variant, run) {
  const context = await browser.newContext({
    viewport: variant.viewport,
    hasTouch: variant.touch,
    isMobile: variant.touch,
    colorScheme: variant.scheme,
  })
  try {
    const page = await context.newPage()
    await run(page, context)
  } finally {
    await context.close()
  }
}

/** The theme the page actually painted, so a variant never claims one it did not render. */
async function expectTheme(page, variant) {
  await expect(page.locator('html'), `the page should be in the ${variant.scheme} theme`)
    .toHaveAttribute('data-theme', variant.scheme)
}

/** In-app to /settings, which crashes inside the app shell. */
async function landShellCrash(page, variant) {
  await go(page, '/privacy')
  await expectTheme(page, variant)
  await spendReload(page)
  const asked = await crashChunk(page, SETTINGS_CHUNK)
  await pushInApp(page, '/settings')
  const card = page.locator('.error-boundary')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(TITLE_CRASH)
  return { card, asked }
}

/** In-app to /create/palette, which crashes on a route that returns before the shell. */
async function landChromelessCrash(page, variant) {
  await go(page, '/privacy')
  await expectTheme(page, variant)
  await spendReload(page)
  const asked = await crashChunk(page, PALETTE_CHUNK)
  await pushInApp(page, '/create/palette')
  const card = page.locator('.error-boundary')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(TITLE_CRASH)
  return { card, asked }
}

/** The home page itself: the command palette's file throws when it opens. */
async function landHomeCrash(page) {
  await crashChunk(page, COMMAND_PALETTE_CHUNK)
  await go(page, '/')
  // The homepage is dark under both colour schemes.
  await expectTheme(page, { scheme: 'dark' })
  await spendReload(page)
  await page.keyboard.press('/')
  const card = page.locator('.error-boundary')
  await expect(card).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  return { card }
}

/** In-app to /credits with its file aborted: the page that did not download. */
async function landLoadFailed(page, variant) {
  await go(page, '/privacy')
  await expectTheme(page, variant)
  await spendReload(page)
  const asked = await failChunk(page, CREDITS_CHUNK)
  await pushInApp(page, '/credits')
  const card = page.locator('.error-boundary--load')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(TITLE_LOAD)
  return { card, asked }
}

/** WCAG contrast of an element's text against what is actually behind it, painted not guessed. */
function contrastOf(locator) {
  return locator.evaluate((el) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const rgba = (css) => {
      if (!CSS.supports('color', css)) throw new Error(`cannot read the colour ${css}`)
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const over = (top, bottom) => {
      const a = top[3]
      return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1)
    }
    const chain = []
    for (let n = el; n; n = n.parentElement) chain.push(n)
    let ground = [255, 255, 255, 1]
    for (const n of chain.reverse()) {
      const bg = rgba(getComputedStyle(n).backgroundColor)
      if (bg[3] > 0) ground = over(bg, ground)
    }
    const ink = over(rgba(getComputedStyle(el).color), ground)
    const lum = ([r, g, b]) => {
      const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const [hi, lo] = [lum(ink), lum(ground)].sort((a, b) => b - a)
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
  })
}

/** Every opacity from the element up to the root, multiplied. */
function effectiveOpacity(locator) {
  return locator.evaluate((el) => {
    let o = 1
    for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
    return o
  })
}

/** Nothing sticks out sideways, and the card is inside the viewport. */
async function expectFits(page, what) {
  const m = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
    card: (() => {
      const r = document.querySelector('.error-boundary-card')?.getBoundingClientRect()
      return r ? { left: r.left, right: r.right } : null
    })(),
  }))
  expect(m.scroll, `${what}: the page scrolls sideways (${m.scroll} > ${m.inner})`).toBeLessThanOrEqual(m.inner)
  if (m.card) {
    expect(m.card.left, `${what}: the card starts off screen`).toBeGreaterThanOrEqual(0)
    expect(m.card.right, `${what}: the card ends off screen`).toBeLessThanOrEqual(m.inner)
  }
}

/** Every action and trail link is big enough to hit: 44 high and wide, on any device. */
async function expectTargets(card, what) {
  const sizes = await card.evaluate((root) => {
    const box = (sel) => {
      const r = root.querySelector(sel)?.getBoundingClientRect()
      return r ? { w: r.width, h: r.height } : null
    }
    return {
      reload: box('.ed-acts button.ed-pill'),
      report: box('.ed-acts a.ui-pill-out'),
      home: box('.ed-trail a[href="/"]'),
      help: box('.ed-trail a[href="/learn/help"]'),
    }
  })
  for (const [name, size] of Object.entries(sizes)) {
    expect(size, `${what}: ${name} is not in the card`).not.toBeNull()
    expect(size.h, `${what}: ${name} is ${size.h}px high, under 44`).toBeGreaterThanOrEqual(43.99)
    expect(size.w, `${what}: ${name} is ${size.w}px wide, under 44`).toBeGreaterThanOrEqual(43.99)
  }
}

/** Every line of the card reads at 4.5:1 or better against what is painted behind it. */
async function expectLinesReadable(card, variant) {
  const lines = {
    heading: card.getByRole('heading', { level: 1 }),
    body: card.locator('.ed-body'),
    'safe line': card.locator('.ed-safe'),
    'Reload the page': reloadButton(card),
    'Report this': reportLink(card),
    'Back to the homepage': homeLink(card),
    'Help centre': helpLink(card),
  }
  for (const [name, locator] of Object.entries(lines)) {
    const ratio = await contrastOf(locator)
    expect(ratio, `${name} is ${ratio}:1 in the ${variant.scheme} theme, under 4.5`).toBeGreaterThanOrEqual(4.5)
  }
}

/** The ways on a crash or load card offers when there is a connection. */
const reloadButton = (card) => card.getByRole('button', { name: 'Reload the page' })
const reportLink = (card) => card.getByRole('link', { name: 'Report this', exact: true })
const homeLink = (card) => card.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Back to the homepage' })
const helpLink = (card) => card.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Help centre' })

// ───────────────────────────── the crash card ─────────────────────────────

for (const variant of VARIANTS) {
  test.describe(`the crash card, ${variant.id}`, () => {
    test('says what happened, takes focus, shows the ways on, and never shows the raw error', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landShellCrash(page, variant)

        const h1 = card.getByRole('heading', { level: 1 })
        await expect(h1).toBeFocused()
        await expect(page.getByRole('heading', { level: 1 }), 'the card is the one h1 on the page').toHaveCount(1)
        await expect(card.locator('.ed-body')).toHaveText(BODY_CRASH)
        await expect(card.locator('.ed-safe')).toHaveText(SAFE_LINE)
        await expect(card.locator('.ed-status'), 'the status line is empty until there is something to say').toHaveText('')

        await expect(reloadButton(card)).toBeEnabled()
        await expect(reportLink(card), 'the report names the page that crashed').toHaveAttribute('href', '/feedback?type=bug&page=%2Fsettings')
        await expect(homeLink(card)).toHaveAttribute('href', '/')
        await expect(helpLink(card)).toHaveAttribute('href', '/learn/help')

        const text = await card.innerText()
        expect(text, 'the raw error message is shown to the person').not.toContain(PROBE)
        expect(text, 'a stack or error class is shown').not.toMatch(/\bError:|\bat\s+\S+\s+\(|\.js:\d+/)

        // Tab walks the ways on in reading order, starting from the heading.
        await page.keyboard.press('Tab')
        await expect(reloadButton(card)).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(reportLink(card)).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(homeLink(card)).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(helpLink(card)).toBeFocused()
      })
    })

    test('Reload the page asks for the page again, and a crash that persists lands on the heading again', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card, asked } = await landShellCrash(page, variant)
        expect(asked.count).toBe(1)
        const reloaded = page.waitForEvent('domcontentloaded')
        await reloadButton(card).click({ noWaitAfter: true })
        await reloaded
        await expect.poll(() => asked.count, { message: 'Reload the page did not request the chunk again' }).toBe(2)
        const again = page.locator('.error-boundary')
        await expect(again.getByRole('heading', { level: 1, name: TITLE_CRASH })).toBeFocused()
      })
    })

    test('Back to the homepage leaves the crashed page and shows the sales page', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landShellCrash(page, variant)
        await homeLink(card).click()
        await expect(page).toHaveURL(/\/$/)
        await expect(page.locator('.error-boundary')).toHaveCount(0)
        await expectRendered(page, '/')
      })
    })

    test('Back to the homepage, when the crash is on the home page itself, loads the document afresh', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landHomeCrash(page)
        // A client-side link to the page you are on changes nothing, so the
        // crash would stay. A marker on window proves the document was replaced.
        await page.evaluate(() => { window.__sameDocument = true })
        const reloaded = page.waitForEvent('domcontentloaded')
        await homeLink(card).click()
        await reloaded
        expect(await page.evaluate(() => window.__sameDocument), 'the home page link only navigated inside the old document').toBeUndefined()
        await expect(page).toHaveURL(/\/$/)
        await expectRendered(page, '/')
        await expect(page.locator('.error-boundary')).toHaveCount(0)
      })
    })

    test('Report this opens the feedback form as a bug report, and the Help centre opens help', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landShellCrash(page, variant)
        await reportLink(card).click()
        await expect(page).toHaveURL(/\/feedback\?type=bug&page=%2Fsettings$/)
        const form = page.locator('.fb-page')
        await expect(form).toBeVisible()
        await expect(form.locator('[role="radio"][aria-checked="true"]')).toHaveText('Bug report')
        await expect(page.locator('.error-boundary')).toHaveCount(0)

        await go(page, '/privacy')
        await spendReload(page)
        await crashChunk(page, SETTINGS_CHUNK)
        await pushInApp(page, '/settings')
        await helpLink(page.locator('.error-boundary')).click()
        await expect(page).toHaveURL(/\/learn\/help$/)
        await expectRendered(page, '/learn/help')
      })
    })

    test('a route with no app shell brings its own main landmark, and the card still leads home', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landChromelessCrash(page, variant)
        const main = page.locator('main#main')
        await expect(main, 'the outer card sits inside main#main').toHaveCount(1)
        await expect(main.locator('.error-boundary')).toHaveCount(1)
        // The skip link lands on #main, which must be able to take focus.
        await expect(main).toHaveAttribute('tabindex', '-1')
        await expect(page.getByRole('main')).toHaveCount(1)
        await expect(card.getByRole('heading', { level: 1 })).toBeFocused()
        const home = homeLink(card)
        await expect(home).toHaveAttribute('href', '/')
        await home.click()
        await expect(page).toHaveURL(/\/$/)
        await expectRendered(page, '/')
      })
    })

    test('fits the screen, has targets big enough to hit, and every line reads at 4.5:1 or better', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landShellCrash(page, variant)
        await expectFits(page, `crash card at ${variant.id}`)
        await expectTargets(card, `crash card at ${variant.id}`)
        await expectLinesReadable(card, variant)
      })
    })
  })
}

// ──────────────────────────── the load-failed card ────────────────────────────

for (const variant of VARIANTS) {
  test.describe(`the load-failed card, ${variant.id}`, () => {
    test('says the page did not load, takes focus, and shows the same ways on', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landLoadFailed(page, variant)
        await expect(card.getByRole('heading', { level: 1 })).toBeFocused()
        await expect(card.locator('.ed-body')).toHaveText(BODY_LOAD)
        await expect(card.locator('.ed-safe')).toHaveText(SAFE_LINE)
        await expect(reloadButton(card)).toBeEnabled()
        await expect(reportLink(card), 'the report names the page that did not load').toHaveAttribute('href', '/feedback?type=bug&page=%2Fcredits')
        await expect(homeLink(card)).toHaveAttribute('href', '/')
        await expect(helpLink(card)).toHaveAttribute('href', '/learn/help')
        await expect(card.locator('.ed-status'), 'the status line is empty until there is something to say').toHaveText('')
        await expectFits(page, `load-failed card at ${variant.id}`)
        await expectTargets(card, `load-failed card at ${variant.id}`)
      })
    })

    test('Reload the page requests the failed file a second time', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card, asked } = await landLoadFailed(page, variant)
        // Chromium 158 retries a failed dynamic import once by itself, so the card can stand on
        // one or two failed requests. Pin that the file was asked for, then that Reload asks again.
        expect(asked.count).toBeGreaterThanOrEqual(1)
        const before = asked.count
        const reloaded = page.waitForEvent('domcontentloaded')
        await reloadButton(card).click({ noWaitAfter: true })
        await reloaded
        await expect.poll(() => asked.count, { message: 'Reload the page did not request the file again' }).toBeGreaterThan(before)
      })
    })

    test('offline: the ways on that need a connection go, the homepage link stays, the card says it is waiting, and reconnecting brings them back without moving focus', async ({ browser }) => {
      await withPage(browser, variant, async (page, context) => {
        const { card } = await landLoadFailed(page, variant)
        await setConnection(page, context, false)

        await expect(card.locator('.ed-body')).toHaveText(BODY_OFFLINE_LOAD)
        await expect(card.getByRole('status')).toHaveText('Waiting for a connection')
        await expect(reloadButton(card), 'a reload offline would swap the page for the browser error').toHaveCount(0)
        await expect(reportLink(card)).toHaveCount(0)
        await expect(helpLink(card)).toHaveCount(0)
        await expect(homeLink(card), 'the homepage is in the loaded app, so it works offline').toBeVisible()
        await expect(card.getByRole('heading', { level: 1 }), 'focus moved when the connection dropped').toBeFocused()
        await expectFits(page, `offline card at ${variant.id}`)

        // Offline text is still text: the body and the status read at 4.5:1 or better.
        expect(await contrastOf(card.locator('.ed-body'))).toBeGreaterThanOrEqual(4.5)
        expect(await contrastOf(card.getByRole('status')), 'the waiting line is under 4.5:1').toBeGreaterThanOrEqual(4.5)

        await setConnection(page, context, true)
        await expect(reloadButton(card)).toBeEnabled()
        await expect(reportLink(card)).toBeVisible()
        await expect(homeLink(card)).toBeVisible()
        const status = card.getByRole('status')
        await expect(status).toHaveText('Back online')
        expect(await contrastOf(status), 'the back-online line is under 4.5:1').toBeGreaterThanOrEqual(4.5)
        await expect(card.locator('.ed-body')).toHaveText(BODY_LOAD)
        await expect(card.getByRole('heading', { level: 1 }), 'focus moved when the connection came back').toBeFocused()
        await expectFits(page, `back-online card at ${variant.id}`)
        // The back-online line is a moment, not a permanent label.
        await expect(card.locator('.ed-status')).toHaveText('', { timeout: 8000 })
      })
    })

    test('a crash card offline says reload in its own words and holds the same ways back, keeping the homepage link', async ({ browser }) => {
      await withPage(browser, variant, async (page, context) => {
        const { card } = await landShellCrash(page, variant)
        await setConnection(page, context, false)
        await expect(card.locator('.ed-body')).toHaveText(BODY_OFFLINE_CRASH)
        await expect(card.getByRole('status')).toHaveText('Waiting for a connection')
        await expect(reloadButton(card)).toHaveCount(0)
        await expect(reportLink(card)).toHaveCount(0)
        await expect(homeLink(card)).toBeVisible()
        await setConnection(page, context, true)
        await expect(reloadButton(card)).toBeEnabled()
        await expect(card.locator('.ed-body')).toHaveText(BODY_CRASH)
      })
    })

    test('every line reads at 4.5:1 or better, the actions included', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landLoadFailed(page, variant)
        await expectLinesReadable(card, variant)
      })
    })
  })
}

// ─────────────────────────────── the slow load ───────────────────────────────

for (const variant of VARIANTS) {
  test(`a page that is slow to arrive says so after about eight seconds, at full contrast, with Try again (${variant.id})`, async ({ browser }) => {
    test.setTimeout(60000)
    await withPage(browser, variant, async (page) => {
      // The file is asked for and never answered.
      let asked = 0
      await page.route(CREDITS_CHUNK, () => { asked += 1 })
      const documents = []
      page.on('request', (r) => { if (r.resourceType() === 'document') documents.push(r.url()) })

      await goRaw(page, '/credits')
      await expectTheme(page, variant)
      const loading = page.locator('.page-loading')
      await expect(loading).toBeVisible()
      const startedAt = Date.now()
      const slow = loading.locator('.page-loading-slow')
      await expect(slow, 'the status region is in the document from the start, so it can be announced').toHaveAttribute('role', 'status')
      await expect(slow, 'the slow line was there at once').toHaveText('')
      await expectFits(page, `loading at ${variant.id}`)

      await expect(slow).toContainText(SLOW_LINE, { timeout: 15000 })
      const waited = Date.now() - startedAt
      expect(waited, `the slow line came after ${waited}ms, before eight seconds`).toBeGreaterThanOrEqual(7000)
      expect(asked, 'the file was never asked for').toBeGreaterThan(0)

      const again = slow.getByRole('button', { name: 'Try again' })
      await expect(again).toBeVisible()

      // Only the spinner is dimmed. The words and the button are not.
      expect(await effectiveOpacity(slow.locator('p')), 'the slow line is dimmed along with the spinner').toBe(1)
      expect(await effectiveOpacity(again), 'Try again is dimmed along with the spinner').toBe(1)
      expect(Number(await loading.locator('.fg-loader').evaluate((el) => getComputedStyle(el).opacity)),
        'the spinner is no longer dimmed').toBeLessThan(1)
      expect(await contrastOf(slow.locator('p')), 'the slow line is under 4.5:1').toBeGreaterThanOrEqual(4.5)
      expect(await contrastOf(again), 'Try again is under 4.5:1').toBeGreaterThanOrEqual(4.5)

      // The line does not push the spinner, and the button is big enough to hit.
      const box = await again.boundingBox()
      expect(box.height).toBeGreaterThanOrEqual(43.99)
      const inside = await again.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return r.left >= 0 && r.right <= window.innerWidth
      })
      expect(inside, 'Try again sticks out of the screen').toBe(true)
      await expectFits(page, `slow loading at ${variant.id}`)

      // Try again asks for the document again.
      const before = documents.length
      await again.click({ noWaitAfter: true })
      await expect.poll(() => documents.length, { message: 'Try again did not reload the page' }).toBeGreaterThan(before)
    })
  })
}

// ───────────────────────────────── the 404 ─────────────────────────────────
// The referrer has to be an address on the origin under test, whatever port the preview runs on, so it
// is built from the config's baseURL; a fixed port would name another origin and read as another site.

for (const variant of VARIANTS) {
  test.describe(`the 404, ${variant.id}`, () => {
    test('arriving from a link lands on the heading', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        await go(page, '/privacy')
        await expectTheme(page, variant)
        await pushInApp(page, '/nope-xyz')
        const h1 = page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })
        await expect(h1).toBeVisible()
        await expect(h1, 'focus stayed on a link that is no longer on screen').toBeFocused()
      })
    })

    test('a fresh load keeps the browser\'s own focus, and the report link names the path and the linking page', async ({ browser, baseURL }) => {
      await withPage(browser, variant, async (page) => {
        await goRaw(page, '/nope-xyz', { referer: `${baseURL}/plans?utm=ignored#top` })
        await expectTheme(page, variant)
        const h1 = page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })
        await expect(h1).toBeVisible()
        await expect(h1, 'the heading took focus on a fresh load').not.toBeFocused()
        const report = page.getByRole('link', { name: 'Report a broken link' })
        // Path and page only: no query string, no hash, no other site.
        await expect(report).toHaveAttribute('href', '/feedback?type=bug&page=%2Fnope-xyz&referrer=%2Fplans')
      })
    })

    test('a link from another site is not offered as the page that linked here', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        await goRaw(page, '/nope-xyz', { referer: 'https://elsewhere.example/links?x=1' })
        await expect(page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Report a broken link' }))
          .toHaveAttribute('href', '/feedback?type=bug&page=%2Fnope-xyz')
      })
    })

    test('after in-app navigation the report does not blame the page the visit started from', async ({ browser, baseURL }) => {
      await withPage(browser, variant, async (page) => {
        // Started from /plans (a full load with that referrer), then walked on.
        await goRaw(page, '/privacy', { referer: `${baseURL}/plans` })
        await expectRendered(page, '/privacy')
        await pushInApp(page, '/nope-xyz')
        await expect(page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Report a broken link' }))
          .toHaveAttribute('href', '/feedback?type=bug&page=%2Fnope-xyz')
      })
    })

    test('Report a broken link opens the form as a bug report with the path filled in', async ({ browser, baseURL }) => {
      await withPage(browser, variant, async (page) => {
        await goRaw(page, '/nope-xyz', { referer: `${baseURL}/plans` })
        await page.getByRole('link', { name: 'Report a broken link' }).click()
        const form = page.locator('.fb-page')
        await expect(form).toBeVisible()
        await expect(form.locator('[role="radio"][aria-checked="true"]')).toHaveText('Bug report')
        await expect(form.locator('#fb-subject')).toHaveValue('Broken link: /nope-xyz')
        await expect(form.locator('#fb-message')).toHaveValue('The link to /nope-xyz on /plans doesn\'t work.')
      })
    })
  })
}

// ───────────────── the feedback form reads only same-site context ─────────────────

test.describe('the feedback form takes a broken-link report from the address only if it is this site', () => {
  const form = (page) => page.locator('.fb-page')
  const checked = (page) => form(page).locator('[role="radio"][aria-checked="true"]')

  test('a same-site page and referrer fill the subject and the message', async ({ page }) => {
    await go(page, '/feedback?type=bug&page=%2Fnope-xyz%3Fa%3D1&referrer=%2Flearn%2Fhelp')
    await expect(checked(page)).toHaveText('Bug report')
    await expect(form(page).locator('#fb-subject')).toHaveValue('Broken link: /nope-xyz?a=1')
    await expect(form(page).locator('#fb-message')).toHaveValue('The link to /nope-xyz?a=1 on /learn/help doesn\'t work.')
  })

  test('a page alone gives the shorter sentence', async ({ page }) => {
    await go(page, '/feedback?type=bug&page=%2Fnope-xyz')
    await expect(form(page).locator('#fb-message')).toHaveValue('The link to /nope-xyz doesn\'t work.')
  })

  for (const [label, query] of [
    ['an absolute address on another site', 'page=https%3A%2F%2Fevil.example%2Fx'],
    ['a protocol-relative address', 'page=%2F%2Fevil.example%2Fx'],
    ['a javascript address', 'page=javascript%3Aalert(1)'],
    ['a path with a space in it', 'page=%2Fa%20b'],
    ['a path over 200 characters', `page=%2F${'a'.repeat(210)}`],
  ]) {
    test(`${label} as the page is ignored entirely`, async ({ page }) => {
      await go(page, `/feedback?type=bug&${query}`)
      await expect(form(page).locator('#fb-subject')).toHaveValue('')
      await expect(form(page).locator('#fb-message')).toHaveValue('')
      // The type is still honoured: it names no address.
      await expect(checked(page)).toHaveText('Bug report')
    })
  }

  for (const [label, referrer] of [
    ['an absolute address on another site', 'https%3A%2F%2Fevil.example%2Fa'],
    ['a protocol-relative address', '%2F%2Fevil.example%2Fa'],
    ['a javascript address', 'javascript%3Aalert(1)'],
  ]) {
    test(`${label} as the referrer is ignored, and the page is kept`, async ({ page }) => {
      await go(page, `/feedback?type=bug&page=%2Fnope-xyz&referrer=${referrer}`)
      await expect(form(page).locator('#fb-subject')).toHaveValue('Broken link: /nope-xyz')
      const message = await form(page).locator('#fb-message').inputValue()
      expect(message).toBe('The link to /nope-xyz doesn\'t work.')
      expect(message).not.toContain('evil')
    })
  }

  test('a referrer with no page is ignored', async ({ page }) => {
    await go(page, '/feedback?type=bug&referrer=%2Flearn')
    await expect(form(page).locator('#fb-subject')).toHaveValue('')
    await expect(form(page).locator('#fb-message')).toHaveValue('')
  })

  test('an unknown type falls back to the default', async ({ page }) => {
    await go(page, '/feedback?type=sneaky')
    await expect(checked(page)).toHaveText('Feature request')
  })

  test('a payment reason still gives "Get help", its own subject, and ignores a broken-link page', async ({ page }) => {
    await go(page, '/feedback?reason=payment_failed&type=bug&page=%2Fnope-xyz')
    await expect(page.getByRole('heading', { level: 1, name: 'Get help' })).toBeVisible()
    await expect(checked(page)).toHaveText('Help request')
    await expect(form(page).locator('#fb-subject')).toHaveValue('Payment failed')
    await expect(form(page).locator('#fb-message')).toHaveValue('')
  })
})

// ───────────────────────────────── 320 wide ─────────────────────────────────

test.describe('at 320 wide, on a phone', () => {
  const narrow = { id: '320 touch, light', viewport: { width: 320, height: 640 }, touch: true, scheme: 'light' }

  test('the crash card fits and its targets are 44px', async ({ browser }) => {
    await withPage(browser, narrow, async (page) => {
      const { card } = await landShellCrash(page, narrow)
      await expectFits(page, 'crash card at 320')
      await expectTargets(card, 'crash card at 320')
    })
  })

  test('the load-failed card fits, offline too, and its targets are 44px', async ({ browser }) => {
    await withPage(browser, narrow, async (page, context) => {
      const { card } = await landLoadFailed(page, narrow)
      await expectFits(page, 'load-failed card at 320')
      await expectTargets(card, 'load-failed card at 320')
      await setConnection(page, context, false)
      await expect(card.getByRole('status')).toHaveText('Waiting for a connection')
      await expectFits(page, 'offline card at 320')
      await setConnection(page, context, true)
      await expect(card.getByRole('status')).toHaveText('Back online')
      await expectFits(page, 'back-online card at 320')
    })
  })

  test('the chromeless crash card fits', async ({ browser }) => {
    await withPage(browser, narrow, async (page) => {
      await landChromelessCrash(page, narrow)
      await expectFits(page, 'outer crash card at 320')
    })
  })

  test('the slow-loading line fits and its button is 44px', async ({ browser }) => {
    test.setTimeout(60000)
    await withPage(browser, narrow, async (page) => {
      await page.route(CREDITS_CHUNK, () => {})
      await goRaw(page, '/credits')
      const slow = page.locator('.page-loading-slow')
      await expect(slow).toContainText(SLOW_LINE, { timeout: 15000 })
      await expectFits(page, 'slow loading at 320')
      const box = await slow.getByRole('button', { name: 'Try again' }).boundingBox()
      expect(box.height).toBeGreaterThanOrEqual(43.99)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(320)
    })
  })

  test('the 404 fits', async ({ browser }) => {
    await withPage(browser, narrow, async (page) => {
      await goRaw(page, '/a-long-path-that-does-not-exist/and-keeps-going/past-any-reasonable-width')
      await expect(page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })).toBeVisible()
      await expectFits(page, '404 at 320')
    })
  })
})

// ──────────────────────────── what the styles say ────────────────────────────

test.describe('the error and loading styles', () => {
  // Read from source on purpose: this is the one claim a screenshot cannot make
  // (no property is animated by `all`), and it pins the rules, not the pixels.
  const css = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')
  const rules = []
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim()
    if (/\.error-boundary|\.page-loading/.test(selector)) rules.push({ selector, body: m[2] })
  }

  test('the rules were found, so the checks below read something', () => {
    expect(rules.length, 'no .error-boundary / .page-loading rule found in global.css').toBeGreaterThanOrEqual(8)
    expect(rules.some((r) => r.selector.includes('.error-boundary-card'))).toBe(true)
    expect(rules.some((r) => r.selector.includes('.page-loading-slow'))).toBe(true)
  })

  test('no error or loading rule says transition: all', () => {
    const bad = rules.filter((r) => /transition\s*:[^;]*\ball\b/.test(r.body)).map((r) => r.selector)
    expect(bad).toEqual([])
  })

  test('no error or loading rule hard-codes a colour', () => {
    const bad = rules.filter((r) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i.test(r.body)).map((r) => r.selector)
    expect(bad).toEqual([])
  })
})
