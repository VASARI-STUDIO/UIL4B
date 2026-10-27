// THE COLOURS AT WORK — the semantic set shown doing its job.
//
// Real usage examples, not swatch demos: a success switch, a warning on a
// field, a declined payment with its button, and two Information rows (a
// billing note and a publish in progress), because Information carries what the
// retired "pending" role meant. They sit in one panel that has its own
// Light / Dark switch.
//
// Held here: every role is shown as a real component; the panel repaints from
// the bundle the person chose and from nothing else; and every text and icon in
// it clears its floor, for every bundle and both Information hues, with the page
// in each theme and the panel walked through BOTH of its own themes.
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

// The panel's own Light / Dark switch, and the wait for the panel to follow it.
async function setPanelTheme(page, name) {
  await page.getByRole('group', { name: 'Preview theme' }).getByRole('button', { name, exact: true }).click()
  await expect(page.locator('.stc-work')).toHaveAttribute('data-theme', name.toLowerCase())
}

test.describe('semantic bundle usage examples', () => {
  test('every role is shown as a real component, and not all the same shape', async ({ page }) => {
    await open(page)
    const body = page.locator('.stc-work-body')
    await expect(body.locator('.stc-sc-solid'), 'a filled button').toHaveCount(1)
    await expect(body.locator('.stc-sc-solid')).toHaveText('Update card')
    await expect(body.locator('.stc-sc--success .stc-sc-switch'), 'a success switch').toHaveCount(1)
    await expect(body.locator('.stc-sc--warning .stc-sc-input'), 'a warning on a form field').toHaveCount(1)
    await expect(body.locator('.stc-sc--error'), 'an error row').toHaveCount(1)
    await expect(body.locator('.stc-sc--info'), 'information: a note and something underway').toHaveCount(2)
    await expect(body.locator('.stc-sc--info .stc-sc-badge'), 'the underway row carries its badge').toHaveText('In progress')
    await expect(body.locator('svg'), 'an icon beside every message').toHaveCount(5)
    await expect(body.locator(':scope > *'), 'five examples').toHaveCount(5)
    // The two Information rows share a class on purpose; count shapes by what
    // each row is made of, not by its role.
    const shapes = await body.locator(':scope > *').evaluateAll((els) => new Set(els.map(
      (e) => [...e.children].map((c) => (c.getAttribute('class') || c.tagName).split(' ')[0]).join('|'),
    )).size)
    expect(shapes, 'the examples should not collapse to one shape').toBeGreaterThanOrEqual(3)
  })

  test('the panel repaints from the bundle the user actually chose', async ({ page }) => {
    await open(page)
    const read = () => page.locator('.stc-work').evaluate(
      (el) => [...el.style].filter((p) => p.startsWith('--stc-')).map((p) => el.style.getPropertyValue(p)).join(' '),
    )
    const balanced = await read()
    expect(balanced, 'the panel should carry resolved --stc-* colours').toMatch(/#[0-9a-f]{6}/i)

    await page.getByRole('radio', { name: 'Material' }).click()
    const material = await read()
    expect(material, 'choosing another bundle must repaint the panel').not.toBe(balanced)
    await page.getByRole('radio', { name: 'Balanced' }).click()
    expect(await read(), 'and going back must restore it').toBe(balanced)

    // Not merely different: the success colour is a step of the success ramp,
    // whichever of its two themes the panel is showing.
    await page.getByRole('radio', { name: 'Tailwind' }).click()
    const ramp = await page.locator('[data-role="success"] .stc-cell').evaluateAll(
      (els) => els.map((e) => (e.getAttribute('aria-label').match(/#[0-9A-F]{6}/i) || [''])[0].toLowerCase()))
    expect(ramp, 'the ramp should list ten hexes').toHaveLength(10)
    for (const panelTheme of ['Light', 'Dark']) {
      await setPanelTheme(page, panelTheme)
      const success = await page.locator('.stc-work').evaluate((el) => el.style.getPropertyValue('--stc-success').trim().toLowerCase())
      expect(ramp, `the success colour must be a shade from the ramp beside it (${panelTheme} panel)`).toContain(success)
    }
  })

  for (const theme of ['light', 'dark']) {
    test(`every example clears its floor, for every bundle, both Information hues and both panel themes, with the page in ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: theme })
      await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private */ } }, theme)
      const page = await ctx.newPage()
      await open(page)
      // Names come from aria-label: each card's text also carries its description.
      const bundles = await page.locator('.stc-bundles [role="radio"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
      expect(bundles.length, 'no bundles found to sweep').toBeGreaterThan(1)

      const failures = []
      let measured = 0
      // The panel has its own theme. Walk BOTH, whatever the page is showing, so a
      // light panel on a dark page (and the reverse) is measured on its own ground.
      for (const panelTheme of ['Light', 'Dark']) {
        await setPanelTheme(page, panelTheme)
        for (const hue of ['Blue', 'Purple']) {
          const family = page.getByRole('button', { name: `${hue} family` })
          await family.click()
          await expect(family).toHaveAttribute('aria-pressed', 'true')
          for (const bundle of bundles) {
            const radio = page.getByRole('radio', { name: bundle, exact: true })
            await radio.click()
            await expect(radio).toHaveAttribute('aria-checked', 'true')
            for (const r of await page.evaluate(WALK)) {
              measured++
              if (r.ratio < r.floor) failures.push(`  ${panelTheme} panel / ${hue} / ${bundle} / ${r.kind} ${r.cls} — ${r.ratio}:1 under ${r.floor} ${JSON.stringify(r.text)}`)
            }
          }
        }
      }
      await ctx.close()
      expect(measured, 'the walk measured nothing at all').toBeGreaterThan(300)
      expect(failures.join('\n'), `a usage example is under its contrast floor with the page in ${theme}`).toBe('')
    })
  }
})
