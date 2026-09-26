// Regression coverage for a batch of reported palette + gradient bugs.
//
// Each block names the bug it guards, because each of these shipped once and
// the reason they shipped is that nothing measured the RENDERED result. These
// tests measure the rendered result.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'


/* ── 1 · The adjust tracks preview the palette they would produce ─────────────
 * The drawn Adjust bar (D:1037-1044) paints each slider as a 20px gradient
 * pill with a light thumb that carries its own dark shadow. The earlier "lens"
 * thumb, which sampled the track colour into its centre, went with that
 * redraw; what these tests keep is that the tracks are painted from the
 * palette, follow each other, never rebuild under their own thumb, and that
 * the thumb stays visible at both ends of any track. */

const setRange = (locator, value) => locator.evaluate((el, v) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, value)
const trackOf = (page, id) => page.locator(`#${id}`).evaluate((el) => el.style.getPropertyValue('--tl-track'))

test.describe('Palette Builder · global-adjust slider tracks', () => {
  test('the track is painted from the palette, and does not rebuild under its own drag', async ({ page }) => {
    watch(page, 'designer tuning a palette')
    await go(page, '/create/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await expect(hue).toBeVisible()
    await expect.poll(() => trackOf(page, 'plb-h'), 'the track is painted').toContain('linear-gradient')
    const atZero = await trackOf(page, 'plb-h')

    // Drag the slider (driven through the input's own value + input event,
    // which is exactly what a drag emits). No track is ever a function of its
    // own value, so the bar under an active thumb is stable for the whole drag.
    await setRange(hue, '40')
    await expect(hue).toHaveValue('40')
    await page.waitForTimeout(200)
    expect(await trackOf(page, 'plb-h'), 'the track itself does not rebuild while dragging').toBe(atZero)
  })

  test('BATCH 4: dragging one slider repaints the other three tracks', async ({ page }) => {
    watch(page, 'designer pulling hue and reading the other three bars')
    await go(page, '/create/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await expect(hue).toBeVisible()

    // Changing the hue slider to orange must recolour the other sliders' tracks
    // too. The tracks were memoised on the base
    // palette alone, so three of the four bars previewed a palette that had
    // already been replaced on screen.
    await expect.poll(() => trackOf(page, 'plb-s')).toContain('linear-gradient')
    const before = { s: await trackOf(page, 'plb-s'), b: await trackOf(page, 'plb-b'), temp: await trackOf(page, 'plb-temp') }

    await setRange(hue, '45')
    await expect(hue).toHaveValue('45')

    // The stops are rebuilt from a deferred value, so give React the frame it
    // is explicitly allowed to take before reading.
    for (const key of ['s', 'b', 'temp']) {
      await expect
        .poll(() => trackOf(page, `plb-${key}`), `the ${key} track follows the hue slider`)
        .not.toBe(before[key])
    }
  })

  test('the thumb stays visible against the lightest and darkest track colours, in both themes', async ({ page }) => {
    watch(page, 'designer checking the handle against extreme track colours')
    await go(page, '/create/palette')
    await expect(page.getByRole('slider', { name: 'Tone adjustment' })).toBeVisible()

    // Chrome does not expose ::-webkit-slider-thumb through getComputedStyle,
    // so read the authored rules. The guarantee is that the thumb ALWAYS
    // carries both a light core (readable on a dark track) and a dark shadow
    // (readable on a light one), in both themes — the drawn thumb (D:55).
    const thumbRules = await page.evaluate(() => {
      const out = []
      for (const sheet of document.styleSheets) {
        let rules
        try { rules = sheet.cssRules } catch { continue }
        for (const rule of rules || []) {
          if (rule.selectorText && /tl-slider/.test(rule.selectorText) && /slider-thumb/.test(rule.selectorText)) {
            out.push({ selector: rule.selectorText, css: rule.style.cssText })
          }
        }
      }
      return out
    })
    const base = thumbRules.filter(r => /background/.test(r.css))
    expect(base.length, 'the thumb is styled').toBeGreaterThanOrEqual(1)
    for (const rule of base) {
      expect(rule.css, `${rule.selector}: light core`).toMatch(/background(?:-color)?:\s*(?:#fafaf8|rgb\(250, 250, 248\))/i)
      expect(rule.css, `${rule.selector}: dark shadow`).toMatch(/box-shadow:[^;]*rgba\(0,\s*0,\s*0,\s*0?\.6\)/i)
      expect(rule.css, `${rule.selector}: no theme-dependent core`).not.toMatch(/background(?:-color)?:\s*var\(/)
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

/* ── 2 · Every toolbar control can be read ────────────────────────────────────
 * The hover-reveal labels went with the drawn toolbar (D:947-1015), whose
 * buttons carry their words (collapsed to icons below 768px) and whose undo /
 * redo are icon squares. The guarantee kept: no control on the row is a blank
 * chip — each has a name, and one that shows no words explains itself on
 * hover. */

test.describe('Palette Builder · toolbar controls', () => {
  for (const width of [1440, 390]) {
    test(`every control on the row has a name, and an icon-only one a tooltip, at ${width}px`, async ({ page }) => {
      watch(page, 'keyboard user in the toolbar')
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/palette')
      const bar = page.locator('.plb [data-tool-toolbar]')
      await expect(bar).not.toHaveClass(/is-measuring/)
      const rows = await bar.locator('button:visible, a:visible').evaluateAll((els) => els.map((el) => {
        const words = [...el.querySelectorAll('.tl-btn-label, .plb-seedchip-hex')]
          .filter((n) => n.getBoundingClientRect().width > 0)
          .map((n) => n.textContent.trim()).join(' ')
        return { name: el.getAttribute('aria-label') || el.textContent.trim(), words, title: el.getAttribute('title') || '' }
      }))
      expect(rows.length, 'the row has controls').toBeGreaterThan(3)
      for (const r of rows) {
        expect(r.name, 'a control with no name').not.toBe('')
        if (!r.words) expect(r.title, `"${r.name}" shows no words and has no tooltip`).not.toBe('')
      }
    })
  }
})

/* ── 3 · Adding a gradient stop is one press-and-drag gesture ─────────────────
 * Was: stops were created on the rail's CLICK, i.e. on pointer-up, so pressing
 * and dragging showed nothing at all until release and the new stop could not
 * be fine-tuned in the same gesture. */

test.describe('Gradient Generator · adding and fine-tuning a stop', () => {
  test('pressing the rail creates a visible handle that drags in the same gesture', async ({ page }) => {
    watch(page, 'designer placing a gradient stop')
    await go(page, '/create/gradient')

    const rail = page.locator('.grd-rail')
    await expect(rail).toBeVisible()
    await rail.scrollIntoViewIfNeeded()
    const before = await page.locator('.grd-handle').count()

    const box = await rail.boundingBox()
    const y = box.y + box.height / 2
    const startX = box.x + box.width * 0.3

    await page.mouse.move(startX, y)
    await page.mouse.down()

    // THE regression: the handle must exist and be visible from the press, not
    // appear only once the gesture ends.
    await expect(page.locator('.grd-handle')).toHaveCount(before + 1)
    const dragged = page.locator('.grd-handle.is-dragging')
    await expect(dragged).toHaveCount(1)
    await expect(dragged).toBeVisible()

    // The live position readout is on screen while dragging, so the adjustment
    // is read rather than guessed.
    const readout = dragged.locator('.grd-handle-val')
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
    await expect(page.locator('.grd-handle')).toHaveCount(before + 1, { timeout: 3000 })
    await expect(page.locator('.grd-handle.is-dragging')).toHaveCount(0)

    // Releasing must NOT add a second stop — the old click-to-add path is gone.
    await expect(page.locator('.grd-count')).toHaveText(`${before + 1} stops`)
  })

  test('a newly added stop takes focus so the arrow keys nudge it straight away', async ({ page }) => {
    watch(page, 'keyboard-first designer')
    await go(page, '/create/gradient')

    const rail = page.locator('.grd-rail')
    await expect(rail).toBeVisible()
    await rail.scrollIntoViewIfNeeded()
    const box = await rail.boundingBox()
    const y = box.y + box.height / 2
    await page.mouse.click(box.x + box.width * 0.4, y)

    const focused = await page.evaluate(() => document.activeElement?.className || '')
    expect(focused, 'the new handle owns focus').toContain('grd-handle')

    const label = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '')
    const start = Number(/at (\d+)%/.exec(await label())?.[1])

    await page.keyboard.press('ArrowRight')
    expect(Number(/at (\d+)%/.exec(await label())?.[1])).toBe(start + 1)
    await page.keyboard.press('Shift+ArrowRight')
    expect(Number(/at (\d+)%/.exec(await label())?.[1])).toBe(start + 11)
    await page.keyboard.press('ArrowLeft')
    expect(Number(/at (\d+)%/.exec(await label())?.[1])).toBe(start + 10)

    // The keyboard user gets the same readout the dragger does.
    await expect(page.locator('.grd-handle:focus-visible .grd-handle-val')).toBeVisible()
  })

  test('a touch drag moves the stop instead of scrolling the page away', async ({ page }) => {
    watch(page, 'designer on a touch screen')
    await go(page, '/create/gradient')
    await expect(page.locator('.grd-handle').first()).toBeVisible()
    // touch-action:none on the rail and handles is what stops the page scroller
    // claiming the gesture. Without it a touch drag never reaches the tool.
    const actions = await page.evaluate(() => ({
      rail: getComputedStyle(document.querySelector('.grd-rail')).touchAction,
      handle: getComputedStyle(document.querySelector('.grd-handle')).touchAction,
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
    // CREATE AN ACCOUNT, NOT "LOG IN TO CONTINUE". The log-in
    // title would be the defect here: the gate is only
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
