// Type Scale: the scale owns the first screen (card 28ac352e47).
//
// The page used to open on a 150px catalogue notice, a settings card of weight
// pills, and its own foot bar (.tsc-dock) holding Save and Copy CSS, with the
// first step of the ladder below the fold. The build moves the work up and hands
// the foot of the screen to the shell:
//
//   - the page's own dock and Code drawer are gone; Copy CSS is the shell's phone
//     primary (.tl-dock), and Save is a 44px icon on the toolbar row;
//   - the toolbar stays one row at 320, 390 and 768;
//   - the first ladder row starts at or under 340px on a phone;
//   - the view switch and the width menu share a row;
//   - weights are one menu per family, not rows of pills;
//   - at 1440 the right half has a Page | Code switch and Code is a view there;
//   - the catalogue notice sits inside the Fonts section, not above the work.
//
// Each check names the change that turns it red under MUTATION. The spec was seen
// to fail against a main-like build (before this change); the run is in the card
// notes. Numbers here are the design spec's (memory/designs/design-2026-11-06-
// type-scale-28ac352e47.md, section 9), written out by hand, not read from the app.
import { test, expect } from './base.js'
import { go, signIn, watch, chooseMenuOption } from './helpers.js'
import { settleTypeScaleView, showTypeScaleCode } from './type-scale-view.js'

const ROUTE = '/create/type-scale'
const TOUCH = { hasTouch: true, isMobile: true }

/** The 44px floor for a touch target, with half a pixel for sub-pixel layout. */
const TOUCH_MIN = 43.5

const box = (locator) => locator.boundingBox()

/** The offline notice: the page's own way to show the catalogue notice on demand. */
// The catalogue falls back to the bundled list when both of its sources fail (as
// spec 192 does it). Going offline also raises the app's own offline banner over
// every page, which is not this page's notice, so the first-screen check uses this.
async function failCatalogue(page) {
  await page.route('**/data/font-catalogue.json', (route) => route.abort())
  await page.route('**/api/fonts', (route) => route.abort())
}

async function showCatalogueNotice(page) {
  await page.context().setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.locator('.typ-notice').first()).toBeAttached()
}

async function toolbarRow(page) {
  return page.locator('[data-tool-toolbar]').evaluate((bar) => {
    const kids = [...bar.children].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).position !== 'absolute'
    })
    const centres = kids.map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + r.height / 2) })
    return {
      children: kids.length,
      spread: Math.max(...centres) - Math.min(...centres),
      right: Math.round(Math.max(...kids.map((el) => el.getBoundingClientRect().right))),
      vw: window.innerWidth,
      height: Math.round(bar.getBoundingClientRect().height),
    }
  })
}

const horizontalOverflow = (page) => page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
  wide: [...document.querySelectorAll('body *')]
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && !el.closest('pre, .sr-only, [aria-hidden="true"]')
    })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`),
}))

// ── The foot of the screen ────────────────────────────────────────────────────
test.describe('Type Scale · the foot of the screen belongs to the shell', () => {
  test.describe('390 touch', () => {
    test.use({ viewport: { width: 390, height: 844 }, ...TOUCH })

    // MUTATION: render a `.tsc-dock` back in TypeScale.jsx, or pass `toolbarPrimary`
    // instead of `primary` on a phone, and this goes red.
    test('there is no page dock, and the shell dock holds Copy CSS and nothing else', async ({ page }) => {
      watch(page, 'someone copying a scale on a phone')
      await go(page, ROUTE)
      await expect(page.locator('.tsc-row').first()).toBeVisible()

      await expect(page.locator('.tsc-dock'), 'the page’s own dock is gone').toHaveCount(0)
      const dock = page.locator('.tl-dock')
      await expect(dock, 'the shell dock is the phone’s foot bar').toBeVisible()
      await expect(dock.getByRole('button'), 'one action in the dock').toHaveCount(1)
      await expect(dock.getByRole('button', { name: 'Copy CSS', exact: true })).toBeVisible()
      await expect(dock.locator('a, input, select, [role="button"]'), 'nothing else is in the dock').toHaveCount(0)
      await expect(dock.getByRole('button', { name: /save/i }), 'Save is not in the dock').toHaveCount(0)
    })
  })

  for (const [width, height] of [[768, 1024], [1440, 900]]) {
    test(`at ${width} there is no page dock and no shell dock`, async ({ page }) => {
      watch(page, `someone on a ${width}px screen`)
      await page.setViewportSize({ width, height })
      await go(page, ROUTE)
      await expect(page.locator('.tsc-row').first()).toBeVisible()
      await expect(page.locator('.tsc-dock')).toHaveCount(0)
      await expect(page.locator('[data-tl-dock]')).toHaveCount(0)
      await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Copy CSS', exact: true }), 'Copy CSS is on the toolbar from 768').toBeVisible()
    })
  }
})

// ── Save ──────────────────────────────────────────────────────────────────────
test.describe('Type Scale · Save is a toolbar icon on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, ...TOUCH })

  // MUTATION: drop the `save` toolbar item on a phone, give `.tsc-save--icon` a
  // 36px box, or move Save back into a foot bar.
  test('it is an icon button with a 44px hit area inside the toolbar', async ({ page }) => {
    watch(page, 'someone saving a scale from a phone')
    await go(page, ROUTE)
    const bar = page.locator('[data-tool-toolbar]')
    const save = bar.getByRole('button', { name: 'Save to a project' })
    await expect(save, 'Save is on the toolbar row, not in More or a foot bar').toBeVisible()

    const b = await box(save)
    const t = await box(bar)
    expect(b.width, 'a 44px target wide').toBeGreaterThanOrEqual(TOUCH_MIN)
    expect(b.height, 'a 44px target tall').toBeGreaterThanOrEqual(TOUCH_MIN)
    expect(b.x, 'inside the toolbar, left').toBeGreaterThanOrEqual(t.x)
    expect(b.x + b.width, 'inside the toolbar, right').toBeLessThanOrEqual(t.x + t.width)
    expect(b.y, 'inside the toolbar, top').toBeGreaterThanOrEqual(t.y - 0.5)
    expect(b.y + b.height, 'inside the toolbar, bottom').toBeLessThanOrEqual(t.y + t.height + 0.5)

    // An icon: the words are the name, not on the face of the button.
    const face = await save.evaluate((el) => [...el.querySelectorAll('*')]
      .filter((n) => n.children.length === 0 && n.textContent.trim() && n.getBoundingClientRect().width > 0 && getComputedStyle(n).visibility !== 'hidden')
      .map((n) => n.textContent.trim()))
    expect(face, 'no visible words on the icon button').toEqual([])
    // The centre of the target is the button, not something drawn over it.
    expect(await save.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))
    }), 'a tap on the centre lands on Save').toBe(true)
  })

  // MUTATION: mount SaveTypeSystemPanel inside the toolbar on a phone (its
  // backdrop-filter pins a fixed child to the toolbar), or drop the ≤560 rule on
  // `.svt-menu`.
  test('its menu opens as a sheet over the page, not a popover under the toolbar', async ({ page }) => {
    watch(page, 'signed in designer saving a scale from a phone')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, ROUTE)
    const save = page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Save to a project' })
    await save.tap()
    await expect(save).toHaveAttribute('aria-expanded', 'true')

    const menu = page.locator('.svt-menu')
    await expect(menu).toBeVisible()
    await expect(page.locator('[data-tool-toolbar] .svt-menu'), 'the menu is not inside the toolbar').toHaveCount(0)
    expect(await menu.evaluate((el) => getComputedStyle(el).position), 'a sheet is fixed to the screen').toBe('fixed')
    // It settles (the sheet rises), then it is whole on the screen and sits at the foot.
    await expect.poll(async () => Math.round((await box(menu)).y + (await box(menu)).height), { message: 'the sheet never came to rest' }).toBeLessThanOrEqual(844)
    const m = await box(menu)
    expect(m.x, 'whole on the screen, left').toBeGreaterThanOrEqual(0)
    expect(m.x + m.width, 'whole on the screen, right').toBeLessThanOrEqual(390)
    expect(m.y, 'whole on the screen, top').toBeGreaterThanOrEqual(0)
    const toolbarBottom = (await box(page.locator('[data-tool-toolbar]'))).y + (await box(page.locator('[data-tool-toolbar]'))).height
    expect(m.y, 'the sheet is a bottom sheet, not hanging from the toolbar').toBeGreaterThan(toolbarBottom + 40)
  })
})

// ── The toolbar ───────────────────────────────────────────────────────────────
test.describe('Type Scale · the toolbar is one row', () => {
  for (const [width, height, touch] of [[320, 700, true], [390, 844, true], [768, 1024, false]]) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height }, ...(touch ? TOUCH : {}) })

      // MUTATION: put `Copy font import` back at a priority that keeps it on the
      // phone row, or let `.tsc-primary-group` wrap; the row gets a second line.
      test(`${width}px: every part of the toolbar sits on one line and none runs off the screen`, async ({ page }) => {
        watch(page, `someone using Type Scale at ${width}px`)
        await go(page, ROUTE)
        await expect(page.getByRole('heading', { level: 1, name: 'Type Scale' })).toBeAttached()
        await expect(page.locator('[data-tool-toolbar]')).not.toHaveClass(/is-measuring/)

        const row = await toolbarRow(page)
        expect(row.children, 'the toolbar drew its parts').toBeGreaterThanOrEqual(3)
        expect(row.spread, `${width}px: parts sit on different lines (${row.spread}px apart)`).toBeLessThanOrEqual(2)
        expect(row.right, `${width}px: the toolbar runs ${row.right - row.vw}px past the screen`).toBeLessThanOrEqual(row.vw)
        expect(row.height, `${width}px: the toolbar is ${row.height}px tall, which is two rows`).toBeLessThan(72)
      })
    })
  }
})

// ── The first screen ──────────────────────────────────────────────────────────
test.describe('Type Scale · the ladder starts on the first screen of a phone', () => {
  for (const [width, height] of [[390, 844], [320, 700]]) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height }, ...TOUCH })

      // MUTATION: put the catalogue notice back above the work, or let the width
      // menu drop to its own row; the first row falls below 340px (it was at
      // y=590 before this build).
      test(`${width}px: the first step starts at or under 340px, with the catalogue loaded and with it degraded`, async ({ page }) => {
        watch(page, `someone opening Type Scale on a ${width}px phone`)
        await go(page, ROUTE)
        const first = page.locator('.tsc-row').first()
        await expect(first).toBeVisible()
        expect(await page.evaluate(() => window.scrollY), 'measured from the top of the page').toBe(0)
        const loaded = await box(first)
        expect(loaded.y, `${width}px: the first step starts ${Math.round(loaded.y)}px down`).toBeLessThanOrEqual(340)

        await failCatalogue(page)
        await go(page, ROUTE)
        await expect(page.locator('.typ-notice').first(), 'the catalogue did not fall back').toBeAttached()
        await expect(first).toBeVisible()
        expect(await page.evaluate(() => window.scrollY)).toBe(0)
        const degraded = await box(first)
        expect(degraded.y, `${width}px: with the catalogue notice up the first step starts ${Math.round(degraded.y)}px down`).toBeLessThanOrEqual(340)
      })
    })
  }
})

// ── The view bar ──────────────────────────────────────────────────────────────
test.describe('Type Scale · the view switch and the width menu are one bar', () => {
  for (const [width, height, touch] of [[390, 844, true], [768, 1024, false]]) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height }, ...(touch ? TOUCH : {}) })

      // MUTATION: take the width menu out of `.tsc-view-bar`, or let the bar wrap.
      test(`${width}px: Scale | Page | Code and Preview width share a top`, async ({ page }) => {
        watch(page, `someone choosing a view at ${width}px`)
        await go(page, ROUTE)
        expect(await settleTypeScaleView(page)).toBe('switch')
        const tabs = page.locator('.tsc-view-switch')
        const widthMenu = page.locator('#tsc-width')
        await expect(tabs).toBeVisible()
        await expect(widthMenu).toBeVisible()
        const a = await box(tabs)
        const b = await box(widthMenu)
        // Both are in the same bar. Controls of different heights centre on one line, so compare the centres; the tops follow within the height difference.
        expect(Math.abs((a.y + a.height / 2) - (b.y + b.height / 2)), `${width}px: the switch and the width menu are on different lines`).toBeLessThanOrEqual(2)
        expect(Math.abs(a.y - b.y), `${width}px: their tops differ by ${Math.abs(a.y - b.y)}px`).toBeLessThanOrEqual(Math.abs(a.height - b.height) / 2 + 2)
        expect(b.x, 'the width menu is to the right of the switch').toBeGreaterThanOrEqual(a.x + a.width - 1)
      })
    })
  }
})

// ── Weight ────────────────────────────────────────────────────────────────────
test.describe('Type Scale · weight is a menu', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  // MUTATION: put the weight pills (`.tsc-weights`) back for either family.
  test('768px: each family has a weight menu and no row of weight pills', async ({ page }) => {
    watch(page, 'designer choosing a weight')
    await go(page, ROUTE)
    for (const [id, family] of [['#tsc-hweight', 'Heading'], ['#tsc-bweight', 'Body']]) {
      const trigger = page.locator(id)
      await expect(trigger, `${family} weight is a menu`).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
      await expect(trigger).toContainText('Weight')
    }
    await expect(page.locator('.tsc-weights'), 'no pills for weight').toHaveCount(0)
    await expect(page.locator('.tsc-weight'), 'no pills for weight').toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Heading weight' })).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Body weight' })).toHaveCount(0)

    // The menu does the job the pills did: Inter lists its weights, and one choice restyles the heading steps.
    await chooseMenuOption(page, page.locator('#tsc-hweight'), '300')
    await expect(page.locator('#tsc-hweight')).toContainText('300')
    await expect.poll(() => page.locator('.tsc-row-text--heading').first().evaluate((el) => getComputedStyle(el).fontWeight)).toBe('300')
  })
})

// ── Code at 1440 ──────────────────────────────────────────────────────────────
test.describe('Type Scale · at 1440 Code is a view beside the scale', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // MUTATION: remove the `.tsc-half-switch`, render the code only in a drawer, or
  // read `formatPills` / `exportPre` before they are declared (the page throws
  // when Code is pressed: ErrorBoundary).
  test('the Page | Code switch shows the export beside the ladder, and Copy CSS copies it', async ({ page }) => {
    watch(page, 'developer taking the scale into code at 1440')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await go(page, ROUTE)
    expect(await settleTypeScaleView(page)).toBe('split')

    const half = page.locator('.tsc-half-switch')
    await expect(half.getByRole('button', { name: 'Page', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(half.getByRole('button', { name: 'Code', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('#tsc-export'), 'the export is not up until Code is pressed').toHaveCount(0)

    await showTypeScaleCode(page)
    await expect(half.getByRole('button', { name: 'Code', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.tsc-error, [data-error-boundary]'), 'the page did not fall over').toHaveCount(0)
    const exportBox = page.locator('#tsc-export')
    await expect(exportBox).toContainText('--text-base: clamp(')
    await expect(exportBox).toContainText('--leading: 1.5;')
    await expect(page.locator('.tsc-fmt'), 'the four formats come with it').toBeVisible()
    await expect(page.locator('.tsc-fmt').getByRole('button')).toHaveText(['CSS variables', 'Tailwind v4', 'Tailwind v3', 'SCSS'])
    // Code is a view beside the scale, not instead of it.
    const ladder = await box(page.locator('.tsc-ladder'))
    const code = await box(exportBox)
    expect(ladder.x + ladder.width, 'the ladder is still the left half').toBeLessThanOrEqual(code.x + 1)
    await expect(page.locator('.tsc-row').first()).toBeVisible()
    await expect(page.locator('[data-tl-dock], .tsc-dock, #tsc-code-drawer'), 'no bar or drawer at the foot').toHaveCount(0)

    await page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Copy CSS', exact: true }).click()
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('--text-base: clamp(')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('--leading: 1.5;')

    // Back to the page: the article returns and the export goes.
    await half.getByRole('button', { name: 'Page', exact: true }).click()
    await expect(page.locator('.tsc-article')).toBeVisible()
    await expect(exportBox).toHaveCount(0)
  })
})

// ── The catalogue notice ──────────────────────────────────────────────────────
test.describe('Type Scale · the catalogue notice is part of the Fonts section', () => {
  for (const [width, height, touch] of [[1440, 900, false], [390, 844, true]]) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height }, ...(touch ? TOUCH : {}) })

      // MUTATION: render `<FontCatalogNotice>` above `<ToolGrid>` again; the notice
      // is a card over the work and `.typ-notice` has no `.tsc-fonts` parent.
      test(`${width}px: every .typ-notice is inside .tsc-fonts`, async ({ page }) => {
        watch(page, 'someone on Type Scale with the font catalogue down')
        await go(page, ROUTE)
        await expect(page.locator('.tsc-fonts'), 'the Fonts section exists').toHaveCount(1)
        await showCatalogueNotice(page)
        const notices = page.locator('.typ-notice')
        expect(await notices.count(), 'a notice is up').toBeGreaterThan(0)
        const outside = await notices.evaluateAll((els) => els.filter((el) => !el.closest('.tsc-fonts')).map((el) => el.textContent.trim().slice(0, 40)))
        expect(outside, 'notices outside the Fonts section').toEqual([])
        await expect(page.locator('.tsc-fonts .typ-notice')).toContainText('offline')
      })
    })
  }
})

// ── Overflow ──────────────────────────────────────────────────────────────────
test.describe('Type Scale · nothing scrolls sideways on a phone', () => {
  for (const [width, height] of [[320, 700], [390, 844]]) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height }, ...TOUCH })

      // MUTATION: give the ladder row, the toolbar or the code well a fixed width
      // wider than the phone.
      test(`${width}px: the page is no wider than the screen in the Scale, Page and Code views and with the sheet open`, async ({ page }) => {
        watch(page, `someone on a ${width}px phone`)
        await go(page, ROUTE)
        await expect(page.locator('.tsc-row').first()).toBeVisible()

        const seen = []
        const measure = async (what) => {
          const o = await horizontalOverflow(page)
          seen.push({ what, ...o })
        }
        await measure('Scale view')
        await page.getByRole('tab', { name: 'Page' }).tap()
        await expect(page.locator('.tsc-article')).toBeVisible()
        await measure('Page view')
        await page.getByRole('tab', { name: 'Code' }).tap()
        await expect(page.locator('#tsc-export')).toBeVisible()
        await measure('Code view')
        await page.getByRole('tab', { name: 'Scale' }).tap()
        await page.getByRole('button', { name: /^Families, preview text/ }).tap()
        await expect(page.locator('#tsc-sheet')).toBeVisible()
        await measure('settings sheet')

        for (const s of seen) {
          expect(s.scroll, `${width}px ${s.what}: the page is ${s.scroll}px wide (${s.wide.join(', ')})`).toBeLessThanOrEqual(s.client)
        }
      })
    })
  }
})

// ── The free-cap wall ─────────────────────────────────────────────────────────
test.describe('Type Scale · the free-cap wall points at the plans', () => {
  for (const [width, height, touch] of [[390, 844, true], [1440, 900, false]]) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height }, ...(touch ? TOUCH : {}) })

      // MUTATION: change the wall button's `to` in SaveTypeSystem.jsx from /plans.
      test(`${width}px: at three saved projects the wall's button goes to /plans`, async ({ page }) => {
        watch(page, 'free designer at the project cap keeping a type scale')
        // The free plan saves up to 3 projects (spec 72 reads the same number from the app).
        await signIn(page, { plan: 'free', projects: 3 })
        await go(page, ROUTE)
        const save = page.locator('[data-tool-toolbar]').getByRole('button', { name: 'Save to a project' })
        if (touch) await save.tap(); else await save.click()
        const wall = page.getByTestId('type-save-wall')
        await expect(wall, 'the cap wall is shown').toBeVisible()
        await expect(wall.locator('.svt-wall-btn')).toHaveAttribute('href', '/plans')
        await expect(page.locator('.svt-save'), 'no way to save past the cap').toHaveCount(0)
      })
    })
  }
})
