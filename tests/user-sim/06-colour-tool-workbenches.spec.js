// Adversarial acceptance coverage for the Gradient and Semantic Colour tools.
// These flows deliberately use invalid values, repeated actions, keyboard-only
// adjustments, and narrow screens so the workbenches fail safely under pressure.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { normalizeClipboardText } from '../../src/hooks/useClipboard.js'

test.describe('Gradient Generator workbench resilience', () => {
  test('a developer can refine stops without invalid input corrupting the gradient', async ({ page }) => {
    watch(page, 'front-end developer')
    await go(page, '/create/gradient')

    await expect(page.getByRole('heading', { level: 1, name: 'Gradient Generator' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Shape the gradient' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Refine & export' })).toBeVisible()

    const firstHex = page.getByRole('textbox', { name: 'Stop 1 hex' })
    await expect(firstHex).toHaveValue('#7C3AED')
    await firstHex.fill('#NOTHEX')
    await expect(firstHex).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Use a 6-digit hex')).toBeVisible()
    await firstHex.press('Enter')
    await expect(firstHex).toHaveValue('#7C3AED')

    const position = page.getByRole('spinbutton', { name: 'Stop 1 position' })
    await position.fill('')
    await position.blur()
    await expect(position).toHaveValue('0')

    const handle = page.getByRole('button', { name: /Gradient stop 1 at 0%/ })
    await handle.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect(page.getByRole('spinbutton', { name: 'Stop 1 position' })).toHaveValue('10')

    await page.screenshot({
      path: test.info().outputPath('gradient-workbench-desktop.png'),
      fullPage: true,
    })
  })

  test('locked stops survive repeated randomise actions and stop count is bounded', async ({ page }) => {
    watch(page, 'product designer')
    await go(page, '/create/gradient')

    await page.getByRole('textbox', { name: 'Stop 1 hex' }).fill('#123456')
    const firstLock = page.getByRole('button', { name: /Lock stop 1 colour/ })
    await firstLock.click()
    await expect(page.getByRole('button', { name: /Stop 1 locked/ })).toHaveAttribute('aria-pressed', 'true')

    const random = page.getByRole('button', { name: /^Random$/ })
    await random.click()
    await random.click()
    await random.click()
    await expect(page.getByRole('textbox', { name: 'Stop 1 hex' })).toHaveValue('#123456')

    const add = page.getByRole('button', { name: /Add Stop/ })
    while (await add.isEnabled()) await add.click()
    await expect(page.locator('.ggn-stop')).toHaveCount(12)
    await expect(add).toBeDisabled()
  })

  test('clipboard denial is recoverable and the mobile canvas stays contained', async ({ page }) => {
    watch(page, 'mobile developer')
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')) },
      })
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/gradient')

    await page.getByRole('button', { name: 'Copy', exact: true }).click()
    await expect(page.getByText(/Failed to copy|Copy failed/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible()
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow, 'Gradient Generator should not create page-level horizontal overflow').toBe(false)
  })

  test('clipboard handling rejects invalid payloads and survives a missing browser API', async ({ page }) => {
    watch(page, 'developer on a restricted browser')
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      })
    })
    await go(page, '/create/gradient')

    const normalized = [
      normalizeClipboardText('  #ABCDEF  '),
      normalizeClipboardText(42),
      normalizeClipboardText({ unsafe: true }),
      normalizeClipboardText(null),
    ]
    expect(normalized).toEqual(['#ABCDEF', '42', '', ''])

    await page.getByRole('button', { name: 'Copy', exact: true }).click()
    await expect(page.getByText('Clipboard is not available in this browser')).toBeVisible()
  })

  // The page used to end with a numbered step called "03 - Starting points /
  // Begin with colours you trust", BELOW the canvas and the inspector - so it
  // told you where to begin after you had already composed and exported. For
  // anyone without a saved palette that whole numbered step rendered a single
  // apology in a full-height card, and a second card beside it made the same
  // offer with the curated rail.
  //
  // There are two real steps here. This asserts the numbered sequence is exactly
  // those two and has no gap, which is the part that silently regresses when a
  // section is added back.
  test('the numbered steps are the two the page actually has, and the sources are not one of them', async ({ page }) => {
    watch(page, 'a designer arriving with no saved palette')
    await go(page, '/create/gradient')

    // The tool is lazy-loaded; read the sequence only once it has mounted.
    await expect(page.getByRole('heading', { level: 1, name: 'Gradient Generator' })).toBeVisible()
    await expect(page.locator('.ggn-step').first()).toBeVisible()

    const steps = await page.locator('.ggn-step').allTextContents()
    expect(steps.map(t => t.trim())).toEqual(['01 · Canvas', '02 · Inspector'])

    // The sources block is present, unnumbered, and never empty: the curated
    // rail is always populated even when the user has no palettes.
    const start = page.locator('.ggn-starting')
    await expect(start).toBeVisible()
    await expect(start.locator('.ggn-step')).toHaveCount(0)
    await expect(start.locator('.ggn-preset').first()).toBeVisible()
    await expect(start.getByRole('link', { name: /Gradient Library/ })).toBeVisible()
  })
})

test.describe('Semantic Colour system workflow', () => {
  test('a designer can choose a bundle and evaluate non-colour state cues', async ({ page }) => {
    watch(page, 'product designer')
    await go(page, '/create/semantic-color')

    await expect(page.getByRole('heading', { level: 1, name: 'Semantic Colours' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Balanced/ })).toHaveAttribute('aria-checked', 'true')
    const vividBundle = page.getByRole('radio', { name: /Vivid/ })
    await vividBundle.click()
    await expect(vividBundle).toHaveAttribute('aria-checked', 'true')
    await vividBundle.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: /Cool/ })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(vividBundle).toBeFocused()

    await expect(page.getByText('Light interface')).toBeVisible()
    await expect(page.getByText('Dark interface')).toBeVisible()
    await expect(page.locator('.stc-code')).toContainText('--color-success-50:')
    await expect(page.locator('.stc-code')).toContainText('--color-info-900:')
    // The fifth role. Its ramp exports on the same contract as the other four.
    await expect(page.locator('.stc-code')).toContainText('--color-pending-900:')

    const successRole = page.locator('.stc-role').first()
    await successRole.getByRole('button', { name: 'Custom' }).click()
    const successHex = page.getByRole('textbox', { name: 'Import a hex colour for success' })
    await successHex.fill('bad')
    await successHex.press('Enter')
    await expect(page.getByText(/Enter a six-digit hex colour/)).toBeVisible()
    await successHex.fill('#16A34A')
    await successHex.press('Enter')
    await expect(successHex).toHaveValue('')

    await page.screenshot({
      path: test.info().outputPath('semantic-colours-desktop.png'),
      fullPage: true,
    })
  })

  // The founder asked for the Semantic Colour HERO specifically (2026-09-03),
  // and then marked the two motifs it had been given "AI"
  // (#surface-headers-read-as-ai). This test used to assert both of them:
  // `.stc-hero-eyebrow` reading "Create / Colour", and the four cells of
  // `.stc-status`. Both are now deleted, so it pins the CORRECTED shape.
  //
  // THE OLD STRIP ASSERTIONS WERE WEAK, WHICH IS PART OF WHY THE STRIP WENT.
  // `facts.nth(1)).toContainText('5')` passed on any cell containing the digit
  // 5 - including the cell that said 50 - and `stateRoleIds`, `STATE_LABELS`
  // and their product are module constants, so three of the four could not
  // change however the tool was rewired. Only the bundle name was live, and
  // the selected bundle CARD 47px below it said the same word.
  //
  // So the replacement for "the strip is live" is the card and the radio
  // state, which is the actual wiring: `selected` is computed by comparing
  // `stateColors` against `bundle.config`, so breaking the onClick that sets
  // `stateColors` turns this red. It is also two-sided - the old bundle must
  // give up its selection, which the single-cell assertion never checked.
  test('the Semantic Colours hero states its name and its action, and counts nothing', async ({ page }) => {
    watch(page, 'a designer landing on the semantic tool')
    await go(page, '/create/semantic-color')

    const hero = page.locator('.stc-hero')
    await expect(hero).toBeVisible()
    await expect(hero.getByRole('heading', { level: 1, name: 'Semantic Colours' })).toBeVisible()
    // The action belongs to the hero, the way Gradient's Random/Reset do.
    await expect(hero.getByRole('button', { name: 'Copy all CSS variables' })).toBeVisible()

    // The two motifs the founder marked.
    await expect(hero.locator('.stc-hero-eyebrow')).toHaveCount(0)
    await expect(page.getByText('Create / Colour', { exact: true })).toHaveCount(0)
    await expect(page.locator('.stc-status')).toHaveCount(0)

    // 50 SURVIVES, on the control it is about to act on. This is the figure
    // that is NOT furniture: it is the size of what reaches the clipboard,
    // and the copy it replaced typed "40" as a literal.
    await expect(page.getByRole('button', { name: 'Copy 50 CSS variables' })).toBeVisible()

    // Choosing another bundle moves the selection - on the cards, which are
    // where a person chooses and where the answer was always visible.
    const balanced = page.getByRole('radio', { name: /Balanced/ })
    const tailwind = page.getByRole('radio', { name: /Tailwind/ })
    await expect(balanced).toHaveAttribute('aria-checked', 'true')
    await tailwind.click()
    await expect(tailwind).toHaveAttribute('aria-checked', 'true')
    await expect(balanced).toHaveAttribute('aria-checked', 'false')
    await expect(tailwind).toContainText('Selected')
  })

  // The three onward-navigation blocks this page used to end with offered
  // overlapping destinations: "Next in the workflow" listed contrast, tint and
  // palette, all three of which the "More colour tools" footer ~200px below it
  // already offered alongside gradient. One choice, asked twice.
  test('the page offers each sibling colour tool exactly once on the way out', async ({ page }) => {
    watch(page, 'a designer deciding where to go next')
    await go(page, '/create/semantic-color')

    /* SCOPED TO <main>, WHICH IS WHAT "THIS PAGE" MEANS.
     *
     * This counted document-wide and passed for a year because the shared app
     * footer's two colour links pointed at '/create/color' — a different href
     * from anything the page itself offered. Deleting the colour landing made
     * categoryDestination('colour') resolve to '/create/palette', so the
     * footer's "Start with colour" CTA and its "Colour systems" list item
     * started colliding with the page's own Palette card and the count went to
     * three, on a page whose onward-navigation block is still correct.
     *
     * The app footer renders on every route and is not "the way out of THIS
     * page", so it is out of scope. Its own two links sharing a destination is
     * a CTA and a nav item agreeing, which is ordinary; 07 owns the footer. */
    const main = page.locator('main')
    for (const route of ['/create/contrast', '/create/tint', '/create/palette', '/create/gradient']) {
      await expect(
        main.locator(`a[href="${route}"]`),
        `${route} should be offered exactly once on the way out of this page`,
      ).toHaveCount(1)
    }
    // The sequencing advice the removed block carried is kept.
    await expect(page.locator('.cs-tools-footer-lead')).toContainText('Validate the states')
  })

  test('the semantic editor and handoff remain contained on a narrow screen', async ({ page }) => {
    watch(page, 'mobile product designer')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/semantic-color')

    await expect(page.getByRole('radio', { name: /Balanced/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Canonical, predictable token names' })).toBeVisible()
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow, 'Semantic Colours should not create page-level horizontal overflow').toBe(false)
    await page.screenshot({
      path: test.info().outputPath('semantic-colours-mobile.png'),
      fullPage: true,
    })
  })
})

// ── The Contrast Checker has to pass its own test ────────────────────────────
// Found during the 2026-09-03 five-surface review, and it is the worst place in
// the product for this defect to live. Measured on the white card in light
// theme, against the 4.5:1 that this page exists to enforce:
//
//     .cc-ratio-verdict.cc-mixed  "Passes some checks"  2.94:1   <- the verdict
//     .cc-check-mark  (pass glyph)                      2.70:1
//     .cc-check-mark  (fail glyph)                      3.43:1
//
// All three were hard-coded hexes rather than the project's --ok/--warn/--err,
// so they never responded to the theme either - and the fail red measured
// 3.97:1 on the dark card, failing there too. BOTH THEMES are asserted here for
// that reason: fixing only the one you happened to screenshot is how this
// returns.
//
// The check is computed the way the page itself computes it (WCAG relative
// luminance), against the nearest opaque ancestor background, so it measures
// what is painted rather than what the stylesheet says.
//
// `.cc-field-badge`, `.cc-check-foot` and `.cc-level-opt` joined with the LEFT
// panel overhaul, and `.cc-check-name` finally started matching something. That
// selector has been in this list since the sweep was written and no element has
// ever carried it — the class was `.cc-check-label` — so the check text on the
// page that enforces contrast was the one thing this sweep never measured. The
// OR-list is what hid it: five other selectors kept the positive control above
// its floor, so the count could never fall to zero and give it away. The lesson
// is on the count itself — a floor over a UNION cannot prove each member
// contributed.
//
// `.cc-verdict` and `.cc-lede` joined the set with the preview overhaul
// [contrast-checker-overhaul]. The chips are the interesting addition: they are
// the only text on the page that SITS on the user's chosen background, and a
// chip that painted with the pair would go unreadable at exactly the ratios
// this page exists to warn about.
//
// THIS TEST ALONE DOES NOT HOLD THEM TO THAT, and the distinction was found by
// mutation rather than by reasoning. Repointing .cc-verdict at var(--cc-bg)
// still PASSES here, because the page loads at #6B7280 on #FFFFFF — 4.83:1,
// which clears AA. Measuring the default pair can only ever prove the chip is
// legible when the pair is already fine. The failing-pair test below is the one
// that catches it; this one covers the page's resting state.
test.describe('The Contrast Checker meets the standard it enforces', () => {
  for (const theme of ['light', 'dark']) {
    test(`its own verdict and check text passes AA in ${theme} theme`, async ({ browser }) => {
      // THE THEME IS ESTABLISHED BEFORE THE FIRST PAINT, not stamped afterwards.
      //
      // This used to `go()` and then setAttribute('data-theme', theme). The
      // tokens on :root do change at once - `--card-grad` reads #191a1d
      // immediately - but `.card` carries `transition: all .2s`, so its
      // BACKGROUND is still the previous theme's for 200ms. Reading a value
      // that is mid-transition at whatever instant the test arrives is the same
      // mistake helpers.js argues against at length for Lenis, and it is a
      // measurement bug rather than a page bug.
      //
      // It only became visible once `go()` started waiting for the lazy route:
      // before that this ran early enough that the verdict had not been
      // computed yet and the ink under measurement was a different colour. With
      // the real verdict on screen it reported the dark-theme amber
      // rgb(250,204,21) on a white card at 1.53:1 - a combination no user is
      // ever in. MEASURED: seeded, the same card is rgb(25,26,29) and the same
      // amber is 11.3:1.
      //
      // Seeding vs-t before navigation is also what actually puts React in the
      // theme, and it means there is no transition in flight to read through.
      const ctx = await browser.newContext({ colorScheme: theme })
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      watch(page, 'an accessibility reviewer auditing the auditor')
      await go(page, '/create/contrast')
      await expect(page.locator('.cc-ratio-verdict')).toBeVisible()

      const failures = await page.evaluate(() => {
        const lum = ([r, g, b]) => {
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        // Handles BOTH computed colour forms. color-mix() computes to
        // `color(srgb r g b)` in Chromium, whose components are 0..1 - a parser
        // that scrapes numbers and treats them as 0..255 turns any such ground
        // into near-black and reports a flattering ratio against it. Nothing on
        // this page paints one today; it is written this way because the
        // rgba-only version of exactly this parser is a defect the suite has
        // already shipped once.
        const parse = (c) => {
          const n = (c.match(/[\d.]+/g) || []).map(Number)
          if (n.length < 3) return []
          return /^color\(srgb/.test(c)
            ? [n[0] * 255, n[1] * 255, n[2] * 255, n.length > 3 ? n[3] : undefined]
            : n.slice(0, 4)
        }
        // The walk INCLUDES <html>, which it used to stop one element short of.
        // Every element here happens to sit on an opaque .card, so nothing on
        // this page reaches the fallback today - but a constant white default
        // is wrong in dark theme, and a walk that cannot see the one element
        // that always carries the theme background is the wrong shape.
        const bgOf = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor)
            if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return c.slice(0, 3)
          }
          return [255, 255, 255]
        }
        const out = []
        for (const el of document.querySelectorAll('.cc-ratio-verdict, .cc-check-mark, .cc-check-name, .cc-check-foot, .cc-fix-desc, .cc-verdict, .cc-lede, .cc-field-badge, .cc-level-opt')) {
          const cs = getComputedStyle(el)
          const bg = bgOf(el)
          const raw = parse(cs.color)
          const a = raw[3] === undefined ? 1 : raw[3]
          const fg = [0, 1, 2].map(i => raw[i] * a + bg[i] * (1 - a))
          const L1 = lum(fg), L2 = lum(bg)
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
          const px = parseFloat(cs.fontSize)
          const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700)
          const need = large ? 3 : 4.5
          if (ratio < need) {
            out.push(`${el.className} "${(el.textContent || '').trim().slice(0, 24)}" ${Math.round(ratio * 100) / 100}:1 < ${need}:1 (${cs.color} on rgb(${bg.join(',')}))`)
          }
        }
        return out
      })

      // The sample must not be able to collapse to nothing: an empty `failures`
      // means either that everything passed or that the walk matched no
      // elements at all, and those are not the same result.
      const measured = await page.locator(
        '.cc-ratio-verdict, .cc-check-mark, .cc-check-name, .cc-check-foot, .cc-fix-desc, .cc-verdict, .cc-lede, .cc-field-badge, .cc-level-opt').count()
      await ctx.close()
      expect(measured, `no contrast-checker text was found to measure in ${theme}`)
        .toBeGreaterThan(8)
      expect(failures, `the contrast checker's own UI must meet AA in ${theme}:\n${failures.join('\n')}`).toEqual([])
    })
  }

  // ── The rule the verdict chips exist to obey ──────────────────────────────
  // A chip that painted in the pair under test would go unreadable exactly when
  // the pair fails — the moment its reader most needs it. So drive the page to a
  // pair that fails everything and assert the chips are STILL legible.
  //
  // This is the assertion the test above cannot make: at the default 4.83:1 a
  // chip drawn in the pair passes anyway, so only a deliberately broken pair
  // separates "uses page tokens" from "got lucky".
  for (const theme of ['light', 'dark']) {
    test(`its verdict chips stay legible when the pair itself fails (${theme})`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: theme })
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      watch(page, 'a designer testing a pair that cannot pass')
      await go(page, '/create/contrast')
      await expect(page.locator('.cc-verdict').first()).toBeVisible()

      // #F2F4F6 on #FFFFFF is about 1.1:1 — it fails every tier, so every chip
      // flips and the preview text is effectively invisible.
      await page.fill('#cc-fg', '#F2F4F6')
      await expect(page.locator('.cc-verdict--fail').first()).toBeVisible()

      const state = await page.evaluate(() => {
        const lum = ([r, g, b]) => {
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const parse = (c) => {
          const n = (c.match(/[\d.]+/g) || []).map(Number)
          if (n.length < 3) return []
          return /^color\(srgb/.test(c)
            ? [n[0] * 255, n[1] * 255, n[2] * 255, n.length > 3 ? n[3] : undefined]
            : n.slice(0, 4)
        }
        const bgOf = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor)
            if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return c.slice(0, 3)
          }
          return [255, 255, 255]
        }
        const ratioOf = (el) => {
          const cs = getComputedStyle(el)
          const bg = bgOf(el)
          const raw = parse(cs.color)
          const a = raw[3] === undefined ? 1 : raw[3]
          const fg = [0, 1, 2].map(i => raw[i] * a + bg[i] * (1 - a))
          const L1 = lum(fg), L2 = lum(bg)
          return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
        }
        const chips = [...document.querySelectorAll('.cc-verdict')].filter(el => el.offsetParent !== null)
        return {
          chips: chips.length,
          // The specimen really is unreadable — otherwise the pair was not applied
          // and the whole test is measuring the resting state again.
          specimen: Math.round(ratioOf(document.querySelector('.cc-spec-body')) * 100) / 100,
          bad: chips
            .map(el => ({ t: el.textContent.trim().slice(0, 18), r: Math.round(ratioOf(el) * 100) / 100 }))
            .filter(x => x.r < 4.5)
            .map(x => `${x.t} at ${x.r}:1`),
        }
      })
      await ctx.close()

      expect(state.chips, 'no verdict chips were found to measure').toBeGreaterThanOrEqual(4)
      expect(state.specimen,
        `the failing pair was not applied \u2014 the specimen measured ${state.specimen}:1, which is not a failing pair`)
        .toBeLessThan(3)
      expect(state.bad,
        `a verdict chip is unreadable in ${theme} on a pair that fails: ${state.bad.join(', ')}. ` +
        'Chips must paint with page tokens, never with --cc-fg/--cc-bg.').toEqual([])
    })
  }

  // ── The left panel [contrast-checker-overhaul] ────────────────────────────
  // These drive the PAGE. The solver's maths is swept over 46,656 pairs in
  // tests/unit/contrast-fixes.test.js and none of that would notice a call site
  // still wired to fixForeground, which is the failure mode this repo keeps
  // paying for. What is asserted here is what the page RENDERS.

  // THE DEFECT, as a user meets it. #000099 on #009900 measures 3.806:1. Black
  // clears 5.56:1, so a one-click fix plainly exists — but the ground's relative
  // luminance is 0.228, and fixForeground's `bgLum < 0.5` rule sent the search
  // toward white, which tops out at 3.78:1. It found nothing and returned its
  // input, the page's own re-verification dropped it, and "Make it pass" came up
  // EMPTY. Measured across a 6-level-per-channel grid, that was 42.7% of failing
  // pairs missing a text fix and 17.0% shown no fix of any kind.
  test('a pair the old direction rule gave up on now offers a fix', async ({ page }) => {
    watch(page, 'a designer fixing a green button label')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-verdict')).toBeVisible()

    await page.fill('#cc-fg', '#000099')
    await page.fill('#cc-bg', '#009900')

    // The pair really is the failing one, so an empty row below cannot be
    // explained by the page having ignored the input.
    await expect(page.locator('.cc-ratio-num')).toHaveText('3.81 : 1')

    const fixes = page.locator('.cc-fix')
    await expect(fixes).toHaveCount(2)

    // Both sides, and each one verified in the browser against the pair as
    // rendered — not merely present.
    const offered = await page.locator('.cc-fix-chip').allTextContents()
    const check = await page.evaluate((hexes) => {
      const lum = ([r, g, b]) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
      const ratio = (a, b) => {
        const L1 = lum(rgb(a)), L2 = lum(rgb(b))
        return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      }
      return {
        textFixOnGreen: ratio(hexes[0], '#009900'),
        blueOnBgFix: ratio('#000099', hexes[1]),
      }
    }, offered)

    expect(check.textFixOnGreen,
      `the offered text fix ${offered[0]} does not reach 4.5:1 on #009900`).toBeGreaterThanOrEqual(4.5)
    expect(check.blueOnBgFix,
      `the offered background fix ${offered[1]} does not reach 4.5:1 under #000099`).toBeGreaterThanOrEqual(4.5)

    // And the suggestion is still the designer's blue rather than a jump to
    // black — the point of walking the seed's own lightness axis.
    const [r, g, b] = [1, 3, 5].map(i => parseInt(offered[0].slice(i, i + 2), 16))
    expect(b, `the text fix ${offered[0]} stopped being blue`).toBeGreaterThan(Math.max(r, g))
  })

  // Applying a fix must actually resolve the failure it was offered for.
  test('applying an offered fix makes the pair pass', async ({ page }) => {
    watch(page, 'a designer taking the one-click fix')
    await go(page, '/create/contrast')
    await page.fill('#cc-fg', '#000099')
    await page.fill('#cc-bg', '#009900')
    await expect(page.locator('.cc-fix')).toHaveCount(2)

    await page.locator('.cc-fix').first().getByRole('button', { name: 'Apply' }).click()

    // The body-copy check is the one that was failing; it must now pass, and
    // the fix row must empty because there is nothing left to fix.
    await expect(page.locator('.cc-check').first()).toHaveClass(/cc-check--pass/)
    await expect(page.locator('.cc-fix')).toHaveCount(0)
    await expect(page.locator('.cc-ratio-verdict')).toHaveText(/Good for body text/)
  })

  // A pair no single-side move can fix must SAY so. Showing nothing is what the
  // page used to do for 17% of failing pairs, and an empty space is
  // indistinguishable from a page that did not look.
  //
  // THIS STATE IS ONLY REACHABLE AT AAA, and the test says so because the reason
  // is a real property rather than a quirk of the fixture. Pure black clears
  // 4.5:1 on every ground at or above relative luminance 0.175 and pure white on
  // every one at or below 0.1833 — those ranges OVERLAP, so against a SINGLE
  // ground one pole always clears and an AA fix always exists. At 7:1 the two
  // ranges separate and a band of mid greys opens up where neither works.
  test('an unfixable pair says so instead of showing an empty row', async ({ page }) => {
    watch(page, 'a designer on a pair that cannot be rescued')
    await go(page, '/create/contrast')
    await page.fill('#cc-fg', '#808080')
    await page.fill('#cc-bg', '#7F7F7F')

    // At AA this pair IS fixable, which is the control: it proves the message
    // below is a verdict about the pair and not just the failing state.
    await expect(page.locator('.cc-fix')).toHaveCount(2)
    await expect(page.locator('.cc-unfixable')).toHaveCount(0)

    await page.getByRole('radio', { name: 'AAA' }).click()
    await expect(page.locator('.cc-fix')).toHaveCount(0)
    await expect(page.locator('.cc-unfixable')).toBeVisible()
    await expect(page.locator('.cc-unfixable')).toContainText('Neither colour can reach 7:1')
  })

  // Whereby's `AA ⌄`: the level is chosen once and everything follows it.
  // Reverting any one of the four consumers to a hard-coded 4.5 fails here.
  test('the level control drives the badges, the checks and the preview chips', async ({ page }) => {
    watch(page, 'a designer holding a pair to AAA')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-verdict')).toBeVisible()

    const read = () => page.evaluate(() => ({
      badges: [...document.querySelectorAll('.cc-field-badge')].map(e => e.textContent.trim()),
      checkMins: [...document.querySelectorAll('.cc-check-min')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
      chipMins: [...document.querySelectorAll('.cc-verdict')].map(e => e.children[1]?.textContent),
    }))

    const aa = await read()
    expect(aa.badges.every(b => b.startsWith('✓AA') || b.startsWith('✕AA')),
      `the AA badges did not name their level: ${aa.badges.join(' | ')}`).toBe(true)
    expect(aa.checkMins).toEqual([
      'Passes; needs ≥ 4.5:1', 'Passes; needs ≥ 3:1', 'Passes; needs ≥ 3:1',
    ])
    expect(aa.chipMins).toEqual(['3:1', '4.5:1', '4.5:1', '4.5:1'])

    await page.getByRole('radio', { name: 'AAA' }).click()
    const aaa = await read()

    expect(aaa.badges.every(b => b.includes('AAA')),
      `the badges did not follow the level: ${aaa.badges.join(' | ')}`).toBe(true)
    // Body copy rises to 7 and large text to 4.5 — but NON-TEXT STAYS AT 3.
    // SC 1.4.11 is a AA criterion with no AAA counterpart, and scaling it would
    // be inventing a rule on the page that teaches the rules.
    expect(aaa.checkMins).toEqual([
      'Fails; needs ≥ 7:1', 'Passes; needs ≥ 4.5:1', 'Passes; needs ≥ 3:1',
    ])
    expect(aaa.chipMins).toEqual(['4.5:1', '7:1', '7:1', '7:1'])
  })

  // Typeform writes its checks as sentences about real objects; Hotjar makes the
  // verdict a short headline. Both replaced jargon, so both are asserted as the
  // ABSENCE of the jargon as well as the presence of the prose — a sentence
  // added beside a surviving tier list would pass a presence-only test.
  test('the checks name real objects and the verdict is a sentence', async ({ page }) => {
    watch(page, 'a designer who does not know what AA means')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-verdict')).toBeVisible()

    const names = await page.locator('.cc-check-name').allTextContents()
    expect(names).toHaveLength(3)
    for (const n of names) {
      expect(n, `"${n}" is not a sentence about anything`).toMatch(/\.$/)
      expect(n, `"${n}" is still a tier name`).not.toMatch(/^A{2,3}\b|·/)
    }
    expect(names.join(' ')).toContain('Body copy at 16px')
    expect(names.join(' ')).toContain('Buttons, borders and focus rings')

    // The old five-tier list, gone rather than merely restyled.
    const panel = await page.locator('.cc-checks').innerText()
    expect(panel).not.toMatch(/AA\s*·\s*normal text/)
    expect(panel).not.toMatch(/AAA\s*·\s*large text/)

    // Hotjar: the verdict says what the pair can CARRY, not "Passes some checks".
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Good for body text at any size.')
    await page.fill('#cc-fg', '#BBBBBB')
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Not usable for text at any size.')
  })

  // Whereby puts the measured ratio beside the field being edited. The two here
  // form ONE pair, so the number is the same on both sides — naming the ground
  // is what stops that reading as a duplicate, and is the part worth pinning.
  test('each colour field carries its own verdict, naming its ground', async ({ page }) => {
    watch(page, 'a designer reading the verdict beside the field')
    await go(page, '/create/contrast')

    const badges = page.locator('.cc-field-badge')
    await expect(badges).toHaveCount(2)
    await expect(badges.nth(0)).toContainText('vs background')
    await expect(badges.nth(1)).toContainText('vs text')

    // They track the pair, rather than being decoration painted once.
    await expect(badges.nth(0)).toHaveClass(/cc-field-badge--pass/)
    await page.fill('#cc-fg', '#DDDDDD')
    await expect(badges.nth(0)).toHaveClass(/cc-field-badge--fail/)
    await expect(badges.nth(1)).toHaveClass(/cc-field-badge--fail/)
  })

  // The two panels are not equal halves any more: the preview renders a page and
  // needs the room. Asserted as a RELATIONSHIP, not as pixel values, so a change
  // to the page gutter does not fail it for the wrong reason.
  test('the preview panel is given more width than the controls', async ({ page }) => {
    watch(page, 'a designer on a wide screen')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-preview')).toBeVisible()

    const [controls, preview] = await page.locator('.cc-panel').evaluateAll(
      els => els.map(e => Math.round(e.getBoundingClientRect().width)))
    expect(preview, `preview ${preview}px is not wider than controls ${controls}px`)
      .toBeGreaterThan(controls)
    // Wider, but still two real columns rather than a sliver beside a slab.
    expect(preview / controls).toBeLessThan(1.6)
  })
})
