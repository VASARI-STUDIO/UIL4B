// FIVE SMALL FIXES, EACH HELD BY WHAT A PERSON SEES.
//
//   1. Header search on a phone: the "esc" chip is a real 44px close button
//      with a name, and result descriptions wrap in full instead of being cut
//      at the category pill. The Icon Library row no longer names a vendor API.
//   2. Admin overview ranked lists: a label has a hover title, and a list
//      longer than the eight rows drawn says "top 8 of N".
//   3. Admin text carries no internal doc path and no dated attribution.
//   4. Community tiles: no figure (a zero, a count) is drawn on a tile, saved or not;
//      the "every piece is a sample" sentence is readable (size and contrast).
//   5. /sitemap: the Home row goes to the real front door, "/".
//
// Viewport-only screenshots go to .claude/scratch/misc3/.
//
// MUTATIONS (each should go red; restore after):
//   · CommandPalette.jsx: turn the cp-kbd <button> back into an aria-hidden
//     <span>: "a real close button" finds no button.
//   · overlay.css: delete the @media(max-width:767px) .cp-item-desc rule:
//     "descriptions wrap" sees nowrap and ellipsis at 390.
//   · en.json tools.iconLibrary.description: put "via Iconify API" back: the
//     Icon Library row test fails.
//   · Admin.jsx: drop `title={label}` from the TopList label: "hover title"
//     fails; change the count back to `{rows.length} {unit}`: "top 8 of 10"
//     fails.
//   · Admin.jsx: put "docs/OWNER-ACTIONS.md" or a dated attribution
//     back in the visible text: "no internal detail" fails.
//   · pieceUi.jsx: render a count (`{saves}`) inside the heart or the meta line:
//     "no zero is drawn" fails.
//   · community.css: set `.cm-sample-line` to 11px or a pale colour: "the sample
//     sentence is as readable" fails.
//   · SiteMap.jsx: set the Home route back to '/home': the sitemap test fails.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'misc3')
fs.mkdirSync(SHOTS, { recursive: true })

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
const DESKTOP = { viewport: { width: 1440, height: 900 } }

async function openSearch(page) {
  await page.locator('.pnav-search-field:visible').first().click()
  const dialog = page.getByRole('dialog', { name: /search/i })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('header search on a phone', () => {
  test.use(PHONE)

  test('the esc chip is a real 44px close button that closes the search', async ({ page }) => {
    // MUTATION: make .cp-kbd an aria-hidden <span> again: no button is found.
    watch(page, 'someone searching on a phone')
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    const close = dialog.getByRole('button', { name: 'Close' })
    await expect(close).toBeVisible()
    // The dialog opens with a short scale-in; measure once it has finished.
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline).map((a) => a.finished.catch(() => {}))))
    const box = await close.boundingBox()
    expect(box.width, 'close button width').toBeGreaterThanOrEqual(44)
    expect(box.height, 'close button height').toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: path.join(SHOTS, 'search-390.png') })
    await close.click()
    await expect(dialog).toBeHidden()
  })

  test('descriptions wrap in full: no ellipsis, nothing clipped, some run to two lines', async ({ page }) => {
    // MUTATION: delete the max-width:767px .cp-item-desc rule in overlay.css.
    watch(page, 'someone reading search results on a phone')
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    await dialog.locator('.cp-input').fill('convert')
    const descs = dialog.locator('.cp-item-desc')
    await expect(descs.first()).toBeVisible()
    const measured = await descs.evaluateAll((els) => els.map((el) => {
      const cs = getComputedStyle(el)
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4
      return {
        text: el.textContent,
        whiteSpace: cs.whiteSpace,
        textOverflow: cs.textOverflow,
        clippedX: el.scrollWidth > el.clientWidth + 1,
        lines: Math.round(el.getBoundingClientRect().height / lineHeight),
      }
    }))
    expect(measured.length, 'the query returned described rows').toBeGreaterThan(0)
    for (const m of measured) {
      expect(m.whiteSpace, `"${m.text}" wraps`).toBe('normal')
      expect(m.textOverflow, `"${m.text}" is not ellipsised`).not.toBe('ellipsis')
      expect(m.clippedX, `"${m.text}" is not clipped sideways`).toBe(false)
    }
    // POSITIVE CONTROL: at about 390px a long description needs a second line.
    expect(Math.max(...measured.map((m) => m.lines)), 'a description wrapped onto two lines').toBeGreaterThanOrEqual(2)
  })
})

test.describe('header search on a desktop', () => {
  test.use(DESKTOP)

  test('the chip stays a quiet "esc" key hint, and it still closes', async ({ page }) => {
    watch(page, 'someone searching on a desktop')
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    const close = dialog.getByRole('button', { name: 'Close' })
    await expect(close).toHaveText('esc')
    const box = await close.boundingBox()
    expect(box.height, 'the desktop hint is not blown up to a touch target').toBeLessThan(44)
    await close.click()
    await expect(dialog).toBeHidden()
  })

  test('the Icon Library row does not name a vendor API', async ({ page }) => {
    // MUTATION: put "via Iconify API" back in tools.iconLibrary.description.
    watch(page, 'someone searching for icons')
    await go(page, '/create/palette')
    const dialog = await openSearch(page)
    await dialog.locator('.cp-input').fill('icon library')
    const row = dialog.locator('.cp-item').filter({
      has: page.locator('.cp-item-label', { hasText: /^Icon Library$/ }),
    }).first()
    await expect(row).toBeVisible()
    const desc = row.locator('.cp-item-desc')
    await expect(desc).toContainText(/SVG/)
    await expect(desc).not.toContainText(/Iconify/i)
  })
})

// ── Admin ──────────────────────────────────────────────────────────────────
// "Today" is pinned to 3 Nov 2026; one daily document 3 days old holds ten
// pages (the top one has a long name), ten icons (likewise) and three packs.
const LONG_ICON = 'material-symbols-light:keyboard-double-arrow-right-rounded'
const LONG_PAGE = 'discover_palettes_and_gradients_for_brand_systems'
const dayDoc = { day: '2026-10-31', views: 55 }
for (let i = 1; i <= 9; i++) {
  dayDoc[`view__page${i}`] = 10 - i
  dayDoc[`icon__set${i}:icon-${i}`] = 10 - i
}
dayDoc[`view__${LONG_PAGE}`] = 20
dayDoc[`icon__${LONG_ICON}`] = 20
dayDoc['ipack__lucide'] = 5
dayDoc['ipack__ph'] = 3
dayDoc['ipack__tabler'] = 1
const DOCS = { 'analytics-daily/2026-10-31': dayDoc }

async function openAdmin(page, { roleEnabled = true } = {}) {
  await page.clock.setFixedTime(new Date(2026, 10, 3, 12, 0, 0))
  await signIn(page, { admin: true, claims: { admin: true, email_verified: true }, docs: DOCS })
  await page.route((url) => url.pathname === '/api/verify-admin', (route) => {
    const body = route.request().postDataJSON?.() || {}
    const base = { isAdmin: true, uid: 'test-uid-admin', email: 'founder@uil4b.test', moderator: false, role: 'founder', claimUpdated: false, rosterError: null }
    // A route without the roster half answers the list call with no `role`.
    if (body.moderatorAction === 'list') {
      return route.fulfill({ json: roleEnabled ? { ...base, moderators: [] } : { isAdmin: true, uid: base.uid, email: base.email } })
    }
    return route.fulfill({ json: base })
  })
  await page.route((url) => url.pathname === '/api/ai', (route) => route.fulfill({
    json: { providerHealth: { status: 'ok', windowDays: 7, summary: 'OpenRouter served all 10 generations in the last 7 days.', totals: { openrouterOk: 10, openrouterFail: 0, geminiOk: 0, noProvider: 0 } } },
  }))
  await go(page, '/admin')
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()
  await expect(page.locator('.adm-range')).toBeVisible()
}

const card = (page, title) => page.locator('.adm-card').filter({
  has: page.locator('.adm-card-title', { hasText: new RegExp(`^${title}$`) }),
})

for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`admin overview ranked lists at ${vp.width}px`, () => {
    test.use({ viewport: vp })

    test('a long label has a hover title with the whole name', async ({ page }) => {
      // MUTATION: drop `title={label}` from the TopList label in Admin.jsx.
      watch(page, 'the admin reading the overview')
      await openAdmin(page)
      const icons = card(page, 'Top Icons')
      await expect(icons).toBeVisible()
      const labels = icons.locator('.adm-bar-label')
      const titles = await labels.evaluateAll((els) => els.map((el) => ({ text: el.textContent, title: el.getAttribute('title') })))
      expect(titles.length).toBeGreaterThan(0)
      for (const t of titles) expect(t.title, `"${t.text}" carries its own name as a title`).toBe(t.text)
      const pages = card(page, 'Top Pages')
      const pageTitles = await pages.locator('.adm-bar-label').evaluateAll((els) => els.map((el) => ({ text: el.textContent, title: el.getAttribute('title') })))
      for (const t of pageTitles) expect(t.title).toBe(t.text)
      await page.screenshot({ path: path.join(SHOTS, `admin-lists-${vp.width}.png`) })
    })

    test('a list longer than eight rows says "top 8 of N"; a short one just counts', async ({ page }) => {
      // MUTATION: change the count back to `{rows.length} {unit}`.
      watch(page, 'the admin reading the overview')
      await openAdmin(page)
      const pages = card(page, 'Top Pages')
      await expect(pages.locator('.adm-bar-row')).toHaveCount(8)
      await expect(pages.locator('.adm-card-header')).toContainText('top 8 of 10 pages')
      const packs = card(page, 'Top Icon Packs')
      await expect(packs.locator('.adm-card-header')).toContainText('3 packs')
      await expect(packs.locator('.adm-card-header')).not.toContainText('top')
    })

    test('no internal detail in the admin text: no doc path, no dated attribution', async ({ page }) => {
      // MUTATION: put "docs/OWNER-ACTIONS.md" or a dated attribution
      // back into Admin.jsx's visible text.
      watch(page, 'the admin reading the setup checklist')
      await openAdmin(page, { roleEnabled: false })
      const check = page.locator('.adm-check-row').filter({ hasText: 'Firestore security rules published' })
      await expect(check.locator('.adm-check-note')).toHaveText('Re-test and republish after any rules change')
      await page.getByRole('tab', { name: 'Users', exact: true }).click()
      // POSITIVE CONTROL: the not-switched-on line is on screen, so its absence
      // of a doc path means something.
      const roster = page.locator('.adm-roster-line')
      await expect(roster).toContainText('The moderator role is not switched on yet.')
      await expect(roster).toContainText('Enabling it is an owner action.')
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/OWNER-ACTIONS|docs\//)
      expect(body).not.toMatch(/Founder-confirmed/)
      expect(body).not.toMatch(/\b31 Jul 2026\b/)
    })
  })
}

// ── Community ──────────────────────────────────────────────────────────────
/** Ink-on-ground contrast of an element's text, worked out on a canvas so any CSS colour (oklch, alpha) is read as the browser paints it. */
const contrastOf = (locator) => locator.evaluate((el) => {
  const px = (css) => {
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    c.fillStyle = css
    c.fillRect(0, 0, 1, 1)
    return [...c.getImageData(0, 0, 1, 1).data]
  }
  let ground = 'rgb(255, 255, 255)'
  for (let n = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor
    if (px(bg)[3] === 255) { ground = bg; break }
  }
  const over = (fg) => {
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    c.fillStyle = ground
    c.fillRect(0, 0, 1, 1)
    c.fillStyle = fg
    c.fillRect(0, 0, 1, 1)
    return [...c.getImageData(0, 0, 1, 1).data]
  }
  const lum = ([r, g, b]) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const a = lum(over(getComputedStyle(el).color))
  const b = lum(px(ground))
  return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), size: parseFloat(getComputedStyle(el).fontSize) }
})

for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`community tiles at ${vp.width}px`, () => {
    test.use({ viewport: vp })

    test('no zero is drawn on a tile; saving one draws no figure either', async ({ page }) => {
      // MUTATION: render a count (`{saves}`) inside the heart or the meta line in pieceUi.jsx.
      // The showcase pieces carry no counts, likes or reviews, so nothing numeric may be drawn.
      watch(page, 'someone browsing the community hub')
      await signIn(page, {})
      await go(page, '/community')
      const tiles = page.locator('.cm-grid .cm-tile')
      await expect(tiles.first()).toBeVisible()
      expect(await tiles.count(), 'the tiles rendered').toBeGreaterThan(5)
      const bare = () => tiles.evaluateAll((els) => els.flatMap((t) => [
        ...[...t.querySelectorAll('.cm-heart')].map((h) => h.textContent.trim()),
        t.querySelector('.cm-tile-meta').textContent,
      ]).filter((text) => /(^|\s)0(\s|$)/.test(text) || /^\d+$/.test(text)))
      expect(await bare(), 'no tile shows a bare 0 or a count').toEqual([])

      // POSITIVE CONTROL: the save really happens, and the tile still draws no figure for it.
      const first = tiles.first()
      const title = (await first.locator('.cm-tile-title').textContent()).trim()
      if (vp.width < 768) {
        // On a phone the heart is not drawn: "..." is the way to save.
        await expect(first.locator('.cm-heart')).toBeHidden()
        await first.getByRole('button', { name: `Actions for ${title}` }).click()
        await page.getByRole('menuitem', { name: 'Save', exact: true }).click()
        await first.getByRole('button', { name: `Actions for ${title}` }).click()
        await expect(page.getByRole('menuitem', { name: 'Remove from saved' }), 'the saved tile now offers Remove').toBeVisible()
        await page.keyboard.press('Escape')
      } else {
        await first.hover()
        const heart = first.getByRole('button', { name: `Save ${title}` })
        await heart.click()
        await expect(first.getByRole('button', { name: `Remove ${title} from saved` })).toHaveAttribute('aria-pressed', 'true')
      }
      expect(await bare(), 'a saved tile draws no figure').toEqual([])
      await page.screenshot({ path: path.join(SHOTS, `community-${vp.width}.png`) })
    })

    test('the "sample" sentence is as readable as the lead above it', async ({ page }) => {
      // MUTATION: set `.cm-sample-line` to font-size 11px or a pale colour in community.css.
      // (The old check was "same ink as the pitch"; the new design deliberately sets it one
      // step quieter, so what is held is size and contrast, not sameness.)
      watch(page, 'someone browsing the community hub')
      await go(page, '/community')
      const note = page.locator('.cm-head .cm-sample-line')
      await expect(note).toBeVisible()
      await expect(note).toContainText('Every piece here is a sample')
      const m = await contrastOf(note)
      expect(m.size, 'a size you can read on a phone').toBeGreaterThanOrEqual(14)
      expect(m.ratio, 'contrast of the sample sentence on the page').toBeGreaterThanOrEqual(4.5)
      // The lead above it is the control: if its contrast is also measured it is a fair yardstick.
      expect((await contrastOf(page.locator('.cm-head .cm-lead'))).ratio).toBeGreaterThanOrEqual(4.5)
    })
  })
}

// ── Sitemap ────────────────────────────────────────────────────────────────
test.describe('the sitemap Home row', () => {
  test.use(DESKTOP)

  test('points at the real front door, "/", with a current note', async ({ page }) => {
    // MUTATION: set the Home route in SiteMap.jsx back to '/home'.
    watch(page, 'someone reading the sitemap')
    await go(page, '/sitemap')
    const row = page.locator('li[data-route="/"]')
    await expect(row).toHaveCount(1)
    await expect(row.locator('b')).toHaveText('Home')
    await expect(row.locator('a')).toHaveAttribute('href', '/')
    await expect(row.locator('.spt-note')).toContainText('front page')
    await expect(page.locator('li[data-route="/home"]'), 'nothing points at the duplicate URL').toHaveCount(0)
    await row.locator('a').click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  })
})
