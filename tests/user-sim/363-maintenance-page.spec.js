// THE MAINTENANCE PAGE: what a visitor sees while UIL4B is switched to
// maintenance, and the one thing they can do about it.
//
// The page replaces every route inside the full shell (nav and footer stay),
// says nothing about time or about anyone's work, keeps itself out of search
// results, and offers "Check again": a GET of the site's own root whose entry
// script is compared with this page's. A different entry script is a new deploy:
// the horizon turns to colour, the page says UIL4B is reachable again and
// reloads into it. The same script (the maintenance build still being served), a
// non-OK answer or no answer at all says it is still unavailable and leaves the
// button for another try. While the check runs the button is disabled and busy.
//
// The switch is the sessionStorage seam `uil4b-maintenance` = `on`, honoured in
// test and dev builds only, and nothing but `on` turns it on. The init script
// sets it on a fresh load and clears it on a reload, which is what a reload into
// a new deploy without the flag looks like. The root is answered by a route
// stub: the suite never depends on the real site being up or down.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In Maintenance.jsx return true from newDeployLive() whatever the entry
// scripts are: the "same build" test fails. Make it return false: the reload
// test fails. Drop `disabled` / `aria-busy` from the button, or the useNoindex()
// call: the in-flight and noindex tests fail. In config/maintenance.js accept
// any stored value, not just `on`: the "only on" test fails; return false from
// maintenanceOn(): every test fails at the first heading.
import { test, expect } from './base.js'
import { goRaw, watch } from './helpers.js'

const KEY = 'uil4b-maintenance'
const TITLE = 'UIL4B is unavailable'
const NEW_ENTRY = '/assets/index-redeployed.js'

/**
 * Put the tab in maintenance on a fresh load (and out of it on a reload), and
 * answer the page's own fetch of the root as `mode`:
 *   new     the real page with a different entry script: a new deploy
 *   same    the real page unchanged: the maintenance build still being served
 *   down    503
 *   abort   no answer at all
 */
async function setUp(page, { mode = 'down', hold = null } = {}) {
  await page.addInitScript((key) => {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav && nav.type === 'reload') window.sessionStorage.removeItem(key)
    else if (!window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, 'on')
  }, KEY)
  const asked = { count: 0, headers: null, mode }
  await page.route((url) => url.pathname === '/', async (route) => {
    const request = route.request()
    if (request.method() !== 'GET' || request.resourceType() !== 'fetch') return route.fallback()
    asked.count += 1
    asked.headers = request.headers()
    if (hold) await hold.promise
    if (asked.mode === 'abort') return route.abort()
    if (asked.mode === 'down') return route.fulfill({ status: 503, contentType: 'text/html', body: '<h1>Down</h1>' })
    const real = await route.fetch()
    if (asked.mode === 'same') return route.fulfill({ response: real })
    const html = (await real.text()).replace(/(<script[^>]*type="module"[^>]*src=")[^"]+(")/, `$1${NEW_ENTRY}$2`)
    return route.fulfill({ response: real, body: html })
  })
  return asked
}

/** A gate the test opens when it wants the held request answered. */
function gate() {
  let open
  const promise = new Promise((resolve) => { open = resolve })
  return { promise, open }
}

const heading = (page) => page.getByRole('heading', { level: 1, name: TITLE })
const status = (page) => page.getByRole('status')
const checkAgain = (page) => page.getByRole('button', { name: 'Check again' })
const storedSwitch = (page) => page.evaluate((key) => sessionStorage.getItem(key), KEY)

for (const [label, size] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
  test.describe(`the maintenance page at ${label}`, () => {
    test.use({ viewport: size })

    test('lands on the heading, reads plainly, keeps the nav and footer, and sets its own title', async ({ page }) => {
      watch(page, 'a visitor arriving while UIL4B is in maintenance')
      await setUp(page)
      await goRaw(page, '/plans')

      await expect(heading(page)).toBeVisible()
      await expect(heading(page), 'a screen reader should start at the problem').toBeFocused()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page).toHaveTitle('UI L4B | Unavailable')
      await expect(page.getByText('Nothing needs doing on your side.')).toBeVisible()
      await expect(checkAgain(page)).toBeEnabled()
      await expect(checkAgain(page)).not.toHaveAttribute('aria-busy', /.*/)
      await expect(page, 'the visitor stays on the address they asked for').toHaveURL(/\/plans$/)
      await expect(page.locator('.ed-ground.ed-drain'), 'the horizon is grey while the site is down').toHaveCount(1)
      await expect(page.locator('.ed-status'), 'the status line is empty until a check has run').toHaveText('')
      await expect(page.locator('.ed-status'), 'the live region is in the page before it has anything to say').toHaveAttribute('role', 'status')

      // Not a replacement for the whole page: the shell is still there.
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('contentinfo')).toBeVisible()

      // Nothing on the page promises a time or speaks for anyone's work.
      const text = await page.getByRole('main').innerText()
      expect(text).not.toMatch(/\b(minutes?|hours?|soon|back by|lost|deleted)\b/i)
    })

    test('keeps itself out of search results', async ({ page }) => {
      watch(page, 'a crawler arriving while UIL4B is in maintenance')
      await setUp(page)
      await goRaw(page, '/plans')
      await expect(heading(page)).toBeVisible()
      await expect(page.locator('meta[name="robots"]'), 'exactly one robots tag, and it says noindex').toHaveCount(1)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    })

    test('while the check runs the button is disabled and busy, and both clear when it ends', async ({ page }) => {
      watch(page, 'a visitor waiting on a check')
      const held = gate()
      const asked = await setUp(page, { mode: 'down', hold: held })
      await goRaw(page, '/')
      await expect(heading(page)).toBeVisible()

      await checkAgain(page).click()
      await expect(status(page)).toHaveText('Checking…')
      await expect(checkAgain(page), 'a second click must not start a second check').toBeDisabled()
      await expect(checkAgain(page)).toHaveAttribute('aria-busy', 'true')
      expect(asked.count).toBe(1)

      held.open()
      await expect(status(page)).toHaveText('Still unavailable')
      await expect(checkAgain(page)).toBeEnabled()
      await expect(checkAgain(page)).not.toHaveAttribute('aria-busy', /.*/)
    })

    test('Check again asks for the page afresh, and a 503 says it is still unavailable and can be tried again', async ({ page }) => {
      watch(page, 'a visitor checking whether UIL4B is back')
      const held = gate()
      const asked = await setUp(page, { mode: 'down', hold: held })
      await goRaw(page, '/')
      await expect(heading(page)).toBeVisible()

      await checkAgain(page).click()
      await expect(status(page), 'the check is in flight and the page should say so').toHaveText('Checking…')
      held.open()
      await expect(status(page)).toHaveText('Still unavailable')
      expect(asked.count).toBe(1)
      await expect(heading(page), 'a failed check must not leave maintenance').toBeVisible()
      await expect(page.locator('.ed-ground.ed-drain')).toHaveCount(1)

      await checkAgain(page).click()
      await expect.poll(() => asked.count, { message: 'the second Check again did not ask the site again' }).toBe(2)
      await expect(status(page)).toHaveText('Still unavailable')
    })

    test('Check again with no answer at all says it is still unavailable', async ({ page }) => {
      watch(page, 'a visitor checking while their connection drops')
      const asked = await setUp(page, { mode: 'abort' })
      await goRaw(page, '/')
      await expect(heading(page)).toBeVisible()

      await checkAgain(page).click()
      await expect(status(page)).toHaveText('Still unavailable')
      expect(asked.count).toBe(1)
      await expect(heading(page)).toBeVisible()
    })

    test('Check again that is answered with the same build says it is still unavailable, however fast', async ({ page }) => {
      watch(page, 'a visitor checking while the maintenance build is still served')
      const asked = await setUp(page, { mode: 'same' })
      await goRaw(page, '/plans')
      await expect(heading(page)).toBeVisible()

      await checkAgain(page).click()
      await expect(status(page), 'a 200 for the same entry script is not a new deploy').toHaveText('Still unavailable')
      expect(asked.count).toBe(1)
      await expect(page.locator('.ed-ground.ed-drain'), 'the horizon stays grey').toHaveCount(1)
      await expect(heading(page)).toBeVisible()
      expect(await storedSwitch(page), 'a check leaves no per-tab override behind').toBe('on')

      // Past the reload delay: nothing is on its way.
      await page.waitForTimeout(2000)
      await expect(heading(page)).toBeVisible()
    })

    test('Check again that finds a new deploy says so, then reloads into it', async ({ page }) => {
      watch(page, 'a visitor checking whether UIL4B is back')
      const asked = await setUp(page, { mode: 'new' })
      await goRaw(page, '/plans')
      await expect(heading(page)).toBeVisible()

      const reloaded = page.waitForEvent('domcontentloaded')
      await checkAgain(page).click()
      await expect(status(page)).toHaveText('UIL4B is reachable again')
      await expect(page.locator('.ed-ground.ed-calm:not(.ed-drain)'), 'the horizon turns to colour on a new deploy').toHaveCount(1)
      expect(asked.count).toBe(1)

      await reloaded
      await expect(heading(page), 'the app should replace the maintenance page').toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(page).not.toHaveTitle('UI L4B | Unavailable')
      await expect(page.getByRole('heading', { level: 1, name: /less than 1 coffee per month/ })).toBeVisible()
    })

    test('the keyboard reaches Check again from the heading, and Enter runs the check', async ({ page }) => {
      watch(page, 'a keyboard user in maintenance')
      const held = gate()
      const asked = await setUp(page, { mode: 'down', hold: held })
      await goRaw(page, '/')
      await expect(heading(page)).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(checkAgain(page)).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(status(page)).toHaveText('Checking…')
      held.open()
      await expect(status(page)).toHaveText('Still unavailable')
      expect(asked.count).toBe(1)
      await expect(checkAgain(page)).toBeEnabled()

      // Focus is put back on the button by hand: see the test below.
      await checkAgain(page).focus()
      await page.keyboard.press('Space')
      await expect.poll(() => asked.count).toBe(2)
    })

    // Known defect, expected to fail: the button is disabled while the check
    // runs, and a disabled button drops focus to the page, so a keyboard user
    // who pressed Enter has to Tab back to try again. Remove test.fail() when
    // the button stays focusable (aria-disabled) or focus is returned to it.
    test('focus is still on Check again after a failed check, for another try', async ({ page }) => {
      test.fail()
      watch(page, 'a keyboard user retrying a check')
      await setUp(page, { mode: 'down' })
      await goRaw(page, '/')
      await expect(heading(page)).toBeFocused()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      await expect(status(page)).toHaveText('Still unavailable')
      await expect(checkAgain(page), 'focus stays on the button for another try').toBeFocused()
    })
  })
}

test.describe('the maintenance switch', () => {
  test('is off for a tab that has not set it, so the seam never shows the page by itself', async ({ page }) => {
    watch(page, 'a normal visitor')
    await goRaw(page, '/plans')
    await expect(page.getByRole('heading', { level: 1, name: /less than 1 coffee per month/ })).toBeVisible()
    await expect(heading(page)).toHaveCount(0)
  })

  for (const value of ['off', 'ON', '1', 'true']) {
    test(`only "on" turns it on: a stored "${value}" does nothing`, async ({ page }) => {
      watch(page, 'a visitor whose tab holds an old value')
      await page.addInitScript(([key, v]) => window.sessionStorage.setItem(key, v), [KEY, value])
      await goRaw(page, '/plans')
      await expect(page.getByRole('heading', { level: 1, name: /less than 1 coffee per month/ })).toBeVisible()
      await expect(heading(page)).toHaveCount(0)
    })
  }

  test('covers a route that is not the home page, with the same page', async ({ page }) => {
    watch(page, 'a visitor following a deep link in maintenance')
    await setUp(page)
    await goRaw(page, '/learn/help')
    await expect(heading(page)).toBeVisible()
    await expect(page).toHaveURL(/\/learn\/help$/)
  })
})
