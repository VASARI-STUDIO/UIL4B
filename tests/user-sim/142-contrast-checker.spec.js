// /create/contrast — the promises the pair-bar rework makes, one test each.
//
// The page answers one question: does this text colour read on this
// background? The tests below hold the things a person relies on when they use
// it, and each carries the mutation that turns it red.
//
//   * a displayed ratio is floored, never rounded, so no number on the page sits
//     at or above a threshold its own verdict says the pair fails
//   * the two colour fields, the specimen and the ratio are all on the first
//     screen of a phone
//   * a shared link (?fg=&bg=) sets the pair, and a bad value is ignored
//   * Copy result, Copy CSS and Copy link put the right text on the clipboard
//   * Use on a fix row applies that fix, and the verdict follows
//   * Swap swaps
//   * a half-typed hex stays quiet; a finished-looking wrong one says so, per
//     field, and never leaves the field invalid and silent
//   * every control is a 44px target on a phone, and nothing runs sideways at 320
//
// Expected values are written out by hand from the WCAG formula (checked with
// the test's own luminance function below), never read back from the page.
//
// MUTATIONS are listed on each test. Each was applied to the source, the page
// rebuilt, and the named test watched go red; the source was then restored.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// WCAG 2.2 relative luminance and ratio, written out here so the expectations
// do not borrow the page's own function.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratioOf = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const fgInput = (page) => page.locator('#cc-fg')
const bgInput = (page) => page.locator('#cc-bg')

/** A phone: real touch metrics (a coarse pointer), at an exact width. */
async function phone(browser, width, height = 844) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA,
  })
  await ctx.addInitScript(() => { try { localStorage.setItem('vs-t', 'light') } catch { /* private mode */ } })
  return { ctx, page: await ctx.newPage() }
}

/** Record what the page hands to the clipboard, instead of touching the system one. */
async function recordClipboard(page) {
  await page.addInitScript(() => {
    window.__clip = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text) => { window.__clip.push(text) } },
    })
  })
}
const copied = (page) => page.evaluate(() => window.__clip)

async function copyVia(page, rowName) {
  await page.locator('.tl-export-btn').click()
  await page.getByRole('menuitem', { name: rowName, exact: true }).click()
}

test.describe('Contrast Checker · the displayed number agrees with the verdict', () => {
  // #777777 on white is 4.478:1. Rounded it reads 4.48; floored, 4.47. Neither
  // reaches 4.5, but the point is the rule: a number is never lifted. The
  // sharper case is #5C7E6F, 4.4978:1, which a 2-place round shows as 4.50, the
  // exact figure that passes, beside a verdict that says it fails.
  //
  // MUTATION: in ContrastChecker.jsx make floorTo round instead of floor
  // (Math.round(r * 10 ** dp) / 10 ** dp). The 4.4978 case goes red first
  // ("4.50:1"); the #777777 case reads 4.48.
  test('a pair just under 4.5 shows a number under 4.5 and fails body text', async ({ page }) => {
    watch(page, 'a designer on a pair that nearly passes')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#777777')
    await bgInput(page).fill('#FFFFFF')
    await expect(page.locator('.cc-ratio-num')).toHaveText('4.47:1')
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Large text and UI parts only.')
    await expect(page.locator('.cc-check-mark')).toHaveText(['Fail', 'Fail', 'Pass', 'Fail', 'Pass'])

    await fgInput(page).fill('#5C7E6F')
    await expect(page.locator('.cc-ratio-num'), '4.4978:1 must not round up to 4.50').toHaveText('4.49:1')
    await expect(page.locator('.cc-check-mark').first()).toHaveText('Fail')
  })

  test('a pair just over 4.5 shows its true number and passes body text', async ({ page }) => {
    watch(page, 'a designer on the lightest grey that passes')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#767676')
    await bgInput(page).fill('#FFFFFF')
    // 4.5422:1.
    await expect(page.locator('.cc-ratio-num')).toHaveText('4.54:1')
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Passes AA for all text.')
    await expect(page.locator('.cc-check-mark').first()).toHaveText('Pass')
  })

  // The same rule on the kit pair cards: whatever number a card prints, the
  // mark beside it must be the one that number earns. With the palette seeded
  // to hold #5C7E6F against white (4.4978:1) a rounded card would read 4.50
  // beside "Large only".
  //
  // MUTATION: the same floorTo-rounds change; the card for the 4.49 pair then
  // reads 4.50 and the sweep reports it.
  test('no kit pair card prints a number its own mark contradicts', async ({ page }) => {
    watch(page, 'a designer reading the common pairs')
    const PALETTE = ['#5C7E6F', '#FFFFFF', '#0B0C0E', '#777777', '#767676']
    await page.addInitScript((colors) => {
      try { localStorage.setItem('vs-current-design', JSON.stringify({ palette: { base: colors[0], harmony: 'auto', colors } })) } catch { /* private mode */ }
    }, PALETTE)
    await go(page, '/create/contrast')
    const cards = await page.locator('.cc-pair').evaluateAll((els) => els.map((e) => ({
      ratio: e.querySelector('.cc-pair-ratio').textContent,
      mark: e.querySelector('.cc-pair-mark').textContent,
    })))
    expect(cards.length, 'the seeded kit offered no pairs').toBeGreaterThan(3)
    const earned = (n) => (n >= 7 ? 'AAA' : n >= 4.5 ? 'AA' : n >= 3 ? 'Large only' : 'Fails')
    const wrong = cards
      .map((c) => ({ ...c, n: parseFloat(c.ratio) }))
      .filter((c) => c.mark !== earned(c.n))
      .map((c) => `${c.ratio} is marked ${c.mark}, but that number earns ${earned(c.n)}`)
    expect(wrong).toEqual([])
    // The case this exists for is actually on the page.
    expect(cards.map((c) => c.ratio), 'the 4.4978:1 pair is missing from the cards').toContain('4.49:1')
  })
})

test.describe('Contrast Checker · the first screen of a phone', () => {
  // The fields, then the ratio, then at least the top 300px of the preview all
  // sit above the tab bar at 390x844, in that order. The colour fields used to
  // sit about 1,200px down the page. (Also held, with more cases, in 171.)
  //
  // MUTATION: in contrast.css give .cc .cc-pairbar `order: 2` (the fields drop
  // below the preview); the order assertion goes red.
  test('the fields, the ratio and the top 300px of the preview are in view at 390x844, in that order', async ({ browser }) => {
    const { ctx, page } = await phone(browser, 390)
    watch(page, 'someone checking a pair on their phone')
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-ratio-num')).toBeVisible()
    const read = await page.evaluate(() => {
      const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) } }
      const tabs = document.querySelector('.pnav-tabs')
      return {
        fg: box('#cc-fg'), bg: box('#cc-bg'), pv: box('.cc-pv'), ratio: box('.cc-ratio-num'),
        pairbar: box('.cc-pairbar'),
        floor: Math.round(tabs ? tabs.getBoundingClientRect().top : window.innerHeight),
        vh: window.innerHeight,
      }
    })
    expect(read.vh, 'the context is the 390x844 phone').toBe(844)
    expect(read.pairbar.top, 'the fields come first, above the ratio').toBeLessThan(read.ratio.top)
    expect(read.ratio.bottom, 'the ratio comes above the preview').toBeLessThanOrEqual(read.pv.top)
    for (const name of ['fg', 'bg', 'ratio']) {
      expect(read[name].top, `${name} starts on screen`).toBeGreaterThanOrEqual(0)
      expect(read[name].bottom, `${name} ends above the tab bar (${read.floor}px)`).toBeLessThanOrEqual(read.floor)
    }
    expect(read.floor - read.pv.top, 'the top 300px of the preview are above the tab bar').toBeGreaterThanOrEqual(300)
    await ctx.close()
  })
})

test.describe('Contrast Checker · a shared link sets the pair', () => {
  // MUTATION: in ContrastChecker.jsx make the seed ignore the query
  // (fg: '#6B7280', bg: '#FFFFFF' with no searchParams.get). The first case goes red.
  test('?fg=&bg= sets both colours and the ratio follows', async ({ page }) => {
    watch(page, 'someone opening a link a colleague copied')
    await go(page, '/create/contrast?fg=1F2937&bg=F8FAFC')
    await expect(fgInput(page)).toHaveValue('#1F2937')
    await expect(bgInput(page)).toHaveValue('#F8FAFC')
    // #1F2937 on #F8FAFC: 14.02:1 by the formula above, shown floored.
    const want = (Math.floor(ratioOf('#1F2937', '#F8FAFC') * 100) / 100).toFixed(2)
    expect(want).toBe('14.02')
    await expect(page.locator('.cc-ratio-num')).toHaveText(`${want}:1`)
  })

  test('three-digit codes are accepted, and each side is checked on its own', async ({ page }) => {
    watch(page, 'someone pasting shorthand hex into a link')
    await go(page, '/create/contrast?fg=fff&bg=000')
    await expect(fgInput(page)).toHaveValue('#FFFFFF')
    await expect(bgInput(page)).toHaveValue('#000000')
    await expect(page.locator('.cc-ratio-num')).toHaveText('21.00:1')
  })

  // MUTATION: in ContrastChecker.jsx seed from the raw query value
  // (searchParams.get('fg') || default) with no normaliseHex; "nope" then lands in the field.
  test('a bad or missing value is ignored and that side keeps its default', async ({ page }) => {
    watch(page, 'someone opening a mangled link')
    await go(page, '/create/contrast?fg=1F2937&bg=nope')
    await expect(fgInput(page)).toHaveValue('#1F2937')
    await expect(bgInput(page), 'an invalid bg falls back to the default').toHaveValue('#FFFFFF')

    await go(page, '/create/contrast?fg=zz&bg=12345')
    await expect(fgInput(page)).toHaveValue('#6B7280')
    await expect(bgInput(page)).toHaveValue('#FFFFFF')
    await expect(page.locator('.cc-ratio-num')).toHaveText('4.83:1')

    await go(page, '/create/contrast?bg=%3Cscript%3E')
    await expect(bgInput(page)).toHaveValue('#FFFFFF')
  })

  test('the address bar is read once and never written while typing', async ({ page }) => {
    watch(page, 'someone editing a pair they were sent')
    await go(page, '/create/contrast?fg=1F2937&bg=F8FAFC')
    const before = page.url()
    await fgInput(page).fill('#000000')
    await expect(page.locator('.cc-ratio-num')).toHaveText('20.07:1')
    expect(page.url()).toBe(before)
  })
})

test.describe('Contrast Checker · taking the result away', () => {
  // The three rows of the Copy menu, with the exact text each puts on the
  // clipboard for #6B7280 on #FFFFFF (4.8345:1, shown 4.83).
  //
  // MUTATIONS, one per row, in ContrastChecker.jsx:
  //   Copy result: flip the Pass/Fail words (passes(t.min) ? 'Fail' : 'Pass')
  //   Copy CSS:    write the background into --color-text
  //   Copy link:   build the link with fg and bg exchanged
  const RESULT = [
    'Text #6B7280 on background #FFFFFF',
    'Contrast 4.83:1 (WCAG 2.2)',
    'Normal text, AA 4.5:1: Pass',
    'Normal text, AAA 7:1: Fail',
    'Large text, AA 3:1: Pass',
    'Large text, AAA 4.5:1: Pass',
    'UI components and graphics, AA 3:1: Pass',
  ].join('\n')

  test('the Copy menu lists Copy result, Copy CSS and Copy link, in that order', async ({ page }) => {
    watch(page, 'someone looking for a way to share the result')
    await recordClipboard(page)
    await go(page, '/create/contrast')
    await expect(page.locator('.tl-export-btn')).toHaveAccessibleName('Copy')
    await page.locator('.tl-export-btn').click()
    await expect(page.getByRole('menu', { name: 'Copy' })).toBeVisible()
    await expect(page.getByRole('menuitem')).toHaveText(['Copy result', 'Copy CSS', 'Copy link'])
  })

  test('Copy result writes the pair, the ratio and all five tests', async ({ page }) => {
    watch(page, 'someone pasting the result into a ticket')
    await recordClipboard(page)
    await go(page, '/create/contrast')
    await copyVia(page, 'Copy result')
    await expect.poll(() => copied(page)).toEqual([RESULT])
  })

  test('Copy CSS writes both custom properties with the ratio in a comment', async ({ page }) => {
    watch(page, 'a developer taking the pair into a stylesheet')
    await recordClipboard(page)
    await go(page, '/create/contrast')
    await copyVia(page, 'Copy CSS')
    await expect.poll(() => copied(page)).toEqual([
      '--color-text: #6B7280;\n--color-background: #FFFFFF; /* 4.83:1, WCAG 2.2 AA for normal text */',
    ])

    // A pair under AA says so rather than naming a level it does not reach.
    await fgInput(page).fill('#777777')
    await expect(page.locator('.cc-ratio-num')).toHaveText('4.47:1')
    await copyVia(page, 'Copy CSS')
    await expect.poll(() => copied(page)).toEqual([
      '--color-text: #6B7280;\n--color-background: #FFFFFF; /* 4.83:1, WCAG 2.2 AA for normal text */',
      '--color-text: #777777;\n--color-background: #FFFFFF; /* 4.47:1, below WCAG 2.2 AA for normal text */',
    ])
  })

  test('Copy link writes an address that opens the same pair', async ({ page }) => {
    watch(page, 'someone sharing a pair')
    await recordClipboard(page)
    await go(page, '/create/contrast')
    await fgInput(page).fill('#1F2937')
    await bgInput(page).fill('#F8FAFC')
    await expect(page.locator('.cc-ratio-num')).toHaveText('14.02:1')
    await copyVia(page, 'Copy link')
    const origin = new URL(page.url()).origin
    await expect.poll(() => copied(page)).toEqual([`${origin}/create/contrast?fg=1F2937&bg=F8FAFC`])

    // And the link does what it says.
    const [link] = await copied(page)
    await go(page, link.replace(origin, ''))
    await expect(fgInput(page)).toHaveValue('#1F2937')
    await expect(bgInput(page)).toHaveValue('#F8FAFC')
  })
})

test.describe('Contrast Checker · Use applies a fix', () => {
  // #777777 on white is 4.478:1, so AA is the next level. Darkening the text a
  // single step to #767676 clears it (4.54:1), and lightening the background
  // alone cannot, so the page has one fix per side and the text one comes
  // first.
  //
  // MUTATION: in ContrastChecker.jsx make applyFix do nothing
  // (const applyFix = () => {}); the field never changes and the verdict stays.
  test('Use on the text fix puts that colour in the field and the verdict passes', async ({ page }) => {
    watch(page, 'a designer taking the nearest passing text colour')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#777777')
    await bgInput(page).fill('#FFFFFF')
    await expect(page.locator('.cc-ratio-verdict')).toHaveText('Large text and UI parts only.')

    const fix = page.locator('.cc-fix').first()
    await expect(fix.locator('.cc-fix-line')).toContainText('Darken text to')
    const offered = (await fix.locator('.cc-fix-line strong').textContent()).toUpperCase()
    expect(ratioOf(offered, '#FFFFFF'), `the offered ${offered} must clear 4.5:1`).toBeGreaterThanOrEqual(4.5)

    await fix.getByRole('button', { name: /^Use / }).click()
    await expect(fgInput(page)).toHaveValue(offered)
    await expect(bgInput(page), 'a text fix leaves the background alone').toHaveValue('#FFFFFF')
    await expect(page.locator('.cc-ratio-verdict')).toHaveText(/^Passes AA/)
    await expect(page.locator('.cc-check-mark').first()).toHaveText('Pass')
  })

  test('Use on the background fix changes the background and leaves the text alone', async ({ page }) => {
    watch(page, 'a designer who must keep the brand text colour')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#000099')
    await bgInput(page).fill('#009900')
    const fix = page.locator('.cc-fix').nth(1)
    await expect(fix.locator('.cc-fix-line')).toContainText('background to')
    const offered = (await fix.locator('.cc-fix-line strong').textContent()).toUpperCase()

    await fix.getByRole('button', { name: /^Use / }).click()
    await expect(bgInput(page)).toHaveValue(offered)
    await expect(fgInput(page)).toHaveValue('#000099')
    expect(ratioOf('#000099', offered)).toBeGreaterThanOrEqual(4.5)
    await expect(page.locator('.cc-ratio-verdict')).toHaveText(/^Passes AA/)
  })
})

test.describe('Contrast Checker · Swap', () => {
  // MUTATION: in ContrastChecker.jsx make swap write the background into both
  // (setFgHex(bg); setBgHex(bg)).
  test('Swap exchanges the two colours, keeps the ratio, and swaps back', async ({ page }) => {
    watch(page, 'a designer flipping a pair')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#1F2937')
    await bgInput(page).fill('#F8FAFC')
    await expect(page.locator('.cc-ratio-num')).toHaveText('14.02:1')
    const swap = page.getByRole('button', { name: 'Swap text and background' })
    await swap.click()
    await expect(fgInput(page)).toHaveValue('#F8FAFC')
    await expect(bgInput(page)).toHaveValue('#1F2937')
    await expect(page.locator('.cc-ratio-num'), 'the ratio is symmetric').toHaveText('14.02:1')
    await swap.click()
    await expect(fgInput(page)).toHaveValue('#1F2937')
    await expect(bgInput(page)).toHaveValue('#F8FAFC')
  })
})

test.describe('Contrast Checker · a hex that is not finished or not right', () => {
  const hint = (page, side) => page.locator(`#cc-${side}-hint`)

  // MUTATION: in ContrastChecker.jsx lower the length floor in showsHint to 1
  // (.trim().length >= 1); "#6B" then raises the hint and the first expectation goes red.
  test('a half-typed code stays quiet', async ({ page }) => {
    watch(page, 'someone typing a hex')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#6B')
    await expect(hint(page, 'fg')).toHaveText('')
    await expect(fgInput(page)).toHaveAttribute('aria-invalid', 'false')
    // The page keeps checking the last valid pair meanwhile.
    await expect(page.locator('.cc-ratio-num')).toHaveText('4.83:1')
  })

  // MUTATION: in ContrastChecker.jsx delete the aria-describedby from the input;
  // the accessible-description expectation goes red.
  test('a finished-looking wrong code names the field and the colour still in use', async ({ page }) => {
    watch(page, 'someone mistyping a hex')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#6B72Z')
    await expect(hint(page, 'fg')).toHaveText('Use a hex code like #1F2937. Still checking #6B7280.')
    await expect(fgInput(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(fgInput(page)).toHaveAccessibleDescription(/Use a hex code like #1F2937/)
    // Only the field that is wrong speaks, and it speaks politely, not as an alert.
    await expect(hint(page, 'bg')).toHaveText('')
    await expect(bgInput(page)).toHaveAttribute('aria-invalid', 'false')
    await expect(hint(page, 'fg')).toHaveAttribute('aria-live', 'polite')
    await expect(page.locator('.cc [role="alert"]')).toHaveCount(0)
    // And the result never blanks: it is still the last valid pair.
    await expect(page.locator('.cc-ratio-num')).toHaveText('4.83:1')

    await bgInput(page).fill('GGGGGG')
    await expect(hint(page, 'bg')).toHaveText('Use a hex code like #1F2937. Still checking #FFFFFF.')
  })

  // Leaving the field puts the last valid colour back, so the field is valid
  // again and the hint goes with it. The state to rule out is the other one: a
  // field left holding a wrong value with its hint gone.
  //
  // MUTATION: in ContrastChecker.jsx make the field's onBlur do nothing; the
  // field keeps "#6B72Z" while the hint stays, and the revert expectation goes red.
  test('on blur the field returns to the last valid colour, so it is never invalid and silent', async ({ page }) => {
    watch(page, 'someone tabbing away from a typo')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#6B72Z')
    await expect(hint(page, 'fg')).not.toHaveText('')
    await bgInput(page).focus()
    await expect(fgInput(page)).toHaveValue('#6B7280')
    await expect(fgInput(page)).toHaveAttribute('aria-invalid', 'false')
    await expect(hint(page, 'fg')).toHaveText('')

    // A valid edit survives a blur untouched.
    await fgInput(page).fill('#1F2937')
    await bgInput(page).focus()
    await expect(fgInput(page)).toHaveValue('#1F2937')

    // Enter commits the same way a blur does.
    await fgInput(page).fill('nope!')
    await expect(hint(page, 'fg')).not.toHaveText('')
    await fgInput(page).press('Enter')
    await expect(fgInput(page)).toHaveValue('#1F2937')
    await expect(hint(page, 'fg')).toHaveText('')
  })
})

test.describe('Contrast Checker · the "How contrast is measured" link', () => {
  const NAME = 'How contrast is measured (opens in a new tab)'
  const link = (page) => page.getByRole('link', { name: NAME, exact: true })

  // The article is long and the person is mid-check, so it opens beside the
  // checker, and the link says so before it is followed.
  //
  // MUTATION 1: in ContrastChecker.jsx put back the router Link (to=...) for the
  // anchor; the target and href expectations go red. MUTATION 2: delete rel="noopener"; the rel
  // expectation goes red. MUTATION 3: delete the sr-only span; no link has the
  // name, and the lookup times out.
  test('is a new-tab anchor with noopener, an icon and a name that says so', async ({ page }) => {
    watch(page, 'a designer who wants the reasoning behind the numbers')
    await go(page, '/create/contrast')
    await expect(link(page), 'one link, named for a screen reader').toHaveCount(1)
    await expect(link(page)).toHaveAttribute('href', '/learn/colour-contrast')
    await expect(link(page)).toHaveAttribute('target', '_blank')
    await expect(link(page)).toHaveAttribute('rel', /(^|\s)noopener(\s|$)/)
    await expect(link(page).locator('svg'), 'the arrow icon').toHaveCount(1)
    // The icon is decoration: the visible words and the sr-only hint are the whole name.
    await expect(link(page).locator('svg')).toHaveAttribute('aria-hidden', 'true')
    await expect(link(page)).toHaveText('How contrast is measured (opens in a new tab)')
    // The hint is hidden from sight, so it cannot push the visible link wider than its words.
    const hint = link(page).locator('.sr-only')
    await expect(hint).toHaveText(' (opens in a new tab)')
    expect((await hint.boundingBox()).width, 'the hint is visually hidden').toBeLessThanOrEqual(1)
  })

  // MUTATION: change target="_blank" to target="_self" (or put the router Link
  // back); the popup never arrives and the wait times out. (Dropping rel does not turn this red: browsers
  // treat target=_blank as noopener, so window.opener stays null. The rel attribute test above catches that.)
  test('clicking it opens the article in a new tab and leaves the checker as it was', async ({ page }) => {
    watch(page, 'a designer mid-check who wants the explanation')
    await go(page, '/create/contrast?fg=1F2937&bg=F8FAFC')
    await expect(page.locator('.cc-ratio-num')).toHaveText('14.02:1')
    await fgInput(page).fill('#374151')
    const before = page.url()
    const colours = [await fgInput(page).inputValue(), await bgInput(page).inputValue()]
    expect(colours).toEqual(['#374151', '#F8FAFC'])
    const ratio = await page.locator('.cc-ratio-num').textContent()

    const [popup] = await Promise.all([page.waitForEvent('popup'), link(page).click()])
    await popup.waitForLoadState('domcontentloaded')
    expect(new URL(popup.url()).pathname).toBe('/learn/colour-contrast')
    expect(page.url(), 'the checker stays at its own address').toBe(before)
    await expect(fgInput(page)).toHaveValue('#374151')
    await expect(bgInput(page)).toHaveValue('#F8FAFC')
    await expect(page.locator('.cc-ratio-num')).toHaveText(ratio)
    // window.opener, not Playwright's popup.opener(): Chromium reports the opener there even for noopener.
    expect(await popup.evaluate(() => window.opener), 'noopener: the new tab has no handle back to the checker').toBeNull()
    await popup.close()
  })
})

test.describe('Contrast Checker · the explainer wording', () => {
  // The three bullets are the quick answer to "what do AA and AAA mean here".
  // Their wording, per theme and per pair, is held in 170; this holds the one
  // fact the old note had wrong.
  //
  // MUTATION: put "19px bold" back into the Large text bullet; the 19px
  // expectation and the 18.66px expectation both go red.
  test('names 4.5:1, 3:1, 7:1, 24px and 18.66px, and never 19px', async ({ page }) => {
    watch(page, 'a designer deciding if 19px bold text counts as large')
    await go(page, '/create/contrast')
    const text = await page.locator('.cc-note').innerText()
    for (const needle of ['4.5:1', '3:1', '7:1', '24px', '18.66px']) expect(text, needle).toContain(needle)
    expect(text).not.toContain('19px')
  })
})

test.describe('Contrast Checker · a thumb on a phone', () => {
  // MUTATION: in contrast.css lower the coarse-pointer swatch to 32px
  // (.cc .cc-swatch { width: 32px; height: 32px }); the swatches go red.
  // Same for the measurement link: lower `.cc .cc-note-link { min-height: 44px }`
  // inside @media (pointer: coarse) to 24px and it goes red.
  test('every control is at least 44px at 390', async ({ browser }) => {
    const { ctx, page } = await phone(browser, 390)
    watch(page, 'someone using the checker with a thumb')
    // A failing pair, so the fix rows (Use, Copy) are on the page too.
    await go(page, '/create/contrast')
    await fgInput(page).fill('#777777')
    await expect(page.locator('.cc-fix')).toHaveCount(2)
    const read = await page.evaluate(() => ({
      coarse: matchMedia('(pointer: coarse)').matches,
      boxes: [
        '.cc-picker', '.cc-hex-input', '.cc-swap', '.cc-fix-use', '.cc-fix-copy', '.cc-pair', '.cc-swatch',
        '.tl-export-btn', '.cc-note-link', '.cc-lg-chip',
      ].flatMap((sel) => [...document.querySelectorAll(sel)].map((el, i) => {
        const r = el.getBoundingClientRect()
        return { sel: `${sel}[${i}]`, w: Math.round(r.width), h: Math.round(r.height) }
      })),
      counts: ['.cc-picker', '.cc-hex-input', '.cc-swap', '.cc-fix-use', '.cc-fix-copy', '.cc-pair', '.cc-swatch', '.cc-note-link', '.cc-lg-chip']
        .map((sel) => [sel, document.querySelectorAll(sel).length]),
    }))
    expect(read.coarse, 'the context must present a coarse pointer').toBe(true)
    // POSITIVE CONTROL: every kind of control was found.
    for (const [sel, n] of read.counts) expect(n, `${sel} was not on the page`).toBeGreaterThan(0)
    expect(read.boxes.filter((b) => b.w < 44 || b.h < 44), 'controls under 44px').toEqual([])
    await ctx.close()
  })

  // At 320 the pair bar is the tightest it gets: a 72px label, a 44px picker, a
  // hex field and the 44px Swap, in 296px.
  //
  // MUTATION: in contrast.css add `white-space: nowrap` to .cc .cc-explain; the
  // explainer lines stop wrapping and the page runs past the edge. (The old target,
  // .cc-spec-body, is no longer on screen: Interface is the first view.)
  test('nothing runs sideways at 320, with a hint showing and two fixes listed', async ({ browser }) => {
    const { ctx, page } = await phone(browser, 320, 568)
    watch(page, 'someone on the narrowest phone')
    await go(page, '/create/contrast')
    await fgInput(page).fill('#777777')
    await expect(page.locator('.cc-fix')).toHaveCount(2)
    await bgInput(page).fill('#12345Z')
    await expect(page.locator('#cc-bg-hint')).not.toHaveText('')

    const read = await page.evaluate(() => {
      const vw = window.innerWidth
      const wide = [...document.querySelectorAll('.cc *')]
        .filter((el) => !el.closest('.sr-only') && el.getClientRects().length)
        .map((el) => ({ cls: String(el.className).slice(0, 40) || el.tagName, right: Math.round(el.getBoundingClientRect().right) }))
        .filter((x) => x.right > vw + 1)
      return { vw, scrollW: document.documentElement.scrollWidth, wide }
    })
    expect(read.vw).toBe(320)
    expect(read.scrollW, 'the page scrolls sideways').toBeLessThanOrEqual(320)
    expect(read.wide, 'elements past the right edge').toEqual([])
    await ctx.close()
  })
})
