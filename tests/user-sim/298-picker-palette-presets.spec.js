// THE COLOUR PICKER OFFERS THE PROJECT'S OWN COLOURS.
//
// Every colour picker in the app is one component. Under its recent and stock
// swatches it now lists the working design's palette ("Your palette") and its
// generated semantic colours ("Semantic"), each only when the design holds some.
// Each is a button named for where the colour came from, shown as pressed while it
// is the picker's colour, and pressing it sets the colour exactly as typing it does.
//
// Two different tools are opened (Tint, a portalled picker that is a bottom sheet on
// a phone, and Gradient, an inline one) at 390 and 1440. The grouping rules are
// asserted without a browser in tests/unit/picker-presets.test.js.
//
// MUTATIONS (each one turns a test below red):
//   the picker stops reading design.palette.colors            -> "palette presets"
//   the picker stops reading design.states                    -> "semantic presets"
//   a preset does not call the picker's colour path           -> "pressing a preset"
//   aria-pressed is dropped, or follows the wrong colour      -> "pressing a preset"
//   the "Your palette" group renders with no colours          -> "an empty palette"
//   the semantic group renders with states absent             -> "no saved semantic colours"
//   the swatch hit area drops under 44px on a phone           -> "on a phone"
//   the group row sets its own width and spills the panel     -> "stays inside the panel"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PALETTE = ['#e4572e', '#17bebb', '#ffc914']
// A Success the person chose; the untouched defaults show no Semantic group.
const STATES = { success: 0, warning: 0, error: 0, info: 0 }
const design = (over = {}) => ({
  palette: { base: PALETTE[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors: PALETTE },
  states: STATES,
  ...over,
})

const seed = (page, value) => page.addInitScript((d) => {
  try { localStorage.setItem('vs-current-design', JSON.stringify(d)) } catch { /* storage refused */ }
}, value)

const TOOLS = [
  {
    name: 'Tint',
    route: '/create/tint',
    trigger: (page) => page.getByRole('button', { name: 'Pick base colour 1', exact: true }),
  },
  {
    name: 'Gradient',
    route: '/create/gradient',
    trigger: (page) => page.locator('.cpk-trigger').first(),
  },
]
const WIDTHS = [[390, 844], [1440, 900]]

const open = async (page, tool, width, height, value) => {
  await page.setViewportSize({ width, height })
  await seed(page, value)
  await go(page, tool.route)
  const trigger = tool.trigger(page)
  await trigger.click()
  const panel = page.locator('.cpk-pop')
  await expect(panel).toBeVisible()
  return { trigger, panel }
}

// The colour a trigger shows: the picker's own chip, or the chip a tool passes
// in (the Gradient stop swatch), else the trigger's own fill.
const shownColour = (trigger) => trigger.evaluate((el) => {
  const chip = el.querySelector('.cpk-trigger-chip, .grd-stop-chip')
  return getComputedStyle(chip || el).backgroundColor
})

for (const tool of TOOLS) {
  for (const [width, height] of WIDTHS) {
    test.describe(`${tool.name} picker at ${width}px`, () => {
      test.beforeEach(async ({ page }) => { watch(page, 'someone choosing a colour from their project') })

      test('palette presets and semantic presets are listed with their names', async ({ page }) => {
        const { panel } = await open(page, tool, width, height, design())

        await expect(panel.getByText('Your palette', { exact: true })).toBeVisible()
        const palette = panel.getByRole('group', { name: 'Your palette' })
        await expect(palette.getByRole('button')).toHaveCount(3)
        for (const hex of PALETTE) {
          await expect(palette.getByRole('button', { name: `Use ${hex.toUpperCase()} from your palette`, exact: true })).toBeVisible()
        }

        await expect(panel.getByText('Semantic', { exact: true })).toBeVisible()
        const semantic = panel.getByRole('group', { name: 'Semantic' })
        await expect(semantic.getByRole('button')).toHaveCount(4)
        for (const name of ['Use Success, #10B981', 'Use Warning, #F59E0B', 'Use Error, #EF4444', 'Use Information, #3B82F6']) {
          await expect(semantic.getByRole('button', { name, exact: true })).toBeVisible()
        }
      })

      test('pressing a preset applies the colour and marks only that one pressed', async ({ page }) => {
        const { trigger, panel } = await open(page, tool, width, height, design())
        const mine = panel.getByRole('button', { name: 'Use #17BEBB from your palette', exact: true })
        const success = panel.getByRole('button', { name: 'Use Success, #10B981', exact: true })

        await expect(mine).toHaveAttribute('aria-pressed', 'false')
        await mine.click()
        await expect(mine).toHaveAttribute('aria-pressed', 'true')
        await expect(panel.locator('.cpk-hex')).toHaveValue('#17bebb')
        await expect.poll(() => shownColour(trigger)).toBe('rgb(23, 190, 187)')

        await success.click()
        await expect(success).toHaveAttribute('aria-pressed', 'true')
        await expect(mine).toHaveAttribute('aria-pressed', 'false')
        await expect(panel.locator('.cpk-hex')).toHaveValue('#10b981')
        await expect.poll(() => shownColour(trigger)).toBe('rgb(16, 185, 129)')
      })

      test('an empty palette shows no "Your palette" group', async ({ page }) => {
        const { panel } = await open(page, tool, width, height, design({
          palette: { base: PALETTE[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors: [] },
        }))
        await expect(panel.getByText('Semantic', { exact: true })).toBeVisible()
        await expect(panel.getByText('Your palette', { exact: true })).toHaveCount(0)
        await expect(panel.getByRole('button', { name: /from your palette/ })).toHaveCount(0)
      })

      test('no saved semantic colours shows no "Semantic" group', async ({ page }) => {
        const { panel } = await open(page, tool, width, height, design({ states: null }))
        await expect(panel.getByText('Your palette', { exact: true })).toBeVisible()
        await expect(panel.getByText('Semantic', { exact: true })).toHaveCount(0)
      })

      test('the preset rows stay inside the panel', async ({ page }) => {
        const { panel } = await open(page, tool, width, height, design())
        await expect(panel.getByRole('group', { name: 'Semantic' })).toBeVisible()
        const fit = await page.evaluate(() => {
          const pop = document.querySelector('.cpk-pop')
          const box = pop.getBoundingClientRect()
          const out = [...pop.querySelectorAll('.cpk-preset')].filter((b) => {
            const r = b.getBoundingClientRect()
            return r.left < box.left - 0.5 || r.right > box.right + 0.5
          }).length
          return {
            out,
            panelSpill: pop.scrollWidth - pop.clientWidth,
            pageSpill: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        })
        expect(fit.out).toBe(0)
        expect(fit.panelSpill).toBeLessThanOrEqual(1)
        expect(fit.pageSpill).toBeLessThanOrEqual(0)
      })
    })
  }

  test(`${tool.name} preset buttons are 44px targets on a phone`, async ({ page }) => {
    watch(page, 'someone choosing a colour on a phone')
    const { panel } = await open(page, tool, 390, 844, design())
    const buttons = panel.locator('.cpk-preset')
    const count = await buttons.count()
    expect(count).toBe(7)
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(43.5)
      expect(box.height).toBeGreaterThanOrEqual(43.5)
    }
  })
}
