// THE BRAND STARTER'S EXAMPLE BRIEF SITS INSIDE THE FIELD AT EVERY PHONE WIDTH.
//
// A textarea clips its placeholder rather than growing around it. The example
// brief used to be long enough to need 130px at 390 and 156px at 320 inside a
// field that is 105px tall, so the example was cut off mid-line exactly where
// it is most often read.
//
// The check lays the placeholder out in a hidden box with the field's own
// width, font and padding and compares that height with the field's visible
// height, so it holds for whatever the placeholder text and the field CSS
// become, not for one hand-copied number.
//
// MUTATION: lengthen EXAMPLE_BRIEF in src/pages/BrandStarter.jsx back to two or
// three sentences, or drop the field's min-height / rows so it gets shorter.
// The 320, 360 and 390 cases go red; the wide cases stay green.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

for (const width of [320, 360, 390, 768, 1440]) {
  test(`${width}px · Brand Starter: the whole example brief fits in the brief field`, async ({ page }) => {
    watch(page, `the Brand Starter brief field on a ${width}px screen`)
    await page.setViewportSize({ width, height: 844 })
    await go(page, '/create/auto-builder')

    const field = page.locator('#bs-brief')
    await expect(field).toBeVisible()
    const m = await field.evaluate((el) => {
      const cs = getComputedStyle(el)
      const probe = document.createElement('div')
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;'
        + `box-sizing:border-box;width:${el.clientWidth}px;font:${cs.font};line-height:${cs.lineHeight};padding:${cs.padding}`
      probe.textContent = el.placeholder
      document.body.appendChild(probe)
      const needed = probe.offsetHeight
      probe.remove()
      return { placeholder: el.placeholder, needed, visible: el.clientHeight }
    })
    expect(m.placeholder.length, 'the field has no example brief to measure').toBeGreaterThan(20)
    expect(m.needed, `the example brief needs ${m.needed}px but the field shows ${m.visible}px, so it is cut mid-line`)
      .toBeLessThanOrEqual(m.visible)
  })
}
