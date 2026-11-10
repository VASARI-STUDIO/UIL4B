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
//   Projects.jsx loadFailed: drop the `|| unchecked` term -> "a failed list stays failed" goes red.
//   Projects.jsx newProject: back to `showNew && (` (no wrapper while a refusal is open) -> both
//     "every project archived" tests go red.
//   projectSync.js pullRemoteProjects/readRemoteProjects: stop calling `opts.step` -> the "a read that never
//     answers" tests go red (the stalled read is no longer bounded) and so do the unit step tests.
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

/** The account's read answers ten minutes late; the app gives up on it after 15 seconds. */
const NEVER = [{ path: 'sync/projects', ms: 10 * 60_000 }]
const GIVE_UP_MS = 15_000

/** A new device whose account read never answers, on /projects once the app has given up waiting. */
async function stalledThenFailed(page) {
  await page.clock.install()
  await fullAccountOnAFreshDevice(page, { slowReads: NEVER })
  await go(page, '/projects')
  await expect(page.getByRole('region', { name: 'Loading your projects' }), 'the list has not arrived').toBeVisible()
  await expect(newInTitleRow(page)).toBeDisabled()
  await page.clock.fastForward(GIVE_UP_MS + 1000)
  await expect(page.getByRole('alert').filter({ hasText: /Your projects didn.t load\./ })).toBeVisible({ timeout: 10_000 })
  await expect(newInTitleRow(page)).toBeEnabled()
}

/** Bottom edges, in viewport pixels, of the fixed nav alone and of the nav with the notice strip under it. */
const chromeEdge = (page) => page.evaluate(() => {
  const bottom = (selector) => {
    const box = document.querySelector(selector)?.getBoundingClientRect()
    return box && box.height > 0 ? box.bottom : 0
  }
  const nav = bottom('.pnav')
  return { nav, all: Math.max(nav, bottom('.notice-stack')) }
})

const topOf = (locator) => locator.evaluate((el) => el.getBoundingClientRect().top)

/** Wait for a smooth scroll to finish: the page has not moved for fifteen frames. */
const scrollEnded = (page) => page.evaluate(() => new Promise((resolve) => {
  let last = -1
  let still = 0
  const frame = () => {
    still = window.scrollY === last ? still + 1 : 0
    last = window.scrollY
    if (still >= 15) resolve()
    else requestAnimationFrame(frame)
  }
  frame()
}))

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

  test('a failed list stays failed after the sync error clears, and New project still opens the dialog', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, 'a Free designer with three projects on a new device, list refused, an auto-save then goes through')
    // The sync notice is recorded as it appears, so "it cleared" is told apart from "it never showed".
    await page.addInitScript(() => {
      window.__sawSyncNotice = false
      new MutationObserver(() => {
        if (document.querySelector('[data-testid="sync-notice"]')) window.__sawSyncNotice = true
      }).observe(document, { childList: true, subtree: true })
    })
    await fullAccountOnAFreshDevice(page, { deny: [{ path: 'sync/projects', ops: ['get'] }] })
    await go(page, '/projects')
    const failed = page.getByRole('alert').filter({ hasText: /Your projects didn.t load\./ })
    await expect(failed).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => page.evaluate(() => window.__sawSyncNotice), { message: 'the read failure reached the sync notice' }).toBe(true)
    // The push after the failed read is not denied, so it succeeds and the notice goes.
    await expect(page.locator('[data-testid="sync-notice"]'), 'the auto-save did not clear the sync error').toHaveCount(0, { timeout: 15_000 })
    await expect(failed, 'the failed sheet went with the sync error').toBeVisible()
    await expect(page.getByText(/Projects \d+ of \d+/), 'the page read as an account with a project count').toHaveCount(0)
    await expect(page.getByTestId('other-projects')).toHaveCount(0)
    await newInTitleRow(page).click()
    const refusal = page.getByTestId('project-create-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal).toContainText('couldn’t be checked')
    await expect(rail(page)).toHaveCount(0)
    expect([...(await accountIds(page))].sort(), 'nothing was created on the account').toEqual(['r1', 'r2', 'r3'])
  })

  test.describe('at the cap with every project archived', () => {
    const ALL_ARCHIVED = ACCOUNT.map((project) => ({ ...project, archived: true }))

    async function signedInAtCap(page) {
      await signIn(page, { plan: 'free', projects: ALL_ARCHIVED })
      await go(page, '/projects')
      await expect(page.locator('.db-sheet'), 'with every project archived there is no lead kit').toBeVisible()
      await expect(page.getByRole('link', { name: /^Open project/ }), 'no lead project is open').toHaveCount(0)
      await expect(newInTitleRow(page), 'the title row has no New project of its own').toHaveCount(0)
    }

    test('the sheet’s pill at 1440 opens the cap dialog', async ({ page }) => {
      watch(page, 'a Free designer at 1440 with three archived projects')
      await signedInAtCap(page)
      await page.locator('.db-sheet').getByRole('button', { name: /^New project/ }).click()
      const refusal = page.getByTestId('project-create-refusal')
      await expect(refusal).toBeVisible()
      await expect(refusal).toContainText(`The Free plan saves up to ${CAP} projects.`)
      await expect(refusal.getByRole('link', { name: 'See plans' })).toBeVisible()
      await expect(rail(page)).toHaveCount(0)
      await expect(page).toHaveURL(/\/projects$/)
    })

    test.describe('on a 390px phone', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

      test('the docked bar opens the cap dialog', async ({ page }) => {
        watch(page, 'a thumb on a 390px phone with three archived projects')
        await signedInAtCap(page)
        await page.locator('.db-bar').getByRole('button', { name: /^New project/ }).click()
        const refusal = page.getByTestId('project-create-refusal')
        await expect(refusal).toBeVisible()
        await expect(refusal).toContainText(`The Free plan saves up to ${CAP} projects.`)
        await expect(refusal.getByRole('link', { name: 'See plans' })).toBeVisible()
        await expect(rail(page)).toHaveCount(0)
        await expect(page).toHaveURL(/\/projects$/)
      })
    })
  })

  test.describe('a read that never answers', () => {
    test('it fails after 15 seconds, and New project then opens the "couldn’t be checked" dialog', async ({ page }) => {
      watch(page, 'a Free designer with three projects on a new device, the account never answers')
      await stalledThenFailed(page)
      await newInTitleRow(page).click()
      const refusal = page.getByTestId('project-create-refusal')
      await expect(refusal).toBeVisible()
      await expect(refusal).toContainText('couldn’t be checked')
      await expect(refusal.getByRole('button', { name: 'Try again' })).toBeVisible()
      await expect(rail(page)).toHaveCount(0)
      await expect(page).toHaveURL(/\/projects$/)
      expect(await deviceIds(page), 'nothing was written to the device').toEqual([])
      expect([...(await accountIds(page))].sort(), 'nothing was created on the account').toEqual(['r1', 'r2', 'r3'])
    })

    test.describe('on a 390px phone', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

      test('the dialog opened from further down the page clears the fixed nav, and so does the button that opened it', async ({ page }) => {
        watch(page, 'a thumb on a 390px phone, the account never answers, scrolled down the page')
        await stalledThenFailed(page)
        // The docked bar is not drawn while the list has failed, so the press is sent to the title row's button
        // with the page scrolled to where that button is out of sight.
        await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
        await newInTitleRow(page).evaluate((el) => el.click())
        const refusal = page.getByTestId('project-create-refusal')
        await expect(refusal).toBeVisible()
        await scrollEnded(page)
        const [chrome, popover, button] = [await chromeEdge(page), await topOf(refusal), await topOf(newInTitleRow(page))]
        expect(popover, `the dialog starts at ${popover}, under the fixed nav and notice that end at ${chrome.all}`).toBeGreaterThanOrEqual(chrome.all)
        expect(popover, 'the dialog is below the nav').toBeGreaterThanOrEqual(chrome.nav)
        expect(button, `New project starts at ${button}, under the fixed nav and notice that end at ${chrome.all}`).toBeGreaterThanOrEqual(chrome.all)
        expect(button, 'New project is below the nav').toBeGreaterThanOrEqual(chrome.nav)
      })
    })

    test('at 1440, the dialog opened by a button just under the fixed nav clears the nav', async ({ page }) => {
      watch(page, 'a Free designer at 1440, the account never answers, the page scrolled until New project meets the nav')
      await stalledThenFailed(page)
      const chrome = await chromeEdge(page)
      await newInTitleRow(page).evaluate((el, edge) => {
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - edge - 6, behavior: 'instant' })
      }, chrome.all)
      await newInTitleRow(page).click()
      const refusal = page.getByTestId('project-create-refusal')
      await expect(refusal).toBeVisible()
      await scrollEnded(page)
      const popover = await topOf(refusal)
      expect(popover, `the dialog starts at ${popover}, under the fixed nav and notice that end at ${chrome.all}`).toBeGreaterThanOrEqual(chrome.all)
      expect(popover, 'the dialog is below the nav').toBeGreaterThanOrEqual(chrome.nav)
      expect(await topOf(newInTitleRow(page)), 'New project is below the nav').toBeGreaterThanOrEqual(chrome.all)
    })
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
