// Guide meta line, 404 link row and header search.
//
// Separators: no line of the 404 link row or a guide's meta line ends on a "·"
// at 360 or 390, and none starts on one.
// Search: Learn guides read as guides (own "Guides" group in the palette, a
// "Guide" pill in the hero bar), and punctuated multi-word queries find their tool.
import { test, expect } from './base.js'
import { expectRendered, go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

/** Open the header search from its pill field and hand back its text input. */
async function openPalette(page) {
  await page.locator('.pnav-search-field:visible').first().click()
  const dialog = page.getByRole('dialog', { name: /search/i })
  await expect(dialog).toBeVisible()
  const input = dialog.locator('.cp-input')
  await expect(input).toBeVisible()
  return input
}

const WIDTHS = [{ width: 360, height: 740 }, { width: 390, height: 844 }]

/** For each line of items, is its visible text free of a leading or trailing dot? */
async function lineEdges(page, itemSelector) {
  return page.evaluate((sel) => {
    const items = [...document.querySelectorAll(sel)]
    const lines = new Map()
    for (const el of items) {
      const r = el.getBoundingClientRect()
      const key = Math.round(r.top / 4)
      if (!lines.has(key)) lines.set(key, [])
      lines.get(key).push(el)
    }
    const host = items[0].closest('.trail, .lart-meta')
    const hostBox = host.getBoundingClientRect()
    return [...lines.values()].map((els) => {
      const first = els[0]
      const dot = getComputedStyle(first, '::before').content
      const box = first.getBoundingClientRect()
      // A dot that starts a line sits left of the host's left edge, where the host clips it.
      const dotLeft = box.left
      return {
        items: els.length,
        text: els.map((e) => e.textContent.trim()).join(' | '),
        endsOnDot: els.some((e) => /·\s*$/.test(e.textContent)) || getComputedStyle(els[els.length - 1], '::after').content !== 'none',
        startDotVisible: dot !== 'none' && dot !== 'normal' && dotLeft >= hostBox.left - 0.5,
      }
    })
  }, itemSelector)
}

for (const vp of WIDTHS) {
  test(`the 404 link row has no line ending or starting on a dot at ${vp.width}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp })
    const page = await ctx.newPage()
    watch(page, 'a visitor who followed a dead link on a phone')
    await go(page, '/no-such-page-for-trail-check')
    await expect(page.locator('.nf-more .trail-item')).toHaveCount(3)
    // The separators are drawn by the stylesheet, so no dot is text in the row:
    // a dot typed between the links cannot be told apart from a link at a wrap.
    expect(await page.locator('.nf-more').innerText(), 'a separator dot is typed into the link row').not.toContain('·')
    const lines = await lineEdges(page, '.nf-more .trail-item')
    for (const l of lines) {
      expect(l.endsOnDot, `a line ends on a separator: ${l.text}`).toBe(false)
      expect(l.startDotVisible, `a line starts on a visible separator: ${l.text}`).toBe(false)
    }
    // Every link is a 44px target on a touch device, 24px at least otherwise.
    const heights = await page.locator('.nf-more a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(24)
    await ctx.close()
  })

  for (const article of LEARN_ARTICLES) {
    test(`${article.slug}: the meta line never ends a line on a dot at ${vp.width}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: vp })
      const page = await ctx.newPage()
      watch(page, 'a visitor reading a guide on a phone')
      await go(page, `/learn/${article.slug}`)
      await expectRendered(page, `/learn/${article.slug}`)
      const itemSel = (await page.locator('.lart-trail .trail-item').count()) ? '.lart-trail .trail-item' : '.lart-meta > span'
      const lines = await lineEdges(page, itemSel)
      for (const l of lines) expect(l.endsOnDot, `a line ends on a separator: ${l.text}`).toBe(false)
      await ctx.close()
    })
  }
}

test.describe('header search shows guides as guides', () => {
  test('the palette lists Brand Colour Guide under Guides, not Tools', async ({ page }) => {
    watch(page, 'a visitor searching for a guide')
    await go(page, '/learn')
    const input = await openPalette(page)
    await input.fill('brand colour')
    const group = page.locator('.cp-results [role="group"][aria-label="Guides"]')
    await expect(group).toHaveCount(1)
    await expect(group.locator('.cp-item-label', { hasText: 'Brand Colour Guide' })).toHaveCount(1)
    await expect(page.locator('.cp-results [role="group"]:not([aria-label="Guides"]) .cp-item-label', { hasText: 'Brand Colour Guide' })).toHaveCount(0)
    // Its glyph is the guide's own (three stacked layers), not the star used for an unknown row.
    await expect(group.locator('.cp-item-icon svg path').first()).toHaveAttribute('d', 'M12 2L2 7l10 5 10-5-10-5z')
  })

  test('the home hero bar pills the guide as a Guide', async ({ page }) => {
    watch(page, 'a visitor searching from the front door')
    await go(page, '/')
    const box = page.locator('.sp-search input.hcmd-input')
    await box.fill('brand colour')
    const row = page.locator('.hcmd-row', { hasText: 'Brand Colour Guide' })
    await expect(row).toHaveCount(1)
    await expect(row.locator('.hcmd-row-cat')).toHaveText('Guide')
  })
})

test.describe('punctuated multi-word queries find their tool', () => {
  for (const [query, label] of [['tint, generator', 'Tint'], ['tint generator.', 'Tint'], ['alt-text generator', 'Alt Text Generator']]) {
    test(`"${query}" finds ${label}`, async ({ page }) => {
      watch(page, 'a visitor typing a tool name with punctuation')
      await go(page, '/learn')
      const input = await openPalette(page)
      await input.fill(query)
      await expect(page.locator('.cp-item-label', { hasText: new RegExp(`^${label}$`) }).first()).toBeVisible()
    })
  }

  test('the home hero bar finds them too', async ({ page }) => {
    watch(page, 'a visitor typing a tool name with punctuation')
    await go(page, '/')
    const box = page.locator('.sp-search input.hcmd-input')
    await box.fill('alt-text generator')
    await expect(page.locator('.hcmd-row-title', { hasText: /^Alt Text Generator$/ }).first()).toBeVisible()
  })
})
