// THE ICON LIBRARY'S MY ICONS TOGGLE, WHERE ADD ICON LIVES, THE ONE CENTRED CALL TO ACTION, AND A TOOLBAR THAT NEVER WRAPS.
//
// On /create/icons:
//   - "My icons" is a pinned toggle at the toolbar's right end (button.ig-mine, aria-pressed). Pressing it opens
//     the Saved view; pressing it again goes back to the app packs (All packs, nothing left filtered);
//   - "Add icon" is not on the toolbar. It is on the My icons view, beside the Saved heading, and under the
//     empty state when nothing is saved;
//   - before the footer the page has at most one call to action, centred on the grid: the gate for a signed-out
//     viewer, the Pro block for a free one at the end of a short list, and nothing for Pro;
//   - the toolbar is one row (the search, the pack menu or Filters, and My icons at the right end) at 390, 768
//     and 1440, with no horizontal overflow.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   the toggle goes back to a pack-menu entry ('custom')            -> "pressing My icons again returns to the app packs"
//   <LibraryToolbar> gets the Add icon button back as its action    -> "Add icon is not on the toolbar"
//   IconEmojiLibrary.jsx renders a SpectrumClose again              -> "the page has one call to action"
//   .lbry-toolbar-pinned loses margin-left:auto                     -> "My icons holds the row's right end"
//   the pack menu leaves the right of the row for its old place     -> "the pack menu sits left of My icons"
// Each of these was also run against the build from before the change: every test below that names a
// toggle, a gate or a pinned control failed there.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, isLiveIconify } from './iconify-stub.js'

const WIDTHS = [1440, 768, 390]
const SIGNED_OUT = 'a designer who has not signed up yet, using the icon library'

const mineButton = (page) => page.locator('.ig-toolbar button.ig-mine')

async function open(page, width, { plan } = {}) {
  await page.setViewportSize({ width, height: 900 })
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
}

/** Page-space boxes of the named parts, as {l,r,t,b}. */
const boxes = (page, selectors) => page.evaluate((sels) => Object.fromEntries(Object.entries(sels).map(([name, sel]) => {
  const el = document.querySelector(sel)
  if (!el) return [name, null]
  const r = el.getBoundingClientRect()
  return [name, { l: r.left, r: r.right, t: r.top + window.scrollY, b: r.bottom + window.scrollY }]
})), selectors)

// ── The My icons toggle ─────────────────────────────────────────────────────────────────────────

test.describe('the My icons toggle', () => {
  for (const width of [1440, 390]) {
    test(`${width}: pressing My icons opens Saved, pressing it again returns to the app packs`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      const mine = mineButton(page)
      await expect(mine, 'the toggle starts off').toHaveAttribute('aria-pressed', 'false')
      await expect(mine, 'its name is My icons at every width').toHaveAccessibleName('My icons')
      await expect(page.locator('.ig-mysec'), 'the app packs are showing, not Saved').toHaveCount(0)
      const packsBefore = [...new Set(await page.locator('.ig .ic .ic-pack').allTextContents())].sort()
      expect(packsBefore.length, 'the app packs span several sets').toBeGreaterThan(1)

      await mine.click()
      await expect(mine).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('heading', { name: 'Saved', exact: true }), 'Saved is showing').toBeVisible()
      await expect(page.locator('.ig-end'), 'the gate belongs to the app packs, not Saved').toHaveCount(0)

      await mine.click()
      await expect(mine, 'one more press turns it off').toHaveAttribute('aria-pressed', 'false')
      await expect(page.locator('.ig-mysec'), 'Saved is gone').toHaveCount(0)
      await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
      const packsAfter = [...new Set(await page.locator('.ig .ic .ic-pack').allTextContents())].sort()
      expect(packsAfter, 'the same app packs are back').toEqual(packsBefore)
      await expect(page.locator('.ig-end[data-gate="anon"]'), 'and the gate with them').toBeVisible()
    })
  }

  test('pressing My icons again returns to the app packs even when it was opened from a single pack', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 1440)
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'lucide')
    await expect(page.getByRole('button', { name: 'Icon pack' })).toContainText('Lucide')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
    const mine = mineButton(page)
    await mine.click()
    await expect(mine).toHaveAttribute('aria-pressed', 'true')
    await mine.click()
    await expect(mine).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(async () => (await page.locator('.ig .ic .ic-pack').allTextContents()).length > 0 && new Set(await page.locator('.ig .ic .ic-pack').allTextContents()).size,
      { message: 'back on All packs, not stuck on the pack the viewer came from' }).toBeGreaterThan(1)
    await expect(page.getByRole('button', { name: 'Icon pack' })).toContainText('All packs')
  })

  test('My icons is not an entry in the pack menu', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 1440)
    await page.getByRole('button', { name: 'Icon pack' }).click()
    const options = page.locator('.menu-select-list[role="listbox"] [role="option"]')
    await expect(options.first()).toBeVisible()
    expect(await options.evaluateAll((rows) => rows.map((r) => r.dataset.value)), 'the pack menu still offers My icons').not.toContain('custom')
    await page.keyboard.press('Escape')
  })
})

// ── Add icon lives on the My icons view ─────────────────────────────────────────────────────────

test.describe('Add icon', () => {
  const saved = (name) => ({
    key: `vs-custom-icons:1:${name}`, ts: 1, base: 'bolt', iteration: 1, projectId: null, name, pack: 'lucide', cdn: true,
    size: 24, stroke: 2, absStroke: true, cap: 'round', join: 'round', isStroke: true, strokeUnit: 'px', color: '#000000', colored: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#000" d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>',
  })

  for (const width of WIDTHS) {
    test(`${width}: Add icon is not on the toolbar or the app packs, and is on the My icons view`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      await expect(page.locator('.ig-addbtn'), 'no Add icon anywhere on the app packs view').toHaveCount(0)
      await mineButton(page).click()
      await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeVisible()
      await expect(page.locator('.ig-toolbar .ig-addbtn'), 'Add icon is still not on the toolbar').toHaveCount(0)
      await expect(page.locator('.ig-mysec-head').getByRole('button', { name: 'Add icon' }), 'Add icon is beside the Saved heading').toBeVisible()
      await expect(page.locator('.ig-custom-empty').getByRole('button', { name: 'Add icon' }), 'and under the empty state').toBeVisible()
    })
  }

  test('with a saved icon the empty state is gone and one Add icon stays, beside the heading', async ({ page }) => {
    watch(page, 'a Pro designer with one saved icon')
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await page.evaluate((list) => localStorage.setItem('vs-custom-icons', JSON.stringify(list)), [saved('Custom (bolt 1)')])
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
    await mineButton(page).click()
    await expect(page.locator('.ig .ic', { hasText: 'Custom (bolt 1)' })).toBeVisible({ timeout: 20_000 })
    const savedSection = page.locator('.ig-mysec').filter({ has: page.getByRole('heading', { name: 'Saved', exact: true }) })
    await expect(savedSection.locator('.ig-custom-empty'), 'Saved is not empty').toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add icon' }), 'exactly one Add icon on the page').toHaveCount(1)
    await expect(page.locator('.ig-mysec-head').getByRole('button', { name: 'Add icon' })).toBeVisible()
    await expect(page.locator('.ig-mysec-head').getByRole('button', { name: 'Clear all' }), 'Clear all sits with it').toBeVisible()
  })

  test('pressing Add icon on the My icons view opens the add dialog, and closing it keeps the view', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, 1440)
    await mineButton(page).click()
    await page.locator('.ig-mysec-head').getByRole('button', { name: 'Add icon' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Add a custom icon.' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(mineButton(page), 'still on the My icons view').toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeVisible()
  })
})

// ── One centred call to action before the footer ────────────────────────────────────────────────

const TOTAL = 30
const NAME = (i) => `short-${String(i).padStart(2, '0')}`
const BODY = '<path fill="none" stroke="currentColor" stroke-width="2" d="M3 12h18"/>'

/** Serve a short lucide list, so a free account reaches the end of its results. */
async function serveShortLucide(page) {
  const names = Array.from({ length: TOTAL }, (_, i) => NAME(i))
  const headers = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === 'lucide',
    (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix: 'lucide', total: TOTAL, title: 'lucide', uncategorized: names }) }))
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/lucide.json' && u.search.includes('icons='),
    (route) => {
      const asked = (new URL(route.request().url()).searchParams.get('icons') || '').split(',').filter(Boolean)
      const icons = Object.fromEntries(asked.map((n) => [n, { body: BODY }]))
      return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix: 'lucide', width: 24, height: 24, icons, aliases: {} }) })
    })
}

/** Everything that would be a sales call to action inside <main>, by the old close's and the gate's classes. */
const ctaPills = (page) => page.getByRole('main').locator('.ig-end-pill, .sp-pill, .sp-ghost, .sp-close')

test.describe('the page has one call to action before the footer, centred on the grid', () => {
  for (const width of WIDTHS) {
    test(`${width}: signed out, the gate is the one call to action, centred, above the footer`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      await expect(page.locator('.ig-end[data-gate="anon"]')).toHaveCount(1)
      await expect(ctaPills(page), 'one primary action in the page, and no sales close').toHaveCount(1)
      await expect(page.locator('.ig-end-pill')).toHaveText('Log in')
      await expect(page.locator('.ig-end-link')).toHaveText('See the plans')
      await expect(page.locator('.ig-close, .sp-ramp')).toHaveCount(0)
      await page.locator('.ig-end').scrollIntoViewIfNeeded()
      const b = await boxes(page, { grid: '.ig', gate: '.ig-end', h: '.ig-end-h', cta: '.ig-end-cta', footer: 'footer' })
      expect(Math.abs((b.h.l + b.h.r) / 2 - (b.grid.l + b.grid.r) / 2), 'the heading is centred on the grid').toBeLessThanOrEqual(2)
      expect(Math.abs((b.cta.l + b.cta.r) / 2 - (b.grid.l + b.grid.r) / 2), 'the action row is centred on the grid').toBeLessThanOrEqual(2)
      expect(b.gate.b, 'the gate ends before the footer starts').toBeLessThanOrEqual(b.footer.t + 1)
    })

    test(`${width}: a free account at the end of a short list sees the Pro block, centred, as the one call to action`, async ({ page }) => {
      test.skip(isLiveIconify(), 'the live API decides which icons exist; this spec controls the answers')
      watch(page, 'a designer on the free plan reaching the end of a short list')
      await serveShortLucide(page)
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free' })
      await go(page, '/create/icons')
      const filters = page.getByRole('button', { name: /^Filters\b/ })
      const sheet = page.getByRole('dialog', { name: 'Filters' })
      // The pack menu is on the row until the toolbar folds it into the Filters sheet (a phone).
      const inPanel = !(await page.getByRole('button', { name: 'Icon pack' }).isVisible()) && await filters.isVisible()
      const panel = sheet.or(page.getByRole('group', { name: 'Filters', exact: true }))
      if (inPanel) {
        await filters.click()
        await expect(panel).toBeVisible()
      }
      await chooseMenuOption(page, (inPanel ? panel : page).getByRole('button', { name: 'Icon pack' }), 'lucide')
      if (await sheet.isVisible()) {
        await sheet.getByRole('button', { name: 'Done', exact: true }).click()
        await expect(sheet).toBeHidden()
      } else if (inPanel) {
        await filters.click()
        await expect(panel).toBeHidden()
      }
      await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"]`)).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('.ig-end[data-gate="free"]')).toHaveCount(1)
      await expect(page.locator('.ig-end[data-gate="free"] .ig-end-h')).toHaveText('Brand marks, flags and emoji are on Pro.')
      await expect(ctaPills(page), 'one primary action in the page, and no sales close').toHaveCount(1)
      await expect(page.locator('.ig-end-pill')).toHaveText('See what Pro includes')
      await expect(page.locator('.ig-end-pill')).toHaveAttribute('href', '/plans')
      await expect(page.locator('.ig-close, .sp-ramp')).toHaveCount(0)
      await page.locator('.ig-end').scrollIntoViewIfNeeded()
      const b = await boxes(page, { grid: '.ig', gate: '.ig-end', h: '.ig-end-h', cta: '.ig-end-cta', footer: 'footer' })
      expect(Math.abs((b.cta.l + b.cta.r) / 2 - (b.grid.l + b.grid.r) / 2), 'the action row is centred on the grid').toBeLessThanOrEqual(2)
      expect(Math.abs((b.h.l + b.h.r) / 2 - (b.grid.l + b.grid.r) / 2), 'the heading is centred on the grid').toBeLessThanOrEqual(2)
      expect(b.gate.b, 'the block ends before the footer starts').toBeLessThanOrEqual(b.footer.t + 1)
    })

    test(`${width}: a Pro account has no call to action between the grid and the footer`, async ({ page }) => {
      watch(page, 'a Pro designer browsing the icon library')
      await open(page, width, { plan: 'pro' })
      await expect(page.locator('.ig-end')).toHaveCount(0)
      await expect(ctaPills(page), 'Pro sees no sales block at all').toHaveCount(0)
      await expect(page.locator('.ig-close, .sp-ramp')).toHaveCount(0)
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
    })
  }
})

// ── The toolbar does not wrap ───────────────────────────────────────────────────────────────────

test.describe('the toolbar stays on one row with My icons at its right end', () => {
  for (const width of WIDTHS) {
    test(`${width}: one row, My icons at the right end, nothing scrolls sideways`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, width)
      await expect(mineButton(page)).toBeVisible()
      const m = await page.evaluate(() => {
        const row = document.querySelector('.ig-toolbar .lbry-toolbar-row')
        const rr = row.getBoundingClientRect()
        const mine = row.querySelector('button.ig-mine').getBoundingClientRect()
        const search = row.querySelector('.lbry-search').getBoundingClientRect()
        const action = row.querySelector('.lbry-toolbar-action')?.getBoundingClientRect() || null
        const lone = [...row.querySelectorAll('button, input, a[href]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
        const mids = lone.map((e) => { const r = e.getBoundingClientRect(); return (r.top + r.bottom) / 2 })
        return {
          wrap: getComputedStyle(row).flexWrap,
          rowH: rr.height,
          rowOverflow: row.scrollWidth - row.clientWidth,
          pageOverflow: document.documentElement.scrollWidth - innerWidth,
          midSpread: Math.max(...mids) - Math.min(...mids),
          mineGap: rr.right - mine.right,
          searchRight: search.right,
          mineLeft: mine.left,
          actionRight: action ? action.right : null,
          actionLeftOfMine: action ? action.right <= mine.left + 1 : null,
        }
      })
      expect(m.wrap, 'the row is not allowed to wrap').toBe('nowrap')
      expect(m.rowOverflow, 'the row does not scroll sideways').toBeLessThanOrEqual(0)
      expect(m.pageOverflow, 'the page does not scroll sideways').toBeLessThanOrEqual(0)
      expect(m.midSpread, 'every control on the row shares one centre line').toBeLessThanOrEqual(6)
      expect(m.rowH, 'the row is one control tall').toBeLessThanOrEqual(64)
      expect(m.mineGap, 'My icons holds the row’s right end').toBeLessThanOrEqual(1)
      expect(m.searchRight, 'the search ends before My icons starts').toBeLessThanOrEqual(m.mineLeft)
      if (m.actionLeftOfMine !== null) expect(m.actionLeftOfMine, 'the pack menu sits left of My icons').toBe(true)
    })
  }
})
