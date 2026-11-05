// /info and /discover/palettes on a phone and a tablet (390 and 768, touch,
// light and dark).
//
// Every assertion is geometry read off the rendered page, because both defects
// this holds were invisible to the DOM: /info's fourteen index links wrapped to
// six rows and pushed the content 480px down, and the palette cards' action
// chips ran past the card's right edge while still being "present and visible".
// Touch metrics (isMobile + hasTouch) are what make `hover: none` true, which is
// the state the card actions are laid out for; a resized desktop window is not.
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

      test('the card actions sit inside the card as 44px icon buttons that keep their names', async ({ browser }) => {
        const { ctx, page } = await open(browser, width, theme, '/discover/palettes')
        const cards = page.locator('.pgal-card:has(.pgal-act)')
        // POSITIVE CONTROL: free palettes carry the four actions, so "inside the card" below is about real buttons.
        expect(await cards.count()).toBeGreaterThan(0)
        const NAMES = [/project/i, /Gradient/, /CSS/, /hex codes/i]

        for (let i = 0; i < await cards.count(); i += 1) {
          const card = cards.nth(i)
          await card.scrollIntoViewIfNeeded()
          const r = await card.evaluate((el) => {
            const c = el.getBoundingClientRect()
            const row = el.querySelector('.lbry-card-actions')
            const rowRect = row.getBoundingClientRect()
            const acts = [...row.querySelectorAll('.pgal-act')].map((a) => {
              const b = a.getBoundingClientRect()
              const cx = b.x + b.width / 2
              const cy = b.y + b.height / 2
              const hit = document.elementFromPoint(cx, cy)
              return {
                name: a.getAttribute('aria-label') || '', left: b.left, right: b.right, w: b.width, h: b.height,
                label: getComputedStyle(a.querySelector('span')).display,
                hittable: !!hit && (hit === a || a.contains(hit)),
              }
            })
            return { left: c.left, right: c.right, rowScroll: row.scrollWidth - row.clientWidth, rowRight: rowRect.right, acts }
          })
          expect(r.acts, 'four actions per free card').toHaveLength(4)
          // MUTATION: delete the `@media(hover:none),(max-width:1000px)` block in palette-gallery.css
          // (labelled pills again, scrolling off the card edge) and the inside/scroll checks fail.
          expect(r.rowScroll, 'the action row does not scroll sideways').toBeLessThanOrEqual(1)
          r.acts.forEach((a, n) => {
            expect(a.left, `action ${n} starts inside the card`).toBeGreaterThanOrEqual(r.left - 0.5)
            expect(a.right, `action ${n} ends inside the card`).toBeLessThanOrEqual(r.right + 0.5)
            // MUTATION: lower `.pgal-act` `min-width`/`min-height` under `@media(hover:none)` to 36px and this fails.
            expect(a.w, `action ${n} is 44px wide`).toBeGreaterThanOrEqual(43.5)
            expect(a.h, `action ${n} is 44px tall`).toBeGreaterThanOrEqual(43.5)
            // MUTATION: remove the `aria-label` from one action in PaletteGalleryGrid.jsx: with the
            // visible word gone it has no name, and this fails.
            expect(a.name, `action ${n} keeps its accessible name`).toMatch(NAMES[n])
            expect(a.label, `action ${n} shows an icon, not a clipped word`).toBe('none')
            expect(a.hittable, `action ${n} is not covered by anything`).toBe(true)
          })
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, 'no horizontal page overflow').toBeLessThanOrEqual(0)
        await cards.first().scrollIntoViewIfNeeded()
        await shot(page, `palettes-${width}-${theme}-cards`)
        await ctx.close()
      })
    })
  }
}

test.describe('/info on a wide screen', () => {
  test('the sticky rail is back, with 44px rows, and the jump button is gone', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1280, 'light', '/info', { touch: false })
    await expect(page.locator('.ic-toc')).toBeVisible()
    await expect(page.locator('.ic-jump')).toBeHidden()
    const heights = await page.locator('.ic-toc .cpg-rail-row').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
    expect(heights.length, 'the rail lists 14 links').toBe(14)
    // MUTATION: drop `.ic-wrap .ic-toc .cpg-rail-row { min-height: 44px }` in info.css and this fails (the rows are 36px).
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(43.5)
    await ctx.close()
  })
})
