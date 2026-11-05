// The Alt Text Generator as a caption sheet (/create/alt-text).
//
// One image per row, the words beside it, a primary button that always names the
// next step, and a length choice on every result. This file is the acceptance
// list from the redesign spec (handover/specs/alt-text-redesign-spec-2026-11-05.md,
// "Done when"), one test per behaviour, at 320, 390, 768 and 1280 where the
// behaviour is about width.
//
// /api/ai is stubbed with page.route, so no model is called and the reply (and
// its length) is the test's to choose. A signed-in free account is used
// throughout: the page asks a signed-out visitor to log in at the Write step,
// which 101-ai-tools-open-signed-out covers.
//
// MUTATION (each of these makes the named test fail):
//   - give the primary `disabled={!readyCount}` again: "the primary names the
//     next step" and every "no dead accent button" check fail
//   - drop the `min-height` on `.alt-row-writing`: "a writing row keeps its
//     height when the text lands" fails
//   - put `flex-wrap: wrap` on `.tl-toolbar`: "the toolbar stays on one row" fails
//   - let `.alt-row-text` clip at a height below 300 characters: "300 characters
//     fit" fails
//   - drop `!it.decorative` from the targets in `generateAll`: "Decorative image"
//     fails on the request count (the decorative one is sent to the model)
//   - point the "See plans" link anywhere but /plans: "the limit reached" fails
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { AI_LIMITS } from '../../src/config/plans.js'

const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'alttext')

/** A reply of exactly n characters. */
const reply = (n) => 'Golden retriever puppy asleep on a grey wool blanket by a window. '.repeat(10).slice(0, n)

/** Per length: 87 of 125, 300 of 300, and a technical one with no target. */
const BY_TONE = { concise: reply(87), detailed: reply(300), technical: reply(40) }

const phone = (width) => width < 768

/** A new context at the width: 390 and below are touch phones, wider is a mouse. */
async function open(browser, width, { plan = 'free', reducedMotion } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: phone(width) ? 844 : 900 },
    ...(phone(width) ? { isMobile: true, hasTouch: true } : {}),
    ...(reducedMotion ? { reducedMotion } : {}),
  })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, `someone writing alt text on a ${width}px screen`)
  await signIn(page, { plan })
  return { ctx, page }
}

/**
 * Answer /api/ai. `text(body)` chooses the reply from the request (default: by
 * tone). `hold` is a promise the first POST waits for, so a test can look at the
 * page while a request is in flight.
 */
async function stubAi(page, { text = (body) => BY_TONE[body.tone] || BY_TONE.concise, hold = null } = {}) {
  const bodies = []
  await page.route('**/api/ai', async (route) => {
    const req = route.request()
    if (req.method() !== 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    const body = req.postDataJSON()
    bodies.push(body)
    if (hold && bodies.length === 1) await hold
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ altText: text(body) }) })
  })
  return bodies
}

/** A promise and the function that settles it. */
function gate() {
  let release
  const promise = new Promise((resolve) => { release = resolve })
  return { promise, release }
}

/** A real PNG made in the page, so the tool has something to decode. */
async function pngBytes(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200
    const x = c.getContext('2d'); x.fillStyle = '#1c40f2'; x.fillRect(0, 0, 320, 200)
    return c.toDataURL('image/png').split(',')[1]
  })
  return Buffer.from(b64, 'base64')
}

async function addImages(page, names) {
  const buffer = await pngBytes(page)
  await page.locator('.alt-dropzone input[type="file"]')
    .setInputFiles(names.map((name) => ({ name, mimeType: 'image/png', buffer })))
  await expect(page.locator('.alt-row-ready')).toHaveCount(names.length, { timeout: 15000 })
}

const rowOf = (page, name) => page.locator('.alt-row').filter({ has: page.locator('.alt-row-name', { hasText: name }) })

const bar = (page) => page.locator('[data-tool-toolbar]')

/** The primary: in the dock on a phone, on the toolbar from 768. */
function primaryOf(page, width) {
  if (phone(width)) return page.locator('[data-tl-dock] .tl-btn')
  return bar(page).locator('.tl-btn--accent').or(bar(page).getByRole('button', { name: 'Stop after this image' }))
}

/** A filled button that cannot be pressed is the fault this redesign removes. */
const noDeadAccent = (page, where) =>
  expect(page.locator('button[disabled].tl-btn--accent'), `a disabled accent button ${where}`).toHaveCount(0)

const noSidewaysScroll = async (page, where) => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over, `${where}: the page scrolls sideways by ${over}px`).toBeLessThanOrEqual(0)
}

/** Everything on the toolbar shares one line. Same measure as 100-tool-toolbar-one-row. */
async function expectOneRow(page, where) {
  await expect(bar(page), `${where}: the toolbar is still measuring`).not.toHaveClass(/is-measuring/)
  const row = await bar(page).evaluate((el) => {
    const kids = [...el.children].filter((k) => {
      const r = k.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(k).position !== 'absolute'
    })
    const mids = kids.map((k) => Math.round(k.getBoundingClientRect().top + k.getBoundingClientRect().height / 2))
    return {
      children: kids.length,
      spread: Math.max(...mids) - Math.min(...mids),
      right: Math.round(Math.max(...kids.map((k) => k.getBoundingClientRect().right))),
      vw: window.innerWidth,
      height: Math.round(el.getBoundingClientRect().height),
    }
  })
  expect(row.children, `${where}: the toolbar rendered its controls`).toBeGreaterThanOrEqual(2)
  expect(row.spread, `${where}: toolbar children are on more than one line`).toBeLessThanOrEqual(2)
  expect(row.right, `${where}: the toolbar runs past the screen`).toBeLessThanOrEqual(row.vw)
  expect(row.height, `${where}: the toolbar is ${row.height}px tall, a second row`).toBeLessThan(72)
}

/** Viewport only, never the full page. Written only when asked for. */
async function shot(page, name, width) {
  if (!process.env.ALT_SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${name}-${width}.png`), fullPage: false })
}

for (const width of [390, 768, 1280]) {
  test.describe(`${width}px`, () => {
    test('empty: the primary is a filled Add images that opens the file picker, and the layout has no side panel', async ({ browser }) => {
      const { ctx, page } = await open(browser, width)
      await stubAi(page)
      await go(page, '/create/alt-text')

      const primary = primaryOf(page, width)
      await expect(primary).toHaveText(/^Add images$/)
      await expect(primary).toBeEnabled()
      // Filled: an accent button with a painted ground, not an outline.
      await expect(primary).toHaveClass(/tl-btn--accent/)
      const ground = await primary.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(ground, 'the primary has no fill').not.toBe('rgba(0, 0, 0, 0)')
      await noDeadAccent(page, 'with no images')

      // No side panel: the length pills and the context field sit in one brief above the sheet.
      await expect(page.locator('.alt-page .tl-panel')).toHaveCount(0)
      await expect(page.locator('.alt-page aside')).toHaveCount(0)
      const brief = page.locator('.alt-brief')
      await expect(brief.locator('.tl-pills')).toBeVisible()
      await expect(brief.locator('#alt-context-input')).toBeVisible()
      await expect(page.locator('.alt-sheet')).toHaveCount(0)

      // The usage bars are not on the page until the allowance has something to say.
      await expect(page.locator('.quota-track')).toHaveCount(0)
      const allowance = page.locator('.alt-allowance')
      await expect(allowance).toContainText('left today')
      expect(await allowance.evaluate((el) => getComputedStyle(el).fontSize), 'the allowance is one caption line').toBe('13px')

      // The Gemini line is above the drop zone, read before anything is uploaded, outside it, at 12.5px.
      const zone = page.locator('.alt-dropzone')
      await expect(zone.locator('.ai-image-consent')).toHaveCount(0)
      const consent = page.locator('.ai-image-consent')
      const [z, c] = [await zone.boundingBox(), await consent.boundingBox()]
      expect(c.y + c.height, 'the Gemini line sits above the drop zone').toBeLessThanOrEqual(z.y + 1)
      expect(await consent.evaluate((el) => getComputedStyle(el).fontSize)).toBe('12.5px')

      await expectOneRow(page, `${width}px, empty`)
      await noSidewaysScroll(page, `${width}px, empty`)
      await shot(page, 'empty', width)

      // Pressing the primary asks the browser for files.
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), primary.click()])
      expect(chooser.isMultiple(), 'the picker takes several images').toBe(true)
      await ctx.close()
    })

    test('the primary names the next step: Write alt text (n), Stop while it runs, Copy all when done', async ({ browser }) => {
      test.setTimeout(90000)
      const { ctx, page } = await open(browser, width)
      const held = gate()
      const bodies = await stubAi(page, { hold: held.promise })
      await go(page, '/create/alt-text')
      await addImages(page, ['one.png', 'two.png'])

      const primary = primaryOf(page, width)
      await expect(primary).toHaveText(/^Write alt text \(2\)$/)
      await noDeadAccent(page, 'with two images ready')
      await shot(page, 'ready', width)

      await primary.click()
      await expect.poll(() => bodies.length, { message: 'the first request was sent' }).toBe(1)
      await expect(primary).toHaveText(/^Stop$/)
      if (!phone(width)) await expect(bar(page).locator('.alt-count')).toHaveText('Writing 1 of 2')
      await noDeadAccent(page, 'while running')
      await shot(page, 'writing', width)

      held.release()
      // The second image is written after a pause between requests.
      await expect(primary).toHaveText(/^Copy all$/, { timeout: 25000 })
      await expect(page.locator('.alt-row-text')).toHaveCount(2)
      await noDeadAccent(page, 'with everything written')
      expect(bodies.length, 'one request per image').toBe(2)
      await shot(page, 'written', width)
      await ctx.close()
    })

    test('Stop ends the run after the image in flight and leaves the rest to write', async ({ browser }) => {
      test.setTimeout(60000)
      const { ctx, page } = await open(browser, width)
      const held = gate()
      const bodies = await stubAi(page, { hold: held.promise })
      await go(page, '/create/alt-text')
      await addImages(page, ['one.png', 'two.png'])

      const primary = primaryOf(page, width)
      await primary.click()
      await expect.poll(() => bodies.length).toBe(1)
      await expect(primary).toHaveText(/^Stop$/)
      await primary.click()
      held.release()
      await expect(primary).toHaveText(/^Write alt text \(1\)$/, { timeout: 15000 })
      expect(bodies.length, 'Stop sent no second request').toBe(1)
      await ctx.close()
    })

    test('a writing row keeps its height when the text lands', async ({ browser }) => {
      const { ctx, page } = await open(browser, width)
      const held = gate()
      // Three lines at the words' own size: the height a writing row reserves.
      await stubAi(page, { hold: held.promise, text: () => 'Golden retriever puppy asleep\non a grey wool blanket\nby a sunny window' })
      await go(page, '/create/alt-text')
      await addImages(page, ['hero.png'])

      const row = rowOf(page, 'hero.png')
      await primaryOf(page, width).click()
      await expect(row.getByText('Writing alt text…')).toBeVisible()
      const before = (await row.boundingBox()).height

      held.release()
      await expect(row.locator('textarea.alt-row-text')).toBeVisible()
      // Let the fade-in finish; it moves nothing, but the box is read after it settles.
      await expect(row.locator('textarea.alt-row-text')).toHaveCSS('opacity', '1')
      const after = (await row.boundingBox()).height
      expect(Math.abs(after - before), `the row went from ${before}px to ${after}px when the text landed`).toBeLessThanOrEqual(2)
      await ctx.close()
    })

    test('the words are the largest text on the page: 17px from 768, 16px below', async ({ browser }) => {
      const { ctx, page } = await open(browser, width)
      await stubAi(page)
      await go(page, '/create/alt-text')
      await addImages(page, ['hero.png'])
      await primaryOf(page, width).click()
      await expect(page.locator('textarea.alt-row-text')).toHaveValue(BY_TONE.concise)

      const sizes = await page.evaluate(() => {
        const words = parseFloat(getComputedStyle(document.querySelector('textarea.alt-row-text')).fontSize)
        let max = 0
        let who = ''
        const walker = document.createTreeWalker(document.querySelector('.alt-page'), NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) {
          const el = walker.currentNode.parentElement
          if (!walker.currentNode.textContent.trim() || el.closest('.sr-only') || el.closest('script, style')) continue
          const px = parseFloat(getComputedStyle(el).fontSize)
          if (px > max) { max = px; who = el.className || el.tagName }
        }
        return { words, max, who }
      })
      expect(sizes.words).toBe(phone(width) ? 16 : 17)
      expect(sizes.max, `${sizes.who} is larger than the words`).toBeLessThanOrEqual(sizes.words)
      await ctx.close()
    })

    test('Copy turns to Copied in place, raises no toast, and puts the words on the clipboard', async ({ browser }) => {
      const { ctx, page } = await open(browser, width)
      await stubAi(page)
      await go(page, '/create/alt-text')
      await addImages(page, ['hero.png'])
      await primaryOf(page, width).click()
      const row = rowOf(page, 'hero.png')
      await expect(row.locator('textarea.alt-row-text')).toHaveValue(BY_TONE.concise)

      await row.getByRole('button', { name: 'Copy', exact: true }).click()
      await expect(row.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
      await expect(row.locator('.sr-only[role="status"]')).toHaveText('Alt text copied')
      await expect(page.locator('.toast.show'), 'a single copy raises no toast').toHaveCount(0)
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null)
      if (clip !== null) expect(clip.replace(/\r\n/g, '\n'), 'CRLF from a Windows clipboard is normalised').toBe(BY_TONE.concise)
      // It returns to Copy by itself, about 1.6 seconds later.
      await expect(row.getByRole('button', { name: 'Copy', exact: true })).toBeVisible({ timeout: 4000 })
      await ctx.close()
    })

    test('Decorative image: alt="" shown, no Write or Rewrite, skipped by Write alt text, empty in the CSV and Copy all', async ({ browser }) => {
      test.setTimeout(60000)
      const { ctx, page } = await open(browser, width)
      const bodies = await stubAi(page)
      await go(page, '/create/alt-text')
      await addImages(page, ['photo.png', 'spacer.png'])

      const primary = primaryOf(page, width)
      await expect(primary).toHaveText(/^Write alt text \(2\)$/)
      const spacer = rowOf(page, 'spacer.png')
      await spacer.getByLabel('Decorative image').check()

      await expect(spacer.locator('.alt-row-deco-alt code')).toHaveText('alt=""')
      await expect(spacer.getByText('Screen readers skip this image.')).toBeVisible()
      await expect(spacer.getByRole('button', { name: 'Write', exact: true })).toHaveCount(0)
      await expect(spacer.getByRole('button', { name: /^Rewrite/ })).toHaveCount(0)
      await expect(spacer.locator('.alt-row-count')).toHaveCount(0)
      await expect(spacer.getByRole('button', { name: 'Copy empty alt' })).toBeVisible()
      // The count drops by the decorative one, and only the other image is sent.
      await expect(primary).toHaveText(/^Write alt text \(1\)$/)
      await shot(page, 'decorative', width)

      await primary.click()
      await expect(rowOf(page, 'photo.png').locator('textarea.alt-row-text')).toHaveValue(BY_TONE.concise)
      expect(bodies.length, 'the decorative image was sent to the model').toBe(1)
      await expect(primary).toHaveText(/^Copy all$/)

      // Copy all hands over a tab-separated sheet with an empty alt for the decorative row.
      await primary.click()
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null)
      if (clip !== null) expect(clip.replace(/\r\n/g, '\n'), 'CRLF from a Windows clipboard is normalised').toBe(`photo.png\t${BY_TONE.concise}\nspacer.png\t`)

      // The CSV is on the toolbar from 1280 and in the overflow below it.
      if (width >= 1280) {
        const downloaded = page.waitForEvent('download')
        await bar(page).getByRole('button', { name: 'Download CSV' }).click()
        const file = fs.readFileSync(await (await downloaded).path(), 'utf8')
        expect(file.split('\n')[0]).toBe('filename,alt_text')
        expect(file, 'the decorative row has an empty alt_text').toMatch(/^"?spacer\.png"?,(""|)\r?$/m)
      }

      // Untick: the row is a normal one again.
      await spacer.getByLabel('Decorative image').uncheck()
      await expect(spacer.getByRole('button', { name: 'Write', exact: true })).toBeVisible()
      await ctx.close()
    })

    test('the limit reached: See plans on the primary and on the row, both to /plans, and no request sent', async ({ browser }) => {
      const { ctx, page } = await open(browser, width)
      const bodies = await stubAi(page)
      await page.addInitScript((n) => {
        const d = new Date()
        const key = `vs-usage-alt-text-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        localStorage.setItem(key, String(n))
      }, AI_LIMITS.free.daily)
      await go(page, '/create/alt-text')
      await addImages(page, ['hero.png'])

      // The allowance is a line until it has something to say; at the wall it is the meter.
      await expect(page.locator('.quota-msg')).toContainText(`You've used all ${AI_LIMITS.free.daily} AI generations today.`)
      const primary = primaryOf(page, width)
      await expect(primary).toHaveText(/^See plans$/)
      await expect(primary).toHaveAttribute('href', '/plans')
      await noDeadAccent(page, 'at the limit')

      const row = rowOf(page, 'hero.png')
      await row.getByRole('button', { name: 'Write', exact: true }).click()
      const problem = row.locator('.alt-row-problem')
      await expect(problem).toContainText(`You've used all ${AI_LIMITS.free.daily} AI generations today.`)
      await expect(problem.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/plans')
      expect(bodies.length, 'a request was sent past the limit').toBe(0)
      await shot(page, 'limit', width)
      await ctx.close()
    })
  })
}

test.describe('Pro at the limit', () => {
  test('is told when it resets and is not sold the plan they have', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1280, { plan: 'pro' })
    await stubAi(page)
    await page.addInitScript((n) => {
      const d = new Date()
      const key = `vs-usage-alt-text-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      localStorage.setItem(key, String(n))
    }, AI_LIMITS.pro.daily)
    await go(page, '/create/alt-text')
    await addImages(page, ['hero.png'])
    await expect(page.locator('.quota-msg')).toContainText('It resets at 00:00 UTC')
    await expect(bar(page).locator('.tl-btn--accent'), 'Pro has no primary at the wall').toHaveCount(0)
    await rowOf(page, 'hero.png').getByRole('button', { name: 'Write', exact: true }).click()
    await expect(page.locator('.alt-row-problem')).toBeVisible()
    await expect(page.locator('.alt-row-problem a')).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('length', () => {
  test('the count is against the length that was asked for, and Rewrite sends the chosen length', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1280)
    const bodies = await stubAi(page)
    await go(page, '/create/alt-text')
    await addImages(page, ['hero.png'])
    const row = rowOf(page, 'hero.png')
    await primaryOf(page, 1280).click()
    await expect(row.locator('textarea.alt-row-text')).toHaveValue(BY_TONE.concise)
    await expect(row.locator('.alt-row-count')).toHaveText('87 of 125 characters')
    expect(bodies[0].tone).toBe('concise')

    const rewrite = row.getByRole('button', { name: /^Rewrite/ })
    await rewrite.click()
    // Three lengths, the current one ticked.
    const options = page.getByRole('option')
    await expect(options).toHaveText([/Concise/, /Detailed/, /Technical/])
    await expect(page.getByRole('option', { name: /Concise/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('option', { name: /Detailed/ })).toHaveAttribute('aria-selected', 'false')
    await page.getByRole('option', { name: /Detailed/ }).click()
    await expect(row.locator('textarea.alt-row-text')).toHaveValue(BY_TONE.detailed)
    expect(bodies[1].tone, 'Rewrite sent the chosen length').toBe('detailed')
    await expect(row.locator('.alt-row-count')).toHaveText('300 of 300 characters')

    await rewrite.click()
    await page.getByRole('option', { name: /Technical/ }).click()
    await expect(row.locator('textarea.alt-row-text')).toHaveValue(BY_TONE.technical)
    expect(bodies[2].tone).toBe('technical')
    await expect(row.locator('.alt-row-count')).toHaveText('40 characters')
    await ctx.close()
  })

  test('over the target says so in words and with an icon', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1280)
    await stubAi(page, { text: () => reply(140) })
    await go(page, '/create/alt-text')
    await addImages(page, ['hero.png'])
    await primaryOf(page, 1280).click()
    const count = rowOf(page, 'hero.png').locator('.alt-row-count')
    await expect(count).toHaveText('140 characters, 15 over the 125 target')
    await expect(count).toHaveClass(/is-over/)
    await expect(count.locator('svg'), 'the warning icon').toHaveCount(1)
    await ctx.close()
  })

  for (const width of [320, 390, 1280]) {
    test(`${width}px: 300 characters fit without the textarea scrolling`, async ({ browser }) => {
      const { ctx, page } = await open(browser, width)
      const bodies = await stubAi(page)
      await go(page, '/create/alt-text')
      await page.getByRole('button', { name: 'Detailed', exact: true }).click()
      await addImages(page, ['hero.png'])
      await primaryOf(page, width).click()
      const area = rowOf(page, 'hero.png').locator('textarea.alt-row-text')
      await expect(area).toHaveValue(BY_TONE.detailed)
      expect(bodies[0].tone).toBe('detailed')

      const fit = await area.evaluate((el) => ({
        scroll: el.scrollHeight, client: el.clientHeight,
      }))
      expect(fit.scroll, `the box scrolls: ${fit.scroll}px of text in ${fit.client}px`).toBeLessThanOrEqual(fit.client + 1)
      expect(fit.client, 'the box grew to the 260px ceiling').toBeLessThan(260)
      await noSidewaysScroll(page, `${width}px with a 300 character result`)
      await shot(page, 'long', width)
      await ctx.close()
    })
  }
})

for (const width of [320, 390, 768, 1280]) {
  test(`${width}px: the toolbar stays on one row and the page does not scroll sideways, in every state`, async ({ browser }) => {
    test.setTimeout(60000)
    const { ctx, page } = await open(browser, width)
    await stubAi(page)
    await go(page, '/create/alt-text')
    await expectOneRow(page, `${width}px, empty`)
    await noSidewaysScroll(page, `${width}px, empty`)

    await addImages(page, ['a-rather-long-file-name-for-a-hero-image-on-the-homepage.png', 'two.png', 'three.png'])
    await expectOneRow(page, `${width}px, three images`)
    await noSidewaysScroll(page, `${width}px, three images`)

    await rowOf(page, 'three.png').getByLabel('Decorative image').check()
    await rowOf(page, 'two.png').getByRole('button', { name: 'Write', exact: true }).click()
    await expect(rowOf(page, 'two.png').locator('textarea.alt-row-text')).toHaveValue(BY_TONE.concise)
    await expectOneRow(page, `${width}px, one written and one decorative`)
    await noSidewaysScroll(page, `${width}px, one written and one decorative`)
    await shot(page, 'sheet', width)
    await ctx.close()
  })
}

test.describe('phone targets', () => {
  test('390px: every control on a row is at least 44px tall', async ({ browser }) => {
    const { ctx, page } = await open(browser, 390)
    await stubAi(page)
    await go(page, '/create/alt-text')
    await addImages(page, ['hero.png', 'other.png'])
    const row = rowOf(page, 'hero.png')
    await row.getByRole('button', { name: 'Write', exact: true }).click()
    await expect(row.locator('textarea.alt-row-text')).toHaveValue(BY_TONE.concise)

    const targets = {
      primary: primaryOf(page, 390),
      copy: row.getByRole('button', { name: 'Copy', exact: true }),
      rewrite: row.getByRole('button', { name: /^Rewrite/ }),
      remove: row.getByRole('button', { name: 'Remove hero.png' }),
      decorative: row.locator('.alt-row-deco'),
      write: rowOf(page, 'other.png').getByRole('button', { name: 'Write', exact: true }),
    }
    for (const [name, loc] of Object.entries(targets)) {
      const box = await loc.boundingBox()
      expect(box.height, `${name} is ${box.height}px tall`).toBeGreaterThanOrEqual(44)
      expect(box.width, `${name} is ${box.width}px wide`).toBeGreaterThanOrEqual(44)
    }
    await ctx.close()
  })
})

test.describe('keyboard and motion', () => {
  for (const width of [390, 1280]) {
    test(`${width}px: Escape closes Rewrite and returns focus to it`, async ({ browser }) => {
      const { ctx, page } = await open(browser, width)
      await stubAi(page)
      await go(page, '/create/alt-text')
      await addImages(page, ['hero.png'])
      await primaryOf(page, width).click()
      const row = rowOf(page, 'hero.png')
      await expect(row.locator('textarea.alt-row-text')).toHaveValue(BY_TONE.concise)

      const rewrite = row.getByRole('button', { name: /^Rewrite/ })
      await rewrite.focus()
      await page.keyboard.press('Enter')
      await expect(rewrite).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(rewrite).toHaveAttribute('aria-expanded', 'false')
      await expect(rewrite).toBeFocused()
      await ctx.close()
    })
  }

  test('reduced motion: the result does not fade in', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1280, { reducedMotion: 'reduce' })
    await stubAi(page)
    await go(page, '/create/alt-text')
    await addImages(page, ['hero.png'])
    await primaryOf(page, 1280).click()
    const area = rowOf(page, 'hero.png').locator('textarea.alt-row-text')
    await expect(area).toHaveValue(BY_TONE.concise)
    expect(await area.evaluate((el) => getComputedStyle(el).animationName), 'the words fade in under reduced motion').toBe('none')
    await ctx.close()
  })
})

test('the stylesheet has no gradient, glow or transition: all', async () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'pages', 'alt-text.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  expect(css).not.toMatch(/gradient\(/)
  expect(css).not.toMatch(/transition:\s*all\b/)
  // A glow is a shadow with no offset and a wide blur; the only shadow here is a 2px focus ring.
  expect(css).not.toMatch(/box-shadow:\s*0\s+0\s+(?!0\b)\d{2,}px/)
  expect(css).not.toMatch(/drop-shadow\(/)
})

test.describe('empty state', () => {
  test('shows a person-written example measured against its target, and the guide says it opens', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1280)
    try {
      await go(page, '/create/alt-text')
      const example = page.locator('.alt-example')
      await expect(example).toBeVisible()
      await expect(example).toContainText('Example, written by a person')
      await expect(example).toContainText('59 of 125 characters')
      // The guide comes after the brief and the example, and draws its own caret.
      const caret = () => page.locator('.alt-guide summary').evaluate((el) => getComputedStyle(el, '::after').transform)
      const closed = await caret()
      expect(closed, 'the summary draws a caret').not.toBe('none')
      await page.locator('.alt-guide summary').click()
      await expect.poll(caret, { message: 'the caret turns when the guide opens' }).not.toBe(closed)
      const [ex, guide] = [await example.boundingBox(), await page.locator('.alt-guide').boundingBox()]
      expect(guide.y, 'the guide sits below the example').toBeGreaterThan(ex.y)
    } finally { await ctx.close() }
  })
})
