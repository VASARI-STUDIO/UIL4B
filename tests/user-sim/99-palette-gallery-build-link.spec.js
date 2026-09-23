// /discover/palettes: "Create a palette" is the page's primary action, in BOTH
// themes, at rest and on hover.
//
// It was a hard-coded #111113 fill with white text. In light that is a strong
// black button; in dark it sat on a #111215 card at 1.01:1 — a label floating
// on nothing — and its hover mixed toward --t0, which in dark is near-white,
// so the white label fell to 1.53:1 (QA on #487, palettes dark).
//
// Colours are read through a canvas: the tokens are color-mix()es, which
// Chromium serialises as color(srgb …).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

async function colours(link) {
  return link.evaluate((el) => {
    const toRgb = (c) => {
      const x = document.createElement('canvas').getContext('2d')
      x.fillStyle = c
      x.fillRect(0, 0, 1, 1)
      return Array.from(x.getImageData(0, 0, 1, 1).data.slice(0, 3))
    }
    // The first ancestor that actually paints a ground.
    let n = el.parentElement
    let ground = null
    while (n) {
      const bg = getComputedStyle(n).backgroundColor
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { ground = bg; break }
      n = n.parentElement
    }
    ground = ground || getComputedStyle(document.body).backgroundColor
    const cs = getComputedStyle(el)
    return { fill: toRgb(cs.backgroundColor), ink: toRgb(cs.color), ground: toRgb(ground) }
  })
}

const lum = (rgb) => rgb.map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

for (const theme of ['light', 'dark']) {
  test(`the build link is a visible, readable primary in ${theme}, at rest and on hover`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: theme, viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, `someone browsing palettes in ${theme}`)
    await go(page, '/discover/palettes')
    const link = page.locator('.pgl-build-link')
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/create/palette')

    const rest = await colours(link)
    expect(ratio(rest.fill, rest.ground), `${theme}: the button fill against its ground ${rest.fill} on ${rest.ground}`).toBeGreaterThanOrEqual(3)
    expect(ratio(rest.ink, rest.fill), `${theme}: the label on the fill`).toBeGreaterThanOrEqual(4.5)

    await link.hover()
    await expect.poll(async () => JSON.stringify((await colours(link)).fill), { message: 'hover changed nothing' }).not.toBe(JSON.stringify(rest.fill))
    // Let the transition finish before reading the hover state.
    await page.waitForTimeout(400)
    const hover = await colours(link)
    expect(ratio(hover.ink, hover.fill), `${theme}: the label on the hover fill ${hover.ink} on ${hover.fill}`).toBeGreaterThanOrEqual(4.5)
    await ctx.close()
  })
}
