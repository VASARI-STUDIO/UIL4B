// TINT: THE PAGE SCROLLS ONLY WHEN ITS CONTENT DOES NOT FIT.
//
// With eleven steps the side card used to be a column of controls plus eleven
// contrast-note rows, with a 24px inset from a leftover page rule on top, so the
// page was taller than a 900px screen while the wide column beside it stood
// half empty. The notes are a grid under the chart now, and the side card runs
// edge to edge.
//
// 1. At 1440x900 (light and dark) the document is no taller than the window, and
//    no inner scroller is needed: the three note rows fit.
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
  const panelBox = document.querySelector('.tt-panel').getBoundingClientRect()
  const dockEl = document.querySelector('[data-tl-dock]')
  const dock = dockEl && dockEl.getBoundingClientRect().height > 0 ? dockEl.getBoundingClientRect() : null
  return {
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    sideways: document.documentElement.scrollWidth - window.innerWidth,
    scrollers,
    notesBottom: Math.round(notes.bottom + window.scrollY),
    // Below 768 the controls come last, so the page ends with the side card.
    panelBottom: Math.round(panelBox.bottom + window.scrollY),
    // The phone dock (below 768) is fixed above the tab bar; null where absent.
    dock: dock ? { h: Math.round(dock.height), top: Math.round(dock.top) } : null,
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
      // Side-card sections own their padding; the card adds none. It scrolls
      // (overflow auto) only on a screen too short for the controls; here it fits.
      expect([geo.padTop, geo.padLeft, geo.overflow]).toEqual(['0px', '0px', 'auto'])
      await ctx.close()
    })
  }

  test('390x844: nothing scrolls inside the page and it ends with its content', async ({ browser }) => {
    const { ctx, page } = await open(browser, 'light', 390, 844)
    const m = await measure(page)
    expect(m.scrollers, 'something inside the page scrolls on its own').toEqual([])
    expect(m.sideways, 'the page scrolls sideways').toBeLessThanOrEqual(0)
    // The page is the only scroller and it stops at the last note plus the
    // phone's tab bar and the tool dock, with no empty run beneath (the notes
    // come before the controls when stacked, so the controls end the page). Tint's
    // primary action sits in the dock below 768, and the page reserves the dock's
    // height once (measured at 390x844: side card ends 1726, dock 69px tall, 12px
    // gap, tab bar 61px, page 1871 = 145 past the card). So the allowance is
    // the old 96px plus the dock's own height, and the card must end above the
    // dock's top edge when scrolled to the bottom, so nothing hides behind it.
    expect(m.dock, 'the tool dock is not shown on Tint at 390px').not.toBeNull()
    expect(m.docH - m.panelBottom, 'the page runs on past its content').toBeLessThanOrEqual(96 + m.dock.h)
    const dockTopAtEnd = m.docH - m.winH + m.dock.top
    expect(m.panelBottom, 'the side card ends behind the dock').toBeLessThanOrEqual(dockTopAtEnd)
    // Stacked: the swatches, the chart and the notes come before the controls.
    const order = await page.evaluate(() => {
      const top = (s) => document.querySelector(s).getBoundingClientRect().top
      return top('.tt-stage') < top('.tt-chart') && top('.tt-chart') < top('.tt-notes') && top('.tt-notes') < top('.tt-panel')
    })
    expect(order, 'the order is not stage, chart, notes, controls').toBe(true)
    await ctx.close()
  })

  test('390x500: it scrolls, and the last contrast note can be reached', async ({ browser }) => {
    const { ctx, page } = await open(browser, 'light', 390, 500)
    const m = await measure(page)
    expect(m.docH, 'the page fits a 500px window, so there is nothing to test').toBeGreaterThan(m.winH)
    const last = page.locator('.tt-note').last()
    await expect(last.locator('.tt-note-step')).toHaveText('950')
    // The notes come before the controls now, so the note is not at the very end
    // of the page. Wheel down a screen at a time until it is wholly inside the
    // window and the thing under its centre is the note itself (so it is not
    // behind the dock or the phone's tab bar).
    //
    // A wheel that arrives within Lenis's 250ms resize debounce of the tool
    // mounting is clamped to the old limit; wheel again, as a person would.
    const seen = () => last.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return r.top >= 0 && r.bottom <= window.innerHeight && !!hit && el.contains(hit)
    })
    for (let tries = 0; tries < 12; tries++) {
      if (await seen()) {
        await page.waitForTimeout(400) // let any smooth scroll settle, then look again
        if (await seen()) break
      } else {
        await wheelToRest(page, 300, 'the Tint page at 390x500')
      }
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
