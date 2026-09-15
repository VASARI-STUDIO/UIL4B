// The 2026-09-15 defect pass over eight Create tools — /create/gradient, tint,
// contrast, font-pair, font-gallery, emoji, aspect-ratio and auto-builder —
// measured on the built preview rather than read out of the source.
//
// Most of what was looked for was already clean, and that is recorded here so
// the next pass does not re-measure it: a keyboard walk of all eight routes at
// 1440 found 401 tab stops, every one visible and every one with an accessible
// name; no horizontal overflow at 390 or 1440; no heading-level jump on any of
// them; and driving both catalogue tools to a search that matches nothing left
// a named empty state and a live count on each (font gallery 77 → 0 families,
// emoji 1,655 → 0). What this file pins is the three faults that were real.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture and the Iconify catalogue is served
// from tests/user-sim/fixtures/iconify/.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// ── The composited-ink probe ────────────────────────────────────────────────
//
// Element `opacity` is alpha, and it is NOT the same thing as an alpha inside
// the colour: getComputedStyle().color reports the UNDIMMED value, so a probe
// that reads `color` alone measures a legibility the screen never had. Every
// ancestor's opacity multiplies in, which is why alphaOf walks up.
//
// color-mix() computes to color(srgb …), never rgba(). A parser that matches
// only rgba() returns null, the tint drops out of the ground stack, and the
// element appears to sit on the nearest OPAQUE ancestor — always a kinder
// ground than the real one. Both forms are parsed. Add a colour form here IN
// THE SAME COMMIT you introduce it: an unparsed ground does not fail loudly, it
// stops being measured.
const INK_PROBE = `
  const chan = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const lum = (c) => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2])
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const parse = (s) => {
    s = s || ''
    const cm = s.match(/color\\(srgb\\s+([^)]+)\\)/)
    if (cm) { const p = cm[1].split(/[\\s/]+/).filter(Boolean).map(Number); return { rgb: [p[0] * 255, p[1] * 255, p[2] * 255], a: p.length > 3 ? p[3] : 1 } }
    const m = s.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number)
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
  }
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a))
  const groundOf = (el) => {
    const stack = []
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
      const c = parse(cs.backgroundColor)
      if (c && c.a > 0) stack.push(c)
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor)
    let base = root && root.a >= 1 ? root.rgb : [255, 255, 255]
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base)
    return base
  }
  const alphaOf = (el) => {
    let a = 1
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity)
    return a
  }
  const measure = (sel) => {
    const out = []
    for (const el of document.querySelectorAll(sel)) {
      if (!el.getClientRects().length) continue
      const ground = groundOf(el)
      if (!ground) continue
      const ink = parse(getComputedStyle(el).color)
      if (!ink) continue
      const a = alphaOf(el) * ink.a
      const painted = ink.rgb.map((c, i) => c * a + ground[i] * (1 - a))
      out.push({
        sel,
        text: (el.textContent || '').trim().slice(0, 14),
        size: parseFloat(getComputedStyle(el).fontSize),
        alpha: Math.round(a * 1000) / 1000,
        asPainted: Math.round(ratio(painted, ground) * 1000) / 1000,
        undimmed: Math.round(ratio(ink.rgb, ground) * 1000) / 1000,
      })
    }
    return out
  }
`

/** Assert the route is really on screen before anything is measured off it. */
async function arrived(page, h1) {
  await expect(
    page.getByRole('heading', { level: 1, name: h1 }),
    `the route never arrived — no <h1> reading "${h1}"`,
  ).toBeVisible()
}

// ─────────────────────────────────────────────────────────────────────────────
// /create/tint — an opacity on ink that was chosen for contrast
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/create/tint · the swatch labels keep the contrast they were given', () => {
  // THE CONTROL, and it is the whole reason the test below can be believed.
  // That test is an absence — "nothing falls under 4.5:1" — and an absence
  // passes trivially on a probe that has stopped measuring. This injects two
  // labels onto a ground where the answer is arithmetic rather than opinion:
  // white on #767676 is 4.542:1, and the same white at opacity .6 composites
  // to rgb(200.2) over that ground, which is 2.720:1. A probe blind to
  // element opacity reports 4.54 twice and fails on the second assertion; a
  // probe that has stopped resolving grounds returns nothing and fails on
  // the first.
  test('the ink probe can see an opacity', async ({ page }) => {
    watch(page, 'the probe checking itself')
    await go(page, '/create/tint')
    await arrived(page, 'Tint Scale Generator')

    await page.evaluate(() => {
      const host = document.createElement('div')
      host.id = 'ink-probe-control'
      host.style.cssText = 'background:#767676;color:#ffffff;padding:8px'
      host.innerHTML = '<span class="ink-probe-full">full</span>'
        + '<span class="ink-probe-dim" style="opacity:.6">dimmed</span>'
      document.body.appendChild(host)
    })

    const got = await page.evaluate(`(() => {
      ${INK_PROBE}
      return [...measure('.ink-probe-full'), ...measure('.ink-probe-dim')]
    })()`)

    expect(got, 'the probe returned nothing for two spans it was handed').toHaveLength(2)
    expect(got[0].asPainted, 'white on #767676 at full strength').toBeCloseTo(4.542, 1)
    expect(got[1].asPainted, 'the same white at opacity .6').toBeCloseTo(2.72, 1)
    expect(
      got[1].undimmed - got[1].asPainted,
      'the probe read the dimmed label as if it were undimmed — it is not '
      + 'multiplying element opacity into the paint, so every measurement in '
      + 'this file is reporting a legibility the screen never had',
    ).toBeGreaterThan(1.5)
  })

  // MEASURED 2026-09-15 on the built preview at 1440x900, base colour #EC001A
  // typed into the tool's own hex field: `.tt-cell-hex` reading "#ee041b"
  // painted 4.293:1 on its own swatch and the "Primary" role label 4.410:1 —
  // 2 of 17 labels on one ramp under the 4.5:1 floor that 9px text has to
  // clear. Undimmed, the worst of the 17 was 4.669:1 and none failed.
  //
  // The cause was a pair of CSS rules, `.tt-cell-hex{opacity:.84}` and
  // `.tt-role-sample span{opacity:.8}`, sitting on top of ink that
  // TintTool.jsx computes per swatch with textColorForBg(). Swept over the
  // whole sRGB cube those two cost AA on 14.84% and 20.42% of grounds — see
  // tests/unit/tint-label-ink-not-dimmed.test.js, which owns the arithmetic.
  //
  // MUTATION: put either opacity back in src/styles/pages/tint.css and this
  // goes red naming the label, the ratio and the colour it was painted on.
  test('every swatch label clears AA on a ramp built from #EC001A', async ({ page }) => {
    watch(page, 'a designer building a tint scale from a saturated red')
    await go(page, '/create/tint')
    await arrived(page, 'Tint Scale Generator')

    // #EC001A is not arbitrary: it is the ground the sRGB sweep names as the
    // worst case for a dimmed label, and the tool accepts it as typed.
    const hex = page.getByRole('textbox', { name: 'Base colour 1 hex' })
    await hex.fill('#EC001A')
    await expect(page.locator('.tt-ramp-select')).toContainText('#EC001A source')
    await expect(page.locator('.tt-cell')).toHaveCount(11)

    const measured = await page.evaluate(`(() => {
      ${INK_PROBE}
      return [...measure('.tt-cell-hex'), ...measure('.tt-role-sample span')]
    })()`)

    // POSITIVE CONTROL. "No label failed" is true of a page that rendered no
    // labels, and this suite has shipped exactly that kind of green before.
    expect(
      measured.length,
      'no swatch label was measured at all, so the assertion below is guarding '
      + 'nothing — the ramp did not render, or the classes were renamed',
    ).toBeGreaterThanOrEqual(11)

    const failing = measured.filter((m) => m.asPainted < 4.5)
    expect(
      failing.map((m) => `${m.sel} "${m.text}" ${m.size}px at alpha ${m.alpha}: `
        + `${m.asPainted}:1 as painted (${m.undimmed}:1 undimmed)`),
      'a tint label was painted under the 4.5:1 floor for small text. Its colour '
      + 'is var(--tt-ink), computed per swatch by textColorForBg() against the '
      + 'colour the user chose, so anything dimming it is spending a guarantee '
      + 'with 1% of headroom — see the note above .tt-cell-hex in tint.css',
    ).toEqual([])
  })
})
