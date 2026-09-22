// Focused release coverage for the public shell, asset-library command surface
// and Palette Builder recovery controls.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { appendCommunitySubmission, readCommunitySubmissions } from '../../src/utils/communitySubmissions.js'
import { buildCommunityPromptRecord, resolvePromptProfileLink } from '../../src/utils/promptSubmission.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'

/* THE FOUNDER'S REAL ADDRESS, AND IT HAS TO BE THE LITERAL.
 *
 * These fixtures exercise the legacy-record scrub: a community submission that
 * still carries his email must come back showing his PUBLIC HANDLE and never
 * the address. The lookup that does it is keyed by a SHA-256 DIGEST of the
 * address (src/utils/constants.js, OWNER_HANDLES) precisely so the plaintext
 * stopped shipping in the browser bundle — and a digest is one-way, so no
 * substitute address can be made to match. A reserved @uil4b.test address was
 * tried here and the scrub simply does not fire for it, which turns a real
 * test into a green one that proves nothing.
 *
 * So it stays, in ONE place rather than four, with the reason written down.
 * This is a known residue of the 2026-09-22 exposure review: the address is
 * already in this repository's git history and in the digest's pre-image, so
 * the marginal disclosure here is nil — but it IS still a plaintext copy in a
 * public repo, and the only real fixes are the founder changing the address or
 * re-keying OWNER_HANDLES on something else. Recorded in OWNER-ACTIONS.
 */
const FOUNDER_EMAIL = 'dylanjacob1100@gmail.com'

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
  /* DRIVEN FROM AN APP ROUTE, NOT FROM '/'.
   *
   * The front door is Spectrum now and it mounts `<PillNav variant="spectrum" />`
   * — the floating marketing pill, whose navigation is a full-screen menu with
   * no mega-menu and no `.pnav-*` markup at all. The app header this test is
   * about still renders on every Create/Discover/Learn route, so the test moves
   * to one instead of asserting the app header on a page that deliberately does
   * not have it. `96-spectrum-nav.spec.js` owns the front door's own nav. */
  test('mega-menu supports directional entry and retired UI Colour links redirect safely', async ({ page }) => {
    watch(page, 'keyboard-first designer')
    await go(page, '/discover')

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
    // '/create/color' until the colour landing was deleted; it is a category
    // home that bounces now, so the old bookmark goes straight to the tool.
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/palette')
  })

  // Same move, same reason: `.pnav-mobile` is the app header's control and the
  // front door no longer mounts it. SpectrumNav's own burger, its focus-in and
  // its Escape-returns-focus are covered by 96-spectrum-nav.spec.js.
  test('mobile menu restores focus and keeps every route inside the viewport', async ({ page }) => {
    watch(page, 'mobile first-time visitor')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/discover')

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

  /* ONE FOOTER LANDMARK, COUNTED AS A LANDMARK.
   *
   * This asserted `.app-footer` on every route until `/` became Spectrum, which
   * renders its own `<footer>` (`.sp-footer`) instead of AppFooter — deliberately,
   * because mounting both would give the front door TWO contentinfo landmarks
   * and two copyright lines. Counting the class would now fail on a correct page
   * and, worse, would pass on the actual defect it exists to catch: two footers
   * stacked, one of each kind.
   *
   * So it counts the `contentinfo` LANDMARK, which is the thing the rule is
   * actually about and what a screen reader's landmark list shows.
   *
   * NOT `footer` elements — that was the first attempt and it over-counted.
   * `/create/palette` renders a second `<footer class="plb-adjust">` for the
   * ADJUST ALL toolbar, but it sits inside `<main>` and carries an explicit
   * `role="group"`, so per HTML-AAM it is not a contentinfo landmark at all.
   * A `<footer>` only maps to contentinfo when it is NOT nested in article,
   * aside, main, nav or section — counting tags would have failed a page whose
   * markup is right.
   *
   * '/create/color' left the loop with the colour landing's deletion — it is a
   * redirect now, so it was asserting the footer of '/create/palette' twice. */
  test('every public surface has exactly one footer landmark and a persistent Plans route', async ({ page }) => {
    watch(page, 'visitor comparing the product before committing')
    for (const route of ['/', '/discover', '/learn', '/create/palette', '/create/icons', '/create/aspect-ratio']) {
      await go(page, route)
      await expect(page.getByRole('contentinfo'), `${route} should render exactly one footer landmark`).toHaveCount(1)
      await expect(page.getByRole('link', { name: 'Plans', exact: true }).last()).toBeVisible()
      if (['/create/palette', '/create/icons', '/create/aspect-ratio'].includes(route)) {
        await expect(page.locator('.app-footer')).toHaveClass(/app-footer--compact/)
      }
    }
  })

  /* The footer credits the founder, and does it on EVERY route.
   *
   * This is the shape of the bug it closes: the attribution was asked for in the
   * founder batch of 2026-08-20 (item A3) and was the only item of that batch
   * that never shipped, because it LOOKS like homepage work. It is not — the
   * footer renders on every page, so it belonged to none of the four parked
   * homepage PRs and fell between them. So the route loop is the point of this
   * test, not decoration: it fails the same way the omission did.
   *
   * The resting underline is a real requirement, not styling trivia. Every other
   * link in this footer is an internal NavLink; this is the only one that leaves
   * the app, and on touch there is no hover to reveal that. */
  test('the footer credits Dylan Coleman on every route and marks the link as leaving the app', async ({ page }) => {
    watch(page, 'visitor wondering who made this')
    for (const route of ['/', '/discover', '/create/palette']) {
      await go(page, route)
      // BOTH footers, because '/' is Spectrum and mounts `.sp-footer` while the
      // app routes mount `.app-footer`. The credit is the founder's own ask and
      // it is owed on every route, so the selector covers whichever one the
      // route renders rather than quietly skipping the front door.
      // The landmark, not the tag: /create/palette also has a `<footer>` inside
      // <main> for its ADJUST toolbar, which is not a contentinfo landmark.
      const footer = page.getByRole('contentinfo')
      const attrib = footer.locator('.app-footer-attrib, .sp-footer-attrib')
      await attrib.waitFor()

      await expect(footer, `${route} should credit the founder`).toContainText('Built in Brisbane by Dylan Coleman')
      await expect(footer, `${route} should have dropped the old tagline`)
        .not.toContainText('for people who ship interfaces')

      // The settled URL — CHANGELOG.md, founder decisions 2026-08-20, decision 3.
      await expect(attrib).toHaveAttribute('href', 'https://dylan-coleman.com/')
      await expect(attrib).toHaveAttribute('target', '_blank')
      const rel = await attrib.getAttribute('rel')
      expect(rel, `${route} external credit needs the app's new-tab guard`).toContain('noopener')
      expect(rel).toContain('noreferrer')

      // Discoverable WITHOUT hover — founder direction 2026-09-02. Asserted in
      // BOTH themes and by CONTRAST, not just by presence: the first version of
      // this rule pinned the underline to --bh, which is a real underline that
      // happens to sit at 1.7:1 on the dark footer. "Has an underline" would
      // have passed that. "Can be seen" does not.
      for (const theme of ['light', 'dark']) {
        const seen = await attrib.evaluate((el, mode) => {
          const root = document.documentElement
          const previous = root.getAttribute('data-theme')
          root.setAttribute('data-theme', mode)
          // TWO channel scales are in play and mixing them silently produces a
          // plausible wrong number: backgroundColor comes back as rgb() on
          // 0-255, but a color-mix() resolves to color(srgb r g b / a) on 0-1.
          // Reading the second as the first is what made a 3.3:1 underline
          // measure 1.09:1 while this test was being written.
          const toRgba = (c) => {
            const n = (c.match(/-?[\d.]+(?:e[-+]?\d+)?/gi) || []).map(Number)
            const scale = /^color\(/i.test(c) ? 255 : 1
            return [n[0] * scale, n[1] * scale, n[2] * scale, n.length > 3 ? n[3] : 1]
          }
          const lum = (rgb) => {
            const [r, g, b] = rgb.slice(0, 3).map((v) => {
              const s = v / 255
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            })
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
          }
          const style = getComputedStyle(el)
          const line = style.textDecorationLine
          // The underline is semi-transparent, so composite it over the footer
          // ground before measuring — the painted colour is what a user sees.
          const deco = toRgba(style.textDecorationColor)
          // `.app-footer` until '/' became Spectrum, where this returned null
          // and getComputedStyle threw. The ground is whichever footer the link
          // is actually painted on.
          const bg = toRgba(getComputedStyle(el.closest('footer')).backgroundColor)
          const over = [0, 1, 2].map((i) => deco[i] * deco[3] + bg[i] * (1 - deco[3]))
          const [a, b2] = [lum(over) + 0.05, lum(bg) + 0.05]
          if (previous === null) root.removeAttribute('data-theme')
          else root.setAttribute('data-theme', previous)
          return { line, ratio: Math.max(a, b2) / Math.min(a, b2) }
        }, theme)
        expect(seen.line, `${route} credit must be underlined at rest, not only on hover`).toContain('underline')
        // WCAG 1.4.11: this underline is the non-text signal that the link
        // leaves the app, so it is held to the 3:1 non-text contrast bar.
        expect(seen.ratio, `${route} underline must reach 3:1 in ${theme} (got ${seen.ratio.toFixed(2)}:1)`)
          .toBeGreaterThanOrEqual(3)
      }
    }
  })

  // The "Discover and Learn map blips keep a 24px target" test lived here.
  // The decorative world map it measured was deleted from /discover and
  // /learn when those landings were compressed to a value proposition and
  // their links (see the header comment in SurfaceLanding.jsx), and
  // src/components/WorldMap.jsx went with it. There is no blip left to size.

  test('compact footer stays contained and exposes Plans on a narrow tool route', async ({ page }) => {
    watch(page, 'mobile visitor checking plans after using a tool')
    await page.setViewportSize({ width: 320, height: 720 })
    await go(page, '/create/aspect-ratio')

    const footer = page.locator('.app-footer--compact')
    await footer.scrollIntoViewIfNeeded()
    const contained = await footer.locator('.app-footer-inner').evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    )
    expect(contained, 'Compact footer content should not overflow its mobile column').toBe(true)
    await expect(footer.getByRole('link', { name: 'Plans', exact: true })).toBeVisible()
    // Typography went live: the footer now links it for real, and straight to
    // the Font Gallery rather than the redirect-only /create/typography category home.
    await expect(footer.getByRole('link', { name: 'Typography', exact: true })).toBeVisible()
    await expect(footer.locator('a[href="/create/font-gallery"]')).toHaveCount(1)
    await expect(footer.locator('a[href="/create/typography"]')).toHaveCount(0)
  })

  test('Icon and Emoji modes switch from the keyboard and explain offline resilience', async ({ page, context }) => {
    watch(page, 'developer sourcing production assets')
    await go(page, '/create/icons')

    const iconsTab = page.getByRole('tab', { name: /Icons/ })
    await iconsTab.focus()
    await iconsTab.press('ArrowRight')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/emoji')
    await expect(page.getByRole('tab', { name: /Emoji/ })).toBeFocused()

    // AND BACK, which is new here and is not padding: the status pill's ONLINE
    // reading belongs to the icon catalogue, and only to it.
    //
    // This test used to run the whole offline sequence from /create/emoji,
    // asserting "Live library connected" there first as a readiness signal and
    // again as the recovery signal. That sentence was never true on this tab —
    // the 1,655 emoji are a module compiled into the bundle, and the panel asks
    // the network for nothing — which is why it also rendered instantly rather
    // than after the catalogue probe the old comment credited. The pill now
    // says nothing on the emoji tab while online (see IconEmojiLibrary.jsx), so
    // the readings move to the tab that has a catalogue to report on, and the
    // return trip gets the ArrowLeft coverage the test never had.
    //
    // The OFFLINE half is unchanged and still shared: the line is true of both
    // libraries, because both are built in.
    const emojiTab = page.getByRole('tab', { name: /Emoji/ })
    await emojiTab.press('ArrowLeft')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/icons')
    await expect(page.getByRole('tab', { name: /Icons/ })).toBeFocused()

    // The scenario is "already using the page, then the connection drops", so the
    // page must be settled first. On a cold CI runner a panel's lazy chunk can
    // still be in flight, and cutting the network mid-fetch tests chunk loading
    // rather than the offline banner.
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
    await go(page, '/create/palette')

    const seed = page.getByRole('textbox', { name: 'Seed colour hex' })
    await seed.fill('#FF0000')
    await expect(seed).toHaveValue('#FF0000')
    await page.getByRole('button', { name: 'Lock Primary' }).click()
    await expect(page.getByRole('button', { name: 'Unlock Primary' })).toBeVisible()

    await page.getByRole('button', { name: 'Reset' }).click()
    // Founder request 2026-09-03: Reset restores the default SETTINGS but draws
    // a NEW random colour, so the post-reset seed is captured rather than pinned
    // to the old fixed #4338E0. What this test is actually about — the two-step
    // Undo chain — is unchanged, and the lock still has to be cleared.
    await expect(seed).not.toHaveValue('#FF0000')
    const afterReset = await seed.inputValue()
    await expect(page.getByRole('button', { name: 'Lock Primary' })).toBeVisible()

    const undo = page.getByRole('button', { name: 'Undo' })
    await expect(undo).toBeEnabled()
    await seed.fill('#00FF00')
    await expect(seed).toHaveValue('#00FF00')
    await undo.click()
    await expect(seed).toHaveValue(afterReset)
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
        authorEmail: FOUNDER_EMAIL,
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
        authorEmail: FOUNDER_EMAIL,
        category: 'Branding',
        url: 'data:text/html,unsafe',
        c1: '#111111',
        c2: '#222222',
        saves: 0,
      }]))
    })
    await go(page, '/discover')

    // The h1 is the surface's name. "Find systems worth stealing." was here
    // until 2026-09-09 — a line the founder had already thrown out on the
    // homepage ('"Systems worth stealing." is bad copy', 56-founder-rejected-
    // headlines.spec.js) with "Find" in front of it. 70-anti-slop-marketing
    // and the 62 tagline walk keep it off every route.
    await expect(page.getByRole('heading', { level: 1, name: 'Discover' })).toBeVisible()
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
        authorEmail: FOUNDER_EMAIL,
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
      url: 'https://uil4b.com/create/palette?c=fff,000',
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
      user: { uid: 'founder-uid', email: FOUNDER_EMAIL },
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
