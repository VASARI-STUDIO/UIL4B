// THE STUDIO TOOLS ON THE SHARED TOOL PATTERN, AT PHONE, TABLET AND DESKTOP.
//
// File Converter, Alt Text, Brand Starter, 3D Model Converter and /seo each open on the
// sticky tool toolbar (the name as a 15px label, no display title), with the
// work itself on the first screen of a 390px phone. For each tool, at 390,
// 768 and 1440 in both themes:
//   1. the toolbar is one row, holds the h1 at 15px, meets the header with no
//      gap, and sticks under it when the page scrolls;
//   2. there is no display-size h1 anywhere on the page;
//   3. the tool's input — the place its work starts — begins on the first
//      screen;
//   4. nothing pushes the page sideways.
//
// MUTATION: put back a page hero (an h1 at the old clamp(38px…) step above
// the tool) — the h1-size and first-screen reads fail at 390. Give
// `.tl .tl-toolbar` `position: static` — the sticky read fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const TOOLS = [
  { route: '/create/file-converter', name: 'File Converter', input: '.fc-drop' },
  { route: '/create/alt-text', name: 'Alt Text Generator', input: '.alt-dropzone' },
  { route: '/create/auto-builder', name: 'Brand Starter', input: '#bs-brief' },
  { route: '/create/3d-converter', name: '3D Model Converter', input: '.v3d-frame' },
  { route: '/seo', name: 'Meta & SERP Inspector', input: '[role="tabpanel"] input, [role="tabpanel"] textarea' },
]

for (const tool of TOOLS) {
  for (const theme of ['light', 'dark']) {
    for (const width of [390, 768, 1440]) {
      test(`${tool.route} · ${width}px ${theme}: toolbar label, no hero, the work on the first screen`, async ({ browser }) => {
        const height = width === 390 ? 844 : 900
        const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme })
        await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
        const page = await ctx.newPage()
        watch(page, `someone opening ${tool.name} at ${width}px in ${theme}`)
        await go(page, tool.route)

        const bar = page.locator('[data-tool-toolbar]')
        await expect(bar).toBeVisible()
        await expect(bar, 'the toolbar is still measuring').not.toHaveClass(/is-measuring/)
        const h1 = page.getByRole('heading', { level: 1 })
        await expect(h1).toHaveCount(1)
        await expect(h1).toHaveText(tool.name)
        const facts = await page.evaluate((sel) => {
          const b = document.querySelector('[data-tool-toolbar]').getBoundingClientRect()
          const h = document.querySelector('h1')
          const input = document.querySelector(sel)
          const header = document.querySelector('.pnav')
          return {
            gap: header ? Math.round(b.top - header.getBoundingClientRect().bottom) : 0,
            barH: Math.round(b.height),
            h1Size: parseFloat(getComputedStyle(h).fontSize),
            h1InBar: !!h.closest('[data-tool-toolbar]'),
            inputTop: input ? Math.round(input.getBoundingClientRect().top + window.scrollY) : null,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        }, tool.input)
        expect(facts.h1InBar, 'the h1 is not the toolbar label').toBe(true)
        expect(Math.abs(facts.gap), `the toolbar sits ${facts.gap}px off the header`).toBeLessThanOrEqual(1)
        expect(facts.h1Size, 'the tool name is set larger than the 15px label').toBe(15)
        expect(facts.barH, `the toolbar is ${facts.barH}px tall — a second row`).toBeLessThan(72)
        expect(facts.inputTop, `${tool.input} is not on the page`).not.toBeNull()
        expect(facts.inputTop, `the work starts at y=${facts.inputTop}, below the first screen`).toBeLessThan(height - 80)
        expect(facts.overflow, 'the page scrolls sideways').toBe(0)

        // Sticky: scrolled down, the toolbar is still on screen under the header.
        const scrollable = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
        if (scrollable > 200) {
          await page.evaluate(() => window.scrollTo(0, 400))
          await expect.poll(async () => bar.evaluate((el) => {
            const r = el.getBoundingClientRect()
            return r.top >= 0 && r.bottom <= 140
          }), { message: 'the toolbar scrolled away with the page' }).toBe(true)
        }
        await ctx.close()
      })
    }
  }
}
