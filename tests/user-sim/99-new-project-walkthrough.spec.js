// A new blank project starts the walkthrough: New project on /projects lands
// on its first step (the Palette Builder) with the walkthrough rail and the
// orientation card up, signed out and signed in, and the card opens even for
// someone who has seen it before.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'

const SEEN_KEY = 'vs-uikit-guide-seen'

async function newProject(page) {
  await go(page, '/projects')
  await expectRendered(page, '/projects')
  await page.getByRole('button', { name: 'New project' }).click()
  await expect(page).toHaveURL(/\/create\/palette$/)
  await expectRendered(page, '/create/palette')
}

test.describe('New project starts the walkthrough', () => {
  test('signed out: the rail and the orientation card are up on the first step', async ({ page }) => {
    watch(page, 'a visitor starting a project with no account')
    await newProject(page)
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' })).toBeVisible()
    await expect(page.locator('.bkit-card[role="dialog"]')).toBeVisible()
    await expect(page.locator('#ui-login-title'), 'starting a project asked for an account').toHaveCount(0)
  })

  test('signed in, having seen the card before: it opens again for the new project', async ({ page }) => {
    watch(page, 'a returning designer starting another project')
    await page.addInitScript((key) => { try { localStorage.setItem(key, '1') } catch { /* private mode */ } }, SEEN_KEY)
    await signIn(page, { plan: 'free', projects: 1 })
    await newProject(page)
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' })).toBeVisible()
    const card = page.locator('.bkit-card[role="dialog"]')
    await expect(card).toBeVisible()
    // Dismissed, it stays dismissed on the same page.
    await card.getByRole('button', { name: 'Close' }).click()
    await expect(card).toHaveCount(0)
  })

  test('opening the Palette Builder directly does not force the card on someone who has seen it', async ({ page }) => {
    watch(page, 'a returning designer opening a tool from the menu')
    await page.addInitScript((key) => { try { localStorage.setItem(key, '1') } catch { /* private mode */ } }, SEEN_KEY)
    await page.addInitScript(() => { try { localStorage.setItem('vs-uikit-guide', '1') } catch { /* private mode */ } })
    await go(page, '/create/palette')
    await expectRendered(page, '/create/palette')
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' })).toBeVisible()
    await expect(page.locator('.bkit-card[role="dialog"]')).toHaveCount(0)
  })
})
