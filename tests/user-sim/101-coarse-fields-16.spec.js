// iOS ZOOMS THE PAGE WHEN A FOCUSED FIELD IS UNDER 16px.
//
// The old floor was one element rule under max-width:640px: it missed
// type=search and typeless inputs, lost to any two-class component selector,
// and stopped at 640px, so the audit measured 31 fields under 16px at 320-390
// and 43 at 768/844. The floor is now a pointer:coarse rule every text-like
// control must obey. This walks the routes that carry fields and reads the
// computed size of every one that renders, on a touch viewport, at 390 and 820.
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'

const ROUTES = ['/projects', '/create/palette', '/create/gradient', '/create/type-scale', '/create/tint',
  '/create/icons', '/create/font-gallery', '/discover/palettes', '/discover/prompts', '/feedback', '/create/alt-text', '/settings']
const TEXTLIKE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file])'
  + ':not([type=button]):not([type=submit]):not([type=reset]):not([type=image]):not([type=hidden]),select,textarea'

for (const width of [390, 820]) {
  test.describe(`text fields on a touch screen at ${width}`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: true, isMobile: true })

    test('every text-like control is at least 16px', async ({ page }) => {
      await signIn(page, { projects: 1 })
      const small = []
      let seen = 0
      for (const route of ROUTES) {
        await go(page, route)
        const rows = await page.evaluate((sel) => [...document.querySelectorAll(sel)]
          .filter((el) => el.getClientRects().length)
          .map((el) => ({ sig: `${el.tagName.toLowerCase()}[${el.type || ''}].${String(el.className).split(' ')[0]}`, px: parseFloat(getComputedStyle(el).fontSize) })), TEXTLIKE)
        seen += rows.length
        for (const r of rows) if (r.px < 16) small.push(`${route} ${r.sig} ${r.px}px`)
      }
      // POSITIVE CONTROL: the walk really found fields, so an empty list means something.
      expect(seen, 'no text fields were found on any route — the walk is blind').toBeGreaterThan(10)
      expect(small, 'fields that make iOS zoom on focus').toEqual([])
    })
  })
}
