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
const card = (page) => page.getByRole('dialog', { name: 'Four steps to a full system.' })

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
 */
async function settle(locator) {
  await locator.evaluate((el) => Promise.all(
    el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})),
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
    await go(page, '/home')

    const label = await pressBrandKit(page)
    expect(label).toBe('Build a brand kit')

    // THE ASSERTION THE DEFECT WOULD HAVE FAILED. /create/color renders
    // ColorLanding, whose H1 is "One colour system, start to finish." — a page
    // of links. Step one has to be the tool.
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(page.getByRole('heading', { name: 'Palette', exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Seed colour hex' })).toBeVisible()

    // And the flow is actually running on it.
    await expect(rail(page)).toBeVisible()
    await expect(rail(page)).toContainText('0 of 4 built')
    await inView(rail(page))
    await settle(rail(page))

    await page.screenshot({
      path: test.info().outputPath('brand-kit-step-one.png'),
      fullPage: false,
    })
  })

  test('the orientation card is offered over step one and does NOT block it', async ({ page }) => {
    watch(page, 'designer reading the explanation while the tool stays live')
    await fresh(page)
    await go(page, '/home')
    await pressBrandKit(page)

    await expect(card(page)).toBeVisible()

    // NOT A MODAL, and this is the founder's actual requirement rather than a
    // styling preference: "go straight into step 1 then provide a popup". The
    // step behind has to remain usable WHILE the card is up. So: type into the
    // tool's own field with the card open and watch the tool respond.
    const seed = page.getByRole('textbox', { name: 'Seed colour hex' })
    await seed.fill('#3366FF')
    await expect(seed).toHaveValue('#3366FF')
    await expect(card(page)).toBeVisible()      // still there, still not in the way
    await expect(page.locator('.plb-col').first()).toBeVisible()
    await settle(card(page))

    // No scrim layer, and the page is not scroll-locked. Both are how the old
    // version blocked the step: position:fixed inset:0 with a backdrop blur.
    const blocked = await page.evaluate(() => ({
      overlay: !!document.querySelector('.uikit-intro-overlay'),
      bodyLocked: getComputedStyle(document.body).overflow === 'hidden',
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
    await go(page, '/home')
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
    await go(page, '/home')
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
    await go(page, '/home')
    await pressBrandKit(page)
    await expect(card(page)).toBeVisible()
    await page.keyboard.press('Escape')

    // Do real work in step one, through the tool's own control.
    await page.getByRole('textbox', { name: 'Seed colour hex' }).fill('#B5179E')
    await page.getByRole('textbox', { name: 'Seed colour hex' }).press('Enter')
    await expect(rail(page)).toContainText('1 of 4 built')

    // Walk forward with the rail's own Next, the way the flow is meant to run.
    await page.getByRole('button', { name: /^Next: Fonts/ }).click()
    await expect(page).toHaveURL(/\/create\/font-pair$/)
    await expect(rail(page)).toBeVisible()

    // Jump to the last step. The colour step still reads as done AND still
    // shows its swatches — that is the whole point of a guided flow rather than
    // four bookmarks, and it is carried by the saved design, not by a cursor.
    await page.getByRole('link', { name: /Icons/ }).first().click()
    await expect(page).toHaveURL(/\/create\/icons$/)
    const colourChip = rail(page).getByRole('link', { name: /Colours/ })
    await expect(colourChip).toHaveClass(/is-done/)
    await expect(colourChip.locator('.bkit-step-swatch').first()).toBeVisible()
    await expect(rail(page)).toContainText(/[1-9] of 4 built/)
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

    await go(page, '/home')
    const label = await pressBrandKit(page)

    // The control says which of the two things it is about to do. A button
    // reading "Build a brand kit" that then drops you at step two has lied.
    expect(label).toBe('Resume: Fonts')
    await expect(page).toHaveURL(/\/create\/font-pair$/)
    await expect(rail(page)).toContainText('1 of 4 built')

    // And it does NOT re-teach: the card is not thrown up again on resume.
    await expect(card(page)).toBeHidden()
  })

  test('leaving the walkthrough ends it and lands on the review', async ({ page }) => {
    watch(page, 'designer stopping part-way through')
    await fresh(page)
    await go(page, '/home')
    await pressBrandKit(page)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Leave the walkthrough' }).click()
    await expect(page).toHaveURL(/\/projects$/)

    // The rail is gone from the tools until the flow is started again.
    await go(page, '/create/palette')
    await expect(rail(page)).toBeHidden()
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
    await expect(page.getByRole('textbox', { name: 'Seed colour hex' })).toBeVisible()
  })
})
