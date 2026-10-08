// TINT: THE PAGE SCROLLS ONLY WHEN ITS CONTENT DOES NOT FIT.
//
// With eleven steps the side card used to be a column of controls plus eleven
// contrast-note rows, with a 24px inset from a leftover page rule on top, so the
// page was taller than a 900px screen while the wide column beside it stood
// half empty. The notes are a grid under the chart now, and the side card runs
// edge to edge.
//
// 1. At 1440x900 (light and dark) the document is no taller than the window.
// 2. At 390x844 nothing scrolls inside the page (no nested scroller, no sideways
//    scroll) and the document ends where the content ends, bar the tab bar.
// 3. At 390x500, where it genuinely does not fit, the last contrast note can
//    still be scrolled to and read.
import { test, expect } from './base.js'
import { go, watch, wheelToRest } from './helpers.js'

const open = async (browser, scheme, width, height) => {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width, height } })
  const page = await ctx.newPage()
  watch(page, `someone tuning a tint scale at ${width}x${height}`)
  await go(page, '/create/tint')
  await expect(page.locator('.tt-cell')).toHaveCount(11, { timeout: 20000 })
  await expect(page.locator('.tt-note')).toHaveCount(11)
  return { ctx, page }
}

// Every element that scrolls on its own (an inner scroller with more content
// than box), and how far the page overflows the window.
const measure = (page) => page.evaluate(() => {
  const scrollers = []
  for (const el of document.querySelectorAll('body *')) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      scrollers.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${el.scrollHeight}>${el.clientHeight}`)
    }
  }
  const notes = document.querySelector('.tt-notes').getBoundingClientRect()
  return {
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    sideways: document.documentElement.scrollWidth - window.innerWidth,
    scrollers,
    notesBottom: Math.round(notes.bottom + window.scrollY),
  }
})

test.describe('the Tint page scrolls only when it must', () => {
  for (const scheme of ['light', 'dark']) {
    test(`1440x900 ${scheme}: the whole tool fits without scrolling`, async ({ browser }) => {
      const { ctx, page } = await open(browser, scheme, 1440, 900)
      const m = await measure(page)
      expect(m.scrollers, 'something inside the page scrolls on its own').toEqual([])
      expect(m.sideways, 'the page scrolls sideways').toBeLessThanOrEqual(0)
      expect(m.docH, `the page is ${m.docH - m.winH}px taller than the window`).toBeLessThanOrEqual(m.winH)

      // The notes sit under the chart in the wide column, not in the side card.
      const geo = await page.evaluate(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect()
        const chart = r('.tt-chart'); const notes = r('.tt-notes'); const panel = r('.tt-panel')
        const side = getComputedStyle(document.querySelector('.tt-panel'))
        return {
          notesTopBelowChart: notes.top >= chart.bottom,
          notesLeftOfPanel: notes.right <= panel.left,
          noteInPanel: !!document.querySelector('.tt-panel .tt-note'),
          padTop: side.paddingTop, padLeft: side.paddingLeft, overflow: side.overflowY,
        }
      })
      expect(geo.noteInPanel, 'the notes are back in the side card').toBe(false)
      expect(geo.notesTopBelowChart, 'the notes are not under the chart').toBe(true)
      expect(geo.notesLeftOfPanel, 'the notes sit under the side card').toBe(true)
      // Side-card sections own their padding; the card adds none and clips nothing.
      expect([geo.padTop, geo.padLeft, geo.overflow]).toEqual(['0px', '0px', 'visible'])
      await ctx.close()
    })
  }

  test('390x844: nothing scrolls inside the page and it ends with its content', async ({ browser }) => {
    const { ctx, page } = await open(browser, 'light', 390, 844)
    const m = await measure(page)
    expect(m.scrollers, 'something inside the page scrolls on its own').toEqual([])
    expect(m.sideways, 'the page scrolls sideways').toBeLessThanOrEqual(0)
    // The page is the only scroller and it stops at the last note plus the
    // phone's tab bar, with no empty run beneath.
    expect(m.docH - m.notesBottom, 'the page runs on past its content').toBeLessThanOrEqual(96)
    // The controls come before the notes when stacked.
    const order = await page.evaluate(() => {
      const top = (s) => document.querySelector(s).getBoundingClientRect().top
      return top('.tt-panel') < top('.tt-notes')
    })
    expect(order, 'the notes come before the controls').toBe(true)
    await ctx.close()
  })

  test('390x500: it scrolls, and the last contrast note can be reached', async ({ browser }) => {
    const { ctx, page } = await open(browser, 'light', 390, 500)
    const m = await measure(page)
    expect(m.docH, 'the page fits a 500px window, so there is nothing to test').toBeGreaterThan(m.winH)
    const last = page.locator('.tt-note').last()
    await expect(last.locator('.tt-note-step')).toHaveText('950')
    // Scroll as far as the page goes; the note must then be the thing under its
    // own centre (not behind the phone's tab bar) and wholly inside the window.
    //
    // A wheel that arrives within Lenis's 250ms resize debounce of the tool
    // mounting (the page grows 689 -> 1372px about 35ms before this runs) is
    // clamped to the old limit and comes to rest at 189 of 872px. Wheel again,
    // as a person would, until the page stops moving at its real end.
    for (let tries = 0, atEnd = false; !atEnd && tries < 4; tries++) {
      await wheelToRest(page, 6000, 'the Tint page at 390x500')
      atEnd = await page.evaluate(() => window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1)
    }
    const reach = await last.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { visible: r.top >= 0 && r.bottom <= window.innerHeight, onTop: !!hit && el.contains(hit) }
    })
    expect(reach.visible, 'the last contrast note is out of the window at the end of the page').toBe(true)
    expect(reach.onTop, 'the last contrast note is covered at the end of the page').toBe(true)
    await ctx.close()
  })
})
