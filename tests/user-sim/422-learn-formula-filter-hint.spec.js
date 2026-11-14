// Two accessibility fixes from the axe sweep, checked on the rendered pages.
//
//   1  A Learn formula block that scrolls sideways on a phone takes keyboard focus and is named by its caption,
//      so a keyboard can scroll it and a screen reader says what it is.
//   2  The "Shift-click to combine types" hint under a library filter is drawn in --t2, not the fainter --t3.
//
// MUTATION (make the change, the named test goes red, put it back):
//   src/components/LearnParts.jsx Formula: drop tabIndex={0} from the <pre>     -> "390px: a formula that scrolls ..."
//   the same <pre>: drop aria-labelledby                                       -> the same test (no name)
//   src/styles/deferred/tool-shell.css .lbry-filter-hint: color back to var(--t3) -> "1440px: the filter hint ..."
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

test('390px: a formula that scrolls sideways takes focus and is named by its caption', async ({ page }) => {
  watch(page, 'a phone reader using the keyboard on a Learn article')
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/learn/type-scales')

  const pre = page.locator('#two-scales .lart-formula pre')
  await expect(pre).toHaveCount(1)
  const box = await pre.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
  expect(box.scroll, 'the formula no longer overflows at 390px; this check is moot').toBeGreaterThan(box.client)

  await expect(pre).toHaveAttribute('tabindex', '0')
  await expect(pre).toHaveAccessibleName(/fluidClamp\(\)/)

  await pre.focus()
  await expect(pre).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => pre.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
})

test('1440px: the filter hint is drawn in --t2', async ({ page }) => {
  watch(page, 'someone combining gradient types with the mouse')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/discover/gradients')

  const hint = page.locator('.lbry-filter-hint').first()
  await expect(hint).toBeVisible()
  const { got, want } = await hint.evaluate((el) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--t2)'
    el.parentElement.appendChild(probe)
    const want = getComputedStyle(probe).color
    probe.remove()
    return { got: getComputedStyle(el).color, want }
  })
  expect(got).toBe(want)
})
