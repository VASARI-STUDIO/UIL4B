// For launch, From Image is off the Palette Builder: no toolbar button, no Extra
// tools row, and an image pasted on the board does not open it. The sign-up line
// and the Terms agree on the age (18).
//
// To make it fail: set FROM_IMAGE_LIVE to true in src/pages/PaletteBuilder.jsx
// (the button, the Extra tools row and the paste all come back); put "16" back in
// the `legal` string in src/locales/en.json (the sign-up line and Terms disagree).
import { readFileSync } from 'node:fs'
import { test, expect } from './base.js'
import { go } from './helpers.js'
import { paletteToolbar, openPaletteTools } from './palette-helpers.js'

for (const width of [1440, 390]) {
  test(`at ${width} the Palette Builder offers no From image, on the row or in Extra tools`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/create/palette')
    const bar = paletteToolbar(page)
    await expect(bar).not.toHaveClass(/is-measuring/)
    await expect(bar.getByRole('button', { name: 'Pull colours from an image' })).toHaveCount(0)
    const panel = await openPaletteTools(page)
    await expect(panel.getByRole('button', { name: 'Reset palette', exact: true }), 'the panel is filled').toBeVisible()
    await expect(panel.getByRole('button', { name: /^From image/ })).toHaveCount(0)
  })
}

test('an image pasted on the board does not open From image', async ({ page }) => {
  await go(page, '/create/palette')
  await expect(paletteToolbar(page)).not.toHaveClass(/is-measuring/)
  const handled = await page.evaluate(() => {
    // A 1x1 PNG.
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const dt = new DataTransfer()
    dt.items.add(new File([bytes], 'swatch.png', { type: 'image/png' }))
    const e = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    document.body.dispatchEvent(e)
    return e.defaultPrevented
  })
  expect(handled, 'the board leaves the paste alone').toBe(false)
  await page.waitForTimeout(300)
  await expect(page.getByRole('dialog', { name: 'From image' })).toHaveCount(0)
})

test('the sign-up line and the Terms both say 18', async ({ page }) => {
  // The sign-up line is read from the locale files, not by walking the dialog, so
  // a change to the sign-in flow does not hide an age mismatch.
  // Every locale's line (the one with {terms} and {privacy}) names 18 and no other age.
  for (const locale of ['en', 'en-US', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']) {
    const strings = JSON.parse(readFileSync(new URL(`../../src/locales/${locale}.json`, import.meta.url), 'utf8'))
    const lines = []
    const walk = (v) => {
      if (typeof v === 'string') { if (v.includes('{terms}') && v.includes('{privacy}') && /\d/.test(v)) lines.push(v) }
      else if (v && typeof v === 'object') Object.values(v).forEach(walk)
    }
    walk(strings)
    expect(lines.length, `${locale} has the sign-up age line`).toBeGreaterThan(0)
    for (const line of lines) expect(line.match(/\d+/g), `${locale}: ${line}`).toEqual(['18'])
  }
  await go(page, '/terms')
  await expect(page.locator('main')).toContainText('You must be at least 18 years old')
})
