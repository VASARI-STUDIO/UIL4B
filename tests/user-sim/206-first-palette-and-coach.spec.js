// A NEW ACCOUNT'S FIRST PALETTE: the workspace card (S2) and the builder's coach (S3).
//
// The card (components/userhome/FirstPaletteCard.jsx) is the first block under the title for a
// signed-in account with no project. It opens the Palette Builder with router state
// { firstPalette: true }, and only that state turns the coach on (components/PaletteCoach.jsx,
// rules in utils/paletteCoach.js). A direct go() to /create/palette sends no state, so this spec
// reaches the builder the way a person does: through the card.
//
//   · THE CARD: first under the title at 390 / 768 / 1440, light and dark; one filled .uh-cta; a
//     ramp of at least 48px; a headline of at most two lines; the button full width at 390.
//   · THE COACH: card -> builder shows it. Beat 1 rings the seed chip and moves on when the seed
//     changes (by hand or Randomise), never on mount; Next moves it on too. Both beats are one
//     height. It sits on the adjust bar, not under the phone tab bar.
//   · STOPPING: the X, Hide tips and Escape each write vs-palette-coach=1 and it never returns;
//     Escape is ignored while a popover is open.
//   · SAVING: Save palette opens the save menu with "My first palette" selected; the save toasts
//     "Saved to your projects." with a way on to /create/font-pair. Signed out, Save asks to sign in.
//   · NOT SHOWN: while the brand-kit walkthrough runs. Reduced motion fades; it never moves.
//
// MUTATIONS (each made in one build, the named test went red, then restored; see the commit message):
//   PaletteBuilder  the beat-1 effect fires on mount (`!==` -> `===`)            -> "does not move on from beat 1 on its own"
//   PaletteCoach    drop the hasOpenOverlays() guard on Escape                    -> "Escape is ignored while the save menu is open"
//   PaletteBuilder  selectOnFocus={saveFromCoach} -> {false}                      -> "Save palette opens the save menu with My first palette selected" (both widths)
//   palette-builder.css  drop the fixed body height (height: calc(1.5em * ...))   -> "both beats are one height"
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { paletteToolbar, readSeed, setSeed, clickPaletteAction } from './palette-helpers.js'

const KEY = 'vs-palette-coach'
const GUIDE_KEY = 'vs-uikit-guide'
const SIZES = [
  { width: 390, height: 844, name: 'phone' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 900, name: 'laptop' },
]
const THEMES = ['light', 'dark']

// Captures go to the handover folder when ONB_EVIDENCE_DIR names it; otherwise to the run's output.
const EVIDENCE = process.env.ONB_EVIDENCE_DIR || ''
async function capture(page, name, { mobile }) {
  const file = EVIDENCE ? path.join(EVIDENCE, name) : test.info().outputPath(name)
  if (EVIDENCE) fs.mkdirSync(EVIDENCE, { recursive: true })
  // A phone gets the viewport only: a full-page grab of a fixed-height shell is the same picture.
  await page.screenshot({ path: file, fullPage: !mobile })
}

/** A context at a real device width: touch and a coarse pointer on the phone, the theme set both ways the app reads it. */
async function open(browser, size, theme = 'light', extra = {}) {
  const mobile = size.width < 768
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    colorScheme: theme,
    isMobile: mobile,
    hasTouch: mobile,
    ...extra,
  })
  await context.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await context.newPage()
  return { context, page, mobile }
}

const coach = (page) => page.locator('.plb-coach')
const count = (page) => coach(page).locator('.plb-coach-count')
const stored = (page) => page.evaluate((k) => localStorage.getItem(k), KEY)
const toolbar = paletteToolbar

/** Console errors and uncaught exceptions on a page, for the assertion at the end of a flow. */
function errorsOf(page) {
  const seen = []
  // `vite preview` has no Vercel Insights script: its 404 is the host, not the page.
  page.on('console', (m) => { if (m.type() === 'error' && !/_vercel\/insights/.test(m.location().url || '')) seen.push(m.text()) })
  page.on('pageerror', (e) => seen.push(String(e)))
  return seen
}

/** Signed in with nothing saved, through the workspace card into the builder, coach up. */
async function arriveFromCard(page, opts = {}) {
  await signIn(page, { plan: 'free', projects: 0, ...opts })
  await go(page, '/projects')
  await expectRendered(page, '/projects')
  await page.getByTestId('first-palette-card').getByRole('link', { name: 'Make your first palette' }).click()
  await expect(page).toHaveURL(/\/create\/palette$/)
  await expect(coach(page)).toBeVisible()
  await expect(toolbar(page)).not.toHaveClass(/is-measuring/)
  await entered(page)
}

/** The coach's 240ms rise has finished, so its box is where it will rest (a mid-flight box is up to 12px low). */
const entered = (page) => coach(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)).then(() => true))

/**
 * Open the builder with the coach's router state without a card (signed out has no card).
 * react-router reads `history.state.usr` on popstate, so this is the same entry a link makes.
 */
async function arriveWithState(page, from = '/') {
  await go(page, from)
  await page.evaluate(() => {
    window.history.pushState({ usr: { firstPalette: true }, key: 'spec206', idx: (window.history.state?.idx ?? 0) + 1 }, '', '/create/palette')
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
  })
  await expect(page).toHaveURL(/\/create\/palette$/)
}

const rect = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
})

// ─────────────────────────────────────────────────────────────────────────────
// S2 · THE WORKSPACE CARD
// ─────────────────────────────────────────────────────────────────────────────
test.describe('the first-palette card on the workspace', () => {
  for (const size of SIZES) {
    for (const theme of THEMES) {
      test(`${size.width}px ${theme}: first under the title, one filled button, a ramp, a short headline`, async ({ browser }) => {
        const { context, page, mobile } = await open(browser, size, theme)
        watch(page, `a new account opening its workspace on a ${size.name}, ${theme}`)
        await signIn(page, { plan: 'free', projects: 0 })
        await go(page, '/projects')
        await expectRendered(page, '/projects')
        const card = page.getByTestId('first-palette-card')
        await expect(card).toBeVisible()

        const m = await page.evaluate(() => {
          const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } }
          const card = document.querySelector('[data-testid="first-palette-card"]')
          const main = card.closest('.uh-main') || document.querySelector('.uh-main')
          const title = main.querySelector('.uh-h1')
          const ramp = card.querySelector('.uh-first-ramp')
          const cta = card.querySelector('.uh-cta')
          const head = card.querySelector('h2')
          const body = card.querySelector('.uh-continue-body')
          const hcs = getComputedStyle(head)
          const lineHeight = Number.parseFloat(hcs.lineHeight) || Number.parseFloat(hcs.fontSize) * 1.2
          const bcs = getComputedStyle(body)
          const inner = body.clientWidth - Number.parseFloat(bcs.paddingLeft) - Number.parseFloat(bcs.paddingRight)
          const cardTop = card.getBoundingClientRect().top
          // Every other block in the content column that starts above the card (the title row and greeting are not blocks of content).
          const above = [...main.querySelectorAll('section, [class*="uh-start"], [class*="uh-plan"], [class*="uh-disc"], [class*="uh-pro"]')]
            .filter((el) => {
              const r = el.getBoundingClientRect()
              const cr = card.getBoundingClientRect()
              // Only blocks in the card's own column count: the Today rail beside it is not "above" it.
              const sameColumn = r.left < cr.right - 1 && r.right > cr.left + 1
              return !card.contains(el) && el !== card && !el.contains(card) && r.height > 0 && sameColumn && r.top < cardTop - 1
            })
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)
          const filled = [...document.querySelectorAll('.uh .uh-cta')].filter((el) => el.getBoundingClientRect().width > 0)
          const bg = (el) => getComputedStyle(el).backgroundColor
          return {
            card: box(card), title: box(title), ramp: box(ramp), cta: box(cta), inner,
            headLines: Math.round(head.getBoundingClientRect().height / lineHeight * 10) / 10,
            above,
            ctas: filled.length, ctaBg: filled.map(bg), ctaInCard: filled.every((el) => card.contains(el)),
            accentButtons: document.querySelectorAll('.uh .btn-accent').length,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        })

        expect(m.card.top, 'the card is not under the title').toBeGreaterThanOrEqual(m.title.bottom - 1)
        expect(m.above, 'a block sits between the title and the card').toEqual([])
        expect(m.ctas, 'exactly one .uh-cta on the page').toBe(1)
        expect(m.ctaInCard, 'the one .uh-cta is not the card’s').toBe(true)
        expect(m.ctaBg[0], 'the one .uh-cta is not filled').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
        expect(m.accentButtons, 'a second accent button on the page').toBe(0)
        expect(m.ramp.height, `the ramp is ${m.ramp.height}px tall`).toBeGreaterThanOrEqual(48)
        expect(m.ramp.width, 'the ramp is not the width of the card’s content').toBeGreaterThan(m.inner * 0.95)
        expect(m.headLines, `the headline runs to ${m.headLines} lines`).toBeLessThanOrEqual(2.05)
        expect(m.cta.height, `the button is ${m.cta.height}px tall`).toBeGreaterThanOrEqual(44)
        if (size.width === 390) expect(m.cta.width, `the button is ${m.cta.width}px in a ${m.inner}px card`).toBeGreaterThanOrEqual(m.inner - 1)
        expect(m.overflow, 'the page scrolls sideways').toBe(0)

        await capture(page, `s2-first-palette-card-${size.width}-${theme}.png`, { mobile })
        await context.close()
      })
    }
  }

  test('an account with every project archived keeps the old starter, and no first-palette card', async ({ page }) => {
    watch(page, 'a designer whose only project is archived')
    const archived = {
      id: 'p-old', name: 'Old Harbour', archived: true,
      design: JSON.parse(JSON.stringify((await import('../../src/data/designDefaults.js')).DEFAULT_DESIGN)),
      createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-02T09:00:00.000Z',
    }
    await signIn(page, { plan: 'free', projects: [archived] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('starter-card').getByRole('button', { name: 'Start the walkthrough' })).toBeVisible()
    await expect(page.getByTestId('first-palette-card')).toHaveCount(0)
  })

  test('with a project the card is gone', async ({ page }) => {
    watch(page, 'a designer with one project')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('first-palette-card')).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// S3 · THE COACH
// ─────────────────────────────────────────────────────────────────────────────
test.describe('the first-palette coach', () => {
  test('a plain visit to the builder does not show it', async ({ page }) => {
    watch(page, 'a designer opening the Palette Builder directly')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/create/palette')
    await expect(toolbar(page)).not.toHaveClass(/is-measuring/)
    await expect(coach(page)).toHaveCount(0)
    expect(await stored(page), 'a render wrote the dismissal').toBeNull()
  })

  test('the card opens the builder with beat 1 up, and nothing is written to storage', async ({ page }) => {
    watch(page, 'a new account arriving from the workspace card')
    await arriveFromCard(page)
    await expect(coach(page).getByRole('heading', { name: 'Make it yours' })).toBeVisible()
    await expect(count(page)).toHaveText('1 of 2')
    await expect(coach(page)).toContainText('Change the first colour to your brand colour. Every other colour updates with it.')
    await expect(coach(page).getByRole('button', { name: 'Hide tips' })).toBeVisible()
    await expect(coach(page).getByRole('button', { name: 'Close' })).toBeVisible()
    expect(await stored(page), 'showing the coach wrote the dismissal').toBeNull()
  })

  test('the onboarding palette card opens it too', async ({ page }) => {
    watch(page, 'a brand-new account choosing the palette on /onboarding')
    await signIn(page, { plan: 'free', projects: 0, onboarded: false })
    await go(page, '/onboarding')
    await page.locator('[data-first-win="palette"]').click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(coach(page)).toBeVisible()
  })

  test('it does not move on from beat 1 on its own', async ({ page }) => {
    watch(page, 'a new account looking at beat 1 without touching the board')
    await arriveFromCard(page)
    const seed = await readSeed(page)
    // Several frames after the board has painted and the toolbar has settled.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))))
    await expect(count(page)).toHaveText('1 of 2')
    expect(await readSeed(page), 'the board changed under the coach').toBe(seed)
  })

  test('beat 1 moves to beat 2 when the seed is edited', async ({ page }) => {
    watch(page, 'a new account typing its brand colour')
    await arriveFromCard(page)
    await setSeed(page, '#E0422B')
    await expect(count(page)).toHaveText('2 of 2')
    await expect(coach(page).getByRole('heading', { name: 'Keep it' })).toBeVisible()
    await expect(coach(page)).toContainText('Save puts this palette in your projects, on any device.')
    await expect(coach(page).getByRole('button', { name: 'Save palette' })).toBeVisible()
    expect(await stored(page), 'moving on is not a dismissal').toBeNull()
  })

  test('beat 1 moves to beat 2 on Randomise', async ({ page }) => {
    watch(page, 'a new account pressing Randomise')
    await arriveFromCard(page)
    await clickPaletteAction(page, 'Randomise')
    await expect(count(page)).toHaveText('2 of 2')
  })

  test('Next moves to beat 2 without an edit', async ({ page }) => {
    watch(page, 'a new account happy with the first draw')
    await arriveFromCard(page)
    const seed = await readSeed(page)
    await coach(page).getByRole('button', { name: 'Next' }).click()
    await expect(count(page)).toHaveText('2 of 2')
    expect(await readSeed(page), 'Next changed the board').toBe(seed)
  })

  // BEAT 1'S RING, per width. PRODUCT BUG at 390 (found by this test): the seed chip is not on the
  // phone's toolbar row (it lives behind "Extra tools"), so `.is-coached` is applied to a control that is
  // not drawn and the ring points at nothing (PaletteBuilder.jsx:2752, triggerClassName). `test.fail`
  // keeps the suite honest: it passes while the bug stands and goes red the day it is fixed, which is the
  // cue to delete the annotation.
  for (const size of SIZES) {
    test(`${size.width}px: beat 1's ring is on a control the person can see`, async ({ browser }) => {
      test.fail(size.width === 390, 'product bug: at 390 the seed chip is not drawn on the toolbar row, so the ring points at nothing (PaletteBuilder.jsx:2752)')
      const { context, page } = await open(browser, size)
      watch(page, `a new account reading beat 1 on a ${size.name}`)
      await arriveFromCard(page)
      const chip = page.locator('.plb .plb-seedchip')
      await expect(chip, 'the seed chip is not on the toolbar row, so the ring points at nothing').toBeVisible({ timeout: 2000 })
      await expect(chip).toHaveClass(/is-coached/)
      const ring = await chip.evaluate((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return { width: Number.parseFloat(cs.outlineWidth), style: cs.outlineStyle, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, hit: at === el || el.contains(at) }
      })
      expect(ring.style, 'the ring is not drawn').not.toBe('none')
      expect(ring.width).toBeGreaterThanOrEqual(2)
      expect(ring.inView, 'the ringed chip is off screen').toBe(true)
      expect(ring.hit, 'something paints over the ringed chip').toBe(true)
      await context.close()
    })

    // THE COACH AND THE PHONE TAB BAR. PRODUCT BUG on a real phone (isMobile): the adjust bar is below
    // the fold, so the coach falls back to "the screen's edge" and rests UNDER the fixed tab bar, which
    // covers Hide tips and Next (PaletteCoach.jsx:44-47, the fallback ignores --tabbar-h).
    test(`${size.width}px: the coach is clear of the phone tab bar and its buttons can be pressed`, async ({ browser }) => {
      test.fail(size.width === 390, 'product bug: on a phone the coach rests under the tab bar, which covers Hide tips and Next (PaletteCoach.jsx:44-47)')
      const { context, page } = await open(browser, size)
      watch(page, `a new account reading the coach on a ${size.name}`)
      await arriveFromCard(page)
      const tabs = page.locator('.pnav-tabs')
      const phoneTabs = (await tabs.count()) > 0 && await tabs.first().isVisible()
      expect(phoneTabs, 'the tab bar is only on a phone').toBe(size.width < 768)
      const one = await rect(coach(page))
      if (phoneTabs) expect(one.bottom, 'the coach runs under the tab bar').toBeLessThanOrEqual((await rect(tabs.first())).top + 1)
      for (const name of ['Next', 'Hide tips', 'Close']) {
        const hit = await coach(page).getByRole('button', { name }).evaluate((el) => {
          const r = el.getBoundingClientRect()
          const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return at === el || el.contains(at)
        })
        expect(hit, `${name} is painted over`).toBe(true)
      }
      await context.close()
    })
  }

  // The geometry, per width and theme, with the captures the handover needs. (Presses go through
  // dispatchEvent: the two tests above own the question of whether a person can reach the buttons.)
  for (const size of SIZES) {
    for (const theme of THEMES) {
      test(`${size.width}px ${theme}: both beats are one height and one place, on the adjust bar, and the toolbar does not move`, async ({ browser }) => {
        const { context, page, mobile } = await open(browser, size, theme)
        watch(page, `a new account in the builder on a ${size.name}, ${theme}`)
        await arriveFromCard(page)

        const bar1 = await rect(toolbar(page))
        const one = await rect(coach(page))
        await capture(page, `s3-coach-beat1-${size.width}-${theme}.png`, { mobile })

        await coach(page).getByRole('button', { name: 'Next' }).dispatchEvent('click')
        await expect(count(page)).toHaveText('2 of 2')
        await entered(page)
        const two = await rect(coach(page))
        await capture(page, `s3-coach-beat2-${size.width}-${theme}.png`, { mobile })

        // One height across the beats, and one place.
        expect(two.height, `beat 1 is ${one.height}px, beat 2 is ${two.height}px`).toBe(one.height)
        expect(two.bottom).toBe(one.bottom)
        expect(two.left).toBe(one.left)
        expect(two.width).toBe(one.width)

        // Flush on the adjust bar: a bar the full width on a phone, a card 8px clear of it from 768. (On a
        // real phone the bar is below the fold; the tab-bar test above covers where the coach rests then.)
        const adjust = await rect(page.locator('.plb-adjust'))
        if (size.width < 768) {
          expect(one.width, 'on a phone the coach is the width of the screen').toBe(size.width)
          if (adjust.top < size.height) expect(Math.abs(one.bottom - adjust.top), `the coach ends at y=${one.bottom}, the adjust bar starts at y=${adjust.top}`).toBeLessThanOrEqual(1.5)
        } else {
          expect(adjust.top - one.bottom, `the coach ends at y=${one.bottom}, the adjust bar starts at y=${adjust.top}`).toBeGreaterThanOrEqual(6)
          expect(adjust.top - one.bottom).toBeLessThanOrEqual(10)
          expect(one.width, 'the card is 420px at most').toBeLessThanOrEqual(420)
        }
        expect(one.top, 'the coach would be cut off at the top').toBeGreaterThan(0)

        // The toolbar does not move for it.
        await coach(page).getByRole('button', { name: 'Hide tips' }).dispatchEvent('click')
        await expect(coach(page)).toHaveCount(0)
        const bar2 = await rect(toolbar(page))
        expect(bar2.top, 'the toolbar moved when the coach went').toBe(bar1.top)
        expect(bar2.bottom).toBe(bar1.bottom)
        await context.close()
      })
    }
  }

  // Dismissal: three ways, each writes the flag, and it never comes back.
  for (const [how, act] of [
    ['the X', (p) => coach(p).getByRole('button', { name: 'Close' }).click()],
    ['Hide tips', (p) => coach(p).getByRole('button', { name: 'Hide tips' }).click()],
    ['Escape', (p) => p.keyboard.press('Escape')],
  ]) {
    test(`${how} closes it for good`, async ({ page }) => {
      watch(page, `a new account dismissing the coach with ${how}`)
      await arriveFromCard(page)
      expect(await stored(page)).toBeNull()
      await act(page)
      await expect(coach(page)).toHaveCount(0)
      expect(await stored(page), `${how} did not write ${KEY}`).toBe('1')

      // Reloaded on the same history entry (which still carries the state), the coach stays gone.
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(toolbar(page)).not.toHaveClass(/is-measuring/)
      await expect(coach(page)).toHaveCount(0)

      // And through the card again: the card is still there (no project yet) and the coach is not.
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      await page.getByTestId('first-palette-card').getByRole('link', { name: 'Make your first palette' }).click()
      await expect(page).toHaveURL(/\/create\/palette$/)
      await expect(toolbar(page)).not.toHaveClass(/is-measuring/)
      await expect(coach(page)).toHaveCount(0)
      expect(await stored(page)).toBe('1')
    })
  }

  test('Escape is ignored while the seed picker is open', async ({ page }) => {
    watch(page, 'a new account pressing Escape inside the colour picker')
    await arriveFromCard(page)
    await page.locator('.plb .plb-seedchip').click()
    const picker = page.getByRole('dialog', { name: 'Pick seed colour' })
    await expect(picker).toBeVisible()
    // The coach steps out of the way while a popover is open.
    await expect(coach(page)).toHaveAttribute('data-overlay-hidden', 'true')
    await page.keyboard.press('Escape')
    await expect(picker).toHaveCount(0)
    // That Escape belonged to the picker: the coach is back, not dismissed.
    await expect(coach(page)).toBeVisible()
    await expect(coach(page)).not.toHaveAttribute('data-overlay-hidden', 'true')
    expect(await stored(page), 'the Escape that closed the picker also dismissed the coach').toBeNull()
  })

  test('Escape is ignored while the save menu is open', async ({ page }) => {
    watch(page, 'a new account pressing Escape in the save menu')
    await arriveFromCard(page)
    await coach(page).getByRole('button', { name: 'Next' }).click()
    await coach(page).getByRole('button', { name: 'Save palette' }).click()
    await expect(page.locator('.plb-savemenu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.plb-savemenu')).toHaveCount(0)
    await expect(coach(page)).toBeVisible()
    expect(await stored(page), 'the Escape that closed the menu also dismissed the coach').toBeNull()
  })

  for (const size of [SIZES[0], SIZES[2]]) {
    test(`${size.width}px: Save palette opens the save menu with "My first palette" selected, and the save offers the next step`, async ({ browser }) => {
      // A 390px window rather than a phone's metrics: on a phone the coach's buttons sit under the tab
      // bar (the test above holds that bug), and this test is about the save.
      const { context, page, mobile } = await open(browser, size, 'light', { isMobile: false, hasTouch: false })
      watch(page, `a new account saving its first palette on a ${size.name}`)
      const errors = errorsOf(page)
      const account = await signIn(page, { plan: 'free', projects: 0 })
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      await page.getByTestId('first-palette-card').getByRole('link', { name: 'Make your first palette' }).click()
      await expect(coach(page)).toBeVisible()
      await expect(toolbar(page)).not.toHaveClass(/is-measuring/)

      await coach(page).getByRole('button', { name: 'Next' }).click()
      await coach(page).getByRole('button', { name: 'Save palette' }).click()
      const menu = page.locator('.plb-savemenu')
      await expect(menu).toBeVisible()
      const field = menu.getByLabel('Project name')
      await expect(field).toHaveValue('My first palette')
      await expect(field, 'focus did not move into the name field').toBeFocused()
      const sel = await field.evaluate((el) => ({ start: el.selectionStart, end: el.selectionEnd, length: el.value.length }))
      expect(sel, 'the name is not selected, so typing would not replace it').toEqual({ start: 0, end: 'My first palette'.length, length: 'My first palette'.length })
      await capture(page, `s3-save-menu-${size.width}-light.png`, { mobile })

      await page.keyboard.press('Enter')
      const toast = page.locator('.toast.show')
      await expect(toast).toContainText('Saved to your projects.')
      await expect(coach(page), 'the coach stays after the save').toHaveCount(0)
      expect(await stored(page), 'a save does not close the coach for good').toBe('1')
      const kept = await page.evaluate((email) => (JSON.parse(localStorage.getItem('vs-projects') || '{}')[email] || []).map((p) => p.name), account.email)
      expect(kept).toEqual(['My first palette'])
      await capture(page, `s3-saved-toast-${size.width}-light.png`, { mobile })

      await toast.getByRole('button', { name: 'Pair fonts with it' }).click()
      await expect(page).toHaveURL(/\/create\/font-pair$/)
      expect(errors, 'console errors on the way').toEqual([])
      await context.close()
    })
  }

  test('signed out, Save palette asks for a sign-in and leaves the board where it was', async ({ page }) => {
    watch(page, 'a visitor who reached the coach and pressed Save palette')
    await arriveWithState(page)
    await expect(coach(page)).toBeVisible()
    await expect(toolbar(page)).not.toHaveClass(/is-measuring/)
    await coach(page).getByRole('button', { name: 'Next' }).click()
    await coach(page).getByRole('button', { name: 'Save palette' }).click()
    const menu = page.locator('.plb-savemenu')
    await expect(menu).toBeVisible()
    await menu.getByLabel('Project name').press('Enter')
    await expect(page.getByRole('dialog', { name: /sign|log ?in|account|create/i }), 'no sign-in prompt').toBeVisible()
    await expect(page, 'the board was left').toHaveURL(/\/create\/palette$/)
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('vs-projects') || '{}')).length), 'a signed-out save wrote a project').toBe(0)
  })

  test('while the brand-kit walkthrough runs there is no coach', async ({ page }) => {
    watch(page, 'a designer part-way through the walkthrough')
    await page.addInitScript((g) => { try { localStorage.setItem(g, '1') } catch { /* private mode */ } }, GUIDE_KEY)
    await signIn(page, { plan: 'free', projects: 0 })
    await arriveWithState(page, '/projects')
    await expect(page.getByRole('region', { name: 'Brand kit walkthrough' }), 'the walkthrough did not start, so this proves nothing').toBeVisible()
    await expect(coach(page)).toHaveCount(0)
  })

  test('reduced motion fades the coach in and never moves it', async ({ browser }) => {
    const calm = await open(browser, SIZES[2], 'light', { reducedMotion: 'reduce' })
    watch(calm.page, 'a new account that asked for reduced motion')
    await arriveFromCard(calm.page)
    expect(await coach(calm.page).evaluate((el) => getComputedStyle(el).animationName), 'reduced motion still slides').toBe('plb-coach-fade')
    await calm.context.close()

    // The positive control: without the preference it rises.
    const lively = await open(browser, SIZES[2], 'light', { reducedMotion: 'no-preference' })
    watch(lively.page, 'a new account with no motion preference')
    await arriveFromCard(lively.page)
    expect(await coach(lively.page).evaluate((el) => getComputedStyle(el).animationName)).toBe('plb-coach-in')
    await lively.context.close()
  })

  test('the whole path runs without a console error', async ({ page }) => {
    watch(page, 'a new account walking the coach end to end')
    const errors = errorsOf(page)
    await arriveFromCard(page)
    await setSeed(page, '#2B8AE2')
    await expect(count(page)).toHaveText('2 of 2')
    await page.keyboard.press('Escape')
    await expect(coach(page)).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
