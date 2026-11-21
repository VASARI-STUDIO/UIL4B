// VERIFY BAR TOUCH TARGETS, AND ONE FOCUS RING COLOUR ON THE STYLED DROPDOWNS.
//
// Spec 104 pins the bar's tab order, focus hand-off and fixed height, and that
// Resend and Dismiss have *some* pad on a touch screen. It does not say how big
// the pad makes the target. This spec measures it: the vertical run of pixels a
// thumb lands on the Resend button, and the box around Dismiss, must reach 44px
// on a phone and on a touch tablet, with the bar's height unchanged.
//
// The pad is an ::after on each button, which boundingBox() cannot see, so the
// target is read by sampling document.elementFromPoint along the button's
// centre line.
//
// Each test names the change that makes it fail.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const bar = (page) => page.getByTestId('verify-notice')

// How far, in CSS px, a point on the button's own centre line still hits the
// button, going out from its middle in each direction.
async function reach(locator) {
  const box = await locator.boundingBox()
  return locator.evaluate((el, b) => {
    const cx = b.x + b.width / 2
    const cy = b.y + b.height / 2
    const hits = (x, y) => document.elementFromPoint(x, y) === el
    const run = (dx, dy) => {
      let n = 0
      while (n < 80 && hits(cx + dx * (n + 1), cy + dy * (n + 1))) n += 1
      return n
    }
    return { up: run(0, -1), down: run(0, 1), left: run(-1, 0), right: run(1, 0) }
  }, box)
}

const total = (r) => ({ height: r.up + r.down + 1, width: r.left + r.right + 1 })

async function openBar(page, width) {
  await signIn(page, { plan: 'free', emailVerified: false })
  await go(page, '/projects')
  await expect(bar(page)).toBeVisible()
  const bh = await bar(page).evaluate((el) => el.getBoundingClientRect().height)
  expect(bh, 'the bar keeps its fixed height').toBeLessThanOrEqual(width <= 520 ? 55 : 63)
}

async function measure(page) {
  const resend = bar(page).getByRole('button', { name: /^Resend/ })
  const dismiss = bar(page).getByRole('button', { name: 'Dismiss verification reminder' })
  return { resend: total(await reach(resend)), dismiss: total(await reach(dismiss)) }
}

// A phone and two touch tablets. isMobile gives (pointer: coarse); the width
// alone must not decide it.
for (const [width, height] of [[390, 800], [768, 1024], [820, 1180]]) {
  test.describe(`touch screen at ${width}px`, () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width, height } })

    // FAILS IF: global.css `.verify-notice .btn-s::after` insets shrink below
    // -9px 0 (Resend's pad; the button is about 28px tall), or the `@media (max-width:520px),(pointer:coarse)`
    // query loses the (pointer:coarse) half.
    test('Resend is a 44px-tall target without growing the bar', async ({ page }) => {
      watch(page, 'a person tapping Resend with a thumb')
      await openBar(page, width)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
      const { resend } = await measure(page)
      expect(resend.height, `Resend is ${resend.height}px tall to a thumb`).toBeGreaterThanOrEqual(44)
      await page.screenshot({ path: `.claude/scratch/misc6/verify-bar-${width}.png` })
    })

    // FAILS IF: `.verify-notice .sync-notice-dismiss::after` insets shrink, or
    // the 24px Dismiss loses its pad on coarse pointers.
    test('Dismiss is at least 44px each way', async ({ page }) => {
      watch(page, 'a person tapping Dismiss with a thumb')
      await openBar(page, width)
      const { dismiss } = await measure(page)
      expect(dismiss.height, `Dismiss is ${dismiss.height}px tall to a thumb`).toBeGreaterThanOrEqual(44)
      expect(dismiss.width, `Dismiss is ${dismiss.width}px wide to a thumb`).toBeGreaterThanOrEqual(44)
    })
  })
}

// The control: with a mouse the buttons keep their own size, so the pad is a
// touch affordance and not a bigger hit area on every screen.
// FAILS IF: the pad moves out of the coarse-pointer query to apply everywhere.
test.describe('a mouse at 1280px', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('Resend keeps its own height (control)', async ({ page }) => {
    watch(page, 'a person with a mouse')
    await openBar(page, 1280)
    const { resend } = await measure(page)
    expect(resend.height, 'Resend has no extra pad for a mouse').toBeLessThan(44)
  })
})

// The styled dropdowns' closed trigger and the app's other controls share one
// focus ring colour (--link). Spec 243 pins it on the Type Scale trigger; this
// pins it on the Icon Library pack menu, whose trigger carries its own class.
// FAILS IF: `.menu-select-trigger:focus-visible` goes back to `var(--accent)`,
// or `.lbry-select` sets its own outline colour.
test.describe('the Icon pack trigger ring', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('is the link colour, as the other controls', async ({ page }) => {
    watch(page, 'a keyboard user on the Icon pack menu')
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    const trigger = page.getByRole('button', { name: 'Icon pack' })
    await expect(trigger).toBeVisible()
    await page.keyboard.press('Shift')
    await trigger.focus()
    await expect(trigger).toBeFocused()
    const ring = await trigger.evaluate((el) => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--link)'
      // Beside the trigger, so it reads --link in the same scope (a library
      // surface can set its own).
      el.parentElement.append(probe)
      const link = getComputedStyle(probe).color
      probe.remove()
      const cs = getComputedStyle(el)
      return { link, color: cs.outlineColor, width: cs.outlineWidth, matches: el.matches(':focus-visible') }
    })
    expect(ring.matches, 'focus-visible').toBe(true)
    expect(ring.width).toBe('2px')
    expect(ring.color).toBe(ring.link)
  })
})
