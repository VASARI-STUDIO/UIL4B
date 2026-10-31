// The Trail run app (Ridgeline) in the Palette Builder's "Preview on a UI" dialog is a softly
// interactive mockup. 153 holds how it renders, 50 holds its ink; this holds what a person DOES
// with it, and the dialog around it.
//
//   1. the State menu drives the scene (Activity, Live tracking, Segment PR) and Record and
//      Finish drive the State menu
//   2. a split row lights its stretch on the map, a second press clears it, one at a time
//   3. the chart scrub moves the dot on the map and the readout above the chart
//   4. Segment PR opens on Segments with the record stretch picked and the PR badge on it
//   5. the ink of a picked row and of the PR badge, light and dark, on three stress palettes
//   6. no sideways overflow at 320, 390 and 768 in any state and either theme
//   7. every button is 44px or more each way on a phone
//   8. the OpenStreetMap credit is a real link, in the activity and the live view
//   9. a map label's plate never sits on the start marker or a km tick
//
// Nothing is mocked: the dialog is opened the way a person opens it. Trail run app is a free
// example, so there is no sign-in. The expected values are worked by hand from
// Ridgeline.route.js and Ridgeline.data.js (STRETCHES, KM_MARKS, START, ELEV), not by the
// functions under test.
//
// To make each go red (undo it after), all in src/components/palette/examples/Ridgeline.jsx:
//   1  in `record`, drop `onState('live')`; or in `finish`, drop `onState('activity')`
//   2  in `onPick`, make the new pick always `i` (the second press then never clears)
//   2b in Splits, drop `aria-pressed={picked === i}` from the row
//   3  in RouteMap's marker effect, replace the setDot argument with `null`
//   3b in Elevation, print `read.km.slice(0, -1)` in `.rl-read-km`
//   4  in Segments, render the badge `{false && s.pr && ...}`; or in `chosen`, drop the PR_INDEX default
//   5  in Ridgeline.css, set `.rl-pr` color to var(--pv-accent) or `.rl-row.is-picked ...` ink to var(--pv-muted)
//   6  give `.rl-stats` `min-width:420px`
//   7  in `.rl-btn`, `min-height:40px`; or `.rl-row` the same
//   8  delete the `<a>` in Credit
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { clickPaletteAction, pickPreviewState } from './palette-helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

const NAME = 'Trail run app'
// The mid-tone palette 50 uses, a pale one and a dark one, as 153 does.
const PALETTES = {
  mid: ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6'],
  pale: ['#f3e9d2', '#f7dcd0', '#e4efe0', '#dfe9f5', '#f2e4f0'],
  dark: ['#0d1b2a', '#1b263b', '#2b3a55', '#3a2e5a', '#16100f'],
}
const STATE_LABELS = [['Activity', 'activity'], ['Live tracking', 'live'], ['Segment PR', 'pr']]

// Worked by hand from Ridgeline.route.js: the route is 9621 m; a dash `0 a (b-a) 19242` shows metres a to b.
const SPLIT_3 = '0 2000 1000 19242' // the third km, 2.0 to 3.0 km
const SPLIT_4 = '0 3000 1000 19242' // the fourth km, 3.0 to 4.0 km: holds the steepest stretch (3300 to 3600 m)
const EUGENIA = '0 2761 1094 19242' // the second named track, 2761 to 3855 m, the record
// The first and third KM_MARKS, in the map's 1200 x 970 units.
const KM_1 = [863.8, 144.6]
const KM_3 = [379.3, 172.3]

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

/** Open the preview dialog on the Trail run app, the way a person does. */
async function openRidgeline(page, { colors = PALETTES.mid, theme } = {}) {
  await seed(page, colors)
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  let option = dialog.getByRole('option', { name: /^Trail run app/ })
  if (!(await option.count())) {
    await dialog.locator('.pvd-menu-btn').click()
    option = dialog.getByRole('option', { name: /^Trail run app/ })
  }
  await option.click()
  await expect(dialog.locator(`.pvs[data-preview-scene="${NAME}"]`)).toBeVisible()
  if (theme) await setTheme(page, dialog, theme)
  await expect(dialog.locator('.rl.is-live'), 'the scene has live controls').toBeVisible()
  return dialog
}

async function setTheme(page, dialog, theme) {
  const group = dialog.getByRole('group', { name: 'Preview theme' })
  if (await group.count()) await group.getByRole('button', { name: theme, exact: true }).click()
  else {
    await dialog.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('button', { name: theme, exact: true }).first().click()
    await page.keyboard.press('Escape')
  }
  await expect(dialog.locator('.pvs')).toHaveAttribute('data-mode', theme.toLowerCase())
}

const scene = (dialog) => dialog.locator(`.pvs[data-preview-scene="${NAME}"]`)
const trigger = (dialog) => dialog.getByRole('button', { name: /^State\b/ })
/** The state the scene is showing, read off the scene itself and not off the menu. */
const shown = (dialog) => scene(dialog).locator('.rl').getAttribute('data-state')
const splitRows = (sc) => sc.getByRole('list', { name: 'Splits' }).getByRole('button')
const segmentRows = (sc) => sc.getByRole('list', { name: 'Segments' }).getByRole('button')
const tab = (sc, name) => sc.getByRole('group', { name: 'Show' }).getByRole('button', { name, exact: true })
const halo = (sc) => sc.locator('.rl-halo')
const scrub = (sc) => sc.getByRole('slider', { name: 'Scrub along the route' })
/** Move to a state the way a person does and wait for the scene to show it. */
async function toState(dialog, label, id) {
  await pickPreviewState(dialog, label)
  await expect.poll(() => shown(dialog), `the scene shows ${label}`).toBe(id)
  await dialog.page().evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* an endless one */ } } })
}
/** The centre of an SVG circle on screen. */
const centre = (loc) => loc.evaluate((el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2] })
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

// ── 1. the State menu and Record / Finish ────────────────────────────────────

test.describe('the states', () => {
  test('the State menu moves the scene to Live tracking, Segment PR and back to Activity', async ({ page }) => {
    watch(page, 'designer walking the Trail run app states')
    const dialog = await openRidgeline(page)
    await expect(trigger(dialog)).toContainText('Activity')
    expect(await shown(dialog)).toBe('activity')
    for (const [label, id] of [...STATE_LABELS.slice(1), STATE_LABELS[0]]) {
      await toState(dialog, label, id)
      await expect(trigger(dialog), `${label}: the State menu says so`).toContainText(label)
    }
    // Each state is its own page: live is the recording column, the others are the activity page.
    await toState(dialog, 'Live tracking', 'live')
    await expect(scene(dialog).getByRole('region', { name: 'Recording' })).toBeVisible()
    await expect(scene(dialog).getByRole('region', { name: 'Activity' })).toHaveCount(0)
  })

  test('Record starts the live view and moves the State menu, and Finish returns to the activity', async ({ page }) => {
    watch(page, 'runner pressing Record and Finish in the Trail run app')
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await sc.getByRole('button', { name: 'Record', exact: true }).click()
    await expect.poll(() => shown(dialog)).toBe('live')
    await expect(trigger(dialog), 'the State menu moved').toContainText('Live tracking')
    await expect(sc.getByRole('button', { name: 'Pause', exact: true }), 'focus follows to the control that stands in').toBeFocused()

    await sc.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect.poll(() => shown(dialog)).toBe('activity')
    await expect(trigger(dialog)).toContainText('Activity')
    await expect(sc.getByRole('button', { name: 'Record', exact: true })).toBeFocused()
  })

  test('Pause says Paused and Resume brings Recording back', async ({ page }) => {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await toState(dialog, 'Live tracking', 'live')
    await expect(sc.locator('.rl-state')).toHaveText('Recording')
    await sc.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(sc.locator('.rl-state')).toHaveText('Paused')
    await expect(sc.getByRole('button', { name: 'Resume', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await sc.getByRole('button', { name: 'Resume', exact: true }).click()
    await expect(sc.locator('.rl-state')).toHaveText('Recording')
  })

})

// ── 2. a split lights its stretch on the map ─────────────────────────────────

test.describe('the map highlight', () => {
  test('pressing a split lights that km on the map, a second press clears it, and a new pick moves it', async ({ page }) => {
    watch(page, 'runner picking a split in the Trail run app')
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    const rows = splitRows(sc)
    await expect(rows).toHaveCount(10)
    await expect(halo(sc), 'nothing is lit to start with').toHaveCount(0)
    for (let i = 0; i < 10; i++) await expect(rows.nth(i)).toHaveAttribute('aria-pressed', 'false')

    await rows.nth(2).click()
    await expect(rows.nth(2)).toHaveAttribute('aria-pressed', 'true')
    await expect(halo(sc)).toHaveCount(1)
    await expect(halo(sc), 'km 3 is metres 2000 to 3000').toHaveAttribute('stroke-dasharray', SPLIT_3)

    await rows.nth(3).click()
    await expect(rows.nth(3)).toHaveAttribute('aria-pressed', 'true')
    await expect(sc.locator('.rl-row[aria-pressed="true"]'), 'only one row is picked').toHaveCount(1)
    await expect(halo(sc), 'km 4 is metres 3000 to 4000').toHaveAttribute('stroke-dasharray', SPLIT_4)

    await rows.nth(3).click()
    await expect(rows.nth(3)).toHaveAttribute('aria-pressed', 'false')
    await expect(halo(sc), 'the second press clears it').toHaveCount(0)
  })

  test('the km that holds the steepest stretch is lit over the accent stretch, and the accent stays on top', async ({ page }) => {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await splitRows(sc).nth(3).click()
    // The steepest stretch is metres 3300 to 3600, inside the fourth km (3000 to 4000).
    await expect(halo(sc)).toHaveAttribute('stroke-dasharray', SPLIT_4)
    await expect(sc.locator('.rl-steep')).toHaveAttribute('stroke-dasharray', '0 3300 300 19242')
    const order = await sc.locator('.rl-map svg path').evaluateAll((els) => els.map((e) => e.getAttribute('class')))
    expect(order.indexOf('rl-halo'), 'the halo is under the route').toBeLessThan(order.indexOf('rl-route'))
    expect(order.indexOf('rl-route'), 'the accent stretch is over the route').toBeLessThan(order.indexOf('rl-steep'))
  })

  test('a segment lights its stretch too, and Splits and Segments each keep their own pick', async ({ page }) => {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await tab(sc, 'Segments').click()
    await expect(tab(sc, 'Segments')).toHaveAttribute('aria-pressed', 'true')
    await expect(tab(sc, 'Splits')).toHaveAttribute('aria-pressed', 'false')
    await expect(segmentRows(sc)).toHaveCount(5)
    await segmentRows(sc).nth(1).click()
    await expect(halo(sc)).toHaveAttribute('stroke-dasharray', EUGENIA)
    await tab(sc, 'Splits').click()
    await expect(halo(sc), 'a segment pick does not light a split').toHaveCount(0)
    await tab(sc, 'Segments').click()
    await expect(segmentRows(sc).nth(1)).toHaveAttribute('aria-pressed', 'true')
  })
})

// ── 3. the scrub ─────────────────────────────────────────────────────────────

test.describe('the chart scrub', () => {
  test('it opens at the high point and reads 5.40 km, 254 m', async ({ page }) => {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await expect(scrub(sc)).toHaveValue('5400')
    await expect(sc.locator('.rl-read-km')).toHaveText('5.40 km')
    await expect(sc.locator('.rl-read')).toContainText('254 m')
  })

  test('moving the slider moves the readout and the dot on the map to where that distance is', async ({ page }) => {
    watch(page, 'runner scrubbing the Trail run app elevation chart')
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    const dot = sc.locator('.rl-dot')
    await expect(dot).toHaveCount(1)
    const peak = await centre(dot)

    // 0 m is the start: the dot sits on the start marker, and the ground is 87 m.
    await scrub(sc).fill('0')
    await expect(sc.locator('.rl-read-km')).toHaveText('0.00 km')
    await expect(sc.locator('.rl-read')).toContainText('87 m')
    await expect(sc.locator('.rl-read')).toContainText('Flat')
    await expect.poll(async () => dist(await centre(dot), await centre(sc.locator('.rl-start'))), 'dot on the start').toBeLessThan(2)
    expect(dist(await centre(dot), peak), 'the dot left the high point').toBeGreaterThan(20)

    // 1000 m and 3000 m are the first and third km marks on the map.
    const box = await sc.locator('.rl-map').boundingBox()
    // The map is cropped to cover its box, so the same scale and offset place a mark on screen.
    const at = ([x, y]) => {
      const k = Math.max(box.width / 1200, box.height / 970)
      return [box.x + 1 + (box.width - 2 - 1200 * k) / 2 + x * k, box.y + 1 + (box.height - 2 - 970 * k) / 2 + y * k]
    }
    await scrub(sc).fill('1000')
    await expect(sc.locator('.rl-read-km')).toHaveText('1.00 km')
    await expect.poll(async () => dist(await centre(dot), at(KM_1)), 'dot on the 1 km mark').toBeLessThan(6)
    await scrub(sc).fill('3000')
    await expect(sc.locator('.rl-read-km')).toHaveText('3.00 km')
    await expect.poll(async () => dist(await centre(dot), at(KM_3)), 'dot on the 3 km mark').toBeLessThan(6)

    // 2500 m: ELEV[25] is 132 m and the ground climbs 11% either side of it.
    await scrub(sc).fill('2500')
    await expect(sc.locator('.rl-read-km')).toHaveText('2.50 km')
    await expect(sc.locator('.rl-read')).toContainText('132 m')
    await expect(sc.locator('.rl-read')).toContainText('Climbing 11%')
    await expect(scrub(sc)).toHaveAttribute('aria-valuetext', '2.50 km, 132 m, Climbing 11%')
  })

  test('the arrow keys step the slider by 25 m and Home and End reach the two ends of the route', async ({ page }) => {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await scrub(sc).focus()
    await page.keyboard.press('ArrowRight')
    await expect(scrub(sc)).toHaveValue('5425')
    await page.keyboard.press('Home')
    await expect(sc.locator('.rl-read-km')).toHaveText('0.00 km')
    await page.keyboard.press('End')
    // The route is 9621 m and the slider steps by 25: its last stop is the true end, not 9600 m.
    await expect(sc.locator('.rl-read-km'), 'the far end of the route').toHaveText('9.62 km')
    await expect(scrub(sc)).toHaveAttribute('aria-valuetext', /^9\.62 km,/)
    await page.keyboard.press('ArrowLeft')
    await expect(sc.locator('.rl-read-km'), 'one step back from the end').toHaveText('9.60 km')
  })
})

// ── 4. Segment PR ────────────────────────────────────────────────────────────

test.describe('Segment PR', () => {
  test('it opens on Segments with the record track picked, lit on the map, and the PR badge on it', async ({ page }) => {
    watch(page, 'runner reading the Segment PR state')
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await expect(sc.locator('.rl-pr'), 'no PR badge on the Activity page').toHaveCount(0)
    await toState(dialog, 'Segment PR', 'pr')
    await expect(tab(sc, 'Segments')).toHaveAttribute('aria-pressed', 'true')
    await expect(tab(sc, 'Splits')).toHaveAttribute('aria-pressed', 'false')
    const rows = segmentRows(sc)
    await expect(rows).toHaveCount(5)
    await expect(rows.nth(1)).toContainText('Eugenia Circuit')
    await expect(rows.nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(sc.locator('.rl-row[aria-pressed="true"]')).toHaveCount(1)
    await expect(sc.locator('.rl-pr'), 'one badge').toHaveCount(1)
    await expect(rows.nth(1).locator('.rl-pr')).toHaveText('PR')
    await expect(rows.nth(1), 'the picked PR row says what it beat').toContainText(/Previous best \d+:\d{2}/)
    await expect(halo(sc)).toHaveAttribute('stroke-dasharray', EUGENIA)
  })

  test('leaving Segment PR for Activity drops the PR pick and badge, and coming back restores them', async ({ page }) => {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    await toState(dialog, 'Segment PR', 'pr')
    await toState(dialog, 'Activity', 'activity')
    await expect(tab(sc, 'Splits')).toHaveAttribute('aria-pressed', 'true')
    await expect(sc.locator('.rl-pr')).toHaveCount(0)
    await expect(halo(sc)).toHaveCount(0)
    await toState(dialog, 'Segment PR', 'pr')
    await expect(segmentRows(sc).nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(sc.locator('.rl-pr')).toHaveCount(1)
  })
})

// ── 5. ink of the picked row and the PR badge ────────────────────────────────

const INK = `(sel) => {
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
  const ratio = (a, b) => { const hi = Math.max(lum(a), lum(b)); const lo = Math.min(lum(a), lum(b)); return (hi + 0.05) / (lo + 0.05) }
  const parse = (s) => {
    let m = (s || '').trim().match(/^rgba?\\(([^)]+)\\)$/)
    if (m) { const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
    m = (s || '').trim().match(/^color\\(srgb ([^)]+)\\)$/)
    if (m) { const p = m[1].split(/[\\s/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1] }
    return null
  }
  const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]))
  const ground = (el) => {
    const stack = []
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c[3] > 0) { stack.push(c); if (c[3] === 1) break }
    }
    let g = [255, 255, 255]
    for (let i = stack.length - 1; i >= 0; i--) g = over(stack[i], g)
    return g
  }
  const out = []
  for (const root of document.querySelectorAll(sel)) {
    const leaves = [root, ...root.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !e.closest('svg'))
    for (const el of leaves) {
      const cs = getComputedStyle(el)
      const g = ground(el)
      const fg = parse(cs.color)
      const ink = fg[3] < 1 ? over(fg, g) : [fg[0], fg[1], fg[2]]
      out.push({ text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(), cls: String(el.className), size: parseFloat(cs.fontSize), ratio: Math.round(ratio(ink, g) * 100) / 100 })
    }
  }
  return out
}`

test.describe('the ink of a picked row and the PR badge', () => {
  for (const [paletteName, colors] of Object.entries(PALETTES)) {
    for (const theme of ['Light', 'Dark']) {
      test(`they clear 4.5:1 on a ${paletteName} palette in ${theme.toLowerCase()}`, async ({ page }) => {
        watch(page, `designer checking picked rows on a ${paletteName} palette`)
        const dialog = await openRidgeline(page, { colors, theme })
        const sc = scene(dialog)

        // A picked split, on the Activity page.
        await splitRows(sc).nth(1).click()
        await expect(splitRows(sc).nth(1)).toHaveAttribute('aria-pressed', 'true')
        await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* an endless one */ } } })
        const split = await page.evaluate(`(${INK})('.rl-row.is-picked')`)
        expect(split.length, 'the picked split has text').toBeGreaterThanOrEqual(4)

        // The picked record segment and its badge, on Segment PR.
        await toState(dialog, 'Segment PR', 'pr')
        await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* an endless one */ } } })
        const seg = await page.evaluate(`(${INK})('.rl-row.is-picked')`)
        const badge = await page.evaluate(`(${INK})('.rl-pr')`)
        expect(seg.length, 'the picked segment has text').toBeGreaterThanOrEqual(3)
        expect(badge, 'the PR badge was found').toHaveLength(1)
        expect(badge[0].text).toBe('PR')

        const low = [...split.map((s) => ({ where: 'split', ...s })), ...seg.map((s) => ({ where: 'segment', ...s })), ...badge.map((s) => ({ where: 'badge', ...s }))]
          .filter((s) => s.ratio < 4.5)
          .map((s) => `${s.where} "${s.text}" [${s.cls}] ${s.ratio}:1 at ${s.size}px`)
        expect(low, `${paletteName}/${theme}: ink under 4.5:1 on a picked row or the PR badge`).toEqual([])
      })
    }
  }
})

// ── 6. no sideways overflow ──────────────────────────────────────────────────

test.describe('no sideways overflow', () => {
  for (const width of [320, 390, 768]) {
    test(`no state overflows sideways at ${width}px, in both themes`, async ({ page }) => {
      watch(page, `designer reading the Trail run app at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 })
      const dialog = await openRidgeline(page)
      for (const theme of ['Light', 'Dark']) {
        await setTheme(page, dialog, theme)
        for (const [label, id] of STATE_LABELS) {
          await toState(dialog, label, id)
          const m = await page.evaluate(() => {
            const sc = document.querySelector('.pvs')
            const vw = document.documentElement.clientWidth
            const wide = [...sc.querySelectorAll('.rl *')].filter((e) => !e.closest('svg') && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > vw + 0.5)
            return { doc: document.documentElement.scrollWidth, vw, scroll: sc.scrollWidth, client: sc.clientWidth, wide: wide.map((e) => String(e.className)).slice(0, 5) }
          })
          const at = `${width}/${theme}/${label}`
          expect(m.doc, `${at}: the page scrolls sideways`).toBeLessThanOrEqual(m.vw)
          expect(m.scroll, `${at}: the scene is wider than its box`).toBeLessThanOrEqual(m.client)
          expect(m.wide, `${at}: these run past the right edge`).toEqual([])
        }
      }
    })
  }
})

// ── 7. touch targets ─────────────────────────────────────────────────────────

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  /** Every button in the scene in every state, with its size. */
  async function sizes(page) {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    const found = []
    const sweep = async (label) => {
      const buttons = await sc.getByRole('button').all()
      expect(buttons.length, `${label}: buttons found`).toBeGreaterThanOrEqual(2)
      for (const b of buttons) {
        const box = await b.boundingBox()
        const name = (await b.innerText()).replace(/\s+/g, ' ').trim().slice(0, 30)
        found.push({ label, name, w: Math.round(box.width), h: Math.round(box.height) })
      }
    }
    await sweep('Activity')
    await tab(sc, 'Segments').click()
    await sweep('Activity/Segments')
    await toState(dialog, 'Live tracking', 'live')
    await sweep('Live tracking')
    await toState(dialog, 'Segment PR', 'pr')
    await sweep('Segment PR')
    return found
  }
  const fmt = (b) => `${b.label} "${b.name}" ${b.w} x ${b.h}`

  test('every button is 44px or more tall, and wide, apart from the Splits switch (next test)', async ({ page }) => {
    watch(page, 'runner tapping the Trail run app on a phone')
    const found = await sizes(page)
    expect(found.filter((b) => b.name === 'Splits').length, 'the Splits switch was found').toBeGreaterThan(0)
    expect(found.filter((b) => b.name !== 'Splits' && (b.w < 44 || b.h < 44)).map(fmt), 'buttons under 44px').toEqual([])
    expect(found.filter((b) => b.name === 'Splits' && b.h < 44).map(fmt), 'the Splits switch is 44px tall').toEqual([])
  })

  test('the Splits switch is 44px wide', async ({ page }) => {
    const found = await sizes(page)
    expect(found.filter((b) => b.name === 'Splits' && b.w < 44).map(fmt)).toEqual([])
  })

  test('the scrub slider is as wide as the chart and tall enough to grab', async ({ page }) => {
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    const range = await scrub(sc).boundingBox()
    const chart = await sc.locator('.rl-chart').boundingBox()
    expect(range.width).toBeGreaterThan(chart.width - 2)
    expect(range.height).toBeGreaterThanOrEqual(44)
    await scrub(sc).tap({ position: { x: range.width / 4, y: range.height / 2 } })
    await expect(sc.locator('.rl-read-km'), 'a tap a quarter of the way along reads about 2.4 km').toHaveText(/^2\.[0-9]{2} km$/)
  })
})

// ── 8. the credit ────────────────────────────────────────────────────────────

test.describe('the map credit', () => {
  test('the OpenStreetMap credit is a link to the copyright page that opens in a new tab, on the activity and the live view', async ({ page }) => {
    watch(page, 'reader checking the Trail run app map credit')
    const dialog = await openRidgeline(page)
    const sc = scene(dialog)
    for (const [label, id] of [STATE_LABELS[0], STATE_LABELS[1], STATE_LABELS[2]]) {
      await toState(dialog, label, id)
      const link = sc.getByRole('link', { name: 'Map © OpenStreetMap contributors' })
      await expect(link, `${label}: the credit link`).toBeVisible()
      await expect(link).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
      await expect(sc.locator('.rl-credit'), `${label}: the elevation source is named`).toContainText('NASA SRTM')
    }
  })
})

// ── 9. map labels ────────────────────────────────────────────────────────────
// A plate is placed on the first side of its place that stays inside the map box and clears the markers
// and the plates already placed (Ridgeline.jsx `placePlates`), so none may sit on the start marker.
test.describe('the map labels', () => {
  for (const width of [390, 768, 1440]) {
    test(`no plate sits on the start marker or a km tick at ${width}px, in any state`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      const dialog = await openRidgeline(page)
      for (const [label, id] of STATE_LABELS) {
        await toState(dialog, label, id)
        await expect(scene(dialog).locator('.rl-pl').first()).toBeVisible()
        const hit = await page.evaluate(() => {
          const r = (e) => e.getBoundingClientRect()
          const marks = [document.querySelector('.rl-start'), ...document.querySelectorAll('.rl-tick')].map(r)
          return [...document.querySelectorAll('.rl-pl')].filter((e) => getComputedStyle(e).display !== 'none').filter((e) => {
            const p = r(e)
            return marks.some((m) => p.left < m.right - 1 && m.left + 1 < p.right && p.top < m.bottom - 1 && m.top + 1 < p.bottom)
          }).map((e) => e.textContent)
        })
        expect(hit, `${width}/${label}: a plate is on the start marker or a km tick`).toEqual([])
      }
    })
  }
})
