// /create/tint: THE LIGHTNESS AND SATURATION SLIDERS, THE SPACING SWITCH AND THE
// CONTRAST TOOLTIP.
//
// Lightness (-50..+50) and Saturation (0..150%) replaced Hue and Chroma, and
// both shape the ramp. A Perceived / Linear Spacing switch spaces the steps
// between the two ends. Each tint value in the Contrast notes is a copy button
// whose tooltip shows white and black text against that tint. A mouse or a key
// press on the note copies it. Hover or keyboard focus opens the card over the
// note (below it by default, above only when the window leaves no room below
// and the notes header and sticky bars leave room above); a tap pins the
// card inline, in the flow under the note, and does NOT copy: the card has its
// own "Copy #hex" and Close buttons, and Close hands focus back to the note.
// Each note also carries its best-grade word: the winning text colour and its
// grade ("White AAA", "Black AA").
//
// What this holds, from a person's side of the screen:
//   1. Left alone, the tool makes the ramp it always made (fixed hexes, written
//      down from that ramp, not worked out by the code under test).
//   2. Each slider changes the ramp, in the right direction, and Lightness never
//      moves the first or last step. A double-click returns a slider to its
//      default and the old ramp with it.
//   3. Linear and Perceived differ in the steps between and match at both ends,
//      and Linear sits lighter. The oracle is WCAG relative luminance, computed
//      here from the bytes on screen.
//   4. The tooltip opens on hover, on focus and on a tap, and Escape closes it.
//      A tap pins it (and does not copy); a press elsewhere lets it go; the
//      Copy button copies; Close returns focus to the note.
//   5. Both rows show, each with a ratio, a tick, dash or cross, and a word;
//      the ratio and the word agree with WCAG worked out here from the hex, and
//      each note's best-grade word agrees with the better of the two ratios.
//   6. At 390 on a touch screen the targets reach 44px and the pinned card sits
//      in the flow: it covers nothing (the notes header, the hint and the Curve
//      pills keep the very same boxes), at 390 and at 768.
//   7. The hint reads for the pointer in use, the Spacing note is on screen,
//      and the marks and the best-grade words pass contrast in both themes.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// The default ramp for #2563EB: 11 steps, Even curve, as the tool made it before
// the sliders existed.
const BLUE_EVEN_11 = ['#F0F5FF', '#C9DCFF', '#A2C2FF', '#7BA8FF', '#538CFF', '#2F6EF7', '#2158D1', '#1343AC', '#062E89', '#001A67', '#000647']
const LIGHTER_50 = ['#F0F5FF', '#ECF3FF', '#E1EBFF', '#CDDFFF', '#B2CDFF', '#8FB5FF', '#6497FF', '#4176E4', '#2854B2', '#0C2F7D', '#000647']
const DARKER_50 = ['#F0F5FF', '#77A4FC', '#5282E4', '#3468D4', '#1950C8', '#0039BD', '#002D9E', '#002384', '#00196C', '#001058', '#000647']
const GREY_11 = ['#F5F5F5', '#DBDBDB', '#C2C2C2', '#A9A9A9', '#919191', '#7A7A7A', '#646464', '#4E4E4E', '#393939', '#262626', '#141414']

// ── Oracles, written here and not imported from the code under test ─────────
const bytes = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const spread = (hex) => Math.max(...bytes(hex)) - Math.min(...bytes(hex))
const luminance = (hex) => {
  const [r, g, b] = bytes(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratioOn = (hex, pole) => {
  const a = luminance(hex)
  const b = pole === 'white' ? 1 : 0
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
const gradeWord = (ratio) => (ratio >= 7 ? 'Passes AAA' : ratio >= 4.5 ? 'Passes AA' : ratio >= 3 ? 'Large text only' : 'Fails')
// The ratio is shown cut down to one decimal, never rounded up.
const shown = (ratio) => `${(Math.floor(ratio * 10 + 1e-9) / 10).toFixed(1)}:1`
// The word on each note is the BETTER of the white and black ratios. (Because
// the two ratios multiply to 21, the better one is never under 4.58, so only
// AAA and AA can show for black and white text; Large and Low are not reachable.)
// The word leads with the colour that wins: "White AAA" or "Black AA".
const bestWord = (hex) => {
  const [w, b] = [ratioOn(hex, 'white'), ratioOn(hex, 'black')]
  const ratio = Math.max(w, b)
  return `${w >= b ? 'White' : 'Black'} ${ratio >= 7 ? 'AAA' : 'AA'}`
}
// sRGB triple from any CSS colour string the page reports (rgb, oklch, color-mix).
const rgbOfCss = (page, css) => page.evaluate((c) => {
  const g = document.createElement('canvas').getContext('2d')
  g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1)
  return Array.from(g.getImageData(0, 0, 1, 1).data)
}, css)
const luminanceRgb = (rgb) => {
  const [r, g, b] = rgb.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratioRgb = (a, b) => { const x = luminanceRgb(a); const y = luminanceRgb(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
// A box in document coordinates, so a scroll between two looks cannot move it.
const docBox = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } })
const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1

// ── Page helpers ────────────────────────────────────────────────────────────
// The ramp as the step columns hold it. (The notes' own text turns to "Copied"
// for a second after a copy, so they are not a steady place to read it.)
const ramp = (page) => page.locator('.tt-cell').evaluateAll((cells) => cells.map((c) => c.getAttribute('aria-label').match(/#[0-9A-F]{6}/)[0]))
const sliderValue = (page, name) => page.locator('.tl-slider').filter({ has: page.getByRole('slider', { name, exact: true }) }).locator('.tl-slider-v')
const note = (page, i) => page.locator('.tt-note').nth(i)
const openTip = (page) => page.locator('.tt-tip[data-open="true"]')
const pressed = (page, name) => page.getByRole('button', { name, exact: true }).getAttribute('aria-pressed')

async function openTint(page, who) {
  watch(page, who)
  await go(page, '/create/tint')
  await expect(page.locator('.tt-cell')).toHaveCount(11, { timeout: 20000 })
  await expect(page.locator('.tt-note')).toHaveCount(11)
}

// ── 1 and 2: the sliders ────────────────────────────────────────────────────
test.describe('the Lightness and Saturation sliders', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('left alone, the tool makes the ramp it always made', async ({ page }) => {
    await openTint(page, 'someone opening the tint tool')
    expect(await ramp(page)).toEqual(BLUE_EVEN_11)
    // The sliders open at their neutral positions, and say so.
    await expect(page.getByRole('slider', { name: 'Lightness', exact: true })).toHaveValue('0')
    await expect(sliderValue(page, 'Lightness')).toHaveText('0')
    await expect(page.getByRole('slider', { name: 'Saturation', exact: true })).toHaveValue('100')
    await expect(sliderValue(page, 'Saturation')).toHaveText('100%')
    expect(await pressed(page, 'Perceived')).toBe('true')
    expect(await pressed(page, 'Linear')).toBe('false')
    // The old Hue and Chroma sliders are gone.
    await expect(page.getByRole('slider', { name: 'Hue', exact: true })).toHaveCount(0)
    await expect(page.getByRole('slider', { name: 'Chroma', exact: true })).toHaveCount(0)
  })

  test('Lightness runs from -50 to +50, lifts or lowers the middle, and never moves the ends', async ({ page }) => {
    await openTint(page, 'a designer who wants a lighter scale')
    const light = page.getByRole('slider', { name: 'Lightness', exact: true })
    await expect(light).toHaveAttribute('min', '-50')
    await expect(light).toHaveAttribute('max', '50')

    await light.focus()
    await page.keyboard.press('End')
    await expect(sliderValue(page, 'Lightness')).toHaveText('+50')
    expect(await ramp(page)).toEqual(LIGHTER_50)

    await page.keyboard.press('Home')
    await expect(sliderValue(page, 'Lightness')).toHaveText('−50')
    expect(await ramp(page)).toEqual(DARKER_50)

    // Every step between the ends sits lighter at +50 than at -50; the ends do not move.
    for (let i = 1; i < 10; i++) expect(luminance(LIGHTER_50[i]), `step ${i}`).toBeGreaterThan(luminance(DARKER_50[i]))
    expect(LIGHTER_50[0]).toBe(DARKER_50[0])
    expect(LIGHTER_50[10]).toBe(DARKER_50[10])
  })

  test('Saturation runs from 0 to 150%: 0 is grey, and more saturation means more colour', async ({ page }) => {
    await openTint(page, 'a designer who wants a quieter scale')
    const sat = page.getByRole('slider', { name: 'Saturation', exact: true })
    await expect(sat).toHaveAttribute('min', '0')
    await expect(sat).toHaveAttribute('max', '150')

    await sat.focus()
    await page.keyboard.press('Home')
    await expect(sliderValue(page, 'Saturation')).toHaveText('0%')
    const grey = await ramp(page)
    expect(grey).toEqual(GREY_11)
    for (const h of grey) expect(spread(h), `${h} is not neutral`).toBeLessThanOrEqual(1)

    // Part-way, the middle step carries more colour than grey and less than the source.
    for (let i = 0; i < 50; i++) await page.keyboard.press('ArrowRight')
    await expect(sliderValue(page, 'Saturation')).toHaveText('50%')
    const half = await ramp(page)
    expect(spread(half[5])).toBeGreaterThan(spread(grey[5]))
    expect(spread(half[5])).toBeLessThan(spread(BLUE_EVEN_11[5]))

    await page.keyboard.press('End')
    await expect(sliderValue(page, 'Saturation')).toHaveText('150%')
    const vivid = await ramp(page)
    expect(vivid).not.toEqual(BLUE_EVEN_11)
    expect(spread(vivid[5])).toBeGreaterThan(spread(BLUE_EVEN_11[5]))
  })

  test('a double-click puts a slider back at its default, and the ramp with it', async ({ page }) => {
    await openTint(page, 'someone who went too far and wants to start again')
    const light = page.getByRole('slider', { name: 'Lightness', exact: true })
    const sat = page.getByRole('slider', { name: 'Saturation', exact: true })
    await light.focus()
    await page.keyboard.press('End')
    await sat.focus()
    await page.keyboard.press('Home')
    expect(await ramp(page)).not.toEqual(BLUE_EVEN_11)

    await light.dispatchEvent('dblclick')
    await expect(sliderValue(page, 'Lightness')).toHaveText('0')
    await sat.dispatchEvent('dblclick')
    await expect(sliderValue(page, 'Saturation')).toHaveText('100%')
    expect(await ramp(page)).toEqual(BLUE_EVEN_11)
  })

  test('the sliders shape every scale, and leave the source colours as they were', async ({ page }) => {
    await openTint(page, 'someone tinting two colours')
    await page.getByRole('button', { name: 'Add a colour' }).click()
    await expect(page.locator('.tt-src')).toHaveCount(2)
    const hexes = () => page.locator('.tt-hex-input').evaluateAll((els) => els.map((e) => e.value))
    const before = await hexes()
    const secondBefore = await ramp(page)

    await page.getByRole('slider', { name: 'Saturation', exact: true }).focus()
    await page.keyboard.press('Home')
    const secondGrey = await ramp(page)
    for (const h of secondGrey) expect(spread(h), `${h} is not neutral on scale 2`).toBeLessThanOrEqual(1)
    expect(secondGrey).not.toEqual(secondBefore)

    await page.getByRole('radio', { name: 'Show scale 1' }).click()
    expect(await ramp(page)).toEqual(GREY_11)
    expect(await hexes(), 'the source colours are not edited by a slider').toEqual(before)
  })
})

// ── 3: the Spacing switch ───────────────────────────────────────────────────
test.describe('the Perceived / Linear Spacing switch', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Linear changes the steps between and keeps both ends; Linear sits lighter', async ({ page }) => {
    await openTint(page, 'someone comparing the two spacings')
    const perceived = await ramp(page)
    expect(perceived).toEqual(BLUE_EVEN_11)

    await page.getByRole('button', { name: 'Linear', exact: true }).click()
    expect(await pressed(page, 'Linear')).toBe('true')
    expect(await pressed(page, 'Perceived')).toBe('false')
    const linear = await ramp(page)

    expect(linear[0], 'the first step is the same').toBe(perceived[0])
    expect(linear.at(-1), 'the last step is the same').toBe(perceived.at(-1))
    for (let i = 1; i < 10; i++) {
      expect(linear[i], `step ${i} should differ`).not.toBe(perceived[i])
      expect(luminance(linear[i]), `step ${i} should sit lighter in Linear`).toBeGreaterThan(luminance(perceived[i]))
    }

    // Linear is spaced evenly in light: luminance steps down by about the same
    // amount each time, where Perceived loses most of it in the first steps.
    const drops = (list) => list.slice(1).map((h, i) => luminance(list[i]) - luminance(h))
    const lin = drops(linear)
    const per = drops(perceived)
    const spreadOf = (d) => Math.max(...d) - Math.min(...d)
    expect(spreadOf(lin), 'Linear steps are not evenly spaced in light').toBeLessThan(0.02)
    expect(spreadOf(per), 'Perceived steps should lose most of their light early').toBeGreaterThan(0.1)

    // And back.
    await page.getByRole('button', { name: 'Perceived', exact: true }).click()
    expect(await ramp(page)).toEqual(perceived)
  })

  test('the switch works with the other controls: curve, step count and lightness', async ({ page }) => {
    await openTint(page, 'someone combining the controls')
    await page.getByRole('button', { name: 'Linear', exact: true }).click()
    await page.getByRole('button', { name: '9 steps' }).click()
    await expect(page.locator('.tt-cell')).toHaveCount(9)
    const linear9 = await ramp(page)
    await page.getByRole('button', { name: 'Perceived', exact: true }).click()
    const perceived9 = await ramp(page)
    expect(linear9[0]).toBe(perceived9[0])
    expect(linear9.at(-1)).toBe(perceived9.at(-1))
    expect(linear9.slice(1, -1).every((h, i) => h !== perceived9[i + 1])).toBe(true)

    await page.getByRole('button', { name: 'Linear', exact: true }).click()
    await page.getByRole('slider', { name: 'Lightness', exact: true }).focus()
    await page.keyboard.press('End')
    const lighter = await ramp(page)
    expect(lighter[0]).toBe(linear9[0])
    expect(lighter.at(-1)).toBe(linear9.at(-1))
    expect(luminance(lighter[4])).toBeGreaterThan(luminance(linear9[4]))
  })
})

// ── 4 and 5: the tooltip, with a mouse and a keyboard ───────────────────────
test.describe('the contrast tooltip with a mouse and a keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('hover opens it over the tint and moving away closes it', async ({ page }) => {
    await openTint(page, 'someone pointing at a tint value')
    await expect(openTip(page)).toHaveCount(0)
    await note(page, 5).hover()
    await expect(openTip(page)).toHaveCount(1)
    await expect(openTip(page)).toBeVisible()
    await expect(openTip(page)).toContainText('500')
    await expect(openTip(page)).toContainText(BLUE_EVEN_11[5])

    // Moving along to the next note moves the tooltip with the pointer.
    await note(page, 6).hover()
    await expect(openTip(page)).toHaveCount(1)
    await expect(openTip(page)).toContainText('600')

    await page.mouse.move(5, 5)
    await expect(openTip(page)).toHaveCount(0)
  })

  test('a hover card sits above or below its note, never over it, and nothing sits on top of it', async ({ page }) => {
    await openTint(page, 'someone pointing along the notes')
    for (const i of [0, 5, 10]) {
      await note(page, i).hover()
      const card = openTip(page).locator('.tt-tip-card')
      await expect(card, `note ${i}`).toBeVisible()
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
      const m = await card.evaluate((el, idx) => {
        const c = el.getBoundingClientRect()
        const n = document.querySelectorAll('.tt-note')[idx].getBoundingClientRect()
        const probe = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && el.contains(hit) }
        return {
          above: c.bottom <= n.top + 2,
          below: c.top >= n.bottom - 2,
          covered: [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]
            .filter(([fx, fy]) => !probe(c.left + c.width * fx, c.top + c.height * fy)).length,
        }
      }, i)
      expect(m.above || m.below, `note ${i}: the card is neither wholly above nor wholly below its note`).toBe(true)
      expect(m.covered, `note ${i}: something else sits on top of the card`).toBe(0)
    }
  })

  // What the open card and its note look like against the window, read in one go
  // (viewport coordinates: the page does not scroll at these sizes).
  const cardFit = (page, i) => openTip(page).locator('.tt-tip-card').evaluate((el, idx) => {
    const c = el.getBoundingClientRect()
    const n = document.querySelectorAll('.tt-note')[idx].getBoundingClientRect()
    const h = document.querySelector('.tt-notes-head').getBoundingClientRect()
    return {
      cardTop: c.top, cardBottom: c.bottom, cardH: c.height, noteTop: n.top, noteBottom: n.bottom,
      headBottom: h.bottom, winH: innerHeight, scrollH: el.scrollHeight, clientH: el.clientHeight,
      capped: !!el.style.maxHeight,
      overflowY: getComputedStyle(el).overflowY,
      above: !!el.closest('.tt-tip').classList.contains('tt-tip--above'),
      // Room under the note once the card keeps 6px from it and 12px from the window's foot.
      roomBelow: innerHeight - 12 - n.bottom - 6,
    }
  }, i)
  const settle = async (page, i) => {
    await note(page, i).hover()
    await expect(openTip(page).locator('.tt-tip-card'), `note ${i}`).toBeVisible()
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
  }

  test('a hover card opens below its note when the room allows and never meets the notes header', async ({ page }) => {
    await openTint(page, 'someone pointing along the notes')
    for (let i = 0; i < 11; i++) {
      await settle(page, i)
      const m = await cardFit(page, i)
      const [c, n, h] = [await docBox(openTip(page).locator('.tt-tip-card')), await docBox(note(page, i)), await docBox(page.locator('.tt-notes-head'))]
      // "Below, no flip, not cut short" binds only a note with room under it for the whole card (about 224px).
      if (m.roomBelow >= m.scrollH) {
        expect(c.y, `note ${i}: the card opens below the note`).toBeGreaterThanOrEqual(n.y + n.h - 2)
        expect(m.above, `note ${i}: no flip above when there is room below`).toBe(false)
        expect(m.capped, `note ${i}: a card with room below is not cut short`).toBe(false)
      }
      // The header is never covered, roomy note or squeezed.
      expect(overlap(c, h), `note ${i}: the card meets the notes header`).toBe(false)
    }
  })

  test('a squeezed hover card is no taller than its room, scrolls inside, and the page does not grow', async ({ page }) => {
    await openTint(page, 'someone pointing along the notes in a short window')
    const docH0 = await page.evaluate(() => document.documentElement.scrollHeight)
    let squeezed = 0
    for (let i = 0; i < 11; i++) {
      await settle(page, i)
      const m = await cardFit(page, i)
      if (m.roomBelow >= m.scrollH) continue // roomy: the test above holds it
      squeezed++
      // The room on the side the card took: under the note to 12px short of the foot, or over it down from the header.
      const room = m.above ? m.noteTop - 6 - m.headBottom : m.roomBelow
      expect(m.cardH, `note ${i}: the squeezed card is taller than the room it took`).toBeLessThanOrEqual(room + 1)
      if (m.above) expect(m.cardTop, `note ${i}: the card rises over the notes header`).toBeGreaterThanOrEqual(m.headBottom - 1)
      else expect(m.cardBottom, `note ${i}: the card reaches past 12px from the window's foot`).toBeLessThanOrEqual(m.winH - 12 + 1)
      expect(m.capped, `note ${i}: a squeezed card carries a max-height`).toBe(true)
      expect(m.overflowY, `note ${i}: a capped card scrolls, not clips or spills`).toBe('auto')
      expect(m.scrollH, `note ${i}: a capped card scrolls inside`).toBeGreaterThan(m.clientH)
      expect(await page.evaluate(() => document.documentElement.scrollHeight), `note ${i}: the page grew`).toBeLessThanOrEqual(docH0)
    }
    expect(squeezed, 'at 1440x900 the notes leave under 224px below, so some card is squeezed').toBeGreaterThan(0)
  })

  test.describe('in a tall window', () => {
    test.use({ viewport: { width: 1440, height: 1300 } })
    test('every hover card has room, opens below its note and is not cut short', async ({ page }) => {
      await openTint(page, 'someone pointing along the notes in a tall window')
      for (let i = 0; i < 11; i++) {
        await settle(page, i)
        const m = await cardFit(page, i)
        expect(m.roomBelow, `note ${i}: a 1300px window leaves room for the whole card`).toBeGreaterThanOrEqual(m.scrollH)
        expect(m.cardTop, `note ${i}: the card opens below the note`).toBeGreaterThanOrEqual(m.noteBottom - 2)
        expect(m.above, `note ${i}: no flip above`).toBe(false)
        expect(m.capped, `note ${i}: not cut short`).toBe(false)
        expect(m.scrollH, `note ${i}: nothing to scroll`).toBeLessThanOrEqual(m.clientH)
      }
    })
  })

  test('Escape closes a tooltip that hover opened', async ({ page }) => {
    await openTint(page, 'someone who wants the tooltip out of the way')
    await note(page, 3).hover()
    await expect(openTip(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(openTip(page)).toHaveCount(0)
  })

  test('focus opens it, blur closes it, and Escape closes it with focus kept', async ({ page }) => {
    await openTint(page, 'a keyboard user stepping through the notes')
    await note(page, 2).focus()
    // POSITIVE CONTROL for the :focus-visible gate: a script's .focus() with no
    // mouse use before it counts as keyboard focus, so the card opens. If this
    // were false the open below would be the gate failing, not the card.
    expect(await note(page, 2).evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    await expect(openTip(page)).toBeVisible()
    await expect(openTip(page)).toContainText('200')
    // The button is described by the tooltip, so a screen reader reads it with the tint.
    const describedBy = await note(page, 2).getAttribute('aria-describedby')
    await expect(page.locator(`#${describedBy}`)).toHaveAttribute('role', 'tooltip')
    await expect(page.locator(`#${describedBy}`)).toHaveText(/White text.*Black text/)

    await page.keyboard.press('Tab')
    await expect(note(page, 3)).toBeFocused()
    await expect(openTip(page)).toHaveCount(1)
    await expect(openTip(page)).toContainText('300')

    await page.keyboard.press('Escape')
    await expect(openTip(page)).toHaveCount(0)
    await expect(note(page, 3), 'Escape does not move focus').toBeFocused()

    await note(page, 3).blur()
    await expect(openTip(page)).toHaveCount(0)
  })

  test('a key press on the note copies it and does not pin the tooltip open', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await openTint(page, 'a keyboard user copying a tint')
    await note(page, 4).focus()
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(BLUE_EVEN_11[4])
    await expect(page.locator('.tt-note-hex').nth(4)).toHaveText('Copied')
    // Focus opened the card, and it is still the hover/focus kind, not a pinned one.
    await expect(openTip(page)).toHaveCount(1)
    await expect(page.locator('.tt-tip--inline')).toHaveCount(0)
    await expect(page.locator('.tt-tip-copy')).toHaveCount(0)
    // Not pinned: moving focus to something that is not a note lets it go. (A
    // pinned card ignores a blur, so it would still be open here.)
    await page.getByRole('slider', { name: 'Lightness', exact: true }).focus()
    await expect(openTip(page)).toHaveCount(0)
  })

  test('a mouse click on the note copies it and leaves no pinned card behind', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await openTint(page, 'a mouse user copying a tint')
    await note(page, 3).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(BLUE_EVEN_11[3])
    await expect(page.locator('.tt-note-hex').nth(3)).toHaveText('Copied')
    await expect(page.locator('.tt-tip--inline')).toHaveCount(0)
    // The pointer is still over it, so the hover card shows; moving off lets it go.
    await page.mouse.move(5, 5)
    await expect(openTip(page)).toHaveCount(0)
  })

  test('both the white and the black row show, each with a ratio, a tick or cross, and a word', async ({ page }) => {
    await openTint(page, 'someone checking text on a tint')
    for (const i of [0, 5, 10]) {
      await note(page, i).hover()
      const tip = openTip(page)
      await expect(tip).toBeVisible()
      const rows = tip.locator('.tt-tip-row')
      await expect(rows).toHaveCount(2)
      await expect(rows.nth(0).locator('.tt-tip-who')).toHaveText('White text')
      await expect(rows.nth(1).locator('.tt-tip-who')).toHaveText('Black text')
      for (const [r, pole] of [[0, 'white'], [1, 'black']]) {
        const row = rows.nth(r)
        const want = ratioOn(BLUE_EVEN_11[i], pole)
        await expect(row.locator('.tt-tip-ratio'), `${BLUE_EVEN_11[i]} on ${pole}`).toHaveText(shown(want))
        await expect(row.locator('.tt-tip-grade')).toHaveText(gradeWord(want))
        await expect(row.locator('.tt-tip-mark svg'), 'a tick or cross is drawn').toBeVisible()
        await expect(row).toHaveAttribute('data-pass', want >= 4.5 ? 'true' : 'false')
      }
    }
  })

  test('across the whole ramp, every ratio and word agrees with WCAG worked out from the hex', async ({ page }) => {
    await openTint(page, 'someone auditing every tint')
    const passMarks = new Set()
    const failMarks = new Set()
    const largeMarks = new Set()
    for (let i = 0; i < 11; i++) {
      const rows = await page.locator('.tt-note-wrap').nth(i).locator('.tt-tip-row').evaluateAll((els) => els.map((e) => ({
        who: e.querySelector('.tt-tip-who').textContent,
        ratio: e.querySelector('.tt-tip-ratio').textContent,
        word: e.querySelector('.tt-tip-grade').textContent,
        pass: e.getAttribute('data-pass'),
        mark: e.querySelector('.tt-tip-mark').innerHTML,
      })))
      expect(rows.map((r) => r.who), `step ${i}`).toEqual(['White text', 'Black text'])
      rows.forEach((row, r) => {
        const want = ratioOn(BLUE_EVEN_11[i], r === 0 ? 'white' : 'black')
        expect(row.ratio, `${BLUE_EVEN_11[i]} ${row.who}`).toBe(shown(want))
        expect(row.word, `${BLUE_EVEN_11[i]} ${row.who}`).toBe(gradeWord(want))
        expect(row.pass).toBe(want >= 4.5 ? 'true' : 'false')
        if (row.word === 'Fails') failMarks.add(row.mark)
        else if (row.word === 'Large text only') largeMarks.add(row.mark)
        else if (row.pass === 'true') passMarks.add(row.mark)
      })
    }
    // A pass is always one mark, a fail another and "Large text only" a third (a
    // dash), so the mark is not the only signal and no two grades share one.
    // POSITIVE CONTROL: this ramp does have all three kinds of row (#538CFF on
    // white is 3.2:1), otherwise the set checks below would pass on nothing.
    expect(largeMarks.size, 'this ramp has "Large text only" rows').toBe(1)
    expect(passMarks.size, 'a pass is always the same mark').toBe(1)
    expect(failMarks.size, 'a fail is always the same mark').toBe(1)
    const [pass, fail, large] = [...passMarks, ...failMarks, ...largeMarks]
    expect(new Set([pass, fail, large]).size, 'tick, cross and dash are three different marks').toBe(3)
  })

  test('each note carries its best-grade word, the better of its white and black ratios', async ({ page }) => {
    await openTint(page, 'someone scanning the notes for the safe tints')
    const words = async () => page.locator('.tt-note-best').allTextContents()
    const want = (list) => list.map((h) => bestWord(h))

    expect(await words()).toEqual(want(BLUE_EVEN_11))
    // POSITIVE CONTROL: the default ramp shows all four words, so a word stuck on
    // one value could not pass.
    expect(new Set(want(BLUE_EVEN_11)), 'the default ramp holds White and Black, AAA and AA').toEqual(new Set(['White AAA', 'White AA', 'Black AAA', 'Black AA']))
    for (const w of await words()) expect(w).toMatch(/^(White|Black) (AAA|AA)$/)

    // Other ramps, read back from the swatches on screen and graded here.
    await page.getByRole('slider', { name: 'Lightness', exact: true }).focus()
    await page.keyboard.press('End')
    expect(await ramp(page)).toEqual(LIGHTER_50)
    expect(await words()).toEqual(want(LIGHTER_50))
    await page.keyboard.press('Home')
    expect(await ramp(page)).toEqual(DARKER_50)
    expect(await words()).toEqual(want(DARKER_50))
    await page.getByRole('slider', { name: 'Saturation', exact: true }).focus()
    await page.keyboard.press('Home')
    await page.getByRole('slider', { name: 'Lightness', exact: true }).dispatchEvent('dblclick')
    expect(await ramp(page)).toEqual(GREY_11)
    expect(await words()).toEqual(want(GREY_11))
  })

  test('the note word is a visible mark on the note and is not read out twice', async ({ page }) => {
    await openTint(page, 'someone looking at the notes')
    const best = page.locator('.tt-note-best').nth(5)
    await expect(best).toBeVisible()
    await expect(best, 'the tooltip already says it, so the screen reader skips the word').toHaveAttribute('aria-hidden', 'true')
    // It sits on the same row as the hex, to its right.
    const [hex, word] = [await docBox(page.locator('.tt-note-hex').nth(5)), await docBox(best)]
    expect(word.x).toBeGreaterThanOrEqual(hex.x + hex.w - 1)
  })

  test('the tooltip follows the ramp when a slider moves it', async ({ page }) => {
    await openTint(page, 'someone moving a slider with a tooltip open')
    await page.getByRole('slider', { name: 'Lightness', exact: true }).focus()
    await page.keyboard.press('End')
    await note(page, 4).hover()
    await expect(openTip(page)).toContainText(LIGHTER_50[4])
    await expect(openTip(page).locator('.tt-tip-ratio').first()).toHaveText(shown(ratioOn(LIGHTER_50[4], 'white')))
  })

  test('opening the tooltip on the last row does not make the 1440x900 page scroll', async ({ page }) => {
    await openTint(page, 'someone checking the last tint')
    await note(page, 10).hover()
    const card = openTip(page).locator('.tt-tip-card')
    await expect(card).toBeVisible()
    const m = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, winH: innerHeight, docW: document.documentElement.scrollWidth, winW: innerWidth }))
    expect(m.docH, 'the open tooltip made the page taller than the window').toBeLessThanOrEqual(m.winH)
    expect(m.docW).toBeLessThanOrEqual(m.winW)
    const box = await card.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(1440)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height, 'the card ends inside the window').toBeLessThanOrEqual(900)
  })

  test('opening the card on every row by hover or by focus keeps the 1440x900 page from scrolling', async ({ page }) => {
    await openTint(page, 'someone walking the notes at 1440x900')
    const scrolls = () => page.evaluate(() => ({ h: document.documentElement.scrollHeight - innerHeight, w: document.documentElement.scrollWidth - innerWidth, y: scrollY }))
    const rest = await scrolls()
    expect(rest.h, 'the page fits before any card opens').toBeLessThanOrEqual(0)
    for (let i = 0; i < 11; i++) {
      await note(page, i).hover()
      await expect(openTip(page).locator('.tt-tip-card'), `hover ${i}`).toBeVisible()
      expect(await scrolls(), `hover on note ${i}`).toEqual(rest)
    }
    await page.mouse.move(5, 5)
    for (let i = 0; i < 11; i++) {
      await note(page, i).focus()
      await expect(openTip(page).locator('.tt-tip-card'), `focus ${i}`).toBeVisible()
      expect(await scrolls(), `focus on note ${i}`).toEqual(rest)
    }
  })
})

// ── 4 and 6: a touch screen at 390 ──────────────────────────────────────────
test.describe('the contrast tooltip on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  const open390 = async (page) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await openTint(page, 'someone tapping a tint on a phone')
    // POSITIVE CONTROL: this really is a coarse pointer with no hover.
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
  }

  // Put something else on the clipboard so "a tap does not copy" is a fact about
  // the clipboard and not about a label.
  const SENTINEL = 'nothing copied yet'
  const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())

  test('a tap pins the card under the note and does not copy', async ({ page }) => {
    await open390(page)
    await page.evaluate((s) => navigator.clipboard.writeText(s), SENTINEL)
    await note(page, 6).tap()
    await expect(openTip(page)).toBeVisible()
    await expect(openTip(page)).toContainText('600')
    await expect(openTip(page)).toContainText(BLUE_EVEN_11[6])
    await expect(openTip(page)).toHaveClass(/tt-tip--inline/)
    // It did not copy: the clipboard is as it was and the note still shows its hex.
    await expect(page.locator('.tt-note-hex').nth(6)).toHaveText(BLUE_EVEN_11[6])
    expect(await clipboard(page)).toBe(SENTINEL)
    // The card carries its own two buttons, named for what they do.
    await expect(page.locator('.tt-tip-copy')).toHaveText(`Copy ${BLUE_EVEN_11[6]}`)
    await expect(page.locator('.tt-tip-close')).toHaveText('Close')
  })

  test('the Copy button on the pinned card copies that tint', async ({ page }) => {
    await open390(page)
    await page.evaluate((s) => navigator.clipboard.writeText(s), SENTINEL)
    await note(page, 6).tap()
    await page.locator('.tt-tip-copy').tap()
    expect(await clipboard(page)).toBe(BLUE_EVEN_11[6])
    await expect(page.locator('.tt-tip-copy')).toHaveText('Copied')
    // Pressing a button inside the card is not "a press outside": the card stays.
    await expect(openTip(page)).toHaveCount(1)
  })

  test('Close takes the card away and puts focus back on its note', async ({ page }) => {
    await open390(page)
    await note(page, 3).tap()
    await expect(openTip(page)).toBeVisible()
    await page.locator('.tt-tip-close').tap()
    await expect(page.locator('.tt-tip--inline')).toHaveCount(0)
    await expect(note(page, 3), 'focus goes back to the note it came from').toBeFocused()
    // And that focus did not throw the hover/focus card open again.
    await expect(openTip(page)).toHaveCount(0)
    // Nothing else was copied on the way.
    await expect(page.locator('.tt-note-hex').nth(3)).toHaveText(BLUE_EVEN_11[3])
  })

  test('Close by keyboard does the same: the card goes, focus returns to the note, nothing reopens', async ({ page }) => {
    await open390(page)
    await note(page, 8).tap()
    await page.locator('.tt-tip-close').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.tt-tip--inline')).toHaveCount(0)
    await expect(note(page, 8)).toBeFocused()
    await expect(openTip(page)).toHaveCount(0)
  })

  test('the pinned card scrolls into view with its buttons 16px above the tab bar', async ({ page }) => {
    await open390(page)
    const tabs = page.locator('.pnav-tabs')
    await expect(tabs, 'the phone tab bar is on screen').toBeVisible()
    for (const i of [6, 8, 10]) {
      await note(page, i).tap()
      await expect(page.locator('.tt-tip-copy')).toBeVisible()
      await expect.poll(async () => {
        const [b, t] = [await page.locator('.tt-tip-actions').boundingBox(), await tabs.boundingBox()]
        return Math.round(t.y - (b.y + b.height))
      }, { message: `note ${i}: the buttons end at least 16px above the tab bar` }).toBeGreaterThanOrEqual(16)
      await page.keyboard.press('Escape')
    }
  })

  test('the Copy and Close buttons are 44px targets', async ({ page }) => {
    await open390(page)
    await note(page, 6).tap()
    for (const sel of ['.tt-tip-copy', '.tt-tip-close']) {
      const box = await page.locator(sel).boundingBox()
      expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44)
      expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44)
    }
  })

  test('the tap pins it: it stays until Escape', async ({ page }) => {
    await open390(page)
    await note(page, 2).tap()
    await expect(openTip(page)).toBeVisible()
    // Pinned means it is still there a moment later, with nothing touching it.
    // (A blind wait is the point here: absence of a change cannot be waited for.
    // It is longer than the one-second "Copied" flash and any hover leave.)
    await page.waitForTimeout(1200)
    await expect(openTip(page)).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(openTip(page)).toHaveCount(0)
  })

  test('a press anywhere outside the note lets a pinned tooltip go', async ({ page }) => {
    await open390(page)
    await note(page, 8).tap()
    await expect(openTip(page)).toBeVisible()
    await page.getByRole('heading', { level: 1, name: 'Tint' }).tap()
    await expect(openTip(page)).toHaveCount(0)
  })

  test('a second tap on the same note closes it, and a tap on another moves it', async ({ page }) => {
    await open390(page)
    await note(page, 4).tap()
    await expect(openTip(page)).toContainText('400')
    await note(page, 5).tap()
    await expect(openTip(page)).toHaveCount(1)
    await expect(openTip(page)).toContainText('500')
    await note(page, 5).tap()
    await expect(openTip(page)).toHaveCount(0)
  })

  test('a card pinned by a tap on any of the eleven notes is brought into the window and nothing sits on top of it', async ({ page }) => {
    await open390(page)
    for (let i = 0; i < 11; i++) {
      await note(page, i).tap()
      const card = openTip(page).locator('.tt-tip-card')
      await expect(card, `note ${i}`).toBeVisible()
      // The pinned card is in the flow, under the note, so the page scrolls it
      // into view after it draws; wait for it to be there, then for the fade to end.
      await expect.poll(() => card.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight }), { message: `note ${i}: the card is scrolled into the window` }).toBe(true)
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
      const m = await card.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const probe = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && el.contains(hit) }
        return {
          left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: innerWidth, vh: innerHeight,
          // Four points well inside the card, and its centre, must land on the card.
          covered: [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]
            .filter(([fx, fy]) => !probe(r.left + r.width * fx, r.top + r.height * fy)).length,
        }
      })
      expect(m.left, `note ${i}: card left`).toBeGreaterThanOrEqual(0)
      expect(m.right, `note ${i}: card right`).toBeLessThanOrEqual(m.vw)
      expect(m.top, `note ${i}: card top`).toBeGreaterThanOrEqual(0)
      expect(m.bottom, `note ${i}: card bottom`).toBeLessThanOrEqual(m.vh)
      expect(m.covered, `note ${i}: something else sits on top of the tooltip`).toBe(0)
      await page.keyboard.press('Escape')
      await expect(openTip(page)).toHaveCount(0)
    }
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(sideways, 'the tooltip made the page scroll sideways').toBeLessThanOrEqual(0)
  })

  test('the notes, sliders, switches and fields are 44px targets', async ({ page }) => {
    await open390(page)
    // A target is 44px when a finger 21px either side of its centre still lands on it.
    const hit = (selector) => page.locator(selector).first().evaluate((el) => {
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const lands = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)) }
      const probes = { up: [cx, cy - 21], down: [cx, cy + 21] }
      if (r.width < 44) Object.assign(probes, { left: [cx - 21, cy], right: [cx + 21, cy] })
      return { w: Math.round(r.width), h: Math.round(r.height), misses: Object.entries(probes).filter(([, [x, y]]) => !lands(x, y)).map(([k]) => k) }
    })
    const targets = {
      'a contrast note': '.tt-note',
      'the Lightness slider': '.tl-slider input[aria-label="Lightness"]',
      'the Saturation slider': '.tl-slider input[aria-label="Saturation"]',
      'the Perceived switch': '.tl-pill:text-is("Perceived")',
      'the Linear switch': '.tl-pill:text-is("Linear")',
      'a curve pill': '.tl-pill:text-is("Soft ends")',
      'a steps pill': '.tl-pill:text-is("13 steps")',
      'the hex field': '.tt-hex-input',
      'the colour picker': '.tt-picker',
      'the copy-scale button': '.tt-iconbtn',
    }
    for (const [what, sel] of Object.entries(targets)) {
      const m = await hit(sel)
      expect(m.misses, `${what} (${m.w}x${m.h}): a finger this far from its centre misses it`).toEqual([])
    }
    // Every note, not only the first, is at least 44px tall.
    const heights = await page.locator('.tt-note').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(heights.filter((h) => h < 44), `notes under 44px: ${heights.join(',')}`).toEqual([])
  })
})

// ── The tooltip at the in-between widths ────────────────────────────────────
// Between a phone and a laptop the notes sit two or more to a row, so a note
// near the right edge opens its tooltip leftward. None may run off the window.
for (const width of [768, 1024]) {
  test.describe(`the contrast tooltip at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } })

    test(`opened by focus on each of the eleven notes, it stays inside the window`, async ({ page }) => {
      await openTint(page, `someone keyboarding the notes at ${width}`)
      for (let i = 0; i < 11; i++) {
        await note(page, i).focus()
        const card = openTip(page).locator('.tt-tip-card')
        await expect(card, `note ${i}`).toBeVisible()
        await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
        const m = await card.evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, vw: innerWidth } })
        expect(m.l, `note ${i}: card left`).toBeGreaterThanOrEqual(0)
        expect(m.r, `note ${i}: card right`).toBeLessThanOrEqual(m.vw)
        expect(m.t, `note ${i}: card top`).toBeGreaterThanOrEqual(0)
      }
    })
  })
}

// ── The pinned card covers nothing ──────────────────────────────────────────
// A tap pins the card in the flow under its note. It pushes the notes below it
// down; it must not sit on, or move, anything above it: the notes header, the
// hint and the Curve pills keep the very same boxes with the card open or closed.
for (const width of [390, 768]) {
  test.describe(`the pinned card at ${width} on a touch screen`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 }, hasTouch: true, isMobile: true })

    test('sits in the flow under its note and leaves the header, hint and Curve pills where they were', async ({ page }) => {
      await openTint(page, `someone pinning a tint card at ${width}`)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'a touch screen').toBe(true)
      const watched = {
        'the notes header': page.locator('.tt-notes-head'),
        'the notes label': page.locator('#tt-notes-label'),
        'the hint': page.locator('.tt-notes-hint'),
        'the Curve pills': page.getByRole('group', { name: 'Curve', exact: true }),
        'the Spacing pills': page.getByRole('group', { name: 'Spacing', exact: true }),
        'the first note': note(page, 0),
      }
      const look = async () => Object.fromEntries(await Promise.all(Object.entries(watched).map(async ([k, loc]) => [k, await docBox(loc)])))
      const before = await look()
      const wrapBefore = await docBox(page.locator('.tt-note-wrap').nth(6))
      const noteBefore = await docBox(note(page, 6))

      await note(page, 6).tap()
      const card = page.locator('.tt-tip--inline .tt-tip-card')
      await expect(card).toBeVisible()
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))

      // Nothing above moved by a pixel, and the note itself did not move.
      expect(await look(), 'the card moved something it should not touch').toEqual(before)
      // The note keeps its place and height. On a wide touch screen its wrap spans the
      // row while pinned, so the note may grow wider (never narrower); on a phone it does not.
      const noteNow = await docBox(note(page, 6))
      expect({ x: noteNow.x, y: noteNow.y, h: noteNow.h }, 'the pinned note moved').toEqual({ x: noteBefore.x, y: noteBefore.y, h: noteBefore.h })
      if (width >= 768) expect(noteNow.w, 'the pinned note got narrower').toBeGreaterThanOrEqual(noteBefore.w)
      else expect(noteNow.w, 'the pinned note changed width on a phone').toBe(noteBefore.w)

      // The card is in the flow: it takes room (the note's cell grew by about its height),
      // starts at the note's bottom edge, and overlaps none of the things above.
      const cardBox = await docBox(card)
      const wrapAfter = await docBox(page.locator('.tt-note-wrap').nth(6))
      if (width >= 768) {
        const list = await docBox(page.locator('.tt-notes-list'))
        expect(wrapAfter.w, 'a pinned wrap spans the whole row on a wide touch screen').toBeGreaterThanOrEqual(list.w - 1)
      }
      expect(wrapAfter.h, 'the cell grew to hold the card').toBeGreaterThanOrEqual(wrapBefore.h + cardBox.h - 1)
      expect(cardBox.y, 'the card starts at or below the note').toBeGreaterThanOrEqual(noteBefore.y + noteBefore.h - 1)
      for (const [what, box] of Object.entries(before)) {
        if (what === 'the first note') continue
        expect(overlap(cardBox, box), `the card sits on ${what}`).toBe(false)
      }
      expect(await page.locator('.tt-tip--inline').evaluate((el) => getComputedStyle(el).position)).toBe('static')
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      expect(sideways, 'the card made the page scroll sideways').toBeLessThanOrEqual(0)

      // Closing puts the cell back as it was.
      await page.locator('.tt-tip-close').tap()
      await expect(page.locator('.tt-tip--inline')).toHaveCount(0)
      expect(await look()).toEqual(before)
      expect(await docBox(page.locator('.tt-note-wrap').nth(6))).toEqual(wrapBefore)
    })
  })
}

// ── The hint reads for the pointer in use ───────────────────────────────────
test.describe('the hint above the notes, for a mouse', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('says hover, and only says hover', async ({ page }) => {
    await openTint(page, 'someone with a mouse reading the hint')
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'POSITIVE CONTROL: a fine pointer').toBe(false)
    await expect(page.locator('.tt-hint-fine')).toBeVisible()
    await expect(page.locator('.tt-hint-coarse')).toBeHidden()
    await expect(page.locator('.tt-notes-hint')).toHaveText('Hover a tint for its contrast. Click to copy.', { useInnerText: true })
  })
})

test.describe('the hint above the notes, for a finger', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('says tap, and only says tap', async ({ page }) => {
    await openTint(page, 'someone with a phone reading the hint')
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'POSITIVE CONTROL: a coarse pointer').toBe(true)
    await expect(page.locator('.tt-hint-coarse')).toBeVisible()
    await expect(page.locator('.tt-hint-fine')).toBeHidden()
    await expect(page.locator('.tt-notes-hint')).toHaveText('Tap a tint to see its contrast', { useInnerText: true })
  })
})

// ── The Spacing note ────────────────────────────────────────────────────────
for (const [width, touch] of [[1440, false], [390, true]]) {
  test.describe(`the Spacing note at ${width}`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 }, hasTouch: touch, isMobile: touch })

    test('is on screen under the Spacing pills and describes them', async ({ page }) => {
      await openTint(page, `someone wondering what Spacing does at ${width}`)
      const noteLine = page.locator('.tt-spacing-note')
      await expect(noteLine).toBeVisible()
      await expect(noteLine).toHaveText('Perceived looks even. Linear spaces by light.')
      const pills = page.getByRole('group', { name: 'Spacing', exact: true })
      await expect(pills).toHaveAttribute('aria-describedby', await noteLine.getAttribute('id'))
      const [p, n] = [await docBox(pills), await docBox(noteLine)]
      expect(n.y, 'the note sits under the pills').toBeGreaterThanOrEqual(p.y + p.h - 1)
      expect(overlap(p, n), 'the note sits on the pills').toBe(false)
      // 12px or more, and it stays inside the window.
      expect(await noteLine.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12)
      expect(n.x + n.w).toBeLessThanOrEqual(width)
    })
  })
}

// ── The marks and the best-grade words pass contrast, in both themes ────────
// The tick, dash and cross use the -strong tokens so they hold 3:1 against the
// card; the best-grade word is 12px text and needs 4.5:1 against the notes panel.
for (const theme of ['light', 'dark']) {
  test(`the marks use the -strong tokens and the best-grade words are readable (${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme })
    await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
    const page = await ctx.newPage()
    try {
      await openTint(page, `a reviewer checking the tooltip marks in ${theme}`)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      // A theme change animates colours; read once it has stopped.
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))

      const read = await page.evaluate(() => {
        const css = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop]
        const probe = (token) => { const el = document.createElement('span'); el.style.color = `var(${token})`; document.querySelector('.tt').appendChild(el); const c = getComputedStyle(el).color; el.remove(); return c }
        return {
          tokens: { ok: probe('--ok-strong'), warn: probe('--warn-strong'), err: probe('--err-strong') },
          marks: {
            pass: css('.tt-tip-row[data-pass="true"] .tt-tip-mark', 'color'),
            large: css('.tt-tip-row[data-grade="large"] .tt-tip-mark', 'color'),
            fail: css('.tt-tip-row[data-grade="fail"] .tt-tip-mark', 'color'),
          },
          cardBg: css('.tt-tip-card', 'backgroundColor'),
          panelBg: css('.tt-notes', 'backgroundColor'),
          words: [...document.querySelectorAll('.tt-note-best')].map((e) => ({ text: e.textContent, color: getComputedStyle(e).color })),
        }
      })

      const rgb = (c) => rgbOfCss(page, c)
      const tokens = { ok: await rgb(read.tokens.ok), warn: await rgb(read.tokens.warn), err: await rgb(read.tokens.err) }
      const cardBg = await rgb(read.cardBg)
      const panelBg = await rgb(read.panelBg)
      expect(cardBg[3], 'the card is opaque, so the ratio below means something').toBe(255)
      expect(panelBg[3], 'the notes panel is opaque').toBe(255)

      for (const [kind, token] of [['pass', 'ok'], ['large', 'warn'], ['fail', 'err']]) {
        const colour = await rgb(read.marks[kind])
        expect(colour, `the ${kind} mark uses --${token}-strong`).toEqual(tokens[token])
        expect(ratioRgb(colour, cardBg), `the ${kind} mark on the card (${theme})`).toBeGreaterThanOrEqual(3)
      }
      expect(read.words.length).toBe(11)
      for (const w of read.words) {
        const colour = await rgb(w.color)
        expect(colour, `the "${w.text}" word is in --ok-strong`).toEqual(tokens.ok)
        expect(ratioRgb(colour, panelBg), `the "${w.text}" word on the notes panel (${theme})`).toBeGreaterThanOrEqual(4.5)
      }
    } finally {
      await ctx.close()
    }
  })
}
