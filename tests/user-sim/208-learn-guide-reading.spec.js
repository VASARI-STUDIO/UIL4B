// READING A LEARN GUIDE: contents, the top of the page and the end of the page,
// on all seven guides, in a real browser.
//
// What each group guards, and why only a browser can say:
//
//   TOP          On a phone or tablet the body starts on the first screen: the
//                contents are one closed 44px row, not a list that fills it (on
//                the colour-contrast guide the specimen leads instead). From
//                1080 the contents card (the inline list in the colour-contrast
//                hero) replaces the row, on the first screen.
//   CHOOSING     Picking a section from the phone contents folds the row away,
//                puts focus on that section's h2 and leaves the heading in view
//                once the scroll has stopped. The row collapsing shifts the page
//                while the browser is already scrolling, so the landing height
//                can only be measured after the scroll has settled.
//   CONTENTS     The contents list the guide's sections in page order, and every
//                link clears 4.5:1 in both themes. The redesign dropped the
//                scroll-following marker, so no link is "lit".
//   END          After the prose: the tool button, then "Keep reading", then the
//                Sources disclosure. The next guide comes from a hand-written
//                table below, never from the function that computes it.
//   COLOUR       The filled button, the Sources links, the crumb and the
//                Keep reading labels clear their contrast floor in both themes.
//   FIT          No sideways scroll at 360, 390, 768 and 1440, light and dark,
//                with every disclosure open. No meta line starts on a separator.
//   CRUMB        The topic in the breadcrumb takes the reader to that topic's
//                section on the Learn hub, and brings it into view.
//   MOTION       Under reduced motion the disclosure chevron and the arrows do
//                not animate; with motion allowed they do (the positive control).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { getArticleSources } from '../../src/data/learn/sources.js'

const PHONE = { width: 390, height: 844 }
const TABLET = { width: 768, height: 1024 }
const DESKTOP = { width: 1440, height: 900 }
// The rail replaces the phone contents from this width.
const RAIL_FROM = 1080
// The colour-contrast guide opens on a live specimen, with its contents inline
// in the hero instead of a card beside the prose.
const SPECIMEN = 'colour-contrast'
const tocSel = (article) => (article.slug === SPECIMEN ? 'nav.lart-toc-inline' : 'nav.lart-toc')
// The h1 the hero shows: the colour-contrast guide carries its own hero line.
const HERO_TITLE = { 'colour-contrast': 'How much contrast your text needs, and how to check it.' }

// Hand-written, not derived: what the "Keep reading" row must point at.
// Accessibility and Psychology each hold one guide, so they have no neighbour
// in their topic and fall back to the next guide in the registry (which wraps
// from the last guide to the first). Typography and Colour wrap inside
// their own topic (font-loading goes back to type-scales, brand-colour back to
// colour-spaces).
const KEEP_READING = {
  'colour-contrast': { kicker: 'Read next', to: 'type-scales' },
  'type-scales': { kicker: 'Next in Typography', to: 'typeface-metrics' },
  'typeface-metrics': { kicker: 'Next in Typography', to: 'font-loading' },
  'font-loading': { kicker: 'Next in Typography', to: 'type-scales' },
  'colour-spaces': { kicker: 'Next in Colour', to: 'theme-systems' },
  'theme-systems': { kicker: 'Next in Colour', to: 'brand-colour' },
  'brand-colour': { kicker: 'Next in Colour', to: 'colour-spaces' },
  'improving-value-proposition': { kicker: 'Read next', to: 'colour-contrast' },
}

test('the registry this spec walks is not empty and the table covers every guide', async () => {
  expect(LEARN_ARTICLES.length, 'no Learn guides are registered').toBeGreaterThan(0)
  expect(Object.keys(KEEP_READING).sort()).toEqual(LEARN_ARTICLES.map((a) => a.slug).sort())
})

/** A fresh context at a size and theme. Below the rail width it is a touch device. */
async function open(browser, article, { width, height }, { theme = 'light', reducedMotion = 'no-preference' } = {}) {
  const touch = width < RAIL_FROM
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    reducedMotion,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  })
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('vs-t', t) } catch { /* storage unavailable */ }
  }, theme)
  const page = await ctx.newPage()
  watch(page, `reader on the ${article.topic.toLowerCase()} guide at ${width}px`)
  await go(page, `/learn/${article.slug}`)
  await expect(page.locator('.lart-prose h2').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.dataset.theme), 'the requested theme did not apply')
    .toBe(theme)
  return { ctx, page }
}

/**
 * Wait for the page to stop scrolling: scrollY exactly unchanged for 12 frames
 * in a row. A tolerance would stop early, because the smooth-scroll library
 * eases in sub-pixel steps for a while after the eye sees it stop.
 */
async function settled(page) {
  const r = await page.evaluate(() => new Promise((resolve) => {
    let last = window.scrollY
    let still = 0
    let frames = 0
    const tick = () => {
      frames += 1
      if (window.scrollY === last) still += 1
      else { still = 0; last = window.scrollY }
      if (still >= 12 || frames > 600) resolve({ y: window.scrollY, ok: still >= 12 })
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
  expect(r.ok, 'the page never stopped scrolling').toBe(true)
  return r.y
}

/** Two frames: lets a scroll listener's frame callback and the state it sets land. */
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => {
  const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1)))
  step(count)
}), n)

/** WCAG contrast of two CSS colours (any syntax the browser parses), grounds composited. */
async function contrast(page, fgSel, { nth = 0, on } = {}) {
  return page.evaluate(({ fgSel, nth, on }) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const rgba = (css) => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const lum = ([r, g, b]) => {
      const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
    // The painted ground of an element: every translucent background down the
    // ancestor chain, composited onto the root's.
    const ground = (el) => {
      const layers = []
      for (let n = el; n; n = n.parentElement) {
        const c = rgba(getComputedStyle(n).backgroundColor)
        if (c[3] > 0) layers.push(c)
        if (c[3] === 1) break
      }
      let base = [255, 255, 255]
      for (const [r, g, b, a] of layers.reverse()) base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)]
      return base
    }
    if (fgSel === '__control__') return { ratio: ratio([0, 0, 0], [255, 255, 255]) }
    const el = document.querySelectorAll(fgSel)[nth]
    if (!el) return { missing: true }
    const fg = rgba(getComputedStyle(el).color)
    const bgEl = on ? document.querySelector(on) : el
    const bg = on === 'self' ? rgba(getComputedStyle(el).backgroundColor) : ground(bgEl)
    return { ratio: ratio(fg.slice(0, 3), bg.slice(0, 3)), fg, bg }
  }, { fgSel, nth, on })
}

// ───────────────────────────────────────────────────────────────────────────
test.describe('the top of a guide', () => {
  test('the contrast helper reads black on white as 21:1', async ({ page }) => {
    await go(page, '/learn/colour-contrast')
    const r = await contrast(page, '__control__')
    expect(r.ratio).toBeCloseTo(21, 1)
  })

  for (const article of LEARN_ARTICLES) {
    test(`${article.slug}: body on the first screen, contents closed, one contents list at a time`, async ({ browser }) => {
      test.setTimeout(90_000)
      for (const vp of [PHONE, TABLET]) {
        const { ctx, page } = await open(browser, article, vp)
        try {
          const details = page.locator('details.lart-toc-m')
          await expect(details, `${vp.width}: phone contents missing`).toBeVisible()
          expect(await details.evaluate((d) => d.open), `${vp.width}: contents open on load`).toBe(false)
          const summary = await details.locator('summary').boundingBox()
          expect(summary.height, `${vp.width}: contents row height`).toBeGreaterThanOrEqual(44)
          await expect(details.locator('summary')).toContainText(`${article.sections.length} sections`)

          if (article.slug === SPECIMEN) {
            // The colour-contrast guide leads with its live specimen, not the prose.
            const spec = await page.locator('.lcc-spec').boundingBox()
            expect(spec.y, `${vp.width}: the specimen starts at ${spec.y}px, below the ${vp.height}px fold`)
              .toBeLessThan(vp.height)
          } else {
            // The first section's heading starts on the first screen, below the row.
            const h2 = await page.locator('.lart-prose section h2').first().boundingBox()
            expect(h2.y, `${vp.width}: first section heading starts at ${h2.y}px, below the ${vp.height}px fold`)
              .toBeLessThan(vp.height)
            expect(h2.y, `${vp.width}: heading overlaps the contents row`).toBeGreaterThanOrEqual(summary.y + summary.height)
          }

          // The rail is not on screen; exactly one contents list is.
          await expect(page.locator('nav.lart-toc')).toBeHidden()
          await expect(page.locator('nav.lart-toc-nav')).toBeVisible()
        } finally {
          await ctx.close()
        }
      }
    })

    test(`${article.slug}: phone contents links are 44px tall and 8px apart when opened`, async ({ browser }) => {
      const { ctx, page } = await open(browser, article, PHONE)
      try {
        await page.locator('details.lart-toc-m summary').click()
        const links = page.locator('details.lart-toc-m a')
        await expect(links).toHaveCount(article.sections.length)
        const boxes = []
        for (let i = 0; i < article.sections.length; i += 1) {
          await expect(links.nth(i)).toHaveText(article.sections[i].title)
          boxes.push(await links.nth(i).boundingBox())
        }
        boxes.forEach((b, i) => {
          expect(b.height, `link ${i} height`).toBeGreaterThanOrEqual(44)
          if (i > 0) expect(b.y - (boxes[i - 1].y + boxes[i - 1].height), `gap above link ${i}`).toBeGreaterThanOrEqual(8)
        })
        // Opening pushes the body down in place. It never covers it.
        const h2 = await page.locator('.lart-prose section h2').first().boundingBox()
        expect(h2.y).toBeGreaterThanOrEqual(boxes.at(-1).y + boxes.at(-1).height)
      } finally {
        await ctx.close()
      }
    })

    test(`${article.slug}: at 1440 the contents show on the first screen, inside the guide, with every section`, async ({ browser }) => {
      const { ctx, page } = await open(browser, article, DESKTOP)
      try {
        const toc = page.locator(tocSel(article))
        await expect(toc).toBeVisible()
        const box = await toc.boundingBox()
        // The rail beside the body can start level with the hero, a little above the crumb, so the floor is the guide's own top.
        const guide = await page.locator('.lart').first().boundingBox()
        expect(box.y, `contents top ${box.y} is above the guide top ${guide.y}`).toBeGreaterThanOrEqual(guide.y)
        expect(box.y, `contents top ${box.y} is below the ${DESKTOP.height}px fold`).toBeLessThan(DESKTOP.height)
        await expect(toc.locator('a')).toHaveCount(article.sections.length)
      } finally {
        await ctx.close()
      }
    })

    test(`${article.slug}: the crumb names the topic as a link, nothing is marked as the current page`, async ({ browser }) => {
      const { ctx, page } = await open(browser, article, DESKTOP)
      try {
        await expect(page.locator('.lart-crumb a')).toHaveCount(2)
        await expect(page.locator('.lart-crumb a').last()).toHaveText(article.topic)
        await expect(page.locator('.lart [aria-current]')).toHaveCount(0)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(HERO_TITLE[article.slug] ?? article.title)
      } finally {
        await ctx.close()
      }
    })
  }

  test('the rail and the phone contents swap at 1080 and never show together', async ({ browser }) => {
    const article = LEARN_ARTICLES.find((a) => a.slug !== SPECIMEN)
    for (const width of [RAIL_FROM - 1, RAIL_FROM]) {
      const { ctx, page } = await open(browser, article, { width, height: 900 })
      try {
        const railShown = width >= RAIL_FROM
        await expect(page.locator('nav.lart-toc')).toBeVisible({ visible: railShown })
        await expect(page.locator('nav.lart-toc-nav')).toBeVisible({ visible: !railShown })
      } finally {
        await ctx.close()
      }
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────
test.describe('choosing a section from the phone contents', () => {
  for (const article of LEARN_ARTICLES) {
    test(`${article.slug}: closes the row, focuses the h2 and lands the heading in view`, async ({ browser }) => {
      test.setTimeout(120_000)
      for (const vp of [PHONE, TABLET]) {
        const { ctx, page } = await open(browser, article, vp)
        try {
          const details = page.locator('details.lart-toc-m')
          for (let i = 0; i < article.sections.length; i += 1) {
            const { id, title } = article.sections[i]
            if (!(await details.evaluate((d) => d.open))) {
              // Back to the top with the wheel, the way a reader gets there. A
              // scripted scrollTo is fought by the smooth-scroll library, which
              // keeps its own scroll position and pulls the page back to it.
              await page.mouse.move(vp.width / 2, vp.height / 2)
              await page.mouse.wheel(0, -20000)
              await settled(page)
              expect(await page.evaluate(() => window.scrollY), 'did not get back to the top').toBe(0)
              await details.locator('summary').click()
              await settled(page)
            }
            await details.locator(`a[href="#${id}"]`).click()

            await expect.poll(() => details.evaluate((d) => d.open), { message: `${vp.width} ${id}: row still open` }).toBe(false)
            await expect.poll(
              () => page.evaluate((sid) => document.activeElement === document.getElementById(sid).querySelector('h2'), id),
              { message: `${vp.width} ${id}: focus is not on the section heading` },
            ).toBe(true)

            await settled(page)
            const h2 = await page.locator(`#${id} h2`).boundingBox()
            // 88px is the landing line (nav height + 8 + 16); the sub-pixel
            // remainder of the nav height lets it land at 87.94, so 87 is the floor.
            expect(h2.y, `${vp.width} ${id} ("${title}"): heading lands ${h2.y}px from the top`).toBeGreaterThanOrEqual(87)
            expect(h2.y, `${vp.width} ${id} ("${title}"): heading lands ${h2.y}px from the top`).toBeLessThanOrEqual(140)
          }
        } finally {
          await ctx.close()
        }
      }
    })
  }
})

// ───────────────────────────────────────────────────────────────────────────
test.describe('the contents list', () => {
  for (const article of LEARN_ARTICLES) {
    test(`${article.slug}: the contents link every section, in page order`, async ({ browser }) => {
      const { ctx, page } = await open(browser, article, DESKTOP)
      try {
        const hrefs = await page.locator(`${tocSel(article)} a`).evaluateAll((as) => as.map((a) => a.getAttribute('href')))
        expect(hrefs).toEqual(article.sections.map((s) => `#${s.id}`))
        const domOrder = await page.evaluate((ids) => ids.map((id) => document.getElementById(id))
          .every((el, i, all) => el && (i === 0 || !!(all[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))),
        article.sections.map((s) => s.id))
        expect(domOrder, 'the sections are not in the page in contents order').toBe(true)
      } finally {
        await ctx.close()
      }
    })

    test(`${article.slug}: every contents link clears 4.5:1, in light and dark`, async ({ browser }) => {
      for (const theme of ['light', 'dark']) {
        const { ctx, page } = await open(browser, article, DESKTOP, { theme })
        try {
          const sel = `${tocSel(article)} a`
          const n = await page.locator(sel).count()
          expect(n, `${theme}: no contents links`).toBe(article.sections.length)
          for (let i = 0; i < n; i += 1) {
            const r = await contrast(page, sel, { nth: i })
            expect(r.ratio, `${theme}: contents link ${i} is ${r.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
          }
        } finally {
          await ctx.close()
        }
      }
    })
  }
})

// ───────────────────────────────────────────────────────────────────────────
test.describe('the end of a guide', () => {
  for (const article of LEARN_ARTICLES) {
    for (const vp of [PHONE, TABLET, DESKTOP]) {
      test(`${article.slug} at ${vp.width}: tool, then Keep reading, then Sources, all 44px targets`, async ({ browser }) => {
        const { ctx, page } = await open(browser, article, vp)
        try {
          const order = await page.evaluate(() => {
            const q = (s) => document.querySelector(s)
            const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
            const [prose, tool, onward, sources] = ['.lart-prose', '.lart-next', '.lart-onward', 'details.lart-sources'].map(q)
            return { all: [prose, tool, onward, sources].every(Boolean), a: after(prose, tool), b: after(tool, onward), c: after(onward, sources) }
          })
          expect(order.all, 'a block of the ending is missing').toBe(true)
          expect([order.a, order.b, order.c], 'order is not prose, tool, Keep reading, Sources').toEqual([true, true, true])

          // The tool.
          const toolBtn = page.locator('.lart-next-go')
          if (article.slug === SPECIMEN) {
            // The specimen hands its live pair to the checker.
            const href = await toolBtn.getAttribute('href')
            expect(href.startsWith(`${article.toolTo}?`), `tool link ${href}`).toBe(true)
            expect(href.slice(article.toolTo.length), `tool link ${href}`).toMatch(/^\?fg=[0-9A-Fa-f]{6}&bg=FFFFFF$/)
          } else {
            await expect(toolBtn).toHaveAttribute('href', article.toolTo)
          }
          await expect(toolBtn).toContainText(`Open in ${article.toolLabel}`)
          expect((await toolBtn.boundingBox()).height, 'tool button height').toBeGreaterThanOrEqual(44)

          // Keep reading: the next guide from the hand-written table, then the index row.
          await expect(page.locator('.lart-onward-label')).toHaveText('Keep reading')
          const rows = page.locator('.lart-onward-row')
          await expect(rows).toHaveCount(2)
          const expected = KEEP_READING[article.slug]
          await expect(rows.first()).toHaveAttribute('href', `/learn/${expected.to}`)
          await expect(rows.first().locator('.lart-onward-kicker')).toContainText(expected.kicker)
          if (expected.kicker === 'Read next') {
            await expect(rows.first().locator('.lart-onward-kicker')).not.toContainText('Next in')
          }
          await expect(rows.first().locator('.lart-onward-title'))
            .toHaveText(LEARN_ARTICLES.find((a) => a.slug === expected.to).title)
          await expect(rows.nth(1)).toHaveAttribute('href', '/learn')
          await expect(rows.nth(1)).toContainText(`All ${LEARN_ARTICLES.length} guides`)
          for (let i = 0; i < 2; i += 1) {
            expect((await rows.nth(i).boundingBox()).height, `Keep reading row ${i} height`).toBeGreaterThanOrEqual(44)
          }

          // Sources: folded, counted, 44px summary.
          const sources = page.locator('details.lart-sources')
          expect(await sources.evaluate((d) => d.open), 'Sources open on load').toBe(false)
          await expect(sources.locator('summary')).toContainText(`Sources (${getArticleSources(article.slug).length})`)
          // The specimen draws Sources as a 36px pill with a pointer (learn-contrast.css); 44px on a phone, like every other guide.
          const sourcesFloor = article.slug === SPECIMEN && vp.width >= 768 ? 36 : 44
          expect((await sources.locator('summary').boundingBox()).height, 'Sources summary height').toBeGreaterThanOrEqual(sourcesFloor)
          await sources.locator('summary').click()
          await expect(sources.locator('a')).toHaveCount(getArticleSources(article.slug).length)
          for (let i = 0; i < getArticleSources(article.slug).length; i += 1) {
            await expect(sources.locator('a').nth(i)).toHaveAttribute('href', getArticleSources(article.slug)[i].href)
          }
        } finally {
          await ctx.close()
        }
      })
    }

    test(`${article.slug}: the header links are 44px on touch and 24px with a pointer`, async ({ browser }) => {
      for (const [vp, floor] of [[PHONE, 44], [TABLET, 44], [DESKTOP, 24]]) {
        const { ctx, page } = await open(browser, article, vp)
        try {
          for (const sel of ['.lart-crumb a']) {
            const links = page.locator(sel)
            const n = await links.count()
            expect(n, `${sel} not found`).toBeGreaterThan(0)
            for (let i = 0; i < n; i += 1) {
              expect((await links.nth(i).boundingBox()).height, `${vp.width}: ${sel} #${i} height`).toBeGreaterThanOrEqual(floor)
            }
          }
        } finally {
          await ctx.close()
        }
      }
    })
  }
})

// ───────────────────────────────────────────────────────────────────────────
test.describe('colour of the guide furniture, both themes', () => {
  for (const article of LEARN_ARTICLES) {
    test(`${article.slug}: button, sources, crumb, Keep reading and chevrons clear their floor`, async ({ browser }) => {
      test.setTimeout(90_000)
      for (const theme of ['light', 'dark']) {
        for (const vp of [PHONE, DESKTOP]) {
          const { ctx, page } = await open(browser, article, vp, { theme })
          const where = `${theme} ${vp.width}`
          try {
            // The filled button: its own fill is the ground.
            const btn = await contrast(page, '.lart-next-go', { on: 'self' })
            expect(btn.bg[3], `${where}: the tool button is not filled`).toBe(1)
            expect(btn.ratio, `${where}: tool button text on its fill is ${btn.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)

            await page.locator('details.lart-sources summary').click()
            const n = await page.locator('.lart-sources a').count()
            expect(n, `${where}: no source links`).toBe(getArticleSources(article.slug).length)
            for (let i = 0; i < n; i += 1) {
              const r = await contrast(page, '.lart-sources a', { nth: i })
              expect(r.ratio, `${where}: source link ${i} is ${r.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
            }

            for (const sel of ['.lart-crumb a', '.lart-onward-kicker', '.lart-onward-label', '.lart-sources summary']) {
              const r = await contrast(page, sel)
              expect(r.missing, `${where}: ${sel} not found`).toBeUndefined()
              expect(r.ratio, `${where}: ${sel} is ${r.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
            }

            // The chevron is a graphic that says "this opens": 3:1.
            const chev = await contrast(page, '.lart-sources .lart-chev')
            expect(chev.ratio, `${where}: sources chevron is ${chev.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
            if (vp.width < RAIL_FROM) {
              const c2 = await contrast(page, '.lart-toc-m .lart-chev')
              expect(c2.ratio, `${where}: contents chevron is ${c2.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
              const count = await contrast(page, '.lart-toc-m-count')
              expect(count.ratio, `${where}: section count is ${count.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
            }
          } finally {
            await ctx.close()
          }
        }
      }
    })
  }
})

// ───────────────────────────────────────────────────────────────────────────
test.describe('fit and the meta line', () => {
  for (const article of LEARN_ARTICLES) {
    test(`${article.slug}: no sideways scroll at 360, 390, 768 and 1440, light and dark, everything open`, async ({ browser }) => {
      test.setTimeout(120_000)
      for (const theme of ['light', 'dark']) {
        for (const vp of [{ width: 360, height: 740 }, PHONE, TABLET, DESKTOP]) {
          const { ctx, page } = await open(browser, article, vp, { theme })
          try {
            await page.evaluate(() => document.querySelectorAll('.lart details').forEach((d) => { d.open = true }))
            await frames(page)
            const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
            expect(m.scroll, `${theme} ${vp.width}: document is ${m.scroll}px wide in a ${m.client}px window`).toBeLessThanOrEqual(m.client)
          } finally {
            await ctx.close()
          }
        }
      }
    })

    test(`${article.slug}: the meta line is two items, and no separator leads a line at 360, 390 or 768`, async ({ browser }) => {
      for (const vp of [{ width: 360, height: 740 }, PHONE, TABLET]) {
        const { ctx, page } = await open(browser, article, vp)
        try {
          const items = await page.evaluate(() => [...document.querySelectorAll('.lart-meta > span')].map((s) => {
            const r = s.getBoundingClientRect()
            // The vertical middle, not the top: the items are centred in the row and
            // the link item is taller on touch, so only the middles agree on a line.
            return { mid: Math.round(r.top + r.height / 2), text: s.textContent.trim(), dot: getComputedStyle(s, '::before').content }
          }))
          expect(items, `${vp.width}: meta items`).toHaveLength(2)
          expect(items[0].text).toMatch(/^\d+ min read$/)
          expect(items[1].text).toMatch(/^Reviewed \d{1,2} \w+ \d{4}$/)
          expect(items[0].dot, 'the first item must not carry a separator').toMatch(/^(none|normal)$/)
          // A separator is drawn before an item. It may only sit on a line that
          // already holds text before it, so an item that drew one shares the
          // previous item's line. An item on its own line draws none.
          for (let i = 1; i < items.length; i += 1) {
            const drawsDot = items[i].dot !== 'none' && items[i].dot !== 'normal'
            const sameLine = Math.abs(items[i].mid - items[i - 1].mid) <= 4
            expect(drawsDot === sameLine,
              `${vp.width}: item ${i} (${items[i].text}) ${drawsDot ? 'draws' : 'omits'} a separator but ${sameLine ? 'shares' : 'starts'} a line`)
              .toBe(true)
          }
          // Anything that is a dot at a line's end would be the last item on its line
          // drawing one *after* its text; no item draws a trailing dot.
          const trailing = await page.evaluate(() => [...document.querySelectorAll('.lart-meta > span')]
            .some((s) => /·\s*$/.test(s.textContent) || getComputedStyle(s, '::after').content !== 'none'))
          expect(trailing, `${vp.width}: an item ends with a separator`).toBe(false)
        } finally {
          await ctx.close()
        }
      }
    })
  }
})

// ───────────────────────────────────────────────────────────────────────────
test.describe('the breadcrumb takes the reader to the topic on the hub', () => {
  for (const article of LEARN_ARTICLES) {
    for (const vp of [PHONE, DESKTOP]) {
      test(`${article.slug} at ${vp.width}: ${article.topic} link lands on its section`, async ({ browser }) => {
        const { ctx, page } = await open(browser, article, vp)
        try {
          const anchor = `learn-topic-${article.topic.toLowerCase()}`
          const link = page.locator('.lart-crumb a').last()
          await expect(link).toHaveAttribute('href', `/learn#${anchor}`)
          await link.click()
          await expect(page).toHaveURL(new RegExp(`/learn#${anchor}$`))
          const target = page.locator(`#${anchor}`)
          await expect(target, 'the hub has no section with the id the breadcrumb points at').toBeAttached()
          await settled(page)
          const box = await target.boundingBox()
          expect(box, 'topic section not rendered').not.toBeNull()
          // On screen and clear of the fixed nav (64px).
          expect(box.y, `topic section top at ${box.y}px`).toBeGreaterThanOrEqual(64)
          expect(box.y, `topic section top at ${box.y}px, below the fold`).toBeLessThan(vp.height - 60)
        } finally {
          await ctx.close()
        }
      })
    }
  }
})

// ───────────────────────────────────────────────────────────────────────────
test.describe('motion', () => {
  const rotation = (page, sel) => page.evaluate((s) => {
    const m = getComputedStyle(document.querySelector(s)).transform
    return m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)[1])
  }, sel)

  for (const article of LEARN_ARTICLES.slice(0, 3)) {
    test(`${article.slug}: with motion allowed the chevron turns and the arrow moves (positive control)`, async ({ browser }) => {
      const { ctx, page } = await open(browser, article, DESKTOP)
      try {
        // Read the chevron on the very frame the disclosure opens.
        const first = await page.evaluate(() => {
          const d = document.querySelector('details.lart-sources')
          const c = d.querySelector('.lart-chev')
          getComputedStyle(c).transform
          d.open = true
          const m = getComputedStyle(c).transform
          return m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)[1])
        })
        expect(first, 'the chevron jumped to its final angle instead of turning').toBeGreaterThan(-0.9)
        await expect.poll(() => rotation(page, '.lart-sources .lart-chev')).toBeLessThan(-0.99)

        const turn = (sel) => page.locator(sel).first().evaluate((a) => {
          const m = getComputedStyle(a).transform
          return m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)[1])
        })
        if (article.slug === SPECIMEN) {
          await page.locator('.lart-next-go').hover()
          await expect.poll(() => turn('.lart-next-go .lcc-go svg'), { message: 'the tool arrow did not turn' }).toBeLessThan(0.75)
          await page.locator('.lart-onward-lead').hover()
          await expect.poll(() => turn('.lart-onward-lead .lart-onward-go svg'), { message: 'the lead arrow did not turn' }).toBeLessThan(0.75)
        } else {
          await page.locator('.lart-onward-row:not(.lart-onward-lead)').first().hover()
          await expect.poll(() => page.locator('.lart-onward-row:not(.lart-onward-lead) .lart-onward-go').first()
            .evaluate((a) => getComputedStyle(a).transform)).toBe('matrix(1, 0, 0, 1, 3, 0)')
          await page.locator('.lart-onward-lead').hover()
          await expect.poll(() => turn('.lart-onward-lead .lart-onward-go'), { message: 'the lead arrow did not turn' }).toBeLessThan(0.75)
        }
      } finally {
        await ctx.close()
      }
    })

    test(`${article.slug}: under reduced motion the chevron does not turn and the arrows do not move`, async ({ browser }) => {
      const { ctx, page } = await open(browser, article, DESKTOP, { reducedMotion: 'reduce' })
      try {
        // On the frame it opens, the chevron already points up: nothing is in flight.
        const first = await page.evaluate(() => {
          const d = document.querySelector('details.lart-sources')
          const c = d.querySelector('.lart-chev')
          getComputedStyle(c).transform
          d.open = true
          const m = getComputedStyle(c).transform
          return m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)[1])
        })
        expect(first, 'the chevron was still turning on the frame it opened').toBeLessThan(-0.99)
        expect(await page.locator('.lart-sources .lart-chev').evaluate((c) => getComputedStyle(c).transitionProperty))
          .toBe('none')

        await page.locator('.lart-next-go').hover()
        await page.locator('.lart-onward-row').first().hover()
        await frames(page, 40)
        const moving = article.slug === SPECIMEN ? ['.lart-onward-go', '.lart-onward-go svg', '.lcc-go svg'] : ['.lart-onward-go']
        for (const sel of moving) {
          const t = await page.locator(sel).first().evaluate((a) => ({
            transform: getComputedStyle(a).transform,
            property: getComputedStyle(a).transitionProperty,
          }))
          expect(t.transform, `${sel} moved under reduced motion`).toBe('none')
          // A colour fade is not motion; only a moving transition is ruled out.
          expect(t.property, `${sel} still has a moving transition under reduced motion`).not.toMatch(/all|transform|translate|rotate|scale/)
        }
      } finally {
        await ctx.close()
      }
    })
  }
})
