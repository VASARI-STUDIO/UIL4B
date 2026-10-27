// The three preview examples in the Palette Builder's "Preview on a UI" dialog:
// Slack Water (Editorial hero), Sundial (Energy dashboard) and Orra Workroom
// (Product page), each its own lazy chunk behind src/components/palette/examples/registry.js.
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
//   3. the older "where each colour lands" hover still works on a Fernway scene
//   4. on a phone a tapped colour stays traced for 3 seconds, then clears
//   5. a slow download never shows an empty stage: the old scene stays up
//   6. no text under 12px in any example at 390, 768 and 1440
//   7. every text node clears 4.5:1 (3:1 large) on the ground it is really
//      painted on, for a mid, a pale and a dark palette, both preview themes
//   7b. the Energy dashboard's series labels keep clear of the now line, the now
//      label and each other (a box test; the contrast walk cannot see a line
//      drawn under a label's plate)
//   7c. tracing a colour leaves no outline on a drawn (SVG) part
//   7d. Orra's colourway names fit under their swatches at 1440, 768 and 390
//   8. a chunk that fails shows "This example didn't load" and the dialog lives
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
// `.or-sw-t` back to ellipsis (7d, 3 red).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

// name: the option in the dialog's list. text: a string only that example prints.
// roles: the roles each example tags, by hand, from its ROLES in <File>.data.js.
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

async function openDialog(page) {
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview on a UI')
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

/** The legend chip for a role, wherever the layout puts the legend. */
function chipFor(scope, role) {
  if (BRAND.includes(role)) return scope.getByRole('group', { name: 'Your colours' }).getByRole('button').nth(BRAND.indexOf(role))
  return scope.getByRole('group', { name: 'Suggested colours' }).getByRole('button', { name: SUGGESTED_LABEL[role] })
}

/** Jump every running animation to its end, so text is measured at rest and not part-way through a fade in. */
const settle = (page) => page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* an endless one */ } } })

const hits = (page) => page.locator('.pvd-stage [data-hit="on"]')

// ── 1. each example renders ──────────────────────────────────────────────────

test.describe('the three preview examples', () => {
  test('the preview opens on the editorial example and each example renders as the scene that was picked', async ({ page }) => {
    watch(page, 'designer opening the three preview examples')
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
      await expect(dialog.getByText('Where each colour lands')).toBeVisible()

      for (const role of ex.roles) {
        const chip = chipFor(dialog, role)
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
        const chip = chipFor(dialog, role)
        await expect(chip, `${ex.name} does not use ${role}`).toHaveAttribute('aria-disabled', 'true')
        await expect(chip).toContainText('Not in this preview')
        await chip.focus()
        await expect(hits(page), `${ex.name}: ${role} is unused yet traced something`).toHaveCount(0)
      }
    })
  }

  test('the older Fernway scenes still trace a colour on hover, dimming everything else, and clear on leave', async ({ page }) => {
    watch(page, 'designer tracing colours in a Fernway scene')
    await seed(page, PALETTES.mid)
    const dialog = await openDialog(page)
    await pickScene(dialog, 'Dashboard')
    await expect(dialog.getByText('Where each colour lands')).toBeVisible()
    await expect(hits(page)).toHaveCount(0)

    const primary = chipFor(dialog, 'primary')
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
    await chipFor(sheet, 'primary').tap()

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
        if (imageUnder) { problems.push(`${label}: a background image under the text (.${String(imageUnder.className)})`); continue }
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

    const size = parseFloat(cs.fontSize)
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
    const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
    rows.push({
      label, size, large, floor: large ? 3 : 4.5, ratio: Math.round(worst.ratio * 100) / 100,
      ink: hex(worst.ink), ground: hex(worst.ground),
      // The sold-out size in the Product page: struck through, in the disabled
      // ink, on purpose. Text of an inactive control is exempt from 1.4.3, so it
      // is exempt only while it is marked aria-disabled.
      exempt: !!el.closest('.or-size.is-off[aria-disabled="true"]'),
    })
  }
  return { rows, problems: [...new Set(problems)] }
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
        for (const theme of ['Light', 'Dark']) {
          await setTheme(dialog, theme)
          for (const ex of EXAMPLES) {
            await pickScene(dialog, ex.name)
            await expect(dialog.locator('.pvs')).toHaveAttribute('data-mode', theme.toLowerCase())
            await settle(page)
            const { rows, problems } = await page.evaluate(sweepContrast)
            expect(rows.length, `${ex.name}/${theme}: text nodes measured`).toBeGreaterThan(20)
            measured += rows.length
            for (const p of problems) unmeasured.push(`${ex.name}/${theme} ${p}`)
            for (const r of rows) {
              if (r.exempt) { exempt++; continue }
              if (r.ratio < r.floor) misses.push(`${ex.name}/${theme} ${r.label} ${r.ink} on ${r.ground} = ${r.ratio}:1 at ${r.size}px (floor ${r.floor})`)
            }
          }
        }
        expect(measured, 'text nodes measured in all').toBeGreaterThan(150)
        expect(unmeasured, 'text this walk could not measure or that something covers').toEqual([])
        // The sold-out size is in the Product page, in both themes, so the carve-out was used.
        expect(exempt, 'the sold-out size chips were not found (both themes)').toBeGreaterThanOrEqual(2)
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
  for (const ex of EXAMPLES) {
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
        await chipFor(dialog, role).hover()
        await expect(hits(page), `${ex.name}: hovering ${role} marked nothing`).not.toHaveCount(0)
        if (await page.locator('.pvs svg [data-hit="on"]').count()) traced++
        expect(await outlined(), `${ex.name}: hovering ${role} left an outline on a drawn part`).toEqual([])
        await page.mouse.move(2, 2)
      }
      expect(traced, `${ex.name}: at least one role traced a drawn part, so the check ran on a marked drawing`).toBeGreaterThan(0)
    })
  }
})

// ── 7d. Orra's colourway names fit under their swatch ────────────────────────

test.describe('the Orra colourway names', () => {
  for (const width of [1440, 768, 390]) {
    test(`no colourway name is cut off at ${width}px, in both themes`, async ({ page }) => {
      watch(page, `designer reading the Orra colourways at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await seed(page, PALETTES.mid)
      const dialog = await openDialog(page)
      for (const theme of ['Light', 'Dark']) {
        await setTheme(dialog, theme)
        await pickScene(dialog, 'Product page')
        await settle(page)
        const labels = await page.evaluate(() => [...document.querySelectorAll('.or-sw-t')].map((el) => {
          const box = el.parentElement.getBoundingClientRect()
          const r = el.getBoundingClientRect()
          return { text: el.textContent.trim(), scroll: el.scrollWidth, client: el.clientWidth, inside: r.left >= box.left - 0.5 && r.right <= box.right + 0.5 }
        }))
        expect(labels.length, `${theme}: the five colourway names were found`).toBe(5)
        for (const l of labels) {
          expect(l.scroll, `${theme}: "${l.text}" is wider than its box`).toBe(l.client)
          expect(l.inside, `${theme}: "${l.text}" sticks out of its swatch column`).toBe(true)
        }
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

    // The dialog around it is alive: another example and an older scene both load.
    await pickScene(dialog, 'Product page')
    await expect(message).toHaveCount(0)
    await pickScene(dialog, 'Dashboard')
    await expect(dialog).toBeVisible()
    expect(navigations, 'the page reloaded when the chunk failed').toBe(0)
  })
})
