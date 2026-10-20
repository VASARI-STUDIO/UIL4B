// The Tint tool on a blank project: it opens on its example blue without
// touching the working design, and the first change a person makes keeps the
// eleven-stop ramp (and the colour it came from) in the working design,
// leaving the palette alone.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const working = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || 'null'))

test.describe('Tint on a blank project', () => {
  test('opening it writes nothing; changing the curve keeps the ramp, the palette is untouched', async ({ page }) => {
    watch(page, 'designer with a blank project')
    await go(page, '/create/tint')
    await expect(page.locator('.tt-cell')).toHaveCount(11)

    // Opening alone: a blank project has no colour of its own to tint from.
    const opened = await working(page)
    expect(opened?.tints?.scale ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'High contrast' }).click()
    await expect(page.getByRole('button', { name: 'High contrast' })).toHaveAttribute('aria-pressed', 'true')

    // The ramp the page shows is the ramp the project keeps (11 stops, 50 to 950).
    await expect.poll(async () => (await working(page))?.tints?.scale?.length ?? 0).toBe(11)
    const kept = await working(page)
    expect(kept.tints.scale.every((h) => /^#[0-9a-f]{6}$/i.test(h))).toBe(true)
    expect(kept.tints.from.toUpperCase()).toBe('#2563EB')
    // The tool reads the palette and never writes it.
    expect(kept.palette).toEqual(DEFAULT_DESIGN.palette)

    // It survives a reload, and the page still renders its eleven columns.
    await page.reload()
    await expect(page.locator('.tt-cell')).toHaveCount(11)
    expect((await working(page)).tints.scale).toEqual(kept.tints.scale)
  })
})
