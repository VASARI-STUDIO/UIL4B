// Every control in the shell and on the sales surfaces is at least 24x24.
//
// WCAG 2.2 AA 2.5.8 (Target Size, Minimum). The 2026-09-06 breakpoint sweep
// measured this across thirteen surfaces at twenty widths from 320 to 1920 and
// found the SAME four controls under the minimum in 260 of 260 cells:
//
//   .app-footer-note   "About this project"   109.8 x 21.4   every surface, every width
//   .app-footer-links a  the footer nav        94.8 x 21.4   every surface, every width
//   .app-footer-start  "Start with colour"     133 x 23.1    every surface, every width
//   .seo-seg button    Desktop / Mobile      67.6/59.1 x 21  /seo, every width
//   .plb-hex           copy-a-hex             67.5 x 21      /, 320 through 768
//
// The footer three are the shell, so they were on every page in the product.
//
// THE TWO EXCEPTIONS IN THE SUCCESS CRITERION ARE IMPLEMENTED HERE, because a
// check that ignores them reports conforming controls as defects and gets
// switched off. `.app-footer-attrib` ("Dylan Coleman", inside the sentence
// "Built in Brisbane by …") is 94.7x18 and legitimately exempt under Inline;
// asserting on it would have forced a pointless change to a link that is fine.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture, and tests/unit/one-tap-stub.test.js
// fails the build for any spec that reaches past it.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'

const PERSONA = 'someone using this on a phone, pressing with a thumb'

// The widths each fixed control was measured failing at, not a round-number
// selection: 320 is where `.plb-hex` is trimmed hardest, 768 is the last width
// the narrow rule applies at, 1440 is the founder's desktop.
const CASES = [
  { route: '/', widths: [320, 390, 768, 1440] },
  { route: '/seo', widths: [390, 662, 1440] },
  { route: '/privacy', widths: [390, 1440] },
  { route: '/plans', widths: [390, 1440] },
]

const MIN = 24

// Returns { examined, tooSmall[] } for the CURRENT viewport.
function measureTargets(min) {
  const shown = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false
    return el.getClientRects().length > 0
  }
  // WCAG 2.5.8 "Inline": the target is in a sentence, or its size is otherwise
  // constrained by the line-height of non-target text.
  //
  // THE PARENT-HAS-MORE-TEXT TEST ALONE IS TOO GENEROUS, and it excused a real
  // defect for a day. It was read as "the containing block holds meaningfully
  // more text than the link itself", which is true of ANY link that shares a
  // parent with other content - including a block-level card heading link.
  // Measured 2026-09-15 on the built preview: the six `.htool-head` links on
  // the homepage are 22.8px tall (23.3 on the Soon card) at 320, 390, 768 and
  // 1440, every one of them display:flex, and every one of them exempted here
  // because its <li> also holds a description and a row of tool pills. 23
  // failing measurements across the four widths, silently waived.
  //
  // The criterion says the size must be CONSTRAINED BY LINE-HEIGHT, and only an
  // inline-level box is. A flex or block link sets its own height, so if it is
  // under 24px that is a decision, not a constraint. Requiring inline-level
  // display is therefore the criterion rather than a proxy for it.
  //
  // Measured on the same run, this narrows the exemption and nothing else: the
  // 16 genuinely inline waivers all survive - `.app-footer-attrib` on every
  // surface, and the prose links on /privacy (privacy@uil4b.com, oaic.gov.au,
  // "Settings -> Your data") - while all 23 block-level ones are now reported.
  const inlineInSentence = (el) => {
    if (el.tagName !== 'A') return false
    // An inline-level box takes its height from the line box it sits in; a
    // block, flex or grid box sets its own and cannot claim the exception.
    if (!getComputedStyle(el).display.startsWith('inline')) return false
    const p = el.parentElement
    if (!p) return false
    return (p.innerText || '').trim().length > (el.innerText || '').trim().length + 3
  }
  const out = { examined: 0, tooSmall: [] }
  for (const el of document.querySelectorAll('a[href], button, [role=button], [role=tab], select, summary')) {
    if (!shown(el) || el.disabled) continue
    // A control that cannot be pressed right now is not a target to size.
    // `.pnav-cta` mounts `.is-waiting` on sales routes — a deliberate 0fr grid
    // collapse that eases open once the visitor reaches the workbench — and it
    // carries `pointer-events:none` while it does. Measuring it mid-entrance
    // reported the nav's primary CTA as a 5.8px control; it settles at 126x40.
    if (getComputedStyle(el).pointerEvents === 'none') continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    out.examined++
    if (r.width >= min && r.height >= min) continue
    if (inlineInSentence(el)) continue
    const cls = (el.className || '').toString().trim().split(/\s+/).slice(0, 3).join('.')
    const txt = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)
    out.tooSmall.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${txt}" = ${r.width.toFixed(1)}x${r.height.toFixed(1)}`)
  }
  return out
}

test.describe('no control in the shell or on a sales surface is under 24x24', () => {
  for (const { route, widths } of CASES) {
    test(`${route} keeps every target at 24px or more`, async ({ page }) => {
      watch(page, PERSONA)
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 })
        await go(page, route)
        await expectRendered(page)
        // The footer is the surface three of the five fixed controls live on,
        // and it is below the fold on every one of these routes.
        await page.evaluate(() => document.querySelector('.app-footer')?.scrollIntoView({ block: 'end', behavior: 'instant' }))
        // Settle on GEOMETRY, and include the nav's animated CTA pill in the
        // key: the document stops growing long before that pill finishes its
        // entrance, so a document-only settle returns while it is still 5.8px
        // wide and reports the bar's primary control as a target-size failure.
        await page.waitForFunction(() => {
          const de = document.scrollingElement || document.documentElement
          const cta = document.querySelector('.pnav-cta')
          const k = [
            de.scrollHeight,
            Math.round(window.scrollY),
            cta ? Math.round(cta.getBoundingClientRect().width * 10) : 'x',
          ].join('|')
          window.__s = window.__s || []
          window.__s.push(k)
          if (window.__s.length > 6) window.__s.shift()
          return window.__s.length === 6 && new Set(window.__s).size === 1
        }, null, { timeout: 10000, polling: 'raf' }).catch(() => {})
        await page.evaluate(() => { window.__s = null })

        const { examined, tooSmall } = await page.evaluate(measureTargets, MIN)

        // Positive control. `tooSmall.length === 0` is trivially true on a page
        // that rendered nothing, which is exactly the shape of assertion this
        // repo has been burned by.
        expect(examined, `${route} at ${width}px exposed almost no controls — the assertion below would pass vacuously`)
          .toBeGreaterThan(10)

        expect(
          tooSmall,
          `${route} at ${width}px has ${tooSmall.length} control(s) under ${MIN}x${MIN} (WCAG 2.2 AA 2.5.8):\n  ${tooSmall.join('\n  ')}`,
        ).toEqual([])
      }
    })
  }

  test('the footer controls the sweep found are present and measurably over the floor', async ({ page }) => {
    // The test above is an ABSENCE, so it also passes on a footer that stopped
    // rendering these controls at all. This one names them and reads their
    // real heights, so the guard cannot be satisfied by deletion.
    watch(page, PERSONA)
    await page.setViewportSize({ width: 390, height: 900 })
    await go(page, '/privacy')
    await expectRendered(page)
    await page.evaluate(() => document.querySelector('.app-footer')?.scrollIntoView({ block: 'end', behavior: 'instant' }))

    const heights = await page.evaluate(() => {
      const read = (sel) => {
        const el = document.querySelector(sel)
        return el ? Number(el.getBoundingClientRect().height.toFixed(1)) : null
      }
      return {
        note: read('.app-footer-note'),
        start: read('.app-footer-start'),
        link: read('.app-footer-links a'),
      }
    })

    for (const [name, h] of Object.entries(heights)) {
      expect(h, `the footer's "${name}" control is not on the page at all`).not.toBeNull()
      expect(h, `the footer's "${name}" control is ${h}px tall, under the ${MIN}px minimum`).toBeGreaterThanOrEqual(MIN)
    }
  })
})
