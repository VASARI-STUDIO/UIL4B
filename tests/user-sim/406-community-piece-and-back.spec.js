// Opening a piece from the Community Hub and getting back out (desktop).
//
// Journeys:
//   1. A tile opens its own page: title, the maker, the facts, a Sample label,
//      and the browser's Back lands on the hub with the whole grid.
//   2. An export piece offers "Open in Palette Builder"; a photo piece offers
//      Save instead (there is nothing to open it in).
//   3. The maker's name goes to their profile; the Community link goes back to
//      the hub.
//   4. A link to a piece that is not there says so and offers the way back.
//
// Expected text is read from the data the page is built from.
//
// MUTATION (restore after each; written, not yet run: see the hand-over):
//   CommunityPiece.jsx: change the `primary` test to `inspiration ? <Link ...Palette Builder> : <button Save>`
//       -> "2. an export piece offers Open in Palette Builder; a photo offers Save"
//   CommunityPiece.jsx: remove the `cm-d-sample` paragraph
//       -> "1. a tile opens its own page"
//   pieceActions.js: point `pieceHref` at `/community?piece=${piece.id}`
//       -> "1. a tile opens its own page"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { SHOWCASE_PIECES, makerByHandle, makerName, pieceById } from '../../src/data/communityShowcase.js'

test.use({ viewport: { width: 1440, height: 900 } })

const EXPORT = pieceById('kerbside-guide-cover')
const PHOTO = pieceById('kerbside-evening-run')
const tileLink = (page, piece) => page.getByRole('link', { name: `${piece.title}, ${makerName(piece)}`, exact: true })

test.describe('Community piece page', () => {
  test('1. a tile opens its own page and Back returns to the whole grid', async ({ page }) => {
    watch(page, 'a visitor opening a piece')
    await go(page, '/community')
    await tileLink(page, EXPORT).click()

    await expect(page).toHaveURL(new RegExp(`/community/${EXPORT.id}$`))
    await expect(page.getByRole('heading', { level: 1, name: EXPORT.title })).toBeVisible()
    await expect(page.getByRole('link', { name: makerName(EXPORT), exact: true }).first()).toBeVisible()
    const facts = page.locator('.cm-facts')
    await expect(facts).toContainText(EXPORT.kind)
    await expect(facts).toContainText(EXPORT.look.name)
    // MUTATION: remove the cm-d-sample paragraph and this fails.
    await expect(page.getByText(`Sample piece. ${makerName(EXPORT)} is a made-up brand.`)).toBeVisible()
    await expect(page.locator('.cm-d-render img')).toHaveAttribute('alt', EXPORT.alt)

    await page.goBack()
    await expect(page).toHaveURL(/\/community$/)
    await expect(page.getByRole('list', { name: 'Showcase pieces' }).getByRole('article')).toHaveCount(SHOWCASE_PIECES.length)
  })

  test('2. an export piece offers Open in Palette Builder; a photo offers Save', async ({ page }) => {
    watch(page, 'a visitor choosing what to do with a piece')
    await go(page, `/community/${EXPORT.id}`)
    // MUTATION: swap the two branches of `primary` in CommunityPiece.jsx and this fails.
    const open = page.getByRole('link', { name: 'Open in Palette Builder' }).first()
    await expect(open, '2. an export piece offers Open in Palette Builder; a photo offers Save').toBeVisible()
    await expect(open).toHaveAttribute('href', '/create/palette')

    await go(page, `/community/${PHOTO.id}`)
    await expect(page.getByRole('link', { name: 'Open in Palette Builder' })).toHaveCount(0)
    await expect(page.locator('.cm-d-actions').getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    await expect(page.locator('.cm-facts')).toContainText('Credit')
  })

  test('3. the maker name opens their profile and the Community link returns to the hub', async ({ page }) => {
    watch(page, 'a visitor following a maker')
    await go(page, `/community/${EXPORT.id}`)
    await page.locator('.cm-d-maker-name').click()
    await expect(page).toHaveURL(new RegExp(`/u/${EXPORT.maker}$`))
    await expect(page.getByRole('heading', { level: 1, name: makerByHandle(EXPORT.maker).name })).toBeVisible()

    await page.getByRole('link', { name: 'Community', exact: true }).first().click()
    await expect(page).toHaveURL(/\/community$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Community Hub' })).toBeVisible()
  })

  test('4. a link to a piece that is not there says so and offers the way back', async ({ page }) => {
    watch(page, 'a visitor with a stale link')
    await go(page, '/community/no-such-piece')
    await expect(page.getByRole('heading', { name: 'We couldn’t find that piece' })).toBeVisible()
    await page.getByRole('link', { name: 'Browse the showcase' }).click()
    await expect(page).toHaveURL(/\/community$/)
  })
})
