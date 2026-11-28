// THE PREMIUM TEMPLATES, FIRST AND IN THE MAIN VIEW.
//
// The ten premium templates (21 up) lead every template list in the Export popup, in id order, for every account. In Guidelines and
// UI kit the main view also shows a "Premium templates" row under the preview: 4 cards on the rail (1440), 3 on the menu (768), 2 on a
// phone (390). A click chooses that template in place; "See all" opens the gallery; a free account gets the Pro tag and the existing
// upgrade path, a Pro account none. Names, counts and copy are written out here, not read from src/.
//
// MUTATIONS (each break must fail the group named after it):
//   - premiumThemesFor drops the id sort or keeps 25 and 27     -> "the gallery lists the premium ten first"
//   - ExportTemplates sorts free-first for a free account       -> "the gallery lists the premium ten first" (free account, and while the plan loads)
//   - the strip renders in Brand book, Image or Code            -> "the row is only in Guidelines and UI kit"
//   - the count ignores the layout (always 4)                   -> "the strip shows 4, 3 and 2 cards"
//   - the rail keeps the 460px stage                            -> "the strip shows 4, 3 and 2 cards" (in view without scrolling)
//   - a strip click opens the gallery or leaves the main view   -> "a free account clicking a premium card"
//   - the strip drops the Pro rule                              -> "a free account clicking a premium card" and "a Pro account"
//   - "See all" does not move focus into the gallery            -> "See all opens the gallery"
//   - the .xd-tpl-card.is-on:focus-visible outline goes         -> "a chosen strip card keeps a focus ring"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { GALLERY, chooseFormat, exportPanel, primaryButton, openTemplates, readTemplates } from './export-rows.js'

const ROUTE = '/projects/harbour/export'
// Set Square is Pro and makes the guidelines only, so it is the eleventh premium template there and not in the UI kit.
const PREMIUM = ['Keynote', 'Stub', 'Front Page', 'Standards Plate', 'Notebook', 'Print Shop', 'Drawing Sheet', 'Fluted', 'Contact', 'Dieline']
const WIDTHS = [
  { name: '1440', size: { width: 1440, height: 900 }, count: 4 },
  { name: '768', size: { width: 768, height: 1024 }, count: 3 },
  { name: '390', size: { width: 390, height: 844 }, count: 2 },
]
const FILES = [
  { id: 'guidelines', cat: 'Guidelines', total: 25, wayOut: 'Use the free Guidelines (Label)' },
  { id: 'kit', cat: 'UI kit', total: 20, wayOut: 'Use the free UI kit (Standards)' },
]

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  const now = new Date().toISOString()
  return { id: 'harbour', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

async function open(page, { plan = 'free', file = 'guidelines', size, hold = false } = {}) {
  if (size) await page.setViewportSize(size)
  const uid = `test-uid-prem-${plan}`
  await signIn(page, { plan, uid, projects: [savedProject()], ...(hold ? { slowReads: [{ path: `users/${uid}`, hold: true }] } : {}) })
  await go(page, ROUTE)
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  await chooseFormat(panel, file)
  await page.mouse.move(0, 0)
  return panel
}

const strip = (panel) => panel.locator('.xd-prem .xd-tpl-card')
const names = (loc) => loc.locator('.xd-tpl-n').allTextContents()
const seeAll = (panel) => panel.locator('.xd-prem .xd-link')

/** Where the strip's last card ends, where the scroll area ends, and how far it has scrolled. */
const fold = (panel) => panel.evaluate((el) => {
  const last = [...el.querySelectorAll('.xd-prem .xd-tpl-card')].at(-1)
  const scroll = el.querySelector('.xd-scroll')
  return { bottom: last.getBoundingClientRect().bottom, fold: scroll.getBoundingClientRect().bottom, top: scroll.scrollTop }
})

test.describe('the gallery lists the premium ten first', () => {
  for (const f of FILES) for (const plan of ['free', 'pro']) {
    test(`${f.cat}, ${plan} account: ten premium in id order, then the free ones, then the classics`, async ({ page }) => {
      watch(page, `a ${plan} account reading the ${f.cat} templates`)
      const panel = await open(page, { plan, file: f.id })
      const read = await readTemplates(panel)
      expect(read.names.slice(0, 10), 'premium, in id order').toEqual(PREMIUM)
      if (f.id === 'guidelines') expect(read.names.slice(10, 12), 'Set Square and Dispatch, the eleventh and twelfth, are Pro for the guidelines only').toEqual(['Set Square', 'Dispatch'])
      expect(read.names, 'every template once').toHaveLength(f.total)
      expect(new Set(read.names).size, 'no template twice').toBe(f.total)
      if (f.id === 'guidelines') expect(read.names.slice(12, 15), 'Label, Swiss Field and Flyleaf follow, they are free').toEqual(['Label', 'Swiss Field', 'Flyleaf'])
      else expect(read.names[10], 'Standards follows, the kit is free in it').toBe('Standards')
      expect(read.names.indexOf('Presentation'), 'the classics come after').toBeGreaterThan(10)
    })
  }

  test('the order does not change when the plan answers', async ({ page }) => {
    watch(page, 'a free account opening the gallery while the plan is still being read')
    const panel = await open(page, { plan: 'free', file: 'guidelines', hold: true })
    const before = await names(await openTemplates(panel))
    expect(before.slice(0, 10)).toEqual(PREMIUM)
    await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
    await expect(primaryButton(panel)).toBeEnabled()
    expect(await names(panel.locator(GALLERY)), 'the same list once the plan is known').toEqual(before)
  })
})

test.describe('the row is only in Guidelines and UI kit', () => {
  test('present in both, absent in Brand book, Image and Code; View templates stays', async ({ page }) => {
    watch(page, 'a free account looking for the premium row in each file')
    const panel = await open(page, { plan: 'free', file: 'guidelines' })
    for (const f of FILES) {
      await chooseFormat(panel, f.id)
      await expect(panel.locator('.xd-prem'), f.cat).toHaveCount(1)
      await expect(panel.getByRole('heading', { name: 'Premium templates', level: 3 }), f.cat).toBeVisible()
      await expect(panel.getByRole('button', { name: 'View templates' }), `${f.cat}: the dock toggle stays`).toBeVisible()
    }
    for (const id of ['book', 'png', 'css']) {
      await chooseFormat(panel, id)
      await expect(panel.locator('.xd-prem'), id).toHaveCount(0)
    }
  })
})

test.describe('the strip shows 4, 3 and 2 cards', () => {
  for (const w of WIDTHS) for (const f of FILES) {
    test(`${f.cat} at ${w.name}: ${w.count} cards, the first ${w.count} premium, "See all ${f.total}"`, async ({ page }) => {
      watch(page, `a free account on ${f.cat} at ${w.name}`)
      const panel = await open(page, { plan: 'free', file: f.id, size: w.size })
      await expect(strip(panel)).toHaveCount(w.count)
      expect(await names(panel.locator('.xd-prem'))).toEqual(PREMIUM.slice(0, w.count))
      await expect(seeAll(panel)).toHaveText(`See all ${f.total}`)
      await expect(seeAll(panel)).toHaveAccessibleName(`See all ${f.total} ${f.cat} templates`)
      await expect(panel.getByRole('button', { name: 'View templates' })).toBeVisible()
    })
  }

  for (const w of WIDTHS.slice(0, 2)) for (const f of FILES) {
    test(`the strip is in view without scrolling at ${w.name} (${f.cat})`, async ({ page }) => {
      watch(page, `a free account on ${f.cat} at ${w.name}, reading the fold`)
      const panel = await open(page, { plan: 'free', file: f.id, size: w.size })
      const at = await fold(panel)
      expect(at.top, 'the column has not scrolled').toBe(0)
      expect(at.bottom, 'the last card is above the fold').toBeLessThanOrEqual(at.fold)
    })
  }

  test('at 390 nothing runs sideways, and every card and the link are 44px targets', async ({ page }) => {
    watch(page, 'a phone user reading the premium row')
    const panel = await open(page, { plan: 'free', file: 'guidelines', size: WIDTHS[2].size })
    await seeAll(panel).scrollIntoViewIfNeeded()
    const fit = await panel.evaluate((el) => ({
      page: document.documentElement.scrollWidth,
      col: el.querySelector('.xd-scroll').scrollWidth - el.querySelector('.xd-scroll').clientWidth,
      cards: [...el.querySelectorAll('.xd-prem .xd-tpl-card')].map((c) => c.getBoundingClientRect().height),
      link: el.querySelector('.xd-prem .xd-link').getBoundingClientRect().height,
    }))
    expect(fit.page).toBeLessThanOrEqual(390)
    expect(fit.col).toBeLessThanOrEqual(0)
    for (const h of [...fit.cards, fit.link]) expect(h).toBeGreaterThanOrEqual(44)
  })
})

test.describe('a free account clicking a premium card', () => {
  for (const f of FILES) {
    test(`${f.cat}: Keynote is chosen in place, the dock says Upgrade to Pro and offers the free way out`, async ({ page }) => {
      watch(page, `a free account choosing Keynote from the strip on ${f.cat}`)
      const panel = await open(page, { plan: 'free', file: f.id, size: WIDTHS[0].size })
      const keynote = strip(panel).filter({ hasText: 'Keynote' })
      await expect(keynote.locator('.xd-tpl-pro'), 'the Pro tag is on the card').toHaveCount(1)
      await keynote.click()
      await expect(keynote).toHaveAttribute('aria-pressed', 'true')
      await expect(keynote).toBeFocused()
      await expect(panel.locator(GALLERY), 'still the main view').toHaveCount(0)
      await expect(primaryButton(panel)).toHaveText('Upgrade to Pro')
      await expect(panel.locator('.xd-wayout')).toHaveText(f.wayOut)
      await expect(panel.getByText('Pro template: showing the sample.')).toBeVisible()
    })
  }

  test('the way out chooses the free template and the dock says Export again', async ({ page }) => {
    watch(page, 'a free account taking the way out after a strip pick')
    const panel = await open(page, { plan: 'free', file: 'guidelines', size: WIDTHS[0].size })
    await strip(panel).filter({ hasText: 'Keynote' }).click()
    await panel.locator('.xd-wayout').click()
    await expect(panel.locator('.xd-prem .xd-tpl-card[aria-pressed="true"]')).toHaveCount(0)
    await expect(primaryButton(panel)).toHaveText('Export PDF')
  })

  test('a phone pick shows the result in the dock without scrolling', async ({ page }) => {
    watch(page, 'a phone user choosing from the strip')
    const panel = await open(page, { plan: 'free', file: 'guidelines', size: WIDTHS[2].size })
    await strip(panel).first().scrollIntoViewIfNeeded()
    await strip(panel).first().click()
    await expect(primaryButton(panel)).toHaveText('Upgrade to Pro')
    await expect(primaryButton(panel)).toBeInViewport()
  })
})

test.describe('a Pro account', () => {
  test('sees no Pro tag on the strip, and a pick still exports', async ({ page }) => {
    watch(page, 'a Pro account choosing from the strip')
    const panel = await open(page, { plan: 'pro', file: 'guidelines', size: WIDTHS[0].size })
    await expect(strip(panel)).toHaveCount(4)
    await expect(panel.locator('.xd-prem .xd-tpl-pro')).toHaveCount(0)
    await strip(panel).filter({ hasText: 'Keynote' }).click()
    await expect(primaryButton(panel)).toHaveText('Export PDF')
    await expect(panel.locator('.xd-wayout')).toHaveCount(0)
  })
})

test.describe('See all opens the gallery', () => {
  test('the gallery shows, the strip goes, and focus is on the chosen card', async ({ page }) => {
    watch(page, 'a keyboard user following See all')
    const panel = await open(page, { plan: 'free', file: 'guidelines', size: WIDTHS[0].size })
    await seeAll(panel).click()
    await expect(panel.locator(GALLERY)).toBeVisible()
    await expect(panel.locator('.xd-prem')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.matches('.xd-tpl-grid .xd-tpl-card.is-on')))).toBe(true)
    await expect(panel.locator(`${GALLERY} .xd-tpl-card.is-on`)).toContainText('Label')
  })
})

test.describe('a chosen strip card keeps a focus ring', () => {
  test('Tab to the chosen card: an outline set apart from its border', async ({ page }) => {
    watch(page, 'a keyboard user on a chosen strip card')
    const panel = await open(page, { plan: 'pro', file: 'guidelines', size: WIDTHS[0].size })
    const keynote = strip(panel).filter({ hasText: 'Keynote' })
    await keynote.click()
    await seeAll(panel).focus()
    await page.keyboard.press('Tab')
    await expect(keynote).toBeFocused()
    const ring = await keynote.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, offset: parseFloat(s.outlineOffset) } })
    expect(ring.style).not.toBe('none')
    expect(ring.offset).toBeGreaterThanOrEqual(2)
  })
})
