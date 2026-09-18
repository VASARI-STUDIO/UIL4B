// Regression coverage for the founder-reported palette + gradient batch.
//
// Each block names the bug it guards, because each of these shipped once and
// the reason they shipped is that nothing measured the RENDERED result. These
// tests measure the rendered result.
import { test, expect } from './base.js'
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
    await go(page, '/create/palette')

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
    // the input's own value + input event, which is exactly what a drag emits.
    // Arrow keys would work too now — that trap was fixed in founder batch 2,
    // see 16-founder-batch-2.spec.js — but a drag is what this test is about.)
    await hue.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, '40')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // 40°, not 140° — the hue track is ±50 as of founder batch 4.
    await expect(hue).toHaveValue('40')
    const moved = await read()
    expect(moved.handle, 'the lens follows the handle along the track').not.toBe(atZero.handle)
    // Still true after batch 4 made the OTHER three tracks follow this slider:
    // no track is ever a function of its own value, so the bar under an active
    // thumb is stable for the whole drag. That is the property that lets the
    // hue bar be repainted for the saturation/tone/temperature sliders without
    // it moving beneath the pointer holding it.
    expect(moved.track, 'the track itself does not rebuild while dragging').toBe(atZero.track)
  })

  test('BATCH 4: dragging one slider repaints the other three tracks', async ({ page }) => {
    watch(page, 'designer pulling hue and reading the other three bars')
    await go(page, '/create/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await expect(hue).toBeVisible()

    // The founder's report: "if i change the hue slider to an orange colour the
    // other sliders are still blue". The tracks were memoised on the base
    // palette alone, so three of the four bars previewed a palette that had
    // already been replaced on screen.
    const trackOf = (id) => page.locator(`#${id}`).evaluate(
      (el) => el.closest('.snapv').style.getPropertyValue('--snapv-track'))

    const before = { s: await trackOf('plb-s'), b: await trackOf('plb-b'), temp: await trackOf('plb-temp') }

    await hue.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, '45')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await expect(hue).toHaveValue('45')

    // The stops are rebuilt from a deferred value, so give React the frame it
    // is explicitly allowed to take before reading (see the deferredAdjust note
    // in PaletteBuilder.jsx — 36 CAM16 round trips have no business running on
    // every frame of a scrub).
    for (const key of ['s', 'b', 'temp']) {
      await expect
        .poll(() => trackOf(`plb-${key}`), `the ${key} track follows the hue slider`)
        .not.toBe(before[key])
    }
  })

  test('the handle stays visible against the lightest and darkest track colours, in both themes', async ({ page }) => {
    watch(page, 'designer checking the handle against extreme track colours')
    await go(page, '/create/palette')

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
    await go(page, '/create/type-scale')
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
 * but this label was ABSOLUTELY positioned, so its inline size was indefinite
 * and `1fr` resolved to 0px. Hovering opened an empty pill with no text in it.
 *
 * The label has since moved INTO the button's normal flow (founder batch 2 —
 * it used to overlay its neighbours). The guarantee these tests exist for is
 * unchanged and still the one that broke: the `1fr` track must resolve to the
 * label's REAL text width. Where that width now sits — inside the button's own
 * bounding box — is asserted in 16-founder-batch-2.spec.js. */

test.describe('Palette Builder · toolbar icon buttons', () => {
  test('hovering an icon button reveals its label at the label\'s real width', async ({ page }) => {
    watch(page, 'designer exploring the toolbar')
    await go(page, '/create/palette')

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
    expect(collapsed.opacity, 'collapsed by default').toBe(0)
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
    await go(page, '/create/palette')

    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()
    const buttons = page.locator('.plb-icobtn:visible')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(3)

    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i)
      const name = (await b.getAttribute('aria-label')) || `button ${i}`
      // Leave the toolbar first: the labels expand the buttons themselves now,
      // so hovering straight from one to the next races the layout shift the
      // previous expansion causes.
      await page.mouse.move(700, 600)
      await page.waitForTimeout(320)
      await b.hover()
      await expect.poll(
        async () => b.evaluate((el) => el.querySelector('.plb-lbl-i').getBoundingClientRect().width),
        { timeout: 3000, message: `${name} must reveal its label` },
      ).toBeGreaterThan(10)
    }

    // Keyboard focus must reveal it too — the label is the button's only
    // visible name, so a keyboard user cannot be left with a blank chip.
    await page.mouse.move(700, 600)
    await page.waitForTimeout(320)
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
    await go(page, '/create/gradient')

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
    await go(page, '/create/gradient')

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
    await go(page, '/create/gradient')
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
  test('a signed-out creator is asked to sign in before the review form exists', async ({ page }) => {
    watch(page, 'signed-out designer sharing a gradient')
    await go(page, '/create/gradient')

    const submit = page.getByRole('button', { name: 'Submit for review' })
    await submit.click()
    // CREATE AN ACCOUNT, NOT "LOG IN TO CONTINUE". This asserted the log-in
    // title until 2026-09-18, and the title was the defect: the gate is only
    // reached when there is no uid, so everybody who sees it is somebody with
    // no account, and it was greeting them with a form for one they have never
    // made. `signup: true` now opens it on the create-account form, matching
    // PaletteBuilder's save and the export gate. Nobody is stranded — the
    // dialog's own toggle reads "Already have an account? Sign in".
    const login = page.getByRole('dialog', { name: /create your free account/i })
    await expect(login).toBeVisible()
    // What the gate is really for is unchanged and still checked: it names the
    // action, it states the review promise, and the review form does not exist
    // behind it.
    await expect(login).toContainText('submit a gradient to the community library')
    await expect(login).toContainText('reviewed before it appears')
    await expect(page.getByRole('dialog', { name: 'Submit a gradient for review' })).toHaveCount(0)
  })

  test('dismissing the sign-in gate queues nothing and returns focus to submit', async ({ page }) => {
    watch(page, 'designer dismissing community sign-in')
    await go(page, '/create/gradient')
    const submit = page.getByRole('button', { name: 'Submit for review' })
    await submit.click()
    await page.keyboard.press('Escape')

    // The create-account title, matching the gate above. Left as the log-in
    // title this would pass on a locator that matches nothing, which is a
    // dismissal test that stopped checking the dismissal.
    await expect(page.getByRole('dialog', { name: /create your free account/i })).toBeHidden()
    await expect(submit).toBeFocused()
    await expect(page.getByRole('dialog', { name: 'Submit a gradient for review' })).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('vs-gradient-submissions'))).toBeNull()
  })
})
