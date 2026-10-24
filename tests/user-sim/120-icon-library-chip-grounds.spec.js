// TWO GROUNDS IN THE ICON LIBRARY THAT MUST NOT PAINT A BOX.
//
// 1. The Recent rail's icons sit straight on the page: the item keeps its
//    hairline border and its hover ground, but at rest it has no fill of its own
//    (a fill read as a white square behind the glyph in the light theme).
// 2. A group drawn in one style states that value without a raised weight pill.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

/** Alpha channel of a computed CSS colour, whatever colour space it came back in. */
function alphaOf(css) {
  if (css === 'transparent') return 0
  const slash = css.match(/\/\s*([\d.]+)(%?)\s*\)/)
  if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1)
  const rgba = css.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/)
  if (rgba) return Number(rgba[1])
  if (/^(rgb|color|oklab|oklch|lab|lch|hsl)\(/.test(css)) return 1
  throw new Error(`unparseable colour: ${css}`)
}

// A REAL cell, not the loading skeleton (see 96-icon-weights.spec.js).
const REAL_CELL = '.ig .ic:not(.ig-skel)'

// Seeding the theme before the first paint leaves no colour transition in flight
// to read through.
async function openIcons(browser, theme, width) {
  const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('vs-t', t)
      localStorage.setItem('vs-recent-icons', JSON.stringify([
        { key: 'lucide:zap', action: 'copy', ts: Date.now(), cdn: true, pack: 'lucide', name: 'zap' },
      ]))
    } catch { /* a blocked store is the app's problem to survive, not ours */ }
  }, theme)
  const page = await ctx.newPage()
  watch(page, `someone reading the Recent rail in the ${theme} theme at ${width}px`)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })
  return { ctx, page }
}

test.describe('the icon library draws no box where none is meant', () => {
  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      test(`a Recent rail item has no fill of its own in ${theme} at ${width}px`, async ({ browser }) => {
        const { ctx, page } = await openIcons(browser, theme, width)
        const item = page.locator('.ig-rail-item').first()
        await expect(item, 'the Recent rail is on screen').toBeVisible({ timeout: 20000 })

        const rest = await item.evaluate((el) => {
          const css = getComputedStyle(el)
          return { background: css.backgroundColor, border: css.borderTopWidth, borderColor: css.borderTopColor }
        })
        expect(alphaOf(rest.background), `the rail item paints ${rest.background}`).toBe(0)
        // The hairline stays: it is what says "this is a button".
        expect(rest.border).toBe('1px')
        expect(alphaOf(rest.borderColor), 'the rail item lost its hairline').toBeGreaterThan(0)

        // The hover ground stays too (a pointer-less phone has no hover to read).
        if (width === 1440) {
          await item.hover()
          await expect.poll(async () => alphaOf(await item.evaluate((el) => getComputedStyle(el).backgroundColor)),
            { timeout: 5000, message: 'a hovered rail item has no ground' }).toBeGreaterThan(0)
        }
        await ctx.close()
      })
    }
  }

  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      test(`Flags shows its single style without a pill in ${theme} at ${width}px`, async ({ browser }) => {
        const { ctx, page } = await openIcons(browser, theme, width)

        const filters = page.getByRole('button', { name: /^Filters\b/ })
        const sheet = page.getByRole('dialog', { name: 'Filters' })
        const inPanel = await filters.isVisible()
        if (inPanel) await filters.click()
        const flags = page.getByRole('button', { name: 'Flags', exact: true })
        if (!await flags.isVisible()) await page.getByRole('button', { name: /^Group\b/ }).click()
        await flags.click()
        if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click()
        else if (inPanel) await filters.click()
        await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20000 })

        const seg = width === 390
          ? page.locator('.lbry-toolbar-quick .ig-weight')
          : page.getByRole('group', { name: 'Icon weight' })
        await expect(seg.locator('.ig-weight-btn')).toHaveCount(0)
        const status = seg.getByRole('status')
        await expect(status).toHaveText('Flags come in one style')
        await expect(status).toHaveCSS('text-decoration-line', 'none')
        const paint = await status.evaluate((el) => {
          const css = getComputedStyle(el)
          return { background: css.backgroundColor, shadow: css.boxShadow }
        })
        expect(alphaOf(paint.background), `the style text paints ${paint.background}`).toBe(0)
        expect(paint.shadow, 'the style text keeps a pill shadow').toBe('none')
        await ctx.close()
      })
    }
  }
})
