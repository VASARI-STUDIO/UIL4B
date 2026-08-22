// Discover Library parity — the Palette Library and Gradient Library are two
// views of one product, so they must present the SAME masthead and results row
// (rendered by the shared DiscoverGalleryHero / DiscoverResultHead components)
// and use the same "… Library" vocabulary. These tests exist so a future edit
// to one page cannot silently drift the other.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'
import { LIBRARY_PALETTES, BRAND_LIBRARY_PALETTES, CURATED_LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'

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

// ── Brand palettes in the Palette Library ────────────────────────────────────
// BRAND_PALETTES existed but only the Palette Builder could see them. They now
// browse alongside the curated set, and must stay TELLABLE APART from it.
test.describe('the Palette Library carries the brand systems', () => {
  test('every brand palette is present and badged', async ({ page }) => {
    watch(page, 'designer looking for a brand palette in the library')
    await go(page, '/discover/palettes')

    const cards = page.locator('.pgal-card')
    await expect(cards).toHaveCount(LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="brand"]')).toHaveCount(BRAND_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="curated"]')).toHaveCount(CURATED_LIBRARY_PALETTES.length)

    // Distinguishable: every brand card carries a visible Brand badge, and no
    // curated card does.
    await expect(page.locator('.pgal-card[data-kind="brand"] .pgal-badge')).toHaveCount(BRAND_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="curated"] .pgal-badge')).toHaveCount(0)

    // The hero count and the note both tell the truth about the mix.
    await expect(page.locator('.dgh-mark strong')).toHaveText(String(LIBRARY_PALETTES.length))
    await expect(page.locator('.pgl-note')).toContainText(`${BRAND_PALETTES.length} of these are published brand systems`)
  })

  test('the Brand filter isolates brand systems and Curated excludes them', async ({ page }) => {
    watch(page, 'designer filtering the library down to brand systems')
    await go(page, '/discover/palettes')

    await page.getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(BRAND_LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="curated"]')).toHaveCount(0)
    await expect(page.locator('.drh-head h2')).toHaveText('Identities you already know')
    await expect(page.locator('.drh-head p')).toHaveText(`${BRAND_LIBRARY_PALETTES.length} palettes`)

    await page.getByRole('button', { name: 'Curated', exact: true }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(CURATED_LIBRARY_PALETTES.length)
    await expect(page.locator('.pgal-card[data-kind="brand"]')).toHaveCount(0)

    await page.getByRole('button', { name: 'All palettes' }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(LIBRARY_PALETTES.length)
  })

  test('search reaches a brand by name, and no-results recovers', async ({ page }) => {
    watch(page, 'designer searching the library for a specific brand')
    await go(page, '/discover/palettes')

    const search = page.getByPlaceholder('Search by name or hex…')
    await search.fill('Netflix')
    await expect(page.locator('.pgal-card')).toHaveCount(1)
    await expect(page.locator('.pgal-name')).toHaveText('Netflix')
    await expect(page.locator('.pgal-badge')).toBeVisible()

    // A hex from a brand palette finds it too (Spotify green).
    await search.fill('#1DB954')
    await expect(page.locator('.pgal-name')).toHaveText('Spotify')

    await search.fill('zzzzz-not-a-palette')
    await expect(page.locator('.pgal-card')).toHaveCount(0)
    const empty = page.locator('.pgl-empty')
    await expect(empty).toBeVisible()
    await empty.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.pgal-card')).toHaveCount(LIBRARY_PALETTES.length)
  })

  test('the Palette Builder Pro gate on brand systems survives the move', async ({ page }) => {
    watch(page, 'free user meeting a Pro brand system in the library')
    await go(page, '/discover/palettes')
    await page.getByRole('button', { name: 'Brand', exact: true }).click()

    // Free brands hand off straight to the builder with their colours.
    //
    // Targets `.pgal-use` — the foot CTA — the same way the Pro branch below
    // targets `.pgal-use--pro`, rather than going by accessible name. A card
    // carries TWO links to the builder with the same colours: this one and the
    // Builder chip in the hover/focus action layer, and they share an accessible
    // name because they share a destination (which is conformant — it is
    // same-name/DIFFERENT-destination that fails WCAG). Matching by role+name
    // resolved to one element only while the action layer was hidden with
    // `visibility:hidden`, i.e. only while those actions were unreachable by
    // keyboard. That was the bug, not the fixture; the assertion has to name the
    // control it means.
    const freeBrand = BRAND_PALETTES.find((brand) => brand.free)
    const freeCard = page.locator('.pgal-card', { hasText: freeBrand.name }).first()
    await expect(freeCard.locator('.pgal-use'))
      .toHaveAttribute('href', /^\/color\/palette\?c=/)

    // Pro-gated brands do NOT: the builder still owns that decision, so the
    // card routes there instead of injecting the colours via ?c=.
    const proBrand = BRAND_PALETTES.find((brand) => !brand.free)
    const proCard = page.locator('.pgal-card', { hasText: proBrand.name }).first()
    await expect(proCard.locator('.pgal-badge')).toHaveText('Brand · Pro')
    await expect(proCard.locator('.pgal-use--pro')).toHaveAttribute('href', '/color/palette')
    await expect(proCard.locator('a[href*="?c="]')).toHaveCount(0)
  })
})
