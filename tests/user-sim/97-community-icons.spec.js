// SUBMITTING AN ICON TO THE COMMUNITY — rendered, not inferred.
//
// Founder, 2026-09-18: "people can submit icons to the community they just need
// to be reviewed - all submissions of any sorts are tied to the account not
// browser."
//
// tests/unit/community-icon-submission.test.js proves the RULES about what may
// be submitted. It cannot prove any of the following, because all four are
// facts about a rendered page:
//
//   1. THE GATE. A signed-out visitor never reaches an icon form at all.
//   2. THE ARTWORK IS DRAWN, AND IT IS DRAWN IN AN <img>. The unit test scans
//      for `dangerouslySetInnerHTML`; only a browser can say what element the
//      submitted markup actually ended up inside, and whether a <script> smuggled
//      into an accepted file ever became a node in this document.
//   3. IT DOES NOT JOIN THE BROWSE GRID. Nothing outside src/components/admin
//      reads the approved queue, so an icon that turned up among the browsable
//      cards would be the page implying a publication that has not happened.
//   4. THE ACCOUNT HOLDS IT. Submitted in one session, still there after the
//      browser's own storage is wiped and the page reloaded — which is the
//      founder's requirement stated as something a test can watch.
//
// ── MUTATION — all five applied, seen red, and restored byte-exact ─────────
//
//   src/pages/Community.jsx
//     · `onClick={openIconSubmit}` → `onClick={openIconForm}`, i.e. the gate is
//       skipped and the form opens for anybody
//         kills 1 — "a signed-out visitor never reaches the icon form"
//     · `{myIcons.length > 0 && …}` → `{false && …}`
//         kills 2 — the queued-list test AND the account test, which is the
//         right blast radius: both are assertions about that section
//     · `all = [...mine, ...COMMUNITY_DESIGNS]` → `[...mine, ...myIcons, …]`
//         kills exactly 1 — "…and is NOT in the browse grid". Only one, and
//         that is the measurement of how narrow the "not published" guard is:
//         every other test on this page passes while unreviewed work sits in
//         the grid, which is why the assertion had to be written down.
//     · `listMySubmissions(uid, 'icon')` → `Promise.resolve([])`
//         kills 1 — "a submission this browser has never seen is shown"
//   src/utils/iconSubmission.js
//     · `iconPreviewDataUri` drops encodeURIComponent
//         kills 1 — "the artwork is drawn inside an <img>, never as markup"
//
// The unit file records seven more against the same feature, including the
// hazard list and the size cap.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { COMMUNITY_SUBMIT_REASONS } from '../../src/utils/submitIntent.js'

// A real icon, in the shape every pack in this app ships: a viewBox, a path,
// and `currentColor` — which is why the preview has to paint the root.
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'

// The same artwork with a script in it. It is not exotic: an SVG exported from a
// compromised template, or hand-edited, looks exactly like this.
const HOSTILE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>window.__pwned = 1</script><path d="M12 5v14"/></svg>'

async function openIconForm(page) {
  await page.getByRole('button', { name: /Submit icon/i }).first().click()
  const dialog = page.getByRole('dialog', { name: /Submit an icon/i })
  await expect(dialog, 'the icon form must open for a signed-in member').toBeVisible()
  return dialog
}

async function fillIcon(dialog, { name, svg }) {
  await dialog.getByRole('textbox', { name: /^Name$/i }).fill(name)
  await dialog.locator('textarea').fill(svg)
}

test.describe('community icon submissions', () => {
  test('a signed-out visitor never reaches the icon form', async ({ page }) => {
    watch(page, 'a stranger who pressed Submit icon')
    await go(page, '/community')
    await page.getByRole('button', { name: /Submit icon/i }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog, 'pressing Submit icon must open something').toBeVisible()
    // The gate, not the form. If the form itself opened, this name would match.
    await expect(page.getByRole('dialog', { name: /Submit an icon/i }),
      'a signed-out visitor must not be handed a submission form').toHaveCount(0)

    // The intent, carried across the sign-in — the sentence that makes the gate
    // a step rather than an interruption. LoginPopup derives its heading from
    // the reason string Community.jsx passes.
    await expect(dialog, 'the gate must name what the visitor was in the middle of')
      .toContainText(/about to submit an icon/i)

    // Read from the array the product renders them from, so editing the copy
    // cannot leave this asserting the old words.
    for (const reason of COMMUNITY_SUBMIT_REASONS) {
      await expect(dialog, 'every reason an account is needed must be shown')
        .toContainText(reason.slice(0, 40))
    }
  })

  test('a signed-in member gets the form, and is told the limits before choosing a file', async ({ page }) => {
    // The control for the test above: without it, that one passes on a build
    // that shows the sign-in wall to everybody.
    watch(page, 'a member submitting an icon')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')
    const dialog = await openIconForm(page)

    await expect(dialog, 'and must not be asked to sign in again')
      .not.toContainText(/about to submit an icon/i)

    // Mobbin, Coda "Upload an icon": what is accepted and how big is printed
    // BEFORE the picker, never sprung afterwards as an error.
    await expect(dialog, 'the accepted format and the ceiling must be stated up front')
      .toContainText(/SVG file · up to \d+ KB/i)

    // And the form must be honest about what happens next. Nothing appears
    // publicly on submission — there is no public feed.
    await expect(dialog, 'the form must say the submission is queued for review')
      .toContainText(/queued for review/i)
    await expect(dialog, 'and must not promise it will be published')
      .not.toContainText(/appears publicly|in the library/i)
  })

  test('hostile markup is refused with the file still open', async ({ page }) => {
    watch(page, 'a member pasting an SVG with a script in it')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')
    const dialog = await openIconForm(page)
    await fillIcon(dialog, { name: 'Sneaky', svg: HOSTILE })

    await expect(dialog, 'an SVG carrying a script must be named as such, not silently dropped')
      .toContainText(/contains a <script> tag/i)
    // No preview, because there is nothing safe to preview.
    await expect(dialog.locator('img'), 'nothing hostile may be drawn at all').toHaveCount(0)

    // Pressing Submit anyway must not send it.
    await dialog.getByRole('button', { name: /^Submit icon$/i }).click()
    await expect(dialog, 'the form stays open on a refusal').toBeVisible()
    // And it never became a node in this document, which is the thing the
    // <img> rule exists to guarantee.
    expect(await page.evaluate(() => window.__pwned ?? null),
      'the submitted script executed').toBe(null)
    expect(await page.locator('svg script').count(),
      'submitted markup became live nodes in the page').toBe(0)
  })

  test('the artwork is drawn inside an <img>, never as markup', async ({ page }) => {
    watch(page, 'a member checking their icon before sending it')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')
    const dialog = await openIconForm(page)
    await fillIcon(dialog, { name: 'Plus', svg: ICON })

    // TWO tiles: the same artwork on a light and a dark ground. Mobbin, Discord
    // "Upload a file" — a two-theme product previews on both, and every icon in
    // this app is drawn in currentColor, so one ground answers nothing.
    const tiles = dialog.locator('.ch-iconprev img')
    await expect(tiles, 'the preview must show both grounds').toHaveCount(2)

    const srcs = await tiles.evaluateAll(els => els.map(e => e.getAttribute('src')))
    for (const src of srcs) {
      expect(src, 'the preview must be a self-contained data URI').toMatch(/^data:image\/svg\+xml;utf8,/)
      expect(src, 'nothing in the URI may be readable as markup').not.toMatch(/[<>"']/)
    }
    expect(new Set(srcs).size, 'the two tiles must differ — one ink each').toBe(2)

    // The artwork itself is untouched: currentColor survives, so an approved
    // icon still themes wherever it is eventually used.
    expect(decodeURIComponent(srcs[0]), 'the submitter\'s artwork was altered').toContain('stroke="currentColor"')

    // And it is an <img>, not an inlined <svg> from the submission. The page's
    // OWN icons are inline svgs, so the count is taken inside the preview.
    expect(await dialog.locator('.ch-iconprev svg').count(),
      'submitted markup was inlined into the page').toBe(0)
  })

  test('a submitted icon is listed as queued, and is NOT in the browse grid', async ({ page }) => {
    watch(page, 'a member who has just submitted an icon')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')
    const dialog = await openIconForm(page)
    await fillIcon(dialog, { name: 'Plus mark', svg: ICON })
    await dialog.getByRole('button', { name: /^Submit icon$/i }).click()
    await expect(dialog, 'a good submission closes the form').toHaveCount(0)

    const queued = page.locator('section', { has: page.getByRole('heading', { name: 'Your submissions' }) })
    await expect(queued, 'the submission must be listed').toContainText('Plus mark')
    await expect(queued, 'and labelled with where it actually is').toContainText(/Pending review/i)
    await expect(queued, 'the section must say it is not published').toContainText(/not published/i)

    // THE LINE THAT MATTERS. The browse grid is what a visitor reads as "the
    // community". An unreviewed submission in it is a publication that never
    // happened.
    await expect(page.locator('.ch-grid'), 'an unreviewed icon must not be in the browse grid')
      .not.toContainText('Plus mark')
  })

  test('a submission this browser has never seen is shown, because the ACCOUNT holds it', async ({ page }) => {
    // The founder's requirement, stated as something a test can watch. The
    // strongest form of "tied to the account, not the browser" is a submission
    // made somewhere else entirely: this browser has no record of it, and the
    // page shows it anyway.
    //
    // WHY IT IS SHAPED THIS WAY RATHER THAN AS "submit, wipe, reload". That was
    // the first draft and it CANNOT be written: the suite's Firestore double is
    // an in-memory Map rebuilt from its seed on every page load
    // (tests/user-sim/fixtures/test-session.js), so a reload destroys the
    // account copy along with the local one and the test would fail on a
    // perfectly correct build. Seeding the document instead asserts the same
    // property — the list is read from the account — without asserting
    // something about the harness.
    watch(page, 'a member who submitted an icon on their phone')
    await signIn(page, {
      plan: 'free',
      docs: {
        'community-submissions/from-a-phone': {
          kind: 'icon',
          name: 'Made elsewhere',
          authorUid: 'test-uid-free',
          authorName: 'Freya Free',
          status: 'pending',
          payload: { svg: ICON, author: 'Freya Free' },
          createdAt: '2026-09-18T09:00:00.000Z',
        },
        // Somebody else's, in the same collection. The queue is readable by
        // every signed-in user by design (firestore.rules `allow read: if
        // isSignedIn()`), so "only mine" is a property of the QUERY and has to
        // be asserted rather than assumed.
        'community-submissions/not-yours': {
          kind: 'icon',
          name: 'Belongs to someone else',
          authorUid: 'test-uid-stranger',
          authorName: 'A Stranger',
          status: 'pending',
          payload: { svg: ICON },
          createdAt: '2026-09-18T10:00:00.000Z',
        },
      },
    })
    await go(page, '/community')

    // This browser holds nothing. Whatever renders below came off the account.
    // The key EXISTS and is an empty list — readIconSubmissions writes the
    // sanitised result back, same as utils/communitySubmissions.js — so the
    // assertion is on its contents, not on its absence.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vs-icon-submissions') || '[]')),
      'the local store must be empty for this assertion to mean anything').toEqual([])

    const queued = page.locator('section', { has: page.getByRole('heading', { name: 'Your submissions' }) })
    await expect(queued, 'a submission made on another device must be listed here')
      .toContainText('Made elsewhere')
    await expect(queued, 'and it is the account copy, which a reviewer can reach')
      .toContainText(/Pending review/i)
    // Its artwork travelled too — the row draws the real icon, not a placeholder.
    await expect(queued.locator('.ch-iconprev img'), 'the artwork must come back with it')
      .toHaveCount(2)

    // THE CONTROL, and it is the security half. Without it the test above
    // passes just as happily on a page that renders the WHOLE collection: the
    // queue is readable by every signed-in user, so a query that lost its
    // authorUid filter would show this member a stranger's unreviewed work and
    // offer them a Withdraw button for it.
    await expect(queued, 'the list is not scoped to this account')
      .not.toContainText('Belongs to someone else')
    await expect(page.locator('body'), 'another member\'s submission reached the page at all')
      .not.toContainText('Belongs to someone else')
  })

  test('withdrawing takes it back FROM THE ACCOUNT, not just off the screen', async ({ page }) => {
    // COMMUNITY_SUBMIT_REASONS promises "You can withdraw anything you have
    // submitted, at any time", and a withdrawal that only clears the local copy
    // keeps the submission in the reviewer's queue while telling the user it is
    // gone. That is a promise broken invisibly, so the assertion is on the
    // STORE rather than on the list — tests/user-sim/fixtures/test-session.js
    // exposes the fake Firestore for exactly this.
    //
    // THIS TEST EXISTS BECAUSE THE BUG WAS REAL. The first implementation of
    // publishIcon returned a boolean and recorded the new row with a null
    // document id, so withdrawing in the same session as submitting deleted the
    // local copy and left the account's. Found by rendering the flow.
    watch(page, 'a member changing their mind')
    await signIn(page, { plan: 'free' })
    await go(page, '/community')
    const dialog = await openIconForm(page)
    await fillIcon(dialog, { name: 'Regretted', svg: ICON })
    await dialog.getByRole('button', { name: /^Submit icon$/i }).click()

    const queued = page.locator('section', { has: page.getByRole('heading', { name: 'Your submissions' }) })
    await expect(queued).toContainText('Regretted')

    const inQueue = () => page.evaluate(() =>
      [...(window.__UIL4B_TEST_STORE__?.docs?.keys() || [])].filter(k => k.startsWith('community-submissions/')).length)
    expect(await inQueue(), 'the submission must have reached the account first').toBe(1)

    await queued.getByRole('button', { name: /^Withdraw$/i }).first().click()
    await expect(queued, 'the withdrawn submission must be gone from the list').toHaveCount(0)
    expect(await inQueue(), 'the account still holds a submission the user was told was withdrawn').toBe(0)
  })
})
