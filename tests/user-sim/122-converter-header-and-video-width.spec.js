// FILE CONVERTER: THE HEADER CARRIES NO STATUS TAG.
//
// The tool toolbar on /create/file-converter holds the page name and the way to
// the 3D Model Converter. A mono "Alpha" tag used to sit beside the name; the
// converter is a finished tool, so the tag was wrong, and it is gone.
//
// MUTATIONS (each makes a test below go red):
//   - FileConverter.jsx: put
//     `{ id: 'alpha', menu: false, render: () => <span className="fc-alpha">Alpha</span> }`
//     back at the top of the ToolLayout `items`
//     -> "no Alpha tag" goes red at 1440 (the tag is on screen).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'someone opening the file converter to change a file'

test.describe('File converter: the header', () => {
  for (const width of [1440, 390]) {
    test(`no Alpha tag sits in the header at ${width}px, and the name and 3D link are still there`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
      await go(page, '/create/file-converter')
      await expect(page.getByRole('heading', { name: 'File Converter', level: 1 }), 'the page name is missing').toBeVisible()

      const alphaTags = await page.locator('.fc').evaluate((root) => ({
        byClass: root.querySelectorAll('.fc-alpha').length,
        byText: [...root.querySelectorAll('*')].filter((el) => el.children.length === 0 && /^alpha$/i.test(el.textContent.trim())).length,
      }))
      expect(alphaTags, 'an Alpha tag is on the converter').toEqual({ byClass: 0, byText: 0 })

      // The 3D Model Converter link is the header's one action; losing the tag must not take it.
      const link = page.getByRole('link', { name: 'Open the 3D Model Converter' })
      if (width >= 700) await expect(link).toBeVisible()
    })
  }
})
