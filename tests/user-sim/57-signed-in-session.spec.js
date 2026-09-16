// THE SIGNED-IN HALF OF THE PRODUCT, RENDERED.
//
// This file is the wiring test for `signIn()` in helpers.js, and it is written
// as a wiring test on purpose. The lesson this repository has paid for four
// times is that a correct fix can ship beside a test that exercises the helper
// in isolation — the sharpest case left the unit suite at 1363/1363 while three
// browser tests failed. So nothing here asserts anything ABOUT the helper.
// Every test drives the real app and asserts on a gate the product owns:
//
//   RequireAuth              /admin admits the session and turns a stranger away
//   canSaveProjects          the free-plan allowance appears at all
//   the project cap          the fourth save is refused, at three, by name
//   useSubscription().isPro  Pro has no cap, and Settings says the plan out loud
//   the export gate          the book exports for Pro and raises a wall for free
//   the root routing         a signed-in visitor never sees the sales page
//
// Break the double and these fail. Break the CALL SITE — the plugin in
// vite.config.js that installs it — and every one of them fails, which is the
// mutation this was verified with.
//
// ── WHY THIS IS NOT A FIXTURE PAGE ─────────────────────────────────────────
//
// The repository already had three mounted fixtures (ui-system-pro.jsx,
// type-save.jsx, user-home.jsx). Each mounts COMPONENTS with props, and each
// had to hand-build the page around them — fixtures/user-home.jsx writes its
// own <h1>Projects</h1> and its own stats list. That is the right shape for
// measuring a component and the wrong shape for measuring a GATE: a prop named
// `isPro` proves the branch renders, not that a Pro user reaches it.
//
// These tests load the real index.html, and every route, provider and gate is
// the shipped one. The only thing supplied is the answer Firebase would have
// given. See tests/user-sim/fixtures/test-session.js.
//
// ── THE POSITIVE CONTROLS ──────────────────────────────────────────────────
//
// Every claim of ABSENCE here is paired with a rendered presence, because this
// suite's recorded failure mode is an assertion that is trivially true of a
// page that never loaded. "No quota note" is paired with the Pro project list
// actually being on screen; "no sales page" is paired with a signed-out visitor
// seeing one at the same URL; "no Firebase request" is paired with a reading
// that could ONLY have come from the entitlement document.
import { test, expect } from './base.js'
import { go, watch, signIn, firebaseRequests } from './helpers.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'

const CAP = FREE_SAVE_LIMITS.projects

/** Drive the real Save Current form on /projects, and report what it said. */
async function saveAProject(page, name) {
  await page.getByRole('button', { name: 'Save Current' }).click()
  await page.getByPlaceholder(/Brand v1/i).fill(name)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  // The page answers in words either way — the saved name in the toast, or
  // the refusal ProjectContext threw, held in the form under the field it
  // refused (69-flow-audit moved it there from the toast, where it wore the
  // success tick and was gone in 1.8s). Reading the sentence rather than the
  // project count is deliberate: it is what the user is actually given.
  const answer = page.locator('[data-testid="project-save-refusal"], .toast.show').first()
  await expect(answer).toBeVisible()
  return (await answer.innerText()).trim()
}

test.describe('a signed-in free account', () => {
  test(`is told its allowance, and the save cap refuses the ${CAP + 1}th by name`, async ({ page }) => {
    watch(page, 'a free account that has filled its three project slots')
    const account = await signIn(page, { plan: 'free', projects: CAP })
    await go(page, '/projects')

    // canSaveProjects — the allowance lives BELOW that early return, so its
    // presence is proof the session was accepted, not just that a page loaded.
    const note = page.getByTestId('project-quota-note')
    await expect(note, 'a signed-in free account must be told its allowance').toBeVisible()
    await expect(note).toContainText(`all ${CAP} projects on the free plan`)

    const said = await saveAProject(page, 'One Too Many')
    expect(said, 'the cap must refuse the save in the product’s own words')
      .toContain(`Free plan saves up to ${CAP} projects`)

    // And it must have refused rather than merely complained: the store is
    // still at the cap.
    const stored = await page.evaluate(
      (email) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[email]?.length ?? -1,
      account.email,
    )
    expect(stored, 'nothing may be written once the cap is reached').toBe(CAP)
  })

  test('the same form saves happily one under the cap — the control', async ({ page }) => {
    // Without this, the test above passes for a broken Save button, a missing
    // input, or a form that never submits. It is the difference between "the
    // cap refused it" and "nothing happened".
    watch(page, 'a free account with a slot to spare')
    const account = await signIn(page, { plan: 'free', projects: CAP - 1 })
    await go(page, '/projects')

    const said = await saveAProject(page, 'Room To Spare')
    expect(said, 'a save under the cap must succeed').toContain('Room To Spare')

    const stored = await page.evaluate(
      (email) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[email]?.length ?? -1,
      account.email,
    )
    expect(stored, 'the save must actually be written').toBe(CAP)
  })
})

test.describe('a signed-in Pro account', () => {
  test('has no cap, no allowance note, and its projects on screen', async ({ page }) => {
    watch(page, 'a Pro account with more projects than the free plan allows')
    const account = await signIn(page, { plan: 'pro', projects: CAP })
    await go(page, '/projects')

    // THE CONTROL FOR THE ABSENCE BELOW. If the page had not rendered, or the
    // session had not been accepted, there would be no project list either and
    // "no quota note" would mean nothing.
    await expect(page.getByText('Seeded Project 1').first(), 'the Pro project list must render')
      .toBeVisible()
    await expect(page.getByTestId('project-quota-note'), 'Pro has no allowance to be told about')
      .toHaveCount(0)

    const said = await saveAProject(page, 'Beyond The Free Cap')
    expect(said, 'Pro must save past the free cap').toContain('Beyond The Free Cap')

    const stored = await page.evaluate(
      (email) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[email]?.length ?? -1,
      account.email,
    )
    expect(stored, 'Pro saves past the free cap for real').toBe(CAP + 1)
  })

  test('Settings names the live plan, which can only come from the entitlement document', async ({ page }) => {
    watch(page, 'a Pro subscriber checking their subscription')
    await signIn(page, { plan: 'pro' })
    await go(page, '/settings')
    // /settings opens on Account (#436 follow-up 5); the plan is said on the
    // Subscription panel.
    await page.getByRole('tab', { name: 'Subscription' }).click()

    // /settings is a signed-in surface that had no rendered coverage at all.
    // This sentence is rendered from `subscription.status` on users/{uid},
    // read over a Firestore snapshot — so it is also the positive control for
    // the no-network test below: nothing else in the app could produce it.
    await expect(page.getByText(/You're on UIL4B Pro/i)).toBeVisible()
    await expect(page.getByText(/Billed monthly/i)).toBeVisible()
  })

  test('a free account sees the free subscription panel at the same URL — the control', async ({ page }) => {
    watch(page, 'a free account checking their subscription')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.getByRole('tab', { name: 'Subscription' }).click()
    await expect(page.getByText(/You're on UIL4B Pro/i)).toHaveCount(0)
    // Something must be there, or the assertion above is about a blank page.
    await expect(page.getByRole('heading', { name: /Subscription/i }).first()).toBeVisible()
  })
})

test.describe('the export gate, driven', () => {
  // Popups: the book generator opens the document in a window and raises the
  // print dialog. `print` is neutered for every page in the context so a real
  // dialog can never hold a worker.
  async function openExportPanel(page) {
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    await expect(page.getByRole('dialog', { name: /Export your design system/i })).toBeVisible()
    await page.getByRole('radio', { name: /Design system book/i }).click()
  }

  test('a free account is walled, by the wall that names this document', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addInitScript(() => { window.print = () => {} })
    const page = await context.newPage()
    watch(page, 'a free account trying to export the design system book')
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    await openExportPanel(page)

    await expect(
      page.locator('.exp-fmt-pro').first(),
      'the book row must carry its Pro badge for a free account',
    ).toBeVisible()

    const action = page.getByRole('button', { name: /Unlock with Pro/i })
    await expect(action, 'the button must say what is about to happen').toBeVisible()

    const popups = []
    context.on('page', (p) => popups.push(p))
    await action.click()

    // The canonical upgrade modal, carrying the copy written for THIS document
    // rather than the generic one — that distinction is what P-001 bought.
    await expect(page.getByRole('dialog', { name: /Export the design system book/i })).toBeVisible()
    expect(popups, 'a free account must not reach the artefact').toHaveLength(0)
    await context.close()
  })

  test('a Pro account reaches the document itself', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addInitScript(() => { window.print = () => {} })
    const page = await context.newPage()
    watch(page, 'a Pro subscriber exporting the design system book')
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/palette')
    await openExportPanel(page)

    await expect(page.locator('.exp-fmt-pro'), 'Pro sees no Pro badges').toHaveCount(0)

    const [book] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /^Export book$/i }).click(),
    ])
    await book.waitForLoadState('domcontentloaded')
    // The generated artefact, not a page about it. buildDesignSystemBook titles
    // the document "<project> — Design System".
    await expect(book).toHaveTitle(/Design System/i)
    await expect(book.locator('.cv-title')).toBeVisible()
    await context.close()
  })
})

test.describe('the front door', () => {
  test('a returning signed-in visitor lands on /projects and never sees the sales page', async ({ page }) => {
    watch(page, 'a signed-in designer opening the site from a bookmark')

    // Sample every frame from the first one, so a sales page that appeared and
    // was replaced is caught. Polling after the fact would miss exactly the
    // flash this asserts against.
    await page.addInitScript(() => {
      window.__salesPageSeen = false
      const tick = () => {
        if (document.querySelector('.home-hero')) window.__salesPageSeen = true
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    // returning:false, so the hint this depends on is NOT seeded by the test.
    // The app writes it itself through useSessionHint() on the first load, and
    // the second load is what is being measured. Seeding it here would prove
    // nothing but that the seed worked.
    await signIn(page, { plan: 'free', returning: false })
    await go(page, '/plans')
    expect(
      await page.evaluate(() => localStorage.getItem('vs-session')),
      'useSessionHint() must have recorded the resolved session',
    ).toBe('1')

    await go(page, '/')
    await expect(page, 'a signed-in visitor belongs on the User Home').toHaveURL(/\/projects$/)
    expect(
      await page.evaluate(() => window.__salesPageSeen),
      'the sales page must never have painted on the way',
    ).toBe(false)
  })

  test('a signed-out visitor gets the sales page at the same URL — the control', async ({ page }) => {
    // The test above is worthless without this: `.home-hero` never appearing is
    // also what a broken selector looks like.
    watch(page, 'a stranger opening the site')
    await go(page, '/')
    await expect(page.locator('.home-hero'), 'the sales page must still be what a stranger gets')
      .toBeVisible()
  })
})

test.describe('RequireAuth and RequireAdmin', () => {
  test('the admin dashboard opens for the founder', async ({ page }) => {
    watch(page, 'the founder opening the admin dashboard')
    await signIn(page, { admin: true })
    await go(page, '/admin')
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()
  })

  test('and turns a signed-out stranger away — the control', async ({ page }) => {
    watch(page, 'a stranger trying the admin URL')
    await go(page, '/admin')
    await expect(page, 'RequireAuth must send a stranger to the login route').toHaveURL(/\/login/)
  })

  test('the internal style guide is admin-only, not merely signed-in-only', async ({ page }) => {
    // RequireAdmin is a different gate from RequireAuth and was unreachable
    // from a signed-out session, so nothing had ever rendered it. It sends a
    // non-admin to `/` rather than to /login — they ARE signed in, and a login
    // wall would be a lie about why they cannot be here. `/` then does its own
    // job and lands them on the User Home, which is the correct end state and
    // not a second redirect to assert against separately.
    watch(page, 'an ordinary Pro account trying the internal style guide')
    await signIn(page, { plan: 'pro' })
    await go(page, '/style-guide')
    await expect(page, 'a non-admin must not stay on the style guide')
      .not.toHaveURL(/\/style-guide/)
    await expect(page, 'and must not be told to sign in for something they cannot have')
      .not.toHaveURL(/\/login/)
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('and it opens for the founder — the control', async ({ page }) => {
    // Without this, the test above passes for a /style-guide route that has
    // been deleted, renamed, or is broken for everyone.
    watch(page, 'the founder opening the internal style guide')
    await signIn(page, { admin: true })
    await go(page, '/style-guide')
    await expect(page).toHaveURL(/\/style-guide$/)
  })
})

test('a signed-in session makes no request to any Firebase host', async ({ page }) => {
  // The suite already proves not one request reaches accounts.google.com. That
  // guarantee only ever covered a signed-out session, because a signed-out
  // session never asks Firebase anything: `user` is null, so the profile read,
  // the entitlement snapshot and the sync document are all skipped. Being
  // signed in is the first time any of them run.
  //
  // THE POSITIVE CONTROL IS THE POINT. "Nothing escaped" is trivially true of a
  // page that never rendered, so this walks three signed-in surfaces and reads
  // a value off each that could only have come through the Firestore path —
  // the entitlement on /settings, the project list on /projects, the free
  // quota on the alt-text tool.
  watch(page, 'a Pro subscriber walking the signed-in surfaces')
  const seen = firebaseRequests(page)
  await signIn(page, { plan: 'pro', projects: 2 })

  await go(page, '/settings')
  await page.getByRole('tab', { name: 'Subscription' }).click()
  await expect(page.getByText(/You're on UIL4B Pro/i)).toBeVisible()

  await go(page, '/projects')
  await expect(page.getByText('Seeded Project 1').first()).toBeVisible()

  // /create/alt-text's actual tool — named in `audit-coverage-not-run` as
  // unreachable, and unreachable is what it was.
  await go(page, '/create/alt-text')
  await expect(page.getByRole('heading', { name: /Alt Text Generator/i })).toBeVisible()

  expect(seen, `requests reached Firebase hosts: ${seen.join(', ')}`).toHaveLength(0)
})

test('signing out from a signed-in session really signs out', async ({ page }) => {
  // The other end of the session, and the one that would rot silently: a
  // double that accepted signOut() and kept the user would leave every later
  // assertion in a spec looking at somebody who should have gone.
  //
  // Asserted WITHOUT navigating, deliberately. A reload re-runs the init
  // script and re-declares the session — which is correct (that is what a
  // stored Firebase session does too) and would make a navigation-based check
  // read as a failed sign-out. What is measured is the live swap.
  watch(page, 'a designer signing out from their account settings')
  await signIn(page, { plan: 'pro' })
  await go(page, '/settings')
  await page.getByRole('tab', { name: 'Subscription' }).click()
  await expect(page.getByText(/You're on UIL4B Pro/i)).toBeVisible()

  await page.getByRole('tab', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()

  // The page swaps to its signed-out state in place, and the app's own
  // useSessionHint() clears the first-paint hint — so the next cold load would
  // land on the sales page rather than the User Home.
  await expect(
    page.getByRole('tab', { name: 'Account' }),
    'the Account section only exists for a signed-in visitor, so it must go',
  ).toHaveCount(0)
  await expect(
    page.getByText(/You're on UIL4B Pro/i),
    'and the Pro entitlement must go with the session that carried it',
  ).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('vs-session')),
      { message: 'useSessionHint() must clear the hint when the session ends' })
    .toBe(null)
})


/* ── THE ADMIN'S OWN TWO SURFACES ──────────────────────────────────────────
 *
 * Both of these are here rather than in a unit test for the same reason the
 * file's header gives: a correct fix can ship beside a test that exercises a
 * helper in isolation. One measures a lazy chunk actually arriving in a
 * browser; the other measures a control actually not being on a page. Neither
 * question can be answered by reading source.
 */

test('the Pipeline tab asks an admin-gated endpoint, and there is no backlog chunk left to fetch', async ({ page }) => {
  // THIS TEST USED TO ASSERT THE OPPOSITE, AND IT WAS RIGHT AT THE TIME.
  //
  // It watched for /assets/pipeline-*.js, required it ABSENT before the Pipeline
  // tab was opened and PRESENT after — which is exactly what #420's deferral
  // bought, and it drove the real page to prove it. What nobody asked was who
  // ELSE could fetch that URL. The answer was everybody: 824,007 bytes of
  // engineering notes, 319,711 gzip, served from /assets with no login, no
  // cookie and no Authorization header, including the literal text of a
  // Firestore rule as it stood before #472 closed it. The chunk was the
  // defect, not its schedule.
  //
  // src/data/pipeline.js is not a client module at all now. PipelineBoard reads
  // GET /api/ai?backlog=1, gated on a verified administrator by requireAdmin()
  // in api/_lib/admin.js.
  //
  // THE TWO HALVES ARE STILL EACH OTHER'S CONTROL, the other way round. "No
  // chunk request" is also what a URL matcher that matches nothing looks like —
  // so the endpoint request, watched by a different matcher, has to fire. And
  // "the endpoint was asked" would stay true even if a chunk were fetched
  // alongside it, so the chunk watcher has to stay empty.
  //
  // 78-backlog-not-public.spec.js is where the board is proven to RENDER. It has
  // to stub the endpoint: `vite preview` serves dist/ as static files and runs
  // no Vercel functions, so nothing in this suite can answer /api/*.
  watch(page, 'the founder opening the backlog board')

  const backlogChunk = []
  const backlogRequests = []
  page.on('request', (r) => {
    if (/\/assets\/pipeline-[^/]*\.js/.test(r.url())) backlogChunk.push(r.url())
    if (r.url().includes('/api/ai?backlog=1')) backlogRequests.push(r)
  })

  await signIn(page, { admin: true })
  await go(page, '/admin')
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('tab', { name: 'Pipeline' }).click()

  // CONTROL: the tab really opened and really ran its effect. Without this every
  // absence below would also be true of a click that did nothing.
  await expect.poll(() => backlogRequests.length, {
    message: 'the Pipeline tab never asked /api/ai?backlog=1, so it has no source of data at all — '
      + 'or this matcher no longer matches the URL Admin.jsx builds, in which case everything below '
      + 'passes for free',
  }).toBeGreaterThan(0)

  // It asks as SOMEBODY. An anonymous GET is answered 404 by requireAdmin, which
  // is the whole point of the data having moved behind it.
  expect(
    await backlogRequests[0].headerValue('authorization'),
    'the backlog request carried no Authorization header, so the board is asking an admin-gated '
    + 'endpoint anonymously and would be refused in production',
  ).toMatch(/^Bearer .+/)

  expect(
    backlogChunk,
    'a /assets/pipeline-*.js request was made, so the engineering backlog is a client module again '
    + 'and is being served to anyone who asks — see tests/unit/admin-chunk-carries-no-backlog.test.js',
  ).toHaveLength(0)
})

test('UI System mode is unreachable for an ADMIN too, which is not what the docs said', async ({ page }) => {
  // [ui-system-mode-unreachable-for-admins-too]. README, CLAUDE-adjacent docs
  // and this suite's own 12-ui-system-builder.spec.js all described UI System
  // mode as "admin-only", which sends the next agent looking for an auth
  // harness that would prove nothing. The harness now exists (#407) and this is
  // it being used to settle the question by RENDERING the page rather than by
  // reading PaletteBuilder.jsx.
  //
  // The truth: PaletteBuilder.jsx removed BOTH doors on the founder's 2026-09-05
  // instruction - the "UI System / Admin" breadcrumb and the "Build UI system"
  // toolbar button - and nothing imports components/UiSystemBuilder.jsx, so it
  // is in no chunk of any build. The surface is UNWIRED, not gated.
  //
  // THE POSITIVE CONTROLS MATTER MORE THAN THE ABSENCE HERE. "No button" is
  // also what a page that never loaded looks like, and what a session that is
  // not really an admin looks like. So: this session is proven to be an admin
  // by /admin admitting it, and the palette page is proven to have rendered by
  // its own seed field being on screen, before anything is asserted absent.
  watch(page, 'the founder looking for UI System mode')
  await signIn(page, { admin: true })

  await go(page, '/admin')
  await expect(
    page.getByText(/ADMIN MODE/i).first(),
    'control: this session must really be the founder, or an absence below means nothing',
  ).toBeVisible()

  await go(page, '/create/palette')
  await expect(
    page.getByRole('textbox', { name: 'Seed colour hex' }),
    'control: the Palette Builder must have rendered, or an absence below means nothing',
  ).toBeVisible()

  for (const name of [/Build UI system/i, /Open UI System Pro mode/i, /UI System/]) {
    await expect(
      page.getByRole('button', { name }),
      `an admin can see a "${name}" control on the Palette Builder, so the surface IS reachable and `
      + 'the docs corrected alongside this test are now the thing that is wrong',
    ).toHaveCount(0)
  }
  await expect(
    page.getByRole('heading', { name: 'UI System Builder' }),
    'the UI System Builder rendered for an admin, so it is gated rather than unwired',
  ).toHaveCount(0)
})
