// V3 part 2: the Discover and Learn index pages, walked the way a person walks
// them on a desktop (direction A, "Doors, with what is ready today").
//
// Each test is one journey with a goal (open today's pick, find a guide, get
// back out) rather than one element. Every journey names, in a MUTATION line,
// the change to the product that makes it fail, and was run against that change.
// Phone twin: 376-v3-index-journeys-phone.spec.js.
//
// Expected values are written by hand where they are the design (what the
// five doors are called and where they go, the route each tool link takes).
// Where the page draws from data that changes (which four picks today, the
// guide registry), the test reads the same facts off the page and checks the
// page agrees with itself: the link carries the colours the plate shows.
import { test, expect } from './base.js'
import { go, goRaw, watch } from './helpers.js'
import { LEARN_ARTICLES, TOPICS } from '../../src/data/learnIndex.js'

const DOORS = [
  { title: 'Palette Library', path: '/discover/palettes' },
  { title: 'Gradient Library', path: '/discover/gradients' },
  { title: 'Button Library', path: '/discover/buttons' },
  { title: 'Font Gallery', path: '/create/font-gallery' },
  { title: 'Icon Library', path: '/create/icons' },
]
const TOOLS = { 'Gradient Generator': '/create/gradient', 'Palette Builder': '/create/palette' }

test.use({ viewport: { width: 1440, height: 900 } })

/** Six-digit lowercase hexes in order, from a style attribute that may hold hex or rgb(). */
const coloursOf = (css) => {
  const out = []
  for (const m of css.matchAll(/#([0-9a-f]{6})\b|rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/gi)) {
    out.push(m[1] ? m[1].toLowerCase() : [m[2], m[3], m[4]].map((n) => Number(n).toString(16).padStart(2, '0')).join(''))
  }
  return out
}
const collapse = (list) => list.filter((c, i) => i === 0 || c !== list[i - 1])

/** The colours the tool link carries: palette `c=a,b,c`, gradient `gs=a-0_b-100`. */
const coloursInHref = (href) => {
  const u = new URL(href, 'http://x')
  const c = u.searchParams.get('c')
  if (c) return c.split(',').map((h) => h.toLowerCase())
  const gs = u.searchParams.get('gs')
  return gs ? gs.split('_').map((s) => s.split('-')[0].toLowerCase()) : []
}

const centre = async (locator) => {
  const b = await locator.boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** A real click in the middle of an element the stretched link covers (Playwright's own click refuses: the link, not the plate, takes the hit). */
const clickMiddle = async (page, locator) => {
  await locator.scrollIntoViewIfNeeded()
  const { x, y } = await centre(locator)
  await page.mouse.click(x, y)
}

const todayItems = (page) => page.getByRole('region', { name: 'Ready to open today' }).getByRole('listitem')
const doorFor = (page, title) => page.locator('.srf-door').filter({ has: page.getByRole('link', { name: title, exact: true }) })

test.describe('Discover: what is ready today', () => {
  test('1. a pick opens its tool with the colours on its plate, and Back returns to the same four', async ({ page }) => {
    watch(page, 'a designer taking one of today\'s four picks')
    await go(page, '/discover')
    await expect(page.getByRole('heading', { level: 1, name: 'Discover' })).toBeVisible()
    const items = todayItems(page)
    // MUTATION: render three picks (slice the startersForDay list to 3) and this fails.
    await expect(items).toHaveCount(4)

    const picks = []
    for (let i = 0; i < 4; i += 1) {
      const item = items.nth(i)
      const link = item.getByRole('link')
      const name = (await item.locator('.srf-td-n').innerText()).trim()
      const href = await link.getAttribute('href')
      const opens = (await link.innerText()).replace(/^Open in /, '').trim()
      picks.push({ name, href, opens, plate: coloursOf(await item.locator('.srf-plate').getAttribute('style')) })
      await expect(link).toHaveAccessibleName(`Open in ${opens}: ${name}`)
      expect(Object.keys(TOOLS), `${name}: the tool it names`).toContain(opens)
    }
    // Two gradients and two palettes, as the section says.
    expect(picks.filter((p) => p.opens === 'Gradient Generator')).toHaveLength(2)
    expect(picks.filter((p) => p.opens === 'Palette Builder')).toHaveLength(2)

    // The section says nothing about popularity or novelty it cannot know.
    // MUTATION: change the lede to "Trending today: ..." and this fails.
    const sectionText = await page.getByRole('region', { name: 'Ready to open today' }).innerText()
    expect(sectionText).not.toMatch(/trending|popular|most used|\bnew\b|\bhot\b/i)

    for (let i = 0; i < 4; i += 1) {
      const p = picks[i]
      // The link carries exactly the colours the plate shows (hand-off, not a second list).
      // MUTATION: build one pick's href from the next pick's colours and this fails.
      expect(collapse(coloursInHref(p.href)), `${p.name}: the colours in the link`).toEqual(collapse(p.plate))
      expect(new URL(p.href, 'http://x').pathname).toBe(TOOLS[p.opens])

      await clickMiddle(page, items.nth(i).locator('.srf-plate'))
      await expect(page).toHaveURL((u) => u.pathname === TOOLS[p.opens] && `${u.pathname}${u.search}` === p.href)
      await expect(page.locator('main, #main').first()).toBeVisible()
      await page.goBack()
      await expect(page).toHaveURL((u) => u.pathname === '/discover')
      await expect(todayItems(page)).toHaveCount(4)
      await expect(todayItems(page).nth(i).locator('.srf-td-n')).toHaveText(p.name)
    }
  })

  test('2. each of the five doors opens by its plate, and Community is one line under them', async ({ page }) => {
    watch(page, 'a designer picking a library')
    await go(page, '/discover')
    await expect(page.locator('.srf-door:not(.srf-door--today)')).toHaveCount(5)
    // The doors read left to right, top to bottom, in the order of the design.
    const titles = await page.locator('.srf-door:not(.srf-door--today) .surface-card-title').allInnerTexts()
    // MUTATION: swap the Font and Icon doors in SurfaceIndex.jsx and this fails.
    expect(titles).toEqual(DOORS.map((d) => d.title))

    for (const d of DOORS) {
      const door = doorFor(page, d.title)
      await expect(door.getByRole('link', { name: d.title, exact: true })).toHaveAttribute('href', d.path)
      await clickMiddle(page, door.locator('.srf-plate'))
      // MUTATION: drop `.srf-door-t::after` from surface.css (the plate stops being part of the link) and the click opens nothing.
      await expect(page).toHaveURL((u) => u.pathname === d.path)
      await page.goBack()
      await expect(page).toHaveURL((u) => u.pathname === '/discover')
      await expect(page.locator('.srf-door:not(.srf-door--today)')).toHaveCount(5)
    }

    // Community is a sentence, not a sixth door.
    const also = page.locator('.srf-also').first()
    await expect(also).toContainText('Also in Discover: Community.')
    await also.getByRole('link', { name: 'Community' }).click()
    await expect(page).toHaveURL((u) => u.pathname === '/community')
    await page.goBack()
    await expect(page).toHaveURL((u) => u.pathname === '/discover')
    // A visitor does not see the admin-only Collections line.
    await expect(page.getByText('Collections', { exact: true })).toHaveCount(0)
  })

  test('3. Discover to Learn by the footer: both of today\'s guides open, and so does the tool beside each', async ({ page }) => {
    watch(page, 'a designer moving from the libraries to the guides')
    await go(page, '/discover')
    // The footer is on this page now (it was off).
    // MUTATION: remove '/discover' from FOOTER_ROUTES and there is no footer to use.
    const foot = page.getByRole('contentinfo')
    await expect(foot).toBeVisible()
    await foot.getByRole('link', { name: 'Learn', exact: true }).click()
    await expect(page).toHaveURL((u) => u.pathname === '/learn')
    await expect(page.getByRole('heading', { level: 1, name: 'Learn' })).toBeVisible()

    const today = page.getByRole('region', { name: 'Two guides for today' })
    const items = today.getByRole('listitem')
    // MUTATION: ask pickForDay for 3 and this fails.
    await expect(items).toHaveCount(2)

    for (let i = 0; i < 2; i += 1) {
      const item = items.nth(i)
      const title = item.locator('.lidx-title')
      const href = await title.getAttribute('href')
      const article = LEARN_ARTICLES.find((a) => `/learn/${a.slug}` === href)
      expect(article, `${href} is a published guide`).toBeTruthy()
      await expect(title).toHaveText(article.title)
      const tool = item.getByRole('link', { name: `Open in ${article.toolLabel}` })
      // MUTATION: point LearnToday's tool link at a.slug instead of a.toolTo and this fails.
      await expect(tool).toHaveAttribute('href', article.toolTo)

      await tool.click()
      await expect(page).toHaveURL((u) => u.pathname === article.toolTo)
      await page.goBack()
      await expect(page).toHaveURL((u) => u.pathname === '/learn')
      await title.click()
      await expect(page).toHaveURL((u) => u.pathname === href)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(article.title.split(' ')[0])
      await page.goBack()
      await expect(page).toHaveURL((u) => u.pathname === '/learn')
    }
  })

  test('4. the guides sit in three columns, each with numbered links that land on the section', async ({ page }) => {
    watch(page, 'a designer scanning the guides')
    await go(page, '/learn')
    const section = page.locator('#learn-topic-typography')
    const cards = section.locator('.lidx-card')
    const typographyCount = LEARN_ARTICLES.filter((a) => a.topic === 'Typography').length
    await expect(cards).toHaveCount(typographyCount)
    expect(typographyCount, 'the registry gives Typography three guides, so three columns can show').toBe(3)
    const boxes = await cards.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) } }))
    // MUTATION: set `.lidx-grid` to two columns at this width and the third card drops a row.
    expect(new Set(boxes.map((b) => b.y)).size, 'one row').toBe(1)
    expect(new Set(boxes.map((b) => b.x)).size, 'three distinct columns').toBe(3)
    expect(Math.max(...boxes.map((b) => b.w)) - Math.min(...boxes.map((b) => b.w))).toBeLessThanOrEqual(2)

    // The contents list is open on a desktop with no button to open it.
    const first = cards.first()
    await expect(first.locator('.lidx-cx')).toBeHidden()
    const article = LEARN_ARTICLES.find((a) => a.topic === 'Typography')
    const links = first.locator('.lidx-ol a')
    await expect(links).toHaveCount(article.sections.length)
    // Numbers run 1..n beside the links, in the guide's own order.
    // MUTATION: render `n` instead of `n + 1` in Contents and this fails.
    expect(await first.locator('.lidx-sn').allInnerTexts()).toEqual(article.sections.map((_, n) => String(n + 1)))
    expect(await links.allInnerTexts()).toEqual(article.sections.map((s) => s.title))

    const pick = article.sections[2]
    await links.nth(2).click()
    await expect(page).toHaveURL((u) => u.pathname === `/learn/${article.slug}` && u.hash === `#${pick.id}`)
    const target = page.locator(`[id="${pick.id}"]`)
    await expect(target).toBeVisible()
    // The section is on screen, under the header, not left at the top of the page.
    await expect.poll(async () => (await target.boundingBox()).y).toBeGreaterThan(40)
    await expect.poll(async () => (await target.boundingBox()).y).toBeLessThan(500)
  })

  test('5. a search with no answer says so and offers the way back; a real one opens the guide', async ({ page }) => {
    watch(page, 'a designer searching the guides')
    await go(page, '/learn')
    const total = LEARN_ARTICLES.length
    const search = page.getByRole('searchbox', { name: 'Search the guides' }).or(page.getByLabel('Search the guides'))
    await search.first().fill('zzzq')
    const empty = page.locator('.lidx-empty')
    await expect(empty.locator('.lidx-empty-h')).toHaveText('No guide mentions “zzzq”.')
    await expect(page.getByRole('status')).toHaveText('No guide mentions “zzzq”.')
    // The topic bar and today's guides step aside while a search runs.
    await expect(page.getByRole('navigation', { name: 'Guide topics' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Two guides for today' })).toHaveCount(0)

    // MUTATION: change the reset label to "Reset" and this fails.
    await empty.getByRole('button', { name: `Show all ${total} guides` }).click()
    await expect(search.first()).toHaveValue('')
    await expect(search.first()).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Guide topics' })).toBeVisible()
    await expect(page.locator('.lidx-card')).toHaveCount(total + 2)

    await search.first().fill('clamp()')
    await expect(page.getByRole('status')).toHaveText('1 guide matches “clamp()”.')
    await expect(page.locator('.lidx-topic-h')).toHaveText(/Typography\s+1 of 3/)
    // A heading match has no hit line (searchGuides sets a snippet only for a body-only match), so the result is the guide's own title.
    const hit = page.locator('.lidx-card .lidx-title')
    await expect(hit).toHaveCount(1)
    await hit.click()
    await expect(page).toHaveURL((u) => u.pathname === '/learn/type-scales')
  })

  test('6. Discover by keyboard: one stop per pick, one per door, then Community; the ring wraps the whole item; Enter opens', async ({ page }) => {
    watch(page, 'a keyboard user on Discover')
    await go(page, '/discover')
    const todayLinks = page.getByRole('region', { name: 'Ready to open today' }).getByRole('link')
    const hrefs = await todayLinks.evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(hrefs).toHaveLength(4)
    const doorHrefs = DOORS.map((d) => d.path)
    const expected = [...hrefs, ...doorHrefs, '/community']

    const hrefOfFocus = () => page.evaluate(() => document.activeElement?.getAttribute?.('href') ?? null)
    for (let i = 0; i < 60 && (await hrefOfFocus()) !== hrefs[0]; i += 1) await page.keyboard.press('Tab')
    expect(await hrefOfFocus(), 'Tab reaches the first pick').toBe(hrefs[0])
    const seen = [hrefs[0]]
    for (let i = 1; i < expected.length; i += 1) {
      await page.keyboard.press('Tab')
      seen.push(await hrefOfFocus())
    }
    // MUTATION: give the plate its own link as well as the title and the stop count doubles.
    expect(seen).toEqual(expected)

    // On the first door: the ring is 2px and drawn round the whole door, not just its title.
    await page.keyboard.press('Shift+Tab')
    expect(await hrefOfFocus(), 'Shift+Tab steps back one').toBe(doorHrefs[doorHrefs.length - 1])
    for (let i = 0; i < doorHrefs.length - 1; i += 1) await page.keyboard.press('Shift+Tab')
    expect(await hrefOfFocus()).toBe(doorHrefs[0])
    const ring = await page.evaluate(() => {
      const door = document.activeElement.closest('.srf-door')
      const cs = getComputedStyle(door)
      const r = door.getBoundingClientRect()
      return { w: cs.outlineWidth, s: cs.outlineStyle, doorW: Math.round(r.width) }
    })
    // MUTATION: delete the `.srf-door:has(.srf-door-t:focus-visible)` outline rule and this fails.
    expect(ring.w).toBe('2px')
    expect(ring.s).toBe('solid')
    expect(ring.doorW).toBeGreaterThan(500)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL((u) => u.pathname === doorHrefs[0])
  })

  test('7. Learn by keyboard: search, Tab to the result, Enter opens it; a topic link jumps', async ({ page }) => {
    watch(page, 'a keyboard user on Learn')
    await go(page, '/learn')
    const search = page.getByLabel('Search the guides')
    await search.focus()
    await page.keyboard.type('clamp()')
    await expect(page.locator('.lidx-card')).toHaveCount(1)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /clear/i })).toBeFocused()
    await page.keyboard.press('Tab')
    // The next stop is the guide's title, with a 2px ring.
    const title = page.locator('.lidx-title', { hasText: 'Modular type scales' })
    await expect(title).toBeFocused()
    // MUTATION: set `.srf :focus-visible` outline to none and this fails.
    expect(await title.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('2px')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL((u) => u.pathname === '/learn/type-scales')

    await go(page, '/learn')
    const topics = page.getByRole('navigation', { name: 'Guide topics' })
    await topics.getByRole('link', { name: /^Accessibility/ }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL((u) => u.hash === '#learn-topic-accessibility')
    await expect(page.locator('#learn-topic-accessibility-h')).toBeInViewport()
  })

  test('8. pressing a door shrinks it to .97 in 120ms; letting go somewhere else opens nothing; reduced motion does not move it', async ({ page }) => {
    watch(page, 'a person pressing and thinking better of it')
    await go(page, '/discover')
    const door = doorFor(page, 'Palette Library')
    const plate = door.locator('.srf-plate')
    await plate.scrollIntoViewIfNeeded()
    const { x, y } = await centre(plate)
    const transform = () => door.evaluate((el) => getComputedStyle(el).transform)

    expect(await door.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('transform')
    expect(await door.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.12s')
    await page.mouse.move(x, y)
    await page.mouse.down()
    // MUTATION: change the `scale(.97)` on `.srf-door:has(.srf-door-t:active)` to `scale(.9)` and this fails.
    await expect.poll(transform).toBe('matrix(0.97, 0, 0, 0.97, 0, 0)')
    await page.mouse.move(5, 5)
    await page.mouse.up()
    await expect.poll(transform).toBe('none')
    await expect(page).toHaveURL((u) => u.pathname === '/discover')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(250)
    expect(await transform(), 'reduced motion: no scale').toBe('none')
    await page.mouse.move(5, 5)
    await page.mouse.up()
  })

  for (const w of [1200, 768]) {
    test(`9. at ${w} the four picks and five doors still open (${w === 1200 ? '4 across' : '2 by 2'})`, async ({ page }) => {
      watch(page, `a designer on a ${w}px screen`)
      await page.setViewportSize({ width: w, height: 900 })
      await go(page, '/discover')
      const items = todayItems(page)
      await expect(items).toHaveCount(4)
      const boxes = await items.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) } }))
      // MUTATION: change the 1199px breakpoint's `.srf-td` to four columns and the 768 run fails; to two and the 1200 run fails.
      if (w === 1200) {
        expect(new Set(boxes.map((b) => b.y)).size).toBe(1)
      } else {
        expect(new Set(boxes.map((b) => b.y)).size).toBe(2)
        expect(new Set(boxes.map((b) => b.x)).size).toBe(2)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)

      const link = items.nth(3).getByRole('link')
      const href = await link.getAttribute('href')
      await clickMiddle(page, items.nth(3).locator('.srf-plate'))
      await expect(page).toHaveURL((u) => `${u.pathname}${u.search}` === href)
      await page.goBack()
      const door = doorFor(page, 'Icon Library')
      await clickMiddle(page, door.locator('.srf-plate'))
      await expect(page).toHaveURL((u) => u.pathname === '/create/icons')
    })
  }

  test('10. topic bar on Learn jumps to a topic with its heading clear of the header, then a guide there opens', async ({ page }) => {
    watch(page, 'a designer jumping to Psychology')
    await go(page, '/learn')
    const topics = page.getByRole('navigation', { name: 'Guide topics' })
    // Four topics and Using UI L4B, each with its count; a jump link, not a tab.
    await expect(topics.getByRole('link')).toHaveCount(TOPICS.length + 1)
    for (const t of TOPICS) {
      const n = LEARN_ARTICLES.filter((a) => a.topic === t).length
      await expect(topics.getByRole('link', { name: new RegExp(`^${t}\\s+${n}$`) })).toBeVisible()
    }
    await topics.getByRole('link', { name: /^Psychology/ }).click()
    await expect(page).toHaveURL((u) => u.hash === '#learn-topic-psychology')
    const heading = page.locator('#learn-topic-psychology-h')
    const nav = page.locator('.pnav, header').first()
    await expect(heading).toBeInViewport()
    // MUTATION: remove `scroll-margin-top` from `.lidx-topic-sec` and the heading ends under the header.
    await expect.poll(async () => (await heading.boundingBox()).y).toBeGreaterThan((await nav.boundingBox()).y + (await nav.boundingBox()).height)
    const article = LEARN_ARTICLES.find((a) => a.topic === 'Psychology')
    await page.locator('#learn-topic-psychology .lidx-title').click()
    await expect(page).toHaveURL((u) => u.pathname === `/learn/${article.slug}`)
  })

  test('11. every control on both pages is a 24px target with a name, a stretched link counted by its door', async ({ page }) => {
    watch(page, 'a pointer user with a tremor')
    const audit = () => page.evaluate(() => {
      const bad = []
      for (const el of document.querySelectorAll('main a[href], main button')) {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        const name = (el.getAttribute('aria-label') || el.innerText || '').trim()
        // A link the stretched ::after covers across its door is judged by the door.
        const stretched = getComputedStyle(el, '::after').position === 'absolute'
        const host = stretched ? el.closest('.srf-door') || el : el
        const r = host.getBoundingClientRect()
        // An inline link inside a sentence is exempt (WCAG 2.5.8); the Community line is one.
        const inline = !!el.closest('.srf-also')
        if (!name) bad.push(`no name: ${el.outerHTML.slice(0, 80)}`)
        if (!inline && (r.width < 24 || r.height < 24)) bad.push(`${name}: ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      return bad
    })
    await go(page, '/discover')
    expect(await audit()).toEqual([])
    await go(page, '/learn')
    // MUTATION: set `.lidx-ol a` padding to 0 and `.srf .lidx-ol li` line-height to 1 and the contents links fall under 24px.
    expect(await audit()).toEqual([])
  })

  test('12. the footer is on the two indexes and still off the libraries beside them', async ({ page }) => {
    watch(page, 'a visitor looking for the footer')
    await go(page, '/discover')
    await expect(page.getByRole('contentinfo')).toBeVisible()
    await go(page, '/learn')
    await expect(page.getByRole('contentinfo')).toBeVisible()
    // The footer stays off app pages (src/components/nav/footerRoutes.js).
    await go(page, '/discover/palettes')
    await expect(page.getByRole('contentinfo')).toHaveCount(0)
  })

  test('13. the four picks change from one day to the next and hold within a day', async ({ page }) => {
    watch(page, 'a designer coming back tomorrow')
    const picksOn = async (iso) => {
      await page.clock.setFixedTime(new Date(iso))
      await goRaw(page, '/discover')
      await expect(todayItems(page)).toHaveCount(4)
      return todayItems(page).getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    }
    const monday = await picksOn('2026-11-09T10:00:00')
    const mondayAgain = await picksOn('2026-11-09T22:30:00')
    const tuesday = await picksOn('2026-11-10T10:00:00')
    expect(mondayAgain, 'the same day, the same four').toEqual(monday)
    // MUTATION: make startersForDay ignore its date (use a constant day number) and this fails.
    expect(tuesday, 'the next day, not the same four').not.toEqual(monday)
  })
})
