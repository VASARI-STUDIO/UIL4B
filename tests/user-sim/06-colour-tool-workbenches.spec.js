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

  // The founder asked for the Semantic Colour HERO specifically (2026-09-03).
  // The four colour tools ran two hero languages: Tint and Gradient open with an
  // eyebrow, a large title, a description, the tool's own action and a strip of
  // live facts; Semantic Colours and the Contrast Checker were on the site-wide
  // `.sec-h`, which has none of that.
  //
  // This pins the SHAPE, not the styling: the parts a person can name. It also
  // pins the numbers in the strip against their real sources, because the copy
  // it replaced said "40 canonical tokens" as a hard-coded string and the ramp
  // it describes is 10 stops of 11 possible ones - the kind of number that goes
  // quietly wrong when a scale changes.
  test('the Semantic Colours hero carries the same parts as its sibling colour tools', async ({ page }) => {
    watch(page, 'a designer landing on the semantic tool')
    await go(page, '/create/semantic-color')

    const hero = page.locator('.stc-hero')
    await expect(hero).toBeVisible()
    await expect(hero.locator('.stc-hero-eyebrow')).toHaveText('Create / Colour')
    await expect(hero.getByRole('heading', { level: 1, name: 'Semantic Colours' })).toBeVisible()
    // The action belongs to the hero, the way Gradient's Random/Reset do.
    await expect(hero.getByRole('button', { name: 'Copy all tokens' })).toBeVisible()

    const facts = page.locator('.stc-status span')
    await expect(facts).toHaveCount(4)
    await expect(facts.nth(0)).toContainText('Balanced')
    await expect(facts.nth(1)).toContainText('5')
    await expect(facts.nth(2)).toContainText('10')
    await expect(facts.nth(3)).toContainText('50')
    // Same numbers, same sources, in the handoff block - which used to type
    // "40" as a literal and name info as the last role.
    await expect(page.getByRole('button', { name: 'Copy 50 CSS variables' })).toBeVisible()

    // Choosing another bundle re-reports the first fact - the strip is live, not
    // a decorative constant.
    await page.getByRole('radio', { name: /Tailwind/ }).click()
    await expect(facts.nth(0)).toContainText('Tailwind')
  })

  // The three onward-navigation blocks this page used to end with offered
  // overlapping destinations: "Next in the workflow" listed contrast, tint and
  // palette, all three of which the "More colour tools" footer ~200px below it
  // already offered alongside gradient. One choice, asked twice.
  test('the page offers each sibling colour tool exactly once on the way out', async ({ page }) => {
    watch(page, 'a designer deciding where to go next')
    await go(page, '/create/semantic-color')

    for (const route of ['/create/contrast', '/create/tint', '/create/palette', '/create/gradient']) {
      await expect(
        page.locator(`a[href="${route}"]`),
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
        for (const el of document.querySelectorAll('.cc-ratio-verdict, .cc-check-mark, .cc-check-name, .cc-fix-desc')) {
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
        '.cc-ratio-verdict, .cc-check-mark, .cc-check-name, .cc-fix-desc').count()
      await ctx.close()
      expect(measured, `no contrast-checker text was found to measure in ${theme}`)
        .toBeGreaterThan(3)
      expect(failures, `the contrast checker's own UI must meet AA in ${theme}:\n${failures.join('\n')}`).toEqual([])
    })
  }
})
