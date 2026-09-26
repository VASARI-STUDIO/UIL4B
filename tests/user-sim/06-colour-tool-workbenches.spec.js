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

    // The tool opens on its toolbar label, and its controls are one
    // named side panel (the drawn STOPS / SELECTED STOP / GEOMETRY card).
    await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
    const panel = page.getByRole('complementary', { name: 'Gradient controls' })
    await expect(panel).toBeVisible()
    for (const name of ['Stops', 'Selected stop', 'Geometry']) {
      await expect(panel.getByRole('group', { name, exact: true })).toBeVisible()
    }

    const firstHex = page.getByRole('textbox', { name: 'Stop 1 hex' })
    await expect(firstHex).toHaveValue('#7C3AED')
    await firstHex.fill('#NOTHEX')
    await expect(firstHex).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Use a 6-digit hex')).toBeVisible()
    await firstHex.press('Enter')
    await expect(firstHex).toHaveValue('#7C3AED')

    const position = page.getByRole('slider', { name: 'Stop position' })
    await expect(position).toHaveValue('0')

    const handle = page.getByRole('button', { name: /Gradient stop 1 at 0%/ })
    await handle.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect(position).toHaveValue('10')

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
    // The hex field follows the SELECTED stop; stop 1 is re-selected first.
    await page.getByRole('button', { name: /^Select stop 1,/ }).click()
    await expect(page.getByRole('textbox', { name: 'Stop 1 hex' })).toHaveValue('#123456')

    const add = page.getByRole('button', { name: 'Add a stop' })
    while (await add.isVisible()) await add.click()
    await expect(page.locator('.grd-stop')).toHaveCount(12)
    // At the ceiling the drawn "Add a stop" row is gone, as the design hides it
    // (addStopDisplay) — there is nothing to press that would do nothing.
    await expect(add).toHaveCount(0)
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

    await page.getByRole('button', { name: 'Copy CSS', exact: true }).click()
    await expect(page.getByText(/Failed to copy|Copy failed/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy CSS', exact: true })).toBeVisible()
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

    await page.getByRole('button', { name: 'Copy CSS', exact: true }).click()
    await expect(page.getByText('Clipboard is not available in this browser')).toBeVisible()
  })

  // The page used to carry numbered steps ("01 · Canvas", "02 · Inspector") and
  // a numbered sources block. The design's drawn screen has no
  // step numbers at all: a canvas, one side card, and an unnumbered "Start from
  // a preset" strip. This asserts that shape — the strip is present, named by
  // its own heading, never empty, links to the library, and nothing on the page
  // is numbered again.
  test('the preset strip is one named, unnumbered section that is never empty', async ({ page }) => {
    watch(page, 'a designer arriving with no saved palette')
    await go(page, '/create/gradient')

    await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
    const start = page.getByRole('region', { name: 'Start from a preset' })
    await expect(start).toBeVisible()
    await expect(start.locator('.grd-preset').first()).toBeVisible()
    expect(await start.locator('.grd-preset').count()).toBeGreaterThanOrEqual(16)
    await expect(start.getByRole('link', { name: /Gradient Library/ })).toBeVisible()

    const numbered = await page.locator('.grd').evaluate((root) =>
      [...root.querySelectorAll('*')].filter((el) => el.children.length === 0 && /^0\d\s*·/.test(el.textContent.trim())).length)
    expect(numbered, 'no step numbers on the drawn screen').toBe(0)
  })
})

test.describe('Semantic Colour system workflow', () => {
  test('a designer can choose a bundle, a base step and a custom hue', async ({ page }) => {
    watch(page, 'product designer')
    await go(page, '/create/semantic-color')

    await expect(page.getByRole('heading', { level: 1, name: 'Semantic Colour' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Balanced' })).toHaveAttribute('aria-checked', 'true')
    const vividBundle = page.getByRole('radio', { name: 'Vivid' })
    await vividBundle.click()
    await expect(vividBundle).toHaveAttribute('aria-checked', 'true')
    await vividBundle.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Cool' })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(vividBundle).toBeFocused()

    const code = page.locator('.stc-code')
    await expect(code).toContainText('--color-success:')
    await expect(code).toContainText('--color-success-50:')
    await expect(code).toContainText('--color-info-900:')

    // The base step moves the aliases and the ring, not the ramps.
    const alias = async () => (await code.textContent()).match(/--color-success: (#[0-9a-f]{6})/i)[1]
    const at500 = await alias()
    await page.getByRole('button', { name: 'Step 600' }).click()
    await expect(page.getByRole('button', { name: 'Step 600' })).toHaveAttribute('aria-pressed', 'true')
    expect(await alias()).not.toBe(at500)
    await expect(page.locator('[data-role="success"] .stc-cell.is-base')).toHaveAttribute('aria-label', /^Copy 600, /)

    // Custom: a hue slider, and a pasted hex rotated into the role's arc.
    await page.getByRole('combobox', { name: 'Success preset' }).selectOption('custom')
    await expect(page.getByRole('slider', { name: 'success custom hue' })).toBeVisible()
    const successHex = page.getByRole('textbox', { name: 'Import a hex colour for success' })
    await successHex.fill('bad')
    await successHex.press('Enter')
    await expect(page.getByText(/Enter a six-digit hex colour/)).toBeVisible()
    await successHex.fill('#16A34A')
    await successHex.press('Enter')
    await expect(successHex).toHaveValue('')

    await page.screenshot({ path: test.info().outputPath('semantic-colours-desktop.png'), fullPage: true })
  })

  // Pending is not a state: blue Information covers it, and purple is an
  // alternative Information hue. The set is four roles;
  // pending is absent from every output, and Information's purple alternative
  // reaches every output when chosen.
  //
  // MUTATION: add `pending` back to ROLE_IDS in ColorStudio.jsx — the first
  // absence goes red; make resolveStateShades ignore infoHue — the purple
  // assertion goes red.
  test('pending is gone from every output, and purple Information reaches them all', async ({ page }) => {
    watch(page, 'a designer choosing a purple information colour')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, '/create/semantic-color')

    // Four family rows, and the depiction shows Information as "underway".
    await expect(page.locator('.stc-fam')).toHaveCount(4)
    await expect(page.locator('.stc-fam-name')).toHaveText(['✓Success', '!Warning', '×Error', 'iInformation'])
    await expect(page.locator('.stc-alert--info').filter({ hasText: 'Publishing design system' })).toHaveCount(1)
    const body = await page.evaluate(() => document.querySelector('main').innerText)
    expect(body, 'pending is still on the page').not.toMatch(/pending/i)

    await page.getByRole('button', { name: 'Copy tokens' }).click()
    const blue = await page.evaluate(() => navigator.clipboard.readText())
    expect(blue).not.toMatch(/pending/i)
    expect(blue).toContain('--color-info-500: #3b82f6')

    // Purple, and the cached shades other exports read.
    await page.getByRole('button', { name: 'Purple', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Purple', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Copy tokens' }).click()
    const purple = await page.evaluate(() => navigator.clipboard.readText())
    expect(purple).toContain('--color-info-500: #8b5cf6')
    expect(purple).not.toContain('#3b82f6')
    const cached = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-state-shades') || '{}'))
    expect(Object.keys(cached).sort()).toEqual(['error', 'info', 'success', 'warning'])
    expect(cached.info[5]).toBe('#8b5cf6')
  })

  test('a saved set with the retired pending role loads without it', async ({ page }) => {
    watch(page, 'a returning designer with an old project')
    await page.addInitScript(() => {
      try {
        localStorage.setItem('vs-current-design', JSON.stringify({ states: { success: 2, warning: 1, error: 2, info: 1, pending: 3 } }))
      } catch { /* private mode */ }
    })
    await go(page, '/create/semantic-color')
    // The four saved roles are kept: that is the Cool bundle.
    await expect(page.getByRole('radio', { name: 'Cool' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.stc-fam')).toHaveCount(4)
    // And the saved design no longer carries pending once the tool has run.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || '{}').states || {}))
      .not.toHaveProperty('pending')
  })

  // The chosen preset is a real select, so a screen reader hears its value.
  test('each role says which preset is on, and it follows a change', async ({ page }) => {
    watch(page, 'a designer on a screen reader choosing a success green')
    await go(page, '/create/semantic-color')
    const success = page.getByRole('combobox', { name: 'Success preset' })
    await expect(success).toHaveValue('1')
    await expect(page.locator('[data-role="success"] .tl-select-v')).toHaveText('Green')
    await success.selectOption({ label: 'Teal' })
    await expect(page.locator('[data-role="success"] .tl-select-v')).toHaveText('Teal')
    // The bundle no longer matches, so no bundle claims the selection.
    await expect(page.locator('.stc-bundles [aria-checked="true"]')).toHaveCount(0)
  })

  test('the semantic editor and its code remain contained on a narrow screen', async ({ page }) => {
    watch(page, 'mobile product designer')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/semantic-color')

    await expect(page.getByRole('radio', { name: 'Balanced' })).toBeVisible()
    await expect(page.locator('.stc-code')).toBeVisible()
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow, 'Semantic Colours should not create page-level horizontal overflow').toBe(false)
    await page.screenshot({ path: test.info().outputPath('semantic-colours-mobile.png'), fullPage: true })
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
      // tokens on :root do change at once - `--card-grad` reads #111215
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

  // ── The rule the verdicts exist to obey ─────────────────────────────────────
  // On the rebuilt screen every verdict — the headline, the five
  // test marks, the pair marks — sits on the page's own card, never on the
  // user's pair. Drive the page to a pair that fails everything and assert
  // they are STILL legible: at the default 4.83:1 a verdict drawn in the pair
  // would pass anyway, so only a broken pair separates "uses page tokens" from
  // "got lucky".
  //
  // MUTATION: in contrast.css drop the light-theme 50% mix on --cc-bad (paint
  // the raw #F0A58C on the white card) — the light run goes red on every
  // "Fail" mark at ~2:1.
  for (const theme of ['light', 'dark']) {
    test(`its verdicts stay legible when the pair itself fails (${theme})`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: theme })
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      watch(page, 'a designer reading a failing pair')
      await go(page, '/create/contrast')
      await expect(page.locator('.cc-ratio-verdict')).toBeVisible()
      await page.fill('#cc-fg', '#F2F4F6')
      await page.fill('#cc-bg', '#FFFFFF')
      await expect(page.locator('.cc-ratio-verdict')).toHaveText('Fails')

      const report = await page.evaluate(() => {
        const lum = ([r, g, b]) => {
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const parse = (c) => {
          const n = (c.match(/[\d.]+/g) || []).map(Number)
          return /^color\(srgb/.test(c) ? [n[0] * 255, n[1] * 255, n[2] * 255, n[3]] : n.slice(0, 4)
        }
        const bgOf = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor)
            if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return c.slice(0, 3)
          }
          return [255, 255, 255]
        }
        const els = [...document.querySelectorAll('.cc-ratio-verdict, .cc-check-mark, .cc-check-name, .cc-pair-mark')]
        const bad = []
        for (const el of els) {
          const raw = parse(getComputedStyle(el).color)
          const bg = bgOf(el)
          const a = raw[3] === undefined ? 1 : raw[3]
          const fg = [0, 1, 2].map((i) => raw[i] * a + bg[i] * (1 - a))
          const L1 = lum(fg), L2 = lum(bg)
          const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
          if (r < 4.5) bad.push(`${el.className} "${el.textContent.trim().slice(0, 20)}" ${r.toFixed(2)}:1`)
        }
        return { measured: els.length, bad }
      })
      await ctx.close()
      expect(report.measured, 'no verdict text was found to measure').toBeGreaterThan(8)
      expect(report.bad, 'verdicts must paint with page tokens, never with the pair').toEqual([])
    })
  }

  // These drive the PAGE. The solver's maths is swept over 46,656 pairs in
  // tests/unit/contrast-fixes.test.js; what is asserted here is what the page
  // RENDERS.
  //
  // THE DEFECT, as a user meets it. #000099 on #009900 measures 3.806:1. Black
  // clears 5.56:1, so a one-click fix plainly exists — the old direction rule
  // searched toward white, found nothing, and "Make it pass" came up EMPTY.
  test('a pair the old direction rule gave up on now offers a fix', async ({ page }) => {
    watch(page, 'a designer fixing a green button label')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-verdict')).toBeVisible()

    await page.fill('#cc-fg', '#000099')
    await page.fill('#cc-bg', '#009900')

    await expect(page.locator('.cc-ratio-num')).toHaveText('3.81:1')

    const fixes = page.locator('.cc-fix')
    await expect(fixes).toHaveCount(2)

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
      return { textFixOnGreen: ratio(hexes[0], '#009900'), blueOnBgFix: ratio('#000099', hexes[1]) }
    }, offered)

    expect(check.textFixOnGreen, `the offered text fix ${offered[0]} does not reach 4.5:1 on #009900`).toBeGreaterThanOrEqual(4.5)
    expect(check.blueOnBgFix, `the offered background fix ${offered[1]} does not reach 4.5:1 under #000099`).toBeGreaterThanOrEqual(4.5)
    const [r, g, b] = [1, 3, 5].map(i => parseInt(offered[0].slice(i, i + 2), 16))
    expect(b, `the text fix ${offered[0]} stopped being blue`).toBeGreaterThan(Math.max(r, g))
  })

  // Applying a fix must actually resolve the failure it was offered for. The
  // fix aims at the next level missed — AA first — so after it the body test
  // passes and the section moves on to the AAA goal.
  test('applying an offered fix makes the pair pass', async ({ page }) => {
    watch(page, 'a designer taking the one-click fix')
    await go(page, '/create/contrast')
    await page.fill('#cc-fg', '#000099')
    await page.fill('#cc-bg', '#009900')
    await expect(page.locator('.cc-fix')).toHaveCount(2)
    await expect(page.getByRole('group', { name: 'Make it pass' })).toContainText('AA (4.5:1)')

    await page.locator('.cc-fix').first().getByRole('button', { name: 'Apply' }).click()

    await expect(page.locator('.cc-check').first()).toHaveClass(/cc-check--pass/)
    await expect(page.locator('.cc-ratio-verdict')).toHaveText(/Passes AA/)
    await expect(page.getByRole('group', { name: 'Make it pass' })).not.toContainText('AA (4.5:1)')
  })

  // The fixes aim at the NEXT level the pair misses (AA, then AAA), not at a
  // level chosen elsewhere — the drawn screen has no level control. That makes
  // the old "unfixable" state unreachable: against one ground a pole always
  // clears 4.5:1, and a pair that already clears AA always has a single-side
  // move to 7:1 (swept over the 6-level grid, 0 exceptions). So the thing to
  // hold is the other half: a failing pair never meets an empty section.
  // #808080 on #7F7F7F is the pair that USED to be unfixable, at AAA.
  test('every failing pair is offered a fix, aimed at the next level it misses', async ({ page }) => {
    watch(page, 'a designer on a pair that looks hopeless')
    await go(page, '/create/contrast')
    await page.fill('#cc-fg', '#808080')
    await page.fill('#cc-bg', '#7F7F7F')
    await expect(page.locator('.cc-fix')).toHaveCount(2)
    await expect(page.locator('.cc-unfixable')).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Make it pass' })).toContainText('AA (4.5:1)')

    // Past AA, the section aims at AAA; past AAA, it is gone.
    await page.fill('#cc-fg', '#000000')
    await page.fill('#cc-bg', '#767676')
    await expect(page.getByRole('group', { name: 'Make it pass' })).toContainText('AAA (7:1)')
    await expect(page.locator('.cc-fix').first()).toBeVisible()
    await page.fill('#cc-bg', '#FFFFFF')
    await expect(page.getByRole('group', { name: 'Make it pass' })).toHaveCount(0)
  })

  // The five tests as drawn (D:1903-1906): both levels at once, each row naming
  // its level. NON-TEXT has no AAA row — SC 1.4.11 is AA only.
  test('the five tests carry both levels, and follow the pair', async ({ page }) => {
    watch(page, 'a designer holding a pair to AA and AAA')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-verdict')).toBeVisible()
    const rows = page.locator('.cc-check')
    await expect(rows).toHaveCount(5)
    await expect(page.locator('.cc-check-name')).toHaveText([
      'Body text, 16px', 'Body text, enhanced', 'Large text, 24px', 'Large text, enhanced', 'UI borders and icons',
    ])
    await expect(page.locator('.cc-check-level')).toHaveText(['AA', 'AAA', 'AA', 'AAA', 'AA'])

    // #6B7280 on #FFFFFF is 4.83:1 — AA passes, AAA body fails.
    const marks = () => page.locator('.cc-check-mark').evaluateAll((els) => els.map((e) => e.childNodes[0].textContent))
    expect(await marks()).toEqual(['Pass', 'Fail', 'Pass', 'Pass', 'Pass'])
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Passes AA')

    await page.fill('#cc-fg', '#BBBBBB')
    expect(await marks()).toEqual(['Fail', 'Fail', 'Fail', 'Fail', 'Fail'])
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Fails')
    await page.fill('#cc-fg', '#000000')
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Passes AAA')
  })

  // TRUTH: "Common pairs in this kit" and the swatches are the person's own
  // palette (the design's are invented brand values). Seed a palette and both
  // follow it; a pair applies both sides.
  //
  // MUTATION: make kitFrom() in ContrastChecker.jsx ignore palette.colors —
  // the swatch assertion goes red on the first seeded hex.
  test('the common pairs and swatches come from the person’s own palette', async ({ page }) => {
    watch(page, 'a designer checking their own kit')
    const PALETTE = ['#1D3557', '#E63946', '#F1FAEE', '#A8DADC', '#457B9D']
    await page.addInitScript((colors) => {
      try {
        localStorage.setItem('vs-current-design', JSON.stringify({ palette: { base: colors[0], harmony: 'auto', colors } }))
      } catch { /* private mode */ }
    }, PALETTE)
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-verdict')).toBeVisible()

    const swatches = await page.locator('.cc-swatch').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label').match(/#[0-9A-F]{6}/i) || [''])[0].toUpperCase()))
    for (const hex of PALETTE) expect(swatches, `the kit swatches are missing the palette's ${hex}`).toContain(hex)

    const pairs = page.locator('.cc-pair')
    expect(await pairs.count(), 'the kit offered no pairs').toBeGreaterThan(2)
    // Named by the palette's roles, never the design's "Brand on ink".
    await expect(pairs.first()).toContainText(/Primary|Secondary|Accent|Subtle|Deep/)
    await expect(page.locator('.cc-pairs')).not.toContainText('Brand on ink')

    await pairs.first().click()
    const fg = await page.locator('#cc-fg').inputValue()
    const bg = await page.locator('#cc-bg').inputValue()
    expect(PALETTE).toContain(fg)
    expect(PALETTE).toContain(bg)
  })

  // The drawn grid: the specimen (1fr) is far wider than the 336px card.
  test('the preview is given more width than the controls', async ({ page }) => {
    watch(page, 'a designer on a wide screen')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-preview')).toBeVisible()
    const preview = await page.locator('.cc-preview').evaluate((e) => Math.round(e.getBoundingClientRect().width))
    const controls = await page.locator('.cc-panel').evaluate((e) => Math.round(e.getBoundingClientRect().width))
    expect(controls, 'the side card is the drawn 336px').toBe(336)
    expect(preview, `preview ${preview}px is not wider than controls ${controls}px`).toBeGreaterThan(controls)
  })
})

// The design's GEOMETRY "Interpolation: OKLCH | sRGB" control (D:692-699),
// implemented for real: the choice reaches the copied CSS, the painted canvas
// and the SVG export (SVG cannot say `in oklch`, so it is sampled instead).
//
// MUTATION: make gradientCssIn() in GradientGenerator.jsx return the plain
// sRGB string for 'oklch' — the first expectation goes red.
test.describe('Gradient interpolation space', () => {
  test('OKLCH writes `in oklch` everywhere it can, and sRGB writes nothing', async ({ page }) => {
    watch(page, 'front-end developer choosing an interpolation space')
    await go(page, '/create/gradient')
    const code = page.locator('.grd-code-text code')
    const oklch = page.getByRole('button', { name: 'OKLCH', exact: true })
    const srgb = page.getByRole('button', { name: 'sRGB', exact: true })

    await oklch.click()
    await expect(oklch).toHaveAttribute('aria-pressed', 'true')
    await expect(code).toContainText('in oklch')
    const painted = await page.locator('.grd-canvas').evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(painted, 'the canvas paints the OKLCH gradient').toContain('oklch')

    // SVG: sampled into sRGB stops, so there are more stops than the gradient has.
    await page.getByRole('button', { name: 'Linear', exact: true }).click()
    await page.getByRole('tab', { name: 'SVG' }).click()
    const svg = await code.textContent()
    expect((svg.match(/<stop /g) || []).length, 'the OKLCH path was sampled into sRGB stops').toBeGreaterThan(3)

    await page.getByRole('tab', { name: 'CSS' }).click()
    await srgb.click()
    await expect(srgb).toHaveAttribute('aria-pressed', 'true')
    await expect(code).not.toContainText('in oklch')
    await expect(code).toContainText('gradient(')
  })
})
