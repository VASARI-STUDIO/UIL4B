import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// THE CONTROL-PATTERN SWEEP over the ten Create/SEO tool surfaces.
//
// The founder's words, 2026-09-13: "im finding alot of basic UI problems that
// can be replaced with better UI design such as replacing some buttons with a
// drop down or other large issues", alongside a screenshot of seven icon-only
// buttons crammed into every row of a list.
//
// So this suite is not another geometry sweep — #451 already swept these
// surfaces for overflow, target size and contrast and came back clean. It
// asserts the thing that was still wrong: WHICH PATTERN a cluster of controls
// is rendered as, and whether the pattern it collapses to actually works.
//
// Three defects, all measured by rendering at 844px tall before being fixed:
//
//   1. /create/emoji rendered twelve category chips as a wrapped tray below
//      641px — seven rows at 320 — taking the toolbar to 414px, 49% of a small
//      phone's viewport, and putting ZERO emoji on the first screen at 320,
//      360, 390 and 430.
//   2. The menu it collapses to flipped up UNDER the fixed nav at every desktop
//      width, so its first option — "All", the way back to the unfiltered
//      library — was visible and unclickable.
//   3. Below 641 `.lbry-toolbar` was `position:static`, which forfeits its
//      `z-index:45` while `backdrop-filter` still opens a stacking context, so
//      seven of twelve options hit-tested to the hero instead of themselves.
//
// And one silent state: /create/icons emptied its grid 120 → 0 on a no-match
// search with no explanation whenever the catalogue had come from the offline
// fallback, because the empty state was suppressed by `&& !loadError`.
// ─────────────────────────────────────────────────────────────────────────────

const WIDTHS = [320, 360, 390, 430, 768, 834, 1024, 1280, 1440, 1920]
const PHONE_WIDTHS = [320, 360, 390, 430]

const SURFACES = [
  '/create/type-scale', '/create/font-pair', '/create/font-gallery',
  '/create/icons', '/create/emoji', '/create/file-converter',
  '/create/alt-text', '/create/aspect-ratio', '/create/auto-builder', '/seo',
]

async function settle(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 2; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/**
 * Count the operable controls a user could actually reach, and report the
 * document's horizontal overflow.
 *
 * THE POSITIVE CONTROL LIVES HERE. A probe that silently returns an empty list
 * makes every "nothing overflows / nothing is too small" assertion below pass
 * vacuously, and that has happened on this repo. So the count is returned
 * alongside the findings and asserted to be non-zero on every single
 * route/width pair — if the page did not render, this suite says so instead of
 * reporting a clean sweep of nothing.
 */
const surfaceProbe = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
  }
  const controls = [...document.querySelectorAll(
    'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="option"]',
  )].filter(visible)
  const de = document.documentElement
  return {
    controls: controls.length,
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
  }
}

/**
 * Hit-test every option inside the open filter menu against the point a finger
 * or cursor would land on.
 *
 * Options scrolled out of the menu's own `overflow-y:auto` box are skipped
 * rather than counted as blocked — they are reachable by scrolling the menu,
 * and counting them produced three false positives the first time this was
 * measured by hand.
 */
const menuHitTest = () => {
  const menu = document.querySelector('.lbry-filtermenu')
  if (!menu) return { error: 'no menu open' }
  const box = menu.getBoundingClientRect()
  const options = [...menu.querySelectorAll('button')]
  const blocked = []
  let tested = 0
  for (const option of options) {
    const r = option.getBoundingClientRect()
    if (r.top < box.top - 1 || r.bottom > box.bottom + 1) continue
    tested++
    const x = Math.round(r.left + r.width / 2)
    const y = Math.round(r.top + r.height / 2)
    const hit = document.elementFromPoint(x, y)
    if (!(hit && (hit === option || option.contains(hit)))) {
      blocked.push({
        label: (option.textContent || '').trim().slice(0, 20),
        covered: hit ? `${hit.tagName}.${(hit.className || '').toString().split(' ')[0]}` : 'nothing',
      })
    }
  }
  return { options: options.length, tested, blocked }
}

// ─────────────────────────────────────────────────────────────────────────────
// The sweep, and its positive control
// ─────────────────────────────────────────────────────────────────────────────

test.describe('every tool surface renders operable controls and stays inside its width', () => {
  for (const route of SURFACES) {
    test(`${route} paints controls and never scrolls sideways`, async ({ page }) => {
      watch(page, `a designer opening ${route} on every device they own`)
      await go(page, route)

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 844 })
        await settle(page)
        const seen = await page.evaluate(surfaceProbe)

        // POSITIVE CONTROL — see surfaceProbe. Without this the two assertions
        // below are true of a blank page.
        expect(
          seen.controls,
          `PROBE READ NOTHING on ${route} @${width}: no operable control was visible, so every other assertion here would pass vacuously`,
        ).toBeGreaterThan(0)

        expect(
          seen.scrollWidth,
          `${route} @${width} overflows horizontally: document scrollWidth ${seen.scrollWidth} vs clientWidth ${seen.clientWidth}`,
        ).toBeLessThanOrEqual(seen.clientWidth + 1)
      }
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 1. Twelve options is a menu, not a tray — at every width
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the emoji category facet is a labelled control that opens a list', () => {
  test('it is a trigger, never a wrapped chip tray, at all ten widths', async ({ page }) => {
    watch(page, 'someone looking for an emoji on a phone')
    await go(page, '/create/emoji')

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 844 })
      await settle(page)

      const trigger = page.locator('.lbry-filtertrig')
      await expect(
        trigger,
        `@${width} the twelve-option category facet rendered as a chip tray instead of a trigger`,
      ).toHaveCount(1)

      // COMPUTED ROLE, not markup: the trigger must announce itself as a
      // disclosure, or a screen-reader user has no idea a list is behind it.
      await expect(trigger).toHaveAttribute('aria-haspopup', 'true')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')

      const tray = await page.locator('.lbry-filters').count()
      expect(tray, `@${width} the expanded tray is still in the DOM beside the trigger`).toBe(0)
    }
  })

  test('a phone sees emoji on the first screen, not six rows of chips', async ({ page }) => {
    watch(page, 'someone opening the emoji library on a phone and expecting emoji')

    for (const width of PHONE_WIDTHS) {
      // The viewport is set BEFORE the navigation, not after it. The grid is
      // virtualised off the container's measured width, and a phone arrives at
      // its own width rather than resizing into it — loading wide and then
      // narrowing measures a layout no user ever gets.
      await page.setViewportSize({ width, height: 844 })
      await go(page, '/create/emoji')
      await settle(page)

      // POSITIVE CONTROL, and it caught a hole in this very test: the probe
      // below reported `firstCellTop: -1` when the virtualiser had mounted
      // nothing yet, and -1 sails through a "must be above the fold" check. So
      // the cells are waited for first, and their absence fails here with a
      // sentence about the virtualiser rather than silently passing.
      await expect(
        page.locator('.emoji-vrow button').first(),
        `@${width} the virtualised grid mounted no cells at all, so nothing below could measure the fold`,
      ).toBeAttached({ timeout: 15_000 })

      const { toolbarHeight, firstCellTop, onFirstScreen } = await page.evaluate(() => {
        const toolbar = document.querySelector('.lbry-toolbar')
        const cells = [...document.querySelectorAll('.emoji-vrow button')]
        const vh = window.innerHeight
        return {
          toolbarHeight: toolbar ? Math.round(toolbar.getBoundingClientRect().height) : -1,
          firstCellTop: cells.length ? Math.round(cells[0].getBoundingClientRect().top) : -1,
          onFirstScreen: cells.filter((c) => {
            const r = c.getBoundingClientRect()
            return r.top < vh && r.bottom > 0
          }).length,
        }
      })

      // Was 414px at 320 and 373px at 390 — 49% and 44% of the viewport.
      expect(
        toolbarHeight,
        `@${width} the toolbar is ${toolbarHeight}px, over a third of an 844px screen, before any emoji`,
      ).toBeLessThan(844 / 3)

      // Was y=969 at 320 and y=912 at 390, both below an 844px fold.
      expect(
        firstCellTop,
        `@${width} the first emoji sits at y=${firstCellTop} on an 844px screen — below the fold`,
      ).toBeLessThan(844)

      expect(
        onFirstScreen,
        `@${width} an emoji library showed ${onFirstScreen} emoji on the first screen`,
      ).toBeGreaterThan(0)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 & 3. The menu it opens is actually clickable
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the filter menu opens somewhere a finger can reach it', () => {
  for (const theme of ['light', 'dark']) {
    test(`no option is covered by the nav or the hero, all ten widths, ${theme}`, async ({ page }) => {
      watch(page, `someone filtering the emoji library in ${theme} mode`)
      await page.emulateMedia({ colorScheme: theme })
      await go(page, '/create/emoji')

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 844 })
        await settle(page)

        const trigger = page.locator('.lbry-filtertrig').first()
        await trigger.click()
        await expect(trigger).toHaveAttribute('aria-expanded', 'true')
        await settle(page)

        const result = await page.evaluate(menuHitTest)
        expect(result.error, `@${width} ${theme}: ${result.error}`).toBeUndefined()

        // POSITIVE CONTROL for this probe too: a menu that rendered no
        // testable option would report zero blocked and look perfect.
        expect(
          result.tested,
          `@${width} ${theme} the hit-test examined no options at all, so "nothing is blocked" means nothing`,
        ).toBeGreaterThan(0)

        expect(
          result.blocked,
          `@${width} ${theme} options are visible but not clickable — covered by ${result.blocked.map((b) => b.covered).join(', ')}`,
        ).toEqual([])

        await page.keyboard.press('Escape')
        await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      }
    })
  }

  test('choosing a category closes the menu and hands focus back', async ({ page }) => {
    watch(page, 'a keyboard user picking an emoji category')
    await go(page, '/create/emoji')
    await page.setViewportSize({ width: 390, height: 844 })
    await settle(page)

    const trigger = page.locator('.lbry-filtertrig').first()
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    // A single-select menu that stays open leaves a 492px panel over the very
    // grid it just filtered.
    await expect(
      trigger,
      'picking a category left the menu open over the results it produced',
    ).toHaveAttribute('aria-expanded', 'false')

    // The trigger states the selection, so the collapsed group hides nothing.
    await expect(trigger).toContainText('Smileys')

    // POLLED, not read once. The focus hand-back is deliberately a frame late —
    // the menu unmounts first and the trigger is focused on the next
    // `requestAnimationFrame`, so a single read taken immediately after
    // `aria-expanded` flips is racing a frame that has not happened yet. This
    // assertion failed exactly that way once under full-suite load while
    // passing in isolation three times, which is the signature of a test
    // asserting a synchronous answer to an asynchronous question.
    await expect
      .poll(
        () => page.evaluate(() => document.activeElement?.classList.contains('lbry-filtertrig') ?? false),
        { message: 'focus was dropped instead of returning to the trigger', timeout: 5_000 },
      )
      .toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. A search that finds nothing says so, whichever catalogue it searched
// ─────────────────────────────────────────────────────────────────────────────

test.describe('a no-match icon search explains itself', () => {
  for (const width of [390, 1280]) {
    test(`@${width} the emptied grid is announced, not silent`, async ({ page }) => {
      watch(page, 'someone searching the icon library for a word it does not carry')
      await go(page, '/create/icons')
      await page.setViewportSize({ width, height: 900 })
      await settle(page)

      const grid = page.locator('.ig')
      const before = await grid.evaluate((el) => el.children.length)
      // POSITIVE CONTROL: if the grid never filled, emptying it proves nothing.
      expect(before, 'the icon grid never rendered any cells, so this test cannot detect it emptying').toBeGreaterThan(0)

      await page.locator('.lbry-search input').first().fill('zzzqqqxyz')
      await expect(async () => {
        expect(await grid.evaluate((el) => el.children.length)).toBe(0)
      }).toPass({ timeout: 10_000 })

      // The empty state is a live region, so the announcement and the visible
      // explanation are the same element — which is the point.
      const empty = page.locator('.pl-empty[role="status"]')
      await expect(
        empty,
        `@${width} the grid emptied to 0 cells with no empty state — a blank page under whatever banner happened to be showing`,
      ).toBeVisible({ timeout: 10_000 })
      await expect(empty).toContainText('zzzqqqxyz')

      // And it goes away again when something matches.
      await page.locator('.lbry-search input').first().fill('arrow')
      await expect(empty).toHaveCount(0, { timeout: 10_000 })
      expect(await grid.evaluate((el) => el.children.length)).toBeGreaterThan(0)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Nothing on these surfaces animates every property it owns
// ─────────────────────────────────────────────────────────────────────────────

test.describe('tool controls transition named properties, never `all`', () => {
  // `transition:all` asks the compositor to consider every animatable property
  // — layout ones included — for a hover that only changes colour. These three
  // were the lane's whole inventory.
  for (const [route, selector, reveal] of [
    ['/create/aspect-ratio', '.rc-flip', null],
    // The skin-tone swatches live inside the tone popover, so the control has
    // to be opened before there is anything to measure.
    ['/create/emoji', '.emoji-skin-btn', '.emoji-tone-btn'],
  ]) {
    test(`${selector} on ${route}`, async ({ page }) => {
      watch(page, `a designer hovering ${selector}`)
      await go(page, route)
      await page.setViewportSize({ width: 1280, height: 900 })
      await settle(page)
      if (reveal) {
        await page.locator(reveal).first().click()
        await settle(page)
      }

      const el = page.locator(selector).first()
      // POSITIVE CONTROL: a selector that matches nothing reads as compliant.
      await expect(el, `${selector} is not on ${route} — this assertion had nothing to check`).toHaveCount(1)

      const property = await el.evaluate((node) => getComputedStyle(node).transitionProperty)
      expect(
        property,
        `${selector} still transitions \`all\`, which includes every layout property it owns`,
      ).not.toBe('all')
      expect(property).toContain('background-color')
    })
  }
})
