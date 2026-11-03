// THE ICON EDITOR'S STROKE: WHAT THE CONTROL MEANS, WHAT THE FILE WRITES, WHAT A PNG MEASURES.
//
// What a person relies on:
//   - the pop-up has the layout it had before the stroke rework (the head, the stage column, the controls
//     beside it, one foot across both); the Stroke row is a slider plus a Relative / Fixed pair under it;
//   - Relative: the stroke is a fixed share of the icon. A PNG at 16px, at 512px and at 16px drawn 4x
//     all have a stroke that is the same fraction of the icon (2/24 for the default 2px);
//   - Fixed: the stroke is the same number of pixels at every Size and PNG scale (2px by default);
//   - the SVG the pop-up writes carries a stroke-width that matches that model, on a 24 grid and on a
//     256 grid, for both modes;
//   - the Stroke control is there for artwork that draws with a stroke, and not for a filled glyph, and a
//     Phosphor icon never shows it, not even while its artwork is still on the way;
//   - a chosen colour reaches a child that carries a colour of its own;
//   - an icon saved by an older editor re-opens with the stroke it was saved with, in every era's units.
//
// The artwork is hand-written under tests/user-sim/fixtures/iconify/samples. Expected numbers are
// worked out here by hand (2px on a 24px icon = 2/24 of it; a 256 grid at Relative 2 = 2 / (24/256) =
// 21.33333 units; Fixed 2px at 512 over a 256 grid = 1 unit), never read back from src/utils/iconStroke.js.
//
// MUTATIONS (each one run against this spec and seen red, then the source restored byte for byte):
//   iconStroke.js strokeAttrForPx: `renderScale(absolute ? size : STROKE_REFERENCE_SIZE, viewBox)` becomes
//     `renderScale(STROKE_REFERENCE_SIZE, viewBox)` (the `absolute` branch gone)
//       -> "Fixed: ... the same pixels" (PNG) and "the SVG's stroke-width ... Fixed"
//   iconStroke.js customIconStroke: both migration factors dropped, the stored number returned as the value
//       -> "a saved icon from the older editor re-opens with the stroke it was saved with" (three eras)
//   IconLibrary.jsx STROKE_PACKS gains 'ph' again
//       -> "a Phosphor icon never shows the Stroke control, even while its artwork is on the way"
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { FIXTURE_DIR, ICONIFY_HOSTS, ICONIFY_STUB_HEADER, isLiveIconify } from './iconify-stub.js'

test.skip(isLiveIconify(), 'the artwork is served from the fixture so the strokes are known')

const SAMPLES = path.join(FIXTURE_DIR, 'samples')
const sample = (name) => fs.readFileSync(path.join(SAMPLES, `${name}.svg`), 'utf8')

const PERSONA = 'a designer setting the stroke of an icon'
const CORS = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }

/** Answer every glyph .svg of every pack on this page with one of the hand-written samples. */
async function serveSample(page, name, { hold = null } = {}) {
  const body = sample(name)
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\/[^/]+\.svg$/.test(u.pathname), async (route) => {
    if (hold) await hold
    await route.fulfill({ status: 200, contentType: 'image/svg+xml; charset=utf-8', headers: CORS, body })
      .catch(() => { /* page closed mid-flight */ })
  })
}

async function choosePack(page, pack) {
  await chooseMenuOption(page, page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }), pack)
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
}

/**
 * Open the editor at 1440 on the first icon of `pack`, served the named sample. Waits until the
 * stage shows that artwork (the fixture's own bolt is drawn first, from the grid's batch).
 */
async function openEditor(page, { sampleName, pack = 'lucide', plan = 'pro', scheme } = {}) {
  watch(page, PERSONA)
  if (scheme) await page.emulateMedia({ colorScheme: scheme })
  await page.setViewportSize({ width: 1440, height: 900 })
  await serveSample(page, sampleName)
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  await choosePack(page, pack)
  await page.locator('.ig .ic:not(.ig-skel)').first().click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-copy')).toBeEnabled({ timeout: 20_000 })
  await showCode(page)
  await expect(code(page)).not.toContainText('M13 2', { timeout: 20_000 })
}

const code = (page) => page.locator('.icust-code code')
const modeRadio = (page, name) => page.getByRole('radiogroup', { name: 'Stroke scaling' }).getByRole('radio', { name })
const sizeRadio = (page, name) => page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name })

async function showCode(page) {
  const details = page.locator('details.icust-code')
  if (!(await details.evaluate((el) => el.open))) await page.locator('.icust-code-sum').click()
  await expect(code(page)).toBeVisible()
}

/** Set the export Size: a preset cell, or Custom and a typed value (Pro). */
async function setSize(page, n) {
  if ([16, 20, 24, 32, 48].includes(n)) {
    await sizeRadio(page, `${n} pixels`).click()
  } else {
    await sizeRadio(page, /^Custom(,|$)/).click()
    const input = page.getByRole('textbox', { name: 'Custom size' })
    await input.fill(String(n))
    await input.press('Enter')
  }
  await expect(page.locator('.icust-stage-cap')).toContainText(`Exports at ${n}px`)
  await expect(code(page)).toContainText(`width="${n}" height="${n}"`)
}

/** The one stroke-width the written SVG carries (every element must agree); null when it carries none. */
async function writtenStrokeWidth(page) {
  const text = await code(page).innerText()
  const widths = [...text.matchAll(/stroke-width="([^"]+)"/g)].map((m) => m[1])
  expect([...new Set(widths)].length, `the written SVG has more than one stroke-width: ${widths}`).toBeLessThanOrEqual(1)
  return widths[0] ?? null
}

/**
 * Press the Download menu's PNG row marked `mark` (1x, 2x, 4x) and measure the file: its width in
 * pixels and the thickness of the horizontal line through its middle, as the summed coverage of a column
 * (alpha / 255 down the column), averaged over the middle tenth of the picture.
 */
async function exportPng(page, mark) {
  await page.getByRole('button', { name: 'Download formats' }).click()
  const row = page.getByRole('menuitemradio').filter({ hasText: new RegExp(`${mark}$`) })
  const [download] = await Promise.all([page.waitForEvent('download'), row.click()])
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  const b64 = fs.readFileSync(await download.path()).toString('base64')
  return page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bmp, 0, 0)
    const { data: px } = ctx.getImageData(0, 0, bmp.width, bmp.height)
    const from = Math.floor(bmp.width * 0.45)
    const to = Math.max(from + 1, Math.ceil(bmp.width * 0.55))
    let total = 0
    for (let x = from; x < to; x += 1) {
      let column = 0
      for (let y = 0; y < bmp.height; y += 1) column += px[(y * bmp.width + x) * 4 + 3] / 255
      total += column
    }
    return { width: bmp.width, height: bmp.height, thickness: total / (to - from) }
  }, b64)
}

test.describe('the pop-up keeps its layout', () => {
  test('the stage column, the controls beside it and one foot across both, with a Stroke row of a slider and Relative / Fixed', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-24', plan: 'free' })
    const box = await page.evaluate(() => {
      const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, r: b.right, b: b.bottom } }
      return { panel: r('.icust-panel'), left: r('.icust-left'), right: r('.icust-right'), foot: r('.icust-body > .icust-foot') }
    })
    expect(Math.round(box.panel.w), 'panel width').toBe(760)
    expect(Math.round(box.left.w), 'left column width').toBe(320)
    expect(box.right.x, 'the controls sit beside the stage column').toBeGreaterThanOrEqual(box.left.r - 1)
    expect(box.foot.y, 'the foot is under both columns').toBeGreaterThanOrEqual(Math.max(box.left.b, box.right.b) - 1)
    expect(box.foot.r - box.foot.x, 'the foot runs across both').toBeGreaterThanOrEqual(box.panel.w - 2)
    await expect(page.locator('.icust-head .icust-sub')).toHaveText(/^[^,]+, (outline|solid)$/)
    await expect(page.locator('.icust-left .icust-stage')).toBeVisible()
    await expect(page.locator('.icust-right .icust-stroke')).toBeVisible()
    const stroke = page.locator('.icust-stroke')
    await expect(stroke.locator('label')).toHaveText('Stroke')
    await expect(stroke.getByRole('slider').or(stroke.getByRole('spinbutton')).first()).toBeVisible()
    const pair = stroke.locator('.icust-seg.icust-mode')
    await expect(pair.getByRole('radio')).toHaveText(['Relative', 'Fixed'])
    await expect(modeRadio(page, 'Relative')).toHaveAttribute('aria-checked', 'true')
    await expect(modeRadio(page, 'Fixed')).toHaveAttribute('aria-checked', 'false')
    await expect(page.locator('.icust-stroke-note')).toHaveText('Relative: the stroke grows with the icon, 2px at 24px. Every size and PNG scale looks the same.')
    await modeRadio(page, 'Fixed').click()
    await expect(page.locator('.icust-stroke-note')).toHaveText('Fixed: the stroke is 2px at every size and PNG scale, so bigger icons look lighter.')
  })
})

test.describe('the Stroke control follows the artwork', () => {
  test('a stroked icon has it', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-24' })
    await expect(page.locator('.icust-stroke')).toBeVisible()
  })

  test('a filled glyph has no Stroke control and no Line style', async ({ page }) => {
    await openEditor(page, { sampleName: 'fill-disc-256', pack: 'ph' })
    await expect(code(page)).toContainText('M128 40')
    await expect(page.locator('.icust-stroke')).toHaveCount(0)
    await expect(page.locator('.icust-line')).toHaveCount(0)
    await expect(page.getByRole('radiogroup', { name: 'Stroke scaling' })).toHaveCount(0)
  })

  test('a Phosphor icon never shows the Stroke control, even while its artwork is on the way', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    let release
    const held = new Promise((resolve) => { release = resolve })
    let asked = 0
    // The grid's batch is held as well, so the stage has no markup to read the artwork from.
    await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/ph\.json$/.test(u.pathname) && u.search.includes('icons='), async (route) => {
      await held
      await route.fallback()
    })
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/ph\/[^/]+\.svg$/.test(u.pathname), async (route) => {
      asked += 1
      await held
      await route.fulfill({ status: 200, contentType: 'image/svg+xml; charset=utf-8', headers: CORS, body: sample('fill-disc-256') })
        .catch(() => { /* page closed mid-flight */ })
    })
    try {
      await choosePackWhileHeld(page, 'ph')
      await page.locator('.ig .ic').first().click()
      await expect(page.locator('.icust-stage')).toBeVisible()
      await expect.poll(() => asked).toBeGreaterThan(0)
      await expect(page.locator('.icust-stage-host svg'), 'the artwork has not arrived').toHaveCount(0)
      await expect(page.locator('.icust-stroke'), 'Stroke shown for a Phosphor icon while it loads').toHaveCount(0)
      await expect(page.locator('.icust-stage-host'), 'the stage drew inline before it knew the artwork').toHaveCount(0)
      release()
      await expect(page.locator('.icust-stage img')).toBeVisible()
      await expect(page.locator('.icust-stroke'), 'Stroke shown once the artwork arrived').toHaveCount(0)
    } finally { release() }
  })
})

/** Pick a pack from the toolbar menu without waiting for a glyph, which this caller is holding back. */
async function choosePackWhileHeld(page, pack) {
  await chooseMenuOption(page, page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }), pack)
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
}

test.describe('PNG export', () => {
  // The line is 2px on a 24px icon by default: 2/24 of the icon.
  const SHARE = 2 / 24
  const AA_TOLERANCE = 0.3

  test('Relative: the stroke is the same share of the icon at 16, at 512 and at 16 drawn 4x', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-24' })
    await expect(modeRadio(page, 'Relative')).toHaveAttribute('aria-checked', 'true')
    await setSize(page, 16)
    const small = await exportPng(page, '1x')
    const small4 = await exportPng(page, '4x')
    await setSize(page, 512)
    const large = await exportPng(page, '1x')
    expect([small.width, small4.width, large.width], 'PNG widths').toEqual([16, 64, 512])
    // The canvas rasteriser rounds each edge to a quarter pixel, so a measured thickness is good to about
    // 0.25px; a Fixed-sized stroke at 512 (2px, not 42.67px) is far outside that.
    for (const shot of [small, small4, large]) {
      expect(Math.abs(shot.thickness - SHARE * shot.width), `a ${shot.width}px PNG measured ${shot.thickness}px of stroke, not ${SHARE * shot.width}`).toBeLessThan(AA_TOLERANCE)
    }
  })

  test('Fixed: the stroke is the same pixels at 16, at 512 and at 16 drawn 4x', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-24' })
    await modeRadio(page, 'Fixed').click()
    await expect(modeRadio(page, 'Fixed')).toHaveAttribute('aria-checked', 'true')
    await setSize(page, 16)
    const small = await exportPng(page, '1x')
    const small4 = await exportPng(page, '4x')
    await setSize(page, 512)
    const large = await exportPng(page, '1x')
    expect([small.width, small4.width, large.width], 'PNG widths').toEqual([16, 64, 512])
    for (const shot of [small, small4, large]) {
      expect(Math.abs(shot.thickness - 2), `a ${shot.width}px PNG measured ${shot.thickness}px of stroke, not 2`).toBeLessThan(AA_TOLERANCE)
    }
  })

  test('Fixed on a 256 grid: the same pixels at 16 and at 512', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-256', pack: 'lucide' })
    await modeRadio(page, 'Fixed').click()
    await setSize(page, 16)
    const small = await exportPng(page, '1x')
    await setSize(page, 512)
    const large = await exportPng(page, '1x')
    expect(Math.abs(small.thickness - 2), `16px PNG measured ${small.thickness}px`).toBeLessThan(AA_TOLERANCE)
    expect(Math.abs(large.thickness - 2), `512px PNG measured ${large.thickness}px`).toBeLessThan(AA_TOLERANCE)
  })
})

test.describe('the SVG the pop-up writes', () => {
  test('24 grid, Relative: the same stroke-width at every Size, on 2px of a 24px icon', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-24' })
    for (const n of [16, 24, 512]) {
      await setSize(page, n)
      expect(await writtenStrokeWidth(page), `Relative at ${n}`).toBe('2')
    }
  })

  test('24 grid, Fixed: the stroke-width is 2 over the scale, so it measures 2px at every Size', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-24' })
    await modeRadio(page, 'Fixed').click()
    // 2px at 16 over a 16/24 scale is 3 units; at 24 it is 2; at 512 over 512/24 it is 0.09375.
    for (const [n, units] of [[16, '3'], [24, '2'], [512, '0.09375']]) {
      await setSize(page, n)
      expect(await writtenStrokeWidth(page), `Fixed at ${n}`).toBe(units)
    }
  })

  test('256 grid, Relative: 2px on 24 is 21.33333 units at every Size', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-256' })
    for (const n of [16, 512]) {
      await setSize(page, n)
      expect(await writtenStrokeWidth(page), `Relative at ${n}`).toBe('21.33333')
    }
  })

  test('256 grid, Fixed: 2px is 32 units at 16 and 1 unit at 512', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-256' })
    await modeRadio(page, 'Fixed').click()
    for (const [n, units] of [[16, '32'], [512, '1']]) {
      await setSize(page, n)
      expect(await writtenStrokeWidth(page), `Fixed at ${n}`).toBe(units)
    }
  })

  test('the downloaded SVG file carries the same stroke-width as the code shown', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-line-24' })
    await modeRadio(page, 'Fixed').click()
    await setSize(page, 512)
    const shown = await writtenStrokeWidth(page)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download SVG', exact: true }).click()])
    const file = fs.readFileSync(await download.path(), 'utf8')
    expect(shown).toBe('0.09375')
    expect([...file.matchAll(/stroke-width="([^"]+)"/g)].map((m) => m[1])).toContain('0.09375')
  })
})

test.describe('colour', () => {
  test('a chosen colour reaches a child that carries a colour of its own', async ({ page }) => {
    await openEditor(page, { sampleName: 'stroke-literal-child-24' })
    const written = await code(page).innerText()
    expect(written, 'POSITIVE CONTROL: with no colour chosen the child keeps its own').toContain('#e11d48')
    await page.getByRole('radio', { name: 'Black', exact: true }).click()
    await expect(code(page)).toContainText('color="#000000"')
    await expect(code(page)).not.toContainText('e11d48')
    // What the stage paints: the circle follows the colour too, not only the file.
    await expect.poll(() => page.locator('.icust-stage-host svg circle').evaluate((el) => getComputedStyle(el).stroke)).toBe('rgb(0, 0, 0)')
  })
})

test.describe('a saved icon from the older editor', () => {
  const grid = (units) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="${units}" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="${units}" d="M4 12h16"/></svg>`
  const grid256 = (units) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48" fill="none" stroke="currentColor" stroke-width="${units}" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="${units}" d="M43 128h170"/></svg>`
  const record = (name, over) => ({
    key: `vs-custom-icons:1:${name}`, ts: 1, base: 'bolt', iteration: 1, projectId: null, name, pack: 'lucide', cdn: true,
    size: 48, absStroke: false, cap: 'round', join: 'round', isStroke: true, color: '#000000', colored: true,
    ...over,
  })
  // Each is what the older editor wrote, with the stroke-width it had put on the file (hand-checked):
  //   px era, Relative, 2px at 48: 2 / (48/24) = 1 unit on a 24 grid, 2 / (48/256) = 10.66667 on a 256 grid
  //   px era, Fixed, 2px at 48: 1 unit on a 24 grid, and Fixed still reads 2px, so the same 1
  //   no stamp (units): 1.5 units on a 24 grid; 16 units on a 256 grid
  const ERAS = [
    ['px era, Relative, 24 grid', record('Custom (px24 1)', { stroke: 2, strokeUnit: 'px', svg: grid(1) }), '1'],
    ['px era, Relative, 256 grid', record('Custom (px256 1)', { stroke: 2, strokeUnit: 'px', svg: grid256(10.66667) }), '10.66667'],
    ['px era, Fixed, 24 grid', record('Custom (pxfix 1)', { stroke: 2, strokeUnit: 'px', absStroke: true, svg: grid(1) }), '1'],
    ['unit era, 24 grid', record('Custom (unit24 1)', { stroke: 1.5, svg: grid(1.5) }), '1.5'],
    ['unit era, 256 grid', record('Custom (unit256 1)', { stroke: 16, svg: grid256(16) }), '16'],
    ['today\'s record (px24 stamp), Relative', record('Custom (today 1)', { stroke: 1, strokeUnit: 'px24', svg: grid(1) }), '1'],
  ]

  for (const [era, saved, widthOnFile] of ERAS) {
    test(`re-opens with the stroke it was saved with: ${era}`, async ({ page }) => {
      watch(page, 'a Pro designer re-opening an icon saved long ago')
      await page.setViewportSize({ width: 1440, height: 900 })
      await signIn(page, { plan: 'pro' })
      await go(page, '/create/icons')
      await page.evaluate((list) => localStorage.setItem('vs-custom-icons', JSON.stringify(list)), [saved])
      await go(page, '/create/icons')
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      await page.locator('.ig-toolbar button.ig-mine').click()
      await page.locator('.ig .ic', { hasText: saved.name }).click()
      await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
      await showCode(page)
      await expect(code(page)).toContainText('<path', { timeout: 20_000 })
      expect(await writtenStrokeWidth(page), 'the stroke-width written on the file').toBe(widthOnFile)
      await expect(modeRadio(page, saved.absStroke ? 'Fixed' : 'Relative')).toHaveAttribute('aria-checked', 'true')
    })
  }
})
