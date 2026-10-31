// The other ways into the community review queue, beside the Gradient tool's
// Save or share menu (spec 169): Palette Builder's "Submit to the community…",
// the Prompt Library's "Submit prompt" and /community's "Submit design".
//
// What this file pins, at 1440 and at 390 on a touch screen, signed in:
//   1. The entry point is reachable (a popover on a desktop, a bottom sheet on a
//      phone for the palette) and a submission writes exactly one document with
//      only the keys firestore.rules lets through.
//   2. A write the rules (or the network) refuse never says "submitted".
//   3. A signed-out visitor is asked to sign in at the moment of submitting and
//      is shown no form.
//
// Every key list below is written out by hand from firestore.rules
// (`submissionPayloadOk`, `submissionShapeOk` and `promptShapeOk`). The fake
// store accepts anything, so without the lists a payload key the real rules
// refuse would pass here and fail for every member in production.
//
// MUTATIONS (restore after each):
//   PaletteBuilder.jsx submitToCommunity: add `note: 'x'` to the payload passed to buildQueueRecord
//       -> "palette: ... only the keys the rules allow"
//   PaletteBuilder.jsx: replace `await publishToQueue({ ...queued, localId })` with a call that
//       swallows (`.catch(() => {})`) -> "palette: a refused write never says Submitted"
//   promptSubmission.js buildCommunityPromptRecord: add `extra: 1` -> "prompt: ... only the keys the rules allow"
//   Community.jsx handleSubmit: add `note: 'x'` to the payload -> "design: ... only the keys the rules allow"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SUBMISSION_KEYS = ['kind', 'name', 'authorUid', 'authorName', 'status', 'payload', 'createdAt', 'localId']
const PAYLOAD_KEYS = ['type', 'angle', 'stops', 'author', 'category', 'url', 'c1', 'c2', 'colors']
const PROMPT_KEYS = ['title', 'text', 'tags', 'authorName', 'authorUid', 'ownerId', 'profileLink', 'status', 'createdAt', 'mediaType', 'mediaUrl']

const PALETTE = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const SCREENS = [
  { label: '1440 desktop', width: 1440, height: 900, touch: false },
  { label: '390 touch', width: 390, height: 844, touch: true },
]

const docsIn = (page, collection) => page.evaluate(
  (c) => window.__UIL4B_TEST_STORE__.list(c).map((d) => d.data), collection,
)
const toastText = (page) => page.locator('.toast.show')

async function openAt(browser, { width, height, touch }) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch })
  await ctx.addInitScript(() => {
    try { localStorage.setItem('vs-community-handle', 'freya_free') } catch { /* private mode */ }
  })
  return { ctx, page: await ctx.newPage() }
}

function expectOnlyRulesKeys(record) {
  for (const k of Object.keys(record)) expect(SUBMISSION_KEYS, `record key "${k}" is not in the rules' list`).toContain(k)
  for (const k of Object.keys(record.payload)) expect(PAYLOAD_KEYS, `payload key "${k}" is not in the rules' allow-list`).toContain(k)
  expect(record.status).toBe('pending')
  expect(record.authorUid).toBe('test-uid-free')
}

/* ── Palette Builder ─────────────────────────────────────────────────────── */

const paletteMenu = (page) => page.getByRole('dialog', { name: 'Save, share and export this palette' })
const paletteDialog = (page) => page.getByRole('dialog', { name: 'Submit palette to the community' })

async function openPaletteForm(page) {
  await page.getByRole('button', { name: 'Save or share' }).click()
  const menu = paletteMenu(page)
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'Submit to the community…' }).click()
  await expect(paletteDialog(page)).toBeVisible()
}

test.describe('Palette Builder: Submit to the community…', () => {
  for (const screen of SCREENS) {
    test(`palette ${screen.label}: reachable, and writes one pending record with only the keys the rules allow`, async ({ browser }) => {
      const { ctx, page } = await openAt(browser, screen)
      try {
        watch(page, `member submitting a palette at ${screen.width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, PALETTE)
        expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(screen.touch)
        await openPaletteForm(page)
        const dialog = paletteDialog(page)
        const box = await dialog.locator('.plb-modal-card').boundingBox()
        expect(box.x + box.width, 'the form fits the screen').toBeLessThanOrEqual(screen.width)
        await dialog.getByLabel('Palette name for the community').fill('Harbour set')
        await dialog.getByRole('button', { name: 'Submit palette' }).click()
        await expect(dialog).toHaveCount(0)
        await expect(toastText(page)).toContainText('Submitted to the community')
        const docs = await docsIn(page, 'community-submissions')
        expect(docs, 'exactly one document').toHaveLength(1)
        expectOnlyRulesKeys(docs[0])
        expect(docs[0]).toMatchObject({ kind: 'palette', name: 'Harbour set' })
        expect(docs[0].payload).toMatchObject({
          colors: ['#1F4B8E', '#2E7BB8', '#3FA9A0'], category: 'Branding', author: '@freya_free',
        })
        expect(docs[0].payload.url).toMatch(/\/p\/1F4B8E,2E7BB8,3FA9A0$/)
      } finally {
        await ctx.close()
      }
    })
  }

  for (const [why, code] of [['the rules refuse it', 'permission-denied'], ['the network is down', 'unavailable']]) {
    test(`palette: ${why}, so it never says Submitted`, async ({ page }) => {
      watch(page, `member whose palette submission fails (${code})`)
      await signIn(page, { plan: 'free', deny: [{ path: 'community-submissions', code }] })
      await page.addInitScript(() => localStorage.setItem('vs-community-handle', 'freya_free'))
      await go(page, PALETTE)
      await openPaletteForm(page)
      await paletteDialog(page).getByLabel('Palette name for the community').fill('Harbour set')
      await paletteDialog(page).getByRole('button', { name: 'Submit palette' }).click()
      await expect(toastText(page)).toContainText(/could not reach the review queue/i)
      await expect(toastText(page)).not.toContainText(/Submitted to the community/i)
      expect(await docsIn(page, 'community-submissions')).toHaveLength(0)
    })
  }

  test('palette: signed out, the sign-in prompt comes first and no form is shown', async ({ page }) => {
    watch(page, 'visitor trying to submit a palette')
    await go(page, PALETTE)
    await page.getByRole('button', { name: 'Save or share' }).click()
    await paletteMenu(page).getByRole('button', { name: 'Submit to the community…' }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await expect(paletteDialog(page)).toHaveCount(0)
  })
})

/* ── Prompt Library ──────────────────────────────────────────────────────── */

test.describe('Prompt Library: Submit prompt', () => {
  const submitPrompt = (page) => page.getByRole('button', { name: 'Submit prompt' })

  for (const screen of SCREENS) {
    test(`prompt ${screen.label}: reachable, and writes one pending prompt with only the keys the rules allow`, async ({ browser }) => {
      const { ctx, page } = await openAt(browser, screen)
      try {
        watch(page, `member submitting a prompt at ${screen.width}px`)
        await signIn(page, { plan: 'free' })
        await page.addInitScript(() => localStorage.setItem('vs-prompt-tab', 'community'))
        await go(page, '/discover/prompts')
        await expect(submitPrompt(page)).toBeVisible()
        await submitPrompt(page).click()
        await page.getByLabel('Prompt title').fill('Harbour mood board')
        await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('A calm harbour at dusk, teal and navy.')
        await page.getByLabel('Tags').fill('harbour, calm')
        const send = page.getByRole('button', { name: 'Submit for review' })
        await expect(send).toBeVisible()
        const box = await send.boundingBox()
        expect(box.x + box.width, 'the button is on screen').toBeLessThanOrEqual(screen.width)
        await send.click()
        await expect(toastText(page)).toContainText('Prompt submitted for review')
        const docs = await docsIn(page, 'community-prompts')
        expect(docs, 'exactly one document').toHaveLength(1)
        for (const k of Object.keys(docs[0])) expect(PROMPT_KEYS, `prompt key "${k}" is not in the rules' list`).toContain(k)
        expect(docs[0]).toMatchObject({
          title: 'Harbour mood board', text: 'A calm harbour at dusk, teal and navy.', tags: 'harbour, calm',
          authorUid: 'test-uid-free', status: 'pending', profileLink: null,
        })
      } finally {
        await ctx.close()
      }
    })
  }

  test('prompt: a refused write shows the failure toast and never "submitted"', async ({ page }) => {
    watch(page, 'member whose prompt submission is refused')
    await signIn(page, { plan: 'free', deny: ['community-prompts'] })
    await page.addInitScript(() => localStorage.setItem('vs-prompt-tab', 'community'))
    await go(page, '/discover/prompts')
    await submitPrompt(page).click()
    await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('A calm harbour at dusk.')
    await page.getByRole('button', { name: 'Submit for review' }).click()
    await expect(toastText(page)).toContainText('Failed to submit')
    await expect(toastText(page)).not.toContainText(/submitted for review/i)
    expect(await docsIn(page, 'community-prompts')).toHaveLength(0)
  })

  test('prompt: signed out, the sign-in prompt comes first and no panel opens', async ({ page }) => {
    watch(page, 'visitor trying to submit a prompt')
    await page.addInitScript(() => localStorage.setItem('vs-prompt-tab', 'community'))
    await go(page, '/discover/prompts')
    await submitPrompt(page).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit for review' })).toHaveCount(0)
  })
})

/* ── /community ──────────────────────────────────────────────────────────── */

test.describe('/community: Submit design', () => {
  const designDialog = (page) => page.getByRole('dialog', { name: 'Submit a design' })

  for (const screen of SCREENS) {
    test(`design ${screen.label}: reachable, and writes one pending record with only the keys the rules allow`, async ({ browser }) => {
      const { ctx, page } = await openAt(browser, screen)
      try {
        watch(page, `member submitting a design at ${screen.width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, '/community')
        await page.getByRole('button', { name: 'Submit design' }).first().click()
        const dialog = designDialog(page)
        await expect(dialog).toBeVisible()
        const box = await dialog.boundingBox()
        expect(box.x, 'the form starts on screen').toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, 'the form fits the screen').toBeLessThanOrEqual(screen.width)
        await dialog.getByLabel('Name', { exact: true }).fill('Harbour landing')
        await dialog.getByRole('button', { name: 'Submit design' }).click()
        await expect(designDialog(page)).toHaveCount(0)
        await expect(toastText(page)).toContainText('Design submitted for review')
        const docs = await docsIn(page, 'community-submissions')
        expect(docs, 'exactly one document').toHaveLength(1)
        expectOnlyRulesKeys(docs[0])
        expect(docs[0]).toMatchObject({ kind: 'design', name: 'Harbour landing' })
      } finally {
        await ctx.close()
      }
    })
  }

  test('design: a refused write never says "submitted for review"', async ({ page }) => {
    watch(page, 'member whose design submission is refused')
    await signIn(page, { plan: 'free', deny: [{ path: 'community-submissions', code: 'permission-denied' }] })
    await go(page, '/community')
    await page.getByRole('button', { name: 'Submit design' }).first().click()
    await designDialog(page).getByLabel('Name', { exact: true }).fill('Harbour landing')
    await designDialog(page).getByRole('button', { name: 'Submit design' }).click()
    await expect(toastText(page)).toContainText(/could not reach the review queue/i)
    await expect(toastText(page)).not.toContainText(/submitted for review/i)
    expect(await docsIn(page, 'community-submissions')).toHaveLength(0)
  })
})
