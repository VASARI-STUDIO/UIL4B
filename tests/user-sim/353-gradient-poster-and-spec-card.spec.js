// /create/gradient: the Poster and Spec card previews, at 1440 x 900, 768 x 1024 and 390 x 844,
// in light and dark.
//
//   - each draws .grd-fx[data-fx=<id>] and names itself on the canvas ("..., shown as a poster");
//   - the stage and the scene's main object have the sizes the layout spec gives (within 2px
//     for the stage, 4px for the object);
//   - no text computes under 12px, and no text or card box meets the switch or the badge;
//   - the Poster's one badge is the lowest ratio of its text over the paint, and says "low" only
//     under 4.5; the Spec card has no badge (its text sits on the neutral card);
//   - nothing scrolls sideways, nothing animates, and a signed-out visitor sees no gate;
//   - switching between the two never moves the rail.
// Captures go to .claude/scratch/grad_s6/<scene>-<width>-<theme>.png.
//
// MUTATIONS (each turns the tests named red):
//   GradientText not rendered after GradientFx (or not rendered)  -> "draws its fx layer and names itself"
//   the poster frame losing its 4:5 / full-stage rule             -> "the poster and the stage have their sizes"
//   the spec card losing its landscape or phone rule              -> "the spec card has its size"
//   a text size under 12px in .grd-txt                            -> "no text is under 12px ..."
//   the footer losing max-width at 900 and under                  -> "no text meets the switch or the badge"
//   the badge taking the first box, not the lowest                -> "the poster's badge is the lowest ratio ..."
//   the Spec card showing a badge                                 -> "the spec card has no badge ..."
//   opacity on any text in the layer                              -> "no text is faded ..."
//   a transition or animation on the layer                        -> "nothing animates"
//   stage aspect-ratio rule missing poster/spec at 600 and under  -> "the poster and the stage have their sizes" (390)
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const KEY = 'vs-gradient-preview'
const SCENES = [
  { id: 'poster', name: 'Poster', as: ', shown as a poster' },
  { id: 'spec', name: 'Spec card', as: ', shown as a spec card' },
]
const VIEWS = [
  { w: 1440, h: 900, stage: [1046, 550], poster: [376, 470], spec: [352, 470] },
  { w: 768, h: 1024, stage: [720, 360], poster: null, spec: [600, 264] },
  { w: 390, h: 844, stage: [366, 274.5], poster: null, spec: [342, 198], touch: true },
]
const CITRUS = {
  type: 'Linear', angle: 135, space: 'oklch', source: 'own',
  stops: [{ color: '#FFD84D', position: 0 }, { color: '#F0436A', position: 60 }, { color: '#6E6BFF', position: 100 }],
}
const SCRATCH = path.resolve(process.cwd(), '.claude/scratch/grad_s6')

const startOn = (page, id) => page.addInitScript(([k, v]) => { sessionStorage.setItem(k, v) }, [KEY, id])
const seed = (page, gradient) => page.addInitScript((g) => { localStorage.setItem('vs-current-design', JSON.stringify({ gradient: g })) }, gradient)
const flat = (a, b, angle = 180) => ({ type: 'Linear', angle, space: 'srgb', source: 'own', stops: [{ color: a, position: 0 }, { color: b, position: 100 }] })

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

const box = (page, sel) => page.locator(sel).first().boundingBox()
const near = (got, want, tol, what) => expect(Math.abs(got - want), `${what}: ${got} vs ${want}`).toBeLessThanOrEqual(tol)

/** Picks a preview by name, from the switch or, when it has overflowed, the More menu. */
async function choose(page, name) {
  const group = page.getByRole('group', { name: 'Preview as' })
  const direct = group.getByRole('button', { name, exact: true })
  if (await direct.count()) { await direct.click(); return }
  await group.getByRole('button', { name: /^More/ }).click()
  await page.getByRole('listbox', { name: 'More previews' }).getByRole('option', { name }).click()
}

for (const theme of ['light', 'dark']) {
  for (const v of VIEWS) {
    test.describe(`Poster and Spec card at ${v.w} in ${theme}`, () => {
      test.use({ viewport: { width: v.w, height: v.h }, colorScheme: theme, ...(v.touch ? { hasTouch: true, isMobile: true } : {}) })
      test.beforeEach(async ({ page }) => {
        watch(page, 'a designer trying their gradient as a poster and a spec card')
        await page.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
      })

      for (const s of SCENES) {
        test(`${s.name}: draws its fx layer and names itself`, async ({ page }) => {
          await startOn(page, s.id); await seed(page, CITRUS); await open(page)
          await expect(page.locator(`.grd-fx[data-fx="${s.id}"]`)).toBeVisible()
          const label = await page.locator('.grd-canvas').getAttribute('aria-label')
          expect(label.endsWith(s.as), label).toBe(true)
          const order = await page.evaluate(() => {
            const kids = [...document.querySelector('.grd-stage').children]
            return [kids.findIndex((el) => el.classList.contains('grd-fx')), kids.findIndex((el) => el.classList.contains('grd-txt')), kids.findIndex((el) => el.classList.contains('grd-ctx'))]
          })
          expect(order[0], 'the fx layer is there').toBeGreaterThanOrEqual(0)
          expect(order[1], 'the text layer is after the fx layer').toBeGreaterThan(order[0])
          expect(order[2], 'the switch is after both').toBeGreaterThan(order[1])
        })

        test(`${s.name}: the stage and the scene have their sizes`, async ({ page }) => {
          await startOn(page, s.id); await seed(page, CITRUS); await open(page)
          const st = await box(page, '.grd-stage')
          near(st.width, v.stage[0], 2, 'stage width'); near(st.height, v.stage[1], 2, 'stage height')
          if (s.id === 'poster') {
            const f = await box(page, '.grd-txt .grd-poster-frame')
            if (v.poster) { near(f.width, v.poster[0], 4, 'poster width'); near(f.height, v.poster[1], 4, 'poster height') }
            else { near(f.width, st.width, 2, 'poster fills the stage'); near(f.height, st.height, 2, 'poster fills the stage') }
          } else {
            const c = await box(page, '.grd-spec')
            near(c.width, v.spec[0], 4, 'card width'); near(c.height, v.spec[1], 4, 'card height')
          }
        })

        test(`${s.name}: no text is under 12px or faded, and none meets the switch or the badge`, async ({ page }) => {
          await startOn(page, s.id); await seed(page, CITRUS); await open(page)
          const found = await page.evaluate(() => {
            const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }
            const texts = [...document.querySelectorAll('.grd-txt *')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
            const small = texts.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12).map((el) => el.className)
            const faded = texts.filter((el) => { for (let n = el; n && !n.classList.contains('grd-txt'); n = n.parentElement) { if (parseFloat(getComputedStyle(n).opacity) < 1) return true } return false }).map((el) => el.className)
            const card = document.querySelector('.grd-spec')
            const boxes = [...texts.filter((el) => !el.classList.contains('grd-ctx-ratio')).map(rect), ...(card ? [rect(card)] : [])]
            const bar = rect(document.querySelector('.grd-ctx'))
            const badge = document.querySelector('.grd-ctx-ratio')
            return { n: texts.length, small, faded, onSwitch: boxes.filter((b) => b.width && ((b.x < bar.x + bar.width && bar.x < b.x + b.width && b.y < bar.y + bar.height && bar.y < b.y + b.height))).length, onBadge: badge ? boxes.filter((b) => { const r = rect(badge); return b.x < r.x + r.width && r.x < b.x + b.width && b.y < r.y + r.height && r.y < b.y + b.height }).length : 0 }
          })
          expect(found.n, 'the scene has text').toBeGreaterThan(3)
          expect(found.small, 'text under 12px').toEqual([])
          expect(found.faded, 'text faded with opacity').toEqual([])
          expect(found.onSwitch, 'text or card under the switch').toBe(0)
          expect(found.onBadge, 'text or card under the badge').toBe(0)
        })

        test(`${s.name}: does not scroll sideways, animates nothing and shows no gate`, async ({ page }) => {
          await startOn(page, s.id); await seed(page, CITRUS); await open(page)
          const found = await page.evaluate(() => ({
            sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
            moving: [...document.querySelectorAll('.grd-fx, .grd-txt')].reduce((n, el) => n + el.getAnimations({ subtree: true }).length, 0),
            gated: document.querySelectorAll('.grd-stage [class*="gate"], .grd-stage [class*="lock"], .grd-stage [class*="blur"]').length,
            filtered: [...document.querySelectorAll('.grd-fx, .grd-txt, .grd-txt *')].filter((el) => getComputedStyle(el).filter !== 'none').length,
          }))
          expect(found.sw).toBe(found.cw)
          expect(found.moving, 'running animations').toBe(0)
          expect(found.gated, 'a lock, gate or blur element').toBe(0)
          expect(found.filtered, 'a filter on the layer').toBe(0)
        })

        test(`${s.name}: capture`, async ({ page }) => {
          await startOn(page, s.id); await seed(page, CITRUS); await open(page)
          fs.mkdirSync(SCRATCH, { recursive: true })
          await page.locator('.grd-stage').screenshot({ path: path.join(SCRATCH, `${s.id}-${v.w}-${theme}.png`) })
        })
      }

      test('switching between the two does not move the rail', async ({ page }) => {
        await startOn(page, 'poster'); await seed(page, CITRUS); await open(page)
        const top = async () => (await box(page, '.grd-rail')).y
        const first = await top()
        await choose(page, 'Spec card')
        await expect(page.locator('.grd-fx[data-fx="spec"]')).toBeVisible()
        near(await top(), first, 0.5, 'the rail after Spec card')
        await choose(page, 'Poster')
        await expect(page.locator('.grd-fx[data-fx="poster"]')).toBeVisible()
        near(await top(), first, 0.5, 'the rail after Poster')
      })

      test('the spec card has no badge, and lists the colours it was sampled from', async ({ page }) => {
        await startOn(page, 'spec'); await seed(page, CITRUS); await open(page)
        await expect(page.locator('.grd-ctx-ratio')).toHaveCount(0)
        const strip = await page.locator('.grd-spec-hex').allTextContents()
        expect(strip).toHaveLength(5)
        expect(strip[0]).toBe('#FFD84D')
        expect(strip[4]).toBe('#6E6BFF')
        await expect(page.locator('.grd-spec-note')).toHaveText('Sampled at 0, 25, 50, 75 and 100%')
        await expect(page.locator('.grd-spec-type')).toHaveText('Linear 135° · OKLCH')
        await expect(page.locator('.grd-spec-name')).toHaveText('Linear gradient')
      })
    })
  }
}

test.describe('the Poster badge', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a designer checking whether the poster text reads') })

  test("the poster's badge is the lowest ratio of its text over the paint", async ({ page }) => {
    await startOn(page, 'poster'); await seed(page, flat('#000000', '#FFFFFF')); await open(page)
    const text = (await page.locator('.grd-ctx-ratio').textContent()).trim()
    expect(text).toMatch(/^Text \d+\.\d:1$/)
    // Worked out here from the boxes and the inks on screen, not by the page's own picker.
    const expected = await page.evaluate(() => {
      const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
      const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
      const rgb = (css) => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = css; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3) }
      const frame = document.querySelector('.grd-txt .grd-poster-frame').getBoundingClientRect()
      const ratios = [...document.querySelectorAll('.grd-txt [data-box]')].map((el) => {
        const r = el.getBoundingClientRect()
        const ink = rgb(getComputedStyle(el).color)
        const ends = [(r.top - frame.top) / frame.height, (r.bottom - frame.top) / frame.height].map((t) => { const g = Math.round(255 * Math.min(1, Math.max(0, t))); return [g, g, g] })
        return Math.min(...ends.map((bg) => ratio(ink, bg)))
      })
      return Math.min(...ratios)
    })
    near(Number(/Text (\d+\.\d)/.exec(text)[1]), expected, 0.3, 'the badge against the lowest of the two boxes')
  })

  test('mid-grey paint reads low', async ({ page }) => {
    await startOn(page, 'poster'); await seed(page, flat('#7C7C7C', '#7C7C7C')); await open(page)
    await expect(page.locator('.grd-ctx-ratio')).toHaveText(/^Text 4\.\d:1 · low$/)
    await expect(page.locator('.grd-ctx-ratio')).toHaveClass(/is-low/)
  })

  test('black paint reads at the top of the scale and is not called low', async ({ page }) => {
    await startOn(page, 'poster'); await seed(page, flat('#000000', '#000000')); await open(page)
    await expect(page.locator('.grd-ctx-ratio')).toHaveText(/^Text \d+\.\d:1$/)
    await expect(page.locator('.grd-ctx-ratio')).not.toHaveClass(/is-low/)
  })

  test('over 20 Random rolls the Poster always has its badge and the Spec card never does', async ({ page }) => {
    await startOn(page, 'poster'); await open(page)
    const random = page.getByRole('button', { name: 'Random', exact: true }).first()
    for (let i = 0; i < 20; i++) {
      await random.click()
      await expect(page.locator('.grd-ctx-ratio'), `roll ${i + 1}`).toHaveText(/^Text \d+\.\d:1( · low)?$/)
    }
    await choose(page, 'Spec card')
    for (let i = 0; i < 20; i++) {
      await random.click()
      await expect(page.locator('.grd-ctx-ratio'), `roll ${i + 1}`).toHaveCount(0)
    }
  })

  test('the text layer is drawn after the effects layer, so grain never sits over a letter', async ({ page }) => {
    await startOn(page, 'poster'); await seed(page, CITRUS); await open(page)
    const later = await page.evaluate(() => {
      const fx = document.querySelector('.grd-fx'); const txt = document.querySelector('.grd-txt')
      return !!(fx.compareDocumentPosition(txt) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    expect(later).toBe(true)
  })
})

const FIVE = {
  type: 'Linear', angle: 90, space: 'oklch', source: 'own',
  stops: ['#FFD84D', '#F0436A', '#6E6BFF', '#22C55E', '#0EA5E9'].map((color, i) => ({ color, position: i * 25 })),
}
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

test.describe('the scenes clear the preview switch', () => {
  for (const w of [1440, 1024]) {
    test(`the poster frame sits below the switch at ${w}`, async ({ page }) => {
      watch(page, 'a designer looking at the whole poster')
      await page.setViewportSize({ width: w, height: 900 })
      await startOn(page, 'poster'); await seed(page, CITRUS); await open(page)
      const frame = await box(page, '.grd-txt .grd-poster-frame')
      const bar = await box(page, '.grd-ctx')
      expect(overlap(frame, bar), `frame top ${frame.y}, switch bottom ${bar.y + bar.height}`).toBe(false)
    })
  }

  for (const w of [320, 360, 390]) {
    test(`the spec card sits below the switch on a ${w} phone`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: w, height: 760 }, hasTouch: true, isMobile: true })
      const page = await context.newPage()
      watch(page, 'a designer on a small phone looking at the spec card')
      await startOn(page, 'spec'); await seed(page, CITRUS); await open(page)
      const card = await box(page, '.grd-spec')
      const bar = await box(page, '.grd-ctx')
      expect(overlap(card, bar), `card top ${card.y}, switch bottom ${bar.y + bar.height}`).toBe(false)
      const head = await box(page, '.grd-spec-head')
      expect(head.height, 'the gradient header still shows').toBeGreaterThanOrEqual(16)
      const clipped = await page.evaluate(() => { const b = document.querySelector('.grd-spec-body'); return b.scrollHeight - b.clientHeight })
      expect(clipped, 'the card body is not cut off').toBeLessThanOrEqual(1)
      await context.close()
    })
  }
})

test.describe('the spec card hex line', () => {
  for (const w of [1440, 768]) {
    test(`a five-stop gradient lists all five hexes at ${w}`, async ({ page }) => {
      watch(page, 'a designer reading the stops off the spec card')
      await page.setViewportSize({ width: w, height: 1000 })
      await startOn(page, 'spec'); await seed(page, FIVE); await open(page)
      await expect(page.locator('.grd-spec-hexes span')).toHaveText(['#FFD84D', '#F0436A', '#6E6BFF', '#22C55E', '#0EA5E9'])
      const fits = await page.evaluate(() => { const l = document.querySelector('.grd-spec-hexes'); return l.scrollWidth <= l.clientWidth })
      expect(fits, 'the line does not overflow').toBe(true)
    })
  }

  test('nine stops fill the line and count the rest', async ({ page }) => {
    watch(page, 'a designer with a many-stop gradient')
    await page.setViewportSize({ width: 1440, height: 900 })
    const nine = { ...FIVE, stops: Array.from({ length: 9 }, (_, i) => ({ color: `#${(i + 1).toString(16).repeat(6)}`.slice(0, 7).toUpperCase(), position: i * 12.5 })) }
    await startOn(page, 'spec'); await seed(page, nine); await open(page)
    const shown = await page.locator('.grd-spec-hexes span').allTextContents()
    const more = shown[shown.length - 1]
    expect(more).toMatch(/^\+\d$/)
    expect(shown.length - 1 + Number(more.slice(1))).toBe(9)
    const fits = await page.evaluate(() => { const l = document.querySelector('.grd-spec-hexes'); return l.scrollWidth <= l.clientWidth })
    expect(fits, 'the line does not overflow').toBe(true)
  })
})
