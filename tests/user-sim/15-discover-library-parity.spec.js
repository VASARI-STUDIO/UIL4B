// Discover Library parity — the Palette Library and Gradient Library are two
// views of one product, so they must present the SAME masthead and results row
// (rendered by the shared DiscoverGalleryHero / DiscoverResultHead components)
// and use the same "… Library" vocabulary. These tests exist so a future edit
// to one page cannot silently drift the other.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

const LIBRARIES = [
  { route: '/discover/palettes', title: 'Palette Library', noun: 'palette' },
  { route: '/discover/gradients', title: 'Gradient Library', noun: 'gradient' },
]

test.describe('Discover libraries share one header', () => {
  for (const library of LIBRARIES) {
    test(`${library.title} renders the shared Discover masthead`, async ({ page }) => {
      watch(page, `designer browsing the ${library.title}`)
      await go(page, library.route)

      const hero = page.locator('.dgh-hero')
      await expect(hero).toBeVisible()
      await expect(hero.getByRole('heading', { level: 1, name: library.title })).toBeVisible()
      // Eyebrow + description + numeric mark are the parts that make the two
      // pages read as one surface.
      await expect(hero.locator('.dgh-eyebrow')).toHaveText('Discover / Colour')
      await expect(hero.locator('p')).not.toBeEmpty()
      await expect(hero.locator('.dgh-mark strong')).not.toBeEmpty()

      // Shared results row, with the live count announced politely.
      const resultHead = page.locator('.drh-head')
      await expect(resultHead).toBeVisible()
      await expect(resultHead.locator('span')).toHaveText('Curated collection')
      await expect(resultHead.locator('p')).toHaveAttribute('aria-live', 'polite')
      await expect(resultHead.locator('p')).toContainText(new RegExp(`\\d+ ${library.noun}`))

      // Title case, no trailing full stop — the agreed library vocabulary.
      const h1 = await page.getByRole('heading', { level: 1 }).first().innerText()
      expect(h1.endsWith('.')).toBe(false)
    })
  }

  test('the two libraries agree on their masthead structure', async ({ page }) => {
    watch(page, 'reviewer comparing the two Discover libraries')
    const shapes = []
    for (const library of LIBRARIES) {
      await go(page, library.route)
      await expect(page.locator('.dgh-hero')).toBeVisible()
      shapes.push(await page.evaluate(() => {
        const hero = document.querySelector('.dgh-hero')
        const styles = getComputedStyle(hero)
        return {
          eyebrow: !!hero.querySelector('.dgh-eyebrow'),
          h1: !!hero.querySelector('h1'),
          description: !!hero.querySelector('p'),
          mark: !!hero.querySelector('.dgh-mark strong'),
          radius: styles.borderTopLeftRadius,
          background: styles.backgroundColor,
          resultHead: !!document.querySelector('.drh-head h2'),
        }
      }))
    }
    expect(shapes[0]).toEqual(shapes[1])
  })

  test('the Gradient Library keeps its no-results recovery path', async ({ page }) => {
    watch(page, 'designer filtering the Gradient Library down to nothing')
    await go(page, '/discover/gradients')
    await expect(page.locator('.grg-card').first()).toBeVisible()

    await page.getByLabel('Search gradients').fill('zzzzz-no-such-gradient')
    await expect(page.locator('.grg-card')).toHaveCount(0)
    const empty = page.locator('.grg-empty')
    await expect(empty).toBeVisible()
    await expect(empty).toContainText('No gradients match')

    await empty.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.grg-card').first()).toBeVisible()
    await expect(page.locator('.drh-head p')).toContainText(/\d+ gradients/)
  })
})
