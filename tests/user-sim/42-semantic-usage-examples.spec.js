// THE COLOURS AT WORK — the semantic set shown doing its job.
//
// Real usage examples, not swatch demos. On this screen that is the design's
// drawn card
// (D:883-907): a primary button, a success alert, a warning alert, an error
// field — plus two Information rows, because Information now carries what the
// retired "pending" role meant.
//
// Held here: every role is shown as a real component; the card repaints from
// the pack the person chose and from nothing else; and every text and icon in
// it clears its floor, for every pack, in both themes.
import { test, expect } from './base.js'
import { go } from './helpers.js'

const WALK = `(() => {
  const px = (c) => { const m = c.match(/[\\d.]+/g); if (!m) return null; const n = m.slice(0,3).map(Number); return /^color\\(srgb/.test(c) ? n.map((v) => v * 255) : n }
  const alpha = (c) => { const m = c.match(/[\\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1 }
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2])
  const cr = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) }
  const over = (fg, fa, bg) => fg.map((c, i) => c * fa + bg[i] * (1 - fa))
  function ground(el) {
    if (!el || el === document.documentElement) return [255, 255, 255]
    const c = getComputedStyle(el).backgroundColor
    const a = alpha(c)
    if (a > 0 && px(c)) return a >= 1 ? px(c) : over(px(c), a, ground(el.parentElement))
    return ground(el.parentElement)
  }
  const out = []
  const card = document.querySelector('.stc-work-body')
  for (const el of card.querySelectorAll('*')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const cs = getComputedStyle(el)
    const fg = px(cs.color), fa = alpha(cs.color), bg = ground(el)
    out.push({ kind: 'text', cls: String(el.className).split(' ')[0], text: el.textContent.trim().slice(0, 30),
               ratio: +cr(fa === 1 ? fg : over(fg, fa, bg), bg).toFixed(2), floor: 4.5 })
  }
  for (const el of card.querySelectorAll('svg')) {
    const fg = px(getComputedStyle(el).color)
    out.push({ kind: 'icon', cls: String(el.getAttribute('class')).split(' ')[0], text: '',
               ratio: +cr(fg, ground(el.parentElement)).toFixed(2), floor: 3 })
  }
  return out
})()`

async function open(page) {
  await go(page, '/create/semantic-color')
  await expect(page.locator('.stc-work-body')).toBeVisible()
}

test.describe('semantic pack usage examples', () => {
  test('every role is shown as a real component, and not all the same shape', async ({ page }) => {
    await open(page)
    const body = page.locator('.stc-work-body')
    await expect(body.locator('.stc-btn--primary'), 'a filled button').toHaveCount(1)
    await expect(body.locator('.stc-alert--success'), 'a success alert').toHaveCount(1)
    await expect(body.locator('.stc-alert--warning'), 'a warning alert').toHaveCount(1)
    await expect(body.locator('.stc-alert--info'), 'information: a note and something underway').toHaveCount(2)
    await expect(body.locator('.stc-field-input'), 'a form field in error').toHaveCount(1)
    await expect(body.locator('svg'), 'an icon beside every message').toHaveCount(5)
    const shapes = await body.locator(':scope > *').evaluateAll((els) => new Set(els.map((e) => e.className.toString().split(' ')[0])).size)
    expect(shapes, 'the examples should not collapse to one shape').toBeGreaterThanOrEqual(3)
  })

  test('the card repaints from the pack the user actually chose', async ({ page }) => {
    await open(page)
    const read = () => page.locator('.stc-work').evaluate(
      (el) => [...el.style].filter((p) => p.startsWith('--stc-')).map((p) => el.style.getPropertyValue(p)).join(' '),
    )
    const balanced = await read()
    expect(balanced, 'the card should carry resolved --stc-* colours').toMatch(/#[0-9a-f]{6}/i)

    await page.getByRole('radio', { name: 'Material' }).click()
    const material = await read()
    expect(material, 'choosing another bundle must repaint the card').not.toBe(balanced)
    await page.getByRole('radio', { name: 'Balanced' }).click()
    expect(await read(), 'and going back must restore it').toBe(balanced)

    // Not merely different: the success colour is a step of the success ramp.
    await page.getByRole('radio', { name: 'Tailwind' }).click()
    const success = await page.locator('.stc-work').evaluate((el) => el.style.getPropertyValue('--stc-success').trim().toLowerCase())
    const ramp = await page.locator('[data-role="success"] .stc-cell').evaluateAll(
      (els) => els.map((e) => (e.getAttribute('aria-label').match(/#[0-9A-F]{6}/i) || [''])[0].toLowerCase()))
    expect(ramp, 'the success colour must be a shade from the ramp beside it').toContain(success)
  })

  for (const theme of ['light', 'dark']) {
    test(`every example clears its floor, for every pack and both Information hues, in ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: theme })
      await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private */ } }, theme)
      const page = await ctx.newPage()
      await open(page)
      const bundles = await page.locator('.stc-bundles [role="radio"]').allTextContents()
      expect(bundles.length, 'no bundles found to sweep').toBeGreaterThan(1)

      const failures = []
      let measured = 0
      for (const hue of ['Blue', 'Purple']) {
        await page.getByRole('button', { name: hue, exact: true }).click()
        for (const bundle of bundles) {
          await page.getByRole('radio', { name: bundle }).click()
          await page.waitForTimeout(80)
          for (const r of await page.evaluate(WALK)) {
            measured++
            if (r.ratio < r.floor) failures.push(`  ${hue} / ${bundle} / ${r.kind} ${r.cls} — ${r.ratio}:1 under ${r.floor} ${JSON.stringify(r.text)}`)
          }
        }
      }
      await ctx.close()
      expect(measured, 'the walk measured nothing at all').toBeGreaterThan(150)
      expect(failures.join('\n'), `a usage example is under its contrast floor in ${theme}`).toBe('')
    })
  }
})
