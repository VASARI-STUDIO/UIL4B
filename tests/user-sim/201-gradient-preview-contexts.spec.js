// /create/gradient: the canvas can be previewed as a Fill, a Hero, a Card or a Button.
//
// What a designer relies on:
//   - the switch under the canvas says which context is on (aria-pressed), and the
//     choice outlives a reload of the tab (sessionStorage, 'vs-gradient-preview');
//   - the canvas names the context to a screen reader ("..., shown as a hero");
//   - Fill is the bare gradient: it draws no sample UI;
//   - the Hero's badge reports the contrast of the text over the gradient it sits on,
//     and says "low" only when it truly is low: the default gradient reads well, a
//     black-to-white one with text across its middle cannot;
//   - on a phone the switch never lies over a sample;
//   - Random's Hue, Tone and Colours rows are one line each on a laptop screen.
//
// The expected ratios are hand-checked, not worked out by the page's own code: the
// default gradient is two saturated colours the ink picker separates from with room
// to spare (the badge must read at least 4.5, the AA body-text line), and the middle
// of black-to-white is mid-grey, where neither black nor white ink reaches 4.5.
//
// MUTATIONS (each turns the tests named red):
//   choosePreview not writing sessionStorage                     -> "the choice is kept in sessionStorage and survives a reload"
//   aria-pressed dropped from the switch buttons                 -> "pressing a context sets aria-pressed ..."
//   PREVIEW_CONTEXTS 'as' text changed                           -> "the canvas says which context it is shown as"
//   PreviewSample returning a sample for 'fill'                  -> "Fill draws no sample"
//   pickInk measured over the whole gradient, not the text box   -> "black to white with text over the middle reads low"
//   BODY_TEXT_RATIO lowered to 1                                 -> "black to white with text over the middle reads low"
//   .grd-ctx back to position: absolute at the canvas's centre   -> "at 390 the switch never overlaps a sample"
//   .grd-gen .tl-pills wrapping at 1280                          -> "Random's Hue, Tone and Colours rows are one line ..."
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const KEY = 'vs-gradient-preview'

const panelOf = (page) => page.getByRole('complementary', { name: 'Gradient controls' })
const switchOf = (page) => page.getByRole('group', { name: 'Preview as' })
const contextButton = (page, name) => switchOf(page).getByRole('button', { name, exact: true })
const canvasOf = (page) => page.locator('.grd-canvas')
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(panelOf(page)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

/** Starts the tab on a given context, as a session that already chose it. */
const startOn = (page, id) => page.addInitScript(([key, value]) => { sessionStorage.setItem(key, value) }, [KEY, id])

/**
 * Starts with this two-stop linear gradient as the project's gradient. The Hero's text
 * sits at the left, centred up and down, so a top-to-bottom run (180deg) puts the text
 * over the middle of the gradient and a left-to-right run (90deg) puts it over the start.
 */
const withStops = (page, from, to, angle = 180) => page.addInitScript(([a, b, deg]) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    gradient: { type: 'Linear', angle: deg, stops: [{ color: a, position: 0 }, { color: b, position: 100 }] },
  }))
}, [from, to, angle])

/** The ratio the Hero badge prints, and whether it says it is low. */
async function heroBadge(page) {
  const badge = page.locator('.grd-ctx-ratio')
  await expect(badge).toHaveText(/^Text \d+\.\d:1/)
  const text = (await badge.textContent()).trim()
  return { text, ratio: Number(/^Text (\d+\.\d):1/.exec(text)[1]), low: /low/.test(text) || (await badge.evaluate((el) => el.classList.contains('is-low'))) }
}

test.describe('the preview context switch', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a designer trying the gradient as a hero, a card and a button') })

  test('pressing a context sets aria-pressed on it alone, and Fill is on by default', async ({ page }) => {
    await open(page)
    const names = ['Fill', 'Hero', 'Card', 'Button']
    const pressed = async () => Promise.all(names.map((n) => contextButton(page, n).getAttribute('aria-pressed')))
    expect(await pressed(), 'a fresh tab starts on Fill').toEqual(['true', 'false', 'false', 'false'])
    for (const [i, name] of names.entries()) {
      await contextButton(page, name).click()
      const want = names.map((_, j) => String(j === i))
      await expect.poll(pressed, `only ${name} is pressed after pressing it`).toEqual(want)
    }
  })

  test('the choice is kept in sessionStorage and survives a reload', async ({ page }) => {
    await open(page)
    await contextButton(page, 'Hero').click()
    await expect(contextButton(page, 'Hero')).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBe('hero')
    await page.reload()
    await expect(panelOf(page)).toBeVisible()
    await expect(contextButton(page, 'Hero')).toHaveAttribute('aria-pressed', 'true')
    await expect(contextButton(page, 'Fill')).toHaveAttribute('aria-pressed', 'false')
  })

  test('a stored value that is not a context falls back to Fill', async ({ page }) => {
    await startOn(page, 'carousel')
    await open(page)
    await expect(contextButton(page, 'Fill')).toHaveAttribute('aria-pressed', 'true')
  })

  test('the canvas says which context it is shown as', async ({ page }) => {
    await open(page)
    await expect(canvasOf(page)).toHaveAttribute('aria-label', 'Linear gradient preview')
    const want = { Hero: 'Linear gradient preview, shown as a hero', Card: 'Linear gradient preview, shown as a card', Button: 'Linear gradient preview, shown as a button' }
    for (const [name, label] of Object.entries(want)) {
      await contextButton(page, name).click()
      await expect(canvasOf(page), `${name} labels the canvas`).toHaveAttribute('aria-label', label)
    }
    await contextButton(page, 'Fill').click()
    await expect(canvasOf(page)).toHaveAttribute('aria-label', 'Linear gradient preview')
  })

  test('Fill draws no sample, and each other context draws one', async ({ page }) => {
    await open(page)
    await expect(contextButton(page, 'Fill')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.grd-ctx-view'), 'Fill is the bare gradient').toHaveCount(0)
    for (const name of ['Hero', 'Card', 'Button']) {
      await contextButton(page, name).click()
      await expect(page.locator('.grd-ctx-view'), `${name} draws its sample`).toHaveCount(1)
    }
    await contextButton(page, 'Fill').click()
    await expect(page.locator('.grd-ctx-view')).toHaveCount(0)
  })
})

test.describe('the Hero badge', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a designer checking whether hero text reads on their gradient') })

  test('the default gradient reads at 4.5 or better and is not called low', async ({ page }) => {
    await startOn(page, 'hero')
    await open(page)
    const badge = await heroBadge(page)
    expect(badge.ratio, badge.text).toBeGreaterThanOrEqual(4.5)
    expect(badge.low, badge.text).toBe(false)
    await expect(page.locator('.grd-ctx-ratio')).not.toHaveClass(/is-low/)
  })

  test('black to white with text over the middle reads low', async ({ page }) => {
    await startOn(page, 'hero')
    await withStops(page, '#000000', '#FFFFFF')
    await open(page)
    await expect(page.locator('.grd-ctx-ratio')).toHaveClass(/is-low/)
    const badge = await heroBadge(page)
    expect(badge.text).toContain('low')
    expect(badge.ratio, 'neither black nor white ink reaches 4.5 over mid-grey').toBeLessThan(4.5)
  })

  test('the same black to white run left to right reads well: the text sits over its dark start', async ({ page }) => {
    await startOn(page, 'hero')
    await withStops(page, '#000000', '#FFFFFF', 90)
    await open(page)
    const badge = await heroBadge(page)
    expect(badge.ratio, badge.text).toBeGreaterThanOrEqual(4.5)
    expect(badge.low, badge.text).toBe(false)
  })

  test('black to black reads at the top of the scale and is not called low', async ({ page }) => {
    await startOn(page, 'hero')
    await withStops(page, '#000000', '#000000')
    await open(page)
    const badge = await heroBadge(page)
    expect(badge.ratio, 'white ink on black').toBeGreaterThan(15)
    expect(badge.low).toBe(false)
  })
})

test.describe('at 390 the switch stays off the samples', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  for (const [id, name] of [['hero', 'Hero'], ['card', 'Card'], ['button', 'Button']]) {
    test(`at 390 the switch never overlaps a sample (${name})`, async ({ page }) => {
      watch(page, 'someone on a phone using the preview switch')
      await startOn(page, id)
      await open(page)
      await expect(contextButton(page, name)).toHaveAttribute('aria-pressed', 'true')
      const found = await page.evaluate(() => {
        const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
        const sw = rect(document.querySelector('.grd-ctx'))
        const samples = [...document.querySelectorAll('.grd-ctx-view :is(.grd-ctx-sample, .grd-ctx-card, .grd-ctx-btn, .grd-ctx-cta, .grd-ctx-h, .grd-ctx-p)')]
        const hits = samples.filter((el) => {
          const s = rect(el)
          return s.w > 0 && s.h > 0 && s.l < sw.r - 0.5 && s.r > sw.l + 0.5 && s.t < sw.b - 0.5 && s.b > sw.t + 0.5
        }).map((el) => el.className)
        return { count: samples.length, hits, switchW: sw.w }
      })
      expect(found.switchW, 'the switch is drawn').toBeGreaterThan(0)
      expect(found.count, 'the sample has boxes to check against').toBeGreaterThan(0)
      expect(found.hits, 'sample boxes under the switch').toEqual([])
    })
  }
})

test.describe("Random's rows fit on one line on a laptop", () => {
  for (const [w, h] of [[1280, 720], [1440, 900]]) {
    test.describe(`${w}x${h}`, () => {
      test.use({ viewport: { width: w, height: h } })
      test(`Random's Hue, Tone and Colours rows are one line at ${w}x${h}, with More options open`, async ({ page }) => {
        watch(page, 'a designer on a laptop reading Random\'s options')
        await open(page)
        const gen = panelOf(page).locator('.grd-gen')
        await gen.getByRole('button', { name: 'More options' }).click()
        await expect(gen.getByRole('button', { name: 'Fewer options' })).toBeVisible()
        for (const row of ['Hue', 'Tone', 'Colours']) {
          const radios = gen.getByRole('radiogroup', { name: row, exact: true }).getByRole('radio')
          const n = await radios.count()
          expect(n, `${row} has its options`).toBeGreaterThanOrEqual(3)
          const tops = []
          const heights = []
          for (let i = 0; i < n; i++) {
            const box = await radios.nth(i).boundingBox()
            tops.push(Math.round(box.y))
            heights.push(Math.round(box.height))
          }
          expect(Math.max(...tops) - Math.min(...tops), `${row}: chip tops ${tops.join(',')}`).toBeLessThanOrEqual(1)
        }
      })
    })
  }
})
