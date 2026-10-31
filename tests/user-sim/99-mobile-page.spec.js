// /mobile — the Spectrum design's "On mobile" screen, and the nav that reaches it.
//
// The design file (`UIL4B - Spectrum.dc.html`) has a separate
// "mobile" screen reached from the nav's third quiet link; this is that screen
// at /mobile. What this file holds, each seen red against the defect it names
// (the mutation is on the test):
//
//   · the page renders as a PAGE — one h1, one main, the three phone figures
//     with the design's captions, the marketing footer — rather than the
//     Suspense fallback or the 404 shell;
//   · a visitor on the sales page reaches it through the nav, and the nav then
//     says where they are (aria-current + the design's ink colour), and the
//     way back to a section of the sales page lands on that section;
//   · no horizontal overflow from 320 to 1920 in both themes — the phone strip
//     bleeds to the viewport edge on purpose, which is exactly how a page grows
//     a sideways scroll;
//   · at 860 and under the phones are a scroll-snap strip that settles on a
//     phone, and above it they are three phones in a row;
//   · under reduced motion nothing moves: no word entrance, no menu stagger,
//     and the menu leaves at once instead of after the design's 260ms exit.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'a visitor checking whether the toolkit works on their phone'

async function ctxAt(browser, width, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    ...(width < 700 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    ...opts,
  })
  if (opts.theme) {
    await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, opts.theme)
  }
  return { ctx, page: await ctx.newPage() }
}

test.describe('/mobile renders as the design\'s screen', () => {
  test('one h1, one main, three captioned phones, the marketing chrome', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/mobile')
    // Mutation: route /mobile to nothing in App.jsx → the 404 page's h1 fails this.
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveAccessibleName('The same tools on a phone.')
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('.spm-lede')).toContainText('Every tool runs the same on a phone.')
    await expect(page.locator('.spm-fig figcaption')).toHaveText([
      'Palette Builder, full controls',
      'Icon Library, recolour and export',
      'Projects and your plan',
    ])
    // "Project" is the word everywhere, and the weight tabs and RECENT EXPORTS list stay as drawn.
    await expect(page.locator('.spm-pj-planuse')).toHaveText(/^\d+ of \d+ projects$/)
    await expect(page.locator('.spm-ic-weight')).toHaveText(['Regular', 'Bold', 'Fill', 'Duo'])
    await expect(page.locator('.spm-pj-eyebrow')).toHaveText('RECENT EXPORTS')
    // The phones are illustrations: hidden from assistive tech, captioned for it.
    const hidden = await page.locator('.spm-phone').evaluateAll((els) => els.map((e) => e.getAttribute('aria-hidden')))
    expect(hidden).toEqual(['true', 'true', 'true'])
    // The marketing nav and footer, not the app shell's.
    await expect(page.locator('.spnav')).toHaveCount(1)
    await expect(page.locator('.pnav')).toHaveCount(0)
    await expect(page.locator('footer.sp-footer')).toHaveCount(1)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)
    await expect(page).toHaveTitle('UI L4B | On mobile')
  })

  test('the heading outline goes h1 → footer h2s, and nothing skips a level', async ({ page }) => {
    await go(page, '/mobile')
    const levels = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((h) => h.getClientRects().length)
      .map((h) => Number(h.tagName[1])))
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `heading ${i} jumps from h${levels[i - 1]} to h${levels[i]}`).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('the nav reaches /mobile and says where you are', () => {
  test('On mobile, from the sales page pill, at 1440', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.spnav-quiet-link', { hasText: 'On mobile' }).click()
    await expect(page).toHaveURL(/\/mobile$/)
    await expect(page.locator('h1')).toHaveAccessibleName('The same tools on a phone.')
    // Mutation: drop aria-current from QuietLink → both of these fail.
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('On mobile')
    await expect(page.locator('.spnav-quiet-link', { hasText: 'Tools' })).not.toHaveAttribute('aria-current', 'page')
    // The design's active colour is --ink, the rest --ink-faint.
    const [on, off] = await page.evaluate(() => {
      const q = [...document.querySelectorAll('.spnav-quiet-link')]
      const c = (label) => getComputedStyle(q.find((a) => a.textContent.trim() === label)).color
      return [c('On mobile'), c('Pricing')]
    })
    expect(on, 'the current screen is painted like the others').not.toBe(off)
  })

  test('On mobile, from the full-screen menu, at 390', async ({ browser }) => {
    const { ctx, page } = await ctxAt(browser, 390)
    watch(page, PERSONA)
    await go(page, '/')
    // Below 760 the quiet links are the menu's first three items.
    await expect(page.locator('.spnav-quiet')).toBeHidden()
    await page.locator('.spnav-burger').click()
    const menu = page.locator('.spnav-menu')
    await expect(menu).toHaveAttribute('data-menu', 'in')
    await expect(menu.locator('.spnav-rail .spnav-mi')).toHaveText(['Tools', 'Pricing', 'On mobile', 'Open the toolkit ↗'])
    await expect(menu.locator('.spnav-mi-note')).toHaveText('EVERY CORE TOOL IS FREE, FOREVER')
    await menu.locator('.spnav-mi', { hasText: 'On mobile' }).click()
    await expect(page).toHaveURL(/\/mobile$/)
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'the menu\'s scroll lock outlived it').not.toBe('hidden')
    await ctx.close()
  })

  test('Tools from /mobile opens the /tools page', async ({ page }) => {
    await go(page, '/mobile')
    await page.locator('.spnav-quiet-link', { hasText: 'Tools' }).click()
    // Mutation: point QUIET[0] back at '#bench' in SpectrumNav.jsx → the URL is /home#bench.
    await expect(page).toHaveURL(/\/tools$/)
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('Tools')
  })

  test('Pricing is the design\'s separate Pricing screen, /plans', async ({ page }) => {
    await go(page, '/mobile')
    await expect(page.locator('.spnav-quiet-link', { hasText: 'Pricing' })).toHaveAttribute('href', '/plans')
    // "Open the toolkit" enters the app with no gate, in the pill,
    // the hero and the footer alike.
    const hrefs = await page.locator('.spnav-cta, .spm-cta, .sp-footer-cta').evaluateAll((els) => els.map((a) => a.getAttribute('href')))
    expect(hrefs).toEqual(['/projects', '/projects', '/projects'])
  })

  test('the menu leaves with the design\'s exit, then unmounts', async ({ page }) => {
    await go(page, '/mobile')
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toHaveAttribute('data-menu', 'in')
    await page.keyboard.press('Escape')
    // Mutation: unmount on close (the old `open &&`) → 'out' is never seen.
    await expect(page.locator('.spnav-menu')).toHaveAttribute('data-menu', 'out')
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    await expect(page.locator('.spnav-burger')).toBeFocused()
  })
})

test.describe('the back gesture and the menu', () => {
  test('back closes the open menu and stays on the page', async ({ page }) => {
    await go(page, '/')
    await go(page, '/mobile')
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toHaveAttribute('data-menu', 'in')
    // Mutation: drop useCloseOnBack → back leaves /mobile with the menu open.
    await page.goBack()
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    await expect(page).toHaveURL(/\/mobile$/)
  })

  test('closing the menu another way leaves no dead step for back to press', async ({ page }) => {
    await go(page, '/')
    await go(page, '/mobile')
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toHaveAttribute('data-menu', 'in')
    await page.keyboard.press('Escape')
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    // Mutation: skip history.back() in the hook's cleanup → the first back
    // press pops the menu's orphaned entry and the visitor stays on /mobile.
    await page.goBack()
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/)
  })

  test('Tools in the menu closes it and opens the /tools page', async ({ page }) => {
    await go(page, '/')
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toHaveAttribute('data-menu', 'in')
    await page.locator('.spnav-menu .spnav-mi', { hasText: 'Tools' }).click()
    // Mutation: point QUIET[0] back at '#bench' in SpectrumNav.jsx → the URL is /#bench and the page stays the sales page.
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    await expect(page).toHaveURL(/\/tools$/)
  })
})

test.describe('the marketing footer is the design\'s', () => {
  test('the design\'s columns and copyright line, no Cookies, and the PROJECT anchors are real', async ({ page }) => {
    await go(page, '/mobile')
    const footer = page.locator('footer.sp-footer')
    // TOOLS / PROJECT / LEGAL are the design's (1606-1629); EXPLORE carries the
    // destinations AppFooter reaches that the design's three do not.
    await expect(footer.locator('.sp-footer-col-h')).toHaveText(['Tools', 'Project', 'Explore', 'Legal'])
    await expect(footer.locator('.sp-footer-col').first().locator('a')).toHaveText(['All tools', 'Colour', 'Type', 'Assets', 'Imagery'])
    await expect(footer.getByRole('link', { name: 'Cookies' }), 'there is no cookies page to link').toHaveCount(0)
    await expect(footer.locator('.sp-footer-copy')).toHaveText(/^© \d{4} UI L4B\. Spectrum\.$/)
    // The founder note and credit link sit beside it.
    await expect(footer.locator('.app-footer-note')).toHaveCount(1)
    await expect(footer.locator('.sp-footer-attrib')).toHaveAttribute('href', 'https://dylan-coleman.com/')
    // Off the sales page the PROJECT links carry the page with them…
    const project = await footer.locator('.sp-footer-col').nth(1).locator('a')
      .evaluateAll((els) => els.map((a) => a.getAttribute('href')))
    expect(project).toEqual(['/home#bench', '/home#specimens', '/home#index'])
    // …and on it, they are sections that exist. #index is the design's tool
    // index (line 1030); it is not asserted here.
    await go(page, '/')
    for (const id of ['bench', 'specimens']) {
      await expect(page.locator(`#${id}`), `#${id} is not on the sales page`).toHaveCount(1)
    }
    if (!(await page.locator('#index').count())) {
      test.info().annotations.push({ type: 'finding', description: 'the footer\'s Index link points at #index, which / does not render yet' })
    }
  })
})

test.describe('/mobile at every width', () => {
  for (const theme of ['light', 'dark']) {
    for (const w of [320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440, 1920]) {
      test(`no horizontal overflow at ${w}px (${theme})`, async ({ browser }) => {
        const { ctx, page } = await ctxAt(browser, w, { theme })
        await go(page, '/mobile')
        // POSITIVE CONTROL: the strip that bleeds to the edge is on the page.
        await expect(page.locator('.spm-row .spm-phone')).toHaveCount(3)
        expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme)
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        // Mutation: drop the strip's negative-margin/padding pair balance
        // (margin-right only) → the page scrolls sideways at every phone width.
        expect(over, `${w}px ${theme}: the page scrolls sideways by ${over}px`).toBeLessThanOrEqual(0)
        const pill = await page.locator('.spnav-bar').boundingBox()
        expect(pill.height, `${w}px: the pill wrapped`).toBeLessThan(80)
        await ctx.close()
      })
    }
  }
})

test.describe('the phone row', () => {
  test('at 390 it is a scroll-snap strip that settles on a phone', async ({ browser }) => {
    const { ctx, page } = await ctxAt(browser, 390, { reducedMotion: 'reduce' })
    await go(page, '/mobile')
    const row = page.locator('.spm-row')
    const shape = await row.evaluate((el) => ({
      snap: getComputedStyle(el).scrollSnapType,
      scrolls: el.scrollWidth > el.clientWidth,
      focusable: el.tabIndex === 0,
    }))
    // Mutation: remove `scroll-snap-type:x mandatory` → snap is 'none'.
    expect(shape.snap).toBe('x mandatory')
    expect(shape.scrolls, 'the strip has nothing to scroll to').toBe(true)
    expect(shape.focusable, 'a keyboard cannot reach the strip').toBe(true)
    // Nudge it a little way and let it settle: mandatory snapping has to bring
    // a phone's centre to the strip's centre, not leave it where it was left.
    await row.evaluate((el) => el.scrollBy({ left: 70, behavior: 'instant' }))
    await expect.poll(async () => row.evaluate((el) => {
      const mid = el.getBoundingClientRect().left + el.clientWidth / 2
      return Math.min(...[...el.querySelectorAll('.spm-fig')].map((f) => {
        const r = f.getBoundingClientRect()
        return Math.abs(r.left + r.width / 2 - mid)
      }))
    }), { message: 'the strip did not settle on a phone' }).toBeLessThan(3)
    await ctx.close()
  })

  test('at 1440 the three phones stand in one row', async ({ page }) => {
    await go(page, '/mobile')
    const tops = await page.locator('.spm-phone').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(new Set(tops).size, 'the phones are not in one row').toBe(1)
    expect(await page.locator('.spm-row').evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe('none')
  })
})

test.describe('reduced motion', () => {
  test('nothing moves: no word entrance, no menu stagger, no exit wait', async ({ browser }) => {
    const { ctx, page } = await ctxAt(browser, 1440, { reducedMotion: 'reduce' })
    await page.clock.install()
    await go(page, '/mobile')
    // Mutation: drop prefersReducedMotion() from heroLit → .is-in lands.
    await expect(page.locator('.spm-hero')).not.toHaveClass(/is-in/)
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toHaveAttribute('data-menu', 'in')
    const running = await page.evaluate(() => (document.getAnimations?.() || [])
      .filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.spnav-menu')).length)
    expect(running, 'the menu still animates under reduced motion').toBe(0)
    // "Leaves at once" is proved on a frozen clock, not a wall-clock budget: a
    // 150ms real-time wait failed on a loaded CI runner while the menu was still
    // on its way out. With time stopped, only 50 virtual ms pass, well short of
    // the design's 260ms exit, so the menu can only be gone if the exit wait was
    // skipped. Mutation: use MENU_EXIT_MS under reduced motion in SpectrumNav
    // and the menu stays, so this times out.
    await page.clock.pauseAt(new Date(Date.now() + 60_000))
    await page.keyboard.press('Escape')
    await page.clock.runFor(50)
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    await ctx.close()
  })
})
