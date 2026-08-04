// Regression coverage for the founder-reported palette + gradient batch.
//
// Each block names the bug it guards, because each of these shipped once and
// the reason they shipped is that nothing measured the RENDERED result. These
// tests measure the rendered result.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

// The near-black outer ring. The production minifier may serialise
// rgba(11,13,16,.82) as #0b0d10d1, so accept either spelling of the same colour.
const DARK_RING = /rgba\(11,\s*13,\s*16|#0b0d10/i

/* ── 1 · The adjust slider handle is a lens onto its own track ────────────────
 * Was: the thumb was a solid white disc painted over the coloured track, so it
 * hid the exact colour the position represents. */

test.describe('Palette Builder · global-adjust slider handles', () => {
  test('the handle centre shows the track colour underneath it, and follows the drag', async ({ page }) => {
    watch(page, 'designer tuning a palette')
    await go(page, '/color/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await expect(hue).toBeVisible()

    // The wrapper carries both custom properties: the painted track and the
    // sampled handle colour. Both must exist, and the handle colour must be a
    // real colour rather than the white fallback baked into the CSS.
    const wrap = page.locator('.snapv--grad').first()
    const read = () => wrap.evaluate((el) => ({
      track: el.style.getPropertyValue('--snapv-track'),
      handle: el.style.getPropertyValue('--snapv-handle'),
    }))

    const atZero = await read()
    expect(atZero.track, 'the track is painted from the palette').toContain('linear-gradient')
    expect(atZero.handle, 'the handle is given a sampled colour').toMatch(/^#[0-9A-F]{6}$/i)

    // At rest the lens sits on a stop the track itself paints — that is the
    // whole guarantee: the dot can never disagree with the bar.
    expect(atZero.track.toUpperCase()).toContain(atZero.handle.toUpperCase())

    // Drag the slider: the dot must follow it, not sit still. (Driven through
    // the input's own value + input event, which is exactly what a drag emits;
    // arrow keys cannot leave a snap point on this track — see the PR notes.)
    await hue.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, '140')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await expect(hue).toHaveValue('140')
    const moved = await read()
    expect(moved.handle, 'the lens follows the handle along the track').not.toBe(atZero.handle)
    expect(moved.track, 'the track itself does not rebuild while dragging').toBe(atZero.track)
  })

  test('the handle stays visible against the lightest and darkest track colours, in both themes', async ({ page }) => {
    watch(page, 'designer checking the handle against extreme track colours')
    await go(page, '/color/palette')

    const tone = page.getByRole('slider', { name: 'Tone adjustment' })
    await expect(tone).toBeVisible()

    // Chrome does not expose ::-webkit-slider-thumb through getComputedStyle,
    // so read the authored rules instead. That is the right level anyway: the
    // guarantee is that the thumb ALWAYS carries both opposed rings, whatever
    // colour lands in its centre and whatever the theme.
    const thumbRules = await page.evaluate(() => {
      const out = []
      for (const sheet of document.styleSheets) {
        let rules
        try { rules = sheet.cssRules } catch { continue }
        for (const rule of rules || []) {
          if (rule.selectorText && /snapv--grad/.test(rule.selectorText) && /slider-thumb|range-thumb/.test(rule.selectorText)) {
            out.push({ selector: rule.selectorText, css: rule.style.cssText })
          }
        }
      }
      return out
    })

    // Chromium discards the ::-moz-range-thumb rules it cannot parse, so only
    // the -webkit- half is visible here. The Firefox half is asserted by the
    // stylesheet itself; what matters in this browser is that the rules that DO
    // apply carry the full treatment.
    const base = thumbRules.filter(r => !/focus-visible/.test(r.selector) && !/:active/.test(r.selector))
    expect(base.length, 'the thumb is styled').toBeGreaterThanOrEqual(1)
    for (const rule of base) {
      // The centre is the track colour, falling back to the old white core.
      expect(rule.css, `${rule.selector}: centre is the sampled track colour`).toMatch(/--snapv-handle/)
      // A white ring immediately around the core (readable on a dark track)…
      expect(rule.css, `${rule.selector}: white inner ring`).toMatch(/border(?:-color)?:\s*2px solid (?:#fff|rgb\(255, 255, 255\))|border:\s*2px solid #fff/i)
      // …inside a near-black one (readable on a light track). One always contrasts.
      expect(rule.css, `${rule.selector}: dark outer ring`).toMatch(DARK_RING)
    }

    const focusRules = thumbRules.filter(r => /focus-visible/.test(r.selector))
    expect(focusRules.length, 'focus is styled on the thumb').toBeGreaterThanOrEqual(1)
    for (const rule of focusRules) {
      // The accent ring sits OUTSIDE the near-black one, so focus stays visible
      // over any track colour rather than being swallowed by it.
      expect(rule.css).toMatch(DARK_RING)
      expect(rule.css).toMatch(/var\(--accent\)/)
    }

    // The rings are theme-independent by design: identical in light and dark.
    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      for (const value of ['-100', '100']) {   // darkest / lightest end of the tone track
        await tone.evaluate((el, v) => {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
          setter.call(el, v)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }, value)
        const handle = await page.locator('.snapv--grad').nth(2).evaluate(el => el.style.getPropertyValue('--snapv-handle'))
        expect(handle, `${theme} @ ${value}: a real colour reaches the lens`).toMatch(/^#[0-9A-F]{6}$/i)
      }
    }
  })

  test('a SnapSlider with no track colour is untouched — other consumers keep the platform thumb', async ({ page }) => {
    watch(page, 'designer using the type scale sliders')
    // Type Scale drives plain SnapSliders — no gradient, so no custom thumb.
    await go(page, '/typescale')
    await expect(page.locator('.snapv').first()).toBeVisible()
    const plain = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.snapv')]
      return {
        total: all.length,
        withGradient: all.filter(el => el.classList.contains('snapv--grad')).length,
        anyTrack: all.some(el => el.style.getPropertyValue('--snapv-track')),
        anyHandleColour: all.some(el => el.style.getPropertyValue('--snapv-handle')),
      }
    })
    expect(plain.total).toBeGreaterThan(0)
    expect(plain.withGradient, 'these sliders were never given a track').toBe(0)
    expect(plain.anyTrack).toBe(false)
    expect(plain.anyHandleColour, 'no gradient means no custom thumb').toBe(false)
  })
})

/* ── 2 · Icon-button hover reveals its label ──────────────────────────────────
 * Was: v2.8 migrated the reveal label from max-width to grid-template-columns,
 * but this label is ABSOLUTELY positioned, so its inline size was indefinite
 * and `1fr` resolved to 0px. Hovering opened an empty pill with no text in it. */

test.describe('Palette Builder · toolbar icon buttons', () => {
  test('hovering an icon button reveals its label at the label\'s real width', async ({ page }) => {
    watch(page, 'designer exploring the toolbar')
    await go(page, '/color/palette')

    const button = page.getByRole('button', { name: 'Preview' })
    await expect(button).toBeVisible()

    const measure = () => button.evaluate((b) => {
      const label = b.querySelector('.plb-lbl')
      const inner = b.querySelector('.plb-lbl-i')
      const cs = getComputedStyle(label)
      return {
        text: inner.textContent.trim(),
        innerWidth: inner.getBoundingClientRect().width,
        naturalWidth: inner.scrollWidth,
        labelWidth: label.getBoundingClientRect().width,
        visibility: cs.visibility,
        opacity: Number(cs.opacity),
      }
    })

    const collapsed = await measure()
    expect(collapsed.visibility, 'collapsed by default').toBe('hidden')
    expect(collapsed.innerWidth).toBeLessThan(1)
    expect(collapsed.naturalWidth, 'the label has real text to reveal').toBeGreaterThan(10)

    await button.hover()
    // The transition is --dur-3 (280ms); wait for it to settle rather than race it.
    await expect.poll(async () => (await measure()).opacity, { timeout: 3000 }).toBe(1)
    const revealed = await measure()

    expect(revealed.visibility).toBe('visible')
    // THE regression: the pill opened but the text track stayed 0px wide.
    expect(revealed.innerWidth, 'the label text is actually laid out, not a 0px track').toBeGreaterThan(10)
    expect(Math.abs(revealed.innerWidth - collapsed.naturalWidth))
      .toBeLessThanOrEqual(1)   // 1fr resolved to the REAL content width
    expect(revealed.labelWidth, 'the pill is wider than its own padding').toBeGreaterThan(revealed.innerWidth)
  })

  test('every icon button in the toolbar reveals real text, on hover and on focus', async ({ page }) => {
    watch(page, 'keyboard user in the toolbar')
    await go(page, '/color/palette')

    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()
    const buttons = page.locator('.plb-icobtn:visible')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(3)

    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i)
      const name = (await b.getAttribute('aria-label')) || `button ${i}`
      await b.hover()
      await expect.poll(
        async () => b.evaluate((el) => el.querySelector('.plb-lbl-i').getBoundingClientRect().width),
        { timeout: 3000, message: `${name} must reveal its label` },
      ).toBeGreaterThan(10)
    }

    // Keyboard focus must reveal it too — the label is the button's only
    // visible name, so a keyboard user cannot be left with a blank chip.
    const first = buttons.first()
    await first.focus()
    await expect.poll(
      async () => first.evaluate((el) => el.querySelector('.plb-lbl-i').getBoundingClientRect().width),
      { timeout: 3000 },
    ).toBeGreaterThan(10)
  })
})

/* ── 3 · Adding a gradient stop is one press-and-drag gesture ─────────────────
 * Was: stops were created on the rail's CLICK, i.e. on pointer-up, so pressing
 * and dragging showed nothing at all until release and the new stop could not
 * be fine-tuned in the same gesture. */

test.describe('Gradient Generator · adding and fine-tuning a stop', () => {
  test('pressing the rail creates a visible handle that drags in the same gesture', async ({ page }) => {
    watch(page, 'designer placing a gradient stop')
    await go(page, '/color/gradient')

    const rail = page.locator('.ggn-bar')
    await expect(rail).toBeVisible()
    await rail.scrollIntoViewIfNeeded()
    const before = await page.locator('.ggn-handle').count()

    const box = await rail.boundingBox()
    const y = box.y + box.height / 2
    const startX = box.x + box.width * 0.3

    await page.mouse.move(startX, y)
    await page.mouse.down()

    // THE regression: the handle must exist and be visible from the press, not
    // appear only once the gesture ends.
    await expect(page.locator('.ggn-handle')).toHaveCount(before + 1)
    const dragged = page.locator('.ggn-handle.is-dragging')
    await expect(dragged).toHaveCount(1)
    await expect(dragged).toBeVisible()

    // The live position readout is on screen while dragging, so the adjustment
    // is read rather than guessed.
    const readout = dragged.locator('.ggn-handle-val')
    await expect(readout).toBeVisible()
    const atPress = await readout.textContent()

    // Fine-tune within the same gesture.
    await page.mouse.move(box.x + box.width * 0.72, y, { steps: 12 })
    await expect(readout).toBeVisible()
    await expect.poll(async () => readout.textContent()).not.toBe(atPress)
    const atEnd = Number((await readout.textContent()).replace('%', ''))
    expect(atEnd).toBeGreaterThan(60)
    expect(atEnd).toBeLessThanOrEqual(100)

    await page.mouse.up()
    await expect(page.locator('.ggn-handle')).toHaveCount(before + 1, { timeout: 3000 })
    await expect(page.locator('.ggn-handle.is-dragging')).toHaveCount(0)

    // Releasing must NOT add a second stop — the old click-to-add path is gone.
    await expect(page.getByText(`${before + 1}/12 stops`)).toBeVisible()
  })

  test('a newly added stop takes focus so the arrow keys nudge it straight away', async ({ page }) => {
    watch(page, 'keyboard-first designer')
    await go(page, '/color/gradient')

    const rail = page.locator('.ggn-bar')
    await expect(rail).toBeVisible()
    await rail.scrollIntoViewIfNeeded()
    const box = await rail.boundingBox()
    const y = box.y + box.height / 2
    await page.mouse.click(box.x + box.width * 0.4, y)

    const focused = await page.evaluate(() => document.activeElement?.className || '')
    expect(focused, 'the new handle owns focus').toContain('ggn-handle')

    const label = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '')
    const start = Number(/at (\d+)%/.exec(await label())?.[1])

    await page.keyboard.press('ArrowRight')
    expect(Number(/at (\d+)%/.exec(await label())?.[1])).toBe(start + 1)
    await page.keyboard.press('Shift+ArrowRight')
    expect(Number(/at (\d+)%/.exec(await label())?.[1])).toBe(start + 11)
    await page.keyboard.press('ArrowLeft')
    expect(Number(/at (\d+)%/.exec(await label())?.[1])).toBe(start + 10)

    // The keyboard user gets the same readout the dragger does.
    await expect(page.locator('.ggn-handle:focus-visible .ggn-handle-val')).toBeVisible()
  })

  test('a touch drag moves the stop instead of scrolling the page away', async ({ page }) => {
    watch(page, 'designer on a touch screen')
    await go(page, '/color/gradient')
    await expect(page.locator('.ggn-handle').first()).toBeVisible()
    // touch-action:none on the rail and handles is what stops the page scroller
    // claiming the gesture. Without it a touch drag never reaches the tool.
    const actions = await page.evaluate(() => ({
      rail: getComputedStyle(document.querySelector('.ggn-bar')).touchAction,
      handle: getComputedStyle(document.querySelector('.ggn-handle')).touchAction,
    }))
    expect(actions.rail).toBe('none')
    expect(actions.handle).toBe('none')
  })
})

/* ── 5 · Submitting a gradient degrades honestly ──────────────────────────── */

test.describe('Gradient Generator · submit for review', () => {
  test('a submitted gradient is queued for review, and says so', async ({ page }) => {
    watch(page, 'designer sharing a gradient')
    await go(page, '/color/gradient')

    await page.getByRole('button', { name: 'Submit for review' }).click()
    const modal = page.getByRole('dialog', { name: 'Submit a gradient for review' })
    await expect(modal).toBeVisible()
    // The honesty contract: the user is told it is queued, not published.
    await expect(modal.getByText(/not published/i)).toBeVisible()

    await modal.getByRole('textbox').first().fill('Harbour Dusk')
    await modal.getByRole('button', { name: 'Queue for review' }).click()
    await expect(modal).toBeHidden()

    // It appears in the gallery as PENDING, never as a library gradient.
    await go(page, '/discover/gradients')
    const queue = page.getByRole('region', { name: 'Your submissions' })
      .or(page.locator('.grg-queue'))
    await expect(queue.first()).toBeVisible()
    await expect(page.getByText('Harbour Dusk')).toBeVisible()
    await expect(page.locator('.grg-queue-status')).toHaveText('Pending review')

    // …and it can be withdrawn again.
    await page.getByRole('button', { name: 'Withdraw' }).click()
    await expect(page.locator('.grg-queue')).toHaveCount(0)
  })

  test('a submission without a name is refused rather than stored blank', async ({ page }) => {
    watch(page, 'designer in a hurry')
    await go(page, '/color/gradient')
    await page.getByRole('button', { name: 'Submit for review' }).click()
    const modal = page.getByRole('dialog', { name: 'Submit a gradient for review' })
    await modal.getByRole('button', { name: 'Queue for review' }).click()
    await expect(modal.getByRole('alert')).toHaveText('Give your gradient a name.')
    await expect(modal).toBeVisible()
  })
})
