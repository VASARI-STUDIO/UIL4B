// THE MAINTENANCE PAGE: what a visitor sees while UIL4B is switched to
// maintenance, and the one thing they can do about it.
//
// The page replaces every route inside the full shell (nav and footer stay),
// says nothing about time or about anyone's work, and offers "Check again":
// a HEAD request to the site's own root. An answer turns the horizon to colour,
// says UIL4B is reachable again, remembers that for the tab and reloads into
// the app. No answer says it is still unavailable and leaves the button for
// another try.
//
// The switch is the sessionStorage seam `uil4b-maintenance` = `on`, honoured in
// test and dev builds only. The init script sets it once per tab, so the
// reload after a successful check is not put straight back into maintenance.
// The HEAD request is answered by a route stub: the suite never depends on the
// real site being up or down.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In Maintenance.jsx change `method: 'HEAD'` to `method: 'GET'` or drop the
// `clearMaintenanceForTab()` call: the check tests and the reload test fail.
// In config/maintenance.js return false from maintenanceOn(): every test fails
// at the first heading.
import { test, expect } from './base.js'
import { goRaw, watch } from './helpers.js'

const KEY = 'uil4b-maintenance'
const TITLE = 'UIL4B is unavailable'

/** Put the tab in maintenance once, and answer the site's own HEAD check as `status`. */
async function setUp(page, { status = 503, hold = null } = {}) {
  await page.addInitScript((key) => {
    if (!window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, 'on')
  }, KEY)
  const heads = { count: 0, status }
  await page.route((url) => url.pathname === '/', async (route) => {
    if (route.request().method() !== 'HEAD') return route.fallback()
    heads.count += 1
    if (hold) await hold.promise
    return route.fulfill({ status: heads.status, body: '' })
  })
  return heads
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
      await expect(page, 'the visitor stays on the address they asked for').toHaveURL(/\/plans$/)
      await expect(page.locator('.ed-ground.ed-drain'), 'the horizon is grey while the site is down').toHaveCount(1)
      await expect(page.locator('.ed-status'), 'the status line is empty until a check has run').toHaveText('')

      // Not a replacement for the whole page: the shell is still there.
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('contentinfo')).toBeVisible()

      // Nothing on the page promises a time or speaks for anyone's work.
      const text = await page.getByRole('main').innerText()
      expect(text).not.toMatch(/\b(minutes?|hours?|soon|back by|lost|deleted)\b/i)
    })

    test('Check again while the site is still down says so, and can be tried again', async ({ page }) => {
      watch(page, 'a visitor checking whether UIL4B is back')
      const held = gate()
      const heads = await setUp(page, { status: 503, hold: held })
      await goRaw(page, '/')
      await expect(heading(page)).toBeVisible()

      await checkAgain(page).click()
      await expect(status(page), 'the check is in flight and the page should say so').toHaveText('Checking')
      held.open()
      await expect(status(page)).toHaveText('Still unavailable')
      expect(heads.count).toBe(1)
      await expect(heading(page), 'a failed check must not leave maintenance').toBeVisible()
      await expect(page.locator('.ed-ground.ed-drain')).toHaveCount(1)

      await checkAgain(page).click()
      await expect.poll(() => heads.count, { message: 'the second Check again did not ask the site again' }).toBe(2)
      await expect(status(page)).toHaveText('Still unavailable')
    })

    test('Check again with the site answering says so, then reloads into the app', async ({ page }) => {
      watch(page, 'a visitor checking whether UIL4B is back')
      const heads = await setUp(page, { status: 200 })
      await goRaw(page, '/plans')
      await expect(heading(page)).toBeVisible()

      const reloaded = page.waitForEvent('domcontentloaded')
      await checkAgain(page).click()
      await expect(status(page)).toHaveText('UIL4B is reachable again')
      await expect(page.locator('.ed-ground.ed-calm:not(.ed-drain)'), 'the horizon turns to colour on an answer').toHaveCount(1)
      expect(heads.count).toBe(1)

      await reloaded
      await expect(heading(page), 'the app should replace the maintenance page').toHaveCount(0)
      await expect(page).toHaveURL(/\/plans$/)
      await expect(page).not.toHaveTitle('UI L4B | Unavailable')
      await expect(page.getByRole('heading', { level: 1, name: /less than 1 coffee per month/ })).toBeVisible()
      expect(await page.evaluate((key) => sessionStorage.getItem(key), KEY), 'the tab remembers the site answered').toBe('off')
    })

    test('the keyboard reaches Check again from the heading, and Enter runs the check', async ({ page }) => {
      watch(page, 'a keyboard user in maintenance')
      const held = gate()
      const heads = await setUp(page, { status: 503, hold: held })
      await goRaw(page, '/')
      await expect(heading(page)).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(checkAgain(page)).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(status(page)).toHaveText('Checking')
      held.open()
      await expect(status(page)).toHaveText('Still unavailable')
      expect(heads.count).toBe(1)
      await expect(checkAgain(page), 'focus stays on the button for another try').toBeFocused()

      await page.keyboard.press('Space')
      await expect.poll(() => heads.count).toBe(2)
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

  test('is overridden by a tab that already confirmed the site is reachable', async ({ page }) => {
    watch(page, 'a visitor who already checked')
    await page.addInitScript((key) => window.sessionStorage.setItem(key, 'off'), KEY)
    await goRaw(page, '/plans')
    await expect(page.getByRole('heading', { level: 1, name: /less than 1 coffee per month/ })).toBeVisible()
    await expect(heading(page)).toHaveCount(0)
  })

  test('covers a route that is not the home page, with the same page', async ({ page }) => {
    watch(page, 'a visitor following a deep link in maintenance')
    await setUp(page)
    await goRaw(page, '/learn/help')
    await expect(heading(page)).toBeVisible()
    await expect(page).toHaveURL(/\/learn\/help$/)
  })
})
