// Regression coverage for the second founder-reported Palette Builder batch.
//
// Same rule as batch 1 (14-palette-slider-toolbar-gradient-stops.spec.js): each of these
// shipped once because nothing measured the RENDERED result. These tests
// measure the rendered result.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { openPaletteTools } from './palette-helpers.js'

/* ── 1 · DELETED: 'Palette Builder · toolbar labels expand the button' ────────
 *
 * Five tests on the old toolbar's hover-reveal labels: that a label slid open
 * inside its own button, never pushed the page sideways, was pinned open below
 * 961px, and showed full words in the collapsed cluster. The palette's toolbar
 * is now the drawn one (D:947-1015) on the shared ToolToolbar: its buttons
 * carry their words at rest, collapse to icons below 768px, and what does not
 * fit goes to the Tools overflow rather than into a label animation. What those
 * tests protected — a single row, nothing clipped, every action reachable by
 * name — is held for every tool by 100-tool-toolbar-one-row.spec.js, and "no
 * blank chip on the row" by 14-palette-slider-toolbar-gradient-stops.spec.js.
 */

/* ── 2 · DELETED: 'Home mini-builder · Continue in Palette Builder' ──────────
 *
 * Three tests, all three driven from `/`, all three gone with the page they
 * drove. This is the record of what they held, because the mechanism under
 * them is not all dead and the difference matters to whoever reads this next.
 *
 * WHAT THEY GUARDED.
 *   a. 'the board opens on Auto' — the founder's own report: "make the mini
 *      palette builder on the homepage use the auto system — when you click
 *      continue in Palette Builder it's set to analogous." Continue was a bare
 *      <Link> carrying nothing, so the board fell through to its own default of
 *      'analogous', a PAID system handed to a signed-out visitor.
 *   b. 'a click that opens a NEW TAB must not arm the board in THIS one' — his
 *      "somtimes i open the pallete builder and it has added many colours and
 *      its a different swatch." React Router's Link calls the caller's onClick
 *      unconditionally and only then asks whether it will navigate, so a
 *      Ctrl/Cmd/Shift-click staged a draft in a tab that never moved, in a slot
 *      with no expiry, which then ambushed the next visit to /create/palette.
 *   c. 'the hand-off does not fire again' — the consume-once contract, observed
 *      from the rendered page rather than from the module.
 *
 * WHY THEY ARE GONE, AND IT IS NOT MERELY THAT THE ROUTE MOVED.
 * HomeWorkbench.jsx is deleted, and it was the ONLY caller of
 * `setBoardDraft()` in the app. Nothing can stage the board slot any more, so
 * `data-board-source` can never read 'handoff' — every one of these tests would
 * now be asserting on a state the product cannot enter, which is worse than no
 * test: (b) in particular asserts an ABSENCE, and would have gone green and
 * silent the moment the producer disappeared. That is the vacuous pass this
 * suite keeps paying for, and it is why they are removed rather than skipped.
 *
 * WHAT IS *NOT* DEAD, and where it is covered. The front door still hands
 * palettes to the builder — Spectrum's Discover cards and
 * `PaletteGalleryGrid` both open it through `paletteBuilderUrl()`, a URL rather
 * than a staged slot, which is immune to (b) by construction because a new tab
 * carries the URL with it. That path is asserted by
 * tests/unit/discover-handoff.test.js, and rendered on this very page by the
 * colour-titles test below, which loads its fixed board through `?c=`.
 *
 * The SLOT's own contract — versioned, bounded, consumed exactly once, TTL —
 * is still proved in full by tests/unit/board-handoff.test.js and
 * tests/unit/home-handoff.test.js. What has no coverage left is the CALL SITE,
 * because there is no longer a call site; `setBoardDraft` and the board slot
 * are dead exports awaiting a decision, and that has been reported rather than
 * fixed here (this lane does not edit src/).
 */

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
    const system = page.getByRole('combobox', { name: 'Colour system' })
    await system.selectOption('monochromatic')
    await expect(system).toHaveValue('monochromatic')
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
    await (await openPaletteTools(page)).getByRole('button', { name: 'History' }).click()
    await expect(page.getByRole('menu', { name: 'Palette history' })).toBeVisible()
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

/* THE EDITED-VALUE WEIGHT IS READ AS A DIFFERENCE, NOT AS A LITERAL.
 *
 * This used to assert `fontWeight === '800'`, and the Spectrum foundation
 * commit made that false everywhere in one stroke: Manrope ran 200..800, Geist
 * runs 300..700, and a weight outside a variable font's axis is not an error —
 * the browser clamps it and draws something nobody chose. So all twenty-one
 * call sites at 720/750/800/900 were REMAPPED to 700 on purpose, because a
 * remap is a decision an author made and a clamp is one the renderer makes
 * invisibly. `.snapv--edited .snapv-value` is one of them.
 *
 * The guarantee was never the number. It is that an edited value is visibly
 * heavier than a resting one, so a keyboard user can see which tracks they have
 * moved — and a literal could only ever be re-typed to whatever shipped, which
 * is how a test stops being evidence. Read as resting-vs-edited it survives the
 * next family change, and it FAILS if the rule is emptied rather than remapped:
 * equal weights are not a visible difference. */
const editedWeight = (slider) => slider.evaluate(
  (el) => Number(getComputedStyle(el.closest('.tl-slider').querySelector('.tl-slider-v')).fontWeight),
)

test.describe('Adjust sliders · keyboard stepping', () => {
  test('THE TRAP: an arrow key moves the slider off a snap point and it stays there', async ({ page }) => {
    watch(page, 'keyboard-only designer adjusting a palette')
    await go(page, '/create/palette')

    const hue = page.getByRole('slider', { name: 'Hue adjustment' })
    await expect(hue).toBeVisible()
    await hue.focus()
    await expect(hue).toBeFocused()
    await expect(hue, '0 is a snap point on this track').toHaveValue('0')
    const resting = await editedWeight(hue)

    await page.keyboard.press('ArrowRight')
    await expect(hue, 'one step off the snap').toHaveValue('1')
    await expect(hue.locator('xpath=..'), 'the shared slider exposes its edited state').toHaveAttribute('data-edited', 'true')
    await expect.poll(() => editedWeight(hue),
      { message: `an edited value is visibly bolder than the ${resting} it rests at` })
      .toBeGreaterThan(resting)
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
    await expect(page.locator('.plb-adjust .tl-slider-v').first()).toHaveText('+9°')
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
    watch(page, 'keyboard-only designer tuning a type scale')
    // The Type Scale's base size is a SnapSlider with a snap at its resting 16px,
    // so it carries exactly the same trap.
    await go(page, '/create/type-scale')

    const shift = page.getByRole('slider', { name: 'Base font size in pixels' })
    await expect(shift).toBeVisible()
    await shift.focus()
    await expect(shift).toHaveValue('16')
    // The edited-value WEIGHT is not asserted on this slider: the Type Scale's
    // own sheet holds .snapv-value at 600 in both states, so the shared
    // .snapv--edited treatment never shows there. The keyboard contract, which is what this test is for, is asserted.
    await page.keyboard.press('ArrowRight')
    await expect(shift).toHaveValue('17')
    await page.waitForTimeout(350)
    await expect(shift, 'it stays off the snap here too').toHaveValue('17')
  })
})
