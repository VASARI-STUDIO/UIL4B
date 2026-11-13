// V3 Libraries, gradients and buttons: copying a gradient's CSS, narrowing the
// button library by role, and the button sheet (the detail dialog) for a free
// viewer and for Pro. Phone checks are the sizes a thumb needs and that the role
// chips share one row.
//
// MUTATIONS this file goes red on:
//   - remove the `.grg-copy` button from GradientGalleryGrid.jsx: the gradient
//     Copy CSS assertions go red;
//   - in library-v3.css make the phone Like or Copy chip shorter than 44px: the
//     phone gradient test goes red;
//   - let the button-role chips wrap at 390 (drop the one-row rule): the "one row"
//     assertion goes red;
//   - drop `disabled={!isEdited(item, live)}` from Reset in ButtonLibraryDialog.jsx:
//     the Reset-disabled assertion goes red;
//   - point "See Pro plans" at another route, or drop `white-space:pre` from
//     `.blib-pre`: the lock link and code-block assertions go red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { BUTTON_ITEMS, BUTTON_ROLES } from '../../src/data/buttonLibrary.js'

const FIRST_GRADIENT = GALLERY_GRADIENTS[0].name
const SOLID = BUTTON_ITEMS.find((b) => b.name === 'Solid')

test.describe('gradient library', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a gradient card copies its CSS with a toast and opens in the generator', async ({ page }) => {
    watch(page, 'a visitor copying a gradient')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, '/discover/gradients')
    const copy = page.getByRole('button', { name: `Copy ${FIRST_GRADIENT} CSS` })
    await expect(copy).toBeVisible()
    await copy.click()
    await expect(page.getByText(`Copied ${FIRST_GRADIENT} CSS`)).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('gradient')
    // The card has two links to the generator under the same name (the swatch and the Open
    // pill), so every one of them must lead there rather than asserting on a single match.
    const opens = page.getByRole('link', { name: `Open ${FIRST_GRADIENT} in the Gradient Generator` })
    await expect(opens.first()).toBeVisible()
    const hrefs = await opens.evaluateAll((els) => els.map((el) => el.getAttribute('href')))
    expect(hrefs.length, 'the card opens in the generator').toBeGreaterThan(0)
    for (const href of hrefs) expect(href).toMatch(/\/create\/gradient/)
  })
})

test.describe('gradient library, phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('Like and Copy CSS are 44px targets and the card meta sits under the name', async ({ page }) => {
    watch(page, 'a visitor on a phone at the gradient library')
    await go(page, '/discover/gradients')
    const like = page.getByRole('button', { name: `Like ${FIRST_GRADIENT}` })
    const copy = page.getByRole('button', { name: `Copy ${FIRST_GRADIENT} CSS` })
    await expect(like).toBeVisible()
    for (const target of [like, copy]) {
      const box = await target.boundingBox()
      expect(Math.round(box.height)).toBeGreaterThanOrEqual(44)
      expect(Math.round(box.width)).toBeGreaterThanOrEqual(44)
    }
    const card = page.locator('.grg-card', { has: copy }).first()
    const name = await card.locator('.lbry-card-name').first().boundingBox()
    const meta = await card.locator('.lbry-card-meta').first().boundingBox()
    expect(meta.y, 'the meta is under the name').toBeGreaterThan(name.y + name.height - 2)
  })
})

test.describe('button library', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('every button is open signed out, a role narrows the grid, and an unmatched search can be cleared', async ({ page }) => {
    watch(page, 'a visitor browsing the button library')
    await go(page, '/discover/buttons')
    await expect(page.locator('.blib-card')).toHaveCount(BUTTON_ITEMS.length)

    const roles = page.getByRole('group', { name: 'Filter buttons by role' }).getByRole('button')
    await expect(roles).toHaveText(BUTTON_ROLES.map((r) => r.label))
    const primary = BUTTON_ITEMS.filter((b) => b.role === 'primary').length
    await roles.nth(1).click()
    await expect(page.locator('.blib-card')).toHaveCount(primary)
    await roles.first().click()
    await expect(page.locator('.blib-card')).toHaveCount(BUTTON_ITEMS.length)

    const search = page.getByLabel('Search buttons')
    await search.fill('zzz')
    const empty = page.getByRole('status').filter({ hasText: 'No buttons match “zzz”.' })
    await expect(empty).toBeVisible()
    await page.locator('body').click({ position: { x: 4, y: 4 } })
    await empty.getByRole('button').click()
    await expect(search).toBeFocused()
    await expect(page.locator('.blib-card')).toHaveCount(BUTTON_ITEMS.length)
  })

  test('the sheet for a free viewer locks Quick edits with a link to /plans, shows the code unwrapped, and Escape returns focus', async ({ page }) => {
    watch(page, 'a free member opening a button')
    await signIn(page, { plan: 'free' })
    await go(page, '/discover/buttons')
    const opener = page.getByRole('button', { name: `Open ${SOLID.name} button` })
    await opener.click()
    const sheet = page.getByRole('dialog', { name: `${SOLID.name} button` })
    await expect(sheet).toBeVisible()

    const lock = sheet.locator('.blib-lock').filter({ hasText: 'Quick edits' })
    await expect(lock).toHaveCount(1)
    await expect(lock.getByRole('link', { name: 'See Pro plans' })).toHaveAttribute('href', '/plans')
    await expect(sheet.getByRole('group', { name: 'Quick edits' })).toHaveCount(0)

    for (const title of ['HTML', 'CSS']) {
      const block = sheet.getByRole('group', { name: title })
      await expect(block).toBeVisible()
      expect(await block.evaluate((el) => getComputedStyle(el).whiteSpace), `${title} is not wrapped`).toBe('pre')
    }

    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(opener).toBeFocused()
  })

  test('the sheet for Pro: Reset stays disabled until something is edited, then clears the edit', async ({ page }) => {
    watch(page, 'a Pro member editing a button')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/buttons')
    await page.getByRole('button', { name: `Open ${SOLID.name} button` }).click()
    const sheet = page.getByRole('dialog', { name: `${SOLID.name} button` })
    const reset = sheet.getByRole('button', { name: 'Reset' })
    await expect(reset).toBeDisabled()

    const css = sheet.getByRole('group', { name: 'CSS' })
    const before = await css.innerText()
    await sheet.getByRole('radio', { name: 'Large' }).check()
    await expect(reset).toBeEnabled()
    await expect.poll(() => css.innerText()).not.toBe(before)

    await reset.click()
    await expect(reset).toBeDisabled()
    await expect.poll(() => css.innerText()).toBe(before)
    await expect(sheet.getByRole('group', { name: 'AI prompt' })).toBeVisible()
  })
})

test.describe('button library, phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the role chips share one row and meet the 44px target', async ({ page }) => {
    watch(page, 'a visitor on a phone at the button library')
    await go(page, '/discover/buttons')
    const chips = page.getByRole('group', { name: 'Filter buttons by role' }).getByRole('button')
    await expect(chips).toHaveCount(BUTTON_ROLES.length)
    const boxes = await chips.evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), height: Math.round(r.height), right: Math.round(r.right) }
    }))
    for (const b of boxes) expect(Math.abs(b.top - boxes[0].top), 'all chips share a row').toBeLessThanOrEqual(2)
    for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(40)
    expect(Math.max(...boxes.map((b) => b.right)), 'the row fits the screen').toBeLessThanOrEqual(390)
  })
})
