// The mega menu shows the product, and says where to start.
//
// #340 fixed this panel's STRUCTURE: the clipped bottom, the truncated labels,
// the misplaced eyebrow, the blank editorial card, hover on touch, and the
// seventh hand-kept copy of the tool list. All of that stayed fixed. The
// complaint that arrived afterwards was different in kind -- the panel was
// correct and still generic -- and it had two causes this file guards.
//
// ONE: the card drew a picture of a UI instead of showing one. PromoMock
// rendered grey <rect> bars standing in for text beside coloured rectangles
// standing in for swatches, in a menu leading to 64 real palettes and 100 real
// gradients. The tests below assert the previews carry values read from the
// SAME gallery data the tools read, so the nav cannot advertise something the
// product does not contain -- and that Learn, which is honestly unbuilt, gets
// no preview at all. That absence is load-bearing: it is what makes live and
// unbuilt read apart without hunting for a badge.
//
// TWO: nothing said which tool to open first. The product already had an
// opinion -- promo.guide/promo.cta, honoured by the mobile sheet, dropped on
// desktop, where the card headed "Build your brand kit, step by step" offered
// one link to /sitemap. The desktop card now renders the guided path from
// UIKIT_STEPS and the button that launches it.
//
// THE KEYBOARD CONTRACT IS THE POINT OF THIS FILE, not a footnote. #340
// verified fifteen behaviours by hand and only three of them were ever committed
// as assertions, which means fourteen months of refactors could have taken any
// of the other twelve without a single test going red. Restructuring the panel
// is exactly the change that would, so all fifteen are written down here against
// the markup that ships now.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { watch, go } from './helpers.js'
import { GALLERY_PALETTES } from '../../src/data/paletteGallery.js'
import { inkFor, grade } from '../../src/utils/styleGuideExport.js'
import { GALLERY_GRADIENTS } from '../../src/data/gradientGallery.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { LEARN_GROUPS } from '../../src/data/toolTree.js'
import { readingMinutes } from '../../src/data/learnIndex.js'

// ── DRIVEN FROM AN APP ROUTE, NOT FROM '/' ───────────────────
//
// This panel belongs to the APP HEADER (PillNav). The front door is Spectrum
// now and mounts <PillNav variant="spectrum" />, which is a different nav
// with a full-screen menu and no .pnav-* markup at all, so every test here
// was asserting the app header on the one page that deliberately does not
// have it.
//
// /discover is the route used because it is chromeless (the header renders
// full-width, exactly as it did on the old homepage), it is public, and it is
// not one of the surfaces these tests read data from. The panel is built from
// the tool tree and is identical on every route that mounts it.
//
// The front door's own navigation is covered by 96-spectrum-nav.spec.js, and
// 01-first-time-visitor drives the same find-a-tool journey through it.
const MENU_ROUTE = '/discover'


// Derived, never hand-listed. A literal copy of these labels here would be the
// eighth hand-kept list in a codebase that has spent two PRs deleting the first
// seven, and it would pass while the guide itself changed underneath it.
function guideStepLabels() {
  // The step model moved OUT of the component into utils/brandKitGuide.js,
  // beside the reading that explains it. This reads the array the menu card and
  // the walkthrough now BOTH import, so it is still one source rather than an
  // eighth hand-kept list — which is the property this helper exists to keep.
  const src = fs.readFileSync(path.join('src', 'utils', 'brandKitGuide.js'), 'utf8')
  const block = src.slice(src.indexOf('export const BRAND_KIT_STEPS = Object.freeze(['))
  const body = block.slice(0, block.indexOf('\n])'))
  return [...body.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1])
}

const TRIGGERS = ['Create', 'Discover', 'Learn']

// Nine shapes x three menus = the 27 combinations #340 measured by hand. The
// range starts at 1024 because below 769 the panel is not the thing on screen
// at all -- that is the sheet, which has its own coverage.
const DESKTOP_MATRIX = [
  { width: 1024, height: 768 }, { width: 1024, height: 608 }, { width: 1152, height: 864 },
  { width: 1280, height: 800 }, { width: 1280, height: 720 }, { width: 1366, height: 768 },
  { width: 1366, height: 608 }, { width: 1440, height: 900 }, { width: 1600, height: 1200 },
]

/** Every menu item a person can actually reach: rendered ones, in DOM order. */
function ring(page) {
  return page.evaluate(() => [...document.querySelectorAll('#pnav-mega [data-pnav-menuitem]')]
    .filter((el) => el.getClientRects().length > 0)
    .map((el) => (el.textContent || '').trim()))
}

const focusedText = (page) => page.evaluate(() => (document.activeElement.textContent || '').trim())

/**
 * Wait for the panel to STOP MOVING before measuring it.
 *
 * .pnav-menu animates in from scale(.975) and transitions its width between
 * sections, and .pnav-tool rows fade up on a stagger. Anything read between
 * "the region is visible" and "the animation is done" is the real geometry
 * multiplied by whatever the scale is on that frame -- which is exactly how a
 * 44px row measured 43 (44 x 0.975 = 42.9) and made a settled layout look like
 * a broken one.
 *
 * This waits on the animation LAYER via getAnimations().finished. A timeout
 * would be a guess that a slower machine invalidates, and two equal reads in a
 * row can simply be two reads from the same frame.
 */
async function settle(page) {
  await page.locator('#pnav-mega').evaluate((el) => Promise.all(
    el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})),
  ))
}

async function openWithPointer(page, name) {
  await page.getByRole('button', { name, exact: true }).click()
  await expect(page.getByRole('region', { name: `${name} menu` })).toBeVisible()
  await settle(page)
}

/**
 * Enter dark by seeding storage and RELOADING.
 *
 * Stamping data-theme on <html> with setAttribute does not re-render React, so a
 * branch written that way asserts nothing -- that exact mistake shipped a
 * vacuous test in #341 and was only caught by mutation. The boot script reads
 * vs-t before first paint, so seeding plus a reload is the only honest way in.
 */
async function enterDark(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('vs-t', 'dark') } catch { /* blocked storage */ }
  })
  await go(page, MENU_ROUTE)
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')
}

test.describe('the mega menu shows real contents and keeps its keyboard contract', () => {
  // ── The complaint: it read as a directory, not as this product ────────────

  test('the Create card previews a page of the real export, not a drawing of one', async ({ page }) => {
    watch(page, 'a first-time visitor deciding whether this product is for them')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Create')

    // FOUNDER, 2026-09-14: "the build a brand kit graphic should show a page of
    // what an export will look like maybe the page of colours". It used to be a
    // swatch rail plus "Ag" and "0123 abc" — the INGREDIENTS, never the
    // artefact — beside a card selling a flow whose whole point is what you get
    // at the end. It is page 2 of the style guide now.
    const chips = page.locator('#pnav-mega .pnav-prev-chip')
    const expected = GALLERY_PALETTES[0].colors
    await expect(chips).toHaveCount(expected.length)

    // Un-fakeable, exactly as before: read back the painted colour of every
    // chip and compare it against the gallery entry itself. A decorative row of
    // pleasant rectangles fails here.
    const painted = await chips.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
    const asRgb = (hex) => {
      const h = hex.replace('#', '')
      const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
    }
    expect(painted).toEqual(expected.map(asRgb))

    // AND IT IS THE EXPORT'S PAGE, not a lookalike. These three strings are
    // written by src/utils/styleGuideExport.js onto the real page 2: the
    // section number, the heading, and the footer a FREE export carries.
    await expect(page.locator('.pnav-prev-eyebrow')).toHaveText('01 — Colour')
    await expect(page.locator('.pnav-prev-title')).toHaveText('The palette')
    await expect(page.locator('.pnav-prev-foot')).toContainText('Made with UIL4B')

    // THE PART THAT CANNOT DRIFT. The preview computes its ink and its ratio
    // with the exporter's own inkFor() and grade(), so this asserts the printed
    // evidence against the same functions the export runs — not against a
    // hard-coded "AAA" that would quietly become a lie the first time a colour
    // or a WCAG threshold moved.
    const metas = await page.locator('.pnav-prev-meta').allTextContents()
    expect(metas).toEqual(expected.map((hex) => {
      const { ratio } = inkFor(hex)
      return `${grade(ratio)} · ${ratio.toFixed(1)}:1`
    }))

    // The hex is painted in the ink the exporter chose for that fill, which is
    // the whole claim the colour page makes: every swatch shown with the text
    // colour that reads on it.
    const inks = await chips.evaluateAll((els) => els.map((el) => getComputedStyle(el).color))
    expect(inks).toEqual(expected.map((hex) => (inkFor(hex).ink === '#000000' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)')))
  })


  // The Discover pane is the App file's 2×2 of
  // counts (lines 176-190), not the three gradient tiles. The design file typed "71"
  // and "100"; these are counted from the galleries the pages render.
  test('the Discover pane counts its libraries from the data the galleries render', async ({ page }) => {
    watch(page, 'a designer scanning for something worth a tab')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Discover')

    const counts = page.locator('#pnav-mega .pnav-dcount-n')
    await expect(counts).toHaveCount(4)
    const values = (await counts.allTextContents()).map((t) => t.trim())
    expect(values.slice(0, 2)).toEqual([String(GALLERY_PALETTES.length), String(GALLERY_GRADIENTS.length)])
    // The gradient strip is a real gallery gradient, not a decorative ramp.
    const strip = await page.locator('#pnav-mega .pnav-dcount-strip').nth(1).evaluate((el) => el.style.backgroundImage)
    expect(strip).toContain('linear-gradient')
    const cta = page.locator('#pnav-mega .pnav-editorial-cta')
    await expect(cta).toHaveText(/Open Discover/)
    await expect(cta).toHaveAttribute('href', '/discover')
  })


  // Learn is BUILT now (seven guides), and the App file's Learn pane lists the
  // guides with a mono reading time (lines 192-200). Each time is computed from
  // the article's measured word count, never typed.
  test('the Learn pane lists every published guide with its reading time', async ({ page }) => {
    watch(page, 'a visitor checking whether the guides exist yet')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Learn')

    const rows = page.locator('#pnav-mega .pnav-guide')
    await expect(rows).toHaveCount(LEARN_ARTICLES.length)
    await expect(page.locator('#pnav-mega .pnav-guide-label')).toHaveText(LEARN_ARTICLES.map((a) => a.title))
    await expect(page.locator('#pnav-mega .pnav-guide-mins')).toHaveText(LEARN_ARTICLES.map((a) => `${readingMinutes(a.words)} MIN`))
    const cta = page.locator('#pnav-mega .pnav-editorial-cta')
    await expect(cta).toHaveText(/Read the guides/)
    await expect(cta).toHaveAttribute('href', '/learn')
  })


  test('the Create pane launches the guided path', async ({ page }) => {
    watch(page, 'a new visitor asking which tool to open first')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Create')
    // The numbered step list gave way to the export-page preview (
    // the export-page preview inside the file's pane layout). The step names still
    // appear once the flow runs, in its own step bar.
    expect(guideStepLabels().length).toBeGreaterThan(2)
    const cta = page.locator('#pnav-mega .pnav-editorial-cta')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveText(/Build a brand kit|Resume:/)
    await cta.click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/palette')
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' })).toBeVisible()
  })


  // The App file's group labels (line 135) are one quiet mono caption in the
  // faint ink, sentence case, with no rule — and its rows carry no category
  // colour. There are no hue rules.
  test('group labels are the file\'s quiet mono captions: one colour, no rule, sentence case', async ({ page }) => {
    watch(page, 'a scanner trying to tell six columns apart')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Create')
    const labels = await page.locator('#pnav-mega .pnav-col-label').evaluateAll((els) => els.map((el) => {
      const cs = getComputedStyle(el)
      return { color: cs.color, size: cs.fontSize, transform: cs.textTransform, rule: getComputedStyle(el, '::before').content }
    }))
    expect(labels.length).toBeGreaterThanOrEqual(6)
    expect(new Set(labels.map((l) => l.color)).size).toBe(1)
    for (const l of labels) {
      expect(l.size).toBe('9.5px')
      expect(l.transform).toBe('none')
      expect(['none', 'normal']).toContain(l.rule)
    }
  })

  // ── The fifteen-part keyboard contract, on the new markup ────────────────

  test('the full keyboard contract survives the restructure', async ({ page }) => {
    watch(page, 'a keyboard-first designer')
    await go(page, MENU_ROUTE)

    const create = page.getByRole('button', { name: 'Create', exact: true })
    const discover = page.getByRole('button', { name: 'Discover', exact: true })
    const learn = page.getByRole('button', { name: 'Learn', exact: true })
    const menu = page.getByRole('region', { name: 'Create menu' })

    // 13 + 14 · the disclosure contract, closed.
    await expect(create).toHaveAttribute('aria-expanded', 'false')
    expect(await create.getAttribute('aria-controls')).toBeNull()

    // 1 · ArrowDown opens and enters at the top.
    await create.focus()
    await create.press('ArrowDown')
    await expect(menu).toBeVisible()
    // 13 + 14 · and open.
    await expect(create).toHaveAttribute('aria-expanded', 'true')
    await expect(create).toHaveAttribute('aria-controls', 'pnav-mega')

    const items = await ring(page)
    expect(items.length).toBeGreaterThan(5)

    // WHAT IS IN THE RING, not just how many. Every assertion below reads
    // items[0] and items[at end] back out of the live DOM, so on its own the
    // walk would happily pass against a ring that had silently lost members --
    // mutation-checked, and it did. These three names are the contract: the
    // card's primary action and the panel's two exits were ALL unreachable by
    // keyboard before this pass, jumped over in each direction by the Tab
    // bridge, so naming them is what stops that regressing quietly.
    //
    // BY NAME, NOT BY INDEX, since the Spectrum rebuild. This read
    // `items[0]` for the guided CTA, which encoded the old DOM order: the promo
    // card was the FIRST child of .pnav-menu-cols and the tool columns came
    // after it. `UIL4B App.dc.html` puts the promo pane on the right, and the
    // aside moved in the DOM as well as on screen rather than being placed
    // there with `order` -- a keyboard user must not Tab into a 1260px panel at
    // its far right and then walk back left (WCAG 2.4.3). So the ring opens on
    // the first TOOL now. The thing this test exists to catch is a ring that
    // has silently LOST a member, and that is what these three assert; the
    // endpoints are pinned separately below.
    const names = items.join(' | ')
    expect(names, 'the guided CTA fell out of the keyboard ring again').toMatch(/Build a brand kit|Resume:/)
    expect(names, 'the view-all fell out of the keyboard ring').toContain('View all create tools')
    // The ring still opens on a real destination and ends on the panel's
    // view-all, which is the last thing in the card's DOM.
    expect(items[0]).toContain('Palette')
    expect(items[items.length - 1]).toContain('View all create tools')
    // The trigger handler focuses inside requestAnimationFrame twice over, so
    // every assertion that follows a trigger key has to settle rather than read
    // the first frame. Arrow keys WITHIN the panel move focus synchronously and
    // are asserted directly.
    await expect.poll(() => focusedText(page)).toBe(items[0])

    // 5 · ArrowDown walks forward.
    await page.keyboard.press('ArrowDown')
    expect(await focusedText(page)).toBe(items[1])

    // 6 · ArrowUp walks back, and wraps off the top.
    await page.keyboard.press('ArrowUp')
    expect(await focusedText(page)).toBe(items[0])
    await page.keyboard.press('ArrowUp')
    expect(await focusedText(page)).toBe(items[items.length - 1])

    // 7 + 8 · Home and End.
    await page.keyboard.press('Home')
    expect(await focusedText(page)).toBe(items[0])
    await page.keyboard.press('End')
    expect(await focusedText(page)).toBe(items[items.length - 1])

    // 11 · Shift+Tab off the first item returns to the trigger that owns it.
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+Tab')
    await expect(create).toBeFocused()

    // 10 · forward Tab off an open trigger bridges into the panel it opened,
    // rather than landing on the next trigger (the panel is rendered after
    // </nav>, so nothing but this handler puts it in reach).
    await page.keyboard.press('Tab')
    await expect.poll(() => focusedText(page)).toBe(items[0])

    // 12 · Tab off the last item closes the menu and carries on along the bar.
    await page.keyboard.press('End')
    await page.keyboard.press('Tab')
    await expect(menu).toBeHidden()
    await expect(create).toHaveAttribute('aria-expanded', 'false')

    // 9 · Escape closes and gives focus back to the control that owns the layer.
    await create.focus()
    await create.press('ArrowDown')
    await expect(menu).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(create).toBeFocused()

    // 2 · ArrowUp opens and enters at the BOTTOM.
    await create.press('ArrowUp')
    await expect(menu).toBeVisible()
    await expect.poll(() => focusedText(page)).toBe(items[items.length - 1])
    await page.keyboard.press('Escape')

    // 3 + 4 · Left/Right walk the three triggers, and wrap both ways.
    await create.focus()
    await create.press('ArrowRight')
    await expect(discover).toBeFocused()
    await discover.press('ArrowRight')
    await expect(learn).toBeFocused()
    await learn.press('ArrowRight')
    await expect(create).toBeFocused()
    await create.press('ArrowLeft')
    await expect(learn).toBeFocused()
  })

  test('the Soon badge adds no focus stop', async ({ page }) => {
    watch(page, 'a keyboard user tabbing past what is not built yet')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Create')

    const soonRow = page.locator('#pnav-mega .pnav-tool[data-soon]').first()
    await expect(soonRow.locator('.soon-badge')).toHaveCount(1)
    await soonRow.focus()

    const before = await focusedText(page)
    await page.keyboard.press('Tab')
    const after = await focusedText(page)

    // The badge is inside the row it qualifies, so a tabindex on it would put a
    // stop between the tool and the next one. Focus must skip straight past.
    expect(after).not.toBe(before)
    const isBadge = await page.evaluate(() => document.activeElement.classList.contains('soon-badge'))
    expect(isBadge).toBe(false)
  })


  // The promo pane no longer hides below 1240 (it moves under the columns), so
  // the layout hides nothing in the ring today. The filter still matters the
  // moment it does, so this hides a row and proves ArrowDown steps over it.
  test('the keyboard ring skips items the layout has hidden', async ({ page }) => {
    watch(page, 'a keyboard user on a small laptop')
    await go(page, MENU_ROUTE)
    const create = page.getByRole('button', { name: 'Create', exact: true })
    await create.focus()
    await create.press('ArrowDown')
    await expect(page.getByRole('region', { name: 'Create menu' })).toBeVisible()
    // Park focus on the third row, hide the first, then Home: the ring must
    // land on the second row, never on the hidden one (a silent no-op).
    const second = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#pnav-mega [data-pnav-menuitem]')]
      rows[2].focus()
      rows[0].style.display = 'none'
      return rows[1].textContent.trim()
    })
    await page.keyboard.press('Home')
    expect(await focusedText(page)).toBe(second)
    const onBody = await page.evaluate(() => document.activeElement === document.body)
    expect(onBody).toBe(false)
  })

  // ── Both themes are shipped surfaces ─────────────────────────────────────

  test('the panel and its previews hold up in dark theme', async ({ page }) => {
    watch(page, 'a designer who works at night')
    await enterDark(page)
    await openWithPointer(page, 'Create')

    // The palette this preview shows opens on near-black values, which is
    // exactly the case a black hairline could not separate from a dark card.
    const ring1 = await page.locator('.pnav-prev-chip').first()
      .evaluate((el) => getComputedStyle(el).boxShadow)
    expect(ring1).not.toBe('none')

    // The sheet is WHITE IN BOTH THEMES on purpose: the exported page is white
    // paper, and a dark-mode "preview" of a document that prints white would be
    // showing the user something they will never receive.
    const sheetBg = await page.locator('.pnav-prev-page')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(sheetBg).toBe('rgb(255, 255, 255)')

    // The card, the guided path and the action all survive the theme.
    await expect(page.locator('#pnav-mega .pnav-prev')).toBeVisible()
    await expect(page.locator('#pnav-mega .pnav-editorial-cta')).toBeVisible()

    // And the keyboard contract is not a light-theme feature.
    const create = page.getByRole('button', { name: 'Create', exact: true })
    await page.keyboard.press('Escape')
    await create.focus()
    await create.press('ArrowDown')
    const darkRing = await ring(page)
    await expect.poll(() => focusedText(page)).toBe(darkRing[0])
    await page.keyboard.press('Escape')
    await expect(create).toBeFocused()
  })

  // #340 reported 27 of 27 viewport-by-menu combinations clean and only ever
  // committed two of the nine widths, so seven of them were a hand check that no
  // test could repeat. DESKTOP_MATRIX x TRIGGERS is that claim, written down: nine
  // shapes across the range where the desktop panel is the thing on screen, times
  // the three menus. Tall AND short pairs at the same width are deliberate -- a
  // height regression that only shows at 608 would otherwise pass at 768.
  test('every section still opens and closes cleanly across all 27 viewport-by-menu combinations', async ({ page }) => {
    watch(page, 'a visitor on whatever machine they happen to own')
    test.setTimeout(15000 + DESKTOP_MATRIX.length * 9000)
    for (const size of DESKTOP_MATRIX) {
      await page.setViewportSize(size)
      await go(page, MENU_ROUTE)
      for (const name of TRIGGERS) {
        await openWithPointer(page, name)
        const panel = page.locator('#pnav-mega')
        const box = await panel.boundingBox()
        // #340's finding: a fixed panel taller than the space it has simply
        // clips, with no scrollbar to recover the bottom. The body scrolls now,
        // and the footer must stay on screen.
        expect(box.y + box.height,
          `${name} at ${size.width}x${size.height} runs past the bottom`).toBeLessThanOrEqual(size.height + 1)
        await expect(panel.locator('.pnav-menu-foot')).toBeVisible()

        // NOTHING MAY CLIP. This is the assertion whose absence let two
        // truncated descriptions ship past #340 and #352: -webkit-line-clamp
        // renders overflow as a tidy ellipsis, so a row that has lost its last
        // two words looks deliberate in a screenshot and identical to a row
        // that fits. Measured, it is scrollHeight > clientHeight.
        const clipped = await panel.evaluate((el) => [...el.querySelectorAll('.pnav-tool-desc')]
          .filter((d) => d.scrollHeight > d.clientHeight + 1)
          .map((d) => d.textContent))
        expect(clipped, `${name} at ${size.width}x${size.height} clipped a description`).toEqual([])

        // The file's row is 42px (8px + a 26px tile + 8px). On a mouse that is
        // well over WCAG 2.5.8's 24px; a coarse pointer gets 44px (global.css).
        const short = await panel.evaluate((el) => [...el.querySelectorAll('.pnav-tool')]
          .filter((r) => r.getBoundingClientRect().height < 41.5)
          .map((r) => r.textContent.trim()))
        expect(short,
          `${name} at ${size.width}x${size.height} has a row under the file's 42px`,
        ).toEqual([])

        await page.keyboard.press('Escape')
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${size.width} should not scroll horizontally`).toBeLessThanOrEqual(1)
    }
  })
  // ── The second line has to earn its place ────────────────────────────────
  //
  // The panel was correct after #352 and still read as a directory: eighteen rows,
  // each an icon over a title over a grey line at the same size and spacing, so
  // the eye got no purchase on which of them mattered. Eighteen of the thirty-four
  // description lines said nothing their label had not already said.

  test('a Soon row never describes what it will do once it exists', async ({ page }) => {
    watch(page, 'a visitor deciding what is worth clicking')
    await go(page, MENU_ROUTE)

    for (const name of TRIGGERS) {
      await openWithPointer(page, name)
      const offenders = await page.evaluate(() => [...document.querySelectorAll('#pnav-mega .pnav-tool[data-soon]')]
        .filter((r) => r.querySelector('.pnav-tool-desc'))
        .map((r) => r.querySelector('.pnav-tool-label').textContent))
      // A sentence about an unbuilt tool is a claim about something that does not
      // exist. Withholding it is also what makes live and unbuilt read apart
      // straight down a column, which is the same reasoning that already keeps a
      // preview off the Learn card.
      expect(offenders, `${name} describes a tool it has not built`).toEqual([])
      await page.keyboard.press('Escape')
    }
  })

  test('Learn separates the guides that exist from the topics that do not', async ({ page }) => {
    watch(page, 'a visitor checking whether the guides exist yet')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Learn')

    // THIS TEST USED TO ASSERT THAT EVERY LEARN ROW WAS SOON, and its own
    // comment predicted the day that would stop being true: "it is what the
    // panel should look like until one of them ships -- at which point that row
    // gets its line back with no edit here, because the rule reads t.soon
    // rather than a list." Three guides have shipped. The rule did hold; what
    // changed is the arithmetic, so the assertion is now the SPLIT rather than
    // the total, which is the property that actually matters: a Soon row must
    // never become clickable, and a published guide must never be marked Soon.
    const rows = page.locator('#pnav-mega .pnav-tool')
    const total = await rows.count()
    expect(total).toBeGreaterThan(4)

    const soonRows = page.locator('#pnav-mega .pnav-tool[data-soon]')
    await expect(soonRows).toHaveCount(LEARN_GROUPS.filter((g) => g.soon).length)

    for (const article of LEARN_ARTICLES) {
      const row = page.locator(`#pnav-mega a.pnav-tool[href="/learn/${article.slug}"]`)
      await expect(row, `${article.slug} is not offered in the Learn menu`).toBeVisible()
      await expect(row).not.toHaveAttribute('data-soon', 'true')
      await expect(row).toContainText(article.navLabel)
    }

    // The description rule is unchanged and still absolute here: a Soon row
    // never describes what it will do, and the guide rows lead with their
    // title rather than a second line of prose in a 180px column.
    await expect(page.locator('#pnav-mega .pnav-tool-desc')).toHaveCount(0)
  })


  // No row carries a description any more (App lines 138-142: one line each),
  // so there is nothing that can fall through to landing-page copy.
  test('no row carries a description, in any menu', async ({ page }) => {
    watch(page, 'a scanner reading the menu')
    await go(page, MENU_ROUTE)
    for (const name of TRIGGERS) {
      await openWithPointer(page, name)
      await expect(page.locator('#pnav-mega .pnav-tool-desc')).toHaveCount(0)
      await expect(page.locator('#pnav-mega .pnav-tool').first()).not.toContainText(/Google Fonts catalogue|one seed/)
      await page.keyboard.press('Escape')
    }
  })


  // The file's rows are one line and one height (App line 138). No row carries a
  // description or varies its height.
  test('every row is one line at the file\'s height', async ({ page }) => {
    watch(page, 'a scanner reading the menu')
    await go(page, MENU_ROUTE)
    await openWithPointer(page, 'Create')
    const heights = await page.evaluate(() => [...new Set([...document.querySelectorAll('#pnav-mega .pnav-tool')]
      .map((r) => Math.round(r.getBoundingClientRect().height)))])
    expect(heights).toEqual([42])
    const wrapped = await page.evaluate(() => [...document.querySelectorAll('#pnav-mega .pnav-tool-label')]
      .filter((l) => l.getClientRects().length > 1).map((l) => l.textContent))
    expect(wrapped).toEqual([])
  })
})
