// The community prompt gallery: a 3 / 2 / 1 column grid of large cards whose
// output plays as an animation while the card is on screen, a Save that
// toggles, and a "See it running" view whose demo scrolls inside its own
// frame while the dialog around it holds still.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'
import { PROMPT_PREVIEW_IDS, PROMPT_ANIM_IDS } from '../../src/data/promptPreviewAssets.js'

async function openLibrary(browser, { width = 1440, height = 900, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion })
  await context.addInitScript(() => { try { localStorage.setItem('vs-prompt-tab', 'community') } catch { /* no storage */ } })
  const page = await context.newPage()
  watch(page, 'a visitor browsing community prompts')
  await go(page, '/discover/prompts')
  await expect(page.locator('.pl-card').first()).toBeVisible()
  return { context, page }
}

const firstCardId = async (page) => {
  const title = (await page.locator('.pl-card .pl-card-title').first().innerText()).trim()
  return COMMUNITY_PROMPTS.find((p) => p.title === title)?.id
}

test.describe('the community prompt gallery', () => {
  for (const [width, cols] of [[1440, 3], [768, 2], [390, 1]]) {
    test(`${cols} column${cols > 1 ? 's' : ''} at ${width}px, 16:10 previews, nothing wider than the page`, async ({ browser }) => {
      const { context, page } = await openLibrary(browser, { width })
      const m = await page.evaluate(() => {
        const grid = document.querySelector('.pl-gallery')
        const cards = [...grid.querySelectorAll(':scope > .pl-card-cell')]
        const tops = new Set(cards.slice(0, 3).map((c) => Math.round(c.getBoundingClientRect().top)))
        const shot = grid.querySelector('.pl-card-shot')
        const r = shot?.getBoundingClientRect()
        return {
          track: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          firstRow: cards.length >= 3 ? cards.slice(0, 3).filter((c) => Math.round(c.getBoundingClientRect().top) === [...tops][0]).length : null,
          ratio: r ? r.width / r.height : null,
          overflow: document.documentElement.scrollWidth - innerWidth,
        }
      })
      expect(m.track, 'grid column count').toBe(cols)
      if (m.firstRow !== null) expect(m.firstRow, 'cards on the first row').toBe(Math.min(cols, 3))
      if (m.ratio !== null) expect(Math.abs(m.ratio - 1.6), `preview is ${m.ratio?.toFixed(3)}:1, not 16:10`).toBeLessThan(0.03)
      expect(m.overflow, 'horizontal overflow').toBeLessThanOrEqual(0)
      await context.close()
    })
  }

  test('the animation plays only while its card is on screen, with no layout shift', async ({ browser }) => {
    // A phone, where one column puts the last card below the fold.
    const { context, page } = await openLibrary(browser, { width: 390, height: 844 })
    const cell = page.locator('.pl-gallery > .pl-card-cell').last()
    const title = (await cell.locator('.pl-card-title').innerText()).trim()
    const id = COMMUNITY_PROMPTS.find((p) => p.title === title)?.id
    test.skip(!PROMPT_ANIM_IDS.includes(id), 'no animation captured for this card in this build')

    const shot = cell.locator('.pl-card-shot')
    const anim = shot.locator('img.pl-card-anim')
    // Below the fold: the still only, nothing decoded.
    await expect(shot).toHaveAttribute('data-anim', 'off')
    await expect(anim).toHaveCount(0)
    const before = await shot.evaluate((el) => el.getBoundingClientRect().height)

    // On screen: it plays, over the poster, in the same box.
    await shot.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(shot).toHaveAttribute('data-anim', 'on')
    await expect(anim).toHaveAttribute('src', `/previews/prompts/anim/${id}.webp`)
    await expect(shot, 'the animation never finished loading').toHaveClass(/is-playing/)
    const after = await shot.evaluate((el) => el.getBoundingClientRect().height)
    expect(after, 'the preview box changed size when the animation arrived').toBe(before)

    // Off screen again: unmounted, so its frames are released.
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(shot).toHaveAttribute('data-anim', 'off')
    await expect(anim).toHaveCount(0)
    await context.close()
  })

  test('reduced motion keeps the still poster and never fetches an animation', async ({ browser }) => {
    test.skip(!PROMPT_ANIM_IDS.length, 'no animations captured in this build')
    const { context, page } = await openLibrary(browser, { reducedMotion: 'reduce' })
    const fetched = []
    page.on('request', (r) => { if (r.url().includes('/previews/prompts/anim/')) fetched.push(r.url()) })
    await page.waitForTimeout(800)
    await expect(page.locator('.pl-card-shot').first()).toHaveAttribute('data-anim', 'off')
    expect(await page.locator('img.pl-card-anim').count()).toBe(0)
    expect(fetched, 'an animation was requested under reduced motion').toEqual([])
    await context.close()
  })

  test('Save toggles: pressed state, unsave with Undo, the same in the modal', async ({ browser }) => {
    const { context, page } = await openLibrary(browser)
    const id = await firstCardId(page)
    const save = page.locator('.pl-card-save').first()
    const myCount = page.locator('.pl-tab', { hasText: 'My Prompts' }).locator('.pl-tab-count')

    await expect(save).toHaveAttribute('aria-pressed', 'false')
    await save.click()
    await expect(save).toHaveAttribute('aria-pressed', 'true')
    await expect(myCount).toHaveText('1')

    // The modal's Save reads the same state, and unsaving there is the same toggle.
    await page.locator('.pl-card').first().click()
    const dialog = page.getByRole('dialog')
    const modalSave = dialog.locator('.pl-modal-footer .pl-save')
    await expect(modalSave).toHaveAttribute('aria-pressed', 'true')
    await modalSave.click()
    await expect(modalSave).toHaveAttribute('aria-pressed', 'false')
    await expect(myCount, 'the library copy was not removed').toHaveCount(0)

    // The ledger keeps the unsave, stamped, so another device cannot undo it.
    const entry = await page.evaluate((cid) => JSON.parse(localStorage.getItem('vs-saved-prompt-ids') || '[]').find((e) => e.id === cid), id)
    expect(entry?.saved).toBe(false)
    expect(Number.isFinite(entry?.at) && entry.at > 0).toBe(true)

    // Undo puts the save and the copy back.
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(modalSave).toHaveAttribute('aria-pressed', 'true')
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(save).toHaveAttribute('aria-pressed', 'true')
    await expect(myCount).toHaveText('1')
    await context.close()
  })

  for (const width of [1440, 390]) {
    test(`"See it running" at ${width}px: the whole demo is on screen and scrolls inside its frame`, async ({ browser }) => {
      const { context, page } = await openLibrary(browser, { width, height: width < 700 ? 844 : 900 })
      const id = await firstCardId(page)
      test.skip(!PROMPT_PREVIEW_IDS.includes(id), 'the first card has no demo')
      await page.locator('.pl-card').first().click()
      const dialog = page.getByRole('dialog')
      const frameEl = dialog.locator('.pl-modal-frame')
      await expect(frameEl).toBeVisible()

      const box = await dialog.locator('.pl-modal-stage').boundingBox()
      const foot = await dialog.locator('.pl-modal-footer').boundingBox()
      expect(box.y + box.height, 'the demo runs under the footer').toBeLessThanOrEqual(foot.y + 1)
      expect(box.y + box.height, 'the demo runs off the screen').toBeLessThanOrEqual((width < 700 ? 844 : 900))

      // The dialog keeps its size when the view changes, in both directions.
      const size = async () => { const b = await dialog.boundingBox(); return `${Math.round(b.width)}x${Math.round(b.height)}` }
      const live = await size()
      await dialog.getByRole('tab', { name: /the prompt/i }).click()
      await expect(dialog.locator('.pl-modal-prompt pre')).toBeVisible()
      expect(await size(), 'the dialog resized when the prompt view opened').toBe(live)
      await dialog.getByRole('tab', { name: /see it running/i }).click()
      await expect(frameEl).toBeVisible()
      expect(await size()).toBe(live)

      const frame = await (await frameEl.elementHandle()).contentFrame()
      await expect.poll(() => frame.evaluate(() => document.readyState)).toBe('complete')
      const tall = await frame.evaluate(() => document.documentElement.scrollHeight > innerHeight + 200)
      test.skip(!tall, 'this demo is shorter than its frame')

      const bodyBefore = await dialog.locator('.pl-modal-body').evaluate((el) => el.scrollTop)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.wheel(0, 600)
      await expect.poll(() => frame.evaluate(() => scrollY), { message: 'the demo did not scroll' }).toBeGreaterThan(0)
      expect(await dialog.locator('.pl-modal-body').evaluate((el) => el.scrollTop), 'the dialog scrolled instead').toBe(bodyBefore)
      await context.close()
    })
  }
})
