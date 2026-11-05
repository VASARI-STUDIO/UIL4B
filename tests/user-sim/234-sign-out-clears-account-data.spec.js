// SIGN-OUT ON A SHARED MACHINE: the next person finds none of the last
// person's account data in this browser's storage, and device preferences stay.
//
// Drives the real app against the signed-in test double (see helpers.signIn).
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const seedFor = (uid) => ({
  'vs-profile-cache': JSON.stringify({ [uid]: { displayName: 'Mina', email: 'mina@example.test', bio: 'private bio' } }),
  'vs-accounts': JSON.stringify([{ uid, email: 'mina@example.test', displayName: 'Mina', photoURL: '' }]),
  'vs-projects': JSON.stringify({ 'mina@example.test': [{ id: 'p1', name: 'Private project', updatedAt: 1 }] }),
  'vs-prompts': JSON.stringify([{ id: 4242, title: 'Private prompt', text: 'x', tags: '' }]),
  'vs-feedback': JSON.stringify([{ message: 'private feedback' }]),
})
const DEVICE_PREFS = { 'vs-settings-section': 'account', 'vs-prompt-tab': 'mine' }

async function signOutFromSettings(page) {
  await page.locator('#settab-account').click().catch(() => {})
  if (!(await page.locator('#set-account').isVisible())) {
    await page.getByRole('button', { name: 'All settings' }).click().catch(() => {})
    await page.locator('#settab-account').click()
  }
  await page.locator('#set-account').getByRole('button', { name: 'Sign out', exact: true }).click()
}

const storedKeys = (page) => page.evaluate(() => Object.keys(localStorage))
const storedText = (page) => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))))

async function seed(page, uid, extra = {}) {
  await page.evaluate((entries) => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v) },
    { ...seedFor(uid), ...DEVICE_PREFS, ...extra })
}

test.describe('sign-out clears the last person\'s data', () => {
  test('profile cache, remembered accounts, projects and prompts are gone; device preferences stay', async ({ page }) => {
    watch(page, 'a person signing out of a shared library laptop')
    const { uid } = await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await seed(page, uid)

    await signOutFromSettings(page)
    await expect.poll(async () => (await storedKeys(page)).includes('vs-accounts'), {
      message: 'the list of accounts used here is still in storage', timeout: 12_000,
    }).toBe(false)

    const keys = await storedKeys(page)
    for (const gone of ['vs-profile-cache', 'vs-accounts', 'vs-projects', 'vs-prompts', 'vs-feedback']) {
      expect(keys, `${gone} outlived the sign-out`).not.toContain(gone)
    }
    const text = await storedText(page)
    for (const secret of ['mina@example.test', 'private bio', 'Private project', 'Private prompt', 'private feedback']) {
      expect(text, `"${secret}" is still readable in localStorage`).not.toContain(secret)
    }
    expect(keys).toContain('vs-settings-section')
    expect(keys).toContain('vs-prompt-tab')
  })

  test('"Remember accounts on this device" keeps the accounts list, and only that', async ({ page }) => {
    watch(page, 'a person who chose to be remembered on their own laptop')
    const { uid } = await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await seed(page, uid)

    await page.locator('#settab-account').click().catch(() => {})
    const remember = page.getByRole('switch', { name: 'Remember accounts on this device' })
    await remember.click()
    await expect(remember).toHaveAttribute('aria-checked', 'true')
    expect(await storedKeys(page)).toContain('vs-remember-device')

    await signOutFromSettings(page)
    await expect.poll(async () => (await storedKeys(page)).includes('vs-projects'), { timeout: 12_000 }).toBe(false)
    const keys = await storedKeys(page)
    expect(keys).toContain('vs-accounts')
    expect(keys).toContain('vs-remember-device')
    expect(keys).not.toContain('vs-prompts')
  })

  test('Clear local data removes the remembered accounts too', async ({ page }) => {
    watch(page, 'a person clearing this browser from Settings')
    const { uid } = await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await seed(page, uid)
    await page.locator('#settab-data').click()
    await page.getByRole('button', { name: 'Clear data' }).click()
    await page.getByRole('button', { name: 'Confirm clear' }).click()
    await expect.poll(async () => (await storedKeys(page)).includes('vs-accounts'), { timeout: 8_000 }).toBe(false)
  })
})

// ── AN EDIT THAT HAS NOT BEEN SENT MUST NOT BE THROWN AWAY ─────────────────
//
// Sign-out clears the saved projects and the working design from the browser.
// That is safe only if the edit has reached the account, or the person was told
// it had not and chose. Each test makes a project edit and a working-design edit
// inside the 1.5 s push delay (so neither has been sent) and signs out from the
// header menu. "Reached the account" is read from the store the fixture writes
// into, not from the page.
const EDITED_NAME = 'Autumn Rebrand'
const EDITED_COLOUR = '#123ABC'
const PROJECT_EMAIL = 'free.user@uil4b.test'

async function openDesktop(browser, persona) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, persona)
  return { ctx, page }
}

async function renameProject(page, from, to) {
  await page.locator(`.uh-card-name[data-project="${from}"]`).click()
  await expect(page.getByRole('heading', { level: 1, name: from })).toBeVisible()
  await page.getByRole('button', { name: `Actions for ${from}` }).click()
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await page.getByRole('textbox', { name: new RegExp(`Rename ${from}`, 'i') }).fill(to)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
}

async function editWorkingDesign(page) {
  await page.evaluate((colour) => {
    localStorage.setItem('vs-current-design', JSON.stringify({ palette: { base: colour, harmony: 'auto', colors: [colour, '#FFFFFF'] } }))
    window.dispatchEvent(new Event('vs-local-change'))
  }, EDITED_COLOUR)
}

const reachedAccount = (page, uid) => page.evaluate(({ u, name, colour }) => {
  const store = window.__UIL4B_TEST_STORE__
  const projects = store.list(`users/${u}/projects`).map((row) => row.data?.project?.name)
  const data = JSON.stringify(store.get(`users/${u}/sync/data`) || {})
  return { project: projects.includes(name), design: data.includes(colour) }
}, { u: uid, name: EDITED_NAME, colour: EDITED_COLOUR })

const localCopy = (page) => page.evaluate(({ email, name, colour }) => {
  const projects = JSON.parse(localStorage.getItem('vs-projects') || '{}')[email] || []
  return {
    project: projects.some((p) => p.name === name),
    design: (localStorage.getItem('vs-current-design') || '').includes(colour),
  }
}, { email: PROJECT_EMAIL, name: EDITED_NAME, colour: EDITED_COLOUR })

const authSignedIn = (page) => page.evaluate(() => window.__UIL4B_TEST_AUTH__.signedIn)
const unsentAlert = (page) => page.locator('.pnav-signout-alert[role="alert"]')

async function menuSignOut(page) {
  await page.getByRole('button', { name: 'Account and settings' }).click()
  const menu = page.locator('#pnav-account-pop')
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'Sign out', exact: true }).click()
  return menu
}

const REFUSE_WRITES = [{ path: '/projects/', ops: ['set'] }, { path: 'sync/', ops: ['set'] }]

test.describe('an edit that has not been sent is not thrown away at sign-out', () => {
  test('sent first: the project and design edits are on the account before the browser copy goes', async ({ browser }) => {
    const { ctx, page } = await openDesktop(browser, 'a designer signing out a second after an edit')
    // Answered late, so sign-out has to wait for the write rather than race it.
    const { uid } = await signIn(page, {
      plan: 'free', projects: 1,
      slowWrites: [{ path: '/projects/', ms: 1200 }, { path: 'sync/', ms: 1200 }],
    })
    await go(page, '/projects')
    await renameProject(page, 'Seeded Project 1', EDITED_NAME)
    await editWorkingDesign(page)
    expect((await reachedAccount(page, uid)).project, 'control: the edit has not been sent yet').toBe(false)

    await menuSignOut(page)
    await expect.poll(() => authSignedIn(page), { timeout: 20_000 }).toBe(false)

    const account = await reachedAccount(page, uid)
    expect(account.project, 'the project rename reached the account before it was cleared').toBe(true)
    expect(account.design, 'the working design reached the account before it was cleared').toBe(true)
    await expect.poll(() => localCopy(page).then((c) => c.project)).toBe(false)
    expect((await localCopy(page)).design, 'and the browser copy is gone, as intended').toBe(false)
    await ctx.close()
  })

  test('refused: the person is told, and the saved work stays on "Sign out anyway"', async ({ browser }) => {
    const { ctx, page } = await openDesktop(browser, 'a designer whose account refuses writes')
    const { uid } = await signIn(page, { plan: 'free', projects: 1, deny: REFUSE_WRITES })
    await go(page, '/projects')
    await renameProject(page, 'Seeded Project 1', EDITED_NAME)
    await editWorkingDesign(page)

    await menuSignOut(page)
    await expect(unsentAlert(page), 'told that changes have not reached the account').toContainText(/haven.t reached your account/)
    expect(await authSignedIn(page), 'still signed in').toBe(true)
    expect(await reachedAccount(page, uid)).toEqual({ project: false, design: false })

    await unsentAlert(page).getByRole('button', { name: 'Sign out anyway' }).click()
    await expect.poll(() => authSignedIn(page)).toBe(false)
    await expect.poll(async () => (await storedKeys(page)).includes('vs-accounts'), { message: 'sign-out listeners have run' }).toBe(false)
    const kept = await localCopy(page)
    expect(kept.project, 'the unsent project rename is still saved on this device').toBe(true)
    expect(kept.design, 'the unsent working design is still saved on this device').toBe(true)
    await ctx.close()
  })

  test('refused, then "Sign out and discard them": the unsent work goes by the person\'s own choice', async ({ browser }) => {
    const { ctx, page } = await openDesktop(browser, 'a designer discarding what cannot be sent')
    await signIn(page, { plan: 'free', projects: 1, deny: REFUSE_WRITES })
    await go(page, '/projects')
    await renameProject(page, 'Seeded Project 1', EDITED_NAME)
    await editWorkingDesign(page)

    await menuSignOut(page)
    await unsentAlert(page).getByRole('button', { name: 'Sign out and discard them' }).click()
    await expect.poll(() => authSignedIn(page)).toBe(false)
    await expect.poll(() => localCopy(page).then((c) => c.project || c.design)).toBe(false)
    await ctx.close()
  })

  test('a write that never answers (offline): "Sign out anyway" keeps the unsent project edit', async ({ browser }) => {
    test.setTimeout(60_000)
    const { ctx, page } = await openDesktop(browser, 'a designer who loses signal mid-edit')
    await signIn(page, { plan: 'free', projects: 1, slowWrites: [{ path: '/projects/', ms: 600_000 }] })
    await go(page, '/projects')
    // Offline: the write is queued and never reaches the account.
    await page.evaluate(() => {
      const store = window.__UIL4B_TEST_STORE__
      const set = store.set.bind(store)
      store.set = (path, ...rest) => (String(path).includes('/projects/') ? undefined : set(path, ...rest))
    })
    await renameProject(page, 'Seeded Project 1', EDITED_NAME)

    await menuSignOut(page)
    await expect(unsentAlert(page), 'told that changes have not reached the account').toContainText(/haven.t reached your account/, { timeout: 20_000 })
    await unsentAlert(page).getByRole('button', { name: 'Sign out anyway' }).click()
    await expect.poll(() => authSignedIn(page)).toBe(false)
    await expect.poll(async () => (await storedKeys(page)).includes('vs-accounts'), { message: 'sign-out listeners have run' }).toBe(false)
    expect((await localCopy(page)).project, 'the unsent project rename is still saved on this device').toBe(true)
    await ctx.close()
  })

  test('the session ending elsewhere inside the push delay does not take the unsent project edit with it', async ({ browser }) => {
    const { ctx, page } = await openDesktop(browser, 'a designer signed out by another tab a moment after an edit')
    const { uid } = await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await renameProject(page, 'Seeded Project 1', EDITED_NAME)
    expect((await reachedAccount(page, uid)).project, 'control: not sent yet').toBe(false)
    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signOutNow())
    await expect.poll(() => authSignedIn(page)).toBe(false)
    await expect.poll(async () => (await storedKeys(page)).includes('vs-accounts'), { message: 'sign-out listeners have run' }).toBe(false)
    const onAccount = (await reachedAccount(page, uid)).project
    const onDevice = (await localCopy(page)).project
    expect(onAccount || onDevice, 'the project rename must exist on the account or on this device').toBe(true)
    await ctx.close()
  })

  test('an edit made while a push is in flight stays on this device when the next push is refused', async ({ browser }) => {
    test.setTimeout(60_000)
    const SECOND_NAME = 'Autumn Rebrand Two'
    const { ctx, page } = await openDesktop(browser, 'a designer who keeps typing while the first save is still on its way')
    const { uid } = await signIn(page, { plan: 'free', projects: 1, slowWrites: [{ path: '/projects/', ms: 4000 }] })
    await go(page, '/projects')
    await renameProject(page, 'Seeded Project 1', EDITED_NAME)
    // The first push has left (the double stores a write at once and answers it late).
    await expect.poll(() => reachedAccount(page, uid).then((a) => a.project), { timeout: 12_000 }).toBe(true)
    // From here the account refuses project writes: the second edit cannot be sent.
    await page.evaluate(() => {
      const store = window.__UIL4B_TEST_STORE__
      const set = store.set.bind(store)
      store.set = (path, ...rest) => {
        if (!String(path).includes('/projects/')) return set(path, ...rest)
        const err = new Error('Firebase: Error (permission-denied).')
        err.code = 'permission-denied'
        err.name = 'FirebaseError'
        throw err
      }
    })
    // Still on the project's page after the first rename: rename it again from here.
    await page.getByRole('button', { name: `Actions for ${EDITED_NAME}` }).click()
    await page.getByRole('button', { name: 'Rename', exact: true }).click()
    await page.getByRole('textbox', { name: new RegExp(`Rename ${EDITED_NAME}`, 'i') }).fill(SECOND_NAME)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: SECOND_NAME })).toBeVisible()

    await menuSignOut(page)
    await expect(unsentAlert(page), 'told that changes have not reached the account').toContainText(/haven.t reached your account/, { timeout: 20_000 })
    // The slow first push has been answered by now: its success must not stand in for the second edit.
    await page.waitForFunction(() => (window.__UIL4B_TEST_LATE_WRITES__ || 0) >= 1, null, { timeout: 12_000 })
    await unsentAlert(page).getByRole('button', { name: 'Sign out anyway' }).click()
    await expect.poll(() => authSignedIn(page)).toBe(false)
    await expect.poll(async () => (await storedKeys(page)).includes('vs-accounts'), { message: 'sign-out listeners have run' }).toBe(false)
    const kept = await page.evaluate(({ email, name }) => (JSON.parse(localStorage.getItem('vs-projects') || '{}')[email] || []).some((p) => p.name === name),
      { email: PROJECT_EMAIL, name: SECOND_NAME })
    expect(kept, 'the second rename (never sent) is still saved on this device').toBe(true)
    await ctx.close()
  })

  test('a normal sign-out with nothing pending still clears the saved work (no stuck unsent flag)', async ({ browser }) => {
    const { ctx, page } = await openDesktop(browser, 'a designer who waited for the save, then signed out')
    const { uid } = await signIn(page, { plan: 'free', projects: 1, slowWrites: [{ path: '/projects/', ms: 300 }] })
    await go(page, '/projects')
    await renameProject(page, 'Seeded Project 1', EDITED_NAME)
    await page.waitForFunction(() => (window.__UIL4B_TEST_LATE_WRITES__ || 0) >= 1, null, { timeout: 12_000 })
    expect((await reachedAccount(page, uid)).project, 'control: the edit is on the account').toBe(true)
    expect((await localCopy(page)).project, 'control: and still in this browser').toBe(true)

    await menuSignOut(page)
    await expect.poll(() => authSignedIn(page), { timeout: 20_000 }).toBe(false)
    await expect(unsentAlert(page), 'nothing was pending, so no warning').toHaveCount(0)
    await expect.poll(() => localCopy(page).then((c) => c.project), { message: 'the saved project left this browser' }).toBe(false)
    await expect.poll(async () => (await storedKeys(page)).includes('vs-projects')).toBe(false)
    await ctx.close()
  })
})
