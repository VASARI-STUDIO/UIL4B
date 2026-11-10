// "New project" on /projects while the project allowance is not known yet.
//
// The dashboard draws New project while the account's list is on its way and when it failed to load, so a
// person can start a project at once. The Free cap (3 saved projects) is read from the device's copy of the
// list, and a device that has never seen the account holds an empty one: until the account answers, the page
// cannot tell that the account is already full.
//
// The contract this file holds: a Free account that already holds 3 projects ends up with no more than 3,
// whatever it does on /projects while the list is loading or has failed. Either New project refuses, or the
// walk it starts cannot save a fourth.
//
// The control runs the same click once the list has loaded: the cap dialog opens and nothing starts.
//
// ── STATUS ──────────────────────────────────────────────────────────────────
// The two unknown-cap tests are marked test.fail(): they describe an app defect that is still open
// (startNew() reads only the local list, and saveProject() counts only the local list too, so the fourth save
// is accepted and then merged with the three the account holds; no rule on the account limits the count).
// When the app is fixed they pass, Playwright reports "expected to fail but passed", and the marker goes.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// The control is the one that bites today: dropping the `atProjectLimit` check from startNew() in
// src/pages/Projects.jsx turns "after the list loaded, New project refuses" red.
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
const nameForm = (page) => page.getByRole('dialog', { name: 'Name your project' })

/** Press New project and, if that starts the walkthrough, walk it to Save. Returns the saved id, or null. */
async function pressNewAndTrySave(page) {
  await page.getByRole('button', { name: 'New project' }).first().click()
  const started = await rail(page).waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false)
  if (!started) return null
  for (const [button, url] of [
    [/^Next: Fonts/, /\/create\/font-pair$/],
    [/^Next: Type scale/, /\/create\/type-scale$/],
    [/^Next: Icons/, /\/create\/icons$/],
  ]) {
    await rail(page).getByRole('button', { name: button }).click()
    await expect(page).toHaveURL(url)
  }
  await rail(page).getByRole('button', { name: /^Name your project/ }).click()
  await nameForm(page).getByRole('textbox', { name: 'Project name' }).fill('Fourth kit')
  await nameForm(page).getByRole('button', { name: 'Save project' }).click()
  // Saved: the walk ends on the export page. Refused: the cap line shows in the form and the URL stays.
  const saved = await page.waitForURL(/\/projects\/[^/]+\/export$/, { timeout: 4000 }).then(() => true, () => false)
  return saved ? page.url().match(/\/projects\/([^/]+)\/export$/)[1] : null
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

  test('while the list is loading, a full Free account cannot be taken past its cap', async ({ page }) => {
    test.fail(true, 'App defect: startNew() and saveProject() count only the device copy, which is empty on a fresh device')
    test.setTimeout(120_000)
    watch(page, 'a Free designer with three projects on a new device, list still loading')
    await fullAccountOnAFreshDevice(page, { slowReads: [{ path: 'sync/projects', ms: HOLD_MS }] })
    await go(page, '/projects')
    await expect(page.getByRole('region', { name: 'Loading your projects' }), 'the list has not arrived').toBeVisible()
    const savedId = await pressNewAndTrySave(page)
    const { device, account } = await settle(page, savedId)
    expect(device.length, `the device holds ${device.length} (${device.join(', ')})`).toBeLessThanOrEqual(CAP)
    expect(account.length, `the account holds ${account.length} (${account.join(', ')})`).toBeLessThanOrEqual(CAP)
  })

  test('when the list failed to load, a full Free account cannot be taken past its cap', async ({ page }) => {
    test.fail(true, 'App defect: with the read refused the device copy is empty, so New project and Save both pass the cap check')
    test.setTimeout(120_000)
    watch(page, 'a Free designer with three projects on a new device, list refused')
    await fullAccountOnAFreshDevice(page, { deny: [{ path: 'sync/projects', ops: ['get'] }] })
    await go(page, '/projects')
    await expect(page.getByRole('alert').filter({ hasText: /Your projects didn.t load\./ })).toBeVisible({ timeout: 10_000 })
    const savedId = await pressNewAndTrySave(page)
    // The read stays refused, so the device never learns of the three. What the account holds is the test.
    if (savedId) {
      await expect.poll(async () => (await accountIds(page)).includes(savedId), { timeout: 12_000, message: 'the saved project reaches the account' }).toBe(true)
    }
    const account = await accountIds(page)
    expect(account.length, `the account holds ${account.length} (${account.join(', ')})`).toBeLessThanOrEqual(CAP)
  })
})
