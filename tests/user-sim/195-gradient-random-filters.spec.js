// /create/gradient: Hue, Back, the Pro gate on Use and Base colour, and the toolbar
// with Random narrowed and Back enabled.
//
// Hue is judged on the stop hexes the page paints, with a colour conversion written
// out here (sRGB to OKLab to OKLCH hue), not by importing the product's own. Warm
// is the OKLCH hue arc 345 up through 0 to 95; Cool is 175 to 300. A stop with
// chroma under 0.02 has no hue worth judging (the product skips it too), and a run
// must still have judged some stops, so a page that paints only greys cannot pass.
// The control run (Hue = Any) must leave the arc, or the arc check proves nothing.
//
// MUTATIONS (each turns the tests named red):
//   the Hue chips not narrowing the roll (moodFor returns no hue)  -> "Hue = Warm ..." and "Hue = Cool ..."
//   goBack restoring nothing (or the stops without the type/angle) -> "Back restores ..."
//   pushHistory not called by Random                              -> "Back restores ...", "Back is disabled ..."
//   the Use or Base lock button not calling onPro                 -> "a free account ... Use", "... Base colour"
//   .grd-random.is-narrowed or .grd-back wider than the row       -> "the toolbar is one row ..."
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const panelOf = (page) => page.getByRole('complementary', { name: 'Gradient controls' })
const genOf = (page) => panelOf(page).locator('.grd-gen')
const radio = (page, group, name) => genOf(page).getByRole('radiogroup', { name: group === 'Use' ? /^Use( Pro)?$/ : group, exact: group !== 'Use' }).getByRole('radio', { name, exact: true })
const toolbar = (page) => page.locator('[data-tool-toolbar]')
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

async function open(page) {
  await go(page, ROUTE)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(panelOf(page)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

const moreButton = (page) => page.locator('[data-tl-more] button').first()
/** Presses a toolbar action: the button when drawn, otherwise its row in the More menu. */
async function pressAction(page, name) {
  const direct = toolbar(page).getByRole('button', { name, exact: true }).first()
  if ((await direct.count()) && (await direct.isVisible())) { await direct.click(); return }
  if (!(await page.locator('.tl-menu-row').first().isVisible().catch(() => false))) await moreButton(page).click()
  await page.locator('.tl-menu-row').filter({ hasText: new RegExp(`^${name}$`) }).first().click()
  await settle(page)
}
const pressRandom = (page) => pressAction(page, 'Random')

/** Each stop's hex, in list order. */
const hexes = (page) => page.evaluate(() => [...document.querySelectorAll('.grd-stop-select')]
  .map((b) => /#[0-9A-Fa-f]{6}/.exec(b.getAttribute('aria-label'))[0].toUpperCase()))
/** Everything that makes the gradient what it is: the canvas's own CSS (stops, positions, type, angle, space), the list, the lock marks. */
const look = (page) => page.evaluate(() => ({
  css: document.querySelector('.grd-canvas').style.background,
  type: document.querySelector('.grd-canvas').getAttribute('aria-label'),
  hexes: [...document.querySelectorAll('.grd-stop-select')].map((b) => /#[0-9A-Fa-f]{6}/.exec(b.getAttribute('aria-label'))[0].toUpperCase()),
  colourLocks: [...document.querySelectorAll('.grd-stop-lock')].map((b) => b.getAttribute('aria-pressed')),
}))

// sRGB hex to OKLCH, from Ottosson's published matrices.
function oklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 }
}
const inArc = ([from, to], H) => { let h = H; if (h < from) h += 360; return h <= to }
const WARM = [345, 455]
const COOL = [175, 300]

/** Presses Random `n` times and returns every stop's OKLCH, with the press it came from. */
async function rolled(page, n) {
  const out = []
  for (let i = 0; i < n; i++) {
    await pressRandom(page)
    for (const h of await hexes(page)) out.push({ press: i + 1, hex: h, ...oklch(h) })
  }
  return out
}

test.describe('Hue narrows what Random paints', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a designer asking Random for warm or cool gradients') })

  for (const [word, label, arc] of [['Warm', 'warm (hue 345 through 0 to 95)', WARM], ['Cool', 'cool (hue 175 to 300)', COOL]]) {
    test(`Hue = ${word}: every coloured stop of twenty-five Randoms is ${label}`, async ({ page }) => {
      await open(page)
      await radio(page, 'Hue', word).click()
      await expect(radio(page, 'Hue', word)).toHaveAttribute('aria-checked', 'true')
      const stops = await rolled(page, 25)
      const judged = stops.filter((s) => s.C >= 0.02)
      expect(judged.length, 'enough stops had a hue to judge').toBeGreaterThan(25)
      const off = judged.filter((s) => !inArc(arc, s.H)).map((s) => `press ${s.press}: ${s.hex} hue ${s.H.toFixed(0)}`)
      expect(off, `stops outside the ${word} arc`).toEqual([])
    })
  }

  test('control: with Hue = Any the same count of presses leaves the warm arc (so the arc check can fail)', async ({ page }) => {
    await open(page)
    const stops = await rolled(page, 25)
    const outside = stops.filter((s) => s.C >= 0.02 && !inArc(WARM, s.H))
    expect(outside.length, 'Random with no Hue paints hues outside warm').toBeGreaterThan(0)
  })
})

test.describe('Back', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const back = (page) => toolbar(page).getByRole('button', { name: 'Back to the previous gradient' })

  test('Back is disabled until something has been replaced, and enabled after a Random', async ({ page }) => {
    watch(page, 'a designer looking for Back on a fresh page')
    await open(page)
    await expect(back(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(back(page)).toHaveAttribute('title', 'Nothing to go back to yet')
    await pressRandom(page)
    await expect(back(page)).not.toHaveAttribute('aria-disabled', /.*/)
    await expect(back(page)).toHaveAttribute('title', 'Back to the previous gradient')
  })

  test('Back restores the previous gradient exactly, one Random at a time, back to where it began', async ({ page }) => {
    watch(page, 'a designer stepping back through Randoms')
    await open(page)
    const looks = [await look(page)]
    for (let i = 0; i < 3; i++) {
      await pressRandom(page)
      const now = await look(page)
      expect(now.css, `Random ${i + 1} changed the gradient`).not.toBe(looks[looks.length - 1].css)
      looks.push(now)
    }
    for (let i = 2; i >= 0; i--) {
      await back(page).click()
      expect(await look(page), `Back to look ${i}`).toEqual(looks[i])
    }
    await expect(back(page), 'nothing left to go back to').toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('.toast.show')).toContainText('Back to the previous gradient')
  })

  test('Back brings back the lock marks the earlier gradient had', async ({ page }) => {
    watch(page, 'a designer who unlocked a stop after a Random')
    await open(page)
    const locks = page.locator('.grd-stop-lock')
    await locks.first().click()
    await expect(locks.first()).toHaveAttribute('aria-pressed', 'true')
    const before = await look(page)
    await pressRandom(page)
    await locks.first().click()
    await expect(locks.first()).toHaveAttribute('aria-pressed', 'false')
    await back(page).click()
    expect(await look(page)).toEqual(before)
    await expect(locks.first()).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Use and Base colour on a free account', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const modal = (page) => page.getByRole('dialog')

  async function openMore(page) {
    const toggle = genOf(page).getByRole('button', { name: /^(More|Fewer) options$/ })
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    await expect(genOf(page).locator('#grd-gen-more')).toBeVisible()
  }
  /**
   * The modal's way to the plans page. It is a button, not a link, so there is no href: a press
   * navigates to /plans. "See all plans" is drawn whether or not the price service answered (the main
   * button waits for a price, and the suite serves none) and goes to /plans without a ?plan= cadence.
   */
  async function ctaGoesToPlans(page) {
    const cta = modal(page).getByRole('button', { name: 'See all plans' }).first()
    await expect(cta).toBeEnabled()
    await cta.click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/plans')
  }

  test('a free account pressing a Use chip meets the Pro modal, nothing is chosen, and its button goes to /plans', async ({ page }) => {
    watch(page, 'a free designer pressing Use')
    await signIn(page, { plan: 'free' })
    await open(page)
    await openMore(page)
    await expect(radio(page, 'Use', 'Hero')).toHaveAttribute('aria-disabled', 'true')
    await radio(page, 'Use', 'Hero').evaluate((el) => el.click())
    await expect(modal(page)).toBeVisible()
    await expect(radio(page, 'Use', 'Any'), 'the press chose nothing').toHaveAttribute('aria-checked', 'true')
    await expect(radio(page, 'Use', 'Hero')).toHaveAttribute('aria-checked', 'false')
    await ctaGoesToPlans(page)
  })

  test('a free account pressing Base colour meets the Pro modal, no base is set, and its button goes to /plans', async ({ page }) => {
    watch(page, 'a free designer pressing Base colour')
    await signIn(page, { plan: 'free' })
    await open(page)
    await openMore(page)
    const base = genOf(page).getByRole('button', { name: 'Base colour (Pro)' })
    await expect(base).toHaveAttribute('aria-disabled', 'true')
    await base.evaluate((el) => el.click())
    await expect(modal(page)).toBeVisible()
    await expect(genOf(page).locator('.grd-gen-hex'), 'no base colour was set').toHaveText('None')
    await ctaGoesToPlans(page)
  })
})

test.describe('the toolbar with Random narrowed and Back enabled', () => {
  for (const w of [320, 390, 768, 1440]) {
    test(`is one row at ${w}px`, async ({ page }) => {
      watch(page, 'a designer with a narrowed Random and a gradient to go back to')
      await page.setViewportSize({ width: w, height: w >= 768 ? 900 : 844 })
      await open(page)
      await radio(page, 'Hue', 'Warm').click()
      await pressRandom(page) // narrowed by Hue, and Back now has somewhere to go
      const random = toolbar(page).getByRole('button', { name: 'Random', exact: true })
      if (await random.isVisible().catch(() => false)) await expect(random, 'Random shows it is narrowed').toHaveClass(/is-narrowed/)
      const back = toolbar(page).getByRole('button', { name: 'Back to the previous gradient' })
      if (await back.isVisible().catch(() => false)) await expect(back, 'Back is enabled').not.toHaveAttribute('aria-disabled', /.*/)
      await settle(page)
      const row = await toolbar(page).evaluate((bar) => {
        const kids = [...bar.children].filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && getComputedStyle(el).position !== 'absolute'
        })
        const mids = kids.map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + r.height / 2) })
        return {
          kids: kids.length,
          spread: Math.max(...mids) - Math.min(...mids),
          right: Math.round(Math.max(...kids.map((el) => el.getBoundingClientRect().right))),
          vw: window.innerWidth,
          scrolls: bar.scrollWidth > bar.clientWidth + 1,
        }
      })
      expect(row.kids, 'the toolbar has its controls').toBeGreaterThan(2)
      expect(row.spread, `one row: every control is centred on the same line (${JSON.stringify(row)})`).toBeLessThanOrEqual(2)
      expect(row.right, 'nothing runs past the viewport').toBeLessThanOrEqual(row.vw)
      expect(row.scrolls, 'the row does not scroll sideways').toBe(false)
    })
  }
})
