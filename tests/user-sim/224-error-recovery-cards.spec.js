// THE WAY OUT OF AN ERROR: the crash card, the load-failed card, the slow-load
// line and the 404.
//
// What a person needs when a page fails is the same each time: to be told what
// happened in plain words, to land on that message (a keyboard or screen reader
// user is otherwise left on <body>), and to have three ways on: try again, go
// to the home page, and tell us. Offline, "try again" would replace the page
// with the browser's own error, so it waits and says why.
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

const PROBE = 'probe crash for the error cards'
const CREDITS_CHUNK = '**/assets/Credits-*.js'
const SETTINGS_CHUNK = '**/assets/Settings-*.js'
const PALETTE_CHUNK = '**/assets/PaletteBuilder-*.js'
const COMMAND_PALETTE_CHUNK = '**/assets/CommandPalette-*.js'
const TITLE_CRASH = 'This page stopped working'
const TITLE_LOAD = 'This page didn’t load'
// Straight or curly: the card writes the title with a typographic apostrophe
// and the lead with a plain one, and a person reads no difference.
const LEAD_ONLINE = /Part of this page couldn['’]t be downloaded\. Trying again usually fixes it\./
const LEAD_OFFLINE = /You['’]re offline, so this page couldn['’]t be downloaded\. You can try again once you reconnect\./
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

/** The router's own history object, found on the React tree, pushed to. */
function pushInApp(page, to) {
  return page.evaluate((target) => {
    const root = document.getElementById('root')
    const key = Object.keys(root).find((k) => k.startsWith('__reactContainer'))
    const stack = [root[key]]
    const seen = new Set()
    let navigator = null
    while (stack.length && !navigator) {
      const node = stack.pop()
      if (!node || seen.has(node)) continue
      seen.add(node)
      const value = node.memoizedProps && node.memoizedProps.value
      if (value && value.navigator && typeof value.navigator.push === 'function') navigator = value.navigator
      stack.push(node.child, node.sibling)
    }
    if (!navigator) throw new Error('the router history was not found on the React tree')
    navigator.push(target)
  }, to)
}

/** The state right after the one automatic reload: a second failure must not reload again. */
function spendReload(page) {
  return page.evaluate(() => sessionStorage.setItem('vs-chunk-reload', String(Date.now())))
}

/** Serve `glob` as a module that throws; the count is how often it was asked for. */
async function crashChunk(page, glob) {
  const asked = { count: 0 }
  await page.route(glob, (route) => {
    asked.count += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `throw new Error(${JSON.stringify(PROBE)})`,
    })
  })
  return asked
}

/** Fail `glob`; the count is how often it was asked for. */
async function failChunk(page, glob) {
  const asked = { count: 0 }
  await page.route(glob, (route) => { asked.count += 1; return route.abort() })
  return asked
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
async function landHomeCrash(page, variant) {
  await crashChunk(page, COMMAND_PALETTE_CHUNK)
  await go(page, '/')
  await expectTheme(page, variant)
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

/** Pin the connection state the way the app reads it, and take the context offline to match. */
async function setConnection(page, context, online) {
  await context.setOffline(!online)
  await page.evaluate((on) => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => on })
    window.dispatchEvent(new Event(on ? 'online' : 'offline'))
  }, online)
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

/** The three actions are big enough to hit. 44 everywhere for the two buttons; Report is 44 on touch. */
async function expectTargets(card, touch, what) {
  const sizes = await card.evaluate((root) => {
    const box = (sel) => {
      const r = root.querySelector(sel)?.getBoundingClientRect()
      return r ? { w: r.width, h: r.height } : null
    }
    return {
      again: box('.error-boundary-actions button'),
      home: box('.error-boundary-actions a'),
      report: box('.error-boundary-report'),
    }
  })
  for (const [name, size] of Object.entries(sizes)) {
    expect(size, `${what}: ${name} is not in the card`).not.toBeNull()
    const floor = name === 'report' && !touch ? 24 : 44
    expect(size.h, `${what}: ${name} is ${size.h}px high, under ${floor}`).toBeGreaterThanOrEqual(floor - 0.01)
    expect(size.w, `${what}: ${name} is ${size.w}px wide, under 44`).toBeGreaterThanOrEqual(43.99)
  }
}

// ───────────────────────────── the crash card ─────────────────────────────

for (const variant of VARIANTS) {
  test.describe(`the crash card, ${variant.id}`, () => {
    test('says what happened, takes focus, shows three ways on, and never shows the raw error', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landShellCrash(page, variant)

        const h1 = card.getByRole('heading', { level: 1 })
        await expect(h1).toBeFocused()
        await expect(page.getByRole('heading', { level: 1 }), 'the card is the one h1 on the page').toHaveCount(1)
        await expect(card).toHaveAttribute('role', 'alert')
        await expect(card.locator('.error-boundary-lead')).toHaveText(
          /Part of this page failed while it was running\. Trying again usually fixes it\. If it keeps happening, tell us and we['’]ll look into it\./,
        )

        await expect(card.getByRole('button', { name: 'Try again' })).toBeEnabled()
        await expect(card.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
        await expect(card.getByRole('button', { name: 'Report this problem' })).toBeEnabled()
        // The old labels are gone: Reload says less about what will happen.
        await expect(card.getByRole('button', { name: /^Reload$/ })).toHaveCount(0)

        const text = await card.innerText()
        expect(text, 'the raw error message is shown to the person').not.toContain(PROBE)
        expect(text, 'a stack or error class is shown').not.toMatch(/\bError:|\bat\s+\S+\s+\(|\.js:\d+/)

        // Tab walks the three actions in reading order, starting from the heading.
        await page.keyboard.press('Tab')
        await expect(card.getByRole('button', { name: 'Try again' })).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(card.getByRole('link', { name: 'Go to the home page' })).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(card.getByRole('button', { name: 'Report this problem' })).toBeFocused()
      })
    })

    test('Try again asks for the page again, and a crash that persists lands on the heading again', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card, asked } = await landShellCrash(page, variant)
        expect(asked.count).toBe(1)
        const reloaded = page.waitForEvent('domcontentloaded')
        await card.getByRole('button', { name: 'Try again' }).click({ noWaitAfter: true })
        await reloaded
        await expect.poll(() => asked.count, { message: 'Try again did not request the chunk again' }).toBe(2)
        const again = page.locator('.error-boundary')
        await expect(again.getByRole('heading', { level: 1, name: TITLE_CRASH })).toBeFocused()
      })
    })

    test('Go to the home page leaves the crashed page and shows the sales page', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landShellCrash(page, variant)
        await card.getByRole('link', { name: 'Go to the home page' }).click()
        await expect(page).toHaveURL(/\/$/)
        await expect(page.locator('.error-boundary')).toHaveCount(0)
        await expectRendered(page, '/')
      })
    })

    test('Go to the home page, when the crash is on the home page itself, loads the document afresh', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landHomeCrash(page, variant)
        // A client-side link to the page you are on changes nothing, so the
        // crash would stay. A marker on window proves the document was replaced.
        await page.evaluate(() => { window.__sameDocument = true })
        const reloaded = page.waitForEvent('domcontentloaded')
        await card.getByRole('link', { name: 'Go to the home page' }).click()
        await reloaded
        expect(await page.evaluate(() => window.__sameDocument), 'the home page link only navigated inside the old document').toBeUndefined()
        await expect(page).toHaveURL(/\/$/)
        await expectRendered(page, '/')
        await expect(page.locator('.error-boundary')).toHaveCount(0)
      })
    })

    test('Report this problem opens the feedback form already filled in with where it happened', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landShellCrash(page, variant)
        await card.getByRole('button', { name: 'Report this problem' }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await expect(dialog.locator('#fb-subject')).toHaveValue(new RegExp(`^Crash on /settings: .*${PROBE}`))
        await expect(dialog.locator('#fb-message')).toHaveValue(/Route: \/settings\n/)
        await expect(dialog.locator('#fb-message')).toHaveValue(/What were you doing when this happened\?/)
        await expect(dialog.getByRole('button', { name: 'Bug', exact: true })).toHaveAttribute('aria-pressed', 'true')
        // The card behind the dialog still shows no raw error.
        expect(await card.innerText()).not.toContain(PROBE)
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
        const home = card.getByRole('link', { name: 'Go to the home page' })
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
        await expectTargets(card, variant.touch, `crash card at ${variant.id}`)
        const lines = {
          heading: card.getByRole('heading', { level: 1 }),
          lead: card.locator('.error-boundary-lead'),
          'Try again': card.getByRole('button', { name: 'Try again' }),
          'Go to the home page': card.getByRole('link', { name: 'Go to the home page' }),
          'Report this problem': card.getByRole('button', { name: 'Report this problem' }),
        }
        for (const [name, locator] of Object.entries(lines)) {
          const ratio = await contrastOf(locator)
          expect(ratio, `${name} is ${ratio}:1 in the ${variant.scheme} theme, under 4.5`).toBeGreaterThanOrEqual(4.5)
        }
      })
    })
  })
}

// ──────────────────────────── the load-failed card ────────────────────────────

for (const variant of VARIANTS) {
  test.describe(`the load-failed card, ${variant.id}`, () => {
    test('says the page did not load, takes focus, and shows the same three ways on', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landLoadFailed(page, variant)
        await expect(card.getByRole('heading', { level: 1 })).toBeFocused()
        await expect(card.locator('.error-boundary-lead')).toHaveText(LEAD_ONLINE)
        await expect(card.getByRole('button', { name: 'Try again' })).toBeEnabled()
        await expect(card.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
        await expect(card.getByRole('button', { name: 'Report this problem' })).toBeEnabled()
        await expect(card.locator('.error-boundary-status'), 'the status line is empty until there is something to say').toHaveText('')
        await expectFits(page, `load-failed card at ${variant.id}`)
        await expectTargets(card, variant.touch, `load-failed card at ${variant.id}`)
      })
    })

    test('Try again requests the failed file a second time', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card, asked } = await landLoadFailed(page, variant)
        expect(asked.count).toBe(1)
        const reloaded = page.waitForEvent('domcontentloaded')
        await card.getByRole('button', { name: 'Try again' }).click({ noWaitAfter: true })
        await reloaded
        await expect.poll(() => asked.count, { message: 'Try again did not request the file again' }).toBe(2)
      })
    })

    test('offline: Try again waits and says why, the other two stay, and reconnecting frees it without moving focus', async ({ browser }) => {
      await withPage(browser, variant, async (page, context) => {
        const { card } = await landLoadFailed(page, variant)
        await setConnection(page, context, false)

        const again = card.getByRole('button', { name: 'Try again' })
        await expect(card.locator('.error-boundary-lead')).toHaveText(LEAD_OFFLINE)
        await expect(again).toBeDisabled()
        await expect(again, 'the disabled button must point at the sentence that explains it')
          .toHaveAccessibleDescription(LEAD_OFFLINE)
        await expect(card.getByRole('link', { name: 'Go to the home page' })).toBeEnabled()
        await expect(card.getByRole('button', { name: 'Report this problem' })).toBeEnabled()
        await expectFits(page, `offline card at ${variant.id}`)

        // Offline text is still text: the lead reads at 4.5:1 or better.
        expect(await contrastOf(card.locator('.error-boundary-lead'))).toBeGreaterThanOrEqual(4.5)

        await setConnection(page, context, true)
        await expect(again).toBeEnabled()
        const status = card.getByRole('status')
        await expect(status).toHaveText('You’re back online.')
        expect(await contrastOf(status), 'the back-online line is under 4.5:1').toBeGreaterThanOrEqual(4.5)
        await expect(card.locator('.error-boundary-lead')).toHaveText(LEAD_ONLINE)
        await expect(card.getByRole('heading', { level: 1 }), 'focus moved when the connection came back').toBeFocused()
        await expectFits(page, `back-online card at ${variant.id}`)
        // The button is no longer description-linked to the offline sentence's reason.
        await expect(again).not.toHaveAttribute('aria-describedby', /.+/)
      })
    })

    test('offline, Go to the home page still reaches the sales page', async ({ browser }) => {
      await withPage(browser, variant, async (page, context) => {
        const { card } = await landLoadFailed(page, variant)
        await setConnection(page, context, false)
        await expect(card.getByRole('button', { name: 'Try again' })).toBeDisabled()
        await card.getByRole('link', { name: 'Go to the home page' }).click()
        await expect(page).toHaveURL(/\/$/)
        await expect(page.locator('.error-boundary')).toHaveCount(0)
        await expectRendered(page, '/')
        await setConnection(page, context, true)
      })
    })

    test('every line reads at 4.5:1 or better, the enabled buttons included', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        const { card } = await landLoadFailed(page, variant)
        const lines = {
          heading: card.getByRole('heading', { level: 1 }),
          lead: card.locator('.error-boundary-lead'),
          'Try again': card.getByRole('button', { name: 'Try again' }),
          'Go to the home page': card.getByRole('link', { name: 'Go to the home page' }),
          'Report this problem': card.getByRole('button', { name: 'Report this problem' }),
        }
        for (const [name, locator] of Object.entries(lines)) {
          const ratio = await contrastOf(locator)
          expect(ratio, `${name} is ${ratio}:1 in the ${variant.scheme} theme, under 4.5`).toBeGreaterThanOrEqual(4.5)
        }
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

const BASE = () => `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || 4174}`

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

    test('a fresh load keeps the browser\'s own focus, and the report link names the path and the linking page', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        await goRaw(page, '/nope-xyz', { referer: `${BASE()}/plans?utm=ignored#top` })
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

    test('after in-app navigation the report does not blame the page the visit started from', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        // Started from /plans (a full load with that referrer), then walked on.
        await goRaw(page, '/privacy', { referer: `${BASE()}/plans` })
        await expectRendered(page, '/privacy')
        await pushInApp(page, '/nope-xyz')
        await expect(page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Report a broken link' }))
          .toHaveAttribute('href', '/feedback?type=bug&page=%2Fnope-xyz')
      })
    })

    test('Report a broken link opens the form as a bug report with the path filled in', async ({ browser }) => {
      await withPage(browser, variant, async (page) => {
        await goRaw(page, '/nope-xyz', { referer: `${BASE()}/plans` })
        await page.getByRole('link', { name: 'Report a broken link' }).click()
        const form = page.locator('.fb-page')
        await expect(form).toBeVisible()
        await expect(form.locator('[role="radio"][aria-checked="true"]')).toHaveText('Bug Report')
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
    await expect(checked(page)).toHaveText('Bug Report')
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
      await expect(checked(page)).toHaveText('Bug Report')
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
    await expect(checked(page)).toHaveText('Feature Request')
  })

  test('a payment reason still gives "Get help", its own subject, and ignores a broken-link page', async ({ page }) => {
    await go(page, '/feedback?reason=payment_failed&type=bug&page=%2Fnope-xyz')
    await expect(page.getByRole('heading', { level: 1, name: 'Get help' })).toBeVisible()
    await expect(checked(page)).toHaveText('Help Request')
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
      await expectTargets(card, true, 'crash card at 320')
    })
  })

  test('the load-failed card fits, offline too, and its targets are 44px', async ({ browser }) => {
    await withPage(browser, narrow, async (page, context) => {
      const { card } = await landLoadFailed(page, narrow)
      await expectFits(page, 'load-failed card at 320')
      await expectTargets(card, true, 'load-failed card at 320')
      await setConnection(page, context, false)
      await expect(card.getByRole('button', { name: 'Try again' })).toBeDisabled()
      await expectFits(page, 'offline card at 320')
      await setConnection(page, context, true)
      await expect(card.getByRole('status')).toHaveText('You’re back online.')
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
    expect(rules.length, 'no .error-boundary / .page-loading rule found in global.css').toBeGreaterThan(8)
    expect(rules.some((r) => r.selector.includes('.error-boundary-report'))).toBe(true)
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
