// THE USER HOME, and the front door in front of it.
//
// Two halves, tested two ways, because the runner cannot sign anybody in:
// Firebase's hosts are blocked here (see EXPECTED_NOISE in helpers.js, which
// names identitytoolkit).
//
//   ROUTING is testable end to end anyway, because the decision is made from a
//   localStorage hint rather than from Firebase — which is the whole point of
//   utils/sessionHint.js. Setting the hint through addInitScript reproduces
//   exactly what a returning visitor's browser looks like on a cold load.
//
//   THE SIGNED-IN PAGE is covered through the mounted fixture, the same way
//   12-ui-system-builder and the type-save flow are.
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'

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
    await expect(page.locator('.home')).toBeVisible()
    await expect(page.locator('.uh-tip')).toHaveCount(0)
  })

  test('a returning visitor is taken to the User Home, and never sees the sales page', async ({ page }) => {
    watch(page, 'a signed-in visitor opening the site')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page, 'the root must hand a returning visitor to the User Home').toHaveURL(/\/projects$/)
    // THE FLASH TEST. The sales page must never have rendered on the way: the
    // decision is made in the first render, from the hint, before Firebase has
    // loaded at all. If it were made after auth resolved, .home would paint
    // first and this would catch it.
    await expect(page.locator('.home')).toHaveCount(0)
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
    await expect(page.locator('.home')).toBeVisible()

    await withSessionHint(page)
    await go(page, '/home')
    await expect(page, '/home must never redirect for a signed-in visitor either').toHaveURL(/\/home$/)
    await expect(page.locator('.home')).toBeVisible()
  })

  test('the nav Home control reaches the sales page from inside the app', async ({ page }) => {
    watch(page, 'a signed-in visitor clicking Home')
    await withSessionHint(page)

    await go(page, '/')
    await expect(page).toHaveURL(/\/projects$/)
    await page.getByRole('link', { name: 'UIL4B home' }).first().click()
    await expect(page, 'the Home control must land on the sales page and stay there').toHaveURL(/\/home$/)
    await expect(page.locator('.home')).toBeVisible()
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

test.describe('the User Home does not wait on auth', () => {
  test('the tip and the starters are on screen without any session at all', async ({ page }) => {
    // The anti-blocking property, observable: everything that does not depend on
    // knowing WHO you are renders regardless of whether auth has resolved. If
    // this page ever starts gating its whole body on a session, this fails.
    watch(page, 'a visitor reading the User Home')
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.locator('.uh-tip')).toBeVisible()
    const tip = (await page.locator('.uh-tip').innerText()).trim()
    expect(tip.length, 'the daily tip must have real text in it').toBeGreaterThan(40)

    await expect(page.locator('.uh-starter')).toHaveCount(4)
    await expect(page.locator('.uh-band-go')).toBeVisible()
  })

  test('every starter points INWARD, at a real tool, with values loaded', async ({ page }) => {
    watch(page, 'a visitor opening a suggested starter')
    await go(page, '/projects')
    // Before the measurement, not after: a lazy chunk that fails to load leaves
    // the ErrorBoundary card, which satisfies every other readiness check and
    // would make this report “0 starters” as if it were a product defect.
    await expectRendered(page, '/projects')

    const hrefs = await page.locator('.uh-starter').evaluateAll(
      (nodes) => nodes.map((n) => n.getAttribute('href')),
    )
    expect(hrefs).toHaveLength(4)
    for (const href of hrefs) {
      expect(href, 'a starter must not leave the product').not.toMatch(/^https?:/)
      expect(href, 'a starter must open a Create tool with its values in the URL')
        .toMatch(/^\/create\/(gradient\?gs=|palette\?c=)/)
    }
    // And the destination is real, not a 404 shell.
    await go(page, hrefs[0])
    await expect(page).toHaveURL(/\/create\/(gradient|palette)/)
  })

  test('the day\u2019s suggestions are stable, not reshuffled on every visit', async ({ page }) => {
    watch(page, 'a visitor reloading the User Home')
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const first = await page.locator('.uh-starter-name').allInnerTexts()
    const tip = await page.locator('.uh-tip').innerText()

    await go(page, '/projects')
    await expectRendered(page, '/projects')
    expect(await page.locator('.uh-starter-name').allInnerTexts()).toEqual(first)
    expect(await page.locator('.uh-tip').innerText()).toEqual(tip)
  })
})

test.describe('a project, read at a glance', () => {
  test('each card says what is IN the project, not just its name', async ({ page }) => {
    watch(page, 'a returning user scanning their projects')
    await go(page, FIXTURE)
    await expectRendered(page, FIXTURE)

    const complete = page.locator('.uh-card').filter({ hasText: 'Violet Lime' })
    // Both families, the scale and the counts — the founder's "palette, fonts,
    // scale ... rather than a name".
    await expect(complete.locator('.uh-card-meta')).toContainText('Fraunces')
    await expect(complete.locator('.uh-card-meta')).toContainText('Manrope')
    await expect(complete.locator('.uh-card-meta')).toContainText('17px')
    await expect(complete.locator('.uh-card-meta')).toContainText('5 colours')
    await expect(complete.locator('.uh-card-meta')).toContainText('6 tints')

    // The palette is drawn as the palette: hard stops, every colour present.
    const art = await complete.locator('.uh-card-art').evaluate((n) => getComputedStyle(n).backgroundImage)
    expect(art, 'the card art must be the real palette, not a two-stop blend').toContain('linear-gradient')
    expect((art.match(/rgb\(/g) || []).length, 'every colour in the palette should be drawn')
      .toBeGreaterThanOrEqual(5)
  })

  test('a project with colours but no type scale SAYS SO', async ({ page }) => {
    // The founder's own example, verbatim from the request.
    watch(page, 'a user checking what is still missing')
    await go(page, FIXTURE)

    const half = page.locator('.uh-card').filter({ hasText: 'Harbour Rebrand' })
    await expect(half.locator('.uh-parts-label')).toHaveText(/No type scale, fonts or tints/)
    await expect(half.locator('.uh-part.is-done')).toHaveCount(1)

    const empty = page.locator('.uh-card').filter({ hasText: 'Default Project' })
    await expect(empty.locator('.uh-parts-label')).toHaveText('Nothing built yet')
    await expect(empty.locator('.uh-part.is-done')).toHaveCount(0)

    const done = page.locator('.uh-card').filter({ hasText: 'Violet Lime' })
    await expect(done.locator('.uh-parts-label')).toHaveText('All four parts')
    await expect(done.locator('.uh-part.is-done')).toHaveCount(4)
  })

  test('the progress reading is announced, not left to four dots', async ({ page }) => {
    watch(page, 'a screen-reader user on the User Home')
    await go(page, FIXTURE)
    await expectRendered(page, FIXTURE)

    const dots = page.locator('.uh-card').filter({ hasText: 'Harbour Rebrand' }).locator('.uh-parts-dots')
    const label = await dots.getAttribute('aria-label')
    expect(label).toContain('1 of 4 parts built')
    expect(label).toContain('Palette built')
    expect(label).toContain('Type scale empty')
  })
})

test.describe('quick actions', () => {
  test('the menu opens, groups the actions, and marks the empty tools', async ({ page }) => {
    watch(page, 'a user acting on a project from the card')
    await go(page, FIXTURE)

    await page.getByRole('button', { name: 'Actions for Harbour Rebrand' }).click()
    const menu = page.getByRole('group', { name: 'Actions for Harbour Rebrand' })
    await expect(menu).toBeVisible()

    for (const name of ['Duplicate', 'Rename', 'Copy CSS variables', 'Archive']) {
      await expect(menu.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await expect(menu.getByRole('button', { name: /Delete/ })).toBeVisible()
    // "Open straight into a specific tool", with the unbuilt ones marked so the
    // choice is informed before the navigation rather than after it.
    await expect(menu.getByRole('button', { name: /Type scale/ })).toContainText('empty')
    await expect(menu.getByRole('button', { name: /^Palette/ })).not.toContainText('empty')
  })

  test('Escape closes the menu and gives focus back to its trigger', async ({ page }) => {
    watch(page, 'a keyboard user opening a card menu')
    await go(page, FIXTURE)

    const trigger = page.getByRole('button', { name: 'Actions for Violet Lime' })
    await trigger.click()
    const menu = page.getByRole('group', { name: 'Actions for Violet Lime' })
    await expect(menu).toBeVisible()
    // Focus is INSIDE the panel, so the first Tab does not walk the whole page.
    await expect(menu.locator(':focus')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('an action runs against the project whose menu it was in', async ({ page }) => {
    watch(page, 'a user duplicating a project')
    await go(page, FIXTURE)

    await page.getByRole('button', { name: 'Actions for Harbour Rebrand' }).click()
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
    await expect(page.locator('#fixture-log')).toHaveText('Duplicated fx-half')

    await page.getByRole('button', { name: 'Actions for Violet Lime' }).click()
    await page.getByRole('button', { name: 'Type scale' }).click()
    await expect(page.locator('#fixture-log')).toHaveText('Open fx-complete in /create/type-scale')
  })

  test('deleting still asks for the name, so a menu click cannot destroy work', async ({ page }) => {
    watch(page, 'a user deleting a project')
    await go(page, FIXTURE)

    await page.getByRole('button', { name: 'Actions for Default Project' }).click()
    await page.getByRole('button', { name: /Delete/ }).click()

    const card = page.locator('.uh-card').filter({ hasText: 'Default Project' })
    const confirm = card.getByRole('button', { name: 'Permanently delete' })
    await expect(confirm, 'the destructive button must start disabled').toBeDisabled()
    // Still there — arming the confirmation must not have deleted anything.
    await expect(page.locator('#fixture-log')).not.toHaveText(/Deleted/)

    await card.getByRole('textbox', { name: /Type the project name/ }).fill('Default Project')
    await expect(confirm).toBeEnabled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FILTERED TO NOTHING — the page's OTHER empty state
// ─────────────────────────────────────────────────────────────────────────────
// Found on 2026-09-13 by sweeping the class of the 390px empty-state defect
// rather than by reading the file, which is the only reason it was found at
// all: it is one tap from a chip row and it had been shipping.
//
// TWO filters can empty this list — the search box and the folder chips — and
// the sentence named only the search. Measured at 390 and at 1280, tapping
// "Marketing" on an account with no marketing projects rendered:
//
//     No projects match “”.
//
// An empty pair of curly quotes, in a panel that held no control at all. The
// reader was told nothing matched a search they had not run, and left to work
// out for themselves which of two controls they had set — the dead end
// LibraryEmpty's own comment says every Library surface exists to forbid.
//
// These run against the REAL route with a real session rather than the fixture
// page, because the filters, the sentence and the reset are the page's own and
// the fixture does not have them.
test.describe('a filter that matches nothing says which filter, and undoes itself', () => {
  const open = async (page) => {
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.uh-grid .proj-card')).toHaveCount(2)
  }

  test('a folder with nothing in it names the FOLDER, not an empty search', async ({ page }) => {
    watch(page, 'somebody tapping a folder chip that holds none of their work')
    await open(page)

    await page.getByRole('button', { name: 'Marketing', exact: true }).click()
    const panel = page.locator('.uh-filtered')
    await expect(panel).toBeVisible()

    // The regression, stated as the thing it must never say again.
    await expect(panel, 'the panel quotes a search the reader never typed').not.toContainText('“”')
    await expect(panel).toContainText('No projects in Marketing.')
    // Announced: the grid emptying is silent otherwise, and at 390 this panel
    // opens at y=815 in an 844px viewport.
    await expect(panel).toHaveAttribute('role', 'status')
  })

  test('a search that matches nothing still quotes the search', async ({ page }) => {
    watch(page, 'somebody searching their projects for something that is not there')
    await open(page)

    await page.locator('.proj-search input').fill('zzqqxx')
    await expect(page.locator('.uh-filtered')).toContainText('No projects match “zzqqxx”.')
  })

  test('both filters at once name both', async ({ page }) => {
    watch(page, 'somebody who set a folder and then searched inside it')
    await open(page)

    await page.getByRole('button', { name: 'Marketing', exact: true }).click()
    await page.locator('.proj-search input').fill('zzqqxx')
    await expect(page.locator('.uh-filtered')).toContainText('No projects match “zzqqxx” in Marketing.')
  })

  test('the way out is IN the panel, and it clears both filters', async ({ page }) => {
    // The escape has to be in the panel rather than only back up at the
    // controls: the panel is what the reader is looking at, and at 390 the
    // chips and the search box are 200px above it.
    watch(page, 'somebody getting back to their work after filtering it away')
    await open(page)

    await page.getByRole('button', { name: 'Marketing', exact: true }).click()
    await page.locator('.proj-search input').fill('zzqqxx')

    const reset = page.locator('.uh-filtered').getByRole('button', { name: 'Clear filters' })
    await expect(reset).toBeVisible()
    const box = await reset.boundingBox()
    expect(box.height, 'the way out must be reachable by thumb').toBeGreaterThanOrEqual(24)

    await reset.click()
    await expect(page.locator('.uh-filtered')).toHaveCount(0)
    await expect(page.locator('.uh-grid .proj-card'), 'both projects must come back').toHaveCount(2)
    await expect(page.locator('.proj-search input')).toHaveValue('')
    await expect(page.locator('.proj-folder-chip.active')).toHaveText('All')
  })
})
