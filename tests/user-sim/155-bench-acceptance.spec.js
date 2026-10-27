// THE HOME BENCH'S RENDERED ACCEPTANCE (spec Part B8, items 2 to 6).
//
//   TEXT SIZES. Every piece of text inside a bench window is 12, 13 or 15px, read
//   from computed style on the rendered page, in each tool, in its main states,
//   at 390, 768 and 1440. The exemptions are named below with the reason for each.
//   The stylesheet is read in tests/unit/bench-text-sizes.test.js; this is the
//   page, which is what a visitor sees. A rule can lose the cascade and never
//   show here; a size can come from a rule the stylesheet reader does not look at
//   (an inline style). Each is blind where the other sees.
//
//   NO ROW WRAPS OR SCROLLS SIDEWAYS. At 320, 390, 768 and 1440 each control row
//   fits its own width (scrollWidth <= clientWidth), in every tool.
//
//   EMPTY STATES. An icon search and a font search for "zzz" say so and offer a
//   way back; the way back works.
//
//   FONT ROWS EXPAND. Picking a family opens its row (sample, weights, axes, the
//   pairing); picking another closes the first.
//
//   THE ICON GRID has no empty cell: 16 tiles in 4 columns at 480 and below, 24 in 4 columns above 680.
//
//   THE RAIL SUMMARIES follow the picks: a seed, an icon, a family and a format.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const TOOLS = ['Palette', 'Icons', 'Fonts', 'Converter']

/** Show tool i: click its tab where the bench is a tool switcher, otherwise scroll its window into view. */
async function openTool(page, i) {
  const tab = page.locator('.sp-rail--tabs').getByRole('tab', { name: TOOLS[i], exact: true })
  if (await tab.count()) await tab.click()
  const panel = page.locator(`.sp-panel[data-panel="${i}"]`)
  await panel.scrollIntoViewIfNeeded()
  await expect(panel).toBeVisible()
  // Settle on the tool switch's fade and the row-expand ease.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
    .map((a) => a.finished.catch(() => {}))))
  return panel
}

// Text that is not on the three-size scale, by design. Each entry is a selector
// the element or an ancestor must match.
const SIZE_EXEMPT = [
  ['.sp-fontrow-name', 'the family name, set in that family at the Size control (32 on a phone, 46 elsewhere)'],
  ['.sp-fontrow-sample', 'the specimen line, in the family on show'],
  ['.sp-fontrow-w', 'the weight specimens, in the family on show'],
  ['.sp-font-pair b', 'the paired family\'s name, in that family'],
  ['.sp-saving-num', 'the converter\'s display figure ("92%", "No loss") and its hidden width pad'],
]

/** Every visible piece of text in the panel that is off the 12 / 13 / 15 scale. */
const offScale = (panel) => panel.evaluate((root, exempt) => {
  const bad = []
  let seen = 0
  const phone = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const field = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
    // Range, file and button-type inputs print no text of their own.
    if (field && !['text', 'search'].includes(el.type)) continue
    const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())
    if (!own && !field) continue
    if (exempt.some(([sel]) => el.closest(sel))) continue
    seen += 1
    const px = parseFloat(cs.fontSize)
    // A text field is 13, or 16 on a phone so iOS does not zoom the page on focus.
    if (field ? px === 13 || (phone && px === 16) : [12, 13, 15].includes(px)) continue
    bad.push(`${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).join('.')} is ${cs.fontSize} ("${(el.value || el.textContent).trim().slice(0, 24)}")`)
  }
  return { bad, seen }
}, SIZE_EXEMPT)

for (const width of [390, 768, 1440]) {
  test.describe(`bench text sizes at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } })
    test.beforeEach(async ({ page }) => { watch(page, 'someone reading the bench windows') })

    test('every text in every tool, in its main states, is 12, 13 or 15px', async ({ page }) => {
      test.setTimeout(120000)
      await go(page, '/')
      const problems = []
      let total = 0
      const scan = async (panel, state) => {
        const { bad, seen } = await offScale(panel)
        total += seen
        expect(seen, `${state}: no text was measured, so this would pass vacuously`).toBeGreaterThan(8)
        problems.push(...bad.map((b) => `${state}: ${b}`))
      }

      // Palette: resting, another harmony, another format.
      let panel = await openTool(page, 0)
      await scan(panel, 'palette')
      await panel.getByRole('button', { name: 'Triad', exact: true }).click()
      await panel.getByRole('button', { name: 'OKLCH', exact: true }).click()
      await scan(panel, 'palette, triad, OKLCH')

      // Icons: resting, no match, a heavier weight with a different format.
      panel = await openTool(page, 1)
      await scan(panel, 'icons')
      await panel.getByRole('textbox', { name: 'Search icons' }).fill('zzz')
      await expect(panel.locator('.sp-empty')).toBeVisible()
      await scan(panel, 'icons, no match')
      await panel.getByRole('button', { name: 'Clear search' }).click()
      await panel.getByRole('button', { name: 'Bold', exact: true }).click()
      await panel.getByRole('button', { name: 'JSX', exact: true }).click()
      await scan(panel, 'icons, bold, JSX')

      // Fonts: resting, a row open, a typed preview, no match.
      panel = await openTool(page, 2)
      await scan(panel, 'fonts')
      await panel.locator('.sp-fontrow').nth(1).click()
      await scan(panel, 'fonts, a row open')
      await panel.getByRole('textbox', { name: 'Preview text' }).fill('Quick brown fox')
      await scan(panel, 'fonts, typed preview')
      await panel.getByRole('textbox', { name: 'Search families' }).fill('zzz')
      await expect(panel.locator('.sp-empty')).toBeVisible()
      await scan(panel, 'fonts, no match')

      // Converter: every mode, then the lossless format.
      panel = await openTool(page, 3)
      await scan(panel, 'converter, compress')
      await panel.getByRole('button', { name: 'PNG', exact: true }).click()
      await expect(panel.locator('.sp-quality-row')).toContainText('Lossless')
      await scan(panel, 'converter, PNG')
      for (const mode of ['3D model', 'Video frames', 'Aspect ratio']) {
        await panel.getByRole('tab', { name: mode, exact: true }).click()
        await scan(panel, `converter, ${mode}`)
      }

      expect(total, 'the sweep measured suspiciously little text').toBeGreaterThan(200)
      expect(problems, 'text outside 12 / 13 / 15px (exemptions: the family specimens and the display figure)').toEqual([])
    })
  })
}

// ── no row wraps or scrolls sideways ───────────────────────────────────────────

const ROWS = [
  '.sp-pal-strip', '.sp-seeds', '.sp-seg', '.sp-roles', '.sp-prev', '.sp-copyas',
  '.sp-ico-strip', '.sp-find', '.sp-tabs-row', '.sp-ico-prev',
  '.sp-font-strip', '.sp-font-cats', '.sp-font-ctl',
  '.sp-modes', '.sp-fmtrow', '.sp-quality-row', '.sp-saving', '.sp-bar-row',
  '.sp-tool-foot',
]

for (const width of [320, 390, 768, 1440]) {
  test(`bench control rows fit their own width at ${width}`, async ({ page }) => {
    test.setTimeout(90000)
    watch(page, 'someone reading the bench windows')
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/')
    let measured = 0
    const wide = []
    for (let i = 0; i < 4; i += 1) {
      const panel = await openTool(page, i)
      const rows = await panel.evaluate((root, selectors) => {
        const out = []
        for (const sel of selectors) {
          for (const el of root.querySelectorAll(sel)) {
            const cs = getComputedStyle(el)
            if (cs.display === 'none' || cs.visibility === 'hidden' || !el.clientWidth) continue
            out.push({ sel, over: el.scrollWidth - el.clientWidth })
          }
        }
        return out
      }, ROWS)
      measured += rows.length
      wide.push(...rows.filter((r) => r.over > 1).map((r) => `${TOOLS[i]} ${r.sel} is ${r.over}px wider than itself`))
    }
    expect(measured, 'no control row was measured, so this would pass vacuously').toBeGreaterThan(20)
    expect(wide, 'a control row scrolls or spills sideways').toEqual([])
    const page2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(page2, 'the bench pushed the page sideways').toBe(0)
  })
}

// ── empty states ───────────────────────────────────────────────────────────────

test.describe('empty states', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'someone searching the bench for something that is not there') })

  test('an icon search for zzz says so, and Clear search brings the grid back', async ({ page }) => {
    await go(page, '/')
    const panel = await openTool(page, 1)
    await expect(panel.locator('.sp-ico')).toHaveCount(24)
    await panel.getByRole('textbox', { name: 'Search icons' }).fill('zzz')
    const empty = panel.locator('.sp-empty')
    await expect(empty).toHaveAttribute('role', 'status')
    await expect(empty, 'the empty state does not quote the search').toContainText('No icons match "zzz"')
    await expect(panel.locator('.sp-ico'), 'tiles are still drawn for a search that matches nothing').toHaveCount(0)
    await panel.getByRole('button', { name: 'Clear search' }).click()
    await expect(empty).toHaveCount(0)
    await expect(panel.locator('.sp-ico')).toHaveCount(24)
    await expect(panel.getByRole('textbox', { name: 'Search icons' })).toHaveValue('')
  })

  test('a font search for zzz says so, offers both ways back, and each works', async ({ page }) => {
    await go(page, '/')
    const panel = await openTool(page, 2)
    const all = await panel.locator('.sp-fontrow').count()
    expect(all, 'the font list is empty before any search').toBeGreaterThan(3)
    const search = panel.getByRole('textbox', { name: 'Search families' })
    await search.fill('zzz')
    const empty = panel.locator('.sp-empty')
    await expect(empty).toContainText('No families match "zzz" in All.')
    await expect(panel.locator('.sp-fontrow')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Show all categories' }), 'on All there is no category to widen').toHaveCount(0)

    // A category as well: two ways back, and "Show all categories" keeps the query.
    await panel.getByRole('group', { name: 'Category' }).getByRole('button').nth(1).click()
    await expect(empty).toContainText('No families match "zzz" in')
    await expect(empty).not.toContainText('in All')
    await panel.getByRole('button', { name: 'Show all categories' }).click()
    await expect(empty).toContainText('in All.')
    await expect(search).toHaveValue('zzz')
    await panel.getByRole('button', { name: 'Clear search' }).click()
    await expect(empty).toHaveCount(0)
    await expect(panel.locator('.sp-fontrow')).toHaveCount(all)
  })
})

// ── font rows expand ──────────────────────────────────────────────────────────

for (const width of [390, 1440]) {
  test(`a picked font row opens and the previous one closes (${width})`, async ({ page }) => {
    watch(page, 'someone choosing a font family on the bench')
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/')
    const panel = await openTool(page, 2)
    const row = (i) => panel.locator('.sp-fontrow').nth(i)
    const more = (i) => row(i).locator('.sp-fontrow-more')
    const open = (i) => more(i).evaluate((el) => Math.round(el.getBoundingClientRect().height))

    const was = await panel.locator('.sp-fontrow[aria-pressed="true"]').count()
    expect(was, 'exactly one family starts picked').toBe(1)
    const first = await row(0).getAttribute('aria-pressed')
    const target = first === 'true' ? 1 : 0
    const other = target === 0 ? 1 : 0

    await row(target).click()
    await expect(row(target)).toHaveAttribute('aria-pressed', 'true')
    await expect(row(other)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => open(target), { message: 'the picked row did not open', timeout: 3000 }).toBeGreaterThan(40)
    await expect.poll(() => open(other), { message: 'the previous row did not close', timeout: 3000 }).toBe(0)
    await expect(more(target)).not.toHaveAttribute('aria-hidden', 'true')
    await expect(more(other)).toHaveAttribute('aria-hidden', 'true')
    await expect(row(target).locator('.sp-font-pair'), 'the open row does not name its pairing').toContainText('Pairs with')
    await expect(row(target), 'the open row\'s accessible name does not carry the pairing').toHaveAccessibleName(/pairs with /)
    await expect(panel.locator('.sp-fontrow[aria-pressed="true"]')).toHaveCount(1)
  })
}

// ── the icon grid has no empty cell ────────────────────────────────────────────

for (const [width, columns, tiles] of [[320, 4, 16], [390, 4, 16], [480, 4, 16], [768, 4, 24], [1440, 4, 24]]) {
  test(`the icon grid is ${columns} columns of ${tiles} tiles with no empty cell at ${width}`, async ({ page }) => {
    watch(page, 'someone browsing the bench icons')
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/')
    const panel = await openTool(page, 1)
    const grid = await panel.locator('.sp-icogrid').evaluate((el) => {
      const tiles = [...el.querySelectorAll('.sp-ico')].filter((t) => getComputedStyle(t).display !== 'none')
      const cols = getComputedStyle(el).gridTemplateColumns.split(' ').length
      const xs = new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().left)))
      return { shown: tiles.length, cols, columnsDrawn: xs.size }
    })
    expect(grid.cols, 'the icon grid has the wrong number of columns').toBe(columns)
    expect(grid.columnsDrawn, 'tiles do not line up in the grid\'s columns').toBe(columns)
    expect(grid.shown, 'the grid shows the wrong number of tiles').toBe(tiles)
    expect(grid.shown % grid.cols, 'the last row of icons is not full').toBe(0)
  })
}

// ── the rail summaries follow the picks ────────────────────────────────────────

test('the rail summary lines change after picking a seed, an icon, a family and a format', async ({ page }) => {
  watch(page, 'someone picking things on the bench and reading the rail')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/')
  const sums = () => page.locator('.sp-rail-row .sp-rail-sum').allInnerTexts()
  const start = await sums()
  expect(start, 'the rail has no four summary lines').toHaveLength(4)
  for (const [i, s] of start.entries()) expect(s.trim(), `rail summary ${i + 1} is empty`).not.toBe('')

  let panel = await openTool(page, 0)
  await panel.locator('.sp-seed').nth(3).click()
  await expect.poll(async () => (await sums())[0], { message: 'picking a seed left rail line 1 alone' }).not.toBe(start[0])

  panel = await openTool(page, 1)
  await panel.locator('.sp-ico').nth(5).click()
  await expect.poll(async () => (await sums())[1], { message: 'picking an icon left rail line 2 alone' }).not.toBe(start[1])

  panel = await openTool(page, 2)
  const pickedFont = await panel.locator('.sp-fontrow[aria-pressed="true"]').count()
  expect(pickedFont).toBe(1)
  await panel.locator('.sp-fontrow[aria-pressed="false"]').first().click()
  await expect.poll(async () => (await sums())[2], { message: 'picking a family left rail line 3 alone' }).not.toBe(start[2])

  panel = await openTool(page, 3)
  await panel.getByRole('button', { name: 'JPEG', exact: true }).click()
  await expect.poll(async () => (await sums())[3], { message: 'picking a format left rail line 4 alone', timeout: 15000 }).toMatch(/JPEG/)

  const end = await sums()
  expect(end[0], 'line 1 should name the picked seed').not.toBe(start[0])
  expect(end.join('|').match(/Measuring/g) || [], 'a summary is still measuring after a format was picked').toHaveLength(0)
})

// Every window's footer (the Open link and its pill) sits whole inside the
// window at each width. A capped window with overflow hidden once cut the
// Fonts footer off on a phone.
for (const width of [390, 768, 1440]) {
  test(`each tool's footer is inside its window at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/')
    for (let i = 0; i < TOOLS.length; i++) {
      const panel = await openTool(page, i)
      // Both rects in one read. On the scrolling bench each window is scaled by its
      // distance from the middle, and that scale is rewritten on scroll; two separate
      // boundingBox calls can straddle a rewrite and read the window at 0.978 and the
      // footer at 1.0, which looks like a 6px overflow that is not there.
      const ends = await panel.evaluate((el) => {
        const foot = el.querySelector('.sp-tool-foot')
        return foot ? { panel: el.getBoundingClientRect().bottom, foot: foot.getBoundingClientRect().bottom } : null
      })
      expect(ends, `${TOOLS[i]} has a footer`).not.toBeNull()
      expect(ends.foot, `${TOOLS[i]}'s footer ends inside its window at ${width}px`).toBeLessThanOrEqual(ends.panel + 0.5)
      const clipped = await panel.locator('.sp-tool-foot a, .sp-tool-foot button').evaluateAll((els) => els.filter((el) => {
        const r = el.getBoundingClientRect(); const p = el.closest('.sp-panel').getBoundingClientRect()
        return r.height === 0 || r.bottom > p.bottom + 0.5
      }).length)
      expect(clipped, `${TOOLS[i]}'s footer links are whole at ${width}px`).toBe(0)
    }
  })
}

// ── the polish pass (beb9ba56) ─────────────────────────────────────────────────
//
// Each test below was seen to fail against a temporary mutation of the source it
// guards (the mutation is named beside it).

const railLine = (page, i) => page.locator('.sp-rail-row .sp-rail-sum').nth(i)

// A file that claims to be a PNG and is not one. The converter takes it (it is
// an image by type), the browser cannot decode it, and the rail must say so
// rather than wait for a figure that will never come.
// Mutation: converterSummary() without the `result?.failed` line.
test('a broken image in the converter reads "File not supported" in the rail, not "Measuring…"', async ({ page }) => {
  watch(page, 'someone dropping a broken file on the bench converter')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/')
  const panel = await openTool(page, 3)
  // Settle first, so the rail has a real reading to replace.
  await expect(railLine(page, 3)).toHaveText(/\d+% (smaller|larger) as WebP|No loss/, { timeout: 15000 })

  await panel.locator('.sp-cv-pane.is-on input[type="file"]').setInputFiles({
    name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('this is not a png, it is text'),
  })
  await expect(panel.locator('.sp-cv-pane.is-on .sp-saving')).toContainText('That file is not supported')
  await expect(railLine(page, 3), 'the rail should say the file is not supported').toHaveText('File not supported')
  // It stays that way: no later "Measuring…" or stale figure takes it back.
  await page.waitForTimeout(600)
  await expect(railLine(page, 3)).toHaveText('File not supported')
})

// Mutation: BenchConverter reads `out.size` whatever format it was encoded as
// (outSize = out?.size, dropping the `out.format === formatLabel` check).
test('after a format switch the rail never shows the old percentage under the new format name', async ({ page }) => {
  watch(page, 'someone switching the converter format and reading the rail')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/')
  const panel = await openTool(page, 3)
  const rail = railLine(page, 3)
  await expect(rail).toHaveText(/\d+% smaller as WebP/, { timeout: 15000 })
  const webp = (await rail.innerText()).match(/(\d+)% smaller/)[1]

  // Record every text the rail line takes from here on, in the page, so a flash
  // between two settled states is seen as well as the settled ones.
  await rail.evaluate((el) => {
    window.__railSeen = [el.textContent]
    new MutationObserver(() => window.__railSeen.push(el.textContent))
      .observe(el, { subtree: true, childList: true, characterData: true })
  })
  await panel.getByRole('button', { name: 'JPEG', exact: true }).click()
  await expect(rail).toHaveText(/\d+% (smaller|larger) as JPEG/, { timeout: 15000 })
  const jpeg = (await rail.innerText()).match(/(\d+)% (smaller|larger)/)[1]
  expect(jpeg, 'WebP and JPEG measured the same, so this test could not tell them apart').not.toBe(webp)

  const seen = await page.evaluate(() => window.__railSeen)
  for (const text of seen.filter((t) => /JPEG/.test(t) && /\d+%/.test(t))) {
    expect(text, `the rail read "${text}" under JPEG before JPEG was measured`).toContain(`${jpeg}% `)
  }
  expect(seen.some((t) => /JPEG/.test(t)), 'the rail never named JPEG').toBe(true)
  // And the other way: back to WebP.
  await panel.getByRole('button', { name: 'WEBP', exact: true }).click()
  await expect(rail).toHaveText(new RegExp(`${webp}% smaller as WebP`), { timeout: 15000 })
  for (const text of (await page.evaluate(() => window.__railSeen)).filter((t) => /WebP/.test(t) && /\d+%/.test(t))) {
    expect(text, `the rail read "${text}" under WebP before WebP was measured`).toContain(`${webp}% `)
  }
})

// ── Clear search puts the cursor back in the field ─────────────────────────────

// Mutation: the Clear search handlers only setQuery('') (no focus call).
for (const [tool, index, field] of [['Icons', 1, 'Search icons'], ['Fonts', 2, 'Search families']]) {
  test(`${tool}: Clear search puts focus back on the search field`, async ({ page }) => {
    watch(page, 'someone clearing a search on the bench by keyboard')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')
    const panel = await openTool(page, index)
    const search = panel.getByRole('textbox', { name: field })
    await search.fill('zzz')
    const clear = panel.getByRole('button', { name: 'Clear search' })
    await clear.focus()
    await page.keyboard.press('Enter')
    await expect(clear, 'Clear search is still on screen').toHaveCount(0)
    await expect(search).toHaveValue('')
    await expect(search, 'focus fell to the page when the button went away').toBeFocused()
  })
}

// ── the Fonts window on a phone ────────────────────────────────────────────────

// Mutation: the `@media (max-width: 680px)` .sp-font-strip block removed from spectrum.css.
test('the Fonts search is a full-width row on a phone, not a squeezed field', async ({ page }) => {
  watch(page, 'someone searching families on a phone')
  await page.setViewportSize({ width: 390, height: 900 })
  await go(page, '/')
  const panel = await openTool(page, 2)
  const box = await panel.getByRole('textbox', { name: 'Search families' }).boundingBox()
  expect(box, 'the Fonts search field is not drawn').not.toBeNull()
  expect(box.width, `the Fonts search field is ${Math.round(box.width)}px wide at 390`).toBeGreaterThanOrEqual(280)
})

// Each link, all four edges, against the window and against the screen.
// Mutation: the Fonts window's phone height rule changed so the window ends above its footer.
for (const width of [320, 390]) {
  test(`the Fonts footer links sit fully inside the window and the screen at ${width}px`, async ({ page }) => {
    watch(page, 'someone reaching the Fonts footer on a phone')
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/')
    const panel = await openTool(page, 2)
    const names = await panel.locator('.sp-tool-foot a').allInnerTexts()
    expect(names.join(' | '), 'the Fonts footer lost a link').toMatch(/Open Font Gallery[\s\S]*Font Pair|Font Pair[\s\S]*Open Font Gallery/)
    const out = await panel.evaluate((el) => {
      const p = el.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      return [...el.querySelectorAll('.sp-tool-foot a')].map((a) => {
        const r = a.getBoundingClientRect()
        return { text: a.textContent.trim(), w: r.width, h: r.height, left: r.left - p.left, right: p.right - r.right, bottom: p.bottom - r.bottom, top: r.top - p.top, screenRight: vw - r.right, screenLeft: r.left }
      })
    })
    expect(out.length, 'no footer link was measured').toBeGreaterThanOrEqual(2)
    for (const l of out) {
      expect(l.w > 0 && l.h > 0, `"${l.text}" has no size`).toBe(true)
      expect(l.left, `"${l.text}" starts left of the window`).toBeGreaterThanOrEqual(-0.5)
      expect(l.right, `"${l.text}" runs past the window's right edge`).toBeGreaterThanOrEqual(-0.5)
      expect(l.top, `"${l.text}" starts above the window`).toBeGreaterThanOrEqual(-0.5)
      expect(l.bottom, `"${l.text}" is cut off at the window's bottom`).toBeGreaterThanOrEqual(-0.5)
      expect(l.screenLeft, `"${l.text}" is off the screen's left`).toBeGreaterThanOrEqual(-0.5)
      expect(l.screenRight, `"${l.text}" is off the screen's right`).toBeGreaterThanOrEqual(-0.5)
    }
  })
}

// ── the icons window ───────────────────────────────────────────────────────────

// Mutation: `align-items: start` on .sp-ico-main back to `center`, and the
// `@media (min-width: 681px)` icon block removed.
test('the icon grid starts level with the preview at 1440', async ({ page }) => {
  watch(page, 'someone browsing the bench icons')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/')
  const panel = await openTool(page, 1)
  const tops = await panel.evaluate((el) => ({
    grid: el.querySelector('.sp-icogrid').getBoundingClientRect().top,
    prev: el.querySelector('.sp-ico-prev').getBoundingClientRect().top,
    tiles: el.querySelectorAll('.sp-ico').length,
  }))
  expect(tops.tiles, 'no icon tiles were measured').toBeGreaterThan(0)
  expect(Math.abs(tops.grid - tops.prev), `the grid starts ${Math.round(tops.grid - tops.prev)}px from the preview's top`).toBeLessThanOrEqual(4)
})
