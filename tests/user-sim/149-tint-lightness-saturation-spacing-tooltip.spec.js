// /create/tint: THE LIGHTNESS AND SATURATION SLIDERS, THE SPACING SWITCH AND THE
// CONTRAST TOOLTIP.
//
// Lightness (-50..+50) and Saturation (0..150%) replaced Hue and Chroma, and
// both shape the ramp. A Perceived / Linear Spacing switch spaces the steps
// between the two ends. Each tint value in the Contrast notes is a copy button
// whose tooltip shows white and black text against that tint: opened by hover,
// focus or a tap (a tap pins it and copies), closed by Escape or a press outside.
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
//      A tap also pins it, copies, and a press elsewhere lets it go.
//   5. Both rows show, each with a ratio, a tick or a cross, and a word; the
//      ratio and the word agree with WCAG worked out here from the hex.
//   6. At 390 on a touch screen the targets reach 44px and the tooltip stays
//      inside the window, on top of whatever it lands near.
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
    await expect(openTip(page)).toHaveCount(1)
    // Not pinned: moving focus on lets it go.
    await page.keyboard.press('Tab')
    await expect(openTip(page)).toHaveCount(1)
    await expect(openTip(page)).toContainText('500')
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
        else if (row.pass === 'true') passMarks.add(row.mark)
      })
    }
    // A pass is always one mark and a fail another, so the mark is not the only
    // signal and never the same for both. ("Large text only" is not asserted.)
    expect(passMarks.size, 'a pass is always the same mark').toBe(1)
    expect(failMarks.size, 'a fail is always the same mark').toBe(1)
    expect([...passMarks][0]).not.toBe([...failMarks][0])
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

  test('a tap opens the tooltip and copies the tint', async ({ page }) => {
    await open390(page)
    await note(page, 6).tap()
    await expect(openTip(page)).toBeVisible()
    await expect(openTip(page)).toContainText('600')
    await expect(openTip(page)).toContainText(BLUE_EVEN_11[6])
    await expect(page.locator('.tt-note-hex').nth(6)).toHaveText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(BLUE_EVEN_11[6])
  })

  test('the tap pins it: it stays until Escape', async ({ page }) => {
    await open390(page)
    await note(page, 2).tap()
    await expect(openTip(page)).toBeVisible()
    // Pinned means it is still there a moment later, with nothing touching it.
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

  test('a tooltip opened by a tap on any of the eleven notes stays inside the window and above everything else', async ({ page }) => {
    await open390(page)
    for (let i = 0; i < 11; i++) {
      await note(page, i).tap()
      const card = openTip(page).locator('.tt-tip-card')
      await expect(card, `note ${i}`).toBeVisible()
      // The entrance fades; wait for it to finish before measuring.
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
