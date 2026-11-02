// The Font Gallery dossier's "In use" section lists documented real-world uses
// as outbound links (no third-party images), and keeps the honest empty state
// for a family with none.
//
// MUTATIONS (each should turn the named test red):
//   new tab       drop `target="_blank"` or change `rel="noopener"` on the entry
//                 link in FontInUsePanel (src/components/FontDossier.jsx)
//   label         drop the "(opens in a new tab)" sr-only text from that link
//   touch target  remove `min-height:44px` from `.fdx-use-link`
//                 (src/styles/deferred/font-uses.css)
//   report link   remove the "Report a wrong or unwanted entry" anchor
//   hand back     let FontDetailDialog's popstate listener close on the pop
//                 the feedback dialog's own history.back() causes (the
//                 dossier shuts under it and focus is lost)
//   row spacing   drop the `ul` from `ul.fdx-uses` in font-uses.css so the
//                 older 22px column gap wins again
//   empty state   give Lora a row in REAL_WORLD_USES, or make usesFor return
//                 an empty-but-truthy list so the list renders with no rows
//   bad entry     put `http://` in a url in src/data/fontRealWorldUses.js: the
//                 row disappears and the count test fails
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { REAL_WORLD_USES } from '../../src/data/fontRealWorldUses.js'

const CATALOGUE = {
  fonts: [
    { family: 'Roboto', category: 'sans-serif', variants: [300, 400, 500, 700], subsets: ['latin'], popularity: 0 },
    { family: 'Lora', category: 'serif', variants: [400, 500, 600, 700], subsets: ['latin'], popularity: 1 },
    { family: 'Lato', category: 'sans-serif', variants: [300, 400, 700], subsets: ['latin'], popularity: 2 },
  ],
}

async function openDossier(page, width, family) {
  await page.setViewportSize({ width, height: 900 })
  await page.route('**/api/fonts', (route) => route.fulfill({ json: CATALOGUE }))
  await go(page, '/create/font-gallery')
  await expect(page.locator('.fg-card').first()).toBeVisible()
  await page.getByLabel('Search font families').fill(family)
  await expect(page.locator('.fg-card')).toHaveCount(1)
  await page.locator('.fg-card-open').first().click()
  const dialog = page.getByRole('dialog', { name: family })
  await expect(dialog).toBeVisible()
  const heading = dialog.getByRole('heading', { level: 3, name: 'In use', exact: true })
  await heading.scrollIntoViewIfNeeded()
  await expect(heading).toBeInViewport()
  return dialog
}

for (const width of [390, 1440]) {
  test.describe(`Fonts in use links at ${width}px`, () => {
    test('a family with documented uses lists them as new-tab links', async ({ page }) => {
      watch(page, 'designer checking where Roboto is used')
      const dialog = await openDossier(page, width, 'Roboto')
      const section = dialog.locator('#fgd-inuse')

      const rows = section.locator('.fdx-use')
      await expect(rows).toHaveCount(REAL_WORLD_USES.Roboto.length)
      await expect(section.locator('.fdx-empty')).toHaveCount(0)

      const first = rows.first().getByRole('link')
      await expect(first).toContainText('7-Eleven rebranding')
      await expect(first).toContainText('Source: Fonts In Use')
      await expect(first).toHaveAttribute('href', 'https://fontsinuse.com/uses/41967/7-eleven-rebranding')
      await expect(first).toHaveAttribute('target', '_blank')
      await expect(first).toHaveAttribute('rel', 'noopener')
      await expect(first.locator('.sr-only')).toHaveText('(opens in a new tab)')

      // Every link is https, new-tab, noopener and tall enough to tap.
      const links = rows.getByRole('link')
      const count = await links.count()
      expect(count).toBe(REAL_WORLD_USES.Roboto.length)
      for (let i = 0; i < count; i += 1) {
        const link = links.nth(i)
        expect(await link.getAttribute('href')).toMatch(/^https:\/\//)
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', 'noopener')
        const box = await link.boundingBox()
        expect(box.height, `link ${i} is shorter than 44px`).toBeGreaterThanOrEqual(44)
      }

      // Rows sit on their own hairlines with no extra gap between them: a
      // wider gap (the older `.fdx-uses` rule in type.css) leaves each hairline
      // closer to the row below than the row above.
      const a = await rows.nth(0).boundingBox()
      const b = await rows.nth(1).boundingBox()
      expect(b.y - (a.y + a.height), 'rows are spaced apart instead of stacked').toBeLessThanOrEqual(1)

      // No third-party imagery is drawn.
      expect(await section.locator('img').count(), 'a link-only list drew an image').toBe(0)

      // Nothing runs past the dialog on a phone.
      const overflow = await section.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(overflow, 'the list overflows sideways').toBeLessThanOrEqual(1)
    })

    test('the source note and the report link are under the list', async ({ page }) => {
      watch(page, 'designer who spots a wrong entry')
      const dialog = await openDossier(page, width, 'Roboto')
      const section = dialog.locator('#fgd-inuse')

      await expect(section.locator('.fdx-uses-note'))
        .toContainText('Uses are listed from Fonts In Use and from brands’ own typography pages')
      const report = section.getByRole('link', { name: 'Report a wrong or unwanted entry' })
      await expect(report).toBeVisible()
      await expect(report).toHaveAttribute('href', '/feedback')
      const box = await report.boundingBox()
      expect(box.height, 'the report link is shorter than 44px').toBeGreaterThanOrEqual(44)

      // It opens the app's feedback dialog, prefilled with the family.
      await report.click()
      const feedback = page.getByRole('dialog', { name: 'Share feedback' })
      await expect(feedback).toBeVisible()
      await expect(feedback.getByRole('textbox').first()).toBeVisible()
      expect(page.url(), 'the report link navigated away instead of opening the dialog')
        .toContain('/create/font-gallery')
    })

    test('the report link opens feedback over the dossier and hands back to it', async ({ page }) => {
      watch(page, 'keyboard user reporting an entry')
      const dialog = await openDossier(page, width, 'Roboto')
      const report = dialog.getByRole('link', { name: 'Report a wrong or unwanted entry' })
      await report.focus()
      await page.keyboard.press('Enter')

      const feedback = page.getByRole('dialog', { name: 'Share feedback' })
      await expect(feedback).toBeVisible()
      // It is drawn above the dossier, and keyboard focus is inside it.
      const above = await feedback.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + 24))
      })
      expect(above, 'the feedback dialog is under the font dialog').toBe(true)
      expect(await feedback.evaluate((el) => el.contains(document.activeElement)),
        'focus did not move into the feedback dialog').toBe(true)

      // Closing it leaves the dossier open and puts focus back on the link.
      await page.keyboard.press('Escape')
      await expect(feedback).toBeHidden()
      await expect(dialog, 'closing feedback also closed the font dialog').toBeVisible()
      await expect(report).toBeFocused()
    })

    test('a family with no documented use keeps the honest empty state', async ({ page }) => {
      watch(page, 'designer opening a family nobody has listed yet')
      const dialog = await openDossier(page, width, 'Lora')
      const section = dialog.locator('#fgd-inuse')

      await expect(section.locator('.fdx-uses')).toHaveCount(0)
      await expect(section.locator('.fdx-use-link')).toHaveCount(0)
      const empty = section.locator('.fdx-empty')
      await expect(empty).toBeVisible()
      await expect(empty.locator('.fdx-empty-head'))
        .toHaveText('We have not added any documented uses of Lora yet')
      await expect(empty).toContainText('not a statement about the typeface')
      await expect(empty.locator('.fdx-fiu'))
        .toHaveAttribute('href', 'https://fontsinuse.com/search?terms=Lora')
      // The report link belongs to a list, not to the empty state.
      await expect(section.getByRole('link', { name: 'Report a wrong or unwanted entry' })).toHaveCount(0)
    })
  })
}
