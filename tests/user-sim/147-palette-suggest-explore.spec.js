// PALETTE BUILDER: SUGGEST AND EXPLORE, AS ONE DOCKED PANEL OF SWATCH ROWS.
//
// The contract is the acceptance criteria of memory/designs/design-2026-10-31-suggest-explore.md.
//
//   · Suggest (toolbar button "Suggest variations") and Explore ("Explore palettes
//     and brands") share one panel slot. At 1024 and up it is an <aside
//     role="complementary"> docked beside the board, which it pushes and never
//     covers. Below that it is a non-modal dialog: a dock above the adjust bar at
//     768, a Peek/Full sheet on a phone.
//   · Every option is a row: a name line over a strip of equal chips, under a
//     pinned "Your palette" row. Pressing a row puts it on the board and says "On
//     your board"; pressing it again puts the user's own palette back.
//   · ONE trial snapshot serves both panels and both Explore tabs: it is taken on
//     the first apply, survives moving between Suggest, Explore and its tabs, and
//     is dropped by going back or by a real board edit.
//
// What each criterion is pinned by (spec section 11 numbering in brackets):
//   1  docked, nothing covers the board, both themes        "the panel docks beside the board ..."
//   2  every chip the same width, 32px (28 on a phone)       "every chip is the same size ..."
//   3  Warmer on, ring, again: the board equals the snapshot "pressing a variation ..."
//   4  Warmer, Cooler, Cooler returns to the original        "Warmer, then Cooler, then Cooler ..."
//   5  brand in Explore, then Suggest: Your palette is yours "a brand applied in Explore ..."
//   6  no Use arrow, no eye, no mid-swatch Pro               "no Use arrow, no eye button ..."
//   7  locked brands put no hex in the page                  "a locked brand puts no hex ..."
//   8  phone Peek 360px, Your palette + 3 rows, handle       "Suggest on a phone"
//   9  768 dock above the adjust bar                         "Suggest at 768"
//   10 keyboard: arrows, Enter, Esc returns focus            "keyboard"
//   11 reduced motion: opacity only                          "reduced motion"
//   12 the toolbar never wraps with a panel open             "the toolbar row ..."
//
// Behaviour that was REMOVED by the redesign, and the old tests dropped with it:
//   · "Back to my palette" (pill, its enabled/disabled state, Tab order Back -> Close,
//     focus moved to the card after Back): the applied row is the way back now.
//   · "an Explore/brand import after a variation ENDS the Suggest session": the
//     session is now one snapshot that is kept across panels (criterion 5).
//   · the sideways card scroller on a phone ("first card sits 16px in, the next peeks"):
//     replaced by vertical rows; the phone head one-row tests are kept.
//   · the eye (preview) button and the Use arrow on a card: replaced by Compare.
//
// MUTATIONS (what to break to see each go red):
//   1  put `position: absolute` back on .plb-sx at 1440, or drop `flex: none` so it overlaps.
//   2  restore `.plb-sw-chip:first-child { flex: 2.4 }`; set .plb-sw-strip height 40px.
//   3  drop `trialSnapRef.current = null` + setColors(snap.colors) from revertTrial;
//      drop setSeed(snap.seed); or `aria-pressed={applied}` from SwatchRow.
//   4  in pickVariation, replace `panelSnap()` with a snapshot of the live board.
//   5  build Your palette from `adjusted` instead of trialSnapRef.current.mine; or
//      null trialSnapRef in openGallery/setGalleryTab.
//   6  render <IcoEye/> or "Use" in SwatchRow; put the lock inside .plb-sw-strip.
//   7  map lockedBrands to their real colours in SwatchRow (static variant).
//   8  data-snap="full" always; remove the .plb-sx-handle button.
//   9  anchor .plb-sx with bottom: 0 below the adjust bar (ignore --plb-dock-b).
//   10 drop the RovingRows onKeyDown; drop the focus-return effect.
//   11 delete the reduced-motion `animation: none` rule.
//   12 give .plb-sx-head flex-wrap: wrap; let the toolbar buttons gain a second row.
//   13 drop `.ui-modal-overlay` from the closest() list in PaletteBuilder's pointerdown handler
//      ("Suggest at 900").
//   14 in the (pointer: coarse) block of palette-builder.css, put back the old rule (the 44px
//      min-width/height on .plb-sw-info/.plb-sw-compare and nothing else): the name drops into the strip
//      ("at Peek the Your palette label row clears the colour strip"). Dropping `position: relative;
//      z-index: 1` from .plb-sw-line there lets the strip take the bottom of Compare. NOT detectable, because
//      nothing on screen changes: `margin-block: -12px` and `align-items: center` (the line is a fixed 20px).
//   15 delete the MutationObserver lines in scrollCue ("the fade follows rows that arrive after ...").
//   16 make `dockedHeld` false in PaletteBuilder's pointerdown handler (a docked panel at 1440 then
//      closes on an outside press: the "trying a variation" and "one trial" tests go red).
//   17 drop `, .plb-sx` from OPEN_OVERLAY_SELECTOR (53-brand-kit-walkthrough "Suggest suspends the card").
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { clickPaletteAction, readSeed } from './palette-helpers.js'
import { BRAND_PALETTES } from '../../api/_lib/library/brandPalettes.js'

// A fixed five-colour board, so "the original hexes" is a known thing.
const BOARD = '/create/palette?c=14224A,249EAF,F2C14E,2563EB,C0392B'
const hexes = (page) => page.locator('.plb-col .plb-hex').allTextContents()
const joined = async (page) => (await hexes(page)).join()

const SUGGEST_BTN = 'Suggest variations'
const EXPLORE_BTN = 'Explore palettes and brands'
const toolbarButton = (page, name) => page.locator('.plb [data-tool-toolbar]').getByRole('button', { name, exact: true })
const systemSelect = (page) => page.getByRole('button', { name: /^Colour system/ })

// Docked at 1024 and up (a complementary region), a non-modal dialog below.
const suggestPanel = (page, role = 'complementary') => page.getByRole(role, { name: 'Suggest', exact: true })
const explorePanel = (page, role = 'complementary') => page.getByRole(role, { name: EXPLORE_BTN, exact: true })
const rowsOf = (panel) => panel.locator('button.plb-sw-row')
const rowNamed = (panel, name) => panel.getByRole('button', { name: new RegExp(`^${name}\\b`) })
const mineRow = (panel) => panel.locator('.plb-sw-pin')
const liveRegion = (page, text) => page.locator('p.sr-only[aria-live="polite"]', { hasText: text })

const toHex = (rgb) => '#' + (rgb.match(/\d+/g) || []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()

// The colours painted on a row's strip (the row's own chips, not the hover preview of
// "Your palette" that an applied row carries).
async function chipHexes(row) {
  const raw = await row.locator('.plb-sw-chips:not(.plb-sw-chips--mine) .plb-sw-chip').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
  return raw.map(toHex)
}

// Every row of a panel as its name and its colours, so one list can be compared with another.
async function rowList(panel) {
  await expect(rowsOf(panel).nth(3), 'the list has rows').toBeVisible()
  const out = []
  const rows = rowsOf(panel)
  for (let i = 0; i < await rows.count(); i++) {
    const row = rows.nth(i)
    out.push(`${await row.locator('.plb-sw-name').textContent()}: ${(await chipHexes(row)).join(' ')}`)
  }
  return out
}

// Everything "going back" must restore: colours, seed, colour system and the adjust sliders.
async function boardState(page) {
  const sliders = page.locator('.plb-adjust').getByRole('slider')
  return {
    hexes: await hexes(page),
    seed: await readSeed(page),
    system: ((await systemSelect(page).textContent()) || '').trim(),
    adjust: await sliders.evaluateAll((els) => els.map((el) => el.value)),
  }
}

async function openPanel(page, kind = 'suggest', { url = BOARD, role = 'complementary' } = {}) {
  await go(page, url)
  await expect(page.locator('.plb-col')).toHaveCount(5)
  await clickPaletteAction(page, kind === 'suggest' ? SUGGEST_BTN : EXPLORE_BTN, kind === 'suggest' ? 'Suggest' : EXPLORE_BTN)
  const panel = kind === 'suggest' ? suggestPanel(page, role) : explorePanel(page, role)
  await expect(panel).toBeVisible()
  await expect(rowsOf(panel).nth(2), 'the rows have rendered').toBeVisible()
  return panel
}

// Switch the open panel to the other toolbar button (swaps the content in place).
async function swapTo(page, kind, role = 'complementary') {
  await toolbarButton(page, kind === 'suggest' ? SUGGEST_BTN : EXPLORE_BTN).click()
  const panel = kind === 'suggest' ? suggestPanel(page, role) : explorePanel(page, role)
  await expect(panel).toBeVisible()
  await expect(rowsOf(panel).nth(2)).toBeVisible()
  return panel
}

// Swap the second and third colours from the board, the way a person does: the
// quick tools appear on hover.
async function swapSecondAndThird(page) {
  const before = await joined(page)
  const col = page.locator('.plb-col').nth(1)
  await col.hover()
  await col.getByRole('button', { name: /^Choose a direction to swap / }).click()
  await page.getByRole('menu', { name: /^Swap / }).getByRole('menuitem', { name: /Swap right/ }).click()
  await expect(page.getByRole('menu', { name: /^Swap / })).toHaveCount(0)
  await expect.poll(() => joined(page), { message: 'the swap moved two colours' }).not.toBe(before)
}

// Wait for a sliding sheet or dock to stop moving.
async function settled(loc, what = 'the panel') {
  const top = () => loc.evaluate((el) => el.getBoundingClientRect().top)
  await expect.poll(async () => { const a = await top(); await loc.page().waitForTimeout(120); return a === await top() }, { message: `${what} has settled` }).toBe(true)
}

// Every chip's layout box in a panel, grouped by the strip it is in. offsetWidth and
// offsetHeight ignore transforms: a locked row's chips are drawn at scale(1.15) so the
// blur's soft edge falls outside the clip, and getBoundingClientRect would report 36.8px.
const chipBoxes = (panel) => panel.locator('.plb-sw-strip').evaluateAll((strips) => strips
  .map((strip) => [...strip.querySelectorAll(':scope > .plb-sw-chips:not(.plb-sw-chips--mine) > .plb-sw-chip')]
    .map((c) => ({ w: c.offsetWidth, h: c.offsetHeight })))
  .filter((boxes) => boxes.length > 0))

test.describe('the panel docks beside the board', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('at 1440 Suggest sits beside the board and covers none of the five columns', async ({ page }) => {
    watch(page, 'a designer opening Suggest on a laptop')
    const panel = await openPanel(page)
    await settled(panel)
    const box = await panel.boundingBox()
    // 1440 - 86 (the Add rail) - 361 (the panel and its hairline).
    expect(Math.abs(box.x - (1440 - 86 - 361)), `the panel's left edge is at ${box.x}, not 993`).toBeLessThanOrEqual(2)
    expect(Math.abs(box.width - 360), `the panel is ${box.width}px wide, not 360`).toBeLessThanOrEqual(2)
    const cols = await page.locator('.plb-col').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, w: r.width } }))
    expect(cols).toHaveLength(5)
    for (const [i, c] of cols.entries()) {
      expect(c.right, `column ${i + 1} runs under the panel`).toBeLessThanOrEqual(box.x + 1)
      expect(c.w, `column ${i + 1} is squeezed to ${c.w}px`).toBeGreaterThan(150)
    }
    // Docked panel: the head, a hairline on the board side and no floating shadow.
    const style = await panel.evaluate((el) => { const s = getComputedStyle(el); return { shadow: s.boxShadow, borderLeft: s.borderLeftWidth, position: s.position } })
    expect(style.shadow, 'a docked panel carries no shadow').toBe('none')
    expect(style.borderLeft).toBe('1px')
    expect(style.position, 'the panel is in the flow beside the board, not over it').not.toBe('fixed')
    // And it ends above the adjust bar, so the bar is not covered either.
    const bar = await page.locator('.plb-adjust').boundingBox()
    expect(box.y + box.height, 'the panel runs down over the adjust bar').toBeLessThanOrEqual(bar.y + 1)
  })

  test('the same holds in the dark theme, and the applied row carries a ring', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    try {
      watch(page, 'a designer on a laptop in dark mode')
      const panel = await openPanel(page)
      await settled(panel)
      const box = await panel.boundingBox()
      const rightmost = await page.locator('.plb-col').last().evaluate((el) => el.getBoundingClientRect().right)
      expect(rightmost, 'the last column runs under the panel in dark mode').toBeLessThanOrEqual(box.x + 1)
      const row = rowsOf(panel).first()
      expect(await row.locator('.plb-sw-chips').first().evaluate((el) => getComputedStyle(el).boxShadow), 'a resting row has no ring').toBe('none')
      await row.click()
      await expect(row).toHaveAttribute('aria-pressed', 'true')
      expect(await row.locator('.plb-sw-chips').first().evaluate((el) => getComputedStyle(el).boxShadow), 'the applied row has a ring').not.toBe('none')
    } finally { await ctx.close() }
  })

  test('every chip is the same size in every row, and Your palette is pinned above them', async ({ page }) => {
    watch(page, 'a designer comparing rows')
    const panel = await openPanel(page)
    const strips = await chipBoxes(panel)
    expect(strips.length, 'Your palette plus the variations').toBeGreaterThan(8)
    for (const [i, boxes] of strips.entries()) {
      expect(boxes.length, `strip ${i} has the five colours of the board`).toBe(5)
      const w0 = boxes[0].w
      for (const b of boxes) {
        expect(Math.abs(b.w - w0), `strip ${i}: chips are ${boxes.map((x) => x.w.toFixed(1))} wide, not equal`).toBeLessThanOrEqual(1)
        expect(Math.round(b.h), `strip ${i}: a chip is ${b.h}px tall, not 32`).toBe(32)
      }
    }
    // Chip n of every row sits under chip n of Your palette.
    const pin = await chipHexes(mineRow(panel))
    expect(pin, 'Your palette shows the board in order').toEqual(['#14224A', '#249EAF', '#F2C14E', '#2563EB', '#C0392B'])
    // The strip's left edge plus each chip's layout offset: a locked row's chips are drawn at
    // scale(1.15), which moves getBoundingClientRect().left by about 5px without moving the chip.
    const lefts = await panel.locator('.plb-sw-strip').evaluateAll((strips) => strips.map((s) => [...s.querySelectorAll(':scope > .plb-sw-chips:not(.plb-sw-chips--mine) > .plb-sw-chip')].map((c) => Math.round(s.getBoundingClientRect().left + c.offsetLeft))).filter((l) => l.length))
    for (const l of lefts) expect(l, 'chip n is not under chip n of Your palette').toEqual(lefts[0])
  })

  test('Suggest holds the variations in their four groups, with no tabs', async ({ page }) => {
    watch(page, 'a designer opening Suggest')
    const panel = await openPanel(page)
    await expect(panel.getByRole('tablist')).toHaveCount(0)
    await expect(panel.getByRole('heading', { level: 3 })).toHaveText(['Temperature', 'Strength', 'Light and dark', 'Hue'])
    await expect(panel.getByRole('heading', { name: 'Temperature' })).toBeVisible()
    await expect(mineRow(panel)).toContainText('Your palette')
    await expect(mineRow(panel)).toContainText(/Balance \d+/)
    await expect(mineRow(panel).getByRole('button', { name: 'Compare', exact: false }), 'nothing to compare until something is applied').toHaveCount(0)
    await expect(rowsOf(panel).first()).toHaveAttribute('aria-pressed', 'false')
    await expect(rowNamed(panel, 'Warmer')).toContainText('Hues pulled toward amber')
    // No brand rows in Suggest.
    await expect(panel.locator('.plb-sw-row', { hasText: /Stripe|Figma|Material/ })).toHaveCount(0)
  })
})

test.describe('trying a variation and going back', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('pressing a variation puts it on the board, and pressing it again restores everything', async ({ page }) => {
    watch(page, 'a designer trying Warmer and going back')
    await signIn(page, { plan: 'pro' })
    const panel = await openPanel(page)
    // Move one adjust slider first, so "everything" includes the lens, not only the hexes.
    // With the panel open, each key press stays on the slider: the panel's rows
    // re-render as the board changes, and must not take focus back.
    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await hue.focus()
    await page.keyboard.press('ArrowRight')
    await expect(hue).toHaveValue('1')
    await expect(hue, 'the slider kept focus after the board changed').toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(hue).toHaveValue('2')
    await expect.poll(() => joined(page)).not.toBe('#14224A,#249EAF,#F2C14E,#2563EB,#C0392B')
    const before = await boardState(page)
    const mineBefore = await chipHexes(mineRow(panel))
    expect(mineBefore.join()).toBe(before.hexes.join())

    const warmer = rowNamed(panel, 'Warmer')
    await expect(warmer).toHaveAttribute('aria-pressed', 'false')
    await warmer.click()

    await expect(warmer, 'the row is marked as applied').toHaveAttribute('aria-pressed', 'true')
    await expect(warmer).toContainText('On your board')
    expect(await warmer.locator('.plb-sw-chips').first().evaluate((el) => getComputedStyle(el).boxShadow), 'and carries the ring').not.toBe('none')
    await expect(panel, 'the panel stays open').toBeVisible()
    await expect.poll(() => joined(page), { message: 'the board took the variation' }).not.toBe(before.hexes.join())
    await expect(panel.locator('button.plb-sw-row[aria-pressed="true"]'), 'exactly one row is applied').toHaveCount(1)
    expect(await chipHexes(mineRow(panel)), 'Your palette does not follow the board').toEqual(mineBefore)
    await expect(mineRow(panel).getByRole('button', { name: /^Compare Warmer with your palette/ })).toBeVisible()

    await warmer.click()
    await expect.poll(() => joined(page), { message: 'the board is the snapshot again' }).toBe(before.hexes.join())
    expect(await boardState(page), 'colours, seed, colour system and lens are all back').toEqual(before)
    await expect(warmer).toHaveAttribute('aria-pressed', 'false')
    await expect(warmer).not.toContainText('On your board')
    expect(await warmer.locator('.plb-sw-chips').first().evaluate((el) => getComputedStyle(el).boxShadow), 'the ring is gone').toBe('none')
    await expect(warmer, 'nothing disabled, so focus stays on the row').toBeFocused()
    await expect(liveRegion(page, 'Your palette is back.')).toHaveCount(1)
    await expect(panel, 'the panel stays open after going back').toBeVisible()
    await expect(mineRow(panel).getByRole('button', { name: /^Compare/ }), 'Compare goes with the applied row').toHaveCount(0)
  })

  test('Warmer, then Cooler, then Cooler again returns to the original, not to Warmer', async ({ page }) => {
    watch(page, 'a designer flicking between Warmer and Cooler')
    await signIn(page, { plan: 'pro' })
    const panel = await openPanel(page)
    const original = await boardState(page)
    const warmer = rowNamed(panel, 'Warmer')
    const cooler = rowNamed(panel, 'Cooler')

    await warmer.click()
    await expect(warmer).toHaveAttribute('aria-pressed', 'true')
    const warm = await joined(page)
    expect(warm, 'Warmer changed the board').not.toBe(original.hexes.join())

    await cooler.click()
    await expect(cooler).toHaveAttribute('aria-pressed', 'true')
    await expect(warmer, 'the old row returns to resting').toHaveAttribute('aria-pressed', 'false')
    const cool = await joined(page)
    expect(cool, 'Cooler is not Warmer').not.toBe(warm)
    expect(cool, 'and is built from the user\'s palette, not from the Warmer result').not.toBe(original.hexes.join())
    expect(await chipHexes(mineRow(panel)), 'Your palette never moved').toEqual(original.hexes)

    await cooler.click()
    await expect(cooler).toHaveAttribute('aria-pressed', 'false')
    expect(await boardState(page), 'back on the user\'s own board').toEqual(original)
    // And again: a second round trip lands in the same place.
    await warmer.click()
    await expect.poll(() => joined(page)).toBe(warm)
    await warmer.click()
    expect(await boardState(page)).toEqual(original)
  })

  test('Warmer keeps teal in the teal family, and Cooler keeps blue from running to violet', async ({ page }) => {
    watch(page, 'a designer with a teal palette pressing Warmer')
    await signIn(page, { plan: 'pro' })
    // The reported fault: Warmer turned teal into green and periwinkle.
    const panel = await openPanel(page, 'suggest', { url: '/create/palette?c=0F766E,14B8A6,2DD4BF,0EA5E9,2563EB' })
    const mine = await chipHexes(mineRow(panel))
    const hue = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min
      if (!d) return 0
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      return (h * 60 + 360) % 360
    }
    const shift = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d) }
    const warmer = await chipHexes(rowNamed(panel, 'Warmer'))
    const cooler = await chipHexes(rowNamed(panel, 'Cooler'))
    expect(warmer).toHaveLength(mine.length)
    for (const [i, hex] of warmer.entries()) expect(shift(mine[i], hex), `Warmer moved colour ${i + 1} (${mine[i]} -> ${hex}) by more than a step`).toBeLessThanOrEqual(25)
    for (const [i, hex] of cooler.entries()) expect(shift(mine[i], hex), `Cooler moved colour ${i + 1} (${mine[i]} -> ${hex}) by more than a step`).toBeLessThanOrEqual(25)
    expect(warmer.join(), 'Warmer is not a no-op').not.toBe(mine.join())
  })

  test('Undo after an apply puts the pre-apply colours back and clears the applied row', async ({ page }) => {
    watch(page, 'a designer undoing a variation')
    const panel = await openPanel(page)
    const original = await hexes(page)
    // The board is written to history after a short pause, so wait until the
    // original is in it; applying sooner would leave Undo nothing to go back to.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-palette-history') || '[]').length), { message: 'the original board is in history' }).toBeGreaterThan(0)
    const row = rowsOf(panel).first()
    await row.click()
    await expect(row).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => joined(page)).not.toBe(original.join())

    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect.poll(() => joined(page), { message: 'Undo put the pre-apply hexes back' }).toBe(original.join())
    await expect(panel.locator('button.plb-sw-row[aria-pressed="true"]'), 'nothing is marked applied after Undo').toHaveCount(0)
    expect(await chipHexes(mineRow(panel)), 'Your palette is the board again').toEqual(original)
  })

  test('a real edit after an apply drops the applied row and rebuilds the rows from the edited board', async ({ page, context }) => {
    watch(page, 'a designer editing a colour after trying a variation')
    const panel = await openPanel(page)
    const row = rowsOf(panel).first()
    await row.click()
    await expect(row).toHaveAttribute('aria-pressed', 'true')

    // At 1440 the panel stays open while the board is edited.
    await swapSecondAndThird(page)
    await expect(panel, 'the panel stays open through an edit').toBeVisible()
    await expect(panel.locator('button.plb-sw-row[aria-pressed="true"]'), 'the board is the user\'s again, so nothing is applied').toHaveCount(0)
    const edited = await hexes(page)
    await expect.poll(async () => (await chipHexes(mineRow(panel))).join(), { message: 'Your palette follows the edit' }).toBe(edited.join())
    const got = await rowList(panel)

    // The expected list is the one a fresh visit to the edited board gets.
    const other = await context.newPage()
    await other.setViewportSize({ width: 1440, height: 900 })
    const fresh = await openPanel(other, 'suggest', { url: `/create/palette?c=${edited.map((h) => h.replace('#', '')).join(',')}` })
    expect(await rowList(fresh), 'the list was built from the edited board').toEqual(got)
    // And it is not the list the original board gets.
    const base = await context.newPage()
    await base.setViewportSize({ width: 1440, height: 900 })
    const plain = await openPanel(base, 'suggest')
    expect(await rowList(plain), 'and it is not the original board\'s list').not.toEqual(got)
  })

  test('the "?" in Your palette toggles a visible explanation of the balance score', async ({ page }) => {
    watch(page, 'someone wondering what the balance score is')
    const panel = await openPanel(page)
    const help = panel.locator('#plb-sw-help')
    const info = mineRow(panel).getByRole('button', { name: 'What the balance score measures' })
    await expect(info).toBeVisible()
    await expect(info).toHaveAttribute('aria-expanded', 'false')
    await expect(help, 'the explanation starts hidden').toBeHidden()
    await info.click()
    await expect(info).toHaveAttribute('aria-expanded', 'true')
    await expect(help).toBeVisible()
    await expect(help).toContainText(/tone range/i)
    await info.click()
    await expect(info).toHaveAttribute('aria-expanded', 'false')
    await expect(help).toBeHidden()
  })

  test('Compare in Your palette opens the applied option beside the user\'s own', async ({ page }) => {
    watch(page, 'a designer comparing a variation with their palette')
    const panel = await openPanel(page)
    await rowsOf(panel).first().click()
    await mineRow(panel).getByRole('button', { name: /^Compare .* with your palette/ }).click()
    await expect(page.getByText('Compare palettes', { exact: true })).toBeVisible()
  })

  test('the applied row names what the next press does', async ({ page }) => {
    watch(page, 'a designer hovering the applied row')
    const panel = await openPanel(page)
    const row = rowsOf(panel).first()
    await row.click()
    await row.hover()
    await expect(row.locator('.plb-sw-d-back')).toBeVisible()
    await expect(row.locator('.plb-sw-d-back')).toHaveText('Click to go back')
    await expect(row.locator('.plb-sw-d-on')).toBeHidden()
    await page.mouse.move(5, 5)
    await expect(row.locator('.plb-sw-d-on')).toBeVisible()
    await expect(row.locator('.plb-sw-d-on')).toHaveText('On your board')
    // The hover shows Your palette's colours on the strip: the target of the press.
    await row.hover()
    await expect.poll(() => row.locator('.plb-sw-chips--mine').evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  })
})

test.describe('one trial across Suggest, Explore and its tabs', () => {
  test.use({ viewport: { width: 1680, height: 900 } })

  test('a brand applied in Explore, then Suggest: Your palette is still the user\'s and the rows are built from it', async ({ page, context }) => {
    watch(page, 'a designer trying a brand, then asking for variations')
    // Start on a free system that is not the one a brand collapses to for a free
    // viewer ('auto'), so a system that came back is a system that was restored.
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await chooseMenuOption(page, systemSelect(page), 'monochromatic')
    await expect(systemSelect(page)).toContainText(/Monochromatic/i)
    const original = await boardState(page)
    expect(original.hexes.length).toBe(5)

    await toolbarButton(page, EXPLORE_BTN).click()
    const explore = explorePanel(page)
    await expect(explore).toBeVisible()
    await explore.getByRole('tab', { name: 'Brands' }).click()
    const brand = explore.locator('button.plb-sw-row').first()
    await expect(brand).toBeVisible()
    await brand.click()
    await expect(brand).toHaveAttribute('aria-pressed', 'true')
    await expect(systemSelect(page), 'the brand moved the system off Monochromatic').not.toContainText(/Monochromatic/i)
    const withBrand = await joined(page)
    expect(withBrand).not.toBe(original.hexes.join())
    expect(await chipHexes(mineRow(explore)), 'Your palette is the user\'s in Explore').toEqual(original.hexes)

    // Suggest takes the same slot in place.
    const suggest = await swapTo(page, 'suggest')
    await expect(page.locator('.plb-sx'), 'one panel slot, swapped in place').toHaveCount(1)
    await expect(toolbarButton(page, SUGGEST_BTN)).toHaveAttribute('aria-expanded', 'true')
    await expect(toolbarButton(page, EXPLORE_BTN)).toHaveAttribute('aria-expanded', 'false')
    expect(await chipHexes(mineRow(suggest)), 'Your palette still shows the original in Suggest').toEqual(original.hexes)
    await expect(suggest.locator('button.plb-sw-row[aria-pressed="true"]'), 'no variation is applied; the brand is').toHaveCount(0)
    const got = await rowList(suggest)

    // The rows are the variations of the user's colours, not of the brand on the board.
    const other = await context.newPage()
    await other.setViewportSize({ width: 1680, height: 900 })
    const plain = await openPanel(other, 'suggest')
    await chooseMenuOption(other, systemSelect(other), 'monochromatic')
    expect(await chipHexes(mineRow(plain))).toEqual(original.hexes)
    expect(got.map((l) => l.split(':')[0]), 'the same variations').toEqual((await rowList(plain)).map((l) => l.split(':')[0]))
    const names = got.map((l) => l.split(':')[0])
    expect(names).toContain('Warmer')

    // Trying a variation over the brand still lands, on going back, on the user's board.
    const first = rowsOf(suggest).first()
    await first.click()
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    await first.click()
    expect(await boardState(page), 'back on the user\'s board and system, not on the brand').toEqual(original)
  })

  test('a palette in Explore, a brand on the other tab, and pressing the brand again lands on the user\'s board', async ({ page }) => {
    watch(page, 'a designer trying a palette, then a brand, then backing out')
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await chooseMenuOption(page, systemSelect(page), 'monochromatic')
    const original = await boardState(page)

    await toolbarButton(page, EXPLORE_BTN).click()
    const explore = explorePanel(page)
    const palette = rowsOf(explore).first()
    await palette.click()
    await expect(palette).toHaveAttribute('aria-pressed', 'true')
    const withPalette = await joined(page)
    expect(withPalette).not.toBe(original.hexes.join())

    await explore.getByRole('tab', { name: 'Brands' }).click()
    expect(await chipHexes(mineRow(explore)), 'the tab switch kept the snapshot').toEqual(original.hexes)
    const brand = rowsOf(explore).first()
    await brand.click()
    await expect(brand).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => joined(page)).not.toBe(withPalette)

    await explore.getByRole('tab', { name: 'Palettes' }).click()
    await expect(palette, 'the palette is no longer the one on the board').toHaveAttribute('aria-pressed', 'false')
    await explore.getByRole('tab', { name: 'Brands' }).click()
    await expect(brand).toHaveAttribute('aria-pressed', 'true')
    await brand.click()
    expect(await boardState(page), 'the board and its system are the user\'s own').toEqual(original)
    await expect(explore.locator('button.plb-sw-row[aria-pressed="true"]'), 'nothing is ticked').toHaveCount(0)
  })

  test('a palette from Explore over a variation: going back lands on the user\'s own palette, not the variation', async ({ page }) => {
    watch(page, 'a designer trying a variation, then a community palette, then backing out of it')
    const suggest = await openPanel(page)
    const original = await boardState(page)
    const variation = rowsOf(suggest).first()
    await variation.click()
    await expect(variation).toHaveAttribute('aria-pressed', 'true')
    const withVariation = await joined(page)

    const explore = await swapTo(page, 'explore')
    const palette = rowsOf(explore).first()
    await palette.click()
    await expect(palette).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => joined(page)).not.toBe(withVariation)
    expect(await chipHexes(mineRow(explore)), 'Your palette is still the original').toEqual(original.hexes)

    const again = await swapTo(page, 'suggest')
    await expect(again.locator('button.plb-sw-row[aria-pressed="true"]'), 'the variation is no longer the one on the board').toHaveCount(0)
    const back = await swapTo(page, 'explore')
    const ticked = back.locator('button.plb-sw-row[aria-pressed="true"]')
    await expect(ticked).toHaveCount(1)
    await ticked.click()
    expect(await boardState(page), 'going back lands on the user\'s own palette').toEqual(original)
  })

  test('pressing the open toolbar button closes the panel', async ({ page }) => {
    watch(page, 'a designer closing Explore from the toolbar')
    const suggest = await openPanel(page)
    await expect(toolbarButton(page, SUGGEST_BTN)).toHaveAttribute('aria-expanded', 'true')
    await toolbarButton(page, SUGGEST_BTN).click()
    await expect(suggest).toHaveCount(0)
    await expect(toolbarButton(page, SUGGEST_BTN)).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('Explore', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Explore has a Palettes tab and a Brands tab, one tabpanel, and no variation rows', async ({ page }) => {
    watch(page, 'a designer opening Explore')
    const panel = await openPanel(page, 'explore')
    await expect(panel.getByRole('tab')).toHaveText(['Palettes', 'Brands'])
    await expect(panel.getByRole('tabpanel')).toHaveCount(1)
    await expect(panel.getByRole('heading', { level: 3 }), 'variation groups belong to Suggest').toHaveCount(0)
    await expect(rowsOf(panel).first(), 'positive control: palette rows are there').toBeVisible()
    await expect(suggestPanel(page)).toHaveCount(0)
  })

  test('Explore tabs: Palettes is selected on open, aria-controls is on the selected tab only, and the arrows move between them', async ({ page }) => {
    watch(page, 'a keyboard user moving through the Explore head')
    const panel = await openPanel(page, 'explore')
    const tabs = panel.getByRole('tablist', { name: 'Explore sections' })
    const palettes = tabs.getByRole('tab', { name: 'Palettes' })
    const brands = tabs.getByRole('tab', { name: 'Brands' })
    await expect(tabs.getByRole('tab')).toHaveCount(2)
    await expect(palettes).toHaveAttribute('aria-selected', 'true')
    await expect(palettes, 'focus is on the selected tab on open').toBeFocused()
    await expect(palettes).toHaveAttribute('aria-controls', 'plb-ex-panel-community')
    await expect(brands, 'a tab that is not selected controls a panel that is not there').not.toHaveAttribute('aria-controls', /.+/)
    await expect(panel.getByRole('tabpanel')).toHaveAttribute('id', 'plb-ex-panel-community')

    // Only the selected tab is a tab stop: Tab goes on to Close.
    await page.keyboard.press('Tab')
    await expect(panel.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
    await palettes.focus()

    await page.keyboard.press('ArrowRight')
    await expect(brands).toHaveAttribute('aria-selected', 'true')
    await expect(brands).toBeFocused()
    await expect(brands).toHaveAttribute('aria-controls', 'plb-ex-panel-brands')
    await expect(palettes).not.toHaveAttribute('aria-controls', /.+/)
    await expect(panel.getByRole('tabpanel')).toHaveAttribute('id', 'plb-ex-panel-brands')

    await page.keyboard.press('ArrowLeft')
    await expect(palettes).toHaveAttribute('aria-selected', 'true')
    await expect(palettes).toBeFocused()
    await page.keyboard.press('End')
    await expect(brands).toBeFocused()
    await page.keyboard.press('Home')
    await expect(palettes).toBeFocused()
  })

  test('the Brands search matches names only, never a hex, and Clear search puts the user back in the field', async ({ page }) => {
    watch(page, 'a designer searching the brands')
    const panel = await openPanel(page, 'explore')
    await panel.getByRole('tab', { name: 'Brands' }).click()
    const search = panel.getByRole('searchbox', { name: 'Search brands' })
    await expect(search).toBeVisible()
    const all = await rowsOf(panel).count()
    expect(all).toBeGreaterThan(2)
    const target = (await rowsOf(panel).first().locator('.plb-sw-name').textContent()).trim()

    await search.fill(target.slice(0, 4).toLowerCase())
    await expect(rowsOf(panel).filter({ hasText: target }).first(), 'a name matches case-insensitively').toBeVisible()

    // A hex is not a name: typing a free brand's own hex finds nothing.
    const free = BRAND_PALETTES.find((b) => b.free === true && b.name === target) || BRAND_PALETTES.find((b) => b.free === true)
    await search.fill(free.colors[0].replace('#', ''))
    await expect(panel.getByText(/^No brands match/)).toBeVisible()
    await expect(rowsOf(panel), 'no row matches a hex').toHaveCount(0)
    await expect(mineRow(panel), 'Your palette stays pinned').toBeVisible()

    await panel.getByRole('button', { name: 'Clear search' }).click()
    await expect(search).toHaveValue('')
    await expect(search, 'focus goes back to the field').toBeFocused()
    await expect(rowsOf(panel)).toHaveCount(all)
  })

  test('a locked brand matches by name and shows as a locked row, with no hex anywhere', async ({ page }) => {
    watch(page, 'a free visitor searching for a paid brand')
    const panel = await openPanel(page, 'explore')
    await panel.getByRole('tab', { name: 'Brands' }).click()
    const locked = panel.locator('.plb-sw-row.is-static')
    await expect(locked, 'three teased locked brands').toHaveCount(3)
    const name = (await locked.first().locator('.plb-sw-name').textContent()).trim()
    await panel.getByRole('searchbox', { name: 'Search brands' }).fill(name)
    await expect(locked.filter({ hasText: name })).toHaveCount(1)
    await expect(locked.first()).toContainText('Pro')
    // A locked row is not pressable.
    expect(await locked.first().evaluate((el) => el.tagName), 'a locked brand is not a button').not.toBe('BUTTON')
    expect(await locked.first().locator('button, a, [tabindex]').count()).toBe(0)
  })
})

test.describe('a locked brand puts no hex in the page', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const achromatic = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return Math.max(r, g, b) - Math.min(r, g, b) < 24 }
  const FREE_HEXES = new Set(BRAND_PALETTES.filter((b) => b.free === true).flatMap((b) => b.colors.map((c) => c.toUpperCase())))
  // The paid brands' own colours: chromatic, and in no open row.
  const TELLTALE = [...new Set(BRAND_PALETTES.filter((b) => b.free !== true).flatMap((b) => b.colors.map((c) => c.toUpperCase())).filter((h) => !achromatic(h) && !FREE_HEXES.has(h)))]

  test('not in the DOM, the painted colours, the accessibility tree or the search', async ({ page }) => {
    watch(page, 'a free visitor looking for a paid brand\'s colours')
    const panel = await openPanel(page, 'explore')
    await panel.getByRole('tab', { name: 'Brands' }).click()
    await expect(panel.locator('.plb-sw-row.is-static')).toHaveCount(3)
    expect(TELLTALE.length, 'the check has colours to look for').toBeGreaterThan(10)

    // `typed` is the text the test itself put in the search field. The page quotes it back
    // (the input's value, the accessibility tree's name for the field and "No brands match
    // “…”"), and that is the user's own text, not a leak. It is taken out of the text checks
    // so every OTHER withheld colour is still looked for; the painted-colour check still
    // covers the typed one.
    const leak = async (typed = '') => {
      const own = typed ? new RegExp(typed.replace('#', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null
      const strip = (t) => (own ? t.replace(own, '') : t)
      const html = strip(await panel.evaluate((el) => el.outerHTML)).toUpperCase()
      const aria = strip(await panel.ariaSnapshot()).toUpperCase()
      const paint = await panel.locator('*').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
      const painted = new Set(paint.map(toHex))
      return TELLTALE.filter((hex) => html.includes(hex) || html.includes(hex.slice(1)) || aria.includes(hex.slice(1)) || painted.has(hex))
    }
    expect(await leak(), 'a paid brand colour reached the page').toEqual([])

    // The locked rows' own chips are neutral steps, not colours.
    const chips = await panel.locator('.plb-sw-row.is-static .plb-sw-chip').evaluateAll((els) => els.map((el) => el.className))
    expect(chips.length).toBeGreaterThan(3)
    for (const c of chips) expect(c).toContain('lockt-rowcell')

    // Searching for a withheld hex finds nothing, and still leaks nothing.
    await panel.getByRole('searchbox', { name: 'Search brands' }).fill(TELLTALE[0].replace('#', ''))
    await expect(panel.getByText(/^No brands match/)).toBeVisible()
    expect(await leak(TELLTALE[0]), 'the search echoed a withheld colour').toEqual([])
    // Positive control: a FREE brand's hex is in the page (the brand rows paint), so the check can see.
    await panel.getByRole('button', { name: 'Clear search' }).click()
    const control = [...FREE_HEXES].find((h) => !achromatic(h))
    const painted = new Set(await panel.locator('*').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor)))
    expect([...painted].map(toHex), 'positive control: a free brand colour is painted').toContain(control)
  })
})

test.describe('the panel says Pro in one place', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const where of ['suggest', 'palettes', 'brands']) {
    test(`${where}: no Use arrow, no eye, no like heart, and Pro only in the meta column and the end block`, async ({ page }) => {
      watch(page, 'a free visitor reading the panel')
      const panel = await openPanel(page, where === 'suggest' ? 'suggest' : 'explore')
      if (where === 'brands') await panel.getByRole('tab', { name: 'Brands' }).click()
      await expect(rowsOf(panel).first()).toBeVisible()

      expect((await panel.innerText()), 'a Use arrow is left on a row').not.toMatch(/Use\s*(→|->)/)
      const other = await panel.getByRole('button').evaluateAll((els) => els.filter((el) => !el.classList.contains('plb-sw-row')).map((el) => el.getAttribute('aria-label') || el.textContent.trim()))
      for (const name of other) expect(name, `an extra button on the panel: ${name}`).not.toMatch(/\b(use|preview|view|like|favourite|favorite|eye|heart)\b/i)
      await expect(panel.locator('.pgal-card, .pgal-tick, .plb-sg-card, .lbry-card-actions'), 'the old gallery cards are gone').toHaveCount(0)

      // Pro is a word in the meta column or in the end-of-list block. Never over a swatch.
      const stray = await panel.evaluate((root) => {
        const out = []
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!/\bPro\b/.test(n.textContent)) continue
          const el = n.parentElement
          if (!el.closest('.plb-sw-meta, .plb-sw-problock')) out.push(el.className + ': ' + n.textContent.trim())
          if (el.closest('.plb-sw-strip')) out.push('in a strip: ' + n.textContent.trim())
        }
        return out
      })
      expect(stray, 'Pro appears outside the meta column and the end block').toEqual([])
      // Positive control: Pro IS on the panel (in the meta column or the end block), so the check reads something.
      expect(await panel.locator('.plb-sw-meta, .plb-sw-problock').filter({ hasText: 'Pro' }).count()).toBeGreaterThan(0)
    })
  }

  test('a locked variation opens Pro plans and leaves the board alone', async ({ page }) => {
    watch(page, 'a free visitor pressing a locked variation')
    const panel = await openPanel(page)
    const locked = panel.locator('button.plb-sw-row.is-locked').first()
    await expect(locked).toHaveAttribute('aria-label', /, Pro only\. Opens Pro plans\.$/)
    await expect(locked).not.toHaveAttribute('aria-pressed', /.+/)
    await expect(locked.locator('.plb-sw-meta')).toContainText('Pro')
    const before = await joined(page)
    await locked.click()
    await expect(page.getByRole('dialog').filter({ hasText: 'Every variation, unlocked' })).toBeVisible()
    expect(await joined(page), 'the board did not change').toBe(before)
  })

  test('the end block counts what Pro adds and goes to /plans', async ({ page }) => {
    watch(page, 'a free visitor reading the Palettes tab')
    const panel = await openPanel(page, 'explore')
    const block = panel.locator('.plb-sw-problock')
    await expect(block).toContainText(/Another \d+ palettes with Pro/)
    await expect(block).toContainText(/Free covers \d+ of the \d+ curated palettes\./)
    await block.getByRole('link', { name: 'See Pro plans' }).click()
    await expect(page).toHaveURL(/\/plans$/)
  })
})

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Down and Up move between rows, Enter applies and reverts, Esc closes and returns focus to the toolbar button', async ({ page }) => {
    watch(page, 'a keyboard user working the Suggest rows')
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    const opener = toolbarButton(page, SUGGEST_BTN)
    await opener.focus()
    await page.keyboard.press('Enter')
    const panel = suggestPanel(page)
    await expect(panel).toBeVisible()
    const rows = rowsOf(panel)
    await expect(rows.first(), 'focus moves to the first row on open').toBeFocused()
    // One Tab stop for the whole list.
    expect(await rows.evaluateAll((els) => els.filter((el) => el.tabIndex === 0).length)).toBe(1)

    const original = await joined(page)
    await page.keyboard.press('ArrowDown')
    await expect(rows.nth(1)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(rows.nth(2)).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(rows.nth(1)).toBeFocused()
    await page.keyboard.press('End')
    await expect(rows.last()).toBeFocused()
    await page.keyboard.press('Home')
    await expect(rows.first()).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(rows.first()).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => joined(page)).not.toBe(original)
    await expect(rows.first(), 'focus stays on the row').toBeFocused()
    await page.keyboard.press('Enter')
    await expect(rows.first()).toHaveAttribute('aria-pressed', 'false')
    expect(await joined(page), 'Enter on the applied row goes back').toBe(original)
    await expect(rows.first()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(opener, 'focus returns to the toolbar button').toBeFocused()
  })

  test('a focused row shows its hex on each chip', async ({ page }) => {
    watch(page, 'a keyboard user reading hexes')
    const panel = await openPanel(page)
    const row = rowsOf(panel).first()
    const hex = row.locator('.plb-sw-hex').first()
    await expect(hex).toHaveCSS('opacity', '0')
    await row.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await expect(row).toBeFocused()
    await expect(hex).toHaveCSS('opacity', '1')
    const want = (await chipHexes(row))[0].replace('#', '')
    await expect(hex).toHaveText(want)
  })
})

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the panel and the press use opacity only: no slide, no scale', async ({ page }) => {
    watch(page, 'someone who asked for less motion')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const panel = await openPanel(page)
    // Positive control: with motion allowed the panel slides in and a pressed row scales.
    expect(await panel.evaluate((el) => getComputedStyle(el).animationName), 'motion allowed: the panel animates in').not.toBe('none')
    const row = rowsOf(panel).first()
    await row.hover()
    await page.mouse.down()
    const pressed = await row.evaluate((el) => getComputedStyle(el).transform)
    await page.mouse.move(5, 5)
    await page.mouse.up()
    expect(pressed, 'motion allowed: a pressed row scales').not.toBe('none')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await toolbarButton(page, SUGGEST_BTN).click()
    await expect(panel).toHaveCount(0)
    await toolbarButton(page, SUGGEST_BTN).click()
    const again = suggestPanel(page)
    await expect(again).toBeVisible()
    expect(await again.evaluate((el) => getComputedStyle(el).animationName), 'reduced motion: the panel does not slide').toBe('none')
    const row2 = rowsOf(again).first()
    await row2.hover()
    await page.mouse.down()
    const reduced = await row2.evaluate((el) => getComputedStyle(el).transform)
    await page.mouse.move(5, 5)
    await page.mouse.up()
    expect(reduced, 'reduced motion: a pressed row does not scale').toBe('none')
  })
})

test.describe('the toolbar and the list on a laptop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the divider is on the toolbar row, and so is the keycap that the narrower widths drop', async ({ page }) => {
    watch(page, 'a designer looking at the toolbar')
    await go(page, BOARD)
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).not.toHaveClass(/is-measuring/)
    await expect(bar.locator('.tl-divider')).toBeVisible()
    // Positive control for the 768 test: above 1024 the keycap is shown.
    await expect(bar.locator('.tl-kbd').first()).toBeVisible()
  })

  test('the list fades while there is more to scroll, and stops at the end', async ({ page }) => {
    watch(page, 'someone scrolling the Suggest list')
    const panel = await openPanel(page)
    const body = panel.locator('.plb-sx-body')
    const room = () => body.evaluate((el) => el.scrollHeight - el.clientHeight)
    await expect.poll(room, { message: 'positive control: the list is taller than its box' }).toBeGreaterThan(40)
    await expect(body).toHaveAttribute('data-more', 'true')

    await body.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect(body).toHaveAttribute('data-more', 'false')
    await body.evaluate((el) => { el.scrollTop = 0 })
    await expect(body, 'and it comes back when scrolled up').toHaveAttribute('data-more', 'true')
  })

  // Rows that arrive late (a fetched list) make the body taller to scroll without resizing the
  // body, which is what the resize watcher sees; only the content watcher notices.
  test('the fade follows rows that arrive after the list is open', async ({ page }) => {
    watch(page, 'someone whose list finishes loading after the panel opened')
    const panel = await openPanel(page)
    const body = panel.locator('.plb-sx-body')
    await body.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect(body, 'positive control: at the end there is nothing more to scroll').toHaveAttribute('data-more', 'false')
    const size = await body.evaluate((el) => el.clientHeight)
    await body.evaluate((el) => {
      const late = document.createElement('div')
      late.id = 'late-rows'
      late.style.height = '600px'
      el.append(late)
    })
    expect(await body.evaluate((el) => el.clientHeight), 'the body itself did not change size').toBe(size)
    await expect(body, 'late rows put the fade back').toHaveAttribute('data-more', 'true')
    await body.evaluate(() => document.getElementById('late-rows').remove())
    await expect(body, 'and taking them away clears it').toHaveAttribute('data-more', 'false')
  })

  test('every colour system option has a description the screen reader gets', async ({ page }) => {
    watch(page, 'a screen-reader user choosing a colour system')
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await page.getByRole('button', { name: /^Colour system/ }).click()
    const list = page.locator('.menu-select-list[role="listbox"]')
    await expect(list).toBeVisible()

    const options = list.getByRole('option')
    const count = await options.count()
    expect(count, 'the list has the harmony options').toBeGreaterThan(3)

    const report = await options.evaluateAll((rows) => rows.map((row) => {
      const ids = (row.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
      const text = ids.map((id) => document.getElementById(id)?.textContent?.trim() || '').join(' ').trim()
      return { value: row.dataset.value, ids: ids.length, text }
    }))
    const bad = report.filter((r) => !r.ids || !r.text)
    expect(bad, `options with no description linked by aria-describedby: ${JSON.stringify(bad)}`).toEqual([])
    // A description is a sentence, not a repeat of the label.
    for (const r of report) expect(r.text.length, `${r.value}: description is too short to explain anything`).toBeGreaterThan(10)
    // The description is read once, as the description: the option's name
    // must not also contain it.
    for (let i = 0; i < count; i++) {
      const row = options.nth(i)
      const desc = report[i].text
      const name = await row.evaluate((el) => el.getAttribute('aria-label') || el.textContent || '')
      expect(name.includes(desc), `${report[i].value}: the description is also in the option's name`).toBe(false)
    }
  })
})

test.describe('Suggest at 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('Undo and Redo are both on the row, and no keycap is showing', async ({ page }) => {
    watch(page, 'someone on a tablet')
    await go(page, BOARD)
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).not.toHaveClass(/is-measuring/)
    await expect(bar.getByRole('button', { name: 'Undo', exact: true })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Redo', exact: true })).toBeVisible()
    const shown = await bar.locator('.tl-kbd').evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none').length)
    expect(shown, 'no .tl-kbd keycap is visible below 1024').toBe(0)
  })

  test('the dock sits on top of the adjust bar, never below it, and the top of the board stays visible', async ({ page }) => {
    watch(page, 'a designer on a tablet')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await expect(panel).toHaveAttribute('aria-modal', 'false')
    await settled(panel)
    const box = await panel.boundingBox()
    const bar = await page.locator('.plb-adjust').boundingBox()
    const col = await page.locator('.plb-col').first().boundingBox()
    expect(box.y + box.height, `the dock ends at ${box.y + box.height}, below the adjust bar's top ${bar.y}`).toBeLessThanOrEqual(bar.y + 1)
    expect(box.height, 'the dock is at most 400px tall').toBeLessThanOrEqual(401)
    expect(box.width, 'full width').toBeGreaterThanOrEqual(766)
    // The layout invariant at 768: the dock rests on the adjust bar's top edge (the bar is 138px
    // tall here, so the board is not a fixed 400px) and the board shows above it.
    expect(Math.abs(box.y + box.height - bar.y), `the dock ends at ${box.y + box.height}, the adjust bar starts at ${bar.y}: not on its top edge`).toBeLessThanOrEqual(1)
    expect(box.y - col.y, `only ${box.y - col.y}px of the board is visible above the dock`).toBeGreaterThanOrEqual(300)
    // The dock does not cover the adjust bar.
    const covered = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.plb-sx') != null, { x: bar.x + 20, y: bar.y + 10 })
    expect(covered, 'the dock covers the adjust bar').toBe(false)
    // Chips are wider here: five of them across the whole dock.
    const strips = await chipBoxes(panel)
    expect(strips[0][0].w, 'the chips use the width').toBeGreaterThan(120)
    // Applying works from the dock and Esc closes it.
    const row = rowsOf(panel).first()
    await row.click()
    await expect(row).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
  })

  test('a press outside the dock closes it', async ({ page }) => {
    watch(page, 'a designer on a tablet tapping away')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await settled(panel)
    await page.locator('.plb [data-tool-toolbar]').click({ position: { x: 4, y: 4 } })
    await expect(panel).toHaveCount(0)
  })
})

test.describe('Suggest at 900', () => {
  test.use({ viewport: { width: 900, height: 900 } })

  // The Pro modal is a layer above the dock, not an outside press on it: its scrim and its
  // dialog are both "inside". Pressing either must leave the dock (and its rows) where they were.
  test('a press in the Pro modal, or on its scrim, does not close the dock behind it', async ({ page }) => {
    watch(page, 'a free visitor on a tablet who pressed a locked variation')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await settled(panel)
    const dock = page.locator('.plb-sx')
    await expect(dock, 'below 1024 the dock is one an outside press may close').toHaveCount(1)
    await panel.locator('button.plb-sw-row.is-locked').first().click()
    const pro = page.getByRole('dialog').filter({ hasText: 'Every variation, unlocked' })
    await expect(pro).toBeVisible()
    await expect(dock, 'opening the modal leaves the dock').toHaveCount(1)
    // A press on the modal's own heading.
    await pro.getByRole('heading').first().click()
    await expect(pro, 'a press inside the modal keeps it open').toBeVisible()
    await expect(dock, 'a press inside the modal does not close the dock').toHaveCount(1)
    // A press on the scrim closes the modal only.
    await page.mouse.click(4, 4)
    await expect(pro).toHaveCount(0)
    await expect(dock, 'a press on the scrim closes the modal, not the dock').toHaveCount(1)
    await expect(rowsOf(panel).nth(2)).toBeVisible()
    // Positive control: a real outside press (the toolbar) still closes the dock.
    await page.locator('.plb [data-tool-toolbar]').click({ position: { x: 4, y: 4 } })
    await expect(dock).toHaveCount(0)
  })
})

test.describe('Suggest on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

  test('it opens at Peek: 360px tall, Your palette and three rows showing, chips 28px', async ({ page }) => {
    watch(page, 'someone opening Suggest on a phone')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await expect(panel).toHaveAttribute('data-snap', 'peek')
    await settled(panel)
    const vh = 844
    const box = await panel.boundingBox()
    expect(Math.abs((vh - box.y) - 360), `the sheet shows ${vh - box.y}px, not 360`).toBeLessThanOrEqual(2)
    const pin = await mineRow(panel).boundingBox()
    expect(pin.y + pin.height, 'Your palette is inside the visible sheet').toBeLessThanOrEqual(vh)
    const visibleRows = await rowsOf(panel).evaluateAll((els, h) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= h }).length, vh)
    expect(visibleRows, 'at least three rows show at Peek').toBeGreaterThanOrEqual(3)
    // The board is still visible above the sheet.
    const col = await page.locator('.plb-col').first().boundingBox()
    expect(col.y, 'the board starts above the sheet').toBeLessThan(box.y - 100)

    const strips = await chipBoxes(panel)
    for (const boxes of strips) for (const b of boxes) expect(Math.round(b.h), 'chips are 28px on a phone').toBe(28)
    const rows = await rowsOf(panel).first().boundingBox()
    expect(Math.round(rows.height), 'rows are 64px on a phone').toBeGreaterThanOrEqual(64)
    expect(Math.round(rows.height)).toBeLessThanOrEqual(66)
  })

  test('the handle button switches between Peek and Full', async ({ page }) => {
    watch(page, 'someone pulling the sheet up')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await settled(panel)
    const handle = panel.getByRole('button', { name: 'Expand' })
    await expect(handle).toBeVisible()
    await handle.click()
    await expect(panel).toHaveAttribute('data-snap', 'full')
    await settled(panel)
    const full = 844 - (await panel.boundingBox()).y
    expect(Math.abs(full - 0.88 * 844), `Full shows ${full}px, not 88% of the screen`).toBeLessThanOrEqual(3)
    const collapse = panel.getByRole('button', { name: 'Collapse' })
    await collapse.click()
    await expect(panel).toHaveAttribute('data-snap', 'peek')
    await expect(panel.getByRole('button', { name: 'Expand' })).toBeVisible()
  })

  // Where the list can be seen at Peek: below the pinned "Your palette" row, above the screen's
  // bottom edge. The sheet is drawn at Full height and slid down, so a row can be inside its
  // scroll box and still be off the screen.
  const visibleBand = async (panel, vh = 844) => {
    const pin = await mineRow(panel).boundingBox()
    return { top: pin.y + pin.height - 1, bottom: vh }
  }
  const fullyVisible = (panel, band) => rowsOf(panel).evaluateAll((els, b) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.top >= b.top && r.bottom <= b.bottom }).length, band)

  test('Peek at 390x844 shows three whole rows under Your palette, and no intro line', async ({ page }) => {
    watch(page, 'someone reading the Suggest sheet at its resting height')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await expect(panel).toHaveAttribute('data-snap', 'peek')
    await settled(panel)
    await expect(mineRow(panel), 'Your palette is showing').toBeInViewport({ ratio: 1 })
    await expect(panel.locator('.plb-sx-intro--sg'), 'the intro line is dropped on a phone').toBeHidden()
    const band = await visibleBand(panel)
    expect(await fullyVisible(panel, band), 'whole rows between Your palette and the bottom of the screen').toBeGreaterThanOrEqual(3)
  })

  test('the group labels are hidden to the eye at Peek but stay in the accessibility tree', async ({ page }) => {
    watch(page, 'a screen-reader user on the Suggest sheet')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await expect(panel).toHaveAttribute('data-snap', 'peek')
    await settled(panel)
    const names = ['Temperature', 'Strength', 'Light and dark', 'Hue']
    const heads = panel.getByRole('heading', { level: 3 })
    await expect(heads, 'the four labels are headings the tree still has').toHaveText(names)
    const tree = await panel.ariaSnapshot()
    for (const n of names) {
      expect(tree, `${n} is a heading in the accessibility tree at Peek`).toContain(`heading "${n}" [level=3]`)
      await expect(panel.getByRole('region', { name: n }), `${n} still names its group of rows`).toHaveCount(1)
    }
    const peekBoxes = await heads.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height] }))
    for (const [w, h] of peekBoxes) expect(Math.max(w, h), 'a label at Peek takes no room').toBeLessThanOrEqual(1)
    // Positive control: at Full the same labels are drawn.
    await panel.getByRole('button', { name: 'Expand' }).click()
    await expect(panel).toHaveAttribute('data-snap', 'full')
    await settled(panel)
    await expect(heads.first(), 'at Full the group label is visible').toBeVisible()
    expect(await heads.first().evaluate((el) => el.getBoundingClientRect().height), 'and has its own line').toBeGreaterThanOrEqual(12)
    await expect(panel.locator('.plb-sx-intro--sg'), 'the intro line comes back at Full').toBeVisible()
  })

  test('applying a Suggest row from Full drops the sheet to Peek and keeps the applied row on screen', async ({ page }) => {
    watch(page, 'a Pro designer applying a variation from the bottom of the list')
    await signIn(page, { plan: 'pro' })
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await panel.getByRole('button', { name: 'Expand' }).click()
    await expect(panel).toHaveAttribute('data-snap', 'full')
    await settled(panel)
    // The last row is well below the first Peek screen: the worst case for "still in view".
    const last = rowsOf(panel).last()
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()
    const before = await joined(page)
    await last.click()
    await expect(last).toHaveAttribute('aria-pressed', 'true')
    await expect(panel, 'applying drops the sheet to Peek so the board shows').toHaveAttribute('data-snap', 'peek')
    await settled(panel)
    await expect.poll(() => joined(page), { message: 'the board took the variation' }).not.toBe(before)
    // The applied row is scrolled into the part of the sheet that is on screen.
    await expect.poll(async () => {
      const band = await visibleBand(panel)
      const r = await last.boundingBox()
      return r.y >= band.top && r.y + r.height <= band.bottom
    }, { message: 'the applied row is under Your palette and above the bottom of the screen' }).toBe(true)
    await expect(last).toBeInViewport({ ratio: 1 })
    await expect(last).toContainText('Tap again to go back')
    // Tapping it again goes back and the sheet stays at Peek.
    await last.click()
    await expect(last).toHaveAttribute('aria-pressed', 'false')
    await expect(panel).toHaveAttribute('data-snap', 'peek')
  })

  test('Explore opens from Extra tools on a phone, and applying a palette or a brand drops it to Peek', async ({ page }) => {
    watch(page, 'someone finding Explore on a phone')
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    // At 390 the toolbar row holds Suggest but not Explore: Explore is in the Extra tools sheet.
    await expect(page.locator('.plb [data-tool-toolbar]').getByRole('button', { name: EXPLORE_BTN, exact: true }), 'Explore is not on the 390 toolbar row').toHaveCount(0)
    await page.locator('.plb [data-tool-toolbar]').getByRole('button', { name: /^Extra tools/ }).click()
    await page.getByRole('button', { name: EXPLORE_BTN, exact: true }).click()
    const panel = explorePanel(page, 'dialog')
    await expect(panel, 'Explore opened from Extra tools').toBeVisible()
    await expect(panel).toHaveAttribute('data-snap', 'full')
    await settled(panel)
    const original = await joined(page)

    // A palette from well down the list.
    const palette = rowsOf(panel).nth(8)
    await palette.scrollIntoViewIfNeeded()
    await palette.click()
    await expect(palette).toHaveAttribute('aria-pressed', 'true')
    await expect(panel, 'a palette drops the sheet to Peek').toHaveAttribute('data-snap', 'peek')
    await settled(panel)
    await expect.poll(() => joined(page)).not.toBe(original)
    await expect(palette).toBeInViewport({ ratio: 1 })
    const band = await visibleBand(panel)
    const box = await palette.boundingBox()
    expect(box.y, 'the applied palette is under Your palette, not behind it').toBeGreaterThanOrEqual(band.top)

    // A brand: the other tab applies through the same drop.
    await panel.getByRole('button', { name: 'Expand' }).click()
    await expect(panel).toHaveAttribute('data-snap', 'full')
    await panel.getByRole('tab', { name: 'Brands' }).click()
    const brand = rowsOf(panel).first()
    await brand.click()
    await expect(brand).toHaveAttribute('aria-pressed', 'true')
    await expect(panel, 'a brand drops the sheet to Peek').toHaveAttribute('data-snap', 'peek')
    await expect(brand).toBeInViewport({ ratio: 1 })
  })

  test('Explore Palettes opens at Full, and applying a row drops the sheet to Peek so the board shows', async ({ page }) => {
    watch(page, 'someone browsing palettes on a phone')
    const panel = await openPanel(page, 'explore', { role: 'dialog' })
    await expect(panel).toHaveAttribute('data-snap', 'full')
    const row = rowsOf(panel).first()
    await row.click()
    await expect(row).toHaveAttribute('aria-pressed', 'true')
    await expect(panel, 'applying from Full drops to Peek').toHaveAttribute('data-snap', 'peek')
    await expect(row, 'the applied row is still in view').toBeInViewport()
    await expect(row).toContainText('Tap again to go back')
  })

  test('the Explore sheet head is one row: the tabs and the close button are level', async ({ page }) => {
    watch(page, 'someone opening Explore on a phone')
    const dialog = await openPanel(page, 'explore', { role: 'dialog' })
    const tabs = dialog.getByRole('tablist', { name: 'Explore sections' })
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    const title = dialog.locator('.plb-menu-title')
    await expect(tabs).toBeVisible()
    await expect(title, 'at 390 the title is still showing').toBeVisible()
    await settled(close, 'the sheet')
    const [t, c, h] = [await tabs.boundingBox(), await close.boundingBox(), await dialog.locator('.plb-sx-head').boundingBox()]
    const mid = (b) => b.y + b.height / 2
    expect(Math.abs(mid(c) - mid(t)), `close centre ${mid(c)} vs tabs centre ${mid(t)}: the head is two rows`).toBeLessThanOrEqual(4)
    expect(h.height, `the head is ${h.height}px tall: it wrapped onto a second row`).toBeLessThan(Math.max(c.height, t.height) + 24)
    expect(Math.round(c.height), 'the Explore Close button is a 44px touch target').toBeGreaterThanOrEqual(44)
    expect(Math.round(c.width), 'the Explore Close button is a 44px touch target').toBeGreaterThanOrEqual(44)
  })

  test('the Suggest sheet head is one row: the close button is level with the title', async ({ page }) => {
    watch(page, 'someone opening Suggest on a phone')
    const dialog = await openPanel(page, 'suggest', { role: 'dialog' })
    const title = dialog.locator('.plb-menu-title')
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    await expect(title).toBeVisible()
    await expect(close).toBeVisible()
    await settled(close, 'the sheet')
    const [t, c, h] = [await title.boundingBox(), await close.boundingBox(), await dialog.locator('.plb-sx-head').boundingBox()]
    const mid = (b) => b.y + b.height / 2
    expect(Math.abs(mid(c) - mid(t)), `close centre ${mid(c)} vs title centre ${mid(t)}: the head is two rows`).toBeLessThanOrEqual(4)
    expect(h.height, `the head is ${h.height}px tall: it wrapped onto a second row`).toBeLessThan(c.height + 24)
    expect(c.x + c.width, 'the close button is on screen').toBeLessThanOrEqual(390 + 1)
  })

  // Is the element the one under a finger at the top, middle and bottom of its own box?
  const edgesTakePress = (loc) => loc.evaluate((el) => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2
    return [r.top + 1, r.top + r.height / 2, r.bottom - 1].map((y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)) })
  })

  // The "?" and Compare are 44px targets inside a 20px label line. They are centred on it with a
  // negative block margin, so the line stays 20px and the label does not drop into the colour strip.
  test('at Peek the "Your palette" label row clears the colour strip, and "?" and Compare still work', async ({ page }) => {
    watch(page, 'someone reading the Your palette label on a phone')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await expect(panel).toHaveAttribute('data-snap', 'peek')
    await settled(panel)
    await rowsOf(panel).first().click() // Compare only shows once something is applied
    const pin = mineRow(panel)
    const info = pin.getByRole('button', { name: 'What the balance score measures' })
    const compare = pin.getByRole('button', { name: /^Compare .* with your palette/ })
    await expect(info).toBeVisible()
    await expect(compare).toBeVisible()
    const boxOf = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width, h: r.height } })
    const strip = await boxOf(pin.locator('.plb-sw-strip'))
    for (const [what, loc] of [['the label line', pin.locator('.plb-sw-line')], ['the name', pin.locator('.plb-sw-name')], ['the "?" circle', info.locator('span')]]) {
      const b = await boxOf(loc)
      expect(b.bottom, `${what} ends at ${b.bottom}, below the top of the strip at ${strip.top}`).toBeLessThanOrEqual(strip.top)
    }
    expect((await boxOf(pin.locator('.plb-sw-line'))).h, 'the label line is still 20px tall').toBeLessThanOrEqual(21)
    const circle = await boxOf(info.locator('span'))
    expect(Math.round(circle.w), 'the "?" circle stays 20px').toBe(20)
    // Both targets are 44px tall and wide; Compare's whole box takes the press, including the
    // part that overlaps the strip (the "?" is in its own test below).
    for (const [what, loc] of [['"?"', info], ['Compare', compare]]) {
      const b = await boxOf(loc)
      expect(Math.round(b.h), `${what} target is 44px tall`).toBeGreaterThanOrEqual(44)
      expect(Math.round(b.w), `${what} target is 44px wide`).toBeGreaterThanOrEqual(44)
    }
    expect(await edgesTakePress(compare), 'Compare: top, middle and bottom edge of the target take the press, not the strip').toEqual([true, true, true])
    // The "?" still opens its help, and Compare still presses.
    await info.click()
    await expect(info).toHaveAttribute('aria-expanded', 'true')
    await expect(panel.locator('#plb-sw-help')).toBeVisible()
    await info.click()
    await expect(panel.locator('#plb-sw-help')).toBeHidden()
    await compare.click()
    await expect(page.getByText('Compare palettes', { exact: true })).toBeVisible()
  })

  // The "?" sits inside .plb-sw-detail, which clips (overflow: hidden, for the ellipsis). If that
  // clip reaches the 44px button, its top and bottom 12px fall through to the head and the strip.
  test('at Peek the "?" takes a press over its whole 44px box, not just the 20px circle', async ({ page }) => {
    watch(page, 'someone tapping just below the ? on a phone')
    const panel = await openPanel(page, 'suggest', { role: 'dialog' })
    await settled(panel)
    const info = mineRow(panel).getByRole('button', { name: 'What the balance score measures' })
    expect(await edgesTakePress(info), '"?": top, middle and bottom edge of the target take the press').toEqual([true, true, true])
  })

  test('rows run the full width of the sheet, one under another: no sideways scroller', async ({ page }) => {
    watch(page, 'someone scrolling Suggest on a phone')
    const dialog = await openPanel(page, 'suggest', { role: 'dialog' })
    await settled(dialog)
    const [sheet, a, b] = [await dialog.boundingBox(), await rowsOf(dialog).nth(0).boundingBox(), await rowsOf(dialog).nth(1).boundingBox()]
    expect(a.width, 'a row spans the sheet').toBeGreaterThanOrEqual(sheet.width - 2)
    expect(b.y, 'the second row is under the first').toBeGreaterThanOrEqual(a.y + a.height - 1)
    const sideways = await dialog.locator('.plb-sx-body').evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    expect(sideways, 'the list scrolls sideways').toBe(false)
  })
})

test.describe('the narrowest phone', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

  for (const kind of ['suggest', 'explore']) {
    test(`${kind} at 320: no horizontal scroll anywhere, and the head fits one row`, async ({ page }) => {
      watch(page, 'someone on a small phone')
      const panel = await openPanel(page, kind, { role: 'dialog' })
      if (kind === 'explore') await panel.getByRole('tab', { name: 'Brands' }).click()
      await settled(panel)
      const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }))
      expect(wide.doc, 'the page scrolls sideways').toBeLessThanOrEqual(wide.win)
      expect(await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 1), 'the sheet overflows').toBe(false)
      expect(await panel.locator('.plb-sx-body').evaluate((el) => el.scrollWidth > el.clientWidth + 1), 'the list overflows').toBe(false)
      const close = await panel.getByRole('button', { name: 'Close', exact: true }).boundingBox()
      expect(close.x + close.width, 'Close is on screen').toBeLessThanOrEqual(321)
      const head = await panel.locator('.plb-sx-head').boundingBox()
      expect(head.height, 'the head wrapped').toBeLessThanOrEqual(56)
      if (kind === 'explore') {
        const tabs = await panel.getByRole('tablist').boundingBox()
        expect(tabs.x + tabs.width, 'the tabs run past Close').toBeLessThanOrEqual(close.x + 1)
        const title = await panel.locator('.plb-menu-title').boundingBox()
        expect(title.width, 'at 320 the title is for screen readers only').toBeLessThanOrEqual(2)
      }
    })
  }
})

test.describe('the toolbar row never wraps with a panel open', () => {
  const shape = (page) => page.locator('.plb [data-tool-toolbar]').evaluate((bar) => {
    const r = bar.getBoundingClientRect()
    const btns = [...bar.querySelectorAll('button, a, select')].filter((b) => b.offsetParent !== null && b.getBoundingClientRect().width > 0)
    const rows = new Set(btns.map((b) => Math.round(b.getBoundingClientRect().top / 8)))
    return { h: Math.round(r.height), rows: rows.size, scrolls: bar.scrollWidth > bar.clientWidth + 1 }
  })

  for (const [width, height, phone] of [[320, 640, true], [390, 844, true], [768, 1024, false], [1440, 900, false]]) {
    test(`at ${width} with Suggest, then Explore, open`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height }, ...(phone ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) })
      const page = await ctx.newPage()
      try {
        watch(page, `a designer at ${width}px`)
        const role = width >= 1024 ? 'complementary' : 'dialog'
        await go(page, BOARD)
        await expect(page.locator('.plb-col')).toHaveCount(5)
        await expect(page.locator('.plb [data-tool-toolbar]')).not.toHaveClass(/is-measuring/)
        const closed = await shape(page)
        for (const kind of ['suggest', 'explore']) {
          await clickPaletteAction(page, kind === 'suggest' ? SUGGEST_BTN : EXPLORE_BTN, kind === 'suggest' ? 'Suggest' : EXPLORE_BTN)
          const panel = kind === 'suggest' ? suggestPanel(page, role) : explorePanel(page, role)
          await expect(panel).toBeVisible()
          await settled(panel)
          await expect(page.locator('.plb [data-tool-toolbar]')).not.toHaveClass(/is-measuring/)
          const open = await shape(page)
          expect(open.h, `${width}px, ${kind} open: the toolbar is ${open.h}px, ${closed.h}px closed`).toBe(closed.h)
          expect(open.rows, `${width}px, ${kind} open: the toolbar is on ${open.rows} rows`).toBe(closed.rows)
          expect(open.scrolls, `${width}px, ${kind} open: the toolbar scrolls sideways`).toBe(closed.scrolls)
          if (width >= 768) expect(open.h, `${width}px: the toolbar wrapped`).toBeLessThanOrEqual(62)
          await panel.getByRole('button', { name: 'Close', exact: true }).click()
          await expect(panel).toHaveCount(0)
        }
      } finally { await ctx.close() }
    })
  }
})
