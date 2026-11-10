// Font Pair opens on the Street preset, and the bar carries the type-tools switcher.
//   1  Street is the pressed preset; the photo, its "Sample photo" plate and the
//      caption show
//   2  typed Preview text replaces the Street heading and nothing else
//   3  the switcher names the three tools and marks Font Pair as the current page
//
// MUTATIONS (each should fail the spec named):
//   - start the preset on 'article'                           -> 1
//   - render `headline` instead of `sample || STREET_HEAD`     -> 2
//   - drop aria-current from the Font Pair link                -> 3
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

test.describe('Font Pair · Street', () => {
  test('opens on the photo with its labels', async ({ page }) => {
    watch(page, 'designer opening Font Pair')
    await go(page, '/create/font-pair')
    await expect(page.getByRole('button', { name: 'Street', pressed: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Two riders waiting/ })).toBeVisible()
    await expect(page.getByText('Sample photo')).toBeVisible()
    await expect(page.locator('.fpr-street-h')).toHaveText('Across town before lunch.')
  })

  test('typed words replace the heading only', async ({ page }) => {
    watch(page, 'designer trying brand words')
    await go(page, '/create/font-pair')
    await page.getByLabel('Preview text').fill('Ship interfaces that hold up')
    await expect(page.locator('.fpr-street-h')).toHaveText('Ship interfaces that hold up')
    await expect(page.locator('.fpr-street-p')).not.toContainText('Ship interfaces')
  })

  test('the switcher links the three type tools', async ({ page }) => {
    watch(page, 'designer moving between type tools')
    await go(page, '/create/font-pair')
    const nav = page.getByRole('navigation', { name: 'Type tools' })
    await expect(nav.getByRole('link')).toHaveCount(3)
    await expect(nav.getByRole('link', { name: /^Font Pair, body / })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: /^Font Gallery, heading / })).toHaveAttribute('href', '/create/font-gallery')
    await expect(nav.getByRole('link', { name: /^Type Scale, scale / })).toHaveAttribute('href', '/create/type-scale')
  })
})
