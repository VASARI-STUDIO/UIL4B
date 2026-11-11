// Mega menu polish: the phone menu button and tab bar, the "selected" looks,
// the Learn read times, the Discover pane's suggested gallery, and the brand kit
// card staying out from under an open menu.
//
// What this pins:
//
//   Phone (390)
//     · "Open menu" is drawn 36 x 36 and its hit area is at least 44 x 44.
//     · Nothing shows through the tab bar: its fill is solid with no backdrop
//       filter, and the menu sheet ends where the bar begins.
//     · With the sheet open only the open section's tab reads as selected, and
//       signed out on a tool page the You tab rests.
//
//   Desktop menus (768, 1440)
//     · Opening the Create menu from a page that is not Palette draws no row as
//       selected.
//     · Learn (1440, 1024, both themes): every guide appears once, each read time
//       is whole ("6 min"), and the foot link reads "See all guides".
//     · Discover: a suggested gallery sits under the library counts. It follows
//       the recent tools in storage, links a live gallery (never the retired
//       prompt library), is a 44px target and opens a real page.
//     · The phone sheet's Discover panel carries the same suggestion.
//     · At 768 the Create menu's "3D Model Converter" name is whole beside its Beta
//       badge: not clipped, and ending before the badge.
//
//   Phone sheet, scrolled (390 x 844)
//     · At the end of its scroll, the Alt Text row and the sheet's last row are
//       wholly above the tab bar.
//     · The tab for the open section (Create, Discover) carries aria-current;
//       Learn has no tab, so the route's tab stands; closed, the route's tab
//       returns.
//
//   Brand kit card
//     · A list box and the Create mega menu each hide the card while open, and it
//       returns when they close.
//
// MUTATIONS (each should fail the named tests, then be put back):
//   · Make `.pnav-tabs` background `rgba(var(--page-rgb),.94)`: "tab bar is solid" fails.
//   · Delete `.pnav-mobile::after` in the max-width:767px block of global.css:
//     "Open menu hit area" fails.
//   · Put the 768 band back to `gap:10px;padding-inline:8px` for Create rows and
//     `padding-inline:6px` on the badge (global.css, max-width:900px): "3D Model
//     Converter is not truncated" fails.
//   · Drop `sheetSection` from the `current` line in PhoneTabBar.jsx: "with the
//     sheet open the tab for its section is current" fails.
//   · Change `.pnav-sheet` `bottom` to `0` (global.css): "scrolled to its end,
//     every sheet row clears the tab bar" and "the sheet ends above it" fail.
//   · Change `.pnav-tool-mins` to `width:2ch;overflow:hidden`: "Learn read times"
//     fails.
//   · Remove a pair from GALLERY_FOR_TOOL in discoverRecommendation.js: the
//     matching "suggestion follows recent tools" case fails.
//   · Drop `[role="menu"]`, `[role="listbox"]` or `.pnav-menu` from
//     OPEN_OVERLAY_SELECTOR: "brand kit card" fails for the matching opener.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { DISCOVER_GROUPS } from '../../src/data/toolTree.js'

const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'megamenu1')
fs.mkdirSync(SHOTS, { recursive: true })

const PHONE = { name: '390 touch', tag: '390', width: 390, height: 844, touch: true }
const TABLET = { name: '768 touch', tag: '768', width: 768, height: 1024, touch: true }
const LAPTOP = { name: '1024 mouse', tag: '1024', width: 1024, height: 800, touch: false }
const DESKTOP = { name: '1440 mouse', tag: '1440', width: 1440, height: 900, touch: false }
const THEMES = ['light', 'dark']
const RECENT_KEY = 'vs-recent-tools'

async function openPage(browser, size, theme, url, recent) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await ctx.newPage()
  watch(page, `a visitor at ${size.name}, ${theme}`)
  await page.addInitScript(([t, key, list]) => {
    try {
      localStorage.setItem('vs-t', t)
      if (list) localStorage.setItem(key, JSON.stringify(list))
    } catch { /* storage blocked */ }
  }, [theme, RECENT_KEY, recent || null])
  await go(page, url)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  return { ctx, page }
}

// Viewport only: a full-page capture in a touch context resizes the viewport.
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

const alpha = (css) => {
  const m = /\/\s*([\d.]+)\s*\)/.exec(css) || /rgba\([^)]*,\s*([\d.]+)\)/.exec(css)
  return m ? Number(m[1]) : 1
}

async function openMenu(page, size, name) {
  const trigger = page.locator('.pnav-trigger', { hasText: name })
  if (size.touch) await trigger.tap()
  else await trigger.click()
  await expect(page.locator('#pnav-mega')).toBeVisible()
  await expect(page.locator('#pnav-mega .pnav-tool').first()).toBeVisible()
  // The panel's own entrance finishes before anything is read from it.
  await page.waitForTimeout(450)
}

const readTabs = (page) => page.locator('.pnav-tab').evaluateAll((tabs) => tabs.map((el) => {
  const cs = getComputedStyle(el)
  return {
    label: el.textContent.trim(),
    weight: Number(cs.fontWeight),
    bar: getComputedStyle(el, '::before').content !== 'none',
  }
}))
const selectedLabels = (tabs) => tabs.filter((t) => t.weight >= 560 || t.bar).map((t) => t.label)

// ── The phone menu button and the tab bar ────────────────────────────────────
for (const theme of THEMES) {
  test.describe(`phone chrome at 390, ${theme}`, () => {
    test('Open menu hit area is 44 x 44 around a 36 x 36 circle', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, '/create/palette')
      const button = page.locator('.pnav-mobile')
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      expect([box.width, box.height], 'the drawn circle keeps its size').toEqual([36, 36])
      const hit = await button.evaluate((el) => {
        const area = getComputedStyle(el, '::after')
        const r = el.getBoundingClientRect()
        const cx = r.x + r.width / 2
        const cy = r.y + r.height / 2
        const probes = [[0, -21.5], [0, 21.5], [-21.5, 0], [21.5, 0], [-20, -20], [20, 20]]
        return {
          width: parseFloat(area.width),
          height: parseFloat(area.height),
          reaches: probes.map(([dx, dy]) => {
            const got = document.elementFromPoint(cx + dx, cy + dy)
            return got === el || el.contains(got)
          }),
        }
      })
      expect(hit.width).toBeGreaterThanOrEqual(44)
      expect(hit.height).toBeGreaterThanOrEqual(44)
      expect(hit.reaches, 'every probe inside the 44px square lands on the button').toEqual([true, true, true, true, true, true])
      await ctx.close()
    })

    test('tab bar is solid and the sheet ends above it', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, '/discover')
      const paint = await page.locator('.pnav-tabs').evaluate((el) => {
        const cs = getComputedStyle(el)
        return { background: cs.backgroundColor, filter: cs.backdropFilter || cs.webkitBackdropFilter || 'none' }
      })
      expect(alpha(paint.background), 'the bar\'s fill is solid').toBe(1)
      expect(paint.filter, 'the bar blurs nothing behind it').toBe('none')
      await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      await page.waitForTimeout(450)
      const sheet = await page.locator('.pnav-sheet').boundingBox()
      const bar = await page.locator('.pnav-tabs').boundingBox()
      expect(sheet.y + sheet.height, 'no sheet text sits behind the bar').toBeLessThanOrEqual(bar.y + 0.5)
      await shot(page, `sheet-over-tabs-390-${theme}`)
      await ctx.close()
    })

    test('with the sheet open only the open section\'s tab reads as selected', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, '/projects')
      expect(selectedLabels(await readTabs(page)), 'POSITIVE CONTROL: the page\'s tab is drawn').toEqual(['Dashboard'])
      await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      await page.waitForTimeout(450)
      expect(selectedLabels(await readTabs(page))).toEqual(['Create'])
      await ctx.close()
    })

    test('signed out on a tool page the You tab rests', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, '/create/palette')
      const tabs = await readTabs(page)
      expect(selectedLabels(tabs)).toEqual(['Create'])
      expect(tabs.find((t) => t.label === 'You').weight).toBe(tabs.find((t) => t.label === 'Dashboard').weight)
      await ctx.close()
    })

    test('scrolled to its end, every sheet row clears the tab bar', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, '/discover')
      await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      await page.waitForTimeout(450)
      const barTop = (await page.locator('.pnav-tabs').boundingBox()).y

      // The deepest tool row, brought into view the way a person scrolls to it.
      const altText = page.locator('.pnav-sheet .pnav-acc-link', { hasText: 'Alt Text' })
      await altText.scrollIntoViewIfNeeded()
      await page.waitForTimeout(150)
      const altBox = await altText.boundingBox()
      expect(altBox.y + altBox.height, 'the Alt Text row is wholly above the bar').toBeLessThanOrEqual(barTop + 0.5)

      // The very last row of the sheet, at the end of the scroll.
      await page.locator('.pnav-sheet').evaluate((el) => { el.scrollTop = el.scrollHeight })
      await page.waitForTimeout(150)
      const end = await page.locator('.pnav-sheet').evaluate((el) => {
        const rows = [...el.querySelectorAll('a, button')].filter((r) => r.getClientRects().length > 0)
        const last = rows[rows.length - 1].getBoundingClientRect()
        return { bottom: last.bottom, atEnd: Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) <= 1 }
      })
      expect(end.atEnd, 'POSITIVE CONTROL: the sheet is scrolled to its end').toBe(true)
      expect(end.bottom, 'the last row is wholly above the bar').toBeLessThanOrEqual(barTop + 0.5)
      await shot(page, `sheet-scrolled-to-end-390-${theme}`)
      await ctx.close()
    })

    test('with the sheet open the tab for its section is current, and the route\'s tab returns on close', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, theme, '/projects')
      const tab = (name) => page.locator('.pnav-tab', { hasText: name })
      await expect(tab('Dashboard'), 'POSITIVE CONTROL: the route\'s tab is current').toHaveAttribute('aria-current', 'page')

      await tab('Create').tap()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      await expect(tab('Create')).toHaveAttribute('aria-current', 'page')
      await expect(tab('Dashboard')).not.toHaveAttribute('aria-current', 'page')

      await page.locator('.pnav-acc-trigger', { hasText: 'Discover' }).tap()
      await expect(tab('Discover'), 'the current tab follows the section').toHaveAttribute('aria-current', 'page')
      await expect(tab('Create')).not.toHaveAttribute('aria-current', 'page')

      // Learn has no tab, so the route's own tab stands.
      await page.locator('.pnav-acc-trigger', { hasText: 'Learn' }).tap()
      await expect(tab('Dashboard')).toHaveAttribute('aria-current', 'page')
      await expect(page.locator('.pnav-tab[aria-current="page"]')).toHaveCount(1)

      await page.locator('.pnav-acc-trigger', { hasText: 'Create' }).tap()
      await expect(tab('Create')).toHaveAttribute('aria-current', 'page')
      await shot(page, `sheet-create-tab-current-390-${theme}`)
      await page.getByRole('button', { name: 'Close menu' }).tap()
      await expect(page.locator('.pnav-sheet')).toBeHidden()
      await expect(tab('Dashboard'), 'closed, the route\'s tab is current again').toHaveAttribute('aria-current', 'page')
      await expect(tab('Create')).not.toHaveAttribute('aria-current', 'page')
      await ctx.close()
    })
  })
}

// ── The Create menu draws no row as selected ─────────────────────────────────
for (const size of [TABLET, DESKTOP]) {
  test(`opening Create from Discover selects no row, ${size.name}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, size, 'light', '/discover')
    await openMenu(page, size, 'Create')
    const rows = await page.locator('#pnav-mega .pnav-tool').evaluateAll((els) => els.map((el) => ({
      id: el.getAttribute('data-row-id'),
      tile: getComputedStyle(el).backgroundColor,
      bar: getComputedStyle(el).boxShadow !== 'none',
      current: el.getAttribute('aria-current'),
    })))
    expect(rows.map((r) => r.id), 'POSITIVE CONTROL: Palette is listed').toContain('palette')
    for (const row of rows) {
      expect(alpha(row.tile), `${row.id} has a tile`).toBe(0)
      expect(row.bar, `${row.id} has the current-page bar`).toBe(false)
      expect(row.current, `${row.id} is marked as the current page`).toBeNull()
    }
    await ctx.close()
  })
}

// ── Create at 768: the longest tool name is whole beside its badge ───────────
for (const theme of THEMES) {
  test(`3D Model Converter is not truncated beside its Beta badge, 768, ${theme}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, TABLET, theme, '/discover')
    await openMenu(page, TABLET, 'Create')
    const row = page.locator('#pnav-mega .pnav-tool[data-row-id="3d-converter"]')
    await expect(row).toBeVisible()
    const m = await row.evaluate((el) => {
      const nm = el.querySelector('.pnav-tool-nm')
      const badge = el.querySelector('.beta-badge')
      const r = el.getBoundingClientRect()
      const n = nm.getBoundingClientRect()
      const b = badge.getBoundingClientRect()
      // The glyphs' own width, whatever the box does: a Range over the text.
      const range = document.createRange()
      range.selectNodeContents(nm)
      return {
        text: nm.textContent,
        scrollWidth: nm.scrollWidth,
        clientWidth: nm.clientWidth,
        textRight: range.getBoundingClientRect().right,
        badgeLeft: b.left,
        badgeRight: b.right,
        rowRight: r.right,
        nameHeight: n.height,
      }
    })
    expect(m.text).toBe('3D Model Converter')
    expect(m.scrollWidth, 'the name is not clipped (no ellipsis)').toBeLessThanOrEqual(m.clientWidth)
    expect(m.textRight, 'the name ends before the badge begins').toBeLessThanOrEqual(m.badgeLeft)
    expect(m.badgeRight, 'the badge stays inside its row').toBeLessThanOrEqual(m.rowRight)
    expect(m.nameHeight, 'the name keeps its 20px line box').toBe(20)
    await shot(page, `create-3d-converter-768-${theme}`)
    await ctx.close()
  })
}

// ── Learn: one guide list, whole read times ──────────────────────────────────
for (const size of [LAPTOP, DESKTOP]) {
  for (const theme of THEMES) {
    test(`Learn read times are whole and each guide is listed once, ${size.name}, ${theme}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, size, theme, '/discover')
      await openMenu(page, size, 'Learn')
      const m = await page.evaluate(() => {
        const panel = document.querySelector('#pnav-mega').getBoundingClientRect()
        return [...document.querySelectorAll('#pnav-mega .pnav-tool-mins')].map((mins) => {
          const row = mins.closest('a').getBoundingClientRect()
          const r = mins.getBoundingClientRect()
          return {
            text: mins.textContent,
            cut: mins.scrollWidth > mins.clientWidth + 1 || r.right > row.right + 1 || r.right > panel.right + 1,
          }
        })
      })
      expect(m.length, 'one read time per guide').toBe(LEARN_ARTICLES.length)
      for (const r of m) {
        expect(r.text).toMatch(/^\d+ min$/)
        expect(r.cut, `"${r.text}" is clipped`).toBe(false)
      }
      for (const article of LEARN_ARTICLES) {
        await expect(page.locator(`#pnav-mega a.pnav-tool[href="/learn/${article.slug}"]`), `${article.slug} is listed more than once`).toHaveCount(1)
      }
      await expect(page.locator('#pnav-mega .pnav-menu-foot-link')).toHaveText(/See all guides/)
      await shot(page, `learn-menu-${size.tag}-${theme}`)
      await ctx.close()
    })
  }
}

// ── Discover: the suggested gallery ──────────────────────────────────────────
const gallery = (id) => DISCOVER_GROUPS.find((g) => g.id === id)

test.describe('Discover suggested gallery', () => {
  for (const theme of THEMES) {
    test(`with no activity it suggests the first gallery, ${theme}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, DESKTOP, theme, '/discover')
      await openMenu(page, DESKTOP, 'Discover')
      const reco = page.locator('#pnav-mega .pnav-reco')
      await expect(reco).toHaveCount(1)
      const link = reco.locator('a.pnav-reco-link')
      await expect(link).toHaveAttribute('href', gallery('palette-library').route)
      await expect(link).toContainText(gallery('palette-library').label)
      await expect(reco.locator('.pnav-reco-eyebrow')).toHaveText('A gallery to start with')
      // A flat row on the pane: no border or fill of its own around the link.
      const border = await link.evaluate((el) => getComputedStyle(el).borderTopWidth)
      expect(border, 'the link row is not a bordered card').toBe('0px')
      await shot(page, `discover-reco-default-1440-${theme}`)
      await ctx.close()
    })
  }

  const FOLLOWS = [
    { recent: ['gradient'], id: 'gradient-gallery', since: 'Gradient' },
    { recent: ['font-pair', 'palette'], id: 'font-gallery', since: 'Font Pair' },
    { recent: ['alt-text', 'contrast'], id: 'palette-library', since: 'Contrast Checker' },
    { recent: ['emoji'], id: 'icon-library', since: 'Emoji Library' },
  ]
  for (const c of FOLLOWS) {
    test(`the suggestion follows recent tools: ${c.recent.join(', ')}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, DESKTOP, 'light', '/discover', c.recent)
      await openMenu(page, DESKTOP, 'Discover')
      const reco = page.locator('#pnav-mega .pnav-reco')
      await expect(reco.locator('.pnav-reco-eyebrow')).toHaveText(`Since you used ${c.since}`)
      await expect(reco.locator('a.pnav-reco-link')).toHaveAttribute('href', gallery(c.id).route)
      await ctx.close()
    })
  }

  test('it never links the prompt library and its target is a 48px row', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, TABLET, 'light', '/discover')
    await openMenu(page, TABLET, 'Discover')
    const link = page.locator('#pnav-mega a.pnav-reco-link')
    expect(await link.getAttribute('href')).not.toMatch(/^\/discover\/prompts/)
    const box = await link.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'the pane adds no sideways scroll').toBeLessThanOrEqual(1)
    await shot(page, 'discover-reco-768-light')
    await ctx.close()
  })

  test('it opens a real gallery page and closes the menu', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, DESKTOP, 'light', '/discover', ['gradient'])
    await openMenu(page, DESKTOP, 'Discover')
    await page.locator('#pnav-mega a.pnav-reco-link').click()
    await expect(page).toHaveURL(new RegExp(`${gallery('gradient-gallery').route}$`))
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /That page doesn.t exist/ })).toHaveCount(0)
    await expect(page.locator('#pnav-mega')).toHaveCount(0)
    await ctx.close()
  })

  test('the keyboard reaches it between the counts and the Open Discover button', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, DESKTOP, 'light', '/discover')
    await openMenu(page, DESKTOP, 'Discover')
    const order = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#pnav-mega [data-pnav-menuitem]')]
      const reco = items.findIndex((el) => el.classList.contains('pnav-reco-link'))
      const cta = items.findIndex((el) => el.classList.contains('pnav-editorial-cta'))
      return { reco, cta }
    })
    expect(order.reco, 'the suggestion is in the menu\'s keyboard ring').toBeGreaterThan(-1)
    expect(order.cta).toBeGreaterThan(order.reco)
    await ctx.close()
  })

  test('the phone sheet\'s Discover panel carries it too', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, PHONE, 'light', '/projects', ['gradient'])
    await page.locator('.pnav-mobile').tap()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await page.locator('.pnav-acc-trigger', { hasText: 'Discover' }).tap()
    const link = page.locator('.pnav-sheet a.pnav-reco-link')
    await expect(link).toHaveAttribute('href', gallery('gradient-gallery').route)
    const box = await link.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width)
    await shot(page, 'sheet-discover-reco-390-light')
    await ctx.close()
  })
})

// ── The brand kit card stays out from under an open menu ─────────────────────
test('brand kit card: a list box and the Create mega menu each hide it, and it returns', async ({ page }) => {
  watch(page, 'a designer opening a dropdown and the nav menu over the walkthrough card')
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height })
  await go(page, '/discover')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const cta = page.locator('.pnav-editorial-cta')
  await expect(cta).toBeVisible()
  await cta.click()
  const guide = page.locator('.bkit-card')
  await expect(guide).toBeVisible()

  const hidden = async () => {
    await expect(guide).toBeHidden()
    await expect(guide).toHaveAttribute('aria-hidden', 'true')
    await expect(guide).toHaveAttribute('inert', '')
  }
  const back = async () => {
    await expect(guide).toBeVisible()
    await expect(guide).not.toHaveAttribute('aria-hidden', 'true')
    await expect(guide).not.toHaveAttribute('inert', '')
  }

  // role=listbox: the colour system picker.
  await page.getByRole('button', { name: /^Colour system/ }).click()
  await expect(page.locator('.menu-select-list[role="listbox"]')).toBeVisible()
  await hidden()
  await page.keyboard.press('Escape')
  await expect(page.locator('.menu-select-list[role="listbox"]')).toBeHidden()
  await back()

  // .pnav-menu: the Create mega menu.
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.locator('.pnav-menu').first()).toBeVisible()
  await hidden()
  await page.keyboard.press('Escape')
  await expect(page.locator('.pnav-menu')).toHaveCount(0)
  await back()
})
