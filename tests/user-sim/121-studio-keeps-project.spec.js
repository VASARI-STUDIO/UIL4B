// The Colour Studio opens on a project without rewriting what it already holds.
//
// Its first palette write is skipped when it would only restate the project's
// own colours (a write adds the studio's own bookkeeping to a palette nothing
// changed), and its first tints write happens only for a project with no ramp
// or one recorded as made from another colour. The same colour gives the same
// ramp here as in the Tint tool, so a stale one is re-made to exactly that.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { tintsFor } from '../../src/utils/projectTints.js'

const working = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || 'null'))
const PALETTE = ['#1D3557', '#E63946', '#F1FAEE', '#A8DADC', '#457B9D']
const SETTINGS = { lumBias: 82, satDecay: 12, oled: true }
const KEPT = ['#FDF2F3', '#F9DFE1', '#F2BEC2', '#EB9CA3', '#E87B84', '#E63946', '#C42F3B', '#9D262F', '#751C23', '#4D1218', '#2A0A0D']

async function openStudioWith(page, tints) {
  await page.addInitScript(({ colors, tints: t }) => {
    try {
      localStorage.setItem('vs-current-design', JSON.stringify({
        palette: { base: colors[0], harmony: 'auto', colors, extraColors: [], activeIdx: 1 },
        tints: t,
      }))
    } catch { /* private mode */ }
  }, { colors: PALETTE, tints })
  await go(page, '/create/semantic-color')
  // Past the first effects, so a write that is going to happen has.
  await page.waitForTimeout(800)
}

test.describe('Colour Studio on an existing project', () => {
  test('a project whose ramp is current keeps it, and its palette is not restated', async ({ page }) => {
    watch(page, 'designer reopening a finished project')
    await openStudioWith(page, { ...SETTINGS, scale: KEPT, from: PALETTE[1] })
    const design = await working(page)
    expect(design.tints.scale).toEqual(KEPT)
    expect(design.palette.colors).toEqual(PALETTE)
    expect(design.palette.locked, 'the studio wrote its bookkeeping into a palette nothing changed').toBeUndefined()
  })

  test('a ramp made from another colour is re-made from the active colour, the way the Tint tool makes it', async ({ page }) => {
    watch(page, 'designer whose palette changed since the ramp was made')
    await openStudioWith(page, { ...SETTINGS, scale: KEPT, from: '#FF0000' })
    await expect.poll(async () => (await working(page))?.tints?.from?.toUpperCase()).toBe(PALETTE[1])
    const design = await working(page)
    expect(design.tints.scale).toEqual(tintsFor(PALETTE[1], SETTINGS).scale)
    expect(design.palette.colors).toEqual(PALETTE)
  })
})
