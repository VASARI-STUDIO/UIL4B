// Font Pair: suggestions drawn as compact rows, a specimen-first phone with a
// sheet per family, lock / shuffle / swap / undo, typed words in the headings only,
// and an import that loads every weight and style the page draws.
//   1  each suggestion row is ONE button: the family, its action, and a line of
//      running text in that face; the reason sits once above its group, not per row
//   2  at 390 the specimen sits above two family rows, the panel is gone, and each
//      row (and its dock pill) opens a sheet holding that family's controls
//   3  Shuffle (in the heading card) keeps a locked side, never makes a pair of one
//      family; Swap and Undo stay on the toolbar
//   4  typed text fills the heading slots only
//   5  the export asks for the regular, 600 and bold weights and the italic
//
// MUTATIONS (each should fail the spec named):
//   - put a .fpr-card-head or a per-row reason back in the row  -> 1
//   - render the panel (not the rows and sheet) on a phone      -> 2
//   - make shufflePair ignore `lock`                            -> 3 (lock tests)
//   - let shufflePair draw the body's own family                -> 3 (never one family)
//   - put `sample` back into .fpr-lede / .fpr-body              -> 4
//   - drop the 600 / italic from bodyFaceWeights                -> 5
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const mk = (family, category, variants, popularity, italics = true) => ({
  family, category, variants, subsets: ['latin'], popularity, italics,
})
// Archivo and IBM Plex Sans lead: they are the pair the page opens on, so the
// fixture catalogue has to hold them or both slots fall back to its first entry.
const FONTS = [
  mk('Archivo', 'sans-serif', [400, 500, 600, 700, 800, 900], 0),
  mk('IBM Plex Sans', 'sans-serif', [100, 200, 300, 400, 500, 600, 700], 1),
  mk('Playfair Display', 'serif', [400, 500, 600, 700, 800, 900], 2),
  mk('Inter', 'sans-serif', [100, 400, 500, 600, 700, 900], 3),
  mk('Roboto', 'sans-serif', [100, 400, 500, 700, 900], 4),
  mk('Lora', 'serif', [400, 500, 600, 700], 5),
  mk('Merriweather', 'serif', [300, 400, 700, 900], 6),
  mk('Source Serif 4', 'serif', [200, 400, 600, 700, 900], 7),
  mk('Poppins', 'sans-serif', [100, 400, 500, 600, 700, 900], 8, false),
]

// From 768 the panel's suggestion rows are in the page; on a phone they live in
// the body family's sheet, so the page itself holds the two family rows.
async function open(page, width = 1440) {
  watch(page, `a designer pairing fonts at ${width}px`)
  await page.addInitScript((fonts) => {
    try { localStorage.setItem('vs-gf-catalog', JSON.stringify({ t: Date.now(), fonts })) } catch { /* private mode */ }
  }, FONTS)
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
  await go(page, '/create/font-pair')
  if (width < 768) await expect(page.locator('.fpr-frow')).toHaveCount(2)
  else await expect(page.locator('.fpr-card')).toHaveCount(6)
}

const heading = (page) => page.locator('.fpr-pair span').first()
const body = (page) => page.locator('.fpr-pair span').last()
const toolbar = (page) => page.locator('.fpr-page .tl-toolbar')
// The heading's own action: Shuffle lives on the heading family card, not the toolbar.
const shuffleBtn = (page) => page.locator('.fpr-fam').first().getByRole('button', { name: /^Shuffle/ })
const htmlOverflow = (page) => page.evaluate(() => getComputedStyle(document.documentElement).overflow)

test.describe('Font Pair · suggestions are rows', () => {
  test('each row is one button with the face in view, and the reason sits once per group', async ({ page }) => {
    await open(page)
    const rows = await page.locator('.fpr-card').evaluateAll((els) => els.map((li) => {
      const q = (s) => li.querySelector(s)
      const btn = li.querySelector('button')
      const why = document.getElementById(btn.getAttribute('aria-describedby') || '')
      return {
        buttons: li.querySelectorAll('button, a, summary').length,
        nested: li.querySelectorAll('details, .fpr-card .fpr-card').length,
        family: q('.fpr-card-name').textContent.trim(),
        textFont: getComputedStyle(q('.fpr-card-text')).fontFamily,
        perRowHead: li.querySelectorAll('.fpr-card-head').length,
        perRowReason: li.querySelectorAll('.fpr-card-reason, .fpr-reason').length,
        reasonLen: why ? why.textContent.trim().length : 0,
        reasonOutsideRow: !!why && !li.contains(why),
        tap: btn.getBoundingClientRect().height,
      }
    }))
    expect(rows).toHaveLength(6)
    for (const r of rows) {
      expect(r.buttons, 'a row is one tap target').toBe(1)
      expect(r.nested, 'no card or disclosure inside a row').toBe(0)
      expect(r.perRowHead, 'a row still repeats the heading sample').toBe(0)
      expect(r.perRowReason, 'a row still carries its own reason').toBe(0)
      expect(r.textFont, `the running line is not in ${r.family}`).toContain(r.family)
      expect(r.reasonLen, 'the row is not described by a reason above its group').toBeGreaterThan(20)
      expect(r.reasonOutsideRow).toBe(true)
      expect(r.tap).toBeGreaterThanOrEqual(44)
    }
    // One reason per group: fewer lines than rows.
    const reasons = await page.locator('.fpr-reason').count()
    expect(reasons, 'every row repeats its reason').toBeLessThan(rows.length)
    expect(reasons).toBeGreaterThan(0)
    await expect(page.getByText('Why this pairs')).toHaveCount(0)
  })

  test('pressing a row uses that body', async ({ page }) => {
    await open(page)
    const row = page.locator('.fpr-card').nth(1)
    const family = (await row.locator('.fpr-card-name').innerText()).trim()
    await row.getByRole('button').click()
    await expect(body(page)).toHaveText(family)
    await expect(row.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  test('the page opens on Archivo 800 over IBM Plex Sans 400', async ({ page }) => {
    await open(page)
    await expect(heading(page)).toHaveText('Archivo')
    await expect(body(page)).toHaveText('IBM Plex Sans')
    await expect(page.getByRole('button', { name: 'Heading weight: 800' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Body weight: 400' })).toBeVisible()
  })
})

test.describe('Font Pair · phone', () => {
  test('at 390 the specimen is above two family rows, and the panel is gone', async ({ page }) => {
    await open(page, 390)
    const read = await page.evaluate(() => {
      const specimen = document.querySelector('.fpr-specimen')
      const rows = document.querySelector('.fpr-fampair')
      return {
        dom: !!(specimen.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING),
        specimenTop: specimen.getBoundingClientRect().top,
        specimenBottom: specimen.getBoundingClientRect().bottom,
        rowsTop: rows.getBoundingClientRect().top,
        panel: document.querySelectorAll('.fpr-config, .fpr-panel').length,
        cards: document.querySelectorAll('.fpr-fam, .fpr-card').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    expect(read.dom, 'the specimen is not first in the DOM').toBe(true)
    expect(read.specimenTop).toBeLessThan(844)
    expect(read.specimenBottom, 'the specimen is not above the family rows').toBeLessThanOrEqual(read.rowsTop + 1)
    expect(read.panel, 'the panel is still on a phone').toBe(0)
    expect(read.cards, 'family cards or suggestions render outside a sheet').toBe(0)
    expect(read.overflow).toBeLessThanOrEqual(1)
    const dock = page.locator('.fpr-dock')
    await expect(dock.getByRole('button', { name: 'Copy CSS' })).toBeVisible()
    await expect(dock.getByRole('button', { name: /^Heading family, Archivo, weight 800/ })).toBeVisible()
    await expect(dock.getByRole('button', { name: /^Body family, IBM Plex Sans, weight 400/ })).toBeVisible()
    await expect(dock.getByRole('button', { name: 'Save to a project' })).toBeVisible()
  })

  test('a row opens its sheet; Use this pair changes the body and the sheet stays; Escape closes and frees the page', async ({ page }) => {
    await open(page, 390)
    await page.locator('.fpr-frow').nth(1).click()
    const sheet = page.getByRole('dialog', { name: 'Body family' })
    await expect(sheet).toBeVisible()
    expect(await htmlOverflow(page), 'the page still scrolls behind the sheet').toBe('hidden')
    await expect(sheet.locator('.fpr-fam')).toHaveCount(1)
    await expect(sheet.locator('.fpr-card')).toHaveCount(6)
    // The sheet sits above the dock: whatever is under the dock's centre is the sheet or its scrim.
    const above = await page.evaluate(() => {
      const d = document.querySelector('.fpr-dock').getBoundingClientRect()
      const hit = document.elementFromPoint(d.left + d.width / 2, d.top + d.height / 2)
      return !!hit?.closest('.fpr-sheet, .tl-sheet-scrim')
    })
    expect(above, 'the dock shows through the sheet').toBe(true)
    const pick = sheet.locator('.fpr-card').nth(1)
    const family = (await pick.locator('.fpr-card-name').innerText()).trim()
    await pick.getByRole('button').click()
    await expect(page.locator('.fpr-dock .fpr-pill-n').nth(1)).toHaveText(family)
    await expect(sheet, 'the sheet closed on the pick').toBeVisible()
    await expect(page.locator('.toast.show'), 'the confirmation is not on screen').toContainText(family)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    expect(await htmlOverflow(page), 'the page stayed locked after the sheet closed').not.toBe('hidden')
  })

  test('the heading sheet carries Shuffle, Browse, the weight menu and Lock; a locked heading survives Shuffle', async ({ page }) => {
    await open(page, 390)
    await page.locator('.fpr-dock .fpr-pill').first().click()
    const sheet = page.getByRole('dialog', { name: 'Heading family' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: /^Shuffle/ })).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Browse heading family' })).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Heading weight: 800' })).toBeVisible()
    await sheet.getByRole('button', { name: 'Lock heading family' }).click()
    for (let i = 0; i < 6; i += 1) {
      await sheet.getByRole('button', { name: /^Shuffle/ }).click()
      await expect(page.locator('.fpr-dock .fpr-pill-n').first()).toHaveText('Archivo')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })
})

test.describe('Font Pair · lock, shuffle, swap, undo', () => {
  test('Shuffle is in the heading card, not on the toolbar', async ({ page }) => {
    await open(page)
    await expect(shuffleBtn(page)).toHaveCount(1)
    await expect(page.locator('.fpr-fam').nth(1).getByRole('button', { name: /^Shuffle/ })).toHaveCount(0)
    await expect(toolbar(page).getByRole('button', { name: /^Shuffle/ })).toHaveCount(0)
  })

  test('a locked heading stays through shuffles and the body never becomes the same family', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Lock heading family' }).click()
    await expect(page.getByRole('button', { name: 'Lock heading family' })).toHaveAttribute('aria-pressed', 'true')
    const shuffle = shuffleBtn(page)
    await expect(shuffle, 'with the heading locked Shuffle names the side it moves').toHaveAccessibleName('Shuffle the body')
    for (let i = 0; i < 8; i += 1) {
      await shuffle.click()
      await expect(heading(page)).toHaveText('Archivo')
      expect((await body(page).innerText()).trim()).not.toBe('Archivo')
    }
  })

  test('a locked body stays, the heading moves, and the pair is never one family', async ({ page }) => {
    await open(page)
    const kept = (await body(page).innerText()).trim()
    await page.getByRole('button', { name: 'Lock body family' }).click()
    const seen = new Set()
    for (let i = 0; i < 8; i += 1) {
      await shuffleBtn(page).click()
      await expect(body(page)).toHaveText(kept)
      const h = (await heading(page).innerText()).trim()
      expect(h).not.toBe(kept)
      seen.add(h)
    }
    expect(seen.size, 'the heading never moved').toBeGreaterThan(0)
  })

  test('with nothing locked a shuffle never lands on one family', async ({ page }) => {
    await open(page)
    for (let i = 0; i < 12; i += 1) {
      await shuffleBtn(page).click()
      expect((await heading(page).innerText()).trim()).not.toBe((await body(page).innerText()).trim())
    }
  })

  test('swap exchanges the two families and undo puts them back', async ({ page }) => {
    await open(page)
    const undo = toolbar(page).getByRole('button', { name: /^Undo/ })
    await expect(undo, 'nothing to undo on a fresh page').toBeDisabled()
    const h = (await heading(page).innerText()).trim()
    const b = (await body(page).innerText()).trim()
    await toolbar(page).getByRole('button', { name: /^Swap/ }).click()
    await expect(heading(page)).toHaveText(b)
    await expect(body(page)).toHaveText(h)
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect(heading(page)).toHaveText(h)
    await expect(body(page)).toHaveText(b)
    await expect(undo).toBeDisabled()
  })

  test('undo steps back through two changes', async ({ page }) => {
    await open(page)
    const first = [(await heading(page).innerText()).trim(), (await body(page).innerText()).trim()]
    await shuffleBtn(page).click()
    const second = [(await heading(page).innerText()).trim(), (await body(page).innerText()).trim()]
    await toolbar(page).getByRole('button', { name: /^Swap/ }).click()
    const undo = toolbar(page).getByRole('button', { name: /^Undo/ })
    await undo.click()
    await expect(heading(page)).toHaveText(second[0])
    await expect(body(page)).toHaveText(second[1])
    await undo.click()
    await expect(heading(page)).toHaveText(first[0])
    await expect(body(page)).toHaveText(first[1])
  })

  test('at 390 Swap and Undo are reachable (on the row or in More) and the toolbar stays one row', async ({ page }) => {
    await open(page, 390)
    const bar = toolbar(page)
    await expect(bar, 'the toolbar is still measuring').not.toHaveClass(/is-measuring/)
    // Centres, not tops: the row's children differ in height and are centred on one line.
    const centres = await bar.locator(':scope > *').evaluateAll((els) => els
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).position !== 'absolute' })
      .map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.top + r.height / 2) }))
    expect(centres.length, 'the toolbar rendered its controls').toBeGreaterThanOrEqual(2)
    expect(Math.max(...centres) - Math.min(...centres), 'the toolbar wrapped').toBeLessThanOrEqual(2)
    const swapOnRow = await bar.getByRole('button', { name: /^Swap/ }).count()
    if (!swapOnRow) {
      await bar.getByRole('button', { name: /More/ }).click()
      await expect(page.getByRole('menuitem', { name: /Swap heading and body/ }).or(page.getByRole('button', { name: /Swap heading and body/ }))).toBeVisible()
    }
  })
})

test.describe('Font Pair · typed text', () => {
  test('goes in the headings only; the body keeps its paragraph', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Article' }).click()
    const words = 'Ship interfaces that hold up'
    const before = await page.locator('.fpr-body').innerText()
    // From 1024 the field sits in the stage head.
    await expect(page.locator('#fpr-text-stage')).toBeVisible()
    await page.locator('#fpr-text-stage').fill(words)
    await expect(page.locator('.fpr-h1')).toHaveText(words)
    await expect(page.locator('.fpr-h2')).toHaveText(words)
    expect(await page.locator('.fpr-lede').innerText()).not.toContain(words)
    expect(await page.locator('.fpr-body').innerText()).toBe(before)
    expect(before).not.toContain(words)
  })

  test('on a tablet the field sits in the panel, between the cards and the suggestions', async ({ page }) => {
    await open(page, 768)
    await expect(page.locator('#fpr-text-stage')).toHaveCount(0)
    const field = page.locator('.fpr-panel #fpr-text')
    await expect(field).toBeVisible()
    const order = await page.evaluate(() => {
      const top = (s) => document.querySelector(s).getBoundingClientRect().top
      return { fams: top('.fpr-fams'), field: top('#fpr-text'), suggest: top('.fpr-suggest') }
    })
    expect(order.fams).toBeLessThan(order.field)
    expect(order.field).toBeLessThan(order.suggest)
    await page.getByRole('button', { name: 'Article' }).click()
    await field.fill('Ship interfaces that hold up')
    await expect(page.locator('.fpr-h1')).toHaveText('Ship interfaces that hold up')
  })
})

test.describe('Font Pair · the export loads what the page uses', () => {
  test('the import carries heading weight, body regular, 600, bold and italic', async ({ page }) => {
    await open(page)
    await page.locator('.fpr-delivery > summary').click()
    const css = await page.locator('#fpr-export').innerText()
    expect(css).toContain('family=Archivo:wght@800')
    expect(css).toContain('family=IBM%20Plex%20Sans:ital,wght@0,400;0,600;0,700;1,400')
    await expect(page.locator('.fpr-delivery .fpr-hint')).toContainText('IBM Plex Sans 400, 600, 700 and 400 italic')
    // The specimen shows a bold and an italic phrase, and the preview button uses the same 600.
    await expect(page.locator('.fpr-body strong')).toBeVisible()
    await expect(page.locator('.fpr-body em')).toBeVisible()
  })

  test('a body family without italics asks for none', async ({ page }) => {
    await open(page)
    // Poppins ships no italics in the fixture; use it as the body.
    await page.getByRole('button', { name: 'Browse body family' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Search font families').fill('Poppins')
    await dialog.locator('.fbd-card', { hasText: 'Poppins' }).first().locator('.fbd-tile').click()
    await page.locator('.fpr-delivery > summary').click()
    const css = await page.locator('#fpr-export').innerText()
    expect(css).toContain('family=Poppins:wght@400;600;700')
    expect(css).not.toContain('ital,wght@0,400;0,600;0,700;1')
  })
})
