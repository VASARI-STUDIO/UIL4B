// The Spending card in the Palette Builder's "Preview on a UI" dialog is a softly
// interactive mockup. 153 holds how every example renders and 50 holds its ink;
// this holds what a person DOES with the Spending card, and the dialog around it.
//
//   1. the State menu shows one state at a time, and the keyboard reaches every state (Escape: a known product bug, see test.fail)
//   2. the dialog opens in the site's theme; Light / Dark repaints the scene
//   3. the card render is tinted with the palette's primary
//   4. a failing role has no outline at rest and gets one under the pointer
//   5. the tabs switch the list
//   6. Freeze turns into Unfreeze and the State menu follows (and back)
//   7. Save limits shows the toast and hands back to the Overview
//   8. the compare view (two palettes side by side) is a still picture: no buttons
//
// Nothing is mocked: the dialog is opened the way a person opens it, signed in as
// Pro (the Spending card is a Pro example), at 1440 so the State menu is in the header.
//
// To make each go red (undo it after):
//   1  in PalettePreviewDialog.jsx StateList, make ArrowDown stop at index 1; or render two `.ty`
//   2  in PaletteBuilder.jsx setPreview({ mode: 'light', ... }) at the Preview button (line ~2736)
//   3  in Recolour.css delete the `.rc-tint` rule's `background:var(--rc-color)`
//   4  in palette-preview.css make the `[data-fail="on"]` rule apply without :hover (it shows at rest)
//   5  in Tally.jsx make Tabs' onClick `live.setTab(0)`
//   6  in Tally.jsx `act`, call onState('frozen') whatever `frozen` is
//   7  in Tally.jsx `save`, drop `setSaved(true)`; or set SAVED_MS to 60000
//   8  in Tally.jsx `isLive`, drop the `!pair &&` AND hand the compare Stage an onState
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

const STATES = ['Overview', 'Card frozen', 'Limits', 'Declined payment']
// The data-state each label sets on the scene root, by hand from Tally.jsx (overview, frozen, limits, declined).
const STATE_ID = { Overview: 'overview', 'Card frozen': 'frozen', Limits: 'limits', 'Declined payment': 'declined' }

const MID = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']
// Every colour near white: the primary cannot reach 3:1 on the surface, so the legend flags it as failing.
const PALE = ['#f3e9d2', '#f7dcd0', '#e4efe0', '#dfe9f5', '#f2e4f0']
const RED = ['#c8321e', '#e8a33d', '#2f6b4f', '#f1d9c4', '#4a1d1d']
const BLUE = ['#1e50c8', '#3da3e8', '#2f6b4f', '#c4d9f1', '#1d2b4a']

async function seed(page, colors) {
  await page.addInitScript((cols) => {
    const raw = localStorage.getItem('vs-current-design')
    const design = raw ? JSON.parse(raw) : {}
    design.palette = {
      ...(design.palette || {}),
      base: cols[0], harmony: 'auto', extraColors: [], activeIdx: 0,
      colors: cols, baseColors: cols,
      globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
    }
    localStorage.setItem('vs-current-design', JSON.stringify(design))
  }, colors)
}

/** The site's own theme, as the theme switch stores it (vs-t). */
const siteTheme = (page, theme) => page.addInitScript((t) => localStorage.setItem('vs-t', t), theme)

/** Open the preview dialog on the Spending card, Pro, the way a person does. */
async function openCard(page, { colors = MID, theme } = {}) {
  await seed(page, colors)
  if (theme) await siteTheme(page, theme)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('option', { name: /^Spending card/ }).click()
  await expect(dialog.locator('.pvs[data-preview-scene="Spending card"] .ty')).toBeVisible()
  // A Pro example stays behind the Unlock plate until the account's plan is known; wait for it to lift.
  await expect(dialog.locator('.pvd-scene.is-locked'), 'the Pro gate lifted').toHaveCount(0)
  return dialog
}

const scene = (dialog) => dialog.locator('.pvs[data-preview-scene="Spending card"]')
const trigger = (dialog) => dialog.getByRole('button', { name: /^State\b/ })
/** The state the scene is showing, read off the scene itself and not off the menu. */
const shown = (dialog) => scene(dialog).locator('.ty').getAttribute('data-state')

// ── 1. the State menu ────────────────────────────────────────────────────────

test.describe('the State menu', () => {
  test('lists the four states, checks exactly one, and the scene shows only that one', async ({ page }) => {
    watch(page, 'designer reading the Spending card State menu')
    const dialog = await openCard(page)
    await trigger(dialog).click()
    const items = dialog.getByRole('menuitemradio')
    await expect(items).toHaveText(STATES)
    for (const label of STATES) {
      await items.filter({ hasText: label }).click()
      await expect(trigger(dialog)).toContainText(label)
      await expect(scene(dialog).locator('.ty'), `${label}: one scene on the stage, not one per state`).toHaveCount(1)
      await expect.poll(() => shown(dialog), `${label}: the scene is in that state`).toBe(STATE_ID[label])
      // The shapes that belong to one state only: the form is Limits', the freeze line is the frozen and declined ones'.
      await expect(scene(dialog).locator('.ty-limits'), `${label}: the form`).toHaveCount(label === 'Limits' ? 1 : 0)
      await expect(scene(dialog).locator('.ty-frozen'), `${label}: the frozen line`).toHaveCount(label === 'Card frozen' || label === 'Declined payment' ? 1 : 0)
      await trigger(dialog).click()
      await expect(items.and(dialog.locator('[aria-checked="true"]')), `${label}: exactly one state is checked`).toHaveCount(1)
      await expect(dialog.getByRole('menuitemradio', { name: label, exact: true })).toHaveAttribute('aria-checked', 'true')
    }
  })

  test('the keyboard reaches every state: open, arrows, Home and End, Escape back to the button', async ({ page }) => {
    watch(page, 'keyboard user walking the Spending card States')
    const dialog = await openCard(page)
    const btn = trigger(dialog)
    await btn.focus()
    await page.keyboard.press('Enter')
    const checked = dialog.locator('[role="menuitemradio"][aria-checked="true"]')
    await expect(checked, 'opens on the current state, focused').toBeFocused()
    await expect(checked).toHaveText('Overview')

    // ArrowDown walks the list and the scene follows each step.
    for (const label of STATES.slice(1)) {
      await page.keyboard.press('ArrowDown')
      await expect(checked).toHaveText(label)
      await expect(checked).toBeFocused()
      await expect.poll(() => shown(dialog), `${label} reached by ArrowDown`).toBe(STATE_ID[label])
    }
    // The list stops at its end.
    await page.keyboard.press('ArrowDown')
    await expect(checked).toHaveText('Declined payment')
    for (const label of STATES.slice(0, -1).reverse()) {
      await page.keyboard.press('ArrowUp')
      await expect(checked).toHaveText(label)
      await expect.poll(() => shown(dialog), `${label} reached by ArrowUp`).toBe(STATE_ID[label])
    }
    await page.keyboard.press('End')
    await expect.poll(() => shown(dialog), 'End').toBe('declined')
    await page.keyboard.press('Home')
    await expect.poll(() => shown(dialog), 'Home').toBe('overview')

  })

  // PRODUCT BUG, found writing this spec (reported, not fixed here: outside the test lane). With the State
  // menu open, Escape closes the WHOLE preview dialog. useModalDialog.js:111-113 skips its own close when
  // a [aria-haspopup][aria-expanded="true"] trigger is on screen, expecting the menu's own listener to take
  // the key; PalettePreviewDialog.jsx useEscapeLayer (line 70) only fills layerRef, which nothing reads on
  // that path, and PaletteBuilder.jsx:1586-1590 (window keydown) then runs setPreview(null). The same holds
  // for the scene menu and the legend's "+N more". test.fail keeps this running: it goes red the day the
  // product is fixed, which is the cue to delete the test.fail line.
  test('Escape closes the State menu and not the dialog, and focus returns to the State button', async ({ page }) => {
    test.fail(true, 'product bug: Escape with the State menu open closes the whole preview dialog (useModalDialog.js:111, PaletteBuilder.jsx:1590)')
    const dialog = await openCard(page)
    const btn = trigger(dialog)
    await btn.click()
    await expect(dialog.getByRole('menu', { name: 'State' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog, 'Escape closed the menu and not the dialog').toBeVisible()
    await expect(dialog.getByRole('menu', { name: 'State' })).toHaveCount(0)
    await expect(btn, 'focus returns to the State button').toBeFocused()
  })

  test('Enter on a state picks it and closes the menu', async ({ page }) => {
    const dialog = await openCard(page)
    await trigger(dialog).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(dialog.getByRole('menu', { name: 'State' })).toHaveCount(0)
    await expect(trigger(dialog)).toContainText('Limits')
    await expect.poll(() => shown(dialog)).toBe('limits')
    await expect(scene(dialog).getByRole('button', { name: 'Save limits' })).toBeVisible()
  })
})

// ── 2. theme ─────────────────────────────────────────────────────────────────

/** The lightness of the scene's own ground, 0 (black) to 1 (white), read from what the browser computed. */
const groundLightness = (loc) => loc.evaluate((el) => {
  const [r, g, b] = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).map(Number)
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
})

test.describe('the preview theme', () => {
  for (const site of ['dark', 'light']) {
    test(`opens ${site} when the site is ${site}, and the Light / Dark toggle repaints the scene`, async ({ page }) => {
      watch(page, `designer previewing the Spending card with the site ${site}`)
      const dialog = await openCard(page, { theme: site })
      await expect(page.locator('html')).toHaveAttribute('data-theme', site)
      const sc = scene(dialog)
      const group = dialog.getByRole('group', { name: 'Preview theme' })
      const other = site === 'dark' ? 'light' : 'dark'
      const label = (m) => (m === 'dark' ? 'Dark' : 'Light')

      await expect(sc, 'opens in the site theme').toHaveAttribute('data-mode', site)
      await expect(group.getByRole('button', { name: label(site), exact: true })).toHaveAttribute('aria-pressed', 'true')
      const before = await groundLightness(sc)
      if (site === 'dark') expect(before, 'a dark scene has a dark ground').toBeLessThan(0.1)
      else expect(before, 'a light scene has a light ground').toBeGreaterThan(0.5)

      await group.getByRole('button', { name: label(other), exact: true }).click()
      await expect(sc).toHaveAttribute('data-mode', other)
      await expect(sc).toHaveAttribute('aria-label', new RegExp(`${other} theme$`))
      await expect(group.getByRole('button', { name: label(other), exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(() => groundLightness(sc), 'the ground was repainted').not.toBeCloseTo(before, 1)
      const after = await groundLightness(sc)
      if (other === 'dark') expect(after).toBeLessThan(0.1)
      else expect(after).toBeGreaterThan(0.5)
      // The toggle repaints the scene, not the page it sits on.
      await expect(page.locator('html')).toHaveAttribute('data-theme', site)
    })
  }
})

// ── 3. the card is tinted with the primary ───────────────────────────────────

/** The mean colour of the card render as the screen shows it (its pixels, text and all). */
async function cardMean(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.ty-cardface .rc-base')].every((i) => i.complete && i.naturalWidth > 0))
  const card = page.locator('.ty-cardface')
  await card.scrollIntoViewIfNeeded()
  // The tint is a CSS mask that loads after the picture; wait until two shots in a row agree.
  let prev = null
  let mean = null
  for (let i = 0; i < 20; i++) {
    const png = (await card.screenshot()).toString('base64')
    mean = await page.evaluate(async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const cv = document.createElement('canvas')
      cv.width = img.width
      cv.height = img.height
      const cx = cv.getContext('2d')
      cx.drawImage(img, 0, 0)
      const px = cx.getImageData(0, 0, cv.width, cv.height).data
      let r = 0; let g = 0; let b = 0; let n = 0
      for (let k = 0; k < px.length; k += 4) {
        if (px[k + 3] < 250) continue
        r += px[k]; g += px[k + 1]; b += px[k + 2]; n++
      }
      return { r: r / n, g: g / n, b: b / n }
    }, png)
    if (prev && Math.abs(prev.r - mean.r) + Math.abs(prev.g - mean.g) + Math.abs(prev.b - mean.b) < 1) break
    prev = mean
    await page.waitForTimeout(100)
  }
  return mean
}

test.describe('the card render', () => {
  test('is tinted with the palette primary: the tint layer carries it, and a red palette paints a redder card than a blue one', async ({ browser }) => {
    const seen = {}
    for (const [name, colors] of [['red', RED], ['blue', BLUE]]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `designer previewing a ${name} palette on the Spending card`)
      try {
        const dialog = await openCard(page, { colors })
        const tint = await dialog.locator('.ty-cardface .rc-tint').evaluate((el) => getComputedStyle(el).backgroundColor)
        const wrap = await dialog.locator('.ty-cardface').evaluate((el) => getComputedStyle(el).getPropertyValue('--rc-color').trim())
        seen[name] = { tint, wrap, mean: await cardMean(page) }
      } finally {
        await ctx.close()
      }
    }
    // The wrapper hands the tint layer the very colour it was given.
    const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`
    for (const name of ['red', 'blue']) {
      expect(seen[name].tint, `${name}: the tint layer paints --rc-color`).toBe(rgb(seen[name].wrap))
    }
    expect(seen.red.wrap, 'the two palettes tint with different colours').not.toBe(seen.blue.wrap)
    // And the pixels follow: the red card leans red, the blue card leans blue, and they differ.
    const lean = (m) => m.r - m.b
    expect(lean(seen.red.mean), `red card pixels ${JSON.stringify(seen.red.mean)}`).toBeGreaterThan(20)
    expect(lean(seen.blue.mean), `blue card pixels ${JSON.stringify(seen.blue.mean)}`).toBeLessThan(-20)
  })
})

// ── 4. the fail outline ──────────────────────────────────────────────────────

test.describe('a failing colour', () => {
  test('has no error outline at rest and gets one under the pointer', async ({ page }) => {
    watch(page, 'designer whose pale primary fails its floor')
    const dialog = await openCard(page, { colors: PALE })
    // The legend flags the failing role at all times.
    await expect(dialog.locator('.pvd-chip.is-fail:not(.pvd-legend-ghost *)').first(), 'the legend flags a failing role').toBeVisible()
    const flagged = scene(dialog).locator('[data-fail="on"]')
    await expect.poll(() => flagged.count(), 'the scene marks the failing role on an element').toBeGreaterThan(0)
    const el = flagged.first()
    const outline = () => el.evaluate((n) => { const s = getComputedStyle(n); return { style: s.outlineStyle, color: s.outlineColor, width: s.outlineWidth } })
    const errorColor = await scene(dialog).evaluate((n) => {
      const probe = document.createElement('i')
      probe.style.color = 'var(--pv-error)'
      n.appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    })

    // At rest (pointer parked on the dialog title, away from the scene): the outline is transparent.
    await dialog.getByText('Preview', { exact: true }).first().hover()
    await expect.poll(async () => (await outline()).color, 'no outline colour at rest').toMatch(/rgba\(\s*0,\s*0,\s*0,\s*0\)|transparent/)

    await el.scrollIntoViewIfNeeded()
    await el.hover()
    await expect.poll(async () => await outline(), 'a solid error-coloured outline under the pointer').toMatchObject({ style: 'solid', color: errorColor, width: '2px' })

    // Moving off takes it away again.
    await dialog.getByText('Preview', { exact: true }).first().hover()
    await expect.poll(async () => (await outline()).color).toMatch(/rgba\(\s*0,\s*0,\s*0,\s*0\)|transparent/)
  })
})

// ── 5 to 7. what the controls do ─────────────────────────────────────────────

test.describe('the controls', () => {
  test('the tabs switch the list: Spending shows the transactions, Upcoming the scheduled payments', async ({ page }) => {
    watch(page, 'designer clicking the Spending card tabs')
    const dialog = await openCard(page)
    const sc = scene(dialog)
    const tabs = sc.getByRole('tablist', { name: 'Activity' })
    const spending = tabs.getByRole('tab', { name: 'Spending' })
    const upcoming = tabs.getByRole('tab', { name: 'Upcoming' })
    await expect(spending).toHaveAttribute('aria-selected', 'true')
    await expect(sc.getByRole('tabpanel')).toContainText('Marrickville Fresh Market')
    await expect(sc.getByText('Pulse Fitness')).toHaveCount(0)

    await upcoming.click()
    await expect(upcoming).toHaveAttribute('aria-selected', 'true')
    await expect(spending).toHaveAttribute('aria-selected', 'false')
    await expect(sc.getByRole('tabpanel')).toContainText('Pulse Fitness')
    await expect(sc.getByRole('tabpanel')).not.toContainText('Marrickville Fresh Market')

    // Arrow keys move between tabs, as a tab list does, and back.
    await spending.click()
    await expect(sc.getByRole('tabpanel')).toContainText('Marrickville Fresh Market')
    await spending.focus()
    await page.keyboard.press('ArrowRight')
    await expect(upcoming).toBeFocused()
    await expect(sc.getByRole('tabpanel')).toContainText('Pulse Fitness')
  })

  test('Freeze turns into Unfreeze and the State menu follows, there and back', async ({ page }) => {
    watch(page, 'designer freezing the card')
    const dialog = await openCard(page)
    const sc = scene(dialog)
    await expect(trigger(dialog)).toContainText('Overview')
    await expect(sc.getByRole('button', { name: 'Unfreeze', exact: true })).toHaveCount(0)

    await sc.getByRole('button', { name: 'Freeze', exact: true }).click()
    await expect(sc.getByRole('button', { name: 'Unfreeze', exact: true })).toBeVisible()
    await expect(sc.getByRole('button', { name: 'Freeze', exact: true })).toHaveCount(0)
    await expect(trigger(dialog), 'the State menu moved to Card frozen').toContainText('Card frozen')
    await expect(sc.locator('.ty-frozen'), 'a frozen card says so in words').toBeVisible()
    await trigger(dialog).click()
    await expect(dialog.getByRole('menuitemradio', { name: 'Card frozen', exact: true })).toHaveAttribute('aria-checked', 'true')
    await trigger(dialog).click()
    await expect(dialog.getByRole('menu', { name: 'State' })).toHaveCount(0)

    await sc.getByRole('button', { name: 'Unfreeze', exact: true }).click()
    await expect(sc.getByRole('button', { name: 'Freeze', exact: true })).toBeVisible()
    await expect(trigger(dialog), 'the State menu moved back to Overview').toContainText('Overview')
    await expect(sc.locator('.ty-frozen')).toHaveCount(0)
  })

  test('Save limits shows the toast, then hands back to the Overview', async ({ page }) => {
    watch(page, 'designer saving the Spending card limits')
    const dialog = await openCard(page)
    const sc = scene(dialog)
    await sc.getByRole('button', { name: 'Limits', exact: true }).click()
    await expect(trigger(dialog)).toContainText('Limits')
    await expect(sc.locator('.ty-limits')).toBeVisible()
    await expect(sc.getByText('Budget saved'), 'no toast before anything is saved').toHaveCount(0)

    await sc.getByRole('button', { name: 'Save limits' }).click()
    await expect(sc.getByRole('status').getByText('Budget saved'), 'the toast is announced').toBeVisible()
    // Still on the form while the toast shows; then the Overview comes back by itself.
    await expect(sc.locator('.ty-limits')).toBeVisible()
    await expect(trigger(dialog)).toContainText('Overview', { timeout: 6000 })
    await expect(sc.locator('.ty-limits')).toHaveCount(0)
    await expect(sc.getByText('Budget saved')).toHaveCount(0)
    await expect.poll(() => shown(dialog)).toBe('overview')
    await expect(sc.getByRole('tablist', { name: 'Activity' }), 'the Overview is back').toBeVisible()
  })
})

// ── 8. the compare view is a still picture ───────────────────────────────────

test.describe('the compare view', () => {
  test('shows the Spending card twice as a still picture: no buttons, no inputs, no tab list', async ({ page }) => {
    watch(page, 'designer comparing a suggested palette on the Spending card')
    await seed(page, MID)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/palette')
    await clickPaletteAction(page, 'Suggest variations and brands', 'Suggest')
    const compare = page.getByRole('button', { name: /^Compare .* with your palette$/ }).first()
    await expect(compare).toBeVisible()
    await compare.click()
    const dialog = page.getByRole('dialog', { name: 'Palette preview' })
    await expect(dialog.getByText('Compare palettes')).toBeVisible()
    await dialog.getByRole('option', { name: /^Spending card/ }).click()

    const panes = dialog.locator('.pvd-stage.is-compare .pvd-pane')
    await expect(panes).toHaveCount(2)
    await expect(panes.locator('.pvs[data-preview-scene="Spending card"] .ty')).toHaveCount(2)
    for (const i of [0, 1]) {
      const pane = panes.nth(i)
      await expect(pane.locator('.ty-wordmark'), `pane ${i}: the scene has drawn`).toBeVisible()
      // The live scene is a group of controls; the still one is one picture.
      await expect(pane.locator('.pvs'), `pane ${i}`).toHaveAttribute('role', 'img')
      await expect(pane.locator('.ty').first()).not.toHaveClass(/is-live/)
      for (const sel of ['button', 'input', '[role="tab"]', '[role="switch"]', 'a[href]']) {
        await expect(pane.locator('.pvs').locator(sel), `pane ${i}: no ${sel}`).toHaveCount(0)
      }
    }
    // The dialog's own button (Use ...) is outside the scene and still there.
    await expect(dialog.getByRole('button', { name: /^Use / })).toBeVisible()
  })
})
