// /mobile, the "On mobile" page, and the nav that reaches it.
//
// What this file holds, each seen red against the defect it names (the
// mutation is on the test):
//
//   · the page renders as a PAGE (one h1, one main, three captioned phone
//     screens whose pictures load, the closing call and the home-style footer)
//     rather than the Suspense fallback or the 404 shell;
//   · a visitor on the sales page reaches it through the nav, and the nav then
//     says where they are (aria-current + the ink colour);
//   · no horizontal overflow from 320 to 1920 in both themes: the phone strip
//     bleeds to the viewport edge on purpose, which is how a page grows a
//     sideways scroll;
//   · at 767 and under the phones are a scroll-snap strip with Previous and
//     Next buttons that follow it, and above it they are three phones in a row;
//   · under reduced motion the menu does not animate and leaves at once.
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

test.describe('/mobile renders as its own page', () => {
  test('one h1, one main, three captioned phone screens, the marketing chrome', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/mobile')
    // Mutation: route /mobile to nothing in App.jsx → the 404 page's h1 fails this.
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveAccessibleName('The same tools on a phone.')
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('.mk-lead')).toContainText('Every tool runs the same on a phone.')
    await expect(page.locator('.mk-fig figcaption')).toHaveText([
      /^Palette Builder, full controls/,
      /^Icon Library, recolour and export/,
      /^Projects and your plan/,
    ])
    // The marketing nav and footer, not the app shell's.
    await expect(page.locator('.spnav')).toHaveCount(1)
    await expect(page.locator('.pnav')).toHaveCount(0)
    await expect(page.locator('footer.sp-footer')).toHaveCount(1)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)
    await expect(page).toHaveTitle('UI L4B | On mobile')
  })

  test('each phone has a picture that loads', async ({ page }) => {
    await go(page, '/mobile')
    const figs = page.locator('.mk-fig')
    await expect(figs).toHaveCount(3)
    for (let i = 0; i < 3; i += 1) {
      await figs.nth(i).scrollIntoViewIfNeeded()
      const first = figs.nth(i).locator('img:visible').first()
      // Mutation: point a capture at a path that is not in public/mobile-screens → naturalWidth stays 0.
      await expect.poll(() => first.evaluate((img) => img.complete && img.naturalWidth), { message: `phone ${i + 1}'s picture did not load` }).toBeGreaterThan(0)
    }
  })

  const ALTS = [
    'The Palette Builder on a phone, with colour rows and adjust sliders',
    'The Icon Library on a phone, with search and the recolour row',
    'The workspace on a phone, with a project card showing its palette, type scale and font pair',
  ]
  const shownImages = (page, i) => page.locator('.mk-fig').nth(i).locator('img').evaluateAll((imgs) => imgs
    .filter((img) => getComputedStyle(img).display !== 'none')
    .map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') })))

  for (const theme of ['light', 'dark']) {
    test(`${theme} theme: each phone draws its ${theme} capture once`, async ({ browser }) => {
      const { ctx, page } = await ctxAt(browser, 1440, { theme })
      await go(page, '/mobile')
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme)
      for (let i = 0; i < 3; i += 1) {
        const shown = await shownImages(page, i)
        const want = `/mobile-screens/${['palette', 'icons', 'projects'][i]}-${theme}.jpg`
        expect(shown.map((s) => s.src), `phone ${i + 1} should draw one ${theme} picture`).toEqual([want])
      }
      await ctx.close()
    })

    test(`${theme} theme: the picture each phone draws has its screen reader description`, async ({ browser }) => {
      const { ctx, page } = await ctxAt(browser, 1440, { theme })
      await go(page, '/mobile')
      for (let i = 0; i < 3; i += 1) {
        const shown = await shownImages(page, i)
        expect(shown[0].alt, `phone ${i + 1}'s drawn picture needs its description`).toBe(ALTS[i])
      }
      await ctx.close()
    })

    test(`${theme} theme: the capture on show loads eagerly and the other waits`, async ({ browser }) => {
      const { ctx, page } = await ctxAt(browser, 1440, { theme })
      await go(page, '/mobile')
      for (let i = 0; i < 3; i += 1) {
        const loading = await page.locator('.mk-fig').nth(i).locator('img').evaluateAll((imgs) => imgs.map((img) => ({
          shown: getComputedStyle(img).display !== 'none',
          loading: img.getAttribute('loading'),
        })))
        // Mutation: make both captures eager (or both lazy) in SpectrumMobile.jsx → this fails.
        expect(loading.filter((l) => l.shown).map((l) => l.loading), `phone ${i + 1}'s capture on show`).toEqual(['eager'])
        expect(loading.filter((l) => !l.shown).map((l) => l.loading), `phone ${i + 1}'s hidden capture`).toEqual(['lazy'])
      }
      await ctx.close()
    })
  }

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
    // The active colour is --ink, the rest --ink-faint.
    const [on, off] = await page.evaluate(() => {
      const q = [...document.querySelectorAll('.spnav-quiet-link')]
      const c = (label) => getComputedStyle(q.find((a) => a.textContent.trim() === label)).color
      return [c('On mobile'), c('Plans')]
    })
    expect(on, 'the current screen is painted like the others').not.toBe(off)
  })

  test('On mobile, from the full-screen menu, at 390', async ({ browser }) => {
    const { ctx, page } = await ctxAt(browser, 390)
    watch(page, PERSONA)
    await go(page, '/')
    // Up to 767px the quiet links are the menu's first three items.
    await expect(page.locator('.spnav-quiet')).toBeHidden()
    await page.locator('.spnav-burger').click()
    const menu = page.locator('.spnav-menu')
    await expect(menu).toHaveAttribute('data-menu', 'in')
    await expect(menu.locator('.spnav-rail > a.spnav-mi')).toHaveText(['Tools', 'Plans', 'On mobile'])
    await expect(menu.getByText('Open the toolkit'), 'the menu carries a call to action again').toHaveCount(0)
    await menu.locator('.spnav-mi', { hasText: 'On mobile' }).click()
    await expect(page).toHaveURL(/\/mobile$/)
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'the menu\'s scroll lock outlived it').not.toBe('hidden')
    await ctx.close()
  })

  test('Tools from /mobile opens the /tools page', async ({ page }) => {
    await go(page, '/mobile')
    await page.locator('.spnav-quiet-link', { hasText: 'Tools' }).click()
    // Mutation: point Tools at '#try' on every page → the URL stays /mobile.
    await expect(page).toHaveURL(/\/tools$/)
    await expect(page.locator('.spnav-quiet-link[aria-current="page"]')).toHaveText('Tools')
  })

  test('Plans is its own screen, /plans, and the page and closing calls to action enter the app', async ({ page }) => {
    await go(page, '/mobile')
    await expect(page.locator('.spnav-quiet-link', { hasText: 'Plans' })).toHaveAttribute('href', '/plans')
    // "Open the toolkit" enters the app with no gate, in the intro and the closing call; the bar has none.
    await expect(page.locator('.spnav-cta')).toHaveCount(0)
    const hrefs = await page.locator('.mk-intro a.mk-pill, .hm-close-cta').evaluateAll((els) => els.map((a) => a.getAttribute('href')))
    // Mutation: change toolkitTo in SpectrumMobile.jsx → one of these is not /projects.
    expect(hrefs).toEqual(['/projects', '/projects'])
  })

  test('the menu leaves with the design\'s exit, then unmounts', async ({ page }) => {
    await go(page, '/mobile')
    await page.setViewportSize({ width: 390, height: 844 })
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
    await page.setViewportSize({ width: 390, height: 844 })
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
    await page.setViewportSize({ width: 390, height: 844 })
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
    await go(page, '/mobile')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toHaveAttribute('data-menu', 'in')
    await page.locator('.spnav-menu .spnav-mi', { hasText: 'Tools' }).click()
    // Mutation: point Tools at '#try' on every page → the URL stays /mobile.
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    await expect(page).toHaveURL(/\/tools$/)
  })
})

test.describe('the footers', () => {
  test('/mobile keeps the home-style footer: Tools, Explore and Legal, no Project column, no Cookies', async ({ page }) => {
    await go(page, '/mobile')
    const footer = page.locator('footer.sp-footer')
    // Mutation: drop `home` or add `pageColumn` in SpectrumMobile.jsx → the headings change.
    await expect(footer.locator('.sp-footer-col-h')).toHaveText(['Tools', 'Explore', 'Legal'])
    await expect(footer.locator('.sp-footer-col').first().locator('a')).toHaveText(['All tools', 'Colour', 'Type', 'Assets', 'Imagery'])
    await expect(footer.getByRole('link', { name: 'Cookies' }), 'there is no cookies page to link').toHaveCount(0)
    await expect(footer.locator('.sp-footer-copy')).toHaveText(/^© \d{4} UI L4B\.$/)
    await expect(footer.locator('.app-footer-note')).toHaveCount(1)
    await expect(footer.locator('.sp-footer-attrib')).toHaveAttribute('href', 'https://dylan-coleman.com/')
  })

  test('a page on the plain footer (/sitemap) keeps the Project column, and its anchors are real sales-page sections', async ({ page }) => {
    await go(page, '/sitemap')
    const footer = page.locator('footer.sp-footer')
    await expect(footer.locator('.sp-footer-col-h')).toHaveText(['Tools', 'Project', 'Explore', 'Legal'])
    await expect(footer.locator('.sp-footer-copy')).toHaveText(/^© \d{4} UI L4B\. Spectrum\.$/)
    // Off the sales page the PROJECT links carry the page with them…
    const project = await footer.locator('.sp-footer-col').nth(1).locator('a')
      .evaluateAll((els) => els.map((a) => a.getAttribute('href')))
    expect(project).toEqual(['/home#bookmarks', '/home#try', '/home#exports', '/home#examples', '/home#plans'])
    // …and on it, they are sections that exist.
    await go(page, '/')
    for (const id of ['bookmarks', 'try', 'exports', 'examples', 'plans']) {
      await expect(page.locator(`#${id}`), `#${id} is not on the sales page`).toHaveCount(1)
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
        await expect(page.locator('.mk-phones .mk-fig')).toHaveCount(3)
        expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme)
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        // Mutation: drop the strip's negative-margin/padding pair balance
        // (margin-right only) → the page scrolls sideways at every phone width.
        expect(over, `${w}px ${theme}: the page scrolls sideways by ${over}px`).toBeLessThanOrEqual(0)
        const bar = await page.locator('.spnav-bar').boundingBox()
        // One row: the 92px band from 768px, the 56px phone band below.
        expect(bar.height, `${w}px: the bar wrapped or changed band`).toBe(w >= 768 ? 92 : 56)
        await ctx.close()
      })
    }
  }
})

test.describe('the phone row', () => {
  test('at 390 it is a scroll-snap strip that settles on a phone', async ({ browser }) => {
    const { ctx, page } = await ctxAt(browser, 390, { reducedMotion: 'reduce' })
    await go(page, '/mobile')
    const row = page.locator('.mk-phones')
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
    // a phone's left edge to the strip's padded start, not leave it where it was left.
    await row.evaluate((el) => el.scrollBy({ left: 70, behavior: 'instant' }))
    await expect.poll(async () => row.evaluate((el) => {
      const start = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).scrollPaddingLeft)
      return Math.min(...[...el.querySelectorAll('.mk-fig')].map((f) => Math.abs(f.getBoundingClientRect().left - start)))
    }), { message: 'the strip did not settle on a phone' }).toBeLessThan(3)
    await ctx.close()
  })

  test('at 390 Next and Previous move the strip one phone and the "N of 3" line follows', async ({ browser }) => {
    const { ctx, page } = await ctxAt(browser, 390, { reducedMotion: 'reduce' })
    await go(page, '/mobile')
    const pos = page.locator('.mk-pos')
    const next = page.getByRole('button', { name: 'Next screen' })
    const prev = page.getByRole('button', { name: 'Previous screen' })
    await expect(pos).toHaveText('1 of 3')
    await expect(prev).toHaveAttribute('aria-disabled', 'true')
    await expect(next).not.toHaveAttribute('aria-disabled', 'true')
    // Mutation: make step() return 0 in SpectrumMobile.jsx → the line stays on "1 of 3".
    await next.click()
    await expect(pos).toHaveText('2 of 3')
    await next.click()
    await expect(pos).toHaveText('3 of 3')
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await prev.click()
    await expect(pos).toHaveText('2 of 3')
    await ctx.close()
  })

  test('at 1440 the three phones stand in one row, with no strip controls', async ({ page }) => {
    await go(page, '/mobile')
    const tops = await page.locator('.mk-frame').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(tops).toHaveLength(3)
    expect(new Set(tops).size, 'the phones are not in one row').toBe(1)
    expect(await page.locator('.mk-phones').evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe('none')
    await expect(page.locator('.mk-bar')).toBeHidden()
  })
})

test.describe('reduced motion', () => {
  test('the menu does not animate and leaves at once', async ({ browser }) => {
    const { ctx, page } = await ctxAt(browser, 390, { reducedMotion: 'reduce' })
    await page.clock.install()
    await go(page, '/mobile')
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
