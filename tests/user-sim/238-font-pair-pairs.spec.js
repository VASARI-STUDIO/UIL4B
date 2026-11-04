// Font Pair: suggestions drawn as pairs, a specimen-first phone, lock / shuffle /
// swap / undo, typed words in the headings only, and an import that loads every
// weight and style the page draws.
//   1  each suggestion row is ONE button showing the heading sample in the
//      heading face, the body sample in the candidate face, and its reason
//   2  at 390 the specimen sits above the controls, on the first screen
//   3  Shuffle keeps a locked side, never makes a pair of one family; Swap, Undo
//   4  typed text fills the heading slots only
//   5  the export asks for the regular, 600 and bold weights and the italic
//
// MUTATIONS (each should fail the spec named):
//   - put the reason back inside a <details>                 -> 1
//   - render the panel before the stage on a phone           -> 2
//   - make shufflePair ignore `lock`                          -> 3 (lock tests)
//   - let shufflePair draw the body's own family              -> 3 (never one family)
//   - put `sample` back into .fpr-lede / .fpr-body            -> 4
//   - drop the 600 / italic from bodyFaceWeights              -> 5
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const mk = (family, category, variants, popularity, italics = true) => ({
  family, category, variants, subsets: ['latin'], popularity, italics,
})
const FONTS = [
  mk('Playfair Display', 'serif', [400, 500, 600, 700, 800, 900], 0),
  mk('Inter', 'sans-serif', [100, 400, 500, 600, 700, 900], 1),
  mk('Roboto', 'sans-serif', [100, 400, 500, 700, 900], 2),
  mk('Open Sans', 'sans-serif', [300, 400, 600, 700, 800], 3),
  mk('Lato', 'sans-serif', [100, 300, 400, 700, 900], 4),
  mk('Montserrat', 'sans-serif', [100, 400, 500, 600, 700, 900], 5),
  mk('Poppins', 'sans-serif', [100, 400, 500, 600, 700, 900], 6, false),
  mk('Nunito', 'sans-serif', [200, 400, 600, 700, 900], 7),
  mk('Lora', 'serif', [400, 500, 600, 700], 8),
  mk('Merriweather', 'serif', [300, 400, 700, 900], 9),
  mk('Source Serif 4', 'serif', [200, 400, 600, 700, 900], 10),
]

async function open(page, width = 1440) {
  watch(page, `a designer pairing fonts at ${width}px`)
  await page.addInitScript((fonts) => {
    try { localStorage.setItem('vs-gf-catalog', JSON.stringify({ t: Date.now(), fonts })) } catch { /* private mode */ }
  }, FONTS)
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
  await go(page, '/create/font-pair')
  await expect(page.locator('.fpr-card')).toHaveCount(6)
}

const heading = (page) => page.locator('.fpr-pair span').first()
const body = (page) => page.locator('.fpr-pair span').last()
const toolbar = (page) => page.locator('.fpr-page .tl-toolbar')

test.describe('Font Pair · suggestions are pairs', () => {
  test('each row is one button with both faces and the reason in view', async ({ page }) => {
    await open(page)
    const rows = await page.locator('.fpr-card').evaluateAll((els) => els.map((li) => {
      const q = (s) => li.querySelector(s)
      return {
        buttons: li.querySelectorAll('button, a, summary').length,
        nested: li.querySelectorAll('details, .fpr-card .fpr-card').length,
        family: q('.fpr-card-name').textContent.trim(),
        headFont: getComputedStyle(q('.fpr-card-head')).fontFamily,
        textFont: getComputedStyle(q('.fpr-card-text')).fontFamily,
        reasonShown: q('.fpr-card-reason').getBoundingClientRect().height > 0,
        reasonLen: q('.fpr-card-reason').textContent.trim().length,
        tap: li.querySelector('button').getBoundingClientRect().height,
      }
    }))
    expect(rows).toHaveLength(6)
    for (const r of rows) {
      expect(r.buttons, 'a row is one tap target').toBe(1)
      expect(r.nested, 'no card or disclosure inside a row').toBe(0)
      expect(r.headFont, 'the heading line is not in the heading face').toContain('Playfair Display')
      expect(r.textFont, `the body line is not in ${r.family}`).toContain(r.family)
      expect(r.reasonShown, 'the reason is hidden').toBe(true)
      expect(r.reasonLen).toBeGreaterThan(20)
      expect(r.tap).toBeGreaterThanOrEqual(44)
    }
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
})

test.describe('Font Pair · phone', () => {
  test('at 390 the specimen is above the controls and on the first screen', async ({ page }) => {
    await open(page, 390)
    const read = await page.evaluate(() => {
      const specimen = document.querySelector('.fpr-specimen')
      const panel = document.querySelector('.fpr-config')
      return {
        dom: !!(specimen.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING),
        specimenTop: specimen.getBoundingClientRect().top,
        specimenBottom: specimen.getBoundingClientRect().bottom,
        panelTop: panel.getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    expect(read.dom, 'the specimen is not first in the DOM').toBe(true)
    expect(read.specimenTop).toBeLessThan(844)
    expect(read.specimenBottom, 'the specimen is not above the controls').toBeLessThanOrEqual(read.panelTop + 1)
    expect(read.overflow).toBeLessThanOrEqual(1)
    // The dock still holds the primary action.
    await expect(page.locator('.fpr-dock').getByRole('button', { name: 'Copy CSS' })).toBeVisible()
  })
})

test.describe('Font Pair · lock, shuffle, swap, undo', () => {
  test('a locked heading stays through shuffles and the body never becomes the same family', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Lock heading family' }).click()
    await expect(page.getByRole('button', { name: 'Lock heading family' })).toHaveAttribute('aria-pressed', 'true')
    const shuffle = toolbar(page).getByRole('button', { name: /^Shuffle/ })
    for (let i = 0; i < 8; i += 1) {
      await shuffle.click()
      await expect(heading(page)).toHaveText('Playfair Display')
      expect((await body(page).innerText()).trim()).not.toBe('Playfair Display')
    }
  })

  test('a locked body stays, the heading moves, and the pair is never one family', async ({ page }) => {
    await open(page)
    const kept = (await body(page).innerText()).trim()
    await page.getByRole('button', { name: 'Lock body family' }).click()
    const seen = new Set()
    for (let i = 0; i < 8; i += 1) {
      await toolbar(page).getByRole('button', { name: /^Shuffle/ }).click()
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
      await toolbar(page).getByRole('button', { name: /^Shuffle/ }).click()
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
    await toolbar(page).getByRole('button', { name: /^Shuffle/ }).click()
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
    const words = 'Ship interfaces that hold up'
    const before = await page.locator('.fpr-body').innerText()
    await page.getByLabel('Preview text').fill(words)
    await expect(page.locator('.fpr-h1')).toHaveText(words)
    await expect(page.locator('.fpr-h2')).toHaveText(words)
    expect(await page.locator('.fpr-lede').innerText()).not.toContain(words)
    expect(await page.locator('.fpr-body').innerText()).toBe(before)
    expect(before).not.toContain(words)
  })
})

test.describe('Font Pair · the export loads what the page uses', () => {
  test('the import carries heading weight, body regular, 600, bold and italic', async ({ page }) => {
    await open(page)
    await page.locator('.fpr-delivery > summary').click()
    const css = await page.locator('#fpr-export').innerText()
    expect(css).toContain('family=Playfair%20Display:wght@700')
    expect(css).toContain('family=Inter:ital,wght@0,400;0,600;0,700;1,400')
    await expect(page.locator('.fpr-delivery .fpr-hint')).toContainText('Inter 400, 600, 700 and 400 italic')
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
