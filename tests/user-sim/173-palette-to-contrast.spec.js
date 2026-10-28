// PALETTE BUILDER TO CONTRAST CHECKER, the hand-off (slice 3, part A).
//
// The checker opens on a pair taken from the palette, the pair travels in the
// address, and the toolbar names the way back. Part B (the "Your palette" strip
// and the palette-painted previews) has its own tests.
//
//   P1  Extra tools > Check contrast opens the palette's reading pair, not the default grey
//       (and a column's "Check contrast" opens that colour, paired by what it is)
//   P3  Back to palette returns to the same colours, locks and system
//   P4  a reload of the hand-off address keeps the pair and the back link
//       (and a role outside the list, or a `from` that is not "palette", is ignored)
//   P6  a direct visit shows no back link and keeps the default pair
//       (and Copy link never writes `from` or the roles)
//
// The palette is seeded by hand, and every expected pair below is worked out from
// it with the CIE L* formula, never read back from the page:
//
//   #1E3A8A  Primary    L* 27.1   dark, under the 30 line for body text
//   #F59E0B  Secondary  L* 72.2   light; white on it is 2.15:1, near black on it is 9.11:1
//   #0F766E  Accent     L* 44.5
//   #F7F7F4  Subtle     L* 97.2   lighter than 95, so it is the page ground
//   #0B1220  Deep       L* 5.5    the darkest colour
//
//   reading pair        #0B1220 on #F7F7F4   (deep on subtle)
//   Primary's column    #1E3A8A on #F7F7F4   (a dark colour is checked as text)
//   Secondary's column  #0B0C0E on #F59E0B   (a light colour is a fill; white fails 3:1)
//
// MUTATIONS (each turns the tests named red):
//   readingPair returns the default grey and white                 -> "P1 Extra tools"
//   the Extra tools item still calls navigate('/create/contrast')  -> "P1 Extra tools", "P4"
//   columnPair swaps fg and bg for a light colour                  -> "P1 a column"
//   DARK_COLUMN_BELOW raised to 80 (Secondary becomes text)        -> "P1 a column"
//   the column menu item left out of the Colour actions menu       -> "P1 a column"
//   openInContrast writes locked: [] to the palette                -> "P3"
//   the back link's `to` changed to /projects                      -> "P3"
//   the back link shown whatever `from` says                       -> "P6", "P4 an unknown role"
//   the hand-off kept in colorHandoff memory instead of the URL    -> "P4 a reload"
//   parseHandoff accepts any role string                           -> "P4 an unknown role"
//   linkText adds &from=palette                                    -> "P6 Copy link"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { openPaletteTools } from './palette-helpers.js'

const PALETTE = ['#1E3A8A', '#F59E0B', '#0F766E', '#F7F7F4', '#0B1220']

const seed = (page, { harmony = 'auto', locked = [] } = {}) => page.addInitScript((d) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: d.palette[0], harmony: d.harmony, extraColors: [], locked: d.locked, activeIdx: 0, colors: d.palette },
  }))
}, { palette: PALETTE, harmony, locked })

const fgField = (page) => page.locator('#cc-fg')
const bgField = (page) => page.locator('#cc-bg')
const backLink = (page) => page.getByRole('link', { name: 'Back to palette' })
const root = (page) => page.locator('.cc')

async function openBoard(page, opts) {
  await seed(page, opts)
  await go(page, '/create/palette')
  await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)
}

async function checkFromExtraTools(page) {
  const panel = await openPaletteTools(page)
  await panel.getByRole('menuitem', { name: 'Check contrast' }).or(panel.getByRole('button', { name: 'Check contrast' })).first().click()
  await expect(page).toHaveURL(/\/create\/contrast\?/)
  await expect(fgField(page)).toBeVisible()
}

const query = (page) => Object.fromEntries(new URL(page.url()).searchParams)

test.describe('Palette Builder to Contrast Checker', () => {
  test('P1 Extra tools > Check contrast opens the palette\'s reading pair, not the default grey', async ({ page }) => {
    watch(page, 'a designer checking whether their palette reads')
    await openBoard(page)
    await checkFromExtraTools(page)

    expect(query(page)).toEqual({ fg: '0B1220', bg: 'F7F7F4', from: 'palette', fgRole: 'deep', bgRole: 'subtle' })
    await expect(fgField(page)).toHaveValue('#0B1220')
    await expect(bgField(page)).toHaveValue('#F7F7F4')
    // The default pair is 4.83:1; this one is far higher, so a fallback to it would show here too.
    await expect(page.locator('.cc-ratio-num')).not.toHaveText('4.83:1')
    await expect(root(page)).toHaveAttribute('data-from', 'palette')
    await expect(root(page)).toHaveAttribute('data-fg-role', 'deep')
    await expect(root(page)).toHaveAttribute('data-bg-role', 'subtle')
  })

  test('P1 a column\'s Check contrast opens that colour, paired by what it is', async ({ page }) => {
    watch(page, 'a designer asking whether one brand colour works as text or as a button')
    await openBoard(page)

    const openColumnMenu = async (name) => {
      const col = page.getByRole('group', { name: new RegExp(`^${name} #`, 'i') })
      await col.hover()
      await col.getByRole('button', { name: `More actions for ${name}` }).click()
      await page.getByRole('menu', { name: 'Colour actions' }).getByRole('menuitem', { name: 'Check contrast' }).click()
      await expect(page).toHaveURL(/\/create\/contrast\?/)
    }

    // A dark colour is text on the page ground.
    await openColumnMenu('PRIMARY')
    expect(query(page)).toEqual({ fg: '1E3A8A', bg: 'F7F7F4', from: 'palette', fgRole: 'primary', bgRole: 'subtle' })
    await expect(fgField(page)).toHaveValue('#1E3A8A')
    await expect(bgField(page)).toHaveValue('#F7F7F4')

    // A light colour is a fill. White on it is 2.15:1, so the label is near black.
    await page.goBack()
    await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)
    await openColumnMenu('SECONDARY')
    expect(query(page)).toEqual({ fg: '0B0C0E', bg: 'F59E0B', from: 'palette', fgRole: 'near-black', bgRole: 'secondary' })
    await expect(fgField(page)).toHaveValue('#0B0C0E')
    await expect(bgField(page)).toHaveValue('#F59E0B')
  })

  test('P3 Back to palette returns to the same colours, locks and system', async ({ page }) => {
    watch(page, 'a designer checking a palette and going back to keep editing it')
    await openBoard(page, { harmony: 'monochromatic', locked: [1, 3] })

    const saved = () => page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('vs-current-design') || 'null')?.palette || {}
      return { colors: (p.colors || []).map((c) => c.toUpperCase()), harmony: p.harmony, locked: [...(p.locked || [])].sort(), extraColors: p.extraColors }
    })
    const board = () => page.locator('.plb-col').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
    const lockedCount = () => page.getByRole('button', { name: /^Unlock / }).count()

    const before = await saved()
    const boardBefore = await board()
    expect(before).toEqual({ colors: PALETTE.map((c) => c.toUpperCase()), harmony: 'monochromatic', locked: [1, 3], extraColors: [] })
    expect(await lockedCount()).toBe(2)

    await checkFromExtraTools(page)
    await expect(backLink(page)).toBeVisible()
    await backLink(page).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)

    expect(await saved()).toEqual(before)
    expect(await board()).toEqual(boardBefore)
    expect(await lockedCount()).toBe(2)
  })

  test('P3 the way back names the palette and says a fix stays in the checker', async ({ page }) => {
    watch(page, 'a designer wondering whether a fix will change the palette')
    await openBoard(page)
    await checkFromExtraTools(page)
    const link = backLink(page)
    await expect(link).toHaveText('Palette')
    await expect(link).toHaveAttribute('href', '/create/palette')
    await expect(link).toHaveAttribute('title', "Back to your palette. Fixes here don't change it yet.")
  })

  test('P4 a reload of the hand-off address keeps the pair and the back link', async ({ page }) => {
    watch(page, 'a designer reloading the checker they were sent to')
    await openBoard(page)
    await checkFromExtraTools(page)
    const address = page.url()

    await page.reload()
    await expect(fgField(page)).toBeVisible()
    expect(page.url()).toBe(address)
    await expect(fgField(page)).toHaveValue('#0B1220')
    await expect(bgField(page)).toHaveValue('#F7F7F4')
    await expect(backLink(page)).toBeVisible()
    await expect(root(page)).toHaveAttribute('data-fg-role', 'deep')
  })

  test('P4 an unknown role or an unknown source in the address is ignored', async ({ page }) => {
    watch(page, 'someone opening a hand-written address')
    await go(page, '/create/contrast?fg=0B1220&bg=F7F7F4&from=palette&fgRole=bogus&bgRole=alt-2')
    await expect(fgField(page)).toHaveValue('#0B1220')
    await expect(backLink(page)).toBeVisible()
    await expect(root(page)).not.toHaveAttribute('data-fg-role', /.*/)
    await expect(root(page)).toHaveAttribute('data-bg-role', 'alt-2')

    await go(page, '/create/contrast?fg=0B1220&bg=F7F7F4&from=elsewhere&fgRole=deep')
    await expect(fgField(page)).toHaveValue('#0B1220')
    await expect(backLink(page)).toHaveCount(0)
    await expect(root(page)).not.toHaveAttribute('data-from', /.*/)
  })

  test('P4 a role goes once its side is changed', async ({ page }) => {
    watch(page, 'a designer editing the colour they were sent with')
    await go(page, '/create/contrast?fg=0B1220&bg=F7F7F4&from=palette&fgRole=deep&bgRole=subtle')
    await expect(root(page)).toHaveAttribute('data-fg-role', 'deep')
    await fgField(page).fill('#334155')
    await fgField(page).press('Enter')
    await expect(root(page)).not.toHaveAttribute('data-fg-role', /.*/)
    await expect(root(page)).toHaveAttribute('data-bg-role', 'subtle')
    await expect(backLink(page)).toBeVisible()
  })

  test('P6 a direct visit shows no back link and keeps the default pair', async ({ page }) => {
    watch(page, 'someone opening the checker from the tools list')
    await go(page, '/create/contrast')
    await expect(fgField(page)).toHaveValue('#6B7280')
    await expect(bgField(page)).toHaveValue('#FFFFFF')
    await expect(backLink(page)).toHaveCount(0)
    await expect(root(page)).not.toHaveAttribute('data-from', /.*/)
    // The toolbar still goes back to the workspace, as before.
    await expect(page.getByRole('link', { name: /^Back to (workspace|previous page)$/ })).toBeVisible()

    // A shared pair (no `from`) is a direct visit too.
    await go(page, '/create/contrast?fg=0B1220&bg=F7F7F4')
    await expect(fgField(page)).toHaveValue('#0B1220')
    await expect(backLink(page)).toHaveCount(0)
  })

  test('P6 Copy link from a hand-off writes only the pair', async ({ page }) => {
    watch(page, 'a designer sharing the pair they were sent to')
    await page.addInitScript(() => {
      window.__clip = []
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text) => { window.__clip.push(text) } },
      })
    })
    await go(page, '/create/contrast?fg=0B1220&bg=F7F7F4&from=palette&fgRole=deep&bgRole=subtle')
    await page.locator('.tl-export-btn').click()
    await page.getByRole('menuitem', { name: 'Copy link', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.__clip)).toEqual([
      `${new URL(page.url()).origin}/create/contrast?fg=0B1220&bg=F7F7F4`,
    ])
  })
})
