// /create/contrast: the pair painted on an Editorial, Product page or Card view,
// and "Where each test lands". The pair is under test, so the views are painted
// with it as given: a failing pair has to look as bad as it is.
//
// The pair here is #777777 on #FFFFFF, 4.48:1 (worked by hand from the WCAG
// formula: 0.1845 luminance, 1.05 / 0.2345). It misses body text by 0.02 and
// clears large text and UI parts, so the legend has one Fail and two Pass.
//
//   1. each view renders and is the one that was picked
//   2. every text node in the view computes to exactly the text colour or the
//      background, whatever else the example would normally paint
//   3. the legend reads Body text Fail, Large text Pass, UI parts Pass
//   4. each of the three classes has at least one element in each view
//   5. hovering or focusing a legend chip outlines the parts of that class
//   6. the Editorial headline is larger than the body text (the example's own
//      stylesheet loaded after the page's, so its sizes are the ones that apply)
//   7. at 390px the Product button reads "Product" and the page does not scroll sideways
//   8. at rest one part carries the failing test's mark; a chosen test outlines every part of it
//   9. the outline colour is picked per pair; the legend sits above the example; no empty Card day
//
// To make each go red: 2 set a text colour in HaleOkoro.css/Tally.css/OrraWorkroom.css to a
// literal (#444); 3 change a threshold in palettePairSizes.js SIZE_CLASSES; 4 drop UI_PARTS.card;
// 5 stop PairLegend calling onHover; 6 import the example's css before contrast.css's page
// rules or delete the .sw-head size; 7 remove `.cc .cc-views-more { display: none }`.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const FG = '#777777'
const BG = '#ffffff'
const FG_RGB = 'rgb(119, 119, 119)'
const BG_RGB = 'rgb(255, 255, 255)'
// The three product views; Specimen is covered in 171.
const VIEWS = [
  { id: 'interface', name: 'Interface' },
  { id: 'article', name: 'Article' },
  { id: 'landing', name: 'Landing page' },
]
const LEGEND = [
  { label: 'Body text', mark: 'Fail' },
  { label: 'Large text', mark: 'Pass' },
  { label: 'UI parts', mark: 'Pass' },
]

async function openPair(page) {
  await go(page, '/create/contrast?fg=777777&bg=FFFFFF')
  await expect(page.locator('#cc-fg')).toHaveValue(/777777/i)
}

async function pickView(page, name) {
  const group = page.getByRole('group', { name: 'Preview the pair on' })
  await group.getByRole('button', { name, exact: true }).click()
  await expect(group.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  const view = VIEWS.find((v) => v.name === name)
  const pv = page.locator('.cc-pv[data-pair="true"]')
  await expect(pv, `${name}: the view is on the page`).toHaveAttribute('data-scene', view.id)
  // The marking pass runs after the lazy example arrives; wait for it.
  await expect.poll(() => pv.locator('[data-size]').count(), { message: `${name}: parts were sorted into tests` }).toBeGreaterThan(5)
  return pv
}

const settle = (page) => page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* endless */ } } })

test.describe('the Contrast Checker views', () => {
  test('each view renders as the one picked, with the pair as the only two text colours', async ({ page }) => {
    watch(page, 'designer checking a failing pair on three views')
    await openPair(page)
    for (const v of VIEWS) {
      const pv = await pickView(page, v.name)
      await settle(page)
      const found = await pv.evaluate((root) => {
        const bad = []
        let texts = 0
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.nodeValue.trim()) continue
          const el = n.parentElement
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden') continue
          texts++
          // An SVG <text> paints with fill, everything else with color.
          const c = el instanceof SVGElement ? cs.fill : cs.color
          if (c !== 'rgb(119, 119, 119)' && c !== 'rgb(255, 255, 255)') {
            bad.push(`${String(el.className.baseVal ?? el.className) || el.tagName} "${n.nodeValue.trim().slice(0, 20)}" is ${c}`)
          }
        }
        return { bad, texts, words: (root.innerText || '').split(/\s+/).filter(Boolean).length }
      })
      expect(found.texts, `${v.name}: text nodes were found`).toBeGreaterThan(15)
      expect(found.words, `${v.name}: real copy`).toBeGreaterThan(30)
      expect(found.bad, `${v.name}: text in a colour that is neither ${FG} nor ${BG}`).toEqual([])
      const ground = await pv.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(ground, `${v.name}: the view is painted on the pair's background`).toBe(BG_RGB)
    }
  })

  test('the legend reads Body text Fail, Large text Pass and UI parts Pass at 4.48:1', async ({ page }) => {
    watch(page, 'designer reading where each test lands')
    await openPair(page)
    await pickView(page, 'Interface')
    const legend = page.getByRole('group', { name: 'Tests' })
    await expect(page.getByRole('heading', { name: 'Where each test lands' })).toBeVisible()
    await expect(legend.getByRole('button')).toHaveCount(3)
    for (const [i, row] of LEGEND.entries()) {
      const chip = legend.getByRole('button').nth(i)
      await expect(chip).toContainText(row.label)
      await expect(chip, `${row.label} is ${row.mark} at 4.48:1`).toContainText(row.mark)
      await expect(chip).not.toContainText(row.mark === 'Fail' ? 'Pass' : 'Fail')
    }
    await expect(legend.getByRole('button').nth(0)).toContainText('4.5:1')
    await expect(legend.getByRole('button').nth(1)).toContainText('3:1')
  })

  for (const v of VIEWS) {
    test(`${v.name}: every test has at least one part, and the chips outline them`, async ({ page }) => {
      watch(page, `designer tracing the tests on ${v.name}`)
      await openPair(page)
      const pv = await pickView(page, v.name)
      await settle(page)
      const classes = { body: 'Body text', large: 'Large text', ui: 'UI parts' }
      const legend = page.getByRole('group', { name: 'Tests' })
      for (const [id, label] of Object.entries(classes)) {
        expect(await pv.locator(`[data-size="${id}"]`).count(), `${v.name}: no ${label} part`).toBeGreaterThan(0)
        const chip = legend.getByRole('button', { name: new RegExp(`^${label}`) })

        await chip.hover()
        await expect(pv.locator('[data-hit="on"]'), `${v.name}: hovering ${label} outlined nothing`).not.toHaveCount(0)
        const wrong = await pv.locator('[data-hit="on"]').evaluateAll((els, want) => els.filter((e) => e.dataset.size !== want).map((e) => e.className), id)
        expect(wrong, `${v.name}: hovering ${label} outlined parts of another test`).toEqual([])
        // A box is outlined; a drawn (SVG) part keeps its own colour and is traced by a
        // drop-shadow sleeve instead, so the part still shows the pair.
        const undrawn = await pv.locator('[data-hit="on"]').evaluateAll((els) => els.filter((e) => {
          const cs = getComputedStyle(e)
          if (e instanceof SVGElement && !(e instanceof SVGSVGElement)) return !cs.filter.includes('drop-shadow')
          return !(cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1)
        }).map((e) => `${e.tagName}.${e.getAttribute('class') || ''}`))
        expect(undrawn, `${v.name}: the ${label} outline is not drawn on these parts`).toEqual([])
        await page.mouse.move(2, 2)
        await expect(pv.locator('[data-hit="on"]'), `${v.name}: leaving ${label} left an outline`).toHaveCount(0)

        await chip.focus()
        await expect(pv.locator('[data-hit="on"]'), `${v.name}: focusing ${label} outlined nothing`).not.toHaveCount(0)
        await chip.blur()
        await expect(pv.locator('[data-hit="on"]')).toHaveCount(0)
      }
    })
  }

  test('the Article headline is larger than its body text', async ({ page }) => {
    watch(page, 'designer reading the Article view')
    await openPair(page)
    const pv = await pickView(page, 'Article')
    await settle(page)
    const sizes = await pv.evaluate((root) => {
      const px = (sel) => { const el = root.querySelector(sel); return el ? parseFloat(getComputedStyle(el).fontSize) : null }
      return { head: px('.bs-head'), body: Math.min(...[...root.querySelectorAll('p, li, span')].filter((e) => e.children.length === 0 && e.textContent.trim().length > 20).map((e) => parseFloat(getComputedStyle(e).fontSize))) }
    })
    expect(sizes.head, 'the headline was found').not.toBeNull()
    expect(sizes.body, 'body text was found').toBeLessThan(40)
    expect(sizes.head, `the headline is ${sizes.head}px beside ${sizes.body}px body text`).toBeGreaterThan(sizes.body * 1.5)
    expect(sizes.head, 'the headline is large text').toBeGreaterThanOrEqual(24)
  })
})

test.describe('the Contrast Checker views on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('the Landing button reads "Landing", the other buttons keep their names', async ({ page }) => {
    watch(page, 'designer on a phone choosing a view')
    await openPair(page)
    const group = page.getByRole('group', { name: 'Preview the pair on' })
    const landing = group.getByRole('button', { name: 'Landing page', exact: true })
    expect(await landing.evaluate((b) => b.innerText.trim()), 'the narrow label drops " page"').toBe('Landing')
    for (const name of ['Interface', 'Article', 'Specimen']) {
      expect(await group.getByRole('button', { name, exact: true }).evaluate((b) => b.innerText.trim())).toBe(name)
    }
  })

  test('no view scrolls sideways at 390px', async ({ page }) => {
    watch(page, 'designer on a phone choosing a view')
    await openPair(page)
    for (const v of VIEWS) {
      await pickView(page, v.name)
      await settle(page)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(over, `${v.name}: the page scrolls sideways at 390px`).toBeLessThanOrEqual(0)
      const pvOver = await page.locator('.cc-pv').evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(pvOver, `${v.name}: the view scrolls sideways at 390px`).toBeLessThanOrEqual(0)
    }
  })

  test('the Landing button keeps its whole name on a wide screen', async ({ page }) => {
    watch(page, 'designer on a desktop choosing a view')
    await page.setViewportSize({ width: 1440, height: 900 })
    await openPair(page)
    const landing = page.getByRole('group', { name: 'Preview the pair on' }).getByRole('button', { name: 'Landing page', exact: true })
    expect(await landing.evaluate((b) => b.innerText.trim())).toBe('Landing page')
  })
})

test.describe('the Contrast Checker marks, outline colour and layout', () => {
  test('at rest each failing test marks exactly one part and a passing test marks none', async ({ page }) => {
    watch(page, 'designer reading which part misses its test')
    await openPair(page)
    for (const v of VIEWS) {
      const pv = await pickView(page, v.name)
      await settle(page)
      const marked = await pv.locator('[data-fail="on"]').evaluateAll((els) => els.map((e) => e.dataset.size))
      // 4.48:1 fails body text only, so there is one mark, on a body part, the largest one.
      expect(marked, `${v.name}: one mark at rest, on the failing test`).toEqual(['body'])
      await expect(pv.locator('[data-hit="on"]'), `${v.name}: nothing is outlined as a choice at rest`).toHaveCount(0)
    }
  })

  test('choosing a test outlines every part of it, not just one', async ({ page }) => {
    watch(page, 'designer choosing a test')
    await openPair(page)
    const legend = page.getByRole('group', { name: 'Tests' })
    for (const v of VIEWS) {
      const pv = await pickView(page, v.name)
      await settle(page)
      await legend.getByRole('button', { name: /^Body text/ }).hover()
      const total = await pv.locator('[data-size="body"]').count()
      expect(total, `${v.name}: several body parts`).toBeGreaterThan(3)
      await expect(pv.locator('[data-hit="on"]'), `${v.name}: every body part is outlined`).toHaveCount(total)
      await expect(pv.locator('[data-fail="on"]'), `${v.name}: no resting mark while a test is chosen`).toHaveCount(0)
      await page.mouse.move(2, 2)
    }
  })

  test('the outline is near-black for a mid-grey pair and blue for black on white, never the pair\'s own colour', async ({ page }) => {
    watch(page, 'designer checking the outline colour')
    await openPair(page)
    const pv = await pickView(page, 'Interface')
    // #111111 scores 4.2:1 on #777777, where the usual blue scores 1.3.
    expect(await pv.evaluate((el) => getComputedStyle(el).getPropertyValue('--pv-hit').trim().toLowerCase())).toBe('#111111')
    await go(page, '/create/contrast?fg=000000&bg=FFFFFF')
    const pv2 = await pickView(page, 'Interface')
    expect(await pv2.evaluate((el) => getComputedStyle(el).getPropertyValue('--pv-hit').trim().toLowerCase())).toBe('#1d63d1')
  })

  test('the legend sits above the example it marks', async ({ page }) => {
    watch(page, 'designer choosing a test without scrolling')
    await openPair(page)
    for (const v of VIEWS) {
      const pv = await pickView(page, v.name)
      const legendBottom = await page.getByRole('group', { name: 'Tests' }).evaluate((el) => el.getBoundingClientRect().bottom)
      const exampleTop = await pv.evaluate((el) => el.getBoundingClientRect().top)
      expect(legendBottom, `${v.name}: the legend ends above where the example starts`).toBeLessThanOrEqual(exampleTop + 1)
    }
  })
})
