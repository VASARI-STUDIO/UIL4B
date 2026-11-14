// V3 part 2: the Discover and Learn index pages on a phone, by touch
// (direction A, "Doors, with what is ready today"). Desktop twin:
// 375-v3-index-journeys-desktop.spec.js.
//
// Touch metrics (isMobile + hasTouch) make `hover: none` true, the state these
// pages' press and target rules are written for. Taps are real touchscreen taps
// at coordinates, because the stretched link sits on a pseudo-element and
// Playwright's own tap() refuses a hit that lands on the link instead of the plate.
// The one place a finger cannot be used is the press frame: headless Chromium does
// not set :active from a synthetic touch, so that journey holds the mouse instead.
// Each journey has a MUTATION line, the product change it was run against.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { LEARN_ARTICLES, TOPICS } from '../../src/data/learnIndex.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA })

const DOORS = [
  { title: 'Palette Library', path: '/discover/palettes' },
  { title: 'Gradient Library', path: '/discover/gradients' },
  { title: 'Button Library', path: '/discover/buttons' },
  { title: 'Font Gallery', path: '/create/font-gallery' },
  { title: 'Icon Library', path: '/create/icons' },
]

const todayItems = (page) => page.getByRole('region', { name: 'Ready to open today' }).getByRole('listitem')
const doorFor = (page, title) => page.locator('.srf-door').filter({ has: page.getByRole('link', { name: title, exact: true }) })
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)

/** Scroll an element to mid-screen, then tap a point in it that the stretched link covers. */
async function tapAt(page, locator, fx = 0.5, fy = 0.5) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const b = await locator.boundingBox()
  await page.touchscreen.tap(b.x + b.width * fx, b.y + b.height * fy)
}

test.describe('Discover on a phone', () => {
  test('1. tapping any part of a pick opens it: four in two rows of two, middle and corners all land on its link', async ({ page }) => {
    watch(page, 'a phone visitor tapping today\'s picks')
    await go(page, '/discover')
    const items = todayItems(page)
    await expect(items).toHaveCount(4)
    const boxes = await items.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width) } }))
    // MUTATION: make `.srf-td` one column under 1199px and this fails.
    expect(new Set(boxes.map((b) => b.x)).size, 'two columns').toBe(2)
    expect(new Set(boxes.map((b) => b.y)).size, 'two rows').toBe(2)
    for (const b of boxes) expect(b.w).toBeGreaterThan(150)
    expect(await overflow(page)).toBeLessThanOrEqual(0)

    for (let i = 0; i < 4; i += 1) {
      const item = items.nth(i)
      const link = item.getByRole('link')
      const href = await link.getAttribute('href')
      await item.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      // The middle and the four corners (8px in) of the whole item hit this item's link.
      // MUTATION: delete `.srf-door-t::after` in surface.css and only the link's own text answers.
      const misses = await item.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const link = el.querySelector('a')
        const pts = [[.5, .5], [0, 0], [1, 0], [0, 1], [1, 1]].map(([fx, fy]) => [r.x + (fx ? r.width - 8 : 8), r.y + (fy ? r.height - 8 : 8)])
        pts[0] = [r.x + r.width / 2, r.y + r.height / 2]
        return pts.filter(([x, y]) => document.elementFromPoint(x, y)?.closest('a') !== link).length
      })
      expect(misses, `${href}: points that do not hit the link`).toBe(0)

      await tapAt(page, item.locator('.srf-plate'))
      await expect(page).toHaveURL((u) => `${u.pathname}${u.search}` === href)
      await page.goBack()
      await expect(page).toHaveURL((u) => u.pathname === '/discover')
      await expect(todayItems(page)).toHaveCount(4)
    }
  })

  test('2. each door opens from its middle, and Community is a 44px target in its sentence', async ({ page }) => {
    watch(page, 'a phone visitor choosing a library')
    await go(page, '/discover')
    for (const d of DOORS) {
      const door = doorFor(page, d.title)
      await expect(door).toBeVisible()
      const link = door.getByRole('link', { name: d.title, exact: true })
      // The link text alone is a short strip; the door around it is the target.
      const strip = await link.boundingBox()
      const whole = await door.boundingBox()
      expect(whole.height, `${d.title}: the door is much taller than its title`).toBeGreaterThan(strip.height * 4)
      await tapAt(page, door, 0.5, 0.35)
      // MUTATION: delete `.srf-door-t::after` and a tap on the plate opens nothing.
      await expect(page).toHaveURL((u) => u.pathname === d.path)
      await page.goBack()
      await expect(page).toHaveURL((u) => u.pathname === '/discover')
    }
    const community = page.locator('.srf-also a', { hasText: 'Community' })
    await community.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const box = await community.boundingBox()
    // MUTATION: remove `.srf .srf-also a { padding-block: 13px; margin-block: -13px }` in the 767px block (19px tall) and this fails.
    expect(box.height).toBeGreaterThanOrEqual(44)
    // The padding above and below the words answers too, not only the 19px of text.
    const probes = await community.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return [r.y + 4, r.y + r.height - 4].map((y) => { const h = document.elementFromPoint(r.x + r.width / 2, y); return h?.closest('a') === el ? true : `${Math.round(r.height)}px box, hit ${h?.tagName}.${h?.className}` })
    })
    expect(probes).toEqual([true, true])
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
    await expect(page).toHaveURL((u) => u.pathname === '/community')
  })

  test('3. the footer carries a phone from Discover to Learn; today\'s guide and its tool open from 44px links', async ({ page }) => {
    watch(page, 'a phone visitor going to the guides')
    await go(page, '/discover')
    const foot = page.getByRole('contentinfo')
    const learn = foot.getByRole('link', { name: 'Learn', exact: true })
    await learn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const lb = await learn.boundingBox()
    await page.touchscreen.tap(lb.x + lb.width / 2, lb.y + lb.height / 2)
    await expect(page).toHaveURL((u) => u.pathname === '/learn')

    const items = page.getByRole('region', { name: 'Two guides for today' }).getByRole('listitem')
    await expect(items).toHaveCount(2)
    for (let i = 0; i < 2; i += 1) {
      const item = items.nth(i)
      const title = item.locator('.lidx-title')
      const href = await title.getAttribute('href')
      const article = LEARN_ARTICLES.find((a) => `/learn/${a.slug}` === href)
      const tool = item.getByRole('link', { name: `Open in ${article.toolLabel}` })
      await item.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      // MUTATION: drop the phone padding on `.lidx-title` / `.lidx-ty .srf-td-l` and both fall to about 24px.
      expect((await title.boundingBox()).height, 'title link').toBeGreaterThanOrEqual(44)
      expect((await tool.boundingBox()).height, 'tool link').toBeGreaterThanOrEqual(44)
      const tb = await tool.boundingBox()
      await page.touchscreen.tap(tb.x + 10, tb.y + tb.height / 2)
      await expect(page).toHaveURL((u) => u.pathname === article.toolTo)
      await page.goBack()
      await expect(page).toHaveURL((u) => u.pathname === '/learn')
      await item.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      const hb = await title.boundingBox()
      await page.touchscreen.tap(hb.x + 10, hb.y + hb.height / 2)
      await expect(page).toHaveURL((u) => u.pathname === href)
      await page.goBack()
    }
  })
})

test.describe('Learn on a phone', () => {
  test('4. search by touch: no answer, the 44px way back, a real answer, Clear', async ({ page }) => {
    watch(page, 'a phone visitor searching the guides')
    await go(page, '/learn')
    const total = LEARN_ARTICLES.length
    const search = page.getByLabel('Search the guides')
    await search.fill('zzzq')
    await expect(page.locator('.lidx-empty-h')).toHaveText('No guide mentions “zzzq”.')
    const reset = page.getByRole('button', { name: `Show all ${total} guides` })
    // MUTATION: remove `.srf .lidx-reset { height: 44px }` from the 767px block (36px) and this fails.
    expect((await reset.boundingBox()).height).toBeGreaterThanOrEqual(44)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    const rb = await reset.boundingBox()
    await page.touchscreen.tap(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await expect(search).toHaveValue('')
    await expect(page.locator('.lidx-card')).toHaveCount(total + 2)

    await search.fill('clamp()')
    await expect(page.getByRole('status')).toHaveText('1 guide matches “clamp()”.')
    const clear = page.getByRole('button', { name: /clear/i })
    const cb = await clear.boundingBox()
    expect(cb.width).toBeGreaterThanOrEqual(40)
    await page.touchscreen.tap(cb.x + cb.width / 2, cb.y + cb.height / 2)
    await expect(search).toHaveValue('')
    await search.fill('contrast')
    const hit = page.locator('.lidx-card').first().locator('.lidx-title')
    await expect(hit).toBeVisible()
    const href = await hit.getAttribute('href')
    const hb = await hit.boundingBox()
    await page.touchscreen.tap(hb.x + 10, hb.y + hb.height / 2)
    await expect(page).toHaveURL((u) => u.pathname === href)
  })

  test('5. Contents: the first guide of each topic starts open, the others shut; a 44px button toggles; a section link lands in the guide', async ({ page }) => {
    watch(page, 'a phone visitor reading a guide\'s contents')
    await go(page, '/learn')
    const cards = page.locator('.lidx-card').filter({ has: page.locator('.lidx-cx') })
    await expect(cards).toHaveCount(LEARN_ARTICLES.length)
    for (const topic of TOPICS) {
      const slugs = LEARN_ARTICLES.filter((a) => a.topic === topic).map((a) => a.slug)
      for (const [n, slug] of slugs.entries()) {
        const card = page.locator('.lidx-card').filter({ has: page.locator(`a.lidx-title[href="/learn/${slug}"]`) })
        const btn = card.locator('.lidx-cx')
        // MUTATION: make isOpen() return true for every guide, or none, and this fails.
        await expect(btn, `${slug} starts ${n === 0 ? 'open' : 'shut'}`).toHaveAttribute('aria-expanded', n === 0 ? 'true' : 'false')
        // aria-controls points at a list that is in the page, open or shut.
        const controls = await btn.getAttribute('aria-controls')
        await expect(page.locator(`[id="${controls}"]`)).toHaveCount(1)
        expect((await btn.boundingBox()).height).toBeGreaterThanOrEqual(44)
        await expect(card.locator('.lidx-ol')).toBeVisible({ visible: n === 0 })
      }
    }

    const article = LEARN_ARTICLES.find((a) => a.topic === 'Typography' && a.slug !== LEARN_ARTICLES.find((x) => x.topic === 'Typography').slug)
    const card = page.locator('.lidx-card').filter({ has: page.locator(`a.lidx-title[href="/learn/${article.slug}"]`) })
    const btn = card.locator('.lidx-cx')
    await btn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    let b = await btn.boundingBox()
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
    await expect(btn).toHaveAttribute('aria-expanded', 'true')
    const links = card.locator('.lidx-ol a')
    await expect(links).toHaveCount(article.sections.length)
    for (const h of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    b = await btn.boundingBox()
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
    await expect(card.locator('.lidx-ol')).toBeHidden()

    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
    const section = article.sections[1]
    const link = links.nth(1)
    await expect(link).toBeVisible()
    const lb = await link.boundingBox()
    await page.touchscreen.tap(lb.x + 30, lb.y + lb.height / 2)
    await expect(page).toHaveURL((u) => u.pathname === `/learn/${article.slug}` && u.hash === `#${section.id}`)
    await expect(page.locator(`[id="${section.id}"]`)).toBeVisible()
  })

  test('6. the topic bar is four 44px segments that jump; under 375 it is two rows of two', async ({ page }) => {
    watch(page, 'a phone visitor jumping between topics')
    await go(page, '/learn')
    const bar = page.getByRole('navigation', { name: 'Guide topics' })
    const links = bar.getByRole('link')
    // "Using UI L4B" and the counts are for wider screens.
    await expect(links.filter({ visible: true })).toHaveCount(TOPICS.length)
    for (const h of await links.evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44)
    const row = await links.evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().y)))
    expect(new Set(row).size, 'one row at 390').toBe(1)

    await page.setViewportSize({ width: 360, height: 800 })
    // MUTATION: delete the `max-width: 374px` rule for `.lidx-topics` and the four stay in one row at 360.
    await expect.poll(async () => new Set(await links.evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().y)))).size).toBe(2)
    expect(await overflow(page)).toBeLessThanOrEqual(0)

    await page.setViewportSize({ width: 390, height: 844 })
    const lb = await links.filter({ hasText: 'Psychology' }).boundingBox()
    await page.touchscreen.tap(lb.x + lb.width / 2, lb.y + lb.height / 2)
    await expect(page).toHaveURL((u) => u.hash === '#learn-topic-psychology')
    await expect(page.locator('#learn-topic-psychology-h')).toBeInViewport()
  })
})

test.describe('Both pages on a phone', () => {
  for (const w of [390, 320]) {
    test(`7. at ${w} nothing runs sideways: top, foot, results, empty state, contents open`, async ({ page }) => {
      watch(page, `a ${w}px phone visitor reading the whole task`)
      await page.setViewportSize({ width: w, height: 800 })
      await go(page, '/discover')
      expect(await overflow(page), 'discover top').toBeLessThanOrEqual(0)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      expect(await overflow(page), 'discover foot').toBeLessThanOrEqual(0)
      // The picks' names wrap rather than being cut off, even at 320.
      for (const n of await todayItems(page).locator('.srf-td-n').evaluateAll((els) => els.map((e) => ({ t: e.textContent, over: e.scrollWidth - e.clientWidth })))) {
        expect(n.over, `${n.t} is cut off`).toBeLessThanOrEqual(0)
      }
      if (w === 320) {
        const widths = await todayItems(page).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
        // MUTATION: give `.srf-td` a 3-column grid at 374px and these fall under 100.
        for (const x of widths) expect(x).toBeGreaterThanOrEqual(130)
      }

      await go(page, '/learn')
      expect(await overflow(page), 'learn top').toBeLessThanOrEqual(0)
      const search = page.getByLabel('Search the guides')
      await search.fill('clamp()')
      await expect(page.locator('.lidx-card')).toHaveCount(1)
      expect(await overflow(page), 'learn results').toBeLessThanOrEqual(0)
      await search.fill('a-very-long-word-that-cannot-wrap-anywhere-supercalifragilisticexpialidocious')
      await expect(page.locator('.lidx-empty')).toBeVisible()
      expect(await overflow(page), 'learn empty').toBeLessThanOrEqual(0)
      await search.fill('')
      const btn = page.locator('.lidx-cx').nth(1)
      await btn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await btn.click()
      await expect(btn).toHaveAttribute('aria-expanded', 'true')
      expect(await overflow(page), 'learn contents open').toBeLessThanOrEqual(0)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      expect(await overflow(page), 'learn foot').toBeLessThanOrEqual(0)
    })
  }

  test('8. every control on both pages is 44px or more and named; a stretched link counts as its whole door', async ({ page }) => {
    watch(page, 'a thumb')
    const audit = () => page.evaluate(() => {
      const bad = []
      for (const el of document.querySelectorAll('main a[href], main button')) {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden' || !el.offsetParent) continue
        const name = (el.getAttribute('aria-label') || el.innerText || '').trim()
        const stretched = getComputedStyle(el, '::after').position === 'absolute'
        const r = (stretched ? el.closest('.srf-door') || el : el).getBoundingClientRect()
        if (!name) bad.push(`no name: ${el.outerHTML.slice(0, 80)}`)
        if (r.height < 44 || r.width < 44) bad.push(`${name}: ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      return bad
    })
    await go(page, '/discover')
    expect(await audit()).toEqual([])
    await go(page, '/learn')
    // Open the shut Contents lists so their links are measured too.
    await page.evaluate(() => document.querySelectorAll('.lidx-cx[aria-expanded="false"]').forEach((b) => b.click()))
    // MUTATION: remove `.srf .lidx-ol li a { min-height: 44px }` from the 767px block and the contents links fail.
    expect(await audit()).toEqual([])
  })

  test('9. a held press shrinks the door to .97; dragging off and letting go opens nothing; reduced motion keeps it still', async ({ page }) => {
    watch(page, 'a phone visitor pressing and dragging away')
    await go(page, '/discover')
    const door = doorFor(page, 'Button Library')
    await door.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const b = await door.boundingBox()
    const x = b.x + b.width / 2
    const y = b.y + Math.min(60, b.height / 3)
    const transform = () => door.evaluate((el) => getComputedStyle(el).transform)
    await page.mouse.move(x, y)
    await page.mouse.down()
    // MUTATION: change `scale(.97)` to `scale(.9)` in the `.srf-door:has(.srf-door-t:active)` rule and this fails.
    await expect.poll(transform).toBe('matrix(0.97, 0, 0, 0.97, 0, 0)')
    await page.mouse.move(2, 2)
    await page.mouse.up()
    await expect.poll(transform).toBe('none')
    await expect(page).toHaveURL((u) => u.pathname === '/discover')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(250)
    expect(await transform()).toBe('none')
    await page.mouse.move(2, 2)
    await page.mouse.up()
  })
})
