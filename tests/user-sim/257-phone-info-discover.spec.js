// /info and /discover/palettes on a phone and a tablet (390 and 768, touch,
// light and dark).
//
// Every assertion is geometry read off the rendered page, because both defects
// this holds were invisible to the DOM: /info's fourteen index links wrapped to
// six rows and pushed the content 480px down, and the palette cards' action
// chips ran past the card's right edge while still being "present and visible".
// The chips are gone (V3 tiles keep the actions in the preview dialog), so the
// palette check now holds the tile's own controls to the same standard.
// Touch metrics (isMobile + hasTouch) are what make `hover: none` true, which is
// the state the tile controls are laid out for; a resized desktop window is not.
//
// Viewport-only screenshots go to .claude/scratch/phinfo1/.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'phinfo1')

const WIDTHS = [390, 768]
const THEMES = ['light', 'dark']

async function open(browser, width, theme, route, { touch = true } = {}) {
  const ctx = await browser.newContext(touch
    ? { viewport: { width, height: width < 700 ? 844 : 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  watch(page, `${route} at ${width}px ${theme}`)
  await go(page, route)
  return { ctx, page }
}

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
}

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test.describe(`/info at ${width}px ${theme}`, () => {
      test('the index is one 48px jump button, not a block of wrapped chips', async ({ browser }) => {
        const { ctx, page } = await open(browser, width, theme, '/info')
        const jump = page.locator('.ic-jump')
        await expect(jump).toBeVisible()
        const box = await jump.boundingBox()
        // MUTATION: drop `min-height: 48px` on `.ic-jump` in info.css and this fails.
        expect(box.height, 'the jump button is at least 48px tall').toBeGreaterThanOrEqual(47.5)
        // MUTATION: delete `.ic-wrap .ic-toc { display: none; }` in info.css (the chips come
        // back, wrap, and push the first section down) and this fails.
        await expect(page.locator('.ic-toc')).toBeHidden()
        const first = await page.locator('#getting-started').boundingBox()
        expect(first.y, 'the first section starts within the first screen, not 480px lower').toBeLessThan(width === 390 ? 640 : 720)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, 'no horizontal page overflow').toBeLessThanOrEqual(0)
        await shot(page, `info-${width}-${theme}-top`)
        await ctx.close()
      })

      test('the jump button lists all 14 sections in 44px rows, and choosing one scrolls to it', async ({ browser }) => {
        const { ctx, page } = await open(browser, width, theme, '/info')
        const titles = await page.locator('.ic-acc-title').allTextContents()
        expect(titles.length, 'positive control: the page has its 13 accordion sections').toBe(13)

        await page.locator('.ic-jump').click()
        const list = page.getByRole('listbox', { name: 'Jump to section' })
        await expect(list).toBeVisible()
        const rows = list.getByRole('option')
        // MUTATION: remove the `Screen stats` entry from JUMP_OPTIONS in InfoCentre.jsx (or any section) and this fails.
        await expect(rows).toHaveCount(14)
        expect((await rows.allTextContents()).map((t) => t.trim())).toEqual([...titles.map((t) => t.trim()), 'Screen stats'])

        // offsetHeight is layout height: the popover (768) opens with a scale-in transform, and a
        // bounding rect read mid-animation is a few percent short of the real row.
        const heights = await rows.evaluateAll((els) => els.map((el) => el.offsetHeight))
        // MUTATION: set `.menu-select-option { min-height: 36px }` for this list and this fails.
        expect(Math.min(...heights), 'every sheet row is a 44px target').toBeGreaterThanOrEqual(43.5)

        const lb = await list.boundingBox()
        const vp = page.viewportSize()
        expect(lb.x, 'the list is inside the viewport on the left').toBeGreaterThanOrEqual(-0.5)
        expect(lb.x + lb.width, 'the list is inside the viewport on the right').toBeLessThanOrEqual(vp.width + 0.5)
        if (width === 390) expect(lb.width, 'on a phone the list is a full-width bottom sheet').toBeGreaterThanOrEqual(vp.width - 1)
        await shot(page, `info-${width}-${theme}-sheet`)

        await list.getByRole('option', { name: 'Troubleshooting' }).click()
        await expect(list).toBeHidden()
        // MUTATION: make `jumpTo` do nothing (or skip `openSection`) and this fails: the
        // section stays closed and the page stays at the top.
        await expect(page.locator('#ic-head-troubleshooting')).toHaveAttribute('aria-expanded', 'true')
        await expect.poll(async () => (await page.locator('#troubleshooting').boundingBox()).y, {
          message: 'Troubleshooting is scrolled to the top of the screen',
        }).toBeLessThan(200)
        expect((await page.locator('#troubleshooting').boundingBox()).y).toBeGreaterThanOrEqual(0)
        await expect(page.locator('#ic-head-troubleshooting'), 'focus lands on the section heading').toBeFocused()
        expect(new URL(page.url()).hash).toBe('#troubleshooting')
        await shot(page, `info-${width}-${theme}-jumped`)

        // The last entry is not an accordion section but the stats panel.
        await page.locator('.ic-jump').click()
        await page.getByRole('listbox', { name: 'Jump to section' }).getByRole('option', { name: 'Screen stats' }).click()
        await expect.poll(async () => {
          const b = await page.locator('#screen-stats').boundingBox()
          return b.y < page.viewportSize().height && b.y + b.height > 0
        }, { message: 'the screen stats panel is on screen' }).toBe(true)
        await ctx.close()
      })

      test('Escape closes the sheet and focus returns to the jump button', async ({ browser }) => {
        const { ctx, page } = await open(browser, width, theme, '/info')
        const jump = page.locator('.ic-jump')
        await jump.click()
        const list = page.getByRole('listbox', { name: 'Jump to section' })
        await expect(list).toBeVisible()
        // MUTATION: in MenuSelect, stop focusing the trigger when the list closes and the
        // focus assertion fails; remove the Escape handler and the list stays open.
        await page.keyboard.press('Escape')
        await expect(list).toBeHidden()
        await expect(jump).toBeFocused()
        await ctx.close()
      })

      test('the accordion below still opens and closes by its headings', async ({ browser }) => {
        const { ctx, page } = await open(browser, width, theme, '/info')
        const head = page.locator('#ic-head-colour')
        await expect(head).toHaveAttribute('aria-expanded', 'false')
        await head.click()
        await expect(head).toHaveAttribute('aria-expanded', 'true')
        await head.click()
        await expect(head).toHaveAttribute('aria-expanded', 'false')
        await ctx.close()
      })
    })

    test.describe(`/discover/palettes at ${width}px ${theme}`, () => {
      test('the search field and its placeholder are whole, and the page does not overflow', async ({ browser }) => {
        const { ctx, page } = await open(browser, width, theme, '/discover/palettes')
        const search = page.locator('.pgl-toolbar .lbry-search')
        await expect(search).toBeVisible()
        const input = search.locator('input')
        // MUTATION: put the old long placeholder back in PaletteGallery.jsx and this fails.
        await expect(input).toHaveAttribute('placeholder', 'Search palettes')
        const fit = await input.evaluate((el) => {
          const cs = getComputedStyle(el)
          const c = document.createElement('canvas').getContext('2d')
          c.font = cs.font
          const text = c.measureText(el.getAttribute('placeholder')).width
          return { text, room: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) }
        })
        expect(fit.text, 'the placeholder fits inside the field').toBeLessThanOrEqual(fit.room + 0.5)

        const box = await search.boundingBox()
        expect(box.height, 'the search field is at least 44px tall').toBeGreaterThanOrEqual(43.5)
        if (width === 390) {
          const bar = await page.locator('.pgl-toolbar').boundingBox()
          // MUTATION: remove the `@media(max-width:640px)` grid block for `.pgl-toolbar` in
          // palette-gallery.css (the search shares its row with the buttons again) and this fails.
          expect(box.width, 'on a phone the search takes the full row of the toolbar').toBeGreaterThanOrEqual(bar.width - 24 - 2)

          const filters = await page.locator('.pgl-toolbar .lbry-filtersbtn').boundingBox()
          const quick = await page.locator('.pgl-toolbar .lbry-toolbar-quick').boundingBox()
          expect(filters.y, 'the filter button is on the row below the search').toBeGreaterThanOrEqual(box.y + box.height - 0.5)
          expect(Math.abs((filters.y + filters.height / 2) - (quick.y + quick.height / 2)), 'the filter button shares its row with the collection switch').toBeLessThan(6)
          expect(filters.x, 'the filter button sits beside the switch, to its right').toBeGreaterThanOrEqual(quick.x + quick.width - 1)
          expect(filters.width).toBeGreaterThanOrEqual(43.5)
          expect(filters.height).toBeGreaterThanOrEqual(43.5)
          const create = await page.getByRole('link', { name: 'Create a palette' }).boundingBox()
          expect(create.x + create.width, 'the create button stays inside the toolbar').toBeLessThanOrEqual(bar.x + bar.width + 0.5)
          // The collection switch shows all three options without scrolling.
          const scrolls = await page.locator('.pgl-toolbar .lbry-toolbar-quick').evaluate((el) => el.scrollWidth - el.clientWidth)
          expect(scrolls, 'the collection switch is not cut off').toBeLessThanOrEqual(6)
        }

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, 'no horizontal page overflow').toBeLessThanOrEqual(0)
        await shot(page, `palettes-${width}-${theme}-top`)
        await ctx.close()
      })

      // V3: a browsing palette tile has no action row. The four actions live in the preview
      // dialog; the tile's own controls are the stretched `.vpt-open` button ("Preview {name}")
      // and the `.vpt-like` heart above it ("Like {name}"). On touch the heart is a 44px circle.
      test('the tile controls sit inside the tile as 44px targets that keep their names', async ({ browser }) => {
        const { ctx, page } = await open(browser, width, theme, '/discover/palettes')
        const tiles = page.locator('.vpt:has(.vpt-open):not(.geg-fade *)')
        // POSITIVE CONTROL: free palettes carry both controls, so "inside the tile" below is about real buttons.
        await expect(tiles.first()).toBeVisible()
        expect(await tiles.count()).toBeGreaterThan(0)

        for (let i = 0; i < await tiles.count(); i += 1) {
          const tile = tiles.nth(i)
          await tile.scrollIntoViewIfNeeded()
          const m = await tile.evaluate((el) => {
            const t = el.getBoundingClientRect()
            const read = (sel, x, y) => {
              const btn = el.querySelector(sel)
              const b = btn.getBoundingClientRect()
              const hit = document.elementFromPoint(x(b), y(b))
              return {
                name: btn.getAttribute('aria-label') || '',
                w: b.width, h: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom,
                hittable: !!hit && (hit === btn || btn.contains(hit)),
              }
            }
            return {
              tile: { left: t.left, right: t.right, top: t.top, bottom: t.bottom },
              like: read('.vpt-like', (b) => b.x + b.width / 2, (b) => b.y + b.height / 2),
              // The open button is stretched over the tile; probe the foot, away from the heart.
              open: read('.vpt-open', (b) => b.x + b.width / 2, (b) => b.bottom - 12),
            }
          })
          // MUTATION: shrink `.vpt-like` under `@media(pointer:coarse)` in library-v3.css to 36px and this fails.
          expect(m.like.w, 'Like is 44px wide').toBeGreaterThanOrEqual(43.5)
          expect(m.like.h, 'Like is 44px tall').toBeGreaterThanOrEqual(43.5)
          expect(m.like.left, 'Like starts inside the tile').toBeGreaterThanOrEqual(m.tile.left - 0.5)
          expect(m.like.right, 'Like ends inside the tile').toBeLessThanOrEqual(m.tile.right + 0.5)
          expect(m.like.top, 'Like starts inside the tile').toBeGreaterThanOrEqual(m.tile.top - 0.5)
          expect(m.like.bottom, 'Like ends inside the tile').toBeLessThanOrEqual(m.tile.bottom + 0.5)
          // MUTATION: remove the `aria-label` from `.vpt-like` or `.vpt-open` in VerticalPanelTile.jsx
          // (neither has visible text) and this fails.
          expect(m.like.name, 'Like keeps its accessible name').toMatch(/^(Like|Unlike) /)
          expect(m.open.name, 'the open button keeps its accessible name').toMatch(/^Preview /)
          expect(m.like.hittable, 'Like is not covered by anything').toBe(true)
          // MUTATION: drop `.vpt-like{z-index:2}` in library-v3.css and the open button covers the heart: Like fails.
          // The open button must itself be reachable, and cover the whole tile (the whole panel is one target).
          expect(m.open.hittable, 'the open button is not covered by anything').toBe(true)
          expect(m.open.w, 'the open button spans the tile').toBeGreaterThanOrEqual(m.tile.right - m.tile.left - 1)
          expect(m.open.h, 'the open button spans the tile').toBeGreaterThanOrEqual(m.tile.bottom - m.tile.top - 1)
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, 'no horizontal page overflow').toBeLessThanOrEqual(0)
        await tiles.first().scrollIntoViewIfNeeded()
        await shot(page, `palettes-${width}-${theme}-cards`)
        await ctx.close()
      })
    })
  }
}

test.describe('/info on a wide screen', () => {
  test('the sticky rail is back, with 14px rows a pointer can hit, and the jump button is gone', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1280, 'light', '/info', { touch: false })
    await expect(page.locator('.ic-toc')).toBeVisible()
    await expect(page.locator('.ic-jump')).toBeHidden()
    const heights = await page.locator('.ic-toc .ic-rail-row').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
    expect(heights.length, 'the rail lists 14 links').toBe(14)
    // The V3 rail rows are 14px/1.45 text with 6px above and below (about 32px); a coarse
    // pointer gets 44px from `@media (pointer: coarse)` in info.css. This run has no touch.
    // MUTATION: drop the `padding: 6px 0 6px 12px` on `.ic-rail-row` in info.css and this fails.
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(31.5)
    await ctx.close()
  })
})
