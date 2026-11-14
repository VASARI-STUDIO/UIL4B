// The preview swaps through the real palette: two different palettes give two different legends and scenes.
//
// Seen to fail (make each break, watch the named test fail, restore):
//   1  in PalettePreviewDialog.jsx derive the roles from a fixed array instead of the palette: "a different palette changes the legend colours" fails
//   2  in a scene's CSS give `.rl-btn--primary` in Ridgeline.css a fixed `background:#fff` instead of `var(--pv-*)`: "a different palette changes what the scene paints" fails
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

const TEAL = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']
const RED = ['#c8321e', '#e8a33d', '#2f6b4f', '#f1d9c4', '#4a1d1d']

async function openWith(page, colors) {
  await page.addInitScript((cols) => {
    const raw = localStorage.getItem('vs-current-design')
    const design = raw ? JSON.parse(raw) : {}
    design.palette = {
      ...(design.palette || {}),
      base: cols[0], harmony: 'auto', extraColors: [], activeIdx: 0,
      colors: cols, baseColors: cols,
      globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
    }
    localStorage.setItem('vs-current-design', JSON.stringify(design))
  }, colors)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('option', { name: /^Trail run app/ }).click()
  await expect(dialog.locator('.pvs[data-preview-scene="Trail run app"]')).toBeVisible()
  return dialog
}

const chipTitles = (dialog) => dialog.locator('.pvd-chip').evaluateAll((els) => els.map((e) => e.getAttribute('title') || e.textContent))
const paint = (dialog) => dialog.locator('.pvs[data-preview-scene="Trail run app"]').evaluate((el) => {
  const cs = getComputedStyle(el)
  return [cs.backgroundColor, cs.color, cs.getPropertyValue('--pv-accent'), cs.getPropertyValue('--pv-primary')].join('|')
})

test.describe('the preview follows the palette', () => {
  test('a different palette changes the legend colours', async ({ browser }) => {
    watch(await browser.newPage(), 'designer comparing two palettes')
    const a = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const b = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const pa = await a.newPage()
    const pb = await b.newPage()
    const dialogA = await openWith(pa, TEAL)
    const dialogB = await openWith(pb, RED)
    const titlesA = await chipTitles(dialogA)
    const titlesB = await chipTitles(dialogB)
    expect(titlesA.length, 'chips were read').toBeGreaterThan(2)
    expect(titlesA, 'the two legends differ').not.toEqual(titlesB)
    await a.close()
    await b.close()
  })

  test('a different palette changes what the scene paints', async ({ browser }) => {
    const a = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const b = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const dialogA = await openWith(await a.newPage(), TEAL)
    const dialogB = await openWith(await b.newPage(), RED)
    const accentA = await dialogA.locator('.pvs[data-preview-scene="Trail run app"] [data-role="primary"]').first().evaluate((el) => getComputedStyle(el).backgroundColor + getComputedStyle(el).color)
    const accentB = await dialogB.locator('.pvs[data-preview-scene="Trail run app"] [data-role="primary"]').first().evaluate((el) => getComputedStyle(el).backgroundColor + getComputedStyle(el).color)
    expect(accentA, 'the Primary role paints differently').not.toBe(accentB)
    await a.close()
    await b.close()
  })

  test('the same palette, light then dark, keeps the legend and changes the ground', async ({ page }) => {
    const dialog = await openWith(page, TEAL)
    const before = await paint(dialog)
    const titles = await chipTitles(dialog)
    await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect.poll(() => paint(dialog), 'the scene ground changed').not.toBe(before)
    // Every role colour is the same in dark except Neutrals, which is the theme's own ground (the surface) and so follows the theme.
    const after = await chipTitles(dialog)
    const isNeutral = (t) => /^Neutrals/.test(t)
    expect(after.filter((t) => !isNeutral(t)), 'the roles are the same in dark').toEqual(titles.filter((t) => !isNeutral(t)))
    expect(after.find(isNeutral), 'Neutrals follows the dark ground').not.toBe(titles.find(isNeutral))
  })
})
