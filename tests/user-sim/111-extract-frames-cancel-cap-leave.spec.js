// EXTRACT FRAMES: CANCEL, THE 500-FRAME CAP, AND STOPPING WHEN YOU LEAVE.
//
// /create/file-converter > "Extract frames" has three things that need guarding:
//
//   1. A Cancel button beside the progress bar. It keeps the frames already
//      made, says so in a toast ("Extraction cancelled — kept N frames", or
//      "Extraction cancelled" when there are none), and gives the controls
//      back.
//   2. MAX_FRAMES = 500. A separate warning ("Stops at 500 frames, at m:ss.")
//      shows when the estimate is higher, and a run stops at 500 and says so.
//   3. Leaving the tab mid-run (switching converter mode) aborts the run via
//      the unmount effect: no toast, no further seeks, no console noise.
//
// HOW THE CLIP IS FAKED, AND WHY
// A real 10-minute clip is far too slow for a test, and MediaRecorder's webm
// has no duration (Infinity), so the page would compute an infinite estimate.
// The clip is a real, decodable 1-second webm recorded in the page, so the
// upload, metadata, canvas and toBlob paths are the real ones. Three
// HTMLVideoElement members are replaced by an init script:
//   duration     -> window.__fake.duration  (the length the test wants)
//   currentTime  -> a setter that counts the seek and fires `seeked` after
//                   window.__fake.seekMs (Infinity = never, a stalled seek)
// The seek count is the oracle for "the run really stopped": a loop that
// kept going after Cancel or after leaving would keep counting.
//
// MUTATIONS (each makes a test below go red):
//   - FileConverter.jsx: delete `useEffect(() => disposeRun, [disposeRun])`
//     -> "switching mode mid-run" goes red (a toast fires after the tab is
//     gone and seeks keep counting).
//   - cancelExtract(): delete `abortRef.current.abort('cancel')`
//     -> both Cancel tests go red (no toast, controls stay disabled).
//   - extract(): change `Math.min(MAX_FRAMES, wanted)` to `wanted`
//     -> the cap test goes red (600 frames made, not 500).
//   - abandoned(): change `disposedRef.current.has(ac)` back to
//     `signal.aborted && signal.reason !== 'cancel'`
//     -> "Cancel, then switching mode" goes red (a toast fires after the tab is gone).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'someone pulling frames out of a clip, then changing their mind'
const MAX_FRAMES = 500

/** Console errors/warnings and uncaught exceptions on this page, for the whole test. */
function collectNoise(page) {
  const noise = []
  page.on('pageerror', (e) => noise.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return
    // Vercel's analytics script exists only on Vercel; vite preview answers 404.
    if (/\/_vercel\//.test(m.location().url || '')) return
    noise.push(`${m.type()}: ${m.text()} (${m.location().url})`)
  })
  return noise
}

/** Replace the video's length and seeking with something the test controls. */
async function fakeTheClock(page) {
  await page.addInitScript(() => {
    window.__fake = { duration: 10, seekMs: 0, seeks: 0, encodeMs: 0 }
    // encodeMs > 0 holds each toBlob result back, like a slow encode that
    // cannot be interrupted: the one place a Cancel is still "in flight".
    const realToBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (cb, ...rest) {
      const ms = window.__fake.encodeMs
      if (!ms) return realToBlob.call(this, cb, ...rest)
      return realToBlob.call(this, (b) => setTimeout(() => cb(b), ms), ...rest)
    }
    const proto = HTMLVideoElement.prototype
    Object.defineProperty(proto, 'duration', { configurable: true, get() { return window.__fake.duration } })
    Object.defineProperty(proto, 'currentTime', {
      configurable: true,
      get() { return this.__t || 0 },
      set(v) {
        this.__t = v
        window.__fake.seeks++
        const ms = window.__fake.seekMs
        if (ms === Infinity) return // a seek that never completes
        setTimeout(() => this.dispatchEvent(new Event('seeked')), ms)
      },
    })
    // Every toast text that ever appears, so a toast that comes and goes
    // between two polls is still seen.
    window.__toasts = []
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(() => {
        document.querySelectorAll('.toast.show').forEach((t) => {
          const text = t.textContent.trim()
          if (text && window.__toasts[window.__toasts.length - 1] !== text) window.__toasts.push(text)
        })
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true })
    })
  })
}

/** Open Extract frames, upload a real 1 s webm, and make the page believe it is `duration` s long. */
async function openWithClip(page, { duration, seekMs }) {
  await fakeTheClock(page)
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Extract frames', exact: true }).click()
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
    const c = canvas.getContext('2d'); c.fillStyle = '#1c40f2'; c.fillRect(0, 0, 64, 64)
    const rec = new MediaRecorder(canvas.captureStream(10)); const chunks = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise((r) => { rec.onstop = r })
    rec.start()
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#1c40f2' : '#f24040'; c.fillRect(0, 0, 64, 64); await new Promise((r) => setTimeout(r, 100)) }
    rec.stop(); await stopped
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  })
  await page.evaluate(({ duration: d, seekMs: s }) => { window.__fake.duration = d; window.__fake.seekMs = s }, { duration, seekMs })
  await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from(clip) })
  await expect(page.getByRole('button', { name: 'Extract Frames' }), 'the clip never loaded its metadata').toBeEnabled({ timeout: 15000 })
}

const extractBtn = (page) => page.locator('.fc-actions .fc-btn--primary')
const cancelBtn = (page) => page.getByRole('button', { name: 'Cancel', exact: true })
const seeks = (page) => page.evaluate(() => window.__fake.seeks)
const toasts = (page) => page.evaluate(() => window.__toasts)
const frameCount = async (page) => {
  const head = page.locator('.fc-frames-head .fc-eyebrow')
  if (!(await head.count())) return 0
  return Number(/\(([\d,]+)\)/.exec(await head.textContent())[1].replace(/,/g, ''))
}

test.describe('Extract frames: Cancel', () => {
  test('Cancel mid-run keeps the frames made, toasts the count, and gives the controls back', async ({ page }) => {
    watch(page, PERSONA)
    const noise = collectNoise(page)
    // 60 s at the default 2 fps is 120 frames, 60 ms each: about 7 s, and
    // plenty of time to press Cancel once a few are made.
    await openWithClip(page, { duration: 60, seekMs: 60 })
    await extractBtn(page).click()

    const bar = page.getByRole('progressbar', { name: 'Frames extracted' })
    await expect(bar).toBeVisible()
    // POSITIVE CONTROL: it is really running, and the controls are locked.
    await expect.poll(async () => Number(await bar.getAttribute('aria-valuenow')), { timeout: 10000 }).toBeGreaterThan(5)
    await expect(page.locator('#fc-fr-fps'), 'the inputs were not locked during the run').toBeDisabled()
    await expect(extractBtn(page)).toBeDisabled()

    await cancelBtn(page).click()

    const toast = page.locator('.toast.show')
    await expect(toast).toContainText(/Extraction cancelled — kept \d+ frames?/, { timeout: 10000 })
    await expect(toast, 'a cancel is not an error').toHaveClass(/toast-info/)
    const kept = Number(/kept (\d+) frame/.exec(await toast.textContent())[1])
    expect(kept, 'Cancel threw away every frame').toBeGreaterThan(0)
    expect(kept, 'Cancel did not stop the run: it made every one of the 120 frames').toBeLessThan(120)

    // The frames really are on the page, and the toast's number is the page's number.
    await expect(page.getByRole('region', { name: 'Extracted frames' })).toBeVisible()
    expect(await frameCount(page)).toBe(kept)
    await expect(page.locator('.fc-grid li')).toHaveCount(kept)

    // Controls back: Extract is enabled with its own label, inputs unlocked, Cancel gone.
    await expect(extractBtn(page)).toBeEnabled()
    await expect(extractBtn(page)).toHaveText('Extract Frames')
    await expect(page.locator('#fc-fr-fps')).toBeEnabled()
    await expect(cancelBtn(page)).toHaveCount(0)
    await expect(extractBtn(page), 'focus was left on a button that no longer exists').toBeFocused()

    // And it stays stopped: no more seeks after the toast.
    const settled = await seeks(page)
    await page.waitForTimeout(400) // absence check: 6+ seeks would land in this window
    expect(await seeks(page), 'the loop kept seeking after Cancel').toBe(settled)
    expect(noise, 'console noise after a cancel').toEqual([])
  })

  test('Cancel while the first seek is still pending says "Extraction cancelled" and shows no frames', async ({ page }) => {
    watch(page, PERSONA)
    const noise = collectNoise(page)
    // seekMs Infinity: the first seek never completes, so the loop is parked
    // inside a pending wait. Cancel has to cut that wait, not just the loop test.
    await openWithClip(page, { duration: 60, seekMs: Infinity })
    await extractBtn(page).click()
    await expect(cancelBtn(page)).toBeVisible()
    await expect.poll(() => seeks(page), { message: 'the run never reached its first seek' }).toBeGreaterThanOrEqual(1)

    await cancelBtn(page).click()

    const toast = page.locator('.toast.show')
    await expect(toast).toContainText('Extraction cancelled', { timeout: 10000 })
    expect((await toast.textContent()).trim(), 'no frames were made, so it should not say "kept"').toBe('Extraction cancelled')
    expect(await frameCount(page)).toBe(0)
    await expect(extractBtn(page)).toBeEnabled()
    await expect(extractBtn(page)).toHaveText('Extract Frames')
    await expect(cancelBtn(page)).toHaveCount(0)
    expect(noise).toEqual([])
  })
})

test.describe('Extract frames: the 500-frame cap', () => {
  test('an estimate over 500 shows the "Stops at 500 frames" warning, and an estimate under it does not', async ({ page }) => {
    watch(page, PERSONA)
    // 100 s at the default 2 fps: 200 frames. No cap wording.
    await openWithClip(page, { duration: 100, seekMs: 0 })
    const note = page.locator('.fc-note').filter({ hasText: /frames/ }).first()
    await expect(note).toContainText('~200 frames')
    const capNote = page.locator('.fc-note--warn')
    await expect(capNote, 'the cap is mentioned for a run that is under it').toHaveCount(0)

    // 20 fps over 100 s: 2,000 frames. The meta line stays a plain count; the cap is its own warning.
    await page.locator('#fc-fr-fps').fill('20')
    await expect(note).toContainText('~2,000 frames')
    await expect(note, 'the cap leaked back into the grey meta line').not.toContainText('Stops at')
    await expect(capNote).toHaveText(`Stops at ${MAX_FRAMES} frames, at 0:25. Lower the FPS or shorten the range to get the rest.`)
    await expect(page.getByText(`${MAX_FRAMES} of ~2,000`, { exact: true }), 'the Est. frames stat should read "500 of ~2,000"').toBeVisible()
    // And the way out the wording offers works: a shorter range clears it.
    await page.getByLabel('Range end (seconds)').fill('10')
    await expect(note).toContainText('~200 frames')
    await expect(capNote).toHaveCount(0)
  })

  test('a run whose estimate is over 500 stops at exactly 500 frames and says so', async ({ page }) => {
    watch(page, PERSONA)
    const noise = collectNoise(page)
    test.setTimeout(90_000)
    // 300 s at the default 2 fps: 600 frames, 100 over the cap.
    await openWithClip(page, { duration: 300, seekMs: 0 })
    await expect(page.locator('.fc-note').filter({ hasText: /frames/ }).first()).toContainText('~600 frames')
    await expect(page.getByText(`${MAX_FRAMES} of ~600`, { exact: true }), 'the Est. frames stat shows the uncapped number').toBeVisible()
    await expect(page.locator('.fc-note--warn')).toContainText(`Stops at ${MAX_FRAMES} frames, at 4:10.`)
    await extractBtn(page).click()

    const toast = page.locator('.toast.show')
    await expect(toast).toContainText(`Extracted ${MAX_FRAMES} frames, the most one run makes`, { timeout: 60000 })
    await expect(page.getByRole('heading', { name: `Extracted frames (${MAX_FRAMES})` })).toBeVisible()
    await expect(page.locator('.fc-grid li')).toHaveCount(MAX_FRAMES)
    // Frame numbering is contiguous, so the last one made is frame-0500.
    await expect(page.locator('.fc-grid li').last().locator('.fc-name')).toHaveText('frame-0500.png')
    await expect(extractBtn(page)).toBeEnabled()
    expect(noise).toEqual([])
  })

  test('an estimate of exactly 500 is not capped: no note, no cap toast', async ({ page }) => {
    watch(page, PERSONA)
    test.setTimeout(90_000)
    // 250 s at the default 2 fps: exactly 500 frames, nothing dropped.
    await openWithClip(page, { duration: 250, seekMs: 0 })
    const note = page.locator('.fc-note').filter({ hasText: /frames/ }).first()
    await expect(note).toContainText('~500 frames')
    await expect(page.locator('.fc-note--warn'), 'the cap note shows for a run that fits').toHaveCount(0)
    await extractBtn(page).click()
    await expect(page.locator('.toast.show')).toHaveText(/^Extracted 500 frames$/, { timeout: 60000 })
  })

  test('a run under the cap finishes with the plain "Extracted N frames" toast', async ({ page }) => {
    watch(page, PERSONA)
    // 10 s at 2 fps: 20 frames (t = 0 .. 9.5). Doubles as the positive control for the toast probe.
    await openWithClip(page, { duration: 10, seekMs: 0 })
    await extractBtn(page).click()
    const toast = page.locator('.toast.show')
    await expect(toast).toHaveText(/^Extracted 20 frames$/, { timeout: 20000 })
    await expect(page.locator('.fc-grid li')).toHaveCount(20)
  })
})

test.describe('Extract frames: leaving mid-run', () => {
  test('switching converter mode mid-run stops the run silently: no toast, no more seeks, no console noise', async ({ page }) => {
    watch(page, PERSONA)
    const noise = collectNoise(page)
    // 10 s at 2 fps, 30 ms a seek: the run would finish by itself in ~0.7 s.
    await openWithClip(page, { duration: 10, seekMs: 30 })
    await extractBtn(page).click()
    const bar = page.getByRole('progressbar', { name: 'Frames extracted' })
    await expect.poll(async () => Number(await bar.getAttribute('aria-valuenow')), { timeout: 10000 }).toBeGreaterThan(0)

    await page.getByRole('tab', { name: 'Image', exact: true }).click()
    await expect(page.locator('.fc-drop').first()).toBeVisible()
    const atLeave = await seeks(page)

    // Absence check: wait well past the run's own finish time (~0.7 s) so a run
    // that was NOT stopped has time to toast and keep seeking.
    await page.waitForTimeout(2000)

    expect(await seeks(page) - atLeave, 'the run kept seeking after its tab was gone').toBeLessThanOrEqual(1)
    expect(await toasts(page), 'a toast fired from a run nobody can see').toEqual([])
    expect(noise, 'console errors or warnings after leaving mid-run').toEqual([])

  })

  test('Cancel, then switching mode before the in-flight encode returns, stays silent', async ({ page }) => {
    watch(page, PERSONA)
    const noise = collectNoise(page)
    // The first frame's encode takes 1.5 s and cannot be interrupted. Cancel
    // lands inside it, then the tab changes before it returns. An AbortController
    // keeps its FIRST reason ('cancel'), so a check on the reason alone would
    // treat the run as merely cancelled and toast + set state on a gone page.
    await openWithClip(page, { duration: 10, seekMs: 0 })
    await page.evaluate(() => { window.__fake.encodeMs = 1500 })
    await extractBtn(page).click()
    await expect(cancelBtn(page)).toBeVisible()
    await expect.poll(() => seeks(page), { message: 'the run never reached its first seek' }).toBeGreaterThanOrEqual(1)

    await cancelBtn(page).click()
    await page.getByRole('tab', { name: 'Image', exact: true }).click()
    await expect(page.locator('.fc-drop').first()).toBeVisible()

    // Absence check: wait past the 1.5 s encode so the late result has landed.
    await page.waitForTimeout(2500)

    expect(await toasts(page), 'a toast fired from a run that was cancelled and then left').toEqual([])
    expect(noise, 'console errors or warnings after Cancel then leave').toEqual([])
  })
})
