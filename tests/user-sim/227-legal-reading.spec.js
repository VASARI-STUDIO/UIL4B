// Reading the legal pages (/terms, /privacy) and the shared contents marker.
//
// What a reader needs, checked at 390 (touch), 768 and 1440 in both themes:
//   - at 1000px and narrower the contents is a plain vertical list (opened from
//     its "On this page" disclosure), at 1001px and wider a sticky rail;
//   - choosing a contents link lands the clause heading below the fixed nav and
//     leaves focus on that heading;
//   - the rail marks the clause at the reading line, and still does after
//     End and Home (the case an observer-based marker lost);
//   - nothing scrolls sideways at 320 and 390;
//   - printing hides the contents, nav and footer and spells out external links;
//   - contents, date and table-label text meets 4.5:1 in light and dark;
//   - the Learn guide rail shares the same marker hook.
import { test, expect } from './base.js'
import { go, watch, restAfterMove, restingScrollY } from './helpers.js'

const ROUTES = ['/terms', '/privacy']

// How far below the nav's bottom edge a landed heading may sit: the clause's
// scroll margin and top padding (measured about 65px), with room to spare. The jump
// tests run with reduced motion: a smooth jump from the top of a page stalled
// part-way (scrollY 541) in headless Chromium on /terms and a Learn guide alike, so
// the landing position is read from the instant jump.
// A heading further down than this was not scrolled to the top.
const LAND_SLACK = 110

const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 768, height: 1024 } },
  desktop: { viewport: { width: 1440, height: 900 } },
}

/** A page in its own context, with the theme seeded before first paint. */
async function open(browser, route, { view = 'desktop', theme = 'light', viewport, reducedMotion } = {}) {
  const ctx = await browser.newContext({
    ...VIEWS[view],
    ...(viewport ? { viewport } : {}),
    colorScheme: theme,
    ...(reducedMotion ? { reducedMotion } : {}),
  })
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
  }, theme)
  const page = await ctx.newPage()
  watch(page, 'a reader opening a legal page')
  await go(page, route)
  await expect(page.locator('.lgl .lgl-sec').first()).toBeVisible()
  return { ctx, page }
}

/** The clause ids on the page, in order. */
const clauseIds = (page) => page.evaluate(() => [...document.querySelectorAll('.lgl .lgl-sec')].map((s) => s.id))

/** Scroll until a section sits on its reading line, then wait for rest. */
async function scrollToLine(page, id) {
  const from = await page.evaluate(() => scrollY)
  await page.evaluate((id) => {
    const el = document.getElementById(id)
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - margin, behavior: 'instant' })
  }, id)
  await restAfterMove(page, from, `section ${id}`)
}

/** A clause near the middle that has enough page below it to reach the reading line (the last few cannot). */
const reachableClause = (page) => page.evaluate(() => {
  const secs = [...document.querySelectorAll('.lgl .lgl-sec')]
  const room = (el) => {
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    const want = scrollY + el.getBoundingClientRect().top - margin
    return document.documentElement.scrollHeight - innerHeight - want
  }
  const ok = secs.filter((el, i) => i >= 1 && room(el) >= 4)
  return ok[Math.min(2, ok.length - 1)].id
})

/** Where a clause heading is against the bottom of the fixed nav. */
const headingVsNav = (page, id) => page.evaluate((id) => {
  const h = document.getElementById(id).querySelector('h2')
  return { top: h.getBoundingClientRect().top, navBottom: document.querySelector('.pnav').getBoundingClientRect().bottom }
}, id)

/** Wait for a contents jump to arrive (the page smooth-scrolls there), then for the scroll to rest. */
async function landed(page, id) {
  await expect.poll(async () => {
    const { top, navBottom } = await headingVsNav(page, id)
    return top < navBottom + LAND_SLACK
  }, { message: `the jump to ${id} never brought its heading to the top`, timeout: 8000 }).toBe(true)
  await restingScrollY(page, `the page after a jump to ${id}`)
}

/** Every clause the rail marks as current. */
const marked = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.lgl .lgl-toc [aria-current="location"]')].map((a) => a.getAttribute('href').slice(1)))

const atBottom = (page) => page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2)

for (const route of ROUTES) {
  test.describe(`${route} contents`, () => {
    for (const view of ['phone', 'tablet']) {
      test(`at ${view} width the contents opens as a vertical list named "On this page"`, async ({ browser }) => {
        const { ctx, page } = await open(browser, route, { view })
        const nav = page.getByRole('navigation', { name: 'On this page' })
        const ids = await clauseIds(page)
        // Closed: the disclosure label is what a reader sees, the links are not.
        await expect(page.locator('.lgl-toc-m-sum')).toHaveText('On this page')
        await expect(nav.getByRole('link').first()).toBeHidden()
        await page.locator('.lgl-toc-m-sum').click()
        const links = nav.getByRole('link')
        await expect(links).toHaveCount(ids.length)
        const boxes = await links.evaluateAll((as) => as.map((a) => a.getBoundingClientRect().toJSON()))
        const vw = await page.evaluate(() => innerWidth)
        for (let i = 0; i < boxes.length; i++) {
          expect(boxes[i].right, `link ${i} stays inside the viewport`).toBeLessThanOrEqual(vw)
          expect(boxes[i].height, `link ${i} is a 44px touch row`).toBeGreaterThanOrEqual(43.5)
          if (i) expect(boxes[i].top, `link ${i} sits below link ${i - 1}`).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1)
        }
        expect(await nav.locator('ol').evaluate((ol) => getComputedStyle(ol).overflowX)).not.toBe('auto')
        await ctx.close()
      })
    }

    test('at 1440 the contents is a sticky rail and the disclosure is absent', async ({ browser }) => {
      const { ctx, page } = await open(browser, route)
      await expect(page.locator('.lgl-toc-m')).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link').first()).toBeVisible()
      await ctx.close()
    })

    for (const view of ['phone', 'tablet']) {
      test(`at ${view} width a contents link lands the heading under the nav and focuses it`, async ({ browser }) => {
        const { ctx, page } = await open(browser, route, { view, reducedMotion: 'reduce' })
        const target = await reachableClause(page)
        await page.locator('.lgl-toc-m-sum').click()
        await page.locator(`.lgl-toc-m a[href="#${target}"]`).click()
        await landed(page, target)
        await expect(page.locator('.lgl-toc-m')).not.toHaveAttribute('open', '')
        await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H2')
        expect(await page.evaluate(() => document.activeElement.closest('.lgl-sec').id)).toBe(target)
        const { top, navBottom } = await headingVsNav(page, target)
        expect(top, 'the heading is below the fixed nav, not behind it').toBeGreaterThanOrEqual(navBottom)
        expect(top, 'and near the top of the window').toBeLessThan(navBottom + LAND_SLACK)
        await ctx.close()
      })
    }

    test('at 1440 a rail link lands the heading under the nav and the rail marks that clause', async ({ browser }) => {
      const { ctx, page } = await open(browser, route, { reducedMotion: 'reduce' })
      const target = await reachableClause(page)
      await page.locator(`.lgl-toc a[href="#${target}"]`).click()
      await landed(page, target)
      const { top, navBottom } = await headingVsNav(page, target)
      expect(top).toBeGreaterThanOrEqual(navBottom)
      expect(top).toBeLessThan(navBottom + LAND_SLACK)
      await expect.poll(() => marked(page)).toEqual([target])
      await ctx.close()
    })

    test('at 1440 the marker follows the clause at the line, and End and Home keep it', async ({ browser }) => {
      const { ctx, page } = await open(browser, route)
      const ids = await clauseIds(page)
      expect(await marked(page), 'the first clause is marked at the top').toEqual([ids[0]])
      for (const id of [ids[2], ids[Math.floor(ids.length / 2)], ids[ids.length - 2]]) {
        await scrollToLine(page, id)
        await expect.poll(() => marked(page), `scrolled to ${id}`).toEqual([id])
      }
      await page.evaluate(() => document.activeElement?.blur())
      await page.keyboard.press('End')
      await expect.poll(() => atBottom(page)).toBe(true)
      await expect.poll(() => marked(page), 'End marks the last clause').toEqual([ids[ids.length - 1]])
      await page.keyboard.press('Home')
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
      await expect.poll(() => marked(page), 'Home marks the first clause').toEqual([ids[0]])
      await ctx.close()
    })

    test('at phone width no rail marker is set', async ({ browser }) => {
      const { ctx, page } = await open(browser, route, { view: 'phone' })
      const ids = await clauseIds(page)
      await scrollToLine(page, ids[2])
      await expect(page.locator('.lgl [aria-current="location"]')).toHaveCount(0)
      await ctx.close()
    })

    for (const width of [320, 390]) {
      test(`nothing scrolls sideways at ${width} wide, contents closed and open`, async ({ browser }) => {
        const { ctx, page } = await open(browser, route, { view: 'phone', viewport: { width, height: 800 } })
        const over = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
        expect(await over()).toBeLessThanOrEqual(0)
        await page.locator('.lgl-toc-m-sum').click()
        expect(await over()).toBeLessThanOrEqual(0)
        await ctx.close()
      })
    }

    for (const theme of ['light', 'dark']) {
      test(`in ${theme} theme print hides the contents, nav and footer and prints external addresses`, async ({ browser }) => {
        const { ctx, page } = await open(browser, route, { theme })
        await page.emulateMedia({ media: 'print' })
        const displays = (sel) => page.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).display))
        expect(await displays('.lgl-toc-col')).toEqual(['none'])
        expect(await displays('.pnav')).toEqual(['none'])
        const footers = await displays('.app-footer, .sp-footer, footer')
        expect(footers.length, 'a footer exists to be hidden').toBeGreaterThan(0)
        expect(footers.every((d) => d === 'none')).toBe(true)
        const ink = await page.locator('.lgl-p').first().evaluate((el) => getComputedStyle(el).color)
        const [r, g, b] = ink.match(/[\d.]+/g).map(Number)
        expect(Math.max(r, g, b), `body text prints dark (${ink}) in ${theme} theme`).toBeLessThan(110)
        const ext = page.locator('.lgl a.lgl-a[href^="http"]').first()
        if (route === '/privacy') {
          const href = await ext.getAttribute('href')
          const after = await ext.evaluate((a) => getComputedStyle(a, '::after').content)
          expect(after).toContain(href)
        } else {
          // Terms links only to a mailto address, which must not get the suffix.
          await expect(ext).toHaveCount(0)
        }
        await ctx.close()
      })
    }
  })
}

// Contrast is read from the page's own computed colours; the ground is found by walking up.
const measure = (page, selector, pseudo) => page.evaluate(({ selector, pseudo }) => {
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const parse = (c) => {
    const n = (c.match(/[\d.]+/g) || []).map(Number)
    if (n.length < 3) return []
    return /^color\(srgb/.test(c) ? [n[0] * 255, n[1] * 255, n[2] * 255, n[3]] : n.slice(0, 4)
  }
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return c.slice(0, 3)
    }
    return [255, 255, 255]
  }
  const out = []
  for (const el of document.querySelectorAll(selector)) {
    if (!el.getClientRects().length) continue
    const raw = parse(getComputedStyle(el, pseudo || null).color)
    const bg = bgOf(el)
    const a = raw[3] === undefined ? 1 : raw[3]
    const fg = [0, 1, 2].map((i) => raw[i] * a + bg[i] * (1 - a))
    const L1 = lum(fg)
    const L2 = lum(bg)
    out.push({ text: (el.textContent || '').trim().slice(0, 20), ratio: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) })
  }
  return out
}, { selector, pseudo })

async function expectReadable(page, selectors, pseudo) {
  for (const sel of selectors) {
    const rows = await measure(page, sel, pseudo)
    expect(rows.length, `${sel} was measured`).toBeGreaterThan(0)
    for (const r of rows) expect(r.ratio, `${sel} "${r.text}"`).toBeGreaterThanOrEqual(4.5)
  }
}

for (const theme of ['light', 'dark']) {
  test.describe(`${theme} theme contrast on the legal pages`, () => {
    test('rail rows, date and table labels read at 4.5:1 at 1440', async ({ browser }) => {
      const { ctx, page } = await open(browser, '/privacy', { theme })
      await expectReadable(page, ['.lgl-toc .cpg-rail-label', '.lgl-toc .is-on .cpg-rail-label', '.lgl-updated', '.storage-table th', '.storage-table .storage-pii'])
      await ctx.close()
    })

    test('contents disclosure, rows and the stacked-table labels read at 4.5:1 at 390', async ({ browser }) => {
      const { ctx, page } = await open(browser, '/privacy', { view: 'phone', theme })
      await page.locator('.lgl-toc-m-sum').click()
      await expectReadable(page, ['.lgl-toc-m-sum', '.lgl-toc-m-row', '.lgl-updated'])
      await expectReadable(page, ['.storage-table td[data-label]'], '::before')
      await ctx.close()
    })
  })
}

test('the date and table labels are set in the sans, not mono capitals', async ({ browser }) => {
  const { ctx, page } = await open(browser, '/privacy')
  for (const sel of ['.lgl-updated', '.storage-table th', '.storage-table .storage-pii']) {
    const s = await page.locator(sel).first().evaluate((el) => {
      const cs = getComputedStyle(el)
      return { family: cs.fontFamily, transform: cs.textTransform }
    })
    expect(s.family, sel).not.toMatch(/mono/i)
    expect(s.transform, sel).toBe('none')
  }
  await ctx.close()
})

// The marker hook is shared with the Learn guides, so its two cases are checked there too.
test('Learn guide rail: the marker follows scroll at 1440, and End then Home keep one', async ({ browser }) => {
  const active = (page) => page.evaluate(() =>
    [...document.querySelectorAll('.lart-toc a[data-active="true"]')].map((a) => a.getAttribute('href').slice(1)))
  const ctx = await browser.newContext({ ...VIEWS.desktop })
  const page = await ctx.newPage()
  watch(page, 'a reader of a Learn guide')
  await go(page, '/learn/brand-colour')
  const ids = await page.evaluate(() => [...document.querySelectorAll('.lart-toc a')].map((a) => a.getAttribute('href').slice(1)))
  expect(ids.length).toBeGreaterThan(3)
  expect(await active(page)).toEqual([ids[0]])
  await scrollToLine(page, ids[2])
  await expect.poll(() => active(page)).toEqual([ids[2]])
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('End')
  await expect.poll(() => atBottom(page)).toBe(true)
  await expect.poll(async () => (await active(page)).length, 'a marker survives End').toBe(1)
  await page.keyboard.press('Home')
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await expect.poll(() => active(page), 'Home marks the first section').toEqual([ids[0]])
  await ctx.close()
})
