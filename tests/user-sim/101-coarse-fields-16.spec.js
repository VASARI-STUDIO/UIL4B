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

// [route, text-like controls that route shows on a touch screen once it has settled].
// The counts are hand-checked (390 and 820 agree) and are what the walk WAITS for
// before it measures: `go()` returns when the route has committed, but a field
// can mount a moment later (the icon library's search arrives with its toolbar),
// and a walk that measures at that instant sees one field fewer and fails the
// blind-walk floor below while the page is fine. A route with 0 has no field on
// a touch screen, so there is nothing to wait for. /create/gradient has two: the
// selected stop's hex field and the angle wheel's number field.
const ROUTES = [['/projects', 0], ['/create/palette', 0], ['/create/gradient', 2], ['/create/type-scale', 1],
  ['/create/tint', 1], ['/create/icons', 1], ['/create/font-gallery', 1], ['/discover/palettes', 1],
  ['/discover/prompts', 1], ['/feedback', 2], ['/create/alt-text', 1], ['/settings', 0]]
const TEXTLIKE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file])'
  + ':not([type=button]):not([type=submit]):not([type=reset]):not([type=image]):not([type=hidden]),select,textarea'

for (const width of [390, 820]) {
  test.describe(`text fields on a touch screen at ${width}`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: true, isMobile: true })

    test('every text-like control is at least 16px', async ({ page }) => {
      await signIn(page, { projects: 1 })
      const small = []
      let seen = 0
      for (const [route, expected] of ROUTES) {
        await go(page, route)
        await expect.poll(() => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length).length, TEXTLIKE), {
          message: `${route} never showed its ${expected} text field(s)`, timeout: 15000,
        }).toBeGreaterThanOrEqual(expected)
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

// The Font Gallery keeps its Preview text field inside Filters below 1440, so the
// walk above (which never opens a menu) cannot see it. Open Filters and read it.
for (const width of [390, 820]) {
  test.describe(`the Font Gallery's Filters field on a touch screen at ${width}`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: true, isMobile: true })

    test('Preview text inside Filters is at least 16px', async ({ page }) => {
      await go(page, '/create/font-gallery')
      await expect(page.locator('.fg-card').first()).toBeVisible()
      await page.getByRole('button', { name: 'Filters', exact: true }).click()
      const field = page.getByRole('dialog', { name: 'Filters' }).getByRole('textbox')
      await expect(field, 'Preview text is in the Filters panel').toBeVisible()
      const px = await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      expect(px, 'a field under 16px makes iOS zoom on focus').toBeGreaterThanOrEqual(16)
    })
  })
}
