// The brand kit walkthrough: chips, help card, starting in place, keyboard focus
// and leaving with the X, each at 390 and 1440.
//
// What would make each test fail:
//
//   · "a later step chip saves like Next": removing the onStepPress call on the
//     rail links (or the commitStep inside it) leaves the flag at "1" instead of
//     "1:color"; letting a chip behind commit makes the second read differ.
//   · "the help card names the step you are on": putting "Start with" or the
//     step-one sentence back in the card on a later step, or dropping the step
//     label from its title.
//   · "Build a brand kit pressed on the page it starts on": taking the
//     GUIDE_START_EVENT listener out of UIKitGuide, so the flag is written and
//     nothing mounts until a reload.
//   · "keyboard: focus lands in the card, Escape keeps it on the page": focusing
//     nothing when the card opens, or returning focus to <body> on close.
//   · "no ring is drawn round the whole card": removing the
//     `.bkit-card[tabindex]:focus-visible` rule in tool-shell.css, so the global
//     :focus-visible ring paints round the card.
//   · On a phone the bar has no X, no help button and no step chips: the steps
//     trigger opens a panel that holds the four step links, the help line and
//     "Close the walkthrough", so those tests drive the panel's equivalents.
//   · "two quick presses on the X": lowering .bkit-exit-shield below the phone
//     tab bar (z-index 118), or not rendering it, so the second press lands on
//     the tab bar's You tab or the palette's Add column.
//   · "Enter on the X": not moving focus to #main after the walkthrough ends, or
//     giving #main a visible outline.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { kitRail, helpCard, helpTrigger, stepLink, leaveControl, stepsPanel, expectOnStep } from './kit-bar.js'

const GUIDE_KEY = 'vs-uikit-guide'
const SEEN_KEY = 'vs-uikit-guide-seen'

const rail = kitRail
// The help card at this width: the popover from 768px, the steps panel on a phone.
const card = helpCard

/** Prior state, written once per tab so the app's own writes are not undone on a reload. */
async function seed(page, { guide = true, seen = true } = {}) {
  await page.addInitScript(({ guide, seen, keys }) => {
    try {
      if (sessionStorage.getItem('__bkit_polish_seeded') === '1') return
      sessionStorage.setItem('__bkit_polish_seeded', '1')
      if (guide) localStorage.setItem(keys.guide, '1')
      if (seen) localStorage.setItem(keys.seen, '1')
    } catch { /* private mode */ }
  }, { guide, seen, keys: { guide: GUIDE_KEY, seen: SEEN_KEY } })
}

/** The Create menu's brand kit button, reached and pressed with the keyboard. */
async function pressBrandKitByKeyboard(page, width) {
  if (width === 390) {
    const open = page.getByRole('button', { name: 'Open menu', exact: true })
    await open.focus()
    await page.keyboard.press('Enter')
    const create = page.locator('.pnav-acc-trigger').filter({ hasText: 'Create' })
    if (await create.getAttribute('aria-expanded') !== 'true') {
      await create.focus()
      await page.keyboard.press('Enter')
    }
  } else {
    await page.getByRole('button', { name: 'Create', exact: true }).focus()
    await page.keyboard.press('Enter')
  }
  const cta = page.locator(width === 390 ? '.pnav-acc-cta' : '.pnav-editorial-cta')
  await expect(cta).toHaveText('Build a brand kit')
  await cta.focus()
  await page.keyboard.press('Enter')
}

const focusInside = (locator) => locator.evaluate((el) => el.contains(document.activeElement))

for (const width of [390, 1440]) {
  test.describe(`Brand kit walkthrough polish at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('a later step chip saves like Next; a step behind writes nothing', async ({ page }) => {
      watch(page, 'designer jumping ahead with the rail')
      await seed(page)
      await go(page, '/create/palette')
      await expect(rail(page).locator('.bkit-step.is-done, .bkit-card-steps li.is-done')).toHaveCount(0)

      await (await stepLink(page, /Fonts/)).click()
      await expect(page).toHaveURL(/\/create\/font-pair$/)
      expect(await page.evaluate((k) => localStorage.getItem(k), GUIDE_KEY)).toBe('1:color')

      await expectOnStep(page, 'Fonts', 2)
      await (await stepLink(page, /Colours/)).click()
      await expect(page).toHaveURL(/\/create\/palette$/)
      expect(await page.evaluate((k) => localStorage.getItem(k), GUIDE_KEY), 'a chip behind wrote something').toBe('1:color')
    })

    test('the help card names the step you are on', async ({ page }) => {
      watch(page, 'designer asking what the fonts step is')
      await seed(page)
      await go(page, '/create/font-pair')
      await helpTrigger(page).click()

      if (width < 768) {
        // The phone's panel is named for the kit; the step you are on is the current link.
        const panel = stepsPanel(page)
        await expect(panel).toBeVisible()
        await expect(panel).not.toContainText(/step one/i)
        await expect(panel.locator('.bkit-sheet-help')).toHaveText('This step uses what you chose in the steps before it.')
        await expect(panel.getByRole('link', { name: /Fonts/ })).toHaveAttribute('aria-current', 'step')
        await expect(panel.locator('[aria-current="step"]')).toHaveCount(1)
        await expect(panel.getByRole('button', { name: /^Start with/ })).toHaveCount(0)
        return
      }
      const dialog = page.getByRole('dialog', { name: 'Step 2 of 4: Fonts' })
      await expect(dialog).toBeVisible()
      await expect(dialog).not.toContainText(/step one/i)
      await expect(dialog.getByRole('button', { name: 'Back to fonts' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /^Start with/ })).toHaveCount(0)
    })

    for (const from of ['/create/palette', '/create/font-pair']) {
      test(`keyboard from ${from}: Build a brand kit shows the walkthrough at once, focus lands in the card and Escape keeps it on the page`, async ({ page }) => {
        watch(page, 'keyboard-only designer starting the brand kit')
        await seed(page, { guide: false, seen: true })
        await go(page, from)
        await expect(rail(page)).toHaveCount(0)

        await pressBrandKitByKeyboard(page, width)

        await expect(page).toHaveURL(/\/create\/palette$/)
        await expect(rail(page)).toBeVisible()
        await expect(rail(page)).toContainText('Step 1 of 4')
        await expect(card(page)).toBeVisible()
        await expect.poll(() => focusInside(card(page)), { message: 'focus is not inside the walkthrough card' }).toBe(true)
        // The ring is on a control, so a keyboard user can see where they are.
        const ringOnActive = () => page.evaluate(() => {
          const el = document.activeElement
          const cs = getComputedStyle(el)
          return { tag: el.tagName, style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }
        })
        if (width < 768) {
          // The panel's heading takes focus (named, drawn without a ring, like the name
          // sheet's); the first Tab lands on a step link, and that one shows its ring.
          expect(await page.evaluate(() => document.activeElement?.tagName), 'focus is not on the panel heading').toBe('H2')
          await page.keyboard.press('Tab')
          const link = await ringOnActive()
          expect(link.tag).toBe('A')
          expect(link.style).not.toBe('none')
          expect(link.width).toBeGreaterThan(0)
          await expect(card(page).getByRole('link').first()).toBeFocused()
        } else {
          const outline = await ringOnActive()
          expect(outline.tag).toBe('BUTTON')
          expect(outline.style).not.toBe('none')
          expect(outline.width).toBeGreaterThan(0)
        }

        await page.keyboard.press('Escape')
        await expect(card(page)).toBeHidden()
        expect(await page.evaluate(() => document.activeElement === document.body), 'Escape dropped focus to the top of the page').toBe(false)
      })
    }

    test('after a reload the card takes focus on a control and no ring is drawn round the whole card', async ({ page }) => {
      watch(page, 'designer reloading with the card open')
      await seed(page, { guide: true, seen: false })
      await go(page, '/create/palette')
      await expect(card(page)).toBeVisible()
      await page.reload()
      await expect(card(page)).toBeVisible()
      await expect.poll(() => focusInside(card(page))).toBe(true)
      expect(await card(page).evaluate((el) => document.activeElement === el), 'focus sat on the card itself').toBe(false)

      // Even with focus on the card by keyboard, the card draws no outline of its own.
      await page.keyboard.press('Tab')
      await card(page).evaluate((el) => el.focus())
      expect(await card(page).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
    })

    test('the X leaves a cover over its spot, so a second press lands on nothing', async ({ page }) => {
      watch(page, 'designer pressing the X')
      await seed(page)
      await go(page, '/create/palette')
      await expect(rail(page)).toBeVisible()
      // Pressed, then read one frame later (well inside the cover's 500ms): the
      // control a second press would land on is whatever holds the X's spot once
      // the bar is gone (the Add column button, the phone tab bar's You tab).
      const hit = await (await leaveControl(page)).evaluate(async (el) => {
        const r = el.getBoundingClientRect()
        const px = r.left + r.width / 2
        const py = r.top + r.height / 2
        el.click()
        await new Promise((resolve) => requestAnimationFrame(() => resolve()))
        const top = document.elementFromPoint(px, py)
        return { shield: !!top?.closest('.bkit-exit-shield'), what: String(top?.className || top?.tagName || 'nothing') }
      })
      expect(hit.shield, `the second press would land on ${hit.what}`).toBe(true)
      await expect(rail(page)).toBeHidden()
      await expect(page.locator('.bkit-exit-shield')).toHaveCount(0, { timeout: 3000 })
    })

    test('two quick presses on the X change nothing else on the page', async ({ page }) => {
      watch(page, 'designer double-pressing the X')
      await seed(page)
      await go(page, '/create/palette')
      await expect(rail(page)).toBeVisible()
      const cols = await page.locator('.plb-col').count()
      const url = page.url()
      const box = await (await leaveControl(page)).boundingBox()
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect(rail(page)).toBeHidden()
      expect(await page.locator('.plb-col').count(), 'the second press added a colour').toBe(cols)
      expect(page.url(), 'the second press moved the page').toBe(url)
      await expect(page.getByRole('dialog'), 'the second press opened a dialog').toHaveCount(0)
    })

    test('Enter on the X leaves no ring round the page and focus stays on the page', async ({ page }) => {
      watch(page, 'keyboard designer leaving the walkthrough')
      await seed(page)
      await go(page, '/create/palette')
      await (await leaveControl(page)).focus()
      await page.keyboard.press('Enter')
      await expect(rail(page)).toBeHidden()
      await expect(page.locator('#main')).toBeFocused()
      expect(await page.locator('#main').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
    })
  })
}
