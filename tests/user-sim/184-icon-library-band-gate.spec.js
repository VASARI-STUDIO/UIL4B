// THE ICON LIBRARY'S RESULT LINE IS GONE, THE GATE IS A CENTRED BLOCK, AND THE TOOLBAR BAND STICKS.
//
// Acceptance criteria 22 to 25 of the icon library design (slices S7, S8 and S9), on /create/icons:
//   22. no .ig-status text sits between the grid and the gate in any state; the signed-in count is
//       announced in the screen-reader-only #ig-result-count and drawn nowhere; the gate and the footer
//       hold no uppercase mono and no label set in mono;
//   23. scrolled 400px at 1440, nothing paints between the nav's bottom edge and the toolbar band
//       (elementFromPoint at nav bottom + 2 is the band);
//   24. walking the grid with the band stuck, every focused cell is fully visible;
//   25. no `transition: all` on .ic (tests/unit/icon-library-small-fixes.test.js) and no em dash in the
//       copy this slice changed (here: the rendered gate and footer).
//
// The expected values are written out here (the heading, the 20px, the 56px, the 1px), not read back from
// the stylesheet or the copy table, so either side drifting fails here.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   <p className="ig-status">Showing X of Y</p> comes back before the gate   -> "no result line"
//   ICON_GATE_COPY.end.anon.heading gets an em dash                           -> "the gate heading" and "no em dash"
//   ICON_GATE_COPY.end.anon.heading goes back to "Log in to browse the full sets."  -> "the gate heading"
//   TEASE_ROWS goes back to 2 (utils/iconEndBand.js)                           -> "one blurred row"
//   .ig-end-band gets its border-top back, or loses margin:-24px auto 0 / text-align:center
//                                                                              (deferred/library.css) -> "the gate block"
//   .ig-end-tease loses its mask-image (deferred/library.css)                  -> "fades into the block"
//   <LibraryToolbar> gets count={...} back, or #ig-result-count is dropped     -> "the count is announced"
//   .sp-footer-notice-list goes back to font-family: var(--mono)               -> "no label is set in mono"
//   .iel-page .ig-band top becomes calc(var(--nav-clear) + 8px)                -> "nothing paints between the nav and the band"
//   .iel-page .ig .ic loses scroll-margin-top                                  -> "a focused cell is never under the band"
//   the IntersectionObserver never sets data-stuck (IconLibrary.jsx)           -> "the band is marked stuck"
import { test, expect } from './base.js'
import { go, signIn, watch, wheelToRest, restingScrollY } from './helpers.js'
import { gridColumns } from './icon-grid-rows.js'

const WIDTHS = [1440, 768, 390]
const SIGNED_OUT = 'a designer who has not signed up yet, reaching the end of the icon grid'
const SIGNED_IN = 'a designer on the free plan, browsing the icon library'
const EM_DASH = /—/

/** The real cells have replaced the skeleton, and how many there are. */
async function loadedCells(page) {
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20_000 })
  return page.locator('.ig .ic').count()
}

async function open(page, width, { plan } = {}) {
  await page.setViewportSize({ width, height: 900 })
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  return loadedCells(page)
}

/**
 * Scroll the page to `y` by wheel and return where it came to rest. A wheel gesture sent while the route is
 * still settling can be taken up short (measured: 128px of a 400px wheel at 768), so this measures where the
 * page is and sends what is left until it is there. It is a wait on the position, not on time.
 */
async function scrollPageTo(page, y, what) {
  let now = await restingScrollY(page, what)
  for (let i = 0; i < 8 && Math.abs(now - y) > 1; i += 1) {
    now = await wheelToRest(page, y - now, what)
  }
  expect(Math.abs(now - y), `${what}: the page never reached ${y}px (it is at ${now})`).toBeLessThanOrEqual(1)
  return now
}

/** Page-space boxes ([left, top, right, bottom]) of the named parts. */
const boxes = (page, selectors) => page.evaluate((sels) => {
  const out = {}
  for (const [name, sel] of Object.entries(sels)) {
    const el = document.querySelector(sel)
    if (!el) { out[name] = null; continue }
    const r = el.getBoundingClientRect()
    out[name] = { l: r.left, t: r.top + window.scrollY, r: r.right, b: r.bottom + window.scrollY }
  }
  return out
}, selectors)

// ── S7: the result line is gone ──────────────────────────────────────────────

test.describe('no result line, and the count is announced rather than drawn', () => {
  for (const width of WIDTHS) {
    test(`${width}: signed out, nothing but the grid, one blurred row and the gate`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      await expect(page.locator('.ig-end[data-gate="anon"]')).toBeVisible()
      await expect(page.locator('.ig-status'), 'no result line of any kind once the grid has loaded').toHaveCount(0)
      expect(await page.locator('body').innerText(), 'the old "Showing X of Y" text is gone').not.toMatch(/Showing [\d,]+ of [\d,]+/)
      await expect(page.locator('.lbry-count'), 'the toolbar draws no count at any tier').toHaveCount(0)
      await expect(page.locator('#ig-result-count'), 'signed out announces no count: the gate says it').toHaveText('')
    })

    test(`${width}: signed in, the count is announced from the toolbar band and drawn nowhere`, async ({ page }) => {
      watch(page, SIGNED_IN)
      const cells = await open(page, width, { plan: 'free' })
      const count = page.locator('.ig-band #ig-result-count')
      await expect(count, 'the count is announced from the toolbar band').toHaveText(/^[\d,]+ icons$/, { timeout: 20_000 })
      await expect(count).toHaveAttribute('role', 'status')
      const held = Number((await count.textContent()).replace(/[^\d]/g, ''))
      expect(held, 'the count is the number of icons held, which is at least the cells drawn').toBeGreaterThanOrEqual(cells)
      expect(held, 'a free account opens more than the signed-out sample').toBeGreaterThan(65)
      await expect(page.locator('.ig-status').filter({ hasText: /Showing|\bof\b|\bicons\b/ })).toHaveCount(0)
      // Announced, not drawn: the node is clipped to a 1px box, and no element in the toolbar paints a count.
      const box = await count.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height } })
      expect(box.w, 'the count paints a visible box').toBeLessThanOrEqual(1)
      expect(box.h, 'the count paints a visible box').toBeLessThanOrEqual(1)
      await expect(page.locator('.lbry-count'), 'the toolbar draws no count').toHaveCount(0)
      const drawn = await page.locator('.ig-toolbar').evaluate((tb) => [...tb.querySelectorAll('*')]
        .filter((el) => el.getClientRects().length && el.children.length === 0 && /^[\d,]+ icons?$/.test(el.textContent.trim()))
        .map((el) => el.textContent.trim()))
      expect(drawn, 'a visible "N icons" is drawn in the toolbar').toEqual([])
    })
  }

  test('the announced count follows the results when a search narrows them', async ({ page }) => {
    watch(page, SIGNED_IN)
    await open(page, 1440, { plan: 'free' })
    const count = page.locator('#ig-result-count')
    await expect(count).toHaveText(/^[\d,]+ icons$/, { timeout: 20_000 })
    const all = Number((await count.textContent()).replace(/[^\d]/g, ''))
    await page.getByRole('searchbox', { name: /search icons/i }).or(page.getByPlaceholder(/search icons/i)).first().fill('arrow')
    await expect.poll(async () => Number(((await count.textContent()) || '').replace(/[^\d]/g, '')), {
      timeout: 20_000, message: 'a search for "arrow" must change the announced count',
    }).not.toBe(all)
    await expect(count).toHaveText(/^[\d,]+ icons?$/)
    await expect(page.locator('.ig-status').filter({ hasText: /matches|Showing/ })).toHaveCount(0)
  })

  // The row holds the search, Filters (or the pack menu) and the pinned My icons toggle, with the count
  // announced rather than drawn. Nothing overlaps, nothing scrolls sideways, and the search keeps room
  // for its placeholder on a phone. Add icon is not on the row at all.
  for (const width of [768, 390]) {
    test(`${width}: search, filters and the My icons toggle share the row without overlap`, async ({ page }) => {
      watch(page, SIGNED_IN)
      await open(page, width, { plan: 'free' })
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      const search = await page.locator('.ig-toolbar .lbry-search').evaluate((el) => el.getBoundingClientRect().width)
      expect(search, 'the search keeps room for its placeholder').toBeGreaterThanOrEqual(180)
      await expect(page.locator('.ig-toolbar .lbry-toolbar-row button.ig-mine'), 'My icons stays on the toolbar row').toBeVisible()
      await expect(page.locator('.ig-toolbar .ig-addbtn'), 'Add icon is not on the toolbar').toHaveCount(0)
      const rects = await page.evaluate(() => {
        const row = document.querySelector('.ig-toolbar .lbry-toolbar-row')
        const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom } }
        return {
          row: r(row),
          parts: Object.fromEntries(['.lbry-search', '.lbry-filterpanel', '.lbry-toolbar-action', 'button.ig-mine'].map((s) => { const el = row.querySelector(s); return [s, el && el.getClientRects().length ? r(el) : null] })),
          overflow: row.scrollWidth - row.clientWidth,
        }
      })
      expect(rects.overflow, 'the row does not scroll sideways').toBeLessThanOrEqual(0)
      const present = Object.entries(rects.parts).filter(([, b]) => b)
      expect(present.length, 'the search, the filters or pack menu, and My icons are on the row').toBeGreaterThanOrEqual(3)
      for (const [name, b] of present) {
        expect(b.l, `${name} starts inside the row`).toBeGreaterThanOrEqual(rects.row.l - 1)
        expect(b.r, `${name} ends inside the row`).toBeLessThanOrEqual(rects.row.r + 1)
      }
      for (let i = 0; i < present.length; i += 1) {
        for (let j = i + 1; j < present.length; j += 1) {
          const [an, a] = present[i]
          const [bn, b] = present[j]
          const apart = a.r <= b.l + 0.5 || b.r <= a.l + 0.5
          expect(apart, `${an} and ${bn} overlap on the toolbar row`).toBe(true)
        }
      }
    })
  }
})

// ── S7: the gate ─────────────────────────────────────────────────────────────

test.describe('the gate names what is on screen', () => {
  for (const width of WIDTHS) {
    test(`${width}: the heading, the live count and the five sets`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      const cells = await open(page, width)
      const gate = page.locator('.ig-end[data-gate="anon"]')
      // 12 = the five sets a signed-out viewer sees plus the seven a free account adds.
      await expect(gate.getByRole('heading', { level: 2 })).toHaveText('Log in to open all 12 sets.')
      const body = (await gate.locator('.ig-end-p').textContent()).trim()
      const m = body.match(/^You're seeing ([\d,]+) icons from 5 sets\. A free account opens every icon in them, plus 7 more sets\. Copying needs no account\.$/)
      expect(m, `the gate body is not the expected sentence: "${body}"`).not.toBeNull()
      expect(Number(m[1].replace(/,/g, '')), 'the gate quotes the number of icons actually drawn').toBe(cells)
      // The five set names are the five sets the grid draws from, so "5 sets" points at something real.
      const named = (await gate.locator('.ig-end-sets').textContent()).split(',').map((s) => s.trim())
      expect(named).toEqual(['Lucide', 'Tabler', 'Iconoir', 'Heroicons', 'Phosphor'])
      const drawn = [...new Set(await page.locator('.ig .ic .ic-pack').allTextContents())].sort()
      expect([...named].sort(), 'the sets named under the gate are the sets in the grid').toEqual(drawn)
    })

    test(`${width}: one blurred row that fades into a centred block, with no hairline`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      const cols = await gridColumns(page)
      const tease = await page.locator('.ig-end-tease > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      expect(tease.length, 'the blurred row has exactly one cell per grid column').toBe(cols)
      expect(new Set(tease).size, 'and they sit on one row').toBe(1)
      const b = await boxes(page, { tease: '.ig-end-tease', band: '.ig-end-band' })
      expect(Math.abs(b.band.t - b.tease.b + 24), `the block rises 24px into the blurred row (it is ${b.band.t - b.tease.b} from its bottom edge)`).toBeLessThanOrEqual(1)
      const mask = await page.locator('.ig-end-tease').evaluate((el) => { const cs = getComputedStyle(el); return cs.maskImage || cs.webkitMaskImage || '' })
      expect(mask, 'the blurred row fades into the block with a transparency mask').toContain('linear-gradient')
      expect(await page.locator('.ig-end-band').evaluate((el) => getComputedStyle(el).borderTopWidth), 'no hairline sets the block off').toBe('0px')
      await expect(page.locator('.ig-end-pill-icon'), 'the arrow badge is gone').toHaveCount(0)
      await expect(page.locator('.ig-end-pill svg'), 'one action, no ornament').toHaveCount(0)
    })
  }

  // The gate is one block centred on the page: the heading, the line, the sets, then the actions, all on the
  // grid's centre line (to 2px) and the text centre-aligned. The old band was left-aligned with its buttons
  // on the right.
  for (const width of WIDTHS) {
    test(`${width}: the gate is centred on the grid`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      const b = await boxes(page, { grid: '.ig', h: '.ig-end-h', p: '.ig-end-p', sets: '.ig-end-sets', pill: '.ig-end-pill', link: '.ig-end-link', cta: '.ig-end-cta' })
      const mid = (box) => (box.l + box.r) / 2
      const centre = mid(b.grid)
      for (const name of ['h', 'p', 'sets', 'cta']) {
        expect(Math.abs(mid(b[name]) - centre), `${name} sits on the grid's centre line`).toBeLessThanOrEqual(2)
      }
      for (const sel of ['.ig-end-h', '.ig-end-p', '.ig-end-sets']) {
        expect(await page.locator(sel).evaluate((el) => getComputedStyle(el).textAlign), `${sel} is centre-aligned`).toBe('center')
      }
      if (width >= 768) {
        expect(Math.abs(b.pill.t - b.link.t), 'Log in and See the plans share a row').toBeLessThanOrEqual(4)
        expect(Math.abs((b.pill.l + b.link.r) / 2 - centre), 'the pair is centred as a whole').toBeLessThanOrEqual(2)
      }
    })
  }

  test('390: stacked, Log in full width with See the plans under it', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 390)
    const b = await boxes(page, { grid: '.ig', copy: '.ig-end-copy', pill: '.ig-end-pill', link: '.ig-end-link' })
    expect(b.pill.t, 'Log in sits under the copy').toBeGreaterThanOrEqual(b.copy.b - 1)
    expect(b.link.t, 'See the plans sits under Log in').toBeGreaterThanOrEqual(b.pill.b - 1)
    expect(Math.abs((b.pill.r - b.pill.l) - (b.grid.r - b.grid.l)), 'Log in spans the grid').toBeLessThanOrEqual(2)
    expect(b.pill.b - b.pill.t, 'Log in is a 48px target').toBeGreaterThanOrEqual(47.5)
    expect(b.link.b - b.link.t, 'See the plans is a 48px target').toBeGreaterThanOrEqual(47.5)
    await expect(page.locator('.ig-end-ghost'), 'See the plans is a text link, not a ghost button').toHaveCount(0)
  })

  test('the two actions: Log in opens the login popup, See the plans goes to /plans', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 1440)
    const gate = page.locator('.ig-end[data-gate="anon"]')
    await expect(gate.getByRole('link', { name: 'See the plans' })).toHaveAttribute('href', '/plans')
    await gate.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

// ── S7: the footer ───────────────────────────────────────────────────────────

test.describe('the footer', () => {
  for (const width of WIDTHS) {
    test(`${width}: the licence notice sits in the page footer, under the link columns`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.locator('.ig-credit'), 'the old strip under the grid is gone').toHaveCount(0)
      const notice = page.getByRole('contentinfo').locator('.sp-footer-notice')
      await expect(notice.locator('.sp-footer-notice-h')).toHaveText('Icon sets on this page')
      const list = (await notice.locator('.sp-footer-notice-list').textContent()).replace(/\s+/g, ' ').trim()
      expect(list, 'the list is names with the licence in brackets, then the link').toBe('Lucide (ISC), Tabler Icons (MIT), Iconoir (MIT), Heroicons (MIT), Phosphor (MIT). Every licence in full')
      await expect(notice.getByRole('link', { name: 'Every licence in full' })).toHaveAttribute('href', '/credits')
      const b = await boxes(page, { grid: '.sp-footer-grid', notice: '.sp-footer-notice', legal: '.sp-footer-legal' })
      expect(b.notice.t, 'the notice is under the columns').toBeGreaterThanOrEqual(b.grid.b - 1)
      expect(b.legal.t, 'the baseline is under the notice').toBeGreaterThanOrEqual(b.notice.b - 1)
    })
  }
})

// ── S7 / criterion 22: the gate and footer hold no mono labels ──────────────

test('no label in the gate or the footer is set in mono, none is uppercase mono, and no em dash is drawn', async ({ page }) => {
  watch(page, SIGNED_OUT)
  await open(page, 1440)
  const result = await page.evaluate(() => {
    const first = (ff) => ff.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase()
    const monoFirst = first(getComputedStyle(document.documentElement).getPropertyValue('--mono') || "'Geist Mono'")
    const isMono = (cs) => { const f = first(cs.fontFamily); return f === monoFirst || /mono|courier|consolas|menlo/.test(f) }
    const bad = []
    let seen = 0
    let text = ''
    for (const root of document.querySelectorAll('.ig-end, .sp-footer-notice')) {
      text += root.innerText
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (!el.getClientRects().length) continue
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
        if (!own) continue
        seen += 1
        const cs = getComputedStyle(el)
        if (isMono(cs)) bad.push(`${el.className || el.tagName}: "${own.slice(0, 30)}" is mono`)
        if (cs.textTransform === 'uppercase') bad.push(`${el.className || el.tagName}: uppercase`)
      }
    }
    // POSITIVE CONTROL: the sweep can recognise mono. The root token must resolve to a font that is not the UI face.
    const uiFirst = first(getComputedStyle(document.body).fontFamily)
    return { bad, seen, text, monoFirst, uiFirst }
  })
  expect(result.seen, 'the sweep found no text in the gate and footer: it is broken').toBeGreaterThan(8)
  expect(result.monoFirst, 'the sweep does not know the mono face: it would pass on anything').not.toBe(result.uiFirst)
  expect(result.bad, 'labels in the gate and footer are in the UI face').toEqual([])
  expect(result.text, 'no em dash in the gate or footer').not.toMatch(EM_DASH)
})

// ── S8: the sticky band ──────────────────────────────────────────────────────

// The band sticks from 641px up; a phone keeps the toolbar in flow.
for (const width of [1440, 768]) {
  test.describe(`${width}: the toolbar band`, () => {
    test('scrolled 400px, nothing paints between the nav and the band, and the band is marked stuck', async ({ page }) => {
      watch(page, SIGNED_IN)
      await open(page, width, { plan: 'pro' })
      const band = page.locator('.ig-band')
      expect(await band.evaluate((el) => getComputedStyle(el).position), 'the band is sticky').toBe('sticky')
      await expect(band, 'at rest the band is not marked stuck').toHaveAttribute('data-stuck', 'false')
      await scrollPageTo(page, 400, 'scrolling 400px down the icon grid')
      await expect(band, 'the band is marked stuck').toHaveAttribute('data-stuck', 'true')
      const geo = await page.evaluate(() => {
        const nav = document.querySelector('nav.pnav') || document.querySelector('nav')
        const navBottom = nav.getBoundingClientRect().bottom
        const band = document.querySelector('.ig-band').getBoundingClientRect()
        const probe = (x, y) => document.elementFromPoint(x, y)?.closest('.ig-band') !== null
        const xs = [band.left + 4, (band.left + band.right) / 2, band.right - 4]
        return {
          navBottom, bandTop: band.top, navPos: getComputedStyle(nav).position,
          covered: Object.fromEntries([2, 4, 6].map((dy) => [dy, xs.map((x) => probe(x, navBottom + dy))])),
        }
      })
      expect(geo.navPos, 'the nav this measures from is the fixed bar').toBe('fixed')
      expect(geo.bandTop, `the band starts at the nav's bottom edge (${geo.navBottom}), not 8px under it`).toBeLessThanOrEqual(geo.navBottom + 0.5)
      for (const [dy, hits] of Object.entries(geo.covered)) {
        expect(hits, `at nav bottom + ${dy}px the band covers the toolbar's full width: nothing scrolls past above it`).toEqual([true, true, true])
      }
    })

    test('stuck, the card loses its shadow and a hairline closes the band; at rest neither', async ({ page }) => {
      watch(page, SIGNED_IN)
      await open(page, width, { plan: 'pro' })
      const read = () => page.evaluate(() => {
        const band = document.querySelector('.ig-band')
        const bs = getComputedStyle(band)
        return {
          stuck: band.dataset.stuck, rule: bs.borderBottomWidth, ruleColour: bs.borderBottomColor,
          shadow: getComputedStyle(band.querySelector('.ig-toolbar')).boxShadow,
        }
      })
      const rest = await read()
      expect(rest.stuck).toBe('false')
      expect(rest.shadow, 'at rest the card keeps its shadow (the test needs one to lose)').not.toBe('none')
      expect(rest.ruleColour, 'at rest the band edge is transparent').toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      await scrollPageTo(page, 400, 'scrolling down')
      await expect(page.locator('.ig-band')).toHaveAttribute('data-stuck', 'true')
      const stuck = await read()
      expect(stuck.shadow, 'stuck, the card has no shadow').toBe('none')
      expect(stuck.rule).toBe('1px')
      expect(stuck.ruleColour, 'stuck, the band edge is a visible hairline').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      await scrollPageTo(page, 0, 'scrolling back to the top')
      await expect(page.locator('.ig-band'), 'back at the top the band is released').toHaveAttribute('data-stuck', 'false')
      expect((await read()).shadow, 'and the card has its shadow again').not.toBe('none')
    })

    test('walking up the grid with the band stuck, a focused cell is never under the band', async ({ page }) => {
      watch(page, SIGNED_IN)
      await open(page, width, { plan: 'pro' })
      await scrollPageTo(page, 1000, 'scrolling down the grid')
      await expect(page.locator('.ig-band')).toHaveAttribute('data-stuck', 'true')
      // The cell's own scroll-margin is what clears the band, so it must reach the band's bottom edge.
      const margins = await page.evaluate(() => {
        const nav = document.querySelector('nav.pnav') || document.querySelector('nav')
        const band = document.querySelector('.ig-band').getBoundingClientRect()
        const cell = document.querySelector('.ig .ic')
        return { margin: parseFloat(getComputedStyle(cell).scrollMarginTop), bandBottom: band.bottom, navBottom: nav.getBoundingClientRect().bottom }
      })
      expect(margins.margin, 'a cell keeps its distance from the viewport top by at least the band bottom').toBeGreaterThanOrEqual(margins.bandBottom)
      // Focus the first cell that is fully visible below the band, then Shift+Tab backwards through the grid.
      // Each step upward has to scroll the page, and where it lands is what scroll-margin-top decides.
      await page.evaluate(() => {
        const bandBottom = document.querySelector('.ig-band').getBoundingClientRect().bottom
        const cells = [...document.querySelectorAll('.ig .ic')]
        const first = cells.find((c) => c.getBoundingClientRect().top >= bandBottom + 1)
        first.focus({ preventScroll: true })
      })
      const startY = await restingScrollY(page, 'before walking back up')
      const seen = []
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press('Shift+Tab')
        await restingScrollY(page, `after Shift+Tab ${i + 1}`)
        const at = await page.evaluate(() => {
          const el = document.activeElement
          if (!el?.closest('.ig')) return null
          const r = el.getBoundingClientRect()
          return { top: r.top, bottom: r.bottom, bandBottom: document.querySelector('.ig-band').getBoundingClientRect().bottom, vh: window.innerHeight, name: el.getAttribute('aria-label') }
        })
        if (!at) continue
        seen.push(at)
        expect(at.top, `step ${i + 1}: "${at.name}" is not hidden under the band (cell top ${at.top}, band bottom ${at.bandBottom})`).toBeGreaterThanOrEqual(at.bandBottom - 0.5)
        expect(at.bottom, `step ${i + 1}: the cell is inside the viewport`).toBeLessThanOrEqual(at.vh + 0.5)
      }
      expect(seen.length, 'the walk stayed in the grid long enough to mean something').toBeGreaterThanOrEqual(30)
      expect(await restingScrollY(page, 'after the walk'), 'the walk scrolled the page up, so scroll-margin-top was exercised').toBeLessThan(startY)
    })
  })
}

test('a band mounted on a phone is still marked stuck correctly after the window widens', async ({ page }) => {
  watch(page, SIGNED_IN)
  await open(page, 390, { plan: 'pro' })
  await page.setViewportSize({ width: 1440, height: 900 })
  const band = page.locator('.ig-band')
  await expect.poll(() => band.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
  // Scroll until the band is pinned (its top has reached the nav) but its sentinel is still below the viewport top.
  const sentinelY = await page.evaluate(() => document.querySelector('.ig-band-sentinel').getBoundingClientRect().top + window.scrollY)
  await scrollPageTo(page, Math.round(sentinelY - 36), 'scrolling until the band has just pinned')
  const pinned = await page.evaluate(() => {
    const b = document.querySelector('.ig-band').getBoundingClientRect()
    const nav = document.querySelector('nav.pnav').getBoundingClientRect().bottom
    const s = document.querySelector('.ig-band-sentinel').getBoundingClientRect()
    return { bandTop: b.top, navBottom: nav, sentinelTop: s.top, stuck: document.querySelector('.ig-band').dataset.stuck }
  })
  expect(pinned.bandTop, 'the band is pinned').toBeLessThanOrEqual(pinned.navBottom + 9)
  expect(pinned.stuck, `the band is pinned (top ${pinned.bandTop}) so it is stuck, even though the page first laid it out in flow`).toBe('true')
})

// A phone turned sideways is wide enough for the sticky band but too short for it: the nav and a two-row band
// would cover half the screen.
test('667 by 375: a landscape phone keeps the toolbar in flow', async ({ page }) => {
  watch(page, SIGNED_IN)
  await open(page, 667)
  await page.setViewportSize({ width: 667, height: 375 })
  await expect.poll(() => page.locator('.ig-band').evaluate((el) => getComputedStyle(el).position), {
    message: 'the band sticks on a 375px-tall screen',
  }).toBe('static')
})

test('390: the toolbar is not sticky', async ({ page }) => {
  watch(page, SIGNED_IN)
  await open(page, 390)
  expect(await page.locator('.ig-band').evaluate((el) => getComputedStyle(el).position)).toBe('static')
  await scrollPageTo(page, 400, 'scrolling the phone grid')
  const top = await page.locator('.ig-band').evaluate((el) => el.getBoundingClientRect().top)
  expect(top, 'the toolbar has scrolled away with the page').toBeLessThan(0)
})
