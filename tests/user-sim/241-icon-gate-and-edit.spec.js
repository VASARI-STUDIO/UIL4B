// THE SIGNED-OUT GATE LEADS WITH THE ICON COUNT, TWO BLURRED ROWS SIT OVER IT, AND THE EDIT POP-UP IS ROOMY: ONE COLUMN, OR TWO FROM 960PX WITH THE PREVIEW STICKY.
//
// 1. /create/icons signed out: the gate heading reads "Log in to access N icons", N being every icon a
//    free account opens (the sum of the free and signed-out packs' committed lists, less the Carbon
//    logo-* names that stay on Pro). Above the gate band sit two WHOLE rows of blurred tiles, one cell per
//    grid column per row, at 390, 768 and 1440: aria-hidden, nothing in them focusable, no pointer events.
// 2. The edit (customise) pop-up keeps its roomy controls: head with the eyebrow and name, stage, a tag row with
//    Reset at its end, size tiles, controls in one stack (Rotate and Flip as labelled segments), the SVG box,
//    then the pinned foot. Below 960px that is one column. From 960px (and 720px tall) the stage and size tiles
//    become a sticky left column that stays on screen while the controls scroll on the right, and no control on the
//    right is narrower than it was in one column (the size tiles, now in the 328px column, are the one deliberate
//    exception: they stay at least 36px wide and fit their labels). The head wears a hairline once the body scrolls under it. On a touch
//    screen every control is 44px or more; at every width nothing overflows sideways and no control is
//    narrower than its own label; on a phone the first screen shows the preview, the size and the colour.
//
// The expected sum is computed here from the committed snapshots (public/iconify/collections), separately
// from src/data/iconPackCounts.generated.js, so either side drifting fails here.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   TEASE_ROWS goes back to 1 (utils/iconEndBand.js)                          -> "two whole blurred rows"
//   .ig-end-tease loses pointer-events:none, or a cell gets a tabIndex         -> "not focusable, no pointer"
//   ICON_GATE_COPY.end.anon.heading goes back to "Log in to open all N sets."  -> "the gate heading"
//   iconPackCounts.generated.js loses a pack                                   -> "the gate quotes the real total"
//   the two-column rule's min-width goes below 960 (icon-emoji-library.css)    -> "one column" at 959
//   .icust-aside loses position:sticky, or the grid goes (icon-emoji-library.css) -> "preview stays in view"
//   the panel stays 600px wide in the two-column rule                          -> "no narrower" / "wider than 600"
//   .is-scrolled is never set (IconLibrary.jsx onScroll), or the head loses its border -> "hairline"
//   .iel-page .icust-size loses its padding, or the stage grows tall on a phone -> "first screen"
//   .iel-page .icust-seg button loses its pointer:coarse min-height            -> "44px on touch"
//   the touch size-rail gap goes back to 8px in two columns                    -> "1180 on a touch tablet"
import { readFileSync } from 'node:fs'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { gridColumns } from './icon-grid-rows.js'

const WIDTHS = [390, 768, 1440]
// Packs a free account opens: the five signed-out sets plus the seven behind login.
const FREE_PACKS = ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph', 'mdi', 'material-symbols', 'solar', 'fa6-solid', 'bxs', 'mingcute', 'carbon']

/** What the heading should quote: every name in those snapshots, less Carbon's Pro-only logo-* marks. */
function expectedFreeTotal() {
  let sum = 0
  for (const pack of FREE_PACKS) {
    const d = JSON.parse(readFileSync(new URL(`../../public/iconify/collections/${pack}.json`, import.meta.url), 'utf8'))
    const names = new Set([...(d.uncategorized || []), ...Object.values(d.categories || {}).flat()])
    for (const n of names) if (!(pack === 'carbon' && n.startsWith('logo-'))) sum += 1
  }
  return sum
}

async function openLibrary(page, width, height = 900) {
  await page.setViewportSize({ width, height })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
}

test.describe('the signed-out gate', () => {
  for (const width of WIDTHS) {
    test(`${width}: the heading quotes the real total and two whole blurred rows sit above the band`, async ({ page }) => {
      watch(page, 'a designer who has not signed up yet, reaching the end of the icon grid')
      await openLibrary(page, width)
      const gate = page.locator('.ig-end[data-gate="anon"]')
      await expect(gate).toBeVisible()

      const heading = (await gate.getByRole('heading', { level: 2 }).textContent()).trim()
      const m = heading.match(/^Log in to access ([\d,]+) icons$/)
      expect(m, `the gate heading: "${heading}"`).not.toBeNull()
      const quoted = Number(m[1].replace(/,/g, ''))
      expect(quoted, 'the gate quotes the real total').toBeGreaterThanOrEqual(expectedFreeTotal())
      await expect(gate.locator('.ig-end-p'), 'the sets count stays as secondary text').toContainText('across 12 sets')

      const cols = await gridColumns(page)
      const tease = page.locator('.ig-end-tease')
      const tops = await tease.locator('> *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      expect(tops.length, 'two whole blurred rows: two cells per grid column').toBe(cols * 2)
      expect([...new Set(tops)].length, 'the cells sit on exactly two rows').toBe(2)
      const aboveBand = await page.evaluate(() => {
        const t = document.querySelector('.ig-end-tease').getBoundingClientRect()
        const b = document.querySelector('.ig-end-band').getBoundingClientRect()
        return b.top >= t.top && b.top < t.bottom + 1
      })
      expect(aboveBand, 'the band comes after the rows (it rises into their faded foot)').toBe(true)

      await expect(tease, 'hidden from assistive tech').toHaveAttribute('aria-hidden', 'true')
      expect(await tease.evaluate((el) => getComputedStyle(el).pointerEvents), 'no pointer events: nothing to hover or press').toBe('none')
      expect(await tease.locator('a, button, input, select, textarea, [tabindex]').count(), 'not focusable').toBe(0)
      expect(await tease.locator('.ig-end-chip').count(), 'no hover chip').toBe(0)
      await expect(tease.locator('svg').first()).toBeVisible()
    })
  }

  test('the rows do not move once the page has settled (no layout shift)', async ({ page }) => {
    watch(page, 'a designer on a phone watching the icon grid load')
    await openLibrary(page, 390)
    const top = () => page.locator('.ig-end-tease').evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
    const first = await top()
    await page.waitForTimeout(600)
    expect(await top(), 'the blurred rows moved after load').toBe(first)
  })
})

test.describe('the edit pop-up', () => {
  const open = async (page, width, height = 900) => {
    await openLibrary(page, width, height)
    await page.locator('.ig .ic').first().click()
    await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.icust-copy')).toBeEnabled({ timeout: 20_000 })
    await panelSettled(page)
  }

  /** The panel rises a few pixels as it opens; measure only once it has stopped (same top on three samples 80ms apart). */
  const panelSettled = async (page) => {
    let last = null; let same = 0
    await expect.poll(async () => {
      const top = await page.locator('.icust-panel').evaluate((el) => el.getBoundingClientRect().top)
      same = top === last ? same + 1 : 0; last = top
      await page.waitForTimeout(80)
      return same
    }, { message: 'the pop-up stopped moving', timeout: 10_000 }).toBeGreaterThanOrEqual(3)
  }

  /** Anything inside the panel that sticks out of it sideways, and any control narrower than its own label. */
  const overflowReport = (page) => page.evaluate(() => {
    const p = document.querySelector('.icust-panel').getBoundingClientRect()
    const sideways = [...document.querySelectorAll('.icust-panel, .icust-panel *')]
      .filter((el) => el.getClientRects().length && getComputedStyle(el).position !== 'fixed')
      .filter((el) => { const r = el.getBoundingClientRect(); return r.right > p.right + 1 || r.left < p.left - 1 })
      .map((el) => el.className || el.tagName).slice(0, 5)
    const tight = [...document.querySelectorAll('.icust-panel button, .icust-panel [role="radio"]')]
      .filter((el) => el.getClientRects().length && el.textContent.trim())
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => `${el.className}: ${el.textContent.trim().slice(0, 24)}`)
    return { sideways, tight }
  })

  /** Controls under 44px (a small visual can carry its 44px hit area on an absolutely positioned ::after). */
  const smallTargets = (page) => page.evaluate(() => [...document.querySelectorAll('.icust-panel button, .icust-panel [role="radio"], .icust-panel input:not([type="range"])')]
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
    .map((el) => {
      const r = el.getBoundingClientRect(); const a = getComputedStyle(el, '::after')
      const hit = a.content !== 'none' && a.position === 'absolute' ? { w: parseFloat(a.width) || 0, h: parseFloat(a.height) || 0 } : { w: 0, h: 0 }
      return { n: `${el.className || el.tagName}: ${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}`, w: Math.round(Math.max(r.width, hit.w)), h: Math.round(Math.max(r.height, hit.h)) }
    })
    .filter((c) => c.h < 44 || c.w < 44))

  for (const width of [390, 768, 959]) {
    test(`${width}: one column in the old order, no overflow, no control narrower than its label`, async ({ page }) => {
      watch(page, 'a designer editing an icon')
      await open(page, width)
      const panel = page.locator('.icust-panel')
      await expect(page.locator('.icust-eyebrow')).toHaveText('Customise')
      // Head, stage, tag row, size tiles, controls, SVG box and foot run down the one column, in that order. The
      // foot is pinned to the bottom of the panel, so its on-screen top is not a fair test: compare document order.
      const inOrder = await page.evaluate(() => {
        const els = ['.icust-head', '.icust-stage', '.icust-meta', '.icust-size', '.icust-controls', '.icust-code', '.icust-foot--tool'].map((s) => document.querySelector(s))
        if (els.some((e) => !e)) return 'a section is missing'
        for (let i = 1; i < els.length; i++) if (!(els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING)) return `section ${i} comes before section ${i - 1}`
        return 'ok'
      })
      expect(inOrder, 'the sections are in the old order').toBe('ok')
      const tops = await page.evaluate(() => ['.icust-head', '.icust-stage', '.icust-meta', '.icust-size', '.icust-controls', '.icust-code']
        .map((s) => Math.round(document.querySelector(s).getBoundingClientRect().top)))
      expect(tops, 'below 960px the sections stack in one column, top to bottom').toEqual([...tops].sort((a, b) => a - b))
      const lefts = await page.evaluate(() => ['.icust-stage', '.icust-size-rail', '.icust-controls .icust-row'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().left)))
      expect(new Set(lefts).size, 'stage, size tiles and controls line up on one left edge').toBe(1)
      await expect(page.locator('.icust-meta .icust-reset'), 'Reset sits in the tag row').toHaveCount(1)
      await expect(page.locator('.icust-row > label', { hasText: /^Rotate$/ })).toHaveCount(1)
      await expect(page.locator('.icust-row > label', { hasText: /^Flip$/ })).toHaveCount(1)

      const box = await panel.boundingBox()
      expect(box.x, 'the panel starts inside the screen').toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, 'the panel ends inside the screen').toBeLessThanOrEqual(width)
      const { sideways, tight } = await overflowReport(page)
      expect(sideways, 'something sticks out of the panel sideways').toEqual([])
      expect(tight, 'a control is narrower than its own label').toEqual([])
    })
  }

  test('1440: two columns, the preview stays in view while the controls scroll, nothing overflows', async ({ page }) => {
    watch(page, 'a designer editing an icon on a desktop')
    await open(page, 1440, 900)
    const geo = () => page.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) } }
      const body = document.querySelector('.icust-body')
      return { aside: r('.icust-aside'), main: r('.icust-main'), stage: r('.icust-stage'), size: r('.icust-size-rail'), meta: r('.icust-meta'), code: r('.icust-code-box'), head: r('.icust-head'), body: r('.icust-body'), bodyTop: body.scrollTop, over: body.scrollHeight - body.clientHeight, vh: window.innerHeight }
    })
    const before = await geo()
    expect(before.aside.right, 'the preview column sits left of the controls column').toBeLessThanOrEqual(before.main.left + 1)
    expect(before.aside.right - before.aside.left, 'the preview column is 320 to 360px wide').toBeGreaterThanOrEqual(320)
    expect(before.aside.right - before.aside.left, 'the preview column is 320 to 360px wide').toBeLessThanOrEqual(360)
    expect(before.stage.top, 'the stage is in the left column from the top').toBeLessThan(before.main.top + 40)
    expect(before.over, 'the controls column is taller than the body, so it scrolls (premise of this check)').toBeGreaterThan(0)

    await page.locator('.icust-code-box').scrollIntoViewIfNeeded()
    // Take the body all the way down too, so the check does not depend on where the box happens to land.
    await page.evaluate(() => { const b = document.querySelector('.icust-body'); b.scrollTop = b.scrollHeight })
    const after = await geo()
    expect(after.bodyTop, 'the body scrolled').toBeGreaterThan(0)
    expect(Math.abs(after.stage.top - before.stage.top), 'the stage did not move while the controls scrolled').toBeLessThanOrEqual(1)
    expect(after.stage.top, 'the stage is below the pinned head').toBeGreaterThanOrEqual(after.head.bottom - 1)
    expect(after.stage.bottom, 'the whole stage is on screen').toBeLessThanOrEqual(after.vh)
    expect(after.size.bottom, 'the size tiles are on screen').toBeLessThanOrEqual(after.vh)
    expect(after.size.top, 'the size tiles are below the head').toBeGreaterThanOrEqual(after.head.bottom - 1)
    await page.locator('.icust-code-box').scrollIntoViewIfNeeded()
    const box = await page.locator('.icust-code-box').boundingBox()
    expect(box.y + box.height, 'the SVG box is on screen too').toBeLessThanOrEqual(after.vh)
    // A size picked from the sticky column still works with the controls scrolled away.
    await page.locator('.icust-size-cell[data-s="32"]').click()
    await expect(page.locator('.icust-size-cell[data-s="32"]')).toHaveAttribute('aria-checked', 'true')

    const { sideways, tight } = await overflowReport(page)
    expect(sideways, 'something sticks out of the panel sideways').toEqual([])
    expect(tight, 'a control is narrower than its own label').toEqual([])
    const pb = await page.locator('.icust-panel').boundingBox()
    expect(pb.width, 'the panel is wider than the one-column 600px').toBeGreaterThan(600)
    expect(pb.width, 'but no wider than 960px').toBeLessThanOrEqual(960)
  })

  test('controls are no narrower in two columns (1440) than in one (959)', async ({ page }) => {
    watch(page, 'a designer widening their window')
    await open(page, 959, 900)
    const widths = () => page.evaluate(() => {
      const w = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null)
      const seg = (label) => [...document.querySelectorAll('.icust-row')].find((r) => r.querySelector('label')?.textContent.trim() === label)?.querySelector('.icust-seg')
      const row = (label) => [...document.querySelectorAll('.icust-row')].find((r) => r.querySelector('label')?.textContent.trim() === label)
      return {
        rotateSeg: w(seg('Rotate')), flipSeg: w(seg('Flip')), rotateRow: w(row('Rotate')), colourRow: w(row('Colour')),
        strokeRow: w(row('Stroke')), lineTile: w(document.querySelector('.icust-line-tile')), codeBox: w(document.querySelector('.icust-code-box')),
        footRow: w(document.querySelector('.icust-foot-row')), copy: w(document.querySelector('.icust-copy')),
        sizeRail: w(document.querySelector('.icust-size-rail')), sizeCell: w(document.querySelector('.icust-size-cell[data-s="24"]')),
      }
    })
    const one = await widths()
    expect(one.rotateSeg && one.flipSeg && one.codeBox, 'the single-column controls were measured').toBeTruthy()
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('.icust-aside')).toBeVisible()
    await expect.poll(async () => (await page.locator('.icust-panel').boundingBox()).width, { message: 'the panel widened' }).toBeGreaterThan(700)
    const two = await widths()
    // The size tiles move into the 328px preview column on purpose; they are held to a floor instead.
    expect(two.sizeCell, 'a size tile in the preview column stays wide enough to press and read').toBeGreaterThanOrEqual(36)
    const narrower = Object.keys(one).filter((k) => !['sizeRail', 'sizeCell'].includes(k) && one[k] != null && (two[k] == null || two[k] < one[k] - 1)).map((k) => `${k}: ${one[k]} -> ${two[k]}`)
    expect(narrower, 'a control got narrower in two columns').toEqual([])
  })

  for (const [width, label] of [[390, 'a phone'], [768, 'a tablet'], [1440, 'a desktop']]) {
    test(`${width}: the head gets a hairline once the body scrolls under it, and loses it back at the top`, async ({ page }) => {
      watch(page, `a designer on ${label} scrolling the edit pop-up`)
      await open(page, width, 800)
      const head = page.locator('.icust-head')
      const hairline = () => head.evaluate((el) => { const s = getComputedStyle(el); return { w: s.borderBottomWidth, c: s.borderBottomColor } })
      const h0 = await head.evaluate((el) => el.getBoundingClientRect().height)
      await expect(head).not.toHaveClass(/is-scrolled/)
      expect((await hairline()).c, 'no visible line at the top').toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      const scrolls = await page.evaluate(() => { const b = document.querySelector('.icust-body'); b.scrollTop = 60; return b.scrollTop })
      expect(scrolls, 'the body scrolls (premise of this check)').toBeGreaterThan(0)
      await expect(head).toHaveClass(/is-scrolled/)
      await expect.poll(async () => (await hairline()).c, { message: 'the hairline shows' }).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      expect((await hairline()).w, 'one pixel').toBe('1px')
      const edge = await page.evaluate(() => ({ head: document.querySelector('.icust-head').getBoundingClientRect().bottom, body: document.querySelector('.icust-body').getBoundingClientRect().top }))
      expect(Math.abs(edge.head - edge.body), 'the line sits on the edge where the body is clipped').toBeLessThanOrEqual(1)
      expect(Math.abs(await head.evaluate((el) => el.getBoundingClientRect().height) - h0), 'the head did not change height').toBeLessThan(0.5)
      await page.evaluate(() => { document.querySelector('.icust-body').scrollTop = 0 })
      await expect(head).not.toHaveClass(/is-scrolled/)
    })
  }

  test('390 on touch: the first screen shows the preview, the size and the colour, and every control is 44px or more', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    try {
      watch(page, 'a designer editing an icon on a phone')
      await go(page, '/create/icons')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      await page.locator('.ig .ic').first().tap()
      await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('.icust-copy')).toBeEnabled({ timeout: 20_000 })
      await expect(page.locator('.icust-chips')).toBeVisible()
      const fold = await page.evaluate(() => {
        const vh = window.innerHeight
        return Object.fromEntries(['.icust-stage', '.icust-size-rail', '.icust-chips'].map((s) => [s, Math.round(document.querySelector(s).getBoundingClientRect().bottom) <= vh]))
      })
      expect(fold, 'on the first screen, without scrolling').toEqual({ '.icust-stage': true, '.icust-size-rail': true, '.icust-chips': true })
      // Make Reset visible: it is hidden (not removed) until something differs.
      await page.locator('.icust-seg button', { hasText: '90°' }).tap()
      expect(await smallTargets(page), 'controls under 44px on touch').toEqual([])
    } finally { await ctx.close() }
  })

  test('1180 on a touch tablet: two columns, every control 44px or more, nothing overflows', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    try {
      watch(page, 'a designer editing an icon on a tablet held sideways')
      await go(page, '/create/icons')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      await page.locator('.ig .ic').first().tap()
      await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('.icust-copy')).toBeEnabled({ timeout: 20_000 })
      const cols = await page.evaluate(() => ({ a: document.querySelector('.icust-aside').getBoundingClientRect().right, m: document.querySelector('.icust-main').getBoundingClientRect().left }))
      expect(cols.a, 'two columns').toBeLessThanOrEqual(cols.m + 1)
      await page.locator('.icust-seg button', { hasText: '90°' }).tap()
      expect(await smallTargets(page), 'controls under 44px on touch').toEqual([])
      // The 44px tiles must sit inside their own column: spilling into the gap beside it stays inside the panel, so check the rail itself.
      const rail = await page.evaluate(() => {
        const r = document.querySelector('.icust-size-rail'); const rb = r.getBoundingClientRect()
        return { spill: r.scrollWidth - r.clientWidth, past: Math.max(...[...r.children].map((c) => c.getBoundingClientRect().right - rb.right)) }
      })
      expect(rail.spill, 'the size tiles overflow their column').toBeLessThanOrEqual(0)
      expect(rail.past, 'a size tile sticks out past the right edge of its column').toBeLessThanOrEqual(0.5)
      const { sideways, tight } = await overflowReport(page)
      expect(sideways, 'something sticks out of the panel sideways (the five touch size tiles must fit the column)').toEqual([])
      expect(tight).toEqual([])
    } finally { await ctx.close() }
  })

  test('Rotate and Flip are labelled segments, Reset appears once something differs and puts them back', async ({ page }) => {
    watch(page, 'a designer editing an icon')
    await open(page, 1440)
    const reset = page.getByRole('button', { name: 'Reset to default', exact: true })
    await expect(reset, 'Reset is held but hidden while nothing differs').toBeHidden()
    const rot = page.locator('.icust-seg button', { hasText: /^180°$/ })
    await rot.click()
    await expect(rot).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status').filter({ hasText: 'Rotated 180 degrees' })).toHaveCount(1)
    const flip = page.locator('.icust-seg button', { hasText: 'Horizontal' })
    await flip.click()
    await expect(flip).toHaveAttribute('aria-pressed', 'true')
    await expect(reset).toBeVisible()
    await reset.click()
    await expect(page.locator('.icust-seg button', { hasText: /^0°$/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(flip).toHaveAttribute('aria-pressed', 'false')
  })
})
