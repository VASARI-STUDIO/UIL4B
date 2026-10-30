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
import { go, watch, expectRendered, signIn, routePalettePreview } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { createTools } from '../../src/data/toolTree.js'
import { GLYPHS } from '../../src/components/userhome/workspaceGlyphs.js'
import { GALLERY_PALETTES } from '../../api/_lib/library/paletteGallery.js'
import { exportPanel } from './export-rows.js'

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
    // The workspace now wears .spectrum too (.uh.spectrum), so the sales page is the .spectrum that is not .uh.
    await expect(page.locator('.spectrum:not(.uh)')).toHaveCount(0)
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
    // The wordmark goes to the dashboard from app pages and, on the dashboard,
    // to the sales page.
    await page.getByRole('link', { name: 'UIL4B, go to the home page' }).first().click()
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
    await routePalettePreview(page)
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
    // No plan to be told about (the 20-billing-banner property, from this side).
    await expect(page.locator('.uh-plan')).toHaveCount(0)

    // Start something: every tile a real tool route, none gated.
    const start = page.locator('.uh-start')
    await expect(start.getByRole('link', { name: /^Palette/ })).toHaveAttribute('href', '/create/palette')
    // The links only (the Palette row is the first row now, not a lead tile): the "All thirteen tools" row beside them is a button the phone shows (see 141).
    // The Palette Library is not one of them: its link lives in New in Discover.
    const hrefs = await start.locator('a.uh-tool').evaluateAll((n) => n.map((a) => a.getAttribute('href')))
    expect(hrefs).toEqual(['/create/palette', '/create/gradient', '/create/tint', '/create/semantic-color', '/create/contrast', '/create/icons'])
    await expect(start.locator('.uh-tool--all'), 'the phone-only row is not drawn at a laptop width').toBeHidden()

    // The sign-in sits in Today (the rail), under the date and time. It is a line of text, not a
    // heading: the section's own heading is "Today".
    const today = page.getByRole('region', { name: 'Today' })
    const card = today.locator('.uh-signin')
    await expect(card.locator('.uh-signin-title')).toHaveText('Sign in to keep what you build')
    await expect(card.getByRole('button', { name: 'Sign in' })).toBeVisible()
    // A visitor is not offered the starter: that is for an account with no projects.
    await expect(page.getByTestId('starter-card')).toHaveCount(0)

    // New in Discover: four real library palettes and the way to the rest.
    await expect(page.locator('.uh-disc-card')).toHaveCount(4)
    await expect(page.getByRole('link', { name: 'Browse the Palette Library' })).toHaveAttribute('href', '/discover/palettes')
    // A visitor cannot open the Pro palettes, so those cards draw the server's blurred picture under
    // "Opens with Pro" (the pictures load as they scroll into view), never the text fallback.
    const locked = page.locator('.uh-disc-card.is-locked')
    const lockedCount = await locked.count()
    expect(lockedCount, 'no locked card for a visitor: the picture check measured nothing').toBeGreaterThan(0)
    await page.locator('.uh-disc').scrollIntoViewIfNeeded()
    await expect(page.locator('.uh-disc-lock.is-ready'), 'a locked card\'s picture did not arrive').toHaveCount(lockedCount)
    await expect(locked.locator('.uh-disc-lock-label')).toHaveText(Array(lockedCount).fill('Opens with Pro'))
    await expect(page.locator('.uh-disc-note')).toHaveCount(0)
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
    // On a phone the heading's button gives way to a row at the foot of the four tools.
    await expect(page.locator('.uh-alltools')).toBeHidden()
    await page.getByRole('button', { name: /^All \w+ tools$/ }).click()
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
    await expect(page.getByTestId('project-quota-note')).toContainText('Projects')
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

  test('the Pro panel’s control: a free account is shown it, priced only if a live price exists, with no false perk', async ({ page }) => {
    watch(page, 'a free account reading the Pro panel')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const pro = page.locator('.uh-pro')
    await expect(pro).toBeVisible()
    // The price is the live one in the visitor's currency, so this run (no
    // price service) shows no amount; it must never show the USD fallback.
    // Exactly "See Pro": a looser pattern (Upgrade for \S+/mo) would also pass the
    // bare "$4" of the USD fallback, which is the fault this guards.
    const cta = pro.getByRole('link', { name: 'See Pro', exact: true })
    await expect(cta, 'every upgrade CTA goes to /plans').toHaveAttribute('href', '/plans')
    const text = await pro.innerText()
    expect(text, 'the panel opens on its heading, with no "UIL4B Pro" label above it').not.toMatch(/UIL4B Pro/)
    expect((await pro.locator('.uh-pro-copy > *').first().getAttribute('id')), 'the heading is the first thing in the panel').toBe('uh-pro-h')
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

    // The newest project that is not archived leads, as a card of its own.
    const lead = page.locator('.proj-card', { hasText: 'Violet Lime' })
    await expect(lead.locator('.uh-card-line')).toHaveText('Ready · Edited 2 hours ago')
    await expect(lead.locator('.uh-plate rect.spt-step'), 'the lead plate is the project’s own five colours').toHaveCount(5)
    await expect(lead.locator('.uh-parts > li')).toHaveText([
      'Colour, done, 5 colours', 'Type, done, Fraunces over Manrope', 'Type scale, done, 17px, Perfect fourth', 'Tints, done, 6 steps',
    ])
    await expect(lead.locator('.uh-card-name')).toHaveAttribute('href', '/projects/p-done')
    await expect(lead.locator('.uh-card-name')).toHaveAttribute('data-project', 'Violet Lime')

    // The others are rows: parts out of four, then when it was edited, each a link to its page.
    const partial = page.locator('.proj-card', { hasText: 'Harbour Rebrand' })
    await expect(partial.locator('.uh-card-line')).toHaveText('1 of 4 parts · Edited 1 day ago')
    await expect(partial.locator('.uh-card-name')).toHaveAttribute('href', '/projects/p-half')
    const oldRow = page.locator('.proj-card', { hasText: 'Old Harbour' })
    await expect(oldRow.locator('.uh-card-line'), 'an archived project says so before its parts').toHaveText('Archived · 1 of 4 parts · Edited 6 days ago')
    await expect(oldRow.locator('.uh-card-name')).toHaveAttribute('href', '/projects/p-old')
    // "Recent": newest first, whatever order the account stored them in, archived last.
    expect(await page.locator('.proj-card .uh-card-title').allInnerTexts()).toEqual(['Violet Lime', 'Harbour Rebrand', 'Old Harbour'])
  })

  test('the icon is chosen on the project’s page, and the workspace shows the one chosen after a reload', async ({ page }) => {
    watch(page, 'a designer giving a project its own icon')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects/p-done')
    await expectRendered(page, '/projects/p-done')

    const picker = page.getByRole('group', { name: 'Icon for Violet Lime' })
    await expect(picker.getByRole('button')).toHaveCount(6)
    await picker.getByRole('button', { name: 'Use the flask icon' }).click()
    await expect(picker.getByRole('button', { name: 'Use the flask icon' })).toHaveAttribute('aria-pressed', 'true')
    // ON THE PROJECT, so it syncs to the account — not a
    // per-browser key beside it.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test']?.[0]?.icon))
      .toBe('flask')
    await expect.poll(() => page.evaluate(() => window.__UIL4B_TEST_STORE__?.get('users/test-uid-free/projects/p-done')?.project?.icon),
      { message: 'the icon must reach the account', timeout: 10_000 }).toBe('flask')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-project-icons') || '{}')['p-done'])).toBeUndefined()

    // The workspace has no picker of its own any more (the pencil and its popover are gone); it
    // shows the chosen glyph as the badge on the project's card.
    await page.reload()
    await expectRendered(page, '/projects/p-done')
    await expect(page.getByRole('button', { name: 'Use the flask icon' })).toHaveAttribute('aria-pressed', 'true')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByRole('button', { name: /Change icon/ }), 'the workspace no longer offers a picker').toHaveCount(0)
    await expect(page.locator('.proj-card', { hasText: 'Violet Lime' }).locator('.uh-badge path')).toHaveAttribute('d', GLYPHS.flask)
  })

  // An icon is not an edit of the design: "Edited 1 day ago" and the lead both read updatedAt, so
  // choosing an icon for an older project must leave both alone. The choice stamps iconAt instead,
  // which is what the account sync compares (held in tests/unit/project-sync.test.js).
  test('choosing an icon for an older project does not make it the lead or change when it was edited', async ({ page }) => {
    watch(page, 'a designer giving their older project an icon')
    const lead = complete()
    const older = half()
    await signIn(page, { plan: 'free', projects: [lead, older] })
    await go(page, '/projects/p-half')
    await expectRendered(page, '/projects/p-half')
    const before = Date.now()
    await page.getByRole('group', { name: 'Icon for Harbour Rebrand' }).getByRole('button', { name: 'Use the flask icon' }).click()

    const stored = () => page.evaluate(() => (JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test'] || []).find((p) => p.id === 'p-half'))
    await expect.poll(async () => (await stored())?.icon).toBe('flask')
    const kept = await stored()
    expect(kept.updatedAt, 'the icon moved "last edited"').toBe(older.updatedAt)
    expect(Date.parse(kept.iconAt), 'the icon carries its own stamp, set now').toBeGreaterThanOrEqual(before - 1000)
    // The account's copy carries both: the old edit time, and the stamp that lets the icon win a merge.
    await expect.poll(() => page.evaluate(() => window.__UIL4B_TEST_STORE__?.get('users/test-uid-free/projects/p-half')?.project?.icon),
      { message: 'the icon must reach the account', timeout: 10_000 }).toBe('flask')
    const account = await page.evaluate(() => window.__UIL4B_TEST_STORE__?.get('users/test-uid-free/projects/p-half'))
    expect(account.project.updatedAt).toBe(older.updatedAt)
    expect(account.project.iconAt).toBe(kept.iconAt)

    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.uh-dash-main > .uh-continue .uh-continue-name'), 'the icon made it the lead').toHaveText('Violet Lime')
    await expect(page.locator('.uh-row-meta')).toHaveText('1 of 4 parts · Edited 1 day ago')
  })

  test('an edit that is not an icon still moves "last edited": renaming a project takes the lead', async ({ page }) => {
    watch(page, 'a designer renaming their older project')
    const older = half()
    await signIn(page, { plan: 'free', projects: [complete(), older] })
    await go(page, '/projects/p-half')
    await expectRendered(page, '/projects/p-half')
    await page.getByRole('button', { name: 'Actions for Harbour Rebrand' }).click()
    await page.getByRole('button', { name: 'Rename', exact: true }).click()
    await page.getByRole('textbox', { name: /Rename Harbour Rebrand/i }).fill('Harbour Two')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.uh-dash-main > .uh-continue .uh-continue-name'), 'a rename is an edit, so it leads').toHaveText('Harbour Two')
    await expect(page.locator('.uh-dash-main > .uh-continue .uh-meta')).toHaveText('In progress · Edited just now')
    const stored = await page.evaluate(() => (JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test'] || []).find((p) => p.id === 'p-half'))
    expect(stored.iconAt, 'a rename does not stamp the icon').toBeUndefined()
  })

  test('the fixture’s four states read the way the page reads them', async ({ page }) => {
    watch(page, 'the card in every state it can be in')
    await go(page, FIXTURE)
    // The lead card, then the other three as rows, in the order the fixture lists them.
    await expect(page.locator('.proj-card .uh-card-line')).toHaveText([
      'Ready · Edited 25 minutes ago',
      '1 of 4 parts · Edited 3 hours ago',
      'Colour not set · 0 of 4 parts · Edited 6 days ago',
      'Archived · 1 of 4 parts · Edited 3 hours ago',
    ])
    await expect(page.locator('.proj-card .uh-card-title')).toHaveText(['Violet Lime', 'Harbour Rebrand', 'Default Project', 'Old Harbour'])
  })
})

/* ── The empty state ──────────────────────────────────────────────────────── */

test.describe('a new account', () => {
  test('sees the starter card, minus the sentence that is not true', async ({ page }) => {
    watch(page, 'a new account on its first visit')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const starter = page.getByTestId('starter-card')
    await expect(starter.getByRole('heading', { level: 2, name: 'Start your first project' })).toBeVisible()
    await expect(starter).toContainText('New project sets up colour, type, type scale and tints, and saves as you go.')
    // The four parts, in order: a true sequence, so numbered. Plain text: Start the walkthrough is the way in.
    await expect(starter.locator('.uh-steps li .uh-step-label')).toHaveText(['1 Colour', '2 Type', '3 Type scale', '4 Tints'])
    await expect(page.getByText('No projects yet'), 'an account with no projects is not told it has none').toHaveCount(0)
    // Projects sync to a signed-in account, so "Nothing leaves the browser
    // until you export it" was false and is gone.
    await expect(page.locator('main')).not.toContainText('Nothing leaves the browser')
    await starter.getByRole('button', { name: 'Start the walkthrough' }).click()
    await expect(page, 'the starter goes straight into the Palette Builder').toHaveURL(/\/create\/palette$/)
  })

  // With no project there is no work to put New project under, so the starter's own button is the
  // way to make one: it runs the same startNew() as New project. The title row's New project is
  // hidden on a phone (the page shows the one under the work, which is below the starter).
  for (const [width, height] of [[390, 844], [360, 740]]) {
    test(`the first control, Start the walkthrough, is on the first screen of a ${width}px phone`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height } })
      const page = await context.newPage()
      watch(page, 'a new account on a phone')
      await signIn(page, { plan: 'free', projects: 0 })
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      const m = await page.getByRole('button', { name: 'Start the walkthrough' }).evaluate((el) => {
        const r = el.getBoundingClientRect()
        const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return { top: r.top, bottom: r.bottom, vh: window.innerHeight, scrolled: window.scrollY, hit: at === el || el.contains(at) }
      })
      expect(m.scrolled).toBe(0)
      // The whole button is on the first screen, with nothing (the tab bar, Feedback) painted over it.
      expect(m.bottom, `the button ends at y=${Math.round(m.bottom)}`).toBeLessThanOrEqual(m.vh)
      expect(m.hit, 'something paints over the button').toBe(true)
      await context.close()
    })
  }
})

/* ── The project page ─────────────────────────────────────────────────────── */

test.describe('a project’s own page', () => {
  test('the card opens it, and every slot is read off the saved design', async ({ page }) => {
    watch(page, 'a designer opening a finished project')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.locator('.uh-card-name[data-project="Violet Lime"]').click()
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
    await page.locator('.pjd-head-actions').getByRole('button', { name: 'Export project' }).click()
    await expect(exportPanel(page)).toBeVisible()
    await expect(exportPanel(page).getByRole('heading', { level: 2 }), 'the popup is named for the project').toHaveText('Export Violet Lime')
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
    await page.locator('.uh-card-name[data-project="Harbour Rebrand"]').tap()
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
    ['Palette', '/create/palette'], ['Gradient', '/create/gradient'], ['Tint', '/create/tint'],
    ['Semantic Colour', '/create/semantic-color'], ['Contrast Checker', '/create/contrast'], ['Icon Library', '/create/icons'],
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
    await expect(refusal.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/plans')
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

  test('a local date and time sits in Today, date over time, and does not announce itself', async ({ page }) => {
    watch(page, 'a returning user glancing at the workspace')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const clock = page.getByRole('region', { name: 'Today' }).locator('.uh-clock')
    await expect(clock).toBeVisible()
    await expect(clock).toHaveJSProperty('tagName', 'TIME')
    const iso = await clock.getAttribute('datetime')
    expect(Math.abs(Date.parse(iso) - Date.now()), 'it reads the machine\u2019s own clock').toBeLessThan(5 * 60_000)
    const weekday = await page.evaluate(() => new Date().toLocaleDateString([], { weekday: 'long' }))
    await expect(clock).toContainText(weekday)
    await expect(clock).not.toHaveAttribute('aria-live', /.+/)
    const [date, time] = await Promise.all([clock.locator('.uh-today-date').boundingBox(), clock.locator('.uh-today-time').boundingBox()])
    expect(date.y + date.height, 'the date sits above the time').toBeLessThanOrEqual(time.y + 1)
    await expect(clock.locator('.uh-today-time')).toHaveText(/^\d{1,2}[:.]\d{2}/)
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
  const legacyIcon = async (page) => {
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem('vs-project-icons')) localStorage.setItem('vs-project-icons', JSON.stringify({ 'p-done': 'compass' }))
      } catch { /* private mode */ }
    })
    await signIn(page, { plan: 'free', projects: [complete()] })
  }
  const storedIcon = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test']?.[0]?.icon)

  test('an icon this browser kept under the old key moves onto the project when its page opens', async ({ page }) => {
    watch(page, 'a returning designer whose icon was stored the old way')
    await legacyIcon(page)
    await go(page, '/projects/p-done')
    await expectRendered(page, '/projects/p-done')
    await expect.poll(() => storedIcon(page)).toBe('compass')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-project-icons') || '{}')['p-done'])).toBeUndefined()
    await expect(page.getByRole('button', { name: 'Use the compass icon' })).toHaveAttribute('aria-pressed', 'true')
  })

  // The workspace runs the same migration (useProjectIcons), so the card's badge is right without a
  // visit to the project's page.
  test('an icon kept under the old key shows on the workspace card straight away', async ({ page }) => {
    watch(page, 'a returning designer whose icon was stored the old way')
    await legacyIcon(page)
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect.poll(() => storedIcon(page), { timeout: 5000 }).toBe('compass')
    await expect(page.locator('.proj-card', { hasText: 'Violet Lime' }).locator('.uh-badge path')).toHaveAttribute('d', GLYPHS.compass)
  })
})

test.describe('the workspace lists recent exports', () => {
  test('an export on record is a row in the rail: type, name, when', async ({ page }) => {
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
    const section = page.locator('aside.uh-rail').getByRole('region', { name: 'Recent exports' })
    await expect(section).toBeVisible()
    const row = section.getByRole('listitem')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('CSS')
    await expect(row).toContainText('violet-lime-tokens.css')
    await expect(row).toContainText('5m ago')
  })

  test('with nothing exported, no empty section is drawn', async ({ page }) => {
    watch(page, 'a new account that has exported nothing')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.proj-card').first()).toBeVisible()
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
