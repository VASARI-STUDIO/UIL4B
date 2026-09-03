// Regression coverage for the second founder-reported Palette Builder batch.
//
// Same rule as batch 1 (14-founder-batch-regressions.spec.js): each of these
// shipped once because nothing measured the RENDERED result. These tests
// measure the rendered result.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

/** Move the pointer well clear of the toolbar so the next hover is a real
 *  enter, and any label opened by the previous hover has collapsed again.
 *  Hovering straight from one expanding button to the next races the layout
 *  shift the expansion itself causes. */
async function leaveToolbar(page) {
  await page.mouse.move(700, 600)
  await page.waitForTimeout(320)   // > --dur-3 (280ms), so the collapse finishes
}

/** Geometry of one icon button and its label, in viewport coordinates. */
function measureIconButton(button) {
  return button.evaluate((el) => {
    const inner = el.querySelector('.plb-lbl-i')
    const b = el.getBoundingClientRect()
    const i = inner.getBoundingClientRect()
    return {
      button: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width },
      label: { left: i.left, right: i.right, top: i.top, bottom: i.bottom, width: i.width },
      natural: inner.scrollWidth,
      opacity: Number(getComputedStyle(el.querySelector('.plb-lbl')).opacity),
      position: getComputedStyle(el.querySelector('.plb-lbl')).position,
    }
  })
}

/* ── 1 · The toolbar label slides open INSIDE the button ──────────────────────
 * Founder: "they should slide open to show the text and it should be in the
 * same box, not hovering over the top."
 * Was: the label was position:absolute with only `left` set, so it painted
 * OUTSIDE the button's layout box, over whatever sat beside it. #202 fixed the
 * related sizing fault (width:max-content) but left the overlay in place. */

test.describe('Palette Builder · toolbar labels expand the button', () => {
  test('the button itself grows and the label lands inside its bounding box', async ({ page }) => {
    watch(page, 'designer exploring the toolbar')
    await go(page, '/create/palette')

    const button = page.getByRole('button', { name: 'Preview' })
    await expect(button).toBeVisible()

    const collapsed = await measureIconButton(button)
    // In FLOW, not painted over the top. This single assertion is the fix.
    expect(collapsed.position, 'the label is in the button\'s normal flow').toBe('static')
    expect(collapsed.label.width, 'collapsed to nothing').toBeLessThan(1)
    expect(collapsed.natural, 'the label has real text to reveal').toBeGreaterThan(10)

    await leaveToolbar(page)
    await button.hover()
    await expect.poll(async () => (await measureIconButton(button)).opacity, { timeout: 4000 }).toBe(1)
    const open = await measureIconButton(button)

    // The BOX grew — it did not stay a fixed 36px footprint with a pill hanging
    // off the side of it.
    expect(open.button.width, 'the button expanded').toBeGreaterThan(collapsed.button.width + 20)

    // …and the label is inside that box on every edge. This is what "in the
    // same box, not hovering over the top" means, measured.
    expect(open.label.left).toBeGreaterThanOrEqual(open.button.left - 0.5)
    expect(open.label.right).toBeLessThanOrEqual(open.button.right + 0.5)
    expect(open.label.top).toBeGreaterThanOrEqual(open.button.top - 0.5)
    expect(open.label.bottom).toBeLessThanOrEqual(open.button.bottom + 0.5)

    // The easing runs to the label's REAL width, not an invented ceiling —
    // that is what makes the curve read correctly (css-conventions → Motion).
    expect(Math.abs(open.label.width - collapsed.natural)).toBeLessThanOrEqual(1)
  })

  test('every icon button expands in place, on hover and on keyboard focus', async ({ page }) => {
    watch(page, 'keyboard user in the toolbar')
    await go(page, '/create/palette')
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

    const buttons = page.locator('.plb-icobtn:visible')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(3)

    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i)
      const name = (await b.getAttribute('aria-label')) || `button ${i}`
      const collapsed = await measureIconButton(b)

      await leaveToolbar(page)
      await b.hover()
      await expect
        .poll(async () => (await measureIconButton(b)).opacity, { timeout: 4000, message: `${name} must reveal its label` })
        .toBe(1)

      const open = await measureIconButton(b)
      expect(open.label.width, `${name}: real text, not a 0px track`).toBeGreaterThan(10)
      expect(open.button.width, `${name}: the button grew`).toBeGreaterThan(collapsed.button.width)
      expect(open.label.left, `${name}: label starts inside the button`).toBeGreaterThanOrEqual(open.button.left - 0.5)
      expect(open.label.right, `${name}: label ends inside the button`).toBeLessThanOrEqual(open.button.right + 0.5)
    }

    // Keyboard focus opens it the same way — the label is the button's only
    // visible name, so a keyboard user must not be left with a bare icon.
    await leaveToolbar(page)
    const first = buttons.first()
    await first.focus()
    await expect.poll(async () => (await measureIconButton(first)).label.width, { timeout: 4000 }).toBeGreaterThan(10)
    const focused = await measureIconButton(first)
    expect(focused.label.right).toBeLessThanOrEqual(focused.button.right + 0.5)
  })

  test('an expanding label never pushes the page into horizontal overflow', async ({ page }) => {
    watch(page, 'designer on a small laptop')
    await go(page, '/create/palette')
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

    for (const width of [1440, 1100, 981, 961]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(250)
      await leaveToolbar(page)
      const widest = page.getByRole('button', { name: 'Save / export' })
      await widest.hover()
      await expect.poll(async () => (await measureIconButton(widest)).opacity, { timeout: 4000 }).toBe(1)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
    }
  })

  test('below 961px every label is pinned open inside its own button', async ({ page }) => {
    watch(page, 'designer on a tablet and a phone')
    await go(page, '/create/palette')
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

    // Below 961px the toolbar's action group is a horizontal scroller, so the
    // labels stop being a hover reveal and stay open — hover is unreliable at
    // these widths (touch has none) and a reveal that widens its own button
    // fights the scroll position under the pointer. This was ALSO the
    // toolbar-label-clipping report: the old absolutely-positioned label sat
    // outside the button box, and a scroll container clips on both axes.
    //
    // THE DEFECT THIS GUARDS IS A LABEL RENDERED OUTSIDE ITS BUTTON, not a
    // button without a word on it. Two controls are now deliberately icon-only
    // below 961px — Undo and Reset, promoted to the front of the rail so that
    // Save / export fits on screen (palette-save-export-off-rail). A
    // `display:none` label has a zero rect at the origin, which the `inside`
    // proxy below reads as "outside the button" even though nothing is
    // painted anywhere. So the row set is split rather than the assertion
    // weakened: every DISPLAYED label must still be open and inside its
    // button, and the hidden set must be EXACTLY the two we intended, which
    // is a tighter contract than before — an accidental third hidden label
    // now fails here.
    for (const width of [960, 900, 800, 768, 700, 480, 380, 320]) {
      // Load AT the width rather than resizing into it: this is how a phone or
      // tablet actually arrives, and it does not depend on the engine's
      // incremental relayout after a viewport change.
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/palette')
      await expect(page.locator('.plb-icobtn').first()).toBeVisible()
      const state = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.plb-icobtn')].map((el) => {
          const inner = el.querySelector('.plb-lbl-i')
          const b = el.getBoundingClientRect()
          const i = inner.getBoundingClientRect()
          return {
            name: el.getAttribute('aria-label'),
            width: i.width,
            natural: inner.scrollWidth,
            inside: i.left >= b.left - 0.5 && i.right <= b.right + 0.5,
            hidden: getComputedStyle(el.querySelector('.plb-lbl')).display === 'none',
          }
        })
        return {
          rows,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
      })
      const shown = state.rows.filter((r) => !r.hidden)
      const hidden = state.rows.filter((r) => r.hidden).map((r) => r.name).sort()

      expect(hidden, `${width}px · exactly Undo and Reset may be icon-only`).toEqual(['Reset', 'Undo'])
      expect(shown.length).toBeGreaterThan(3)
      for (const row of shown) {
        expect(row.width, `${width}px · ${row.name}: label is open at its real width`)
          .toBeGreaterThanOrEqual(row.natural - 1)
        expect(row.inside, `${width}px · ${row.name}: label is inside its button, not clipped beside it`).toBe(true)
      }
      expect(state.overflow, `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
    }
  })
})

/* ── 2 · The homepage hand-off lands on the Auto colour system ────────────────
 * Founder: "make the mini palette builder on the homepage use the auto system
 * — when you click continue in Palette Builder it's set to analogous."
 * Was: Continue was a bare <Link> carrying nothing, so the board fell through
 * to its own default of 'analogous' — a PAID system for a signed-out visitor. */

test.describe('Home mini-builder · Continue in Palette Builder', () => {
  test('the board opens on Auto, carrying the swatches the visitor generated', async ({ page }) => {
    watch(page, 'first-time visitor continuing from the homepage')
    await go(page, '/')

    await page.locator('.hw-tab[data-tab="palette"]').click()
    const swatches = page.locator('.hw-pal-hex')
    await expect(swatches).toHaveCount(5)
    const handedOver = await swatches.allInnerTexts()

    const cont = page.getByRole('link', { name: /Continue in Palette Builder/ })
    // The link keeps a real href, so open-in-new-tab still works.
    await expect(cont).toHaveAttribute('href', '/create/palette')
    await cont.click()

    await page.waitForURL('**/create/palette')
    await expect(page.locator('.plb-col').first()).toBeVisible()

    // THE regression: the colour system the board lands on.
    await expect(page.locator('.plb-harm')).toContainText('Auto')
    await expect(page.locator('.plb-harm')).not.toContainText('Analogous')

    // …and Continue actually continued.
    expect(await page.locator('.plb-hex').allInnerTexts()).toEqual(handedOver)
  })

  test('the hand-off does not fire again when the visitor keeps working', async ({ page }) => {
    watch(page, 'visitor moving between tools after the hand-off')
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="palette"]').click()
    await expect(page.locator('.hw-pal-hex')).toHaveCount(5)
    await page.getByRole('link', { name: /Continue in Palette Builder/ }).click()
    await page.waitForURL('**/create/palette')
    await expect(page.locator('.plb-harm')).toContainText('Auto')
    const delivered = await page.locator('.plb-hex').allInnerTexts()

    // Edit the board, leave for another tool, come back — all inside the same
    // module instance, so a slot that had NOT been consumed would re-import the
    // homepage swatches over the visitor's edit. (The consume-once contract
    // itself is asserted directly in tests/unit/board-handoff.test.js.)
    await page.getByRole('button', { name: 'Randomise' }).click()
    await expect.poll(async () => (await page.locator('.plb-hex').allInnerTexts()).join()).not.toBe(delivered.join())
    const edited = await page.locator('.plb-hex').allInnerTexts()
    await page.waitForTimeout(400)   // the debounced write into the shared design

    await page.goBack()              // client-side: back to the homepage
    await expect(page.locator('.hw-shell')).toBeVisible()
    await page.goForward()           // …and back onto the board, same module instance
    await expect(page).toHaveURL(/\/create\/palette/)
    await expect(page.locator('.plb-col').first()).toBeVisible()
    expect(await page.locator('.plb-hex').allInnerTexts(), 'the draft was not re-delivered').toEqual(edited)
  })
})

/* ── 3 · Column titles describe the colour in the slot ────────────────────────
 * Founder: "when I change the colour system the title of each colour should
 * change based on what is displayed in its slot — for example when I set it to
 * mono, the subtle swatch isn't what it's showing."
 * Was: the title was ROLES[i] — a hard-coded positional label that named the
 * SLOT and could never track the colour. */

test.describe('Palette Builder · colour titles', () => {
  test('changing the colour system rewrites the title of every colour that moved', async ({ page }) => {
    watch(page, 'designer switching colour systems')
    // A fixed board via the share-link parser, so the before/after colours —
    // and therefore the titles — are the same on every run. A random session
    // palette would make this test's outcome depend on the seed.
    await go(page, '/create/palette?c=4338E0,3881E0,9738E0,8494DB,A084DB')
    await expect(page.locator('.plb-col').first()).toBeVisible()

    const titles = page.locator('.plb-name')
    const hexes = page.locator('.plb-hex')
    await expect(titles).toHaveCount(5)

    const before = { names: await titles.allInnerTexts(), hexes: await hexes.allInnerTexts() }
    expect(before.names.every((n) => n.trim().length > 0)).toBe(true)

    // Monochromatic is a FREE system, so this runs signed-out without a modal.
    await page.locator('.plb-harm').click()
    await page.getByRole('menuitemradio', { name: /Monochromatic/ }).click()
    await expect(page.locator('.plb-harm')).toContainText('Monochromatic')
    await expect.poll(async () => (await hexes.allInnerTexts()).join()).not.toBe(before.hexes.join())

    // Read both in ONE evaluation, so a title can never be compared against a
    // hex from a different frame. The title must be in step with the hex it
    // sits under — that is the whole point of the fix, not a happy accident of
    // when the assertion happened to run.
    const after = await page.evaluate(() => ({
      names: [...document.querySelectorAll('.plb-name')].map(e => e.textContent),
      hexes: [...document.querySelectorAll('.plb-hex')].map(e => e.textContent),
    }))

    let changed = 0
    for (let i = 0; i < after.hexes.length; i++) {
      if (after.hexes[i] !== before.hexes[i]) {
        // THE regression: a slot showing a new colour must show a new title.
        expect(after.names[i], `slot ${i} kept a title describing the old colour`).not.toBe(before.names[i])
        changed++
      } else {
        // …and a slot whose colour did NOT move keeps its title. Titles track
        // the colour; they do not merely reshuffle on every system change.
        expect(after.names[i], `slot ${i} was re-titled without changing colour`).toBe(before.names[i])
      }
    }
    expect(changed, 'the system change moved at least one colour').toBeGreaterThan(0)

    // The role eyebrow is still there — it is demoted, not deleted.
    //
    // It no longer reads a fixed 'PRIMARY' regardless of system. That array
    // (PRIMARY/SECONDARY/ACCENT/SUBTLE/DEEP) is accurate for the auto tonal
    // engine and wrong for every hue-based harmony, so the CAPTION now comes
    // from utils/paletteRoles.js and varies. The stable slot identity that
    // exports, tints and the UI preview key off is unchanged underneath — see
    // tests/unit/palette-roles.test.js, which checks each label against the
    // colour the generator actually put in that slot.
    const eyebrow = page.locator('.plb-role').first()
    await expect(eyebrow).toBeVisible()
    await expect(eyebrow, 'the caption must name a real role, not sit blank').not.toHaveText('')
    // This spec switched to monochromatic, where every output is one hue at a
    // different tone — so a label claiming a second hue would be the bug.
    await expect(eyebrow).toHaveText(/BASE|LIGHT|DARK/)
  })

  test('a re-render that does not change the palette does not churn the titles', async ({ page }) => {
    watch(page, 'designer opening and closing a toolbar menu')
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col').first()).toBeVisible()

    const titles = page.locator('.plb-name')
    const before = await titles.allInnerTexts()

    // A real React state change that touches no colour: open a toolbar menu…
    await page.getByRole('button', { name: 'History' }).click()
    await page.keyboard.press('Escape')
    // …and a lens round-trip that returns the palette to exactly where it was.
    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await hue.focus()
    await page.keyboard.press('ArrowRight')
    await expect(hue).toHaveValue('1')
    await page.keyboard.press('ArrowLeft')
    await expect(hue).toHaveValue('0')

    await page.waitForTimeout(300)
    expect(await titles.allInnerTexts(), 'titles are deterministic per colour').toEqual(before)
  })
})

/* ── 4 · The adjust sliders are no longer a keyboard trap ─────────────────────
 * Was: every change went through snapValue(). From a snap point ArrowRight
 * yielded `snap + step`, inside snapRadius, so it snapped straight back —
 * forever. A keyboard user could not move these sliders at all. */

test.describe('SnapSlider · keyboard stepping', () => {
  test('THE TRAP: an arrow key moves the slider off a snap point and it stays there', async ({ page }) => {
    watch(page, 'keyboard-only designer adjusting a palette')
    await go(page, '/create/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await expect(hue).toBeVisible()
    await hue.focus()
    await expect(hue).toBeFocused()
    await expect(hue, '0 is a snap point on this track').toHaveValue('0')

    await page.keyboard.press('ArrowRight')
    await expect(hue, 'one step off the snap').toHaveValue('1')
    await expect(hue.locator('xpath=..'), 'the shared slider exposes its edited state').toHaveAttribute('data-edited', 'true')
    await expect.poll(() => hue.evaluate(el => getComputedStyle(el.closest('.snapv').querySelector('.snapv-value')).fontWeight),
      { message: 'an edited value is visibly bold' }).toBe('800')
    await expect.poll(() => page.locator('label[for="plb-h"]').evaluate(el => getComputedStyle(el).textShadow),
      { message: 'the edited palette field label is visibly emphasised without changing its width' }).not.toBe('none')
    // It must STAY moved. The old behaviour re-snapped on the same event, so a
    // value of 1 never survived to the next frame.
    await page.waitForTimeout(400)
    await expect(hue).toHaveValue('1')

    // …and keep going, through the whole snap radius (8° on this track).
    for (const expected of ['2', '3', '4', '5', '6', '7', '8', '9']) {
      await page.keyboard.press('ArrowRight')
      await expect(hue).toHaveValue(expected)
    }
    await page.waitForTimeout(300)
    await expect(hue).toHaveValue('9')

    // The readout the user reads agrees with the track.
    await expect(page.locator('.plb-adjust .snapv-value').first()).toHaveText('9°')
  })

  test('Home, End and Page keys behave sensibly', async ({ page }) => {
    watch(page, 'keyboard-only designer jumping across a track')
    await go(page, '/create/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await hue.focus()

    // The hue track is ±50, not ±180 — past about a fifth of the wheel the
    // board stops being a variation of the chosen colour (founder decision,
    // batch 4). A tenth of that range is 10°.
    await page.keyboard.press('End')
    await expect(hue).toHaveValue('50')
    await page.keyboard.press('Home')
    await expect(hue).toHaveValue('-50')
    await page.keyboard.press('PageUp')
    await expect(hue, 'a tenth of the range').toHaveValue('-40')
    await page.keyboard.press('PageDown')
    await expect(hue).toHaveValue('-50')
    await page.keyboard.press('ArrowLeft')
    await expect(hue, 'clamped at the end of the track').toHaveValue('-50')
  })

  test('a POINTER drag still snaps — magnetism is a pointer affordance', async ({ page }) => {
    watch(page, 'designer dragging the adjust sliders')
    await go(page, '/create/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await expect(hue).toBeVisible()

    // Drive the input the way a real drag does — pointer down on the track,
    // then value changes while it is held — rather than by pixel arithmetic,
    // which would make the assertion depend on the thumb's exact inset. The
    // MODALITY is the contract that changed, so the modality is what is
    // asserted: the same value produces a different result depending on
    // whether a pointer is down.
    const dragTo = (deg) => hue.evaluate((el, v) => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }))
      setValue.call(el, String(v))
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true }))
    }, deg)

    // Just off the 0 snap → pulled onto it.
    await dragTo(1)
    await expect(hue, 'a drag near a snap is still magnetic').toHaveValue('0')
    // Just off the ±25 snap → pulled onto it. (Was 89 → 90, before the track
    // narrowed from ±180 to ±50.)
    await dragTo(24)
    await expect(hue).toHaveValue('25')
    // Well clear of every snap → left exactly where it was dropped.
    await dragTo(40)
    await expect(hue, 'a drag between snaps stays free').toHaveValue('40')

    // THE CENTRE DETENT (batch 4): zero reaches further than its neighbours, so
    // returning to "this palette, unlensed" no longer needs pixel precision.
    // Stated as the asymmetry itself — the SAME three-degree offset is still
    // being pulled at zero (radius 8) and already free at ±25 (radius 6). That
    // difference is the feature, and it is only expressible because a snap
    // point may now carry its own radius (see snapPoints in utils/sliderKeys.js).
    await dragTo(3)
    await expect(hue, 'three out of zero is pulled toward it').toHaveValue('2')
    await dragTo(28)
    await expect(hue, 'the same offset from ±25 is left alone').toHaveValue('28')

    // The pull FADES OUT across the radius rather than switching off at it.
    // This assertion changed in batch 3: it used to read `dragTo(6) → 0`, i.e.
    // the whole 8° radius collapsed onto the snap, so the value leapt by 8 the
    // moment the pointer crossed the boundary. That discontinuity is exactly
    // what the founder saw on Temperature (7 → 0 → −7). Mid-radius values are
    // now nudged toward the snap, and the radius itself is the identity.
    await dragTo(3)
    await expect(hue, 'mid-radius is nudged, not swallowed').toHaveValue('2')
    await dragTo(8)
    await expect(hue, 'at the radius the pull is exactly zero').toHaveValue('8')
    await dragTo(9)
    await expect(hue, 'and outside it nothing happens at all').toHaveValue('9')

    // …and the very same value, arrived at by KEYBOARD, is not snapped. This
    // pair is the whole fix: one input modality is magnetic, the other exact.
    await hue.focus()
    await page.keyboard.press('Home')
    await expect(hue).toHaveValue('-50')
    for (let i = 0; i < 5; i++) await page.keyboard.press('PageUp')
    await expect(hue).toHaveValue('0')
    await page.keyboard.press('ArrowRight')
    await expect(hue, 'the keyboard leaves the snap it just landed on').toHaveValue('1')
  })

  test('the fix reaches every SnapSlider, not just the Palette Builder', async ({ page }) => {
    watch(page, 'keyboard-only designer tuning a tint ramp')
    // TintTool's hue-shift track snaps every 15° with a 5.4° radius, so it had
    // exactly the same trap at 0.
    await go(page, '/create/tint')

    const shift = page.getByRole('slider', { name: /Hue shift/ })
    await expect(shift).toBeVisible()
    await shift.focus()
    await expect(shift).toHaveValue('0')
    await page.keyboard.press('ArrowRight')
    await expect(shift).toHaveValue('1')
    await expect.poll(() => shift.evaluate(el => getComputedStyle(el.closest('.snapv').querySelector('.snapv-value')).fontWeight),
      { message: 'the edited-value treatment is shared by every SnapSlider' }).toBe('800')
    await page.waitForTimeout(350)
    await expect(shift, 'it stays off the snap here too').toHaveValue('1')
  })
})
