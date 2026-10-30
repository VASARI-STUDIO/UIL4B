// The signed-in workspace (/projects) on a phone and a tablet, to the responsive section of the
// dashboard spec. 141-dashboard-layout holds the shape of the page at 390, 768 and 1440; this file holds
// the phone and tablet details that spec states in numbers, on a REAL TOUCH CONTEXT for the phone
// (hasTouch + isMobile, so the coarse-pointer rules and the mobile viewport apply):
//
//   390   section order · the date and time as one line under the title, weekday dropped below 360 ·
//         project rows (a drawn thumb beside the name over its line) · New project full width under the
//         work · no sideways scroll at 320 · 44px targets · Feedback and the tab bar clear of the last control
//   768   Today as one ruled row (date and time fixed at 200px, the meters beside it) · the tools as seven
//         rows in one column (176px thumbs) · Discover two across, 345.3px a card; 641, 1000 and 640 for the
//         edges of the band, and 1023 / 1024 for where Discover goes to four across
//
// Every number is hand-checked from the spec (the /tools language): the page gutter is clamp(20px, 4vw, 52px),
// so 768 - 2 x 30.72 = 706.56px of content; Discover's gap is 16px below 1024, so (706.56 - 16) / 2 = 345.28px
// a card; at 1024 the gutter is 40.96 and the gap 24, so (1024 - 2 x 40.96 - 3 x 24) / 4 = 217.5px a card;
// 390 - 2 x 20 = 350px of content; 320 - 40 = 280px. A row's thumb is 112 x 70 on a phone (16:10) and
// 176 x 110 from 761px. The rows run 12px wider than the content each side (the /tools -12px margin).
//
// MUTATION (all made in one build, 30 Oct, each named test went red, then projects.css was restored; the
// three marked "earlier" were made before the restyle and not re-made in that build):
//   projects.css  `.uh .uh-rail { order: -1 }` at 640 and under          -> "the sections run in the spec's order" (earlier)
//   Projects.jsx  `useMediaQuery('(max-width: 640px)')` -> `false`       -> "the sections run in the spec's order" and "Recent exports follows Discover" (earlier)
//   projects.css  the weekday rule at `max-width: 359px` -> `330px`       -> "the weekday is dropped below 360px"
//   projects.css  `.uh-rows .spt-row` columns `112px` -> `72px`           -> "each project row is a thumb beside the name over its line"
//   projects.css  `.uh .uh-new { width: 100% }` -> `auto` at 640            -> "New project is full width under the work"
//   projects.css  `.uh-row-name` `text-overflow: ellipsis` -> `clip`      -> "a long project name is cut with an ellipsis"
//   projects.css  `.uh-tool--all` min-height 56px -> 30px and padding 12px -> 0, `.uh-open` min-height -> 30px -> "the thumb targets are 44px"
//   projects.css  `.uh-pro-cta` width 100% -> auto and `.uh-pro-cta-row .uh-pro-cta` justify-self -> start -> "the Pro button is full width"
//   projects.css  `.uh .uh-main` padding-bottom -> 0 at 640               -> "the last control clears Feedback and the tab bar"
//   global-feedback-btn `bottom` -> 8px                                    -> "Feedback sits above the tab bar" (earlier)
//   projects.css  `.uh .uh-today { display: grid` -> `block` at 641-1023  -> "Today is one row"
//   projects.css  `.uh.uh-spt .uh-today` `border: 0` -> `1px solid`        -> "Today is a ruled row, not a framed card"
//   projects.css  tools two-column rule `min-width: 1100px` -> `700px`     -> "the tools are seven rows in one column"
//   projects.css  Discover `repeat(2` below 1024 -> `repeat(3`              -> "Discover is two across" (768, 641, 1000, 1023)
//   projects.css  Discover `repeat(4` from 1024 -> `repeat(3`               -> "at 1024px Discover is four across"
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const MINUTE = 60_000
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const clone = () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))

/** Colour only: 1 of 4 parts. */
function project(id, name, updatedAt, extra = {}) {
  const design = clone()
  design.palette.colors = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
  return { id, name, design, createdAt: ago(9 * 864e5), updatedAt, ...extra }
}
// Newest first: Violet Lime leads, then two rows. The archived one has the longest meta line.
const LONG_NAME = 'A very long project name that has to be cut short rather than push the page sideways'
const PROJECTS = [
  project('p-lead', 'Violet Lime', ago(2 * 60 * MINUTE)),
  project('p-half', 'Harbour Rebrand', ago(26 * 60 * MINUTE)),
  project('p-old', LONG_NAME, ago(30 * MINUTE), { archived: true }),
]

async function withExports(page) {
  await page.addInitScript(() => {
    try {
      const at = Date.now()
      localStorage.setItem('vs-recent-exports', JSON.stringify(
        ['one', 'two', 'three'].map((n, i) => ({ id: `e${i}`, tool: 'palette', toolLabel: 'Palette Builder', format: 'CSS', filename: `${n}-tokens.css`, bytes: 2048, at: at - (5 + i * 10) * 60 * 1000, projectId: null })),
      ))
    } catch { /* private mode */ }
  })
}

/** A phone in a real touch context, signed in with a Free account, on /projects. Closes the context after `run`. */
async function onPhone(browser, size, run, opts = {}) {
  const { projects = PROJECTS, colorScheme, clock, touch = true, noName = false } = opts
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: touch, isMobile: touch, locale: 'en-AU', ...(colorScheme ? { colorScheme } : {}) })
  try {
    const page = await context.newPage()
    watch(page, `a thumb on a ${size.width}px phone`)
    await withExports(page)
    if (clock) await page.clock.setFixedTime(clock)
    await signIn(page, { plan: 'free', projects, noName })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await run(page)
  } finally {
    await context.close()
  }
}

/** The first drawn match of a selector, in document coordinates. */
const box = (page, selector) => page.evaluate((sel) => {
  const el = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, top: Math.round((r.top + scrollY) * 10) / 10, bottom: Math.round((r.bottom + scrollY) * 10) / 10, width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 }
}, selector)

const PHONE = { width: 390, height: 844 }

test.describe('on a 390px phone, in a real touch context', () => {
  // MUTATION: drop the focusin listener in Greeting.jsx's open effect: Tab past
  // Not now leaves the sheet open over a focused, dimmed page.
  test('the name sheet keeps focus: Escape returns it to the button, Tab past the sheet closes it', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const ask = page.getByRole('button', { name: 'Add your name' })
      await ask.click()
      const sheet = page.locator('.uh-pop')
      await expect(sheet).toBeVisible()
      await expect(page.locator('#uh-name-input')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(sheet).toHaveCount(0)
      await expect(ask).toBeFocused()

      await ask.click()
      await expect(sheet).toBeVisible()
      const inside = await sheet.locator('input, button').count()
      for (let i = 0; i < inside; i++) await page.keyboard.press('Tab')
      await expect(sheet, 'tabbing out of the sheet closes it').toHaveCount(0)
    }, { noName: true })
  })

  test('the sections run in the spec\'s order', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      // Greeting, title, the date and time line, the lead card, the rows, New project under the work, Today, Start something, Discover, Pro.
      const ORDER = ['.uh-greet', '.uh-h1', '.uh-clock-line', '.uh-dash-main > .uh-continue', '.uh-rows', '.uh-new-wrap--foot', '.uh-today', '.uh-start', '.uh-disc', '.uh-exports', '.uh-pro']
      const b = {}
      for (const sel of ORDER) b[sel] = await box(page, sel)
      expect(Object.entries(b).filter(([, v]) => !v).map(([k]) => k), 'sections that are not drawn').toEqual([])
      for (let i = 1; i < ORDER.length; i++) {
        expect(b[ORDER[i]].top, `${ORDER[i]} (y=${b[ORDER[i]].top}) is not below ${ORDER[i - 1]} (ends y=${b[ORDER[i - 1]].bottom})`).toBeGreaterThanOrEqual(b[ORDER[i - 1]].bottom - 1)
      }
      // The DOM says the same, so a screen reader and the Tab key meet them in this order.
      const dom = await page.evaluate((sels) => {
        const els = sels.map((s) => document.querySelector(s))
        return els.slice(1).every((el, i) => !!(els[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))
      }, ['.uh-greet', '.uh-h1', '.uh-dash-main > .uh-continue', '.uh-rows', '.uh-today', '.uh-start', '.uh-disc-head', '.uh-exports', '.uh-pro'])
      expect(dom, 'the DOM order is not the page order').toBe(true)
    })
  })

  test('Recent exports follows Discover, as the spec orders the phone', async ({ browser }) => {
    // The spec's 390 order ends "Start something > Discover > Recent exports > Pro". Projects.jsx mounts the
    // list after Discover below 641px, rather than in the rail under Today as at 768.
    await onPhone(browser, PHONE, async (page) => {
      const disc = await box(page, '.uh-disc')
      const exp = await box(page, '.uh-exports')
      expect(exp.top, 'Recent exports is above Discover').toBeGreaterThanOrEqual(disc.bottom - 1)
    })
  })

  test('the date and time are one line under the title', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const line = page.locator('.uh-clock-line')
      await expect(line).toBeVisible()
      // Tuesday 27 October 2026, 07:05: the weekday, day and month are the browser's own, the time a clock reading.
      expect((await line.innerText()).replace(/\s+/g, ' ').trim()).toMatch(/^Tuesday 27 October · 7:05\s?(am|AM)$/)
      const h1 = await box(page, '.uh-h1')
      const l = await box(page, '.uh-clock-line')
      const lead = await box(page, '.uh-dash-main > .uh-continue')
      expect(l.top, 'the line is above the title').toBeGreaterThanOrEqual(h1.bottom - 1)
      expect(l.bottom, 'the line is not above the work').toBeLessThanOrEqual(lead.top + 1)
      expect(l.height, 'it is one line').toBeLessThan(30)
      expect(l.width, 'it runs the width of the content').toBe(350)
      // One sans, tabular: the time is not set in the mono face.
      const clk = await page.locator('.uh-clock-line .uh-clk-time').evaluate((el) => { const cs = getComputedStyle(el); return { family: cs.fontFamily, numeric: cs.fontVariantNumeric } })
      expect(clk.family, `the clock is not mono (${clk.family})`).not.toMatch(/Geist Mono|monospace/i)
      expect(clk.family, `the clock is the page's sans (${clk.family})`).toMatch(/Switzer/)
      expect(clk.numeric, `the clock has tabular figures (${clk.numeric})`).toContain('tabular-nums')
      await expect(page.locator('.uh-today-clock'), 'the big clock is not drawn on a phone').toBeHidden()
    }, { clock: new Date(2026, 9, 27, 7, 5) })
  })

  for (const [width, weekday] of [[390, true], [360, true], [359, false], [320, false]]) {
    test(`the weekday is ${weekday ? 'kept' : 'dropped'} at ${width}px`, async ({ browser }) => {
      await onPhone(browser, { width, height: 800 }, async (page) => {
        const text = (await page.locator('.uh-clock-line').innerText()).replace(/\s+/g, ' ').trim()
        if (weekday) expect(text).toMatch(/^Tuesday 27 October · 7:05\s?(am|AM)$/)
        else expect(text).toMatch(/^27 October · 7:05\s?(am|AM)$/)
        const l = await box(page, '.uh-clock-line')
        expect(l.height, 'the line wraps').toBeLessThan(30)
      }, { clock: new Date(2026, 9, 27, 7, 5) })
    })
  }

  for (const width of [390, 320]) {
    // A row is the /tools row: a drawn thumb (the project's colours) on the left, the name over its line, the
    // arrow at the right. The line may wrap to more than one line on a phone (a long meta), so what is held is
    // that the name stays above it, the thumb stays beside both and centred on them, and nothing runs past the row.
    test(`each project row is a thumb beside the name over its line at ${width}px`, async ({ browser }) => {
      await onPhone(browser, { width, height: 800 }, async (page) => {
        const rows = await page.locator('.uh-rows .spt-row').evaluateAll((links) => links.map((a) => {
          const q = (s) => a.querySelector(s).getBoundingClientRect()
          const link = a.getBoundingClientRect()
          const thumb = q('.spt-thumb')
          const name = q('.uh-row-name')
          const meta = a.querySelector('.uh-row-meta')
          const m = meta.getBoundingClientRect()
          const go = q('.spt-row-go')
          return {
            link: { left: link.left, right: link.right, height: link.height },
            thumb: { left: thumb.left, right: thumb.right, width: thumb.width, height: thumb.height, mid: (thumb.top + thumb.bottom) / 2, plate: !!a.querySelector('.spt-thumb .uh-plate svg') },
            name: { left: name.left, bottom: name.bottom, top: name.top },
            meta: { left: m.left, right: m.right, top: m.top, bottom: m.bottom, clipped: meta.scrollWidth > meta.clientWidth + 1 },
            go: { left: go.left, right: go.right },
            block: { mid: (name.top + m.bottom) / 2 },
          }
        }))
        expect(rows.length, 'the sweep found no rows').toBe(2)
        for (const r of rows) {
          expect(r.thumb.plate, 'the thumb draws the project\'s colours').toBe(true)
          expect(r.thumb.width, 'the thumb is 112px').toBe(112)
          expect(r.thumb.height, 'the thumb is 16:10, 70px tall').toBe(70)
          expect(r.thumb.left, 'the thumb sits 12px in from the row\'s edge').toBeCloseTo(r.link.left + 12, 0)
          expect(r.name.left, 'the name is a 16px gap from the thumb').toBeCloseTo(r.thumb.right + 16, 0)
          expect(r.name.bottom, 'the name is not above its line').toBeLessThanOrEqual(r.meta.top + 1)
          expect(r.meta.left, 'the line does not start under the name').toBeCloseTo(r.name.left, 0)
          expect(Math.abs(r.thumb.mid - r.block.mid), 'the thumb is not centred on the name and line').toBeLessThanOrEqual(3)
          expect(r.meta.clipped, 'the line is cut off instead of wrapping').toBe(false)
          expect(r.meta.right, 'the line runs into the arrow').toBeLessThanOrEqual(r.go.left + 1)
          expect(r.go.right, 'the arrow runs past the row').toBeLessThanOrEqual(r.link.right + 1)
          expect(r.link.height, 'a row is shorter than the /tools row (88px)').toBeGreaterThanOrEqual(88)
        }
      })
    })
  }

  for (const width of [390, 320]) {
    test(`New project is full width under the work at ${width}px`, async ({ browser }) => {
      await onPhone(browser, { width, height: 800 }, async (page) => {
        const rows = await box(page, '.uh-rows')
        const today = await box(page, '.uh-today')
        const btn = await page.evaluate(() => {
          const el = [...document.querySelectorAll('.uh-new')].find((b) => b.getBoundingClientRect().width > 0)
          const r = el.getBoundingClientRect()
          return { top: r.top + scrollY, bottom: r.bottom + scrollY, width: Math.round(r.width), height: Math.round(r.height), filled: el.classList.contains('is-filled'), name: el.textContent.trim() }
        })
        expect(btn.name).toBe('New project')
        expect(btn.width, 'New project is not the width of the content').toBe(width - 40)
        expect(btn.height, 'New project is under 44px').toBeGreaterThanOrEqual(44)
        expect(btn.top, 'it is not under the rows').toBeGreaterThanOrEqual(rows.bottom - 1)
        expect(btn.bottom, 'it is below Today').toBeLessThanOrEqual(today.top + 1)
        expect(btn.filled, 'it is the outlined one: the first screen holds one filled button').toBe(false)
      })
    })
  }

  for (const scheme of ['light', 'dark']) {
    test(`no sideways scroll at 320px, ${scheme}`, async ({ browser }) => {
      await onPhone(browser, { width: 320, height: 700 }, async (page) => {
        const r = await page.evaluate(() => {
          const de = document.documentElement
          const bleed = [...document.querySelectorAll('.uh *')]
            .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.right > de.clientWidth + 1 || b.left < -1) })
            .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)
          return { overflow: de.scrollWidth - de.clientWidth, bleed, projects: document.querySelectorAll('.proj-card, .uh-row').length }
        })
        expect(r.projects, 'no projects rendered, so the sweep measured nothing').toBe(3)
        expect(r.overflow, `the page scrolls sideways by ${r.overflow}px`).toBe(0)
        expect(r.bleed, 'painting outside the viewport').toEqual([])
      }, { colorScheme: scheme })
    })
  }

  test('a long project name is cut with an ellipsis, not run off the screen', async ({ browser }) => {
    await onPhone(browser, { width: 320, height: 700 }, async (page) => {
      const name = await page.locator('.uh-rows .uh-row-name', { hasText: 'A very long project name' }).evaluate((el) => ({
        cut: el.scrollWidth > el.clientWidth,
        overflow: getComputedStyle(el).textOverflow,
        right: el.getBoundingClientRect().right,
        text: el.textContent,
      }))
      expect(name.text).toBe(LONG_NAME)
      expect(name.cut, 'the name fits, so there is nothing to cut: the test measured nothing').toBe(true)
      expect(name.overflow).toBe('ellipsis')
      expect(name.right).toBeLessThanOrEqual(320)
    })
  })

  test('the thumb targets are 44px', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const sizes = await page.evaluate(() => {
        const h = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0).map((e) => {
          const r = e.getBoundingClientRect()
          return { text: (e.getAttribute('aria-label') || e.innerText).trim().replace(/\s+/g, ' ').slice(0, 30), width: Math.round(r.width), height: Math.round(r.height), parent: Math.round(e.parentElement.getBoundingClientRect().width) }
        })
        return {
          actions: h('.uh-dash-main > .uh-continue .uh-continue-actions a'),
          rows: h('.uh-rows .uh-row-link'),
          newProject: h('.uh-new'),
          tools: h('.uh-start a.uh-tool'),
          allRow: h('.uh-start .uh-tool--all'),
        }
      })
      // POSITIVE CONTROL: the sweep found the controls.
      expect(sizes.actions.length, 'Continue and Open project').toBe(2)
      expect(sizes.rows.length).toBe(2)
      expect(sizes.newProject.length).toBe(1)
      expect(sizes.tools.length, 'five tool rows (Semantic and the Palette Library are not drawn on a phone)').toBe(5)
      expect(sizes.allRow.length, 'the All thirteen tools row').toBe(1)
      for (const group of Object.values(sizes)) for (const c of group) expect(c.height, `${c.text} is ${c.width}x${c.height}`).toBeGreaterThanOrEqual(44)
      // Continue is full width, with Open project under it.
      expect(sizes.actions[0].width, 'Continue is not full width').toBe(sizes.actions[0].parent)
      expect(sizes.actions[1].width, 'Open project is not full width').toBe(sizes.actions[1].parent)
      const [cont, open] = [await box(page, '.uh-continue-actions a:nth-of-type(1)'), await box(page, '.uh-continue-actions a:nth-of-type(2)')]
      expect(open.top, 'Open project is not under Continue').toBeGreaterThanOrEqual(cont.bottom - 1)
      expect(Math.round(cont.height)).toBeGreaterThanOrEqual(44)
    })
  })

  test('the Pro button is full width', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const cta = await page.locator('.uh-pro-cta').evaluate((el) => {
        const r = el.getBoundingClientRect()
        const row = el.parentElement.getBoundingClientRect()
        return { width: Math.round(r.width), row: Math.round(row.width), height: Math.round(r.height) }
      })
      expect(cta.width, 'the Pro button is not the width of its row').toBe(cta.row)
      expect(cta.height).toBeGreaterThanOrEqual(44)
    })
  })

  // A fine-pointer window 390px wide: on a coarse pointer global.css hides the Feedback button altogether
  // (`@media (pointer: coarse)`), so the position the page gives it only shows on a narrow mouse window.
  test('Feedback sits above the tab bar, and the last control clears both', async ({ browser }) => {
    await onPhone(browser, PHONE, async (page) => {
      const feedback = page.locator('.global-feedback-btn')
      await expect(feedback).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await expect.poll(() => page.evaluate(() => Math.round(scrollY)), 'the page reached its end').toBeGreaterThan(1000)
      const m = await page.evaluate(() => {
        const rect = (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, height: r.height, width: r.width } : null }
        const controls = [...document.querySelectorAll('.uh a[href], .uh button')].filter((e) => e.getBoundingClientRect().width > 0)
        const lastBottom = Math.max(...controls.map((e) => e.getBoundingClientRect().bottom))
        const end = document.querySelector('.uh-main').lastElementChild.getBoundingClientRect().bottom
        return { feedback: rect('.global-feedback-btn'), tabs: rect('.pnav-tabs'), lastBottom, end, viewport: innerHeight }
      })
      expect(m.tabs, 'the tab bar is not drawn').not.toBeNull()
      expect(m.tabs.bottom, 'the tab bar is at the foot of the screen').toBeCloseTo(m.viewport, 0)
      expect(m.tabs.top - m.feedback.bottom, `Feedback is ${Math.round(m.tabs.top - m.feedback.bottom)}px above the tab bar`).toBeGreaterThanOrEqual(12)
      // At the end of the page, the last control and the last block both end above Feedback.
      expect(m.lastBottom, 'the last control is under Feedback').toBeLessThanOrEqual(m.feedback.top + 1)
      expect(m.end, 'the last block is under Feedback').toBeLessThanOrEqual(m.feedback.top + 1)
    }, { touch: false })
  })
})

test.describe('on a tablet', () => {
  const open = async (page, width, height = 1024) => {
    watch(page, `a designer on a ${width}px screen`)
    await page.setViewportSize({ width, height })
    await withExports(page)
    await signIn(page, { plan: 'free', projects: PROJECTS })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
  }
  const cells = (page, selector) => page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((e) => e.getBoundingClientRect().width > 0)
    .map((e) => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left * 10) / 10, top: Math.round((r.top + scrollY) * 10) / 10, width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 } }), selector)
  const distinct = (list) => [...new Set(list)].length

  test('at 768px Today is one ruled row: the date and time at 200px, the meters beside them, the plan line under both', async ({ page }) => {
    await open(page, 768)
    const b = {}
    for (const sel of ['.uh-today', '.uh-today-clock', '.uh-meters', '.uh-plan-line', '.uh-rows', '.uh-exports']) b[sel] = await box(page, sel)
    expect(b['.uh-today-clock'].width, 'the date and time column is 200px').toBeCloseTo(200, 0)
    expect(b['.uh-meters'].left, 'the meters are not beside the clock').toBeGreaterThanOrEqual(b['.uh-today-clock'].right)
    expect(Math.abs(b['.uh-meters'].top - b['.uh-today-clock'].top), 'they do not start on one line').toBeLessThanOrEqual(8)
    expect(b['.uh-plan-line'].top, 'the plan line is not under both').toBeGreaterThanOrEqual(Math.max(b['.uh-today-clock'].bottom, b['.uh-meters'].bottom) - 1)
    expect(b['.uh-plan-line'].width, 'the plan line runs the width of Today').toBeGreaterThan(b['.uh-today'].width - 60)
    // The content column is the page less a 4vw gutter each side: 768 - 2 x 30.72. Today has no padding of its own at the sides.
    expect(b['.uh-today'].width, 'Today is one full-width row').toBeCloseTo(706.6, 0)
    expect(b['.uh-today'].top, 'Today is not under the projects').toBeGreaterThanOrEqual(b['.uh-rows'].bottom - 1)
    expect(b['.uh-exports'].top, 'Recent exports is not under Today').toBeGreaterThanOrEqual(b['.uh-today'].bottom - 1)
  })

  test('at 768px Today is a ruled row, not a framed card', async ({ page }) => {
    await open(page, 768)
    const s = await page.locator('.uh-today').evaluate((el) => {
      const cs = getComputedStyle(el)
      return { top: cs.borderTopWidth, right: cs.borderRightWidth, bottom: cs.borderBottomWidth, left: cs.borderLeftWidth, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor }
    })
    expect([s.top, s.right, s.bottom, s.left], 'one hairline above, no frame').toEqual(['1px', '0px', '0px', '0px'])
    expect(s.radius, 'a ruled row has square corners').toBe('0px')
    expect(s.bg, 'and no fill').toBe('rgba(0, 0, 0, 0)')
  })

  test('at 768px the tools are seven rows in one column, 176px thumbs', async ({ page }) => {
    await open(page, 768)
    const tools = await cells(page, '.uh-start .uh-tools a.uh-tool')
    expect(tools.length, 'seven rows: Palette Builder, five more tools, the Palette Library').toBe(7)
    expect(distinct(tools.map((t) => t.left)), 'one column').toBe(1)
    expect(distinct(tools.map((t) => t.top)), 'seven rows down').toBe(7)
    const list = await box(page, '.uh-start .uh-tools')
    for (const t of tools) expect(Math.abs(t.width - list.width), `a row is ${t.width}px wide, the list is ${list.width}px`).toBeLessThanOrEqual(1)
    // Stacked, not overlapping, one height (the /tools row at this size is a 110px thumb in 12px padding: 134px).
    const sorted = [...tools].sort((a, b) => a.top - b.top)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].top, `row ${i + 1} overlaps the row above`).toBeGreaterThanOrEqual(sorted[i - 1].top + sorted[i - 1].height - 1)
    expect(distinct(tools.map((t) => t.height)), 'the rows are different heights').toBe(1)
    const thumbs = await cells(page, '.uh-start .uh-tools .spt-thumb')
    expect(thumbs.length).toBe(7)
    for (const t of thumbs) expect([t.width, t.height], 'a thumb is 176 x 110 (16:10)').toEqual([176, 110])
    // Palette Builder is the first row, then the order the grid has always had.
    await expect(page.locator('.uh-start a.uh-tool:visible .uh-tool-name')).toHaveText(['Palette Builder', 'Gradient', 'Tint', 'Semantic', 'Contrast', 'Icon set', 'Palette Library'])
  })

  test('at 768px Discover is two across, 345.3px a card', async ({ page }) => {
    await open(page, 768)
    const cards = await cells(page, '.uh-disc-card')
    expect(cards.length).toBe(4)
    expect(distinct(cards.map((c) => c.left)), 'two columns').toBe(2)
    expect(distinct(cards.map((c) => c.top)), 'two rows').toBe(2)
    for (const c of cards) expect(Math.abs(c.width - 345.3), `a card is ${c.width}px wide, the spec says 345.3`).toBeLessThanOrEqual(1)
  })

  // The edges of the band: 641 is the first width with Today as a row, 1000 a width the old layout held,
  // 1023 the last before the rail. The thumb steps from 112 to 176 at 761.
  for (const [width, thumb] of [[641, 112], [1000, 176], [1023, 176]]) {
    test(`at ${width}px, the edge of the band, the tools are one column of seven ${thumb}px rows and Discover is 2 x 2`, async ({ page }) => {
      await open(page, width)
      const tools = await cells(page, '.uh-start .uh-tools a.uh-tool')
      expect([tools.length, distinct(tools.map((t) => t.left)), distinct(tools.map((t) => t.top))]).toEqual([7, 1, 7])
      const thumbs = await cells(page, '.uh-start .uh-tools .spt-thumb')
      expect(thumbs.map((t) => t.width), 'the thumbs are not all the size for this width').toEqual(Array(7).fill(thumb))
      const cards = await cells(page, '.uh-disc-card')
      expect([cards.length, distinct(cards.map((c) => c.left)), distinct(cards.map((c) => c.top))]).toEqual([4, 2, 2])
    })
  }

  test('at 1024px the rail is back and Discover is four across, 217.5px a card', async ({ page }) => {
    await open(page, 1024, 900)
    const cards = await cells(page, '.uh-disc-card')
    expect([cards.length, distinct(cards.map((c) => c.left)), distinct(cards.map((c) => c.top))]).toEqual([4, 4, 1])
    for (const c of cards) expect(Math.abs(c.width - 217.5), `a card is ${c.width}px wide, the spec says 217.5`).toBeLessThanOrEqual(1)
  })

  test('at 640px the phone layout takes over: Discover is two across, the tools are one column with the All row', async ({ page }) => {
    await open(page, 640, 900)
    const cards = await cells(page, '.uh-disc-card')
    expect([cards.length, distinct(cards.map((c) => c.left)), distinct(cards.map((c) => c.top))]).toEqual([4, 2, 2])
    // Five drawn rows (Semantic and the Palette Library give way) and the All row. A sweep that found
    // nothing would pass "one column", so the count is asserted too.
    const tools = await cells(page, '.uh-start .uh-tools a.uh-tool')
    expect([tools.length, distinct(tools.map((t) => t.left))], 'the tools are not five rows in one column').toEqual([5, 1])
    expect((await cells(page, '.uh-start .uh-tool--all')).length, 'the All thirteen tools row is not drawn').toBe(1)
  })
})
