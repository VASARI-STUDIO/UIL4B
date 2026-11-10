// SPEC 258: THE CREATE TOOLS FIT A PHONE.
//
// Each tool below is opened at 390 on a touch screen, in light and dark (Tint
// also at 768), and held to the same floor:
//   - the page does not scroll sideways;
//   - the toolbar is one row and no control runs past the viewport or cuts its
//     own label or text (a textarea shows all of its text);
//   - every button, link and field in the tool area is at least 44px both ways;
//   - no text in the tool area is under 12px (the Type Scale's specimen lines
//     are drawn at the scale's own sizes, so they are the one exception).
// Then the faults each tool had: the Contrast view pills, the Gradient toolbar
// and its "Pick…" chip, Tint's two-row strip and tablet columns, the Semantic
// Colour base-step row, the Brand Starter's Generate button, and both
// converters' first screen.
//
// MUTATIONS (each should turn the named test red):
//   - delete the `@media (max-width: 900px)` block in tint.css: "Tint swatches"
//     reports 33px cells at 390;
//   - delete the `@media (min-width: 768px) and (max-width: 900px)` block in
//     tint.css: "Tint at 768 is two columns" fails;
//   - set `inline: true` on the `back` item in GradientGenerator.jsx: "Gradient's
//     toolbar keeps only the name, Random and More" fails;
//   - set `.stc-cell-tone` or `.tsc-row-name` back to 11px: the 12px floor fails;
//   - delete the `.stc-ramps-head { flex-wrap: wrap }` rule: "Semantic Colour's
//     base step fits" fails;
//   - delete `.bs-btn--primary:disabled` in brand-starter.css: "the disabled
//     Generate label reads at 3:1" fails;
//   - delete the briefRef effect in BrandStarter.jsx: the textarea reports
//     clipped text;
//   - render the `.fc-about` paragraph outside the `phone ? <details>` branch in
//     FileConverter.jsx: "the File Converter drop zone is on the first screen" fails;
//   - move the format list back into `.v3d-empty-formats`: the 3D Converter's
//     12px floor fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const SHOTS = '.claude/scratch/phtools1'

const TOOLS = [
  { route: '/create/contrast', title: 'Contrast Checker' },
  { route: '/create/gradient', title: 'Gradient' },
  { route: '/create/tint', title: 'Tint' },
  { route: '/create/type-scale', title: 'Type Scale' },
  { route: '/create/semantic-color', title: 'Semantic Colour' },
  { route: '/create/auto-builder', title: 'Brand Starter' },
  { route: '/create/file-converter', title: 'File Converter' },
  { route: '/create/3d-converter', title: '3D Model Converter' },
]

// Everything measured inside the page; returns a list of problems, empty when it fits.
const audit = (page) => page.evaluate(() => {
  const bad = []
  const vw = window.innerWidth
  const name = (el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`
  if (document.documentElement.scrollWidth > vw + 1) bad.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw}`)
  const bar = document.querySelector('[data-tool-toolbar]')
  const kids = bar ? [...bar.children].filter((c) => c.offsetWidth > 0) : []
  // One row = the vertical centres line up (a short title or chip is centred against the 44px buttons, so tops differ).
  const mid = (c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2 }
  if (kids.length && Math.max(...kids.map(mid)) - Math.min(...kids.map(mid)) > 4) bad.push('toolbar wraps: ' + kids.map((c) => `${name(c)}@${Math.round(mid(c))}`).join(' '))
  const area = document.querySelector('.tl-body')
  const shown = (el) => { const cs = getComputedStyle(el); return el.getClientRects().length > 0 && cs.visibility === 'visible' && !el.closest('.sr-only, [hidden]') }
  for (const el of area.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary')) {
    if (!shown(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    // A radio or checkbox drawn small inside a labelled row is not the target; its label is.
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue
    if (r.width < 43.5 || r.height < 43.5) bad.push(`target ${Math.round(r.width)}x${Math.round(r.height)}: ${name(el)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20)}"`)
    if (r.right > vw + 0.5 || r.left < -0.5) bad.push(`control past the edge: ${name(el)} ${Math.round(r.left)}-${Math.round(r.right)}`)
    if (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1) bad.push(`label cut: ${name(el)} "${el.textContent.trim().slice(0, 20)}"`)
    if (el.tagName === 'TEXTAREA' && el.scrollHeight > el.clientHeight + 1) bad.push(`textarea cuts its text: ${el.scrollHeight} > ${el.clientHeight}`)
  }
  const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT)
  const small = {}
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    // The ladder and the sample screen draw each step at its true size, so the smallest step is under 12px by design.
    if (!shown(el) || el.closest('svg') || el.closest('.tsc-row-text, .tsk')) continue
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs < 12) small[`${fs}px ${name(el)}`] = true
  }
  for (const k of Object.keys(small)) bad.push(`text under 12px: ${k}`)
  return bad
})

for (const theme of ['light', 'dark']) {
  test.describe(`Create tools at 390, ${theme}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: theme })

    for (const tool of TOOLS) {
      test(`${tool.title} fits the phone`, async ({ page }) => {
        watch(page, `someone using ${tool.title} on a phone`)
        await go(page, tool.route)
        expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context is a touch screen').toBe(true)
        await expect(page.getByRole('heading', { level: 1, name: tool.title })).toBeAttached()
        await page.waitForTimeout(400)
        expect(await audit(page)).toEqual([])
        await page.screenshot({ path: `${SHOTS}/${tool.route.split('/').pop()}-390-${theme}.png` })
      })
    }

    test("Contrast's four view names sit inside their pills on one line", async ({ page }) => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 })
        await go(page, '/create/contrast')
        const pills = await page.evaluate(() => [...document.querySelectorAll('.cc-views .tl-pill')].map((p) => {
          const range = document.createRange()
          range.selectNodeContents(p)
          const t = range.getBoundingClientRect()
          const b = p.getBoundingClientRect()
          const g = p.parentElement.getBoundingClientRect()
          return { label: p.textContent, gapL: t.left - b.left, gapR: b.right - t.right, top: Math.round(b.top), inRow: b.right <= g.right + 0.5 }
        }))
        expect(pills.map((p) => p.label)).toEqual(['Interface', 'Article', 'Landing page', 'Specimen'])
        for (const p of pills) {
          expect(p.gapL, `${p.label} at ${width}`).toBeGreaterThanOrEqual(4)
          expect(p.gapR, `${p.label} at ${width}`).toBeGreaterThanOrEqual(4)
          expect(p.inRow, `${p.label} at ${width}`).toBe(true)
        }
        expect(new Set(pills.map((p) => p.top)).size, 'one line').toBe(1)
      }
    })

    test("Gradient's toolbar keeps only the name, Random and More; the Pick… chip shows its label", async ({ page }) => {
      await go(page, '/create/gradient')
      const row = await page.evaluate(() => [...document.querySelector('[data-tool-toolbar]').children].filter((c) => c.offsetWidth > 0).map((c) => c.textContent.trim() || c.getAttribute('aria-label') || c.querySelector('a,button')?.getAttribute('aria-label') || c.className))
      expect(row.join('|')).not.toMatch(/stops|Reset|previous gradient/)
      await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Random' })).toBeVisible()
      await page.getByRole('button', { name: 'More', exact: true }).click()
      const sheet = page.getByRole('dialog', { name: 'More' })
      await expect(sheet.getByRole('button', { name: 'Back', exact: true })).toBeVisible()
      await expect(sheet.getByRole('button', { name: 'Reset', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      const pick = page.getByRole('radio', { name: 'Pick…', exact: true })
      await expect(pick).toBeVisible()
      expect(await pick.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    })

    test("Semantic Colour's base step fits, and the tone labels are 12px", async ({ page }) => {
      await go(page, '/create/semantic-color')
      const fit = await page.evaluate(() => {
        const head = document.querySelector('.stc-ramps-head').getBoundingClientRect()
        const pills = [...document.querySelectorAll('.stc-base .tl-pill')].map((p) => p.getBoundingClientRect())
        return { labels: [...document.querySelectorAll('.stc-base .tl-pill')].map((p) => p.textContent), right: Math.max(...pills.map((r) => r.right)), headRight: head.right, tone: parseFloat(getComputedStyle(document.querySelector('.stc-cell-tone')).fontSize) }
      })
      expect(fit.labels).toEqual(['Step 400', 'Step 500', 'Step 600'])
      expect(fit.right).toBeLessThanOrEqual(fit.headRight + 0.5)
      expect(fit.tone).toBeGreaterThanOrEqual(12)
    })

    test('the disabled Generate label reads at 3:1', async ({ page }) => {
      await go(page, '/create/auto-builder')
      const btn = page.getByTestId('brand-starter-generate')
      await expect(btn).toBeDisabled()
      const ratio = await btn.evaluate((el) => {
        const lum = (c) => {
          const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        const cs = getComputedStyle(el)
        const a = lum(cs.color)
        const b = lum(cs.backgroundColor)
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      })
      expect(ratio).toBeGreaterThanOrEqual(3)
    })

    test('the File Converter drop zone is on the first screen, and the intro opens', async ({ page }) => {
      await go(page, '/create/file-converter')
      const drop = page.locator('.fc-drop').first()
      await expect(drop).toBeVisible()
      const box = await drop.boundingBox()
      expect(box.y + Math.min(box.height, 120)).toBeLessThanOrEqual(844)
      const about = page.locator('.fc-about')
      await expect(about).toBeHidden()
      await page.getByText('How it works', { exact: true }).click()
      await expect(about).toContainText('It all runs in your browser')
    })

    test('the 3D Converter drop zone is on the first screen, and its formats open', async ({ page }) => {
      await go(page, '/create/3d-converter')
      const frame = page.locator('.v3d-empty')
      await expect(frame).toBeVisible()
      const box = await frame.boundingBox()
      expect(box.y + Math.min(box.height, 200)).toBeLessThanOrEqual(844)
      await expect(page.locator('.v3d-formats-list')).toBeHidden()
      await page.getByText('Supported formats', { exact: true }).click()
      await expect(page.locator('.v3d-formats-list')).toContainText('GLB')
      expect(await page.locator('.v3d-formats-list').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12)
    })

    test('Tint swatches are 44px or more at 390, in two rows that fill the strip', async ({ page }) => {
      await go(page, '/create/tint')
      const cells = await page.locator('.tt-cell').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, top: Math.round(r.top), left: r.left, right: r.right } }))
      expect(cells).toHaveLength(11)
      for (const c of cells) { expect(c.w).toBeGreaterThanOrEqual(44); expect(c.h).toBeGreaterThanOrEqual(44) }
      expect(new Set(cells.map((c) => c.top)).size).toBe(2)
      expect(Math.max(...cells.map((c) => c.right))).toBeLessThanOrEqual(390)
    })
  })

  test.describe(`Tint at 768, ${theme}`, () => {
    test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true, colorScheme: theme })

    test('Tint at 768 is two columns and holds the floor', async ({ page }) => {
      watch(page, 'someone using Tint on a tablet')
      await go(page, '/create/tint')
      await expect(page.getByRole('heading', { level: 1, name: 'Tint' })).toBeAttached()
      await page.waitForTimeout(400)
      expect(await audit(page)).toEqual([])
      const layout = await page.evaluate(() => {
        const strip = document.querySelector('.tt-cols').getBoundingClientRect()
        const panel = document.querySelector('.tt-panel').getBoundingClientRect()
        return { stripRight: strip.right, panelLeft: panel.left, panelTop: panel.top, stripTop: strip.top, stripH: strip.height }
      })
      expect(layout.panelLeft).toBeGreaterThanOrEqual(layout.stripRight)
      expect(Math.abs(layout.panelTop - layout.stripTop)).toBeLessThan(8)
      expect(layout.stripH).toBeLessThan(330)
      await page.screenshot({ path: `${SHOTS}/tint-768-${theme}.png` })
    })
  })
}
