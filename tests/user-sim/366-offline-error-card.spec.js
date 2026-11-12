// THE ERROR CARD, OFFLINE AND BACK: what a person can do when a page fails and
// the connection is gone too.
//
// A reload with no connection swaps the page for the browser's own error, so the
// card removes the ways on that need a connection (Reload, Report this, the Help
// centre) and says it is waiting. Back to the homepage stays: it is a link inside
// the app, which is already loaded, and it is the one way out that still works.
// The waiting line is announced (role=status), the keyboard's first stop is that
// link, and when the connection returns the other ways on come back and Reload
// the page really asks the server for the page again.
//
// The card's wording and colours at four sizes are in
// 224-error-recovery-cards.spec.js; this is the journey through the states.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In RouteErrorBoundary.jsx keep the actions when offline, hide the homepage
// link when offline, or stop listening for the `online` event: the offline and
// cycle tests fail. Make the reload
// button do nothing: the reload tests fail on the request count.
import { test, expect } from './base.js'
import {
  landShellCrash, landChromelessCrash, landLoadFailed, setConnection,
} from './edge-cards.js'

const reload = (card) => card.getByRole('button', { name: 'Reload the page' })
const report = (card) => card.getByRole('link', { name: 'Report this', exact: true })
const home = (card) => card.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Back to the homepage' })
const help = (card) => card.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Help centre' })
const status = (card) => card.getByRole('status')

for (const [label, size] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
  test.describe(`the error card at ${label}`, () => {
    test.use({ viewport: size })

    test('the keyboard walks the ways on in order, and Enter on Reload asks for the page again', async ({ page }) => {
      const { card, asked } = await landShellCrash(page)
      await expect(card.getByRole('heading', { level: 1 })).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(reload(card)).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(report(card)).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(home(card)).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(help(card)).toBeFocused()

      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(reload(card)).toBeFocused()
      const before = asked.count
      await page.keyboard.press('Enter')
      await expect.poll(() => asked.count, { message: 'Reload the page did not ask for the failed page again' }).toBeGreaterThan(before)
      await expect(card.getByRole('heading', { level: 1 }), 'the crash persists, so the card is shown again').toBeVisible()
    })

    test('offline, the card holds back every way on that needs a connection, keeps the homepage link, and the keyboard lands on it', async ({ page, context }) => {
      const { card } = await landShellCrash(page)
      await setConnection(page, context, false)

      await expect(status(card)).toHaveText('Waiting for a connection')
      await expect(reload(card)).toHaveCount(0)
      await expect(report(card)).toHaveCount(0)
      await expect(help(card)).toHaveCount(0)
      await expect(home(card), 'the homepage is in the loaded app, so it still works offline').toBeVisible()
      await expect(home(card)).toHaveAttribute('href', '/')
      await expect(card.getByRole('heading', { level: 1 }), 'focus should stay on the heading').toBeFocused()

      await page.keyboard.press('Tab')
      await expect(home(card), 'the first stop is the one way out that remains').toBeFocused()
      await page.keyboard.press('Tab')
      const inside = await card.evaluate((el) => el.contains(document.activeElement))
      expect(inside, 'Tab went on to something else in the offline card').toBe(false)
    })

    test('offline, back, offline again: each change shows the matching ways on', async ({ page, context }) => {
      const { card } = await landLoadFailed(page)

      await setConnection(page, context, false)
      await expect(status(card)).toHaveText('Waiting for a connection')
      await expect(reload(card)).toHaveCount(0)

      await setConnection(page, context, true)
      await expect(status(card)).toHaveText('Back online')
      await expect(reload(card)).toBeEnabled()
      await expect(home(card)).toBeVisible()

      await setConnection(page, context, false)
      await expect(status(card)).toHaveText('Waiting for a connection')
      await expect(reload(card), 'the second drop must hold the ways back again').toHaveCount(0)
      await expect(help(card)).toHaveCount(0)
      await expect(home(card), 'the homepage link stays through every change').toBeVisible()
    })

    test('after reconnecting, Reload the page requests the failed file again', async ({ page, context }) => {
      const { card, asked } = await landLoadFailed(page)
      await setConnection(page, context, false)
      await expect(reload(card)).toHaveCount(0)
      await setConnection(page, context, true)
      await expect(reload(card)).toBeEnabled()

      const before = asked.count
      await reload(card).click()
      await expect.poll(() => asked.count, { message: 'the reload did not request the page file again' }).toBeGreaterThan(before)
    })

    test('a route with no app shell holds the same ways back offline, and keeps the homepage link', async ({ page, context }) => {
      const { card } = await landChromelessCrash(page)
      await setConnection(page, context, false)
      await expect(status(card)).toHaveText('Waiting for a connection')
      await expect(reload(card)).toHaveCount(0)
      await expect(report(card)).toHaveCount(0)
      await expect(home(card)).toBeVisible()
      await setConnection(page, context, true)
      await expect(reload(card)).toBeEnabled()
      await expect(help(card)).toBeVisible()
      await expect(home(card)).toBeVisible()
    })
  })
}
