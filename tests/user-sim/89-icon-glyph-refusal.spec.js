// THE CATALOGUE CAN ANSWER WHILE EVERY GLYPH REFUSES, AND THAT IS WHAT BROKE.
//
// The 2026-09-08 outage work built a real refused-state for the Icon Library:
// "Couldn't reach the icon service — showing built-in icons", a Try again
// button, the built-in set underneath, and a masthead pill that reads the same
// flag so it can never say "Live library connected" over a dead grid. All of it
// keys on the CATALOGUE requests failing.
//
// Founder, 2026-09-15: "the icon library is broken and so is alot of other
// resources". Measured the same day against the live API: all 24 /collection
// requests returned 200 while every individual glyph .svg came back 429 from
// Cloudflare (error 1015 — rate limited per IP, Retry-After 257). The API
// answers a rate-limited glyph with text/plain; the browser had asked for an
// image; ORB blocks the response and the <img> fails. So the app believed the
// service was healthy and rendered 120 blank cells with nothing said about it.
//
// That is the exact state this file reproduces: catalogue served from the
// fixture, glyphs refused. refuseIconifyGlyphs lives in iconify-stub.js rather
// than here because the unit guard forbids a spec naming those hosts — a
// per-spec route that drifted would refuse differently from the outage.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { isLiveIconify, refuseIconifyGlyphs } from './iconify-stub.js'

const PERSONA = 'a designer looking for an icon on a shared office connection, where the icon API has rate-limited the whole building'

test.describe('the icon grid when the catalogue answers and the glyphs do not', () => {
  test.skip(isLiveIconify(), 'the live API decides what it serves; this spec pins the refused shape')

  test('THE ONE THAT MATTERS: blank cells become built-in icons, and it says so', async ({ page }) => {
    watch(page, PERSONA)
    await refuseIconifyGlyphs(page)
    await go(page, '/create/icons')

    // The notice the 2026-09-08 work built, reached by a route it could not see.
    const notice = page.getByText(/couldn.t reach the icon service/i)
    await expect(notice, 'the grid is refusing glyphs and saying nothing').toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()

    // And the grid is USABLE, not empty: the built-in set renders as inline SVG,
    // which is the whole point of falling back rather than showing broken boxes.
    const m = await page.evaluate(() => ({
      broken: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
      // Nothing from the refused service got through. Counting src hosts is no
      // longer the way to ask: a cell that DID get its markup carries a data:
      // URI, so the question is whether any catalogue glyph painted at all.
      // Counted inside the grid, because the masthead and rail are not it.
      catalogueCells: document.querySelectorAll('.ig .ic img').length,
      // And no cell is left sitting on the placeholder: the fallback replaced
      // the grid rather than leaving 120 empty boxes, which is the whole
      // difference between this state and the bug at the top of this file.
      waiting: document.querySelectorAll('.ig .ic .ig-glyph-wait').length,
      inlineCells: document.querySelectorAll('button svg').length,
    }))
    expect(m.broken, `${m.broken} broken image(s) still on screen`).toBe(0)
    expect(m.catalogueCells, 'the grid still shows catalogue glyphs the service refused').toBe(0)
    expect(m.waiting, `${m.waiting} cell(s) left waiting on markup that was refused`).toBe(0)
    expect(m.inlineCells, 'no built-in icons rendered').toBeGreaterThan(8)
  })

  test('the masthead pill cannot claim a live library over a fallback grid', async ({ page }) => {
    // The 2026-09-09 follow-up wired the pill to the same loadError flag so the
    // two could never disagree. It has to hold for THIS failure too, which is
    // the one that reaches the flag by a different road.
    watch(page, PERSONA)
    await refuseIconifyGlyphs(page)
    await go(page, '/create/icons')
    await expect(page.getByText(/couldn.t reach the icon service/i)).toBeVisible({ timeout: 15_000 })

    const body = await page.evaluate(() => document.body.innerText)
    expect(body, 'the pill still says the live library is connected').not.toMatch(/live library connected/i)
    expect(body).toMatch(/built-in icons/i)
  })

  test('POSITIVE CONTROL: with glyphs served, none of the above appears', async ({ page }) => {
    // Every assertion above is satisfied by a page that fell back for any
    // reason at all, including one that always falls back. With the fixture
    // answering normally the grid must be the CATALOGUE — no notice, real glyph
    // requests going out, and cells that actually decoded.
    //
    // THE EVIDENCE CHANGED SHAPE, THE CONTROL DID NOT. This used to count
    // <img> elements whose src pointed at an Iconify host, because each cell
    // was its own request to one. That is the pattern that rate-limited the
    // page into the blank grid at the top of this file, and it is gone: the
    // grid now asks for one batch per pack and composes each returned body into
    // a data: URI. So the request count is watched on the WIRE, where it is now
    // the only place it exists, and the cells are checked for having decoded.
    watch(page, PERSONA)
    const batched = []
    page.on('request', (r) => {
      if (/\/[^/]+\.json\?icons=/.test(r.url())) batched.push(r.url())
    })
    await go(page, '/create/icons')
    await page.waitForTimeout(2500)

    await expect(page.getByText(/couldn.t reach the icon service/i)).toHaveCount(0)
    expect(batched.length, 'the catalogue grid is not requesting any glyphs').toBeGreaterThan(0)

    const m = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.ig .ic img')]
      return {
        painted: cells.filter((i) => i.complete && i.naturalWidth > 0).length,
        notFromBatch: cells.filter((i) => !i.src.startsWith('data:')).length,
        waiting: document.querySelectorAll('.ig .ic .ig-glyph-wait').length,
      }
    })
    expect(m.painted, 'the grid drew no glyphs at all').toBeGreaterThan(8)
    expect(m.notFromBatch, 'a cell is still fetching its own glyph instead of using the batch').toBe(0)
    expect(m.waiting, 'cells are still waiting for markup that never arrived').toBe(0)
  })
})
