import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'
import { CREATE_GROUPS, DISCOVER_GROUPS, LEARN_GROUPS } from '../../src/data/toolTree.js'

const STATIC_INDEXABLE_ROUTES = [
  '/',
  '/color',
  '/plans',
  '/community',
  '/help',
  '/info',
  '/seo',
  '/feedback',
  '/privacy',
  '/terms',
]

const LIVE_CREATE_ROUTES = CREATE_GROUPS.flatMap((group) => (
  group.soon ? [] : group.tools.filter((tool) => !tool.soon).map((tool) => tool.route)
))

const LIVE_DISCOVER_ROUTES = DISCOVER_GROUPS
  .filter((group) => !group.soon)
  .map((group) => group.route)

const EXPECTED_CRAWLER_ROUTES = [
  ...new Set([...STATIC_INDEXABLE_ROUTES, ...LIVE_CREATE_ROUTES, ...LIVE_DISCOVER_ROUTES]),
].sort()

const RETIRED_OR_THIN_ROUTES = [
  '/color/ui',
  '/fontpairs',
  '/fontgallery',
  '/typescale',
  '/box-shadow',
  '/ui-builder',
  '/auto-builder',
  '/ai-prompt',
  '/landing-prompts',
  '/alt-text',
  '/typography',
  '/imagery',
  '/icons-emoji',
  '/ai-tools',
  '/prompts',
  '/discover',
  '/learn',
]

function crawlerPaths(xml) {
  return [...xml.matchAll(/<loc>https:\/\/www\.uil4b\.com([^<]*)<\/loc>/g)]
    .map((match) => match[1] || '/')
}

test.describe('public route contract', () => {
  test('crawler sitemap contains every live canonical route and no staged or redirect destination', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toMatch(/^(application|text)\/xml\b/i)
    expect(response.headers()['content-type']).not.toMatch(/^text\/html\b/i)

    const xml = await response.text()
    expect(xml.trimStart().startsWith('<?xml')).toBe(true)

    const paths = crawlerPaths(xml)
    expect(paths).toHaveLength(new Set(paths).size)
    expect([...paths].sort()).toEqual(EXPECTED_CRAWLER_ROUTES)

    for (const route of RETIRED_OR_THIN_ROUTES) {
      expect(paths, `${route} must stay out of the crawler sitemap`).not.toContain(route)
    }
  })

  test('visual sitemap distinguishes the live Discover slice from non-actionable Soon destinations', async ({ page }) => {
    watch(page, 'visitor checking what is available before choosing a tool')
    await go(page, '/sitemap')

    const discover = page.locator('[data-sitemap-section="discover"]')
    await expect(discover).toContainText('1 live · more coming')

    const gradient = discover.locator('[data-route="/discover/gradients"]')
    await expect(gradient).not.toHaveAttribute('data-soon')
    await expect(gradient.getByRole('link', { name: /Gradient Gallery/ })).toHaveAttribute('href', '/discover/gradients')

    const stagedDiscover = discover.locator('[data-soon="true"]')
    await expect(stagedDiscover).toHaveCount(DISCOVER_GROUPS.filter((group) => group.soon).length)
    await expect(stagedDiscover.locator('a')).toHaveCount(0)

    const learn = page.locator('[data-sitemap-section="learn"]')
    await expect(learn.locator('[data-soon="true"]')).toHaveCount(LEARN_GROUPS.length)
    await expect(learn.locator('a')).toHaveCount(0)

    const stagedTypeScale = page.locator('.smap-link[data-route="/typescale"]')
    await expect(stagedTypeScale).toHaveAttribute('data-soon', 'true')
    await expect(stagedTypeScale.locator('a')).toHaveCount(0)
  })

  test('retired UI Colour redirects to the live colour landing without re-entering the tool dispatcher', async ({ page }) => {
    watch(page, 'visitor following an old colour-tool bookmark')
    await go(page, '/color/ui')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/color')
    await expect(page.getByRole('heading', { name: 'One colour system, start to finish.' })).toBeVisible()
  })

  test('generic social card is a real 1200 by 630 PNG response', async ({ request }) => {
    const response = await request.get('/previews/og-image.png')
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toMatch(/^image\/png\b/i)

    const body = await response.body()
    expect([...body.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(body.readUInt32BE(16)).toBe(1200)
    expect(body.readUInt32BE(20)).toBe(630)
  })
})
