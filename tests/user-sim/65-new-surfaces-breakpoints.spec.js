// The 2026-09-08 breakpoint pass over the six surfaces that changed or were
// born on 2026-09-07 and had not been rendered at every width since:
// the Brand Starter, the sync notice, the Palette Library's mood filters and
// closing CTA, the homepage export section, /settings and /projects.
//
// Rendered at 320, 390, 430, 768, 1024, 1097, 1120, 1136, 1280, 1440 and
// 1920, light and dark, reduced-motion on and off, by a Playwright sweep that
// measured boxes rather than reading stylesheets — the same reason
// 23-responsive-mid-band and 25-defect-sweep give. Every test below pins a
// fault that sweep found, at the width and in the state it was found, and
// each one was watched fail with the fix reverted (the mutation is named on
// the test).
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { FREE_TOTAL_GENERATIONS } from '../../src/config/aiGeneration.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** A phone context at an exact width, with real touch metrics (see 25-defect-sweep). */
async function phone(browser, width, height = 844) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA,
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

async function settle(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 2; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/** A saved project, shaped the way ProjectContext.saveProject writes them. */
function projectRecord(id, name, updatedAt, extra = {}) {
  return {
    id, name,
    design: { palette: { colors: ['#101010', '#F0F0F0'] }, ...extra },
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt,
  }
}

/** Thirty logo-carrying projects: the account that produces the longest sync sentence. */
function heavyProjects() {
  const logo = `data:image/png;base64,${'A'.repeat(32 * 1024)}`
  return Array.from({ length: 30 }, (_, i) => projectRecord(`big-${i}`, `Brand ${i}`, '2026-09-01T09:00:00.000Z', { brandLogo: logo }))
}

// ─────────────────────────────────────────────────────────────────────────────
// The sync notice
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the sync notice reaches the person it was written for', () => {
  // SyncNotice.jsx's own header says it is mounted on every route because "the
  // person whose sync has stopped is, by definition, busy editing — and the
  // surface they are editing on is a tool page". It was mounted inside the app
  // shell, and every Create tool takes the CHROMELESS_PATHS early return above
  // the shell. Measured 2026-09-08: present on /projects and /discover/palettes,
  // ABSENT from the DOM on /create/palette, /create/type-scale,
  // /create/font-pair, /create/contrast, /create/tint and /create/auto-builder.
  //
  // MUTATION: move <SyncNotice /> back inside AppInner's shell — both routes
  // below time out with 0 notices while 62-project-sync-states stays green,
  // which is exactly why 62 could not have caught this.
  for (const route of ['/create/palette', '/create/type-scale']) {
    test(`a refused sync is shown on ${route}, not only on /projects`, async ({ page }) => {
      watch(page, 'a designer editing in a tool whose account has started refusing their projects')
      await signIn(page, { plan: 'free', projects: 2, deny: ['sync/projects'] })
      await go(page, route)
      const notice = page.locator('[data-testid="sync-notice"]')
      await expect(notice, `the notice never mounted on ${route}`).toBeVisible({ timeout: 15_000 })
      await expect(notice).toHaveAttribute('data-sync-level', 'error')
    })
  }

  test('while offline it yields to the offline banner, and comes back with the connection', async ({ page, context }) => {
    // Both are fixed, centred, under the nav — the same slot — and a lost
    // connection is precisely when a sync fails. Measured 2026-09-08 at 320,
    // 390 and 1280: this notice (z-index 130) sat on top of .offline-banner
    // (119) and hid it, saying "this device looks offline" over the banner
    // that already said so.
    //
    // MUTATION: drop `if (!online) return null` from SyncNotice.jsx — the
    // count assertion fails with 1 notice and the two boxes intersect.
    watch(page, 'a designer whose laptop just lost its connection mid-edit')
    await signIn(page, { plan: 'free', projects: 2, deny: ['sync/projects'] })
    await go(page, '/projects')
    const notice = page.locator('[data-testid="sync-notice"]')
    await expect(notice).toBeVisible({ timeout: 10_000 })

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('.offline-banner'), 'the offline banner must be the one on screen').toBeVisible()
    await expect(notice, 'the sync notice must not paint over the offline banner').toHaveCount(0)

    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.locator('.offline-banner')).toHaveCount(0)
    await expect(notice, 'the condition is still true, so the notice must return with the connection').toBeVisible()
    await expect(notice.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('on a phone the actions drop under the sentence instead of squeezing it', async ({ browser }) => {
    // `.sync-notice{flex-wrap:wrap}` under 520px never wrapped anything: the
    // message is `flex:1;min-width:0`, so it shrank to whatever the buttons
    // left over. Measured 2026-09-08 with the size-ceiling sentence: 11 lines
    // in a 230px column beside "Try again" at 320, 7 lines at 390.
    //
    // MUTATION: restore the old ≤520 block (no `flex-basis` on the message) —
    // 320 and 390 fail on `actionsBelow` and 320 fails on the line count.
    test.setTimeout(90_000)
    const failures = []
    for (const width of [320, 390, 430]) {
      const { ctx, page } = await phone(browser, width)
      watch(page, `a Pro designer with thirty brand-kit projects, on a ${width}px phone`)
      await signIn(page, { plan: 'pro', projects: heavyProjects() })
      await go(page, '/projects')
      const notice = page.locator('[data-testid="sync-notice"]')
      await expect(notice).toBeVisible({ timeout: 15_000 })
      await settle(page)
      const m = await page.evaluate(() => {
        const n = document.querySelector('[data-testid="sync-notice"]')
        const msg = n.querySelector('.sync-notice-msg').getBoundingClientRect()
        const actions = n.querySelector('.sync-notice-actions').getBoundingClientRect()
        const lh = parseFloat(getComputedStyle(n.querySelector('.sync-notice-msg')).lineHeight)
        const dismiss = n.querySelector('.sync-notice-dismiss').getBoundingClientRect()
        return {
          actionsBelow: actions.top >= msg.bottom - 1,
          lines: Math.round(msg.height / lh),
          msgWidth: Math.round(msg.width),
          dismiss: Math.min(dismiss.width, dismiss.height),
          right: Math.round(n.getBoundingClientRect().right),
        }
      })
      await ctx.close()
      if (!m.actionsBelow) failures.push(`${width}px: the actions sit beside a ${m.msgWidth}px message column (${m.lines} lines)`)
      // 320 was 11 lines; a full-width column reads the same sentence in six.
      if (m.lines > 7) failures.push(`${width}px: ${m.lines} lines of 13px text`)
      if (m.dismiss < 24) failures.push(`${width}px: dismiss is ${m.dismiss}px`)
      if (m.right > width) failures.push(`${width}px: the notice runs ${m.right - width}px past the viewport`)
    }
    expect(failures, `the sync notice on a phone:\n  ${failures.join('\n  ')}`).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The Brand Starter
// ─────────────────────────────────────────────────────────────────────────────

/** The metered endpoint, already spent. Same shape as 57-brand-starter's stub. */
async function stubSpentAi(page) {
  const calls = []
  await page.route('**/api/ai', async (route) => {
    calls.push(route.request().method())
    return route.fulfill({
      status: 429, contentType: 'application/json',
      body: JSON.stringify({
        error: 'You have used your one free Brand Starter generation. Pro raises this to a monthly allowance — everything you have already generated stays where it is.',
        generation: { used: FREE_TOTAL_GENERATIONS, limit: FREE_TOTAL_GENERATIONS, remaining: 0, period: 'lifetime' },
        plan: 'free',
      }),
    })
  })
  return calls
}

const BRIEF = 'A booking app for independent dog groomers. Calm and practical, readable all day.'

/** A healthy provider, for the result's own links. */
async function stubHealthyAi(page) {
  await page.route('**/api/ai', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      starter: {
        name: 'Quiet Schedule', rationale: 'A calm working palette.',
        palette: [
          { role: 'Background', hex: '#FFFFFF' }, { role: 'Surface', hex: '#F4F5F7' }, { role: 'Text', hex: '#14161A' },
          { role: 'Primary', hex: '#1F5F9E' }, { role: 'Accent', hex: '#C2643B' },
        ],
        fonts: { heading: { family: 'Manrope', weight: 700, category: 'sans-serif' }, body: { family: 'Lora', weight: 400, category: 'serif' } },
        typeScale: { base: 17, ratio: 1.25 },
      },
      provider: 'openrouter', plan: 'pro', beta: true,
      generation: { used: 1, limit: 20, remaining: 19, period: 'month' },
    }),
  }))
}

test('the Brand Starter result’s three “Open in …” links are 24px targets at 320 and 1440', async ({ browser }) => {
  // 23.1px at every width. Same exemption misfire as the wall: the band head's
  // text ("01 Palette Open in Palette Builder →") is longer than the link's.
  //
  // MUTATION: drop `min-height:24px` from .bs-band-open — six failures.
  test.setTimeout(60_000)
  const failures = []
  for (const width of [320, 1440]) {
    const ctx = await browser.newContext(width < 700
      ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
      : { viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    watch(page, `a Pro user handing a generated palette to the builder at ${width}px`)
    await signIn(page, { plan: 'pro' })
    await stubHealthyAi(page)
    await go(page, '/create/auto-builder')
    await page.locator('#bs-brief').fill(BRIEF)
    await page.getByTestId('brand-starter-generate').click()
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()
    await settle(page)
    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll('.bs-band-open')].map((a) => {
        const r = a.getBoundingClientRect()
        return { name: a.textContent.trim(), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }
      }))
    await ctx.close()
    expect(boxes.length, 'the three bands each carry a hand-off link').toBe(3)
    for (const b of boxes) if (b.h < 24 || b.w < 24) failures.push(`${width}px: "${b.name}" is ${b.w}x${b.h}`)
  }
  expect(failures, `hand-off links under 24px:\n  ${failures.join('\n  ')}`).toEqual([])
})

test.describe('the Brand Starter, out of allowance', () => {
  test('a refusal because the allowance is spent is said once, as the wall', async ({ page }) => {
    // The server's 429 carries the same count the wall is built from, so the
    // page rendered the sentence twice: the strip above the field AND a red
    // alert under it with a "Try again" that could never succeed. Rendered
    // 2026-09-08 at 320 through 1920, both themes.
    //
    // MUTATION: remove the `remaining === 0` early return in generate() —
    // the error count is 1 and the dead Try again is back.
    watch(page, 'a free user whose account was already spent in another tab')
    await signIn(page, { plan: 'free' })
    const calls = await stubSpentAi(page)
    await go(page, '/create/auto-builder')
    await page.locator('#bs-brief').fill(BRIEF)
    await page.getByTestId('brand-starter-generate').click()

    const wall = page.getByTestId('brand-starter-wall')
    await expect(wall).toBeVisible()
    await expect(wall).toContainText(/one free/i)
    expect(calls).toHaveLength(1)
    await expect(page.getByTestId('brand-starter-error'), 'the wall is the whole message').toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Try again' }), 'nothing here can be tried again').toHaveCount(0)
    await expect(page.getByTestId('brand-starter-generate')).toBeDisabled()
    // And the brief is still theirs to keep.
    await expect(page.locator('#bs-brief')).toHaveValue(BRIEF)
  })

  test('the wall’s link and Dismiss are 24px targets at 320 and 1440', async ({ browser }) => {
    // Measured 23.1px and 21.4px at every width — under the floor #413 applied
    // to the shell and 58-target-size-24 asserts on the sales surfaces.
    // 58's inline exemption would have excused both, because the actions
    // wrapper's text is longer than either link's; they are not in a sentence.
    //
    // MUTATION: drop `min-height:24px` from .bs-wall-link/.bs-wall-close —
    // both widths report both controls.
    test.setTimeout(60_000)
    const failures = []
    for (const width of [320, 1440]) {
      const ctx = await browser.newContext(width < 700
        ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
        : { viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `a free user reading the quota strip at ${width}px`)
      await signIn(page, { plan: 'free' })
      await stubSpentAi(page)
      await go(page, '/create/auto-builder')
      await page.locator('#bs-brief').fill(BRIEF)
      await page.getByTestId('brand-starter-generate').click()
      await expect(page.getByTestId('brand-starter-wall')).toBeVisible()
      await settle(page)
      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll('.bs-wall-link, .bs-wall-close')].map((el) => {
          const r = el.getBoundingClientRect()
          return { name: el.textContent.trim(), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }
        }))
      await ctx.close()
      expect(boxes.length, 'both wall controls render').toBe(2)
      for (const b of boxes) if (b.h < 24 || b.w < 24) failures.push(`${width}px: "${b.name}" is ${b.w}x${b.h}`)
    }
    expect(failures, `wall controls under 24px:\n  ${failures.join('\n  ')}`).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The Palette Library's filters
// ─────────────────────────────────────────────────────────────────────────────

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
const apart = (a, b) => rgb(a).some((v, i) => Math.abs(v - rgb(b)[i]) >= 6)

for (const theme of ['light', 'dark']) {
  test(`/discover/palettes · the chosen collection and mood are painted, not only recoloured, in ${theme}`, async ({ browser }) => {
    // In dark, --card and --bg-2 are the same hex, so the tray's sliding
    // indicator and the open Mood menu's active row were painted in exactly
    // the colour beneath them (rgb(25,26,29) on rgb(25,26,29), measured
    // 2026-09-08): a pressed option differed from an unpressed one by text
    // colour alone, and hovering a mood gave no feedback at all.
    //
    // MUTATION: delete the four `[data-theme="dark"] .lbry-…` rules in
    // global.css — the dark case fails on both fills; light stays green,
    // which is the point of scoping the fix.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
    const page = await ctx.newPage()
    watch(page, `someone narrowing the palette library on a ${theme} screen`)
    await go(page, '/discover/palettes')
    await expect(page.locator('.pgal-card').first()).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

    const tray = page.locator('[aria-label^="Filter palettes by collection"]')
    await tray.getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(tray.getByRole('button', { name: 'Brand', exact: true })).toHaveAttribute('aria-pressed', 'true')

    const trigger = page.locator('.pgl-toolbar .lbry-filtertrig:has(.lbry-filtertrig-k:text-is("Mood"))')
    await trigger.click()
    await page.locator('[aria-label^="Filter palettes by mood"]').getByRole('button', { name: 'Warm', exact: true }).click()
    await expect(trigger).toContainText('Warm')
    if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
    await expect(page.locator('.lbry-filtermenu')).toBeVisible()
    await settle(page)

    const paint = await page.evaluate(() => {
      const bg = (el) => getComputedStyle(el).backgroundColor
      const tray = document.querySelector('[aria-label^="Filter palettes by collection"]')
      const ind = tray.querySelector('.lbry-filter-ind')
      const menu = document.querySelector('.lbry-filtermenu')
      const on = menu.querySelector('.lbry-filter[data-active="true"]')
      return {
        indicatorOpacity: parseFloat(getComputedStyle(ind).opacity),
        indicator: bg(ind), tray: bg(tray),
        active: bg(on), menu: bg(menu), activeLabel: on.textContent.trim(),
      }
    })
    await ctx.close()
    expect(paint.activeLabel).toBe('Warm')
    expect(paint.indicatorOpacity, 'the indicator is on').toBe(1)
    expect(apart(paint.indicator, paint.tray), `indicator ${paint.indicator} on tray ${paint.tray}`).toBe(true)
    expect(apart(paint.active, paint.menu), `active row ${paint.active} on menu ${paint.menu}`).toBe(true)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// The homepage export section
// ─────────────────────────────────────────────────────────────────────────────
//
// ── DELETED: '/ · the export section's hand-off pill keeps its whole label
//    inside itself at 320' ──────────────────────────────────────────────────
//
// What it guarded: that `.hkit-cta` — "Open the export panel with this system
// →", the hand-off out of the old homepage's export section — kept its whole
// nowrap label inside its own box at 320px, and stayed a 44px target doing it.
// The measured defect was 302px of label in a 286px pill, so the arrow painted
// outside the pill in both themes.
//
// Why it is gone: the section is gone. `/` and `/home` render
// src/pages/Spectrum.jsx since the route swap and src/pages/Home.jsx is
// deleted, taking the HomeKit export section with it — measured on the built
// front door, `.hkit-cta` has count 0, and nothing under src/ matches `hkit`
// at all. There is no surviving element to re-point this at.
//
// Where the guarantee still lives: the RULE it encoded — a nowrap pill must not
// overrun its own box at 320 — is not homepage-specific and is still enforced
// on every route this file walks, plus by 21-reflow-320, which sweeps `/`
// itself at 320 for any element that overflows the viewport with no scrollable
// ancestor. That sweep is currently RED on `/` for the Spectrum bench panels'
// own `.sp-cta--ink` buttons, which is the same class of defect on the page
// that replaced this one; it is reported as a product defect rather than
// absorbed here.

// ─────────────────────────────────────────────────────────────────────────────
// /settings and /projects
// ─────────────────────────────────────────────────────────────────────────────

test('/settings · Privacy & legal keeps both pills inside the card at 320', async ({ browser }) => {
  // The two links were an inline flex row with no wrap: 284px of pills in a
  // 250px card body, so "Terms of service" ran under the card edge and the
  // feedback button (rendered 2026-09-08, both themes).
  //
  // MUTATION: drop `flex-wrap:wrap` from .settings-legal-links — the
  // second pill's right edge is 34px past the card's.
  const { ctx, page } = await phone(browser, 320)
  watch(page, 'someone on a small phone looking for the terms')
  await signIn(page, { plan: 'free' })
  await go(page, '/settings')
  await page.getByRole('tab', { name: /Privacy/ }).click()
  await expect(page.getByRole('link', { name: 'Terms of service' })).toBeVisible()
  await settle(page)
  const m = await page.evaluate(() => {
    const card = document.querySelector('#set-privacy .settings-card').getBoundingClientRect()
    return [...document.querySelectorAll('.settings-legal-links .btn')].map((a) => {
      const r = a.getBoundingClientRect()
      return { name: a.textContent.trim(), over: Math.round(r.right - card.right) }
    })
  })
  await ctx.close()
  expect(m.length).toBe(2)
  const spilled = m.filter((b) => b.over > 0).map((b) => `"${b.name}" ${b.over}px past the card`)
  expect(spilled, `legal links outside their card at 320:\n  ${spilled.join('\n  ')}`).toEqual([])
})

test('/settings · at 320 the profile row and the Theme row both stay inside their cards', async ({ browser }) => {
  // Two dead-rule faults, both the shape settings.css already documents for
  // its section nav: a ≤640 block at the top of the file whose declarations a
  // later base rule at equal specificity silently overrides.
  //   · Account: `.settings-profile-info{flex:1 1 calc(100% - 78px)}` lost to
  //     `.settings-profile-info{flex:1}`, so the row never wrapped — the
  //     name/email column measured 81px of a 250px row beside Sign out, the
  //     name broke in two and the email ran out of its box.
  //   · Accessibility: `.toggle-row .theme-seg` is a fixed 250px; beside its
  //     label at 320 it ran 23px past the card and cut "System" to "Syste".
  //
  // MUTATION: delete the two @media blocks added after the base rules in
  // settings.css — the email overflow and the seg spill both come back.
  const { ctx, page } = await phone(browser, 320)
  watch(page, 'someone checking their account on a small phone')
  await signIn(page, { plan: 'free' })
  await go(page, '/settings')

  await page.getByRole('tab', { name: /Account/ }).click()
  await expect(page.locator('.settings-profile-email')).toBeVisible()
  await settle(page)
  const profile = await page.evaluate(() => {
    const email = document.querySelector('.settings-profile-email')
    const info = document.querySelector('.settings-profile-info').getBoundingClientRect()
    const avatar = document.querySelector('.settings-profile-avatar').getBoundingClientRect()
    const signOut = [...document.querySelectorAll('.settings-profile .btn')].find((b) => /sign out/i.test(b.textContent)).getBoundingClientRect()
    return {
      emailOverflow: email.scrollWidth - email.clientWidth,
      infoWidth: Math.round(info.width),
      signOutBelowAvatar: signOut.top >= avatar.bottom - 1,
    }
  })
  expect(profile.emailOverflow, 'the email must fit its column').toBeLessThanOrEqual(0)
  expect(profile.infoWidth, 'the name/email column must get the row less the avatar').toBeGreaterThan(150)
  expect(profile.signOutBelowAvatar, 'Sign out drops to its own row rather than squeezing the column').toBe(true)

  await page.getByRole('tab', { name: /Accessibility/ }).click()
  await expect(page.locator('.theme-seg')).toBeVisible()
  await settle(page)
  const theme = await page.evaluate(() => {
    const seg = document.querySelector('.theme-seg').getBoundingClientRect()
    const card = document.querySelector('#set-accessibility .settings-card').getBoundingClientRect()
    const meta = document.querySelector('#set-accessibility .toggle-row-meta').getBoundingClientRect()
    return { over: Math.round(seg.right - card.right), viewportOver: Math.round(seg.right - window.innerWidth), metaWidth: Math.round(meta.width) }
  })
  await ctx.close()
  expect(theme.over, `the theme control runs ${theme.over}px past its card`).toBeLessThanOrEqual(0)
  expect(theme.viewportOver).toBeLessThanOrEqual(0)
  expect(theme.metaWidth, 'the label must not be crushed into a five-line column').toBeGreaterThan(150)
})

test('/projects · the card’s title control is at least 24px tall at 390 and 1440', async ({ browser }) => {
  // docs/RELEASE-READINESS.md §4 recorded it at 21px on a 390px screen; the
  // sweep measured 21.25px at every width (17px type, line-height 1.25).
  //
  // MUTATION: drop `min-height:24px` from .uh-card-name — both widths fail
  // at 21.3px.
  test.setTimeout(60_000)
  const failures = []
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext(width < 700
      ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
      : { viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    watch(page, `a designer opening a project card on a ${width}px screen`)
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    const name = page.locator('.uh-card-name').first()
    await expect(name).toBeVisible()
    await settle(page)
    const h = await name.evaluate((el) => +el.getBoundingClientRect().height.toFixed(1))
    await ctx.close()
    if (h < 24) failures.push(`${width}px: ${h}px`)
  }
  expect(failures, `title control under the 24px floor:\n  ${failures.join('\n  ')}`).toEqual([])
})
