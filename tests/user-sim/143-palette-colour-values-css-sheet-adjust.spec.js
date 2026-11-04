// Palette Builder polish, walked as a person walks it:
//
//   1. A swatch's "..." menu has "Colour values": a panel of six notations, each
//      with a copy button that puts exactly that text on the clipboard.
//   2. On a phone the footer's "Palette CSS" opens a bottom-sheet dialog (focus
//      inside, Escape and a tap on the backdrop close it, focus goes back to the
//      button). From tablet width the same button just copies ("Copy CSS").
//   3. The four "Adjust all" sliders are one size, and the one you click shows
//      its focus ring on the pill you see, not floating off the 24px control.
//   4. The swatch name sits on the swatch's centre line.
//
// The colours are fixed by the URL, so every expected string is a hand-worked
// literal (see tests/unit/colour-formats.test.js for the working).
//
// MUTATIONS (each verified red by hand, then restored):
//   · colourFormats.js: print HSB's lightness as its saturation  -> 1 and 2 red.
//   · PaletteBuilder.jsx: drop useModalDialog from PaletteCssSheet  -> the focus,
//     Escape and focus-return cases go red.
//   · palette-builder.css: drop the `.plb-adjust-fields` grid / `.tl-slider`
//     grid (go back to `flex: 1 1 210px`)  -> the equal-width case goes red.
//   · palette-builder.css: put the focus outline back on the range itself with a
//     3px offset  -> the ring case goes red (the ring is 5px off the track).
//   · palette-builder.css: `.plb-col-body { text-align: left }`  -> 4 goes red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const BOARD = '/create/palette?c=14224A,249EAF,F2C14E,2563EB,C0392B'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** A context at an exact width (touch metrics on a phone), clipboard allowed, on the fixed board. */
async function at(browser, width, height = 900) {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height } })
  await ctx.addInitScript(() => { try { localStorage.setItem('vs-t', 'light') } catch { /* private mode */ } })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, `palette visitor at ${width}px`)
  await go(page, BOARD)
  await expect(page.locator('.plb-col')).toHaveCount(5)
  return { ctx, page }
}

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())

/** Open swatch `i`'s "..." menu from the keyboard and choose "Colour values". */
async function openColourValues(page, i) {
  await page.locator('.plb-col').nth(i).locator('.plb-tool--more').focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Colour actions' })
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Colour values', exact: true }).click()
  const panel = page.getByRole('dialog', { name: /^Colour values for / })
  await expect(panel).toBeVisible()
  return panel
}

// swatch 3 and swatch 0 of BOARD. OKLCH is checked by its lightness only, plus
// that the copy button hands over what the row shows; its chroma and hue are
// pinned (to the true values) in tests/unit/colour-formats.test.js.
const SWATCH_3 = {
  hex: '#2563EB',
  rows: [
    ['HEX', '#2563EB'],
    ['RGB', 'rgb(37, 99, 235)'],
    ['HSL', 'hsl(221, 83%, 53%)'],
    ['HSB', 'hsb(221, 84%, 92%)'],
    ['CMYK', 'cmyk(84%, 58%, 0%, 8%)'],
    ['OKLCH', /^oklch\(54\.6% \d(\.\d+)? \d+(\.\d)?\)$/],
  ],
}
const SWATCH_0 = {
  hex: '#14224A',
  rows: [
    ['HEX', '#14224A'],
    ['RGB', 'rgb(20, 34, 74)'],
    ['HSL', 'hsl(224, 57%, 18%)'],
    ['HSB', 'hsb(224, 73%, 29%)'],
    ['CMYK', 'cmyk(73%, 54%, 0%, 71%)'],
    ['OKLCH', /^oklch\(26\.5% \d(\.\d+)? \d+(\.\d)?\)$/],
  ],
}

test.describe('swatch "..." menu: Colour values', () => {
  for (const [index, swatch] of [[3, SWATCH_3], [0, SWATCH_0]]) {
    test(`swatch ${index + 1} (${swatch.hex}) lists six notations, each as the hand-worked value`, async ({ browser }) => {
      const { ctx, page } = await at(browser, 1440)
      const panel = await openColourValues(page, index)
      await expect(panel).toHaveAttribute('aria-label', `Colour values for ${swatch.hex}`)

      const rows = panel.locator('.plb-val-row')
      await expect(rows, 'six notations').toHaveCount(6)
      const shown = await rows.evaluateAll((els) => els.map((r) => [
        r.querySelector('.plb-val-k').textContent.trim(),
        r.querySelector('.plb-val-v').textContent.trim(),
      ]))
      expect(shown.map(([k]) => k), 'labels, in order').toEqual(swatch.rows.map(([k]) => k))
      shown.forEach(([k, v], n) => {
        const want = swatch.rows[n][1]
        if (want instanceof RegExp) expect(v, k).toMatch(want)
        else expect(v, k).toBe(want)
      })
      await ctx.close()
    })
  }

  test('each copy button puts that row\'s text on the clipboard', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const panel = await openColourValues(page, 3)
    const rows = panel.locator('.plb-val-row')
    await expect(rows).toHaveCount(6)

    // The clipboard is reset before each press, so a button that copies nothing
    // cannot pass on the previous button's text.
    for (let n = 0; n < 6; n += 1) {
      const row = rows.nth(n)
      const [label, text] = [
        (await row.locator('.plb-val-k').textContent()).trim(),
        (await row.locator('.plb-val-v').textContent()).trim(),
      ]
      await page.evaluate(() => navigator.clipboard.writeText('nothing copied yet'))
      await row.getByRole('button', { name: `Copy ${label} ${text}` }).click()
      await expect.poll(() => clipboard(page), { message: `${label} copy button` }).toBe(text)
      // And for the five that are not OKLCH, the hand-worked literal itself.
      if (label !== 'OKLCH') expect(text).toBe(SWATCH_3.rows[n][1])
    }
    await ctx.close()
  })

  test('the close button dismisses the panel and a second swatch opens its own values', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const first = await openColourValues(page, 3)
    await first.getByRole('button', { name: 'Close colour values' }).click()
    await expect(page.getByRole('dialog', { name: /^Colour values for / })).toHaveCount(0)

    const second = await openColourValues(page, 0)
    await expect(second).toHaveAttribute('aria-label', 'Colour values for #14224A')
    await expect(page.getByRole('dialog', { name: /^Colour values for / }), 'only one panel at a time').toHaveCount(1)
    await ctx.close()
  })
})

test.describe('Palette CSS', () => {
  test('on a phone the footer button opens a dialog with focus inside, and Escape hands focus back to it', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, 844)
    const opener = page.locator('.plb-adjust .plb-copycss')
    await opener.scrollIntoViewIfNeeded()
    await expect(opener).toHaveText('Palette CSS')
    await expect(opener, 'a dialog opener says so').toHaveAttribute('aria-haspopup', 'dialog')
    await expect(page.getByRole('dialog', { name: 'Palette CSS' }), 'closed to begin with').toHaveCount(0)

    await opener.focus()
    await page.keyboard.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Palette CSS' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toHaveAttribute('aria-modal', 'true')
    await expect(opener).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(() => sheet.evaluate((el) => el.contains(document.activeElement)), { message: 'focus is inside the dialog' }).toBe(true)

    // Tab never walks out into the board behind it.
    for (let n = 0; n < 8; n += 1) {
      await page.keyboard.press('Tab')
      expect(await sheet.evaluate((el) => el.contains(document.activeElement)), `Tab ${n + 1} stays inside`).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.activeElement?.classList?.contains('plb-copycss')), { message: 'focus returns to the Palette CSS button' }).toBe(true)
    await expect(opener).toHaveAttribute('aria-expanded', 'false')
    await ctx.close()
  })

  test('a tap on the backdrop closes it, a tap inside does not, and focus returns to the button', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, 844)
    const opener = page.locator('.plb-adjust .plb-copycss')
    await opener.scrollIntoViewIfNeeded()
    await opener.tap()
    const sheet = page.getByRole('dialog', { name: 'Palette CSS' })
    await expect(sheet).toBeVisible()

    // The sheet is a bottom sheet: there is backdrop left above it to tap.
    const box = await sheet.boundingBox()
    expect(box.y, 'backdrop is showing above the sheet').toBeGreaterThan(80)
    expect(Math.round(box.y + box.height), 'the sheet sits on the bottom edge').toBeGreaterThanOrEqual(840)

    await sheet.locator('.tl-sheet-title').tap()
    await expect(sheet, 'a tap inside the sheet leaves it open').toBeVisible()

    await page.touchscreen.tap(195, Math.round(box.y / 2))
    await expect(sheet).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.activeElement?.classList?.contains('plb-copycss')), { message: 'focus returns to the Palette CSS button' }).toBe(true)
    await ctx.close()
  })

  test('the sheet shows the palette CSS and its Copy CSS button copies exactly that, then closes', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390, 844)
    const opener = page.locator('.plb-adjust .plb-copycss')
    await opener.scrollIntoViewIfNeeded()
    await opener.tap()
    const sheet = page.getByRole('dialog', { name: 'Palette CSS' })
    await expect(sheet).toBeVisible()
    const shown = await sheet.locator('.tl-code').innerText()
    expect(shown, 'the sheet carries CSS custom properties').toMatch(/--[a-z0-9-]+\s*:\s*#[0-9A-Fa-f]{6}/)
    // All five swatches are in it, by their hex.
    for (const hex of ['14224A', '249EAF', 'F2C14E', '2563EB', 'C0392B']) expect(shown.toUpperCase(), `#${hex}`).toContain(hex)

    await page.evaluate(() => navigator.clipboard.writeText('nothing copied yet'))
    await sheet.getByRole('button', { name: 'Copy CSS' }).tap()
    await expect.poll(() => clipboard(page), { message: 'the clipboard holds the CSS' }).toMatch(/--[a-z0-9-]+\s*:\s*#[0-9A-Fa-f]{6}/)
    const copied = await clipboard(page)
    expect(copied.replace(/\s+/g, ' ').trim()).toBe(shown.replace(/\s+/g, ' ').trim())
    await expect(sheet).toHaveCount(0)
    await ctx.close()
  })

  test('from tablet width up the button copies straight away and opens no dialog', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    const button = page.locator('.plb-adjust .plb-copycss')
    await button.scrollIntoViewIfNeeded()
    await expect(button).toHaveText('Copy CSS')
    await page.evaluate(() => navigator.clipboard.writeText('nothing copied yet'))
    await button.click()
    await expect.poll(() => clipboard(page)).toMatch(/--[a-z0-9-]+\s*:\s*#[0-9A-Fa-f]{6}/)
    await expect(page.getByRole('dialog', { name: 'Palette CSS' })).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('Adjust all', () => {
  const IDS = ['plb-h', 'plb-s', 'plb-b', 'plb-temp']

  test('the four sliders are the same width at 1440px', async ({ page }) => {
    watch(page, 'designer comparing the four Adjust all sliders')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, BOARD)
    await expect(page.locator('#plb-h')).toBeVisible()
    const boxes = []
    for (const id of IDS) boxes.push(await page.locator(`#${id}`).boundingBox())
    // POSITIVE CONTROL: they are real sliders on one row, not four zero-width boxes.
    for (const b of boxes) expect(b.width, 'slider has a width').toBeGreaterThan(80)
    expect(new Set(boxes.map((b) => Math.round(b.y))).size, 'one row at 1440px').toBe(1)
    const widths = boxes.map((b) => b.width)
    expect(
      Math.max(...widths) - Math.min(...widths),
      `slider widths differ by more than 1px: ${widths.map((w) => w.toFixed(1)).join(' / ')}`,
    ).toBeLessThanOrEqual(1)
  })

  test('the four sliders are the same width when the row wraps to two (820px) and to one (390px)', async ({ page }) => {
    watch(page, 'designer on a narrower screen')
    for (const width of [820, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, BOARD)
      await expect(page.locator('#plb-h')).toBeVisible()
      const widths = []
      for (const id of IDS) widths.push((await page.locator(`#${id}`).boundingBox()).width)
      widths.forEach((w) => expect(w, `a slider at ${width}px has a width`).toBeGreaterThan(60))
      expect(Math.max(...widths) - Math.min(...widths), `at ${width}px: ${widths.map((w) => w.toFixed(1)).join(' / ')}`).toBeLessThanOrEqual(1)
    }
  })

  test('a clicked slider shows its ring on the track, not floating off the control', async ({ page }) => {
    watch(page, 'designer clicking an Adjust all slider')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, BOARD)
    const range = page.locator('#plb-h')
    await range.scrollIntoViewIfNeeded()
    await expect(range).toBeVisible()

    // The track is a pseudo-element Chrome does not expose to getComputedStyle,
    // so look at the pixels: a 1px-wide column through the slider, 12px above to
    // 36px below its top, read back as rows of colour.
    const ring = await page.locator('#plb-h').evaluate((el) => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--tl-link)'
      el.parentElement.appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c.match(/\d+/g).slice(0, 3).map(Number)
    })
    const rowsAt = async () => {
      const b = await range.boundingBox()
      const png = await page.screenshot({ clip: { x: b.x + b.width * 0.15, y: b.y - 12, width: 1, height: 48 } })
      return page.evaluate(async (b64) => {
        const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
        const bmp = await createImageBitmap(new Blob([bytes]))
        const cv = new OffscreenCanvas(bmp.width, bmp.height)
        const cx = cv.getContext('2d')
        cx.drawImage(bmp, 0, 0)
        const d = cx.getImageData(0, 0, bmp.width, bmp.height).data
        return Array.from({ length: bmp.height }, (_, y) => [d[y * 4], d[y * 4 + 1], d[y * 4 + 2]])
      }, png.toString('base64'))
    }
    const differs = (a, b, tol) => Math.max(...a.map((v, i) => Math.abs(v - b[i]))) > tol
    const near = (px, to) => !differs(px, to, 60)
    const nonGround = (rows) => rows.map((px, y) => (differs(px, rows[0], 12) ? y : -1)).filter((y) => y >= 0)

    // The slider at rest: the only thing in the column is the track.
    const rest = await rowsAt()
    const trackRows = nonGround(rest)
    const top = Math.min(...trackRows)
    const bottom = Math.max(...trackRows)
    expect(bottom - top + 1, 'the drawn track is the 20px pill').toBe(20)

    await range.click({ position: { x: 100, y: 12 } })
    await page.mouse.move(5, 5)
    await expect(range).toBeFocused()
    const focused = await rowsAt()

    // Whatever now shows outside the track is the ring.
    const ringRows = nonGround(focused).filter((y) => y < top || y > bottom)
    const above = ringRows.filter((y) => y < top)
    const below = ringRows.filter((y) => y > bottom)
    expect(above.length, 'a ring above the track').toBeGreaterThan(0)
    expect(below.length, 'a ring below the track').toBeGreaterThan(0)
    expect(above.some((y) => near(focused[y], ring)), 'the ring above is the link colour').toBe(true)
    expect(below.some((y) => near(focused[y], ring)), 'the ring below is the link colour').toBe(true)
    // It hugs the pill: at most 3px of ground between track and ring (2px by design).
    expect(top - Math.max(...above) - 1, 'ring is within 3px of the top edge of the track').toBeLessThanOrEqual(3)
    expect(Math.min(...below) - bottom - 1, 'ring is within 3px of the bottom edge of the track').toBeLessThanOrEqual(3)
    // And it is a ring a couple of pixels thick, not a filled bar.
    expect(above.length, 'ring thickness above').toBeLessThanOrEqual(3)
    expect(below.length, 'ring thickness below').toBeLessThanOrEqual(3)
    // The track itself is untouched by focus.
    expect(nonGround(focused).filter((y) => y >= top && y <= bottom).length, 'the track is still 20 rows').toBe(20)
  })
})

test.describe('swatch name', () => {
  test('is centred on the swatch at 1440px', async ({ page }) => {
    watch(page, 'designer reading the swatch names')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)

    const names = await page.locator('.plb-col').evaluateAll((cols) => cols.map((col) => {
      const name = col.querySelector('.plb-name')
      const range = document.createRange()
      range.selectNodeContents(name)
      const text = range.getBoundingClientRect()
      const box = col.getBoundingClientRect()
      return {
        words: name.textContent.trim(),
        textAlign: getComputedStyle(name).textAlign,
        bodyAlign: getComputedStyle(name.parentElement).textAlign,
        offCentre: Math.abs((text.left + text.right) / 2 - (box.left + box.right) / 2),
        colWidth: box.width,
      }
    }))
    expect(names.length).toBe(5)
    for (const n of names) {
      expect(n.words.length, 'the swatch has a name').toBeGreaterThan(3)
      expect(n.colWidth, `${n.words}: a real column`).toBeGreaterThan(150)
      expect(n.textAlign, `${n.words}: text-align`).toBe('center')
      expect(n.bodyAlign, `${n.words}: the body it sits in`).toBe('center')
      expect(n.offCentre, `${n.words} sits ${n.offCentre.toFixed(1)}px off the swatch's centre line`).toBeLessThanOrEqual(2)
    }
  })
})
