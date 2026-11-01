// The value-proposition Learn article, in a browser.
//
// 51-learn-articles.spec.js walks every registered article for the shared
// shell. This file holds what is specific to this one, and the joins a new
// article can miss one at a time:
//
//   1. THE PAGE. The h1 and all five sections render, and each section's id is
//      the one the contents link and the deep link point at.
//   2. THE LISTINGS. The article is a card on the /learn index (under its own
//      Psychology topic, a topic that exists only because of this article) and
//      a row in the Learn menu.
//   3. NO SIDEWAYS SCROLL on a phone. The article carries long source labels
//      and wide tables; either can widen the document.
//   4. THE SERVED SHELL. A crawler reads the prerendered file, not the hydrated
//      page, so the h1 has to be in the file on disk.
//   5. THE NEXT STEP goes to the Contrast Checker.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { findArticle } from '../../src/data/learnIndex.js'

const SLUG = 'improving-value-proposition'
const ROUTE = `/learn/${SLUG}`
const SECTION_IDS = ['evidence', 'value-and-pricing', 'trust-and-defaults', 'interface-laws', 'dark-patterns']

const article = findArticle(SLUG)

test('the article this spec walks is registered with the five sections', async () => {
  expect(article, `${SLUG} is not in LEARN_ARTICLES`).toBeTruthy()
  expect(article.sections.map((s) => s.id)).toEqual(SECTION_IDS)
  expect(article.topic).toBe('Psychology')
})

test.describe('Improving your value proposition', () => {
  test('renders its heading and every section, each one reachable from the contents', async ({ page }) => {
    watch(page, 'reader opening the value-proposition guide')
    await go(page, ROUTE)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
    await expect(page.locator('.lart-crumb a').last()).toHaveText('Psychology')

    for (const section of article.sections) {
      const block = page.locator(`section#${section.id}`)
      await expect(block, `section #${section.id} is not in the document`).toBeAttached()
      await expect(block.locator('h2').first()).toHaveText(section.title)
      await expect(page.locator(`.lart-toc a[href="#${section.id}"]`)).toHaveText(section.title)
    }
    // Five sections, five h2s: a stray extra heading would be a section the
    // contents do not list.
    await expect(page.locator('.lart-prose h2')).toHaveCount(SECTION_IDS.length)
  })

  test('is listed on the Learn index under Psychology', async ({ page }) => {
    watch(page, 'reader browsing the Learn index')
    await go(page, '/learn')
    const card = page.locator(`.lidx-card[href="${ROUTE}"]`)
    await expect(card).toBeVisible()
    await expect(card).toContainText(article.title)
    await expect(card).toContainText('Psychology')
  })

  test('is a row in the Learn menu', async ({ page }) => {
    watch(page, 'reader opening the Learn menu')
    await go(page, '/discover')
    await page.getByRole('button', { name: 'Learn', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Learn menu' })).toBeVisible()
    const row = page.locator(`#pnav-mega a.pnav-tool[href="${ROUTE}"]`)
    await expect(row).toBeVisible()
    await expect(row).not.toHaveAttribute('data-soon', 'true')
    await expect(row).toContainText(article.navLabel)
  })

  test('does not scroll sideways at 390px', async ({ page }) => {
    watch(page, 'reader on a 390px phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, ROUTE)
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    expect(
      overflow.scroll,
      `${ROUTE} scrolls horizontally at 390px: ${overflow.scroll} > ${overflow.client}`,
    ).toBeLessThanOrEqual(overflow.client + 1)
  })

  test('the next step goes to the Contrast Checker', async ({ page }) => {
    watch(page, 'reader finishing the guide')
    await go(page, ROUTE)
    const next = page.locator('.lart-next a.lart-next-go')
    await expect(next).toHaveAttribute('href', '/create/contrast')
    await expect(next).toContainText('Contrast Checker')
  })
})

test('the prerendered shell on disk carries the h1 for a crawler', async () => {
  const dist = process.env.DIST_DIR || 'dist'
  const file = path.resolve(process.cwd(), dist, 'learn', SLUG, 'index.html')
  expect(fs.existsSync(file), `${file} was not prerendered`).toBe(true)
  const html = fs.readFileSync(file, 'utf8')
  expect(html, 'the shell has no h1 with the article title')
    .toContain(`<h1>UI L4B | ${article.title}</h1>`)
})
