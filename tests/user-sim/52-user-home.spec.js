// THE WORKSPACE (/projects), the project page (/projects/:id), and the front door in front of them.
//
// The workspace is the dashboard design: a status line (the greeting, or the offline note), the title "Your
// workspace" with New project, one line for today, then the KIT SHEET: one project's four parts (Palette,
// Type scale, Font pair, Tints), each plate with its own "Open in" link, and the next step as a pill. Below it
// the other projects as minis (with Find and Show all past four), the Tools and library shelf, and the plan line.
//
//   ROUTING is tested from the localStorage session hint, which is what the decision is made from
//   (utils/sessionHint.js).
//
//   THE PAGE is driven under the suite's signed-in session (helpers.js signIn) and as a visitor. What is
//   asserted is what a person reads and can do: names, captions, links and where they go, the states the page
//   has (lead, example, empty, loading, failed, offline), reaching every project, the cap, the name ask and the
//   plan line. Sizes are 141's; the phone and tablet are 146's.
//
//   The fixtures (fixtures/dashboard-projects.js) have fixed shapes and ages, so "1 of 4 parts set. Edited
//   1 day ago." is a hand-checked string and not the page's own sum.
//
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn, routePalettePreview } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { createTools } from '../../src/data/toolTree.js'
import { GALLERY_PALETTES } from '../../api/_lib/library/paletteGallery.js'
import { exportPanel } from './export-rows.js'
import { COMPLETE_COLOURS, HALF_COLOURS, DAY, HOUR, ago, archived, blank, complete, half, many, noTints } from './fixtures/dashboard-projects.js'

const SESSION_HINT = 'vs-session'

/** Make this context look like a browser that had a session on its last load. */
async function withSessionHint(page) {
  await page.addInitScript((key) => {
    try { localStorage.setItem(key, '1') } catch { /* private mode */ }
  }, SESSION_HINT)
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
const sheetOf = (page, name) => page.getByRole('region', { name })
const shelfOf = (page) => page.getByRole('region', { name: 'Tools and library' })
const othersOf = (page) => page.getByTestId('other-projects')
const storedProjects = (page, email) => page.evaluate((e) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[e] || [], email)

const PART_LINKS = [
  ['Open in Palette Builder', '/create/palette'],
  ['Open in Type Scale', '/create/type-scale'],
  ['Open in Font Pair', '/create/font-pair'],
  ['Open in Tint', '/create/tint'],
]

/** The four parts' links inside a sheet go where the labels say. */
async function expectPartLinks(sheet) {
  for (const [name, href] of PART_LINKS) {
    await expect(sheet.getByRole('link', { name }), `${name} goes to ${href}`).toHaveAttribute('href', href)
  }
}

/* ── The front door ───────────────────────────────────────────────────────── */

test.describe('the front door', () => {
  test('a visitor with no session gets the sales page at /, and stays there', async ({ page }) => {
    watch(page, 'a first-time visitor arriving at the root')
    await go(page, '/')
    await expect(page).toHaveURL(/\/$/)
    // The hero, not the dashboard. Asserted on the landing's own root so shared chrome cannot satisfy it.
    await expect(page.locator('.spectrum-home')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toHaveCount(0)
  })

  test('a returning visitor is taken to the workspace, and never sees the sales page', async ({ page }) => {
    watch(page, 'a signed-in visitor opening the site')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page, 'the root must hand a returning visitor to the workspace').toHaveURL(/\/projects$/)
    // THE FLASH TEST. The sales page must never have rendered on the way: the decision is made in the first
    // render, from the hint, before Firebase has loaded at all. `.spectrum-home` is the sales page's own root;
    // a zero count of an element the page no longer has would pass on every page, so the workspace's own
    // heading is asserted to be there as well.
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
    await expect(page.locator('.spectrum-home')).toHaveCount(0)
  })

  test('/home is the sales page for EVERYONE, session or not', async ({ page }) => {
    // A visitor can always reach the sales page by clicking the home button or navigating to /home. Both
    // states on one page, unhinted first: addInitScript accumulates, so once the hint is installed it stays.
    watch(page, 'a visitor at /home')
    await go(page, '/home')
    await expect(page, '/home must never redirect for a signed-out visitor').toHaveURL(/\/home$/)
    await expect(page.locator('.spectrum-home')).toBeVisible()

    await withSessionHint(page)
    await go(page, '/home')
    await expect(page, '/home must never redirect for a signed-in visitor either').toHaveURL(/\/home$/)
    await expect(page.locator('.spectrum-home')).toBeVisible()
  })

  test('the nav Home control reaches the sales page from inside the app', async ({ page }) => {
    watch(page, 'a signed-in visitor clicking Home')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page).toHaveURL(/\/projects$/)
    // The wordmark goes to the workspace from app pages and, on the workspace, to the sales page.
    await page.getByRole('link', { name: 'UIL4B, go to the home page' }).first().click()
    await expect(page, 'the Home control must land on the sales page and stay there').toHaveURL(/\/home$/)
    await expect(page.locator('.spectrum-home')).toBeVisible()
  })

  test('a stale hint settles on the example kit without looping, and the hint is corrected', async ({ page }) => {
    // The hint says there is a session; there is not (Firebase resolves to signed out here, which is exactly
    // the lapsed-session case). The visitor must land somewhere and STOP: the workspace draws its own
    // signed-out state instead of redirecting to /login (/ -> /projects -> /login -> dismiss -> /projects
    // would be a loop).
    watch(page, 'a visitor whose session lapsed between loads')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible()
    await expect(page, 'a stale hint must not bounce the visitor onward').toHaveURL(/\/projects$/)
    await expect(sheetOf(page, 'Example brand kit'), 'the signed-out example is what settles').toBeVisible()
    const hint = await page.evaluate((key) => localStorage.getItem(key), SESSION_HINT)
    expect(hint, 'resolved auth must clear a hint it disagrees with').toBeNull()
  })
})

/* ── Signed out ───────────────────────────────────────────────────────────── */

test.describe('a signed-out visitor gets a workspace they can use', () => {
  test('the example kit shows the four parts, each opening its tool; no plan, no meters', async ({ page }) => {
    watch(page, 'a visitor arriving from "Open the toolkit"')
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
    const sheet = sheetOf(page, 'Example brand kit')
    await expect(sheet.getByRole('heading', { level: 2, name: 'Every kit has four parts' })).toBeVisible()
    await expect(sheet, 'it says it is an example, and that no account is needed').toContainText('This one is an example: Kerbside, a sample bike courier. No account needed to start.')

    // The four parts in the app's next-step order, each with its caption and its own way in.
    await expect(sheet.getByText(/^(Palette|Type scale|Font pair|Tints)$/)).toHaveText(['Palette', 'Type scale', 'Font pair', 'Tints'])
    await expectPartLinks(sheet)
    // Kerbside's palette is drawn from its four real colours.
    await expect(sheet.getByRole('img', { name: 'Palette: #FF5A1F, #1A1A1A, #E6E4DE, #FFFFFF' })).toBeVisible()
    await expect(sheet).toContainText('Archivo over IBM Plex Sans')

    // No account means no plan to be told about and no allowances to meter (the billing-banner property, from
    // this side).
    await expect(page.getByText(/You.re on (Free|Pro)/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'What Pro adds' })).toHaveCount(0)
    await expect(page.getByTestId('project-quota-note')).toHaveCount(0)
    await expect(page.getByTestId('ai-meter-note')).toHaveCount(0)
    // A visitor has no list of projects to find one in.
    await expect(page.getByRole('heading', { level: 2, name: 'Other projects' })).toHaveCount(0)
    await expect(page.getByTestId('first-palette-card')).toHaveCount(0)
    await expect(page.getByTestId('starter-card')).toHaveCount(0)
  })

  for (const [name, path] of [
    ['Open in Palette Builder', '/create/palette'], ['Open in Type Scale', '/create/type-scale'],
    ['Open in Font Pair', '/create/font-pair'], ['Open in Tint', '/create/tint'],
  ]) {
    test(`${name} opens ${path} with no sign-in asked`, async ({ page }) => {
      watch(page, `a signed-out visitor choosing "${name}" on the example kit`)
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      await sheetOf(page, 'Example brand kit').getByRole('link', { name }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expectRendered(page, path)
      await expect(page.locator('#ui-login-title'), 'a tool asked a visitor to sign in before it opened').toHaveCount(0)
    })
  }

  test('"Tell us your name" opens the sign-up popup where they are, instead of sending them to /login', async ({ page }) => {
    watch(page, 'a visitor deciding to keep their work')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('greeting')).toContainText('Hey, you look new around here.')
    await page.getByRole('button', { name: 'Tell us your name' }).click()
    await expect(loginDialog(page)).toBeVisible()
    await expect(page, 'the popup opens in place').toHaveURL(/\/projects$/)
  })

  // New project goes straight into the Palette Builder on a new, unsaved project. It is named when it is
  // saved, which is the one step that asks for an account.
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

  test('the plan line offers only See plans', async ({ page }) => {
    watch(page, 'a visitor reading the plan line')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/plans')
    await expect(page.getByRole('link', { name: 'Manage plan' })).toHaveCount(0)
  })

  test('Discover shows a visitor four palettes they can open, and none they cannot', async ({ page }) => {
    // KNOWN APP DEFECT (run 2): a signed-out visitor gets an empty New in Discover column. The shelf sorts the
    // open palettes by their `added` date, and in src/data/paletteLibrary.js only the Pro stubs carry one.
    watch(page, 'a visitor looking at what the library holds')
    await routePalettePreview(page)
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const shelf = shelfOf(page)
    const picks = shelf.getByRole('link', { name: /, palette$/ })
    await expect(picks, 'four palettes a visitor can open').toHaveCount(4)
    await expect(shelf.getByRole('link', { name: /Pro palette/ }), 'a visitor is not shown palettes they cannot open').toHaveCount(0)
    await expect(shelf.getByRole('link', { name: 'New in Discover' })).toHaveAttribute('href', '/discover/palettes')
    for (const href of await picks.evaluateAll((n) => n.map((a) => a.getAttribute('href')))) expect(href).toBe('/discover/palettes')
  })

  test('signing out on the workspace swaps the account’s kit for the example, and none of its names stay', async ({ page }) => {
    watch(page, 'someone signing out with their projects on screen')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(sheetOf(page, 'Violet Lime, latest project')).toBeVisible()
    await expect(page.getByText("You’re on Free.")).toBeVisible()

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signOutNow())
    await expect(sheetOf(page, 'Example brand kit'), 'signed out, the sheet is the example').toBeVisible()
    await expect(page.locator('body')).not.toContainText('Violet Lime')
    await expect(page.locator('body')).not.toContainText('Harbour Rebrand')
    await expect(page.getByText(/You.re on (Free|Pro)/)).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Other projects' })).toHaveCount(0)
    await expect(page.getByTestId('project-quota-note'), 'the previous account’s allowance is gone').toHaveCount(0)
    await expect(page.getByTestId('greeting')).toContainText('Hey, you look new around here.')
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
    await expect(shelfOf(page).getByRole('button', { name: /^All \w+ tools$/ })).toHaveText(`All ${words[live] || live} tools`)
  })

  test('on a desktop it opens the header’s Create menu', async ({ page }) => {
    watch(page, 'a desktop visitor opening every tool')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await shelfOf(page).getByRole('button', { name: /^All \w+ tools$/ }).click()
    const trigger = page.locator('.pnav-trigger', { hasText: 'Create' }).first()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#pnav-mega')).toBeVisible()
  })

  test('it stays open when the pointer has just left the header', async ({ page }) => {
    watch(page, 'a desktop visitor who brushed the header on the way to the button')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const button = shelfOf(page).getByRole('button', { name: /^All \w+ tools$/ })
    const trigger = page.locator('.pnav-trigger', { hasText: 'Create' }).first()
    // Into the header and out again, without opening a menu, as a pointer does on its way down.
    const bar = await page.locator('nav.pnav').boundingBox()
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2)
    // Leaving the header arms its 120ms hover close; the click lands inside that window.
    await button.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.waitForTimeout(300)
    await expect(trigger, 'the pending hover close did not shut it').toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#pnav-mega')).toBeVisible()
  })

  test('on a phone it opens the menu sheet', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    watch(page, 'a phone visitor opening every tool')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: /^All \w+ tools$/ }).click()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await context.close()
  })
})

/* ── The lead project: the kit sheet ──────────────────────────────────────── */

test.describe('the kit sheet is read off the newest project', () => {
  test('a finished project: its five colours, scale, fonts and tints, and the contrast check as the next step', async ({ page }) => {
    watch(page, 'a returning designer scanning their newest work')
    await signIn(page, { plan: 'free', projects: [half(), complete(), archived(half('p-old', 'Old Harbour', ago(30 * 60_000)))] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    // The newest project that is not archived leads (Old Harbour was touched more recently but is archived).
    const sheet = sheetOf(page, 'Violet Lime, latest project')
    await expect(sheet.getByRole('heading', { level: 2, name: 'Violet Lime' })).toBeVisible()
    await expect(sheet.getByText('4 of 4 parts set. Edited 2 hours ago.')).toBeVisible()
    await expect(sheet.getByRole('img', { name: `Palette: ${COMPLETE_COLOURS.join(', ')}` }), 'the plate is the project’s own five colours').toBeVisible()
    await expect(sheet).toContainText('5 colours')
    await expect(sheet).toContainText('17 to 40px')
    await expect(sheet).toContainText('Fraunces over Manrope')
    await expect(sheet).toContainText('6 steps')
    await expect(sheet.getByText('Not set'), 'all four parts are set').toHaveCount(0)

    await expectPartLinks(sheet)
    // With every part set the next move is the contrast check.
    await expect(sheet.getByRole('link', { name: /^Continue: check the contrast/ })).toHaveAttribute('href', '/create/contrast')
    await expect(sheet.getByRole('link', { name: 'Open project, Violet Lime' })).toHaveAttribute('href', '/projects/p-done')
  })

  test('a half-built project: three parts say Not set, and the pill names the next step', async ({ page }) => {
    watch(page, 'a designer coming back to a project with only colours')
    await signIn(page, { plan: 'free', projects: [half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const sheet = sheetOf(page, 'Harbour Rebrand, latest project')
    await expect(sheet.getByText('1 of 4 parts set. Edited 1 day ago.')).toBeVisible()
    await expect(sheet.getByRole('img', { name: `Palette: ${HALF_COLOURS.join(', ')}` })).toBeVisible()
    await expect(sheet.getByText('Not set')).toHaveCount(3)
    // What each empty part says, so the person knows what it needs.
    await expect(sheet).toContainText("Pick a ratio and Harbour Rebrand's sizes run from body text to display.")
    await expect(sheet).toContainText('No fonts paired yet.')
    await expect(sheet.getByText(/Preview: \d+ steps from #0B2A45\./).first(), 'tints can be previewed from the palette').toBeVisible()

    const next = sheet.getByRole('link', { name: /^Continue: set the type scale/ })
    await expect(next).toHaveAttribute('href', '/create/type-scale')
    await expectPartLinks(sheet)
  })

  test('with no palette yet, Tints says it needs one and the pill asks for the palette', async ({ page }) => {
    watch(page, 'a designer with a project they have not started')
    await signIn(page, { plan: 'free', projects: [blank('p-new', 'Fresh Start', ago(HOUR))] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const sheet = sheetOf(page, 'Fresh Start, latest project')
    await expect(sheet.getByText('0 of 4 parts set. Edited 1 hour ago.')).toBeVisible()
    await expect(sheet.getByText('Not set')).toHaveCount(4)
    await expect(sheet).toContainText('Needs a palette first.')
    await expect(sheet.getByRole('link', { name: /^Continue: build the palette/ })).toHaveAttribute('href', '/create/palette')
  })

  test('Open project goes to the lead project’s own page', async ({ page }) => {
    watch(page, 'a designer picking their project back up')
    await signIn(page, { plan: 'free', projects: [half(), complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await sheetOf(page, 'Violet Lime, latest project').getByRole('link', { name: 'Open project, Violet Lime' }).click()
    await expect(page).toHaveURL(/\/projects\/p-done$/)
  })

  test('the minis list the other projects newest first, archived last, each a link to its page', async ({ page }) => {
    watch(page, 'a returning designer scanning the rest of their work')
    const old = archived(half('p-old', 'Old Harbour', ago(6 * DAY)))
    await signIn(page, { plan: 'free', projects: [old, half(), complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.getByRole('heading', { level: 2, name: 'Other projects' })).toBeVisible()
    const minis = othersOf(page).getByRole('link')
    await expect(minis).toHaveText([/^Harbour Rebrand/, /^Old Harbour/])
    await expect(minis.nth(0)).toHaveAttribute('href', '/projects/p-half')
    await expect(minis.nth(0)).toContainText('1 of 4 parts set. Edited 1 day ago.')
    await expect(minis.nth(0)).toContainText('Next: set the type scale')
    await expect(minis.nth(1)).toHaveAttribute('href', '/projects/p-old')
    await expect(minis.nth(1), 'an archived project says so instead of suggesting a next step').toContainText('Archived')
    await expect(minis.nth(1)).not.toContainText('Next:')
    await expect(minis.nth(1)).toContainText('1 of 4 parts set. Edited 6 days ago.')
  })

  test('a mini with nothing set says so, instead of drawing the default colour', async ({ page }) => {
    watch(page, 'a designer with an untouched project')
    await signIn(page, { plan: 'free', projects: [complete(), blank()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const mini = othersOf(page).getByRole('link', { name: /Default Project/ })
    await expect(mini).toContainText('No palette yet')
    await expect(mini).toContainText('0 of 4 parts set. Edited 6 days ago.')
    await expect(mini).toContainText('Next: build the palette')
  })

  test('the icon is chosen on the project’s page, and reaches the account', async ({ page }) => {
    watch(page, 'a designer giving a project its own icon')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects/p-done')
    await expectRendered(page, '/projects/p-done')

    const picker = page.getByRole('group', { name: 'Icon for Violet Lime' })
    await expect(picker.getByRole('button')).toHaveCount(6)
    await picker.getByRole('button', { name: 'Use the flask icon' }).click()
    await expect(picker.getByRole('button', { name: 'Use the flask icon' })).toHaveAttribute('aria-pressed', 'true')
    // ON THE PROJECT, so it syncs to the account: not a per-browser key beside it.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test']?.[0]?.icon))
      .toBe('flask')
    await expect.poll(() => page.evaluate(() => window.__UIL4B_TEST_STORE__?.get('users/test-uid-free/projects/p-done')?.project?.icon),
      { message: 'the icon must reach the account', timeout: 10_000 }).toBe('flask')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-project-icons') || '{}')['p-done'])).toBeUndefined()

    // It survives a reload, and the workspace has no picker of its own.
    await page.reload()
    await expectRendered(page, '/projects/p-done')
    await expect(page.getByRole('button', { name: 'Use the flask icon' })).toHaveAttribute('aria-pressed', 'true')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByRole('button', { name: /Change icon/ }), 'the workspace no longer offers a picker').toHaveCount(0)
  })

  // An icon is not an edit of the design: "Edited 1 day ago" and the lead both read updatedAt, so choosing an
  // icon for an older project must leave both alone. The choice stamps iconAt instead, which is what the
  // account sync compares (held in tests/unit/project-sync.test.js).
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
    await expect(sheetOf(page, 'Violet Lime, latest project'), 'the icon made it the lead').toBeVisible()
    await expect(othersOf(page).getByRole('link', { name: /Harbour Rebrand/ })).toContainText('1 of 4 parts set. Edited 1 day ago.')
  })

  test('an edit that is not an icon still moves "last edited": renaming a project takes the lead', async ({ page }) => {
    watch(page, 'a designer renaming their older project')
    const older = half()
    await signIn(page, { plan: 'free', projects: [complete(), older] })
    await go(page, '/projects/p-half')
    await expectRendered(page, '/projects/p-half')
    await page.getByRole('button', { name: 'Actions for Harbour Rebrand' }).click()
    await page.getByRole('menuitem', { name: 'Rename', exact: true }).click()
    await page.getByRole('textbox', { name: /Rename Harbour Rebrand/i }).fill('Harbour Two')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const sheet = sheetOf(page, 'Harbour Two, latest project')
    await expect(sheet, 'a rename is an edit, so it leads').toBeVisible()
    await expect(sheet.getByText('1 of 4 parts set. Edited just now.')).toBeVisible()
    const stored = await page.evaluate(() => (JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test'] || []).find((p) => p.id === 'p-half'))
    expect(stored.iconAt, 'a rename does not stamp the icon').toBeUndefined()
  })
})

/* ── The Tints part: the page's one motion ────────────────────────────────── */

test.describe('the Tints part shows a dimmed preview until the person reaches for it', () => {
  // The preview ramp rests at 0.65 opacity under "Not set"; the full-strength ramp unrolls over it when the
  // Continue pill (when Tints is the next step) or the Tints part is hovered or focused, and holds.
  const fullRamp = (page) => sheetOf(page, 'Offcut, latest project').locator('.db-ramp:not(.rest)')

  test('hovering the Continue pill (Tints is next) unrolls the ramp once and holds it while it is reached for', async ({ page }) => {
    watch(page, 'a designer about to generate their tints')
    await signIn(page, { plan: 'free', projects: [noTints()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const sheet = sheetOf(page, 'Offcut, latest project')
    await expect(sheet.getByText('Not set')).toHaveCount(1)
    const clip = () => fullRamp(page).evaluate((el) => getComputedStyle(el).clipPath)
    const running = () => fullRamp(page).evaluate((el) => el.getAnimations().length)
    const UNROLLED = /inset\(0px\)|inset\(0%\)|none/
    expect(await clip(), 'at rest the full-strength ramp is rolled up').toMatch(/inset\(0px 0px 100%/)

    await sheet.getByRole('link', { name: /^Continue: generate the tints/ }).hover()
    await expect.poll(clip, { message: 'hovering the pill must unroll the ramp' }).toMatch(UNROLLED)
    await expect.poll(running, { message: 'the unroll finishes (it plays once)' }).toBe(0)
    expect(await clip(), 'with the animation done and the pointer still on the pill, the ramp holds').toMatch(UNROLLED)
    await expect(sheet.getByText('Not set'), '"Not set" stays visible while the ramp shows').toBeVisible()

    await page.mouse.move(5, 5)
    await expect.poll(clip, { message: 'moving away puts the ramp back at rest' }).toMatch(/inset\(0px 0px 100%/)
  })

  test('keyboard focus on the Open in Tint link unrolls it too', async ({ page }) => {
    watch(page, 'a keyboard user reaching the Tints part')
    await signIn(page, { plan: 'free', projects: [noTints()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const sheet = sheetOf(page, 'Offcut, latest project')
    await sheet.getByRole('link', { name: 'Open in Tint' }).focus()
    await expect.poll(() => fullRamp(page).evaluate((el) => getComputedStyle(el).clipPath), { message: 'focus must unroll the ramp' })
      .toMatch(/inset\(0px\)|inset\(0%\)|none/)
  })
})

/* ── Reaching every project: Find and Show all ────────────────────────────── */

test.describe('every project is reachable from the page', () => {
  test('four others show at first, with no Find; at four or fewer there is nothing to search', async ({ page }) => {
    watch(page, 'a Pro designer with a handful of projects')
    await signIn(page, { plan: 'pro', projects: many(5) })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(othersOf(page).getByRole('link')).toHaveCount(4)
    await expect(page.getByTestId('project-find')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Show all/ })).toHaveCount(0)
  })

  test('past four, Find and Show all appear; Show all lists them all and Show fewer goes back', async ({ page }) => {
    watch(page, 'a Pro designer with a dozen projects')
    await signIn(page, { plan: 'pro', projects: many(12) })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    // Offcut is the newest, so it leads; the other eleven are the minis.
    await expect(sheetOf(page, 'Offcut, latest project')).toBeVisible()
    await expect(othersOf(page).getByRole('link')).toHaveCount(4)
    await expect(page.getByTestId('project-find')).toBeVisible()

    await page.getByRole('button', { name: 'Show all 11' }).click()
    await expect(othersOf(page).getByRole('link')).toHaveCount(11)
    // The last in the list is the oldest, and it is a way into that project.
    await expect(othersOf(page).getByRole('link', { name: /Dovetail/ })).toHaveAttribute('href', '/projects/m-12')
    await page.getByRole('button', { name: 'Show fewer' }).click()
    await expect(othersOf(page).getByRole('link')).toHaveCount(4)
  })

  test('Find narrows by name, says when nothing matches, and Clear brings the list back', async ({ page }) => {
    watch(page, 'a Pro designer looking for one project among a dozen')
    await signIn(page, { plan: 'pro', projects: many(12) })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const find = page.getByRole('searchbox', { name: 'Find a project' })
    await find.fill('quarry')
    await expect(othersOf(page).getByRole('link'), 'matches by name, ignoring case, across all of them, not just the four shown').toHaveText([/^Quarry Road/])
    await expect(othersOf(page).getByRole('link')).toHaveAttribute('href', '/projects/m-5')
    await expect(page.getByRole('status').filter({ hasText: '1 project' }), 'the count is announced').toHaveCount(1)

    await find.fill('zzz')
    await expect(page.getByText('No project called “zzz”.')).toBeVisible()
    await expect(othersOf(page).getByRole('link')).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(find).toHaveValue('')
    await expect(find, 'Clear gives focus back to the field').toBeFocused()
    await expect(othersOf(page).getByRole('link')).toHaveCount(4)
  })

  test('a Free account with archived projects still reaches them, and all-archived does not strand it', async ({ page }) => {
    watch(page, 'a Free designer who archived everything')
    await signIn(page, { plan: 'free', projects: [archived(half('a-1', 'Old Harbour', ago(2 * DAY))), archived(complete('a-2', 'Old Violet', ago(3 * DAY)))] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    // No live project to lead, so the example kit starts the next one and the archived ones are listed.
    await expect(sheetOf(page, 'Start your first brand kit')).toBeVisible()
    await expect(othersOf(page).getByRole('link')).toHaveText([/^Old Harbour/, /^Old Violet/])
    await expect(othersOf(page).getByRole('link', { name: /Old Harbour/ })).toHaveAttribute('href', '/projects/a-1')
  })
})

/* ── The empty account ────────────────────────────────────────────────────── */

test.describe('a new account', () => {
  test('sees the example, one pill that starts a project, and is not told it has none', async ({ page }) => {
    watch(page, 'a new account on its first visit')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const sheet = sheetOf(page, 'Start your first brand kit')
    await expect(sheet.getByRole('heading', { level: 2, name: 'Start your first brand kit' })).toBeVisible()
    await expect(sheet).toContainText('This one is an example: Kerbside, a sample bike courier.')
    await expect(sheet, 'a signed-in account has an account already').not.toContainText('No account needed to start.')
    await expect(page.getByText('No projects yet')).toHaveCount(0)
    await expect(page.getByTestId('starter-card')).toHaveCount(0)
    await expect(page.getByTestId('first-palette-card')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Other projects' })).toHaveCount(0)
    await expect(page.locator('main'), 'projects sync to an account, so nothing "stays in the browser"').not.toContainText('Nothing leaves the browser')
    // One New project, and it is the sheet's: the title row does not repeat it.
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(1)
    await expect(sheet.getByRole('button', { name: 'New project' })).toBeVisible()
  })

  test('the pill goes straight into the Palette Builder on a fresh project', async ({ page }) => {
    watch(page, 'a new account starting its first project')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await sheetOf(page, 'Start your first brand kit').getByRole('button', { name: 'New project' }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || '{}'))
    expect(current.palette?.colors).toEqual(DEFAULT_DESIGN.palette.colors)
  })
})

/* ── The other states: loading, failed, offline ───────────────────────────── */

test.describe('the sheet says what is happening while the list is not there', () => {
  test('while the account’s list is on its way the sheet is a labelled placeholder, not the example', async ({ page }) => {
    watch(page, 'an account whose projects are slow to come')
    await signIn(page, { plan: 'free', projects: 0, slowReads: [{ path: 'sync/projects', ms: 4000 }] })
    await go(page, '/projects')
    const loading = page.getByRole('region', { name: 'Loading your projects' })
    await expect(loading).toBeVisible()
    await expect(loading).toHaveAttribute('aria-busy', 'true')
    await expect(loading.getByRole('status')).toHaveText('Loading your projects')
    await expect(page.getByRole('region', { name: 'Start your first brand kit' }), 'the example must not flash before the list answers').toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Example brand kit' })).toHaveCount(0)
    // When it answers there are no projects, so the empty state takes the place.
    await expect(sheetOf(page, 'Start your first brand kit')).toBeVisible({ timeout: 10_000 })
    await expect(loading).toHaveCount(0)
  })

  test('a list that will not load says so and offers Try again; the tools still work', async ({ page }) => {
    watch(page, 'an account whose projects could not be read')
    await signIn(page, { plan: 'free', projects: 0, deny: ['sync/projects'] })
    await go(page, '/projects')
    const failed = page.getByRole('alert').filter({ hasText: /Your projects didn.t load\./ })
    await expect(failed).toBeVisible({ timeout: 10_000 })
    await expect(failed).toContainText('Your tools still work. Try again in a moment.')
    await expect(failed.getByRole('button', { name: 'Try again' })).toBeVisible()
    // The failed sheet is not an empty one: no example, no allowance claims about projects it could not read.
    await expect(page.getByRole('region', { name: 'Start your first brand kit' })).toHaveCount(0)
    await expect(page.getByTestId('project-quota-note')).toHaveCount(0)
  })

  test('offline, the saved copy still shows with a note, and the project allowance says "as last saved"', async ({ page, context }) => {
    watch(page, 'a designer whose connection drops on the workspace')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('project-quota-note')).toHaveText('Projects 2 of 3.')

    await context.setOffline(true)
    await expect(page.getByRole('status').filter({ hasText: /You.re offline\. Showing the copy saved in this browser\./ })).toBeVisible()
    await expect(sheetOf(page, 'Violet Lime, latest project'), 'the saved copy is still the page').toBeVisible()
    await expect(page.getByTestId('project-quota-note')).toHaveText('Projects 2 of 3, as last saved.')
    await expect(page.getByTestId('ai-meter-note'), 'an AI allowance can’t be read offline').toHaveCount(0)

    await context.setOffline(false)
    await expect(page.getByRole('status').filter({ hasText: /You.re offline/ })).toHaveCount(0)
    await expect(page.getByTestId('greeting')).toBeVisible()
  })
})

/* ── The greeting and the name ask ────────────────────────────────────────── */

test.describe('the greeting', () => {
  test('a returning account is welcomed back by first name; a new one is welcomed', async ({ page }) => {
    watch(page, 'a returning designer, then a brand-new account')
    await signIn(page, { plan: 'free', projects: [complete()], displayName: 'Freya Free' })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('greeting')).toHaveText('Welcome back, Freya.')
    await expect(page.getByRole('button', { name: 'Add your name' }), 'a name is on the profile, so there is nothing to ask').toHaveCount(0)

    await signIn(page, { plan: 'free', projects: [complete()], displayName: 'Freya Free', creationTime: Date.now() - 60_000 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('greeting'), 'in the first minutes of an account it is Welcome, not Welcome back').toHaveText('Welcome, Freya.')
  })

  test('with no name on the profile: Add your name opens a small form; Escape returns focus to the button', async ({ page }) => {
    watch(page, 'an account that never gave a name')
    await signIn(page, { plan: 'free', projects: [complete()], noName: true })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('greeting')).toContainText('Welcome back.')

    const ask = page.getByRole('button', { name: 'Add your name' })
    await ask.click()
    const form = page.getByRole('dialog', { name: 'Your first name' })
    await expect(form).toBeVisible()
    await expect(form.getByRole('textbox', { name: 'Your first name' }), 'focus lands in the field').toBeFocused()
    await page.keyboard.press('Escape')
    await expect(form).toHaveCount(0)
    await expect(ask).toBeFocused()

    await ask.click()
    await expect(form).toBeVisible()
    await page.getByRole('heading', { level: 2, name: 'Tools and library' }).click()
    await expect(form, 'a press elsewhere closes it').toHaveCount(0)
  })

  test('Save puts the name in the greeting and sends it to the account', async ({ page }) => {
    watch(page, 'an account giving its name')
    const me = await signIn(page, { plan: 'free', projects: [complete()], noName: true })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'Add your name' }).click()
    await page.getByRole('textbox', { name: 'Your first name' }).fill('Ada')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByTestId('greeting')).toHaveText('Welcome back, Ada.')
    await expect(page.getByRole('button', { name: 'Add your name' })).toHaveCount(0)
    await expect(page.getByTestId('greeting'), 'focus goes to the greeting once the button is gone').toBeFocused()
    // The test account's store lives in the page and is re-declared on a reload, so read the write itself.
    await expect.poll(
      () => page.evaluate((uid) => window.__UIL4B_TEST_STORE__.get(`users/${uid}`)?.displayName ?? null, me.uid),
      { message: 'the name reached the account, not just this page' },
    ).toBe('Ada')
  })

  test('an empty name does not save', async ({ page }) => {
    watch(page, 'an account pressing Save on an empty field')
    await signIn(page, { plan: 'free', projects: [complete()], noName: true })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'Add your name' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Your first name' })).toBeVisible()
    await expect(page.getByTestId('greeting')).toContainText('Welcome back.')
    await expect(page.getByTestId('greeting')).not.toContainText(', ')
  })

  test('Not now hides the ask, and it stays hidden after a reload', async ({ page }) => {
    watch(page, 'an account that does not want to give a name')
    await signIn(page, { plan: 'free', projects: [complete()], noName: true })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'Add your name' }).click()
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByRole('button', { name: 'Add your name' })).toHaveCount(0)
    await expect(page.getByTestId('greeting')).toHaveText('Welcome back.')
    await page.reload()
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('greeting')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add your name' }), 'asked once, not on every visit').toHaveCount(0)
  })
})

/* ── The cap, New project ─────────────────────────────────────────────────── */

test.describe('at the free cap, New project explains the cap instead of opening', () => {
  test('the refusal is said in place, in ProjectContext’s words, with a way to the plans', async ({ page }) => {
    watch(page, 'a free account with no slots left starting a new project')
    const account = await signIn(page, { plan: 'free', projects: FREE_SAVE_LIMITS.projects })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const button = page.getByRole('button', { name: 'New project' })
    await expect(page.getByTestId('project-create-refusal'), 'nothing is said until it is asked').toHaveCount(0)
    await button.click()

    const refusal = page.getByTestId('project-create-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toHaveRole('dialog')
    await expect(refusal).toContainText(`Free plan saves up to ${FREE_SAVE_LIMITS.projects} projects`)
    const plans = refusal.getByRole('link', { name: 'See plans' })
    await expect(plans, 'every upgrade CTA goes to /plans').toHaveAttribute('href', '/plans')
    await expect(plans, 'focus moves into the dialog, onto the way out').toBeFocused()
    await expect(page, 'a project that could never be saved is not opened').toHaveURL(/\/projects$/)
    await expect(page.locator('.toast-success.show')).toHaveCount(0)
    expect((await storedProjects(page, account.email)).length).toBe(FREE_SAVE_LIMITS.projects)
  })

  test('Escape closes it and returns focus to New project; so does a press elsewhere, and New project again', async ({ page }) => {
    watch(page, 'a keyboard user at the cap')
    await signIn(page, { plan: 'free', projects: FREE_SAVE_LIMITS.projects })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const button = page.getByRole('button', { name: 'New project' })
    const refusal = page.getByTestId('project-create-refusal')

    await button.click()
    await expect(refusal).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(refusal).toHaveCount(0)
    await expect(button).toBeFocused()

    await button.click()
    await expect(refusal).toBeVisible()
    await page.getByRole('heading', { level: 1, name: 'Your workspace' }).click()
    await expect(refusal, 'a press elsewhere closes it').toHaveCount(0)

    await button.click()
    await expect(refusal).toBeVisible()
    await button.click()
    await expect(refusal, 'the button that opened it closes it').toHaveCount(0)
  })

  test('the Today line also says the Free limit is reached, with the way to the plans', async ({ page }) => {
    watch(page, 'a free account reading its allowance at the cap')
    await signIn(page, { plan: 'free', projects: FREE_SAVE_LIMITS.projects })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('project-quota-note')).toHaveText(`Projects ${FREE_SAVE_LIMITS.projects} of ${FREE_SAVE_LIMITS.projects}, the Free limit.`)
    await expect(othersOf(page).getByText(/Room for/), 'no room, so no "New project" row').toHaveCount(0)
    await expect(page.locator('.db-today').getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/plans')
  })

  test('one under the cap New project opens the Palette Builder, and the page says there is room for one more', async ({ page }) => {
    watch(page, 'a free account with a slot to spare')
    await signIn(page, { plan: 'free', projects: FREE_SAVE_LIMITS.projects - 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByText('Room for one more project on Free.')).toBeVisible()
    await page.getByRole('button', { name: 'New project', exact: true }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(page.getByTestId('project-create-refusal')).toHaveCount(0)
  })

  test('the "New project" row among the minis starts a project too', async ({ page }) => {
    watch(page, 'a free account using the row beside its other projects')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await othersOf(page).getByRole('button', { name: /^New project/ }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
  })

  test('Pro has no cap: New project opens the Palette Builder with a dozen projects saved', async ({ page }) => {
    watch(page, 'a Pro account starting a thirteenth project')
    await signIn(page, { plan: 'pro', projects: many(12) })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('button', { name: 'New project' }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
  })
})

/* ── Today: the clock and the allowances ──────────────────────────────────── */

test.describe('the Today line', () => {
  test('a local date and time from the viewer’s own machine, and it does not announce itself', async ({ page }) => {
    watch(page, 'a returning user glancing at the workspace')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const clock = page.locator('.db-today time')
    await expect(clock).toBeVisible()
    const iso = await clock.getAttribute('datetime')
    expect(Math.abs(Date.parse(iso) - Date.now()), 'it reads the machine’s own clock').toBeLessThan(5 * 60_000)
    const weekday = await page.evaluate(() => new Date().toLocaleDateString([], { weekday: 'long' }))
    await expect(clock).toContainText(weekday)
    await expect(clock).not.toHaveAttribute('aria-live', /.+/)
    await expect(clock).toHaveText(/, \d{1,2}[:.]\d{2}\s?(am|pm|AM|PM)?\.$/)
  })

  test('free: today’s busiest AI tool against its cap, and the project slots', async ({ page }) => {
    watch(page, 'a free account checking what it has left')
    await usedToday(page, 'alt-text', 2)
    await usedToday(page, 'prompts-ai', 1)
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByTestId('ai-meter-note')).toContainText(`AI generations 2 of ${AI_LIMITS.free.daily} today`)
    await expect(page.getByTestId('project-quota-note')).toHaveText(`Projects 2 of ${FREE_SAVE_LIMITS.projects}.`)
  })

  test('Pro: no project meter (there is no limit), its own AI cap', async ({ page }) => {
    watch(page, 'a Pro account on its workspace')
    await signIn(page, { plan: 'pro', projects: FREE_SAVE_LIMITS.projects + 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.db-today')).toContainText('Pro plan.')
    await expect(page.getByTestId('ai-meter-note')).toContainText(`0 of ${AI_LIMITS.pro.daily}`)
    await expect(page.getByTestId('project-quota-note'), 'Pro has no project limit to meter').toHaveCount(0)
  })
})

/* ── The plan line and the Pro perks ──────────────────────────────────────── */

test.describe('the plan line reads the real plan', () => {
  test('free: You’re on Free, the four Pro perks open on request, and See plans goes to /plans', async ({ page }) => {
    watch(page, 'a free account reading what Pro adds')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.getByText('You’re on Free.')).toBeVisible()
    const perksButton = page.getByRole('button', { name: 'What Pro adds' })
    await expect(perksButton).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByText('HCT editing and per-colour contrast'), 'the perks are behind the button').toHaveCount(0)
    await perksButton.click()
    await expect(perksButton).toHaveAttribute('aria-expanded', 'true')
    const perks = page.locator('#db-perks')
    await expect(perks.getByRole('listitem')).toHaveCount(4)
    const text = await perks.innerText()
    expect(text).toContain(`${AI_LIMITS.pro.daily} generations a day`)
    expect(text).toContain('HCT editing and per-colour contrast')
    expect(text).toContain('Unlimited projects')
    expect(text, 'there is no version history').not.toMatch(/version history/i)
    expect(text, 'there is no cancel flow').not.toMatch(/cancel/i)
    // The price is the live one in the visitor's currency; this run has no price service, so none shows. The
    // USD fallback must never appear on the page.
    await expect(page.locator('main'), 'no invented price').not.toContainText(/\$\s?\d/)
    await expect(page.getByRole('link', { name: 'See plans' }).last(), 'every upgrade CTA goes to /plans').toHaveAttribute('href', '/plans')
    await perksButton.click()
    await expect(perks).toHaveCount(0)
  })

  test('Pro: You’re on Pro with Manage plan, and nothing to sell', async ({ page }) => {
    watch(page, 'a Pro account on its workspace')
    await signIn(page, { plan: 'pro', projects: 2 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.getByText('You’re on Pro.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Manage plan' })).toHaveAttribute('href', '/settings')
    await expect(page.getByRole('button', { name: 'What Pro adds' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'See plans' })).toHaveCount(0)
  })
})

/* ── The shelf: Discover and Recent exports ───────────────────────────────── */

test.describe('New in Discover shows the newest palettes', () => {
  test('a Pro account sees the four with the latest added date, not the first four in the file', async ({ page }) => {
    watch(page, 'a designer looking for what is new')
    const dated = GALLERY_PALETTES.map((p, i) => ({ ...p, i })).filter((p) => p.added)
    expect(dated.length, 'the library carries no added dates to sort by').toBeGreaterThanOrEqual(4)
    const expected = dated
      .sort((a, b) => (a.added === b.added ? b.i - a.i : a.added < b.added ? 1 : -1))
      .slice(0, 4)
      .map((p) => p.name)
    await signIn(page, { plan: 'pro', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const picks = shelfOf(page).getByRole('link', { name: /, palette$/ })
    await expect(picks).toHaveCount(4)
    const names = (await picks.evaluateAll((n) => n.map((a) => a.getAttribute('aria-label')))).map((l) => l.replace(/, palette$/, ''))
    expect(names).toEqual(expected)
    expect(expected, 'these are not simply the head of the file').not.toEqual(GALLERY_PALETTES.slice(0, 4).map((p) => p.name))
  })

  test('a Free account sees the Pro ones too, labelled and opening the library, never as readable colours', async ({ page }) => {
    watch(page, 'a free designer seeing palettes that need Pro')
    await routePalettePreview(page)
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const shelf = shelfOf(page)
    const locked = shelf.getByRole('link', { name: /Pro palette, opens with Pro$/ })
    expect(await locked.count(), 'no locked palette for a Free account: the label check measured nothing').toBeGreaterThan(0)
    for (const link of await locked.all()) {
      await expect(link.getByText('Pro palette')).toBeVisible()
      await expect(link).toHaveAttribute('href', '/discover/palettes')
    }
  })
})

test.describe('the workspace lists recent exports', () => {
  const withExports = (page, list) => page.addInitScript((rows) => {
    try { localStorage.setItem('vs-recent-exports', JSON.stringify(rows)) } catch { /* private mode */ }
  }, list)
  const row = (id, filename, minutesAgo) => ({ id, tool: 'palette', toolLabel: 'Palette Builder', format: 'CSS', filename, bytes: 2048, at: Date.now() - minutesAgo * 60_000, projectId: null })

  test('the latest export is named with when it was made, and the tool it came from is a link', async ({ page }) => {
    watch(page, 'a designer coming back to find the file they exported')
    await withExports(page, [row('e1', 'violet-lime-tokens.css', 5)])
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const shelf = shelfOf(page)
    await expect(shelf.getByText('violet-lime-tokens.css').last()).toBeVisible()
    await expect(shelf).toContainText('5m ago')
    await expect(shelf.getByRole('link', { name: 'Recent exports' }), 'a tool-made export opens the tool').toHaveAttribute('href', '/create/palette')
    await expect(shelf.getByText('Nothing exported yet.')).toHaveCount(0)
  })

  test('the latest plus up to three more files show, newest first, and no more', async ({ page }) => {
    watch(page, 'a designer with a long export history')
    await withExports(page, ['one', 'two', 'three', 'four', 'five', 'six'].map((n, i) => row(`e${i}`, `${n}-tokens.css`, 5 + i * 10)))
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const shelf = shelfOf(page)
    for (const n of ['one', 'two', 'three', 'four']) await expect(shelf.getByText(`${n}-tokens.css`).last()).toBeVisible()
    await expect(shelf.getByText('five-tokens.css')).toHaveCount(0)
    await expect(shelf.getByText('six-tokens.css')).toHaveCount(0)
  })

  test('with nothing exported it says so and points at how exporting works', async ({ page }) => {
    watch(page, 'a new account that has exported nothing')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const shelf = shelfOf(page)
    await expect(shelf.getByText('Nothing exported yet.')).toBeVisible()
    await expect(shelf.getByRole('link', { name: 'How exporting works' })).toHaveAttribute('href', '/learn/help')
  })

  test('Icons and emoji and Image tools open their tools', async ({ page }) => {
    watch(page, 'a visitor browsing the shelf')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const shelf = shelfOf(page)
    await expect(shelf.getByRole('link', { name: 'Icons and emoji' })).toHaveAttribute('href', '/create/icons')
    await expect(shelf.getByRole('link', { name: 'Image tools' })).toHaveAttribute('href', '/create/file-converter')
    for (const [name, href] of [['Gradient', '/create/gradient'], ['Semantic Colour', '/create/semantic-color'], ['Contrast Checker', '/create/contrast'], ['Font Gallery', '/create/font-gallery']]) {
      await expect(shelf.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
    }
  })
})

/* ── The project page ─────────────────────────────────────────────────────── */

test.describe('a project’s own page', () => {
  test('the sheet opens it, and every slot is read off the saved design', async ({ page }) => {
    watch(page, 'a designer opening a finished project')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('link', { name: 'Open project, Violet Lime' }).click()
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

  test('a mini opens its project’s page', async ({ page }) => {
    watch(page, 'a designer opening one of their other projects')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await othersOf(page).getByRole('link', { name: /Harbour Rebrand/ }).click()
    await expect(page).toHaveURL(/\/projects\/p-half$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Harbour Rebrand' })).toBeVisible()
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

  // On a phone, tapping a project opens its page, and the page's next action opens the tool that finishes it,
  // with the project loaded.
  test('on a phone, tapping a project goes somewhere: its page, then the tool that finishes it', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await context.newPage()
    watch(page, 'a designer picking a project back up on their phone')
    await signIn(page, { plan: 'free', projects: [half()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await page.getByRole('link', { name: 'Open project, Harbour Rebrand' }).tap()
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

  test('an unknown project id says the project is not in the account, with a way to the workspace, instead of rendering nothing', async ({ page }) => {
    watch(page, 'a designer following a link to a project deleted elsewhere')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects/not-a-project')
    await expect(page.getByRole('heading', { level: 1, name: 'That project isn’t in your account' })).toBeVisible()
    await expect(page).toHaveURL(/\/projects\/not-a-project$/)
    await page.getByRole('link', { name: 'Open your workspace' }).click()
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
    const menu = page.getByRole('menu', { name: 'Actions for Harbour Rebrand' })
    await expect(menu).toBeVisible()
    for (const name of ['Duplicate', 'Rename', 'Copy CSS variables', 'Archive']) {
      await expect(menu.getByRole('menuitem', { name, exact: true })).toBeVisible()
    }
    await expect(menu.getByRole('menuitem', { name: /Delete/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Type scale/ })).toContainText('empty')
    await expect(menu.getByRole('menuitem', { name: /^Palette/ })).not.toContainText('empty')
  })

  test('Escape closes it and gives focus back to its trigger', async ({ page }) => {
    watch(page, 'a keyboard user opening the project menu')
    await signIn(page, { plan: 'free', projects: [complete()] })
    await go(page, '/projects/p-done')
    await expectRendered(page, '/projects/p-done')

    const trigger = page.getByRole('button', { name: 'Actions for Violet Lime' })
    await trigger.click()
    const menu = page.getByRole('menu', { name: 'Actions for Violet Lime' })
    await expect(menu).toBeVisible()
    // A pointer-opened menu holds focus on the panel itself; the first arrow moves to a row.
    await expect(menu).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem').first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})

/* ── An icon kept under the old key ───────────────────────────────────────── */

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

  // The workspace runs the same migration (useProjectIcons), so the icon is on the project without a visit to
  // the project's page.
  test('the workspace moves an icon kept under the old key onto the project straight away', async ({ page }) => {
    watch(page, 'a returning designer whose icon was stored the old way')
    await legacyIcon(page)
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect.poll(() => storedIcon(page), { timeout: 5000 }).toBe('compass')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-project-icons') || '{}')['p-done'])).toBeUndefined()
  })
})

/* ── Words ────────────────────────────────────────────────────────────────── */

test.describe('it is a project, not a kit', () => {
  // A kit is only the exported thing. The example kit for a visitor or a new account says "kit" (the design's
  // own words); a real project, on the workspace and on its own page, does not.
  test('neither the workspace nor a project page calls a saved project a kit', async ({ page }) => {
    watch(page, 'a designer reading their workspace and a project')
    await signIn(page, { plan: 'free', projects: [complete(), half()] })
    for (const path of ['/projects', '/projects/p-done', '/projects/p-half']) {
      await go(page, path)
      await expectRendered(page, path)
      const text = await page.locator('main').innerText()
      expect(text.length).toBeGreaterThan(200)
      expect(text, `${path} still says "kit"`).not.toMatch(/\bkit\b/i)
    }
  })
})
