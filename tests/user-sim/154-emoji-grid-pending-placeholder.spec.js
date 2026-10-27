// The Emoji Library's phone-lag rule, from the page: a cell whose bitmap is still
// on its way paints a quiet placeholder instead of laying out live colour text
// (about 7 ms a cell at 4x CPU, and a fast scroll mounts dozens at once), but it
// keeps its name, and a glyph that will never be a bitmap keeps its text.
//
//   - the atlas worker held back  -> every cell is a placeholder with a hidden
//     `.emoji-char`, and every cell is still named by its glyph.
//   - OffscreenCanvas unavailable -> the atlas is out of play: live text, nothing
//     pending, nothing waiting for a bitmap that will never come.
//   - the worker rules a flag out -> the flag shows its text, not a placeholder
//     that nothing would ever replace.
//
// The rule's logic is pinned without a browser in
// tests/unit/emoji-atlas-pending.test.js. What only a browser settles is that
// the grid wires it to the DOM: the class, the hidden text, the label.
//
// The worker is the one thing outside our code, so it is the one thing faked,
// and only the atlas's own messages (the ones that carry `chars` and `cols`).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/emoji'
const SEARCH = 'input[type="search"]'
const CELL = '.emoji-cell'
const AUSTRALIA = '\u{1F1E6}\u{1F1FA}'

test.use({ viewport: { width: 390, height: 844 } })

// `mode`: 'hold' swallows every atlas job (no reply, ever); 'flags-text' answers
// each job with a sheet that draws every glyph except a flag, which it rules out
// as text, as the real worker does for a flag the font has no picture for, BUT
// holds any job that contains a flag until the test calls `window.__atlas.release()`.
// The background warm pass reaches the flags long before a search does, so
// without the hold the flag would be ruled out while no cell shows it, and the
// test could pass with no reply ever reaching a mounted cell. Held, the flag is
// first answered after the search has mounted its cell as a placeholder, which
// is what the atlas's mounted-glyph gating has to turn into text.
// 'no-offscreen' removes OffscreenCanvas, as an older phone browser lacks it.
async function fakeAtlasWorker(page, mode) {
  await page.addInitScript((mode) => {
    const state = { jobs: 0, flagsRuledOut: 0, heldJobs: 0, open: false, held: null, release: null }
    window.__atlas = state
    if (mode === 'no-offscreen') {
      Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true, writable: true })
      return
    }
    const RealWorker = window.Worker
    const isFlag = (ch) => /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(ch)
    const answer = (worker, msg) => {
      const text = []
      msg.chars.forEach((ch, i) => { if (isFlag(ch)) { text.push(i); state.flagsRuledOut++ } })
      const reply = { gen: msg.gen, id: msg.id, blob: new Blob(['sheet']), rows: Math.ceil(msg.chars.length / msg.cols), w: 432, h: 36, text }
      setTimeout(() => { if (worker.onmessage) worker.onmessage({ data: reply }) }, 0)
    }
    state.release = () => {
      state.open = true
      const held = state.held
      state.held = null
      if (held) answer(held.worker, held.msg)
    }
    window.Worker = class extends RealWorker {
      postMessage(msg, ...rest) {
        const isAtlasJob = msg && Array.isArray(msg.chars) && msg.cols
        if (!isAtlasJob) return super.postMessage(msg, ...rest)
        state.jobs++
        if (mode === 'hold') return
        if (!state.open && msg.chars.some(isFlag)) { state.held = { worker: this, msg }; state.heldJobs++; return }
        answer(this, msg)
      }
    }
  }, mode)
}

async function openGrid(page, persona) {
  watch(page, persona)
  await go(page, ROUTE)
  await expect(page.locator(SEARCH)).toBeVisible()
  await expect(page.locator(CELL).first()).toBeVisible()
}

// The cells whose box is at least partly on screen.
const onScreen = (page) => page.locator(CELL).evaluateAll((cells) => cells
  .filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight })
  .map((el) => {
    const char = el.querySelector('.emoji-char')
    return {
      glyph: char.textContent,
      pending: el.classList.contains('pending'),
      hasBitmap: el.classList.contains('has-bitmap'),
      charShown: getComputedStyle(char).display !== 'none',
      label: el.getAttribute('aria-label'),
      beforeContent: getComputedStyle(el, '::before').content,
      beforeWidth: getComputedStyle(el, '::before').width,
    }
  }))

test.describe('emoji grid placeholder', () => {
  test('with the atlas worker held back, visible cells are placeholders and still named by their glyph', async ({ page }) => {
    await fakeAtlasWorker(page, 'hold')
    await openGrid(page, 'someone on a phone while the emoji sheets are still drawing')
    // The atlas is really in play and really waiting: it has handed the worker work.
    await expect.poll(() => page.evaluate(() => window.__atlas.jobs), { message: 'the atlas never asked the worker for anything' }).toBeGreaterThan(0)

    const cells = await onScreen(page)
    expect(cells.length, 'no cell on screen').toBeGreaterThan(10)
    for (const c of cells) {
      expect(c.pending, `${c.glyph} is not pending`).toBe(true)
      expect(c.hasBitmap, `${c.glyph} has a bitmap the worker never sent`).toBe(false)
      expect(c.charShown, `${c.glyph} still lays out its live text`).toBe(false)
      expect(c.beforeContent, `${c.glyph} has no placeholder`).not.toBe('none')
      expect(c.beforeWidth, `${c.glyph} placeholder size`).toBe('20px')
      expect(c.label, `${c.glyph} lost its label with the text hidden`).toBe(c.glyph)
    }

    // The browser's own accessible name, not just the attribute we set.
    const first = page.locator(CELL).first()
    await expect(first).toHaveAccessibleName(cells[0].glyph)
    await expect(page.locator(CELL).nth(cells.length - 1)).toHaveAccessibleName(cells[cells.length - 1].glyph)
  })

  test('with OffscreenCanvas unavailable, cells keep their live text and none are pending', async ({ page }) => {
    await fakeAtlasWorker(page, 'no-offscreen')
    await openGrid(page, 'someone on a browser that cannot draw the emoji sheets')
    expect(await page.evaluate(() => typeof OffscreenCanvas)).toBe('undefined')

    const cells = await onScreen(page)
    expect(cells.length, 'no cell on screen').toBeGreaterThan(10)
    for (const c of cells) {
      expect(c.pending, `${c.glyph} waits for a bitmap that cannot come`).toBe(false)
      expect(c.hasBitmap, `${c.glyph} has a bitmap with no canvas to draw it`).toBe(false)
      expect(c.charShown, `${c.glyph} hides its text and shows nothing`).toBe(true)
      expect(c.glyph.length, 'an empty cell').toBeGreaterThan(0)
    }
    await expect(page.locator(`${CELL}.pending`)).toHaveCount(0)
    await expect(page.locator(CELL).first()).toHaveAccessibleName(cells[0].glyph)
  })

  test('a flag the worker rules out shows its text, while the other cells become bitmaps', async ({ page }) => {
    await fakeAtlasWorker(page, 'flags-text')
    await openGrid(page, 'someone looking for a flag')

    // The ordinary cells are drawn: the fake worker is answering.
    await expect(page.locator(`${CELL}.has-bitmap`).first()).toBeVisible()

    const field = page.locator(SEARCH)
    await field.click()          // the index loads on focus
    await field.fill('australia')
    const flag = page.locator(`${CELL}[title*="${AUSTRALIA}"]`)
    await expect(flag).toHaveCount(1, { timeout: 15000 })

    // The worker has not answered for any flag yet (the fake holds those jobs), so
    // the searched flag's cell is mounted as a placeholder, not already text.
    await expect.poll(() => page.evaluate(() => window.__atlas.heldJobs), { message: 'the worker was never asked about a flag' }).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.__atlas.flagsRuledOut), 'a flag was ruled out before the search rendered').toBe(0)
    await expect(flag).toHaveClass(/pending/)
    await expect(flag.locator('.emoji-char')).toBeHidden()

    // Now the worker rules the flag out. The cell is mounted, so the grid must
    // re-render it as text; a reply the atlas thought nobody was showing would
    // leave the placeholder in place and fail here.
    await page.evaluate(() => window.__atlas.release())
    await expect.poll(() => page.evaluate(() => window.__atlas.flagsRuledOut), { message: 'the worker never ruled the flag out' }).toBeGreaterThan(0)
    await expect(flag).not.toHaveClass(/pending/)
    await expect(flag).not.toHaveClass(/has-bitmap/)
    await expect(flag.locator('.emoji-char')).toBeVisible()
    await expect(flag.locator('.emoji-char')).toHaveText(AUSTRALIA)
    await expect(flag).toHaveAccessibleName(AUSTRALIA)
  })
})
