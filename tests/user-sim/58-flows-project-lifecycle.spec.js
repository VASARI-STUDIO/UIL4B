// FLOW 4 — THE RETURNING USER, AND EVERYTHING THEY DO TO A PROJECT THEY OWN.
//
// Duplicate, rename, archive, restore, delete. Every one of these lives behind
// the ⋯ menu on a project card, and until `signIn()` existed none of it had
// ever been rendered by a test: the whole surface is behind RequireAuth, and
// `audit-coverage-not-run` recorded it as unreachable for exactly that reason.
//
// ── WHAT THIS ASSERTS ON, AND WHY IT IS NOT THE MENU ────────────────────────
//
// The menu is the easy thing to assert and the wrong one. `ProjectActions`
// renders six items from a static list, so "the menu has a Duplicate item"
// passes for a Duplicate item wired to nothing. Every test here presses the
// item and then reads THE STORE — `vs-projects`, the same key
// ProjectContext.saveProject writes — because the store is what the user
// actually keeps. A handler that opens a menu, closes it, and writes nothing is
// the failure this is built to catch, and it is invisible to a DOM assertion.
//
// ── THE CAP IS THE INTERESTING CASE ─────────────────────────────────────────
//
// Duplicate is the one action that can be REFUSED, because it creates a project
// and the free plan allows three. Projects.jsx's handleDuplicate carries a
// comment calling a duplicate button that silently does nothing at the cap "the
// silent failure" — so the refusal is tested by its sentence, not merely by the
// count not moving. A refusal the user is not told about is the same defect as
// no refusal at all.
//
// ── MUTATION ───────────────────────────────────────────────────────────────
//
// Verified by breaking the CALL SITE rather than the component: dropping
// `onDuplicate={handleDuplicate}` from the <ProjectCard> in src/pages/Projects.jsx
// fails "duplicating writes a fourth project"; dropping `onArchive` fails the
// archive test; dropping `onDelete` fails the delete test. The component keeps
// rendering a full menu through all three, which is the point.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'

const CAP = FREE_SAVE_LIMITS.projects

/** What the account actually keeps, read the way the product stores it. */
function stored(page, email) {
  return page.evaluate(
    (e) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[e] || [],
    email,
  )
}

/** Open the ⋯ menu on a named project card. */
async function openActions(page, projectName) {
  await page.getByRole('button', { name: `Actions for ${projectName}` }).click()
  // The menu is a real popover; wait for it rather than for a timeout.
  await expect(page.getByRole('group', { name: `Actions for ${projectName}` })).toBeVisible()
}

test.describe('a returning free account managing its projects', () => {
  test('the ⋯ menu offers every action the card does not', async ({ page }) => {
    watch(page, 'a designer looking for what they can do to a saved project')
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')

    await openActions(page, 'Seeded Project 1')
    const menu = page.getByRole('group', { name: 'Actions for Seeded Project 1' })
    for (const item of ['Duplicate', 'Rename', 'Archive', 'Delete…']) {
      await expect(menu.getByRole('button', { name: item, exact: true }),
        `the ⋯ menu must offer ${item}`).toBeVisible()
    }
  })

  test('duplicating writes a fourth project the account can see', async ({ page }) => {
    watch(page, 'a designer duplicating a project to try a variant')
    const account = await signIn(page, { plan: 'free', projects: CAP - 1 })
    await go(page, '/projects')

    await openActions(page, 'Seeded Project 1')
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click()

    // The store, not the menu. A duplicate that only toasts is not a duplicate.
    await expect.poll(() => stored(page, account.email).then((p) => p.length),
      { message: 'Duplicate must actually write a project' }).toBe(CAP)
    const names = (await stored(page, account.email)).map((p) => p.name)
    expect(names.filter((n) => /Seeded Project 1/.test(n)).length,
      'the copy must be derived from the original’s name').toBeGreaterThan(1)
  })

  test('and at the cap it REFUSES in words rather than doing nothing', async ({ page }) => {
    // The control for the test above, and the defect Projects.jsx names in its
    // own comment: a duplicate button that silently no-ops at the cap.
    watch(page, 'a designer duplicating a project with no slots left')
    const account = await signIn(page, { plan: 'free', projects: CAP })
    await go(page, '/projects')

    await openActions(page, 'Seeded Project 1')
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click()

    const toast = page.locator('.toast')
    await expect(toast, 'the refusal must be said out loud').toBeVisible()
    expect((await toast.innerText()).trim(),
      'and must name the cap rather than being a generic error')
      .toMatch(new RegExp(String(CAP)))

    expect((await stored(page, account.email)).length,
      'and nothing may be written past the cap').toBe(CAP)
  })

  test('renaming changes the name the account keeps', async ({ page }) => {
    watch(page, 'a designer renaming a project')
    const account = await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')

    await openActions(page, 'Seeded Project 1')
    await page.getByRole('button', { name: 'Rename', exact: true }).click()

    const field = page.getByRole('textbox', { name: /Rename Seeded Project 1/i })
    await expect(field, 'Rename must open an editable field on the card').toBeVisible()
    await field.fill('Autumn Rebrand')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect.poll(() => stored(page, account.email).then((p) => p[0]?.name),
      { message: 'the new name must be persisted, not just displayed' }).toBe('Autumn Rebrand')
  })

  test('archiving takes it out of the grid without destroying it', async ({ page }) => {
    watch(page, 'a designer archiving a finished project')
    const account = await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')

    await openActions(page, 'Seeded Project 1')
    await page.getByRole('button', { name: 'Archive', exact: true }).click()

    // Gone from the active grid …
    await expect(page.getByRole('button', { name: 'Actions for Seeded Project 1' }),
      'an archived project leaves the active grid').toHaveCount(0)
    // … but still owned, and reachable behind the archived disclosure.
    await expect(page.getByRole('button', { name: /Show archived \(1\)/i }),
      'and the account must be told it still has it').toBeVisible()
    const all = await stored(page, account.email)
    expect(all.length, 'archiving must not delete anything').toBe(2)
    expect(all.find((p) => p.name === 'Seeded Project 1')?.archived,
      'it is archived, not removed').toBe(true)
  })

  test('deleting refuses until the name is typed exactly', async ({ page }) => {
    // The destructive one. What matters is the GUARD: "Permanently delete" is
    // disabled until the typed text matches the project name, so a mis-aimed
    // click cannot destroy work. Asserted disabled-then-enabled, because
    // asserting only the end state would pass for a button that was never
    // guarded at all.
    watch(page, 'a designer deleting a project for good')
    const account = await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')

    await openActions(page, 'Seeded Project 1')
    await page.getByRole('button', { name: 'Delete…', exact: true }).click()

    const confirm = page.getByRole('button', { name: 'Permanently delete' })
    await expect(confirm, 'the destructive button must start out refused').toBeDisabled()

    const field = page.getByRole('textbox', { name: /Type the project name to confirm deleting Seeded Project 1/i })
    await field.fill('Seeded Project')          // a near miss
    await expect(confirm, 'a near miss must not arm it').toBeDisabled()

    await field.fill('Seeded Project 1')        // exact
    await expect(confirm, 'the exact name arms it').toBeEnabled()
    await confirm.click()

    await expect.poll(() => stored(page, account.email).then((p) => p.length),
      { message: 'the project must really be gone' }).toBe(1)
    expect((await stored(page, account.email)).some((p) => p.name === 'Seeded Project 1'),
      'and it must be the right one that went').toBe(false)
  })
})
