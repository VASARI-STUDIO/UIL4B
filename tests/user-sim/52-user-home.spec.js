// THE WORKSPACE (/projects), the project page (/projects/:id), and the front
// door in front of them.
//
//   ROUTING is tested from the localStorage session hint, which is what the
//   decision is made from (utils/sessionHint.js).
//
//   THE PAGES are the design's "Your workspace" and project screens
//   (UIL4B App.dc.html). They render under the suite's
//   signed-in session (helpers.js signIn), so every test below drives the real
//   route; the fixture is used once, for four card states side by side.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { cheapestPerMonth, resolvePlanLadder } from '../../src/config/planLadder.js'
import { createTools } from '../../src/data/toolTree.js'
import { GALLERY_PALETTES } from '../../src/data/paletteGallery.js'

const SESSION_HINT = 'vs-session'
const FIXTURE = '/tests/user-sim/fixtures/user-home.html'

/** Make this context look like a browser that had a session on its last load. */
async function withSessionHint(page) {
  await page.addInitScript((key) => {
    try { localStorage.setItem(key, '1') } catch { /* private mode */ }
  }, SESSION_HINT)
}

test.describe('the front door', () => {
  test('a visitor with no session gets the sales page at /, and stays there', async ({ page }) => {
    watch(page, 'a first-time visitor arriving at the root')
    await go(page, '/')
    await expect(page).toHaveURL(/\/$/)
    // The hero, not the dashboard. Asserted on the landing's own root element so
    // this cannot be satisfied by shared chrome.
    await expect(page.locator('.spectrum')).toBeVisible()
    // The workspace's own root. (This read `.uh-tip`, the old page's daily tip,
    // which the rebuild deleted — a count of zero would have held on any page.)
    await expect(page.locator('.uh')).toHaveCount(0)
  })

  test('a returning visitor is taken to the User Home, and never sees the sales page', async ({ page }) => {
    watch(page, 'a signed-in visitor opening the site')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page, 'the root must hand a returning visitor to the User Home').toHaveURL(/\/projects$/)
    // THE FLASH TEST. The sales page must never have rendered on the way: the
    // decision is made in the first render, from the hint, before Firebase has
    // loaded at all. If it were made after auth resolved, the sales page would
    // paint first and this would catch it.
    //
    // THIS ONE WENT VACUOUS AND STILL REPORTED GREEN. It read `.home` — the old
    // Home.jsx root — which stopped existing the moment Spectrum took `/`. A
    // count of zero was then true of every page in the app, so the flash test
    // was asserting nothing at all while passing. It names the element that
    // would actually flash now.
    await expect(page.locator('.spectrum')).toHaveCount(0)
  })

  test('/home is the sales page for EVERYONE, session or not', async ({ page }) => {
    // The founder's stated exception: "unless they click they home button or
    // navigate to specifly /home".
    //
    // Both states on one page, unhinted first: addInitScript accumulates, so
    // once the hint is installed it stays installed for every later load. That
    // is exactly the order this needs, and it avoids a second browser context.
    watch(page, 'a visitor at /home')
    await go(page, '/home')
    await expect(page, '/home must never redirect for a signed-out visitor').toHaveURL(/\/home$/)
    await expect(page.locator('.spectrum')).toBeVisible()

    await withSessionHint(page)
    await go(page, '/home')
    await expect(page, '/home must never redirect for a signed-in visitor either').toHaveURL(/\/home$/)
    await expect(page.locator('.spectrum')).toBeVisible()
  })

  test('the nav Home control reaches the sales page from inside the app', async ({ page }) => {
    watch(page, 'a signed-in visitor clicking Home')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page).toHaveURL(/\/projects$/)
    // The wordmark goes to the workspace now (the App file's goProjects); the
    // way back to the sales page is the header's Back to the site button.
    await page.getByRole('link', { name: 'Back to the site' }).first().click()
    await expect(page, 'the Home control must land on the sales page and stay there').toHaveURL(/\/home$/)
    await expect(page.locator('.spectrum')).toBeVisible()
  })

  test('a stale hint settles without looping', async ({ page }) => {
    // The hint says there is a session; there is not (Firebase resolves to
    // signed out here, which is exactly the lapsed-session case). The visitor
    // must land somewhere and STOP. This is why the User Home renders its own
    // signed-out state instead of redirecting to /login: / -> /projects ->
    // /login -> dismiss -> /projects would be a loop.
    watch(page, 'a visitor whose session lapsed between loads')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible()
    await expect(page, 'a stale hint must not bounce the visitor onward').toHaveURL(/\/projects$/)
    // And the hint is corrected, so the next cold load goes to the sales page.
    const hint = await page.evaluate((key) => localStorage.getItem(key), SESSION_HINT)
    expect(hint, 'resolved auth must clear a hint it disagrees with').toBeNull()
  })
})

/* ── Fixtures: projects in known states ───────────────────────────────────── */

const clone = () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))
const ago = (ms) => new Date(Date.now() - ms).toISOString()

/** All four parts: colours, fonts, a moved scale, tints. */
function complete(id = 'p-done', name = 'Violet Lime') {
  const design = clone()
  design.palette.colors = ['#1A0B2E', '#4B1F9E', '#8B5CF6', '#C9F24D', '#F5F3FF']
  design.fonts.heading.family = 'Fraunces'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1A0B2E', '#2E1650', '#4B1F9E', '#6C3FD4', '#8B5CF6', '#B69BF0']
  return { id, name, design, createdAt: ago(9 * 864e5), updatedAt: ago(2 * 36e5) }
}
/** Colours only. */
function half(id = 'p-half', name = 'Harbour Rebrand') {
  const design = clone()
  design.palette.colors = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
  return { id, name, design, createdAt: ago(9 * 864e5), updatedAt: ago(26 * 36e5) }
}

/** Today's per-browser AI count for one tool, under the key usageTracker writes. */
async function usedToday(page, tool, n) {
  await page.addInitScript(([t, count]) => {
    const d = new Date()
    const key = `vs-usage-${t}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    try { localStorage.setItem(key, String(count)) } catch { /* private mode */ }
  }, [tool, n])
}

const loginDialog = (page) => page.getByRole('dialog').filter({ has: page.locator('#ui-login-title') })

/* ── Signed out: the first screen "Open the toolkit" lands on ─────────────── */

test.describe('a signed-out visitor gets a workspace they can use', () => {
  // "Open the toolkit" takes a signed-out
  // visitor straight here, and sign-up happens only when they save.
  test('the tools, the library and the sign-in are all on the page; the plan is not', async ({ page }) => {
    watch(page, 'a visitor arriving from "Open the toolkit"')
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
    // No plan to be told about (the 20-billing-banner property, from this side).
    await expect(page.locator('.uh-plan')).toHaveCount(0)

    // Start something: every tile a real tool route, none gated.
    const start = page.locator('.uh-start')
    await expect(start.getByRole('link', { name: /Palette Builder/ })).toHaveAttribute('href', '/create/palette')
    const hrefs = await start.locator('.uh-tool').evaluateAll((n) => n.map((a) => a.getAttribute('href')))
    expect(hrefs).toEqual(['/create/gradient', '/create/tint', '/create/semantic-color', '/create/contrast', '/create/icons', '/discover/palettes'])

    // The recent-projects slot holds the sign-in, in the design's empty card's shape.
    const card = page.locator('.uh-empty.uh-signin')
    await expect(card.getByRole('heading', { level: 3 })).toHaveText('Sign in to keep what you build')
    await expect(card.getByRole('button', { name: 'Sign in' })).toBeVisible()

    // New in Discover: four real library palettes and the way to the rest.
    await expect(page.locator('.uh-disc-card')).toHaveCount(4)
    await expect(page.getByRole('link', { name: 'Browse all' })).toHaveAttribute('href', '/discover/palettes')
  })

  test('Sign in opens the login popup where they are, instead of sending them to /login', async ({ page }) => {
    watch(page, 'a visitor deciding to keep their work')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.locator('.uh-signin').getByRole('button', { name: 'Sign in' }).click()
    await expect(loginDialog(page)).toBeVisible()
    await expect(page, 'the popup opens in place').toHaveURL(/\/projects$/)
  })

  // New project goes straight into the
  // Palette Builder on a new, unsaved project, as the design file wires it. It is
  // named when it is saved — which is the one step that asks for an account.
  test('New project opens the Palette Builder on a fresh, unsaved project, with no sign-in asked', async ({ page }) => {
    watch(page, 'a visitor pressing New project before signing in')
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded-design')) return
      sessionStorage.setItem('seeded-design', '1')
      const d = JSON.parse(localStorage.getItem('vs-current-design') || '{}')
      try { localStorage.setItem('vs-current-design', JSON.stringify({ ...d, palette: { base: '#123456', colors: ['#123456', '#654321'] } })) } catch { /* private mode */ }
    })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'New project' }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(page.locator('#ui-login-title'), 'starting a project asks for no account').toHaveCount(0)
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || '{}'))
    expect(current.palette?.colors, 'a NEW project starts from the defaults, not from what was open').toEqual(DEFAULT_DESIGN.palette.colors)
    expect(await page.evaluate(() => localStorage.getItem('vs-projects')), 'nothing is saved until it is named').toBeNull()
  })
})

/* ── "All … tools" ────────────────────────────────────────────────────────── */

test.describe('"All … tools" opens the Create menu', () => {
  test('its count is the live tool count, not a typed word', async ({ page }) => {
    watch(page, 'a visitor looking for the rest of the tools')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const live = createTools().filter((t) => !t.soon && !t.beta).length
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen']
    await expect(page.locator('.uh-alltools')).toHaveText(`All ${words[live] || live} tools`)
  })

  test('on a desktop it opens the header’s Create menu', async ({ page }) => {
    watch(page, 'a desktop visitor opening every tool')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.locator('.uh-alltools').click()
    const trigger = page.locator('.pnav-trigger', { hasText: 'Create' }).first()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#pnav-mega')).toBeVisible()
  })

  test('on a phone it opens the menu sheet', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    watch(page, 'a phone visitor opening every tool')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.locator('.uh-alltools').click()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await context.close()
  })
})

/* ── The plan strip ───────────────────────────────────────────────────────── */

test.describe('the plan strip reads the real plan', () => {
  test('free: the plan, today’s busiest AI tool against its cap, and the project slots', async ({ page }) => {
    watch(page, 'a free account checking what it has left')
    await usedToday(page, 'alt-text', 2)
    await usedToday(page, 'prompts-ai', 1)
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const strip = page.locator('.uh-plan')
    await expect(strip).toContainText('Free plan')
    await expect(strip.locator('.uh-meter').first()).toContainText(`2 of ${AI_LIMITS.free.daily}`)
    await expect(page.getByRole('meter', { name: 'AI generations today' })).toHaveAttribute('aria-valuenow', '2')
    await expect(page.getByTestId('project-quota-note')).toContainText('Project slots')
    await expect(page.getByTestId('project-quota-note')).toContainText(`2 of ${FREE_SAVE_LIMITS.projects}`)
  })

  test('Pro: no project meter (there is no limit), its own AI cap, and no Pro panel', async ({ page }) => {
    watch(page, 'a Pro account on its workspace')
    await signIn(page, { plan: 'pro', projects: FREE_SAVE_LIMITS.projects + 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const strip = page.locator('.uh-plan')
    await expect(strip).toContainText('Pro plan')
    await expect(strip).toContainText(`0 of ${AI_LIMITS.pro.daily}`)
    await expect(page.getByTestId('project-quota-note'), 'Pro has no project limit to meter').toHaveCount(0)
    await expect(page.locator('.uh-pro'), 'nothing to sell a Pro account').toHaveCount(0)
  })

  test('the Pro panel’s control: a free account is shown it, priced from the plan ladder, with no false perk', async ({ page }) => {
    watch(page, 'a free account reading the Pro panel')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const pro = page.locator('.uh-pro')
    await expect(pro).toBeVisible()
    const cheapest = cheapestPerMonth(resolvePlanLadder())
    const cta = pro.getByRole('link', { name: `Upgrade for ${cheapest.perMonthLabel}/mo` })
    await expect(cta, 'every upgrade CTA goes to /plans').toHaveAttribute('href', '/plans')
    const text = await pro.innerText()
    expect(text, 'there is no version history').not.toMatch(/version history/i)
    expect(text, 'there is no cancel flow').not.toMatch(/cancel/i)
    expect(text).toContain(`${AI_LIMITS.pro.daily} generations a day`)
    expect(text).toContain('HCT editing and per-colour contrast')
  })
})

/* ── Recent projects ──────────────────────────────────────────────────────── */

test.describe('a recent project card is read off the project', () => {
  test('tag, parts, strip and destination come from the saved design', async ({ page }) => {
    watch(page, 'a returning designer scanning their work')
    const archived = { ...half('p-old', 'Old Harbour'), archived: true, updatedAt: ago(6 * 864e5) }
    await signIn(page, { plan: 'free', projects: [half(), complete(), archived] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const done = page.locator('.proj-card', { hasText: 'Violet Lime' })
    await expect(done.locator('.uh-card-tag')).toHaveText('Ready')
    await expect(done.locator('.uh-card-line')).toHaveText('Edited 2 hours ago, 4 of 4 parts')
    await expect(done.locator('.uh-card-strip > span'), 'the strip is the project’s own five colours').toHaveCount(5)
    await expect(done.locator('.uh-card-name')).toHaveAttribute('href', '/projects/p-done')

    const partial = page.locator('.proj-card', { hasText: 'Harbour Rebrand' }).first()
    await expect(partial.locator('.uh-card-tag')).toHaveText('In progress')
    await expect(partial.locator('.uh-card-line')).toContainText('1 of 4 parts')

    await expect(page.locator('.proj-card', { hasText: 'Old Harbour' }).locator('.uh-card-tag')).toHaveText('Archived')
    // "Recent": newest first, whatever order the account stored them in.
    expect(await page.locator('.uh-card-title').allInnerTexts()).toEqual(['Violet Lime', 'Harbour Rebrand', 'Old Harbour'])
  })

  test('the pencil opens six icons, and the one chosen survives a reload', async ({ page }) => {
    watch(page, 'a designer giving a project its own icon')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await page.getByRole('button', { name: 'Change icon for Violet Lime' }).click()
    const picker = page.getByRole('group', { name: 'Icon for Violet Lime' })
    await expect(picker.getByRole('button')).toHaveCount(6)
    await picker.getByRole('button', { name: 'Use the flask icon' }).click()
    await expect(picker).toHaveCount(0)
    // ON THE PROJECT, so it syncs to the account — not a
    // per-browser key beside it.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test']?.[0]?.icon))
      .toBe('flask')
    await expect.poll(() => page.evaluate(() => window.__UIL4B_TEST_STORE__?.get('users/test-uid-free/projects/p-done')?.project?.icon),
      { message: 'the icon must reach the account', timeout: 10_000 }).toBe('flask')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-project-icons') || '{}')['p-done'])).toBeUndefined()

    await page.reload()
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'Change icon for Violet Lime' }).click()
    await expect(page.getByRole('button', { name: 'Use the flask icon' })).toHaveAttribute('aria-pressed', 'true')
    // Escape closes it and hands focus back to the pencil.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('group', { name: 'Icon for Violet Lime' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Change icon for Violet Lime' })).toBeFocused()
  })

  test('the fixture’s four states read the way the page reads them', async ({ page }) => {
    watch(page, 'the card in every state it can be in')
    await go(page, FIXTURE)
    await expect(page.locator('.uh-card-tag')).toHaveText(['Ready', 'In progress', 'In progress', 'Archived'])
    await expect(page.locator('.uh-card-line').nth(0)).toHaveText('Edited 25 minutes ago, 4 of 4 parts')
    await expect(page.locator('.uh-card-line').nth(2)).toHaveText('Edited 6 days ago, 0 of 4 parts')
  })
})

/* ── The empty state ──────────────────────────────────────────────────────── */

test.describe('a new account', () => {
  test('sees the design\'s empty card, minus the sentence that is not true', async ({ page }) => {
    watch(page, 'a new account on its first visit')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const empty = page.locator('.uh-empty').filter({ hasText: 'No projects yet' })
    await expect(empty).toContainText('Start with a colour and the rest of the project follows.')
    // Projects sync to a signed-in account, so "Nothing leaves the browser
    // until you export it" was false and is gone.
    await expect(page.locator('main')).not.toContainText('Nothing leaves the browser')
    await empty.getByRole('button', { name: 'Start a project' }).click()
    await expect(page, 'the empty card goes straight into the Palette Builder').toHaveURL(/\/create\/palette$/)
  })

  test('the first control, New project, is on the first screen of a 320px phone', async ({ browser }) => {
    // The design's layout puts "Start something" above the recent projects, so on a
    // phone the empty card is below the fold. What must not be is the way to
    // make a project: the title row's New project opens the same dialog.
    const context = await browser.newContext({ viewport: { width: 320, height: 568 } })
    const page = await context.newPage()
    watch(page, 'a new account on a small phone')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const m = await page.getByRole('button', { name: 'New project' }).evaluate((el) => {
      const r = el.getBoundingClientRect()
      const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return { bottom: r.bottom, vh: window.innerHeight, scrolled: window.scrollY, hit: at === el || el.contains(at) }
    })
    expect(m.scrolled).toBe(0)
    expect(m.bottom).toBeLessThanOrEqual(m.vh)
    expect(m.hit, 'something paints over New project').toBe(true)
    await context.close()
  })
})

/* ── The project page ─────────────────────────────────────────────────────── */

test.describe('a project’s own page', () => {
  test('the card opens it, and every slot is read off the saved design', async ({ page }) => {
    watch(page, 'a designer opening a finished project')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.locator('.uh-card-name', { hasText: 'Violet Lime' }).click()
    await expect(page).toHaveURL(/\/projects\/p-done$/)

    await expect(page.getByRole('heading', { level: 1, name: 'Violet Lime' })).toBeVisible()
    await expect(page.locator('.pjd-status')).toHaveText('Complete and ready to export')
    await expect(page.locator('.pjd-progress-label')).toHaveText('4 of 4 parts')

    const detail = (label) => page.locator('.pjd-slot', { has: page.locator('.pjd-slot-label', { hasText: new RegExp(`^${label}$`) }) }).locator('.pjd-slot-detail')
    await expect(detail('Colour')).toHaveText('5 colours')
    await expect(detail('Type')).toHaveText('Fraunces 700 over Manrope 400')
    await expect(detail('Type scale')).toHaveText('Perfect fourth, 1.333, six steps from 17 px')
    await expect(detail('Tints')).toHaveText('6 steps')
    await expect(page.locator('.pjd-slot-tag')).toHaveText(['Done', 'Done', 'Done', 'Done'])

    // THE EXPORT BAR TELLS THE TRUTH: CSS, JSON and Tailwind export are not built.
    await expect(page.locator('.pjd-export-line')).not.toContainText(/CSS|JSON|Tailwind/)
    await page.getByRole('button', { name: 'Export project' }).click()
    await expect(page.getByRole('dialog').filter({ has: page.locator('#exp-title') })).toBeVisible()
  })

  test('an empty slot says so and opens the tool that fills it, with THIS project loaded', async ({ page }) => {
    watch(page, 'a designer finishing a half-built project')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects/p-half')
    await expectRendered(page, '/projects/p-half')

    await expect(page.locator('.pjd-status')).toContainText('1 of 4 parts filled')
    await expect(page.locator('.pjd-export-line')).toHaveText('3 parts still open.')
    const scale = page.locator('.pjd-slot', { has: page.locator('.pjd-slot-label', { hasText: /^Type scale$/ }) })
    await expect(scale.locator('.pjd-slot-tag')).toHaveText('Empty')
    await scale.getByRole('button', { name: 'Set the scale' }).click()
    await expect(page).toHaveURL(/\/create\/type-scale$/)
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || '{}'))
    expect(current.palette?.colors, 'the tool opened on this project, not on whatever was open').toEqual(half().design.palette.colors)
  })

  // On a phone, tapping a project opens its page, and the page's
  // next action opens the tool that finishes it, with the project loaded.
  test('on a phone, tapping a project goes somewhere: its page, then the tool that finishes it', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await context.newPage()
    watch(page, 'a designer picking a project back up on their phone')
    await signIn(page, { plan: 'free', projects: [half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.locator('.uh-card-name', { hasText: 'Harbour Rebrand' }).tap()
    await expect(page).toHaveURL(/\/projects\/p-half$/)
    await page.getByRole('button', { name: 'Continue building' }).tap()
    await expect(page).toHaveURL(/\/create\/type-scale$/)
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || '{}'))
    expect(current.palette?.colors).toEqual(half().design.palette.colors)
    await context.close()
  })

  test('Copy says Copied on the slot, and All projects goes back', async ({ page, context }) => {
    watch(page, 'a designer copying a palette out of a project')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects/p-done')
    await expectRendered(page, '/projects/p-done')
    await page.getByRole('button', { name: 'Copy colour as CSS' }).click()
    await expect(page.getByRole('button', { name: 'Copied colour' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('#8B5CF6')

    await expect(page.locator('.pjd-row-name')).toHaveText(['Harbour Rebrand'])
    await page.getByRole('link', { name: 'All projects' }).click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('an unknown project id goes back to the workspace instead of rendering nothing', async ({ page }) => {
    watch(page, 'a designer following a link to a project deleted elsewhere')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects/not-a-project')
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
  })
})

/* ── The project menu, on the project's page ──────────────────────────────── */

test.describe('the project menu', () => {
  test('it groups the actions and marks the tools that would start from nothing', async ({ page }) => {
    watch(page, 'a designer looking for what they can do to a project')
    await signIn(page, { plan: 'free', projects: [half()] })
    await go(page, '/projects/p-half')
    await expectRendered(page, '/projects/p-half')

    await page.getByRole('button', { name: 'Actions for Harbour Rebrand' }).click()
    const menu = page.getByRole('group', { name: 'Actions for Harbour Rebrand' })
    await expect(menu).toBeVisible()
    for (const name of ['Duplicate', 'Rename', 'Copy CSS variables', 'Archive']) {
      await expect(menu.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await expect(menu.getByRole('button', { name: /Delete/ })).toBeVisible()
    await expect(menu.getByRole('button', { name: /Type scale/ })).toContainText('empty')
    await expect(menu.getByRole('button', { name: /^Palette/ })).not.toContainText('empty')
  })

  test('Escape closes it and gives focus back to its trigger', async ({ page }) => {
    watch(page, 'a keyboard user opening the project menu')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects/p-done')
    await expectRendered(page, '/projects/p-done')

    const trigger = page.getByRole('button', { name: 'Actions for Violet Lime' })
    await trigger.click()
    const menu = page.getByRole('group', { name: 'Actions for Violet Lime' })
    await expect(menu).toBeVisible()
    await expect(menu.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})

/* ── Free CTAs do their job without an account ──────────────────────────── */

test.describe('"Start something" opens every tool for a visitor with no account', () => {
  for (const [label, path] of [
    ['Palette Builder', '/create/palette'], ['Gradient', '/create/gradient'], ['Tint', '/create/tint'],
    ['Semantic', '/create/semantic-color'], ['Contrast', '/create/contrast'], ['Icon set', '/create/icons'],
    ['Palette Library', '/discover/palettes'],
  ]) {
    test(`${label} opens ${path} with no sign-in asked`, async ({ page }) => {
      watch(page, `a signed-out visitor opening ${label} from the workspace`)
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      await page.locator('.uh-start').getByRole('link', { name: new RegExp(`^${label}`) }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expectRendered(page, path)
      await expect(page.locator('#ui-login-title'), 'a tool asked a visitor to sign in before it opened').toHaveCount(0)
    })
  }
})

/* ── The cap, the clock, the icon and the word "project" ─────────────────── */

test.describe('at the free cap, New project explains the cap instead of opening', () => {
  test('the refusal is said in place, in ProjectContext\u2019s words, and stays', async ({ page }) => {
    watch(page, 'a free account with no slots left starting a new project')
    const account = await signIn(page, { plan: 'free', projects: FREE_SAVE_LIMITS.projects })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'New project' }).click()

    const refusal = page.getByTestId('project-create-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toContainText(`Free plan saves up to ${FREE_SAVE_LIMITS.projects} projects`)
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
    await expect(page, 'a project that could never be saved is not opened').toHaveURL(/\/projects$/)
    await expect(page.locator('.toast-success.show')).toHaveCount(0)
    await page.waitForTimeout(2500)
    await expect(refusal, 'the refusal must outlive a toast').toBeVisible()
    expect((await page.evaluate((e) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[e], account.email)).length).toBe(FREE_SAVE_LIMITS.projects)
  })

  test('one under the cap it opens the Palette Builder — the control', async ({ page }) => {
    watch(page, 'a free account with a slot to spare')
    await signIn(page, { plan: 'free', projects: FREE_SAVE_LIMITS.projects - 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'New project' }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(page.getByTestId('project-create-refusal')).toHaveCount(0)
  })
})

test.describe('the dashboard says what day it is, from the viewer\u2019s own machine', () => {

  test('a local date and time sits above "Your workspace", and does not announce itself', async ({ page }) => {
    watch(page, 'a returning user glancing at the workspace')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const clock = page.locator('.uh-clock')
    await expect(clock).toBeVisible()
    await expect(clock).toHaveJSProperty('tagName', 'TIME')
    const iso = await clock.getAttribute('datetime')
    expect(Math.abs(Date.parse(iso) - Date.now()), 'it reads the machine\u2019s own clock').toBeLessThan(5 * 60_000)
    const weekday = await page.evaluate(() => new Date().toLocaleDateString([], { weekday: 'long' }))
    await expect(clock).toContainText(weekday)
    await expect(clock).not.toHaveAttribute('aria-live', /.+/)
    const [c, h] = await Promise.all([clock.boundingBox(), page.locator('.uh-h1').boundingBox()])
    expect(c.y + c.height, 'the clock sits above the title').toBeLessThanOrEqual(h.y + 1)
  })
})

test.describe('New in Discover shows the newest palettes', () => {
  test('the four with the latest added date, not the first four in the file', async ({ page }) => {
    watch(page, 'a designer looking for what is new')
    const dated = GALLERY_PALETTES.map((p, i) => ({ ...p, i })).filter((p) => p.added)
    expect(dated.length, 'the library carries no added dates to sort by').toBeGreaterThanOrEqual(4)
    const expected = dated
      .sort((a, b) => (a.added === b.added ? b.i - a.i : a.added < b.added ? 1 : -1))
      .slice(0, 4)
      .map((p) => p.name)
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.uh-disc-name')).toHaveText(expected)
    expect(expected, 'these are not simply the head of the file').not.toEqual(GALLERY_PALETTES.slice(0, 4).map((p) => p.name))
  })
})

test.describe('a project icon lives on the project', () => {
  test('an icon this browser kept under the old key moves onto the project', async ({ page }) => {
    watch(page, 'a returning designer whose icon was stored the old way')
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem('vs-project-icons')) localStorage.setItem('vs-project-icons', JSON.stringify({ 'p-done': 'compass' }))
      } catch { /* private mode */ }
    })
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test']?.[0]?.icon))
      .toBe('compass')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-project-icons') || '{}')['p-done'])).toBeUndefined()
    await page.getByRole('button', { name: 'Change icon for Violet Lime' }).click()
    await expect(page.getByRole('button', { name: 'Use the compass icon' })).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('the workspace lists recent exports', () => {
  test('an export on record is a row: type, name, size, when', async ({ page }) => {
    watch(page, 'a designer coming back to find the file they exported')
    await page.addInitScript(() => {
      try {
        localStorage.setItem('vs-recent-exports', JSON.stringify([
          { id: 'e1', tool: 'palette', toolLabel: 'Palette Builder', format: 'CSS', filename: 'violet-lime-tokens.css', bytes: 2048, at: Date.now() - 5 * 60 * 1000, projectId: null },
        ]))
      } catch { /* private mode */ }
    })
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const section = page.getByRole('region', { name: 'Recent exports' })
    await expect(section).toBeVisible()
    const row = section.getByRole('listitem')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('CSS')
    await expect(row).toContainText('violet-lime-tokens.css')
    await expect(row).toContainText('2.0 KB')
    await expect(row).toContainText('5M AGO')
  })

  test('with nothing exported, no empty section is drawn', async ({ page }) => {
    watch(page, 'a new account that has exported nothing')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.uh-card').first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Recent exports' })).toHaveCount(0)
  })
})

test.describe('it is a project, not a kit', () => {
  test('neither page calls it a kit', async ({ page }) => {
    watch(page, 'a designer reading their workspace and a project')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    for (const path of ['/projects', '/projects/p-done', '/projects/p-half']) {
      await go(page, path)
      await expectRendered(page, path)
      const text = await page.locator('.uh').innerText()
      expect(text.length).toBeGreaterThan(200)
      expect(text, `${path} still says "kit"`).not.toMatch(/\bkit\b/i)
    }
  })
})
