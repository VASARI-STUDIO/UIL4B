// /create/3d-viewer, walked by someone who has a model and wants another format.
//
// What a unit test cannot prove and this does, in a real Chromium:
//   - the model is actually DRAWN (pixels on the canvas, not a call that returned),
//   - the keyboard moves the view,
//   - the panel and the screen-reader summary say what was loaded,
//   - a conversion to 3MF produces a file that this same viewer opens again
//     with the same triangle count (ThreeMFLoader needs DOMParser, so this
//     round trip cannot run under node --test),
//   - the download asks a signed-out visitor for an account and nobody else,
//   - three.js is not fetched until a model is brought,
//   - wrong and broken files get a sentence, not a success,
//   - a STEP file when the CAD engine cannot be fetched says so, and the
//     mesh formats keep working.
//
// FIXTURES are built here: a binary STL of a 2 x 1 x 1 box (12 triangles),
// written byte by byte, and a few bytes of junk. Nothing binary is committed.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const PERSONA = 'a designer converting a 3D model for a client'
const ROUTE = '/create/3d-viewer'

/** A binary STL of an axis-aligned box, 12 triangles. */
function boxStl([sx, sy, sz] = [2, 1, 1]) {
  const v = (x, y, z) => [x * sx, y * sy, z * sz]
  const quads = [
    [v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0)],
    [v(0, 0, 1), v(0, 1, 1), v(1, 1, 1), v(1, 0, 1)],
    [v(0, 0, 0), v(0, 0, 1), v(1, 0, 1), v(1, 0, 0)],
    [v(0, 1, 0), v(1, 1, 0), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(0, 1, 0), v(0, 1, 1), v(0, 0, 1)],
    [v(1, 0, 0), v(1, 0, 1), v(1, 1, 1), v(1, 1, 0)],
  ]
  const tris = quads.flatMap(([a, b, c, d]) => [[a, b, c], [a, c, d]])
  const buf = Buffer.alloc(84 + tris.length * 50)
  buf.write('uil4b test box', 0, 'ascii')
  buf.writeUInt32LE(tris.length, 80)
  tris.forEach((t, i) => {
    const o = 84 + i * 50
    // normal left zero: STLLoader and every slicer recompute it
    t.forEach((p, k) => p.forEach((n, j) => buf.writeFloatLE(n, o + 12 + k * 12 + j * 4)))
  })
  return { name: 'box.stl', mimeType: 'model/stl', buffer: buf }
}

const input = (page) => page.getByTestId('v3d-input')
const fact = (page, key) => page.locator(`[data-testid="v3d-facts"] [data-fact="${key}"]`)

/** Opaque pixels on the WebGL canvas, read back through a 2D canvas. */
async function drawnPixels(page) {
  return page.evaluate(() => {
    const gl = document.querySelector('[data-testid="v3d-canvas"]')
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 100
    const ctx = c.getContext('2d')
    ctx.drawImage(gl, 0, 0, c.width, c.height)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let n = 0
    let black = 0
    let hash = 0
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 0) n += 1
      if (d[i] > 200 && d[i - 3] + d[i - 2] + d[i - 1] < 30) black += 1
      hash = (hash * 31 + d[i - 3] + d[i]) | 0
    }
    return { n, black, hash }
  })
}

async function openBox(page) {
  await input(page).setInputFiles(boxStl())
  await expect(fact(page, 'triangles'), 'the box never finished loading').toHaveText('12', { timeout: 20000 })
}

test.describe('3D Viewer', () => {
  test('a model is drawn, described, turned from the keyboard, and converted', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, ROUTE)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3D Viewer')
    await expect(page.locator('.v3d-beta')).toHaveText('Beta')

    await openBox(page)
    await expect(fact(page, 'format')).toHaveText('STL')
    await expect(fact(page, 'meshes')).toHaveText('1')
    await expect(fact(page, 'extent')).toContainText('2 × 1 × 1')
    await expect(fact(page, 'extent')).toContainText('file units')

    // The text alternative a screen reader gets: the canvas is described by a
    // summary of the same facts, and the load was announced.
    const canvas = page.getByTestId('v3d-canvas')
    const describedBy = await canvas.getAttribute('aria-describedby')
    expect(describedBy, 'the canvas has no description').toBeTruthy()
    const summary = await page.evaluate((ids) => ids.split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' '), describedBy)
    expect(summary).toContain('box.stl, STL: 12 triangles in 1 mesh, 2 by 1 by 1 file units.')
    expect(summary).toContain('arrow keys orbit')
    await expect(page.getByRole('status').filter({ hasText: 'Loaded box.stl' })).toHaveCount(1)

    // DRAWN, not merely loaded.
    await expect.poll(async () => (await drawnPixels(page)).n, { message: 'nothing was drawn on the canvas', timeout: 10000 }).toBeGreaterThan(300)

    // LIT, not a silhouette. The fixture stores every facet normal as zero,
    // which STL allows, and drawn as stored that is a black box.
    const before = await drawnPixels(page)
    expect(before.black, `${before.black} of ${before.n} drawn pixels are black — the model is unlit`).toBeLessThan(before.n * 0.05)

    // The keyboard turns the view: the picture changes.
    await canvas.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect.poll(async () => (await drawnPixels(page)).hash, { message: 'arrow keys did not move the view' }).not.toBe(before.hash)

    // Wireframe is a pressed state, not only a colour.
    const wire = page.getByRole('button', { name: 'Wireframe' })
    await wire.click()
    await expect(wire).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Solid' })).toHaveAttribute('aria-pressed', 'false')

    // Convert to 3MF.
    await page.getByRole('radio', { name: /3MF/ }).check()
    await page.getByTestId('v3d-convert').click()
    await expect(page.getByTestId('v3d-result')).toContainText('box.3mf', { timeout: 15000 })
  })

  test('the 3MF it writes opens again with the same triangles, and a signed-in download is not gated', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page)
    await go(page, ROUTE)
    await openBox(page)
    await page.getByRole('radio', { name: /3MF/ }).check()
    await page.getByTestId('v3d-convert').click()
    await expect(page.getByTestId('v3d-download')).toBeVisible({ timeout: 15000 })

    // Catch the file at the anchor the page clicks, then hand its bytes back
    // to the viewer as a visitor would.
    await page.evaluate(() => {
      window.__v3dFile = null
      const real = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched() {
        if (this.hasAttribute('download')) {
          const name = this.getAttribute('download')
          window.__v3dFile = fetch(this.href).then((r) => r.arrayBuffer()).then((b) => ({ name, bytes: Array.from(new Uint8Array(b)) }))
          return undefined
        }
        return real.apply(this, arguments)
      }
    })
    await page.getByTestId('v3d-download').click()
    await expect(page.locator('#ui-login-title'), 'a signed-in visitor was asked to sign in').toHaveCount(0)
    const file = await page.evaluate(() => window.__v3dFile)
    expect(file?.name).toBe('box.3mf')
    expect(file.bytes.length).toBeGreaterThan(200)

    await input(page).setInputFiles({ name: file.name, mimeType: 'model/3mf', buffer: Buffer.from(file.bytes) })
    await expect(fact(page, 'format')).toHaveText('3MF', { timeout: 20000 })
    await expect(fact(page, 'triangles')).toHaveText('12')
  })

  test('a signed-out download asks for an account and no file leaves', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, ROUTE)
    await openBox(page)
    await page.evaluate(() => {
      window.__dl = 0
      const real = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched() {
        if (this.hasAttribute('download')) window.__dl += 1
        return real.apply(this, arguments)
      }
    })
    await page.getByTestId('v3d-convert').click()
    await page.getByTestId('v3d-download').click()
    await expect(page.locator('#ui-login-title'), 'the download did not ask for an account').toBeVisible()
    // The file must not leave AFTER the dialog either: checking while it is
    // still open passes against a gate whose answer is ignored.
    await page.keyboard.press('Escape')
    await expect(page.locator('#ui-login-title'), 'the dialog did not close').toHaveCount(0)
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => window.__dl), 'the file left once the dialog was dismissed').toBe(0)
  })

  test('three.js is not fetched until a model is brought', async ({ page }) => {
    watch(page, PERSONA)
    const engine = []
    page.on('request', (r) => { if (/\/assets\/meshEngine-/.test(r.url())) engine.push(r.url()) })
    await go(page, '/')
    await go(page, ROUTE)
    await page.waitForTimeout(800)
    expect(engine, 'the 3D engine was downloaded before anyone brought a model').toEqual([])
    // POSITIVE CONTROL: bringing one does fetch it, so the watch is looking at
    // the right URL.
    await openBox(page)
    expect(engine.length).toBeGreaterThan(0)
  })

  test('a wrong file and a broken file each get a sentence, never a success', async ({ page }) => {
    watch(page, PERSONA)
    // A wrong file is refused from its own first bytes, without waiting on the
    // 808 kB three.js engine. CI run 35849298083 sat on "Loading the viewer"
    // past this test's 5 s wait because the verdict used to follow that download.
    const engine = []
    page.on('request', (r) => { if (/\/assets\/meshEngine-/.test(r.url())) engine.push(r.url()) })
    await go(page, ROUTE)
    await input(page).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) })
    await expect(page.getByTestId('v3d-error')).toContainText('photo.png is not a format this viewer reads')

    await input(page).setInputFiles({ name: 'part.stl', mimeType: 'model/stl', buffer: Buffer.from('this is not an stl at all') })
    await expect(page.getByTestId('v3d-error')).toContainText('part.stl could not be read as STL')
    await expect(page.getByTestId('v3d-facts')).toHaveCount(0)
    await expect(page.getByTestId('v3d-convert')).toBeDisabled()
    expect(engine, 'the wrong-file verdict waited on the 3D engine download').toEqual([])

    // A broken file dropped over a good model keeps the model and says so.
    await openBox(page)
    await input(page).setInputFiles({ name: 'broken.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('glTF but not really') })
    await expect(page.getByTestId('v3d-error')).toContainText('broken.glb')
    await expect(page.getByTestId('v3d-error')).toContainText('still the previous one')
    await expect(fact(page, 'file')).toHaveText('box.stl')
  })

  test('STEP with the CAD engine unreachable says so, and meshes still open', async ({ page }) => {
    watch(page, 'visitor whose CAD engine never arrives')
    await page.route((u) => u.href.startsWith('https://cdn.jsdelivr.net/npm/occt-import-js'), (route) => route.abort('internetdisconnected'))
    await go(page, ROUTE)
    await input(page).setInputFiles({ name: 'bracket.step', mimeType: 'model/step', buffer: Buffer.from('ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n') })
    await expect(page.getByTestId('v3d-error')).toContainText('CAD engine could not be fetched', { timeout: 20000 })
    await openBox(page)
  })

  test('a CAD engine that arrives altered is never run, and the page says so', async ({ page }) => {
    watch(page, 'visitor whose CAD engine arrives tampered with')
    // A 200 with plausible bytes that are not the pinned ones — what a
    // compromised CDN looks like. The script body would announce itself if it
    // ever executed.
    const served = []
    await page.route((u) => u.href.startsWith('https://cdn.jsdelivr.net/npm/occt-import-js'), (route) => {
      const name = route.request().url().split('/').pop()
      served.push(name)
      return route.fulfill({
        status: 200,
        headers: { 'content-type': name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', 'access-control-allow-origin': '*' },
        body: name.endsWith('.wasm') ? Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]) : 'self.postMessage({ id: 0, type: "tampered-code-ran" })',
      })
    })
    await go(page, ROUTE)
    await input(page).setInputFiles({ name: 'bracket.step', mimeType: 'model/step', buffer: Buffer.from('ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n') })
    await expect(page.getByTestId('v3d-error')).toContainText('did not match its pinned fingerprint', { timeout: 20000 })
    // POSITIVE CONTROL: both altered files were fetched, so the refusal was
    // the check at work and not a request that never happened.
    expect(served.sort()).toEqual(['occt-import-js.js', 'occt-import-js.wasm'])
    await openBox(page)
  })

  test('no horizontal overflow from 320 to 1920, in both themes, with a model open', async ({ browser }) => {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ colorScheme: theme, viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      watch(page, PERSONA)
      await go(page, ROUTE)
      await openBox(page)
      for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 })
        await page.waitForTimeout(150)
        const m = await page.evaluate(() => {
          const tools = document.querySelector('.v3d-tools')?.getBoundingClientRect()
          const frame = document.querySelector('.v3d-frame')?.getBoundingClientRect()
          return {
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            toolsInside: !!tools && !!frame && tools.left >= frame.left - 0.5 && tools.right <= frame.right + 0.5,
            theme: document.documentElement.getAttribute('data-theme'),
          }
        })
        expect(m.theme, 'the colour scheme did not reach the page theme, so this width sweep is not testing it').toBe(theme)
        expect(m.overflow, `${width}px ${theme}: the page scrolls sideways`).toBeLessThanOrEqual(0)
        expect(m.toolsInside, `${width}px ${theme}: the view controls spill out of the frame`).toBe(true)
      }
      await context.close()
    }
  })

  test('reduced motion turns the turntable off and says why', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    watch(page, PERSONA)
    await go(page, ROUTE)
    await openBox(page)
    const turn = page.getByRole('button', { name: 'Turntable' })
    await expect(turn).toBeDisabled()
    await expect(turn).toHaveAttribute('title', 'Off while reduced motion is on')
    await context.close()
  })
})
