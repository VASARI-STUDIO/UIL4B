// The six preview examples in the Palette Builder's "Preview on a UI" dialog:
// Slack Water (Editorial hero), Sundial (Energy dashboard), Orra Workroom (Product page),
// Ridgeline (Trail run app), Hale & Okoro (Architect portfolio, Pro) and Tally (Spending
// card, Pro), each its own lazy chunk behind src/components/palette/examples/registry.js.
//
// WHAT IS HELD HERE, AND WHY IN A BROWSER
// The unit tests (preview-field-helpers, preview-role-tags, slack-water-chart,
// palette-preview-copy) hold the arithmetic and the source. They cannot see that
// an example reaches the screen, that the legend finds its elements, that a slow
// download leaves the old picture up, or that a label sits on a ground its own
// recipe never named. Those are rendered facts, so they are measured here.
//
//   1. each example renders (and is the scene that was picked)
//   2. legend hover AND focus mark at least one element per role, in each
//      example, and a role the example does not use says so on its chip
//   3. the legend's hover trace dims everything that is not the traced role, clears on leave, and a click pins it (Product page)
//   4. on a phone a tapped colour stays traced for 3 seconds, then clears
//   5. a slow download never shows an empty stage: the old scene stays up
//   6. no text under 12px in any example at 390, 768 and 1440
//   7. every text node clears 4.5:1 (3:1 large) on the ground it is really
//      painted on, for a mid, a pale and a dark palette, both preview themes
//   7b. the Energy dashboard's series labels keep clear of the now line, the now
//      label and each other (a box test; the contrast walk cannot see a line
//      drawn under a label's plate)
//   7c. tracing a colour leaves no outline on a drawn (SVG) part
//   7d. Orra's five colourways sit in one row at 360, 390, 768, 1024 and 1440; names hidden under 960, fitting at 1440
//   7e. Orra's shirt stays inside its stage and off the buy column at 1440, 768, 390
//   7f. the legend: one row, the chips that do not fit under "+N more", the adjusted-as-text caption is one line and its chips point at it
//   7g. the Slack Water headline runs to at most three lines at 1440 and 768
//   8. a chunk that fails shows "This example didn't load" and the dialog lives
//   10. the free/Pro gate: a free account sees Architect portfolio and Spending card blurred
//       and out of reach (the real scene behind Unlock preview) and Trail run app open, and
//       the arrow keys walk all six options in order
//   11. Trail run app, Architect portfolio and Spending card do not overflow sideways at
//       320, 390 and 768
//
// HOW GROUND IS FOUND (7). Not by walking ancestors: a label that sits on a
// plate over a drawn shape, or on a neighbouring element, has a ground its
// ancestors do not paint. For each text node this takes five points inside its
// line boxes, asks the browser what is painted there (elementsFromPoint, top to
// bottom), composites the backgrounds of the text's own element and everything
// beneath it (an SVG shape counts by its fill), and keeps the WORST ratio of the
// five points. A background IMAGE under text is reported, not guessed at. A point
// that another element covers is reported as covered.
//
// To make it fail: in src/components/palette/examples/SlackWater.css set .sw-stand
// to `color:var(--pv-disabled)` (7 goes red); set one example font-size to 10px
// (6); set PIN_MS in PalettePreviewDialog.jsx to 30000 (4); make Stage drop its
// old scene by calling onChange without startTransition (5); delete the .catch in
// registry.js (8); stop PalettePreview from writing data-hit (2, 3); remove the
// `if (exampleLoading()) return` in main.jsx (8, the page reloads); drop
// `overflow:hidden` from `.or-thumb .or-garment` (7, the Pocket label); render the
// Sundial Solar tag as plain `sd-tag` (7b, 3 red); delete `.pvs svg [data-role]{outline:none}`
// in palette-preview.css (7c, 3 red); put `.or-sw` back to its old width and
// `.or-sw-t` back to ellipsis; `aria-describedby` off the chips (7f), chips min-width 330px (7f, 3),
// the headline clamp back to 6.4cqi (7g), Orra swatches back to flex-wrap and a 60px width (7d); put previewLoader back to Promise.all, or
// React lazy back in PaletteBuilder (9).
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction, pickPreviewState, cardInkRatios } from './palette-helpers.js'

// name: the option in the dialog's list. text: a string only that example prints.
// roles: the roles each example tags, by hand, from its ROLES in <File>.data.js.
// The states a preview can be shown in, by the label in the dialog's State menu. A preview with no entry has one frame.
const STATES = { 'Spending card': ['Overview', 'Card frozen', 'Limits', 'Declined payment'] }
const ALL_ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'warning', 'error', 'info', 'neutral']
const EXAMPLES = [
  {
    name: 'Editorial hero', id: 'editorial', text: 'The 7:12 to Manly,',
    roles: ['primary', 'secondary', 'accent', 'subtle', 'deep', 'neutral'],
  },
  {
    name: 'Energy dashboard', id: 'energy', text: 'Inverter 2 offline since 06:12.',
    roles: ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'warning', 'error', 'info', 'neutral'],
  },
  {
    name: 'Product page', id: 'product', text: 'The Field Overshirt',
    roles: ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'neutral'],
  },
  {
    name: 'Trail run app', id: 'trail', text: 'Saturday run', pro: false,
    roles: ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'neutral'],
  },
  {
    name: 'Architect portfolio', id: 'studio', text: 'Gully House', pro: true,
    roles: ['primary', 'secondary', 'accent', 'subtle', 'deep', 'neutral'],
  },
  {
    name: 'Spending card', id: 'card', text: 'Marrickville Fresh Market', pro: true,
    roles: ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'neutral'],
  },
]

// Three palettes a designer might bring: the mid-tone one spec 50 uses, a pale
// one (every colour near white) and a dark one (every colour near black).
const PALETTES = {
  mid: ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6'],
  pale: ['#f3e9d2', '#f7dcd0', '#e4efe0', '#dfe9f5', '#f2e4f0'],
  dark: ['#0d1b2a', '#1b263b', '#2b3a55', '#3a2e5a', '#16100f'],
}

// The role chips in the legend: the five slots, then the suggested ones.
const BRAND = ['primary', 'secondary', 'accent', 'subtle', 'deep']
const SUGGESTED_LABEL = { success: /^Success/, warning: /^Warning/, error: /^Error/, info: /^Info/, neutral: /^Neutrals/ }

const rx = (name) => new RegExp(`^${name}`)

async function seed(page, colors) {
  await page.addInitScript((cols) => {
    const raw = localStorage.getItem('vs-current-design')
    const design = raw ? JSON.parse(raw) : {}
    design.palette = {
      ...(design.palette || {}),
      base: cols[0], harmony: 'auto', extraColors: [], activeIdx: 0,
      colors: cols, baseColors: cols,
      globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
    }
    localStorage.setItem('vs-current-design', JSON.stringify(design))
  }, colors)
}

/**
 * Open the preview dialog. Signed in as Pro unless `plan` says otherwise: two of the
 * examples are Pro, and a free account sees them blurred and inert, which would hide
 * them from every check that reads the scene.
 */
async function openDialog(page, { plan = 'pro' } = {}) {
  if (plan) await signIn(page, { plan })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  return dialog
}

/** Pick a scene in whichever layout the width gives: rail, the 768 menu, or the phone strip. */
async function pickScene(dialog, name) {
  let option = dialog.getByRole('option', { name: rx(name) })
  if (!(await option.count())) {
    await dialog.locator('.pvd-menu-btn').click()
    option = dialog.getByRole('option', { name: rx(name) })
  }
  await option.click()
  await expect(dialog.locator(`.pvs[data-preview-scene="${name}"]`)).toBeVisible()
}

async function setTheme(dialog, theme) {
  const group = dialog.getByRole('group', { name: 'Preview theme' })
  await group.getByRole('button', { name: theme, exact: true }).click()
  await expect(dialog.locator('.pvs')).toHaveAttribute('data-mode', theme.toLowerCase())
}

/** Every chip in the order the legend lists them: the five slots, then the suggested ones. */
const CHIP_ORDER = [...BRAND, 'success', 'warning', 'error', 'info', 'neutral']

/**
 * The legend chip for a role, wherever the layout puts it. The one-row legend keeps the chips
 * that fit and moves the rest, in order, into the "+N more" popover, which this opens when the
 * chip is not on the row. The phone sheet lists all ten. The hidden measuring copy is skipped.
 */
async function chipFor(scope, role) {
  const live = scope.locator('.pvd-chip:not(.pvd-legend-ghost *)')
  const at = CHIP_ORDER.indexOf(role)
  if ((await live.count()) <= at) {
    await scope.getByRole('button', { name: /^\+\d+ more$/ }).click()
    await expect(live).toHaveCount(CHIP_ORDER.length)
  }
  return live.nth(at)
}

/** The legend's heading, once: the row also holds a hidden copy of it for measuring. */
const legendHeading = (dialog) => dialog.getByText('Where each colour lands').first()

/** Jump every running animation to its end, so text is measured at rest and not part-way through a fade in. */
const settle = (page) => page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* an endless one */ } } })

const hits = (page) => page.locator('.pvd-stage [data-hit="on"]')

// ── 1. each example renders ──────────────────────────────────────────────────

test.describe('the six preview examples', () => {
  test('the preview opens on the editorial example and each example renders as the scene that was picked', async ({ page }) => {
    watch(page, 'designer opening the six preview examples')
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)

    // The default is the editorial example, itself a lazy chunk.
    await expect(dialog.getByRole('option', { name: /^Editorial hero/ })).toHaveAttribute('aria-selected', 'true')

    for (const ex of EXAMPLES) {
      await pickScene(dialog, ex.name)
      const scene = dialog.locator('.pvs')
      await expect(scene, `${ex.name}: exactly one scene on the stage once it has loaded`).toHaveCount(1)
      await expect(scene).toHaveAttribute('data-scene', ex.id)
      await expect(scene).toHaveAttribute('aria-label', `${ex.name} preview using your palette, light theme`)
      await expect(scene.getByText(ex.text).first(), `${ex.name}: its own copy is on the page`).toBeVisible()
      await expect(dialog.getByText("This example didn't load")).toHaveCount(0)
      // Real content, not a shell: plenty of tagged elements and text.
      const body = await scene.evaluate((el) => ({
        tagged: el.querySelectorAll('[data-role]').length,
        words: (el.innerText || '').split(/\s+/).filter(Boolean).length,
        box: el.getBoundingClientRect().height,
      }))
      expect(body.tagged, `${ex.name}: elements that carry a role`).toBeGreaterThan(8)
      expect(body.words, `${ex.name}: words of copy`).toBeGreaterThan(30)
      expect(body.box, `${ex.name}: height of the scene`).toBeGreaterThan(300)
    }
  })
})

// ── 2 and 3. the legend ──────────────────────────────────────────────────────

test.describe('"where each colour lands"', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.name}: hovering or focusing a colour marks at least one element of that role, and only that role`, async ({ page }) => {
      watch(page, `designer tracing colours in ${ex.name}`)
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      await pickScene(dialog, ex.name)
      await expect(legendHeading(dialog)).toBeVisible()

      for (const role of ex.roles) {
        const chip = await chipFor(dialog, role)
        await expect(chip, `${role}: the chip is live, not marked "Not in this preview"`).not.toHaveAttribute('aria-disabled', 'true')

        // Hover (a mouse pointer).
        await chip.hover()
        await expect(hits(page), `${ex.name}: hovering ${role} marked nothing`).not.toHaveCount(0)
        const wrongOnHover = await hits(page).evaluateAll((els, r) => els.filter((e) => !e.dataset.role.split(' ').includes(r)).map((e) => e.className), role)
        expect(wrongOnHover, `${ex.name}: hovering ${role} marked elements that do not carry it`).toEqual([])
        await page.mouse.move(2, 2)
        await expect(hits(page), `${ex.name}: leaving ${role} left a mark`).toHaveCount(0)

        // Focus (the keyboard path).
        await chip.focus()
        await expect(hits(page), `${ex.name}: focusing ${role} marked nothing`).not.toHaveCount(0)
        const wrongOnFocus = await hits(page).evaluateAll((els, r) => els.filter((e) => !e.dataset.role.split(' ').includes(r)).map((e) => e.className), role)
        expect(wrongOnFocus, `${ex.name}: focusing ${role} marked elements that do not carry it`).toEqual([])
        await chip.blur()
        await expect(hits(page), `${ex.name}: blurring ${role} left a mark`).toHaveCount(0)
      }

      // The roles the example does not use say so, and do not trace.
      for (const role of ALL_ROLES.filter((r) => !ex.roles.includes(r))) {
        const chip = await chipFor(dialog, role)
        await expect(chip, `${ex.name} does not use ${role}`).toHaveAttribute('aria-disabled', 'true')
        await expect(chip).toContainText('Not in this preview')
        await chip.focus()
        await expect(hits(page), `${ex.name}: ${role} is unused yet traced something`).toHaveCount(0)
      }
    })
  }

  test('the legend traces a colour on hover, dimming everything else, and clears on leave', async ({ page }) => {
    watch(page, 'designer tracing colours in a scene')
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    await pickScene(dialog, 'Product page')
    await expect(legendHeading(dialog)).toBeVisible()
    await expect(hits(page)).toHaveCount(0)

    const primary = await chipFor(dialog, 'primary')
    await primary.hover()
    await expect(hits(page)).not.toHaveCount(0)
    // Everything that is not the traced role is dimmed, and the legend names it.
    await expect(page.locator('.pvd-stage [data-hit="off"]')).not.toHaveCount(0)
    await expect(primary).toContainText('Outlined in the preview')
    await page.mouse.move(2, 2)
    await expect(hits(page)).toHaveCount(0)
    await expect(page.locator('.pvd-stage [data-hit="off"]')).toHaveCount(0)

    // A click pins it (the pointer can leave), a second click lets go.
    await primary.click()
    await page.mouse.move(2, 2)
    await expect(primary).toHaveAttribute('aria-pressed', 'true')
    await expect(hits(page)).not.toHaveCount(0)
    await primary.click()
    await page.mouse.move(2, 2) // the pointer is over the chip, which would trace it again
    await expect(hits(page)).toHaveCount(0)
  })
})

// ── 4. the phone ─────────────────────────────────────────────────────────────

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('a tapped colour stays traced for three seconds, then clears', async ({ page }) => {
    watch(page, 'designer tapping a colour on a phone')
    // The page's timers, not the test's: time still passes, and fastForward
    // jumps it, so the check is of the 3 seconds and not of how busy this machine is.
    await page.clock.install()
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    await pickScene(dialog, 'Editorial hero')

    await page.getByRole('button', { name: 'Colours', exact: true }).tap()
    const sheet = page.getByRole('dialog', { name: 'Where each colour lands' })
    await expect(sheet).toBeVisible()
    await (await chipFor(sheet, 'primary')).tap()

    const showing = dialog.locator('.pvd-showing')
    await expect(showing).toContainText('Showing:')
    await expect(sheet).toHaveCount(0)
    await expect(hits(page)).not.toHaveCount(0)

    await page.clock.fastForward(2500)
    await expect(showing, 'still traced at 2.5 s').toContainText('Showing:')
    await expect(hits(page), 'the elements are still outlined at 2.5 s').not.toHaveCount(0)

    await page.clock.fastForward(700)
    await expect(showing, 'cleared by 3.2 s').not.toContainText('Showing:')
    await expect(hits(page), 'the outline goes with it').toHaveCount(0)
  })
})

// ── 5. a slow download ───────────────────────────────────────────────────────

test.describe('a slow network', () => {
  test('switching to an example that is still downloading keeps the old scene on screen, never an empty stage', async ({ page }) => {
    watch(page, 'designer on a slow connection switching previews')
    const DELAY = 1800
    await page.route(/\/assets\/Sundial-[^/]+\.(?:js|css)$/, async (route) => {
      await new Promise((r) => setTimeout(r, DELAY))
      await route.continue()
    })
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    await expect(dialog.locator('.pvs[data-preview-scene="Editorial hero"]')).toBeVisible()

    // Sample the stage on every frame from before the click to after the new scene lands.
    await page.evaluate(() => {
      const stage = document.querySelector('.pvd-stage')
      window.__stage = []
      const tick = () => {
        const scenes = [...stage.querySelectorAll('.pvs')]
        const first = scenes[0]
        window.__stage.push({
          count: scenes.length,
          name: first ? first.dataset.previewScene : null,
          words: first ? (first.innerText || '').split(/\s+/).filter(Boolean).length : 0,
          height: first ? first.getBoundingClientRect().height : 0,
        })
        window.__raf = requestAnimationFrame(tick)
      }
      tick()
    })

    await dialog.getByRole('option', { name: /^Energy dashboard/ }).click()
    // The option shows it is loading while the old scene stays.
    await expect(dialog.getByRole('option', { name: /^Energy dashboard/ })).toContainText('Loading')
    await expect(dialog.locator('.pvs[data-preview-scene="Energy dashboard"]')).toBeVisible({ timeout: 15000 })
    const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__stage })

    const empty = frames.filter((f) => f.count < 1 || f.words < 30 || f.height < 300)
    expect(empty.length, `${empty.length} of ${frames.length} frames had an empty or collapsed stage`).toBe(0)
    // The wait was real: the old scene was the one on screen for a good part of it.
    const waiting = frames.filter((f) => f.name === 'Editorial hero').length
    expect(waiting, 'the slow chunk should have kept the old scene up for many frames').toBeGreaterThan(20)
    expect(frames.at(-1).name).toBe('Energy dashboard')
  })
})

// ── 6. nothing under 12px ────────────────────────────────────────────────────

/** Every visible text node's element, with its computed size. Runs in the page. */
function sweepSizes() {
  const out = []
  const walker = document.createTreeWalker(document.querySelector('.pvs'), NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue
    const el = n.parentElement
    if (seen.has(el)) continue
    seen.add(el)
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue
    out.push({ cls: String(el.className.baseVal ?? el.className) || el.tagName, text: n.nodeValue.trim().slice(0, 24), size: parseFloat(cs.fontSize) })
  }
  return out
}

test.describe('the type floor', () => {
  for (const width of [390, 768, 1440]) {
    test(`no text in any example is under 12px at ${width}px, in both themes`, async ({ page }) => {
      watch(page, `designer reading the preview examples at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      const small = []
      let measured = 0
      for (const theme of ['Light', 'Dark']) {
        await setTheme(dialog, theme)
        for (const ex of EXAMPLES) {
          await pickScene(dialog, ex.name)
          await expect(dialog.locator('.pvs')).toHaveAttribute('data-mode', theme.toLowerCase())
          await settle(page)
          const found = await page.evaluate(sweepSizes)
          expect(found.length, `${ex.name}: text nodes found`).toBeGreaterThan(20)
          measured += found.length
          for (const f of found) if (f.size < 12) small.push(`${ex.name}/${theme} .${f.cls.split(' ')[0]} "${f.text}" is ${f.size}px`)
        }
      }
      expect(measured, 'text nodes measured in all').toBeGreaterThan(150)
      expect(small, `text under 12px at ${width}px`).toEqual([])
    })
  }
})

// ── 7. contrast on the real ground ───────────────────────────────────────────

/**
 * For each text node: the worst ratio over five points, against the ground
 * painted there. Runs in the page. Returns rows, plus problems it could not
 * measure (a background image, a colour it cannot parse, text covered by
 * something else), so none of those passes by being skipped.
 */
function sweepContrast() {
  const root = document.querySelector('.pvs')
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
  const ratio = (a, b) => { const hi = Math.max(lum(a), lum(b)); const lo = Math.min(lum(a), lum(b)); return (hi + 0.05) / (lo + 0.05) }
  // rgb()/rgba() and color(srgb r g b / a), the two forms Chromium computes to.
  const parse = (s) => {
    s = (s || '').trim()
    let m = s.match(/^rgba?\(([^)]+)\)$/)
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
    m = s.match(/^color\(srgb ([^)]+)\)$/)
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1] }
    return null
  }
  const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]))
  const problems = []
  const rows = []
  const onRender = new Set()
  // elementsFromPoint skips anything with pointer-events:none, such as the Spending card's toast dock,
  // which is printed all the same. Hit-testing is switched on for the walk and put back after it.
  const hitTest = document.createElement('style')
  hitTest.textContent = '.pvs, .pvs * { pointer-events: auto !important }'
  document.head.append(hitTest)

  const isDescendantOrSelf = (maybe, el) => el === maybe || el.contains(maybe) || maybe.contains(el)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const done = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue
    const el = n.parentElement
    if (done.has(el)) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    done.add(el)
    // Text that is visually hidden on purpose (a 1px clip box, kept for a screen reader, as the
    // Orra colourway names are under 960px) paints nothing, so it has no ground to read.
    { const hb = el.getBoundingClientRect(); if (hb.width <= 1 && hb.height <= 1 && cs.clipPath !== 'none') continue }
    el.scrollIntoView({ block: 'center', inline: 'center' })

    const range = document.createRange()
    range.selectNodeContents(n)
    const lines = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
    if (!lines.length) continue
    const label = `${String(el.className.baseVal ?? el.className) || el.tagName} "${n.nodeValue.trim().slice(0, 22)}"`

    // The text's own colour, with every ancestor's opacity folded in.
    const fg = parse(cs.color)
    if (!fg) { problems.push(`${label}: cannot parse text colour ${cs.color}`); continue }
    let op = 1
    for (let a = el; a && a !== root.parentElement; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity)
    fg[3] *= op

    let worst = null
    let reached = 0
    for (const r of lines) {
      for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.3], [0.85, 0.3], [0.15, 0.7], [0.85, 0.7]]) {
        const x = r.left + r.width * fx
        const y = r.top + r.height * fy
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue
        const stack = document.elementsFromPoint(x, y)
        const at = stack.findIndex((e) => isDescendantOrSelf(e, el) && (e === el || el.contains(e)))
        if (at < 0) { problems.push(`${label}: covered or clipped at a point`); continue }
        // Anything above the text that paints something over it.
        const above = stack.slice(0, at).find((e) => !e.contains(el) && (parse(getComputedStyle(e).backgroundColor)?.[3] > 0 || [...e.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim())))
        if (above) problems.push(`${label}: covered by .${String(above.className.baseVal ?? above.className)}`)
        reached++

        // Ground: the text's own element and everything beneath it, up to the scene root.
        const layers = []
        let imageUnder = null
        for (const e of stack.slice(at)) {
          const s = getComputedStyle(e)
          const svgShape = e instanceof SVGElement && !(e instanceof SVGSVGElement)
          let c
          let a
          if (svgShape) {
            c = s.fill === 'none' ? null : parse(s.fill)
            a = c ? c[3] * parseFloat(s.fillOpacity) * parseFloat(s.opacity) : 0
          } else {
            c = parse(s.backgroundColor)
            a = c ? c[3] * parseFloat(s.opacity) : 0
            if (s.backgroundImage && s.backgroundImage !== 'none') imageUnder = e
          }
          if (c && a > 0) layers.push([c[0], c[1], c[2], a])
          if (a >= 0.999 || e === root) break
        }
        // Text printed on the card render has a picture for a ground; cardInkRatios rates it from the screen.
        if (imageUnder) {
          if (el.closest('.rc') && imageUnder.closest('.rc')) { onRender.add(label); continue }
          problems.push(`${label}: a background image under the text (.${String(imageUnder.className)})`)
          continue
        }
        let ground = [255, 255, 255]
        for (let i = layers.length - 1; i >= 0; i--) ground = over(layers[i], ground)
        const ink = over(fg, ground)
        const rr = ratio(ink, ground)
        if (!worst || rr < worst.ratio) worst = { ratio: rr, ink, ground }
      }
    }
    // Slack Water's narrow layout crops the chart on purpose (the wharves past the crop
    // are not on screen); slack-water-chart.test.js holds that no label is cut by the crop.
    // Anything else that cannot be reached is a finding.
    if (!reached) { if (!el.closest('.sw-label')) problems.push(`${label}: no point of it could be reached (all covered or off screen)`); continue }

    // Every point sat on a background image, which is already in `problems`: nothing to rate.
    if (!worst) continue

    const size = parseFloat(cs.fontSize)
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
    const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
    rows.push({
      label, size, large, floor: large ? 3 : 4.5, ratio: Math.round(worst.ratio * 100) / 100,
      ink: hex(worst.ink), ground: hex(worst.ground),
      // The sold-out size in the Product page: struck through, in the disabled
      // ink, on purpose. Text of an inactive control is exempt from 1.4.3, so it
      // is exempt only while it is marked aria-disabled.
      // The Overseas fees label in the Spending card's Limits form is the same
      // case: a disabled toggle's label, drawn in the disabled ink on purpose.
      exempt: !!el.closest('.or-size.is-off[aria-disabled="true"], .ty-field-l.is-disabled'),
    })
  }
  hitTest.remove()
  return { rows, problems: [...new Set(problems)], onRender: [...onRender] }
}

test.describe('contrast on the real ground', () => {
  for (const width of [1440, 390]) {
    for (const [paletteName, colors] of Object.entries(PALETTES)) {
      test(`every text node clears its floor on the ground it is painted on, ${paletteName} palette at ${width}px, both themes`, async ({ page }) => {
        watch(page, `designer checking the preview examples with a ${paletteName} palette`)
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
        await seed(page, colors)
        const dialog = await openDialog(page)
        // The seed reached the engine, so the run says something about this palette.
        const slots = await dialog.locator('.pvs').evaluate((el) => {
          const cs = getComputedStyle(el)
          return ['--pv-primary', '--pv-secondary', '--pv-accent', '--pv-subtle', '--pv-deep'].map((n) => cs.getPropertyValue(n).trim().toLowerCase())
        })
        expect(slots, 'the seeded palette did not reach the preview, slot for slot').toEqual(colors)

        const misses = []
        const unmeasured = []
        let measured = 0
        let exempt = 0
        let cardChecked = 0
        for (const theme of ['Light', 'Dark']) {
          await setTheme(dialog, theme)
          for (const ex of EXAMPLES) {
            await pickScene(dialog, ex.name)
            for (const state of STATES[ex.name] || [null]) {
              if (state) await pickPreviewState(dialog, state)
              const at = state ? `${ex.name}/${state}/${theme}` : `${ex.name}/${theme}`
              await expect(dialog.locator('.pvs')).toHaveAttribute('data-mode', theme.toLowerCase())
              await settle(page)
              const { rows, problems, onRender } = await page.evaluate(sweepContrast)
              expect(rows.length, `${at}: text nodes measured`).toBeGreaterThan(state && state !== 'Overview' ? 15 : 20)
              measured += rows.length
              for (const p of problems) unmeasured.push(`${at} ${p}`)
              for (const r of rows) {
                if (r.exempt) { exempt++; continue }
                if (r.ratio < r.floor) misses.push(`${at} ${r.label} ${r.ink} on ${r.ground} = ${r.ratio}:1 at ${r.size}px (floor ${r.floor})`)
              }
              // The card is on the first screen of the Overview and Card frozen states, and its printed text has a render for a ground.
              if (onRender.length) {
                const inks = await cardInkRatios(page)
                expect(inks.length, `${at}: the card's printed text was not found`).toBe(2)
                for (const k of inks) if (k.ratio < 4.5) misses.push(`${at} ${k.sel} on the card render = ${k.ratio}:1 (floor 4.5, least-contrast pixel)`)
                cardChecked++
              }
            }
          }
        }
        expect(measured, 'text nodes measured in all').toBeGreaterThan(150)
        expect(unmeasured, 'text this walk could not measure or that something covers').toEqual([])
        // The sold-out size is in the Product page, in both themes, so the carve-out was used.
        expect(exempt, 'the sold-out size chips were not found (both themes)').toBeGreaterThanOrEqual(2)
        // The card's printed text was rated from pixels in both themes, in more than one state.
        expect(cardChecked, 'the card render text was never rated from pixels').toBeGreaterThanOrEqual(4)
        expect(misses, `text below its floor on its real ground (${measured} measured):\n${misses.join('\n')}`).toEqual([])
      })
    }
  }
})

// ── 7b. the Sundial chart's labels keep clear of the now line ────────────────
// The contrast walk cannot see this: the now line is drawn under a label's plate,
// so the text is never "covered", yet the line would run through the label's box.
// So the boxes are compared directly: no series label touches the now line, the
// now label or another series label, and each stays inside the plot.

test.describe('the Energy dashboard chart labels', () => {
  for (const width of [390, 768, 1440]) {
    test(`no series label touches the now line, the now label or another label at ${width}px, in both themes`, async ({ page }) => {
      watch(page, `designer reading the Energy dashboard chart at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      for (const theme of ['Light', 'Dark']) {
        await setTheme(dialog, theme)
        await pickScene(dialog, 'Energy dashboard')
        await settle(page)
        const boxes = await page.evaluate(() => {
          const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom } }
          const plot = document.querySelector('.sd-plot')
          return {
            plot: plot && r(plot),
            line: document.querySelector('.sd-now-line') && r(document.querySelector('.sd-now-line')),
            nowText: document.querySelector('.sd-now-t') && r(document.querySelector('.sd-now-t')),
            tags: [...document.querySelectorAll('.sd-tag')].map((el) => ({ name: el.textContent.trim(), ...r(el) })),
          }
        })
        expect(boxes.plot && boxes.line && boxes.nowText, `${theme}: the chart, its now line and its now label were found`).toBeTruthy()
        expect(boxes.tags.map((t) => t.name), `${theme}: the three series labels were found`).toEqual(['Solar', 'Battery', 'Grid'])
        const touch = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t
        const problems = []
        boxes.tags.forEach((t, i) => {
          if (touch(t, boxes.line)) problems.push(`${t.name} runs across the now line`)
          if (touch(t, boxes.nowText)) problems.push(`${t.name} overlaps the now label`)
          if (t.l < boxes.plot.l - 0.5 || t.r > boxes.plot.r + 0.5 || t.t < boxes.plot.t - 0.5) problems.push(`${t.name} sticks out of the plot`)
          boxes.tags.slice(i + 1).forEach((u) => { if (touch(t, u)) problems.push(`${t.name} overlaps ${u.name}`) })
        })
        expect(problems, `${theme} at ${width}px`).toEqual([])
      }
    })
  }
})

// ── 7c. the legend's highlight on a drawing ──────────────────────────────────
// A drawn part (an SVG path with a data-role) is traced by a stroke. Chromium
// would also paint an `outline` round its bounding box, and in a chart with a
// stretched viewBox that box is a heavy dashed bar across the plot, away from the
// data. So no SVG part may carry an outline while a colour is traced.

test.describe('the legend highlight on a drawing', () => {
  // Tally is built from boxes, with no drawn part that carries a role, so there is no SVG to check there.
  for (const ex of EXAMPLES.filter((e) => e.id !== 'card')) {
    test(`${ex.name}: tracing a colour puts no outline on any drawn part`, async ({ page }) => {
      watch(page, `designer tracing colours on the drawings in ${ex.name}`)
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      await pickScene(dialog, ex.name)
      const outlined = async () => page.evaluate(() => [...document.querySelectorAll('.pvs svg [data-role]')]
        .filter((el) => getComputedStyle(el).outlineStyle !== 'none')
        .map((el) => `${el.tagName}.${el.getAttribute('class') || ''}[${el.dataset.role}]`))
      expect((await page.locator('.pvs svg [data-role]').count()), `${ex.name}: drawn parts with a role were found`).toBeGreaterThan(3)
      let traced = 0
      for (const role of ex.roles) {
        await (await chipFor(dialog, role)).hover()
        await expect(hits(page), `${ex.name}: hovering ${role} marked nothing`).not.toHaveCount(0)
        if (await page.locator('.pvs svg [data-hit="on"]').count()) traced++
        expect(await outlined(), `${ex.name}: hovering ${role} left an outline on a drawn part`).toEqual([])
        await page.mouse.move(2, 2)
      }
      expect(traced, `${ex.name}: at least one role traced a drawn part, so the check ran on a marked drawing`).toBeGreaterThan(0)
    })
  }
})

// ── 7d. Orra's five colourways: one row at every width ───────────────────────
// The row is a five-column grid. Under a 960px container the names are hidden from
// the eye (a 1px clip box, still read by a screen reader) and the selected name is
// printed beside "Colourway"; from 960 the names show under the swatches.

const swatchRow = (page) => page.evaluate(() => {
  const row = [...document.querySelectorAll('.or-sw')].map((el) => {
    const r = el.getBoundingClientRect()
    const t = el.querySelector('.or-sw-t')
    const i = el.querySelector(':scope > i').getBoundingClientRect()
    const tb = t.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(t)
    const rects = [...range.getClientRects()].filter((q) => q.width > 0)
    return {
      name: t.textContent.trim(), top: Math.round(r.top), width: r.width, circle: [i.width, i.height],
      box: [tb.width, tb.height], textWidth: Math.max(0, ...rects.map((q) => q.width)),
      lines: new Set(rects.map((q) => Math.round(q.top))).size,
    }
  })
  const sel = document.querySelector('.or-opt-l b')
  return { row, selected: sel && sel.textContent.trim(), first: row[0] && row[0].name }
})

test.describe('the Orra colourways on a phone', () => {
  for (const width of [360, 390]) {
    test(`five swatches share one row at ${width}px, 40px circles, names hidden from the eye and the selected one printed`, async ({ page }) => {
      watch(page, `designer reading the Orra colourways at ${width}px`)
      await page.setViewportSize({ width, height: 844 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      for (const theme of ['Light', 'Dark']) {
        await setTheme(dialog, theme)
        await pickScene(dialog, 'Product page')
        await settle(page)
        const { row, selected, first } = await swatchRow(page)
        expect(row.length, `${theme}: five colourways`).toBe(5)
        expect(new Set(row.map((s) => s.top)).size, `${theme}: the colourways wrap onto a second row`).toBe(1)
        for (const s of row) {
          expect(s.width, `${theme}: the "${s.name}" swatch is squeezed`).toBeGreaterThanOrEqual(44)
          expect(s.circle, `${theme}: the "${s.name}" circle is not 40px`).toEqual([40, 40])
          expect(s.box[0], `${theme}: "${s.name}" is still visible (wider than its 1px clip box)`).toBeLessThanOrEqual(1)
          expect(s.box[1], `${theme}: "${s.name}" is still visible (taller than its 1px clip box)`).toBeLessThanOrEqual(1)
        }
        expect(selected, `${theme}: the selected colourway's name is printed in the option label`).toBe(first)
      }
    })
  }
})

test.describe('the Orra colourways on a tablet', () => {
  for (const width of [768, 1024]) {
    test(`five swatches share one row at ${width}px`, async ({ page }) => {
      watch(page, `designer reading the Orra colourways at ${width}px`)
      await page.setViewportSize({ width, height: 900 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      for (const theme of ['Light', 'Dark']) {
        await setTheme(dialog, theme)
        await pickScene(dialog, 'Product page')
        await settle(page)
        const { row, selected, first } = await swatchRow(page)
        expect(row.length, `${theme}: five colourways`).toBe(5)
        expect(new Set(row.map((s) => s.top)).size, `${theme}: the colourways wrap onto a second row`).toBe(1)
        for (const s of row) expect(s.width, `${theme}: the "${s.name}" swatch is squeezed`).toBeGreaterThanOrEqual(44)
        expect(selected, `${theme}: the selected colourway's name is printed in the option label`).toBe(first)
      }
    })
  }
})

test.describe('the Orra colourway names where they show', () => {
  test('at 1440px each name is on one line with room to spare inside its swatch, in both themes', async ({ page }) => {
    watch(page, 'designer reading the Orra colourway names at 1440px')
    await page.setViewportSize({ width: 1440, height: 900 })
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    for (const theme of ['Light', 'Dark']) {
      await setTheme(dialog, theme)
      await pickScene(dialog, 'Product page')
      await settle(page)
      const { row } = await swatchRow(page)
      expect(row.length, `${theme}: five colourways`).toBe(5)
      expect(new Set(row.map((s) => s.top)).size, `${theme}: the colourways wrap onto a second row`).toBe(1)
      for (const s of row) {
        expect(s.box[0], `${theme}: "${s.name}" is hidden at 1440`).toBeGreaterThan(8)
        expect(s.lines, `${theme}: "${s.name}" wraps onto ${s.lines} lines`).toBe(1)
        // The width of the text itself (a Range), not its box: a box that is as wide as its
        // column hides a word that is exactly as wide, or wider, and breaks it.
        expect(s.width - s.textWidth, `${theme}: "${s.name}" (${s.textWidth.toFixed(1)}px) leaves under 8px in a ${s.width.toFixed(1)}px swatch`).toBeGreaterThanOrEqual(8)
      }
    }
  })
})

// ── 7e. Orra's shirt stays inside its stage ──────────────────────────────────
// The contrast walk measures text on what is painted over it, so a shirt drawn over
// the price and description at 768 could still pass. Compare the boxes instead:
// the front view's drawing must sit inside the stage's box, and the buy column
// must not start above the stage's bottom edge when the two are stacked.

test.describe('the Orra product stage', () => {
  for (const width of [1440, 768, 390]) {
    test(`the shirt stays inside its stage and off the buy column at ${width}px`, async ({ page }) => {
      watch(page, `designer reading the Orra product page at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      await pickScene(dialog, 'Product page')
      await settle(page)
      const b = await page.evaluate(() => {
        const r = (el) => { const x = el.getBoundingClientRect(); return { l: x.left, r: x.right, t: x.top, b: x.bottom } }
        const stage = document.querySelector('.or-stage')
        const shirt = document.querySelector('.or-figure .or-garment')
        const buy = document.querySelector('.or-buy')
        return stage && shirt && buy ? { stage: r(stage), shirt: r(shirt), buy: r(buy) } : null
      })
      expect(b, 'the stage, its shirt and the buy column were found').toBeTruthy()
      const slack = 1
      expect(b.shirt.l, 'shirt past the stage\'s left edge').toBeGreaterThanOrEqual(b.stage.l - slack)
      expect(b.shirt.r, 'shirt past the stage\'s right edge').toBeLessThanOrEqual(b.stage.r + slack)
      expect(b.shirt.t, 'shirt above the stage').toBeGreaterThanOrEqual(b.stage.t - slack)
      expect(b.shirt.b, 'shirt below the stage').toBeLessThanOrEqual(b.stage.b + slack)
      const side = b.shirt.l < b.buy.r && b.shirt.r > b.buy.l && b.shirt.t < b.buy.b && b.shirt.b > b.buy.t
      expect(side, 'the shirt overlaps the buy column').toBe(false)
    })
  }
})

// ── 7f. the legend is one row, and its note is attached to the chips ─────────
// The legend is a single 48px row: the heading, the chips that fit, then "+N more".
// The chips that do not fit, and the "darker as text, so it reads" caption, sit in
// the popover that button opens. Every chip that names a colour read as text points
// at the caption with aria-describedby, whether it is on the row or in the popover.

test.describe('the legend', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.name}: one row with the rest under "+N more", and the adjusted-as-text caption is one line that its chips are described by`, async ({ page }) => {
      watch(page, `designer reading the legend beside ${ex.name}`)
      await page.setViewportSize({ width: 1440, height: 900 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      await pickScene(dialog, ex.name)
      await settle(page)
      const onRow = await page.evaluate(() => {
        const root = document.querySelector('.pvd-legend')
        if (!root) return null
        const chips = [...root.querySelectorAll('.pvd-chip:not(.pvd-legend-ghost *)')]
        const more = root.querySelector('.pvd-more')
        return {
          shown: chips.length,
          rows: new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top))).size,
          height: root.getBoundingClientRect().height,
          more: more && more.textContent.trim(),
        }
      })
      expect(onRow, 'the legend was found').toBeTruthy()
      expect(onRow.rows, 'the chips on the row sit on more than one line').toBe(1)
      expect(onRow.height, 'the legend is taller than one row').toBeLessThanOrEqual(56)
      expect(onRow.more, 'the "+N more" button is missing').toMatch(/^\+\d+ more$/)
      const hidden = Number(/\d+/.exec(onRow.more)[0])
      expect(onRow.shown + hidden, 'the chips on the row plus those under "+N more" are the ten colours').toBe(10)

      await dialog.getByRole('button', { name: onRow.more }).click()
      const pop = dialog.getByRole('dialog', { name: 'More colours' })
      await expect(pop).toBeVisible()
      await expect(pop.locator('.pvd-chip'), 'the popover holds exactly the chips the row dropped').toHaveCount(hidden)

      const legend = await page.evaluate(() => {
        const root = document.querySelector('.pvd-legend')
        const chips = [...root.querySelectorAll('.pvd-chip:not(.pvd-legend-ghost *)')]
        const cap = root.querySelector('.pvd-more-pop .pvd-legend-adj')
        const names = cap ? cap.textContent.split(':')[0].split(',').map((x) => x.trim()) : []
        const spoken = cap && [...root.querySelectorAll('p.sr-only')].find((p) => p.textContent.trim() === cap.textContent.trim())
        return {
          chipCount: chips.length,
          caption: cap && {
            text: cap.textContent.trim(), size: parseFloat(getComputedStyle(cap).fontSize), height: cap.getBoundingClientRect().height,
            inChip: !!cap.closest('.pvd-chip'), spokenId: spoken && spoken.id,
          },
          described: chips.map((c) => ({
            label: c.querySelector('.pvd-chip-l').textContent.trim(),
            by: c.getAttribute('aria-describedby'),
          })),
          names,
        }
      })
      expect(legend.chipCount, 'ten chips: five colours and five suggested').toBe(10)
      // The caption names the roles this scene uses that were read darker as text, so it is
      // required where the mid palette has one (Editorial hero) and held to its rules wherever it appears.
      if (!legend.caption) { for (const d of legend.described) expect(d.by, `"${d.label}" points at a caption that is not there`).toBeNull(); return }
      expect(legend.caption.inChip, 'the caption is inside a chip').toBe(false)
      expect(legend.caption.size, 'caption type is under the 12px floor').toBeGreaterThanOrEqual(12)
      expect(legend.caption.height, `the caption takes more than one line: "${legend.caption.text}"`).toBeLessThan(24)
      expect(legend.caption.spokenId, 'the screen-reader copy of the caption is not on the page').toBeTruthy()
      expect(legend.names.length, 'the caption names at least one colour').toBeGreaterThan(0)
      for (const name of legend.names) {
        const chip = legend.described.find((d) => d.label === name)
        expect(chip, `the caption names "${name}", which is not a chip`).toBeTruthy()
        expect(chip.by, `the "${name}" chip is not described by the caption`).toBe(legend.caption.spokenId)
      }
      for (const d of legend.described.filter((x) => x.by)) {
        expect(legend.names, `"${d.label}" is described by the caption but is not named in it`).toContain(d.label)
      }
    })
  }
})

// ── 7g. Slack Water's headline stays within three lines ──────────────────────

test.describe('the Slack Water headline', () => {
  for (const width of [1440, 768]) {
    test(`runs to at most three lines at ${width}px, in both themes`, async ({ page }) => {
      watch(page, `designer reading the Slack Water headline at ${width}px`)
      await page.setViewportSize({ width, height: 900 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      for (const theme of ['Light', 'Dark']) {
        await setTheme(dialog, theme)
        await pickScene(dialog, 'Editorial hero')
        await settle(page)
        const lines = await page.evaluate(() => {
          const h = document.querySelector('.sw-head')
          if (!h) return null
          const range = document.createRange()
          range.selectNodeContents(h)
          const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top / 4)))
          return { lines: tops.size, text: h.textContent.trim(), size: parseFloat(getComputedStyle(h).fontSize) }
        })
        expect(lines, `${theme}: the headline was found`).toBeTruthy()
        expect(lines.text, 'the headline text is the one this test was written for').toContain('Manly')
        expect(lines.lines, `${theme}: "${lines.text}" runs to ${lines.lines} lines at ${lines.size}px`).toBeLessThanOrEqual(3)
        expect(lines.lines, `${theme}: the line count was read from real boxes`).toBeGreaterThanOrEqual(2)
      }
    })
  }
})

// ── 8. a chunk that never arrives ────────────────────────────────────────────

test.describe('an example that fails to download', () => {
  test('shows "This example didn\'t load" in its place, keeps the dialog working and does not reload the page', async ({ page }) => {
    watch(page, 'visitor whose preview example never arrives')
    await page.route(/\/assets\/Sundial-[^/]+\.(?:js|css)$/, (route) => route.abort('failed'))
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    await expect(dialog.locator('.pvs[data-preview-scene="Editorial hero"]')).toBeVisible()

    let navigations = 0
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations++ })

    await dialog.getByRole('option', { name: /^Energy dashboard/ }).click()
    const message = dialog.getByText("This example didn't load")
    await expect(message).toBeVisible({ timeout: 15000 })
    await expect(dialog.getByText('Check your connection, then reload the page.')).toBeVisible()
    await expect(dialog.getByRole('option', { name: /^Energy dashboard/ })).toHaveAttribute('aria-selected', 'true')

    // The dialog around it is alive: another example loads.
    await pickScene(dialog, 'Product page')
    await expect(message).toHaveCount(0)
    await pickScene(dialog, 'Trail run app')
    await expect(dialog).toBeVisible()
    expect(navigations, 'the page reloaded when the chunk failed').toBe(0)
  })
})

// ── 9. the dialog's own chunk fails ──────────────────────────────────────────
// Opposite to an example. A failed EXAMPLE is answered inside the dialog and must
// not reload (section 8). The DIALOG's file failing is a stale or dropped page
// file like any other: main.jsx answers it with one guarded reload, and until the
// reload lands the page must wait, not paint the error boundary or file a crash.
// The reload is held (asked for, never served) so the old document keeps running.
// Playwright will not read a document whose navigation is held, so the page says
// what it shows over the console (the same way spec 46 does).

test.describe('the preview dialog fails to download', () => {
  test('the page asks for one reload and shows no error card, no crash report and no dialog while it waits', async ({ page }) => {
    watch(page, 'visitor whose preview dialog never arrives')
    const PROBE = '[dialog-probe]'
    const probe = []
    const reports = []
    const defaultThrows = []
    const posted = []
    page.on('console', (m) => {
      const t = m.text()
      if (t.startsWith(PROBE)) probe.push(t.slice(PROBE.length + 1))
      if (t.includes('[crash report, not sent outside production]')) reports.push(t)
    })
    page.on('pageerror', (e) => { if (/reading 'default'|'default' in undefined/.test(String(e && e.message))) defaultThrows.push(e.message) })
    page.on('request', (r) => { if (r.url().includes('/api/support')) posted.push(r.url()) })

    await seed(page, PALETTES.mid)
    await go(page, '/create/palette')
    await page.evaluate((tag) => {
      const say = (what) => console.log(`${tag} ${what}`)
      const state = () => `card=${!!document.querySelector('.error-boundary')} dialog=${!!document.querySelector('[role="dialog"][aria-label="Palette preview"]')}`
      let crashed = false
      new MutationObserver(() => {
        if (!crashed && document.querySelector('.error-boundary')) { crashed = true; say('error card mounted') }
      }).observe(document.documentElement, { childList: true, subtree: true })
      window.addEventListener('beforeunload', () => {
        say('reload started')
        setTimeout(() => say(`reload pending ${state()}`), 1500)
      })
    }, PROBE)

    const failed = { count: 0 }
    // The dialog fails a moment after the click, as a dropped connection does, and the
    // first example is slow: if the example were requested alongside the dialog it would
    // be in flight when the dialog's failure is raised, and main.jsx would take that
    // failure for the example's and not reload. So no example may be requested at all.
    const exampleRequests = []
    await page.route(/\/assets\/(?:SlackWater|Sundial|OrraWorkroom)-[^/]+\.js$/, async (route) => {
      exampleRequests.push(route.request().url())
      await new Promise((resolve) => setTimeout(resolve, 2500))
      await route.continue().catch(() => {})
    })
    await page.route('**/assets/PalettePreviewDialog-*.js', async (route) => {
      failed.count += 1
      await new Promise((resolve) => setTimeout(resolve, 300))
      await route.abort().catch(() => {})
    })
    const held = []
    await page.route((url) => url.pathname === '/create/palette', (route) => {
      if (route.request().resourceType() !== 'document') return route.continue()
      held.push(route)
      return undefined
    })

    await clickPaletteAction(page, 'Preview')
    await expect.poll(() => held.length, { message: 'the failed dialog chunk should have asked for exactly one reload' }).toBe(1)
    await expect.poll(() => probe.find((p) => p.startsWith('reload pending')), { message: 'the in-page probe never reported, so this test read nothing', timeout: 10000 }).toBeTruthy()
    expect(failed.count, 'the dialog chunk request must actually have been failed').toBeGreaterThan(0)
    expect(held.length, 'more than one reload was asked for').toBe(1)
    expect(exampleRequests, 'an example was requested while the dialog was still failing').toEqual([])
    expect(probe, 'the error card was shown for a page that is reloading').not.toContain('error card mounted')
    expect(probe.find((p) => p.startsWith('reload pending')), 'the page should wait with no card and no dialog').toBe('reload pending card=false dialog=false')
    expect(defaultThrows, "React threw on the missing module's .default").toEqual([])
    expect(reports, 'a crash was reported for a page that is reloading').toEqual([])
    expect(posted).toEqual([])

    await page.unroute('**/assets/PalettePreviewDialog-*.js')
    const reloaded = page.waitForEvent('domcontentloaded')
    await held[0].continue()
    await reloaded
  })
})

// ── 10. the free/Pro gate, and walking the list ──────────────────────────────

const SCENE_ORDER = ['Energy dashboard', 'Trail run app', 'Spending card', 'Editorial hero', 'Product page', 'Architect portfolio']

test.describe('the free and Pro examples', () => {
  test('a free account has Trail run app open and sees Architect portfolio and Spending card blurred and out of reach', async ({ page }) => {
    watch(page, 'free designer opening the new preview examples')
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page, { plan: null })
    const rail = dialog.getByRole('listbox', { name: 'Previews' })
    await expect(rail.getByRole('option'), 'six previews in the list').toHaveCount(SCENE_ORDER.length)

    for (const ex of EXAMPLES) {
      await pickScene(dialog, ex.name)
      const option = rail.getByRole('option', { name: rx(ex.name) })
      const unlock = dialog.getByRole('button', { name: 'Unlock preview' })
      // The real scene is behind the gate either way: a free account can see what it is missing.
      await expect(dialog.locator('.pvs'), `${ex.name}: its real scene is on the stage`).toContainText(ex.text)
      if (ex.pro) {
        await expect(option, `${ex.name} is marked Pro in the list`).toContainText(/Pro$/)
        await expect(dialog.getByText(`${ex.name} is a Pro preview`)).toBeVisible()
        await expect(unlock, `${ex.name}: one Unlock preview button`).toHaveCount(1)
        await expect(dialog.locator('.pvd-scene-in')).toHaveCSS('filter', 'blur(6px)')
        await expect(dialog.locator('.pvd-scene-in'), `${ex.name}: out of reach of the keyboard and pointer`).toHaveAttribute('inert', '')
      } else {
        await expect(option, `${ex.name} is not marked Pro`).not.toContainText(/Pro$/)
        await expect(dialog.getByText('is a Pro preview')).toHaveCount(0)
        await expect(unlock, `${ex.name}: open to a free account`).toHaveCount(0)
        await expect(dialog.locator('.pvd-scene-in')).not.toHaveAttribute('inert', /.*/)
        await expect(dialog.locator('.pvd-scene-in')).not.toHaveCSS('filter', 'blur(6px)')
      }
    }
  })

  test('a Pro account sees all three with nothing blurred or locked', async ({ page }) => {
    watch(page, 'Pro designer opening the new preview examples')
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    for (const ex of EXAMPLES.filter((e) => e.id === 'trail' || e.id === 'studio' || e.id === 'card')) {
      await pickScene(dialog, ex.name)
      await expect(dialog.getByRole('button', { name: 'Unlock preview' }), `${ex.name}: Pro has nothing to unlock`).toHaveCount(0)
      await expect(dialog.locator('.pvd-scene-in')).not.toHaveAttribute('inert', /.*/)
      await expect(dialog.locator('.pvd-scene-in')).not.toHaveCSS('filter', 'blur(6px)')
    }
  })

  test('the arrow keys walk the rail through all six previews in order, and Home and End reach the ends', async ({ page }) => {
    watch(page, 'keyboard designer walking the preview list')
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    const rail = dialog.getByRole('listbox', { name: 'Previews' })
    const selected = async () => (await rail.getByRole('option', { selected: true }).first().textContent() || '').replace(/Pro$/, '').trim()

    await rail.getByRole('option', { name: rx(SCENE_ORDER[0]) }).click()
    const walked = [await selected()]
    for (let i = 1; i < SCENE_ORDER.length; i++) {
      await page.keyboard.press('ArrowDown')
      await expect(rail.getByRole('option', { name: rx(SCENE_ORDER[i]) })).toHaveAttribute('aria-selected', 'true')
      walked.push(await selected())
    }
    expect(walked.map((w) => SCENE_ORDER.find((n) => w.startsWith(n))), 'the arrow keys visited every preview in list order').toEqual(SCENE_ORDER)
    await page.keyboard.press('Home')
    await expect(rail.getByRole('option', { name: rx(SCENE_ORDER[0]) })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(rail.getByRole('option', { name: rx(SCENE_ORDER.at(-1)) })).toHaveAttribute('aria-selected', 'true')
  })
})

// ── 11. no sideways overflow ─────────────────────────────────────────────────
// The scene is a container-query layout. A part wider than its column would
// scroll the dialog sideways on a phone, so: the page and the scene do not
// scroll sideways, and no text element sticks out of the scene's box.

test.describe('the new examples at phone and tablet widths', () => {
  for (const width of [320, 390, 768]) {
    for (const ex of EXAMPLES.filter((e) => ['trail', 'studio', 'card'].includes(e.id))) {
      test(`${ex.name} does not overflow sideways at ${width}px, in both themes`, async ({ page }) => {
        watch(page, `designer reading ${ex.name} at ${width}px`)
        await page.setViewportSize({ width, height: width < 768 ? 700 : 900 })
        await seed(page, PALETTES.mid)
        const dialog = await openDialog(page)
        for (const theme of ['Light', 'Dark']) {
          await setTheme(dialog, theme)
          await pickScene(dialog, ex.name)
          await settle(page)
          const m = await page.evaluate(() => {
            const root = document.querySelector('.pvs')
            const box = root.getBoundingClientRect()
            const out = []
            let texts = 0
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              if (!n.nodeValue.trim()) continue
              const range = document.createRange()
              range.selectNodeContents(n)
              for (const r of range.getClientRects()) {
                if (r.width <= 1 || r.height <= 1) continue
                texts++
                if (r.left < box.left - 1 || r.right > box.right + 1) {
                  out.push(`"${n.nodeValue.trim().slice(0, 24)}" spans ${Math.round(r.left)}-${Math.round(r.right)} in a scene at ${Math.round(box.left)}-${Math.round(box.right)}`)
                  break
                }
              }
            }
            return {
              docOver: document.documentElement.scrollWidth - innerWidth,
              sceneOver: root.scrollWidth - root.clientWidth,
              sceneWidth: box.width,
              texts,
              out,
            }
          })
          expect(m.texts, `${ex.name}/${theme}: text boxes were measured`).toBeGreaterThan(20)
          expect(m.sceneWidth, `${ex.name}/${theme}: the scene has a width`).toBeGreaterThan(200)
          expect(m.docOver, `${ex.name}/${theme}: the page scrolls sideways at ${width}px`).toBeLessThanOrEqual(0)
          expect(m.sceneOver, `${ex.name}/${theme}: the scene scrolls sideways at ${width}px`).toBeLessThanOrEqual(0)
          expect(m.out, `${ex.name}/${theme}: text outside the scene at ${width}px`).toEqual([])
        }
      })
    }
  }
})
