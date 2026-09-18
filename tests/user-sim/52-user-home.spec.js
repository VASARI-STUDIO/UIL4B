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

  // THE FOLDER HALF OF THIS DESCRIBE IS GONE WITH THE FOLDERS. #458 wrote
  // three tests here: a folder that matches nothing, a search that matches
  // nothing, and both at once. Folders were dropped as an entitlement on
  // 2026-09-13 (see the note in Projects.jsx), so two of the three describe a
  // control that no longer exists and are deleted rather than rewritten to
  // assert on nothing. The search is now the only filter that can empty this
  // list, and #458's actual finding — that the sentence must name what emptied
  // the list, and the way out must be inside the panel — is still held by the
  // two tests that remain.
  test('a search that matches nothing quotes the search', async ({ page }) => {
    watch(page, 'somebody searching their projects for something that is not there')
    await open(page)

    await page.locator('.proj-search input').fill('zzqqxx')
    const panel = page.locator('.uh-filtered')
    await expect(panel).toContainText('No projects match “zzqqxx”.')
    // The regression #458 found, stated as the thing it must never say again:
    // an empty pair of curly quotes, for a search the reader never typed.
    await expect(panel, 'the panel quotes a search the reader never typed').not.toContainText('“”')
    // Announced: the grid emptying is otherwise silent.
    await expect(panel).toHaveAttribute('role', 'status')
  })

  test('the way out is IN the panel, and it clears the search', async ({ page }) => {
    // The escape has to be in the panel rather than only back up at the
    // control: the panel is what the reader is looking at, and at 390 the
    // search box is 200px above it.
    watch(page, 'somebody getting back to their work after filtering it away')
    await open(page)

    await page.locator('.proj-search input').fill('zzqqxx')

    const reset = page.locator('.uh-filtered').getByRole('button', { name: 'Clear filters' })
    await expect(reset).toBeVisible()
    const box = await reset.boundingBox()
    expect(box.height, 'the way out must be reachable by thumb').toBeGreaterThanOrEqual(24)

    await reset.click()
    await expect(page.locator('.uh-filtered')).toHaveCount(0)
    await expect(page.locator('.uh-grid .proj-card'), 'both projects must come back').toHaveCount(2)
    await expect(page.locator('.proj-search input')).toHaveValue('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE FIRST SCREEN OF THE PRODUCT, ON THE NARROWEST PHONE WE TEST
// ─────────────────────────────────────────────────────────────────────────────
// Since the founder stopped seeding a "Default Project" (73-founder-calls-0910
// § 2), the projects empty state is what every new signup sees first. On
// 2026-09-13 its only control was below the fold on every phone width in this
// suite, measured on pristine main:
//
//     390 x 844   button y=829..873, centre 851 — 29px of it past the edge
//     360 x 800   button y=842..886 — the whole control past the edge
//     320 x 844   button y=886..930 — 42px clear of the bottom
//     320 x 720   button y=886..930 — 166px clear of the bottom
//
// 73-founder-calls-0910 catches the 390 case, because `elementFromPoint`
// returns null outside the viewport. It cannot catch 320 or 360: it only runs
// at 390 and 1280. THIS is the test for the class, and it is why the fix has
// two halves — the card's padding stopped being a fixed 48 below 640 (which is
// what clears 390 on its own) and the NEXT|TIP band moved below the empty state
// (which is what clears 320 and 360, where the padding alone leaves the control
// 16px past the edge).
//
// WITHOUT SCROLLING. A page that scrolls is fine; a page whose ONLY control is
// off the first screen, on the first screen a new account ever sees, with
// nothing saying to scroll, is not.
//
// 320x568 IS HERE ON PURPOSE, and it is the tightest of the four. The suite's
// shortest viewport elsewhere is 320x720; 568 is the shortest phone screen
// still in real use, and after the fix the control clears it by 19px. That
// margin is the reason the card's padding is part of the fix and not a tidy-up:
// put the fixed 48 back and the control goes 29px past the edge here, while
// every taller screen stays green. If a future edit lengthens this panel, this
// is the width that says so first, and it prints the numbers when it does.
test.describe('the projects empty state puts its control on the first screen', () => {
  for (const [w, h] of [[320, 568], [320, 720], [360, 800], [390, 844]]) {
    test(`${w}x${h}: "Create your first project" is above the fold and hit-testable`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: w, height: h } })
      const page = await context.newPage()
      watch(page, `a new account opening their projects on a ${w}px phone`)
      await signIn(page, { plan: 'free', projects: 0 })
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      const cta = page.getByRole('button', { name: 'Create your first project' })
      await expect(cta).toBeVisible()

      // Measured off the page rather than off boundingBox(), so the numbers in
      // the failure are the ones a person on that phone would be looking at.
      const m = await cta.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          vh: window.innerHeight,
          scrolled: Math.round(window.scrollY),
          hit: at === el || el.contains(at),
        }
      })

      expect(m.scrolled, 'the measurement must be of the FIRST screen').toBe(0)
      expect(m.bottom,
        `the empty state's only control runs y=${m.top}..${m.bottom} in a ${m.vh}px viewport — `
        + `${m.bottom - m.vh}px of it is below the fold. This is the first screen a new account `
        + 'sees, and nothing on it says to scroll.',
      ).toBeLessThanOrEqual(m.vh)
      expect(m.hit, 'the control is on the first screen but something paints over it').toBe(true)

      await context.close()
    })
  }
})

/* ── The dashboard's date and time ────────────────────────────────────────── */

test.describe('the dashboard says what day it is, from the viewer\u2019s own machine', () => {
  // Founder request, 2026-09-18: "in the dashboard page lets show a date and
  // time make it connect to their browser / computer."
  test('the clock renders a real local date and time, and does not announce itself', async ({ page }) => {
    watch(page, 'a returning user glancing at the dashboard')
    await go(page, FIXTURE)
    await expectRendered(page, FIXTURE)

    const clock = page.locator('.uh-clock')
    await expect(clock, 'the dashboard shows no date or time').toBeVisible()

    const read = await clock.evaluate((el) => ({
      tag: el.tagName,
      text: el.textContent,
      dt: el.getAttribute('datetime'),
      live: el.getAttribute('aria-live'),
      tabular: getComputedStyle(el).fontVariantNumeric,
    }))

    // A <time> with a machine-readable value, not a styled <span>.
    expect(read.tag).toBe('TIME')
    expect(read.dt, 'no machine-readable datetime').toMatch(/^\d{4}-\d{2}-\d{2}T/)

    // The rendered value must be THIS machine's, not the build's. Parsing the
    // dateTime and comparing it to the runner's own clock is what proves the
    // component read the browser rather than a timestamp baked in at build
    // time — the failure this design exists to prevent, because 39 route
    // shells are prerendered and a formatted date would have been frozen into
    // them.
    const skewMs = Math.abs(Date.now() - Date.parse(read.dt))
    expect(skewMs, `the clock is ${Math.round(skewMs / 1000)}s from this machine's time`)
      .toBeLessThan(5 * 60 * 1000)

    // It says both halves.
    expect(read.text.trim().length, 'the clock rendered empty').toBeGreaterThan(6)
    expect(read.text).toMatch(/\d/)

    // NO LIVE REGION, deliberately. A live region here would interrupt a screen
    // reader every minute to deliver something the reader did not ask for and
    // already has from their own OS.
    expect(read.live, 'the clock announces itself to screen readers every minute').toBeNull()

    // Tabular figures, so the line does not reflow as the minute ticks over.
    expect(read.tabular).toContain('tabular-nums')
  })
})
