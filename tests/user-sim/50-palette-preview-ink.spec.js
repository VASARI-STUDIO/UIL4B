// The Palette Builder preview's text, measured as RENDERED text, on the ground
// each node is actually painted on, in all eleven preview scenes and both
// preview themes.
//
// WHY THIS SPEC EXISTS
// The engine being right is not the same claim as the page being right. The
// unit half (tests/unit/preview-roles-contrast.test.js and
// tests/unit/palette-preview-roles.test.js) drives the role arithmetic over
// thousands of palettes, which no browser could render. This half reads the
// computed colour of every text node in the real scenes, composites the real
// ground under it, and holds it to the WCAG floor: 4.5:1, or 3:1 for large
// text (24px, or 18.66px bold).
//
// THE LONG-RUNNING FAILURE IT GUARDS. Role colours used to be painted as text
// on grounds the engine had never checked: a muted note on a surface step, an
// accent used as ink. Every such pair was a number below 4.5 that no test saw,
// because a sweep that skips the nodes it cannot name reports a clean run over
// a population it did not measure. So nothing is skipped here: a node whose ink
// matches no known role is kept as 'other' and held to the same floor.
//
// TWO THINGS THAT LOOK LIKE DETAILS AND ARE NOT.
//
// 1. THE PREVIEW'S THEME IS ITS OWN CONTROL'S. The dialog opens in the theme the
//    site is showing, then carries its own Light/Dark control and derives its
//    roles from that. Seeding localStorage 'vs-t' once would measure the opening
//    theme twice and prove nothing about the other. This spec clicks the dialog's
//    own control and asserts the canvas colour actually changed.
//
// 2. color-mix() computes to `color(srgb r g b / a)` in Chromium, never to
//    rgba(). A parser that matches only rgba() returns null for it, the tint is
//    dropped from the ground stack, and the element appears to sit on the
//    nearest OPAQUE ancestor, always a kinder ground than the real one. If you
//    add a colour form here (lab(), oklch(), color(display-p3 ...)), add it to
//    parse() in the same commit: an unparsed ground does not fail loudly, it
//    just stops being measured.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { clickPaletteAction, pickPreviewState, cardInkRatios } from './palette-helpers.js'

// A DETERMINISTIC palette, not a reroll, so a failure is the same failure on
// every run. It is the worst case the contrast backlog recorded for the old
// engine: it produced muted #144147 on surface #368f98 at 2.951:1 in dark, and
// 4.075:1 in light.
const PALETTE = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']

const SCENES = ['Energy dashboard', 'Trail run app', 'Spending card', 'Editorial hero', 'Product page', 'Architect portfolio']

// A scene with a State menu is swept once per state: the disabled Overseas fees label
// is only on the Limits form, and the Product page's bag sheet only in Added to bag.
const STATES = {
  'Trail run app': ['Activity', 'Live tracking', 'Segment PR'],
  'Spending card': ['Overview', 'Card frozen', 'Limits', 'Declined payment'],
  'Editorial hero': ['Article', 'Subscribe sheet', 'Subscribe, email error'],
  'Product page': ['Overview', 'Sold out size', 'Added to bag', 'Focused size'],
}

// The ONLY elements allowed to print in a raw brand colour. brandAsText() keeps the
// user's own hex when it clears the floor on every ground it sits on (and walks it a
// step darker or lighter when it does not), so on a palette whose hex reads, these
// two print in exactly the brand fill. They are named by scene and class so the rule
// above still catches any other text node that does the same; the contrast floor is
// still measured on them like every other node. Source: 'now label' in
// Sundial.data.js TEXT_RECIPE. Slack Water sets no brand colour as text.
const BRAND_AS_TEXT = { 'Energy dashboard': ['sd-now-t'] }

const HELPERS = `
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)), lo = Math.min(lum(a), lum(b))
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 1000) / 1000
  }
  // Handles BOTH computed forms, see point 2 in this file's header.
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
  // Returns null on a background-image ancestor, which this walk cannot measure.
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

// Every leaf text node in the scene, named by comparing its composited ink to
// the scene's own role variables rather than by a class list (a class list
// goes stale the moment a scene is added). Order matters only for naming; every
// node is scored whatever it is called.
const INK_VARS = ['--pv-text', '--pv-muted', '--pv-primary-ink', '--pv-accent-ink', '--pv-on-primary',
  '--pv-on-secondary', '--pv-on-accent', '--pv-on-subtle', '--pv-on-deep',
  '--pv-success-ink', '--pv-warning-ink', '--pv-error-ink', '--pv-info-ink', '--pv-disabled']
const FILL_VARS = ['--pv-primary', '--pv-secondary', '--pv-accent', '--pv-subtle', '--pv-deep']

const SWEEP = `((inkVars, fillVars) => {
  ${HELPERS}
  const out = []
  for (const el of document.querySelectorAll('.pvs *')) {
    if (el.children.length) continue
    if (!(el.textContent || '').trim()) continue
    const cs = getComputedStyle(el)
    const fg = parse(cs.color)
    if (!fg) continue
    const g = groundOf(el)
    const cls = String(el.className.baseVal ?? el.className) || el.tagName
    if (!g) { out.push({ cls, gradient: true }); continue }
    const ink = fg[3] < 1 ? over(fg, g) : [fg[0], fg[1], fg[2]]
    const scene = getComputedStyle(el.closest('.pvs'))
    const hex = hexOf(ink)
    const V = (n) => scene.getPropertyValue(n).trim().toLowerCase()
    const inkRole = inkVars.find((n) => hex === V(n))
    const fillRole = fillVars.find((n) => hex === V(n))
    const role = inkRole ? inkRole.slice(5) : fillRole ? 'fill:' + fillRole.slice(5) : 'other'
    const size = parseFloat(cs.fontSize)
    out.push({
      cls, role, size, weight: cs.fontWeight, inactive: !!el.closest('.is-disabled, [aria-disabled="true"]'), onRender: !!el.closest('.rc'),
      ink: hex, ground: hexOf(g), ratio: ratio(ink, g),
      floor: (size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)) ? 3 : 4.5,
    })
  }
  return out
})`

test.describe('Palette Builder preview ink', () => {
  test('every text node clears its floor on its real ground, in all six scenes and both preview themes', async ({ page }) => {
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
    await clickPaletteAction(page, 'Preview')
    const dialog = page.getByRole('dialog', { name: 'Palette preview' })
    const rail = dialog.getByRole('listbox', { name: 'Previews' })
    const scene = page.locator('.pvs')
    await expect(scene).toBeVisible()

    // The seed reached the engine, by slot. Without this the sweep below could
    // be measuring whatever palette the app happened to restore, and a green
    // run would say nothing about the case this spec was written for.
    const slots = await scene.evaluate((el) => {
      const cs = getComputedStyle(el)
      return ['--pv-primary', '--pv-secondary', '--pv-accent', '--pv-subtle', '--pv-deep'].map((n) => cs.getPropertyValue(n).trim().toLowerCase())
    })
    expect(slots, 'the seeded palette did not reach the preview, slot for slot').toEqual(PALETTE)

    const failures = []
    const canvases = new Set()
    const roleCounts = {}
    const rawFillWhere = []
    const rawFillRoles = new Set()
    let measured = 0
    let onSurface = 0
    let disabledSeen = 0
    let cardText = 0
    let cardRated = 0

    for (const name of SCENES) {
      await rail.getByRole('option', { name: new RegExp(`^${name}`) }).click()
      await expect(page.locator(`.pvs[data-preview-scene="${name}"]`)).toBeVisible()

      for (const theme of ['Light', 'Dark']) {
        const modes = dialog.getByRole('group', { name: 'Preview theme' })
        await modes.getByRole('button', { name: theme, exact: true }).click()
        await expect(modes.getByRole('button', { name: theme, exact: true })).toHaveAttribute('aria-pressed', 'true')
        await expect(scene).toHaveAttribute('data-mode', theme.toLowerCase())

        const roles = await scene.evaluate((el) => {
          const cs = getComputedStyle(el)
          const v = (n) => cs.getPropertyValue(n).trim().toLowerCase()
          return { canvas: v('--pv-canvas'), surface: v('--pv-surface'), raised: v('--pv-raised') }
        })
        // The theme control actually re-derived the roles. Clicking a control
        // that turns out to be decorative is how a rendered assertion goes
        // vacuous without ever going red.
        for (const [k, hex] of Object.entries(roles)) expect(hex, `${name}/${theme}: --pv-${k} is not a colour`).toMatch(/^#[0-9a-f]{6}$/)
        canvases.add(roles.canvas)

        for (const state of STATES[name] || [null]) {
          if (state) await pickPreviewState(dialog, state)
          // The live card's controls ease their colours; measure them at rest, not part-way through a transition.
          await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* an endless one */ } } })
          const samples = await page.evaluate(`${SWEEP}(${JSON.stringify(INK_VARS)}, ${JSON.stringify(FILL_VARS)})`)
          expect(samples.filter((s) => s.gradient), `${name}/${theme}: a preview ink landed on a gradient, which this walk cannot measure`).toEqual([])
          // The sparest scene has only a handful of text nodes. The bar is
          // that, so content edits do not trip it, but a sweep that has stopped
          // FINDING the text still does.
          expect(samples.length, `${name}/${theme}: too few text nodes were found`).toBeGreaterThanOrEqual(3)

          for (const s of samples) {
            // Text printed on the card render has a picture for a ground, which this walk cannot read:
            // cardInkRatios rates it from the screen after the loop.
            if (s.onRender) { cardText++; continue }
            measured++
            roleCounts[s.role] = (roleCounts[s.role] || 0) + 1
            const brandText = (BRAND_AS_TEXT[name] || []).some((c) => s.cls.split(' ').includes(c))
            if (s.role.startsWith('fill:') && s.role !== 'fill:primary' && !brandText) rawFillRoles.add(s.role)
            if (s.role.startsWith('fill:') && s.role !== 'fill:primary' && !brandText) rawFillWhere.push(`${name}/${theme} [${s.cls}] ${s.role} ${s.ink} on ${s.ground} = ${s.ratio}:1`)
            if (s.ground === roles.surface) onSurface++
            const where = `${name}${state ? "/" + state : ""}/${theme} [${s.cls}] ${s.role} ${s.ink} on ${s.ground}`
              + ` = ${s.ratio}:1 at ${s.size}px/${s.weight} (floor ${s.floor})`
            // The one exemption: the disabled Overseas fees label in the Spending card's Limits form. WCAG
            // 1.4.3 exempts the text of an inactive control, and the scene shows
            // the disabled state on purpose. Anything else in the disabled
            // colour, or the same colour on a control that is not disabled, is
            // still held to the floor.
            // Nothing in the Product page is exempt: its sold-out size (XXL) can still be picked, so it
            // is struck through in the muted ink and held to the same floor as every other word.
            const inactive = name === 'Spending card' && s.inactive && s.role === 'disabled'
            if (inactive) disabledSeen++
            else if (s.ratio < s.floor) failures.push('  ' + where)
            // The type floor for every scene.
            if (s.size < 12) failures.push(`  ${name}/${theme} .${s.cls.split(' ')[0]} is ${s.size}px, under the 12px floor`)
          }
          if (samples.some((x) => x.onRender)) {
            const inks = await cardInkRatios(page)
            expect(inks.length, `${name}/${state}/${theme}: the card's printed text was not found`).toBe(2)
            for (const k of inks) {
              cardRated++
              if (k.ratio < 4.5) failures.push(`  ${name}/${state}/${theme} ${k.sel} on the card render = ${k.ratio}:1 (floor 4.5, least-contrast pixel)`)
            }
          }
        }
      }
    }

    // Both themes produced DIFFERENT canvases, so the loop above ran for real.
    expect(canvases.size, 'both preview themes derived the same canvas - the theme control did not take').toBe(2)

    // The pair the contrast backlog named: a muted note ON the surface step.
    expect(onSurface, 'no ink was measured on --pv-surface, which is the ground this spec exists for').toBeGreaterThan(20)

    expect(disabledSeen, 'the disabled Overseas fees label (Spending card) was not found, in both themes').toBe(2)

    // The card's wordmark and number were set aside by the walk and rated from pixels instead,
    // in every state and both themes (two texts, four states, two themes).
    expect(cardText, 'the text on the card render was not found by the walk').toBeGreaterThanOrEqual(16)
    expect(cardRated, 'the card render text was not rated from pixels').toBe(16)

    // Anti-vacuity for the roles the rules must be reading. If any reaches
    // zero the stylesheet has stopped painting that role as text, and every
    // assertion about it above is measuring nothing.
    // primary-ink is left out: no live scene paints text in it since the
    // retired scenes went, so its rule has nothing to read.
    for (const role of ['text', 'muted', 'on-primary', 'success-ink', 'error-ink']) {
      expect(roleCounts[role] || 0, `no text was found in the ${role} role`).toBeGreaterThanOrEqual(2)
    }

    // AND THE FILLS ARE STILL FILLS. A text node painted in a raw brand fill
    // other than as an inverted ground is the old defect coming back, named
    // separately from a contrast miss so the message says which happened.
    const rawFill = [...rawFillRoles]
    expect(rawFill, ['a text node is painted in a raw brand fill rather than an ink role:', ...rawFillWhere].join('\n')).toEqual([])

    expect(failures, `preview text below its floor over ${measured} rendered samples:\n` + failures.join('\n')).toEqual([])
  })
})
