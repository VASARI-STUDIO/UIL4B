// A maker's profile on the Community Hub (desktop), and the "More from" strip
// at the foot of a piece.
//
// Every maker here is a made-up brand, so the profile says "Sample brand".
// Journeys:
//   1. A profile shows who the maker is, says it is a sample, and splits their
//      pieces into Made and Inspiration; the tabs work by click and by arrow key.
//   2. A tab with nothing in it says so, in words, rather than showing a blank.
//   3. A maker with several pieces gets "More from <maker>" under a piece; a
//      maker with one piece gets "More makers" instead, with other makers'
//      pieces and none of their own.
//   4. A profile that is not there says so.
//
// Expected pieces and headings are read from the data the page is built from
// (`piecesBy`, `moreFor`), so the test follows the data.
//
// MUTATION (restore after each; written, not yet run: see the hand-over):
//   communityShowcase.js moreFor: change `own.length >= 2` to `own.length >= 1`
//       -> "3. a maker with one piece gets More makers"
//   CommunityProfile.jsx: change the `shown` filter to `(tab === 'inspiration') !== isInspiration(p)`
//       -> "1. a profile splits Made and Inspiration"
//   CommunityProfile.jsx: change 'Sample brand' to an empty string
//       -> "1. a profile says it is a sample"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { isInspiration, makerByHandle, moreFor, pieceById, piecesBy } from '../../src/data/communityShowcase.js'

test.use({ viewport: { width: 1440, height: 900 } })

const KERBSIDE = makerByHandle('kerbside')
const grid = (page, name) => page.getByRole('list', { name }).getByRole('article')
const titles = (page, name) => grid(page, name).getByRole('heading', { level: 3 }).allInnerTexts()

/** A maker with one piece, which is how the board's "More makers" case arises. */
const loneMaker = () => ['margin', 'encore', 'saltbush', 'plumbline'].map(makerByHandle).find((m) => piecesBy(m.handle).length === 1)

test.describe('Community maker profile', () => {
  test('1. a profile says who the maker is, that it is a sample, and splits Made from Inspiration', async ({ page }) => {
    watch(page, 'a visitor opening a maker')
    await go(page, `/u/${KERBSIDE.handle}`)
    await expect(page.getByRole('heading', { level: 1, name: KERBSIDE.name })).toBeVisible()
    await expect(page.getByText(KERBSIDE.line)).toBeVisible()
    await expect(page.getByText('Sample brand', { exact: true }), '1. a profile says it is a sample').toBeVisible()

    const made = piecesBy(KERBSIDE.handle).filter((p) => !isInspiration(p))
    const photos = piecesBy(KERBSIDE.handle).filter(isInspiration)
    // MUTATION: invert the Made/Inspiration filter in CommunityProfile.jsx and this fails.
    expect((await titles(page, 'Made')).sort(), '1. a profile splits Made and Inspiration').toEqual(made.map((p) => p.title).sort())
    // A profile's own tiles do not repeat the maker's name on every card.
    await expect(page.locator('.cm-maker-link')).toHaveCount(0)

    await page.getByRole('tab', { name: /^Inspiration/ }).click()
    expect((await titles(page, 'Inspiration')).sort()).toEqual(photos.map((p) => p.title).sort())
    await expect(page.getByRole('tab', { name: /^Inspiration/ })).toHaveAttribute('aria-selected', 'true')

    // Arrow keys move between tabs and the panel follows.
    await page.getByRole('tab', { name: /^Inspiration/ }).focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('tab', { name: /^Made/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: /^Made/ })).toBeFocused()
    expect((await titles(page, 'Made')).sort()).toEqual(made.map((p) => p.title).sort())
  })

  test('2. a tab with nothing in it says so', async ({ page }) => {
    watch(page, 'a visitor opening a maker with only one kind of piece')
    const maker = loneMaker()
    const only = piecesBy(maker.handle)[0]
    await go(page, `/u/${maker.handle}`)
    const emptyTab = isInspiration(only) ? 'Made' : 'Inspiration'
    await page.getByRole('tab', { name: new RegExp(`^${emptyTab}`) }).click()
    await expect(page.getByRole('heading', { name: emptyTab === 'Made' ? 'Nothing made here yet' : 'No inspiration here yet' })).toBeVisible()
    await expect(page.getByText('This sample brand has nothing in this section.')).toBeVisible()
  })

  test('3. a maker with several pieces gets More from them; a maker with one gets More makers', async ({ page }) => {
    watch(page, 'a visitor reaching the end of a piece')
    const several = pieceById('kerbside-guide-cover')
    const manyMore = moreFor(several)
    await go(page, `/community/${several.id}`)
    await expect(page.getByRole('heading', { level: 2, name: `More from ${KERBSIDE.name}` })).toBeVisible()
    await expect(grid(page, `More from ${KERBSIDE.name}`)).toHaveCount(manyMore.pieces.length)
    await page.getByRole('link', { name: `See ${KERBSIDE.name}’s profile` }).click()
    await expect(page).toHaveURL(new RegExp(`/u/${KERBSIDE.handle}$`))

    const maker = loneMaker()
    const lone = piecesBy(maker.handle)[0]
    const more = moreFor(lone)
    await go(page, `/community/${lone.id}`)
    // MUTATION: change `own.length >= 2` to `>= 1` in moreFor and this fails.
    await expect(page.getByRole('heading', { level: 2, name: 'More makers' }), '3. a maker with one piece gets More makers').toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: `More from ${maker.name}` })).toHaveCount(0)
    await expect(grid(page, 'More makers')).toHaveCount(more.pieces.length)
    const others = await page.getByRole('list', { name: 'More makers' }).locator('.cm-maker-link').allInnerTexts()
    expect(others, 'none of the strip is the same maker').not.toContain(maker.name)
    expect(new Set(others).size, 'one piece from each other maker').toBe(others.length)
  })

  test('4. a profile that is not there says so and offers the way back', async ({ page }) => {
    watch(page, 'a visitor with a stale profile link')
    await go(page, '/u/no-such-maker')
    await expect(page.getByRole('heading', { name: 'We couldn’t find that profile' })).toBeVisible()
    await page.getByRole('link', { name: 'Browse the showcase' }).click()
    await expect(page).toHaveURL(/\/community$/)
  })
})
