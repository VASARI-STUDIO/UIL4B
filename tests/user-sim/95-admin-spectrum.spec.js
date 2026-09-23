// THE ADMIN DASHBOARD, RENDERED, ON THE SPECTRUM DESIGN SYSTEM.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS FOR, AND WHY IT IS NOT A SCREENSHOT DIFF
// ═══════════════════════════════════════════════════════════════════════════
// The 2026-09-18 work on this surface was a RESTYLE: #484's six tabs, its
// honest plan states and its server-only figures all stay exactly as they are,
// and what changed is the face, the radii, the chips and the motion. A
// screenshot diff would go red on every one of those on purpose and tell you
// nothing about whether the system was actually adopted.
//
// So each test below asserts a PROPERTY of the design system that a person can
// state in a sentence, measured from the rendered page rather than read off the
// stylesheet:
//
//   1. Values are set in Geist Mono with tabular figures; prose is not.
//   2. The accent is derived, not typed — moving `--accent` moves the whole
//      surface. This is the premium theme-template mechanism, so it is the one
//      with real product consequences.
//   3. The house motion curve is on the controls, and the press transform has
//      a reduced-motion companion.
//   4. Nothing overflows horizontally between 320 and 1440, on any of the six
//      tabs, in either theme.
//
// Every one was watched go red with the corresponding piece reverted; the
// mutation is named on the test.
//
// ── THE STUB, AND WHY ──────────────────────────────────────────────────────
// Identical in shape to 94-admin-users-tab.spec.js and for the identical
// reason: `vite preview` serves dist/ as static files and runs no Vercel
// functions, so /api/verify-admin answers 404 and the Users tab would fall
// back to this browser's profile cache — a list of one. Six accounts are
// stubbed so that every plan state the table distinguishes is on screen at
// once, which is also what makes the chip assertions worth making.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn, REPORT_DIR } from './helpers.js'

const FOUNDER_UID = 'test-uid-admin'
const TABS = ['overview', 'users', 'submissions', 'community', 'prompts', 'stripe']

const USERS = [
  { uid: 'u-past-due', email: 'card.expired@example.test', displayName: 'Cara Expired', provider: 'email', emailVerified: true,
    createdAt: '2026-03-02T09:00:00.000Z', lastLoginAt: '2026-09-15T09:00:00.000Z',
    subscription: { status: 'past_due', interval: 'monthly' }, onboarding: {}, location: 'Brisbane, AU', company: '' },
  { uid: 'u-pro', email: 'paying.pro@example.test', displayName: 'Pia Pro', provider: 'google', emailVerified: true,
    createdAt: '2026-05-10T09:00:00.000Z', lastLoginAt: '2026-09-16T09:00:00.000Z',
    subscription: { status: 'active', interval: 'yearly' }, onboarding: { role: 'Designer', use: 'Client work' }, location: 'Berlin, DE', company: 'Studio Pia' },
  { uid: 'u-mod', email: 'mona.moderator@example.test', displayName: 'Mona Mod', provider: 'email', emailVerified: true,
    createdAt: '2026-01-20T09:00:00.000Z', lastLoginAt: '2026-09-14T09:00:00.000Z',
    subscription: { status: null, interval: null }, onboarding: {}, location: 'Austin, US', company: '' },
  { uid: 'u-free', email: 'freya.free@example.test', displayName: 'Freya Free', provider: 'email', emailVerified: false,
    createdAt: '2026-08-30T09:00:00.000Z', lastLoginAt: null,
    subscription: { status: null, interval: null }, onboarding: {}, location: '', company: '' },
  { uid: 'u-cancelled', email: 'gone.customer@example.test', displayName: 'Gus Gone', provider: 'email', emailVerified: true,
    createdAt: '2025-11-01T09:00:00.000Z', lastLoginAt: '2026-06-01T09:00:00.000Z',
    subscription: { status: 'canceled', interval: 'monthly' }, onboarding: {}, location: 'Austin, US', company: '' },
  { uid: 'u-unpaid', email: 'retries.done@example.test', displayName: 'Ulla Unpaid', provider: 'email', emailVerified: true,
    createdAt: '2026-02-14T09:00:00.000Z', lastLoginAt: '2026-09-02T09:00:00.000Z',
    subscription: { status: 'unpaid', interval: 'monthly' }, onboarding: {}, location: 'Lisbon, PT', company: '' },
]

/** Five reports, one per type/status combination the Submissions tab renders. */
const FEEDBACK = (() => {
  const d0 = Date.UTC(2026, 8, 18, 3, 0, 0)
  const at = (days) => new Date(d0 - days * 86_400_000).toISOString()
  return [
    { id: 'f1', type: 'bug', status: 'new', subject: 'Gradient export drops the last stop', message: 'Exporting a five-stop gradient to CSS only writes four stops.', email: 'reporter.one@example.test', source: 'web', createdAt: at(1), adminNotes: '' },
    { id: 'f2', type: 'feature', status: 'in-progress', subject: 'Pin a palette to the top of the library', message: 'I keep scrolling to find the same three palettes.', email: 'reporter.two@example.test', source: 'web', createdAt: at(3), adminNotes: 'Worth doing after the gating lands.' },
    { id: 'f3', type: 'help', status: 'new', subject: 'How do I change the billing currency?', message: 'Signed up in AUD, moved to Berlin.', email: 'reporter.three@example.test', source: 'web', createdAt: at(5), adminNotes: '' },
    { id: 'f4', type: 'general', status: 'done', subject: 'Love the contrast checker', message: 'Best contrast tool I have used.', email: '', source: 'web', createdAt: at(9), adminNotes: 'Replied.' },
    { id: 'f5', type: 'bug', status: 'in-progress', subject: 'Icon search fails on two-word queries', message: '"arrow left" returns zero results.', email: 'reporter.five@example.test', source: 'web', createdAt: at(12), adminNotes: '' },
  ]
})()

/* ── THE SERVER AGGREGATE, SEEDED AS DOCUMENTS ─────────────────────────────
 *
 * Overview's four headline figures and its four ranked lists all come from
 * getAggregateAnalytics(), which reads the `analytics-daily` collection. With
 * nothing there the tab renders its "No aggregate data yet" branch — a correct
 * state, and the WRONG one to photograph or to measure type against, because
 * none of the figures exist in it.
 *
 * #484's rule is preserved exactly: these are SERVER documents, the same ones
 * every signed-in session writes, not this browser's localStorage. Seeding the
 * server side is the only way to see the populated tab, and it is what the
 * founder's own dashboard reads. */
const AGGREGATE_DOCS = (() => {
  const out = {}
  for (let i = 0; i < 6; i++) {
    const day = `2026-09-${String(18 - i).padStart(2, '0')}`
    out[`analytics-daily/${day}`] = {
      day,
      views: 420 - i * 37,
      'icon-copies': 96 - i * 8,
      view__root: 140 - i * 9,
      view__create_palette: 96 - i * 7,
      view__discover_gradients: 61 - i * 4,
      view__plans: 38 - i * 3,
      tool__palette: 74 - i * 6,
      tool__contrast: 52 - i * 4,
      tool__gradient: 33 - i * 2,
      icon__arrow_right: 41 - i * 3,
      icon__check: 29 - i * 2,
      ipack__lucide: 58 - i * 5,
      ipack__phosphor: 24 - i * 2,
    }
  }
  return out
})()

/** Two prompts so the Prompts tab renders cards rather than its empty state. */
const PROMPT_DOCS = {
  'community-prompts/p-pending': {
    title: 'Editorial hero, high contrast', text: 'A magazine-style hero with a large serif headline and a single accent rule.',
    tags: ['hero', 'editorial'], status: 'pending', authorName: 'Pia Pro', authorUid: 'u-pro',
    createdAt: '2026-09-16T04:00:00.000Z',
  },
  'community-prompts/p-approved': {
    title: 'Dense dashboard shell', text: 'A six-tab admin shell with a scanning table and status chips.',
    tags: ['dashboard', 'admin'], status: 'approved', authorName: 'Mona Mod', authorUid: 'u-mod',
    createdAt: '2026-09-12T04:00:00.000Z',
  },
}

async function stubVerifyAdmin(page) {
  await page.route((url) => url.pathname === '/api/verify-admin', async (route) => {
    const body = route.request().postDataJSON?.() || {}
    const base = { isAdmin: true, uid: FOUNDER_UID, email: 'founder@uil4b.test', moderator: false, role: 'founder', claimUpdated: false, rosterError: null }
    if (body.moderatorAction === 'list') return route.fulfill({ json: { ...base, moderators: [{ uid: 'u-mod' }] } })
    if (body.includeUsers === true) return route.fulfill({ json: { ...base, users: USERS } })
    return route.fulfill({ json: base })
  })
  // The AI health card reuses the admin-gated diagnostic; preview runs no
  // functions, so it is answered here rather than left to render "Checking…"
  // in every screenshot.
  await page.route((url) => url.pathname === '/api/ai', async (route) => route.fulfill({
    json: {
      providerHealth: {
        status: 'degraded', windowDays: 7,
        summary: 'OpenRouter returned 429 on 12 of 84 generations this week; the Gemini fallback served every one of them.',
        totals: { openrouterOk: 72, openrouterFail: 12, geminiOk: 12, noProvider: 0 },
        lastFailover: { at: new Date(Date.UTC(2026, 8, 18, 2, 0, 0)).toISOString(), status: 429, message: 'rate limited' },
        alerting: 'on, to the founder address',
      },
    },
  }))
}

/** Sign in as the founder, seed the local reports, and land on the dashboard. */
async function openDashboard(page, { theme = 'light' } = {}) {
  watch(page, 'founder')
  await signIn(page, {
    admin: true,
    claims: { admin: true, email_verified: true },
    docs: { ...AGGREGATE_DOCS, ...PROMPT_DOCS },
  })
  await stubVerifyAdmin(page)
  await page.addInitScript((d) => {
    try {
      localStorage.setItem('vs-feedback', JSON.stringify(d.fb))
      localStorage.setItem('vs-t', d.theme)
    } catch { /* a blocked store is the app's problem to survive, not ours */ }
  }, { fb: FEEDBACK, theme })
  await go(page, '/admin')
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()
  // CONTROL: the theme actually applied, or every colour assertion below is
  // measuring the wrong one of the two palettes.
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  return page.locator('.adm')
}

/* Switching a tab replaces the panel under it, and React re-creates the tab
 * bar in the same commit — so a click resolved against the OLD button can find
 * the element detached before it lands. Waiting for the selected state rather
 * than for the click settles that, and retrying once covers the detach. */
const openTab = async (page, id) => {
  const tab = page.locator(`#admtab-${id}`)
  if (await tab.getAttribute('aria-selected') === 'true') return
  try {
    await tab.click({ timeout: 4000 })
  } catch {
    await tab.click({ timeout: 4000 })
  }
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

/** The rendered font stack of the first match, lower-cased for comparison. */
const familyOf = (page, selector) => page.locator(selector).first().evaluate(
  (el) => getComputedStyle(el).fontFamily.toLowerCase(),
)

test.describe('the values are set in the product\'s own face', () => {
  // The single strongest signal that a surface belongs to this product, and
  // the thing the design source does most consistently: a figure a person
  // reads or copies is Geist Mono, and the sentence around it is Geist.
  test('every figure a person reads is Geist Mono with tabular figures', async ({ page }) => {
    // MUTATION: delete the `.adm-stat-value, .adm-user-view-n, …` mono rule from
    // deferred/admin.css — the stat figures, the four count tiles and the
    // Joined/Last seen columns all fall back to Geist and this goes red.
    await openDashboard(page)

    // Overview: the four headline figures.
    await expect(page.locator('.adm-stat-value').first()).toBeVisible()
    expect(await familyOf(page, '.adm-stat-value')).toContain('geist mono')

    await openTab(page, 'users')
    await expect(page.getByText('All accounts · server data')).toBeVisible()

    // The count tiles, the dates, the masked address and the plan chip.
    for (const sel of ['.adm-user-view-n', '.adm-users-table td[data-label="Joined"]', '.adm-mask-text', '.adm-plan']) {
      expect(await familyOf(page, sel), `${sel} is not in the mono face`).toContain('geist mono')
    }

    // Tabular figures, so a column of counts lines up down the column. This is
    // the half that a plain `font-family` swap would miss.
    const numeric = await page.locator('.adm-user-view-n').first()
      .evaluate((el) => getComputedStyle(el).fontVariantNumeric)
    expect(numeric).toContain('tabular-nums')

    // AND THE OTHER HALF OF THE CONTRACT: prose is NOT mono. Without this the
    // test above is satisfied by setting the whole page in Geist Mono, which
    // would destroy the contrast it exists to create.
    const prose = await familyOf(page, '.adm-detail-foot, .adm-roster-line')
    expect(prose).toContain('geist')
    expect(prose).not.toContain('geist mono')
  })

  test('the bare `mono` class works outside a table, where it used to do nothing', async ({ page }) => {
    // REGRESSION: `.mono` was only ever defined as `.adm-table .mono` and
    // `.adm-list-name.mono`, so the two places the page uses it OUTSIDE a
    // table — the `analytics-daily` collection name in the reset confirmation
    // and the aggregate error string — asked for the mono face and silently
    // rendered in Geist.
    // MUTATION: remove the `.adm .mono` rule from deferred/admin.css.
    await openDashboard(page)
    await page.getByRole('button', { name: 'Reset page analytics' }).click()
    const named = page.locator('.adm-confirm-list .mono').first()
    await expect(named).toHaveText('analytics-daily')
    expect(await named.evaluate((el) => getComputedStyle(el).fontFamily.toLowerCase())).toContain('geist mono')
  })
})

test.describe('the accent is derived, so a theme template still moves it', () => {
  // THE ONE WITH PRODUCT CONSEQUENCES. Premium theme templates work by
  // changing `--accent` and nothing else. Any blue typed into this surface
  // would keep its old value while everything around it moved, which is a
  // broken feature rather than a styling slip — and it is invisible until
  // somebody buys a theme.
  /* THE ACCENT IS APPLIED AT BOOT, WHICH IS ALSO HOW THE PRODUCT APPLIES IT.
   *
   * An earlier version of this test mutated `--accent` after load and expected
   * every derived token to follow. It exposed a real Chromium behaviour rather
   * than a defect in the sheet: a custom property whose value is a
   * `color-mix()` of another custom property is NOT always re-invalidated when
   * that dependency changes through an inline style, while a direct
   * `var(--accent)` consumer updates immediately. Measured here: with `--accent`
   * set to citron after load, `.adm-section-bar` went citron and
   * `.adm-tab.active` — which reads the derived `--accent-text` — kept its blue.
   *
   * That is not the mechanism the feature uses. A premium theme template sets
   * the accent for the document, and the page renders with it. So the accent is
   * set BEFORE the app boots, which is both the honest test and the one whose
   * failure would mean something. */
  const CITRON = '#D6F24B'

  test('an accent applied at boot reaches the whole surface', async ({ page }) => {
    // MUTATION: hardcode `#0F6FFF` as `.adm-tab.active`'s colour in
    // deferred/admin.css — the tab stays blue under a citron accent, red here.
    await page.addInitScript((accent) => {
      const style = document.createElement('style')
      style.textContent = `:root,[data-theme="light"],[data-theme="dark"]{--accent:${accent}}`
      const put = () => document.head && document.head.appendChild(style)
      if (document.head) put(); else document.addEventListener('DOMContentLoaded', put)
    }, CITRON)
    await openDashboard(page)
    await openTab(page, 'users')
    await expect(page.getByText('All accounts · server data')).toBeVisible()
    // The count tile gives `.adm-user-view.active`; the Details button gives
    // `.adm-detail`, whose left rule is a direct `var(--accent)` consumer.
    await page.locator('.adm-user-view').first().click()
    await page.locator('.adm-users-table tbody tr:has(button[aria-expanded])')
      .first().getByRole('button', { name: 'Details' }).click()
    await expect(page.locator('.adm-detail').first()).toBeVisible()

    const sampled = await page.evaluate(() => {
      const read = (sel, prop) => {
        const el = document.querySelector(sel)
        return el ? getComputedStyle(el)[prop] : null
      }
      return {
        accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        bar: read('.adm-section-bar', 'backgroundColor'),
        tab: read('.adm-tab.active', 'color'),
        tile: read('.adm-user-view.active', 'borderTopColor'),
        detail: read('.adm-detail', 'borderLeftColor'),
      }
    })

    // CONTROL: the accent really is the one this test set, or everything below
    // is measuring the shipped blue and passing for the wrong reason.
    expect(sampled.accent.toLowerCase()).toBe(CITRON.toLowerCase())

    // Nothing on the surface may still be blue. Citron is yellow-green: its
    // red and green channels are high and its blue channel is low, which is
    // the opposite of every blue this page could have been written with.
    for (const key of ['bar', 'tab', 'tile', 'detail']) {
      const value = sampled[key]
      expect(value, `${key} resolved to nothing`).toBeTruthy()
      const [, g, b] = await page.evaluate((c) => {
        // Resolve whatever the engine serialised — rgb(), color(srgb …) or
        // oklab() — through the canvas, which normalises all three.
        const cv = document.createElement('canvas')
        const ctx = cv.getContext('2d')
        ctx.fillStyle = '#000'
        ctx.fillStyle = c
        ctx.fillRect(0, 0, 1, 1)
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }, value)
      expect(g, `${key} is not following the accent — it is still a blue (${value})`).toBeGreaterThan(b)
    }
  })
})

test.describe('motion comes from the system, and yields', () => {
  test('the controls carry the house curve', async ({ page }) => {
    // MUTATION: drop `--adm-ease` back to `ease` on `.adm-tab` — the curve
    // stops being the source's own and this goes red.
    await openDashboard(page)
    const timing = await page.locator('.adm-tab').first()
      .evaluate((el) => getComputedStyle(el).transitionTimingFunction)
    expect(timing).toContain('cubic-bezier(0.23, 1, 0.32, 1)')
  })

  test('the press transform has a reduced-motion companion', async ({ page }) => {
    // THE ONE A PORT DROPS. `scale(.97)` on :active is a transform applied in
    // a STATE, not a transition, so the global reduced-motion rule — which
    // clamps durations — does not remove it. Without an explicit companion it
    // still snaps for exactly the people who asked for less movement.
    // MUTATION: delete the `html[data-reduced-motion="true"] .adm-tab:active`
    // block from deferred/admin.css.
    await openDashboard(page)
    const pressed = await page.evaluate(() => {
      const el = document.querySelector('.adm-tab')
      const styleFor = () => {
        // Read the :active rule out of the cascade rather than synthesising a
        // press, which cannot be held open across an evaluate().
        let hit = null
        for (const sheet of document.styleSheets) {
          let rules
          try { rules = sheet.cssRules } catch { continue }
          for (const r of rules || []) collect(r, (t) => { hit = t })
        }
        return hit
      }
      function collect(rule, set) {
        if (rule.cssRules) { for (const sub of rule.cssRules) collect(sub, set) }
        if (!rule.selectorText) return
        if (rule.selectorText.includes('data-reduced-motion="true"')
          && rule.selectorText.includes('.adm-tab:active')
          && rule.style.transform === 'none') set(rule.selectorText)
      }
      return { el: !!el, rule: styleFor() }
    })
    expect(pressed.el, 'no tab rendered, so this is checking nothing').toBe(true)
    expect(pressed.rule, 'no reduced-motion companion for the press transform').toBeTruthy()

    // And the companion actually wins when the attribute is set.
    await page.evaluate(() => document.documentElement.setAttribute('data-reduced-motion', 'true'))
    // Chromium serialises 0.01ms as `1e-05s`, so the assertion is on the
    // NUMBER rather than on a spelling of it.
    const dur = await page.locator('.adm-tab').first()
      .evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(parseFloat(dur)).toBeLessThan(0.001)
  })
})

test.describe('nothing overflows, 320 to 1440, on any tab, in either theme', () => {
  // ADMIN TABLES ARE WHERE THIS BREAKS, and the users table breaks it quietly:
  // below 680px every cell becomes a block but the table kept
  // `min-width:fit-content` from the wide layout, which on a block-laid table
  // is computed from the widest unbreakable run — a 28-character Firebase uid.
  // The wrapper scrolls, so nothing LOOKS broken; the card simply never fits.
  for (const theme of ['light', 'dark']) {
    test(`${theme}: every tab fits every width`, async ({ page }) => {
      // Twenty-four tab switches, each re-rendering a panel.
      test.slow()
      // MUTATION: remove the `min-width: 0` rule from the max-width:680px
      // block in deferred/admin.css — 390 and 320 go red on the Users tab.
      await openDashboard(page, { theme })
      const offences = []
      for (const [w, h] of [[1440, 1000], [834, 1000], [390, 900], [320, 900]]) {
        await page.setViewportSize({ width: w, height: h })
        for (const tab of TABS) {
          await openTab(page, tab)
          const m = await page.evaluate(() => {
            const de = document.documentElement
            const wide = []
            for (const el of document.querySelectorAll('.adm *')) {
              const r = el.getBoundingClientRect()
              if (r.width > 0 && r.right > de.clientWidth + 1.5) {
                wide.push(String(el.className || el.tagName).slice(0, 40))
              }
            }
            return { over: de.scrollWidth - de.clientWidth, wide: [...new Set(wide)].slice(0, 4) }
          })
          if (m.over > 0) offences.push(`${theme} ${w}px ${tab}: page scrolls ${m.over}px — ${m.wide.join(', ')}`)
        }
      }
      expect(offences, offences.join('\n')).toEqual([])
    })
  }
})

test.describe('the surface still does everything it did', () => {
  // THE RESTYLE MUST NOT HAVE COST A CAPABILITY. #484's six tabs each render
  // their own content, and the Users tab still reaches the detail panel — the
  // two things a CSS-led change could plausibly break by hiding rather than by
  // erroring.
  test('all six tabs render content, and the detail panel still opens', async ({ page }) => {
    // MUTATION: set `.adm-detail{display:none}` — the panel "opens" and this
    // goes red, which a build and a unit run would both miss.
    const adm = await openDashboard(page)
    await expect(adm).toBeVisible()

    for (const tab of TABS) {
      await openTab(page, tab)
      const painted = await page.evaluate(() => {
        const host = document.querySelector('.adm')
        const panels = [...host.querySelectorAll('.adm-section, .adm-cat')]
        return panels.some((p) => p.getBoundingClientRect().height > 40)
      })
      expect(painted, `the "${tab}" tab renders nothing with height`).toBe(true)
    }

    await openTab(page, 'users')
    await expect(page.getByText('All accounts · server data')).toBeVisible()
    const row = page.locator('.adm-users-table tbody tr:has(button[aria-expanded])').first()
    await row.getByRole('button', { name: 'Details' }).click()
    const detail = page.locator('.adm-detail').first()
    await expect(detail).toBeVisible()
    await expect(detail.locator('.adm-copy-row')).toHaveCount(2)
    await expect(detail.locator('.adm-detail-foot')).toContainText(/not done from here/i)
  })

  test('the plan chips still say the honest thing, in the mono face', async ({ page }) => {
    // #484 found a real defect: every Stripe status that was not
    // active/trialing collapsed into the word "Free", so a past-due subscriber
    // read as somebody who had never paid. The restyle changes the chip's FACE
    // and radius and must not soften one word of what it says.
    // MUTATION: restore `status === 'active' || status === 'trialing' ? 'pro' : 'free'`.
    await openDashboard(page)
    await openTab(page, 'users')
    await expect(page.getByText('All accounts · server data')).toBeVisible()
    const table = page.locator('.adm-users-table')
    const chip = (name) => table.locator(`tbody tr:has-text("${name}")`).first().locator('.adm-plan')

    await expect(chip('Cara Expired')).toHaveText('Past due')
    await expect(chip('Ulla Unpaid')).toHaveText('Unpaid')
    await expect(chip('Pia Pro')).toHaveText('Pro')
    await expect(chip('Gus Gone')).toHaveText('Cancelled')
    await expect(chip('Freya Free')).toHaveText('Free')
    expect(await familyOf(page, '.adm-plan')).toContain('geist mono')
  })
})

test.describe('evidence', () => {
  // Screenshots of every tab at the three review widths in both themes. Kept
  // out of the repository — REPORT_DIR is gitignored, and a PNG has no
  // business in a commit.
  /* ONE TEST PER THEME, and that is not cosmetic. The first version looped
   * both themes inside a single test, which meant calling openDashboard() —
   * and therefore signIn() and page.route() — a second time on a page that was
   * already signed in and navigated. The second pass then never found the
   * dashboard. A fresh `page` fixture per theme is how the overflow tests
   * above are written and it is why they are stable. */
  for (const theme of ['light', 'dark']) {
    test(`capture every tab at every width — ${theme}`, async ({ page }) => {
      test.slow()
      const dir = path.join(REPORT_DIR, 'admin-spectrum')
      fs.mkdirSync(dir, { recursive: true })
      await openDashboard(page, { theme })
      for (const [w, h] of [[1440, 1000], [834, 1000], [390, 900]]) {
        await page.setViewportSize({ width: w, height: h })
        for (const tab of TABS) {
          await openTab(page, tab)
          // A screenshot of a loading state is not evidence of a design. The
          // first pass photographed "Loading users…" on all six Users shots,
          // because the stubbed roster had not landed when the shutter fell.
          if (tab === 'users') await expect(page.getByText('All accounts · server data')).toBeVisible()
          if (tab === 'overview') await expect(page.locator('.adm-stat-value').first()).toBeVisible()
          // AND THE SHOT IS OF THE TAB IT IS NAMED AFTER. Without this the file
          // name is a claim nobody checked, and a mislabelled screenshot is
          // worse than no screenshot — it is evidence for the wrong thing.
          await expect(page.locator(`#admtab-${tab}`)).toHaveAttribute('aria-selected', 'true')
          // Let the .16s colour transition on the tab settle, so the bar is not
          // photographed mid-fade.
          await page.waitForTimeout(220)
          await page.screenshot({ path: path.join(dir, `${theme}-${w}-${tab}.png`), fullPage: w !== 1440 })
        }
      }
      // Eighteen per theme: six tabs at three widths. Asserted so an empty
      // capture cannot pass as evidence.
      const mine = fs.readdirSync(dir).filter((f) => f.startsWith(`${theme}-`))
      expect(mine.length, `only ${mine.length} ${theme} screenshots were written`).toBe(18)
    })
  }
})
