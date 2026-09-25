// WHAT A PERSON SEES WHEN SYNC FAILS, AND WHEN TWO DEVICES DISAGREED.
//
// `project-sync-single-document` (P1) and `firestore-sync-last-writer-wins`
// (P2), 2026-09-06 engineering review. The merge rules and the document shape
// are proved against a fake db in tests/unit/project-sync.test.js — what CANNOT
// be proved there is that any of it is wired to the page, and the review's own
// finding was that the failure had no user-facing state at all. So this file
// asserts the states, rendered, on the real app.
//
// ── WHY THESE TESTS ARE POSSIBLE NOW AND WERE NOT BEFORE ────────────────────
//
// The signed-in double (#407) answers every write from memory, so a write
// through it always succeeds and the failure branch was unreachable. `signIn`
// now takes `deny: [...]` — path substrings that answer with a FirebaseError
// instead of data, which is what a rules refusal actually is. And
// `window.__UIL4B_TEST_STORE__` exposes the store the app pushed into, so
// "the delete propagated" is read off what reached the account rather than
// inferred from what left the screen.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
//
// Verified by breaking the CALL SITE in src/contexts/ProjectContext.jsx, not
// the helpers:
//   · restoring `catch {}` around the push  → "sync failure is said out loud"
//     and "the size ceiling is named" both fail; the page keeps rendering.
//   · dropping the reportSyncNotice() call  → "a conflict is explained" fails
//     while the newer project still wins, which is the point: the merge was
//     never the missing half, the sentence was.
//   · dropping setAllTombstones() from deleteProject → "a delete reaches the
//     account" fails while the project still leaves the grid.
//   · not passing `tombstones` to writeRemoteProjects → the same test fails
//     with the project gone locally and resurrected remotely.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

/** What the account keeps locally, read the way the product stores it. */
function stored(page, email) {
  return page.evaluate(
    (e) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[e] || [],
    email,
  )
}

/** What actually reached the account's sync document. */
function pushed(page, uid) {
  return page.evaluate(
    (u) => window.__UIL4B_TEST_STORE__?.get(`users/${u}/sync/projects`) || null,
    uid,
  )
}

/** A saved project, shaped the way ProjectContext.saveProject writes them. */
function projectRecord(id, name, updatedAt, extra = {}) {
  return {
    id,
    name,
    design: { palette: { colors: ['#101010', '#F0F0F0'] } },
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt,
    ...extra,
  }
}

const OLDER = '2026-09-01T09:00:00.000Z'
const NEWER = '2026-09-05T09:00:00.000Z'
const DELETED_AT = '2026-09-06T09:00:00.000Z'

/** A project's card on the workspace, by its exact name. The card's open
 *  link is what marks a project as on screen; its actions live on the
 *  project's own page. */
function projectCard(page, name) {
  return page.locator('.uh-card-name').filter({ has: page.locator('.uh-card-title', { hasText: new RegExp(`^${name}$`) }) })
}

test.describe('sync has a visible state, in both directions', () => {
  test('a healthy signed-in session says NOTHING — the control for everything below', async ({ page }) => {
    // Every assertion in this file is of the form "a banner appeared". That is
    // trivially satisfiable by a banner that is always there, so the first
    // thing to establish is that it is not.
    watch(page, 'a designer whose projects are syncing normally')
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')

    await expect(projectCard(page, 'Seeded Project 1'),
      'the page has to have actually rendered, or "no banner" means nothing').toBeVisible()
    // Past the push debounce (1500 ms) with room to spare — if a healthy push
    // reported a failure, this is where it would show up.
    await page.waitForTimeout(2500)
    await expect(page.locator('[data-testid="sync-notice"]'),
      'a working sync must be silent').toHaveCount(0)
  })

  test('a sync failure is said out loud instead of stopping in silence', async ({ page }) => {
    // THE P1. The old code wrapped this write in `catch {}`: past the 1 MiB
    // ceiling every push failed, the user kept editing, localStorage kept
    // working, and nothing anywhere said sync had stopped.
    watch(page, 'a designer whose account has started refusing their projects')
    await signIn(page, {
      plan: 'free',
      projects: 2,
      deny: ['sync/projects'],
    })
    await go(page, '/projects')

    const notice = page.locator('[data-testid="sync-notice"]')
    await expect(notice, 'a refused sync must reach the user').toBeVisible({ timeout: 10_000 })
    await expect(notice).toHaveAttribute('data-sync-level', 'error')
    await expect(notice).toHaveRole('alert')

    const said = (await notice.innerText()).trim()
    expect(said, 'and must say the work is not lost before anything else')
      .toMatch(/saved on this device/i)
    expect(said, 'and must name the cause rather than being a generic error')
      .toMatch(/refused/i)
    await expect(notice.getByRole('button', { name: 'Try again' }),
      'and must offer a way out').toBeVisible()

    // The other half of the promise the sentence makes: the projects really are
    // still there. A banner that said this while the grid had emptied would be
    // a worse lie than the silence it replaced.
    await expect(projectCard(page, 'Seeded Project 1')).toBeVisible()
    expect((await stored(page, 'free.user@uil4b.test')).length).toBe(2)
  })

  test('a REFUSED PULL is reported on its own, not left to the push to notice', async ({ page }) => {
    // Separable on purpose, and this test exists because mutation found the
    // hole: with the whole path denied, swallowing the pull's error changed
    // nothing — the push failed a moment later and reported it, so the pull's
    // own `catch` was never being exercised. Refusing only the READ isolates it,
    // and Firestore rules really can allow a write and refuse a read.
    watch(page, 'a designer whose account will not hand back what it holds')
    const account = await signIn(page, {
      plan: 'free',
      projects: 2,
      deny: [{ path: 'sync/projects', ops: ['get'] }],
    })
    await go(page, '/projects')

    const notice = page.locator('[data-testid="sync-notice"]')
    await expect(notice, 'a pull that was refused must be reported by the pull')
      .toBeVisible({ timeout: 10_000 })
    await expect(notice).toHaveAttribute('data-sync-level', 'error')

    // POSITIVE CONTROL that the denial really was read-only: the WRITE went
    // through, so the banner above cannot be the push complaining.
    await expect
      .poll(() => pushed(page, account.uid).then((d) => d?.list?.length ?? null),
        { message: 'the write half must still be working', timeout: 10_000 })
      .toBe(2)
  })

  test('the size ceiling is named in kilobytes, before Firestore rejects it', async ({ page }) => {
    // The measured shape of the P1: a brand logo is capped at 32 KB, so about
    // thirty logo projects fill the single document. Rather than send that and
    // swallow the rejection, the write is refused and the refusal is priced.
    watch(page, 'a Pro designer with thirty brand-kit projects')
    const logo = `data:image/png;base64,${'A'.repeat(32 * 1024)}`
    const heavy = Array.from({ length: 30 }, (_, i) => {
      const p = projectRecord(`big-${i}`, `Brand ${i}`, OLDER)
      p.design.brandLogo = logo
      return p
    })
    await signIn(page, { plan: 'pro', projects: heavy })
    await go(page, '/projects')

    const notice = page.locator('[data-testid="sync-notice"]')
    await expect(notice, 'the ceiling must announce itself').toBeVisible({ timeout: 15_000 })
    const said = (await notice.innerText()).trim()
    expect(said, 'and must be priced, so the user can act on it')
      .toMatch(/\d+\s*KB of a 1 MB limit/i)
    expect(said, 'and must say what to do about it').toMatch(/archiv|delet/i)
    expect(said).toMatch(/saved on this device/i)

    // Nothing was destroyed to produce this state.
    expect((await stored(page, 'pro.user@uil4b.test')).length).toBe(30)
  })

  test('a conflict is EXPLAINED, and the newer copy is the one kept', async ({ page }) => {
    // The P2 in the shape a project user meets it: two devices, one project,
    // and the screen changing under them. Nothing is discarded — the newer side
    // wins — but a screen that rearranges itself without a word is how people
    // stop trusting sync.
    watch(page, 'a designer opening their laptop after editing on a second machine')
    const account = await signIn(page, {
      plan: 'free',
      projects: [projectRecord('p1', 'Autumn Rebrand', OLDER)],
      docs: {
        'users/test-uid-free/sync/projects': {
          list: [projectRecord('p1', 'Autumn Rebrand v2', NEWER)],
          v: 1,
          _updatedAt: Date.parse(NEWER),
        },
      },
    })
    await go(page, '/projects')

    const notice = page.locator('[data-testid="sync-notice"]')
    await expect(notice, 'the swap must be explained').toBeVisible({ timeout: 10_000 })
    await expect(notice).toHaveAttribute('data-sync-level', 'notice')
    const said = (await notice.innerText()).trim()
    expect(said, 'and must name the project that moved').toMatch(/Autumn Rebrand v2/)
    expect(said, 'and must say where it came from').toMatch(/another device/i)

    // And the merge really did keep the newer side, on screen and on disk.
    await expect(projectCard(page, 'Autumn Rebrand v2')).toBeVisible()
    const kept = await stored(page, account.email)
    expect(kept.length, 'a conflict must not multiply the project').toBe(1)
    expect(kept[0].name).toBe('Autumn Rebrand v2')
  })

  test('a project deleted on another device leaves this one too', async ({ page }) => {
    watch(page, 'a designer who deleted a project on their phone this morning')
    const account = await signIn(page, {
      plan: 'free',
      projects: [
        projectRecord('p1', 'Thrown Away', OLDER),
        projectRecord('p2', 'Still Working On It', OLDER),
      ],
      docs: {
        'users/test-uid-free/sync/projects': {
          list: [
            projectRecord('p1', 'Thrown Away', OLDER),
            projectRecord('p2', 'Still Working On It', OLDER),
          ],
          deleted: { p1: DELETED_AT },
          v: 1,
          _updatedAt: Date.parse(DELETED_AT),
        },
      },
    })
    await go(page, '/projects')

    await expect(projectCard(page, 'Thrown Away'),
      'the delete must propagate — v1 resurrected it on every pull').toHaveCount(0, { timeout: 10_000 })
    await expect(projectCard(page, 'Still Working On It'),
      'and must take exactly the one project it was told to').toBeVisible()

    const kept = await stored(page, account.email)
    expect(kept.map((p) => p.id)).toEqual(['p2'])
  })

  test('and one deleted HERE reaches the account as a delete', async ({ page }) => {
    // The other direction, and the half no DOM assertion can see: a delete that
    // clears the local list and pushes nothing looks identical on screen and
    // comes back on the next device to sync.
    watch(page, 'a designer deleting a finished project for good')
    const account = await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')

    // POSITIVE CONTROL: the push works at all before we delete anything, so a
    // missing tombstone below cannot be a push that never happened.
    await expect
      .poll(() => pushed(page, account.uid).then((d) => d?.list?.length ?? null),
        { message: 'the account must be receiving this list in the first place', timeout: 10_000 })
      .toBe(2)

    // The ⋯ menu lives on the project's own page since the workspace rebuild.
    await projectCard(page, 'Seeded Project 1').click()
    await page.getByRole('button', { name: 'Actions for Seeded Project 1' }).click()
    await expect(page.getByRole('group', { name: 'Actions for Seeded Project 1' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete…', exact: true }).click()
    const field = page.getByRole('textbox', { name: /Type the project name to confirm deleting Seeded Project 1/i })
    await field.fill('Seeded Project 1')
    await page.getByRole('button', { name: 'Permanently delete' }).click()

    await expect
      .poll(() => pushed(page, account.uid).then((d) => Object.keys(d?.deleted || {})),
        { message: 'the delete must be pushed as a delete, not merely as an absence', timeout: 10_000 })
      .toEqual(['seed-1'])

    const doc = await pushed(page, account.uid)
    expect(doc.list.map((p) => p.id), 'and the surviving project must still be there')
      .toEqual(['seed-2'])
  })

  test('the notice can be dismissed, and dismissing it does not undo the merge', async ({ page }) => {
    watch(page, 'a designer who has read the conflict message and wants it gone')
    await signIn(page, {
      plan: 'free',
      projects: [projectRecord('p1', 'Autumn Rebrand', OLDER)],
      docs: {
        'users/test-uid-free/sync/projects': {
          list: [projectRecord('p1', 'Autumn Rebrand v2', NEWER)],
          v: 1,
          _updatedAt: Date.parse(NEWER),
        },
      },
    })
    await go(page, '/projects')

    const notice = page.locator('[data-testid="sync-notice"]')
    await expect(notice).toBeVisible({ timeout: 10_000 })
    await notice.getByRole('button', { name: 'Dismiss sync message' }).click()
    await expect(notice).toHaveCount(0)
    await expect(projectCard(page, 'Autumn Rebrand v2'),
      'dismissing the message must not put the older copy back').toBeVisible()
  })
})
