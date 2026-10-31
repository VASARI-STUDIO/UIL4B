// The brand kit walkthrough, driven the way a person drives it.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS SPEC OPENS THE MEGA MENU INSTEAD OF NAVIGATING TO A STEP
// ─────────────────────────────────────────────────────────────────────────────
// Because the thing that was broken was the WIRING, not the parts. Every piece
// of the old flow was correct in isolation: UIKIT_STEPS listed four steps, the
// step bar rendered, the intro dialog rendered, the menu card offered the CTA.
// What did not work was the one line joining them — the CTA navigated to
// `/create/color`, which had quietly become the colour sales page, so the flow
// began on a screen that rendered none of those correct parts.
//
// A spec that navigated straight to `/create/palette` and asserted the rail
// would have passed on the BROKEN build, because the rail was never the defect.
// So every test below that matters starts from the real front door: open the
// Create menu, press the real button, and see where a person actually lands.
// Reverting the call site to `/create/color` fails these on the landing
// assertion, which is the mutation this file was checked against.
//
// The suite runs signed out, and that is the right coverage here: the
// walkthrough reads and writes ProjectContext's `design`, which is
// localStorage-backed and works with no account. Saving a PROJECT needs one;
// building a system does not.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { setSeed } from './palette-helpers.js'

const GUIDE_KEY = 'vs-uikit-guide'
const SEEN_KEY = 'vs-uikit-guide-seen'
const DESIGN_KEY = 'vs-current-design'

/**
 * A clean visitor.
 *
 * DELIBERATELY A NO-OP, and the comment is the point. The first draft cleared
 * localStorage from an addInitScript — which Playwright runs before EVERY
 * document, not once — so it wiped the in-progress flag on every navigation
 * inside a test, and the rail correctly vanished half way through a flow. The
 * spec was testing its own fixture.
 *
 * Playwright already gives each test its own browser context with empty
 * storage, so "clean" needs no work at all. Seeding, which genuinely must
 * survive to the destination, is what addInitScript is for — see seedDesign.
 */
async function fresh() { /* each test gets a fresh context; nothing to clear */ }

/** Seed a design as though the visitor had already built these parts. */
async function seedDesign(page, patch) {
  await page.addInitScript(([key, value]) => {
    try { localStorage.setItem(key, value) } catch { /* ignore */ }
  }, [DESIGN_KEY, JSON.stringify(patch)])
}

/**
 * Where the Create mega menu actually lives now.
 *
 * Every test below started on `/home`, which was the app shell wearing the old
 * homepage. `/` and `/home` both render src/pages/Spectrum.jsx since the route
 * swap, and Spectrum mounts `<PillNav variant="spectrum" />` — SpectrumNav,
 * a marketing pill with its own full-screen menu — so there is no `.pnav-*`
 * mega menu on the front door at all, and `getByRole('button', {name:'Create'})`
 * timed out on all seven. The menu itself did not change: the app header still
 * renders on /discover, /learn and every /create/* route, with the same three
 * triggers and the same `.pnav-editorial-cta`. Verified in a browser on
 * /discover before this was re-pointed — the CTA reads "Build a brand kit",
 * 249px wide, exactly as it did on /home.
 *
 * This is the walkthrough's entry point, not a page under test: what matters is
 * that the visitor starts somewhere the mega menu exists.
 */
const MENU_ROUTE = '/discover'

/**
 * Press the brand-kit button in the Create mega menu — the real front door.
 *
 * The panel is hover/focus driven and closes on mouse leave, so the trigger is
 * pressed and the CTA is waited for rather than assumed present.
 */
async function pressBrandKit(page) {
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const cta = page.locator('.pnav-editorial-cta')
  await expect(cta).toBeVisible()
  const label = (await cta.textContent()).trim()
  await cta.click()
  return label
}

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })
const card = (page) => page.getByRole('dialog', { name: /^Step [1-4] of 4: / })

/**
 * Wait for an element's entrance animation to FINISH before measuring or
 * capturing it.
 *
 * The card animates cp-rise, which runs opacity 0 -> 1. The first capture of it
 * caught the fade part-way and the palette board's swatch labels ghosted
 * through a card that is fully opaque once settled — a screenshot that would
 * have been read as a stacking bug.
 *
 * Asks the ANIMATION LAYER whether it has finished rather than sleeping for a
 * plausible number of milliseconds: a stopwatch passes on a fast machine and
 * lies on a slow one, and two equal pixel reads prove only that nothing moved
 * between them.
 *
 * Only finite animations are awaited. The help button's chromatic outline spins
 * forever while it is hovered or keyboard-focused (focus returns to it when the
 * panel closes), and an infinite animation never finishes.
 */
async function settle(locator) {
  await locator.evaluate((el) => Promise.all(
    el.getAnimations({ subtree: true })
      .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
      .map((a) => a.finished.catch(() => {})),
  ))
}

/**
 * Wait until the element is actually ON SCREEN, not merely in the document.
 *
 * `toBeVisible()` means "has a box and is not hidden" — it says nothing about
 * the viewport. The rail is `position:sticky; bottom:20px` at the end of pages
 * from 1154px to 3189px tall, so "present" and "on screen" are genuinely
 * different questions here, and the one that matters to a person is the second.
 * It also gives the destination time to finish arriving: the first capture of
 * the Icons step caught the library still printing "Opening the icon library".
 */
async function inView(locator) {
  // expect.poll RE-RESOLVES the locator on every attempt, and that is the point
  // rather than a detail. The first version captured the node once and span a
  // requestAnimationFrame loop on it; when React re-rendered the rail while the
  // Icons step was still arriving — which four parallel workers make likely —
  // the captured node detached, a detached node measures all zeros, and the loop
  // could never finish. It failed as a 30s timeout inside the helper, which
  // points at the wrong thing.
  await expect.poll(async () => {
    const box = await locator.boundingBox()
    if (!box || box.height <= 0) return false
    const vh = await locator.page().evaluate(() => window.innerHeight)
    return box.y < vh && box.y + box.height > 0
  }, {
    timeout: 15000,
    message: 'the walkthrough rail never came on screen — it is sticky at the foot of '
      + 'the page, and being present in the document is not the same as being to hand',
  }).toBe(true)
}

test.describe('Brand kit walkthrough', () => {
  test('the nav CTA lands on a working step one, not on a sales page', async ({ page }) => {
    watch(page, 'designer starting a brand system from the navigation')
    await fresh(page)
    await go(page, MENU_ROUTE)

    const label = await pressBrandKit(page)
    expect(label).toBe('Build a brand kit')

    // THE ASSERTION THE DEFECT WOULD HAVE FAILED. /create/color renders
    // ColorLanding, whose H1 is "One colour system, start to finish." — a page
    // of links. Step one has to be the tool.
    await expect(page).toHaveURL(/\/create\/palette$/)
    // The h1 is sr-only while the page's lede is unwritten (founder struck the
    // visible "Palette Generator"), so this asserts it is
    // ATTACHED rather than visible — it still names the board via
    // aria-labelledby, and the visible proof that the right route arrived is
    // the seed chip below.
    await expect(page.getByRole('heading', { name: 'Palette Generator', exact: true })).toBeAttached()
    await expect(page.locator('.plb-seedchip')).toBeVisible()

    // And the flow is actually running on it.
    await expect(rail(page)).toBeVisible()
    await expect(rail(page)).toContainText('Step 1 of 4')
    await inView(rail(page))
    await settle(rail(page))

    await page.screenshot({
      path: test.info().outputPath('brand-kit-step-one.png'),
      fullPage: false,
    })
  })

  test('Suggest suspends the orientation card and closing restores the same card', async ({ page }) => {
    await go(page, MENU_ROUTE)
    await pressBrandKit(page)
    const guide = page.locator('.bkit-card')
    await expect(guide).toBeVisible()
    await settle(guide)
    const before = await guide.boundingBox()
    const node = await guide.elementHandle()
    const seen = await page.evaluate(key => localStorage.getItem(key), SEEN_KEY)
    await page.getByRole('button', { name: 'Suggest variations and brands', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Suggest', exact: true })).toBeVisible()
    await expect(guide).toBeHidden()
    await expect(guide).toHaveAttribute('aria-hidden', 'true')
    await expect(guide).toHaveAttribute('inert', '')
    await expect(card(page)).toHaveCount(0)
    await expect(rail(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(guide).toBeVisible()
    await settle(guide)
    await expect(guide).not.toHaveAttribute('aria-hidden', 'true')
    await expect(guide).not.toHaveAttribute('inert', '')
    expect(await node.evaluate(el => el === document.querySelector('.bkit-card'))).toBe(true)
    expect(await guide.boundingBox()).toEqual(before)
    expect(await page.evaluate(key => localStorage.getItem(key), SEEN_KEY)).toBe(seen)
    await expect(page.getByRole('button', { name: 'Suggest variations and brands', exact: true })).toBeFocused()
    await guide.getByRole('button', { name: 'Start with colours' }).click()
    await expect(guide).toHaveCount(0)
  })

  test('the orientation card is offered over step one and does NOT block it', async ({ page }) => {
    watch(page, 'designer reading the explanation while the tool stays live')
    await fresh(page)
    await go(page, MENU_ROUTE)
    await pressBrandKit(page)

    await expect(card(page)).toBeVisible()

    // NOT A MODAL, and this is the founder's actual requirement rather than a
    // styling preference: "go straight into step 1 then provide a popup". The
    // step behind has to remain usable WHILE the card is up. So: type into the
    // tool's own field with the card open and watch the tool respond.
    await setSeed(page, '#3366FF')
    await expect(page.locator('.plb-seedchip-hex')).toHaveText('#3366FF')
    await expect(card(page)).toBeVisible()      // still there, still not in the way
    await expect(page.locator('.plb-col').first()).toBeVisible()
    await settle(card(page))

    // No scrim layer, and the page is not scroll-locked. Both are how the old
    // version blocked the step: position:fixed inset:0 with a backdrop blur.
    const blocked = await page.evaluate(() => ({
      overlay: !!document.querySelector('.uikit-intro-overlay'),
      bodyLocked: getComputedStyle(document.documentElement).overflow === 'hidden' || getComputedStyle(document.body).overflow === 'hidden',
    }))
    expect(blocked.overlay).toBe(false)
    expect(blocked.bodyLocked).toBe(false)

    await page.screenshot({
      path: test.info().outputPath('brand-kit-card-over-live-tool.png'),
      fullPage: false,
    })
  })

  test('Escape closes the card and focus comes back to a real control', async ({ page }) => {
    watch(page, 'keyboard user dismissing the explanation')
    await fresh(page)
    await go(page, MENU_ROUTE)
    await pressBrandKit(page)

    await expect(card(page)).toBeVisible()
    // It takes focus when it opens, which is what makes Escape work at once.
    await expect(card(page)).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(card(page)).toBeHidden()

    // Focus must not be dumped on <body>. The rail's trigger is the fallback,
    // and it is always mounted.
    const landed = await page.evaluate(() => document.activeElement?.className || '')
    expect(landed).not.toBe('')
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false)
  })

  test('the card is offered once, and stays reachable afterwards', async ({ page }) => {
    watch(page, 'returning designer who does not want to be re-taught')
    await fresh(page)
    await go(page, MENU_ROUTE)
    await pressBrandKit(page)
    await expect(card(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(card(page)).toBeHidden()

    // Come back to step one: it must not re-open on its own.
    await go(page, '/create/palette')
    await expect(rail(page)).toBeVisible()
    await expect(card(page)).toBeHidden()

    // But it is not gone — the failure mode the founder-note item recorded
    // about one-time popups is that they become unreachable.
    await page.getByRole('button', { name: /What.s this\?/ }).click()
    await expect(card(page)).toBeVisible()
  })

  test('state carries between steps: step four can see what step one built', async ({ page }) => {
    watch(page, 'designer checking the system holds together across steps')
    await fresh(page)
    await go(page, MENU_ROUTE)
    await pressBrandKit(page)
    await expect(card(page)).toBeVisible()
    await page.keyboard.press('Escape')

    // Do real work in step one, through the tool's own control.
    await setSeed(page, '#B5179E')
    await expect(rail(page)).toContainText('Step 1 of 4')
    await expect(rail(page).getByRole('link', { name: /Colours/ })).toHaveClass(/is-done/)

    // Walk forward with the rail's own Next, the way the flow is meant to run.
    await page.getByRole('button', { name: /^Next: Fonts/ }).click()
    await expect(page).toHaveURL(/\/create\/font-pair$/)
    await expect(rail(page)).toBeVisible()

    // Jump to the last step. The colour step still reads as done AND still
    // shows its swatches — that is the whole point of a guided flow rather than
    // four bookmarks, and it is carried by the saved design, not by a cursor.
    // The bar shows a built step's artefact only once its content box is 1240px
    // wide (a container query). Below that the bar is one row of steps
    // and buttons with no swatches, and the colours step one built are in the
    // help panel; at 1440px the bar carries them itself.
    await page.getByRole('link', { name: /Icons/ }).first().click()
    await expect(page).toHaveURL(/\/create\/icons$/)
    const colourChip = rail(page).getByRole('link', { name: /Colours/ })
    await expect(colourChip).toHaveClass(/is-done/)
    // Read in one go from the DOM: the rail remounts while the Icons step
    // arrives, and a locator-level toBeHidden() passes in that empty moment.
    // 'absent' is not 'hidden', so only swatches that exist AND are not
    // displayed satisfy this.
    const barSwatches = () => rail(page).evaluate((el) => {
      const sw = [...el.querySelectorAll('.bkit-step-swatches')]
      if (!sw.length) return 'absent'
      return sw.every((s) => getComputedStyle(s).display === 'none') ? 'hidden' : 'shown'
    })
    const built = await page.evaluate((k) => (JSON.parse(localStorage.getItem(k) || '{}').palette?.colors || []).length, DESIGN_KEY)
    expect(built, 'step one saved no colours').toBeGreaterThan(0)
    await expect.poll(barSwatches, { message: 'the bar does not show the colours step one built at 1440px' }).toBe('shown')
    await expect(rail(page).locator('.bkit-step.is-done .bkit-step-swatch')).toHaveCount(built)
    await page.setViewportSize({ width: 1100, height: 900 })
    await expect.poll(barSwatches, { message: 'the bar shows swatches below 1240px of bar width; they live in the help panel there' }).toBe('hidden')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('button', { name: /What.s this\?/ }).click()
    await expect(card(page)).toBeVisible()
    await expect(card(page).locator('.bkit-card-artefact .bkit-step-swatch')).toHaveCount(built)
    await page.keyboard.press('Escape')
    await expect(card(page)).toBeHidden()
    await expect(rail(page)).toContainText('Step 4 of 4')
    // The rail has to be ON SCREEN here, on the tallest page in the flow — this
    // is the claim that it is always to hand, not merely always rendered.
    await inView(rail(page))
    await settle(rail(page))

    await page.screenshot({
      path: test.info().outputPath('brand-kit-step-four-sees-step-one.png'),
      fullPage: false,
    })
  })

  test('you can leave the flow mid-way and be resumed at the gap, not restarted', async ({ page }) => {
    watch(page, 'designer coming back to a half-built system on another day')
    await fresh(page)
    // A palette already built, nothing else — the state of someone who did step
    // one, closed the tab, and came back. The flag is localStorage now, so it
    // survives; that is what makes the flow resumable rather than a session.
    await seedDesign(page, {
      palette: { base: '#0051FF', harmony: 'auto', colors: ['#123456', '#654321', '#ABCDEF'], activeIdx: 0, extraColors: [] },
    })
    await page.addInitScript((k) => { try { localStorage.setItem(k, '1') } catch { /* ignore */ } }, GUIDE_KEY)

    await go(page, MENU_ROUTE)
    const label = await pressBrandKit(page)

    // The control says which of the two things it is about to do. A button
    // reading "Build a brand kit" that then drops you at step two has lied.
    expect(label).toBe('Resume: Fonts')
    await expect(page).toHaveURL(/\/create\/font-pair$/)
    await expect(rail(page)).toContainText('Step 2 of 4')

    // And it does NOT re-teach: the card is not thrown up again on resume.
    await expect(card(page)).toBeHidden()
  })

  test('leaving the walkthrough ends it where the person is', async ({ page }) => {
    watch(page, 'designer stopping part-way through')
    await fresh(page)
    await go(page, MENU_ROUTE)
    await pressBrandKit(page)
    await page.keyboard.press('Escape')

    const before = page.url()
    await page.getByRole('button', { name: 'Leave the walkthrough' }).click()

    // The X closes the rail in place: same page, work untouched,
    // nothing sent to /projects.
    await expect(rail(page)).toBeHidden()
    expect(page.url()).toBe(before)
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(page.locator('.plb-seedchip')).toBeVisible()

    // The rail is gone from the tools until the flow is started again.
    await go(page, '/create/palette')
    await expect(rail(page)).toBeHidden()
  })

  // The desktop bar is chrome, not a card: full-bleed, 56px, fixed flush to the
  // foot of the viewport, with no radius or shadow. Measured, not read from the
  // stylesheet, so a rule that stops applying fails here.
  test('1440px: the bar is a flush 56px strip with no radius or shadow, and on Colours it sits on the Adjust-all row', async ({ page }) => {
    watch(page, 'designer on a desktop with the walkthrough bar up')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript(([g, s]) => {
      try { localStorage.setItem(g, '1'); localStorage.setItem(s, '1') } catch { /* ignore */ }
    }, [GUIDE_KEY, SEEN_KEY])

    // A ToolLayout step first: the bar alone, against the viewport.
    await go(page, '/create/font-pair')
    await expect(rail(page)).toBeVisible()
    const bar = await rail(page).evaluate((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        height: r.height,
        bottomGap: window.innerHeight - r.bottom,
        left: r.left,
        right: window.innerWidth - r.right,
        position: cs.position,
        radius: cs.borderRadius,
        shadow: cs.boxShadow,
      }
    })
    expect(bar).toEqual({ height: 56, bottomGap: 0, left: 0, right: 0, position: 'fixed', radius: '0px', shadow: 'none' })

    // Colours: the Adjust-all row is the toolbar the bar rides on, so the bar's
    // bottom edge is the toolbar's top edge.
    await go(page, '/create/palette')
    await expect(rail(page)).toBeVisible()
    const toolbar = page.locator('.plb-adjust')
    await expect(toolbar).toBeVisible()
    await expect.poll(async () => {
      const b = await rail(page).boundingBox()
      const t = await toolbar.boundingBox()
      return Math.abs((b.y + b.height) - t.y) <= 1
    }, { message: 'the bar is not directly above the Adjust-all row', timeout: 5000 }).toBe(true)
    const colours = await rail(page).evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      toolbarBottomGap: window.innerHeight - document.querySelector('.plb-adjust').getBoundingClientRect().bottom,
    }))
    expect(colours).toEqual({ height: 56, toolbarBottomGap: 0 })
  })

  test('the Palette page no longer offers Build UI system to anyone', async ({ page }) => {
    // The other half of the same founder decision: the palette tool stops being
    // a side door into system-building now that the nav is the front door.
    watch(page, 'designer looking for the removed UI system control')
    await fresh(page)
    await go(page, '/create/palette')

    await expect(page.getByRole('button', { name: 'Build UI system' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Open UI System mode' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /UI System/ })).toHaveCount(0)
    // The tool itself is still there and still works.
    await expect(page.locator('.plb-seedchip')).toBeVisible()
  })
})
