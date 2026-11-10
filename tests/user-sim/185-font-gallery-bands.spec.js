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
//   criterion 3  `.fg-card.is-open .fg-card-preview { top: 0 }`, so the name moves when the
//                band opens
//   criterion 4  `.fg-card-meta { top: var(--fg-y) }`, so the meta line runs over the name
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
// Band height is max(200, round(size * 1.1) + 147) from a tablet up and
// max(140, ceil(size * 1.1) + 99) on a phone (src/utils/galleryBand.js). Lists open
// at Size 96 on a desktop and a tablet, and 48 on a phone. `top` is the room above
// the name, `gap` the room between the name and the meta line, and `below` the room
// under the meta line, each a spacing token (--s-7 and --s-6 wide, --s-5 and --s-6
// on a phone). Each is at least 1.5 times what it was, so a band that tightens back
// fails on these numbers.
const LAYOUTS = [
  { width: 1440, band: 253, name: 96, top: 48, gap: 48, below: 32 },
  { width: 768, band: 253, name: 96, top: 48, gap: 48, below: 32 },
  { width: 390, band: 152, name: 48, top: 24, gap: 24, below: 32 },
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

  for (const { width, band, name, top, gap, below } of LAYOUTS) {
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
      const inset = await card.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const meta = el.querySelector('.fg-card-meta').getBoundingClientRect()
        const copy = [...el.querySelectorAll('button')].find((b) => /Copy CSS/.test(b.textContent || ''))
        return {
          name: el.querySelector('.fg-card-name').getBoundingClientRect().top - r.top,
          meta: r.bottom - meta.bottom,
          copy: copy ? r.bottom - copy.getBoundingClientRect().bottom : null,
          gap: meta.top - el.querySelector('.fg-card-preview').getBoundingClientRect().bottom,
        }
      })
      expect(Math.round(inset.name), `${width}px name inset from the top`).toBe(top)
      // The room under the meta line, then the band's 1px divider.
      expect(inset.meta, `${width}px meta line sits ${below}px above the bottom`).toBeGreaterThanOrEqual(below)
      expect(inset.meta, `${width}px meta line sits ${below}px above the bottom`).toBeLessThanOrEqual(below + 1)
      expect(inset.copy, `${width}px Copy CSS is on the meta line's bottom edge`).toBeGreaterThanOrEqual(below)
      expect(inset.copy, `${width}px Copy CSS is on the meta line's bottom edge`).toBeLessThanOrEqual(below + 1)
      expect(inset.gap, `${width}px room between the name and the meta line shrank back`).toBeGreaterThanOrEqual(gap - 1)
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

  // The Size menu has 11 steps; the band follows each of them.
  const SIZE_STEPS = [
    { width: 1440, size: 56, band: 209 },
    { width: 1440, size: 80, band: 235 },
    { width: 1440, size: 112, band: 270 },
    { width: 390, size: 56, band: 161 },
    { width: 390, size: 112, band: 223 },
  ]
  for (const { width, size, band } of SIZE_STEPS) {
    test(`criterion 3: at ${width} and Size ${size} the band is ${band}px`, async ({ page }) => {
      watch(page, 'someone choosing a specimen size')
      await open(page, width)
      if (width >= 1024) {
        await page.getByRole('button', { name: /^Specimen size/ }).click()
        await expect(page.getByRole('option')).toHaveCount(11)
        await page.getByRole('option', { name: String(size), exact: true }).click()
      } else {
        // A phone sets the size with the slider in the Filters sheet.
        await page.getByRole('button', { name: 'Filters', exact: true }).click()
        await page.getByRole('dialog', { name: 'Filters' }).getByRole('slider', { name: 'Size' }).fill(String(size))
      }
      const card = page.locator('.fg-card').first()
      await expect(card.locator('.fg-card-name')).toHaveCSS('font-size', `${size}px`)
      expect(Math.round((await card.boundingBox()).height), `${width}px band at Size ${size}`).toBe(band)
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

  // The band follows the Size choice, so at a small size the meta line must
  // still sit below the name instead of running into it.
  for (const size of [72, 48]) {
    test(`criterion 4: at Size ${size} the band holds its height and the meta line clears the name`, async ({ page }) => {
      watch(page, 'someone hovering a small-size band')
      await open(page, 1440)
      await page.getByRole('button', { name: /^Specimen size/ }).click()
      await page.getByRole('option', { name: String(size), exact: true }).click()
      const card = page.locator('.fg-card').first()
      await expect(card.locator('.fg-card-name')).toHaveText('Lora')
      const heightAtRest = (await card.boundingBox()).height
      await card.hover()
      await page.waitForTimeout(400)
      const m = await card.evaluate((el) => {
        const band = el.getBoundingClientRect()
        const preview = el.querySelector('.fg-card-preview').getBoundingClientRect()
        const meta = el.querySelector('.fg-card-meta')
        const mb = meta.getBoundingClientRect()
        return {
          name: parseFloat(getComputedStyle(el.querySelector('.fg-card-name')).fontSize),
          height: band.height,
          gap: mb.top - preview.bottom,
          inside: band.bottom - mb.bottom,
          clipped: meta.scrollWidth - meta.clientWidth,
        }
      })
      expect(m.name, 'the Size choice took').toBe(size)
      expect(m.height, 'the open band keeps the height it had at rest').toBe(heightAtRest)
      expect(m.gap, 'the meta line starts below the name').toBeGreaterThanOrEqual(0)
      expect(m.inside, 'the meta line stays inside the band').toBeGreaterThanOrEqual(0)
      expect(m.clipped, 'the meta line is cut off').toBeLessThanOrEqual(0)
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

  // The grid is the round-3 boards' tiles: filled and 8px apart with 12px corners, not
  // flush hairline cells. A hover or keyboard focus changes the tile's fill, never its box.
  // MUTATION: `gap: 0` on `.fg-grid--tiles`, or drop `.fg-card:hover { --fg-ground }`.
  const TILES = [
    { width: 1440, cols: 4, height: 224, fill: 'rgb(15, 16, 18)', wake: 'rgb(25, 25, 25)' },
    { width: 768, cols: 3, height: 224, fill: 'rgb(15, 16, 18)', wake: 'rgb(25, 25, 25)' },
    { width: 390, cols: 2, height: 144 },
    { width: 320, cols: 2, height: 144 },
  ]
  for (const { width, cols, height, fill, wake } of TILES) {
    test(`grid: at ${width} the tiles are ${cols} across, 8px apart, 12px corners, ${height}px tall`, async ({ page }) => {
      watch(page, 'someone switching to the grid')
      await open(page, width)
      if (width >= 768) {
        await page.getByRole('button', { name: 'Grid view' }).click()
      } else {
        await page.getByRole('button', { name: 'Filters', exact: true }).click()
        await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Grid', exact: true }).click()
        await page.keyboard.press('Escape')
      }
      const tiles = page.locator('.fg-grid--tiles .fg-card')
      await expect(tiles).toHaveCount(4)
      await page.evaluate(() => document.fonts.ready)
      const m = await tiles.evaluateAll((els) => {
        const rects = els.map((el) => el.getBoundingClientRect())
        const cs = getComputedStyle(els[0])
        return {
          tops: rects.map((r) => Math.round(r.top)),
          lefts: rects.map((r) => Math.round(r.left)),
          h: Math.round(rects[0].height),
          gapX: rects[1].left - rects[0].right,
          radius: cs.borderTopLeftRadius,
          bg: cs.backgroundColor,
          page: document.documentElement.scrollWidth - window.innerWidth,
        }
      })
      expect(m.h, `${width}px tile height`).toBe(height)
      expect(m.gapX, `${width}px gap between tiles`).toBe(8)
      expect(m.radius, `${width}px corner radius`).toBe('12px')
      expect(new Set(m.lefts).size, `${width}px columns`).toBe(Math.min(cols, 4))
      expect(m.bg, `${width}px a tile is filled, not transparent`).not.toBe('rgba(0, 0, 0, 0)')
      expect(m.page, `${width}px the page scrolls sideways`).toBeLessThanOrEqual(0)
      if (width >= 768) {
        expect(m.bg, `${width}px tile fill`).toBe(fill)
        const first = tiles.first()
        const before = await first.boundingBox()
        await first.hover()
        await expect.poll(() => first.evaluate((el) => getComputedStyle(el).backgroundColor), { message: `${width}px the wake fill`, timeout: 2000 }).toBe(wake)
        expect(await first.boundingBox(), 'the wake moved the tile').toEqual(before)
      }
    })
  }

  // The 44px floor is the coarse-pointer rule (36px with a mouse), so this runs as a phone.
  test.describe('on a touch phone', () => {
    test.use({ hasTouch: true, isMobile: true })
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
})
