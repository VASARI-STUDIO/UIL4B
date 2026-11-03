// /community, /feedback AND /seo ON A TOUCH SCREEN AT 390 AND 768.
//
// All three scored under 8 on a phone for layout reasons, so this holds the
// layout, not the copy or the behaviour:
//   · no sideways scroll;
//   · /community: the category chips are ONE line (they scroll sideways, they do
//     not wrap into three rows), the heart on each card is a 44px target, and
//     the grid is two columns on a phone and three on a tablet;
//   · /feedback: the form is the page (no card around it), its fields and type
//     radios are 44px or more, Send is on the first screen above the tab bar,
//     and at 768 the form is one centred column, not a phone layout against
//     the left edge;
//   · /seo: the score is on the first screen and ahead of the fields, the three
//     tools are one 44px switch, and no bordered card sits inside another, on
//     any of the three tools;
//   · everywhere: no control under 44px (inline links in a sentence are exempt)
//     and no text under 12px, in the page body (the shared header and the tab
//     bar belong to the shell and are not measured here).
// Each run is a touch device at 390 and at 768, in light and in dark. Viewport-only
// screenshots go to .claude/scratch/phcomm1/.
//
// MUTATIONS (each seen red, then restored):
//   · community.css: delete `flex-wrap: nowrap` from `.ch-filters` (and the
//     `@media (max-width: 900px)` column rule) so the chips wrap: "one line" fails;
//   · community.css: put `min-height: 28px; min-width: 0; padding: 6px 11px` back
//     on `.ch-heart`: "targets" fails on the heart;
//   · community.css: delete the 561-900 `repeat(3, ...)` grid rule: the tablet
//     column count fails;
//   · feedback.css: delete `margin-inline: auto` from `.fb-page` in the 899px
//     block: "one centred column" fails at 768;
//   · feedback.css: delete the `position: sticky` from `.fb-submit` and give
//     `.fb-textarea` `min-height: 900px`: "Send is on the first screen" fails
//     at 390;
//   · feedback.css: drop `min-height: 48px` from `.fb-input`: "targets" fails;
//   · seo-inspector.css: restore `border: 1px solid var(--border)` and a radius
//     on `.seo-preview`: "no card inside a card" fails (the social frame sits in it);
//   · seo-inspector.css: delete the `order: -1` on `.seo-score`: "score ahead
//     of the fields" fails at 390;
//   · seo-inspector.css: set `.seo-social-domain` back to 10.5px: "no text
//     under 12px" fails.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'phcomm1')
fs.mkdirSync(SHOTS, { recursive: true })

const VIEWS = [
  { name: '390', viewport: { width: 390, height: 844 } },
  { name: '768', viewport: { width: 768, height: 1024 } },
]
const THEMES = ['light', 'dark']

/** A touch device in its own context, the theme seeded before first paint. */
async function open(browser, route, view, theme) {
  const ctx = await browser.newContext({
    viewport: view.viewport, hasTouch: true, isMobile: true, colorScheme: theme,
  })
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
  }, theme)
  const page = await ctx.newPage()
  watch(page, 'a visitor on a phone or tablet')
  await go(page, route)
  return { ctx, page }
}

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

/** /seo at phone width: `.tl.seo-page` bleeds by `--page-inline` (16px under 900px) but
 *  `.app-page` pads 12px, so the tool root overhangs 4px a side. `body{overflow:clip}`
 *  hides it and the document itself stays at the viewport width (asserted below).
 *  Pre-existing and outside this change; the allowance is exactly that 4px. */
const SEO_BLEED_SLACK = 4

/** Page-wide: the document is not wider than the screen. The body is measured too,
 *  because `body{overflow:clip}` hides content that is cut off with no way to scroll
 *  to it (the chip row at 660px did exactly that). `slack` is a named allowance. */
async function expectNoSidewaysScroll(page, what, slack = 0) {
  const m = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, view: window.innerWidth,
  }))
  expect(m.doc, `${what} scrolls sideways (document)`).toBeLessThanOrEqual(m.view)
  expect(m.body, `${what} has content wider than the screen (body)`).toBeLessThanOrEqual(m.view + slack)
}

/** Controls under 44px in the page body, inline links in a sentence excepted. */
const smallTargets = (page) => page.evaluate(() => {
  const root = document.querySelector('.app-page') || document.querySelector('main') || document.body
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, '
    + '[role=button], [role=radio], [role=tab], [role=switch], [role=checkbox]'
  const out = []
  for (const el of root.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (r.width <= 1 || r.height <= 1 || cs.visibility === 'hidden' || cs.display === 'none') continue
    if (el.closest('[aria-hidden="true"], [inert]')) continue
    if (el.tagName === 'A' && cs.display === 'inline') continue // a link inside a sentence
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) {
      out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
  }
  return out
})

/** Text under 12px in the page body. */
const tinyText = (page) => page.evaluate(() => {
  const root = document.querySelector('.app-page') || document.querySelector('main') || document.body
  const out = new Set()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue.trim()
    const el = n.parentElement
    if (!text || !el || el.closest('script, style, noscript, [aria-hidden="true"]')) continue
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (px < 12) out.add(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${px}px "${text.slice(0, 24)}"`)
  }
  return [...out]
})

/** The phone tab bar's top edge, or the viewport bottom where there is none. */
const floorOf = (page) => page.evaluate(() => {
  const bar = document.querySelector('.pnav-tabs')
  if (bar && getComputedStyle(bar).display !== 'none') return bar.getBoundingClientRect().top
  return window.innerHeight
})

for (const view of VIEWS) {
  for (const theme of THEMES) {
    test.describe(`${view.name} touch, ${theme}`, () => {
      test('/community: one chip line, 44px hearts, the right number of columns', async ({ browser }) => {
        const { ctx, page } = await open(browser, '/community', view, theme)
        try {
          await expect(page.locator('.ch-spectrum .ch-card').first()).toBeVisible()
          await expect(page.locator('.ch-spectrum .ch-filter').first()).toBeVisible()
          await expectNoSidewaysScroll(page, '/community')

          // THE CHIP ROW IS ONE LINE: every chip shares one top edge.
          const chips = await page.locator('.ch-spectrum .ch-filter').evaluateAll((els) => els.map((e) => {
            const r = e.getBoundingClientRect()
            return { top: Math.round(r.top), h: Math.round(r.height) }
          }))
          expect(chips.length, 'the seven categories are all there').toBe(7)
          expect(new Set(chips.map((c) => c.top)).size, 'the category chips wrap onto more than one line').toBe(1)
          const row = await page.locator('.ch-spectrum .ch-filters').evaluate((el) => ({
            fits: el.scrollWidth <= el.clientWidth + 1, wrap: getComputedStyle(el).flexWrap,
          }))
          expect(row.wrap, 'the chip row may not wrap').toBe('nowrap')
          // At 390 the chips cannot all fit, so a one-line row has to scroll: the
          // positive control that the row is the scrolling kind, not clipped.
          if (view.name === '390') expect(row.fits, 'the chips fit at 390, so this is not testing the scroll').toBe(false)

          // The toolbar is two lines at most: the chips, then the sort switch.
          const sortTop = await page.locator('.ch-spectrum .ch-sort').evaluate((el) => Math.round(el.getBoundingClientRect().top))
          expect(sortTop, 'the sort switch sits below the chips').toBeGreaterThan(chips[0].top)

          // COLUMNS: two on a phone, three on a tablet.
          const lefts = await page.locator('.ch-spectrum .ch-card').evaluateAll((els) => {
            const tops = els.map((e) => Math.round(e.getBoundingClientRect().top))
            return els.filter((_, i) => tops[i] === tops[0]).map((e) => Math.round(e.getBoundingClientRect().left))
          })
          expect(lefts.length, 'cards per row').toBe(view.name === '390' ? 2 : 3)

          // THE HEART IS A 44px TARGET (the painted pill is smaller).
          const hearts = await page.locator('.ch-spectrum .ch-heart').evaluateAll((els) => els.slice(0, 6).map((e) => {
            const r = e.getBoundingClientRect()
            return { w: Math.round(r.width), h: Math.round(r.height) }
          }))
          expect(hearts.length).toBeGreaterThan(0)
          for (const h of hearts) { expect(h.w).toBeGreaterThanOrEqual(44); expect(h.h).toBeGreaterThanOrEqual(44) }

          expect(await smallTargets(page), 'targets under 44px').toEqual([])
          expect(await tinyText(page), 'text under 12px').toEqual([])
          await shot(page, `community-${view.name}-${theme}`)
        } finally { await ctx.close() }
      })

      test('/feedback: the form is the page, 44px controls, Send in reach, one centred column', async ({ browser }) => {
        const { ctx, page } = await open(browser, '/feedback', view, theme)
        try {
          await expect(page.locator('.fb-page .fb-form')).toBeVisible()
          await expectNoSidewaysScroll(page, '/feedback')

          // NO CARD AROUND THE FORM below 900px: the page is the surface.
          const card = await page.locator('.fb-page .fb-card').evaluate((el) => {
            const cs = getComputedStyle(el)
            return { border: cs.borderTopWidth, bg: cs.backgroundColor, pad: cs.paddingLeft }
          })
          expect(card.border, 'the form sits in a bordered card').toBe('0px')
          expect(card.bg, 'the form sits on a filled card').toBe('rgba(0, 0, 0, 0)')
          expect(card.pad).toBe('0px')

          // THE FORM USES THE WIDTH AND IS BALANCED: one column, the same space
          // either side of it. A phone layout against the left edge is the fault.
          const box = await page.locator('.fb-page .fb-form').evaluate((el) => {
            const r = el.getBoundingClientRect()
            return { left: r.left, right: window.innerWidth - r.right, width: r.width }
          })
          expect(Math.abs(box.left - box.right), `the form is off-centre (${Math.round(box.left)} left, ${Math.round(box.right)} right)`).toBeLessThanOrEqual(24)
          expect(box.width, 'the form uses the width').toBeGreaterThanOrEqual(view.viewport.width * (view.name === '390' ? 0.9 : 0.6))
          expect(box.width, 'one reading column').toBeLessThanOrEqual(560)

          // The type radios: 2x2 on a phone, one row of four at 768.
          const radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
          expect(radios.length).toBe(4)
          expect(new Set(radios).size, 'type radios in rows').toBe(view.name === '390' ? 2 : 1)

          // SEND IS ON THE FIRST SCREEN, above the tab bar.
          const send = await page.locator('.fb-submit').evaluate((el) => {
            const r = el.getBoundingClientRect()
            return { bottom: r.bottom, top: r.top, width: r.width, height: r.height }
          })
          const floor = await floorOf(page)
          expect(send.bottom, 'Send is below the first screen or under the tab bar').toBeLessThanOrEqual(floor)
          expect(send.top).toBeGreaterThan(0)
          expect(send.height).toBeGreaterThanOrEqual(48)
          if (view.name === '390') expect(send.width, 'Send is full width on a phone').toBeGreaterThan(300)
          else expect(Math.round(send.width), 'Send is 160px on a tablet').toBe(160)

          expect(await smallTargets(page), 'targets under 44px').toEqual([])
          expect(await tinyText(page), 'text under 12px').toEqual([])
          await shot(page, `feedback-${view.name}-${theme}`)

          // The error line is 14px with its icon, directly under the message.
          await page.locator('.fb-submit').click()
          const err = page.locator('#fb-error')
          await expect(err).toBeVisible()
          const e = await err.evaluate((el) => ({ px: parseFloat(getComputedStyle(el).fontSize), icon: getComputedStyle(el, '::before').content }))
          expect(e.px).toBeGreaterThanOrEqual(14)
          expect(e.icon, 'the error carries a glyph').not.toBe('none')
          // The message can be READ: the sticky Send bar and the tab bar do not sit
          // on top of it. Probe a point on its first line and ask what is painted there.
          const reachable = await err.evaluate((el) => {
            const r = el.getBoundingClientRect()
            const hit = document.elementFromPoint(r.left + 40, r.top + 10)
            return { inView: r.top >= 0 && r.top + 20 <= window.innerHeight, covered: !hit || !(hit === el || el.contains(hit)), by: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}` : 'nothing' }
          })
          expect(reachable.inView, 'the error line is off the screen').toBe(true)
          expect(reachable.covered, `the error line is covered by ${reachable.by}`).toBe(false)
          await expectNoSidewaysScroll(page, '/feedback with its error')
          await shot(page, `feedback-error-${view.name}-${theme}`)
        } finally { await ctx.close() }
      })

      test('/seo: score first, one switch, no card in a card, on every tool', async ({ browser }) => {
        const { ctx, page } = await open(browser, '/seo', view, theme)
        try {
          await expect(page.getByRole('tab', { name: 'Meta & SERP' })).toBeVisible()
          await expect(page.locator('.seo-page .seo-score')).toBeVisible()
          await expectNoSidewaysScroll(page, '/seo', SEO_BLEED_SLACK)

          // The three tools are one row, 44px each.
          const tabs = await page.getByRole('tab').evaluateAll((els) => els.map((e) => {
            const r = e.getBoundingClientRect()
            return { top: Math.round(r.top), h: Math.round(r.height) }
          }))
          expect(tabs.length).toBe(3)
          expect(new Set(tabs.map((t) => t.top)).size, 'the tools wrap onto a second line').toBe(1)
          for (const t of tabs) expect(t.h).toBeGreaterThanOrEqual(44)

          const pos = await page.evaluate(() => {
            const rect = (s) => document.querySelector(s).getBoundingClientRect()
            return {
              score: rect('.seo-page .seo-score'),
              field: rect('.seo-page .seo-field input'),
              fieldLabel: rect('.seo-page .seo-field-label'),
              preview: rect('.seo-page .seo-preview'),
            }
          })
          const floor = await floorOf(page)
          if (view.name === '390') {
            // SCORE FIRST: on the first screen and ahead of the fields.
            expect(pos.score.bottom, 'the score is not on the first screen').toBeLessThanOrEqual(floor)
            expect(pos.score.top, 'the score comes after the fields').toBeLessThan(pos.field.top)
            expect(pos.score.height, 'the score summary is about 88px high').toBeLessThan(110)
            expect(pos.preview.top, 'the previews come after the fields').toBeGreaterThan(pos.field.top)
          } else {
            // TWO COLUMNS: the previews column starts level with the first field.
            expect(pos.score.left, 'two columns at 768').toBeGreaterThan(pos.field.right - 1)
            expect(Math.abs(pos.score.top - pos.fieldLabel.top), 'the right column starts level with the first field').toBeLessThanOrEqual(12)
          }

          expect(await smallTargets(page), 'targets under 44px').toEqual([])
          expect(await tinyText(page), 'text under 12px').toEqual([])
          await shot(page, `seo-${view.name}-${theme}`)

          // NO CARD INSIDE A CARD, on each of the three tools. A card is a box with
          // a visible border on all four sides (a hairline rule or a fill is not).
          const nested = () => page.evaluate(() => {
            const root = document.querySelector('.seo-page')
            const isCard = (el) => {
              const cs = getComputedStyle(el)
              return ['Top', 'Right', 'Bottom', 'Left'].every((side) => {
                const w = parseFloat(cs[`border${side}Width`])
                const c = cs[`border${side}Color`]
                const a = /rgba?\(([^)]+)\)/.exec(c)
                const alpha = a && a[1].split(',').length > 3 ? parseFloat(a[1].split(',')[3]) : 1
                return w > 0 && cs[`border${side}Style`] !== 'none' && alpha > 0
              })
            }
            const SKIP = 'input, textarea, select, button, [role=tab], svg, code, kbd'
            const cards = [...root.querySelectorAll('*')].filter((el) => !el.matches(SKIP) && !el.closest('svg') && isCard(el))
            const out = []
            for (const el of cards) {
              const outer = cards.find((o) => o !== el && o.contains(el))
              if (outer) out.push(`${el.className} inside ${outer.className}`)
            }
            return { count: cards.length, out }
          })
          const meta = await nested()
          expect(meta.out, 'a bordered card sits inside another (Meta & SERP)').toEqual([])
          // POSITIVE CONTROL: the detector sees the score card and the social frame.
          expect(meta.count, 'the card detector found nothing, so it proves nothing').toBeGreaterThanOrEqual(2)

          await page.getByRole('tab', { name: 'Structured data' }).click()
          await expect(page.locator('.seo-page .seo-tags-code')).toBeVisible()
          expect((await nested()).out, 'a bordered card sits inside another (Structured data)').toEqual([])
          await expectNoSidewaysScroll(page, '/seo structured data', SEO_BLEED_SLACK)
          expect(await tinyText(page), 'text under 12px (Structured data)').toEqual([])

          await page.getByRole('tab', { name: 'Content analysis' }).click()
          await page.locator('.seo-page textarea').first().fill('Colour tokens keep a product consistent. A good colour system names every token once and reuses it everywhere. Teams that name their colour tokens well ship faster, and their colour choices stay consistent across every screen they build.')
          await expect(page.locator('.seo-page .seo-ca-stat').first()).toBeVisible()
          expect((await nested()).out, 'a bordered card sits inside another (Content analysis)').toEqual([])
          await expectNoSidewaysScroll(page, '/seo content analysis', SEO_BLEED_SLACK)
          expect(await tinyText(page), 'text under 12px (Content analysis)').toEqual([])
        } finally { await ctx.close() }
      })
    })
  }
}
