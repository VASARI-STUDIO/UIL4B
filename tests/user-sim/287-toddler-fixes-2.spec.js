// Five small fixes found by a first-time-visitor test, one describe each.
//
//   1. /discover/palettes "Save to project" stays in the gallery: signed out it
//      opens the same sign-in popup Like uses, signed in it saves a project in
//      place and toasts a link to open it.
//   2. The right-click feedback menu is headed in plain words, never a CSS
//      selector, and still yields to a text selection.
//   3. The Community submit dialogs are readable and reachable on a phone:
//      text of 13px or more, a 44px close, and the actions in view in landscape.
//   4. The page does not move behind a dialog, however the move is made.
//   5. An icon search that finds nothing offers a synonym as a button.
//
// Phone tests use touch metrics (isMobile + hasTouch) and viewport screenshots
// only, saved to .claude/scratch/toddler2/.
//
// MUTATIONS (each should fail the named test):
//   * restore `navigate('/login')` in PaletteGalleryGrid saveToProject
//       -> "signed out, Save to project opens the sign-in popup and stays put"
//   * put `{at.signature}` back in the FeedbackContextMenu head
//       -> "the menu head is plain words, not a selector"
//   * delete the `.ui-modal--form .ui-modal-x` rule in tool-shell.css
//       -> "the close control is a 44px target"
//   * pass `lockScroll()` without `{ hold: true }` in useModalDialog
//       -> "the page does not move behind the sign-in popup"
//   * empty ICON_SYNONYM_PAIRS in src/data/iconSynonyms.js
//       -> "an empty search offers its synonym as a button"
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER } from './iconify-stub.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'toddler2')

const loginDialog = (page) => page.getByRole('dialog').filter({ has: page.locator('#ui-login-title') })

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
}

async function phone(browser, { width, height }) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA,
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

const frames = (page, n = 3) => page.evaluate(
  (count) => new Promise((resolve) => {
    let left = count
    const tick = () => { left -= 1; if (left <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }),
  n,
)

// ── 1. Save to project stays in the gallery ──────────────────────────────────

test.describe('palette gallery: Save to project', () => {
  async function saveButton(page) {
    const card = page.locator('.pgal-card').first()
    await expect(card).toBeVisible({ timeout: 20000 })
    // Hover reveals the actions, then focus holds them open: a pointer click
    // alone races the sticky nav and the actions' reveal transition.
    await card.hover()
    const save = card.getByRole('button', { name: /^Save .* to a project$/ })
    await expect(save).toBeVisible()
    await save.focus()
    await frames(page)
    return save
  }

  test('signed out, Save to project opens the sign-in popup and stays put', async ({ page }) => {
    watch(page, 'a visitor saving a palette without an account')
    await go(page, '/discover/palettes')
    await saveButton(page)
    const before = await page.evaluate(() => window.scrollY)

    await page.keyboard.press('Enter')
    await expect(loginDialog(page), 'the sign-in popup Like uses').toBeVisible()
    expect(new URL(page.url()).pathname, 'the gallery was left').toBe('/discover/palettes')
    await expect(page.locator('.toast.show')).toHaveCount(0)
    expect(await page.evaluate(() => window.scrollY), 'the gallery lost its scroll').toBe(before)

    await page.keyboard.press('Escape')
    await expect(loginDialog(page)).toBeHidden()
    expect(new URL(page.url()).pathname).toBe('/discover/palettes')
  })

  test('signed in, it saves a project in place and the toast opens it', async ({ page }) => {
    watch(page, 'a member saving a palette')
    await signIn(page, { plan: 'free' })
    await go(page, '/discover/palettes')
    const name = (await page.locator('.pgal-card .pgal-name').first().textContent()).trim()
    await saveButton(page)
    const before = await page.evaluate(() => window.scrollY)

    await page.keyboard.press('Enter')
    const toast = page.locator('.toast.show')
    await expect(toast).toContainText(`Saved ${name} to a new project`)
    expect(new URL(page.url()).pathname, 'a signed-in save must not leave the gallery').toBe('/discover/palettes')
    expect(await page.evaluate(() => window.scrollY), 'the gallery lost its scroll').toBe(before)

    const kept = await page.evaluate((wanted) => {
      for (let i = 0; i < localStorage.length; i += 1) {
        const raw = localStorage.getItem(localStorage.key(i)) || ''
        if (!raw.includes(wanted)) continue
        try {
          const found = Object.values(JSON.parse(raw)).flat().find((p) => p?.name === wanted)
          if (found) return found.design?.palette?.colors ?? []
        } catch { /* not a projects store */ }
      }
      return []
    }, name)
    expect(kept.length, 'the saved project carries the palette').toBeGreaterThan(1)

    await toast.getByRole('button', { name: 'Open' }).click()
    await expect(page).toHaveURL(/\/projects\/[^/]+$/)
  })
})

// ── 2. The right-click menu names things in plain words ──────────────────────

test.describe('right-click feedback menu', () => {
  test('the menu head is plain words, not a selector', async ({ page }) => {
    watch(page, 'a visitor right-clicking a colour swatch')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/discover/palettes')
    const stripe = page.locator('.pgal-stripe').first()
    await expect(stripe).toBeVisible({ timeout: 20000 })
    const head = page.locator('.fbx-menu .pop-head')
    // The menu closes on any scroll, and the gallery can still settle after
    // load, so open it again until one read lands while it is up.
    let read
    await expect(async () => {
      if (!(await head.isVisible())) await stripe.click({ button: 'right' })
      read = await head.evaluate((el) => ({ text: el.textContent.trim(), font: getComputedStyle(el).fontFamily }), null, { timeout: 2000 })
    }).toPass({ timeout: 15000 })
    const { text, font } = read
    expect(text, 'the head names the swatch by its accessible name').toMatch(/^Button: Copy #[0-9A-F]{6}$/i)
    expect(text, 'a CSS selector reached the visitor').not.toMatch(/pgal-stripe|^button\.|^\.|\[data-/)
    expect(font.toLowerCase(), 'the head is a label, not mono').not.toMatch(/mono|consolas|courier/)
  })

  test('a text selection keeps the browser menu', async ({ page }) => {
    watch(page, 'a visitor copying a heading')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/discover/palettes')
    const heading = page.locator('h1').first()
    await heading.dblclick()
    await heading.click({ button: 'right' })
    await expect(page.locator('.fbx-menu')).toHaveCount(0)
  })
})

// ── 3. Community submit dialogs on a phone ───────────────────────────────────

test.describe('community submit dialogs on a phone', () => {
  const DIALOGS = [
    { opener: /^Submit design$/, name: /Submit a design/i, action: 'Submit design' },
    { opener: /^Submit icon$/, name: /Submit an icon/i, action: 'Submit icon' },
  ]

  async function openDialog(page, d) {
    await go(page, '/community')
    await page.getByRole('button', { name: d.opener }).first().tap()
    const dialog = page.getByRole('dialog', { name: d.name })
    await expect(dialog).toBeVisible()
    return dialog
  }

  for (const d of DIALOGS) {
    test(`${d.action}: text is 13px or more and the close control is a 44px target at 390`, async ({ browser }) => {
      const { ctx, page } = await phone(browser, { width: 390, height: 844 })
      watch(page, 'a member on a phone opening a community form')
      await signIn(page, { plan: 'free' })
      const dialog = await openDialog(page, d)

      const sizes = await dialog.evaluate((root) => {
        const px = (el) => parseFloat(getComputedStyle(el).fontSize)
        const pick = (sel) => [...root.querySelectorAll(sel)].map(px)
        return {
          labels: pick('.ui-field>span'),
          note: pick('.ui-modal-note'),
          buttons: pick('.ui-modal-actions .btn'),
        }
      })
      for (const [what, list] of Object.entries(sizes)) {
        expect(list.length, `${what} should exist in the dialog`).toBeGreaterThan(0)
        for (const size of list) expect(size, `${what} is ${size}px`).toBeGreaterThanOrEqual(13)
      }

      // Layout size, not the painted box: the dialog scales in as it opens.
      const box = await dialog.getByRole('button', { name: 'Close' }).evaluate((el) => ({ width: el.offsetWidth, height: el.offsetHeight }))
      expect(box.width, 'the close control is a 44px target').toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      await shot(page, `${d.action.replace(/\s/g, '-').toLowerCase()}-390`)
      await ctx.close()
    })

    test(`${d.action}: the actions stay in view in landscape (844x390)`, async ({ browser }) => {
      const { ctx, page } = await phone(browser, { width: 844, height: 390 })
      watch(page, 'a member on a landscape phone opening a community form')
      await signIn(page, { plan: 'free' })
      const dialog = await openDialog(page, d)

      const submit = dialog.getByRole('button', { name: d.action, exact: true })
      const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
      for (const control of [submit, cancel]) {
        const box = await control.boundingBox()
        expect(box.y, 'the action starts above the top edge').toBeGreaterThanOrEqual(0)
        expect(box.y + box.height, 'the action sits below the fold').toBeLessThanOrEqual(390)
      }
      await shot(page, `${d.action.replace(/\s/g, '-').toLowerCase()}-844x390`)
      await ctx.close()
    })
  }
})

// ── 4. The page does not move behind a dialog ────────────────────────────────

test.describe('sign-in popup and page scroll', () => {
  test('the page does not move behind the sign-in popup, including repeated taps', async ({ browser }) => {
    const { ctx, page } = await phone(browser, { width: 390, height: 844 })
    watch(page, 'a visitor tapping a heart three times')
    await go(page, '/community')

    const heart = page.locator('.ch-heart').first()
    await heart.scrollIntoViewIfNeeded()
    await frames(page)
    const rest = await page.evaluate(() => window.scrollY)

    await heart.tap()
    await expect(loginDialog(page)).toBeVisible()
    await frames(page)
    expect(await page.evaluate(() => window.scrollY), 'opening the popup moved the page').toBe(rest)
    await shot(page, 'signin-popup-390')

    // The move a driver or a focus() makes: script, not the user. With only the
    // overflow lock this succeeds; the hold puts it back before the next paint.
    await page.evaluate((y) => window.scrollTo({ top: y + 499, behavior: 'instant' }), rest)
    await frames(page)
    expect(await page.evaluate(() => window.scrollY), 'script scrolled the page behind the popup').toBe(rest)

    // Repeated taps on the trigger land on the popup's scrim, as a finger's would.
    for (let i = 0; i < 3; i += 1) {
      await heart.tap({ force: true })
      await frames(page)
    }
    expect(await page.evaluate(() => window.scrollY), 'repeated taps moved the page').toBe(rest)
    await ctx.close()
  })
})

// ── 5. Icon search: a synonym hint ───────────────────────────────────────────

test.describe('icon search synonym hint', () => {
  test('an empty search offers its synonym as a button, and pressing it searches', async ({ page }) => {
    watch(page, 'a designer searching for a padlock icon')
    // The catalogue answers "padlock" with nothing, so the empty state is the
    // thing under test; every other query is left to the fixture.
    await page.route(
      (u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/search' && u.searchParams.get('query') === 'padlock',
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { [ICONIFY_STUB_HEADER]: '1', 'access-control-allow-origin': '*' },
        body: JSON.stringify({ icons: [], total: 0, limit: 999, start: 0, collections: {} }),
      }),
    )
    const lockSearches = []
    page.on('request', (r) => {
      const u = new URL(r.url())
      if (ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/search' && u.searchParams.get('query') === 'lock') lockSearches.push(r.url())
    })
    await go(page, '/create/icons')
    await expect.poll(() => page.locator('.ic').count(), { timeout: 20000 }).toBeGreaterThan(20)

    const input = page.locator('.lbry-search input').first()
    await input.fill('padlock')
    const empty = page.getByRole('status').filter({ hasText: /No icons match/ })
    await expect(empty).toBeVisible({ timeout: 20000 })
    await expect(empty).toContainText('No icons match “padlock”. Try “lock”.')
    expect(lockSearches, 'the synonym searched before it was pressed').toHaveLength(0)

    await empty.getByRole('button', { name: 'Search “lock” instead' }).click()
    await expect(input).toHaveValue('lock')
    await expect.poll(() => lockSearches.length, { timeout: 10000 }).toBeGreaterThan(0)
    await expect(empty.getByRole('button', { name: /instead/ })).toHaveCount(0)
  })

  test('a word with no synonym keeps the generic line and offers no button', async ({ page }) => {
    watch(page, 'a designer searching for a word the catalogue does not carry')
    await go(page, '/create/icons')
    await expect.poll(() => page.locator('.ic').count(), { timeout: 20000 }).toBeGreaterThan(20)
    await page.locator('.lbry-search input').first().fill('zzzqqqxyz')
    const empty = page.getByRole('status').filter({ hasText: /No icons match/ })
    await expect(empty).toContainText('Try another word, or clear the search to browse everything.')
    await expect(empty.getByRole('button')).toHaveCount(0)
  })
})
