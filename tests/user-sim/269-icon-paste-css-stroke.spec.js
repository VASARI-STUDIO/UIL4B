// A pasted icon that sets its stroke in CSS can have its stroke edited, from the page:
//   - an icon whose stroke is in a style attribute, or in a <style> rule on a class, opens with the
//     Stroke control, as one that sets it in attributes does;
//   - moving the Stroke slider changes the stroke-width the written SVG carries;
//   - the written SVG carries no style, class or <style>: the CSS became plain attributes.
//
// The conversion and its refusals are pinned without a browser in tests/unit/svg-sanitise.test.js.
// What only a browser settles is that the paste path hands the converted markup to the editor.
//
// Seen to fail: with the style / class / <style> branch in src/utils/svgSanitise.js cleanElement()
// dropping those as before, the pasted icon opens with no Stroke control.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'a designer pasting an icon that sets its stroke in CSS'

const BOLT = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z'
const INLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill:none;stroke:#000;stroke-width:2;stroke-linecap:round" d="${BOLT}"/></svg>`
const SHEET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.a{fill:none;stroke:currentColor;stroke-width:1.5}</style></defs><path class="a" d="${BOLT}"/></svg>`

const code = (page) => page.locator('#ied-code code')

async function paste(page, markup) {
  watch(page, PERSONA)
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await page.locator('.ig-toolbar button.ig-mine').click()
  await page.locator('.ig-addbtn').first().click()
  await page.getByRole('textbox', { name: 'SVG markup' }).fill(markup)
  await page.getByRole('button', { name: 'Add to stage' }).click()
  await expect(page.locator('.ied-ground')).toBeVisible()
  const disc = page.locator('#ied-sec-code .ied-disc')
  if ((await disc.getAttribute('aria-expanded')) !== 'true') await disc.click()
  await expect(code(page)).toContainText('M13 2')
}

const widths = async (page) => [...(await code(page).innerText()).matchAll(/stroke-width="([^"]+)"/g)].map((m) => m[1])

for (const [label, markup] of [['a style attribute', INLINE], ['a <style> rule on a class', SHEET]]) {
  test(`an icon with its stroke in ${label} gets the Stroke control, and the slider edits it`, async ({ page }) => {
    await paste(page, markup)
    const stroke = page.locator('#ied-sec-stroke')
    await expect(stroke, 'no Stroke control for a CSS-stroked icon').toBeVisible()

    const text = await code(page).innerText()
    expect(text, 'the written SVG still carries CSS').not.toMatch(/\sstyle=|\sclass=|<style/)
    expect(text).toContain('stroke=')

    const before = await widths(page)
    expect(before.length, 'the written SVG has no stroke-width').toBeGreaterThan(0)
    const slider = stroke.getByRole('slider').first()
    await slider.focus()
    await slider.press('ArrowRight')
    await slider.press('ArrowRight')
    await expect.poll(() => widths(page), { message: 'the slider did not change the stroke-width' }).not.toEqual(before)
  })
}
