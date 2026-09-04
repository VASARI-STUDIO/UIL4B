// prefers-contrast: more, measured on the RENDERED page.
//
// The unit half (tests/unit/prefers-contrast.test.js) does the arithmetic on the
// declared values and guards the source ordering. This half exists because the
// original finding could ONLY be made here: global.css had zero prefers-contrast
// rules, and the way that was established was by rendering the app with the
// browser reporting the preference and reading the resolved tokens back —
// --border #dad8cf, --t2 #5f5f59, --t3 #6c6c66, byte-identical to the default.
//
// A media query adds NO specificity. Every selector involved is (0,1,0), so a
// correct block placed above the Foundry [data-theme] blocks reads perfectly in
// the sheet and paints nothing at all. Only getComputedStyle can tell those two
// situations apart, which is the whole reason this file is not just the unit
// test again.
//
// THE VACUOUS-PASS GUARD IS THE FIRST ASSERTION IN EVERY TEST. If Playwright's
// `contrast` context option ever stops emulating the preference, these tests
// would compare the default page against the default page and pass while
// asserting nothing. So each one first makes the page confirm, via matchMedia,
// that it really is being asked for more contrast.
import { test, expect } from './base.js'
import { go } from './helpers.js'

const TOKENS = ['--t1', '--t2', '--t3', '--border', '--bh', '--accent', '--accent-strong']

const srgb = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const ratio = (a, b) => {
  const hi = Math.max(lum(a), lum(b))
  const lo = Math.min(lum(a), lum(b))
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

const GROUNDS = {
  light: ['#FFFFFF', '#EFEEE9', '#F6F5F1'],
  dark: ['#101012', '#151619', '#191A1D', '#212327'],
}
const rgbOf = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

/** Resolve the tokens as the browser actually computes them. */
const readTokens = (page) => page.evaluate((tokens) => {
  const cs = getComputedStyle(document.documentElement)
  const out = {}
  for (const t of tokens) {
    // Resolve through a probe so any form (hex, rgb(), a var chain) comes back
    // as rgb() rather than as whatever the sheet happened to type.
    const probe = document.createElement('span')
    probe.style.color = cs.getPropertyValue(t).trim()
    document.body.appendChild(probe)
    const v = getComputedStyle(probe).color
    probe.remove()
    out[t] = (v.match(/\d+/g) || []).map(Number).slice(0, 3)
  }
  return out
}, TOKENS)

const open = async (browser, theme, contrast) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: theme,
    contrast,
  })
  const page = await ctx.newPage()
  await page.addInitScript((t) => {
    try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
  }, theme)
  await go(page, '/')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
    .toBe(theme)
  return { ctx, page }
}

test.describe('a visitor who asks their OS for more contrast gets a different page', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme}: every token the preference touches actually changes on the page`, async ({ browser }) => {
      const more = await open(browser, theme, 'more')
      expect(
        await more.page.evaluate(() => matchMedia('(prefers-contrast: more)').matches),
        'the browser is really reporting prefers-contrast: more — without this the '
        + 'comparison below is the default page against itself',
      ).toBe(true)
      const withPref = await readTokens(more.page)
      await more.ctx.close()

      const plain = await open(browser, theme, 'no-preference')
      expect(
        await plain.page.evaluate(() => matchMedia('(prefers-contrast: more)').matches),
        'the control page must NOT be reporting the preference',
      ).toBe(false)
      const without = await readTokens(plain.page)
      await plain.ctx.close()

      const unchanged = TOKENS.filter((t) => String(withPref[t]) === String(without[t]))
      expect(
        unchanged.join(', '),
        'these tokens resolve identically with and without prefers-contrast: more, so '
        + 'the preference is being received and ignored for them. If the block looks '
        + 'correct in global.css, check it sits BELOW the Foundry [data-theme] blocks — '
        + 'a media query adds no specificity.',
      ).toBe('')
    })

    test(`${theme}: the strengthened tokens clear their floors as rendered`, async ({ browser }) => {
      const { ctx, page } = await open(browser, theme, 'more')
      expect(
        await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches),
        'the browser is really reporting prefers-contrast: more',
      ).toBe(true)
      const t = await readTokens(page)
      await ctx.close()

      const worst = (token) => Math.min(...GROUNDS[theme].map((g) => ratio(t[token], rgbOf(g))))
      const failures = []
      for (const token of ['--t1', '--t2', '--t3', '--accent', '--accent-strong']) {
        if (worst(token) < 7) failures.push(`  ${token} ${worst(token)}:1 (AAA body text is 7:1)`)
      }
      if (worst('--border') < 3) failures.push(`  --border ${worst('--border')}:1 (1.4.11 asks 3:1)`)
      if (worst('--bh') < 4.5) failures.push(`  --bh ${worst('--bh')}:1 (must stay distinct from --border)`)
      // The ladder has to survive, or the preference has flattened the page.
      if (!(worst('--t1') > worst('--t2') && worst('--t2') > worst('--t3'))) {
        failures.push(`  the text roles are no longer a ladder: ${worst('--t1')} / ${worst('--t2')} / ${worst('--t3')}`)
      }
      expect(failures.join('\n'), `${theme} tokens under prefers-contrast: more`).toBe('')
    })
  }
})
