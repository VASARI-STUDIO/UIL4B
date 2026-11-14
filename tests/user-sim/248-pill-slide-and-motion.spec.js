// Spec 248: the sliding selected pill on the hand-built option groups, and the
// two library entrance animations (the icon glyph fade and the card rise).
//
// Groups covered (each at 1440 and 390 where the group is on screen at that
// width): Type Scale (preview width, the Scale / Page switch at 1024, the Code drawer's export format at 1440, the settings sheet tabs and fine-tuning join mode), Aspect
// Ratio (preset list, "I know the"), Alt Text (length), Gradient (the random
// filters), Palette Explore tabs, the File Converter's segmented choices, and
// the library's tab switch.
//
// A group "slides" when, after a click, the pill drawn on its ::before passes
// through positions between the old option and the new one and ends on the
// new one. Reduced motion (the OS setting or the in-app switch) must make the
// same move land at once.
//
// MUTATIONS (each should turn the named test red):
//   - drop the useSlideIndicator call in SlidePills (ToolLayout.jsx)
//       -> "the pill slides" for every tl-pills group
//   - drop it in converter/Segmented.jsx          -> "the pill slides" (File Converter)
//   - drop it in IconEmojiLibrary.jsx             -> "the pill slides" (Library tabs)
//   - delete a `transition: none !important` reduced-motion rule for a group
//     (tool-layout.css, file-converter.css, library.css)
//                                                  -> "reduced motion" for that group
//   - remove `animation: ig-glyph-in` from library.css  -> "ig-glyph-in"
//   - remove `animation: plSlideUp` from library.css    -> "plSlideUp"
//   - change `translateY(12px)` in plSlideUp to 24px    -> "plSlideUp" (12px ceiling)
//   - delete the `animation: none` rules under the reduced-motion media query
//     for the glyph or the card                    -> the matching "off under reduced motion"
//   - make the hook treat several selected children as one (querySelector)
//       -> "a multi-select group draws no pill while several are on"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'
import { showTypeScaleCode } from './type-scale-view.js'

const SHOTS = '.claude/scratch/polish3'
const WIDTHS = [1440, 390]
const heightFor = (w) => (w < 700 ? 844 : 900)

// A not-yet-selected, usable option of a group. The last one: the longest move.
const UNSELECTED = ':is([aria-pressed="false"],[aria-checked="false"],[aria-selected="false"]):not([disabled]):not([aria-disabled="true"])'

// Where the pill is drawn: the group's ::before transform, as an offset.
async function pillAt(group) {
  return group.evaluate((g) => {
    const m = new DOMMatrix(getComputedStyle(g, '::before').transform)
    return { x: m.m41, y: m.m42, slide: g.dataset.slide, dur: getComputedStyle(g, '::before').transitionDuration }
  })
}

// Click the last unselected option, then sample the pill every frame for 600ms.
// A frame slower than the 200ms move skips straight to its end, so the pill's own
// transform transition is also paused at its midpoint once and read there: the
// pill is on the way between the two options whatever the frame rate.
async function clickAndTrace(group) {
  return group.evaluate(async (g, unselected) => {
    const read = () => {
      const m = new DOMMatrix(getComputedStyle(g, '::before').transform)
      return [m.m41, m.m42]
    }
    const options = [...g.querySelectorAll(unselected)]
    const target = options[options.length - 1]
    const from = read()
    const label = target.textContent.trim()
    const seen = []
    let midRead = false
    const readMidMove = () => {
      if (midRead) return
      const move = document.getAnimations().find((a) => a.transitionProperty === 'transform'
        && a.effect && a.effect.target === g && a.effect.pseudoElement === '::before' && a.playState === 'running')
      if (!move) return
      midRead = true
      move.pause()
      move.currentTime = move.effect.getComputedTiming().endTime / 2
      seen.push(read())
      move.play()
    }
    target.click()
    readMidMove()
    const t0 = performance.now()
    while (performance.now() - t0 < 600) {
      await new Promise(requestAnimationFrame)
      readMidMove()
      seen.push(read())
    }
    const on = g.querySelector('[aria-pressed="true"],[aria-checked="true"],[aria-selected="true"]')
    return {
      label,
      from,
      seen,
      onLabel: on ? on.textContent.trim() : null,
      to: on ? [on.offsetLeft, on.offsetTop] : null,
      selectedCount: g.querySelectorAll('[aria-pressed="true"],[aria-checked="true"],[aria-selected="true"]').length,
      dur: getComputedStyle(g, '::before').transitionDuration,
    }
  }, UNSELECTED)
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function expectSlid(t, name) {
  expect(t.onLabel, `${name}: the click did not select the option`).toBe(t.label)
  expect(dist(t.seen.at(-1), t.to), `${name}: the pill did not end on the chosen option`).toBeLessThan(1)
  const travel = dist(t.from, t.to)
  expect(travel, `${name}: the pill did not move`).toBeGreaterThan(8)
  const between = t.seen.filter((p) => dist(p, t.from) > 1 && dist(p, t.to) > 1)
  expect(between.length, `${name}: the pill jumped instead of sliding`).toBeGreaterThan(0)
  const first = parseFloat(t.dur)
  expect(first, `${name}: the move should take 150 to 250ms`).toBeGreaterThanOrEqual(0.15)
  expect(first).toBeLessThanOrEqual(0.25)
}

function expectInstant(t, name) {
  expect(t.onLabel, `${name}: the click did not select the option`).toBe(t.label)
  expect(dist(t.seen.at(-1), t.to), `${name}: the pill did not end on the chosen option`).toBeLessThan(1)
  const between = t.seen.filter((p) => dist(p, t.from) > 1 && dist(p, t.to) > 1)
  expect(between.length, `${name}: the pill still slides under reduced motion`).toBe(0)
  expect(parseFloat(t.dur), `${name}: a transition is still set under reduced motion`).toBe(0)
}

async function openFileConverterVideo(page) {
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Video', exact: true }).click()
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
    const c = canvas.getContext('2d')
    const rec = new MediaRecorder(canvas.captureStream(10)); const chunks = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise((r) => { rec.onstop = r })
    rec.start()
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#1c40f2' : '#f24040'; c.fillRect(0, 0, 64, 64); await new Promise((r) => setTimeout(r, 100)) }
    rec.stop(); await stopped
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  })
  await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from(clip) })
  await expect(page.getByLabel('Width (px)'), 'the clip never loaded').toBeVisible({ timeout: 15000 })
}

// Every case opens its page, prepares the group and returns its locator.
const CASES = [
  {
    id: 'type-scale-width', name: 'Type Scale: preview width', widths: WIDTHS,
    open: async (page) => { await go(page, '/create/type-scale'); return page.locator('#tsc-width') },
  },
  {
    id: 'type-scale-view', name: 'Type Scale: Scale and Page switch', widths: [1024],
    open: async (page) => { await go(page, '/create/type-scale'); return page.locator('.tsc-view-switch') },
  },
  {
    id: 'type-scale-format', name: 'Type Scale: export format in the Code drawer', widths: [1440],
    open: async (page) => {
      await go(page, '/create/type-scale')
      await showTypeScaleCode(page)
      return page.locator('#tsc-code-drawer .tsc-fmt')
    },
  },
  {
    id: 'type-scale-sheet', name: 'Type Scale: sheet Settings and Code', widths: [390],
    open: async (page) => {
      // A phone has no page-level views: Code is a tab in the settings sheet.
      await go(page, '/create/type-scale')
      await page.locator('.tl-dock .tsc-dock-ratio').click()
      return page.locator('.tsc-sheet-tabs')
    },
  },
  {
    id: 'type-scale-join', name: 'Type Scale: how the scales join', widths: WIDTHS,
    open: async (page) => {
      await go(page, '/create/type-scale')
      if (page.viewportSize().width < 700) {
        // Phones keep the settings in a sheet behind the docked bar's opener.
        await page.locator('.tl-dock .tsc-dock-ratio').click()
      }
      await page.getByRole('button', { name: 'Fine tuning', exact: true }).click()
      return page.locator('.tsc-bp-mode')
    },
  },
  {
    id: 'ratio-presets', name: 'Aspect Ratio: preset list', widths: WIDTHS,
    open: async (page) => { await go(page, '/create/aspect-ratio'); return page.locator('.rc-tabs') },
  },
  {
    id: 'ratio-known', name: 'Aspect Ratio: I know the', widths: WIDTHS,
    open: async (page) => { await go(page, '/create/aspect-ratio'); return page.locator('.arc-sides') },
  },
  {
    id: 'alt-length', name: 'Alt Text: length', widths: WIDTHS,
    open: async (page) => { await go(page, '/create/alt-text'); return page.locator('.alt-seg') },
  },
  {
    id: 'gradient-filters', name: 'Gradient: random filters', widths: WIDTHS,
    open: async (page) => {
      await go(page, '/create/gradient')
      await page.getByRole('button', { name: 'More options' }).click()
      return page.locator('.grd-shuf-row .tl-pills').first()
    },
  },
  {
    id: 'palette-explore', name: 'Palette: Explore tabs', widths: WIDTHS,
    open: async (page) => {
      await go(page, '/create/palette')
      await clickPaletteAction(page, 'Explore palettes and brands', 'Explore palettes and brands')
      const tabs = page.locator('.plb-sg-tabs')
      await expect(tabs).toBeVisible()
      return tabs
    },
  },
  {
    id: 'converter-segmented', name: 'File Converter: Speed choices', widths: WIDTHS,
    open: async (page) => {
      await openFileConverterVideo(page)
      const tray = page.locator('.fc-seg--speed')
      await tray.scrollIntoViewIfNeeded()
      return tray
    },
  },
  {
    id: 'library-tabs', name: 'Library: Icons / Emoji / Groups', widths: WIDTHS,
    open: async (page) => { await go(page, '/create/icons'); return page.locator('.lib-switch') },
  },
]

for (const c of CASES) {
  test.describe(`${c.name}`, () => {
    for (const width of c.widths) {
      test(`the pill slides to a clicked option at ${width}px`, async ({ page }) => {
        watch(page, 'someone switching between options in a group')
        await page.setViewportSize({ width, height: heightFor(width) })
        const group = await c.open(page)
        await expect(group).toBeVisible()
        await expect(group, 'the group never drew its pill').toHaveAttribute('data-slide', 'ready')
        const t = await clickAndTrace(group)
        expectSlid(t, c.name)
        await page.screenshot({ path: `${SHOTS}/${c.id}-${width}.png` })
      })
    }

    test('reduced motion (OS setting): the same move lands at once', async ({ page }) => {
      watch(page, 'someone whose system asks for reduced motion')
      const width = c.widths[0]
      await page.setViewportSize({ width, height: heightFor(width) })
      // Set before the page loads: the app stamps the attribute from the OS value at boot.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const group = await c.open(page)
      await expect(group).toBeVisible()
      await expect(group).toHaveAttribute('data-slide', 'ready')
      expectInstant(await clickAndTrace(group), `${c.name} (OS reduce)`)
    })

    test('reduced motion (in-app switch): the same move lands at once with the OS saying nothing', async ({ page }) => {
      watch(page, 'someone who turned reduced motion on inside the app')
      const width = c.widths[0]
      await page.setViewportSize({ width, height: heightFor(width) })
      const group = await c.open(page)
      await expect(group).toBeVisible()
      await expect(group).toHaveAttribute('data-slide', 'ready')
      await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })
      expectInstant(await clickAndTrace(group), `${c.name} (in-app reduce)`)
    })
  })
}

test.describe('a multi-select group draws one pill only while exactly one option is on', () => {
  test('Gradient filters: a lone choice has a pill, a shift-added second removes it', async ({ page }) => {
    watch(page, 'designer picking more than one gradient type')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/gradient')
    await page.getByRole('button', { name: 'More options' }).click()
    const type = page.locator('.grd-shuf-row .tl-pills').first()
    await expect(type).toHaveAttribute('data-slide', 'ready')
    const options = type.locator('button')
    await options.nth(1).click()
    await expect(options.nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(type).toHaveAttribute('data-slide', 'ready')
    await options.nth(2).click({ modifiers: ['Shift'] })
    await expect(type.locator('[aria-pressed="true"]')).toHaveCount(2)
    // Two selected: no single pill can stand for both, so each paints its own look.
    await expect(type, 'a pill is still drawn behind two selected options').not.toHaveAttribute('data-slide', /.+/)
    const looks = await type.locator('[aria-pressed="true"]').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
    expect(looks.every((bg) => bg !== 'rgba(0, 0, 0, 0)'), 'a selected option lost its own look').toBe(true)
  })
})

test.describe('keyboard behaviour is unchanged on the adopted groups', () => {
  test('Palette Explore tabs: arrow keys still move between tabs and the pill follows', async ({ page }) => {
    watch(page, 'keyboard user in Explore')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    await clickPaletteAction(page, 'Explore palettes and brands', 'Explore palettes and brands')
    const tabs = page.locator('.plb-sg-tabs')
    await expect(tabs).toHaveAttribute('data-slide', 'ready')
    await tabs.getByRole('tab', { selected: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.getByRole('tab', { name: 'Brands' })).toHaveAttribute('aria-selected', 'true')
    await expect.poll(async () => (await pillAt(tabs)).x).toBeGreaterThan(20)
  })

  test('Library tabs: arrow keys still switch the library and the pill follows', async ({ page }) => {
    watch(page, 'keyboard user in the library')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    const tabs = page.locator('.lib-switch')
    await expect(tabs).toHaveAttribute('data-slide', 'ready')
    await tabs.getByRole('tab', { selected: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.getByRole('tab', { name: /Emoji/ })).toHaveAttribute('aria-selected', 'true')
    await expect.poll(async () => (await pillAt(tabs)).x).toBeGreaterThan(20)
  })

  test('Converter choices: arrow keys still move and select', async ({ page }) => {
    watch(page, 'keyboard user in the converter')
    await page.setViewportSize({ width: 1440, height: 900 })
    await openFileConverterVideo(page)
    const speed = page.locator('.fc-seg--speed')
    await speed.getByRole('radio', { checked: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(speed.getByRole('radio', { checked: true })).not.toHaveCount(0)
    await expect(speed).toHaveAttribute('data-slide', 'ready')
  })
})

test.describe('library entrance animations', () => {
  // A card or glyph that mounts is a fresh element, so a clone of one stands in
  // for it: the page's real stylesheet decides what the clone does.
  async function enteringCard(page) {
    return page.evaluate(() => {
      const card = document.querySelector('.lib-surface .lbry-card')
      const fresh = card.cloneNode(true)
      card.parentElement.appendChild(fresh)
      const cs = getComputedStyle(fresh)
      const anim = fresh.getAnimations().find((a) => a.animationName === 'plSlideUp')
      const frames = anim ? anim.effect.getKeyframes() : []
      const timing = anim ? anim.effect.getComputedTiming() : null
      const out = {
        name: cs.animationName,
        duration: timing ? timing.duration : null,
        easing: frames[0] ? frames[0].easing : null,
        props: [...new Set(frames.flatMap((f) => Object.keys(f)))].filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)).sort(),
        fromTransform: frames[0] ? frames[0].transform : null,
      }
      fresh.remove()
      return out
    })
  }

  for (const width of WIDTHS) {
    // RETARGETED (V3 board). The rebuilt palette library drops the card entrance
    // on purpose: library-v3.css sets `animation: none` on `.lbry-card` and the
    // LibraryR2A board has no rise-and-fade. The protected property is now "a
    // library card never moves on mount", so a stray entrance would fail here.
    // Mutation: delete the `animation:none` line in library-v3.css and the card
    // picks up plSlideUp again from library.css -> "none" assertion fails.
    test(`a mounting V3 library card does not animate in, at ${width}px`, async ({ page }) => {
      watch(page, 'someone opening the palette library')
      await page.setViewportSize({ width, height: heightFor(width) })
      await go(page, '/discover/palettes')
      await expect(page.locator('.lib-surface .lbry-card').first()).toBeVisible()
      await expect(page.locator('.lib-surface.lib-v3')).toHaveCount(1)
      const a = await enteringCard(page)
      expect(a.name, 'the V3 card has no entrance animation').toBe('none')
      expect(a.duration).toBeNull()
      await page.screenshot({ path: `${SHOTS}/library-cards-${width}.png` })
    })
  }

  // RETARGETED (V3 board): with no card entrance there is nothing for reduced
  // motion to switch off, so the card stays still under every setting. The glyph
  // entrance tests below still cover the reduced-motion switch itself.
  test('a V3 library card stays still under the OS setting and the in-app switch', async ({ page }) => {
    watch(page, 'someone who asked for reduced motion')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/discover/palettes')
    await expect(page.locator('.lib-surface .lbry-card').first()).toBeVisible()
    expect((await enteringCard(page)).name).toBe('none')

    // The app re-stamps its attribute from the OS value a moment after the change.
    const stamped = (value) => expect.poll(() => page.evaluate(() => document.documentElement.dataset.reducedMotion)).toBe(value)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await stamped('true')
    expect((await enteringCard(page)).name, 'OS reduce').toBe('none')

    // The app's own choice to keep motion must not bring an entrance back either.
    await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'false' })
    expect((await enteringCard(page)).name, 'app set to motion, OS reduce').toBe('none')

    await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await stamped('false')
    await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })
    expect((await enteringCard(page)).name, 'app set to reduce, OS no preference').toBe('none')
  })

  // The grid's own glyphs come from a network catalogue, so a glyph that has
  // just loaded is stood in for by the markup the grid renders for one.
  async function enteringGlyph(page) {
    return page.evaluate(() => {
      const host = document.createElement('div')
      host.className = 'ic'
      const img = document.createElement('img')
      img.className = 'ig-glyph-in'
      img.alt = ''
      img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/>'
      host.appendChild(img)
      document.body.appendChild(host)
      const cs = getComputedStyle(img)
      const anim = img.getAnimations().find((a) => a.animationName === 'ig-glyph-in')
      const frames = anim ? anim.effect.getKeyframes() : []
      const out = {
        name: cs.animationName,
        duration: anim ? anim.effect.getComputedTiming().duration : null,
        props: [...new Set(frames.flatMap((f) => Object.keys(f)))].filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)).sort(),
        opacityAtRest: cs.opacity,
      }
      host.remove()
      return out
    })
  }

  test('ig-glyph-in: a glyph that has just loaded fades in, opacity only, 150 to 250ms', async ({ page }) => {
    watch(page, 'someone opening the icon library')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/icons')
    const a = await enteringGlyph(page)
    expect(a.name).toBe('ig-glyph-in')
    expect(a.props, 'the glyph fade is opacity only').toEqual(['opacity'])
    expect(a.duration).toBeGreaterThanOrEqual(150)
    expect(a.duration).toBeLessThanOrEqual(250)
    await page.screenshot({ path: `${SHOTS}/icon-library-1440.png` })
  })

  test('ig-glyph-in is off under the OS setting and the in-app switch, and back on when the app opts in', async ({ page }) => {
    watch(page, 'someone who asked for reduced motion')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/icons')
    expect((await enteringGlyph(page)).name).toBe('ig-glyph-in')

    const stamped = (value) => expect.poll(() => page.evaluate(() => document.documentElement.dataset.reducedMotion)).toBe(value)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await stamped('true')
    const off = await enteringGlyph(page)
    expect(off.name, 'OS reduce').toBe('none')
    expect(off.opacityAtRest, 'a glyph with no fade must still be visible').toBe('1')

    await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'false' })
    expect((await enteringGlyph(page)).name, 'app set to motion, OS reduce').toBe('ig-glyph-in')

    // Start from "true" so the wait below only passes once the app has really
    // re-stamped from the OS change, not on the value set by hand above.
    await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await stamped('false')
    await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })
    expect((await enteringGlyph(page)).name, 'app set to reduce, OS no preference').toBe('none')
    await page.screenshot({ path: `${SHOTS}/icon-library-390.png` })
  })
})
