// A SIGNED-OUT SEARCH SHOWS ONE ROW OF FREE-TIER RESULTS ABOVE THE SIGN-IN PROMPT (Q219, note 1).
//
// /create/icons, signed out, a search the Iconify fixture covers ("arrow"). The grid keeps its sample from the
// five open packs; below it, directly above the sign-in band, sits ONE row of matches from free-tier packs
// (src/data/iconPackTiers.js): exactly as many tiles as the grid has columns, so there is never a partial row.
// The names come from the locked-pack probe (one scoped /search); only these tiles' drawings are fetched. Blocked
// sets, Pro and brand packs, and the animated sets are never offered and never fetched (295 holds the rest).
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   freeRowIcons returns [] (or the `.ig-free-row` block is not rendered)        -> "exactly one row"
//   freeRowIcons stops slicing to gridCols (e.g. slice(0, 5))                    -> "count equals the columns"
//   .ig-free-row loses `grid-template-columns: repeat(var(--ig-free-cols), ...)`  -> "all on the same top"
//   isFreeRowPack drops its tierOf(pack) === 'free' test (so Pro packs pass)      -> "every tile is from a free pack"
//   the row is rendered after the IconEndBand blocks, or the band is not shown   -> "the sign-in band sits below the row"
//   isFreeRowPack drops its isBlockedPack / isAnimatedPack tests                  -> "no request asks for a blocked or animated pack"
//   the row's onPick opens the sign-in gate instead of the customiser             -> "a free-row tile opens the customiser"
//
// Artwork is served from the Iconify fixture (tests/user-sim/iconify-stub.js).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { ICONIFY_HOSTS } from './iconify-stub.js'
import { isAnimatedPack, isBlockedPack, tierOf } from '../../src/data/iconPackTiers.js'

// Packs whose drawings a signed-out visitor must never ask for: the paid sets (brands, flags, emoji, animated)
// and the blocked sets.
const NEVER = ['ri', 'streamline', 'line-md', 'svg-spinners', 'meteocons', 'logos', 'devicon', 'simple-icons', 'skill-icons',
  'twemoji', 'fluent-emoji', 'noto', 'openmoji', 'flat-color-icons']
const isNever = (pack) => tierOf(pack) === 'paid' || isBlockedPack(pack) || isAnimatedPack(pack)

function iconifyUrls(page) {
  const urls = []
  page.on('request', (r) => {
    try {
      if (ICONIFY_HOSTS.includes(new URL(r.url()).hostname)) urls.push(decodeURIComponent(r.url()))
    } catch { /* not a URL we can read */ }
  })
  return urls
}

for (const width of [1440, 390]) {
  test(`at ${width}px, a signed-out search shows one free row above the sign-in prompt`, async ({ page }) => {
    watch(page, `a visitor who has not signed up searching for arrows at ${width}px`)
    const urls = iconifyUrls(page)
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
    const cols = await page.locator('.ig').evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length)
    expect(cols, 'the grid has columns').toBeGreaterThan(0)

    await page.getByLabel('Search icons').first().fill('arrow')
    const row = page.locator('.ig-free-row')
    const tiles = row.locator('.ic')
    const band = page.locator('.geg[data-gate="anon"]')
    await expect(band).toBeVisible({ timeout: 20_000 })
    await expect(row, 'one free row').toHaveCount(1, { timeout: 20_000 })

    // Exactly one row: as many tiles as columns, all on the same top.
    await expect(tiles, 'count equals the columns').toHaveCount(cols)
    const boxes = await tiles.evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: r.bottom, left: r.left, right: r.right }
    }))
    expect(new Set(boxes.map((b) => b.top)).size, 'all on the same top').toBe(1)
    const vw = await page.evaluate(() => document.documentElement.clientWidth)
    for (const b of boxes) expect(b.left >= 0 && b.right <= vw + 0.5, 'no tile spills off the screen').toBe(true)

    // Every tile is from a free-tier pack, and the glyphs painted.
    const packs = await tiles.evaluateAll((els) => els.map((el) => el.dataset.ic.split('|')[0]))
    for (const p of packs) expect(tierOf(p), `${p} is a free-tier pack`).toBe('free')
    for (const p of packs) expect(isNever(p), `${p} is never offered`).toBe(false)
    await expect(row.locator('.ic svg, .ic img').first(), 'the row paints').toBeVisible({ timeout: 20_000 })

    // The sign-in band sits below the row.
    const rowBox = await row.boundingBox()
    const bandBox = await band.boundingBox()
    expect(bandBox.y, 'the sign-in band sits below the row').toBeGreaterThanOrEqual(rowBox.y + rowBox.height - 1)
    await band.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400) // let the band's fade settle for the capture
    await row.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `.claude/01_scratch/18_icon_notes/signed-out-row-${width}.png` })

    // Nothing blocked, paid or animated was asked for; the row's own packs were.
    await page.waitForTimeout(600)
    for (const pack of NEVER) {
      expect(urls.filter((u) => u.includes(`/${pack}.json?icons=`)), `a batched glyph request for ${pack}`).toEqual([])
      expect(urls.filter((u) => new RegExp(`/${pack}/[^/]+\\.svg`).test(u)), `a single glyph request for ${pack}`).toEqual([])
    }
    const asked = urls.filter((u) => /\/[^/?]+\.json\?icons=/.test(u)).map((u) => u.match(/\/([^/?]+)\.json\?icons=/)[1])
    for (const p of asked) expect(isNever(p), `a glyph request for ${p}, a pack a signed-out visitor never gets`).toBe(false)

    // A tile opens the customiser, not a sign-in prompt: sign-in comes at save or export.
    await tiles.first().click()
    await expect(page.locator('.ied-ground'), 'a free-row tile opens the customiser').toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ied-pri'), 'copy works signed out').toBeEnabled({ timeout: 20_000 })
  })
}
