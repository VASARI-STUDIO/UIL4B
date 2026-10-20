// The Tint tool and the project's tints part.
//
// A blank project has no colour of its own: the tool opens on an example blue,
// and nothing the person does with that example is kept, so the project's
// Tints part stays empty (it must not read as done). Once the project has a
// palette, the tool tints from the project's active colour and keeps that ramp,
// leaving the palette alone.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { tintsFor } from '../../src/utils/projectTints.js'

const working = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || 'null'))
const PALETTE = ['#1D3557', '#E63946', '#F1FAEE', '#A8DADC', '#457B9D']

test.describe('Tint tool and the project tints part', () => {
  test('a blank project: opening and changing the example writes no ramp, the palette is untouched', async ({ page }) => {
    watch(page, 'designer with a blank project')
    await go(page, '/create/tint')
    await expect(page.locator('.tt-cell')).toHaveCount(11)

    expect((await working(page))?.tints?.scale ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'High contrast' }).click()
    await expect(page.getByRole('button', { name: 'High contrast' })).toHaveAttribute('aria-pressed', 'true')
    // Past the tool's own write delay, so a write that is going to happen has.
    await page.waitForTimeout(600)

    const after = await working(page)
    expect(after?.tints?.scale ?? [], 'a blank project must not keep a ramp made from the example colour').toHaveLength(0)
    expect(after?.tints?.from).toBeUndefined()
    expect(after?.palette ?? DEFAULT_DESIGN.palette).toEqual(DEFAULT_DESIGN.palette)

    // Still nothing after a reload, and the page still renders its eleven columns.
    await page.reload()
    await expect(page.locator('.tt-cell')).toHaveCount(11)
    await page.waitForTimeout(600)
    expect((await working(page))?.tints?.scale ?? []).toHaveLength(0)
  })

  test('a project with a palette: the ramp is kept from its active colour, the palette is untouched', async ({ page }) => {
    watch(page, 'designer with a palette')
    await page.addInitScript((colors) => {
      try {
        localStorage.setItem('vs-current-design', JSON.stringify({ palette: { base: colors[0], harmony: 'auto', colors, activeIdx: 1 } }))
      } catch { /* private mode */ }
    }, PALETTE)
    await go(page, '/create/tint')
    await expect(page.locator('.tt-cell')).toHaveCount(11)

    await expect.poll(async () => (await working(page))?.tints?.scale?.length ?? 0).toBe(11)
    const kept = await working(page)
    expect(kept.tints.scale.every((h) => /^#[0-9a-f]{6}$/i.test(h))).toBe(true)
    expect(kept.tints.from.toUpperCase()).toBe(PALETTE[1])
    // The project's own ramp (the Colour Studio's), not the page's display curve.
    expect(kept.tints.scale).toEqual(tintsFor(PALETTE[1], DEFAULT_DESIGN.tints).scale)
    // The tool writes only tints: the palette is exactly what was seeded.
    expect(kept.palette).toEqual({ base: PALETTE[0], harmony: 'auto', colors: PALETTE, activeIdx: 1 })
  })

  test('the active colour counts only the colours that are real hexes', async ({ page }) => {
    watch(page, 'designer whose palette holds a stray entry')
    const colors = ['not-a-colour', PALETTE[0], PALETTE[1]]
    await page.addInitScript((c) => {
      try {
        localStorage.setItem('vs-current-design', JSON.stringify({ palette: { base: c[1], harmony: 'auto', colors: c, activeIdx: 1 } }))
      } catch { /* private mode */ }
    }, colors)
    await go(page, '/create/tint')
    await expect(page.locator('.tt-cell')).toHaveCount(11)
    // Index 1 of the real colours is the second hex, not the second entry.
    await expect.poll(async () => (await working(page))?.tints?.from?.toUpperCase()).toBe(PALETTE[1])
  })
})
