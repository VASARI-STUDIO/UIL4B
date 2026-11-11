// THE ICON EDITOR'S HEAD, ROTATE AND FLIP, SVG CODE DISCLOSURE AND LAYOUT.
//
// What a person relies on, by acceptance criterion (icon library design, slice S5):
//   18. nothing in the editor is uppercase mono, and no label, caption, pill or count is set in mono:
//       mono is for a literal value (a hex, a file name, code) and nothing else;
//   19. at 1440 (900 tall) the controls column holds 638px in 570 and scrolls on its own by 68px, with the
//       code closed and no custom row open; the stage column and the dialog do not scroll;
//   28. under reduced motion the dialog and the carets do not transition or animate a transform.
// And the layout and behaviour around them:
//   - 900 and up: the stage on the left; the head, the controls and the foot stacked in a 400px column
//     beside it. At 1440 the dialog is 1160px wide;
//   - 899 and down: a bottom sheet (560px at most) with the head, the stage card, the controls and the
//     foot in one column, the foot pinned and on screen;
//   - the head holds the name and "{Pack}, {weight}"; Reset appears only after a change and puts it back;
//   - Rotate left and right turn the preview, Flip toggles aria-pressed and mirrors it;
//   - the SVG code is a closed disclosure with the live byte count, its Copy copies, and while a Pro
//     setting is only previewed the code cannot be selected;
//   - the sheet's stage card holds the drawing and the size strip and nothing else, the open code is a
//     named region a keyboard can scroll, the touch targets are 44px, the rotation is announced, and the
//     foot's hairline and the custom colour picker both behave while the controls scroll on their own.
//
// HOW TO SEE EACH FAIL (src/styles/pages/icon-editor.css and src/pages/IconLibrary.jsx):
//   .ied-hd .ied-note { font-family: var(--mono) }                    -> "no label, caption, pill or count is set in mono"
//   .ied-lbl { text-transform: uppercase; font-family: var(--mono) }  -> "nothing is uppercase mono"
//   .ied-secs { gap: 60px }                                           -> "at 1440 the controls column scrolls ... by the board's 68px"
//   .ied grid-template-columns 400px -> 360px                         -> "at 1440 the dialog is 1160px wide ..."
//   the 900px layout breakpoint becomes 700px                         -> "at 900 the stage and the controls sit side by side ..."
//   the (max-width:899px) sheet block is dropped                      -> "at 640 and at 320 ... bottom sheet"
//   the measure() effect stops setting data-on on .ied-ft             -> "the foot's hairline shows only while the controls can scroll"
//   the measure() effect stops setting data-on on .ied-hd             -> "the head's hairline shows only once the controls have scrolled"
//   handleReset stops resetting rotate                                -> "Reset appears only after a change ..."
//   `edited` stops counting flipV                                     -> "Reset appears only after a change ..."
//   the Rotate left handler adds 90 instead of 270                    -> "Rotate left and right turn the preview"
//   useState(false) for codeOpen becomes useState(true)               -> "the SVG code is closed ..."
//   codeBytes goes stale (its useMemo deps become [])                 -> "the summary's byte count is the code's size"
//     (NOT caught: counting characters instead of UTF-8 bytes. The exported markup is ASCII, so the two agree.)
//   handleCopyCode copies the serialised output of another size       -> "its Copy copies exactly the code shown"
//   .ied-code.is-locked pre loses user-select:none                    -> "while a Pro setting is only previewed ..."
//   `.ied-disc svg` transition has no reduced-motion override         -> "under reduced motion ..."
//   the reduced-motion rule for .ied is removed (ied-dlg's scale runs) -> "under reduced motion ..."
//   .ied-contrast on the sheet loses display:none                     -> "the stage card is its top zone plus the size strip"
//   <pre> loses tabIndex, role="region" or aria-label                 -> "the open code is a named region ..."
//   .ied-disc loses its max-width:899px height:44px                   -> "touch targets ..."
//   the Rotate buttons stop writing the rotation status               -> "Rotate announces ..."
//   <ColorPickerPop> loses `portal`                                   -> "the custom colour picker opens outside the scrolling column"
//   src restored byte for byte                                        -> all of them pass again.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'someone tuning an icon in the editor'

/**
 * Open the editor on the grid's first icon. `plan` is 'pro', 'free' or null (signed out).
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
  await expect(page.locator('.ied-ground')).toBeVisible({ timeout: 20_000 })
  // The rail and the stage draw the icon's own markup, so wait for it rather than for the frame.
  await expect(page.locator('.ied-cell-s[data-s="16"] svg')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ied-stage-host svg')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ied-pri')).toBeEnabled({ timeout: 20_000 })
  // The sheet slides up as it opens: let every finite animation finish so a box read now is
  // where it rests (CI read the bottom edge at 639 of 640 mid-slide). A loading shimmer
  // elsewhere runs forever, so only finite ones are awaited.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
    .map((a) => a.finished.catch(() => {}))))
  return { ctx, page }
}

const panel = (page) => page.locator('.ied')
const head = (page) => page.locator('.ied-hd')
const reset = (page) => head(page).getByRole('button', { name: 'Reset', exact: true })
const summary = (page) => page.locator('#ied-sec-code .ied-disc')
const codeBox = (page) => page.locator('#ied-code')
const codeEl = (page) => page.locator('#ied-code pre')
const codeCopy = (page) => page.locator('#ied-code .ied-tn')
const bytesOf = (page) => page.locator('#ied-sec-code .ied-bytes')
const rotVal = (page) => page.locator('.ied-rot .ied-val')
const rotLeft = (page) => page.getByRole('button', { name: 'Rotate left', exact: true })
const rotRight = (page) => page.getByRole('button', { name: 'Rotate right', exact: true })
const flipH = (page) => page.getByRole('button', { name: 'Flip horizontally', exact: true })
const flipV = (page) => page.getByRole('button', { name: 'Flip vertically', exact: true })
const sizeRadio = (page, name) => page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name })
/** Let every finite animation and transition finish, so a computed colour is where it rests. */
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime)).map((a) => a.finished.catch(() => {}))))
const tileFor = (page, name) => page.getByRole('radiogroup', { name: 'Line style' }).getByRole('radio', { name: new RegExp(`^${name}`) })

/** The stage drawing's computed transform, rounded so 6e-17 reads as 0 ('none' stays 'none'). */
async function stageTransform(page) {
  return page.locator('.ied-stage-host svg').evaluate((el) => {
    const t = getComputedStyle(el).transform
    if (t === 'none') return t
    return t.replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (n) => String(Math.round(Number(n) * 1000) / 1000 + 0))
  })
}

/** The box of each named part of the editor, in page pixels. */
const boxes = (page) => page.evaluate(() => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }
  }
  return {
    panel: r('.ied'), stage: r('.ied-stagecol'), head: r('.ied-hd'), scroll: r('#ied-scroll'), foot: r('.ied-ft'),
    ground: r('.ied-ground'), sizes: r('.ied-sizes'), vh: window.innerHeight, vw: window.innerWidth,
  }
})

/**
 * Walk every rendered element in the editor. Returns the ones that break the type rule:
 *   - uppercase mono, anywhere;
 *   - text in mono that is not a literal value (a number, a unit, a hex, currentColor, a byte count) and
 *     is not code, a field or the file name on the stage. A label, caption, pill or count is words, so it
 *     fails here.
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
    for (const el of document.querySelectorAll('.ied, .ied *')) {
      if (!el.getClientRects().length) continue
      const cs = getComputedStyle(el)
      const mono = isMono(cs)
      const name = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`
      if (cs.textTransform === 'uppercase' && mono) bad.push(`${name}: uppercase and mono`)
      if (!mono) continue
      seen += 1
      if (el.closest('code, pre, input, textarea, .ied-nm')) { if (el.closest('code, pre')) codeSeen += 1; continue }
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
    expect(closed.bad, 'default editor').toEqual([])

    await summary(page).click()
    await expect(codeBox(page)).toBeVisible()
    const withCode = await typeSweep(page)
    expect(withCode.codeSeen, 'the sweep did not see the code as mono: its mono test is broken').toBeGreaterThan(0)
    expect(withCode.bad, 'code open').toEqual([])

    await sizeRadio(page, /^Custom(,|$)/).click()
    await expect(page.getByRole('textbox', { name: 'Custom size' })).toBeVisible()
    expect((await typeSweep(page)).bad, 'custom size row open').toEqual([])

    await rotRight(page).click()
    await tileFor(page, 'Sharp').click()
    await expect(page.locator('#ied-preview-line')).not.toBeEmpty()
    expect((await typeSweep(page)).bad, 'Reset showing and a Pro preview line showing').toEqual([])
    await ctx.close()
  })

  test('the same on a phone sheet', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 390, height: 780, touch: true })
    expect((await typeSweep(page)).bad).toEqual([])
    await ctx.close()
  })
})

test.describe('layout', () => {
  test('at 1440 the controls column scrolls on its own by the board\'s 68px, the stage column and the dialog do not, and the foot hairline shows at rest', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 1440, height: 900 })
    // It is a stroke icon (it has a Stroke row), the code is closed, and no custom row is open.
    await expect(page.getByLabel('Stroke width in pixels').first()).toBeVisible()
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.ied-cell-s--custom[aria-checked="true"]')).toHaveCount(0)
    await expect(page.locator('.ied-cus')).toHaveCount(0)
    // The Similar row arrives with the grid's list; measure with it in, as a person sees it.
    await page.locator('.ied-sim[data-ready]').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {})

    const m = await page.evaluate(() => {
      const m = (sel) => { const el = document.querySelector(sel); return { sh: el.scrollHeight, ch: el.clientHeight } }
      return { stage: m('.ied-stagecol'), controls: m('#ied-scroll'), panel: m('.ied') }
    })
    expect(m.stage.sh, `the stage column scrolls (${m.stage.sh} in ${m.stage.ch})`).toBeLessThanOrEqual(m.stage.ch + 1)
    expect(m.panel.sh, `the dialog scrolls (${m.panel.sh} in ${m.panel.ch})`).toBeLessThanOrEqual(m.panel.ch + 1)
    // The board's controls column holds 638px of controls in 570: it scrolls by 68px, and the app matches.
    expect(m.controls.sh - m.controls.ch, `the controls overflow by ${m.controls.sh - m.controls.ch}px (${m.controls.sh} in ${m.controls.ch})`).toBeGreaterThanOrEqual(66)
    expect(m.controls.sh - m.controls.ch, `the controls overflow by ${m.controls.sh - m.controls.ch}px (${m.controls.sh} in ${m.controls.ch})`).toBeLessThanOrEqual(70)
    expect(await page.locator('#ied-scroll').evaluate((el) => getComputedStyle(el).overflowY), 'the controls scroll on their own').toBe('auto')
    await expect(page.locator('.ied-ft'), 'the foot hairline shows at rest while the controls can scroll').toHaveAttribute('data-on', /.*/)
    await ctx.close()
  })

  test("the foot's hairline shows only while the controls can scroll", async ({ browser }) => {
    const edge = (page) => page.evaluate(() => {
      const foot = document.querySelector('.ied-ft')
      const cs = getComputedStyle(foot)
      return { scrolls: foot.hasAttribute('data-on'), colour: cs.borderTopColor, width: cs.borderTopWidth, shadow: cs.boxShadow }
    })
    const short = await openCustomiser(browser, { width: 1440, height: 560 })
    const scrolls = await short.page.locator('#ied-scroll').evaluate((el) => el.scrollHeight > el.clientHeight + 1)
    expect(scrolls, 'a 560px-tall window should make the controls scroll, so this test proves nothing').toBe(true)
    await expect.poll(async () => (await edge(short.page)).scrolls, { message: 'the foot was never marked as over a scroll' }).toBe(true)
    await settle(short.page)
    const b = await edge(short.page)
    expect(b.width, 'the foot changes height when its hairline strengthens').toBe('1px')
    expect(b.shadow, 'a shadow is back on the foot').toBe('none')
    expect(await short.page.locator('#ied-scroll').evaluate((el) => getComputedStyle(el).maskImage), 'the controls are masked on the wide dialog').toBe('none')

    // At the end of the scroll nothing lies under the fold: the foot goes back to its resting hairline.
    await short.page.locator('#ied-scroll').evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect.poll(async () => (await edge(short.page)).scrolls, { message: 'the foot stays marked at the end of the scroll' }).toBe(false)
    await settle(short.page)
    const a = await edge(short.page)
    expect(a.colour, 'the foot hairline did not go back to its resting colour').not.toBe(b.colour)
    await short.ctx.close()
  })

  test("the head's hairline shows only once the controls have scrolled", async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 1440, height: 560 })
    const edge = () => page.evaluate(() => {
      const hd = document.querySelector('.ied-hd')
      return { on: hd.hasAttribute('data-on'), colour: getComputedStyle(hd).borderBottomColor }
    })
    const rest = await edge()
    expect(rest.on, 'the head is marked before anything scrolled').toBe(false)
    expect(rest.colour, 'the head draws a hairline before anything scrolled').toBe('rgba(0, 0, 0, 0)')
    await page.locator('#ied-scroll').evaluate((el) => { el.scrollTop = 120 })
    await expect.poll(async () => (await edge()).on, { message: 'the head was never marked once scrolled' }).toBe(true)
    await expect.poll(async () => (await edge()).colour, { message: 'the head has no hairline while scrolled' }).not.toBe('rgba(0, 0, 0, 0)')
    await page.locator('#ied-scroll').evaluate((el) => { el.scrollTop = 0 })
    await expect.poll(async () => (await edge()).on, { message: 'the head stays marked back at the top' }).toBe(false)
    await ctx.close()
  })

  for (const [w, h] of [[1440, 900], [1366, 768]]) {
    test(`at ${w}x${h} the custom colour picker opens outside the scrolling column and inside the window`, async ({ browser }) => {
      const { ctx, page } = await openCustomiser(browser, { width: w, height: h })
      await page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { name: 'Custom' }).click()
      const pop = page.getByRole('dialog', { name: 'Custom colour' })
      await expect(pop).toBeVisible()
      expect(await pop.evaluate((el) => !!el.closest('#ied-scroll, .ied')), 'the picker is still inside a clipping column').toBe(false)
      const box = await pop.boundingBox()
      expect(box.x, 'the picker is cut off on the left').toBeGreaterThanOrEqual(0)
      expect(box.y, 'the picker is cut off at the top').toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, 'the picker is cut off on the right').toBeLessThanOrEqual(w)
      expect(box.y + box.height, 'the picker is cut off at the bottom').toBeLessThanOrEqual(h)
      await expect(pop.locator('.cpk-pad')).toBeInViewport({ ratio: 1 })
      await ctx.close()
    })
  }

  test('at 1440 the dialog is 1160px wide, the stage runs the full height on the left, and head, controls and foot stack in a 400px column beside it', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { width: 1440, height: 900 })
    const b = await boxes(page)
    expect(Math.round(b.panel.w), 'dialog width').toBe(1160)
    expect(b.panel.h, 'the dialog stays within 780px and the viewport').toBeLessThanOrEqual(Math.min(780, 900 - 120) + 1)
    expect(Math.round(b.stage.w), 'stage column width').toBe(1160 - 400)
    expect(Math.abs(b.stage.x - b.panel.x), 'the stage starts at the left edge').toBeLessThanOrEqual(1)
    expect(Math.abs(b.stage.y - b.panel.y), 'the stage starts at the top').toBeLessThanOrEqual(1)
    expect(Math.abs(b.stage.b - b.panel.b), 'the stage runs to the bottom').toBeLessThanOrEqual(1)
    for (const [name, box] of [['head', b.head], ['controls', b.scroll], ['foot', b.foot]]) {
      expect(Math.round(box.w), `${name} width`).toBe(400)
      expect(box.x, `the ${name} sits to the right of the stage`).toBeGreaterThanOrEqual(b.stage.r - 1)
      expect(Math.abs(box.r - b.panel.r), `the ${name} runs to the right edge`).toBeLessThanOrEqual(1)
    }
    expect(Math.abs(b.head.y - b.panel.y), 'the head starts at the top').toBeLessThanOrEqual(1)
    expect(b.scroll.y, 'the controls are under the head').toBeGreaterThanOrEqual(b.head.b - 1)
    expect(b.foot.y, 'the foot is under the controls').toBeGreaterThanOrEqual(b.scroll.b - 1)
    expect(Math.abs(b.foot.b - b.panel.b), 'the foot runs to the bottom').toBeLessThanOrEqual(1)
    expect(await page.locator('#ied-scroll').evaluate((el) => getComputedStyle(el).overflowY), 'the controls scroll on their own').toBe('auto')
    await ctx.close()
  })

  test('at 900 the stage and the controls sit side by side; at 899 the editor is one 560px sheet with the stage card on top', async ({ browser }) => {
    const wide = await openCustomiser(browser, { width: 900, height: 900 })
    const w = await boxes(wide.page)
    expect(w.scroll.x, '900 is two columns').toBeGreaterThanOrEqual(w.stage.r - 1)
    expect(Math.round(w.scroll.w), 'the controls column at 900').toBe(400)
    expect(Math.round(w.panel.w), 'dialog width at 900').toBe(900 - 40)
    await wide.ctx.close()

    const { ctx, page } = await openCustomiser(browser, { width: 899, height: 900 })
    const b = await boxes(page)
    expect(Math.round(b.panel.w), 'sheet width at 899').toBe(560)
    expect(Math.round(b.panel.b), 'the sheet sits on the bottom edge').toBe(900)
    expect(b.scroll.y, 'the controls sit under the stage card').toBeGreaterThanOrEqual(b.stage.b - 1)
    expect(b.stage.y, 'the stage card sits under the head').toBeGreaterThanOrEqual(b.head.b - 1)
    expect(b.ground.y, 'the stage drawing is above the controls').toBeLessThan(b.scroll.y)
    expect(b.stage.x, 'the stage card is inside the sheet').toBeGreaterThanOrEqual(b.panel.x)
    expect(b.stage.r, 'the stage card is inside the sheet').toBeLessThanOrEqual(b.panel.r)
    expect(Math.abs(b.scroll.x - b.head.x), 'the head and the controls share one left edge').toBeLessThanOrEqual(1)
    expect(Math.abs(b.scroll.w - b.head.w), 'the head and the controls share one width').toBeLessThanOrEqual(1)
    await ctx.close()
  })

  for (const [label, viewport, touch] of [
    ['640', { width: 640, height: 640 }, false],
    ['320 by 640', { width: 320, height: 640 }, true],
  ]) {
    test(`at ${label} the editor is a bottom sheet with the foot pinned and on screen`, async ({ browser }) => {
      const { ctx, page } = await openCustomiser(browser, { ...viewport, touch })
      const b = await boxes(page)
      expect(Math.round(b.panel.w), 'the sheet is as wide as the viewport, up to 560px').toBe(Math.min(viewport.width, 560))
      expect(Math.abs(b.panel.x + b.panel.w / 2 - viewport.width / 2), 'the sheet is centred').toBeLessThanOrEqual(1)
      expect(Math.round(b.panel.b), 'the sheet sits on the bottom edge').toBe(viewport.height)
      const radii = await panel(page).evaluate((el) => {
        const cs = getComputedStyle(el)
        return { top: parseFloat(cs.borderTopLeftRadius), bottom: parseFloat(cs.borderBottomLeftRadius) }
      })
      expect(radii.top, 'the top corners are rounded').toBeGreaterThan(0)
      expect(radii.bottom, 'the bottom corners are square').toBe(0)
      expect(Math.round(b.scroll.y), 'one column: the controls are under the stage card').toBeGreaterThanOrEqual(Math.round(b.stage.b) - 1)
      // The stage card is its top zone plus the size strip, not those plus the lines a contrast note might need.
      const zone = await panel(page).evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--ied-stz')))
      expect(zone, 'the sheet has no top-zone height').toBeGreaterThan(0)
      expect(Math.abs(b.stage.h - (zone + b.sizes.h)), `the stage card is ${b.stage.h}px; its zone (${zone}) and strip (${b.sizes.h}) make ${zone + b.sizes.h}`).toBeLessThanOrEqual(1)

      // The controls scroll (there is more than a screen of them); the foot does not move while they do.
      const scrollable = await page.locator('#ied-scroll').evaluate((el) => el.scrollHeight - el.clientHeight)
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
      await page.locator('#ied-scroll').evaluate((el) => { el.scrollTop = el.scrollHeight })
      const end = await footAt()
      await page.locator('#ied-scroll').evaluate((el) => { el.scrollTop = 0 })
      for (const f of [top, end]) {
        expect(Math.round(f.y), 'the foot moved with the scroll').toBe(Math.round(top.y))
        expect(f.b, 'the foot is below the bottom of the screen').toBeLessThanOrEqual(viewport.height + 1)
        expect(f.y, 'the foot is above the top of the screen').toBeGreaterThanOrEqual(0)
      }
      // Its three controls are all on screen and none of them is cut off.
      await expect(page.locator('.ied-pri')).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toBeInViewport({ ratio: 1 })
      await expect(page.locator('#ied-save')).toBeInViewport({ ratio: 1 })
      const footRow = await page.locator('.ied-foot-row').evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
      expect(footRow.sw, 'the foot scrolls sideways').toBeLessThanOrEqual(footRow.cw + 1)
      await ctx.close()
    })
  }
})

test.describe('head and Reset', () => {
  test('the head holds the name and "{Pack}, {weight}" and nothing else; no eyebrow, no tag chips', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await expect(head(page).locator('#ied-title')).not.toBeEmpty()
    await expect(head(page).locator('.ied-hd-text .ied-note')).toHaveText(/^[^,]+, (outline|solid)$/)
    await expect(head(page).locator('.ied-hd-text > *'), 'the head text is the name and one line under it').toHaveCount(2)
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
        const r = [...document.querySelectorAll('.ied-hd button')].find((b) => b.textContent.trim() === 'Reset')
        const c = document.querySelector('.ied-hd .ied-x')
        return !!(r.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)
      }),
      'Reset must come before Close in tab order',
    ).toBe(true)
    await expect(rotVal(page)).toHaveText('90°')

    await reset(page).click()
    await expect(page.getByRole('radio', { name: 'Default', exact: true }), 'colour was not put back').toBeChecked()
    await expect(rotVal(page), 'rotation was not put back').toHaveText('0°')
    expect(await stageTransform(page), 'the preview is still turned').toBe('none')
    await expect(reset(page), 'Reset stays after it has done its job').toHaveCount(0)

    // A flip alone is a change too.
    await flipH(page).click()
    await expect(reset(page)).toBeVisible()
    await reset(page).click()
    await expect(flipH(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(reset(page)).toHaveCount(0)
    await flipV(page).click()
    await expect(reset(page), 'a vertical flip alone is a change').toBeVisible()
    await reset(page).click()
    await expect(flipV(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(reset(page)).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('rotate and flip', () => {
  test('Rotate left and right turn the preview and the angle beside the label, a full turn returns to 0', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await expect(rotVal(page)).toHaveText('0°')
    expect(await stageTransform(page)).toBe('none')

    await rotRight(page).click()
    await expect(rotVal(page)).toHaveText('90°')
    await expect.poll(() => stageTransform(page), { message: 'right once' }).toBe('matrix(0, 1, -1, 0, 0, 0)')

    await rotLeft(page).click()
    await expect(rotVal(page)).toHaveText('0°')
    await expect.poll(() => stageTransform(page), { message: 'left from 90' }).toBe('none')

    await rotLeft(page).click()
    await expect(rotVal(page), 'left from 0 goes to 270').toHaveText('270°')
    await expect.poll(() => stageTransform(page), { message: 'left from 0' }).toBe('matrix(0, -1, 1, 0, 0, 0)')

    await rotRight(page).click()
    await expect(rotVal(page)).toHaveText('0°')
    for (let i = 0; i < 4; i += 1) await rotRight(page).click()
    await expect(rotVal(page), 'four turns right').toHaveText('0°')
    await ctx.close()
  })

  test('Rotate announces the angle through a polite status, and the angle sits between its label and the buttons', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const status = page.locator('.ied-rot [role="status"]')
    await expect(status).toHaveText('Not rotated')
    await rotRight(page).click()
    await expect(status, 'Rotate right says nothing').toHaveText('Rotated 90 degrees')
    await rotLeft(page).click()
    await rotLeft(page).click()
    await expect(status).toHaveText('Rotated 270 degrees')
    await rotRight(page).click()
    await expect(status).toHaveText('Not rotated')
    // The visible angle is not read twice, and it sits after the label, before the buttons.
    await expect(rotVal(page)).toHaveAttribute('aria-hidden', 'true')
    const at = await page.evaluate(() => {
      const r = (sel) => document.querySelector(sel).getBoundingClientRect()
      return { label: r('#ied-rot-label'), val: r('.ied-rot .ied-val'), btns: r('.ied-rot-b') }
    })
    expect(at.val.x, 'the angle starts before the label ends').toBeGreaterThanOrEqual(at.label.right)
    expect(at.val.x, 'the angle is not next to the label').toBeLessThanOrEqual(at.label.right + 16)
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

  test('the four buttons are 36px on a fine pointer and 44px on a touch screen', async ({ browser }) => {
    const fine = await openCustomiser(browser)
    for (const b of [rotLeft(fine.page), rotRight(fine.page), flipH(fine.page), flipV(fine.page)]) {
      const box = await b.boundingBox()
      expect([Math.round(box.width), Math.round(box.height)]).toEqual([36, 36])
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
  test("the SVG code is closed by default, opens and closes, and the summary's byte count is the code's size", async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(summary(page)).toContainText('SVG code')
    await expect(bytesOf(page)).toHaveText(/^[\d,]+ bytes$/)
    await expect(codeBox(page), 'the code shows while closed').toHaveCount(0)

    await summary(page).click()
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(codeEl(page)).toContainText('<svg')
    const fits = async () => page.evaluate(() => {
      const text = document.querySelector('#ied-code code').textContent
      return {
        shown: document.querySelector('#ied-sec-code .ied-bytes').textContent,
        size: document.querySelector('#ied-code .ied-code-hd .ied-val').textContent,
        bytes: new TextEncoder().encode(text).length,
      }
    })
    const a = await fits()
    expect(a.size, 'the code header says another size than the export').toBe('24 × 24')
    expect(a.shown, 'the summary says another size than the code is').toBe(`${a.bytes.toLocaleString('en-AU')} bytes`)

    // Live: another size changes both.
    await sizeRadio(page, '32 pixels').click()
    await expect(page.locator('#ied-code .ied-code-hd .ied-val')).toHaveText('32 × 32')
    await expect.poll(async () => (await fits()).shown === `${(await fits()).bytes.toLocaleString('en-AU')} bytes`, { message: 'the summary lags the code after a size change' }).toBe(true)

    // The keyboard opens and closes it as well.
    await summary(page).focus()
    await page.keyboard.press('Enter')
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Space')
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'true')
    await summary(page).click()
    await expect(summary(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(codeBox(page)).toHaveCount(0)
    await ctx.close()
  })

  test('the byte count groups its digits and is set in the UI face with tabular figures', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    const parts = await bytesOf(page).evaluate((el) => {
      const num = el.querySelector('.ied-num')
      return {
        outer: getComputedStyle(el).fontFamily,
        inner: getComputedStyle(num).fontFamily,
        figures: getComputedStyle(num).fontVariantNumeric,
        numbers: num.textContent,
        rest: el.textContent.replace(num.textContent, '').trim(),
      }
    })
    expect(parts.numbers, 'the byte count is a number with its thousands grouped').toMatch(/^\d{1,3}(,\d{3})*$/)
    expect(parts.rest, 'only the unit sits outside the number').toBe('bytes')
    expect(parts.inner, 'the number is set in another face than the unit').toBe(parts.outer)
    expect(parts.figures, 'the digits are not tabular').toContain('tabular-nums')
    await ctx.close()
  })

  test('the open code is a named region a keyboard can reach and scroll, with a visible focus ring', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser)
    await summary(page).click()
    const code = codeEl(page)
    await expect(code).toHaveAttribute('tabindex', '0')
    await expect(code).toHaveAttribute('role', 'region')
    await expect(code).toHaveAttribute('aria-label', 'SVG code')
    await expect(page.getByRole('region', { name: 'SVG code' }), 'the code is one named region in the accessibility tree').toHaveCount(1)
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
    expect(await codeEl(page).evaluate((el) => getComputedStyle(el).userSelect), 'the code cannot be selected').not.toBe('none')

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
    expect(await codeEl(page).evaluate((el) => getComputedStyle(el).userSelect)).toBe('none')
    await tileFor(page, 'Round').click()
    await expect(codeCopy(page)).not.toHaveAttribute('aria-disabled', /.*/)
    expect(await codeEl(page).evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none')
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
    const transforms = props.some((p, i) => (p === 'transform' || p === 'all') && (secs[i % secs.length] > 0.001 || delays[i % delays.length] > 0.001))
    // An animation moves a transform if any keyframes rule it names writes one.
    const names = cs.animationName.split(',').map((s) => s.trim()).filter((n) => n !== 'none')
    const animatesTransform = names.some((n) => [...document.styleSheets].some((sheet) => {
      let rules = []
      try { rules = [...sheet.cssRules] } catch { return false }
      return rules.some((r) => r.type === CSSRule.KEYFRAMES_RULE && r.name === n && /transform/.test(r.cssText))
    }))
    return { transforms, animatesTransform, animation: cs.animationName, props: cs.transitionProperty, duration: cs.transitionDuration }
  })
}

test.describe('reduced motion', () => {
  const CODE_CARET = '#ied-sec-code .ied-disc svg'
  const ENDS_CARET = '.ied-disc[aria-controls="ied-line-split"] svg'
  const TARGETS = [['the dialog', '.ied'], ['the code caret', CODE_CARET], ['the Ends and corners caret', ENDS_CARET]]

  test('under reduced motion no transform transitions on the dialog or the carets, and the dialog does not move in', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { reducedMotion: 'reduce' })
    for (const [label, sel] of TARGETS) {
      await expect(page.locator(sel).first(), `${label} is not in the editor`).toBeAttached()
      const m = await motionOf(page, sel)
      expect(m.transforms, `${label} still transitions a transform (${m.props} over ${m.duration})`).toBe(false)
      expect(m.animatesTransform, `${label} still animates a transform (${m.animation})`).toBe(false)
    }
    // Opening the disclosure turns the caret (to 90 degrees).
    await summary(page).click()
    const turnedOf = () => page.locator(CODE_CARET).evaluate((el) => getComputedStyle(el).transform.replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (n) => String(Math.round(Number(n) * 1000) / 1000 + 0)))
    await expect.poll(turnedOf, { message: 'the caret did not turn when the code opened', timeout: 2000 }).toBe('matrix(0, 1, -1, 0, 0, 0)')
    await ctx.close()
  })

  test('with motion allowed the same carets and the dialog do move a transform (the check can fail)', async ({ browser }) => {
    const { ctx, page } = await openCustomiser(browser, { reducedMotion: 'no-preference' })
    const caret = await motionOf(page, CODE_CARET)
    expect(caret.transforms, 'the code caret never transitions, so the reduced-motion test above proves nothing').toBe(true)
    const toggle = await motionOf(page, ENDS_CARET)
    expect(toggle.transforms, 'the Ends and corners caret never transitions').toBe(true)
    const dialog = await motionOf(page, '.ied')
    expect(dialog.animatesTransform, `the dialog never animates a transform (${dialog.animation}), so the reduced-motion test above proves nothing`).toBe(true)
    await ctx.close()
  })
})
