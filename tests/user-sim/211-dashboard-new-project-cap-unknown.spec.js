// "New project" on /projects while the project allowance is not known yet.
//
// The Free cap (3 saved projects) is the account's, but it is read from the device's copy of the list. A
// device that has never seen the account holds an empty one, so until the account answers (and if it never
// does) the page cannot tell that the account is already full.
//
// The contract this file holds: a Free account that already holds 3 projects ends up with no more than 3,
// whatever it does while the list is loading or has failed, and
//   - no cached copy, list loading: the title row's New project is disabled (aria-busy) and does nothing;
//   - no cached copy, list failed: New project opens a "couldn't be checked" dialog with Try again, and a
//     save from the palette builder is refused in words, nothing created;
//   - a cached copy of the account (1 or more projects): the cached count is used at once, so New project
//     is enabled, a save under the cap goes through, and when the list lands the merged count refuses the
//     next one without removing anything.
//
// The control runs the same click once the list has loaded: the cap dialog opens and nothing starts.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
//   src/pages/Projects.jsx startNew(): drop the `atProjectLimit` check -> the control, and the cached-copy
//     "3 cached" test, go red.
//   Projects.jsx: revert `disabled={checking}` and `if (checking) return` -> the loading test goes red.
//   ProjectContext.jsx saveProject(): remove the `projectCountKnown` throw -> the palette Save-while-failed
//     test goes red.
//   ProjectContext.jsx projectCountKnown: put `pulledUid === uid &&` back before `hasDeviceCopy` -> the
//     cached-copy tests go red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { ago, DAY } from './fixtures/dashboard-projects.js'

const UID = 'test-uid-free'
const EMAIL = 'free.user@uil4b.test'
const CAP = 3
const HOLD_MS = 4000

function remoteProject(id, name, age) {
  return {
    id,
    name,
    design: { palette: { colors: ['#101010', '#2B6CB0', '#F0F0F0'] } },
    createdAt: ago((age + 5) * DAY),
    updatedAt: ago(age * DAY),
  }
}

/** The account's own three projects, in the single document the app reads on sign-in. */
const ACCOUNT = [remoteProject('r1', 'Offcut', 1), remoteProject('r2', 'Shallow End', 2), remoteProject('r3', 'Tenner', 3)]

async function fullAccountOnAFreshDevice(page, session = {}) {
  await signIn(page, {
    plan: 'free',
    projects: [],
    docs: { [`users/${UID}/sync/projects`]: { list: ACCOUNT, v: 1, _updatedAt: Date.now() - DAY } },
    ...session,
  })
}

/** Every project the account holds, by id: the legacy document plus one document per project. */
const accountIds = (page) => page.evaluate((uid) => {
  const store = window.__UIL4B_TEST_STORE__
  const ids = new Set((store.get(`users/${uid}/sync/projects`)?.list || []).map((p) => p.id))
  for (const row of store.list(`users/${uid}/projects`)) if (row.data.project && !row.data.deletedAt) ids.add(row.id)
  return [...ids]
}, UID)

const deviceIds = (page) => page.evaluate((email) => (JSON.parse(localStorage.getItem('vs-projects') || '{}')[email] || []).map((p) => p.id), EMAIL)

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })

/** The title row's New project (the Other projects list draws a second one). */
const newInTitleRow = (page) => page.locator('.db-newwrap').getByRole('button', { name: 'New project' })

/** On /create/palette: open Save or share, name the project and press Enter. */
async function nameAndSaveFromPalette(page, name) {
  await page.getByRole('button', { name: /^Save or share/ }).click()
  await page.locator('.plb-savemenu').getByLabel('Project name').fill(name)
  await page.keyboard.press('Enter')
}

/** Let the account's answer land and the push after it settle, then say how many projects each side holds. */
async function settle(page, savedId) {
  await expect.poll(async () => (await deviceIds(page)).length, { message: 'the account’s three projects reach the device', timeout: 45_000 }).toBeGreaterThanOrEqual(CAP)
  if (savedId) {
    await expect.poll(async () => {
      const [device, account] = [await deviceIds(page), await accountIds(page)]
      return account.includes(savedId) || !device.includes(savedId)
    }, { message: 'the saved project reaches the account, or is dropped', timeout: 12_000 }).toBe(true)
  }
  return { device: await deviceIds(page), account: await accountIds(page) }
}

test.describe('New project while the allowance is not known', () => {
  test('control: once the list has loaded, a full Free account is refused and nothing starts', async ({ page }) => {
    watch(page, 'a Free designer with three projects, list loaded')
    await signIn(page, { plan: 'free', projects: ACCOUNT })
    await go(page, '/projects')
    await expect(page.getByTestId('other-projects')).toBeVisible()
    await page.getByRole('button', { name: 'New project' }).first().click()
    const refusal = page.getByTestId('project-create-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toContainText(`The Free plan saves up to ${CAP} projects.`)
    await expect(page).toHaveURL(/\/projects$/)
    await expect(rail(page)).toHaveCount(0)
  })

  test('while the list is loading on a device with no copy, New project is disabled and does nothing', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, 'a Free designer with three projects on a new device, list still loading')
    await fullAccountOnAFreshDevice(page, { slowReads: [{ path: 'sync/projects', ms: HOLD_MS }] })
    await go(page, '/projects')
    await expect(page.getByRole('region', { name: 'Loading your projects' }), 'the list has not arrived').toBeVisible()
    const newProject = newInTitleRow(page)
    await expect(newProject).toBeDisabled()
    await expect(newProject).toHaveAttribute('aria-busy', 'true')
    // A disabled button takes no pointer press, so the click is sent to the element itself.
    await newProject.evaluate((el) => el.click())
    await expect(rail(page)).toHaveCount(0)
    await expect(page.getByTestId('project-create-refusal')).toHaveCount(0)
    await expect(page).toHaveURL(/\/projects$/)
    // The account answers: the three arrive, and nothing else was created on either side.
    const { device, account } = await settle(page, null)
    expect([...device].sort(), 'the device holds exactly the account’s three').toEqual(['r1', 'r2', 'r3'])
    expect([...account].sort(), 'the account holds exactly its three').toEqual(['r1', 'r2', 'r3'])
    await expect(newProject).toBeEnabled()
    await newProject.click()
    await expect(page.getByTestId('project-create-refusal')).toContainText(`The Free plan saves up to ${CAP} projects.`)
  })

  test('when the list failed to load on a device with no copy, New project says it cannot check and offers Try again', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, 'a Free designer with three projects on a new device, list refused')
    await fullAccountOnAFreshDevice(page, { deny: [{ path: 'sync/projects', ops: ['get'] }] })
    await go(page, '/projects')
    await expect(page.getByRole('alert').filter({ hasText: /Your projects didn.t load\./ })).toBeVisible({ timeout: 10_000 })
    await newInTitleRow(page).click()
    const refusal = page.getByTestId('project-create-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toContainText('couldn’t be checked')
    await expect(refusal.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(rail(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/projects$/)
    expect([...(await accountIds(page))].sort(), 'nothing was created on the account').toEqual(['r1', 'r2', 'r3'])
  })

  test('when the list failed to load on a device with no copy, Save on the palette builder is refused and nothing is created', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, 'a Free designer with three projects on a new device, list refused, saving from the palette builder')
    await fullAccountOnAFreshDevice(page, { deny: [{ path: 'sync/projects', ops: ['get'] }] })
    await go(page, '/create/palette')
    await nameAndSaveFromPalette(page, 'Fourth palette')
    const refusal = page.getByTestId('palette-save-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toContainText('couldn’t be checked')
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' }), 'it is not the cap, so it does not point at plans').toHaveCount(0)
    await expect(page.locator('.toast.show')).toHaveCount(0)
    expect([...(await accountIds(page))].sort(), 'the account still holds exactly its three').toEqual(['r1', 'r2', 'r3'])
    expect(await deviceIds(page), 'nothing was written to the device').toEqual([])
  })

  test.describe('a device that already holds a copy of the account', () => {
    const SLOW = [{ path: 'sync/projects', ms: 8000 }]

    test('three cached projects: New project is enabled and refuses at once, while the list is still loading', async ({ page }) => {
      test.setTimeout(120_000)
      watch(page, 'a Free designer whose device holds the account’s three projects, the pull slow')
      await fullAccountOnAFreshDevice(page, { projects: ACCOUNT, slowReads: SLOW })
      const started = Date.now()
      await go(page, '/projects')
      const newProject = newInTitleRow(page)
      await expect(newProject).toBeEnabled()
      await expect(newProject).not.toHaveAttribute('aria-busy', 'true')
      await newProject.click()
      const refusal = page.getByTestId('project-create-refusal')
      await expect(refusal).toContainText(`The Free plan saves up to ${CAP} projects.`, { timeout: 2000 })
      expect(Date.now() - started, 'the refusal came before the slow read could have answered').toBeLessThan(8000)
      await expect(refusal.getByRole('link', { name: 'See plans' })).toBeVisible()
      await expect(rail(page)).toHaveCount(0)
    })

    test('one cached project: a save goes through before the list lands, then the full account refuses the next and nothing is removed', async ({ page }) => {
      test.setTimeout(120_000)
      watch(page, 'a Free designer whose device holds one of the account’s three projects, the pull slow')
      await fullAccountOnAFreshDevice(page, { projects: ACCOUNT.slice(0, 1), slowReads: SLOW })
      await go(page, '/projects')
      await expect(newInTitleRow(page)).toBeEnabled()
      await go(page, '/create/palette')
      await nameAndSaveFromPalette(page, 'Fourth palette')
      await expect(page.locator('.toast.show').first()).toBeVisible()
      await expect(page.getByTestId('palette-save-refusal')).toHaveCount(0)
      const savedId = (await deviceIds(page)).find((id) => !ACCOUNT.some((p) => p.id === id))
      expect(savedId, 'the save was written to the device').toBeTruthy()

      // The account answers: its three merge with the one saved here. Nothing is dropped on either side.
      await expect.poll(async () => (await deviceIds(page)).length, { message: 'the account’s projects reach the device', timeout: 45_000 }).toBe(4)
      await expect.poll(async () => (await accountIds(page)).includes(savedId), { message: 'the saved project reaches the account', timeout: 12_000 }).toBe(true)
      expect([...(await deviceIds(page))].sort()).toEqual(['r1', 'r2', 'r3', savedId].sort())
      expect([...(await accountIds(page))].sort()).toEqual(['r1', 'r2', 'r3', savedId].sort())

      // In the same page session, so the merged count decides and not a fresh read of the device.
      await page.evaluate(() => {
        window.history.pushState({}, '', '/projects')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      await expect(page).toHaveURL(/\/projects$/)
      await newInTitleRow(page).click()
      await expect(page.getByTestId('project-create-refusal')).toContainText(`The Free plan saves up to ${CAP} projects.`)
      await expect(rail(page)).toHaveCount(0)
      expect((await deviceIds(page)).length, 'nothing was removed').toBe(4)
    })
  })
})
