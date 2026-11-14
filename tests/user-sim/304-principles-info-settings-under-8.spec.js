// /learn/principles, /info and /settings (signed out): the three routes a route
// sweep scored 7/10 at 768. Every assertion is read off computed styles and
// boxes, because each defect was a shape on screen, not a missing element:
//
//   /learn/principles  the contrast proof was a card with a tile and a pill in it;
//                      the lead h2 wrapped to three short lines beside empty width
//   /info              the "New here?" banner pinned its text to the top beside a
//                      32px X; the jump select was a second bordered box
//   /settings          the h1 was 15px, under the "Appearance" h2; the switch had
//                      no 44px target; the credit floated centred mid-page
//
// MUTATION notes sit on each assertion: undo the named CSS and that line fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

async function open(browser, width, route, touch = false) {
  const height = width < 700 ? 844 : width < 1000 ? 1024 : 900
  const ctx = await browser.newContext({ viewport: { width, height }, ...(touch ? { hasTouch: true, isMobile: true } : {}) })
  const page = await ctx.newPage()
  watch(page, `${route} at ${width}px`)
  await go(page, route)
  return { ctx, page }
}

const WIDTHS = [320, 390, 768, 1440]

test.describe('/learn/principles', () => {
  test('the contrast demo is two tiles and nothing boxed inside them', async ({ browser }) => {
    const { ctx, page } = await open(browser, 768, '/learn/principles')
    const fig = page.locator('.prn-cx')
    await expect(fig).toBeVisible()
    const found = await fig.evaluate((root) => {
      const alpha = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/)
        if (!m) return 0
        const p = m[1].split(/[,/ ]+/).filter(Boolean)
        return p.length > 3 ? Number(p[3]) : 1
      }
      const side = (cs, s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none'
      const boxes = []
      const cells = []
      for (const el of root.querySelectorAll('*')) {
        const cs = getComputedStyle(el)
        const filled = alpha(cs.backgroundColor) > 0 || cs.backgroundImage !== 'none'
        // A hairline (one or two sides) is a divider; a box is three or more sides.
        const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => side(cs, s)).length
        if (el.classList.contains('prn-cx-cell')) { cells.push({ filled, sides }); continue }
        if (filled || sides >= 3) boxes.push(`${el.className || el.tagName}: filled=${filled} sides=${sides}`)
      }
      return { boxes, cells }
    })
    // MUTATION: put `background` back on `.prn-cx-sample` (inline or in principles.css)
    // or give it `border-width: 2px` all round, and this lists it.
    expect(found.boxes, 'a filled or fully bordered box inside a contrast tile').toEqual([])
    // The board draws the proof as two tiles (.prn-cx-cell, a card fill; framed on phone): they are the only surface, a tile never holds a second box.
    expect(found.cells, 'two tiles, one per ink strength').toHaveLength(2)
    for (const c of found.cells) expect(c.filled, 'each tile is a filled surface').toBe(true)
    // Both specimens are text painted in the ink they measure (light theme, hand-checked):
    // the tertiary ink #66665F that clears the floor, and the primary ink at 40% on #F5F5F2 that does not.
    const samples = await page.locator('.prn-cx-sample').evaluateAll((els) => els.map((el) => getComputedStyle(el).color))
    expect(samples).toEqual(["rgb(102, 102, 95)", "rgb(153, 153, 152)"])
    const verdicts = await page.locator('.prn-cx-verdict').allTextContents()
    expect(verdicts, "the quiet ink passes and the faint one fails").toEqual(["Passes AA", "Fails AA"])
    await ctx.close()
  })

  for (const width of [768, 1440]) {
    test(`the lead h2 is at most two lines at ${width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, width, '/learn/principles')
      const h2 = page.locator('.prn-item[data-lead="true"] .prn-rule')
      await expect(h2).toHaveText('Contrast is a measurement, not an opinion.')
      const m = await h2.evaluate((el) => {
        const cs = getComputedStyle(el)
        const lh = parseFloat(cs.lineHeight)
        return { lines: Math.round(el.getBoundingClientRect().height / lh), width: el.getBoundingClientRect().width }
      })
      // MUTATION: put `max-width: 17ch` back on the lead `.prn-rule` and this reads 3.
      expect(m.lines, 'the lead h2 line count').toBeLessThanOrEqual(2)
      await ctx.close()
    })
  }

  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, width, '/learn/principles')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await ctx.close()
    })
  }
})

test.describe('/info', () => {
  for (const width of WIDTHS) {
    test(`the banner is sized by its content, with a 44px X on the text's midline at ${width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, width, '/info')
      const intro = page.locator('.ic-intro')
      await expect(intro).toBeVisible()
      const x = await page.locator('.ic-intro-close').boundingBox()
      const body = await page.locator('.ic-intro-body').boundingBox()
      const box = await intro.boundingBox()
      // MUTATION: put `width/height: 32px` back on `.ic-intro-close`.
      expect(x.width, 'X width').toBeGreaterThanOrEqual(44)
      expect(x.height, 'X height').toBeGreaterThanOrEqual(44)
      // MUTATION: put `align-items: flex-start` back on `.ic-intro`.
      const dy = Math.abs((x.y + x.height / 2) - (body.y + body.height / 2))
      expect(dy, 'the X and the text share a midline').toBeLessThanOrEqual(1)
      // The box is its tallest child plus the 8px above and below, no dead space.
      const tallest = Math.max(x.height, body.height)
      expect(box.height - tallest, 'height beyond the content').toBeLessThanOrEqual(2 + 16)
      await ctx.close()
    })
  }

  test('the jump select is part of the page head, not a second bordered box, at 768', async ({ browser }) => {
    const { ctx, page } = await open(browser, 768, '/info')
    const jump = page.locator('.ic-jump')
    await expect(jump).toBeVisible()
    const cs = await jump.evaluate((el) => {
      const s = getComputedStyle(el)
      return {
        top: parseFloat(s.borderTopWidth), left: parseFloat(s.borderLeftWidth), right: parseFloat(s.borderRightWidth),
        bottom: parseFloat(s.borderBottomWidth), radius: parseFloat(s.borderTopLeftRadius), bg: s.backgroundColor,
      }
    })
    // MUTATION: delete the `.ic-jump.menu-select-trigger` block in info.css.
    expect([cs.top, cs.left, cs.right], 'no box around the select').toEqual([0, 0, 0])
    expect(cs.bottom, 'one hairline under it').toBeGreaterThan(0)
    expect(cs.radius).toBe(0)
    expect(cs.bg, 'no fill').toBe('rgba(0, 0, 0, 0)')
    const box = await jump.boundingBox()
    expect(box.height, 'still a 48px target').toBeGreaterThanOrEqual(47.5)
    await ctx.close()
  })
})

test.describe('/settings (signed out)', () => {
  for (const width of WIDTHS) {
    test(`the page title is the largest heading at ${width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, width, '/settings')
      const sizes = await page.evaluate(() => {
        const px = (el) => parseFloat(getComputedStyle(el).fontSize)
        const h1 = document.querySelector('.stg h1')
        // The section h2 (computed size exists even where the phone list hides the panel).
        const h2 = document.querySelector('.stg .settings-section-h h2')
        return { h1: px(h1), h2: h2 ? px(h2) : null }
      })
      // MUTATION: put `font-size: 15px` back on `.stg .stg-title`.
      expect(sizes.h2, 'a section h2').not.toBeNull()
      expect(sizes.h1, 'h1 is larger than the section h2').toBeGreaterThan(sizes.h2)
      await ctx.close()
    })
  }

  test('the Reduced motion switch has a 44px target on a touch tablet, and the row flips it', async ({ browser }) => {
    const { ctx, page } = await open(browser, 768, '/settings', true)
    const sw = page.locator('#set-reduced-motion')
    await expect(sw).toBeVisible()
    const target = await sw.evaluate((el) => {
      const s = getComputedStyle(el, '::before')
      const r = el.getBoundingClientRect()
      const cx = r.x + r.width / 2
      const cy = r.y + r.height / 2
      const hit = (dy) => document.elementFromPoint(cx, cy + dy) === el
      return { w: parseFloat(s.width), h: parseFloat(s.height), up: hit(-21), down: hit(21), mid: hit(0) }
    })
    // MUTATION: delete `.stg .toggle-switch::before` from the coarse-pointer block in settings.css.
    // (A mouse keeps the drawn track on purpose: spec 174.)
    expect(target.h, 'target height').toBeGreaterThanOrEqual(44)
    expect(target.w, 'target width').toBeGreaterThanOrEqual(44)
    expect(target.mid && target.up && target.down, 'the 44px box answers the pointer, not only the track').toBe(true)
    await page.locator('label[for="set-reduced-motion"]').tap()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await ctx.close()
  })

  test('the credit is the sign-off at the end of the content, not a centred float', async ({ browser }) => {
    const { ctx, page } = await open(browser, 768, '/settings')
    const credit = page.locator('.stg-credit')
    await expect(credit).toBeVisible()
    const info = await credit.evaluate((el) => {
      const s = getComputedStyle(el)
      const grid = document.querySelector('.stg .settings-grid').getBoundingClientRect()
      return {
        align: s.textAlign, hair: parseFloat(s.borderTopWidth), last: el === el.parentElement.lastElementChild,
        gap: el.getBoundingClientRect().top - grid.bottom,
      }
    })
    // MUTATION: put `text-align: center` back on `.stg .stg-credit`, or a `border-top` on `.stg.stg .stg-credit`.
    expect(info.align, 'not centred').not.toBe('center')
    // The board draws no rule over the credit; the space above it is what sets it off.
    expect(info.hair, 'a hairline is drawn over the credit').toBe(0)
    expect(info.last, 'last thing on the page').toBe(true)
    expect(info.gap, 'set off from the panels above').toBeGreaterThanOrEqual(32)
    await ctx.close()
  })
})
