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

    // The first-visit gradient is the first curated preset, Indigo Night.
    const FIRST_STOP = '#0A0F2C'
    const firstHex = page.getByRole('textbox', { name: 'Stop 1 hex' })
    await expect(firstHex).toHaveValue(FIRST_STOP)
    await firstHex.fill('#NOTHEX')
    await expect(firstHex).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Use a 6-digit hex')).toBeVisible()
    await firstHex.press('Enter')
    await expect(firstHex).toHaveValue(FIRST_STOP)

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
    while (await page.locator('.grd-stop').count() < 12) await add.click()
    await expect(page.locator('.grd-stop')).toHaveCount(12)
    // At the ceiling the button stays drawn, so the panel does not change
    // height; it is disabled and says why.
    await expect(add).toHaveCount(0)
    const full = page.getByRole('button', { name: '12 stops is the most' })
    await expect(full).toBeVisible()
    await expect(full).toBeDisabled()
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
    // Twelve curated presets (the unit test holds the set at exactly 12); no saved palette here.
    await expect(start.locator('.grd-preset')).toHaveCount(12)
    // The way into the library is the Explore panel below, not a second link up here.
    await expect(start.getByRole('link', { name: /Gradient Library/ })).toHaveCount(0)

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

    // Custom: the last chip in the role's row. It brings a hue slider and a
    // pasted hex that is rotated into the role's arc.
    const successRow = page.locator('[data-role="success"]')
    const customChip = successRow.getByRole('group', { name: 'Success preset' }).getByRole('button', { name: 'Custom' })
    await expect(customChip).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('slider', { name: 'success custom hue' })).toHaveCount(0)
    await customChip.click()
    await expect(customChip).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('slider', { name: 'success custom hue' })).toBeVisible()
    const successHex = page.getByRole('textbox', { name: 'Import a hex colour for success' })
    // A bad hex is explained under the field, in the row, and linked to it.
    const hexErr = successRow.locator('.stc-hue-err')
    await expect(hexErr).toBeHidden()
    await successHex.fill('bad')
    await successHex.press('Enter')
    await expect(hexErr).toBeVisible()
    await expect(hexErr).toHaveText('Enter a six-digit hex colour, for example #16A34A')
    await expect(successHex).toHaveAttribute('aria-invalid', 'true')
    await expect(successHex).toHaveAttribute('aria-describedby', await hexErr.getAttribute('id'))
    // The explanation goes away on the next keystroke.
    await successHex.pressSequentially('x')
    await expect(hexErr).toBeHidden()
    await expect(successHex).not.toHaveAttribute('aria-invalid', 'true')
    await successHex.fill('#16A34A')
    await successHex.press('Enter')
    await expect(successHex).toHaveValue('')
    await expect(hexErr).toBeHidden()

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
    await expect(page.locator('.stc-sc--info').filter({ hasText: 'Publishing design system' })).toHaveCount(1)
    const body = await page.evaluate(() => document.querySelector('main').innerText)
    expect(body, 'pending is still on the page').not.toMatch(/pending/i)

    await page.getByRole('button', { name: 'Copy tokens' }).click()
    const blue = await page.evaluate(() => navigator.clipboard.readText())
    expect(blue).not.toMatch(/pending/i)
    expect(blue).toContain('--color-info-500: #3b82f6')

    // Purple, and the cached shades other exports read.
    await page.getByRole('button', { name: 'Purple family' }).click()
    await expect(page.getByRole('button', { name: 'Purple family' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Blue family' })).toHaveAttribute('aria-pressed', 'false')
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

  // Each role's presets are chips in a named group, and exactly one says it is on.
  test('each role says which preset is on, and it follows a change', async ({ page }) => {
    watch(page, 'a designer on a screen reader choosing a success green')
    await go(page, '/create/semantic-color')
    const success = page.locator('[data-role="success"]').getByRole('group', { name: 'Success preset' })
    const chips = success.getByRole('button')
    await expect(chips).toHaveText(['Emerald', 'Green', 'Teal', 'Apple', 'Material', 'Tailwind', 'Custom'])
    await expect(success.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'true')
    await expect(success.locator('[aria-pressed="true"]')).toHaveCount(1)
    await success.getByRole('button', { name: 'Teal' }).click()
    await expect(success.getByRole('button', { name: 'Teal' })).toHaveAttribute('aria-pressed', 'true')
    await expect(success.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'false')
    await expect(success.locator('[aria-pressed="true"]')).toHaveCount(1)
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
// It is the worst place in the product for a contrast defect to live. The
// verdict and test marks once painted hard-coded hexes that measured 2.7:1 to
// 3.4:1 on the white card in light theme, and the fail red failed on the dark
// card too. BOTH THEMES are asserted for that reason: fixing only the one you
// happened to screenshot is how this returns.
//
// The check is computed the way the page itself computes it (WCAG relative
// luminance), against the nearest opaque ancestor background, so it measures
// what is painted rather than what the stylesheet says.
//
// REST_TEXT is every piece of the checker's own text that sits on the page's
// card. The specimen and the swatches are left out on purpose: they are
// painted in the user's pair, and legibility there is the thing being tested,
// not a property of the page. Each selector must match on its own (the check
// below counts them one by one), because a floor over a UNION cannot prove each
// member contributed: a selector left over from a rename kept the count above
// its floor for months while measuring nothing.
//
// THIS TEST ALONE DOES NOT HOLD THE VERDICTS TO THE RULE. The page loads at
// #6B7280 on #FFFFFF, 4.83:1, which clears AA, so a verdict painted in the pair
// would still pass here. The failing-pair test below is the one that catches it.
const REST_TEXT = [
  '.cc-ratio-num', '.cc-ratio-unit', '.cc-ratio-verdict', '.cc-ratio-note',
  '.cc-check-name', '.cc-check-need', '.cc-check-mark', '.cc-note p', '.cc-note-link',
  '.cc-lede', '.cc-field-k', '.cc-fix-line', '.cc-fix-ratio',
  '.cc-pair-label', '.cc-pair-ratio', '.cc-pair-mark',
]

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

      const failures = await page.evaluate((sel) => {
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
        for (const el of document.querySelectorAll(sel)) {
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
      }, REST_TEXT.join(', '))

      // The sample must not be able to collapse to nothing: an empty `failures`
      // means either that everything passed or that the walk matched no
      // elements at all, and those are not the same result. A floor over the
      // UNION cannot prove each member contributed, so every selector is
      // counted on its own.
      const unmatched = []
      for (const sel of REST_TEXT) if ((await page.locator(sel).count()) === 0) unmatched.push(sel)
      await ctx.close()
      expect(unmatched, `these selectors matched nothing in ${theme}, so they were never measured`).toEqual([])
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
  // MUTATION: in contrast.css paint .cc-tone--err with var(--err) instead of
  // var(--err-strong). The base token is the 3:1 icon floor, so the light run
  // goes red on the ratio numeral and every "Fail" mark.
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
      await expect(page.locator('.cc-ratio-verdict')).toHaveText('Fails every WCAG check.')

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
        const els = [...document.querySelectorAll('.cc-ratio-num, .cc-ratio-verdict, .cc-check-mark, .cc-check-name, .cc-pair-mark, .cc-fix-line, .cc-fix-ratio')]
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

    // 3.8059:1 shown floored, never rounded up to 3.81.
    await expect(page.locator('.cc-ratio-num')).toHaveText('3.80:1')

    const fixes = page.locator('.cc-fix')
    await expect(fixes).toHaveCount(2)

    // The hex each row names (the chip itself only reads "Aa", painted in the fixed pair).
    const offered = await page.locator('.cc-fix-line strong').allTextContents()
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

    // Each row's "Aa" chip is painted in the pair the row promises: the new
    // text on the current background, or the current text on the new background.
    const painted = await page.locator('.cc-fix-chip').evaluateAll((els) => {
      const hex = (c) => '#' + (c.match(/\d+/g) || []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()
      return els.map((el) => { const cs = getComputedStyle(el); return { fg: hex(cs.color), bg: hex(cs.backgroundColor) } })
    })
    expect(painted).toEqual([
      { fg: offered[0].toUpperCase(), bg: '#009900' },
      { fg: '#000099', bg: offered[1].toUpperCase() },
    ])
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
    const fixes = page.locator('.cc-fixes-sec')
    await expect(fixes).toContainText('To reach AA (4.5:1)')

    await page.locator('.cc-fix').first().getByRole('button', { name: /^Use / }).click()

    await expect(page.locator('.cc-check').first()).toHaveClass(/cc-check--pass/)
    await expect(page.locator('.cc-ratio-verdict')).toHaveText(/Passes AA for all text\./)
    await expect(fixes).not.toContainText('To reach AA (4.5:1)')
    await expect(fixes).toContainText('To reach AAA (7:1)')
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
    const section = page.locator('.cc-fixes-sec')
    await expect(section).toContainText('To reach AA (4.5:1)')

    // Past AA, the section aims at AAA; past AAA, it says there is nothing to
    // change (the section stays, with no fix rows in it).
    await page.fill('#cc-fg', '#000000')
    await page.fill('#cc-bg', '#767676')
    await expect(section).toContainText('To reach AAA (7:1)')
    await expect(page.locator('.cc-fix').first()).toBeVisible()
    await page.fill('#cc-bg', '#FFFFFF')
    await expect(section).toContainText('Passes every WCAG 2.2 check. Nothing to change.')
    await expect(page.locator('.cc-fix')).toHaveCount(0)
  })

  // The five tests as drawn (D:1903-1906): both levels at once, each row naming
  // its level. NON-TEXT has no AAA row — SC 1.4.11 is AA only.
  test('the five tests carry both levels, and follow the pair', async ({ page }) => {
    watch(page, 'a designer holding a pair to AA and AAA')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-verdict')).toBeVisible()
    const rows = page.locator('.cc-check')
    await expect(rows).toHaveCount(5)
    // The level is part of the name, and the ratio each test needs is on the row.
    await expect(page.locator('.cc-check-name')).toHaveText([
      'Normal text, AA', 'Normal text, AAA', 'Large text, AA', 'Large text, AAA', 'UI components and graphics, AA',
    ])
    await expect(page.locator('.cc-check-need')).toHaveText(['4.5:1', '7:1', '3:1', '4.5:1', '3:1'])

    // #6B7280 on #FFFFFF is 4.83:1 — AA passes, AAA body fails.
    const marks = page.locator('.cc-check-mark')
    await expect(marks).toHaveText(['Pass', 'Fail', 'Pass', 'Pass', 'Pass'])
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Passes AA for all text.')

    await page.fill('#cc-fg', '#BBBBBB')
    await expect(marks).toHaveText(['Fail', 'Fail', 'Fail', 'Fail', 'Fail'])
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Fails every WCAG check.')
    await page.fill('#cc-fg', '#000000')
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Passes AAA for all text.')
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

// The design's GEOMETRY "Interpolation" control (D:692-699), labelled Perceived (OKLCH) | Standard (sRGB),
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
    const oklch = page.getByRole('button', { name: 'Perceived (OKLCH)', exact: true })
    const srgb = page.getByRole('button', { name: 'Standard (sRGB)', exact: true })

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

  // The pills say Perceived / Standard and keep the real space name on demand:
  // in the button's accessible name, its hover text, and a visible line (for
  // touch and keyboard) that follows the chosen option.
  //
  // MUTATION: put 'OKLCH' / 'sRGB' back as the SPACES labels in
  // GradientGenerator.jsx (or drop `real` from the hint) — this goes red.
  test('the pills read Perceived and Standard, and the real space name is one step away', async ({ page }) => {
    watch(page, 'designer reading the interpolation control')
    await go(page, '/create/gradient')
    const group = page.getByRole('group', { name: 'Interpolation' })
    await expect(group.getByRole('button')).toHaveText(['Perceived', 'Standard'])
    await expect(group.getByRole('button', { name: 'Perceived (OKLCH)' })).toHaveAttribute('title', /OKLCH/)
    await expect(group.getByRole('button', { name: 'Standard (sRGB)' })).toHaveAttribute('title', /sRGB/)

    const hint = page.locator('#grd-interp-hint')
    await expect(group).toHaveAttribute('aria-describedby', 'grd-interp-hint')
    await group.getByRole('button', { name: 'Perceived (OKLCH)' }).click()
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('OKLCH')
    await group.getByRole('button', { name: 'Standard (sRGB)' }).click()
    await expect(hint).toContainText('sRGB')
    await expect(hint).not.toContainText('OKLCH')
    // sRGB here is the gamma-encoded default, so it must not claim to be linear.
    await expect(group).not.toContainText(/linear/i)
  })
})
