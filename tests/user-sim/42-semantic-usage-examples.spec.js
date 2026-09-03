// The semantic pack's usage examples — the founder asked for "swatch demos
// replaced with real usage examples: icons, buttons, switches, alerts".
//
// WHY THIS SPEC EXISTS, and why it is a rendered one.
//
// Two properties make a usage example worth more than a swatch, and NEITHER of
// them can be checked in the source:
//
//  1. IT SHOWS THE USER'S OWN COLOURS. A demo painted from fixed sample hexes
//     drifts from the pack it claims to illustrate, which is worse than a
//     swatch because it is confidently wrong. The scenes paint from custom
//     properties derived from the resolved ramp, so choosing a different bundle
//     must repaint them. That is a comparison between two rendered states.
//
//  2. IT STAYS LEGIBLE FOR EVERY PACK. The first cut used fixed shade steps —
//     text at 800, fills at 600 — and measured 18 failures across the bundles,
//     because the packs do not all have the same ramp shape: Material's warning
//     800 is a bright orange (#ef6c00) that gives 2.90:1 on its own fill, and
//     white on Material's error 600 is 4.23:1 — a destructive button whose
//     label misses AA. Those are invisible to the eye and invisible to a grep.
//     The scene colours are chosen by contrast now, and this is what says they
//     stay chosen that way, for EVERY bundle, in BOTH panels.
//
// Like 39-accent-contrast, this asserts a COMPUTED ratio off real nodes and
// composites translucent ancestors to find the true ground. The panels are
// fixed light/dark grounds by design — they depict two interfaces, not this
// page — so both are measured on one load.
import { test, expect } from './base.js'

const ROLES = ['success', 'warning', 'error', 'info', 'pending']

// Walk every text node and every icon inside the scenes and return its ratio
// against the ground actually painted behind it.
const WALK = `(() => {
  const px = (c) => { const m = c.match(/[\\d.]+/g); return m ? m.slice(0,3).map(Number) : null }
  const alpha = (c) => { const m = c.match(/[\\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1 }
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2])
  const cr = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) }
  const over = (fg, fa, bg) => fg.map((c, i) => c * fa + bg[i] * (1 - fa))
  function ground(el) {
    let n = el
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor
      const a = alpha(c)
      if (a > 0) return a === 1 ? px(c) : over(px(c), a, ground(n.parentElement))
      n = n.parentElement
    }
    return [255, 255, 255]
  }
  const out = []
  for (const panel of document.querySelectorAll('.stc-preview')) {
    const dark = panel.classList.contains('stc-preview--dark')
    ;[...panel.querySelectorAll('.stc-scene')].forEach((scene, i) => {
      const role = ${JSON.stringify(ROLES)}[i] || '?'
      for (const el of scene.querySelectorAll('*')) {
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue
        const cs = getComputedStyle(el)
        const fg = px(cs.color), fa = alpha(cs.color), bg = ground(el)
        const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400
        const large = size >= 24 || (size >= 18.66 && weight >= 700)
        out.push({ kind: 'text', dark, role, cls: (el.className.toString().split(' ')[0] || el.tagName.toLowerCase()),
                   text: el.textContent.trim().slice(0, 30),
                   ratio: +cr(fa === 1 ? fg : over(fg, fa, bg), bg).toFixed(2), floor: large ? 3 : 4.5 })
      }
      // Icons and the switch knob are non-text UI: WCAG 1.4.11 asks 3:1.
      for (const el of scene.querySelectorAll('svg, .stc-sc-switch i')) {
        const cs = getComputedStyle(el)
        const isSvg = el.tagName.toLowerCase() === 'svg'
        const fg = px(isSvg ? cs.color : cs.backgroundColor)
        if (!fg) continue
        out.push({ kind: isSvg ? 'icon' : 'switch-knob', dark, role,
                   cls: (el.getAttribute('class') || 'knob').split(' ')[0], text: '',
                   ratio: +cr(fg, ground(el.parentElement)).toFixed(2), floor: 3 })
      }
    })
  }
  return out
})()`

async function open(page) {
  await page.goto('/create/semantic-color')
  await expect(page.locator('.stc-scene').first()).toBeVisible()
}

test.describe('semantic pack usage examples', () => {
  test('every role is shown as a real component, and they are not five of the same shape', async ({ page }) => {
    await open(page)

    // Two panels x five roles.
    await expect(page.locator('.stc-preview')).toHaveCount(2)
    await expect(page.locator('.stc-scene')).toHaveCount(ROLES.length * 2)

    // The founder named four component types. Each must actually be present,
    // and each must be a DIFFERENT object - the whole complaint about the old
    // preview was that five roles wore one shape.
    const light = page.locator('.stc-preview').first()
    await expect(light.locator('.stc-sc-switch'), 'a switch').toHaveCount(1)
    await expect(light.locator('.stc-sc-solid'), 'a filled button').toHaveCount(1)
    await expect(light.locator('.stc-sc-alert'), 'an alert').toHaveCount(1)
    await expect(light.locator('.stc-sc-input'), 'a form field').toHaveCount(1)
    await expect(light.locator('.stc-sc-badge'), 'a status badge').toHaveCount(1)
    await expect(light.locator('.stc-scene svg'), 'an icon in every scene').toHaveCount(4)

    // Not five identical rows: count the distinct top-level scene classes.
    const shapes = await light.locator('.stc-scene > *').evaluateAll(
      els => new Set(els.map(e => e.className.toString().split(' ')[0])).size,
    )
    expect(shapes, 'the five scenes should not collapse to one shape').toBeGreaterThan(3)
  })

  test('the scenes repaint from the pack the user actually chose', async ({ page }) => {
    await open(page)

    // The property that separates a usage example from a decorative mock-up.
    const read = () => page.locator('.stc-scene').first().evaluate(
      el => [...el.style].filter(p => p.startsWith('--stc-')).map(p => el.style.getPropertyValue(p)).join(' '),
    )

    const balanced = await read()
    expect(balanced, 'a scene should carry resolved --stc-* colours').toMatch(/#[0-9a-f]{6}/i)

    await page.getByRole('radio', { name: /^Material/ }).click()
    const material = await read()
    expect(material, 'choosing another bundle must repaint the scenes').not.toBe(balanced)

    await page.getByRole('radio', { name: /^Balanced/ }).click()
    expect(await read(), 'and going back must restore them').toBe(balanced)

    // Not merely different — the colour has to be the one the ramp shows. The
    // success ramp's 600 cell is the shade the switch track is built from.
    await page.getByRole('radio', { name: /^Tailwind/ }).click()
    const trackHex = await page.locator('.stc-scene').first().evaluate(
      el => el.style.getPropertyValue('--stc-solid').trim().toLowerCase(),
    )
    const rampHexes = await page.locator('.stc-role').first().locator('.stc-cell-hex')
      .evaluateAll(els => els.map(e => '#' + e.textContent.trim().toLowerCase()))
    expect(rampHexes, 'the switch colour must be a shade from the ramp above it').toContain(trackHex)
  })

  test('every scene clears its contrast floor, for every pack, in both panels', async ({ page }) => {
    await open(page)
    const bundles = await page.locator('.stc-bundle strong').allTextContents()
    expect(bundles.length, 'no bundles found to sweep').toBeGreaterThan(1)

    const failures = []
    let measured = 0
    let worst = { ratio: Infinity }
    for (const bundle of bundles) {
      await page.getByRole('radio', { name: new RegExp(`^${bundle}`) }).click()
      await page.waitForTimeout(120)
      for (const r of await page.evaluate(WALK)) {
        measured++
        if (r.ratio < worst.ratio) worst = { ...r, bundle }
        if (r.ratio < r.floor) {
          failures.push(`  ${bundle} / ${r.dark ? 'dark' : 'light'} / ${r.role} / ${r.cls} — ${r.ratio}:1 under ${r.floor} ${JSON.stringify(r.text)}`)
        }
      }
    }
    // Guard against the vacuous pass 39-accent-contrast already fell into once:
    // a walk that finds nothing reports no failures.
    expect(measured, 'the walk measured nothing at all').toBeGreaterThan(200)
    expect(failures.join('\n'), 'a usage example is under its contrast floor').toBe('')
    expect(worst.ratio, `worst pairing was ${worst.ratio}:1 (${worst.bundle}/${worst.role}/${worst.cls})`).toBeGreaterThanOrEqual(3)
  })
})
