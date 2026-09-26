// The header sweep, in a browser.
//
// #surface-headers-read-as-ai. The founder marked TWO elements of the Font
// Gallery header "AI" — the taxonomy eyebrow and the three-up figure strip —
// and wrote: "make sure to make that change to all the headers that match".
//
// #382 made the change on the Font Gallery, Font Pair and the shared Discover
// masthead. #386 found the Type Scale still carrying both. This file covers the
// pages neither reached, and pins the CORRECTION rather than the old shape, so
// the furniture cannot grow back.
//
// WHY IT IS NOT A GREP. Two of the four remaining eyebrows are not
// `.sec-h-eyebrow` at all — Semantic Colours uses `.stc-hero-eyebrow`, the
// Gradient Generator uses `.ggn-eyebrow` — and the two worst findings here were
// only visible by rendering and measuring:
//
//   - Font Pair's 01/02/03/04 panel badges READ RIGHT TO LEFT at 1440 (01 at
//     x=1087, 02 at x=79, on the same line at y=735), because `.fpr-grid` puts
//     the config rail in the right-hand column. Identical to what #386
//     measured on the Type Scale.
//   - The Tint Scale hero tablist declared `aria-controls="tt-audience-panel"`
//     for a panel 922px below it, while a second control for the same state sat
//     58px above that panel.
//
// EVERY ABSENCE HERE IS PAIRED WITH A PRESENCE. `toHaveCount(0)` is trivially
// true on a page that failed to render, so each test asserts the page's own h1
// and at least one real control alongside the things that must be gone.

import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// THE LOCAL WORKAROUND THAT USED TO LIVE HERE IS GONE, because the defect it
// worked around is fixed in the door itself.
//
// go() -> ready() used to wait for `#root` to have a child and `.page-loading`
// to be absent, and BOTH are true of the STATIC BOOT SHELL: index.html ships
// `<div id="root"><div class="boot-shell" id="boot-shell">` into every
// prerendered route shell, so `root.firstElementChild` was satisfied before
// React had run at all. Under four parallel workers this file caught
// /create/semantic-color in exactly that state once - h1 not found, and the
// accessibility snapshot reading `status: Loading UIL4B`, which is the boot
// shell's own live region. This spec answered it with a local
// `expect(page.locator('#boot-shell')).toHaveCount(0)` after every navigation
// and left the other twenty-odd specs exposed.
//
// `ready()` now requires the boot shell to be GONE, so plain `go()` carries the
// same guarantee for every spec in the suite. The contract is asserted in
// tests/user-sim/47-lazy-route-readiness.spec.js (rendered, with the entry
// bundle held back) and structurally in tests/unit/lazy-route-readiness.test.js.

// The taxonomy eyebrow, per page: the class it used, and the exact string it
// printed. Asserting the STRING as well as the class is what stops the motif
// coming back under a fifth class name.
const EYEBROWS = [
  { route: '/create/tint', cls: '.sec-h-eyebrow', text: 'Create / Colour', h1: 'Tint' },
  { route: '/create/semantic-color', cls: '.stc-hero-eyebrow', text: 'Create / Colour', h1: 'Semantic Colour' },
  { route: '/create/gradient', cls: '.ggn-eyebrow', text: 'Create / Colour', h1: 'Gradient' },
  { route: '/create/contrast', cls: '.sec-h-eyebrow', text: 'Colour', h1: 'Contrast Checker' },
  { route: '/create/aspect-ratio', cls: '.sec-h-eyebrow', text: 'Imagery', h1: 'Aspect & Resolution' },
  { route: '/create/alt-text', cls: '.sec-h-eyebrow', text: 'AI Tools', h1: 'Alt Text Generator' },
  { route: '/create/file-converter', cls: '.sec-h-eyebrow', text: 'File Converter', h1: 'File Converter' },
]

test.describe('no tool header restates the path the visitor walked', () => {
  for (const page_ of EYEBROWS) {
    test(`${page_.route} opens on its name, not on its taxonomy`, async ({ page }) => {
      watch(page, 'a visitor who used the nav to get here')
      await go(page, page_.route)

      // PRESENT: the page rendered and says what it is.
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible()
      await expect(heading).toContainText(page_.h1)

      // ABSENT: the eyebrow element, and the string it printed. The string
      // check is the one that matters — File Converter's eyebrow said exactly
      // what its h1 says, so a class-only check would let it return as a <p>.
      await expect(page.locator(`main ${page_.cls}, .sec ${page_.cls}`)).toHaveCount(0)

      const above = await page.evaluate((text) => {
        const h1 = document.querySelector('h1')
        if (!h1) return { error: 'no h1' }
        const h1Top = h1.getBoundingClientRect().top + window.scrollY
        const offenders = []
        for (const el of document.querySelectorAll('body *')) {
          // The h1 itself is the name, not an eyebrow — a toolbar label that
          // IS the h1 has no child element to skip it by.
          if (el === h1 || el.closest('nav') || el.closest('.pnav') || el.children.length) continue
          if ((el.textContent || '').trim() !== text) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          const y = r.top + window.scrollY
          // Only what sits in the masthead band, above or level with the h1.
          if (y <= h1Top + 4) offenders.push({ y: Math.round(y), cls: String(el.className) })
        }
        return { h1Top: Math.round(h1Top), offenders }
      }, page_.text)

      expect(above.error, 'the page did not render an h1').toBeUndefined()
      expect(above.offenders, `"${page_.text}" is still stated above the h1`).toEqual([])
    })
  }
})

// ── The figure strips ───────────────────────────────────────────────────────
//
// Four four-up strips, one per page, each a wider copy of the three-up the
// founder marked. The reasoning for every individual figure is in the comment
// beside the markup that carried it. What is asserted here is the shape: no
// band of equal-weight figures in the masthead, and the facts that DID earn
// their place still on the page.
const STRIPS = [
  {
    route: '/create/tint', cls: '.tt-status', h1: 'Tint',
    // The step count now lives only on the control that sets it: the drawn
    // "11 steps" pill (D:840).
    survives: '11 steps',
  },
  {
    route: '/create/gradient', cls: '.ggn-status', h1: 'Gradient',
    // The stop count now lives where the design draws it: beside Copy CSS in
    // the tool toolbar ("3 stops", D:616). It is the one statement of it.
    survives: '3 stops',
  },
  {
    route: '/create/semantic-color', cls: '.stc-status', h1: 'Semantic Colour',
    // 50 was "canonical variables" in the strip. On the button it is the size
    // of what is about to reach your clipboard.
    survives: 'Copy tokens',
  },
  {
    route: '/create/font-pair', cls: '.fpr-status', h1: 'Font Pair',
    // `.fpr-hero-pair` — the readout #382 kept, and which this strip duplicated
    // 350px lower. It is now true that it is the only statement of the pair.
    survives: 'Inter',
  },
]

test.describe('no tool header counts what the page already shows', () => {
  for (const s of STRIPS) {
    test(`${s.route} carries no figure strip, and keeps the facts that earned their place`, async ({ page }) => {
      watch(page, 'the founder re-reading a header he marked AI')
      await go(page, s.route)

      // PRESENT.
      await expect(page.getByRole('heading', { level: 1 })).toContainText(s.h1)
      await expect(page.getByText(s.survives, { exact: false }).first()).toBeVisible()

      // ABSENT.
      await expect(page.locator(s.cls)).toHaveCount(0)

      // And no replacement of the same shape: nothing in the top third of the
      // page may be a row of three or more equal-weight figure cells. This is
      // what catches the motif returning under a new class name.
      const bands = await page.evaluate(() => {
        const found = []
        for (const el of document.querySelectorAll('body *')) {
          const kids = [...el.children]
          if (kids.length < 3 || kids.length > 6) continue
          const r = el.getBoundingClientRect()
          if (r.width < 600 || r.height === 0 || r.height > 90) continue
          if (r.top + window.scrollY > 700) continue
          if (el.closest('nav') || el.closest('.pnav')) continue
          // A figure cell is a short label wrapping one <strong> value.
          const cells = kids.filter((k) => {
            const t = (k.textContent || '').trim()
            return k.querySelector('strong') && t.length > 0 && t.length < 40
          })
          if (cells.length === kids.length) {
            found.push({ cls: String(el.className), text: (el.textContent || '').trim().slice(0, 90) })
          }
        }
        return found
      })
      expect(bands, 'a figure strip has grown back in the masthead').toEqual([])
    })
  }
})

// ── The two findings that only a rendered page shows ────────────────────────

test('Font Pair numbers no panels, because at 1440 the numbers ran backwards', async ({ page }) => {
  watch(page, 'a designer reading the page in the order it is laid out')
  await go(page, '/create/font-pair')

  // PRESENT: the output's sections are named in words. The controls are the
  // side panel, an <aside> named by its label rather than a visible head.
  const headings = page.locator('.fpr-section-head h2')
  await expect(headings).toHaveCount(2)
  await expect(headings.nth(0)).toContainText('Body faces that work under')
  await expect(headings.nth(1)).toHaveText('Prepare the handoff')
  await expect(page.getByRole('complementary', { name: 'Font Pair controls' })).toBeVisible()

  // The specimen's sr-only h2 still names its region.
  const named = page.locator('h2#fpr-output-title')
  await expect(named).toHaveText('Read the pairing')
  await expect(page.locator('section[aria-labelledby="fpr-output-title"]')).toHaveCount(1)

  // ABSENT: the badges.
  await expect(page.locator('.fpr-section-num')).toHaveCount(0)

  // Nothing in a section head may be a bare two-digit ordinal, and the
  // condition that made numbering wrong still holds: at 1440 the controls sit
  // to the RIGHT of the output, so an ascending number on "panel one" would
  // read against the page.
  const geometry = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('.fpr-section-head')]
    const panel = document.querySelector('.fpr-config')
    const main = document.querySelector('.fpr-output')
    return {
      ordinals: heads.flatMap((h) => [...h.querySelectorAll('span')]
        .map((x) => (x.textContent || '').trim())
        .filter((t) => /^\d{1,2}$/.test(t))),
      panelX: panel ? Math.round(panel.getBoundingClientRect().left) : null,
      mainX: main ? Math.round(main.getBoundingClientRect().left) : null,
    }
  })
  expect(geometry.ordinals, 'a panel ordinal has come back').toEqual([])
  expect(geometry.panelX, 'the controls did not render').not.toBeNull()
  expect(geometry.panelX, 'the controls have moved to the left column').toBeGreaterThan(geometry.mainX)
})

// Not tested: 'the Tint Scale audience switch is the one next to the
// panel it changes'. The designer/developer switch and both of its panels went
// with the rebuild to the design's drawn Tint screen, which has
// one output — the scale — and one export, "Copy variables" in its toolbar.
