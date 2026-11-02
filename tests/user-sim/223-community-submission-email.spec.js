// THE OWNER'S "EMAIL ME ABOUT COMMUNITY SUBMISSIONS" FEATURE, FROM BOTH ENDS.
//
// Two halves, one file, because one is no use without the other:
//
//   1. A MEMBER'S SIDE. After a palette or a prompt is saved to the review queue
//      the browser tells /api/support about it (src/utils/communityNotify.js).
//      That call is fire-and-forget. What matters to the member is that it fires
//      exactly once with the new document's id, and that when it fails or hangs
//      they still see the same "submitted" answer they would have seen anyway.
//
//   2. THE ADMINISTRATOR'S SIDE. A Settings tab, for the allowlisted admin only,
//      with a switch and a number. It has to load, save, say so, say when it
//      could not, and fit a phone.
//
// `vite preview` serves static files and runs no functions, so /api/support is
// answered here by `page.route`. The real handler is covered, against a fake
// Firestore, by tests/unit/community-notify.test.js; this file never says
// anything about what the server decides, only what the page sends and shows.
//
// MUTATIONS this file was seen to fail under, made to a COPY of the built bundle
// (one each; the source was never touched):
//   src/utils/communityQueueApi.js  delete the notifyCommunityPost call in publishToQueue
//        fails the palette "fires one POST" and all three palette "does not touch" cases.
//   src/utils/communityQueueApi.js  delete it in publishPrompt
//        fails the same four for the prompt.
//   src/utils/communityNotify.js  return the fetch promise and `await` it in publishPrompt
//        fails "a hanging notification ... prompt": the success message waits on the email.
//   src/pages/Admin.jsx  `adminOnly: true` -> false on the settings tab
//        fails "a moderator does not see the Settings tab".
//   src/components/admin/CommunityNotifySettings.jsx  role={...: 'alert'} -> 'status'
//        fails "a refused save says why, inline".
//
// KNOWN RED: the three layout tests fail today on a real defect, not a test fault.
// The switch's row is 22px high (.cns-toggle, a 16px checkbox; src/styles/deferred/admin.css:1272-1273)
// and Save is 38px high at 390px (`btn btn-s`, CommunityNotifySettings.jsx:139).
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn, REPORT_DIR } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ID_SHAPE = /^[A-Za-z0-9_-]{1,128}$/

/* ── 1. THE MEMBER'S SIDE ─────────────────────────────────────────────────── */

/** Answers /api/support and keeps what was sent. `how`: ok | abort | error | slow. */
async function stubSupport(page, how = 'ok') {
  const calls = []
  let release = () => {}
  const held = new Promise((resolve) => { release = resolve })
  await page.route((url) => url.pathname === '/api/support', async (route) => {
    const req = route.request()
    calls.push({ body: req.postDataJSON(), auth: req.headers().authorization })
    if (how === 'abort') return route.abort('failed')
    if (how === 'error') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Something went wrong. Try again shortly.' }) })
    if (how === 'slow') await held
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  return { calls, release }
}

const storedIds = (page, collection) => page.evaluate((c) => window.__UIL4B_TEST_STORE__.list(c).map((d) => d.id), collection)

async function submitPalette(page) {
  await page.addInitScript(() => { try { localStorage.setItem('vs-community-handle', 'tester_one') } catch { /* private mode */ } })
  await go(page, '/create/palette')
  await page.getByRole('button', { name: 'Save or share' }).click()
  await page.locator('.plb-savemenu').getByRole('button', { name: /Submit to the community/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Submit palette to the community' })
  await dialog.getByLabel('Palette name for the community').fill('Notify test palette')
  await dialog.getByRole('button', { name: 'Submit palette' }).click()
  return { done: page.getByText('Submitted to the community — thanks!'), collection: 'community-submissions', dialog }
}

async function submitPrompt(page) {
  await go(page, '/discover/prompts')
  await page.locator('.pl-add-btn').first().click()
  await page.getByLabel('Prompt title', { exact: true }).fill('Notify test prompt')
  await page.getByLabel('Prompt', { exact: true }).fill('Describe a calm morning light on a quiet harbour.')
  await page.getByRole('button', { name: 'Submit for review' }).click()
  return { done: page.getByText('Prompt submitted for review'), collection: 'community-prompts' }
}

const SURFACES = [
  ['palette', submitPalette],
  ['prompt', submitPrompt],
]

for (const [label, submit] of SURFACES) {
  test.describe(`a member submitting a ${label}`, () => {
    test(`a ${label} submission fires one POST /api/support with its new document id`, async ({ page }) => {
      watch(page, `a member submitting a ${label}`)
      await signIn(page, { plan: 'free' })
      const { calls } = await stubSupport(page)
      const { done, collection } = await submit(page)
      await expect(done).toBeVisible()

      await expect.poll(() => calls.length, { message: 'the browser must tell the server' }).toBe(1)
      const ids = await storedIds(page, collection)
      expect(ids, 'CONTROL: the post reached the queue').toHaveLength(1)
      expect(calls[0].body).toEqual({ type: 'community-submission', collection, id: ids[0] })
      expect(ids[0]).toMatch(ID_SHAPE)
      expect(calls[0].auth, 'it carries the member\'s ID token').toBe('Bearer uil4b-test-session.test-uid-free')
    })

    for (const how of ['abort', 'error', 'slow']) {
      test(`a ${how === 'slow' ? 'hanging' : how === 'abort' ? 'dropped' : 'failing'} notification does not touch the ${label} success message`, async ({ page }) => {
        watch(page, `a member submitting a ${label} while the notification is ${how}`)
        await signIn(page, { plan: 'free' })
        const { calls, release } = await stubSupport(page, how)
        try {
          const { done, collection } = await submit(page)
          // The same words as with a healthy server, while a slow request is still open.
          await expect(done).toBeVisible()
          await expect(page.getByText(/could not reach the review queue|Failed to submit|Saved locally/i)).toHaveCount(0)
          await expect.poll(() => calls.length).toBe(1)
          expect(await storedIds(page, collection), 'the post is saved whatever happens to the email').toHaveLength(1)
        } finally { release() }
      })
    }
  })
}

/* ── 2. THE ADMINISTRATOR'S SIDE ──────────────────────────────────────────── */

const FOUNDER_UID = 'test-uid-admin'

async function stubVerifyAdmin(page, role) {
  await page.route((url) => url.pathname === '/api/verify-admin', async (route) => {
    const body = route.request().postDataJSON?.() || {}
    const base = { isAdmin: role === 'founder', uid: FOUNDER_UID, email: 'founder@uil4b.test', moderator: role === 'moderator', role, claimUpdated: false, rosterError: null }
    if (body.moderatorAction === 'list') return route.fulfill({ json: { ...base, moderators: [] } })
    if (body.includeUsers === true) return route.fulfill({ json: { ...base, users: [] } })
    return route.fulfill({ json: base })
  })
}

/**
 * Answers `admin-settings` the way the server does: a held value that `set`
 * replaces. `mode.get` / `mode.set` flip to 'error' to make that action fail.
 */
async function stubSettings(page, initial = {}) {
  const calls = []
  const state = { enabled: true, everyN: 1, sinceLast: 2, emailConfigured: true, ...initial }
  const mode = { get: 'ok', set: 'ok' }
  await page.route((url) => url.pathname === '/api/support', async (route) => {
    const req = route.request()
    if (req.method() !== 'POST') return route.fallback()
    const body = req.postDataJSON()
    calls.push({ body, auth: req.headers().authorization })
    if (body?.type !== 'admin-settings') return route.fulfill({ json: { ok: true } })
    if (mode[body.action] === 'error') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'The settings store is not answering.' }) })
    }
    if (body.action === 'set') Object.assign(state, { enabled: body.enabled, everyN: body.everyN })
    return route.fulfill({ json: { ok: true, ...state } })
  })
  return { calls, state, mode }
}

async function openAdmin(page, { role = 'founder', tab = null } = {}) {
  const claims = role === 'moderator' ? { moderator: true, email_verified: true } : { admin: true, email_verified: true }
  await signIn(page, { admin: role === 'founder', claims })
  await stubVerifyAdmin(page, role)
  await go(page, '/admin')
  await expect(page.locator('#admtab-submissions')).toBeVisible()
  if (tab) {
    await page.locator(`#admtab-${tab}`).click()
    await expect(page.locator(`#admtab-${tab}`)).toHaveAttribute('aria-selected', 'true')
  }
}

const everyBox = (page) => page.getByLabel('Email me every', { exact: true })
const switchBox = (page) => page.getByRole('checkbox', { name: 'Email me about new community submissions' })
const saveButton = (page) => page.locator('.cns').getByRole('button', { name: /^(Save|Saving…)$/ })

test.describe('the Settings tab', () => {
  test('the Settings tab is for the administrator only', async ({ page }) => {
    watch(page, 'the founder opening the admin page')
    const settings = await stubSettings(page)
    await openAdmin(page, { role: 'founder' })
    await expect(page.locator('#admtab-settings')).toBeVisible()
    expect(settings.calls, 'nothing is requested until the tab is opened').toHaveLength(0)
  })

  test('a moderator does not see the Settings tab and nothing asks the server for the settings', async ({ page }) => {
    watch(page, 'a moderator opening the admin page')
    const settings = await stubSettings(page)
    await openAdmin(page, { role: 'moderator' })
    // CONTROL: the moderator is in, with the other tabs.
    await expect(page.locator('#admtab-submissions')).toBeVisible()
    await expect(page.locator('#admtab-settings')).toHaveCount(0)
    await expect(page.getByRole('tab', { name: 'Settings' })).toHaveCount(0)
    expect(settings.calls.filter((c) => c.body?.type === 'admin-settings')).toHaveLength(0)
  })

  test('the tab loads the saved values with the caller\'s token', async ({ page }) => {
    watch(page, 'the founder reading the email setting')
    const settings = await stubSettings(page, { enabled: false, everyN: 7, sinceLast: 3 })
    await openAdmin(page, { tab: 'settings' })
    await expect(switchBox(page)).not.toBeChecked()
    await expect(everyBox(page)).toHaveValue('7')
    await expect(everyBox(page), 'the number is moot while the switch is off').toBeDisabled()
    await expect(page.locator('.cns-count')).toContainText('3')
    expect(settings.calls).toHaveLength(1)
    expect(settings.calls[0].body).toEqual({ type: 'admin-settings', action: 'get' })
    expect(settings.calls[0].auth).toBe(`Bearer uil4b-test-session.${FOUNDER_UID}`)
  })

  test('the number and the switch save, and the page says so', async ({ page }) => {
    watch(page, 'the founder changing the email setting')
    const settings = await stubSettings(page)
    await openAdmin(page, { tab: 'settings' })
    await expect(switchBox(page)).toBeChecked()

    await everyBox(page).fill('5')
    await saveButton(page).click()
    await expect(page.locator('.cns-result')).toHaveText('Saved.')
    await expect(page.locator('.cns-result')).toHaveAttribute('role', 'status')
    const set = settings.calls.map((c) => c.body).filter((b) => b.action === 'set')
    expect(set).toEqual([{ type: 'admin-settings', action: 'set', enabled: true, everyN: 5 }])
    expect(typeof set[0].everyN, 'a number, not the text of one').toBe('number')

    // The confirmation goes the moment the form is touched again.
    await switchBox(page).uncheck()
    await expect(page.locator('.cns-result')).toHaveCount(0)
    await saveButton(page).click()
    await expect(page.locator('.cns-result')).toHaveText('Saved.')
    expect(settings.state).toMatchObject({ enabled: false, everyN: 5 })
    await expect(everyBox(page)).toBeDisabled()
  })

  test('a refused save says why, inline, and keeps what was typed', async ({ page }) => {
    watch(page, 'the founder whose save is refused')
    const settings = await stubSettings(page)
    await openAdmin(page, { tab: 'settings' })
    settings.mode.set = 'error'
    await everyBox(page).fill('9')
    await saveButton(page).click()
    const result = page.locator('.cns-result')
    await expect(result).toHaveText('The settings store is not answering.')
    await expect(result).toHaveAttribute('role', 'alert')
    await expect(everyBox(page), 'the typed number stays').toHaveValue('9')
    await expect(saveButton(page), 'and can be tried again').toBeEnabled()

    settings.mode.set = 'ok'
    await saveButton(page).click()
    await expect(result).toHaveText('Saved.')
  })

  test('a setting that cannot be read shows an alert with a way to try again', async ({ page }) => {
    watch(page, 'the founder whose settings will not load')
    const settings = await stubSettings(page)
    settings.mode.get = 'error'
    await openAdmin(page, { tab: 'settings' })
    const alert = page.locator('.cns').getByRole('alert')
    await expect(alert).toContainText('The settings could not be read.')
    await expect(alert).toContainText('The settings store is not answering.')
    await expect(switchBox(page), 'no form to save over a value that was never read').toHaveCount(0)

    settings.mode.get = 'ok'
    await alert.getByRole('button', { name: 'Try again' }).click()
    await expect(switchBox(page)).toBeChecked()
  })

  test('a number the server would refuse cannot be sent', async ({ page }) => {
    watch(page, 'the founder typing a bad number')
    const settings = await stubSettings(page)
    await openAdmin(page, { tab: 'settings' })
    for (const bad of ['0', '101', '2.5', '']) {
      await everyBox(page).fill(bad)
      await expect(saveButton(page), `"${bad}" is refused before it leaves the page`).toBeDisabled()
      await expect(everyBox(page)).toHaveAttribute('aria-invalid', 'true')
    }
    for (const good of ['1', '100']) {
      await everyBox(page).fill(good)
      await expect(saveButton(page)).toBeEnabled()
      await expect(everyBox(page)).toHaveAttribute('aria-invalid', 'false')
    }
    expect(settings.calls.filter((c) => c.body.action === 'set')).toHaveLength(0)
  })

  test('a server without email set up is flagged, and the figures stay readable', async ({ page }) => {
    watch(page, 'the founder before email is configured')
    await stubSettings(page, { emailConfigured: false })
    await openAdmin(page, { tab: 'settings' })
    await expect(page.locator('.cns-warn')).toContainText('Email is not set up on the server yet')
    await expect(page.locator('.cns-warn')).toHaveAttribute('role', 'note')
  })
})

/* ── LAYOUT: 390, 768, 1440 ───────────────────────────────────────────────── */

const SIZES = [
  { width: 390, height: 844, mobile: true },
  { width: 768, height: 1024, mobile: true },
  { width: 1440, height: 900, mobile: false },
]

const SCREENS = path.join(REPORT_DIR, 'screens')

for (const { width, height, mobile } of SIZES) {
  test(`the Settings tab at ${width}px fits, has big enough targets and labelled controls`, async ({ browser }) => {
    const ctx = await browser.newContext(mobile
      ? { viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA }
      : { viewport: { width, height } })
    const page = await ctx.newPage()
    try {
      watch(page, `the founder on the Settings tab at ${width}px`)
      await stubSettings(page, { everyN: 12, sinceLast: 4 })
      await openAdmin(page, { tab: 'settings' })
      await expect(switchBox(page)).toBeVisible()
      await page.evaluate(() => document.fonts.ready)

      // Labels: each control is reachable by the words a person reads beside it,
      // and the number's hint is wired to it.
      await expect(page.getByLabel('Email me every', { exact: true })).toHaveCount(1)
      await expect(switchBox(page)).toHaveCount(1)
      const hintTarget = await everyBox(page).getAttribute('aria-describedby')
      await expect(page.locator(`#${hintTarget}`)).toContainText('1 = every submission')

      // Nothing runs past the viewport, and the page itself does not scroll sideways.
      const fit = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const over = [...document.querySelectorAll('.cns, .cns *')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5))
          .map(({ el }) => el.className || el.tagName)
        return { vw, scrollW: document.documentElement.scrollWidth, over }
      })
      expect(fit.scrollW, 'the page scrolls sideways').toBeLessThanOrEqual(fit.vw)
      expect(fit.over, 'these run past the viewport').toEqual([])

      // Targets: 44px where a finger is the pointer, 24px (WCAG 2.5.8) with a
      // mouse. The switch's hit area is its whole row; the checkbox itself is
      // only a part of it.
      const minTarget = mobile ? 44 : 24
      const size = async (locator) => {
        const box = await locator.boundingBox()
        return { w: Math.round(box.width), h: Math.round(box.height) }
      }
      const targets = {
        'the switch row': await size(page.locator('.cns-toggle')),
        'the number field': await size(everyBox(page)),
        'Save': await size(saveButton(page)),
      }
      for (const [name, s] of Object.entries(targets)) {
        expect.soft(s.h, `${name} is ${s.w}x${s.h}`).toBeGreaterThanOrEqual(minTarget)
      }

      // Viewport only: a full-page capture fails in a touch context.
      fs.mkdirSync(SCREENS, { recursive: true })
      await page.screenshot({ path: path.join(SCREENS, `223-settings-${width}.png`) })
    } finally { await ctx.close() }
  })
}
