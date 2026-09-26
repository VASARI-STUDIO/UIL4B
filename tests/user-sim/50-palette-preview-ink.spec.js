// The Palette Builder preview's FOUR ink roles, measured as RENDERED text, on
// the ground each one is actually painted on, in all three preview tabs and
// both preview themes.
//
// It began as two roles and one tab. [preview-accent-ink-unmeasured] added the
// other two: role.accent and role.primary were emitted with no ink guarantee at
// all and then painted as TEXT by five rules, and this sweep's `if (!role)
// continue` dropped every one of those nodes BEFORE scoring it — so the file
// reported a clean run over a population it was not measuring. Two of those
// five rules live on the Brand and Graphic Design tabs, which this spec never
// opened, so they were unreachable rather than merely unchecked. Same shape as
// the rgba-only parser in point 2 below: not a wrong answer, an answer never
// attempted, with nothing to show it had not been.
//
// WHY THIS SPEC EXISTS
// derivePreviewRoles clamped `muted` against `bg` alone — the source comment
// said so plainly, "muted + border: derived from text↔bg, contrast-clamped" —
// while these scenes paint it on `surface` too. .plb-pv-field is 8px
// color:var(--pv-muted) on background:var(--pv-surface), and .plb-pv-card,
// .plb-pv-side, .plb-pv-settings nav/label, .plb-pvb-schedule span and
// .plb-pvb-booking are all surface-grounded as well. `surface` is a 5% (light)
// or 10% (dark) step off bg in the direction that always costs contrast, so
// the pair failed on essentially every palette. Measured on this page before
// the fix, 40 rerolls per preview theme: 600 of 840 muted samples under 4.5:1
// in EACH theme (71.4%), worst 4.043 light and 3.306 dark.
//
// THE UNIT HALF IS tests/unit/preview-roles-contrast.test.js AND IT IS THE
// WIDE ONE — it drives the engine over 48,778 palettes, which no browser could
// render. This half exists because the engine being right is not the same
// claim as the page being right, and the estimate that skipped the render once
// already missed role.text by assuming the ground equalled role.surface.
//
// TWO THINGS THAT LOOK LIKE DETAILS AND ARE NOT.
//
// 1. THE PREVIEW'S THEME IS NOT THE APP'S THEME. PaletteBuilder's preview
//    modal carries its own Light/Dark control and passes it to
//    derivePreviewRoles as `mode`; the app's data-theme does not reach these
//    roles at all. Seeding localStorage 'vs-t' — the correct fix for the
//    HomeWorkbench half, where the colours DO come from useTheme() — measures
//    the light preview twice and proves nothing about dark. This spec clicks
//    the modal's own control and asserts --pv-bg actually changed.
//
// 2. color-mix() computes to `color(srgb r g b / a)` in Chromium, never to
//    rgba(). A parser that matches only rgba() returns null for it, the tint
//    is dropped from the ground stack, and the element appears to sit on the
//    nearest OPAQUE ancestor — always a kinder ground than the real one. If
//    you add a colour form here (lab(), oklch(), color(display-p3 …)), add it
//    to parse() IN THE SAME COMMIT: an unparsed ground does not fail loudly,
//    it just stops being measured.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { openPaletteTools } from './palette-helpers.js'

// A DETERMINISTIC palette, not a reroll. The defect was common enough that
// random palettes would catch it, but a fixed seed is the difference between a
// guard and a coin toss — and this one is the exact worst case the backlog item
// recorded: pre-fix it produced muted #144147 on surface #368f98 at 2.951:1 in
// dark, and 4.075:1 in light. It is the worst pair of 20,000 generated
// palettes, chosen for being bad in BOTH themes so one seed covers both.
const PALETTE = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']

const HELPERS = `
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)), lo = Math.min(lum(a), lum(b))
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 1000) / 1000
  }
  // Handles BOTH computed forms — see point 2 in this file's header.
  const parse = s => {
    s = (s || '').trim()
    let m = s.match(/^rgba?\\(([^)]+)\\)$/)
    if (m) {
      const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number)
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
    }
    m = s.match(/^color\\(srgb ([^)]+)\\)$/)
    if (m) {
      const p = m[1].split(/[\\s/]+/).filter(Boolean).map(Number)
      return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]
    }
    return null
  }
  const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]))
  const hexOf = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
  // The TRUE composited ground: every translucent ancestor painted in order.
  // Returns null on a background-image ancestor, which this app's contrast
  // walks have never been able to measure.
  const groundOf = el => {
    const stack = []
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
      const c = parse(cs.backgroundColor)
      if (c && c[3] > 0) { stack.push(c); if (c[3] === 1) break }
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255, 1]
    let g = [root[0], root[1], root[2]]
    for (let i = stack.length - 1; i >= 0; i--) g = over(stack[i], g)
    return g
  }
`

// Every leaf text node in a preview scene whose ink IS one of the FOUR roles
// under test, identified by comparing the computed colour to the scene's own
// --pv-muted / --pv-text / --pv-accent-ink / --pv-primary-ink rather than by a
// class list — a class list goes stale the moment a scene is added, and six of
// these scenes were added at once.
//
// EVERYTHING ELSE IS KEPT AS 'other' RATHER THAN DROPPED. The first version of
// this sweep returned `null` for an unrecognised ink and skipped it, which is
// how [preview-accent-ink-unmeasured] stayed invisible: --pv-accent and
// --pv-primary were painted as text on five rules and every one of those nodes
// fell through the `if (!role) continue` and was never scored. A node this
// spec cannot name is a node it has not measured, and that has to be visible.
const SWEEP = `(() => {
  ${HELPERS}
  const out = []
  for (const el of document.querySelectorAll('.plb-pv *')) {
    if (el.children.length) continue
    if (!(el.textContent || '').trim()) continue
    const cs = getComputedStyle(el)
    const fg = parse(cs.color)
    if (!fg) continue
    const g = groundOf(el)
    if (!g) { out.push({ cls: String(el.className), gradient: true }); continue }
    const ink = fg[3] < 1 ? over(fg, g) : [fg[0], fg[1], fg[2]]
    const scene = getComputedStyle(el.closest('.plb-pv'))
    const hex = hexOf(ink)
    const V = (n) => scene.getPropertyValue(n).trim().toLowerCase()
    const role = hex === V('--pv-muted') ? 'muted'
      : hex === V('--pv-text') ? 'text'
        : hex === V('--pv-accent-ink') ? 'accentInk'
          : hex === V('--pv-primary-ink') ? 'primaryInk'
            : hex === V('--pv-onprimary') ? 'onPrimary'
              : hex === V('--pv-accent') ? 'accent'
                : hex === V('--pv-primary') ? 'primary'
                  : 'other'
    const size = parseFloat(cs.fontSize)
    out.push({
      cls: String(el.className) || el.tagName, role, size, weight: cs.fontWeight,
      ink: hex, ground: hexOf(g), ratio: ratio(ink, g),
      floor: (size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)) ? 3 : 4.5,
    })
  }
  return out
})()`

test.describe('Palette Builder preview ink', () => {
  test('every ink role clears its floor on every declared ground, in all three tabs and both preview themes', async ({ page }) => {
    watch(page, 'designer checking a palette on a UI mockup')
    await page.addInitScript((colors) => {
      const raw = localStorage.getItem('vs-current-design')
      const design = raw ? JSON.parse(raw) : {}
      design.palette = {
        ...(design.palette || {}),
        base: colors[0], harmony: 'auto', extraColors: [], activeIdx: 0,
        colors, baseColors: colors,
        globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
      }
      localStorage.setItem('vs-current-design', JSON.stringify(design))
    }, PALETTE)

    await go(page, '/create/palette')
    await (await openPaletteTools(page)).getByRole('button', { name: 'Preview on a UI' }).click()
    const scene = page.locator('.plb-pv').first()
    await expect(scene).toBeVisible()

    // The seed reached the engine. Without this the sweep below could be
    // measuring whatever palette the app happened to restore, and a green run
    // would say nothing about the case this spec was written for.
    const seeded = await scene.evaluate((el) => getComputedStyle(el).getPropertyValue('--pv-bg').trim())
    expect(seeded.toLowerCase(), 'the seeded palette did not reach the preview').toBe('#c5c1f6')

    const failures = []
    const seenGrounds = new Set()
    const otherBelow = new Set()
    const otherDetail = []
    const roleCounts = {}
    let measured = 0
    let onSurface = 0

    // ALL THREE PREVIEW TABS, not only the one that opens by default.
    //
    // This spec used to sweep the UI tab alone, which is 6 of the 17 scenes
    // this modal can render. .plb-pvb-eyebrow (Brand) and .plb-pvg-kicker
    // (Graphic Design) are 10.5px/700 accent-inked text and neither had ever
    // been measured by anything — that is half of the population
    // [preview-accent-ink-unmeasured] recorded, and it was unreachable from
    // here rather than merely unchecked.
    for (const tab of ['UI', 'Brand', 'Graphic Design']) {
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')

      for (const theme of ['Light', 'Dark']) {
        const modes = page.locator('.plb-modal-modes')
        await modes.getByRole('button', { name: theme }).click()
        await expect(modes.getByRole('button', { name: theme })).toHaveAttribute('aria-pressed', 'true')

        const roles = await scene.evaluate((el) => {
          const cs = getComputedStyle(el)
          return {
            bg: cs.getPropertyValue('--pv-bg').trim().toLowerCase(),
            surface: cs.getPropertyValue('--pv-surface').trim().toLowerCase(),
            accentInk: cs.getPropertyValue('--pv-accent-ink').trim().toLowerCase(),
            primaryInk: cs.getPropertyValue('--pv-primary-ink').trim().toLowerCase(),
          }
        })
        // The theme control actually re-derived the roles. Clicking a control
        // that turns out to be decorative is how a rendered assertion goes
        // vacuous without ever going red.
        expect(roles.bg, `${tab}/${theme}: --pv-bg is not a colour`).toMatch(/^#[0-9a-f]{6}$/)
        // The two new roles REACHED the scene. A var() that resolves to nothing
        // makes every rule reading it fall back to inherited colour, which
        // would be classified 'other' here and quietly leave the accent ink
        // unmeasured again — the exact shape of the defect being fixed.
        expect(roles.accentInk, `${tab}/${theme}: --pv-accent-ink never reached the scene`).toMatch(/^#[0-9a-f]{6}$/)
        expect(roles.primaryInk, `${tab}/${theme}: --pv-primary-ink never reached the scene`).toMatch(/^#[0-9a-f]{6}$/)
        seenGrounds.add(roles.bg)

        const samples = await page.evaluate(SWEEP)
        expect(samples.filter((s) => s.gradient), 'a preview ink landed on a gradient, which this walk cannot measure').toEqual([])
        // 58 leaf nodes carry an ink on the UI tab, 47 on Brand and 35 on
        // Graphic Design. The bar is set below the smallest of those rather
        // than at it, so ordinary content edits do not trip it — but a sweep
        // that has stopped FINDING the ink still does.
        expect(samples.length, `${tab}/${theme}: too few inked nodes were found`).toBeGreaterThan(25)

        for (const s of samples) {
          measured++
          roleCounts[s.role] = (roleCounts[s.role] || 0) + 1
          if (s.ground === roles.surface) onSurface++
          if (s.ratio >= s.floor) continue
          const where = `${tab}/${theme} .${s.cls.split(' ')[0]} ${s.role} ${s.ink} on ${s.ground}`
            + ` = ${s.ratio}:1 at ${s.size}px/${s.weight} (floor ${s.floor})`
          // THE ENGINE'S GUARANTEE, STATED EXACTLY: one of the four ink roles
          // it emits, on one of the grounds it DECLARES. Anything below that
          // floor is a regression in derivePreviewRoles and fails hard.
          //
          // Everything else that misses is a SCENE defect, not an engine one,
          // and is tracked as an exact-match set instead so the two cannot mask
          // each other. Two kinds turn up: an ink the engine does not own at
          // all (the Brand and Graphic scenes leave plain copy on the app's
          // --t0 rather than --pv-text), and an engine ink painted on a ground
          // the engine was never told about (a CTA whose label loses the
          // specificity fight and is painted --pv-muted ON --pv-primary). The
          // muted note anticipated the second exactly: "a scene that introduces
          // a THIRD ground adds it to inkGrounds and is covered on arrival".
          const owned = ['text', 'muted', 'accentInk', 'primaryInk'].includes(s.role)
          const declared = s.ground === roles.bg || s.ground === roles.surface
          if (owned && declared) failures.push('  ' + where)
          else { otherBelow.add(`${tab}/${theme} .${s.cls.split(' ')[0]} ${s.role}`); otherDetail.push('  ' + where) }
        }
      }
    }

    // Both themes produced DIFFERENT grounds, so the loop above ran for real.
    // PaletteBuilder's preview theme is a modal control, not the app's
    // data-theme, and a spec that seeded 'vs-t' instead would measure light
    // twice and pass — see point 1 in this file's header.
    expect(seenGrounds.size, 'both preview themes derived the same bg - the theme control did not take').toBe(2)

    // The pair the backlog item named: muted at 8-9.5px ON --pv-surface. If
    // this is ever zero the sweep has stopped covering the reported defect,
    // whatever else it is still measuring.
    expect(onSurface, 'no ink was measured on --pv-surface, which is the ground this spec exists for').toBeGreaterThan(20)

    // ANTI-VACUITY FOR THE TWO NEW ROLES. Measured this run: 18 accentInk
    // samples (1 UI, 5 Brand, 3 Graphic, x2 themes) and 4 primaryInk. If either
    // reaches zero the rules have stopped reading the ink tokens and every
    // assertion about them above is measuring nothing.
    expect(roleCounts.accentInk || 0, 'no accent-inked text was found - .plb-pv-n--accent, .plb-pvb-eyebrow and .plb-pvg-kicker have stopped reading --pv-accent-ink').toBeGreaterThanOrEqual(10)
    expect(roleCounts.primaryInk || 0, 'no primary-inked text was found - .plb-pv-settings nav .is-active and .plb-pv-reply span have stopped reading --pv-primary-ink').toBeGreaterThanOrEqual(2)

    // AND THE FILLS ARE STILL FILLS. If a node is painted in the raw --pv-accent
    // or --pv-primary as TEXT again, that is the defect coming back, and it is
    // named separately from a contrast miss so the message says which happened.
    expect([roleCounts.accent || 0, roleCounts.primary || 0],
      'a text node is painted in the raw fill role again rather than its ink role'
      + ' - the -ink split has been partly reverted').toEqual([0, 0])

    expect(failures, `preview ink below its contrast floor over ${measured} rendered samples:\n`
      + failures.join('\n')).toEqual([])

    // ── The other half of what the sweep now sees, recorded rather than hidden.
    //
    // FOUND AND NOT FIXED. Both of these are SCENE defects that widening this
    // sweep from one tab to three made visible for the first time, and both are
    // different in kind from the engine change that closed
    // [preview-accent-ink-unmeasured] — fixing either means editing a scene's
    // markup or its specificity, not moving an ink.
    //
    //   1. The Brand and Graphic Design scenes leave their plain
    //      <p>/<b>/<span>/<strong>/<li> copy on the APP's --t0 instead of
    //      --pv-text. 4.281:1 on the dark preview bg, passing in light — a
    //      theme-shaped miss that a light-only sweep would call clean.
    //   2. .plb-pvb-btn inside .plb-pvb-booking loses the specificity fight to
    //      a descendant selector, so a primary CTA's label is painted
    //      --pv-muted at 7px ON --pv-primary rather than --pv-onprimary at
    //      12px. That is also the third-ground case the muted note predicted.
    //
    // An EXACT-MATCH set, so it fails in both directions: a new surface below
    // its floor is not on this list, and a fixed one still is.
    expect([...otherBelow].sort(), 'the set of unguaranteed inks below their floor has changed.'
      + ' One not on this list is a new defect; one on it that no longer appears has been'
      + ` fixed and the list must shrink to match. Measured this run:\n${otherDetail.join('\n')}`)
      .toEqual([
        'Brand/Dark .B other', 'Brand/Dark .P other', 'Brand/Dark .SPAN other', 'Brand/Dark .STRONG other',
        'Brand/Light .plb-pvb-btn muted',
        'Graphic Design/Dark .B other', 'Graphic Design/Dark .P other',
        'Graphic Design/Dark .SPAN other', 'Graphic Design/Dark .STRONG other',
      ])
  })
})
