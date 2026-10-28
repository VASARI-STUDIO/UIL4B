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
    // The palette has five slots, so alt-2 names nothing in it (and "bogus" is not a role at all).
    await seed(page)
    await go(page, '/create/contrast?fg=0B1220&bg=F7F7F4&from=palette&fgRole=bogus&bgRole=alt-2')
    await expect(fgField(page)).toHaveValue('#0B1220')
    await expect(backLink(page)).toBeVisible()
    await expect(root(page)).not.toHaveAttribute('data-fg-role', /.*/)
    await expect(root(page)).not.toHaveAttribute('data-bg-role', /.*/)

    await go(page, '/create/contrast?fg=0B1220&bg=F7F7F4&from=elsewhere&fgRole=deep')
    await expect(fgField(page)).toHaveValue('#0B1220')
    await expect(backLink(page)).toHaveCount(0)
    await expect(root(page)).not.toHaveAttribute('data-from', /.*/)
  })

  test('P4 a role goes once its side is changed', async ({ page }) => {
    watch(page, 'a designer editing the colour they were sent with')
    await seed(page)
    await go(page,'/create/contrast?fg=0B1220&bg=F7F7F4&from=palette&fgRole=deep&bgRole=subtle')
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

// THE "YOUR PALETTE" STRIP (slice 3, part B1). The palette is the same one as
// above, under the analogous system, so each slot's on-screen name differs from
// its role name. Names are written out by hand from the Palette Builder's labels
// for that system (−30° is U+2212, as the board draws it):
//
//   slot 0  #1E3A8A  Primary
//   slot 1  #F59E0B  Analogous −30°
//   slot 2  #0F766E  Analogous +30°
//   slot 3  #F7F7F4  Soft −15°
//   slot 4  #0B1220  Soft +15°
//   then White and Near black, which no palette colour equals
//
// MUTATIONS (each turns the tests named red):
//   kitFrom names a slot with roleName(roleAt(i), 'auto')     -> "P2 the strip lists"
//   a swatch's onClick always calls setFgHex                  -> "P2 a tap sets the targeted side"
//   sideName ignores the role and returns the side word       -> "P2 a fix row names"
//   reserveWord returns the side word only (no strip names)   -> "P2 the page does not change height" at 390
const STRIP_NAMES = ['Primary', 'Analogous −30°', 'Analogous +30°', 'Soft −15°', 'Soft +15°', 'White', 'Near black']
const STRIP_HEX = [...PALETTE.map((h) => h.toUpperCase()), '#FFFFFF', '#0B0C0E']
const swatches = (page) => page.locator('.cc-swatch')
const targetPill = (page, name) => page.getByRole('group', { name: 'Swatches change the' }).getByRole('button', { name, exact: true })

test.describe('The Your palette strip', () => {
  test('P2 the strip lists the roles by the Palette Builder\'s names, in slot order', async ({ page }) => {
    watch(page, 'a designer whose palette uses the analogous system')
    await seed(page, { harmony: 'analogous' })
    await go(page, '/create/contrast')
    await expect(swatches(page)).toHaveCount(STRIP_NAMES.length)
    await expect(page.locator('.cc-swatch-name')).toHaveText(STRIP_NAMES)
    const hexes = await swatches(page).evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label').match(/#[0-9A-F]{6}/i) || [''])[0].toUpperCase()))
    expect(hexes).toEqual(STRIP_HEX)
    await expect(page.getByRole('heading', { name: 'Pairs to check in your palette' })).toBeVisible()
    // The strip is the palette's own, so it says so and never says "kit".
    await expect(page.locator('.cc-strip')).not.toContainText(/\bkit\b/i)
    await expect(page.locator('.cc-pairs .cc-lede')).not.toContainText('base generates')
  })

  test('P2 a tap sets the targeted side', async ({ page }) => {
    watch(page, 'a designer picking colours from their palette')
    await seed(page, { harmony: 'analogous' })
    await go(page, '/create/contrast')
    // Text is targeted first.
    await expect(targetPill(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
    await swatches(page).filter({ hasText: 'Analogous +30°' }).click()
    await expect(fgField(page)).toHaveValue('#0F766E')
    await expect(bgField(page)).toHaveValue('#FFFFFF')
    await expect(swatches(page).filter({ hasText: 'Analogous +30°' })).toHaveAttribute('aria-pressed', 'true')

    await targetPill(page, 'Background').click()
    await swatches(page).filter({ hasText: 'Soft −15°' }).click()
    await expect(bgField(page)).toHaveValue('#F7F7F4')
    await expect(fgField(page)).toHaveValue('#0F766E')
    // The pressed swatch follows the targeted side.
    await expect(swatches(page).filter({ hasText: 'Soft −15°' })).toHaveAttribute('aria-pressed', 'true')
    await expect(swatches(page).filter({ hasText: 'Analogous +30°' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('P2 a fix row names the side by its role', async ({ page }) => {
    watch(page, 'a designer fixing the colour they were sent with')
    await seed(page, { harmony: 'analogous' })
    // Secondary on Subtle is about 2:1, and both sides have a fix.
    await go(page, '/create/contrast?fg=F59E0B&bg=F7F7F4&from=palette&fgRole=secondary&bgRole=subtle')
    const lines = page.locator('.cc-fixes-live .cc-fix-line')
    await expect(lines.first()).toContainText('Darken Analogous −30° to #')
    await expect(lines.nth(1)).toContainText('Darken Soft −15° to #')

    // A side changed to a strip colour is named by that colour, not by the role it arrived with.
    await fgField(page).fill('#0F766E')
    await fgField(page).press('Enter')
    await expect(lines.first()).toContainText('Darken Analogous +30° to #')

    // A colour that is not in the strip falls back to the side's own word.
    await fgField(page).fill('#E07B00')
    await fgField(page).press('Enter')
    await expect(lines.first()).toContainText('Darken text to #')
  })

  test('P2 a direct visit with no palette names its sides "text" and "background"', async ({ page }) => {
    watch(page, 'someone opening the checker from the tools list')
    await go(page, '/create/contrast?fg=AAAAAA&bg=FFFFFF')
    await expect(page.locator('.cc-fixes-live .cc-fix-line').first()).toContainText('Darken text to #')
    await expect(page.locator('.cc-pairs .cc-lede')).toContainText('From the colours your base generates. Build a palette to check your own.')
  })

  // R: spec 5.2. Tapping through every text and background colour of the strip
  // changes the pair, so the fix rows change in count and wording. The page must
  // stay the same height. At 390 the fixes reserve is what holds it still; from
  // 901px the page is as tall as its main column.
  for (const vp of [{ width: 1440, height: 900, phone: false }, { width: 390, height: 844, phone: true }]) {
    test(`P2 the page does not change height as strip colours are tapped at ${vp.width}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.phone, hasTouch: vp.phone })
      const page = await ctx.newPage()
      watch(page, `a window ${vp.width}px wide`)
      await seed(page, { harmony: 'analogous' })
      await go(page, '/create/contrast?fg=F59E0B&bg=F7F7F4&from=palette&fgRole=secondary&bgRole=subtle')
      await expect(swatches(page)).toHaveCount(STRIP_NAMES.length)
      await page.evaluate(() => document.fonts.ready)
      const heights = []
      for (let b = 0; b < STRIP_NAMES.length; b++) {
        await targetPill(page, 'Background').click()
        await swatches(page).nth(b).click()
        await targetPill(page, 'Text').click()
        for (let t = 0; t < STRIP_NAMES.length; t++) {
          await swatches(page).nth(t).click()
          heights.push(await page.evaluate(() => document.documentElement.scrollHeight))
        }
      }
      expect(heights.length, 'every text and background pair was visited').toBe(STRIP_NAMES.length ** 2)
      expect(Math.max(...heights) - Math.min(...heights), `page heights ${[...new Set(heights)]}`).toBeLessThanOrEqual(1)
      await ctx.close()
    })
  }
})

// THE PREVIEWS PAINTED WITH THE PALETTE (slice 3, part B2). With a palette the
// views show its roles and only the parts that do the pair's job take the pair.
// The pairs are worked out from the palette above, not read from the page:
//
//   Primary #1E3A8A on Accent #0F766E   two brand colours (tones 27 and 44): "beside"
//   Near black #0B0C0E on Secondary #F59E0B   a dark label on a fill: "fill-label"
//                                             (rgb 11,12,14 on rgb 245,158,11)
//
// MUTATIONS (each turns the tests named red):
//   Interface renders the tag whatever the job                       -> "P5 two brand colours"
//   PairLegend ignores `lead` (chips stay body, large, UI)           -> "P5 two brand colours"
//   part() never adds data-pair-part                                 -> "P5 two brand colours", "B2 the switch"
//   PairExample sets paletteRoles to null when a palette exists      -> "B2 the switch" (fill stays near black)
//   the caption clamp and its 3em reserve are removed                -> "B2 the switch" at 390
//   the switch is rendered with no palette                           -> "B2 with no palette"
const BESIDE = '/create/contrast?fg=1E3A8A&bg=0F766E&from=palette&fgRole=primary&bgRole=accent'
const FILL_LABEL = '/create/contrast?fg=0B0C0E&bg=F59E0B&from=palette&fgRole=near-black&bgRole=secondary'

test.describe('B2 previews painted with the palette', () => {
  test('P5 two brand colours show the tag and chart parts in the pair, and the legend leads with UI parts', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    watch(page, 'someone checking two brand colours from their palette')
    await seed(page)
    await go(page, BESIDE)
    const pv = page.locator('.cc-pv')
    await expect(pv).toHaveAttribute('data-ctx', 'on')
    await expect(pv).toHaveAttribute('data-job', 'beside')
    // The week strip is gone under 560px, so the tag carries the pair.
    await expect(page.locator('.ro-tag[data-pair-part]')).toHaveText('Closing shift')
    await expect(page.locator('.cc-lg-chip').first()).toContainText('UI parts')
    await expect(page.getByText('Two brand colours: shown as chart lines and a tag. Text on this pair needs 4.5:1.')).toBeVisible()
    await page.getByRole('button', { name: 'Article', exact: true }).click()
    await expect(page.locator('.bs-chart-axis[data-pair-part]')).toBeVisible()
    // The pair is not in the other views' text, so their text is not a pair part.
    await expect(page.locator('.bs-head[data-pair-part]')).toHaveCount(0)
    await ctx.close()
  })

  for (const vp of [{ width: 1440, height: 900, phone: false }, { width: 390, height: 844, phone: true }]) {
    test(`B2 the switch changes the painted roles, not the page height, at ${vp.width}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.phone, hasTouch: vp.phone })
      const page = await ctx.newPage()
      watch(page, `a window ${vp.width}px wide`)
      await seed(page)
      await go(page, FILL_LABEL)
      await page.evaluate(() => document.fonts.ready)
      const sw = page.getByRole('switch', { name: 'Show my palette around it' })
      const fill = () => page.locator('.ro-btn--fill').evaluate((el) => getComputedStyle(el).backgroundColor)
      const height = () => page.evaluate(() => document.documentElement.scrollHeight)
      const cap = page.locator('.cc-ctx-cap')

      await expect(sw).toHaveAttribute('aria-checked', 'true')
      await expect(cap).toHaveText(/^Your palette, with Near black on .+ under test$/)
      expect(await fill(), 'the pair is the button fill').toBe('rgb(245, 158, 11)')
      const canvasOn = await page.locator('.cc-pv').evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(canvasOn, 'the page round the pair is the palette\'s').not.toBe('rgb(245, 158, 11)')
      const on = await height()

      await sw.click()
      await expect(sw).toHaveAttribute('aria-checked', 'false')
      await expect(cap).toHaveText('Painted in your two colours only')
      await expect(page.locator('.cc-pv')).toHaveAttribute('data-ctx', 'off')
      expect(await fill(), 'two colours: the fill is the text colour').toBe('rgb(11, 12, 14)')
      expect(await page.locator('.cc-pv').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(245, 158, 11)')
      expect(Math.abs((await height()) - on), 'page height with the switch on and off').toBeLessThanOrEqual(1)

      if (vp.phone) {
        // The picture keeps the first screen: the caption and switch sit under the frame.
        const [frame, bar] = await Promise.all([page.locator('.cc-frame').boundingBox(), page.locator('.cc-ctxbar').boundingBox()])
        expect(bar.y, 'the bar is under the frame on a phone').toBeGreaterThanOrEqual(frame.y + frame.height - 1)
        expect((await sw.boundingBox()).height, 'the switch is a 44px target on touch').toBeGreaterThanOrEqual(44)
      }
      await ctx.close()
    })
  }

  test('B2 with no palette there is no switch, no caption and no pair parts', async ({ page }) => {
    watch(page, 'someone opening the checker from the tools list')
    await go(page, '/create/contrast?fg=AAAAAA&bg=FFFFFF')
    await expect(page.locator('.cc-pv')).toHaveAttribute('data-ctx', 'off')
    await expect(page.getByRole('switch')).toHaveCount(0)
    await expect(page.locator('.cc-ctxbar')).toHaveCount(0)
    await expect(page.locator('.cc-pv [data-pair-part]')).toHaveCount(0)
  })
})

// THE LAYOUT OF THE HAND-OFF (fix round 1). The strip follows the picture it
// changes, the frame fits the window with a palette as it does without one, the
// beside tag costs no row at 320, the toolbar keeps the checker's name at 320, and
// a field says what role it holds. Worked from the palette above, not read back:
//
//   Deep on Subtle     #0B1220 on #F7F7F4   the reading pair; roles Deep and Subtle
//   Primary on Accent  #1E3A8A on #0F766E   two brand colours ("beside")
//   Secondary          Analogous −30° under the analogous system: the longest name
//
// MUTATIONS (each turns the tests named red):
//   <div className="cc-strip"> moved back after <ToolPanel>           -> "R1 the strip comes before the result panel" at 390 and 768
//   {hasPalette && !stacked && ctxBar} put back above the frame       -> "R1 with a palette the frame ends inside 1440x900"
//   the 339px container rule in Interface.css puts the tag back in
//     its own row (grid-column:1; justify-self:start; margin-left:0)  -> "R1 at 320 the beside tag costs no row"
//   the max-width 359px rule hiding .tl-btn--back .tl-btn-label removed -> "R1 at 320 the toolbar title is whole"
//   roleText={null} on both HexFields                                 -> "R1 a field label names the role"
//   sideRole(fg, fgRole) given handoff.fgRole instead of fgRole       -> "R1 a field label names the role ... drops it"
//   .cc-field-role set to display:inline on a phone (it wraps the label
//     to three lines and the row grows 3px at 390)                    -> "R1 a long role name does not change the height of the fields" at 390
const READING = '/create/contrast?fg=0B1220&bg=F7F7F4&from=palette&fgRole=deep&bgRole=subtle'
const SECONDARY = '/create/contrast?fg=F59E0B&bg=F7F7F4&from=palette&fgRole=secondary&bgRole=subtle'
const PHONE = (width, height) => ({ viewport: { width, height }, isMobile: true, hasTouch: true })

async function openAt(browser, opts, url, { harmony = 'auto', palette = true } = {}) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  if (palette) await seed(page, { harmony })
  await go(page, url)
  await page.evaluate(() => document.fonts.ready)
  return { ctx, page }
}

test.describe('R1 the layout of the hand-off', () => {
  for (const vp of [{ width: 390, height: 844, phone: true }, { width: 768, height: 1024, phone: false }]) {
    test(`R1 the strip comes before the result panel, under the frame, at ${vp.width}`, async ({ browser }) => {
      const { ctx, page } = await openAt(browser, vp.phone ? PHONE(vp.width, vp.height) : { viewport: { width: vp.width, height: vp.height } }, READING)
      watch(page, `a window ${vp.width}px wide`)
      const [frame, strip, panel] = await Promise.all(['.cc-frame', '.cc-strip', '.cc-panel'].map((s) => page.locator(s).boundingBox()))
      expect(strip.y, 'the strip is below the frame').toBeGreaterThanOrEqual(frame.y + frame.height - 1)
      // The caption, the switch and (on a phone) the legend's lede sit between; never a screen of other things.
      expect(strip.y - (frame.y + frame.height), 'the strip is the next thing under the frame').toBeLessThanOrEqual(200)
      expect(strip.y, 'the strip comes before the result panel').toBeLessThan(panel.y)
      await ctx.close()
    })
  }

  test('R1 with a palette the frame ends inside 1440x900, where it ends without one', async ({ browser }) => {
    const withPalette = await openAt(browser, { viewport: { width: 1440, height: 900 } }, READING)
    watch(withPalette.page, 'someone on a laptop who came from the Palette Builder')
    const a = await withPalette.page.locator('.cc-frame').boundingBox()
    // Cancel and Save are in the frame, and the frame is on the screen.
    expect(a.y + a.height, 'the frame ends inside the window').toBeLessThanOrEqual(900)
    // The view is lazy: wait for both buttons before reading where they are.
    await expect(withPalette.page.locator('.cc-pv .ro-btn')).toHaveCount(2)
    const btns = await withPalette.page.locator('.cc-pv .ro-btn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().bottom))
    expect(btns.length).toBe(2)
    expect(Math.max(...btns), 'Cancel and Save are inside the window').toBeLessThanOrEqual(900)
    await withPalette.ctx.close()

    const direct = await openAt(browser, { viewport: { width: 1440, height: 900 } }, '/create/contrast', { palette: false })
    const b = await direct.page.locator('.cc-frame').boundingBox()
    expect(Math.abs(a.y - b.y), 'the frame is where a direct visit puts it').toBeLessThanOrEqual(1)
    await direct.ctx.close()
  })

  test('R1 at 320 the beside tag costs no row, so Cancel and Save stay in the frame as they do on a direct visit', async ({ browser }) => {
    const rooms = []
    for (const [url, palette] of [['/create/contrast?fg=1E3A8A&bg=0F766E&from=palette&fgRole=primary&bgRole=accent', true], ['/create/contrast', false]]) {
      const { ctx, page } = await openAt(browser, PHONE(320, 568), url, { palette })
      watch(page, 'a 320px phone')
      if (palette) await expect(page.locator('.ro-tag[data-pair-part]')).toBeVisible()
      // The view is lazy: wait for both buttons before measuring.
      await expect(page.locator('.cc-pv .ro-btn')).toHaveCount(2)
      const read = await page.evaluate(() => {
        const frame = document.querySelector('.cc-frame').getBoundingClientRect()
        const bottoms = [...document.querySelectorAll('.cc-pv .ro-btn')].map((e) => e.getBoundingClientRect().bottom)
        return { count: bottoms.length, room: frame.bottom - 1 - Math.max(...bottoms) }
      })
      expect(read.count, 'Cancel and Save').toBe(2)
      expect(read.room, 'Cancel and Save end inside the frame').toBeGreaterThanOrEqual(0)
      rooms.push(read.room)
      await ctx.close()
    }
    // The tag is up beside the title, so the room is what a direct visit has (about 8px), not 24px less.
    expect(rooms[0], `room with the tag ${rooms[0]}px, without ${rooms[1]}px`).toBeGreaterThanOrEqual(rooms[1] - 1)
  })

  test('R1 at 320 the toolbar title is whole and the way back keeps its name', async ({ browser }) => {
    const { ctx, page } = await openAt(browser, PHONE(320, 568), READING)
    watch(page, 'a 320px phone')
    const read = await page.evaluate(() => {
      const t = document.querySelector('.tl-title')
      return { clip: t.scrollWidth - t.clientWidth, text: t.textContent }
    })
    expect(read.text).toBe('Contrast Checker')
    expect(read.clip, 'the title is cut with an ellipsis').toBeLessThanOrEqual(0)
    const back = backLink(page)
    await expect(back).toBeVisible()
    await expect(back.locator('.tl-btn-label')).toBeHidden()
    expect((await back.boundingBox()).width, 'the arrow is a touch target').toBeGreaterThanOrEqual(44)
    await ctx.close()
    // From 360px the word is back.
    const wider = await openAt(browser, PHONE(360, 640), READING)
    await expect(backLink(wider.page).locator('.tl-btn-label')).toHaveText('Palette')
    await wider.ctx.close()
  })

  test('R1 a field label names the role on a hand-off, and drops it after the colour is edited', async ({ page }) => {
    watch(page, 'a designer who arrived with a pair from the palette')
    await seed(page)
    await go(page, READING)
    const fgRoleText = page.locator('label[for="cc-fg"] .cc-field-role')
    const bgRoleText = page.locator('label[for="cc-bg"] .cc-field-role')
    await expect(fgRoleText).toHaveText(/Deep/)
    await expect(bgRoleText).toHaveText(/Subtle/)
    // The label still names the input as before, with the role after it.
    await expect(page.getByRole('textbox', { name: /^Text colour/ })).toHaveValue('#0B1220')

    await fgField(page).fill('#E07B00')
    await fgField(page).press('Enter')
    await expect(fgRoleText).toHaveCount(0)
    await expect(bgRoleText, 'the other side keeps its role').toHaveText(/Subtle/)
  })

  test('R1 a direct visit with no palette has no role on its labels', async ({ page }) => {
    watch(page, 'someone opening the checker from the tools list')
    await go(page, '/create/contrast?fg=AAAAAA&bg=FFFFFF')
    await expect(page.locator('.cc-field-role')).toHaveCount(0)
  })

  for (const vp of [{ width: 1440, height: 900, phone: false }, { width: 768, height: 1024, phone: false }, { width: 390, height: 844, phone: true }, { width: 320, height: 568, phone: true }]) {
    test(`R1 a long role name does not change the height of the fields at ${vp.width}`, async ({ browser }) => {
      const opts = vp.phone ? PHONE(vp.width, vp.height) : { viewport: { width: vp.width, height: vp.height } }
      const direct = await openAt(browser, opts, '/create/contrast?fg=F59E0B&bg=F7F7F4', { palette: false })
      const base = (await direct.page.locator('.cc-pairbar').boundingBox()).height
      await direct.ctx.close()
      // Analogous −30° is the longest name the analogous system gives.
      const { ctx, page } = await openAt(browser, opts, SECONDARY, { harmony: 'analogous' })
      watch(page, `a window ${vp.width}px wide`)
      await expect(page.locator('label[for="cc-fg"] .cc-field-role')).toHaveText(/Analogous −30°/)
      const named = (await page.locator('.cc-pairbar').boundingBox()).height
      expect(Math.abs(named - base), `fields ${named}px with roles, ${base}px without`).toBeLessThanOrEqual(1)
      await ctx.close()
    })
  }
})

// FIX ROUND 2. The pair's own labels stay readable, a direct visit's heading does not
// claim a palette, and a role in the address is believed only when the palette backs it.
//
//   Primary on Accent  #1E3A8A on #0F766E   "beside": a tag and week-strip shifts
//   forged pair        #A78BFA on #E5E7EB   2.20:1, so both sides have a fix row;
//                                           the colours are in no palette and no pole
//   other palette      the five above with #7C3AED as Primary
//
// MUTATIONS (each turns the tests named red):
//   remove the `[data-pair-part] ... [data-hit="off"]{opacity:1}` rule
//     in palette-preview.css                                           -> "R2 the pair's own labels are not dimmed"
//   the heading always reads "in your palette"                         -> "R2 a direct visit's heading"
//   trustRole returns the role whatever the palette holds              -> "R2 a forged address" (both cases)
//   trustRole skips the hasPalette test                                -> "R2 a forged address ... no palette"
//   trustRole compares the slot name but not its hex                   -> "R2 a forged address ... another palette"
//   trustRole drops every role (returns null)                          -> "R2 a forged address" control: Primary no longer named
const FORGED = '/create/contrast?fg=A78BFA&bg=E5E7EB&from=palette&fgRole=primary&bgRole=secondary'

test.describe('R2 hand-off fix round', () => {
  test('R2 the pair\'s own labels are not dimmed in the beside view at 1440', async ({ browser }) => {
    const { ctx, page } = await openAt(browser, { viewport: { width: 1440, height: 900 } }, BESIDE)
    watch(page, 'a designer checking two brand colours on a wide screen')
    const labels = { tag: page.locator('.ro-tag[data-pair-part] > span'), shift: page.locator('.ro-shift[data-pair-part] > span').first() }
    await expect(labels.tag).toHaveText('Closing shift')
    await expect(labels.shift).toBeVisible()
    // POSITIVE CONTROL: UI parts is the lit test, so these body-sized labels are marked "off".
    // Without this the opacity below would read 1 on a page where nothing was marked yet.
    await expect(labels.tag).toHaveAttribute('data-hit', 'off')
    await expect(labels.shift).toHaveAttribute('data-hit', 'off')
    // The opacity fades over 150ms, so let a dim finish before reading it.
    await page.waitForTimeout(500)
    for (const [name, label] of Object.entries(labels)) {
      expect(await label.evaluate((el) => getComputedStyle(el).opacity), `the ${name} label's opacity`).toBe('1')
    }
    await ctx.close()
  })

  test('R2 a direct visit\'s heading does not claim a palette', async ({ page }) => {
    watch(page, 'someone opening the checker from the tools list')
    await go(page, '/create/contrast?fg=AAAAAA&bg=FFFFFF')
    await expect(page.getByRole('heading', { name: 'Pairs to check', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pairs to check in your palette' })).toHaveCount(0)
    // The lede still says the colours are generated.
    await expect(page.locator('.cc-pairs .cc-lede')).toContainText('From the colours your base generates.')
  })

  test('R2 a forged address with no palette shows no role', async ({ page }) => {
    watch(page, 'someone opening a pasted link with no palette of their own')
    await go(page, FORGED)
    await expect(fgField(page)).toHaveValue('#A78BFA')
    await expect(page.locator('.cc-field-role')).toHaveCount(0)
    await expect(root(page)).not.toHaveAttribute('data-fg-role', /.*/)
    await expect(root(page)).not.toHaveAttribute('data-bg-role', /.*/)
    const lines = page.locator('.cc-fixes-live .cc-fix-line')
    await expect(lines.first()).toContainText(/^(Lighten|Darken) text to #/)
    expect((await lines.allTextContents()).join(' '), 'no fix row names a role').not.toMatch(/Primary|Secondary/)
  })

  test('R2 a forged address with another palette shows no role, and a true role is still named', async ({ page }) => {
    watch(page, 'someone opening a stale link after changing their palette')
    const colours = ['#7C3AED', ...PALETTE.slice(1)]
    await page.addInitScript((c) => {
      localStorage.setItem('vs-current-design', JSON.stringify({
        palette: { base: c[0], harmony: 'auto', extraColors: [], locked: [], activeIdx: 0, colors: c },
      }))
    }, colours)
    // Primary is #7C3AED now, not #A78BFA, and a five-colour palette has no alt-4.
    await go(page, '/create/contrast?fg=A78BFA&bg=E5E7EB&from=palette&fgRole=primary&bgRole=alt-4')
    await expect(fgField(page)).toHaveValue('#A78BFA')
    await expect(page.locator('.cc-field-role')).toHaveCount(0)
    await expect(root(page)).not.toHaveAttribute('data-fg-role', /.*/)
    await expect(root(page)).not.toHaveAttribute('data-bg-role', /.*/)
    const lines = page.locator('.cc-fixes-live .cc-fix-line')
    await expect(lines.first()).toContainText(/^(Lighten|Darken) text to #/)
    expect((await lines.allTextContents()).join(' '), 'no fix row names a role').not.toMatch(/Primary|Alt/)

    // CONTROL: the same palette's own Primary is believed, so the checks above are not just "roles never show".
    await go(page, '/create/contrast?fg=7C3AED&bg=F7F7F4&from=palette&fgRole=primary&bgRole=subtle')
    await expect(page.locator('label[for="cc-fg"] .cc-field-role')).toHaveText(/Primary/)
    await expect(root(page)).toHaveAttribute('data-fg-role', 'primary')
    await expect(root(page)).toHaveAttribute('data-bg-role', 'subtle')
  })

  // MUTATION: check the role against the strip's seven colours (`kit`) instead of
  // the whole palette; the 8th colour loses its name.
  test('R2 an 8th colour handed off keeps its name, past the seven on the strip', async ({ page }) => {
    watch(page, 'someone checking the eighth colour of a long palette')
    const colours = [...PALETTE, '#9F1239', '#65A30D', '#7C2D12']
    await page.addInitScript((c) => {
      localStorage.setItem('vs-current-design', JSON.stringify({
        palette: { base: c[0], harmony: 'auto', extraColors: [], locked: [], activeIdx: 0, colors: c },
      }))
    }, colours)
    // Index 7 is alt-3 (slots 0 to 4 are named, then alt-1 onwards).
    await go(page, '/create/contrast?fg=7C2D12&bg=F7F7F4&from=palette&fgRole=alt-3&bgRole=subtle')
    await expect(fgField(page)).toHaveValue('#7C2D12')
    await expect(page.locator('label[for="cc-fg"] .cc-field-role')).toHaveText(/Alternative 3/)
    await expect(root(page)).toHaveAttribute('data-fg-role', 'alt-3')
  })
})
