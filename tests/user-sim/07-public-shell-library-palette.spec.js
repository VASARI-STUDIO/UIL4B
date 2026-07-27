// Focused release coverage for the public shell, asset-library command surface
// and Palette Builder recovery controls.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'
import { appendCommunitySubmission, readCommunitySubmissions } from '../../src/utils/communitySubmissions.js'
import { buildCommunityPromptRecord, resolvePromptProfileLink } from '../../src/utils/promptSubmission.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'

async function dispatchWindowEvent(page, type) {
  await expect.poll(async () => {
    try {
      return await page.evaluate((eventType) => {
        window.dispatchEvent(new Event(eventType))
        return true
      }, type)
    } catch {
      return false
    }
  }, { timeout: 5000 }).toBe(true)
}

test.describe('public UI quality release', () => {
  test('mega-menu supports directional entry and retired UI Colour links redirect safely', async ({ page }) => {
    watch(page, 'keyboard-first designer')
    await go(page, '/')

    const create = page.getByRole('button', { name: 'Create' })
    await create.focus()
    await create.press('ArrowDown')

    const menu = page.getByRole('region', { name: 'Create menu' })
    await expect(menu).toBeVisible()
    const firstTask = menu.locator('[data-pnav-menuitem]').first()
    await expect(firstTask).toBeFocused()
    await expect(menu).not.toContainText('UI Colour')

    await page.keyboard.press('Escape')
    await expect(create).toBeFocused()

    await go(page, '/color/ui')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/color')
  })

  test('mobile menu restores focus and keeps every route inside the viewport', async ({ page }) => {
    watch(page, 'mobile first-time visitor')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/')

    const menuButton = page.locator('.pnav-mobile')
    await menuButton.click()
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menuButton).toBeFocused()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('every public surface has one shared footer and a persistent Plans route', async ({ page }) => {
    watch(page, 'visitor comparing the product before committing')
    for (const route of ['/', '/color', '/discover', '/learn', '/color/palette', '/icons', '/ratio']) {
      await go(page, route)
      await expect(page.locator('.app-footer'), `${route} should render one shared footer`).toHaveCount(1)
      await expect(page.getByRole('link', { name: 'Plans', exact: true }).last()).toBeVisible()
      if (['/color/palette', '/icons', '/ratio'].includes(route)) {
        await expect(page.locator('.app-footer')).toHaveClass(/app-footer--compact/)
      }
    }
  })

  test('Discover and Learn map blips keep a 24px target around the compact visual dot', async ({ page }) => {
    watch(page, 'touch user exploring public community proof')
    await page.setViewportSize({ width: 390, height: 844 })
    for (const route of ['/discover', '/learn']) {
      await go(page, route)
      const blips = page.locator('.wmap-blip:not(.is-home)')
      await expect(blips.first()).toBeVisible()
      const sizes = await blips.evaluateAll((buttons) => buttons.map((button) => {
        const target = button.getBoundingClientRect()
        const dot = button.querySelector('.wmap-blip-dot').getBoundingClientRect()
        return { targetW: target.width, targetH: target.height, dotW: dot.width, dotH: dot.height }
      }))
      expect(sizes.every(({ targetW, targetH }) => targetW >= 24 && targetH >= 24)).toBe(true)
      expect(sizes.every(({ dotW, dotH }) => dotW <= 11 && dotH <= 11)).toBe(true)
    }
  })

  test('compact footer stays contained and exposes Plans on a narrow tool route', async ({ page }) => {
    watch(page, 'mobile visitor checking plans after using a tool')
    await page.setViewportSize({ width: 320, height: 720 })
    await go(page, '/ratio')

    const footer = page.locator('.app-footer--compact')
    await footer.scrollIntoViewIfNeeded()
    const contained = await footer.locator('.app-footer-inner').evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    )
    expect(contained, 'Compact footer content should not overflow its mobile column').toBe(true)
    await expect(footer.getByRole('link', { name: 'Plans', exact: true })).toBeVisible()
    await expect(footer.getByLabel('Typography — coming soon')).toBeVisible()
    await expect(footer.locator('a[href="/typography"]')).toHaveCount(0)
  })

  test('Icon and Emoji modes switch from the keyboard and explain offline resilience', async ({ page, context }) => {
    watch(page, 'developer sourcing production assets')
    await go(page, '/icons')

    const iconsTab = page.getByRole('tab', { name: /Icons/ })
    await iconsTab.focus()
    await iconsTab.press('ArrowRight')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/emoji')
    await expect(page.getByRole('tab', { name: /Emoji/ })).toBeFocused()

    await context.setOffline(true)
    await dispatchWindowEvent(page, 'offline')
    await expect(page.getByText(/Offline · built-in assets remain available/)).toBeVisible()
    await context.setOffline(false)
    await dispatchWindowEvent(page, 'online')
  })

  test('Palette Reset then edit then Undo restores the latest mutation before the pre-reset state', async ({ page }) => {
    watch(page, 'designer recovering an accidental palette reset')
    await go(page, '/color/palette')

    const seed = page.getByRole('textbox', { name: 'Seed colour hex' })
    await seed.fill('#FF0000')
    await expect(seed).toHaveValue('#FF0000')
    await page.getByRole('button', { name: 'Lock Primary' }).click()
    await expect(page.getByRole('button', { name: 'Unlock Primary' })).toBeVisible()

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(seed).toHaveValue('#4338E0')
    await expect(page.getByRole('button', { name: 'Lock Primary' })).toBeVisible()

    const undo = page.getByRole('button', { name: 'Undo' })
    await expect(undo).toBeEnabled()
    await seed.fill('#00FF00')
    await expect(seed).toHaveValue('#00FF00')
    await undo.click()
    await expect(seed).toHaveValue('#4338E0')
    await expect(page.getByRole('button', { name: 'Lock Primary' })).toBeVisible()

    await undo.click()
    await expect(seed).toHaveValue('#FF0000')
    await expect(page.getByRole('button', { name: 'Unlock Primary' })).toBeVisible()

    await expect(page.getByRole('button', { name: 'Save / export' })).toBeVisible()
  })

  test('community records are scrubbed and unsafe external URLs never become links', async ({ page }) => {
    watch(page, 'privacy-conscious community visitor')
    await page.addInitScript(() => {
      localStorage.setItem('vs-community-submissions', JSON.stringify([{
        id: 'unsafe-owner-record',
        name: 'Unsafe link test',
        author: 'Old profile name',
        authorEmail: 'dylanjacob1100@gmail.com',
        category: 'Landing',
        url: 'javascript:alert(1)',
        c1: '#111111',
        c2: '#333333',
        saves: 0,
      }]))
    })
    await go(page, '/community')

    const card = page.locator('.ch-card', { hasText: 'Unsafe link test' })
    await expect(card).toBeVisible()
    await expect(card.locator('a.ch-thumb')).toHaveCount(0)
    await expect(card.getByText('Dylan Coleman')).toBeVisible()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-community-submissions')))
    expect(stored[0].authorEmail).toBeUndefined()
    expect(stored[0].ownerId).toBe('uil4b-founder')
    expect(stored[0].url).toBe('')
  })

  test('direct Discover load migrates legacy community records before the surface renders', async ({ page }) => {
    watch(page, 'visitor opening Discover from a saved link')
    await page.addInitScript(() => {
      localStorage.setItem('vs-community-submissions', JSON.stringify([{
        id: 'discover-legacy-owner',
        name: 'Discover legacy record',
        author: 'Legacy owner',
        authorEmail: 'dylanjacob1100@gmail.com',
        category: 'Branding',
        url: 'data:text/html,unsafe',
        c1: '#111111',
        c2: '#222222',
        saves: 0,
      }]))
    })
    await go(page, '/discover')

    await expect(page.getByRole('heading', { level: 1, name: 'Find systems worth stealing.' })).toBeVisible()
    await expect.poll(
      () => page.evaluate(() => JSON.parse(localStorage.getItem('vs-community-submissions'))),
    ).toEqual([expect.objectContaining({
      id: 'discover-legacy-owner',
      ownerId: 'uil4b-founder',
      url: '',
    })])
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-community-submissions')))
    expect(stored[0].authorEmail).toBeUndefined()
  })

  test('Palette submission storage migrates legacy email records before appending', () => {
    const values = new Map([[
      'vs-community-submissions',
      JSON.stringify([{
        id: 'legacy',
        name: 'Legacy',
        author: 'Old',
        authorEmail: 'dylanjacob1100@gmail.com',
        url: 'javascript:alert(1)',
      }]),
    ]])
    const storage = {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    }

    appendCommunitySubmission({
      id: 'palette-new',
      name: 'Palette submission',
      author: '@designer',
      category: 'Branding',
      url: 'https://www.uil4b.com/color/palette?c=fff,000',
    }, storage)

    const stored = readCommunitySubmissions(storage)
    expect(stored).toHaveLength(2)
    expect(stored.every(item => !Object.hasOwn(item, 'authorEmail'))).toBe(true)
    expect(stored[0].ownerId).toBe('uil4b-founder')
    expect(stored[0].url).toBe('')
    expect(stored[1].id).toBe('palette-new')
  })

  test('prompt submissions omit email, use safe founder metadata, and reject unsafe profiles', () => {
    const founder = buildCommunityPromptRecord({
      user: { uid: 'founder-uid', email: 'dylanjacob1100@gmail.com' },
      userProfile: { displayName: 'Outdated name' },
      title: 'Founder prompt',
      text: 'Create a colour system.',
      tags: 'colour',
      profileLink: 'javascript:alert(1)',
      createdAt: '2026-07-25T00:00:00.000Z',
    })
    const member = buildCommunityPromptRecord({
      user: { uid: 'member-uid', email: 'member@example.com' },
      userProfile: { displayName: 'Product Designer' },
      title: 'Member prompt',
      text: 'Create a component.',
      tags: 'ui',
      profileLink: 'https://example.com/portfolio',
      createdAt: '2026-07-25T00:00:00.000Z',
    })

    expect(founder.authorEmail).toBeUndefined()
    expect(founder.authorUid).toBe('founder-uid')
    expect(founder.ownerId).toBe('uil4b-founder')
    expect(founder.authorName).toContain('Dylan Coleman')
    expect(founder.profileLink).toBeNull()
    expect(resolvePromptProfileLink({ profileLink: 'data:text/html,unsafe' })).toBe('')
    expect(resolvePromptProfileLink({ authorProfile: 'javascript:alert(1)' })).toBe('')
    expect(resolvePromptProfileLink({ authorProfile: 'https://example.com/legacy-profile' })).toBe('https://example.com/legacy-profile')
    expect(resolvePromptProfileLink({
      profileLink: 'javascript:alert(1)',
      authorProfile: 'https://example.com/legacy-profile',
    })).toBe('https://example.com/legacy-profile')
    expect(member.authorEmail).toBeUndefined()
    expect(member.authorUid).toBe('member-uid')
    expect(Object.hasOwn(member, 'ownerId')).toBe(false)
    expect(member.authorName).toBe('Product Designer')
    expect(member.profileLink).toBe('https://example.com/portfolio')
    expect(COMMUNITY_PROMPTS.every(prompt => prompt.ownerId == null)).toBe(true)
  })
})
