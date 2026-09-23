import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { CREATE_GROUPS, DISCOVER_GROUPS, LEARN_ROADMAP } from '../../src/data/toolTree.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'
import { LEARN_ARTICLES, LEARN_ARTICLE_ROUTES } from '../../src/data/learnIndex.js'

const STATIC_INDEXABLE_ROUTES = [
  '/',
  // '/create/color' moved to RETIRED_OR_THIN_ROUTES with the colour landing's
  // deletion — see the note there.
  '/discover',
  '/plans',
  '/community',
  '/help',
  '/info',
  '/seo',
  '/feedback',
  // The third-party attribution page. A real, indexable surface rather than a
  // legal footnote: four of the icon packs it credits are CC-BY and REQUIRE
  // visible attribution, and two of those are on the free tier — so this is
  // owed to a signed-out visitor, and a crawler should find it advertised
  // rather than treated as an orphan. Reached from both footers.
  '/credits',
  '/privacy',
  '/terms',
  // The HTML sitemap. Low priority, but it is a real page and the 404 links to
  // it as "see every page", so a crawler following that link should find it
  // advertised rather than treated as an orphan.
  '/sitemap',
  // /learn moved out of RETIRED_OR_THIN_ROUTES the day it stopped being a
  // landing page over nothing. It now lists the published guides above its
  // roadmap, and each guide is advertised in its own right below.
  '/learn',
  // /principles is public from its first commit: it has no roadmap phase and
  // nothing on it is staged. Every rule it states is beside a proof computed on
  // the page, and each links to a route that is already live — which is what
  // the last test in this file asserts, so a Soon destination cannot arrive on
  // it later without failing here.
  '/principles',
]

const LIVE_CREATE_ROUTES = CREATE_GROUPS.flatMap((group) => (
  group.soon ? [] : group.tools.filter((tool) => !tool.soon).map((tool) => tool.route)
))

const LIVE_DISCOVER_ROUTES = DISCOVER_GROUPS
  .filter((group) => !group.soon)
  .map((group) => group.route)

const EXPECTED_CRAWLER_ROUTES = [
  ...new Set([
    ...STATIC_INDEXABLE_ROUTES, ...LIVE_CREATE_ROUTES, ...LIVE_DISCOVER_ROUTES,
    ...LEARN_ARTICLE_ROUTES,
  ]),
].sort()

const RETIRED_OR_THIN_ROUTES = [
  '/color/ui',
  // The colour landing (ColorLanding) was DELETED with the other two landings.
  // '/create/color' is now a category home that bounces to '/create/palette'
  // exactly like the other four — App.jsx says so, and CREATE_HOMES_THAT_RENDER
  // in toolTree.js is empty. A redirect destination has no business in the
  // crawler sitemap, and scripts/sync-sitemap.mjs already leaves it out; this
  // list was the last place still calling it an indexable page.
  '/create/color',
  '/create/box-shadow',
  '/create/component-designer',
  // '/create/auto-builder' was here while it was a workshop placeholder. It
  // now mounts Brand Starter (beta) and is `soon: false` in the tool tree, so
  // EXPECTED_CRAWLER_ROUTES derives it above — the same move '/create/alt-text'
  // made when it shipped.
  '/create/ai-prompt',
  '/create/landing-prompts',
  // '/create/alt-text' was here while the tool was staged. It is live again (founder
  // batch 4), mounted in CreateTool's LIVE_TOOLS and listed in the crawler
  // sitemap, so EXPECTED_CRAWLER_ROUTES now derives it from the tool tree above.
  '/create/typography',
  '/create/imagery',
  '/create/icons-emoji',
  '/create/ai-tools',
  '/prompts',
  // /discover moved OUT of this list: it is a real surface landing with links
  // to three live libraries (asserted in the first test below), so excluding it
  // was hiding a genuine page from the index.
  //
  // /learn went the same way once real content shipped. It was here while the
  // page's own copy read "Learn is coming soon" over eight unbuilt sections;
  // it now lists the published guides, so it is in STATIC_INDEXABLE_ROUTES
  // above and its articles come from LEARN_ARTICLE_ROUTES.
]

function crawlerPaths(xml) {
  return [...xml.matchAll(/<loc>https:\/\/uil4b\.com([^<]*)<\/loc>/g)]
    .map((match) => match[1] || '/')
}

test.describe('public route contract', () => {
  test('Discover exposes the live palette, gradient and font libraries', async ({ page }) => {
    watch(page, 'designer browsing the live Discover catalogue')
    await go(page, '/discover')

    await expect(page.getByRole('link', { name: /Palette Library/ })).toHaveAttribute('href', '/discover/palettes')
    await expect(page.getByRole('link', { name: /Gradient Library/ })).toHaveAttribute('href', '/discover/gradients')
    await expect(page.getByRole('link', { name: /Font Gallery/ })).toHaveAttribute('href', '/create/font-gallery')

    await go(page, '/discover/palettes')
    await expect(page.getByRole('heading', { level: 1, name: 'Palette Library' })).toBeVisible()
    // The browsable count, not the library size: withheld palettes are absent
    // rather than rendered and styled as locked, so they produce no card.
    //
    // THE CAP, NOT THE ELIGIBLE SET. This asserted every non-Pro palette (71)
    // until the galleries gained the 3 / 10 / full ladder; a signed-out visitor
    // now sees `GALLERY_TIER_LIMITS.anonymous`. Read from the same table the
    // page caps with, never typed — 44-locked-library-tease.spec.js proves the
    // ladder itself at all three rungs, and this file only needs the route to
    // serve the library at all.
    await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
    // Midnight Teal is the first eligible palette, so it is inside the
    // anonymous cap and the search still has something to narrow to.
    await page.getByPlaceholder('Search by name, hex, colour or mood…').fill('Midnight Teal')
    await expect(page.locator('.pgal-card')).toHaveCount(1)
  })

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
    await expect(discover).toContainText(`${DISCOVER_GROUPS.filter((group) => !group.soon).length} live · more coming`)

    const gradient = discover.locator('[data-route="/discover/gradients"]')
    await expect(gradient).not.toHaveAttribute('data-soon')
    await expect(gradient.getByRole('link', { name: /Gradient Library/ })).toHaveAttribute('href', '/discover/gradients')

    const palettes = discover.locator('[data-route="/discover/palettes"]')
    await expect(palettes).not.toHaveAttribute('data-soon')
    await expect(palettes.getByRole('link', { name: /Palette Library/ })).toHaveAttribute('href', '/discover/palettes')

    const fonts = discover.locator('[data-route="/create/font-gallery"]')
    await expect(fonts).not.toHaveAttribute('data-soon')
    await expect(fonts.getByRole('link', { name: /Font Gallery/ })).toHaveAttribute('href', '/create/font-gallery')

    const stagedDiscover = discover.locator('[data-soon="true"]')
    await expect(stagedDiscover).toHaveCount(DISCOVER_GROUPS.filter((group) => group.soon).length)
    await expect(stagedDiscover.locator('a')).toHaveCount(0)

    // Learn is now BOTH: published guides that are real links, and a topic
    // roadmap whose rows are still non-actionable. The column asserted zero
    // links while every row was Soon; it now asserts the split, which is the
    // property that matters — a Soon row must never become clickable, and a
    // published guide must never lose its href.
    //
    // LEARN_ROADMAP, not LEARN_GROUPS: a roadmap row whose guide has shipped
    // carries that guide's route, so the map lists it once — as the guide.
    const learn = page.locator('[data-sitemap-section="learn"]')
    await expect(learn.locator('[data-soon="true"]')).toHaveCount(LEARN_ROADMAP.length)
    await expect(learn.locator('[data-soon="true"] a')).toHaveCount(0)
    for (const article of LEARN_ARTICLES) {
      const row = learn.locator(`.smap-link[data-route="/learn/${article.slug}"]`)
      await expect(row).not.toHaveAttribute('data-soon', 'true')
      await expect(row.locator('a')).toHaveAttribute('href', `/learn/${article.slug}`)
    }

    // A Create tool still in the workshop stays non-actionable on the map…
    const stagedBoxShadow = page.locator('.smap-link[data-route="/create/box-shadow"]')
    await expect(stagedBoxShadow).toHaveAttribute('data-soon', 'true')
    await expect(stagedBoxShadow.locator('a')).toHaveCount(0)

    // …while the three typography tools that just shipped are real links.
    for (const route of ['/create/font-gallery', '/create/font-pair', '/create/type-scale']) {
      const live = page.locator(`.smap-link[data-route="${route}"]`).first()
      await expect(live).not.toHaveAttribute('data-soon', 'true')
      await expect(live.locator('a')).toHaveAttribute('href', route)
    }
  })

  test('retired UI Colour lands on a real tool in ONE hop, not on a category that bounces again', async ({ page }) => {
    watch(page, 'visitor following an old colour-tool bookmark')
    await go(page, '/color/ui')
    // '/create/color', not '/create/palette', until the colour landing was
    // deleted. It is now a category home that bounces like the other four, so
    // sending an old bookmark there would be a two-hop redirect — the exact
    // defect src/data/legacyRoutes.js exists to prevent. App.jsx's early return
    // names '/create/palette' for that reason, and this asserts the hop count
    // by landing on the tool itself.
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/palette')
    await expect(page.getByRole('heading', { level: 1, name: 'Palette Generator' })).toBeVisible()
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
