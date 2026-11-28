// /tools: the tool previews page, on the V3 tokens (mk-* classes, v3-marketing.css).
//
// Covers the shell, the nav link, the derived counts, the six cards, the live
// demos, the seed colour the hero and the Palette card share, the closing band's order
// (See the plans, then Use for free; stacked the other way round on a phone) and the 44px hit areas of the demo controls on a phone.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { createTools } from '../../src/data/toolTree.js'
import { TOOL_COUNT, numberWord } from '../../src/components/spectrum/spectrumFacts.js'

const LISTED = createTools().filter((t) => !t.soon)
// Card titles are the tool tree's own labels, the names the nav uses, in DOM order
// (CARD_IDS in SpectrumTools.jsx). The grid draws Type Scale beside Contrast.
const ORDER = ['Palette', 'Contrast Checker', 'Type Scale', 'Font Gallery', 'Icon Library', 'File Converter']

test.describe('/tools shell', () => {
  test('renders the Spectrum nav, the closing call and the footer; /tools/ is the same page', async ({ page }) => {
    watch(page, 'a visitor opening the tools page')
    for (const url of ['/tools', '/tools/']) {
      await go(page, url)
      // Mutation: drop the /tools branch in App.jsx → the 404 page's h1 fails this.
      await expect(page.locator('h1')).toHaveAccessibleName(`${numberWord(TOOL_COUNT, { capital: true })} tools, one tab.`)
      await expect(page.locator('.spnav')).toHaveCount(1)
      await expect(page.locator('.sp-footer')).toHaveCount(1)
      await expect(page.locator('section.hm-close')).toHaveCount(1)
      await expect(page.locator('.sp-ramp--close')).toHaveCount(0)
    }
  })

  test('the Tools link goes to /tools and is current only there', async ({ page }) => {
    watch(page, 'a visitor following the Tools link')
    await go(page, '/')
    // On the sales page the link jumps to its Try the tools section and names no screen.
    await expect(page.locator('.spnav-quiet-link', { hasText: 'Tools' })).toHaveAttribute('href', '#try')
    // Mutation: activeQuiet returns 'tools' on '/' → this fails.
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveCount(0)
    await go(page, '/plans')
    const tools = page.locator('.spnav-quiet-link', { hasText: 'Tools' })
    await expect(tools).toHaveAttribute('href', '/tools')
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('Plans')
    await tools.click()
    await expect(page).toHaveURL(/\/tools$/)
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('Tools')
  })

  test('the homepage bookmarks heading is there; the footer lists All tools first', async ({ page }) => {
    await go(page, '/')
    await expect(page.locator('#bookmarks h2#bm-h')).toHaveText('Say goodbye to bookmark folders.')
    await expect(page.locator('.sp-footer-col').first().locator('a').first()).toHaveText('All tools')
  })
})

test.describe('/tools content', () => {
  test('the cards and rows equal the listed tools, and the six cards come in order', async ({ page }) => {
    await go(page, '/tools')
    // Mutation: type a number or drop a tool from CARD_IDS/GROUPS → the count disagrees.
    const cards = page.locator('.mk-card h3')
    await expect(cards).toHaveText(ORDER)
    // Beta tools sit in a line of their own under the rows, not in the heading's count.
    const rows = await page.locator('.mk-row').count()
    const beta = await page.locator('.mk-more.spt-beta a').count()
    expect(await cards.count() + rows + beta).toBe(LISTED.length)
    expect(beta).toBe(LISTED.filter((t) => t.beta).length)
  })

  test('the Contrast card shows a ratio, and a failing pair never uses the pass colour', async ({ page }) => {
    await go(page, '/tools')
    const result = page.locator('.mk-card[data-tool="contrast"] .mk-result')
    const ratio = result.locator('b')
    const pass = await ratio.evaluate((el) => getComputedStyle(el).color)
    const swatch = page.locator('.mk-card[data-tool="contrast"] .mk-swatch').first()
    // Cycle until the verdict fails (step 1 against steps 2 and 3 are close). Retry click-and-check as one unit.
    await expect(async () => {
      if ((await result.getAttribute('data-pass')) === 'yes') await swatch.click()
      await expect(result).toHaveAttribute('data-pass', 'no', { timeout: 400 })
    }).toPass({ timeout: 8000 })
    // Mutation: paint a failing pair with --ok-strong → the two colours match.
    await expect.poll(() => ratio.evaluate((el) => getComputedStyle(el).color)).not.toBe(pass)
  })

  test('the live demos respond: palette seed, ratio switch', async ({ page }) => {
    await go(page, '/tools')
    const card = page.locator('.mk-card[data-tool="palette"]')
    const ramp = card.locator('.mk-ramp li').first()
    const before = await ramp.evaluate((el) => getComputedStyle(el).backgroundColor)
    await card.getByRole('button', { name: 'Signal seed' }).click()
    await expect.poll(() => ramp.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before)
    await page.getByRole('button', { name: 'Ratio 1.333' }).click()
    await expect(page.getByRole('button', { name: 'Ratio 1.333' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('a seed picked in the hero repaints the hero ramp and the Palette card together', async ({ page }) => {
    await go(page, '/tools')
    const hero = page.locator('.mk-pal')
    const card = page.locator('.mk-card[data-tool="palette"]')
    const paint = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor)
    const before = await paint(hero.locator('.mk-ramp li').first())
    await hero.getByRole('button', { name: 'Fuchsia seed' }).click()
    await expect(hero.getByRole('button', { name: 'Fuchsia seed' })).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByRole('button', { name: 'Fuchsia seed' })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => paint(hero.locator('.mk-ramp li').first())).not.toBe(before)
    // The hero ramp is five of the card's nine steps, so every hero hex is also in the card.
    const heroHexes = await hero.locator('.mk-ramp li span').allInnerTexts()
    const cardHexes = await card.locator('.mk-ramp li span').allInnerTexts()
    expect(heroHexes).toHaveLength(5)
    for (const hex of heroHexes) expect(cardHexes).toContain(hex)
  })

  // DOM and tab order are the same everywhere: See the plans, then Use for free. On a desktop that is
  // also the drawn order (plans left, free right). On a phone the two stack with Use for free on top, so
  // the filled pill is the first thing a thumb meets, and both run the full content width at 52px.
  for (const [width, height] of [[1440, 900], [1200, 800], [390, 844], [320, 700]]) {
    test(`the closing band is See the plans then Use for free in the DOM and drawn to suit ${width}px`, async ({ page }) => {
      watch(page, 'a visitor reaching the end of the tools page')
      await page.setViewportSize({ width, height })
      await go(page, '/tools')
      const band = page.locator('section.hm-close')
      await band.scrollIntoViewIfNeeded()
      const links = band.locator('a.hm-close-cta, a.hm-close-ghost')
      // Mutation: swap the two Links in SpectrumTools.jsx -> the DOM order, the tab order and the drawn order all change.
      await expect(links).toHaveText(['See the plans', 'Use for free'])
      await expect(band.locator('a.hm-close-cta')).toHaveAttribute('href', '/projects')
      await expect(band.locator('a.hm-close-ghost')).toHaveAttribute('href', '/plans')
      const [plans, free] = await links.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } }))
      const edge = await page.locator('.hm-close h2').evaluate((el) => el.getBoundingClientRect().left)
      if (width >= 768) {
        expect(plans.y, 'plans and free sit on one row').toBe(free.y)
        expect(plans.x, 'the plans link is drawn on the left').toBeLessThan(free.x)
      } else {
        // Mutation: delete `.mkt .hm-close-btns { flex-direction: column-reverse }` in v3-marketing.css -> the plans link is drawn first.
        expect(free.y, 'the free link is drawn above the plans link').toBeLessThan(plans.y)
        expect(free.x).toBe(plans.x)
        expect(free.w).toBe(plans.w)
        expect(free.w, 'both buttons run the full content width').toBe(width - 2 * edge)
        expect(free.h).toBe(52)
        expect(plans.h).toBe(52)
      }
      // Tab runs in DOM order: from the plans link it reaches the free link.
      await links.first().focus()
      await page.keyboard.press('Tab')
      await expect(links.nth(1)).toBeFocused()
    })
  }

  test('the Palette hero card is hidden on a phone and shown from tablet up', async ({ browser }) => {
    for (const [width, shown] of [[320, false], [390, false], [767, false], [1200, true], [1440, true]]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      await go(page, '/tools')
      // Mutation: delete `.mkt .mk-pal { display: none }` in the phone block of v3-marketing.css -> a 220px preview card follows the intro.
      expect(await page.locator('.mk-pal').isVisible(), `.mk-pal at ${width}px`).toBe(shown)
      await ctx.close()
    }
  })

  test('the hero pill runs the full content width on a phone', async ({ browser }) => {
    for (const width of [320, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      await go(page, '/tools')
      const box = await page.locator('.mk-intro-copy .mk-pill').evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, w: r.width } })
      // Mutation: delete `.mkt .mk-intro-copy .mk-pill { display: flex }` in v3-marketing.css -> the pill shrinks to its label.
      expect(box.x).toBe(16)
      expect(box.w).toBe(width - 32)
      await ctx.close()
    }
  })

  test('phone cards take 16px padding, and 12px under 375', async ({ browser }) => {
    for (const [width, pad] of [[390, '16px'], [374, '12px'], [320, '12px'], [1440, '24px']]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      await go(page, '/tools')
      // Mutation: delete the `.mkt .mk-card { padding }` rules in v3-marketing.css -> the cards fall back to 24px.
      expect(await page.locator('.mk-card').first().evaluate((el) => getComputedStyle(el).paddingLeft), `card padding at ${width}px`).toBe(pad)
      await ctx.close()
    }
  })

  test('the page opens on the blue Cobalt seed, in the hero and the Palette card', async ({ page }) => {
    await go(page, '/tools')
    // Mutation: SEED_START back to 'Signal' in SpectrumTools.jsx -> the orange seed is pressed.
    await expect(page.locator('.mk-pal').getByRole('button', { name: 'Cobalt seed' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.mk-card[data-tool="palette"]').getByRole('button', { name: 'Cobalt seed' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('the Signal ramp is the board orange, not salmon', async ({ page }) => {
    await go(page, '/tools')
    const card = page.locator('.mk-card[data-tool="palette"]')
    await card.getByRole('button', { name: 'Signal seed' }).click()
    await expect(card.getByRole('button', { name: 'Signal seed' })).toHaveAttribute('aria-pressed', 'true')
    // Mutation: put Signal back to its old salmon h / c in spectrumKit.js -> the 400 step is a paler salmon.
    const hexes = await card.locator('.mk-ramp li span').allInnerTexts()
    expect(hexes[4], 'the 400 step of the Signal ramp').toBe('#FE591E')
  })

  test('no sideways scroll at 320, 390, 768 and 1440; no em dash', async ({ browser }) => {
    for (const width of [320, 390, 768, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      await go(page, '/tools')
      // Mutation: give a demo a fixed 400px width → scrollWidth exceeds the viewport at 320.
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px scrolls sideways`).toBeLessThanOrEqual(width)
      expect(await page.locator('main').innerText()).not.toContain('—')
      await ctx.close()
    }
  })
})

// The demo controls are drawn 36px tall and hit at 44px on a phone: the seeds and the ratio
// buttons reach 4px past their edge, and the sample-text field's label takes 4px above and
// below. Measured as a hit area, as 99-coarse-targets-44.spec.js does: a point 21px above and
// below the centre (and left and right on the narrow seeds) must land on the control. At 1440
// with a mouse the controls keep their drawn size and nothing reaches further.
test.describe('/tools demo controls: 44px hit areas', () => {
  const CONTROLS = [
    ['a seed in the hero', '.mk-pal .mk-seed', 'desktop'],
    ['a seed on the Palette card', '.mk-card[data-tool="palette"] .mk-seed'],
    ['a ratio button', '.mk-seg button'],
    ['the sample-text field', '.mk-field input'],
  ]
  // The field's tap target is its label, so a hit anywhere in the label counts for the input.
  const hitArea = (page, selector) => page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)][0]
    el.scrollIntoView({ block: 'center', behavior: 'instant' })
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const lands = (x, y) => {
      const hit = document.elementFromPoint(x, y)
      return !!hit && (hit === el || el.contains(hit) || (el.tagName === 'INPUT' && hit.closest('label')?.contains(el)))
    }
    const probes = { up: [cx, cy - 21], down: [cx, cy + 21] }
    if (r.width < 44) Object.assign(probes, { left: [cx - 21, cy], right: [cx + 21, cy] })
    const misses = Object.entries(probes).filter(([, [x, y]]) => !lands(x, y)).map(([k]) => k)
    return { w: Math.round(r.width), h: Math.round(r.height), centre: lands(cx, cy), misses }
  }, selector)

  for (const [what, selector, only] of CONTROLS) {
    // The hero Palette card is hidden on a phone, so its seeds are only measured at 1440.
    if (only !== 'desktop') test(`${what} is hit across 44px at 390 and is still drawn at 36`, async ({ page }) => {
      watch(page, 'someone on a phone trying the tools page demos')
      await page.setViewportSize({ width: 390, height: 844 })
      await go(page, '/tools')
      await expect(page.locator(selector).first()).toBeVisible()
      const got = await hitArea(page, selector)
      expect(got.centre, `${what} is not what sits at its own centre`).toBe(true)
      // Mutation: delete the ::after reach / the field's padding in v3-marketing.css -> the points above and below miss.
      expect(got.misses, `${what} (${got.w} by ${got.h}) misses a point 21px from its centre: ${got.misses}`).toEqual([])
      expect(got.h, `${what} was made taller instead of reaching further`).toBe(36)
    })

    test(`${what} reaches no further than it is drawn at 1440 with a mouse`, async ({ page }) => {
      watch(page, 'someone at a desk trying the tools page demos')
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, '/tools')
      await expect(page.locator(selector).first()).toBeVisible()
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(false)
      const got = await hitArea(page, selector)
      // Positive control: the control itself is under its own centre, so a miss means the reach is not there.
      expect(got.centre).toBe(true)
      expect(got.h).toBe(36)
      expect(got.misses, `${what} reaches past its drawn edge on a desktop`).toContain('up')
      expect(got.misses).toContain('down')
    })
  }
})
