// THE ICON LIBRARY'S RESULT LINE IS GONE, THE GATE AND FOOTER ARE NEW, AND THE TOOLBAR BAND STICKS.
//
// Acceptance criteria 22 to 25 of the icon library design (slices S7, S8 and S9), on /create/icons:
//   22. no .ig-status text sits between the grid and the gate in any state; the signed-in count is in
//       .lbry-count; the gate and the footer hold no uppercase mono and no label set in mono;
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
//   TEASE_ROWS goes back to 2 (utils/iconEndBand.js)                           -> "one blurred row"
//   .ig-end-band loses its border-top / margin-top:20px (deferred/library.css) -> "the band sits 20px under the row"
//   .ig-credit-lic goes back to font-family: var(--mono)                       -> "no label is set in mono"
//   .iel-page .ig-band top becomes calc(var(--nav-clear) + 8px)                -> "nothing paints between the nav and the band"
//   .iel-page .ig .ic loses scroll-margin-top                                  -> "a focused cell is never under the band"
//   the IntersectionObserver never sets data-stuck (IconLibrary.jsx)           -> "the band is marked stuck"
//   count={...} dropped from <LibraryToolbar> (IconLibrary.jsx)                -> "the count is in the toolbar"
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

test.describe('no result line, and the count is in the toolbar', () => {
  for (const width of WIDTHS) {
    test(`${width}: signed out, nothing but the grid, one blurred row and the gate`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      await expect(page.locator('.ig-end[data-gate="anon"]')).toBeVisible()
      await expect(page.locator('.ig-status'), 'no result line of any kind once the grid has loaded').toHaveCount(0)
      expect(await page.locator('body').innerText(), 'the old "Showing X of Y" text is gone').not.toMatch(/Showing [\d,]+ of [\d,]+/)
      await expect(page.locator('.lbry-count'), 'signed out has no count: the gate says it').toHaveCount(0)
    })

    test(`${width}: signed in, the count is in the toolbar and there is no result line`, async ({ page }) => {
      watch(page, SIGNED_IN)
      const cells = await open(page, width, { plan: 'free' })
      const count = page.locator('.ig-band .ig-toolbar .lbry-count')
      await expect(count, 'the count is in the toolbar band').toHaveText(/^[\d,]+ icons$/, { timeout: 20_000 })
      const held = Number((await count.textContent()).replace(/[^\d]/g, ''))
      expect(held, 'the count is the number of icons held, which is at least the cells drawn').toBeGreaterThanOrEqual(cells)
      expect(held, 'a free account opens more than the signed-out sample').toBeGreaterThan(65)
      await expect(page.locator('.ig-status').filter({ hasText: /Showing|\bof\b|\bicons\b/ })).toHaveCount(0)
      const style = await count.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { family: cs.fontFamily, numeric: cs.fontVariantNumeric, mono: getComputedStyle(document.documentElement).getPropertyValue('--mono') }
      })
      expect(style.family, 'the count is plain UI sans, not mono').not.toMatch(/mono|courier|consolas|menlo/i)
      expect(style.numeric, 'digits are tabular so the count does not jitter').toContain('tabular-nums')
    })
  }

  test('the count follows the results when a search narrows them', async ({ page }) => {
    watch(page, SIGNED_IN)
    await open(page, 1440, { plan: 'free' })
    const count = page.locator('.lbry-count')
    await expect(count).toHaveText(/^[\d,]+ icons$/, { timeout: 20_000 })
    const all = Number((await count.textContent()).replace(/[^\d]/g, ''))
    await page.getByRole('searchbox', { name: /search icons/i }).or(page.getByPlaceholder(/search icons/i)).first().fill('arrow')
    await expect.poll(async () => Number(((await count.textContent()) || '').replace(/[^\d]/g, '')), {
      timeout: 20_000, message: 'a search for "arrow" must change the count in the toolbar',
    }).not.toBe(all)
    await expect(count).toHaveText(/^[\d,]+ icons?$/)
    await expect(page.locator('.ig-status').filter({ hasText: /matches|Showing/ })).toHaveCount(0)
  })

  // The count shares the row with the search, Filters and Add icon. It must not shove the Add icon button
  // into the Filters panel where the row had room for it, nor overlap anything. Under 480px the count gives
  // way, so the search keeps room for its placeholder.
  for (const width of [768, 390]) {
    test(`${width}: the count, Filters and Add icon share the row without overlap`, async ({ page }) => {
      watch(page, SIGNED_IN)
      await open(page, width, { plan: 'free' })
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      if (width >= 480) await expect(page.locator('.lbry-count')).toBeVisible({ timeout: 20_000 })
      else {
        await expect(page.locator('.lbry-count'), 'under 480px the count gives way').toBeHidden()
        const search = await page.locator('.ig-toolbar .lbry-search').evaluate((el) => el.getBoundingClientRect().width)
        expect(search, 'the search keeps room for its placeholder').toBeGreaterThanOrEqual(180)
      }
      await expect(page.locator('.ig-toolbar .lbry-toolbar-row .ig-addbtn'), 'Add icon stays on the toolbar row').toBeVisible()
      const rects = await page.evaluate(() => {
        const row = document.querySelector('.ig-toolbar .lbry-toolbar-row')
        const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom } }
        return {
          row: r(row),
          parts: Object.fromEntries(['.lbry-search', '.lbry-count', '.lbry-filterpanel', '.ig-addbtn'].map((s) => { const el = row.querySelector(s); return [s, el && el.getClientRects().length ? r(el) : null] })),
          overflow: row.scrollWidth - row.clientWidth,
        }
      })
      expect(rects.overflow, 'the row does not scroll sideways').toBeLessThanOrEqual(0)
      const present = Object.entries(rects.parts).filter(([, b]) => b)
      expect(present.length, 'search, Add icon and (from 480px) the count are on the row').toBeGreaterThanOrEqual(width >= 480 ? 3 : 2)
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
      await expect(gate.getByRole('heading', { level: 2 })).toHaveText('Log in to browse the full sets.')
      const body = (await gate.locator('.ig-end-p').textContent()).trim()
      const m = body.match(/^Signed out, you see ([\d,]+) icons from 5 outline sets\. A free account opens every icon in them and adds (\d+) more sets\. Copying needs no account\.$/)
      expect(m, `the gate body is not the expected sentence: "${body}"`).not.toBeNull()
      expect(Number(m[1].replace(/,/g, '')), 'the gate quotes the number of icons actually drawn').toBe(cells)
      // The five set names are the five sets the grid draws from, so "outline sets" points at something real.
      const named = (await gate.locator('.ig-end-sets').textContent()).split(',').map((s) => s.trim())
      expect(named).toEqual(['Lucide', 'Tabler', 'Iconoir', 'Heroicons', 'Phosphor'])
      const drawn = [...new Set(await page.locator('.ig .ic .ic-pack').allTextContents())].sort()
      expect([...named].sort(), 'the sets named under the gate are the sets in the grid').toEqual(drawn)
    })

    test(`${width}: one blurred row, then the band 20px under it set off by a hairline`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      const cols = await gridColumns(page)
      const tease = await page.locator('.ig-end-tease > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      expect(tease.length, 'the blurred row has exactly one cell per grid column').toBe(cols)
      expect(new Set(tease).size, 'and they sit on one row').toBe(1)
      const b = await boxes(page, { tease: '.ig-end-tease', band: '.ig-end-band' })
      expect(Math.abs(b.band.t - b.tease.b - 20), `the band sits 20px under the blurred row (it is ${b.band.t - b.tease.b})`).toBeLessThanOrEqual(1)
      expect(await page.locator('.ig-end-band').evaluate((el) => getComputedStyle(el).borderTopWidth), 'a hairline sets the band off').toBe('1px')
      await expect(page.locator('.ig-end-pill-icon'), 'the arrow badge is gone').toHaveCount(0)
      await expect(page.locator('.ig-end-pill svg'), 'one action, no ornament').toHaveCount(0)
    })
  }

  test('1440: left-aligned with the grid, buttons on the right, centred on the copy', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 1440)
    const b = await boxes(page, { grid: '.ig', h: '.ig-end-h', copy: '.ig-end-copy', cta: '.ig-end-cta' })
    expect(Math.abs(b.h.l - b.grid.l), 'the heading starts where the grid starts').toBeLessThanOrEqual(1)
    expect(Math.abs(b.cta.r - b.grid.r), 'the buttons end where the grid ends').toBeLessThanOrEqual(1)
    const copyMid = (b.copy.t + b.copy.b) / 2
    const ctaMid = (b.cta.t + b.cta.b) / 2
    expect(Math.abs(copyMid - ctaMid), 'the buttons are vertically centred on the copy').toBeLessThanOrEqual(3)
  })

  test('768: still two columns, left-aligned', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 768)
    const b = await boxes(page, { grid: '.ig', h: '.ig-end-h', copy: '.ig-end-copy', cta: '.ig-end-cta' })
    expect(Math.abs(b.h.l - b.grid.l)).toBeLessThanOrEqual(1)
    expect(b.cta.l, 'the buttons sit beside the copy, not under it').toBeGreaterThanOrEqual(b.copy.r - 1)
  })

  test('390: stacked, the buttons full width under the copy', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 390)
    const b = await boxes(page, { grid: '.ig', copy: '.ig-end-copy', pill: '.ig-end-pill', ghost: '.ig-end-ghost' })
    expect(b.pill.t, 'Log in sits under the copy').toBeGreaterThanOrEqual(b.copy.b - 1)
    expect(b.ghost.t, 'See the plans sits under Log in').toBeGreaterThanOrEqual(b.pill.b - 1)
    for (const [name, box] of [['Log in', b.pill], ['See the plans', b.ghost]]) {
      expect(Math.abs((box.r - box.l) - (b.grid.r - b.grid.l)), `${name} spans the grid`).toBeLessThanOrEqual(2)
      expect(box.b - box.t, `${name} is a 48px target`).toBeGreaterThanOrEqual(47.5)
    }
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
    test(`${width}: a real page footer, left-aligned with the grid`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      const credit = page.locator('.ig-credit')
      await expect(credit.locator('.ig-credit-label')).toHaveText('Icon sets on this page')
      const list = (await credit.locator('.ig-credit-packs').textContent()).trim()
      expect(list, 'the list is plain names with the licence in brackets').toBe('Lucide (ISC) · Tabler Icons (MIT) · Iconoir (MIT) · Heroicons (MIT) · Phosphor (MIT)')
      await expect(credit.getByRole('link', { name: 'Every licence in full' })).toHaveAttribute('href', '/credits')
      const spacing = await credit.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { top: cs.marginTop, bottom: cs.paddingBottom, rule: cs.borderTopWidth, ruleStyle: cs.borderTopStyle }
      })
      expect(spacing, '56px above the hairline, 40px below the list').toEqual({ top: '56px', bottom: '40px', rule: '1px', ruleStyle: 'solid' })
      const b = await boxes(page, { grid: '.ig', credit: '.ig-credit', label: '.ig-credit-label', packs: '.ig-credit-packs', more: '.ig-credit-more' })
      expect(Math.abs(b.credit.l - b.grid.l), 'the footer starts where the grid starts').toBeLessThanOrEqual(1)
      if (width >= 768) {
        const mid = (x) => (x.t + x.b) / 2
        expect(Math.abs(mid(b.label) - mid(b.more)), 'one row at 768 and up').toBeLessThanOrEqual(4)
        expect(b.packs.l, 'the list sits between the label and the link').toBeGreaterThanOrEqual(b.label.r - 1)
        expect(b.more.l).toBeGreaterThanOrEqual(b.packs.r - 1)
      } else {
        expect(b.packs.t, 'stacked: the list under the label').toBeGreaterThanOrEqual(b.label.b - 1)
        expect(b.more.t, 'stacked: the link under the list').toBeGreaterThanOrEqual(b.packs.b - 1)
        // A stacked list takes the height of its text. A flex-basis meant for the row would hold it open as a
        // tall empty box above the link (measured 320px for three lines of text).
        // The text's own height is measured with a Range: scrollHeight of a box held open is the box's height.
        const text = await credit.locator('.ig-credit-packs').evaluate((el) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          return range.getBoundingClientRect().height
        })
        expect(b.more.t - b.packs.b, 'no empty gap between the list and the link').toBeLessThanOrEqual(16)
        // A Range covers the glyph boxes, not the lines' leading, so allow one line height over it (the bug was 320px).
        expect(b.packs.b - b.packs.t, 'the list is no taller than its text').toBeLessThanOrEqual(text + 18)
      }
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
    for (const root of document.querySelectorAll('.ig-end, .ig-credit')) {
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
