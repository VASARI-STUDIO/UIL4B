// Component input classes must actually paint what they declare.
//
// WHY THIS SPEC EXISTS
// `input[type="text"]` is specificity (0,1,1). A component class like
// `.cc-hex-input` is (0,1,0). So for as long as both have existed, the global
// reset near the top of global.css BEAT every field component in the app, and
// each component's own font, padding, radius and background were dead letters.
//
// The failure mode is why it survived: both rules read as correct in isolation,
// so code review passes. Nothing overflows its box, so a geometry sweep passes.
// What actually shipped was DOUBLE-PAINTING — the reset's white rounded box
// drawn inside a control that already had its own chrome — plus wrong fonts and
// wrong sizes. Two instances were found and fixed one at a time (#320, the home
// hero search bar; #319, the colour picker's hue strip) before anyone noticed
// it was a bug class rather than two bugs.
//
// So these assertions are deliberately about COMPUTED style, not source text. A
// test that greps global.css for `font-family:var(--mono)` would have passed
// happily through every month this was broken: the declaration was always
// there, it just never applied. Only the rendered value can tell you.
//
// The fix is the `:where()` wrapper on the reset. If someone unwraps it, or
// adds a new bare `input[type=...]` rule beside it, these fail. The source-side
// guard against that is tests/unit/input-specificity.test.js.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const MONO = /JetBrains Mono/

// route, selector, what the component class asks for, and what the reset would
// have imposed instead — the second column is what these used to render as.
const FIELDS = [
  {
    route: '/create/contrast', sel: '.cc-hex-input', name: 'contrast checker hex field',
    want: { fontFamily: MONO, padding: '0px 12px', borderRadius: '10px' },
    wasWrongly: { fontFamily: 'Manrope', padding: '9px 14px', borderRadius: '12px' },
  },
  {
    route: '/create/tint', sel: '.tt-hex-input', name: 'tint tool hex field',
    want: { fontFamily: MONO, padding: '0px 14px', fontSize: '14px' },
    wasWrongly: { fontFamily: 'Manrope', padding: '9px 14px', fontSize: '13px' },
  },
  {
    route: '/create/palette', sel: '.plb-hexfield', name: 'palette builder hex field',
    want: { fontFamily: MONO, padding: '0px 10px' },
    wasWrongly: { fontFamily: 'Manrope', padding: '9px 14px' },
  },
  {
    route: '/create/font-pair', sel: '.fpr-input', name: 'font pair preview field',
    want: { padding: '0px 12px', borderRadius: '10px' },
    wasWrongly: { padding: '9px 14px', borderRadius: '12px' },
  },
]

// The two the reset was drawing a whole second box around. Both sit inside a
// control that already carries its own border and ground, which is why the
// component asks for neither — and why getting one looked like a bug in the
// layout rather than a bug in the cascade.
const BARE_FIELDS = [
  { route: '/create/gradient', sel: '.ggn-angle-input', name: 'gradient angle input' },
  { route: '/create/gradient', sel: '.ggn-stop-hex', name: 'gradient stop hex field' },
]

test.describe('component input classes outrank the type reset', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'designer typing into a tool field') })

  for (const f of FIELDS) {
    test(`${f.name} paints its own declarations, not the global reset`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await go(page, f.route)
      const el = page.locator(f.sel).first()
      await expect(el).toBeVisible()
      const got = await el.evaluate((node) => {
        const cs = getComputedStyle(node)
        return {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          padding: cs.padding,
          borderRadius: cs.borderRadius,
        }
      })
      for (const [prop, want] of Object.entries(f.want)) {
        if (want instanceof RegExp) expect(got[prop], `${f.sel} ${prop}`).toMatch(want)
        else expect(got[prop], `${f.sel} ${prop}`).toBe(want)
      }
      // And explicitly NOT the value the reset used to force on it, so this
      // test fails loudly if the :where() wrapper is ever removed.
      for (const [prop, wrong] of Object.entries(f.wasWrongly)) {
        expect(got[prop], `${f.sel} ${prop} regressed to the reset`).not.toBe(wrong)
      }
    })
  }

  for (const f of BARE_FIELDS) {
    test(`${f.name} draws no second box inside its own control`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await go(page, f.route)
      const el = page.locator(f.sel).first()
      await expect(el).toBeVisible()
      const painted = await el.evaluate((node) => {
        const cs = getComputedStyle(node)
        return {
          background: cs.backgroundColor,
          borderWidth: cs.borderTopWidth,
          fontFamily: cs.fontFamily,
        }
      })
      // `background:transparent;border:none` is what the class declares. The
      // reset was overriding both with a white 1px-bordered box.
      expect(painted.background, `${f.sel} background`).toBe('rgba(0, 0, 0, 0)')
      expect(painted.borderWidth, `${f.sel} border-width`).toBe('0px')
      expect(painted.fontFamily, `${f.sel} font-family`).toMatch(MONO)
    })
  }

  // The other half of the fix. Demoting the reset must NOT demote the mobile
  // 16px floor with it: iOS zooms the viewport when a focused field is under
  // 16px, so that one rule stays at element strength on purpose and still
  // outranks a component's own smaller size. The ≤640 block sets font-size at
  // (0,1,1) and padding inside :where() precisely so this holds.
  test('the 16px mobile floor still outranks every component class at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const [route, field] of [
      ['/create/contrast', '.cc-hex-input'],
      ['/create/tint', '.tt-hex-input'],
      ['/create/palette', '.plb-hexfield'],
    ]) {
      await go(page, route)
      // Wait for the surface to hydrate — an empty list would pass vacuously.
      await expect(page.locator(field).first()).toBeVisible()
      const sizes = await page.evaluate(() => [...document.querySelectorAll(
        'input[type="text"],input[type="number"],input[type="email"],input[type="password"]')]
        .filter(el => el.getBoundingClientRect().width > 0)
        .map(el => ({ cls: el.className, fs: parseFloat(getComputedStyle(el).fontSize) })))
      expect(sizes.length, `${route} has text inputs`).toBeGreaterThan(0)
      for (const s of sizes) {
        expect(s.fs, `${route} .${s.cls} would zoom iOS on focus`).toBeGreaterThanOrEqual(16)
      }
    }
  })
})
