// The prompt library shows the OUTPUT, and a click runs it.
//
// Founder, 2026-09-15: "instead of showing a code snippet we can show the
// actual output in a real preview style. or even better is showing it but on
// click it shows the actual output in live preview. similar to other component
// libraries."
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ONE ASSERTION HERE THAT IS NOT ABOUT DESIGN
// ─────────────────────────────────────────────────────────────────────────────
// `sandbox="allow-scripts"` WITHOUT `allow-same-origin` is the whole security
// model of this feature, and the two flags together are a documented sandbox
// escape: a frame granted both can reach into the parent's origin — our
// cookies, our localStorage, the Firebase session — because it is no longer in
// an opaque origin. The pages are ours today; the shape of the feature invites
// community-submitted ones tomorrow, and by then this test is the thing
// standing between a submitted page and a signed-in user's account.
//
// It is asserted on the RENDERED attribute rather than in the source, because
// what matters is what the browser was handed.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'
import { PROMPT_PREVIEW_IDS } from '../../src/data/promptPreviewAssets.js'

const withPreview = COMMUNITY_PROMPTS.filter((p) => PROMPT_PREVIEW_IDS.includes(p.id))

async function openLibrary(browser, width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await context.newPage()
  watch(page, 'a visitor browsing the prompt library for something to copy')
  await go(page, '/discover/prompts')
  await expect(page.locator('.pl-card').first()).toBeVisible()
  return { context, page }
}

test.describe('the prompt library shows its outputs', () => {
  test('a prompt whose output exists shows the output, not its own text', async ({ browser }) => {
    const { context, page } = await openLibrary(browser)

    const shots = page.locator('[data-preview-kind="output"]')
    await expect(shots.first()).toBeVisible()
    const n = await shots.count()
    expect(n, 'no card is showing a built output').toBeGreaterThan(0)

    // Every poster must actually load. A broken <img> here is a grey box where
    // the product's shop window should be, and it would not fail any other test.
    const broken = await page.evaluate(() => {
      const out = []
      for (const img of document.querySelectorAll('[data-preview-kind="output"] img')) {
        if (!img.complete || img.naturalWidth === 0) out.push(img.getAttribute('src'))
      }
      return out
    })
    expect(broken, 'a poster failed to load').toEqual([])
    await context.close()
  })

  test('the modal opens on the PROMPT, and running it is one click', async ({ browser }) => {
    const { context, page } = await openLibrary(browser)
    const first = withPreview[0]

    await page.locator('.pl-card', { hasText: first.title }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // The prompt is what a prompt library is for; the output is the evidence.
    await expect(dialog.locator('.pl-modal-prompt pre')).toBeVisible()
    await expect(dialog.locator('.pl-modal-frame'), 'the iframe must not be mounted until asked for')
      .toHaveCount(0)

    await dialog.getByRole('tab', { name: /see it running/i }).click()
    const frame = dialog.locator('.pl-modal-frame')
    await expect(frame).toBeVisible()
    await expect(dialog.locator('.pl-modal-prompt'), 'the two views share one panel').toHaveCount(0)

    // …and back, so the copy path is never a trap.
    await dialog.getByRole('tab', { name: /the prompt/i }).click()
    await expect(dialog.locator('.pl-modal-prompt pre')).toBeVisible()
    await expect(dialog.locator('.pl-modal-frame')).toHaveCount(0)
    await context.close()
  })

  test('the live frame is sandboxed WITHOUT same-origin', async ({ browser }) => {
    const { context, page } = await openLibrary(browser)
    const first = withPreview[0]

    await page.locator('.pl-card', { hasText: first.title }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('tab', { name: /see it running/i }).click()
    const frame = dialog.locator('.pl-modal-frame')
    await expect(frame).toBeVisible()

    const sandbox = await frame.getAttribute('sandbox')
    expect(sandbox, 'the preview iframe has no sandbox attribute at all').not.toBeNull()

    const flags = sandbox.split(/\s+/).filter(Boolean)
    expect(flags, 'scripts are needed, or every animated preview is a dead rectangle')
      .toContain('allow-scripts')
    expect(flags,
      'allow-same-origin WITH allow-scripts lets the framed page reach our origin — ' +
      'cookies, localStorage, the signed-in Firebase session. Never both.')
      .not.toContain('allow-same-origin')
    for (const never of ['allow-top-navigation', 'allow-top-navigation-by-user-activation',
      'allow-popups', 'allow-modals', 'allow-downloads', 'allow-forms']) {
      expect(flags, `a preview must not be granted ${never}`).not.toContain(never)
    }

    // The src must be one of ours, not something a payload could steer.
    const src = await frame.getAttribute('src')
    expect(src).toMatch(/^\/previews\/prompts\/c-\d+\.html$/)
    await context.close()
  })

  test('the output really runs inside the frame', async ({ browser }) => {
    // The point of the live view. A frame that loaded a blank document would
    // pass every assertion above.
    const { context, page } = await openLibrary(browser)
    const first = withPreview[0]

    await page.locator('.pl-card', { hasText: first.title }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('tab', { name: /see it running/i }).click()
    await expect(dialog.locator('.pl-modal-frame')).toBeVisible()

    const inner = page.frameLocator('.pl-modal-frame')
    await expect(inner.locator('body'), 'the framed document never rendered').toBeVisible()
    const text = await inner.locator('body').innerText()
    expect(text.trim().length, 'the framed page is empty').toBeGreaterThan(40)
    await context.close()
  })

  test('the manifest matches the prompts and nothing is quietly missing', async ({ browser }) => {
    // Guards the generated file against the library. A prompt id listed with no
    // page, or a page referenced by no prompt, is a broken card either way.
    const ids = new Set(COMMUNITY_PROMPTS.map((p) => p.id))
    for (const id of PROMPT_PREVIEW_IDS) {
      expect(ids.has(id), `${id} has a preview but is not a community prompt`).toBe(true)
    }
    expect(PROMPT_PREVIEW_IDS.length).toBeGreaterThan(0)

    // And both files are actually served.
    const { context, page } = await openLibrary(browser)
    for (const id of PROMPT_PREVIEW_IDS) {
      const html = await page.request.get(`/previews/prompts/${id}.html`)
      expect(html.status(), `/previews/prompts/${id}.html is not served`).toBe(200)
      const poster = await page.request.get(`/previews/prompts/poster/${id}.webp`)
      expect(poster.status(), `poster for ${id} is not served`).toBe(200)
    }
    await context.close()
  })
})
