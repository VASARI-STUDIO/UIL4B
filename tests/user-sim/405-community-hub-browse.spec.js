// The Community Hub, browsed the way a person browses it (desktop, signed out;
// the Saved sort signed in). Every piece and maker on the hub is a labelled
// sample, so the page also has to say so and carry no counts, likes or ratings.
//
// Journeys:
//   1. The whole showcase is on the page, each tile says it is a sample, and
//      there is no social proof (no likes, ratings, reviews, "top rated").
//   2. Kind and Topic narrow the grid, the count line follows, and the empty
//      state offers a way back.
//   3. Search narrows by brand, kind or topic, a miss says so and Clear brings
//      everything back.
//   4. Saving a piece and choosing Newest then Saved shows only the saved piece.
//
// Expected counts are read from the data the page is built from, so adding a
// piece changes the data and not the test.
//
// MUTATION (restore after each; written, not yet run: see the hand-over):
//   Community.jsx: change the Inspiration kind test to `p.kind === 'Icon'`
//       -> "2. Inspiration shows only the photo pieces"
//   Community.jsx: drop `&& (!query || pieceHaystack(p).includes(query))`
//       -> "3. a brand name narrows the grid to that brand"
//   pieceUi.jsx: remove the `<span className="cm-sample"> · Sample</span>`
//       -> "1. every tile says it is a sample"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { SHOWCASE_PIECES, SHOWCASE_TOPICS, isInspiration, makerName, pieceHaystack } from '../../src/data/communityShowcase.js'

test.use({ viewport: { width: 1440, height: 900 } })

const grid = (page) => page.getByRole('list', { name: 'Showcase pieces' })
const tiles = (page) => grid(page).getByRole('article')
const count = (page) => page.locator('.cm-count')
const word = (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`
const kindButton = (page, name) => page.getByRole('radiogroup', { name: 'Kind' }).getByText(name, { exact: true })

test.describe('Community Hub: browse', () => {
  test('1. the whole showcase is there, every tile says it is a sample, and nothing is counted or rated', async ({ page }) => {
    watch(page, 'a visitor opening the Community Hub')
    await go(page, '/community')
    await expect(page.getByRole('heading', { level: 1, name: 'Community Hub' })).toBeVisible()
    await expect(tiles(page)).toHaveCount(SHOWCASE_PIECES.length)
    await expect(count(page)).toHaveText(word(SHOWCASE_PIECES.length))

    // MUTATION: remove the "Sample" span from a tile and this fails.
    const first = SHOWCASE_PIECES[0]
    for (let i = 0; i < SHOWCASE_PIECES.length; i += 1) {
      await expect(tiles(page).nth(i), `tile ${i}: says it is a sample`).toContainText('Sample')
    }
    await expect(tiles(page).first().getByRole('heading', { level: 3 })).toHaveText(first.title)
    await expect(tiles(page).first()).toContainText(makerName(first))
    await expect(page.getByText(/sample from a made-up brand/i)).toBeVisible()

    const body = (await page.locator('main').innerText()).toLowerCase()
    expect(body).not.toMatch(/top rated|rating|\breviews?\b|\blikes?\b|followers|downloads|trending/)
  })

  test('2. Kind and Topic narrow the grid and the count follows; an empty result offers a way back', async ({ page }) => {
    watch(page, 'a visitor narrowing the Community Hub')
    await go(page, '/community')

    // MUTATION: change the Inspiration kind test to `p.kind === 'Icon'` and this fails.
    await kindButton(page, 'Inspiration').click()
    const photos = SHOWCASE_PIECES.filter(isInspiration)
    await expect(tiles(page), '2. Inspiration shows only the photo pieces').toHaveCount(photos.length)
    await expect(count(page)).toHaveText(word(photos.length))
    for (const p of photos) await expect(grid(page).getByRole('heading', { level: 3, name: p.title })).toBeVisible()

    // Icons have no sample pieces: the empty state names the way out.
    await kindButton(page, 'Icons').click()
    await expect(tiles(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible()
    await page.getByRole('button', { name: 'Show everything' }).click()
    await expect(tiles(page)).toHaveCount(SHOWCASE_PIECES.length)

    // Topic is a menu: choose one and only its pieces stay.
    const topic = SHOWCASE_TOPICS.find((t) => SHOWCASE_PIECES.some((p) => p.topic === t) && SHOWCASE_PIECES.some((p) => p.topic !== t))
    await page.getByRole('button', { name: /^Topic/ }).click()
    await page.getByRole('menuitemradio', { name: topic, exact: true }).click()
    const inTopic = SHOWCASE_PIECES.filter((p) => p.topic === topic)
    await expect(tiles(page)).toHaveCount(inTopic.length)
    await expect(count(page)).toHaveText(word(inTopic.length))
  })

  test('3. search finds by brand, kind or topic; a miss says so and Clear search brings everything back', async ({ page }) => {
    watch(page, 'a visitor searching the Community Hub')
    await go(page, '/community')
    const box = page.getByRole('searchbox', { name: 'Search the showcase' })

    // MUTATION: drop the haystack filter in Community.jsx and this fails.
    await box.fill('kerbside')
    const brand = SHOWCASE_PIECES.filter((p) => pieceHaystack(p).includes('kerbside'))
    await expect(tiles(page), '3. a brand name narrows the grid to that brand').toHaveCount(brand.length)

    await box.fill('palette')
    const byKind = SHOWCASE_PIECES.filter((p) => pieceHaystack(p).includes('palette'))
    await expect(tiles(page)).toHaveCount(byKind.length)

    await box.fill('zzzz nothing')
    await expect(page.getByRole('heading', { name: 'Nothing matches “zzzz nothing”' })).toBeVisible()
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(box).toHaveValue('')
    await expect(tiles(page)).toHaveCount(SHOWCASE_PIECES.length)

    // Escape clears a typed search without leaving the field.
    await box.fill('offcut')
    await expect(tiles(page)).not.toHaveCount(SHOWCASE_PIECES.length)
    await box.press('Escape')
    await expect(box).toHaveValue('')
    await expect(tiles(page)).toHaveCount(SHOWCASE_PIECES.length)
  })

  test('4. a saved piece is the only one under Sort: Saved, and the empty Saved view says how to save', async ({ page }) => {
    watch(page, 'a member saving a piece')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')

    await page.getByRole('radiogroup', { name: 'Sort' }).getByText('Saved', { exact: true }).click()
    await expect(page.getByText(/No saved designs yet/)).toBeVisible()
    await page.getByRole('button', { name: 'Browse all pieces' }).click()
    await expect(tiles(page)).toHaveCount(SHOWCASE_PIECES.length)

    const piece = SHOWCASE_PIECES[2]
    await page.getByRole('button', { name: `Save ${piece.title}`, exact: true }).first().click()
    await page.getByRole('radiogroup', { name: 'Sort' }).getByText('Saved', { exact: true }).click()
    await expect(tiles(page)).toHaveCount(1)
    await expect(tiles(page).first().getByRole('heading', { level: 3 })).toHaveText(piece.title)
  })
})
