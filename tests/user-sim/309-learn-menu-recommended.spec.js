// Learn mega menu: the suggested guide. Modelled on the Discover cases in
// 262-mega-menu-polish.spec.js (same recent-tools storage key, same markup).
//
// What this pins:
//   · 1440: with no activity the Learn pane suggests the default guide, "A guide
//     to start with". The row is flat (no border) and sits once in the pane.
//   · 1440: the suggestion follows the recent tools in storage: its eyebrow, name
//     and href change with colour, type and image histories.
//   · 768: the target is at least 44px tall and the pane adds no sideways scroll.
//   · 1440: the link opens a real guide and closes the menu; the keyboard ring
//     reaches it before the "Open Learn" button.
//   · 390: the phone sheet's Learn panel carries the same suggestion.
//
// MUTATION: remove `<LearnRecommended>` from the aside in PillNav.jsx: every case
//   here fails (no .pnav-reco in the Learn menu).
// MUTATION: change a slug in GUIDE_FOR_TOOL (learnRecommendation.js): the matching
//   "follows recent tools" case fails on href.
// MUTATION: change 'A guide to start with' in LearnRecommended.jsx: "no activity"
//   fails.
// MUTATION: set `.pnav-reco-link` min-height to 36px in global.css: "44px target"
//   and the phone case fail.
// MUTATION: remove the Learn branch from the phone sheet panel in PillNav.jsx: the
//   "phone sheet" case fails.
// MUTATION: drop `data-pnav-menuitem` from the link in LearnRecommended.jsx: "the
//   keyboard reaches it" fails.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'learnreco')
fs.mkdirSync(SHOTS, { recursive: true })

const PHONE = { name: '390 touch', tag: '390', width: 390, height: 844, touch: true }
const TABLET = { name: '768 touch', tag: '768', width: 768, height: 1024, touch: true }
const DESKTOP = { name: '1440 mouse', tag: '1440', width: 1440, height: 900, touch: false }
const THEMES = ['light', 'dark']
const RECENT_KEY = 'vs-recent-tools'

const guide = (slug) => LEARN_ARTICLES.find((a) => a.slug === slug)

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

async function openLearn(page, size) {
  const trigger = page.locator('.pnav-trigger', { hasText: 'Learn' })
  if (size.touch) await trigger.tap()
  else await trigger.click()
  await expect(page.locator('#pnav-mega')).toBeVisible()
  await expect(page.locator('#pnav-mega .pnav-tool').first()).toBeVisible()
  // The panel's own entrance finishes before anything is read from it.
  await page.waitForTimeout(450)
}

test.describe('Learn suggested guide', () => {
  for (const theme of THEMES) {
    test(`with no activity it suggests the default guide, ${theme}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, DESKTOP, theme, '/discover')
      await openLearn(page, DESKTOP)
      const reco = page.locator('#pnav-mega .pnav-reco')
      await expect(reco).toHaveCount(1)
      const link = reco.locator('a.pnav-reco-link')
      await expect(link).toHaveAttribute('href', '/learn/colour-contrast')
      await expect(link).toContainText(guide('colour-contrast').navLabel)
      await expect(reco.locator('.pnav-reco-eyebrow')).toHaveText('A guide to start with')
      // A flat row on the pane: no border or fill of its own around the link.
      const border = await link.evaluate((el) => getComputedStyle(el).borderTopWidth)
      expect(border, 'the link row is not a bordered card').toBe('0px')
      await shot(page, `learn-reco-default-1440-${theme}`)
      await ctx.close()
    })
  }

  const FOLLOWS = [
    { recent: ['palette'], slug: 'brand-colour', since: 'Palette' },
    { recent: ['alt-text', 'contrast'], slug: 'colour-contrast', since: 'Alt Text' },
    { recent: ['font-gallery', 'palette'], slug: 'typeface-metrics', since: 'Font Gallery' },
    { recent: ['type-scale'], slug: 'type-scales', since: 'Type Scale' },
    { recent: ['file-converter', 'font-pair'], slug: 'colour-spaces', since: 'File Converter' },
  ]
  for (const c of FOLLOWS) {
    test(`the suggestion follows recent tools: ${c.recent.join(', ')}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, DESKTOP, 'light', '/discover', c.recent)
      await openLearn(page, DESKTOP)
      const reco = page.locator('#pnav-mega .pnav-reco')
      await expect(reco.locator('.pnav-reco-eyebrow')).toHaveText(`Since you used ${c.since}`)
      const link = reco.locator('a.pnav-reco-link')
      await expect(link).toHaveAttribute('href', `/learn/${c.slug}`)
      await expect(link.locator('.pnav-reco-name')).toHaveText(guide(c.slug).navLabel)
      await shot(page, `learn-reco-${c.slug}-1440-light`)
      await ctx.close()
    })
  }

  test('its target is at least 44px and the pane adds no sideways scroll, 768', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, TABLET, 'light', '/discover')
    await openLearn(page, TABLET)
    const box = await page.locator('#pnav-mega a.pnav-reco-link').boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'the pane adds no sideways scroll').toBeLessThanOrEqual(1)
    await shot(page, 'learn-reco-768-light')
    await ctx.close()
  })

  test('it opens a real guide and closes the menu', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, DESKTOP, 'light', '/discover', ['type-scale'])
    await openLearn(page, DESKTOP)
    await page.locator('#pnav-mega a.pnav-reco-link').click()
    await expect(page).toHaveURL(/\/learn\/type-scales$/)
    await expect(page.locator('h1').first()).toHaveText(guide('type-scales').title)
    await expect(page.locator('#pnav-mega')).toHaveCount(0)
    await ctx.close()
  })

  test('the guide being read is not suggested again', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, DESKTOP, 'light', '/learn/brand-colour', ['palette'])
    await openLearn(page, DESKTOP)
    const link = page.locator('#pnav-mega a.pnav-reco-link')
    await expect(link).toHaveCount(1)
    expect(await link.getAttribute('href')).not.toBe('/learn/brand-colour')
    await ctx.close()
  })

  test('the keyboard reaches it before the Open Learn button', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, DESKTOP, 'light', '/discover')
    await openLearn(page, DESKTOP)
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

  test('the phone sheet\'s Learn panel carries it too, 390', async ({ browser }) => {
    const { ctx, page } = await openPage(browser, PHONE, 'light', '/projects', ['palette'])
    await page.locator('.pnav-mobile').tap()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await page.locator('.pnav-acc-trigger', { hasText: 'Learn' }).tap()
    const link = page.locator('.pnav-sheet a.pnav-reco-link')
    await expect(link).toHaveAttribute('href', '/learn/brand-colour')
    const box = await link.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width)
    await shot(page, 'sheet-learn-reco-390-light')
    await ctx.close()
  })
})
