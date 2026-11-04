// Palette Builder controls, by what a person sees on the page.
//
// The seed is a chip on the toolbar: a swatch and the hex, which opens the
// colour picker. Reading the seed reads the chip; setting it goes through the
// picker's "Colour value" field, the same way a person types one in.
import { expect } from './base.js'

export const seedChip = (page) => page.locator('.plb .plb-seedchip')

/** The seed hex as the chip shows it, e.g. "#3A7BD5". */
export const readSeed = async (page) => (await page.locator('.plb .plb-seedchip-hex').textContent()).trim()

/** Type a hex into the seed picker and apply it with Enter; the picker closes. */
export async function setSeed(page, hex) {
  await seedChip(page).click()
  const dialog = page.getByRole('dialog', { name: 'Pick seed colour' })
  await expect(dialog).toBeVisible()
  const field = dialog.getByRole('textbox', { name: 'Colour value' })
  await field.fill(hex)
  await field.press('Enter')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
}

/** The palette's toolbar (the shared ToolToolbar, inside the palette root). */
export const paletteToolbar = (page) => page.locator('.plb [data-tool-toolbar]')

/** Open the "Extra tools" overflow and return its panel (popover or phone sheet). */
export async function openPaletteTools(page) {
  const bar = paletteToolbar(page)
  await expect(bar).not.toHaveClass(/is-measuring/)
  await bar.getByRole('button', { name: 'Extra tools' }).click()
  const panel = page.getByRole('dialog', { name: 'Extra tools' })
  await expect(panel).toBeVisible()
  return panel
}

const startsWith = (label) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)

/**
 * Run an action that may be on the toolbar row or, when the row is too narrow
 * for it, in the "Extra tools" overflow. `inlineName` is the button's accessible
 * name on the row; `menuLabel` the row it becomes in the overflow.
 */
export async function clickPaletteAction(page, inlineName, menuLabel = inlineName) {
  const bar = paletteToolbar(page)
  await expect(bar).not.toHaveClass(/is-measuring/)
  const inline = bar.getByRole('button', { name: inlineName, exact: true })
  if (await inline.count() && await inline.first().isVisible()) {
    await inline.first().click()
    return
  }
  const panel = await openPaletteTools(page)
  await panel.getByRole('button', { name: startsWith(menuLabel) }).click()
}

/**
 * Open the docked Suggest panel, apply the first free variation, and click the
 * Compare button that "Your palette" shows once something is applied. Compare
 * only appears after an apply, so a person has to try a variation first.
 */
export async function openCompareFromSuggest(page) {
  await clickPaletteAction(page, 'Suggest variations')
  const panel = page.locator('.plb-sx')
  // Locked (Pro-only) rows carry no aria-pressed, so this skips them.
  const row = panel.locator('button.plb-sw-row[aria-pressed="false"]').first()
  await expect(row).toBeVisible()
  await row.click()
  const compare = panel.locator('.plb-sw-pin').getByRole('button', { name: /^Compare .* with your palette$/ })
  await expect(compare).toBeVisible()
  await compare.click()
}

/**
 * Pick a state in the preview dialog's State menu, wherever the width puts it:
 * "State" in the header from 768, the "More" sheet on a phone. The menu closes
 * on a pick, so the next call opens it again.
 */
export async function pickPreviewState(dialog, label) {
  const trigger = dialog.getByRole('button', { name: /^State\b/ })
  if (await trigger.count()) {
    await trigger.click()
    await dialog.getByRole('menuitemradio', { name: label, exact: true }).click()
    await expect(dialog.getByRole('button', { name: new RegExp(`^State\\s*${label}`) })).toBeVisible()
    return
  }
  await dialog.getByRole('button', { name: 'More', exact: true }).click()
  await dialog.getByRole('dialog', { name: 'State' }).getByRole('menuitemradio', { name: label, exact: true }).click()
  await expect(dialog.getByRole('dialog', { name: 'State' })).toHaveCount(0)
}

/**
 * The card's wordmark and number are printed on a render, so their ground is pixels. This hides each
 * one, screenshots the box it occupied, and rates its ink against the pixel with the LEAST contrast
 * behind it. Returns one ratio per printed text.
 */
export async function cardInkRatios(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.rc-base')].every((i) => i.complete && i.naturalWidth > 0))
  const out = []
  for (const sel of ['.ty-card-mark', '.ty-card-num']) {
    const el = page.locator(sel)
    await el.scrollIntoViewIfNeeded()
    const box = await el.boundingBox()
    const ink = await el.evaluate((e) => getComputedStyle(e).color)
    await el.evaluate((e) => { e.style.visibility = 'hidden' })
    const png = (await page.screenshot({ clip: box })).toString('base64')
    await el.evaluate((e) => { e.style.visibility = '' })
    const ratio = await page.evaluate(async ([b64, color]) => {
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
      const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      const [ir, ig, ib] = color.match(/[\d.]+/g).map(Number)
      const li = lum(ir, ig, ib)
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const cv = document.createElement('canvas')
      cv.width = img.width
      cv.height = img.height
      const cx = cv.getContext('2d')
      cx.drawImage(img, 0, 0)
      const px = cx.getImageData(0, 0, cv.width, cv.height).data
      let worst = Infinity
      for (let i = 0; i < px.length; i += 4) {
        const lg = lum(px[i], px[i + 1], px[i + 2])
        worst = Math.min(worst, (Math.max(li, lg) + 0.05) / (Math.min(li, lg) + 0.05))
      }
      return worst
    }, [png, ink])
    out.push({ sel, ratio: Math.round(ratio * 100) / 100 })
  }
  return out
}
