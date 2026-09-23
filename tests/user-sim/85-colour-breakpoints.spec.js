// The colour tools, measured across the width matrix rather than read off CSS.
//
// The founder, 2026-09-13, from a screenshot of /create/palette at ~660px:
// "im finding alot of basic UI problems that can be replaced with better UI
// design such as replacing some buttons with a drop down or other large issues".
//
// Four things this spec holds, each of them a defect that was rendered and
// measured before it was fixed:
//
//   1. SEVEN unlabelled icon buttons on every swatch row from 320 to 768 —
//      grip, lock, HCT, contrast, swap, copy, remove — 35 icon targets on one
//      screen. They are two and a named overflow menu now, which is the collapse
//      the `(min-width:769px) and (hover:none)` band already performed.
//   2. `.plb-role` was `display:none` below 769px, so on a phone the board could
//      not say which swatch was the PRIMARY, while the exports, tint scales and
//      UI preview all key off exactly that.
//   3. The page's h1 was 15px/700 in the toolbar — the SAME size and weight as
//      `.plb-hex`, so the page's name was typographically a colour value. It is
//      a heading area now, at the size its five siblings use.
//   4. Hovering "Add colour" animated `flex-basis`, and `.plb-col` is
//      `flex:1 1 0`, so all five swatches resized under the pointer.
//
// WHY EVERY TEST HERE CARRIES A POSITIVE CONTROL. Every assertion below is
// either a count or an absence, and both pass trivially against a page that
// never painted — zero oversized targets, zero overflow, zero contradictions.
// A route that failed to boot would make this file greener than a healthy one.
// So each test proves the probe read a live board FIRST, and the controls are
// mutation-proved: emptying the probe's own result turns them red.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** The founder's matrix. 660 is his screenshot; the rest are the device band. */
const WIDTHS = [320, 360, 390, 430, 660, 768, 834, 1024, 1280, 1440, 1920]

/** The band where `.plb-col` is a row and there is no hover to reveal with. */
const ROW_BAND = WIDTHS.filter((w) => w <= 768)

/** WCAG 2.2 AA 2.5.8 (Target Size, Minimum). */
const MIN_TARGET = 24

/** A context at an exact width: real touch metrics under 700, desktop above. */
async function at(browser, width, { theme = 'light', reducedMotion } = {}) {
  const ctx = await browser.newContext({
    ...(width < 700
      ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
      : { viewport: { width, height: 900 } }),
    ...(reducedMotion ? { reducedMotion } : {}),
  })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  return { ctx, page: await ctx.newPage() }
}

/**
 * Read only once the page has stopped moving.
 *
 * The same two exclusions `75-colour-tools-quality` documents, for the same
 * reason: an animation that never finishes is not an unsettled one. Infinite
 * ones are meant to be, and SCROLL-DRIVEN ones (`.rail-overflow` fades its edges
 * with `animation-timeline: scroll(self inline)`, and `.plb-toolbar-group` is
 * one of them) report `playState: 'running'` for as long as the rail exists,
 * because their progress is a scroll position and not a clock. Waiting on those
 * is waiting for the user to scroll.
 */
async function settled(page) {
  await page.waitForFunction(
    () => document.getAnimations().every((a) => {
      if (a.playState === 'finished' || a.playState === 'idle') return true
      if (a.timeline && a.timeline !== document.timeline) return true
      try { return a.effect?.getTiming?.().iterations === Infinity } catch { return true }
    }),
    null, { polling: 'raf', timeout: 6000 },
  )
  await page.evaluate(async () => {
    for (let round = 0; round < 3; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/**
 * One read of the palette board: what is painted, at what size, under what name.
 *
 * Everything comes back from ONE evaluate so the counts cannot be taken from
 * different frames of the same page.
 */
const readBoard = () => {
  const shown = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0'
  }
  const cols = [...document.querySelectorAll('.plb-col')].filter(shown)
  const h1 = document.querySelector('h1#plb-page-title')
  const hex = document.querySelector('.plb-hex')
  return {
    // The positive control. Every count and every absence below is read off
    // this same board in this same frame.
    columns: cols.length,
    buttons: document.querySelectorAll('button').length,
    perColumn: cols.map((col) => {
      const tools = [...col.querySelectorAll('.plb-tool')].filter(shown)
      const role = col.querySelector('.plb-role')
      return {
        tools: tools.map((t) => t.getAttribute('aria-label') || t.className),
        undersized: tools
          .filter((t) => {
            const r = t.getBoundingClientRect()
            return r.width < 24 || r.height < 24
          })
          .map((t) => `${t.getAttribute('aria-label')} ${Math.round(t.getBoundingClientRect().width)}x${Math.round(t.getBoundingClientRect().height)}`),
        // A control whose centre hit-tests to something else is not operable,
        // however good its size. This is how the 390x640 regression was found.
        covered: tools
          .filter((t) => {
            const r = t.getBoundingClientRect()
            const cx = r.left + r.width / 2
            const cy = r.top + r.height / 2
            if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) return false
            const hit = document.elementFromPoint(cx, cy)
            return hit !== t && !t.contains(hit)
          })
          .map((t) => t.getAttribute('aria-label')),
        roleShown: !!(role && shown(role)),
        roleText: role ? role.textContent.trim() : null,
        width: Math.round(col.getBoundingClientRect().width),
      }
    }),
    h1: h1 ? { text: h1.textContent.trim(), size: parseFloat(getComputedStyle(h1).fontSize), tag: h1.tagName,
      width: Math.round(h1.getBoundingClientRect().width), display: getComputedStyle(h1).display } : null,
    heroPainted: !!document.querySelector('.plb-hero'),
    hexSize: hex ? parseFloat(getComputedStyle(hex).fontSize) : null,
    overflowX: document.documentElement.scrollWidth - innerWidth,
  }
}

test.describe('the palette board across the width matrix', () => {
  test('a swatch row is two controls and a named menu, never seven icons', async ({ browser }) => {
    for (const width of ROW_BAND) {
      const { ctx, page } = await at(browser, width)
      watch(page, `phone-sized visitor at ${width}px`)
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(5)
      await settled(page)
      const board = await page.evaluate(readBoard)

      // POSITIVE CONTROL, and it is the whole reason the counts below mean
      // anything: a board that never painted has no tools to over-count.
      expect(board.columns, `${width}px: the board painted five columns`).toBe(5)
      expect(board.buttons, `${width}px: the page painted its controls`).toBeGreaterThan(40)

      for (const [index, col] of board.perColumn.entries()) {
        expect(col.tools.length, `${width}px, column ${index}: inline tools`).toBe(3)
        // Named, not merely few. Three unlabelled icons would pass a count.
        expect(col.tools[0], `${width}px, column ${index}`).toMatch(/^(Lock|Unlock) /)
        expect(col.tools[1], `${width}px, column ${index}`).toMatch(/^Copy #/)
        expect(col.tools[2], `${width}px, column ${index}`).toMatch(/^More actions for /)
        expect(col.undersized, `${width}px, column ${index}: below ${MIN_TARGET}px`).toEqual([])
        expect(col.covered, `${width}px, column ${index}: centre hit-tests elsewhere`).toEqual([])
      }
      expect(board.overflowX, `${width}px: horizontal overflow`).toBeLessThanOrEqual(0)
      await ctx.close()
    }
  })

  test('nothing behind the overflow menu is lost — every action is there by name', async ({ browser }) => {
    // The collapse is only honest if the five actions it removed from the row
    // are reachable. Open the menu the `More actions` control opens and read it.
    const { ctx, page } = await at(browser, 390)
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await settled(page)

    await page.locator('.plb-col').first().getByRole('button', { name: /^More actions for / }).click()
    const menu = page.getByRole('menu', { name: 'Colour actions' })
    await expect(menu).toBeVisible()

    const items = await menu.getByRole('menuitem').allInnerTexts()
    // POSITIVE CONTROL: a menu that opened empty would satisfy every
    // `toContain` below by vacuous truth if the list were filtered first.
    expect(items.length, 'the menu opened with rows in it').toBeGreaterThanOrEqual(8)

    const text = items.join(' | ')
    for (const action of ['Copy hex', 'Edit in HCT', 'View tints', 'Lock', 'contrast', 'Swap', 'Remove']) {
      expect(text, `"${action}" survived the collapse`).toContain(action)
    }
    await ctx.close()
  })

  test('the role of a swatch is readable at every width, in both themes', async ({ browser }) => {
    // `.plb-role` was `display:none` below 769px. The role is the SLOT — it is
    // what the exports, the tint scales and the UI preview key off — and the
    // name above it describes the colour, not the job.
    for (const theme of ['light', 'dark']) {
      for (const width of WIDTHS) {
        const { ctx, page } = await at(browser, width, { theme })
        await go(page, '/create/palette')
        await expect(page.locator('.plb-col')).toHaveCount(5)
        await settled(page)
        const board = await page.evaluate(readBoard)

        expect(board.columns, `${width}px ${theme}: the board painted`).toBe(5)
        const roles = board.perColumn.map((c) => c.roleText)
        // POSITIVE CONTROL: prove the roles are real strings before asserting
        // they are shown. An empty `.plb-role` is invisible AND has no text.
        expect(roles.every((r) => r && r.length > 1), `${width}px ${theme}: roles carry text (${roles})`).toBe(true)
        for (const [index, col] of board.perColumn.entries()) {
          expect(col.roleShown, `${width}px ${theme}, column ${index}: role "${col.roleText}" is painted`).toBe(true)
        }
        await ctx.close()
      }
    }
  })

  test('the page is named as a page, not as a hex value', async ({ browser }) => {
    // The h1 was 15px/700 in the toolbar and `.plb-hex` is 15px/700 on every
    // swatch, so the page's own name was set identically to a colour value.
    for (const width of WIDTHS) {
      const { ctx, page } = await at(browser, width)
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(5)
      await settled(page)
      const board = await page.evaluate(readBoard)

      expect(board.columns, `${width}px: the board painted`).toBe(5)
      // POSITIVE CONTROL: both sizes have to be real numbers before a
      // comparison between them says anything. A missing node reads null, and
      // `null > null` is false, which would fail loudly rather than silently.
      expect(board.h1, `${width}px: the page has an h1 in its heading area`).not.toBeNull()
      expect(board.hexSize, `${width}px: a swatch hex painted`).toBeGreaterThan(0)

      expect(board.h1.tag).toBe('H1')
      expect(board.h1.text).toBe('Palette Generator')
      // FOUNDER, 2026-09-14: "Palette Generator" struck off a screenshot of
      // this page. A workspace does not spend a display heading restating the
      // route's own name, and this one pushed the board below the fold on a
      // phone. The h1 stays in the document because `.plb-board` is
      // aria-labelledby it — hiding it visually must not take the board's
      // accessible name away — but it must not PAINT while the lede is empty.
      expect(board.heroPainted, `${width}px: no heading area paints while the lede is empty`).toBe(false)
      expect(board.h1.display, `${width}px: sr-only, never display:none`).not.toBe('none')
      expect(board.h1.width, `${width}px: the h1 is visually clipped`).toBeLessThanOrEqual(2)
      await ctx.close()
    }
  })

  test('signed in at the free cap, the board keeps its shape at 390 and 1280', async ({ browser }) => {
    // The swatch row's controls must not depend on who is looking. The save
    // menu and the refusal state mount extra markup at the cap.
    for (const width of [390, 1280]) {
      const { ctx, page } = await at(browser, width)
      await signIn(page, { plan: 'free', projects: 3 })
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(5)
      await settled(page)
      const board = await page.evaluate(readBoard)

      expect(board.columns, `${width}px signed in: the board painted`).toBe(5)
      expect(board.h1.text, `${width}px signed in`).toBe('Palette Generator')
      for (const [index, col] of board.perColumn.entries()) {
        expect(col.roleShown, `${width}px signed in, column ${index}`).toBe(true)
        expect(col.undersized, `${width}px signed in, column ${index}`).toEqual([])
        if (width <= 768) expect(col.tools.length, `${width}px signed in, column ${index}`).toBe(3)
      }
      expect(board.overflowX, `${width}px signed in`).toBeLessThanOrEqual(0)
      await ctx.close()
    }
  })

  test('hovering "Add colour" does not resize the swatches', async ({ browser }) => {
    // `.plb-add` animated `flex-basis` 92px -> 116px and `.plb-col` is
    // `flex:1 1 0`, so the 24px came out of the board: measured at 1280x900,
    // every column went 238px -> 233px and slid left under the pointer.
    // Reduced motion is checked alongside because a viewer who has asked for
    // less motion must not be the only one who gets a still board.
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { ctx, page } = await at(browser, 1280, { reducedMotion })
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(5)
      await settled(page)

      const widths = () => page.evaluate(() =>
        [...document.querySelectorAll('.plb-col')].map((c) => Math.round(c.getBoundingClientRect().width)))

      const rest = await widths()
      // POSITIVE CONTROL: real, non-zero column widths, or "unchanged" is a
      // comparison of two empty arrays.
      expect(rest.length, `${reducedMotion}: five columns measured`).toBe(5)
      expect(Math.min(...rest), `${reducedMotion}: the columns have width`).toBeGreaterThan(50)

      await page.locator('.plb-add').hover()
      await settled(page)
      expect(await widths(), `${reducedMotion}: hovering the add rail moved the board`).toEqual(rest)
      await ctx.close()
    }
  })
})

test.describe('the contrast checker says nothing it cannot stand behind', () => {
  test('the live preview is a specimen, and no specimen is in the heading outline', async ({ browser }) => {
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await at(browser, 1280, { theme })
      await go(page, '/create/contrast')
      await expect(page.locator('.cc-preview')).toBeVisible()
      await settled(page)

      const read = await page.evaluate(() => ({
        headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => h.textContent.trim()),
        specimenTags: [...document.querySelectorAll('.cc-spec-h, .cc-spec-body, .cc-spec-small')].map((e) => e.tagName),
        specimenText: [...document.querySelectorAll('.cc-preview')].map((e) => e.innerText).join(' '),
        body: document.body.innerText,
      }))

      // POSITIVE CONTROL. Every assertion under this line is an absence, and a
      // page that never rendered has an empty body that satisfies all of them.
      expect(read.headings.length, `${theme}: the page has headings`).toBeGreaterThanOrEqual(2)
      expect(read.specimenTags.length, `${theme}: the specimen rows painted`).toBe(3)
      expect(read.specimenText.length, `${theme}: the preview has text in it`).toBeGreaterThan(60)

      // A specimen is not a section of this document.
      expect(read.specimenTags, `${theme}: no specimen row is a heading`).not.toContain('H2')
      expect(read.headings, `${theme}: the outline is the page's own`).toEqual(['Colour Contrast Checker', 'Live preview'])

      // The claim the founder retired, and the tagline beside it.
      expect(read.body, `${theme}`).not.toContain('Free while in beta')
      expect(read.body, `${theme}`).not.toContain('Ship a palette you can defend')
      await ctx.close()
    }
  })
  // create-tools-left-2026-09-15 (1): the page reported main | navigation |
  // contentinfo and no region naming its content. Both panels are named
  // sections now — the instrument by the page's own h1, the specimen by its
  // "Live preview" h2 — so no new words were needed to name them.
  test('both panels are named regions, instrument and specimen', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-preview')).toBeVisible()
    const instrument = page.getByRole('region', { name: 'Colour Contrast Checker' })
    const specimen = page.getByRole('region', { name: /live preview/i })
    await expect(instrument).toHaveCount(1)
    await expect(specimen).toHaveCount(1)
    // The instrument region holds the tool, not just its heading.
    await expect(instrument.locator('#cc-fg')).toHaveCount(1)
    await expect(specimen.locator('.cc-preview')).toHaveCount(1)
    await ctx.close()
  })

  // App controls are rounded rectangles; 999px is for meters and the sales
  // page. The AA/AAA switch and the verdict chips were both 999px pills.
  test('no control or verdict chip on the checker is a pill', async ({ browser }) => {
    const { ctx, page } = await at(browser, 1440)
    await go(page, '/create/contrast')
    await expect(page.locator('.cc-level-opt')).toHaveCount(2)
    const radii = await page.evaluate(() => [...document.querySelectorAll(
      '.cc-page button, .cc-page input, .cc-level-opts, .cc-verdict')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => ({ cls: String(el.className), r: parseFloat(getComputedStyle(el).borderTopLeftRadius) })))
    // POSITIVE CONTROL: the switch, both fields, swap and four chips at least.
    expect(radii.length).toBeGreaterThan(8)
    expect(radii.filter((x) => x.r >= 20), 'pill-shaped controls').toEqual([])
    await ctx.close()
  })
})

// The stop row's lock and remove buttons were 26px with a 34px pseudo-element
// hit area, because in the old two-up grid a real 44px squeezed the hex field.
// The list is one column now and they take a real 44px under a coarse pointer.
test.describe('the gradient stop row under a thumb', () => {
  test('every stop control is 44px on a phone', async ({ browser }) => {
    const { ctx, page } = await at(browser, 390)
    await go(page, '/create/gradient')
    await expect(page.locator('.ggn-stop')).toHaveCount(3)
    const read = await page.evaluate(() => ({
      coarse: matchMedia('(pointer: coarse)').matches,
      boxes: [...document.querySelectorAll('.ggn-stop-lock, .ggn-stop-x, .ggn-stop-swatch .cpk-trigger')]
        .map((el) => { const b = el.getBoundingClientRect(); return { cls: String(el.className), w: Math.round(b.width), h: Math.round(b.height) } }),
    }))
    expect(read.coarse, 'the context must present a coarse pointer').toBe(true)
    expect(read.boxes.length, 'three stops x three controls').toBe(9)
    expect(read.boxes.filter((b) => b.w < 44 || b.h < 44), 'stop controls under 44px').toEqual([])
    await ctx.close()
  })
})
