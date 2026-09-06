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
  { route: '/create/tint', cls: '.sec-h-eyebrow', text: 'Create / Colour', h1: 'Tint Scale Generator' },
  { route: '/create/semantic-color', cls: '.stc-hero-eyebrow', text: 'Create / Colour', h1: 'Semantic Colours' },
  { route: '/create/gradient', cls: '.ggn-eyebrow', text: 'Create / Colour', h1: 'Gradient Generator' },
  { route: '/create/contrast', cls: '.sec-h-eyebrow', text: 'Colour', h1: 'Colour Contrast Checker' },
  { route: '/create/aspect-ratio', cls: '.sec-h-eyebrow', text: 'Imagery', h1: 'Aspect & Resolution Calculator' },
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
          if (el.closest('nav') || el.closest('.pnav') || el.children.length) continue
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
    route: '/create/tint', cls: '.tt-status', h1: 'Tint Scale Generator',
    // The stops figure was restated verbatim 520px below by `.tt-hint`. That
    // hint is the survivor, and it is where the number belongs.
    survives: '11 stops per ramp.',
  },
  {
    route: '/create/gradient', cls: '.ggn-status', h1: 'Gradient Generator',
    // `.ggn-badge` said "3/12 stops" 45px below the strip and is strictly
    // better than the strip's "3 editable stops": it also carries the limit.
    survives: '3/12 stops',
  },
  {
    route: '/create/semantic-color', cls: '.stc-status', h1: 'Semantic Colours',
    // 50 was "canonical variables" in the strip. On the button it is the size
    // of what is about to reach your clipboard.
    survives: 'Copy all CSS variables',
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

  // PRESENT: the four panels still exist and are still named, in words. The
  // headings are the ordering now, and they say what the numbers only implied.
  const headings = page.locator('.fpr-section-head h2')
  await expect(headings).toHaveCount(4)
  await expect(headings.nth(0)).toHaveText('Choose the pair')
  await expect(headings.nth(1)).toHaveText('Read the pairing')
  await expect(headings.nth(3)).toHaveText('Prepare the handoff')

  // ABSENT: the badges.
  await expect(page.locator('.fpr-section-num')).toHaveCount(0)

  // And the reason. Nothing in a panel head may be a bare two-digit ordinal —
  // which is what "01" was, and what would come back if someone re-added it in
  // a <span> with a different class. The x-order below is the measurement that
  // condemned them: at 1440 the first panel head sits to the RIGHT of the
  // second, so any ascending numbering on them reads against the page.
  const geometry = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('.fpr-section-head')]
    return {
      ordinals: heads.flatMap((h) => [...h.querySelectorAll('span')]
        .map((s) => (s.textContent || '').trim())
        .filter((t) => /^\d{1,2}$/.test(t))),
      xs: heads.map((h) => Math.round(h.getBoundingClientRect().left)),
      ys: heads.map((h) => Math.round(h.getBoundingClientRect().top + window.scrollY)),
    }
  })
  expect(geometry.ordinals, 'a panel ordinal has come back').toEqual([])
  // The condition that made numbering wrong is still true — this is why the
  // fix was to delete rather than to renumber. If the grid is ever changed so
  // that panel 1 leads on the x axis, this assertion fails and the decision
  // can be revisited on purpose rather than by accident.
  expect(geometry.xs[0], 'the config rail has moved to the left column')
    .toBeGreaterThan(geometry.xs[1])
  expect(geometry.ys[0], 'the first two panel heads are no longer on one line')
    .toBe(geometry.ys[1])
})

test('the Tint Scale audience switch is the one next to the panel it changes', async ({ page }) => {
  watch(page, 'a developer switching to the handoff view')
  await go(page, '/create/tint')

  // ABSENT: the hero pair of cards. It was 1348x118px of the masthead.
  await expect(page.locator('.tt-audience')).toHaveCount(0)
  await expect(page.getByText('For designers', { exact: true })).toHaveCount(0)

  // PRESENT, and it is a real tablist now rather than a pair of aria-pressed
  // buttons — the ARIA the hero cards used to claim moved onto the control
  // that is actually adjacent to the panel.
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(2)

  const panel = page.locator('#tt-audience-panel')
  await expect(panel).toBeVisible()
  await expect(panel).toHaveAttribute('aria-labelledby', 'tt-tab-designer')

  // THE WIRING, not the helper: pressing the tab must change the panel, and the
  // panel must say which tab labels it. Reverting the promotion — putting the
  // roving tabindex and the ids back on the hero cards — fails here.
  const dev = page.getByRole('tab', { name: 'Developer handoff' })
  await dev.click()
  await expect(dev).toHaveAttribute('aria-selected', 'true')
  await expect(panel).toHaveAttribute('aria-labelledby', 'tt-tab-developer')
  await expect(page.getByRole('heading', { name: 'Prepare the handoff' })).toBeVisible()

  // Arrow keys, which the hero cards advertised and which had to move with the
  // role. Focus must land on the tab, not be lost.
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Design preview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator(':focus')).toHaveAttribute('id', 'tt-tab-designer')

  // The measurement that made the hero pair wrong: its panel was 922px below
  // it. The survivor must stay within one screen of what it changes.
  const gap = await page.evaluate(() => {
    const sw = document.querySelector('.tt-view-switch').getBoundingClientRect()
    const pn = document.querySelector('#tt-audience-panel').getBoundingClientRect()
    return Math.round(pn.top - sw.bottom)
  })
  expect(gap, 'the audience switch has drifted away from its panel').toBeLessThan(200)
})
