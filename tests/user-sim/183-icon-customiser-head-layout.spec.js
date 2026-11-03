// THE ICON CUSTOMISER'S HEAD, ROTATE AND FLIP, SVG CODE DISCLOSURE AND TWO-COLUMN LAYOUT.
//
// What a person relies on, by acceptance criterion (icon library design, slice S5):
//   18. nothing in the popup is uppercase mono, and no label, caption, pill or count is set in mono:
//       mono is for a literal value (a size, a hex, a byte count, code) and nothing else;
//   19. at 1440 a stroke icon fits without scrolling, with the code closed and no custom row open;
//   28. under reduced motion the panel and the carets do not transition or animate a transform.
// And the layout and behaviour around them:
//   - 1440: a 760px panel with a 320px left column and the controls beside it; the foot spans both;
//   - 800: one column; 640 and 320: a bottom sheet with the foot pinned and on screen;
//   - the head holds the name and "{Pack}, {weight}"; Reset appears only after a change and puts it back;
//   - Rotate left and right turn the preview, Flip toggles aria-pressed and mirrors it;
//   - the SVG code is a closed disclosure with the live size, its Copy copies, and while a Pro setting is
//     only previewed the code cannot be selected;
//   - the phone sheet's stage is its 168px (at most 172), the open code is a named region a keyboard can
//     scroll, the touch targets are 44px, the rotation is announced, and the foot's hairline and the
//     custom colour picker both behave in a column that scrolls on its own.
//
// HOW TO SEE EACH FAIL (src/styles/pages/icon-emoji-library.css and src/pages/IconLibrary.jsx):
//   .icust-sub { font-family: var(--mono) }                    -> "no label, caption, pill or count is set in mono"
//   .icust-rot-title { text-transform: uppercase; font-family: var(--mono) } -> "nothing is uppercase mono"
//   .icust-line-tile { padding-block: 40px }                   -> "at 1440 a stroke icon fits without scrolling"
//   .icust-panel width 760px -> 700px (min-width:801px rule)   -> "at 1440 the panel is 760px ..."
//   the 801px breakpoint becomes 700px                          -> "at 800 the panel is one column"
//   the (max-width:640px) sheet rule is dropped                 -> "at 640 and at 320 ... bottom sheet"
//   .icust-body>.icust-foot loses position:sticky               -> "... the foot stays pinned"
//   handleReset stops resetting rotate                          -> "Reset appears only after a change ..."
//   the Rotate left handler adds 90 instead of 270              -> "Rotate left and right turn the preview"
//   <details className="icust-code"> gets `open`                -> "the SVG code is closed ..."
//   codeBytes goes stale (its useMemo deps become [])           -> "the summary's byte count is the code's size"
//     (NOT caught: counting characters instead of UTF-8 bytes. The exported markup is ASCII, so the two agree.)
//   handleCopyCode copies the serialised output of another size -> "its Copy copies exactly the code shown"
//   .icust-code-box.is-locked code loses user-select:none       -> "while a Pro setting is only previewed ..."
//   .icust-code-caret drops out of the reduced-motion :is(...)  -> "under reduced motion ..."
//   the (max-width:640px) stage loses `min-height:168px`, or the held note lines go back into it -> "... the stage is at most 172px"
//   <code> loses tabIndex, role or aria-label                   -> "the open code is a named region ..."
//   .icust-code-sum loses its pointer:coarse min-height:44px    -> "touch targets ..."
//   the Rotate buttons stop writing the rotation status         -> "Rotate announces ..."
//   data-scrolls is never set (or the foot border is always on) -> "the foot's hairline ..."
//   <ColorPickerPop> loses `portal`                             -> "the custom colour picker opens outside the scrolling column"
//   src restored byte for byte                                  -> all of them pass again.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'someone tuning an icon in the customiser'

/**
 * Open the customiser on the grid's first icon. `plan` is 'pro', 'free' or null (signed out).
 * Every clipboard write is recorded, so what a Copy button exported can be read back.
 */
async function openCustomiser(browser, { width = 1440, height = 900, touch = false, plan = 'free', reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, PERSONA)
  await page.addInitScript(() => {
    window.__clipboardWrites = []
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
    navigator.clipboard.writeText = (text) => { window.__clipboardWrites.push(text); return orig(text) }
  })
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  const cell = page.locator('.ig .ic').first()
  await expect(cell).toBeVisible({ timeout: 20_000 })
  await cell.click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
  // The rail and the stage draw the icon's own markup, so wait for it rather than for the frame.
  await expect(page.locator('.icust-size-cell[data-s="16"] svg')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-stage-host svg')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-copy')).toBeEnabled({ timeout: 20_000 })
  return { ctx, page }
}

const panel = (page) => page.locator('.icust-panel')
const head = (page) => page.locator('.icust-head')
const reset = (page) => head(page).getByRole('button', { name: 'Reset', exact: true })
const summary = (page) => page.locator('.icust-code-sum')
const codeBox = (page) => page.locator('.icust-code-box')
const codeCopy = (page) => page.locator('.icust-code-copy')
const rotLeft = (page) => page.getByRole('button', { name: 'Rotate left', exact: true })
const rotRight = (page) => page.getByRole('button', { name: 'Rotate right', exact: true })
const flipH = (page) => page.getByRole('button', { name: 'Flip horizontally', exact: true })
const flipV = (page) => page.getByRole('button', { name: 'Flip vertically', exact: true })
const sizeRadio = (page, name) => page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name })

/** The stage drawing's computed transform, rounded so 6e-17 reads as 0 ('none' stays 'none'). */
async function stageTransform(page) {
  return page.locator('.icust-stage-host svg').evaluate((el) => {
    const t = getComputedStyle(el).transform
    if (t === 'none') return t
    return t.replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (n) => String(Math.round(Number(n) * 1000) / 1000 + 0))
  })
}

/** The box of each named part of the popup, in page pixels. */
const boxes = (page) => page.evaluate(() => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }
  }
  return {
    panel: r('.icust-panel'), left: r('.icust-left'), right: r('.icust-right'), foot: r('.icust-body > .icust-foot'),
    body: r('.icust-body'), head: r('.icust-head'), vh: window.innerHeight, vw: window.innerWidth,
  }
})

/**
 * Walk every rendered element in the popup. Returns the ones that break the type rule:
 *   - uppercase mono, anywhere;
 *   - text in mono that is not a literal value (a number, a unit, a hex, currentColor, a byte count) and
 *     is not code or a field. A label, caption, pill or count is words, so it fails here.
 */
function typeSweep(page) {
  return page.evaluate(() => {
    const first = (ff) => ff.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase()
    const rootMono = getComputedStyle(document.documentElement).getPropertyValue('--mono') || ''
    const monoFirst = first(rootMono || "'Geist Mono'")
    const isMono = (cs) => {
      const f = first(cs.fontFamily)
      return f === monoFirst || /mono|courier|consolas|menlo/.test(f)
    }
    // What is left of a text once every literal value in it is taken out: a colour keyword, a hex, a number
    // with its unit ("24px", "278 bytes", "90°"), and the separators between them. Words are left standing.
    // (The unit has no leading \b: "24px" has no word boundary between the 4 and the p.)
    const leftover = (t) => t
      .replace(/currentColor/g, '')
      .replace(/#[0-9a-f]{3,8}\b/gi, '')
      .replace(/\d+(\.\d+)?\s*(px|bytes?|deg|°|%)?/gi, '')
      .replace(/^(px|bytes?|deg)$/i, '') // a bare unit beside a field (the "px" after a custom size)
      .replace(/[×·,/:+\-\s]/g, '')
    const bad = []
    let seen = 0
    let codeSeen = 0
    for (const el of document.querySelectorAll('.icust-panel, .icust-panel *')) {
      if (!el.getClientRects().length) continue
      const cs = getComputedStyle(el)
      const mono = isMono(cs)
      const name = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`
      if (cs.textTransform === 'uppercase' && mono) bad.push(`${name}: uppercase and mono`)
      if (!mono) continue
      seen += 1
      if (el.closest('code, pre, input, textarea')) { if (el.closest('code, pre')) codeSeen += 1; continue }
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
      if (own && leftover(own) !== '') bad.push(`${name}: "${own.slice(0, 40)}" is mono but is not a literal value`)
    }
    return { bad, seen, codeSeen }
  })
}

test.describe('type: mono is only for literal values', () => {
  test('nothing is uppercase mono, and no label, caption, pill or count is set in mono (closed, code open, custom row open)', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const closed = await typeSweep(page)
    // The sweep must be able to see mono at all, or an empty pass proves nothing.
    expect(closed.seen, 'the sweep found no mono element: its mono test is broken').toBeGreaterThan(0)
    expect(closed.bad, 'default popup').toEqual([])

    await summary(page).click()
    await expect(codeBox(page)).toBeVisible()
    const withCode = await typeSweep(page)
    // A closed <details> still lays its content out, so the code is swept either way; it must be seen as mono.
    expect(withCode.codeSeen, 'the sweep did not see the code as mono: its mono test is broken').toBeGreaterThan(0)
    expect(withCode.bad, 'code open').toEqual([])

    await sizeRadio(page, /^Custom(,|$)/).click()
    await expect(page.getByRole('textbox', { name: 'Custom size' })).toBeVisible()
    expect((await typeSweep(page)).bad, 'custom size row open').toEqual([])

    await rotRight(page).click()
    await tileFor(page, 'Sharp').click()
    await expect(page.locator('#icust-preview-line')).not.toBeEmpty()
    expect((await typeSweep(page)).bad, 'Reset showing and a Pro preview line showing').toEqual([])
    await ctx.close()
  })

  test('the same on a phone sheet', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 390, height: 780, touch: true })
    expect((await typeSweep(page)).bad).toEqual([])
    await ctx.close()
  })
})

const tileFor = (page, name) => page.getByRole('radiogroup', { name: 'Line style' }).getByRole('radio', { name: new RegExp(`^${name}`) })

test.describe('layout', () => {
  test('at 1440 a stroke icon fits without scrolling, with the code closed and no custom row open', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 1440, height: 900 })
    // It is a stroke icon (it has a Stroke row), the code is closed, and no custom row is open.
    await expect(page.getByLabel('Stroke width in pixels').first()).toBeVisible()
    await expect(page.locator('details.icust-code')).not.toHaveAttribute('open', /.*/)
    await expect(page.locator('.icust-size-custom')).toHaveCount(0)
    // The Similar row arrives with the grid's list; measure with it in, as a person sees it.
    await page.locator('.icust-similar-btn').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {})

    const m = await page.evaluate(() => {
      const m = (sel) => { const el = document.querySelector(sel); return { sh: el.scrollHeight, ch: el.clientHeight } }
      return { left: m('.icust-left'), right: m('.icust-right'), body: m('.icust-body') }
    })
    expect(m.left.sh, `the left column scrolls (${m.left.sh} in ${m.left.ch})`).toBeLessThanOrEqual(m.left.ch + 1)
    expect(m.right.sh, `the right column scrolls (${m.right.sh} in ${m.right.ch})`).toBeLessThanOrEqual(m.right.ch + 1)
    expect(m.body.sh, `the body scrolls (${m.body.sh} in ${m.body.ch})`).toBeLessThanOrEqual(m.body.ch + 1)
    await page.screenshot({ path: '.claude/scratch/iconhead/customiser-1440.png' })
    await ctx.close()
  })

  test("the foot's hairline shows only while a column can scroll", async ({ browser }) => {
    const edge = (page) => page.evaluate(() => {
      const foot = document.querySelector('.icust-body > .icust-foot')
      const body = document.querySelector('.icust-body')
      const cs = getComputedStyle(foot)
      return { scrolls: body.hasAttribute('data-scrolls'), colour: cs.borderTopColor, width: cs.borderTopWidth, shadow: cs.boxShadow }
    })
    const roomy = await openCustomiser(browser, { width: 1440, height: 900 })
    const a = await edge(roomy.page)
    expect(a.scrolls, 'nothing scrolls at 1440x900, so no hairline is called for').toBe(false)
    expect(a.colour, 'the foot draws a hairline with nothing to scroll').toBe('rgba(0, 0, 0, 0)')
    expect(a.width, 'the foot changes height when the hairline comes and goes').toBe('1px')
    await roomy.ctx.close()

    const short = await openCustomiser(browser, { width: 1440, height: 560 })
    const scrolls = await short.page.evaluate(() => [...document.querySelectorAll('.icust-left, .icust-right')].some((c) => c.scrollHeight > c.clientHeight + 1))
    expect(scrolls, 'a 560px-tall window should make a column scroll, so this test proves nothing').toBe(true)
    await expect.poll(async () => (await edge(short.page)).scrolls, { message: 'data-scrolls never appeared' }).toBe(true)
    const b = await edge(short.page)
    expect(b.colour, 'the foot has no hairline while a column scrolls').not.toBe('rgba(0, 0, 0, 0)')
    expect(b.shadow, 'a shadow is back on the foot').toBe('none')
    expect(await short.page.locator('.icust-right').evaluate((el) => getComputedStyle(el).maskImage), 'the right column is masked again').toBe('none')
    await short.ctx.close()
  })

  for (const [w, h] of [[1440, 900], [1366, 768]]) {
    test(`at ${w}x${h} the custom colour picker opens outside the scrolling column and inside the window`, async ({ browser }) => {
      const { ctx, page } = await openCustomiser(browser, { width: w, height: h })
      await page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { name: 'Custom' }).click()
      const pop = page.getByRole('dialog', { name: 'Custom colour' })
      await expect(pop).toBeVisible()
      expect(await pop.evaluate((el) => !!el.closest('.icust-right, .icust-panel')), 'the picker is still inside a clipping column').toBe(false)
      const box = await pop.boundingBox()
      expect(box.x, 'the picker is cut off on the left').toBeGreaterThanOrEqual(0)
      expect(box.y, 'the picker is cut off at the top').toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, 'the picker is cut off on the right').toBeLessThanOrEqual(w)
      expect(box.y + box.height, 'the picker is cut off at the bottom').toBeLessThanOrEqual(h)
      await expect(pop.locator('.cpk-pad')).toBeInViewport({ ratio: 1 })
      await ctx.close()
    })
  }

  test('at 1440 the panel is 760px wide with a 320px left column, the controls beside it, and the foot across both', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 1440, height: 900 })
    const b = await boxes(page)
    expect(Math.round(b.panel.w), 'panel width').toBe(760)
    expect(Math.round(b.left.w), 'left column width').toBe(320)
    expect(b.right.x, 'the controls sit to the right of the left column').toBeGreaterThanOrEqual(b.left.r - 1)
    expect(Math.abs(b.right.y - b.left.y), 'the two columns start together').toBeLessThanOrEqual(1)
    expect(b.foot.x, 'the foot starts at the left edge').toBeLessThanOrEqual(b.left.x + 1)
    expect(b.foot.r, 'the foot runs to the right edge').toBeGreaterThanOrEqual(b.right.r - 1)
    expect(b.foot.y, 'the foot is under both columns').toBeGreaterThanOrEqual(Math.max(b.left.b, b.right.b) - 1)
    expect(b.panel.h, 'the panel stays within 760px and the viewport').toBeLessThanOrEqual(Math.min(760, 900 - 64) + 1)
    // Each column scrolls on its own, not the body.
    expect(await page.locator('.icust-left').evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto')
    expect(await page.locator('.icust-right').evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto')
    await ctx.close()
  })

  test('at 801 the columns still sit side by side; at 800 the panel is one 560px column with the stage on top', async ({ browser }) => {
    const wide = await openCustomiser(browser, { width: 801, height: 900 })
    const w = await boxes(wide.page)
    expect(w.right.x, '801 is two columns').toBeGreaterThanOrEqual(w.left.r - 1)
    await wide.ctx.close()

    const { ctx, page } = await openCustomiser(browser, { width: 800, height: 900 })
    const b = await boxes(page)
    expect(Math.round(b.panel.w), 'panel width at 800').toBe(560)
    expect(b.right.y, 'the controls sit under the left column').toBeGreaterThanOrEqual(b.left.b - 1)
    expect(Math.abs(b.right.x - b.left.x), 'the two share one left edge').toBeLessThanOrEqual(1)
    expect(Math.abs(b.right.w - b.left.w), 'the two share one width').toBeLessThanOrEqual(1)
    const stage = await page.locator('.icust-stage').boundingBox()
    expect(stage.y, 'the stage is the first thing under the head').toBeLessThan(b.right.y)
    await ctx.close()
  })

  for (const [label, viewport, touch] of [
    ['640', { width: 640, height: 640 }, false],
    ['320 by 640', { width: 320, height: 640 }, true],
  ]) {
    test(`at ${label} the popup is a bottom sheet with the foot pinned and on screen`, async ({ browser }) => {
      const { ctx, page } = await openCustomiser(browser, { ...viewport, touch })
      const b = await boxes(page)
      expect(Math.round(b.panel.w), 'the sheet spans the width').toBe(viewport.width)
      expect(Math.round(b.panel.b), 'the sheet sits on the bottom edge').toBe(viewport.height)
      const radii = await panel(page).evaluate((el) => {
        const cs = getComputedStyle(el)
        return { top: parseFloat(cs.borderTopLeftRadius), bottom: parseFloat(cs.borderBottomLeftRadius) }
      })
      expect(radii.top, 'the top corners are rounded').toBeGreaterThan(0)
      expect(radii.bottom, 'the bottom corners are square').toBe(0)
      expect(Math.round(b.right.y), 'one column: the controls are under the left column').toBeGreaterThanOrEqual(Math.round(b.left.b) - 1)
      // The stage is its 168px, not 168px plus the lines a contrast note might need.
      const stageBox = await page.locator('.icust-stage').boundingBox()
      expect(stageBox.height, `the stage is ${stageBox.height}px tall; the sheet gives it 168`).toBeLessThanOrEqual(172)

      // The body scrolls (there is more than a screen of controls); the foot does not move while it does.
      const scrollable = await page.locator('.icust-body').evaluate((el) => el.scrollHeight - el.clientHeight)
      expect(scrollable, 'the sheet has nothing to scroll, so the pin proves nothing').toBeGreaterThan(40)
      const footAt = async () => (await boxes(page)).foot
      // The Similar row can still be loading; wait until the foot holds still before reading it.
      let last = -1
      await expect.poll(async () => {
        const y = Math.round((await footAt()).y)
        const settled = y === last
        last = y
        return settled
      }, { message: 'the foot never settled', intervals: [150], timeout: 10000 }).toBe(true)
      const top = await footAt()
      await page.locator('.icust-body').evaluate((el) => { el.scrollTop = el.scrollHeight })
      const end = await footAt()
      await page.locator('.icust-body').evaluate((el) => { el.scrollTop = 0 })
      for (const f of [top, end]) {
        expect(Math.round(f.y), 'the foot moved with the scroll').toBe(Math.round(top.y))
        expect(f.b, 'the foot is below the bottom of the screen').toBeLessThanOrEqual(viewport.height + 1)
        expect(f.y, 'the foot is above the top of the screen').toBeGreaterThanOrEqual(0)
      }
      // Its three controls are all on screen and none of them is cut off.
      await expect(page.locator('.icust-copy')).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toBeInViewport({ ratio: 1 })
      await expect(page.locator('.icust-save')).toBeInViewport({ ratio: 1 })
      const footRow = await page.locator('.icust-foot-row').evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
      expect(footRow.sw, 'the foot scrolls sideways').toBeLessThanOrEqual(footRow.cw + 1)
      await ctx.close()
    })
  }
})

test.describe('head and Reset', () => {
  test('the head holds the name and "{Pack}, {weight}"; the eyebrow and the tag chips are gone', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await expect(head(page).locator('#icust-title')).not.toBeEmpty()
    await expect(head(page).locator('.icust-sub')).toHaveText(/^[^,]+, (outline|solid)$/)
    await expect(page.locator('.icust-eyebrow')).toHaveCount(0)
    await expect(page.locator('.icust-meta')).toHaveCount(0)
    await expect(page.locator('.icust-tag')).toHaveCount(0)
    await expect(page.getByText('CDN', { exact: true })).toHaveCount(0)
    await ctx.close()
  })

  test('Reset appears only after a change, sits before Close, and puts the change back', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await expect(reset(page), 'Reset shows with nothing changed').toHaveCount(0)

    await page.getByRole('radio', { name: 'White', exact: true }).click()
    await rotRight(page).click()
    await expect(reset(page)).toBeVisible()
    expect(
      await page.evaluate(() => {
        const r = [...document.querySelectorAll('.icust-head button')].find((b) => b.textContent.trim() === 'Reset')
        const c = document.querySelector('.icust-close')
        return !!(r.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)
      }),
      'Reset must come before Close in tab order',
    ).toBe(true)
    await expect(page.locator('.icust-rot-val')).toHaveText('90°')

    await reset(page).click()
    await expect(page.getByRole('radio', { name: 'Text colour', exact: true }), 'colour was not put back').toBeChecked()
    await expect(page.locator('.icust-rot-val'), 'rotation was not put back').toHaveText('0°')
    expect(await stageTransform(page), 'the preview is still turned').toBe('none')
    await expect(reset(page), 'Reset stays after it has done its job').toHaveCount(0)

    // A flip alone is a change too.
    await flipH(page).click()
    await expect(reset(page)).toBeVisible()
    await reset(page).click()
    await expect(flipH(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(reset(page)).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('rotate and flip', () => {
  test('Rotate left and right turn the preview and the angle in the header, a full turn returns to 0', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await expect(page.locator('.icust-rot-val')).toHaveText('0°')
    expect(await stageTransform(page)).toBe('none')

    await rotRight(page).click()
    await expect(page.locator('.icust-rot-val')).toHaveText('90°')
    await expect.poll(() => stageTransform(page), { message: 'right once' }).toBe('matrix(0, 1, -1, 0, 0, 0)')

    await rotLeft(page).click()
    await expect(page.locator('.icust-rot-val')).toHaveText('0°')
    await expect.poll(() => stageTransform(page), { message: 'left from 90' }).toBe('none')

    await rotLeft(page).click()
    await expect(page.locator('.icust-rot-val'), 'left from 0 goes to 270').toHaveText('270°')
    await expect.poll(() => stageTransform(page), { message: 'left from 0' }).toBe('matrix(0, -1, 1, 0, 0, 0)')

    await rotRight(page).click()
    await expect(page.locator('.icust-rot-val')).toHaveText('0°')
    for (let i = 0; i < 4; i += 1) await rotRight(page).click()
    await expect(page.locator('.icust-rot-val'), 'four turns right').toHaveText('0°')
    await ctx.close()
  })

  test('Rotate announces the angle through a polite status, and the angle sits at the right of the header', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const status = page.locator('.icust-rot-head [role="status"]')
    await expect(status).toHaveText('Not rotated')
    await rotRight(page).click()
    await expect(status, 'Rotate right says nothing').toHaveText('Rotated 90 degrees')
    await rotLeft(page).click()
    await rotLeft(page).click()
    await expect(status).toHaveText('Rotated 270 degrees')
    await rotRight(page).click()
    await expect(status).toHaveText('Not rotated')
    // The visible angle is not read twice, and it sits beside the buttons, not beside the title.
    await expect(page.locator('.icust-rot-val')).toHaveAttribute('aria-hidden', 'true')
    const at = await page.evaluate(() => {
      const r = (sel) => document.querySelector(sel).getBoundingClientRect()
      return { title: r('.icust-rot-title'), val: r('.icust-rot-val'), btns: r('.icust-rot-btns') }
    })
    expect(at.val.x, 'the angle is not next to the title').toBeGreaterThan(at.title.right + 24)
    expect(at.val.right, 'the angle runs past the buttons').toBeLessThanOrEqual(at.btns.x)
    await ctx.close()
  })

  test('Flip horizontally and vertically toggle aria-pressed and mirror the preview', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    for (const b of [flipH(page), flipV(page)]) await expect(b).toHaveAttribute('aria-pressed', 'false')
    for (const b of [rotLeft(page), rotRight(page)]) await expect(b, 'a rotate button is not a toggle').not.toHaveAttribute('aria-pressed', /.*/)

    await flipH(page).click()
    await expect(flipH(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(flipV(page)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => stageTransform(page), { message: 'flip horizontally' }).toBe('matrix(-1, 0, 0, 1, 0, 0)')

    await flipV(page).click()
    await expect(flipV(page)).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => stageTransform(page), { message: 'both flips' }).toBe('matrix(-1, 0, 0, -1, 0, 0)')

    await flipH(page).click()
    await expect(flipH(page)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => stageTransform(page), { message: 'vertical only' }).toBe('matrix(1, 0, 0, -1, 0, 0)')
    await flipV(page).click()
    await expect(flipV(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await stageTransform(page)).toBe('none')
    await ctx.close()
  })

  test('the four buttons are 40px on a fine pointer and 44px on a touch screen', async ({ browser }) => {
    const fine = await openCustomiser(browser)
    for (const b of [rotLeft(fine.page), rotRight(fine.page), flipH(fine.page), flipV(fine.page)]) {
      const box = await b.boundingBox()
      expect([Math.round(box.width), Math.round(box.height)]).toEqual([40, 40])
    }
    await fine.ctx.close()
    const touch = await openCustomiser(browser, { width: 390, height: 780, touch: true })
    for (const b of [rotLeft(touch.page), rotRight(touch.page), flipH(touch.page), flipV(touch.page)]) {
      await b.scrollIntoViewIfNeeded()
      const box = await b.boundingBox()
      expect([Math.round(box.width), Math.round(box.height)]).toEqual([44, 44])
    }
    await touch.ctx.close()
  })
})

test.describe('SVG code disclosure', () => {
  test('the SVG code is closed by default, opens and closes, and the summary\'s byte count is the code\'s size', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const details = page.locator('details.icust-code')
    await expect(details).not.toHaveAttribute('open', /.*/)
    await expect(summary(page)).toContainText('SVG code')
    await expect(page.locator('.icust-code-val')).toHaveText(/^24 × 24 · [\d,]+ bytes$/)
    await expect(codeBox(page), 'the code shows while closed').toBeHidden()

    await summary(page).click()
    await expect(details).toHaveAttribute('open', '')
    await expect(codeBox(page).locator('code')).toContainText('<svg')
    const fits = async () => page.evaluate(() => {
      const text = document.querySelector('.icust-code-box code').textContent
      const shown = document.querySelector('.icust-code-val').textContent
      return { shown, bytes: new TextEncoder().encode(text).length }
    })
    const a = await fits()
    expect(a.shown, 'the summary says another size than the code is').toBe(`24 × 24 · ${a.bytes.toLocaleString('en-AU')} bytes`)

    // Live: another size changes both.
    await sizeRadio(page, '32 pixels').click()
    await expect(page.locator('.icust-code-val')).toHaveText(/^32 × 32 · [\d,]+ bytes$/)
    const b = await fits()
    expect(b.shown).toBe(`32 × 32 · ${b.bytes.toLocaleString('en-AU')} bytes`)

    // The keyboard opens and closes it as well.
    await summary(page).focus()
    await page.keyboard.press('Enter')
    await expect(details).not.toHaveAttribute('open', /.*/)
    await page.keyboard.press('Space')
    await expect(details).toHaveAttribute('open', '')
    await summary(page).click()
    await expect(details).not.toHaveAttribute('open', /.*/)
    await ctx.close()
  })

  test('the byte count groups its digits, and only the numbers are mono: the word "bytes" is in the UI face', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const parts = await page.locator('.icust-code-val').evaluate((el) => {
      const num = el.querySelector('.icust-mono')
      return {
        outer: getComputedStyle(el).fontFamily,
        inner: getComputedStyle(num).fontFamily,
        numbers: num.textContent,
        rest: el.textContent.replace(num.textContent, '').trim(),
      }
    })
    expect(parts.numbers, 'the numbers are 24 × 24 and a byte count with its thousands grouped').toMatch(/^24 × 24 · \d{1,3}(,\d{3})*$/)
    expect(parts.rest, 'only the unit sits outside the mono span').toBe('bytes')
    expect(parts.outer, 'the unit is set in mono').not.toBe(parts.inner)
    await ctx.close()
  })

  test('the open code is a named region a keyboard can reach and scroll, with a visible focus ring', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await summary(page).click()
    const code = codeBox(page).locator('code')
    await expect(code).toHaveAttribute('tabindex', '0')
    await expect(code).toHaveAttribute('role', 'region')
    await expect(code).toHaveAccessibleName('SVG code')
    // Tab from the summary: the Copy button first, then the code itself.
    await summary(page).focus()
    await page.keyboard.press('Tab')
    await expect(codeCopy(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(code).toBeFocused()
    const ring = await code.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }
    })
    expect(ring.style, 'the focused code shows no ring').not.toBe('none')
    expect(ring.width, 'the ring is thinner than 2px').toBeGreaterThanOrEqual(2)
    await ctx.close()
  })

  test('touch targets: the summary is 44px on a touch screen; the code Copy is at least 32px on a fine pointer and 44px on touch', async ({ browser }) => {
    const fine = await openCustomiser(browser)
    await summary(fine.page).click()
    const copyFine = await codeCopy(fine.page).boundingBox()
    expect(Math.round(copyFine.height), 'the code Copy is under 32px on a fine pointer').toBeGreaterThanOrEqual(32)
    await fine.ctx.close()

    const touch = await openCustomiser(browser, { width: 390, height: 780, touch: true })
    await summary(touch.page).scrollIntoViewIfNeeded()
    const sum = await summary(touch.page).boundingBox()
    expect(Math.round(sum.height), 'the SVG code summary is under 44px on a touch screen').toBeGreaterThanOrEqual(44)
    await summary(touch.page).click()
    const copyTouch = await codeCopy(touch.page).boundingBox()
    expect(Math.round(copyTouch.height), 'the code Copy is under 44px on a touch screen').toBeGreaterThanOrEqual(44)
    await touch.ctx.close()
  })

  test('its Copy copies exactly the code shown, says Copied!, and the code can be selected', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await summary(page).click()
    await expect(codeCopy(page)).toBeEnabled({ timeout: 20_000 })
    await expect(codeCopy(page)).toHaveText('Copy')
    await expect(codeCopy(page)).toHaveAccessibleName('Copy SVG code')
    expect(await codeBox(page).locator('code').evaluate((el) => getComputedStyle(el).userSelect), 'the code cannot be selected').toBe('text')

    const before = (await page.evaluate(() => window.__clipboardWrites)).length
    await codeCopy(page).click()
    await expect(codeCopy(page)).toHaveText('Copied!')
    await expect.poll(() => page.evaluate(() => window.__clipboardWrites.length)).toBeGreaterThan(before)
    const shown = await codeBox(page).locator('code').textContent()
    const writes = await page.evaluate(() => window.__clipboardWrites)
    expect(writes.at(-1), 'what was copied is not the code on screen').toBe(shown)
    expect(writes.at(-1)).toMatch(/^<svg[\s\S]+<\/svg>$/)
    await ctx.close()
  })

  test('while a Pro setting is only previewed the code stays but cannot be selected, and its Copy is dimmed', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await summary(page).click()
    await tileFor(page, 'Sharp').click()
    await expect(codeCopy(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(codeBox(page)).toHaveClass(/is-locked/)
    await expect(codeBox(page).locator('code')).toContainText('<svg')
    expect(await codeBox(page).locator('code').evaluate((el) => getComputedStyle(el).userSelect)).toBe('none')
    await tileFor(page, 'Round').click()
    await expect(codeCopy(page)).not.toHaveAttribute('aria-disabled', /.*/)
    expect(await codeBox(page).locator('code').evaluate((el) => getComputedStyle(el).userSelect)).toBe('text')
    await ctx.close()
  })
})

/** True if any of the element's transitions (or its animation) could move a transform. */
function motionOf(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el)
    const props = cs.transitionProperty.split(',').map((s) => s.trim())
    const secs = cs.transitionDuration.split(',').map((s) => parseFloat(s) * (s.trim().endsWith('ms') ? 0.001 : 1))
    const delays = cs.transitionDelay.split(',').map((s) => parseFloat(s) * (s.trim().endsWith('ms') ? 0.001 : 1))
    const transforms = props.some((p, i) => (p === 'transform' || p === 'all') && (secs[i % secs.length] > 0 || delays[i % delays.length] > 0))
    return { transforms, animation: cs.animationName, props: cs.transitionProperty, duration: cs.transitionDuration }
  })
}

test.describe('reduced motion', () => {
  const TARGETS = [['the panel', '.icust-panel'], ['the code caret', '.icust-code-caret'], ['the Ends and corners caret', '.icust-line-toggle svg']]

  test('under reduced motion no transform transitions on the panel or the carets, and the panel does not animate in', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { reducedMotion: 'reduce' })
    for (const [label, sel] of TARGETS) {
      await expect(page.locator(sel).first(), `${label} is not in the popup`).toBeAttached()
      const m = await motionOf(page, sel)
      expect(m.transforms, `${label} still transitions a transform (${m.props} over ${m.duration})`).toBe(false)
      expect(m.animation, `${label} still animates`).toBe('none')
    }
    // Opening the disclosure turns the caret at once.
    await summary(page).click()
    const turned = await page.locator('.icust-code-caret').evaluate((el) => getComputedStyle(el).transform)
    expect(turned, 'the caret did not turn when the code opened').not.toBe('none')
    await ctx.close()
  })

  test('with motion allowed the same carets do transition a transform (the check can fail)', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { reducedMotion: 'no-preference' })
    const caret = await motionOf(page, '.icust-code-caret')
    expect(caret.transforms, 'the code caret never transitions, so the reduced-motion test above proves nothing').toBe(true)
    const toggle = await motionOf(page, '.icust-line-toggle svg')
    expect(toggle.transforms, 'the Ends and corners caret never transitions').toBe(true)
    await ctx.close()
  })
})
