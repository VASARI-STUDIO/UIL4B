// Phone and tablet quality for /credits, /privacy, /terms, the 404 and the guide 404.
//
// Each page is opened at 390 and 768 with touch on, in light and dark, and the
// page's own content (`.sec`, never the shared header or footer) is measured:
//   - nothing scrolls sideways;
//   - no control is under 44px on either axis, except a link set inside a run of
//     text (WCAG 2.5.8's inline exception);
//   - no text under 12px;
//   - at 768 the content is centred (equal margins) or fills the width;
//   - the H1 carries no italic accent;
//   - no card surface sits inside another.
// A viewport-only screenshot of every case lands in .claude/scratch/phlegal1/.
//
// MUTATION (each one must turn a named test red):
//   - credits.css: set `.crd-row-link { min-height: 30px; height: 30px;
//     padding-block: 0; overflow: hidden }` -> "no control under 44px" fails on
//     /credits (seen red, 4 cases). `min-height: 30px` alone does NOT fail: the
//     two-line row is taller than 44px on its own content.
//   - credits.css: change `.crd-scope li` font-size to `11px` -> "no text under 12px".
//   - Credits.jsx: put `<em>licences</em>` back in the H1 -> "no italic accent".
//   - legal.css: set `.sec.lgl { margin-inline: 0 auto }` -> "balanced margins"
//     on /terms and /privacy at 768. (Deleting `margin-inline: auto` is a no-op:
//     the shared `.sec` rule centres the column anyway.)
//   - legal.css: put `.lgl .storage-table .storage-key { font-size: 11px }` back
//     -> "no text under 12px" on /privacy at 768.
//   - reading.css: set `.nf{margin-inline:0 auto}` -> "balanced margins" on both
//     404s at 768 (seen red: left 23, right 185; deleting `margin-inline:auto`
//     is a no-op for the same reason); make `.nf .nf-more a` `min-height:24px` -> "no control
//     under 44px".
//   - wrap `.crd-group-body` in an element with `border:1px solid var(--border);
//     border-radius:12px` and a bordered child of the same kind -> "no card
//     inside a card".
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PAGES = [
  { name: 'credits', route: '/credits' },
  { name: 'privacy', route: '/privacy' },
  { name: 'terms', route: '/terms' },
  { name: 'not-found', route: '/no-such-page-for-phone-check' },
  { name: 'guide-not-found', route: '/learn/no-such-guide-for-phone-check' },
]
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]
const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'phlegal1')

/** Everything measured in one pass, inside the page. */
function measure() {
  const root = document.querySelector('.app-page .sec') || document.querySelector('.sec')
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
  }
  const label = (el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || '').trim().slice(0, 24)}"`

  // A link is inline when its parent holds other text around it.
  const isInline = (a) => {
    const parent = a.parentElement
    const own = (a.textContent || '').trim().length
    return (parent.textContent || '').trim().length > own + 3 && getComputedStyle(a).display === 'inline'
  }
  const targets = []
  for (const el of root.querySelectorAll('a[href], button, input, summary, select, textarea')) {
    if (!visible(el) || el.classList.contains('sr-only')) continue
    if (el.tagName === 'A' && isInline(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) targets.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }

  const small = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue
    const el = n.parentElement
    if (!visible(el) || el.closest('.sr-only')) continue
    const size = parseFloat(getComputedStyle(el).fontSize)
    // Arrow glyphs and separators are decoration, not reading text.
    if (size < 12 && !/^[\s→·|/•]+$/.test(n.nodeValue)) small.push(`${label(el)} ${size}px`)
  }

  const box = root.getBoundingClientRect()
  const kids = [...root.children].filter(visible)
  const left = Math.min(...kids.map((k) => k.getBoundingClientRect().left))
  const right = Math.max(...kids.map((k) => k.getBoundingClientRect().right))

  // A card surface: rounded, with a visible edge (border or shadow), and big
  // enough to hold content. Pills, chips and inputs are smaller or leaves.
  const isCard = (el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const edge = (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.borderTopColor))
      || cs.boxShadow !== 'none'
    return parseFloat(cs.borderTopLeftRadius) >= 8 && edge && r.width > 160 && r.height > 60 && !el.matches('input, button, summary, a, table, details')
  }
  const nested = []
  for (const el of root.querySelectorAll('*')) {
    if (!visible(el) || !isCard(el)) continue
    let outer = el.parentElement
    while (outer && root.contains(outer) && !isCard(outer)) outer = outer.parentElement
    if (outer && root.contains(outer)) nested.push(`${label(el)} inside ${label(outer)}`)
  }

  const h1 = root.querySelector('h1')
  const h1Accents = [...h1.querySelectorAll('em, i')].map((e) => e.textContent)
    .concat(getComputedStyle(h1).fontStyle === 'italic' ? ['h1 itself'] : [])

  return {
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    targets,
    small,
    leftGap: Math.round(left),
    rightGap: Math.round(window.innerWidth - right),
    contentWidth: Math.round(right - left),
    rootWidth: Math.round(box.width),
    nested,
    h1Accents,
  }
}

for (const theme of ['light', 'dark']) {
  for (const vp of WIDTHS) {
    for (const pg of PAGES) {
      test(`${pg.name} at ${vp.width} touch, ${theme}: sized, balanced, flat`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, colorScheme: theme })
        await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
        const page = await ctx.newPage()
        watch(page, 'a visitor on a phone or tablet')
        await go(page, pg.route)
        await expect(page.locator('.sec h1').first()).toBeVisible()
        await page.waitForTimeout(300)

        fs.mkdirSync(SHOTS, { recursive: true })
        await page.screenshot({ path: path.join(SHOTS, `${pg.name}-${vp.width}-${theme}.png`) })

        const m = await page.evaluate(measure)
        expect(m.overflowX, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        expect(m.targets, 'controls under 44px (inline links excepted)').toEqual([])
        expect(m.small, 'text under 12px').toEqual([])
        expect(m.h1Accents, 'an italic accent in the H1').toEqual([])
        expect(m.nested, 'a card surface inside another').toEqual([])
        if (vp.width === 768) {
          // Centred, or the content fills the width: either way no left hug.
          const fills = m.contentWidth >= vp.width * 0.9
          expect(fills || Math.abs(m.leftGap - m.rightGap) <= 4,
            `content hugs one side at 768: left ${m.leftGap}, right ${m.rightGap}, width ${m.contentWidth}`).toBe(true)
        }
        await ctx.close()
      })
    }
  }
}

test('credits at 390: the first screen is the search field and a closed licence group', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: WIDTHS[0], hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'a visitor on a phone')
  await go(page, '/credits')
  const search = page.getByRole('searchbox', { name: 'Search credits' })
  await expect(search).toBeVisible()
  expect((await search.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await expect(page.locator('details.crd-group').first()).not.toHaveAttribute('open', '')
  await search.fill('carbon')
  await expect(page.locator('.crd-search-status')).toContainText('match')
  await expect(page.locator('details.crd-group[open]').first()).toBeVisible()
  await ctx.close()
})

for (const vp of WIDTHS) {
  test(`privacy at ${vp.width}: the storage table sits inside the reading column`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    watch(page, 'a visitor on a phone or tablet')
    await go(page, '/privacy')
    const fit = await page.evaluate(() => {
      const col = document.querySelector('.app-page .sec').getBoundingClientRect()
      const t = document.querySelector('.storage-table').getBoundingClientRect()
      return { colL: col.left, colR: col.right, tL: t.left, tR: t.right, colW: col.width }
    })
    expect(fit.tL, 'table starts left of the column').toBeGreaterThanOrEqual(fit.colL - 1)
    expect(fit.tR, 'table ends right of the column').toBeLessThanOrEqual(fit.colR + 1)
    if (vp.width === 768) expect(Math.round(fit.colW), 'the 612px reading column').toBe(612)
    await ctx.close()
  })
}

test('privacy at 390: the storage keys are hairline rows, 12px or more', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: WIDTHS[0], hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, 'a visitor on a phone')
  await go(page, '/privacy')
  const rows = await page.locator('.storage-table tbody tr').evaluateAll((trs) => trs.map((tr) => {
    const cs = getComputedStyle(tr)
    const key = tr.querySelector('.storage-key')
    return { h: tr.getBoundingClientRect().height, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, key: parseFloat(getComputedStyle(key).fontSize) }
  }))
  expect(rows.length).toBeGreaterThan(20)
  for (const r of rows) {
    expect(r.radius, 'a row is drawn as a card').toBe('0px')
    expect(r.key).toBeGreaterThanOrEqual(12)
    expect(r.h).toBeLessThan(110)
  }
  await ctx.close()
})
