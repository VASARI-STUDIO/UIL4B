// THE HOMEPAGE'S EXAMPLES SECTION (#examples), AS A VISITOR USES IT.
//
// A picker of eight page kinds over two rows that show the picked kind in all ten export
// themes, and a viewer that opens one theme's pages full size: five real export pages of
// that theme, the one clicked first, with next and previous, arrow keys, a swipe, and
// "n of 5".
//
//   1. THE PICKER'S KEYBOARD. A tablist with roving tabindex: Left and Right wrap, Home and
//      End jump, exactly one tab is in the tab order and it is the selected one, focus
//      follows the selection, and the live line says what is now showing.
//   2. A PICK CHANGES THE PAGES AND NOTHING ELSE. Only the picked kind's ten images are in
//      the DOM once the swap has settled; the section and the panel are exactly as tall after
//      a pick (at 1440 and 390). In the frame after the swap each tile holds the old page
//      under the new one, the new one is running an opacity-only animation, and the tiles
//      start a beat apart. Then the old pages go (one <img> per tile).
//   3. A SLOW PAGE DOESN'T HOLD THE PICK HOSTAGE. One thumbnail is held back for three
//      seconds. Nothing swaps while the pick is waiting (before 600ms); once 600ms have
//      passed the nine ready pages swap, the slow tile keeps its old page, and it swaps
//      by itself when its own new page arrives.
//   4. THE VIEWER. Enter or Space on a tile opens a dialog (role, aria-modal, named by its
//      theme title) that holds that theme's large page for the picked kind, then four more
//      pages of the same theme. Focus moves into it and stays in it for Tab and Shift+Tab.
//      Left and Right step through the five pages, wrapping, and "2 of 5" follows. Pages
//      other than the one in view are not fetched until the viewer opens. Esc, the close
//      button and a click on the scrim each close it, and focus returns to the same tile.
//      While it is open the page behind is locked on <html> (never on body, no
//      scrollbar-gutter) and inert; closing releases both.
//   5. THE PHONE SHEET (390 and 320, touch). The dialog is the whole screen, Previous, Close
//      and Next sit in one bottom bar of controls at least 44px square, and "n of 5" is at
//      the top right. A tap on the sheet's empty space does not close it. A swipe steps.
//      Nothing scrolls sideways.
//   6. MOTION. The viewer enters with a fade plus a scale from .96 over 200ms. Tiles lift
//      1.02 on a pointer hover (transform only, with a shadow and hairline that fade in),
//      rise in as the section scrolls into view, and crossfade on a pick. With reduced
//      motion there is no lift, no rise and no scale; the viewer and the pick still fade,
//      for 120ms. Read from the computed styles of the live elements, because the
//      site-wide reduced-motion backstop cuts every duration to a hundredth of a millisecond
//      unless the section's own rule outranks it. Nothing in the section transitions `all`.
//   7. THE FOOTNOTE ends with the Free/Pro split.
//
// HOW TO SEE EACH FAIL (src/ unless named; mutate, run the one test, put it back):
//   components/home/HomeShowcase.jsx  roving `tabIndex` set to 0 on every tab      -> 1 "roving tabindex"
//   components/home/HomeShowcase.jsx  Home/End dropped from onTabKeyDown           -> 1 "Home and End"
//   components/home/HomeShowcase.jsx  `shown` seeded with two kinds / old tile kept -> 2 "only the picked kind"
//   components/home/HomeShowcase.jsx  drop the `hsc-in` className on the new image  -> 2 "crossfade"
//   components/home/HomeShowcase.jsx  never clear `leaving` (old page stays)        -> 2 "only the picked kind"
//   styles/pages/home-showcase.css    give `.hsc-panel` a min-height that moves      -> 2 "section height"
//   components/home/HomeShowcase.jsx  SLOW_SWAP_MS to 5000 (waits for every page)   -> 3 "slow page"
//   components/home/HomeShowcase.jsx  swap every tile at the timeout (not just ready) -> 3 "slow tile keeps"
//   components/home/ShowcaseViewer.jsx drop useModalDialog(requestClose)            -> 4 trap, Esc, focus return, lock
//   components/home/ShowcaseViewer.jsx drop the ArrowLeft/ArrowRight branch         -> 4 "arrow keys"
//   components/home/showcaseImages.js  VIEWER_PAGE_COUNT to 1                       -> 4 "five pages", 5 "swipe"
//   components/home/ShowcaseViewer.jsx drop `useInertBehind(true)`                  -> 4 "the page behind is inert"
//   components/home/ShowcaseViewer.jsx drop the `data-hsv-close` attributes         -> 4 "a click on the scrim"
//   components/home/ShowcaseViewer.jsx drop onTouchStart/onTouchEnd on the stage    -> 5 "swipe"
//   styles/pages/home-showcase.css    `.hsv-btn` height 40px                        -> 5 "44px controls"
//   styles/pages/home-showcase.css    drop the max-width:767px sheet block          -> 5 "full-screen sheet"
//   styles/pages/home-showcase.css    delete the viewer's reduced-motion overrides  -> 6 "reduced motion"
//   styles/pages/home-showcase.css    delete the `.hsc-open` reduced-motion rules   -> 6 "no lift under reduced motion"
//   styles/pages/home-showcase.css    delete the `.hsc .hsc-in` reduced-motion rules -> 6 "pick still fades"
//   styles/pages/home-showcase.css    `.hsc-open:hover` scale 1.05 or `transition: all` -> 6 "lifts"
//   components/home/HomeShowcase.jsx  skip the prefersReducedMotion() guard in the reveal -> 6 "no rise"
//   components/home/HomeShowcase.jsx  drop the `--reveal-delay` style               -> 6 "rise in as it scrolls"
//   components/home/HomeShowcase.jsx  drop the `uiKitNote` sentence                 -> 7 footnote
import { test, expect } from './base.js'
import { go, homeSectionsLoaded, restingScrollY, watch } from './helpers.js'

const PERSONA = 'a visitor comparing the export themes on the homepage'

// The eight tabs in order, the label each shows, and the word the live line uses for it.
const KINDS = ['Cover', 'Logo', 'Colour', 'Type', 'Signage', 'Social', 'Buttons', 'Screen']
const DEFAULT_TAB = 2 // Colour
// The kind id each tab shows in the page file names (/home-showcase/<theme>/<kind>-t.avif).
const KIND_FILE = {
  Cover: 'guide-cover', Logo: 'guide-logo', Colour: 'guide-palette', Type: 'guide-typefaces',
  Signage: 'guide-signage', Social: 'guide-social', Buttons: 'kit-buttons', Screen: 'kit-screen-light',
}
const TOTAL = 10
// The viewer steps through this many pages of one theme.
const PAGES = 5
/** The kinds the viewer shows for a clicked kind: that one, then the next four in picker order. */
const viewerKinds = (kind) => Array.from({ length: PAGES }, (_, i) => KINDS[(KINDS.indexOf(kind) + i) % KINDS.length])
const largeSrc = (themeDir, kind) => `/home-showcase/${themeDir}/${KIND_FILE[kind]}-l.webp`

async function open(browser, { width, height = 900, touch = false, reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  })
  const page = await ctx.newPage()
  watch(page, PERSONA)
  return { ctx, page }
}

const tablist = (page) => page.getByRole('tablist', { name: 'Choose a page to compare' })
const tabs = (page) => tablist(page).getByRole('tab')
const live = (page) => page.locator('#examples [role="status"]')
const tile = (page, i) => page.locator(`#hsc-tile-${i}`)
const dialog = (page) => page.getByRole('dialog')
const count = (page) => dialog(page).locator('.hsv-count')

/** Two frames, so a change the last action started has been painted. */
const twoFrames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

/** The file name stem of every tile's image, in order, read from the src attribute (lazy images have no currentSrc yet). */
const tileKinds = (page) => page.locator('#hsc-panel img').evaluateAll((imgs) => imgs.map((img) => /\/([^/]+)-t\.webp$/.exec(img.getAttribute('src'))?.[1] ?? null))

async function selectedTab(page) {
  return tabs(page).evaluateAll((els) => ({
    selected: els.map((t, i) => (t.getAttribute('aria-selected') === 'true' ? i : -1)).filter((i) => i > -1),
    tabbable: els.map((t, i) => (t.tabIndex === 0 ? i : -1)).filter((i) => i > -1),
    focused: els.findIndex((t) => t === document.activeElement),
  }))
}

async function expectTab(page, i, where) {
  const s = await selectedTab(page)
  expect(s.selected, `${where}: the selected tab`).toEqual([i])
  expect(s.tabbable, `${where}: only the selected tab is in the tab order`).toEqual([i])
  expect(s.focused, `${where}: focus is on the selected tab`).toBe(i)
}

/** Come back when every tile shows `kind` (the swap waits for the images, so poll). */
const waitAllShow = (page, kind) => expect.poll(
  () => tileKinds(page),
  { message: `the ten tiles never all showed ${KIND_FILE[kind]}`, timeout: 10000 },
).toEqual(Array(TOTAL).fill(KIND_FILE[kind]))

async function openSection(browser, opts) {
  const { ctx, page } = await open(browser, opts)
  await go(page, '/')
  // The section sits below the first screen: it mounts on the first input, or as the viewport nears it.
  await homeSectionsLoaded(page)
  await expect(tabs(page)).toHaveCount(KINDS.length)
  await page.locator('#examples').scrollIntoViewIfNeeded()
  // The tiles rise in as the section arrives; wait for them to be at rest before anything is measured.
  await expect(page.locator('#examples .hsc'), 'the scroll-in reveal never finished').toHaveAttribute('data-hsc-reveal', /^(off|done)$/)
  return { ctx, page }
}

const SIZES = [
  { width: 1440, height: 900, touch: false },
  { width: 390, height: 844, touch: true },
]

// ── 1. the picker's keyboard ───────────────────────────────────────────────────

for (const { width, height, touch } of SIZES) {
  test.describe(`the picker at ${width}px`, () => {
    test('is a tablist of eight with one tab in the tab order, and Colour is picked on load', async ({ browser }) => {
      const { ctx, page } = await openSection(browser, { width, height, touch })
      const labels = await tabs(page).allTextContents()
      expect(labels, 'the eight kinds, in order').toEqual(KINDS)
      const s = await selectedTab(page)
      expect(s.selected, 'Colour is selected on load').toEqual([DEFAULT_TAB])
      expect(s.tabbable, 'only the selected tab is in the tab order (roving tabindex)').toEqual([DEFAULT_TAB])
      await ctx.close()
    })

    test('arrows wrap round, Home and End jump, and the live line says what is showing', async ({ browser }) => {
      const { ctx, page } = await openSection(browser, { width, height, touch })
      await tabs(page).nth(DEFAULT_TAB).focus()

      await page.keyboard.press('ArrowRight')
      await expectTab(page, 3, 'Right from Colour')
      await expect(live(page), 'the live line names the new page').toHaveText('Showing the type page in all ten themes.')

      await page.keyboard.press('Home')
      await expectTab(page, 0, 'Home')
      await expect(live(page)).toHaveText('Showing the cover page in all ten themes.')

      await page.keyboard.press('ArrowLeft')
      await expectTab(page, 7, 'Left from the first wraps to the last')
      await expect(live(page)).toHaveText('Showing the screen page in all ten themes.')

      await page.keyboard.press('ArrowRight')
      await expectTab(page, 0, 'Right from the last wraps to the first')

      await page.keyboard.press('End')
      await expectTab(page, 7, 'End')

      // Tab leaves the tablist for the page behind it (the tabs after the selected one are skipped).
      await page.keyboard.press('Tab')
      expect((await selectedTab(page)).focused, 'Tab leaves the tablist').toBe(-1)
      await ctx.close()
    })
  })
}

// ── 2. a pick changes the pages and nothing else ───────────────────────────────

for (const { width, height, touch } of SIZES) {
  test.describe(`a pick at ${width}px`, () => {
    test('puts only the picked kind in the DOM, and the section is exactly as tall', async ({ browser }) => {
      const { ctx, page } = await openSection(browser, { width, height, touch })
      await waitAllShow(page, 'Colour')
      // The sections after this one mount as the visitor nears them, and a late one swaps its
      // stand-in for its real height; the page height is only comparable once they are all in.
      await homeSectionsLoaded(page)
      await page.locator('#examples').scrollIntoViewIfNeeded()
      await twoFrames(page)
      const measure = () => page.evaluate(() => ({
        section: document.getElementById('examples').offsetHeight,
        panel: document.getElementById('hsc-panel').offsetHeight,
        images: document.querySelectorAll('#examples img').length,
        doc: document.documentElement.scrollHeight,
      }))
      const before = await measure()
      expect(before.images, 'one image per theme').toBe(TOTAL)

      for (const kind of ['Logo', 'Cover', 'Screen', 'Colour']) {
        await tabs(page).filter({ hasText: new RegExp(`^${kind}$`) }).click()
        await waitAllShow(page, kind)
        await twoFrames(page)
        const after = await measure()
        expect(after.images, `after ${kind}: still one image per theme, so only that kind is in the DOM`).toBe(TOTAL)
        expect(after.section, `after ${kind}: the section height`).toBe(before.section)
        expect(after.panel, `after ${kind}: the panel height`).toBe(before.panel)
        expect(after.doc, `after ${kind}: the page height`).toBe(before.doc)
      }
      await ctx.close()
    })

    test('crossfades: each tile holds the old page under the new one, an opacity-only fade a beat apart, then the old page goes', async ({ browser }) => {
      const { ctx, page } = await openSection(browser, { width, height, touch })
      await waitAllShow(page, 'Colour')
      // Arm a sampler that reads the tiles in the frame after React changes the first image source.
      await page.evaluate(() => {
        window.__hscFrame = new Promise((resolve) => {
          const panel = document.getElementById('hsc-panel')
          const mo = new MutationObserver(() => {
            mo.disconnect()
            requestAnimationFrame(() => {
              const fades = document.getAnimations().filter((a) => a.animationName === 'hsc-in' && panel.contains(a.effect.target))
              resolve({
                perTile: [...panel.querySelectorAll('li')].map((li) => li.querySelectorAll('img').length),
                underHidden: [...panel.querySelectorAll('.hsc-out')].every((img) => img.closest('picture').getAttribute('aria-hidden') === 'true' && img.alt === ''),
                animatedTiles: fades.map((a) => a.effect.target.closest('li').querySelectorAll('img').length),
                // Properties the fade touches: opacity and nothing else.
                properties: [...new Set(fades.flatMap((a) => a.effect.getKeyframes().flatMap((k) => Object.keys(k))))]
                  .filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)),
                delays: fades.map((a) => a.effect.getTiming().delay),
                seconds: fades.map((a) => a.effect.getTiming().duration / 1000),
                tilesAtRestOpacity: [...panel.querySelectorAll('li')].map((li) => getComputedStyle(li).opacity),
              })
            })
          })
          mo.observe(panel, { subtree: true, attributes: true, childList: true, attributeFilter: ['src', 'srcset'] })
        })
      })
      await tabs(page).filter({ hasText: /^Logo$/ }).click()
      const frame = await page.evaluate(() => window.__hscFrame)
      expect(frame.perTile, 'the old page sits under the new one in every tile').toEqual(Array(TOTAL).fill(2))
      expect(frame.underHidden, 'the old page is decoration: aria-hidden, no alt').toBe(true)
      expect(frame.animatedTiles.length, 'every tile fades its new page in').toBe(TOTAL)
      expect(frame.properties, 'the fade is opacity and nothing else').toEqual(['opacity'])
      expect(frame.seconds.every((s) => s >= 0.18 && s <= 0.32), `each fade runs 180 to 320ms (read ${frame.seconds})`).toBe(true)
      expect(frame.delays[0], 'the first tile starts at once').toBe(0)
      expect(frame.delays, 'and each tile starts later than the one before').toEqual([...frame.delays].sort((a, b) => a - b))
      expect(new Set(frame.delays).size, 'with a different beat for every tile').toBe(TOTAL)
      expect(frame.tilesAtRestOpacity, 'the tiles themselves never fade').toEqual(Array(TOTAL).fill('1'))

      await waitAllShow(page, 'Logo')
      expect(await page.locator('#examples .hsc-out, #examples .hsc-in').count(), 'the old pages and the fade are gone once it settles').toBe(0)
      await ctx.close()
    })
  })
}

// ── 3. a slow page ─────────────────────────────────────────────────────────────

test.describe('a slow page', () => {
  test('holds the pick for 600ms, then the others swap and the slow tile follows when it arrives', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440 })
    // The Standards (4th) theme's Logo thumbnail is held back for three seconds.
    await page.route('**/home-showcase/04-standards/guide-logo-t.*', async (route) => {
      await new Promise((r) => setTimeout(r, 3000))
      await route.continue()
    })
    await go(page, '/')
    await homeSectionsLoaded(page)
    await expect(tabs(page)).toHaveCount(KINDS.length)
    await page.locator('#examples').scrollIntoViewIfNeeded()
    await waitAllShow(page, 'Colour')

    await tabs(page).filter({ hasText: /^Logo$/ }).click()
    await page.waitForTimeout(250)
    expect(await tileKinds(page), 'while it waits (under 600ms) nothing has swapped').toEqual(Array(TOTAL).fill('guide-palette'))

    // At 600ms the nine ready pages swap; the slow one keeps its old page.
    const expectedMid = Array.from({ length: TOTAL }, (_, i) => (i === 3 ? 'guide-palette' : 'guide-logo'))
    await expect.poll(() => tileKinds(page), { message: 'the nine ready pages swap without the slow one', timeout: 2000 }).toEqual(expectedMid)
    await expect(tile(page, 3).locator('img'), 'the slow tile still has a picture, not a failure frame').toBeVisible()

    // And it follows by itself once its page has arrived.
    await waitAllShow(page, 'Logo')
    await ctx.close()
  })
})

// ── 4. the viewer on a desktop ─────────────────────────────────────────────────

async function openViewer(page, i = 2, key = 'Enter') {
  await tile(page, i).focus()
  await page.keyboard.press(key)
  await expect(dialog(page)).toBeVisible()
}

const focusInside = (page) => dialog(page).evaluate((d) => d.contains(document.activeElement))

test.describe('the page viewer at 1440', () => {
  test('opens from a tile with Enter or with Space, as a modal dialog named by its theme', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    for (const key of ['Enter', 'Space']) {
      await openViewer(page, 2, key)
      await expect(dialog(page), `${key}: aria-modal`).toHaveAttribute('aria-modal', 'true')
      await expect(dialog(page), `${key}: named by the theme title`).toHaveAccessibleName(/^Broadsheet/)
      await expect(count(page), `${key}: the first of five pages`).toHaveText(`1 of ${PAGES}`)
      expect(await focusInside(page), `${key}: focus moved into the dialog`).toBe(true)
      await page.keyboard.press('Escape')
      await expect(dialog(page)).toHaveCount(0)
    }
    await ctx.close()
  })

  test('opens from a mouse click, and shows the clicked theme\'s picked kind at the large size', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    await tabs(page).filter({ hasText: /^Logo$/ }).click()
    await waitAllShow(page, 'Logo')
    await tile(page, 3).click()
    await expect(dialog(page)).toBeVisible()
    await expect(dialog(page)).toHaveAccessibleName(/^Standards/)
    const img = dialog(page).locator('.hsv-top')
    await expect(img).toHaveAttribute('src', largeSrc('04-standards', 'Logo'))
    await expect(img, 'alt names brand, kind, theme and place').toHaveAttribute('alt', new RegExp(`^Two Shores logo page, Standards theme, 1 of ${PAGES}$`))
    // The page shows at up to 80vh (900 * .8 = 720).
    await expect.poll(async () => Math.round((await img.boundingBox()).height), { message: 'the page is 80vh tall' }).toBe(720)
    await ctx.close()
  })

  test('traps focus: Tab and Shift+Tab never leave the dialog', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    await openViewer(page)
    const seen = []
    for (let i = 0; i < 7; i += 1) {
      await page.keyboard.press('Tab')
      expect(await focusInside(page), `Tab ${i + 1} stays inside`).toBe(true)
      seen.push(await page.evaluate(() => document.activeElement.getAttribute('aria-label')))
    }
    expect(seen.slice(0, 3), 'Tab cycles Previous, Next, Close').toEqual(['Previous page', 'Next page', 'Close'])
    expect(seen[3], 'and wraps to Previous').toBe('Previous page')
    for (let i = 0; i < 7; i += 1) {
      await page.keyboard.press('Shift+Tab')
      expect(await focusInside(page), `Shift+Tab ${i + 1} stays inside`).toBe(true)
    }
    await ctx.close()
  })

  test('opens a theme\'s own five pages: the picked kind first, then the next four, all from the same theme', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    const kinds = viewerKinds('Colour')
    expect(kinds, 'Colour, then the four after it in picker order').toEqual(['Colour', 'Type', 'Signage', 'Social', 'Buttons'])
    await openViewer(page, 2)
    const top = dialog(page).locator('.hsv-top')
    for (const [i, kind] of kinds.entries()) {
      await expect(count(page)).toHaveText(`${i + 1} of ${PAGES}`)
      await expect(top, `page ${i + 1} is the ${kind} page of this theme`).toHaveAttribute('src', largeSrc('03-broadsheet', kind))
      await expect(dialog(page).locator('.hsv-kind'), 'the page says which kind it is').toHaveText(`${kind} page`)
      await expect(dialog(page), 'the title stays the theme').toHaveAccessibleName(/^Broadsheet/)
      await page.keyboard.press('ArrowRight')
    }
    await expect(count(page), 'a fifth step wraps to the first').toHaveText(`1 of ${PAGES}`)
    await ctx.close()
  })

  test('fetches the extra pages only once the viewer opens, and only the neighbours of the one in view', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    const large = []
    page.on('request', (req) => {
      const m = /\/home-showcase\/([^/]+)\/([^/]+)-l\.(?:avif|webp)$/.exec(new URL(req.url()).pathname)
      if (m) large.push(`${m[1]}/${m[2]}`)
    })
    await page.waitForTimeout(500)
    expect(large, 'no large page is fetched while the viewer is closed').toEqual([])
    await openViewer(page, 2)
    await expect.poll(() => new Set(large).size, { message: 'the page in view and its two neighbours', timeout: 8000 }).toBe(3)
    expect([...new Set(large)].sort(), 'Colour, with Type after it and Buttons before it').toEqual([
      '03-broadsheet/guide-palette', '03-broadsheet/guide-typefaces', '03-broadsheet/kit-buttons',
    ])
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => new Set(large).has('03-broadsheet/guide-signage'), { message: 'stepping on warms the next one', timeout: 8000 }).toBe(true)
    expect([...large].every((f) => f.startsWith('03-broadsheet/')), 'nothing is fetched for another theme').toBe(true)
    await ctx.close()
  })

  test('Left and Right step through the pages, wrapping, and "n of 5" follows', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    await openViewer(page, 2)
    await page.keyboard.press('ArrowRight')
    await expect(count(page)).toHaveText(`2 of ${PAGES}`)
    await expect(dialog(page), 'the title stays the theme').toHaveAccessibleName(/^Broadsheet/)
    await page.keyboard.press('ArrowLeft')
    await expect(count(page)).toHaveText(`1 of ${PAGES}`)
    await page.keyboard.press('ArrowLeft')
    await expect(count(page), 'Left from the first wraps to the last').toHaveText(`${PAGES} of ${PAGES}`)
    await expect(dialog(page).locator('.hsv-kind')).toHaveText('Buttons page')
    await page.keyboard.press('ArrowRight')
    await expect(count(page), 'Right from the last wraps to the first').toHaveText(`1 of ${PAGES}`)

    // The buttons do the same, and the page that settles is the one named.
    await dialog(page).getByRole('button', { name: 'Next page' }).click()
    await expect(count(page)).toHaveText(`2 of ${PAGES}`)
    await dialog(page).getByRole('button', { name: 'Previous page' }).click()
    await expect(count(page)).toHaveText(`1 of ${PAGES}`)
    await expect(dialog(page).locator('.hsv-top')).toHaveAttribute('src', largeSrc('03-broadsheet', 'Colour'))
    // The viewer's own status line: the dialog is a portal outside #examples, so `live` would find the picker's.
    await expect(dialog(page).getByRole('status'), 'a step is announced with its page and place').toHaveText(`Colour page, Broadsheet. 1 of ${PAGES}.`)
    await ctx.close()
  })

  test('a step slides the new page in from the side it came from, then the old page goes', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    await openViewer(page, 2)
    // Let the neighbours finish loading, so the step lands on a cached page: the case where the new page
    // is complete before it is painted, and must still be painted waiting before it moves.
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    // Reads the stage once per animation frame, so only what the visitor could have seen is
    // counted. (A MutationObserver also sees a class that was set and replaced inside one
    // frame, which is never painted and so never slides.) The neighbours are already warmed,
    // so this is the cached-page path: the one that must still start from the waiting pose.
    // The sampler is running before the key is pressed, so the step's first frame is in it.
    const record = async () => {
      await page.evaluate(() => new Promise((ready) => {
        const stage = document.querySelector('.hsv-stage')
        const seen = []
        let started = 0
        window.__hsvRecord = new Promise((resolve) => {
          const sample = () => {
            const top = stage.querySelector('.hsv-top')
            if (top) seen.push({ cls: top.className, transform: getComputedStyle(top).transform, opacity: getComputedStyle(top).opacity, under: !!stage.querySelector('.hsv-under') })
            if (performance.now() - started < 900) requestAnimationFrame(sample)
            else resolve({ seen, under: !!stage.querySelector('.hsv-under') })
          }
          requestAnimationFrame(() => { started = performance.now(); sample(); ready() })
        })
      }))
      return () => page.evaluate(() => window.__hsvRecord)
    }
    const forward = await record()
    await page.keyboard.press('ArrowRight')
    const fwd = await forward()
    const waiting = fwd.seen.find((s) => s.cls.includes('is-wait'))
    expect(waiting, 'the new page waits off to the right, transparent, over the page it replaces').toMatchObject({ transform: 'matrix(1, 0, 0, 1, 16, 0)', opacity: '0', under: true })
    expect(fwd.seen.some((s) => s.cls.includes('is-fade')), 'then moves home').toBe(true)
    expect(fwd.under, 'and the old page is gone once it has').toBe(false)

    const back = await record()
    await page.keyboard.press('ArrowLeft')
    const bwd = await back()
    expect(bwd.seen.find((s) => s.cls.includes('is-wait')), 'a step back comes in from the left').toMatchObject({ transform: 'matrix(1, 0, 0, 1, -16, 0)' })
    await ctx.close()
  })

  test('Esc, the close button and a click on the scrim each close it and return focus to the same tile', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    const closers = {
      Escape: () => page.keyboard.press('Escape'),
      'the close button': () => dialog(page).getByRole('button', { name: 'Close' }).click(),
      'a click on the scrim': () => page.mouse.click(12, 450),
    }
    for (const [name, close] of Object.entries(closers)) {
      await openViewer(page, 5)
      // Step away first: focus returns to the tile that opened it, not to the theme last viewed.
      await page.keyboard.press('ArrowRight')
      await close()
      await expect(dialog(page), `${name} closes it`).toHaveCount(0)
      await expect(tile(page, 5), `${name}: focus is back on the tile that opened it`).toBeFocused()
    }
    await ctx.close()
  })

  test('a click on the page itself does not close it', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    await openViewer(page)
    await dialog(page).locator('.hsv-top').click()
    await page.waitForTimeout(400)
    await expect(dialog(page)).toBeVisible()
    await ctx.close()
  })

  test('locks the page on <html> while open, holds it still, makes the page behind inert, and lets go on close', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    const y0 = await restingScrollY(page, 'the page before the viewer opens')
    await openViewer(page)
    const lock = await page.evaluate(() => ({
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
      gutter: getComputedStyle(document.documentElement).scrollbarGutter,
      inert: document.getElementById('main').hasAttribute('inert'),
      inDialog: document.querySelector('[role="dialog"]').closest('#main'),
    }))
    expect(lock.html, 'the lock is on <html>').toBe('hidden')
    expect(lock.body, 'and never on <body>').toBe('')
    expect(lock.gutter, 'scrollbar-gutter is not set').toBe('auto')
    expect(lock.inert, 'the page behind is inert').toBe(true)
    expect(lock.inDialog, 'the dialog is outside the inert page').toBeNull()
    await page.mouse.move(700, 300)
    await page.mouse.wheel(0, 700)
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => window.scrollY), 'the page behind did not scroll').toBe(y0)

    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    const after = await page.evaluate(() => ({
      html: document.documentElement.style.overflow,
      inert: document.getElementById('main').hasAttribute('inert'),
      scrollY: window.scrollY,
    }))
    expect(after.html, 'the lock is released').toBe('')
    expect(after.inert, 'and the page is live again').toBe(false)
    expect(after.scrollY, 'in the same place').toBe(y0)
    await ctx.close()
  })
})

// ── 5. the phone sheet ─────────────────────────────────────────────────────────

/** A finger drag across the page, as real touch events (a synthetic one would skip the browser's own gesture handling). */
async function swipe(page, from, to, y) {
  const cdp = await page.context().newCDPSession(page)
  const point = (x) => [{ x, y, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from) })
  for (let i = 1; i <= 6; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from + ((to - from) * i) / 6) })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

for (const { width, height } of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  test.describe(`the page viewer at ${width} on a touch phone`, () => {
    test('is a full-screen sheet with Previous, Close and Next in one bottom bar of 44px controls', async ({ browser }) => {
      const { ctx, page } = await openSection(browser, { width, height, touch: true })
      await tile(page, 2).tap()
      await expect(dialog(page)).toBeVisible()
      await expect(count(page)).toHaveText(`1 of ${PAGES}`)
      await page.waitForTimeout(400) // the entrance settles

      const box = await dialog(page).boundingBox()
      expect(box, 'the sheet is the whole screen').toMatchObject({ x: 0, y: 0, width, height })

      const buttons = {}
      for (const name of ['Previous page', 'Close', 'Next page']) buttons[name] = await dialog(page).getByRole('button', { name }).boundingBox()
      for (const [name, b] of Object.entries(buttons)) {
        expect(b.height, `${name} is at least 44px tall`).toBeGreaterThanOrEqual(44)
        expect(b.width, `${name} is at least 44px wide`).toBeGreaterThanOrEqual(44)
      }
      const tops = Object.values(buttons).map((b) => Math.round(b.y))
      expect(new Set(tops).size, 'the three controls share one row').toBe(1)
      expect(buttons['Previous page'].x, 'Previous, then Close, then Next').toBeLessThan(buttons.Close.x)
      expect(buttons.Close.x).toBeLessThan(buttons['Next page'].x)
      expect(buttons.Close.y + buttons.Close.height, 'the bar is in thumb reach: the lowest 120px').toBeGreaterThan(height - 120)
      expect(buttons['Next page'].x + buttons['Next page'].width, 'and inside the screen').toBeLessThanOrEqual(width)
      expect(buttons['Previous page'].x, 'both ends').toBeGreaterThanOrEqual(0)

      const c = await count(page).boundingBox()
      expect(c.x + c.width, 'the count is at the right').toBeGreaterThan(width - 40)
      expect(c.y, 'at the top').toBeLessThan(60)

      const overflow = await page.evaluate(() => ({
        sheet: document.querySelector('.hsv-ov').scrollWidth - document.querySelector('.hsv-ov').clientWidth,
        doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }))
      expect(overflow, 'nothing scrolls sideways').toEqual({ sheet: 0, doc: 0 })

      // The sheet has no scrim: a tap on its empty space leaves it open.
      await page.touchscreen.tap(width / 2, 120)
      await page.waitForTimeout(400)
      await expect(dialog(page)).toBeVisible()

      await dialog(page).getByRole('button', { name: 'Next page' }).tap()
      await expect(count(page)).toHaveText(`2 of ${PAGES}`)
      await dialog(page).getByRole('button', { name: 'Close' }).tap()
      await expect(dialog(page)).toHaveCount(0)
      await expect(tile(page, 2), 'focus returns to the tile').toBeFocused()
      await ctx.close()
    })

    test('a swipe across the page steps: left for next, right for previous, and a short drag does nothing', async ({ browser }) => {
      const { ctx, page } = await openSection(browser, { width, height, touch: true })
      await tile(page, 2).tap()
      await expect(dialog(page)).toBeVisible()
      await page.waitForTimeout(400)
      const stage = await dialog(page).locator('.hsv-stage').boundingBox()
      const y = Math.round(stage.y + stage.height / 2)
      const right = Math.round(stage.x + stage.width - 12)
      const left = Math.round(stage.x + 12)

      await swipe(page, right, left, y)
      await expect(count(page), 'a swipe left goes to the next page').toHaveText(`2 of ${PAGES}`)
      await swipe(page, left, right, y)
      await expect(count(page), 'a swipe right goes back').toHaveText(`1 of ${PAGES}`)
      await swipe(page, left, right, y)
      await expect(count(page), 'back from the first wraps to the last').toHaveText(`${PAGES} of ${PAGES}`)
      await swipe(page, left + 20, left + 50, y)
      await page.waitForTimeout(300)
      await expect(count(page), 'a drag under 48px is not a swipe').toHaveText(`${PAGES} of ${PAGES}`)
      await ctx.close()
    })
  })
}

// ── 6. motion ──────────────────────────────────────────────────────────────────

/** What the live overlay and dialog are set to do on entering. */
const entering = (page) => page.evaluate(() => {
  const ov = document.querySelector('.hsv-ov')
  const dlg = document.querySelector('.hsv-dlg')
  return {
    overlay: { name: getComputedStyle(ov).animationName, seconds: parseFloat(getComputedStyle(ov).animationDuration) },
    dialog: { name: getComputedStyle(dlg).animationName, seconds: parseFloat(getComputedStyle(dlg).animationDuration) },
    scrim: getComputedStyle(ov).backgroundColor,
  }
})

test.describe('the viewer\'s motion', () => {
  test('enters with a fade and a scale from .96 over 200ms, over a scrim of rgba(6, 6, 7, .86)', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    await tile(page, 2).click()
    await expect(dialog(page)).toBeVisible()
    const m = await entering(page)
    expect(m.overlay.name).toBe('hsv-fade')
    expect(m.overlay.seconds).toBeCloseTo(0.2, 2)
    expect(m.dialog.name).toBe('hsv-pop')
    expect(m.dialog.seconds).toBeCloseTo(0.2, 2)
    expect(m.scrim).toBe('rgba(6, 6, 7, 0.86)')
    await ctx.close()
  })

  test('with reduced motion it is the fade alone, 120ms, and the dialog does not scale', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440, reducedMotion: 'reduce' })
    await tile(page, 2).click()
    await expect(dialog(page)).toBeVisible()
    const m = await entering(page)
    expect(m.overlay.name, 'the scrim still fades').toBe('hsv-fade')
    expect(m.overlay.seconds, 'in 120ms, not the backstop\'s hundredth of a millisecond').toBeCloseTo(0.12, 2)
    expect(m.dialog.name, 'the dialog has no scale animation').toBe('none')
    await ctx.close()
  })

  /** The lift, shadow and hairline on a tile, from the computed styles of the live button. */
  const lift = (page, i) => page.evaluate((id) => {
    const el = document.getElementById(id)
    const cs = getComputedStyle(el)
    return {
      transform: cs.transform,
      transitionProperty: cs.transitionProperty,
      cursor: cs.cursor,
      shadowOpacity: getComputedStyle(el, '::before').opacity,
      ringOpacity: getComputedStyle(el, '::after').opacity,
    }
  }, `hsc-tile-${i}`)

  test('a tile lifts and scales 1.02 on a pointer hover, with a shadow and hairline fading in, and shows it can be opened', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    const rest = await lift(page, 2)
    expect(rest.transform, 'at rest it is flat').toBe('none')
    expect(rest.shadowOpacity, 'with no shadow').toBe('0')
    expect(rest.cursor, 'and says it opens bigger').toBe('zoom-in')
    expect(rest.transitionProperty, 'transform is the only thing the tile itself moves').toBe('transform')
    await tile(page, 2).hover()
    await expect.poll(async () => (await lift(page, 2)).transform, { message: 'the tile lifts 3px and scales 1.02' }).toBe('matrix(1.02, 0, 0, 1.02, 0, -3)')
    const hot = await lift(page, 2)
    expect(hot.shadowOpacity, 'the shadow is in').toBe('1')
    expect(hot.ringOpacity, 'and so is the brighter hairline').toBe('1')
    expect((await lift(page, 3)).transform, 'its neighbour does not move').toBe('none')
    await page.mouse.move(5, 5)
    await expect.poll(async () => (await lift(page, 2)).transform, { message: 'it settles back when the pointer leaves' }).toBe('none')
    await ctx.close()
  })

  test('there is no lift under reduced motion, and no touch device lifts a tile', async ({ browser }) => {
    const reduced = await openSection(browser, { width: 1440, reducedMotion: 'reduce' })
    await tile(reduced.page, 2).hover()
    await reduced.page.waitForTimeout(400)
    const hot = await lift(reduced.page, 2)
    expect(hot.transform, 'no lift or scale under reduced motion').toBe('none')
    expect(hot.shadowOpacity, 'the shadow still appears, instantly').toBe('1')
    await reduced.ctx.close()

    const phone = await openSection(browser, { width: 390, height: 844, touch: true })
    const style = await phone.page.evaluate(() => {
      const rules = []
      for (const sheet of document.styleSheets) {
        try { for (const r of sheet.cssRules) if (r.cssText.includes('.hsc-open:hover') && r.cssText.includes('scale(1.02)')) rules.push(r.constructor.name + ':' + (r.conditionText || r.media?.mediaText || '')) } catch { /* cross-origin sheet */ }
      }
      return rules
    })
    expect(style.length, 'the hover rule is found').toBeGreaterThan(0)
    expect(style.every((s) => s.includes('hover: hover') && s.includes('pointer: fine')), `every hover rule sits behind (hover: hover) and (pointer: fine); read ${style}`).toBe(true)
    await phone.ctx.close()
  })

  test('nothing in the section transitions "all", and nothing animates layout', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    const bad = await page.evaluate(() => {
      const out = []
      // The closing call to action is the shared pill button's, with its own transitions.
      const root = document.getElementById('examples')
      for (const el of [root, ...root.querySelectorAll('*')].filter((e) => !e.closest('.hsc-foot'))) {
        for (const pseudo of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pseudo)
          const props = cs.transitionProperty.split(',').map((s) => s.trim())
          const durs = cs.transitionDuration.split(',').map((s) => parseFloat(s))
          props.forEach((p, i) => {
            if ((durs[i % durs.length] || 0) > 0 && !['opacity', 'transform', 'background-color', 'color', 'border-color'].includes(p)) {
              out.push(`${el.className || el.tagName}${pseudo || ''}: ${p}`)
            }
          })
        }
      }
      return out
    })
    expect(bad, 'every running transition names opacity, transform or a colour').toEqual([])
    await ctx.close()
  })

  test('the tiles rise in as the section scrolls into view, a beat apart, and are then at rest', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440 })
    await go(page, '/')
    await homeSectionsLoaded(page)
    await expect(tabs(page)).toHaveCount(KINDS.length)
    const root = page.locator('#examples .hsc')
    // Before it is near, the tiles are held back.
    await expect(root).toHaveAttribute('data-hsc-reveal', 'armed')
    const held = await page.locator('#hsc-panel li').evaluateAll((lis) => lis.map((li) => ({ opacity: getComputedStyle(li).opacity, transform: getComputedStyle(li).transform })))
    expect(held.map((h) => h.opacity), 'transparent').toEqual(Array(TOTAL).fill('0'))
    expect(held.every((h) => h.transform === 'matrix(1, 0, 0, 1, 0, 8)'), 'and 8px low').toBe(true)

    await page.evaluate(() => {
      window.__hscReveal = new Promise((resolve) => {
        const el = document.querySelector('#examples .hsc')
        const mo = new MutationObserver(() => {
          if (el.getAttribute('data-hsc-reveal') !== 'in') return
          mo.disconnect()
          const lis = [...el.querySelectorAll('#hsc-panel li')]
          resolve({
            delays: lis.map((li) => parseFloat(getComputedStyle(li).transitionDelay)),
            durations: lis.map((li) => getComputedStyle(li).transitionDuration.split(',').map((s) => parseFloat(s))),
            properties: [...new Set(lis.flatMap((li) => getComputedStyle(li).transitionProperty.split(',').map((s) => s.trim())))].sort(),
          })
        })
        mo.observe(el, { attributes: true, attributeFilter: ['data-hsc-reveal'] })
      })
    })
    await page.locator('#examples').scrollIntoViewIfNeeded()
    const moving = await page.evaluate(() => window.__hscReveal)
    expect(moving.properties, 'opacity and transform only').toEqual(['opacity', 'transform'])
    expect(moving.durations.every((d) => d.every((s) => s >= 0.18 && s <= 0.32)), `each runs 180 to 320ms (read ${JSON.stringify(moving.durations)})`).toBe(true)
    expect(moving.delays[0], 'the first tile starts at once').toBe(0)
    expect(new Set(moving.delays).size, 'every tile starts on its own beat').toBe(TOTAL)
    expect(Math.max(...moving.delays), 'and the last starts under half a second in').toBeLessThan(0.5)
    await expect(root, 'then it is at rest').toHaveAttribute('data-hsc-reveal', 'done')
    // The section and every tile end fully shown: nothing outside the showcase may hold it at opacity 0.
    expect(await root.evaluate((el) => getComputedStyle(el).opacity), 'the showcase itself is shown').toBe('1')
    const shown = await page.locator('#hsc-panel li').evaluateAll((lis) => lis.map((li) => getComputedStyle(li).opacity))
    expect(shown, 'and every tile is shown').toEqual(Array(TOTAL).fill('1'))
    // "done" is set on a timer that can fire a frame before the last tile's transition ends on a
    // loaded machine, so the tiles are read until they settle rather than once.
    await expect.poll(async () => {
      const rest = await page.locator('#hsc-panel li').evaluateAll((lis) => lis.map((li) => ({ opacity: getComputedStyle(li).opacity, transform: getComputedStyle(li).transform, transition: getComputedStyle(li).transitionDuration })))
      return rest.every((r) => r.opacity === '1' && r.transform === 'none' && parseFloat(r.transition) === 0)
    }, { message: 'every tile is opaque, flat and has no transition left', timeout: 2000 }).toBe(true)
    await ctx.close()
  })

  test('with reduced motion the tiles are simply there, and a pick still fades for 120ms with no stagger', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, reducedMotion: 'reduce' })
    await go(page, '/')
    await homeSectionsLoaded(page)
    await expect(tabs(page)).toHaveCount(KINDS.length)
    await expect(page.locator('#examples .hsc'), 'no scroll-in reveal').toHaveAttribute('data-hsc-reveal', 'off')
    const tiles = await page.locator('#hsc-panel li').evaluateAll((lis) => lis.map((li) => ({ opacity: getComputedStyle(li).opacity, transform: getComputedStyle(li).transform })))
    expect(tiles.every((t) => t.opacity === '1' && t.transform === 'none'), 'every tile is visible and flat from the start').toBe(true)

    await page.locator('#examples').scrollIntoViewIfNeeded()
    await waitAllShow(page, 'Colour')
    await page.evaluate(() => {
      window.__hscFade = new Promise((resolve) => {
        const panel = document.getElementById('hsc-panel')
        const mo = new MutationObserver(() => {
          mo.disconnect()
          requestAnimationFrame(() => {
            const fades = document.getAnimations().filter((a) => a.animationName === 'hsc-in' && panel.contains(a.effect.target))
            resolve({
              count: fades.length,
              seconds: fades.map((a) => a.effect.getTiming().duration / 1000),
              delays: fades.map((a) => a.effect.getTiming().delay),
              properties: [...new Set(fades.flatMap((a) => a.effect.getKeyframes().flatMap((k) => Object.keys(k))))]
                .filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)),
            })
          })
        })
        mo.observe(panel, { subtree: true, attributes: true, childList: true, attributeFilter: ['src', 'srcset'] })
      })
    })
    await tabs(page).filter({ hasText: /^Logo$/ }).click()
    const fade = await page.evaluate(() => window.__hscFade)
    expect(fade.count, 'every tile still fades its new page in').toBe(TOTAL)
    expect(fade.seconds.every((s) => Math.abs(s - 0.12) < 0.005), `in 120ms, not the backstop's hundredth of a millisecond (read ${fade.seconds})`).toBe(true)
    expect(fade.delays.every((d) => d === 0), 'all together, with no stagger').toBe(true)
    expect(fade.properties, 'and it is opacity alone').toEqual(['opacity'])
    await ctx.close()
  })
})

// ── 7. the footnote ────────────────────────────────────────────────────────────

test.describe('the footnote', () => {
  test('names the sample brands and ends with the Free/Pro split', async ({ browser }) => {
    const { ctx, page } = await openSection(browser, { width: 1440 })
    const note = (await page.locator('.hsc-footnote').textContent()).replace(/\s+/g, ' ').trim()
    expect(note).toContain('are sample brands')
    expect(note).toContain('are from Unsplash.')
    expect(note.endsWith('The UI kit is free in two of the ten themes; every other export is Pro.'), `the footnote ends with the split (it reads: ${note})`).toBe(true)
    const line = (await page.locator('.hsc-note').textContent()).trim()
    expect(note.includes(line), 'and does not repeat the line under the picker').toBe(false)
    await ctx.close()
  })
})
