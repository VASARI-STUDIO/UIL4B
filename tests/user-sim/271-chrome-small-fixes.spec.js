// SPEC 271: FOUR SMALL FIXES TO THE SHARED CHROME.
//
//   1. The floating Feedback button is not drawn below 768px, for any pointer;
//      the footer link and the right-click menu still reach the form at 390.
//
// MUTATIONS (each should turn the named test red):
//   - global.css: drop `(max-width:767px)` from the `.global-feedback-btn`
//     hide rule: "the floating Feedback button is not drawn at 390 or 767"
//     fails on the mouse window (a phone's coarse pointer already hid it);
//   - global.css: make the hide rule `(max-width:700px)`: the 767 case fails;
//   - global.css: hide the button at every width: "the floating Feedback button
//     is still there from 768" fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// A route inside the app shell that has both the floating button (above 767)
// and the site footer.
const SHELL_ROUTE = '/learn/help'

// A point whose ancestors are plain, so the right-click menu has no reason to
// yield to the browser's own.
async function plainPoint(page) {
  return page.evaluate(() => {
    const bad = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'A', 'IMG', 'VIDEO', 'AUDIO',
      'CANVAS', 'EMBED', 'OBJECT', 'IFRAME', 'BUTTON', 'OPTION'])
    const { innerWidth: w, innerHeight: h } = window
    for (let y = Math.round(h * 0.25); y < h * 0.8; y += 30) {
      for (let x = Math.round(w * 0.15); x < w * 0.85; x += 40) {
        const el = document.elementFromPoint(x, y)
        if (!el) continue
        let n = el
        let ok = true
        for (let i = 0; i < 8 && n; i += 1) {
          if (bad.has(n.tagName) || n.isContentEditable || n.dataset?.feedbackSurface != null) { ok = false; break }
          n = n.parentElement
        }
        if (ok) return { x, y }
      }
    }
    return null
  })
}

test.describe('1 · the floating Feedback button on a narrow mouse window', () => {
  for (const width of [390, 767]) {
    test(`the floating Feedback button is not drawn at ${width}px`, async ({ page }) => {
      watch(page, 'someone reading with a narrow desktop window')
      await page.setViewportSize({ width, height: 900 })
      await go(page, SHELL_ROUTE)
      await expect(page.locator('.global-feedback-btn'), `the button must be hidden at ${width}px`).toBeHidden()
    })
  }

  for (const width of [768, 1440]) {
    test(`the floating Feedback button is still there from ${width}px`, async ({ page }) => {
      watch(page, 'someone on a tablet or desktop')
      await page.setViewportSize({ width, height: 900 })
      await go(page, SHELL_ROUTE)
      await expect(page.locator('.global-feedback-btn'), `the button must be drawn at ${width}px`).toBeVisible()
    })
  }

  test('at 390 the footer link and the right-click menu still reach the form', async ({ page }) => {
    watch(page, 'someone with a narrow window who wants to send feedback')
    await page.setViewportSize({ width: 390, height: 900 })
    await go(page, SHELL_ROUTE)

    // The right-click menu opens the feedback dialog.
    const at = await plainPoint(page)
    expect(at, 'a plain surface to right-click on').not.toBeNull()
    await page.mouse.click(at.x, at.y, { button: 'right' })
    await page.getByRole('button', { name: 'Share feedback on this' }).click()
    const dialog = page.getByRole('dialog', { name: 'Share feedback' })
    await expect(dialog, 'the right-click menu opens the feedback dialog').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    // The footer's "Send feedback" link goes to the feedback page, which holds the form.
    const link = page.locator('.app-footer').getByRole('link', { name: 'Send feedback' })
    await link.scrollIntoViewIfNeeded()
    await link.click()
    await expect(page).toHaveURL(/\/feedback$/)
    await expect(page.getByRole('textbox').first(), 'the feedback page shows its form').toBeVisible()
  })
})
