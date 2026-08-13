// Focused release coverage for the public shell, asset-library command surface
// and Palette Builder recovery controls.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'
import { appendCommunitySubmission, readCommunitySubmissions } from '../../src/utils/communitySubmissions.js'
import { buildCommunityPromptRecord, resolvePromptProfileLink } from '../../src/utils/promptSubmission.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'

/**
 * Fire the connectivity event and read back what the library's status pill
 * actually says.
 *
 * Returns the pill's text, or an explicit marker when the pill is absent — so a
 * failure distinguishes "said the wrong thing" from "was not rendered at all".
 * The rAF yield lets React commit the state change the event triggered before
 * the text is read.
 */
async function readNetPill(page, type = 'offline') {
  return page.evaluate(async (eventType) => {
    window.dispatchEvent(new Event(eventType))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const pill = document.querySelector('.lib-net')
    return pill ? pill.textContent.trim() : '(no .lib-net in the DOM)'
  }, type)
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
    // Typography went live: the footer now links it for real, and straight to
    // the Font Gallery rather than the redirect-only /typography category home.
    await expect(footer.getByRole('link', { name: 'Typography', exact: true })).toBeVisible()
    await expect(footer.locator('a[href="/fontgallery"]')).toHaveCount(1)
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

    // The scenario is "already using the page, then the connection drops", so the
    // page must be settled first. On a cold CI runner the /emoji panel's lazy
    // chunk can still be in flight, and cutting the network mid-fetch tests
    // chunk loading rather than the offline banner.
    //
    // BOUNDED AND NON-FATAL, deliberately. This spec reaches the Iconify API,
    // and an unbounded `networkidle` waits on THAT too — so a slow third party
    // silently ate the test's whole budget and the offline poll below then
    // timed out with a misleading message about the banner. It failed CI twice
    // in one session at ~23s against a 2s local run, each time looking like a
    // regression in code that had not been touched.
    //
    // Five seconds is enough for the local chunk; a hanging Iconify request now
    // costs five seconds instead of the run. The real precondition is the line
    // below — "Live library connected" only renders once the panel has mounted
    // and the catalogue probe has resolved — so the assertion, not the wait, is
    // what actually guarantees the page is ready.
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await expect(page.getByText(/Live library connected/)).toBeVisible({ timeout: 15000 })

    // Pin navigator.onLine BEFORE cutting the network — the order matters.
    //
    // Playwright's setOffline does not reliably flip navigator.onLine, and two
    // separate things read it: IconEmojiLibrary seeds its `online` state from
    // it on mount, and main.jsx's vite:preloadError handler consults it before
    // deciding whether to reload. Pinning it afterwards leaves a window in
    // which the app still believes it is online.
    //
    // That window is what made this spec fail CI four times. Going offline
    // makes an in-flight lazy chunk preload fail, vite:preloadError fires, and
    // the handler reloaded the page — destroying the execution context out from
    // under the very next page.evaluate. The first three failures reported only
    // "Received: false" and sent two investigations down the wrong path. The app
    // now refuses to reload while offline (a reload cannot fetch anything), and
    // this ordering makes sure that guard is in place before the network drops.
    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
    })
    await context.setOffline(true)
    // Poll on the STATUS PILL'S OWN TEXT rather than on a page-wide text match.
    //
    // `getByText(...).isVisible()` collapses three different failures into one
    // `false`: the pill says the wrong thing, the pill is hidden, or the pill is
    // not in the DOM at all. This spec failed CI three times reporting only
    // "Received: false", which distinguished none of them and sent two separate
    // investigations down the wrong path.
    //
    // Reading `.lib-net`'s textContent means a failure message now names what
    // the pill actually said — or says "(no .lib-net in the DOM)", which would
    // point at the component having unmounted rather than at the banner logic.
    //
    // The rAF wait matters too: the state update happens inside a native event
    // listener, so without yielding a frame the read can land before React has
    // committed.
    await expect.poll(() => readNetPill(page), {
      timeout: 15000,
      intervals: [100, 200, 300, 500],
      message: 'the library status pill never switched to its offline state',
    }).toMatch(/Offline · built-in assets remain available/)

    await context.setOffline(false)
    // Symmetric restore. Without it the override above survives, and any
    // remount from here on re-seeds the component as offline — which would make
    // the recovery assertion below unpassable for the wrong reason.
    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true })
    })
    await expect.poll(() => readNetPill(page, 'online'), {
      timeout: 15000,
      intervals: [100, 200, 300, 500],
      message: 'the library status pill never returned to its connected state',
    }).toMatch(/Live library connected/)
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
