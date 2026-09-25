// THE ANIMATION BUILDER, DRIVEN END TO END, AND ITS OUTPUT READ BACK.
//
// Founder request, 2026-09-16: frames in → animated WebP / GIF / APNG / MP4 /
// WebM out, with reorder, frame rate, loop and a real preview, inside
// /create/file-converter.
//
// A builder like this can look finished and be wrong in ways no screenshot
// shows: frames encoded in the old order after a reorder, a GIF that loops
// forever when the visitor chose "Play twice", a frame rate that never reached
// the file. So every build here is DECODED by the browser afterwards — the
// image formats through ImageDecoder (frame count, repetition count, and the
// colour of each frame in order), the video formats through a <video>
// element's own metadata (size and duration). The engine is the real pinned
// core, answered from node_modules exactly as 57-converter-engine-cdn does.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const PERSONA = 'someone turning exported frames into a looping animation'
const CORE_DIR = path.join(process.cwd(), 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')

async function serveCore(page, { delayMs = 0 } = {}) {
  await page.route((u) => u.href.startsWith('https://cdn.jsdelivr.net/'), async (route) => {
    const name = route.request().url().split('/').pop()
    const file = path.join(CORE_DIR, name)
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' })
    if (delayMs && name.endsWith('.wasm')) await new Promise((r) => setTimeout(r, delayMs))
    return route.fulfill({
      status: 200,
      headers: { 'content-type': name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', 'access-control-allow-origin': '*' },
      body: fs.readFileSync(file),
    })
  })
}

// Four solid frames, one colour each, deliberately NAMED out of order: the
// builder must sort "frame-10" after "frame-3", not after "frame-1".
const FRAMES = [
  ['frame-10.png', '#ffff00'], // yellow — 4th by name
  ['frame-2.png', '#00ff00'], // green  — 2nd
  ['frame-1.png', '#ff0000'], // red    — 1st
  ['frame-3.png', '#0000ff'], // blue   — 3rd
]

async function makeFrames(page) {
  const out = await page.evaluate(async (list) => {
    const res = []
    for (const [name, hex] of list) {
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 48
      const x = c.getContext('2d')
      x.fillStyle = hex
      x.fillRect(0, 0, 64, 48)
      const b = await new Promise((r) => c.toBlob(r, 'image/png'))
      res.push({ name, bytes: Array.from(new Uint8Array(await b.arrayBuffer())) })
    }
    return res
  }, FRAMES)
  return out.map((f) => ({ name: f.name, mimeType: 'image/png', buffer: Buffer.from(f.bytes) }))
}

async function openBuilder(page) {
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Animation', exact: true }).click()
  await expect(page.locator('.fc-drop')).toContainText(/image frames/i)
  await page.locator('.fc-drop input[type="file"]').setInputFiles(await makeFrames(page))
  await expect(page.locator('.fc-frame')).toHaveCount(4)
}

const stripNames = (page) => page.locator('.fc-frame').evaluateAll((els) => els.map((e) => e.getAttribute('title')))

/** Decode the result in the page. Image formats: frames, repeats, colour per frame. */
async function decodeResult(page, alt, type) {
  const src = await page.locator(`img[alt="${alt}"]`).getAttribute('src')
  return page.evaluate(async ({ src, type }) => {
    const data = await (await fetch(src)).arrayBuffer()
    const d = new ImageDecoder({ data, type })
    await d.tracks.ready
    await d.completed
    const track = d.tracks.selectedTrack
    const colours = []
    for (let i = 0; i < track.frameCount; i++) {
      const { image } = await d.decode({ frameIndex: i })
      const c = new OffscreenCanvas(image.displayWidth, image.displayHeight)
      const x = c.getContext('2d')
      x.drawImage(image, 0, 0)
      const [r, g, b] = x.getImageData(c.width >> 1, c.height >> 1, 1, 1).data
      colours.push(r > 128 && g > 128 ? 'yellow' : r > 128 ? 'red' : g > 128 ? 'green' : b > 128 ? 'blue' : `?${r},${g},${b}`)
      image.close()
    }
    const rep = track.repetitionCount
    return { frames: track.frameCount, rep: rep === Infinity ? 'forever' : rep, colours, w: 0 }
  }, { src, type })
}

test.describe('the animation builder', () => {
  test('orders, reorders, previews, and every format decodes to what was chosen', async ({ page }) => {
    test.setTimeout(180_000)
    watch(page, PERSONA)
    // ImageDecoder is a secure-context API; the preview origin is http://127.0.0.1,
    // which Chromium treats as potentially trustworthy, so it is available.
    await serveCore(page)
    await openBuilder(page)

    // 1. File-name order, numbers read as numbers.
    expect(await stripNames(page)).toEqual(['frame-1.png', 'frame-2.png', 'frame-3.png', 'frame-10.png'])

    // 2. The preview plays by itself (motion allowed) — the stage's centre
    //    pixel changes colour over time, which a static image cannot do.
    const stage = page.locator('.fc-stage-canvas')
    await expect(stage).toBeVisible()
    expect(await stage.evaluate((c) => [c.width, c.height]), 'the preview is not at the output size').toEqual([64, 48])
    const seen = await stage.evaluate(async (c) => {
      const x = c.getContext('2d')
      const got = new Set()
      for (let i = 0; i < 20; i++) {
        got.add(Array.from(x.getImageData(32, 24, 1, 1).data.slice(0, 3)).join(','))
        await new Promise((r) => setTimeout(r, 60))
      }
      return got.size
    })
    expect(seen, 'the preview did not move through the frames').toBeGreaterThan(1)

    // 3. Reorder: select frame-10 (4th) and move it earlier, to 3rd.
    await page.getByRole('button', { name: /^Frame 4 of 4/ }).click()
    await page.getByRole('button', { name: 'Move earlier' }).click()
    expect(await stripNames(page)).toEqual(['frame-1.png', 'frame-2.png', 'frame-10.png', 'frame-3.png'])
    await expect(page.locator('.fc-sr')).toContainText('now frame 3 of 4')
    // Duplicate the first frame and remove the copy: the count comes back.
    await page.getByRole('button', { name: /^Frame 1 of 4/ }).click()
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await expect(page.locator('.fc-frame')).toHaveCount(5)
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.locator('.fc-frame')).toHaveCount(4)

    // 4. Timing and loop: 5 fps, play twice.
    await page.getByLabel('Frame rate (fps)').fill('5')
    await page.getByLabel('Frame rate (fps)').blur()
    await page.getByLabel('Loop').selectOption({ label: 'Play twice' })
    await expect(page.locator('.fc-inspector')).toContainText('4 frames · 0.8 s · 200 ms each')

    // Watch what the status line says while a build runs.
    await page.evaluate(() => {
      window.__said = new Set()
      new MutationObserver(() => {
        const s = document.querySelector('.fc-job .fc-status')
        if (s) window.__said.add(s.textContent.replace(/\d+/g, 'N').trim())
      }).observe(document.body, { subtree: true, childList: true, characterData: true })
    })

    const expectOrder = ['red', 'green', 'yellow', 'blue']
    const images = [
      ['GIF', 'image/gif'],
      ['Animated WebP', 'image/webp'],
      ['APNG', 'image/png'],
    ]
    for (const [label, type] of images) {
      await page.getByLabel('Output format').selectOption({ label })
      await page.getByRole('button', { name: `Build ${label}` }).click()
      const alt = `${label} result`
      await expect(page.locator(`img[alt="${alt}"]`), `no ${label} came out`).toBeVisible({ timeout: 120_000 })
      const out = await decodeResult(page, alt, type)
      expect(out.frames, `${label}: frame count`).toBe(4)
      // "Play twice" is ONE repeat, in every container's own terms.
      expect(out.rep, `${label}: "Play twice" must decode as one repeat`).toBe(1)
      expect(out.colours, `${label}: frames are not in the reordered order`).toEqual(expectOrder)
      await expect(page.getByRole('button', { name: `Download ${label}` })).toBeVisible()
    }

    const said = await page.evaluate(() => [...window.__said])
    expect(said.some((s) => s.startsWith('Preparing frame N of N')), `said: ${said.join(' | ')}`).toBe(true)
    expect(said.some((s) => /Loading converter engine/.test(s)), `the engine download was never stated: ${said.join(' | ')}`).toBe(true)

    // 5. A settings change marks the last result out of date instead of passing
    //    it off as current.
    await page.getByLabel('Loop').selectOption({ label: 'Loop forever' })
    await expect(page.locator('.fc-result')).toContainText(/changed since this was built/)
    await page.getByRole('button', { name: 'Build APNG' }).click()
    await expect(page.locator('.fc-result')).not.toContainText(/changed since this was built/, { timeout: 60_000 })
    expect((await decodeResult(page, 'APNG result', 'image/png')).rep).toBe('forever')

    // 6. The video formats: the file's own metadata, read by a <video>.
    for (const label of ['MP4 (H.264)', 'WebM (VP8)']) {
      await page.getByLabel('Output format').selectOption({ label })
      await expect(page.getByLabel('Loop'), `${label} has no loop field to set`).toBeDisabled()
      await page.getByRole('button', { name: `Build ${label}` }).click()
      const vid = page.locator(`video[aria-label="${label} result"]`)
      await expect(vid).toBeVisible({ timeout: 120_000 })
      const meta = await vid.evaluate((v) => new Promise((resolve) => {
        const done = () => resolve({ w: v.videoWidth, h: v.videoHeight, d: v.duration })
        if (v.readyState >= 1) done(); else v.addEventListener('loadedmetadata', done, { once: true })
      }))
      expect(meta.w, `${label}: width`).toBe(64)
      expect(meta.h, `${label}: height`).toBe(48)
      expect(meta.d, `${label}: 4 frames at 5 fps is 0.8 s`).toBeGreaterThan(0.6)
      expect(meta.d).toBeLessThan(1.0)
    }
  })

  test('the download is the gated step, and building is not', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, PERSONA)
    await serveCore(page)
    await openBuilder(page)
    await page.evaluate(() => {
      window.__dl = 0
      const real = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched() {
        if (this.hasAttribute('download')) window.__dl += 1
        return real.apply(this, arguments)
      }
    })
    // Building needs no account...
    await page.getByRole('button', { name: 'Build GIF' }).click()
    await expect(page.locator('img[alt="GIF result"]')).toBeVisible({ timeout: 120_000 })
    expect(await page.evaluate(() => !!document.querySelector('#ui-login-title')), 'building asked for an account').toBe(false)
    // ...taking the file away does.
    await page.getByRole('button', { name: 'Download GIF' }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible({ timeout: 10000 })
    // Dismiss it and check again: while the dialog is open the answer is not
    // in yet, so a gate whose answer is ignored would still pass here.
    await page.keyboard.press('Escape')
    await expect(page.locator('#ui-login-title'), 'the dialog did not close').toHaveCount(0)
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => window.__dl), 'the file left once the dialog was dismissed').toBe(0)
  })

  test('a signed-in visitor downloads the file', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, 'someone signed in, exporting an animation')
    await signIn(page, {})
    await serveCore(page)
    await openBuilder(page)
    await page.evaluate(() => {
      window.__dl = []
      const real = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched() {
        if (this.hasAttribute('download')) window.__dl.push(this.getAttribute('download'))
        return real.apply(this, arguments)
      }
    })
    await page.getByLabel('Output format').selectOption({ label: 'Animated WebP' })
    await page.getByRole('button', { name: 'Build Animated WebP' }).click()
    await page.getByRole('button', { name: 'Download Animated WebP' }).click({ timeout: 120_000 })
    await expect.poll(() => page.evaluate(() => window.__dl)).toEqual(['animation.webp'])
  })

  test('Cancel stops a build that is waiting on the engine', async ({ page }) => {
    test.setTimeout(60_000)
    watch(page, PERSONA)
    await serveCore(page, { delayMs: 4000 })
    await openBuilder(page)
    await page.getByRole('button', { name: 'Build GIF' }).click()
    await expect(page.locator('.fc-job .fc-status')).toContainText(/Loading converter engine/)
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.toast.show')).toContainText('Build cancelled')
    await expect(page.locator('.fc-job')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Build GIF' })).toBeEnabled()
    // Cancel unmounts itself; focus must land somewhere a keyboard user can
    // act from, not fall to <body>. The Build button is where they started.
    await expect(page.getByRole('button', { name: 'Build GIF' }), 'focus was dropped when Cancel went away').toBeFocused()
    // And nothing turns up later from the cancelled run.
    await page.waitForTimeout(5000)
    await expect(page.locator('img[alt="GIF result"]')).toHaveCount(0)
  })

  // The job line changes on every frame and every downloaded chunk. As the live
  // region it made a screen reader start a new sentence for each; now it is
  // plain text, and a separate polite region speaks only when the stage or the
  // quarter of the way through changes.
  test('a build is announced by stage and quarter, not on every frame', async ({ page }) => {
    test.setTimeout(120_000)
    watch(page, PERSONA)
    await serveCore(page)
    await openBuilder(page)
    await page.evaluate(() => {
      window.__spoken = []
      window.__visualIsLive = false
      new MutationObserver(() => {
        const job = document.querySelector('.fc-job')
        if (!job) return
        if (job.querySelector('.fc-status')?.closest('[role="status"],[aria-live]')) window.__visualIsLive = true
        for (const r of job.querySelectorAll('[role="status"],[aria-live]')) {
          const t = r.textContent.trim()
          if (t && window.__spoken[window.__spoken.length - 1] !== t) window.__spoken.push(t)
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true })
    })
    await page.getByRole('button', { name: 'Build GIF' }).click()
    await expect(page.locator('img[alt="GIF result"]')).toBeVisible({ timeout: 120_000 })
    const spoken = await page.evaluate(() => window.__spoken)
    expect(await page.evaluate(() => window.__visualIsLive), 'the per-frame job line is still a live region').toBe(false)
    // POSITIVE CONTROL: something was announced at all.
    expect(spoken.length, 'nothing about the build was announced').toBeGreaterThan(0)
    expect(spoken.length, `announced ${spoken.length} times: ${spoken.join(' | ')}`).toBeLessThanOrEqual(8)
  })

  // Cancel, then Build again before the first engine download lands. Both runs
  // used to share one `cancelled` flag, which the second Build reset to false,
  // so the first run woke up when its download finished and encoded too: two
  // results, two engine workers, one of them never terminated. Each run now
  // holds its own token, and a load that finishes after a reset is terminated
  // instead of installed.
  test('Cancel then Build again runs one job, not two', async ({ page }) => {
    test.setTimeout(90_000)
    watch(page, PERSONA)
    await page.addInitScript(() => {
      window.__workers = { made: 0, ended: 0 }
      const Real = window.Worker
      window.Worker = class extends Real {
        constructor(...a) { super(...a); window.__workers.made++ }
        terminate() { window.__workers.ended++; return super.terminate() }
      }
    })
    await serveCore(page, { delayMs: 2500 })
    await openBuilder(page)
    await page.evaluate(() => {
      window.__results = new Set()
      new MutationObserver(() => {
        const img = document.querySelector('img[alt="GIF result"]')
        if (img?.src) window.__results.add(img.src)
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] })
    })
    await page.getByRole('button', { name: 'Build GIF' }).click()
    await expect(page.locator('.fc-job .fc-status')).toContainText(/Loading converter engine/)
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Build GIF' }).click()
    await expect(page.locator('img[alt="GIF result"]')).toBeVisible({ timeout: 60_000 })
    // Long enough for the first download (2.5 s) and a whole encode to land.
    await page.waitForTimeout(6000)
    expect(await page.evaluate(() => window.__results.size), 'the cancelled run produced a result too').toBe(1)
    const w = await page.evaluate(() => window.__workers)
    // POSITIVE CONTROL: the wrap saw the engine workers at all.
    expect(w.made, 'no engine worker was ever constructed').toBeGreaterThanOrEqual(1)
    expect(w.made - w.ended, 'an engine worker from the cancelled load is still alive').toBe(1)
  })

  // Clearing the width field and tabbing away used to leave 16px — the field's
  // floor — because an empty value was read as "the smallest allowed". An
  // emptied field is not a request for 16 px; it goes back to the last width.
  test('an emptied width field keeps the last width, not the 16 px floor', async ({ page }) => {
    watch(page, PERSONA)
    await openBuilder(page)
    const width = page.getByLabel('Width (px)')
    await width.fill('40')
    await width.blur()
    await expect(width).toHaveValue('40')
    await width.fill('')
    await width.blur()
    await expect(width, 'an empty width collapsed to the floor').toHaveValue('40')
    // POSITIVE CONTROL: a real small value still clamps up to the floor.
    await width.fill('3')
    await width.blur()
    await expect(width).toHaveValue('16')
  })

  // ON A PHONE THE BUILD IS IN REACH AND ITS RESULT LANDS IN VIEW.
  // Measured before: at 390 the Build button sat at the foot of the settings,
  // about 1,870px down, and the result appeared about 900px ABOVE the screen
  // with only a toast to say so. Now Build lives in an action bar pinned to
  // the bottom of the screen on a one-column bench, the result sits directly
  // under the frame strip, and a finished build brings it into view — at once
  // under reduced motion, smoothly otherwise.
  // MUTATION: drop the revealResult call from AnimationBuilder's result
  // effect — pressing Build from the settings leaves the result off screen.
  // Or remove `position: sticky` from `.fc .fc-actionbar` in the 960px query —
  // Build is not on screen while the frame strip is.
  for (const motion of ['no-preference', 'reduce']) {
    test(`390px (${motion} motion): Build is on screen from the frame strip, and the result is brought into view`, async ({ page }) => {
      test.setTimeout(120_000)
      watch(page, 'someone building a GIF on a phone')
      await page.setViewportSize({ width: 390, height: 844 })
      await page.emulateMedia({ reducedMotion: motion })
      await serveCore(page)
      await openBuilder(page)
      const build = page.getByRole('button', { name: 'Build GIF' })

      // Looking at the frame strip, Build is on screen without scrolling.
      await page.locator('.fc-strip').evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await expect(build).toBeInViewport()

      // Press it from further down, at the settings — where the old page had
      // it — so the result is certain to be born off screen.
      await page.getByLabel('Quality').evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await expect(build).toBeInViewport()
      await build.click()
      const result = page.locator('.fc-result')
      await expect(result.locator('img[alt="GIF result"]')).toBeAttached({ timeout: 120_000 })

      // The result's top sits between the sticky toolbar and the pinned bar.
      const place = async () => result.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const bar = document.querySelector('[data-tool-toolbar]').getBoundingClientRect()
        const foot = document.querySelector('.fc-actionbar').getBoundingClientRect()
        return { top: Math.round(r.top), barBottom: Math.round(bar.bottom), footTop: Math.round(foot.top) }
      })
      await expect.poll(async () => {
        const p = await place()
        return p.top >= p.barBottom - 1 && p.top < p.footTop - 40
      }, { timeout: motion === 'reduce' ? 1500 : 5000, message: 'the result did not come into view' }).toBe(true)
      // The download is right there with it.
      await expect(page.getByRole('button', { name: 'Download GIF' })).toBeInViewport()
    })
  }

  test('with reduced motion the preview waits on frame one for Play', async ({ page }) => {
    watch(page, PERSONA)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openBuilder(page)
    const play = page.getByRole('button', { name: 'Play' })
    await expect(play, 'the preview started itself under reduced motion').toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.fc-transport-pos')).toHaveText('Frame 1 of 4')
    await page.waitForTimeout(800)
    await expect(page.locator('.fc-transport-pos')).toHaveText('Frame 1 of 4')
    // Asked for, it plays.
    await play.click()
    await expect(page.locator('.fc-transport-pos')).not.toHaveText('Frame 1 of 4', { timeout: 3000 })
  })
})
