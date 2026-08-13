// Two accessibility failures from docs/audit-2026-08-11.md, both verified in a
// real browser before and after.
//
// P2 — /feedback. Four surfaces across the app point here as THE way to report
// a problem (five now, counting the new 404), so it is the last place that
// should be hard to use. Measured on the rendered page: ZERO <label> elements.
// The three `.seg-label` divs look like labels and are not, so neither the
// subject nor the message had an accessible name — a screen-reader user met two
// unnamed fields with only a placeholder, which is not a name and vanishes the
// moment you type. The four type buttons carried no role and no aria-checked,
// so which one was selected lived in a CSS class and nowhere else (1.4.1).
//
// P3 — Focus rings on controls that sit ON a user-chosen colour. Measured
// against the live swatches: `button.plb-tool` at 1.33:1 and `.plb-ramp-bar` at
// 1.80:1, against the 3:1 that 1.4.11 requires. Structural rather than a bad
// colour choice — the background is whatever the user picked, so no single
// accent passes against all of it.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

/** WCAG relative luminance contrast, computed in the page. */
const CONTRAST_FN = `
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4) }
  const lum = (s) => { const m = (s||'').match(/[\\d.]+/g); if(!m) return 0
    return 0.2126*srgb(+m[0])+0.7152*srgb(+m[1])+0.0722*srgb(+m[2]) }
  const ratio = (a,b) => { const [hi,lo] = [lum(a),lum(b)].sort((p,q)=>q-p)
    return +((hi+0.05)/(lo+0.05)).toFixed(2) }
`

test.describe('feedback form is usable and honest', () => {
  test('both fields have a real accessible name', async ({ page }) => {
    watch(page, 'a screen-reader user reporting a bug')
    await go(page, '/feedback')

    // getByLabel resolves through the accessibility tree, so this passes only
    // if the association is real — a placeholder cannot satisfy it.
    await expect(page.getByLabel('Subject')).toBeVisible()
    await expect(page.getByLabel('Message')).toBeVisible()

    const labels = await page.locator('form label').count()
    expect(labels, 'the .seg-label divs must be real <label> elements').toBeGreaterThanOrEqual(2)
  })

  test('the type choice announces which option is selected', async ({ page }) => {
    watch(page, 'a keyboard user choosing a feedback type')
    await go(page, '/feedback')

    const group = page.getByRole('radiogroup')
    await expect(group).toBeVisible()
    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(4)

    // Exactly one checked, and it is conveyed in the tree rather than only by a
    // CSS class.
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)

    // Arrow keys move within the group — a radiogroup is one tab stop.
    const first = radios.first()
    await first.focus()
    await first.press('ArrowRight')
    await expect(radios.nth(1)).toBeFocused()
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')
    await expect(radios.first()).toHaveAttribute('aria-checked', 'false')
  })

  test('an empty submit explains itself, on the field, and moves focus there', async ({ page }) => {
    watch(page, 'a visitor submitting the form before typing anything')
    await go(page, '/feedback')

    await page.locator('.fb-submit').click()

    const message = page.getByLabel('Message')
    // A toast alone was the old behaviour: transient, unattached to the field,
    // and gone before a slow reader reaches it.
    await expect(message).toHaveAttribute('aria-invalid', 'true')
    const error = page.locator('#fb-error')
    await expect(error).toBeVisible()
    await expect(error).toHaveAttribute('role', 'alert')
    await expect(message, 'focus moves to the field that needs fixing').toBeFocused()
    // The error must be reachable FROM the field, not merely nearby.
    await expect(message).toHaveAttribute('aria-describedby', 'fb-error')
  })

  test('typing clears the error rather than leaving a stale one', async ({ page }) => {
    watch(page, 'a visitor correcting an empty submission')
    await go(page, '/feedback')

    await page.locator('.fb-submit').click()
    await expect(page.locator('#fb-error')).toBeVisible()

    await page.getByLabel('Message').fill('The palette tools are unreachable on my phone.')
    await expect(page.locator('#fb-error')).toHaveCount(0)
    await expect(page.getByLabel('Message')).toHaveAttribute('aria-invalid', 'false')
  })

  test('a failed send never claims success', async ({ page }) => {
    // The most important property of a feedback channel: a silently-lost
    // support request is the worst possible failure. /api/* does not exist
    // under `vite preview`, so this exercises the real failure path.
    watch(page, 'a visitor whose submission does not reach the server')
    await go(page, '/feedback')

    await page.getByLabel('Message').fill('Testing the failure path.')
    await page.locator('.fb-submit').click()

    // The success panel must NOT appear.
    await expect(page.locator('.fb-done')).toHaveCount(0)
    await expect(page.locator('#fb-error')).toBeVisible()
    // And the form is still there with the text intact, so nothing is lost.
    await expect(page.getByLabel('Message')).toHaveValue('Testing the failure path.')
  })
})

test.describe('focus is visible on controls sitting on a user-chosen colour', () => {
  test('every palette control clears 3:1 on at least one ring edge', async ({ page }) => {
    watch(page, 'a keyboard user editing a palette')
    await go(page, '/color/palette')
    await expect(page.locator('button.plb-tool').first()).toBeVisible()

    const result = await page.evaluate(`(() => {
      ${CONTRAST_FN}
      const bgOf = (el) => {
        let n = el
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
          n = n.parentElement
        }
        return 'rgb(255,255,255)'
      }
      const bad = []
      let checked = 0
      for (const el of document.querySelectorAll('button.plb-tool, .plb-ramp-bar')) {
        el.focus()
        if (!el.matches(':focus-visible')) continue
        checked++
        const cs = getComputedStyle(el)
        const bg = bgOf(el)
        const inner = ratio(cs.outlineColor, bg)
        const outerCol = (cs.boxShadow.match(/rgba?\\([^)]+\\)/) || ['rgb(10,10,11)'])[0]
        const outer = ratio(outerCol, bg)
        // 1.4.11 needs ONE edge of the indicator to reach 3:1 against what it
        // sits on. A dual ring works precisely because every colour is far from
        // at least one of white and near-black.
        if (Math.max(inner, outer) < 3) bad.push({ bg, inner, outer })
      }
      return { checked, bad }
    })()`)

    expect(result.checked, 'the palette controls are keyboard-focusable').toBeGreaterThan(10)
    expect(result.bad, `controls whose focus ring is invisible on their own swatch:\n${JSON.stringify(result.bad, null, 2)}`).toEqual([])
  })

  test('the ring is a dual ring, not a single accent that happens to pass here', async ({ page }) => {
    // The seed colour is user-chosen, so a single-colour ring that passes
    // against today's default is luck rather than a fix.
    watch(page, 'a keyboard user on a palette')
    await go(page, '/color/palette')
    const el = page.locator('button.plb-tool').first()
    await el.focus()

    const ring = await el.evaluate((n) => {
      const cs = getComputedStyle(n)
      return { outline: cs.outlineColor, shadow: cs.boxShadow }
    })
    expect(ring.outline, 'the inner ring is white').toMatch(/255,\s*255,\s*255/)
    expect(ring.shadow, 'a dark outer ring backs it').not.toBe('none')
  })
})
