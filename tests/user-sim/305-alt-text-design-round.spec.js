// The Alt Text Generator's design round (a design review, D1 to D11), asserted
// from computed styles and boxes on /create/alt-text.
//
// /api/ai is stubbed, so no model is called. A phone is a touch context
// (isMobile, hasTouch); 768 and 1440 are a mouse.
//
// MUTATION (each of these makes the named test fail):
//   - drop `grid-area: auto` on `.alt-example .alt-row-count`: "D1" fails (the
//     count adds a track and the words start in the wrong place)
//   - take the 768px `grid-template-columns` off `.alt-example`: "D1" fails
//   - put `.alt-brief-label` back to 13px / dim: "D2" fails
//   - remove `text-wrap: pretty` from `.alt-field-help`: "D2/D4" fails
//   - move a `:hover` rule out of `@media (hover: hover)`: "D9" fails
//   - show `.alt-count` while idle again: "D6" fails
//   - remove the `:only-child` rule: "D10" fails at 390
//   - give `.alt-region-ico` its border back: "D11" fails
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const REPLY = 'Golden retriever puppy asleep on a grey wool blanket by a window.'

async function open(browser, width, { plan = 'free' } = {}) {
  const phone = width < 768
  const ctx = await browser.newContext({
    viewport: { width, height: phone ? 844 : 900 },
    ...(phone ? { isMobile: true, hasTouch: true } : {}),
  })
  const page = await ctx.newPage()
  watch(page, `someone on the alt text tool at ${width}px`)
  if (plan) await signIn(page, { plan })
  return { ctx, page }
}

async function stubAi(page) {
  await page.route('**/api/ai', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ altText: REPLY }) })
  })
}

async function addImage(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200
    const x = c.getContext('2d'); x.fillStyle = '#1c40f2'; x.fillRect(0, 0, 320, 200)
    return c.toDataURL('image/png').split(',')[1]
  })
  await page.locator('.alt-dropzone input[type="file"]')
    .setInputFiles([{ name: 'one.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }])
  await expect(page.locator('.alt-row-ready')).toHaveCount(1, { timeout: 15000 })
}

const writeBtn = (page) => page.getByRole('button', { name: /^Write alt text \(1\)$/ })

for (const width of [390, 768, 1440]) {
  test.describe(`${width}px`, () => {
    test('D1: the example sits on a written row\'s columns, and its words start where a result\'s will', async ({ browser }) => {
      test.setTimeout(60000)
      const { ctx, page } = await open(browser, width)
      await stubAi(page)
      await go(page, '/create/alt-text')

      const ex = await page.locator('.alt-example').evaluate((el) => {
        const q = (s) => el.querySelector(s).getBoundingClientRect()
        const cols = getComputedStyle(el).gridTemplateColumns.split(' ').length
        return { left: el.getBoundingClientRect().left, width: el.getBoundingClientRect().width, cols,
          label: q('.alt-example-label'), words: q('.alt-example-words'), count: q('.alt-row-count') }
      })
      const phone = width < 768
      const column = width >= 1024 ? 200 : 160
      if (phone) {
        // One column: the words take the whole width, and the count sits under them.
        expect(ex.cols, 'one column on a phone').toBe(1)
        expect(Math.round(ex.words.width), 'the words use the full width').toBe(Math.round(ex.width))
        expect(ex.count.top, 'the count is below the words').toBeGreaterThanOrEqual(ex.words.bottom - 1)
      } else {
        expect(ex.cols, 'two columns, not an auto-added third').toBe(2)
        expect(Math.round(ex.words.left - ex.left), 'the words start after the label column and the gap').toBe(column + 24)
        expect(Math.round(ex.count.left), 'the count shares the words\' column').toBe(Math.round(ex.words.left))
        expect(ex.label.left, 'the label is in the first column').toBeCloseTo(ex.left, 0)
      }

      // The same x as the words of a written row, measured on the real thing.
      const exampleX = ex.words.left
      await addImage(page)
      await writeBtn(page).click()
      const text = page.locator('.alt-row-text')
      await expect(text).toHaveValue(REPLY, { timeout: 15000 })
      const rowX = await text.evaluate((el) => {
        const cs = getComputedStyle(el)
        return el.getBoundingClientRect().left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)
      })
      if (!phone) expect(Math.round(rowX), 'a written row\'s words land where the example\'s did').toBe(Math.round(exampleX))
      else expect(Math.round(rowX), 'on a phone both start at the page edge').toBe(Math.round(exampleX))
      await ctx.close()
    })

    test('D2, D3, D4: labels step up, the type has three steps, and help text wraps pretty', async ({ browser }) => {
      const { ctx, page } = await open(browser, width, { plan: null })
      await go(page, '/create/alt-text')

      const style = (sel) => page.locator(sel).first().evaluate((el) => {
        const cs = getComputedStyle(el)
        return { size: cs.fontSize, weight: cs.fontWeight, color: cs.color, wrap: cs.textWrapStyle || cs.textWrap }
      })
      const label = await style('label.alt-brief-label')
      const guide = await style('.alt-guide summary')
      expect(label.size, 'label size').toBe('14px')
      expect(label.weight, 'label weight').toBe('540')
      expect(label.color, 'the label is ink, as the guide summary is').toBe(guide.color)
      expect((await style('#alt-tone-label')).size, 'both labels are the same size').toBe('14px')

      // "(optional)" is said once, by the label.
      await expect(page.locator('#alt-context-help')).not.toContainText(/optional/i)
      await expect(page.locator('label.alt-brief-label')).toContainText('(optional)')

      expect((await style('.ai-image-consent')).size, 'the consent notice is a caption').toBe('13px')
      for (const sel of ['#alt-tone-help', '#alt-context-help']) {
        expect((await style(sel)).wrap, `${sel} avoids a lone last word`).toContain('pretty')
      }
      await page.locator('.alt-guide summary').click()
      expect((await style('.alt-tips li')).size, 'tips are a caption').toBe('13px')
      expect((await style('.alt-tips code')).size, 'the mono literal is one notch under').toBe('12px')
      await ctx.close()
    })
  })
}

test.describe('D9: hover is for a mouse', () => {
  test('no :hover rule on this page sits outside @media (hover: hover)', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1440, { plan: null })
    await go(page, '/create/alt-text')
    const found = await page.evaluate(() => {
      const bare = []
      let gated = 0
      const walk = (rules, ok) => {
        for (const r of rules) {
          if (r.type === CSSRule.MEDIA_RULE) {
            walk(r.cssRules, ok || /hover:\s*hover/.test(r.conditionText || r.media.mediaText))
          } else if (r.type === CSSRule.STYLE_RULE) {
            if (/\.alt-/.test(r.selectorText) && /:hover/.test(r.selectorText)) {
              if (ok) gated++
              else bare.push(r.selectorText)
            }
          } else if (r.cssRules) {
            walk(r.cssRules, ok)
          }
        }
      }
      for (const sheet of document.styleSheets) {
        try { walk(sheet.cssRules, false) } catch { /* a cross-origin sheet */ }
      }
      return { bare, gated }
    })
    expect(found.gated, 'the page\'s hover rules are still there, inside hover media').toBeGreaterThanOrEqual(3)
    expect(found.bare, 'hover rules that would stay lit after a tap').toEqual([])
    await ctx.close()
  })
})

test.describe('with an image added', () => {
  test('D6: the toolbar holds no image count while idle; the sheet keeps its own', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1440)
    await stubAi(page)
    await go(page, '/create/alt-text')
    await expect(page.locator('.alt-count'), 'no count with an empty sheet').toHaveCount(0)
    await addImage(page)
    await expect(page.locator('.alt-count'), 'no count in the toolbar while idle').toHaveCount(0)
    await expect(page.locator('.alt-sheet-head h2')).toHaveText('1 image')
    await writeBtn(page).click()
    await expect(page.locator('.alt-row-text')).toHaveValue(REPLY, { timeout: 15000 })
    await expect(page.locator('.alt-count'), 'and none once the run is over').toHaveCount(0)
    await expect(page.locator('.alt-sheet-sum')).toContainText('1 written')
    await ctx.close()
  })

  test('D10: a lone Write button fills the row at 390, and sits at its own width from 768', async ({ browser }) => {
    for (const width of [390, 768]) {
      const { ctx, page } = await open(browser, width)
      await stubAi(page)
      await go(page, '/create/alt-text')
      await addImage(page)
      const w = await page.locator('.alt-row-actions').evaluate((el) => ({
        row: el.getBoundingClientRect().width,
        line: el.closest('.alt-row').getBoundingClientRect().width,
        btn: el.firstElementChild.getBoundingClientRect().width,
        kids: el.children.length,
      }))
      expect(w.kids, 'only the Write button is in the actions').toBe(1)
      if (width < 768) expect(Math.round(w.btn), 'full row').toBe(Math.round(w.row))
      else expect(w.btn, 'a lone button is not stretched across the row on a wide screen').toBeLessThan(w.line / 2)
      await ctx.close()
    }
  })

  test('D7, D8: the sheet header cannot wrap, and touch shows written text as editable', async ({ browser }) => {
    test.setTimeout(60000)
    for (const touch of [true, false]) {
      const { ctx, page } = await open(browser, touch ? 390 : 1440)
      await stubAi(page)
      await go(page, '/create/alt-text')
      await addImage(page)
      await writeBtn(page).click()
      const text = page.locator('.alt-row-text')
      await expect(text).toHaveValue(REPLY, { timeout: 15000 })

      const edge = await text.evaluate((el) => getComputedStyle(el).borderTopColor)
      if (touch) expect(edge, 'touch: a faint edge from the start').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      else expect(edge, 'mouse: no edge until hover').toMatch(/rgba\(0, 0, 0, 0\)|transparent/)

      const head = await page.locator('.alt-sheet-head').evaluate((el) => {
        const sum = getComputedStyle(el.querySelector('.alt-sheet-sum'))
        return { height: el.getBoundingClientRect().height, wrap: sum.flexWrap, space: sum.whiteSpace }
      })
      expect(head.wrap).toBe('nowrap')
      expect(head.space).toBe('nowrap')
      expect(head.height, 'one line: the header keeps its 44px').toBeLessThan(50)
      await expect(page.locator('.alt-sheet-sum')).not.toContainText('Preparing')
      await ctx.close()
    }
  })
})

test('D11: the region notice is one box, with no bordered tile inside it', async ({ browser }) => {
  const { ctx, page } = await open(browser, 390, { plan: null })
  await page.route((u) => u.pathname === '/api/ai' && u.searchParams.has('region'), (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ blocked: true }) }))
  await go(page, '/create/alt-text')
  const card = page.getByTestId('ai-region-blocked')
  await expect(card).toBeVisible()
  const cardBorder = await card.evaluate((el) => getComputedStyle(el).borderTopWidth)
  expect(cardBorder, 'the card keeps its own border').toBe('1px')
  const tile = await card.locator('.alt-region-ico').evaluate((el) => {
    const cs = getComputedStyle(el)
    return { border: cs.borderTopWidth, ground: cs.backgroundColor }
  })
  expect(tile.border, 'no border on the icon').toBe('0px')
  expect(tile.ground, 'no fill on the icon').toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  await ctx.close()
})
