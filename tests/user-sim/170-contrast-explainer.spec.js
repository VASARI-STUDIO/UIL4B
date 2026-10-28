// /create/contrast — the AA/AAA explainer and the new-tab measurement link
// (slice 1 of contrast-checker-previews-2026-10-28).
//
// The explainer is static copy, so it must read the same and take the same
// room whatever colours are in the fields: if it moved, the result panel
// would jump on every keystroke. The link opens a long article, so it opens a
// new tab and says so. The link's own promises (target, rel, name, popup) and
// its 44px thumb target live in 142; this file holds the copy, the height, the
// two themes and the panel.
//
// Expected values are written out by hand, never read back from the page. The
// four pairs sit on white and were checked with the WCAG formula:
//   #000000  21.00:1  passes AAA
//   #767676   4.54:1  passes AA, short of AAA
//   #949494   3.03:1  large text and UI parts only
//   #AAAAAA   2.32:1  fails every check
//
// MUTATIONS are listed on each test. Each was applied to the source, the page
// rebuilt, and the named test watched go red; the source was then restored.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

const PAIRS = [
  { fg: '#000000', ratio: '21.00:1', head: 'Passes AAA for all text.', note: 'Clears every WCAG 2.2 check.' },
  { fg: '#767676', ratio: '4.54:1', head: 'Passes AA for all text.', note: 'AAA needs 7:1.' },
  { fg: '#949494', ratio: '3.03:1', head: 'Large text and UI parts only.', note: 'Body text needs 4.5:1.' },
  { fg: '#AAAAAA', ratio: '2.32:1', head: 'Fails every WCAG check.', note: 'Text needs at least 3:1 when large.' },
]

const EXPLAINER = [
  'AA is the usual target: 4.5:1 for normal text, 3:1 for large text, icons and input borders.',
  'AAA is stricter: 7:1 for normal text and 4.5:1 for large text. UI components have no AAA level.',
  'Large text is 24px and up, or 18.66px and up if bold.',
]

/** A fresh context in a known theme, desktop or phone, with the theme seeded before the page loads. */
async function open(browser, { width, height, theme = 'light', phone = false }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    ...(phone ? { deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA } : {}),
  })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  await go(page, '/create/contrast')
  return { ctx, page }
}

async function setPair(page, fg) {
  await page.locator('#cc-fg').fill(fg)
  await page.locator('#cc-bg').fill('#FFFFFF')
}

for (const theme of ['light', 'dark']) {
  test.describe(`Contrast Checker · the explainer in the ${theme} theme`, () => {
    // MUTATION: in ContrastChecker.jsx delete the Large text <li>; the count and
    // the text list both go red. Change "7:1" to "9:1" in the second <li>; the
    // text list goes red.
    test('three bullets say what AA, AAA and large text mean, with the thresholds', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width: 1440, height: 900, theme })
      watch(page, 'someone who has never read WCAG')
      // POSITIVE CONTROL: the page really is in the theme this run claims.
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      await expect(page.locator('.cc-explain li')).toHaveCount(3)
      await expect(page.locator('.cc-explain li')).toHaveText(EXPLAINER)
      for (const li of await page.locator('.cc-explain li').all()) await expect(li).toBeVisible()
      // The terms are picked out, so the list scans.
      await expect(page.locator('.cc-explain li strong')).toHaveText(['AA', 'AAA', 'Large text'])
      await ctx.close()
    })

    // The old note said "19px bold", which is wrong: WCAG's line is 14pt bold,
    // which is 18.66px. 19px is close enough to be believed and wrong enough to
    // pass a pair the rule fails.
    //
    // MUTATION: change "18.66px and up if bold" to "19px bold" in the third <li>;
    // the "19px" expectation and the text list go red.
    test('the explainer never says 19px, and gives the exact bold size', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width: 1440, height: 900, theme })
      watch(page, 'someone checking bold 18.66px text')
      const text = await page.locator('.cc-note').innerText()
      expect(text).not.toMatch(/19\s*px/i)
      for (const needle of ['4.5:1', '3:1', '7:1', '24px', '18.66px']) expect(text, `the explainer must name ${needle}`).toContain(needle)
      await ctx.close()
    })

    // MUTATION: in ToolIcon.jsx give the glyph a fixed stroke="#000" instead of
    // currentColor; the arrow stays black while the link is blue (light) or pale (dark), and the comparison goes red.
    test('the link and its arrow are drawn in the same colour', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width: 1440, height: 900, theme })
      watch(page, 'someone looking for the full explanation')
      const link = page.locator('.cc-note-link')
      await expect(link).toBeVisible()
      const read = await link.evaluate((a) => {
        const svg = a.querySelector('svg')
        const box = svg.getBoundingClientRect()
        return { color: getComputedStyle(a).color, stroke: getComputedStyle(svg).stroke, w: Math.round(box.width), h: Math.round(box.height) }
      })
      expect(read.stroke, 'the arrow follows the link colour').toBe(read.color)
      expect([read.w, read.h]).toEqual([14, 14])
      await ctx.close()
    })
  })
}

test.describe('Contrast Checker · the explainer holds still', () => {
  const VIEWPORTS = [
    { name: '1440x900', width: 1440, height: 900, phone: false },
    { name: '390x844', width: 390, height: 844, phone: true },
  ]
  for (const vp of VIEWPORTS) {
    // The pairs are chosen so every verdict is on screen once (AAA, AA, large only,
    // fail); the fix list grows from none to two rows across them, so the panel
    // around the explainer does change. The explainer and the verdict block must not.
    //
    // MUTATION 1: in ContrastChecker.jsx render the AAA <li> only when the pair
    // fails AAA ({!passes(7) && <li>...}); the explainer shrinks for #000000.
    // MUTATION 2: set VERDICTS.aaa.note back to ''; the verdict block shrinks for
    // #000000 and the note expectation goes red.
    test(`its height and the verdict block's height are the same for four pairs at ${vp.name}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, vp)
      watch(page, 'someone trying colours one after another')
      const seen = []
      for (const pair of PAIRS) {
        await setPair(page, pair.fg)
        await expect(page.locator('.cc-ratio-num')).toHaveText(pair.ratio)
        await expect(page.locator('.cc-ratio-verdict')).toHaveText(pair.head)
        // The note is always there, with this verdict's own words.
        await expect(page.locator('.cc-ratio-note')).toHaveText(pair.note)
        seen.push(await page.evaluate(() => {
          const h = (s) => document.querySelector(s).getBoundingClientRect().height
          return { explainer: h('.cc-explain'), note: h('.cc-note'), ratio: h('.cc-ratio'), noteLine: h('.cc-ratio-note') }
        }))
      }
      // POSITIVE CONTROL: all four were measured and each has real height, including
      // the AAA note that used to render nothing.
      expect(seen).toHaveLength(4)
      for (const s of seen) {
        expect(s.explainer, 'the explainer has height').toBeGreaterThan(40)
        expect(s.noteLine, 'the verdict note has height, even at AAA').toBeGreaterThan(10)
      }
      for (const key of ['explainer', 'note', 'ratio']) {
        const values = seen.map((s) => Math.round(s[key] * 10) / 10)
        expect(Math.max(...values) - Math.min(...values), `${key} height across the four pairs: ${values.join(', ')}`).toBeLessThanOrEqual(1)
      }
      await ctx.close()
    })
  }
})

test.describe('Contrast Checker · the result panel on a desktop', () => {
  // The panel is sticky with its own max-height, so it can scroll inside itself.
  // Whatever its content does, it must start unscrolled with the headline ratio
  // fully inside it. (Whether the panel needs to scroll at all is a separate
  // question: at 1440x800 it does, for every pair.)
  //
  // MUTATION: add `margin-top: -40px` to .cc .cc-ratio in contrast.css; the
  // numeral rises over the panel's top edge and the gap expectation goes red.
  for (const height of [900, 800]) {
    test(`the ratio numeral sits fully inside the panel, unscrolled, at 1440x${height}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width: 1440, height })
      watch(page, 'someone on a laptop')
      for (const pair of PAIRS) {
        await setPair(page, pair.fg)
        await expect(page.locator('.cc-ratio-num')).toHaveText(pair.ratio)
        const read = await page.evaluate(() => {
          const panel = document.querySelector('.cc-panel')
          const num = document.querySelector('.cc-ratio-num').getBoundingClientRect()
          const box = panel.getBoundingClientRect()
          return { scrollTop: panel.scrollTop, gap: Math.round(num.top - box.top), below: Math.round(box.bottom - num.bottom) }
        })
        expect(read.scrollTop, `${pair.fg}: the panel starts at the top`).toBe(0)
        expect(read.gap, `${pair.fg}: the numeral is below the panel's top edge`).toBeGreaterThanOrEqual(8)
        expect(read.below, `${pair.fg}: the numeral is above the panel's bottom edge`).toBeGreaterThan(0)
      }
      await ctx.close()
    })
  }
})

test.describe('Contrast Checker · the explainer on the narrowest phone', () => {
  // MUTATION: in contrast.css add `white-space: nowrap` to .cc .cc-explain; the
  // bullets run past 320 and both expectations go red.
  test('nothing in the explainer or the link runs past 320, and the page does not scroll sideways', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 320, height: 568, phone: true })
    watch(page, 'someone on the narrowest phone')
    const read = await page.evaluate(() => {
      const right = (sel) => [...document.querySelectorAll(sel)].map((el) => Math.round(el.getBoundingClientRect().right))
      return { vw: window.innerWidth, scrollW: document.documentElement.scrollWidth, explain: right('.cc-explain, .cc-explain li'), link: right('.cc-note-link') }
    })
    expect(read.vw).toBe(320)
    expect(read.explain.length, 'the explainer was found').toBe(4)
    expect(read.link).toHaveLength(1)
    expect(Math.max(...read.explain, ...read.link), 'right edges').toBeLessThanOrEqual(320)
    expect(read.scrollW, 'the page scrolls sideways').toBeLessThanOrEqual(320)
    await ctx.close()
  })
})
