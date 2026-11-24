// ICON LIBRARY STROKE EDITS MUST NOT CLIP (Q219): one frame, every output.
//
// A heavy stroke, a square end, a mitred corner or a turn paints outside the pack's viewBox, so the icon
// came out cut off at the edge of the file. The viewBox now grows to hold the paint, from one helper
// (src/utils/iconBake.js) that the preview, Copy SVG, the download, the PNG and Save to project all read.
//
//   1. At the maximum stroke, square ends and mitred corners, every stroked shape of the copied SVG, grown
//      by half its stroke width (times the end/corner factor), lies inside the file's viewBox.
//   2. The Stage preview uses the same viewBox as the copied file (Relative and Fixed).
//   3. The file's width and height stay what Size says; the default edit leaves the viewBox as the pack had it.
//   4. A turn of 45 degrees (the buttons only reach 90, so the test calls the bake through a test seam,
//      window.__iconBake) still fits.
//   5. A filled shape in a mixed glyph never gets a stroke.
//   6. A contact sheet of the extremes (thin and heavy, each end and corner, turned 0/45/90, flipped) is drawn
//      from the exported SVGs and every one fits. See .claude/01_scratch/18_icon_notes/q219-contact-sheet.png.
//   7. A filled icon keeps Stroke and Line style on screen, locked, with the reason.
//
// HOW TO SEE EACH FAIL (src/):
//   iconBake.js strokeReach returns w / 2 (no cap or join factor)      -> 1, 4 (square and mitre reach out of the box)
//   iconBake.js framedBox ignores `pad` (frame = base)                 -> 1, 2, 4, 6
//   iconBake.js framedBox ignores `rotate`                             -> 4, 6 (the 45 degree cells)
//   IconLibrary.jsx serializeCustomizedSvg stops calling applyBake /
//     setting the viewBox                                              -> 1, 3, 4, 6
//   IconLibrary.jsx Stage effect drops the measureBake / viewBox lines -> 2 (preview keeps the pack's box)
//   iconBake.js measureBake treats every element as stroked            -> 5 (the dot gets a stroke-width)
//   IconLibrary.jsx the sections render only when isStroke             -> 7
//
// Artwork is the hand-written fixture tests/user-sim/fixtures/iconify/samples/mixed-tri-24.svg: a triangle
// and a bar that reach the edge of a 24 box, and a filled dot.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { FIXTURE_DIR, ICONIFY_HOSTS, ICONIFY_STUB_HEADER, isLiveIconify } from './iconify-stub.js'

test.skip(isLiveIconify(), 'the artwork is served from the fixture so the shapes are known')

const SAMPLES = path.join(FIXTURE_DIR, 'samples')
const sample = (name) => fs.readFileSync(path.join(SAMPLES, `${name}.svg`), 'utf8')
const CORS = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }
const SHEET = '.claude/01_scratch/18_icon_notes/q219-contact-sheet.png'
const EPS = 0.05

async function serveSample(page, name) {
  const body = sample(name)
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\/[^/]+\.svg$/.test(u.pathname), async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml; charset=utf-8', headers: CORS, body })
      .catch(() => { /* page closed mid-flight */ })
  })
}

async function open(page, { sampleName, pack = 'lucide' }) {
  watch(page, 'a designer pushing an icon to its heaviest stroke')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  await page.setViewportSize({ width: 1440, height: 900 })
  await serveSample(page, sampleName)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await chooseMenuOption(page, page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }), pack)
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  await page.locator('.ig .ic:not(.ig-skel)').first().click()
  await expect(page.locator('.ied-ground')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ied-pri')).toBeEnabled({ timeout: 20_000 })
  const disc = page.locator('#ied-sec-code .ied-disc')
  if ((await disc.getAttribute('aria-expanded')) !== 'true') await disc.click()
  await expect(page.locator('#ied-code code')).toContainText(/M2 21|M128 40/, { timeout: 20_000 })
}

/** Every `svg[data-case]` on the page: how far its stroked shapes reach outside its viewBox (units), worst first. */
function checkSvgs(eps) {
  const rows = []
  for (const svg of document.querySelectorAll('svg[data-case]')) {
    const vb = svg.viewBox.baseVal
    const root = svg.getScreenCTM()
    let worst = 0
    let shapes = 0
    for (const el of svg.querySelectorAll('path,circle,ellipse,rect,line,polyline,polygon')) {
      const cs = getComputedStyle(el)
      if (!cs.stroke || cs.stroke === 'none') continue
      const w = parseFloat(cs.strokeWidth) || 0
      if (w <= 0) continue
      shapes += 1
      const m = root.inverse().multiply(el.getScreenCTM())
      const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c))
      const inRoot = cs.vectorEffect === 'non-scaling-stroke' ? w / root.a : w * scale
      const f = Math.max(
        cs.strokeLinejoin === 'miter' ? 2 : 1, // the bake's own miter limit
        cs.strokeLinecap === 'square' ? Math.SQRT2 : 1,
      )
      const reach = (inRoot / 2) * f
      const b = el.getBBox()
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m))
      const x0 = Math.min(...pts.map((p) => p.x)) - reach
      const x1 = Math.max(...pts.map((p) => p.x)) + reach
      const y0 = Math.min(...pts.map((p) => p.y)) - reach
      const y1 = Math.max(...pts.map((p) => p.y)) + reach
      worst = Math.max(worst, vb.x - x0, x1 - (vb.x + vb.width), vb.y - y0, y1 - (vb.y + vb.height))
    }
    rows.push({ label: svg.getAttribute('data-case'), shapes, worst: Math.round(worst * 1000) / 1000 })
  }
  return { rows, eps }
}

const attr = (svg, name) => new RegExp(`${name}="([^"]*)"`).exec(svg.match(/<svg\b[^>]*>/)[0])?.[1]
const nums = (s) => s.trim().split(/[\s,]+/).map(Number)

/** Show `markups` ({label, svg}) at 96px each, on the page, and return the clip check for them. */
async function drawAndCheck(page, cases) {
  const cells = cases.map((c) => `<figure><div class="b">${c.svg.replace('<svg', `<svg data-case="${c.label}"`)}</div><figcaption>${c.label}</figcaption></figure>`).join('')
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:12px;background:#fff;color:#111;font:10px/1.3 system-ui;display:grid;grid-template-columns:repeat(auto-fill,112px);gap:10px}
    figure{margin:0;text-align:center}.b{width:96px;height:96px;margin:0 auto 2px;background:#fafafa;outline:1px solid #c33}
    svg{width:96px;height:96px;display:block}figcaption{color:#555}
  </style>${cells}`)
  return page.evaluate(checkSvgs, EPS)
}

const heaviest = (page) => page.getByRole('textbox', { name: 'Stroke width in pixels' })

async function setHeaviestSharp(page) {
  await heaviest(page).fill('8')
  await heaviest(page).press('Enter')
  await page.getByRole('radiogroup', { name: 'Line style' }).getByRole('radio', { name: /^Sharp/ }).click()
  await expect(heaviest(page)).toHaveValue('8')
}

async function copied(page) {
  await page.locator('.ied-pri').click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 10_000 }).toMatch(/^<svg/)
  return page.evaluate(() => navigator.clipboard.readText())
}

test.describe('stroke edits stay inside the file', () => {
  for (const mode of ['Relative', 'Fixed']) {
    test(`maximum stroke, square ends, mitred corners: copied SVG fits and matches the preview (${mode})`, async ({ page }) => {
      await open(page, { sampleName: 'mixed-tri-24' })
      await page.getByRole('radiogroup', { name: 'Stroke scaling' }).getByRole('radio', { name: mode }).click()
      await setHeaviestSharp(page)
      const svg = await copied(page)

      // The file keeps its size; only the viewBox moved.
      expect(attr(svg, 'width')).toBe('24')
      expect(attr(svg, 'height')).toBe('24')
      const vb = nums(attr(svg, 'viewBox'))
      expect(vb[2], 'the viewBox grew to hold the stroke').toBeGreaterThan(24)

      // The preview draws in the same frame.
      const stage = nums(await page.locator('.ied-stage-host svg').getAttribute('viewBox'))
      for (let i = 0; i < 4; i += 1) expect(stage[i], `preview viewBox[${i}] vs copied file`).toBeCloseTo(vb[i], 2)

      // A filled shape in a mixed glyph gets no stroke.
      const dot = svg.match(/<circle\b[^>]*>/)[0]
      expect(dot).not.toMatch(/stroke-width/)
      expect(dot).not.toMatch(/stroke-linecap|stroke-linejoin|stroke-miterlimit/)
      expect(svg).toMatch(/stroke-miterlimit="2"/)

      const { rows } = await drawAndCheck(page, [{ label: `max-sharp-${mode}`, svg }])
      expect(rows[0].shapes, 'the check saw the stroked shapes').toBeGreaterThanOrEqual(2)
      expect(rows[0].worst, `the stroke reaches ${rows[0].worst} units past the viewBox`).toBeLessThanOrEqual(EPS)
    })
  }

  test('the default edit leaves the pack\'s viewBox as it was', async ({ page }) => {
    await open(page, { sampleName: 'mixed-tri-24' })
    const svg = await copied(page)
    expect(nums(attr(svg, 'viewBox'))).toEqual([0, 0, 24, 24])
    expect(attr(svg, 'width')).toBe('24')
  })

  test('turned 45 degrees at the maximum stroke still fits', async ({ page }) => {
    await open(page, { sampleName: 'mixed-tri-24' })
    const base = sample('mixed-tri-24')
    const svg = await page.evaluate(
      ([text]) => window.__iconBake(text, {
        size: 24, color: '#111', stroke: 8, isStroke: true, absStroke: false, cap: 'square', join: 'miter', rotate: 45, flipH: false, flipV: false,
      }),
      [base],
    )
    expect(attr(svg, 'width')).toBe('24')
    const { rows } = await drawAndCheck(page, [{ label: 'rot45-max-sharp', svg }])
    expect(rows[0].shapes).toBeGreaterThanOrEqual(2)
    expect(rows[0].worst).toBeLessThanOrEqual(EPS)
  })

  test('contact sheet of the extremes: every one fits', async ({ page }) => {
    await open(page, { sampleName: 'mixed-tri-24' })
    const base = sample('mixed-tri-24')
    const cases = await page.evaluate(([text]) => {
      const out = []
      let n = 0
      for (const stroke of [0.5, 8]) {
        for (const cap of ['round', 'square', 'butt']) {
          for (const join of ['round', 'miter', 'bevel']) {
            for (const rotate of [0, 45, 90]) {
              n += 1
              out.push({
                label: `${stroke}px ${cap[0]}${join[0]} r${rotate}${n % 2 ? '' : ' flip'}`,
                svg: window.__iconBake(text, {
                  size: 24, color: '#111', stroke, isStroke: true, absStroke: false, cap, join, rotate, flipH: n % 2 === 0, flipV: false,
                }),
              })
            }
          }
        }
      }
      for (const rotate of [0, 45, 90]) {
        out.push({
          label: `Fixed 8px sq mi r${rotate}`,
          svg: window.__iconBake(text, {
            size: 24, color: '#111', stroke: 8, isStroke: true, absStroke: true, cap: 'square', join: 'miter', rotate, flipH: false, flipV: false,
          }),
        })
      }
      return out
    }, [base])
    const { rows } = await drawAndCheck(page, cases)
    await page.screenshot({ path: SHEET, fullPage: true })
    expect(rows).toHaveLength(cases.length)
    const clipped = rows.filter((r) => r.worst > EPS).map((r) => `${r.label}: ${r.worst}`)
    expect(clipped, 'cells whose stroke reaches past their viewBox').toEqual([])
    expect(rows.every((r) => r.shapes >= 2)).toBe(true)
  })
})

test('a filled icon keeps Stroke and Line style on screen, locked, with the reason', async ({ page }) => {
  await open(page, { sampleName: 'fill-disc-256', pack: 'ph' })
  const reason = 'This icon is filled, so it has no stroke to change.'
  const width = heaviest(page)
  await expect(width).toHaveAttribute('aria-disabled', 'true')
  await expect(width).toHaveAttribute('aria-describedby', 'ied-stroke-note')
  await expect(page.locator('#ied-stroke-note')).toHaveText(reason)
  await expect(page.locator('#ied-line-reason')).toHaveText(reason)
  const tile = page.getByRole('radiogroup', { name: 'Line style' }).getByRole('radio').nth(1)
  await expect(tile).toHaveAttribute('aria-disabled', 'true')
  await tile.click()
  await expect(page.getByRole('radiogroup', { name: 'Line style' }).getByRole('radio').first(), 'a press changes nothing').toHaveAttribute('aria-checked', 'true')
})
