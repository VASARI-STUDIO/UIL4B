// The Learn hub, slice 1 of the soft redesign (handover/specs/learn-soft-redesign-2026-10-31.md).
//
// What a reader who arrives at /learn can now do, and what the page stopped
// saying. 67-learn-index-search-card.spec.js owns the search, the grouping of
// the guides and the share card; this file owns what slice 1 added around them:
//
//   1. THE HELP PAGES ARE REACHABLE FROM THE HUB. /learn/help and /learn/principles
//      were linked from the menu and the footer and nowhere on /learn. They sit in
//      one group, "Using UIL4B", under an h3, inside <main>, at every width.
//   2. THE HEADING AND THE WORDS. The section heading is the approved line, and no
//      visible text carries the denial "not opinion" or an em dash.
//   3. THE LABELS ARE QUIET. The hint, the topic links, their counts and the read
//      times are the UI sans in sentence case, not mono capitals. Discover's hint is
//      the same component and keeps its mono capitals: the change is Learn's only.
//   4. THE PLACEHOLDER IS READABLE ON A SMALL PHONE (it used to be cut off at 360).
//   5. A FAILED INDEX SAYS SO. If the full-text chunk will not load, search falls
//      back to titles; the reader is told, in text they can see.
//   6. THE KEYBOARD REACHES THE NEW ROWS, after the guides, with a ring you can see.
//   7. THE NEW ROWS SIT ON THE SAME EDGES AS THE GUIDE ROWS, and at 560px and under,
//      where a row with no read time has two empty grid tracks, the extra space is
//      measured rather than assumed.
//
// The Using UIL4B rows are read from the tool tree (LEARN_GROUPS), the same source
// the component reads, so a renamed route fails here rather than being copied.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { LEARN_GROUPS } from '../../src/data/toolTree.js'

const USING_ID = 'learn-topic-using-uil4b'
const HEADING = 'Why colour and type behave the way they do on screen.'
const HINT = `${LEARN_ARTICLES.length} guides. Every figure is cited or measured on the page.`
const PLACEHOLDER = 'Search guides, e.g. clamp()'
const USING = ['help', 'principles'].map((id) => LEARN_GROUPS.find((g) => g.id === id))
const USING_HREFS = USING.map((g) => g.route)

// The hashed JSON asset the page fetches at runtime for the full text. It is a
// fetch(), not an import(), so a failure is an ordinary rejection the component
// answers itself, with no vite:preloadError and no page reload.
const SEARCH_TEXT_CHUNK = /\/assets\/learn-search-text-[0-9a-f]+\.json$/

const field = (page) => page.getByRole('searchbox', { name: 'Search the guides' })

/** Computed values of the first element matching each selector. */
const styleOf = (page, sel) => page.locator(sel).first().evaluate((el) => {
  const cs = getComputedStyle(el)
  return { family: cs.fontFamily, transform: cs.textTransform, size: cs.fontSize, weight: cs.fontWeight, text: el.textContent }
})

test('the fixture is not vacuous: Help and Principles are in the tool tree, with routes', () => {
  expect(USING.every(Boolean), 'LEARN_GROUPS lost help or principles').toBe(true)
  expect(USING_HREFS).toEqual(['/learn/help', '/learn/principles'])
  expect(LEARN_ARTICLES.length).toBeGreaterThan(0)
})

for (const width of [390, 768, 1440]) {
  test.describe(`signed out at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('Help and Design Principles are linked from the hub, under an h3 "Using UIL4B", inside main', async ({ page }) => {
      watch(page, 'visitor who came to Learn looking for help with the tools')
      await go(page, '/learn')

      const main = page.locator('main')
      const heading = main.getByRole('heading', { level: 3, name: 'Using UIL4B', exact: true })
      await expect(heading).toHaveCount(1)
      await expect(heading).toBeVisible()

      // The links are IN the group that heading labels, not merely somewhere on the page.
      const group = page.locator(`section[aria-labelledby="${await heading.getAttribute('id')}"]`)
      await expect(group).toHaveCount(1)
      await expect(group).toHaveAttribute('id', USING_ID)
      for (const g of USING) {
        const link = group.getByRole('link', { name: new RegExp(`^${g.label}`) })
        await expect(link, `${g.label} is not a link inside the Using UIL4B group`).toHaveAttribute('href', g.route)
        await expect(link).toBeVisible()
      }
      await expect(group.getByRole('link')).toHaveCount(USING_HREFS.length)

      // And inside main as links, by their routes, once each.
      for (const href of USING_HREFS) await expect(main.locator(`a[href="${href}"]`)).toHaveCount(1)

      // The topic jump list gains a fourth link to it (three topics plus Using).
      const jump = page.locator('.lidx-topics a').last()
      await expect(jump).toHaveText('Using UIL4B')
      await expect(jump).toHaveAttribute('href', `#${USING_ID}`)

      // No sideways scroll from the new rows.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
        .toBeLessThanOrEqual(0)
    })

    test('the heading is the approved line, and no visible text says "not opinion" or uses an em dash', async ({ page }) => {
      watch(page, 'reader scanning the hub for what it is')
      await go(page, '/learn')

      await expect(page.locator('#surface-guides-heading')).toHaveText(HEADING)
      await expect(page.locator('.srf-hint')).toHaveText(HINT)
      await expect(field(page)).toHaveAttribute('placeholder', PLACEHOLDER)

      // Every text node a person could see, plus the words they could be read in
      // attributes. A text node that is not rendered (script, style) is skipped.
      const words = await page.evaluate(() => {
        const out = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement
          if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue
          if (!el.checkVisibility()) continue
          if (n.textContent.trim()) out.push(n.textContent)
        }
        for (const el of document.querySelectorAll('[placeholder],[aria-label],[title],[alt]')) {
          for (const a of ['placeholder', 'aria-label', 'title', 'alt']) if (el.getAttribute(a)) out.push(el.getAttribute(a))
        }
        return out
      })
      // Positive control: the walk really read the page, headings and all.
      expect(words.join(' ')).toContain('Using UIL4B')
      expect(words.join(' ')).toContain(HEADING)
      expect(words.filter((w) => /not opinion/i.test(w)), 'the denial is back').toEqual([])
      expect(words.filter((w) => w.includes('—')), 'an em dash is visible on /learn').toEqual([])
    })

    test('the hint, topic links, counts and read times are the UI sans in sentence case', async ({ page }) => {
      watch(page, 'reader who finds mono capitals hard to read')
      await go(page, '/learn')

      // `.lidx-title` is set in var(--font): the UI sans the labels must match.
      const sans = (await styleOf(page, '.lidx-title')).family
      expect(sans, 'the guide titles are not set in the UI sans, so there is nothing to compare to').not.toMatch(/mono/i)

      for (const sel of ['.srf-hint', '.lidx-topics a', '.lidx-topic-n', '.lidx-time']) {
        await expect(page.locator(sel).first(), `${sel} is not on the page`).toBeAttached()
        const s = await styleOf(page, sel)
        expect(s.transform, `${sel} is still transformed to capitals`).toBe('none')
        expect(s.family, `${sel} is still mono`).not.toMatch(/mono/i)
        expect(s.family, `${sel} is not the UI sans`).toBe(sans)
      }
      // Every instance, not just the first: a count in a heading and one in the
      // topic list are different rules (.lidx-topic-n appears in both).
      for (const sel of ['.lidx-topic-n', '.lidx-time']) {
        const all = await page.locator(sel).evaluateAll((els) => els.map((el) => {
          const cs = getComputedStyle(el)
          return { family: cs.fontFamily, transform: cs.textTransform }
        }))
        expect(all.length, `${sel} should repeat`).toBeGreaterThan(1)
        for (const s of all) {
          expect(s.transform).toBe('none')
          expect(s.family).not.toMatch(/mono/i)
        }
      }
      // The read time reads "6 min" in sentence case: lowercase unit as written.
      expect(await page.locator('.lidx-time').first().innerText()).toMatch(/^\d+ min$/)
    })

    test('the new rows share the guide rows’ left and right edges', async ({ page }) => {
      watch(page, 'reader whose eye follows the left edge of the list')
      await go(page, '/learn')
      const edges = (sel) => page.locator(sel).evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect()
        return { left: Math.round(r.left * 2) / 2, right: Math.round(r.right * 2) / 2 }
      }))
      const guides = await edges(`.lidx-sections section:not(#${USING_ID}) .lidx-card`)
      const using = await edges(`#${USING_ID} .lidx-card`)
      expect(guides.length).toBe(LEARN_ARTICLES.length)
      expect(using.length).toBe(USING_HREFS.length)
      for (const u of using) expect(u).toEqual(guides[0])
      // The arrows end at the same x on a guide row and a Using row.
      const arrow = (sel) => page.locator(sel).first().evaluate((el) => Math.round(el.getBoundingClientRect().right * 2) / 2)
      expect(await arrow(`#${USING_ID} .lidx-go`)).toBe(await arrow(`.lidx-sections section:not(#${USING_ID}) .lidx-go`))
      // The group heading starts on the same edge as the topic headings.
      const hx = (sel) => page.locator(sel).first().evaluate((el) => Math.round(el.getBoundingClientRect().left * 2) / 2)
      expect(await hx(`#${USING_ID} .lidx-topic-h`)).toBe(await hx('.lidx-topic-sec .lidx-topic-h'))
    })
  })
}

test.describe('on a small phone', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  test('the placeholder is shown whole at 360px, not cut off', async ({ page }) => {
    watch(page, 'reader on a 360px phone about to search')
    await go(page, '/learn')
    const input = field(page)
    await expect(input).toHaveAttribute('placeholder', PLACEHOLDER)
    await expect(input).toHaveValue('')
    await expect(input).toBeVisible()

    // The text is measured with the font the input draws it in, against the room
    // the input leaves for text (its width less padding). Two independent reads:
    // the placeholder's own width, and the input's scroll width.
    const m = await input.evaluate((el) => {
      const cs = getComputedStyle(el)
      const c = document.createElement('canvas').getContext('2d')
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      return { text: c.measureText(el.placeholder).width, room, scroll: el.scrollWidth, client: el.clientWidth, shown: el.matches(':placeholder-shown') }
    })
    expect(m.shown, 'the placeholder is not what the field is showing').toBe(true)
    expect(m.text, `placeholder is ${m.text.toFixed(1)}px wide in ${m.room.toFixed(1)}px of room`).toBeLessThanOrEqual(m.room)
    expect(m.scroll).toBeLessThanOrEqual(m.client)
    // The old line, for scale: this is what the check exists to catch.
    const old = await input.evaluate((el) => {
      const cs = getComputedStyle(el)
      const c = document.createElement('canvas').getContext('2d')
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      return c.measureText('Search titles and text — luminance, clamp(), swap…').width
    })
    expect(old, 'the measuring would not have caught the old placeholder').toBeGreaterThan(m.room)
  })
})

test.describe('when the full text will not load', () => {
  for (const width of [390, 1440]) {
    test(`search says it is searching titles only, in text a reader can see, at ${width}px`, async ({ page }) => {
      watch(page, 'reader searching on a connection that drops the full-text chunk')
      await page.setViewportSize({ width, height: 900 })
      let aborted = 0
      await page.route(SEARCH_TEXT_CHUNK, (route) => { aborted++; return route.abort() })
      await go(page, '/learn')
      // A marker on window: a hard reload (the old preloadError path) wipes it.
      await page.evaluate(() => { window.__noReloadMarker = 'kept' })

      const status = page.locator('.lidx-status[role="status"]')
      await field(page).fill('luminance')
      await expect(status).toContainText(/titles only/i)
      // The notice did not cost the reader their query, and the page never reloaded.
      await expect(field(page)).toHaveValue('luminance')
      expect(await page.evaluate(() => window.__noReloadMarker), 'the page reloaded when the full text failed').toBe('kept')
      await expect(status).toBeVisible()
      // Visible to a sighted reader, not the screen-reader-only variant, which is
      // a one-pixel clipped box.
      await expect(status).not.toHaveClass(/sr-only/)
      const box = await status.boundingBox()
      expect(box.width).toBeGreaterThan(100)
      expect(box.height).toBeGreaterThan(14)
      // And it says why, in plain words.
      await expect(status).toContainText(/full text didn.t load/i)
      expect(aborted, 'the full-text chunk was never requested, so nothing was blocked').toBeGreaterThan(0)

      // A title word still finds its guide, with the same notice standing.
      await field(page).fill('contrast')
      await expect(page.locator('.lidx-card').first()).toHaveAttribute('href', /^\/learn\/.+/)
      await expect(status).toContainText(/titles only/i)
      await expect(field(page)).toHaveValue('contrast')
      expect(await page.evaluate(() => window.__noReloadMarker)).toBe('kept')
    })
  }

  test('with the chunk served, the same search does not claim titles only', async ({ page }) => {
    watch(page, 'reader searching on a normal connection')
    let served = 0
    page.on('response', (r) => { if (SEARCH_TEXT_CHUNK.test(new URL(r.url()).pathname) && r.ok()) served++ })
    await go(page, '/learn')
    await field(page).fill('luminance')
    await expect(page.locator('.lidx-status[role="status"]')).toContainText(/guides? match|No guide mentions/)
    await expect(page.locator('.lidx-status[role="status"]')).not.toContainText(/titles only/i)
    expect(served, 'the full-text chunk was not served, so this proves nothing').toBeGreaterThan(0)
  })
})

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const theme of ['light', 'dark']) {
    test(`Tab reaches the Using UIL4B rows after every guide, with a visible focus ring (${theme})`, async ({ page }) => {
      watch(page, 'keyboard-only reader walking down the hub')
      await go(page, '/learn')
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)

      // Tab from the search field and record every link reached.
      await field(page).focus()
      const reached = []
      let ring = null
      for (let i = 0; i < 60; i += 1) {
        await page.keyboard.press('Tab')
        const at = await page.evaluate(() => {
          const el = document.activeElement
          const cs = getComputedStyle(el)
          return {
            href: el.getAttribute('href'), cls: el.className, focusVisible: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle, outlineWidth: parseFloat(cs.outlineWidth), outlineColor: cs.outlineColor,
          }
        })
        reached.push(at.href)
        if (at.href === USING_HREFS[0]) ring = at
        if (at.href === USING_HREFS.at(-1)) break
      }

      // DOM order of the cards: the guides first, then the two Using rows.
      const domCards = await page.$$eval('.lidx-card', (els) => els.map((el) => el.getAttribute('href')))
      expect(domCards).toHaveLength(LEARN_ARTICLES.length + USING_HREFS.length)
      expect(domCards.slice(-USING_HREFS.length)).toEqual(USING_HREFS)
      // The cards, in the order Tab met them, are exactly the DOM order: every
      // guide comes before Help, and Help before Principles.
      expect(reached.filter((h) => domCards.includes(h))).toEqual(domCards)
      // The topic jump link to the group was met before any card (it is above).
      expect(reached.indexOf(`#${USING_ID}`)).toBeGreaterThanOrEqual(0)
      expect(reached.indexOf(`#${USING_ID}`)).toBeLessThan(reached.indexOf(domCards[0]))

      // The ring on the first new row is a real one: a solid outline, 2px, with a
      // colour that can be seen on the ground (3:1 for a component boundary).
      expect(ring, 'Tab never reached the Help row').toBeTruthy()
      expect(ring.focusVisible, 'keyboard focus is not :focus-visible').toBe(true)
      expect(ring.outlineStyle).not.toBe('none')
      expect(ring.outlineWidth).toBeGreaterThanOrEqual(2)
      const ratio = await page.evaluate(() => {
        const el = document.activeElement
        const px = (css) => {
          const c = document.createElement('canvas')
          c.width = c.height = 1
          const g = c.getContext('2d')
          g.fillStyle = css
          g.fillRect(0, 0, 1, 1)
          const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data
          return { r, g: gg, b, a: a / 255 }
        }
        let ground = null
        for (let n = el; n && !ground; n = n.parentElement) {
          const c = px(getComputedStyle(n).backgroundColor)
          if (c.a === 1) ground = c
        }
        const ring = px(getComputedStyle(el).outlineColor)
        const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
        const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
        const [hi, lo] = [lum(ring), lum(ground)].sort((a, b) => b - a)
        return { ratio: (hi + 0.05) / (lo + 0.05), alpha: ring.a }
      })
      expect(ratio.alpha).toBe(1)
      expect(ratio.ratio, `${theme}: the focus ring is ${ratio.ratio.toFixed(2)}:1 on the page ground`).toBeGreaterThanOrEqual(3)
    })
  }

  test('Enter on a Using row opens that page', async ({ page }) => {
    watch(page, 'keyboard-only reader opening Help from the hub')
    await go(page, '/learn')
    await page.locator(`#${USING_ID} a[href="/learn/help"]`).focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/learn/help')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Discover shares the hint component and keeps its own look', () => {
  test('the Discover hint is still mono capitals', async ({ page }) => {
    watch(page, 'visitor on Discover, which must not change')
    await go(page, '/discover')
    const hint = page.locator('.srf-hint')
    await expect(hint).toHaveCount(1)
    const s = await hint.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { family: cs.fontFamily, transform: cs.textTransform, size: cs.fontSize, spacing: cs.letterSpacing, learn: !!el.closest('.srf--learn') }
    })
    expect(s.learn, 'this is the Learn page, not Discover').toBe(false)
    expect(s.family).toMatch(/mono/i)
    expect(s.transform).toBe('uppercase')
    expect(s.size).toBe('11.5px')
    expect(parseFloat(s.spacing), 'the tracking was removed from the Discover hint').toBeGreaterThan(0)
    // Control: Learn's hint on the same component is not.
    await go(page, '/learn')
    const learn = await styleOf(page, '.srf-hint')
    expect(learn.family).not.toMatch(/mono/i)
    expect(learn.transform).toBe('none')
  })
})

// A row with no read time. At 561px and over the grid is "title time go", so the
// empty `time` column still costs a 20px column gap; at 560px and under the grid
// is "title go / dek / time / hit", and a `:not(:has(.lidx-time))` rule in
// surface.css drops the empty time and hit rows. This measures the space a Using
// row gets above its title and below its dek: at 560px and under they must match
// (within 2px). The numbers are in the failure message.
test.describe('the rows with no read time', () => {
  for (const width of [390, 560, 768]) {
    test(`spacing inside a Using row against a guide row at ${width}px`, async ({ page }) => {
      watch(page, 'reader on a phone looking at two rows without a read time')
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/learn')
      const measure = (sel) => page.locator(sel).first().evaluate((card) => {
        const r = card.getBoundingClientRect()
        const t = card.querySelector('.lidx-title').getBoundingClientRect()
        const d = card.querySelector('.lidx-dek').getBoundingClientRect()
        return {
          above: Math.round((t.top - r.top) * 10) / 10,
          between: Math.round((d.top - t.bottom) * 10) / 10,
          below: Math.round((r.bottom - d.bottom) * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          hasTime: !!card.querySelector('.lidx-time'),
        }
      })
      const guide = await measure(`.lidx-sections section:not(#${USING_ID}) .lidx-card`)
      const using = await measure(`#${USING_ID} .lidx-card`)
      const note = `${width}px  guide ${JSON.stringify(guide)}  using ${JSON.stringify(using)}`
      test.info().annotations.push({ type: 'row-spacing', description: note })
      expect(guide.hasTime).toBe(true)
      expect(using.hasTime).toBe(false)
      // The gap between title and dek is the grid's own 4px row gap in both
      // (the title's line box can differ by a pixel with its wrapped length).
      expect(Math.abs(using.between - guide.between), note).toBeLessThanOrEqual(1)
      // Above the title: the card's own 16px padding, the same in both.
      expect(using.above, note).toBeCloseTo(guide.above, 0)
      if (width <= 560) {
        // surface.css drops the empty time and hit rows from a card with no read
        // time, so the space under the dek is the card's own padding, as above.
        expect(Math.abs(using.below - using.above), note).toBeLessThanOrEqual(2)
      } else {
        expect(using.below, note).toBeLessThanOrEqual(16 + 4 + 1)
      }
    })
  }
})
