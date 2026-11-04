// Font Gallery bands (fonts overhaul slice S2): the toolbar never wraps, no
// label is uppercase mono, the band is the size the layout says and a wake
// moves no box, and the count and search placeholder follow the category.
//
// MUTATIONS (each should turn exactly one test red):
//   criterion 1  `flex-wrap: wrap` AND `min-width: 60%` on the `.fg-bar2` children (and
//                `min-width: 60vw` on `.tl-toolbar > .tl-item`). `flex-wrap: wrap` alone
//                stays green: the toolbar moves what does not fit into Filters before
//                anything can wrap, so the mutation has to force the overflow.
//   criterion 2  put `text-transform: uppercase` back on `.fg-page .fg-count`
//   criterion 3  `.fg-card-reveal { display: none }` with `display: flex` on `.fg-card:hover`
//                and `:has(:focus-visible)`, so the reveal enters the layout on a wake.
//                `position: static` alone stays green: the box is the same either way.
//   criterion 4  delete the two `@container fg-reveal` rules for the 1024px+ layout (the
//                48 and 72 sizes then cut the pangram or weights mid-glyph), or drop the
//                `* .14` descender room from `.fg-card-reveal`'s `top`
//   criterion 5  make the count or the placeholder ignore the category
//
// Criterion 2 is asserted on the base list state only. The compare tray, the
// tags and the detail dialog still carry uppercase mono labels; slices S3 and
// S4 own those.
import { test, expect } from './base.js'
import { fillGalleryPreviewText, go, watch } from './helpers.js'

const CATALOGUE = {
  fonts: [
    { family: 'Lora', category: 'serif', variants: [400, 500, 600, 700, 800, 900], subsets: ['latin'], popularity: 0 },
    { family: 'Inter', category: 'sans-serif', variants: [100, 200, 300, 400, 500, 600, 700, 800, 900], subsets: ['latin'], popularity: 1 },
    { family: 'Merriweather', category: 'serif', variants: [300, 400, 700, 900], subsets: ['latin'], popularity: 2 },
    { family: 'Pacifico', category: 'handwriting', variants: [400], subsets: ['latin'], popularity: 3 },
  ],
}

const LAYOUTS = [
  { width: 1440, band: 240, name: 96 },
  { width: 768, band: 200, name: 64 },
  { width: 390, band: 120, name: 40 },
]

async function open(page, width) {
  await page.setViewportSize({ width, height: 900 })
  await page.route('**/api/fonts', (route) => route.fulfill({ json: CATALOGUE }))
  await go(page, '/create/font-gallery')
  await expect(page.locator('.fg-card').first()).toBeVisible()
}

test.describe('Font Gallery bands', () => {
  test('criterion 1: no toolbar row wraps at 320, 390, 768, 1024 and 1440', async ({ page }) => {
    watch(page, 'someone resizing the Font Gallery')
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      await page.route('**/api/fonts', (route) => route.fulfill({ json: CATALOGUE }))
      await go(page, '/create/font-gallery')
      await expect(page.locator('.fg-card').first()).toBeVisible()
      const rows = await page.evaluate(() => {
        const out = []
        for (const el of document.querySelectorAll('.tl-toolbar, .fg-bar2')) {
          // Children of different heights share a row but not a top edge, so
          // compare their vertical centres: one row means the centres agree.
          const kids = [...el.children].filter((k) => k.getBoundingClientRect().height > 0 && getComputedStyle(k).position !== 'absolute')
          const mids = kids.map((k) => { const r = k.getBoundingClientRect(); return r.top + r.height / 2 })
          out.push({ cls: el.className, scroll: el.scrollHeight, client: el.clientHeight, kids: kids.length, spread: mids.length ? Math.max(...mids) - Math.min(...mids) : 0 })
        }
        return out
      })
      for (const r of rows) {
        expect(r.scroll, `${width}px: ${r.cls} is taller than one row`).toBeLessThanOrEqual(r.client + 1)
        expect(r.kids, `${width}px: ${r.cls} has no children, so the check proves nothing`).toBeGreaterThanOrEqual(1)
        expect(r.spread, `${width}px: ${r.cls} wraps onto a second row`).toBeLessThanOrEqual(2)
      }
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflowX, `${width}px: the page scrolls sideways`).toBeLessThanOrEqual(0)
    }
  })

  test('criterion 2: nothing on the list state is uppercase mono', async ({ page }) => {
    watch(page, 'someone reading the Font Gallery labels')
    await open(page, 1440)
    const offenders = await page.evaluate(() => [...document.querySelectorAll('.fg-page *')]
      .filter((el) => {
        if (el.closest('.fg-compare-tray, .fg-overlay, .fgd-overlay')) return false
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || !el.childNodes.length) return false
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        return hasText && cs.textTransform === 'uppercase' && /mono/i.test(cs.fontFamily)
      })
      .map((el) => el.className || el.tagName))
    expect(offenders, 'uppercase mono text on the list state').toEqual([])
    const count = await page.locator('.fg-count').evaluate((el) => getComputedStyle(el).textTransform)
    expect(count).toBe('none')
  })

  for (const { width, band, name } of LAYOUTS) {
    test(`criterion 3: at ${width} the band is ${band}px, the name ${name}px, and a wake moves no box`, async ({ page }) => {
      watch(page, 'someone hovering a band')
      await open(page, width)
      const card = page.locator('.fg-card').first()
      const nameEl = card.locator('.fg-card-name')
      await expect(nameEl).toHaveText('Lora')
      const box = await card.boundingBox()
      expect(Math.round(box.height), `${width}px band height`).toBe(band)
      const size = await nameEl.evaluate((el) => Math.round(parseFloat(getComputedStyle(el).fontSize)))
      expect(size, `${width}px name size`).toBe(name)
      const family = await nameEl.evaluate((el) => getComputedStyle(el).fontFamily)
      expect(family).toContain('Lora')

      const boxes = () => card.evaluate((el) => [el, ...el.querySelectorAll('*')].map((n) => {
        const r = n.getBoundingClientRect()
        return [Math.round(r.x * 10), Math.round(r.y * 10), Math.round(r.width * 10), Math.round(r.height * 10)].join(',')
      }))
      // The faces for the weight ladder arrive after the band is ready, and each
      // one re-sets the width of its label. A box that moved because a face landed
      // is not a box that moved because of the hover, so take the "before" set only
      // once the faces are in and two readings a beat apart agree.
      await page.evaluate(() => document.fonts.ready)
      let last = ''
      await expect.poll(async () => {
        const now = (await boxes()).join('|')
        const settled = now === last
        last = now
        return settled
      }, { message: `${width}px: the band's boxes never stopped moving`, intervals: [250], timeout: 10000 }).toBe(true)
      const before = await boxes()
      await card.hover()
      await page.waitForTimeout(400)
      expect(await boxes(), 'hovering moved or resized an element').toEqual(before)
      await card.locator('.fg-card-open').focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(400)
      expect(await boxes(), 'focusing moved or resized an element').toEqual(before)
    })
  }

  test('criterion 3: a long name shrinks to its floor and is clipped, never ellipsised', async ({ page }) => {
    watch(page, 'someone typing a long phrase')
    await open(page, 1440)
    await fillGalleryPreviewText(page, 'Pack my box with five dozen liquor jugs and a quartz sphinx')
    const nameEl = page.locator('.fg-card-name').first()
    const info = await nameEl.evaluate((el) => ({
      size: parseFloat(getComputedStyle(el).fontSize),
      ellipsis: getComputedStyle(el).textOverflow === 'ellipsis',
    }))
    expect(info.size, 'the name never goes below the 72px floor').toBeGreaterThanOrEqual(71.5)
    expect(info.ellipsis).toBe(false)
  })

  // The band follows the Size choice but the reveal's type does not, so at a
  // small size the reveal must drop what does not fit instead of cutting it.
  for (const size of [72, 48]) {
    test(`criterion 4: at Size ${size} the reveal is hidden or its content fits, and it clears the name`, async ({ page }) => {
      watch(page, 'someone hovering a small-size band')
      await open(page, 1440)
      await page.getByRole('button', { name: /^Specimen size/ }).click()
      await page.getByRole('option', { name: String(size), exact: true }).click()
      const card = page.locator('.fg-card').first()
      await expect(card.locator('.fg-card-name')).toHaveText('Lora')
      await card.hover()
      await page.waitForTimeout(400)
      const m = await card.evaluate((el) => {
        const reveal = el.querySelector('.fg-card-reveal')
        const r = reveal.getBoundingClientRect()
        const preview = el.querySelector('.fg-card-preview').getBoundingClientRect()
        const lines = ['.fg-card-pangram', '.fg-card-weights'].map((sel) => {
          const line = reveal.querySelector(sel)
          const shown = getComputedStyle(line).display !== 'none'
          const b = line.getBoundingClientRect()
          return { sel, shown, overflow: shown ? b.bottom - r.bottom : 0 }
        })
        return {
          name: parseFloat(getComputedStyle(el.querySelector('.fg-card-name')).fontSize),
          opacity: getComputedStyle(reveal).opacity,
          gap: r.top - preview.bottom,
          clipped: reveal.scrollHeight - reveal.clientHeight,
          lines,
        }
      })
      expect(m.opacity, 'the wake shows the reveal').toBe('1')
      expect(m.name, 'the Size choice took').toBe(size)
      expect(m.gap, 'the reveal starts below the descender room under the name').toBeGreaterThanOrEqual(size * 0.14 - 0.5)
      for (const line of m.lines) expect(line.overflow, `${line.sel} runs past the reveal`).toBeLessThanOrEqual(0.5)
      expect(m.clipped, 'something in the reveal is cut off').toBeLessThanOrEqual(0)
      // 72 has room for the pangram; the check above proves nothing if the
      // reveal is hidden everywhere.
      if (size === 72) expect(m.lines[0].shown, 'the pangram fits at Size 72 and should show').toBe(true)
    })
  }

  test('criterion 5: the count and the search placeholder follow the category', async ({ page }) => {
    watch(page, 'someone narrowing to serifs')
    await open(page, 1440)
    await expect(page.locator('.fg-count')).toHaveText('4 families, most popular first')
    await expect(page.getByLabel('Search font families')).toHaveAttribute('placeholder', 'Search 4 families')
    await page.getByRole('button', { name: 'Serif', exact: true }).click()
    await expect(page.locator('.fg-count')).toHaveText('2 serif families, most popular first')
    await expect(page.getByLabel('Search font families')).toHaveAttribute('placeholder', 'Search 2 serif families')
    await page.getByLabel('Search font families').fill('lor')
    await expect(page.locator('.fg-count')).toHaveText('1 serif family matches “lor”, most popular first')
  })

  test('the empty state is one plain band with Clear filters', async ({ page }) => {
    watch(page, 'someone searching for nothing')
    await open(page, 1440)
    await page.getByLabel('Search font families').fill('zzzzqqq')
    await expect(page.getByText('Nothing matches that yet.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.fg-card')).toHaveCount(4)
  })

  test('the compare button is 44px and named for the family', async ({ page }) => {
    watch(page, 'someone adding a font to compare')
    await open(page, 390)
    const add = page.getByRole('button', { name: 'Add Lora to comparison' })
    const box = await add.boundingBox()
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await add.click()
    await expect(page.getByRole('button', { name: 'Remove Lora from comparison' })).toBeVisible()
  })
})
