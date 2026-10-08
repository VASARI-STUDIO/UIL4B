// The brand kit walkthrough on a phone, and its closing step.
//
//   · On a phone the rail and the docked card sit above the fixed tab bar, so a
//     tap on any of their controls lands on that control, across at least 44px.
//   · On a touch screen the name card does not raise the keyboard by itself,
//     and once the field is focused Save stays above the keyboard.
//   · On a phone the "What's this?" trigger is a visible icon button with the
//     same name, and Escape on the card returns focus to it.
//   · The last tool's Next opens "Name your kit": one name saves the project
//     and names the kit, then the person lands on the project. The free cap
//     refuses without losing anything; signed out, saving asks for an account
//     and the work waits.
//   · Pressing Next counts a step as built, so accepting every default still
//     finishes at 4 of 4.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const GUIDE_KEY = 'vs-uikit-guide'
const SEEN_KEY = 'vs-uikit-guide-seen'
const DESIGN_KEY = 'vs-current-design'
const SEED_COLOURS = ['#1D3557', '#E63946', '#F1FAEE']

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })
const introCard = (page) => page.getByRole('dialog', { name: 'Four steps to a full system.' })
const nameCard = (page) => page.getByRole('dialog', { name: 'Name your kit' })

/** Prior state, written once per tab so the app's own writes are not undone on the next load. */
async function seed(page, { guide = true, seen = true, colours = false } = {}) {
  await page.addInitScript(({ guide, seen, design, keys }) => {
    try {
      if (sessionStorage.getItem('__bkit_seeded') === '1') return
      sessionStorage.setItem('__bkit_seeded', '1')
      if (guide) localStorage.setItem(keys.guide, '1')
      if (seen) localStorage.setItem(keys.seen, '1')
      if (design) localStorage.setItem(keys.design, JSON.stringify(design))
    } catch { /* private mode */ }
  }, {
    guide,
    seen,
    design: colours ? { palette: { base: SEED_COLOURS[0], harmony: 'auto', colors: SEED_COLOURS, activeIdx: 0, extraColors: [] } } : null,
    keys: { guide: GUIDE_KEY, seen: SEEN_KEY, design: DESIGN_KEY },
  })
}

/** What a tap at the centre of this control would land on, after scrolling it into its strip. */
async function tapLands(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const hit = document.elementFromPoint(x, y)
    const label = (n) => (n ? `${n.tagName.toLowerCase()}.${String(n.className || '').split(' ')[0]}` : 'nothing')
    return { ok: !!hit && (hit === el || el.contains(hit)), hit: label(hit), at: `${Math.round(x)},${Math.round(y)}` }
  })
}

// Polled: the Icons route re-renders the rail while the library is still
// arriving, and a node caught mid-remount measures zero.
async function expectTapsLand(locator, what) {
  let last = null
  await expect.poll(async () => {
    last = await tapLands(locator)
    return last.ok
  }, { timeout: 5000 }).toBe(true).catch(() => {
    throw new Error(`${what}: a tap at ${last?.at} lands on ${last?.hit}`)
  })
}

/** The points of a 44px square centred on this control where a tap would miss it. */
async function hitAreaMisses(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const d = 21.75
    const misses = []
    for (const dx of [-d, 0, d]) {
      for (const dy of [-d, 0, d]) {
        const hit = document.elementFromPoint(cx + dx, cy + dy)
        if (!hit || !(hit === el || el.contains(hit))) misses.push(`${dx},${dy}`)
      }
    }
    return misses
  })
}

// Soft, so one run names every control that is short of the target.
async function expectHitArea(locator, what) {
  expect.soft(await hitAreaMisses(locator), `${what}: a tap within 22px of its centre misses it`).toEqual([])
}

async function railControlsAllLand(page) {
  const r = rail(page)
  const chips = r.locator('.bkit-step')
  expect(await chips.count()).toBe(4)
  for (let i = 0; i < 4; i++) await expectTapsLand(chips.nth(i), `step chip ${i + 1}`)
  await expectTapsLand(r.locator('.bkit-rail-next'), 'Next')
  await expectTapsLand(r.getByRole('button', { name: /What.s this\?/ }), 'What’s this?')
  await expectTapsLand(r.getByRole('button', { name: 'Leave the walkthrough' }), 'Leave (X)')
  for (let i = 0; i < 4; i++) await expectHitArea(chips.nth(i), `step chip ${i + 1}`)
  await expectHitArea(r.locator('.bkit-rail-next'), 'Next')
  await expectHitArea(r.getByRole('button', { name: /What.s this\?/ }), 'What’s this?')
  await expectHitArea(r.getByRole('button', { name: 'Leave the walkthrough' }), 'Leave (X)')
  // The rail clears the tab bar outright, and its action row has not wrapped.
  const geo = await page.evaluate(() => {
    const railBox = document.querySelector('.bkit-rail').getBoundingClientRect()
    const bar = document.querySelector('.pnav-tabs')?.getBoundingClientRect()
    const tops = [...document.querySelectorAll('.bkit-rail-actions > *')].map((n) => n.getBoundingClientRect())
    return {
      railBottom: railBox.bottom,
      barTop: bar ? bar.top : null,
      spread: Math.max(...tops.map((b) => b.top + b.height / 2)) - Math.min(...tops.map((b) => b.top + b.height / 2)),
    }
  })
  expect(geo.barTop, 'the phone tab bar is not on screen').not.toBeNull()
  expect(geo.railBottom, 'the rail runs under the tab bar').toBeLessThanOrEqual(geo.barTop)
  expect(geo.spread, 'the rail actions wrapped onto two lines').toBeLessThan(4)
}

// Polled: the card's offset follows the rail a frame after a resize or scroll.
async function expectCardClearsRail(page, card, message) {
  await expect.poll(async () => {
    const cardBottom = await card.evaluate((el) => el.getBoundingClientRect().bottom)
    const railTop = await rail(page).evaluate((el) => el.getBoundingClientRect().top)
    return cardBottom <= railTop
  }, { message, timeout: 5000 }).toBe(true)
}

const PHONES = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]

test.describe('Brand kit walkthrough on a phone', () => {
  for (const vp of PHONES) {
    test(`${vp.width}px: every rail and card control takes its own tap`, async ({ page }) => {
      watch(page, 'designer building a brand kit on a phone')
      await page.setViewportSize(vp)
      await seed(page, { seen: false })
      await go(page, '/create/palette')
      await expect(rail(page)).toBeVisible()

      // The card opens itself on step one; its controls must take taps too.
      await expect(introCard(page)).toBeVisible()
      await introCard(page).evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))))
      await expectTapsLand(introCard(page).getByRole('button', { name: 'Close' }), 'card Close')
      await expectTapsLand(introCard(page).getByRole('button', { name: /^Start with/ }), 'card Start')
      await expectHitArea(introCard(page).getByRole('button', { name: 'Close' }), 'card Close')
      const cardBottom = await introCard(page).evaluate((el) => el.getBoundingClientRect().bottom)
      const railTop = await rail(page).evaluate((el) => el.getBoundingClientRect().top)
      expect(cardBottom, 'the card overlaps the rail').toBeLessThanOrEqual(railTop)
      await introCard(page).getByRole('button', { name: 'Close' }).click()

      await railControlsAllLand(page)

      // The tallest step, and the one with the longest Next label.
      await rail(page).getByRole('link', { name: /Icons/ }).click()
      await expect(page).toHaveURL(/\/create\/icons$/)
      await expect(rail(page)).toBeVisible()
      await railControlsAllLand(page)

      // The closing card docks above the rail at its tallest, on this step.
      await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
      await expect(nameCard(page)).toBeVisible()
      await expectCardClearsRail(page, nameCard(page), 'the name card overlaps the rail')
      await expectTapsLand(nameCard(page).getByRole('button', { name: 'Close' }), 'name card Close')
      await expectTapsLand(nameCard(page).getByRole('textbox', { name: 'Kit name' }), 'Kit name')
      await expectTapsLand(nameCard(page).getByRole('button', { name: 'Save project' }), 'Save project')
      await expectHitArea(nameCard(page).getByRole('button', { name: 'Close' }), 'name card Close')
      await expectHitArea(nameCard(page).getByRole('textbox', { name: 'Kit name' }), 'Kit name')
      await expectHitArea(nameCard(page).getByRole('button', { name: 'Save project' }), 'Save project')
      await railControlsAllLand(page)

      // At the end of the page the rail rises off the tab bar; the card follows it.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await expectCardClearsRail(page, nameCard(page), 'at the end of the page the name card overlaps the rail')
    })
  }

  test('1440px: the rail and card keep their desktop offsets', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await seed(page, { seen: false })
    await go(page, '/create/palette')
    await expect(introCard(page)).toBeVisible()
    const offsets = await page.evaluate(() => ({
      rail: getComputedStyle(document.querySelector('.bkit-rail')).bottom,
      card: getComputedStyle(document.querySelector('.bkit-card')).bottom,
      help: getComputedStyle(document.querySelector('.bkit-rail-help-text')).position,
    }))
    expect(offsets).toEqual({ rail: '20px', card: '96px', help: 'static' })

    // The two close buttons animate only the properties their hover changes.
    const transitions = await page.evaluate(() => ['.bkit-card-close', '.bkit-rail-close']
      .map((sel) => getComputedStyle(document.querySelector(sel)).transitionProperty))
    expect(transitions).toEqual(['border-color, color, background-color', 'border-color, color, background-color'])
  })

  test('390px: the help trigger is a visible, named icon button and Escape returns focus to it', async ({ page }) => {
    watch(page, 'keyboard user on a narrow screen')
    await page.setViewportSize({ width: 390, height: 844 })
    await seed(page, { seen: false })
    await go(page, '/create/palette')

    const help = rail(page).getByRole('button', { name: /What.s this\?/ })
    await expect(help).toBeVisible()
    const box = await help.boundingBox()
    expect(box.width).toBeGreaterThanOrEqual(24)
    expect(box.height).toBeGreaterThanOrEqual(24)
    // The icon stays compact; the tap target around it is 44px.
    expect(await hitAreaMisses(help), 'a tap within 22px of the help icon misses it').toEqual([])

    // The close icons are decoration inside named buttons.
    await expect(introCard(page).getByRole('button', { name: 'Close' }).locator('svg')).toHaveAttribute('aria-hidden', 'true')
    await expect(rail(page).getByRole('button', { name: 'Leave the walkthrough' }).locator('svg')).toHaveAttribute('aria-hidden', 'true')

    // Opened by itself on arrival: Escape must not drop focus on <body>.
    await expect(introCard(page)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(introCard(page)).toBeHidden()
    await expect(help).toBeFocused()

    // Reopened from the trigger, and closed again with Escape.
    await help.click()
    await expect(introCard(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(introCard(page)).toBeHidden()
    await expect(help).toBeFocused()
  })

  test('390px: the current step is the chip in view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seed(page)
    await go(page, '/create/icons')
    const current = rail(page).locator('.bkit-step[aria-current="step"]')
    await expect(current).toContainText('Icons')
    await expect.poll(() => current.evaluate((el) => {
      const s = el.closest('.bkit-steps').getBoundingClientRect()
      const c = el.getBoundingClientRect()
      return c.left >= s.left - 1 && c.right <= s.right + 1
    }), { message: 'the Icons chip is scrolled out of the strip', timeout: 3000 }).toBe(true)
  })
})

// Simulates an on-screen keyboard that shrinks the visual viewport only, as
// iOS Safari and Chrome on Android do: the layout viewport, and with it every
// fixed element, stays put. Headless Chromium has no keyboard, so the
// visualViewport's height is overridden and its resize event fired.
async function simulateKeyboard(page, height) {
  await page.evaluate((kb) => {
    const vv = window.visualViewport
    if (kb) Object.defineProperty(vv, 'height', { configurable: true, get: () => window.innerHeight - kb })
    else delete vv.height
    vv.dispatchEvent(new Event('resize'))
  }, height)
}

// Save is inside the visual viewport, not clipped by the card, and every edge of
// it takes a tap (nothing, such as the nav, covers part of it).
async function expectSaveInView(page, when) {
  const save = page.locator('.bkit-name-save')
  // The card re-docks on the next frame; reading before then sees where it was.
  await page.evaluate(() => new Promise((done) => {
    let n = 0
    const tick = () => { if (++n >= 3) done(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }))
  let last = null
  await expect.poll(async () => {
    last = await save.evaluate((el) => {
      const vv = window.visualViewport
      const r = el.getBoundingClientRect()
      const card = el.closest('.bkit-card').getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const points = [[cx, cy], [cx, r.top + 2], [cx, r.bottom - 2], [r.left + 2, cy], [r.right - 2, cy]]
      const takes = points.every(([x, y]) => {
        const hit = document.elementFromPoint(x, y)
        return !!hit && (hit === el || el.contains(hit))
      })
      return {
        ok: r.top >= vv.offsetTop && r.bottom <= vv.offsetTop + vv.height
          && r.top >= card.top && r.bottom <= card.bottom
          && takes,
        save: `${Math.round(r.top)}-${Math.round(r.bottom)}`,
        card: `${Math.round(card.top)}-${Math.round(card.bottom)}`,
        view: `${Math.round(vv.offsetTop)}-${Math.round(vv.offsetTop + vv.height)}`,
      }
    })
    return last.ok
  }, { timeout: 5000 }).toBe(true).catch(() => {
    throw new Error(`${when}: Save at ${last?.save} is not in view (card ${last?.card}, visual viewport ${last?.view})`)
  })
}

const SHORT = [
  { width: 360, height: 640, keyboard: 280 },
  { width: 740, height: 360, keyboard: 170 },
]

test.describe('Brand kit walkthrough: naming the kit on a touch screen', () => {
  test.use({ hasTouch: true })
  for (const vp of SHORT) {
    test(`${vp.width}x${vp.height}: the keyboard waits for a tap, then Save stays above it`, async ({ page }) => {
      watch(page, 'designer naming a kit on a phone')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await seed(page, { colours: true })
      await go(page, '/create/icons')
      await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
      const card = nameCard(page)
      await expect(card).toBeVisible()

      // Focus goes to the heading, so no keyboard rises before the card is read.
      await expect(card.getByRole('heading', { name: 'Name your kit' })).toBeFocused()
      const field = card.getByRole('textbox', { name: 'Kit name' })
      await expect(field).not.toBeFocused()

      await field.tap()
      await expect(field).toBeFocused()
      await simulateKeyboard(page, vp.keyboard)
      await expectSaveInView(page, 'keyboard over the visual viewport')
      await expect(field).toBeFocused()
      await simulateKeyboard(page, 0)

      // A keyboard that resizes the page instead.
      await page.setViewportSize({ width: vp.width, height: vp.height - vp.keyboard })
      await expectSaveInView(page, 'keyboard resizing the page')
      await expect(field).toBeFocused()
    })
  }
})

test.describe('Brand kit walkthrough: ticks', () => {
  test('pressing Next through every step with the defaults finishes at 4 of 4', async ({ page }) => {
    watch(page, 'designer happy with the defaults')
    await seed(page)
    await go(page, '/create/palette')
    await expect(rail(page)).toContainText('0 of 4 built')

    await rail(page).getByRole('button', { name: /^Next: Fonts/ }).click()
    await expect(page).toHaveURL(/\/create\/font-pair$/)
    await expect(rail(page)).toContainText('1 of 4 built')
    await expect(rail(page).getByRole('link', { name: /Colours/ })).toHaveClass(/is-done/)

    await rail(page).getByRole('button', { name: /^Next: Type scale/ }).click()
    await expect(page).toHaveURL(/\/create\/type-scale$/)
    await expect(rail(page)).toContainText('2 of 4 built')

    await rail(page).getByRole('button', { name: /^Next: Icons/ }).click()
    await expect(page).toHaveURL(/\/create\/icons$/)
    await expect(rail(page)).toContainText('3 of 4 built')

    await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
    await expect(rail(page)).toContainText('4 of 4 built')
    await expect(nameCard(page)).toBeVisible()
  })
})

test.describe('Brand kit walkthrough: Name your kit', () => {
  test('signed in: one name saves the project and names the kit, then opens the project', async ({ page }) => {
    watch(page, 'designer finishing a brand kit')
    await signIn(page, { plan: 'free', projects: 0 })
    await seed(page, { colours: true })
    await go(page, '/create/icons')

    // The old ending claimed the work was saved; it is not, until it is named.
    const leave = rail(page).getByRole('button', { name: 'Leave the walkthrough' })
    expect(await leave.getAttribute('title')).not.toMatch(/work is saved/i)

    await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
    await expect(nameCard(page)).toBeVisible()
    const field = nameCard(page).getByRole('textbox', { name: 'Kit name' })
    await expect(field).toBeFocused()

    // A blank name is refused in place.
    await nameCard(page).getByRole('button', { name: 'Save project' }).click()
    await expect(nameCard(page).getByRole('alert')).toHaveText('Give your kit a name to save it.')

    await field.fill('Harbour Studio')
    await nameCard(page).getByRole('button', { name: 'Save project' }).click()
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+$/)
    await expect(page.getByText('Harbour Studio').first()).toBeVisible()

    const stored = await page.evaluate(([dk, gk]) => ({
      projects: JSON.parse(localStorage.getItem('vs-projects') || '{}'),
      design: JSON.parse(localStorage.getItem(dk) || '{}'),
      guide: localStorage.getItem(gk),
    }), [DESIGN_KEY, GUIDE_KEY])
    const mine = Object.values(stored.projects).flat()
    expect(mine).toHaveLength(1)
    expect(mine[0].name).toBe('Harbour Studio')
    expect(mine[0].design.identity?.name, 'the saved project does not carry the kit name').toBe('Harbour Studio')
    expect(mine[0].design.palette.colors).toEqual(SEED_COLOURS)
    expect(stored.design.identity?.name, 'the working design does not carry the kit name').toBe('Harbour Studio')
    expect(stored.guide, 'the walkthrough is still running after the save').toBeNull()
  })

  test('at the free cap: the refusal shows and nothing is lost', async ({ page }) => {
    watch(page, 'free designer with three projects already')
    await signIn(page, { plan: 'free', projects: 3 })
    await seed(page, { colours: true })
    await go(page, '/create/icons')

    await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
    await nameCard(page).getByRole('textbox', { name: 'Kit name' }).fill('Fourth Kit')
    await nameCard(page).getByRole('button', { name: 'Save project' }).click()

    const refusal = page.getByTestId('brand-kit-save-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toContainText('Free plan saves up to 3 projects')
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
    await expect(page).toHaveURL(/\/create\/icons$/)
    await expect(rail(page)).toBeVisible()
    await expect(nameCard(page).getByRole('textbox', { name: 'Kit name' })).toHaveValue('Fourth Kit')

    const stored = await page.evaluate(([dk, gk]) => ({
      count: Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat().length,
      colours: JSON.parse(localStorage.getItem(dk) || '{}').palette?.colors,
      guide: localStorage.getItem(gk),
    }), [DESIGN_KEY, GUIDE_KEY])
    expect(stored.count).toBe(3)
    expect(stored.colours).toEqual(SEED_COLOURS)
    expect(stored.guide).not.toBeNull()
  })

  test('signed out: saving asks for an account, and the work is there when they come back signed in', async ({ page }) => {
    watch(page, 'visitor finishing a brand kit with no account')
    await seed(page, { colours: true })
    await go(page, '/create/icons')

    // Every tool step ran without an account.
    await expect(page.locator('#ui-login-title')).toHaveCount(0)
    await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
    await expect(nameCard(page)).toContainText('Saving needs a free account')
    await nameCard(page).getByRole('textbox', { name: 'Kit name' }).fill('Harbour Studio')
    await nameCard(page).getByRole('button', { name: 'Save project' }).click()

    await expect(page.locator('#ui-login-title')).toBeVisible()
    // Saved work is a project; the kit is what gets exported.
    await expect(page.locator('#ui-login-promise')).toHaveText('You were about to save your project.')
    // Save cannot be pressed twice while the sign-in it asked for is open.
    const save = page.locator('.bkit-name-save')
    await expect(save).toBeDisabled()
    await expect(page).toHaveURL(/\/create\/icons$/)
    const held = await page.evaluate((dk) => JSON.parse(localStorage.getItem(dk) || '{}'), DESIGN_KEY)
    expect(held.palette?.colors).toEqual(SEED_COLOURS)
    expect(held.identity?.name).toBe('Harbour Studio')

    // Dismissing the sign-in hands Save back.
    await page.keyboard.press('Escape')
    await expect(page.locator('#ui-login-title')).toBeHidden()
    await expect(save).toBeEnabled()

    // Back signed in (the test double cannot complete the form itself): the
    // flow, the design and the name are all still there, and saving works.
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/create/icons')
    await expect(rail(page)).toBeVisible()
    await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
    await expect(nameCard(page).getByRole('textbox', { name: 'Kit name' })).toHaveValue('Harbour Studio')
    await nameCard(page).getByRole('button', { name: 'Save project' }).click()
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+$/)
    const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat())
    expect(saved).toHaveLength(1)
    expect(saved[0].design.palette.colors).toEqual(SEED_COLOURS)
    expect(saved[0].design.identity?.name).toBe('Harbour Studio')
  })

  // The sign-in completes inside the page, so there is no reload to hand the
  // work over: the save has to run by itself, once, when the account is there.
  const storedProjects = (page) => page.evaluate(
    () => Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat(),
  )
  const completeSignIn = (page) => page.evaluate(() => window.__UIL4B_TEST_AUTH__.signInNow())
  async function nameAndAskToSave(page, name) {
    await rail(page).getByRole('button', { name: /^Next: Name your kit/ }).click()
    await nameCard(page).getByRole('textbox', { name: 'Kit name' }).fill(name)
    await nameCard(page).getByRole('button', { name: 'Save project' }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
  }

  test('signed out: signing in on the page saves the named project once, with no reload', async ({ page }) => {
    watch(page, 'visitor who signs in part-way through finishing a kit')
    await signIn(page, { plan: 'free', projects: 0, lateSignIn: true, returning: false })
    await seed(page, { colours: true })
    await go(page, '/create/icons')
    await nameAndAskToSave(page, 'Harbour Studio')
    expect(await storedProjects(page)).toHaveLength(0)

    await completeSignIn(page)
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+$/)
    await expect(page.getByTestId('brand-kit-save-refusal')).toHaveCount(0)

    // Let any second save show itself before counting.
    await page.waitForTimeout(600)
    const saved = await storedProjects(page)
    expect(saved, 'the hand-off saved the project other than exactly once').toHaveLength(1)
    expect(saved[0].name).toBe('Harbour Studio')
    expect(saved[0].design.identity?.name).toBe('Harbour Studio')
    expect(saved[0].design.palette.colors).toEqual(SEED_COLOURS)
    expect(await page.evaluate((gk) => localStorage.getItem(gk), GUIDE_KEY)).toBeNull()
  })

  test('signed out: a Pro account over the free cap signs in on the page and the project saves', async ({ page }) => {
    watch(page, 'pro designer with three projects who signs in part-way through')
    await signIn(page, { plan: 'pro', projects: 3, lateSignIn: true, returning: false })
    await seed(page, { colours: true })
    await go(page, '/create/icons')
    await nameAndAskToSave(page, 'Fourth Kit')

    await completeSignIn(page)
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+$/)
    await expect(page.getByTestId('brand-kit-save-refusal'), 'a Pro account was told to go Pro').toHaveCount(0)

    await page.waitForTimeout(600)
    const saved = await storedProjects(page)
    expect(saved, 'three existing projects and the new one').toHaveLength(4)
    expect(saved.filter((p) => p.name === 'Fourth Kit')).toHaveLength(1)
  })
})
