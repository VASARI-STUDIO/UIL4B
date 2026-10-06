// /create/3d-converter, walked by someone who has a model and wants another format.
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
const ROUTE = '/create/3d-converter'

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

/** Click Download and hand back the file's name and bytes instead of saving it. */
async function catchDownload(page) {
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
  return page.evaluate(() => window.__v3dFile)
}

async function openBox(page) {
  await input(page).setInputFiles(boxStl())
  await expect(fact(page, 'triangles'), 'the box never finished loading').toHaveText('12', { timeout: 20000 })
}

// ONE HONEST BUDGET FOR THE WHOLE FILE, not a fix per test as each one trips.
//
// Every test here starts from a fresh browser context, so every one that opens
// a model downloads the 808 kB three.js engine into an empty cache and parses
// and draws it, which makes this file uniformly slow on a CI runner: the model
// tests run 24.5-30.2 s there, the ones that never open the engine 14-21 s. A
// long-cache header on the preview server would not help: Playwright contexts
// do not share an HTTP cache, so every context is cold whatever the header
// says.
//
// So each test gets twice the slowest single-model test measured on CI.
// Every wait inside keeps its own backstop (go() 20 s, openBox 20 s, the
// result and error waits their own), so a real hang still fails there, by
// name, well inside this.
const SLOWEST_MODEL_TEST_ON_CI_MS = 30_000
const FILE_TEST_BUDGET_MS = 2 * SLOWEST_MODEL_TEST_ON_CI_MS

test.describe('3D Model Converter', () => {
  test.describe.configure({ timeout: FILE_TEST_BUDGET_MS })

  test('the old viewer URL lands on the converter', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/3d-viewer')
    await expect(page, '/create/3d-viewer did not redirect').toHaveURL(/\/create\/3d-converter$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3D Model Converter')
  })

  test('a model is drawn, described, turned from the keyboard, and converted', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, ROUTE)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3D Model Converter')
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

  test('an STL set to millimetres is written as a GLB in metres', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page)
    await go(page, ROUTE)
    await openBox(page)
    await page.getByRole('combobox', { name: 'Model units' }).selectOption('mm')
    await expect(fact(page, 'extent')).toContainText('2 × 1 × 1 mm')
    await page.getByRole('radio', { name: /^GLB \(/ }).check()
    await page.getByTestId('v3d-convert').click()
    await expect(page.getByTestId('v3d-download')).toBeVisible({ timeout: 15000 })
    const file = await catchDownload(page)
    expect(file?.name).toBe('box.glb')

    // Read back, the GLB is a thousandth of the size: 2 mm is 0.002 m.
    await input(page).setInputFiles({ name: file.name, mimeType: 'model/gltf-binary', buffer: Buffer.from(file.bytes) })
    await expect(fact(page, 'format')).toHaveText('GLB', { timeout: 20000 })
    await expect(fact(page, 'extent')).toContainText('0.002 × 0.001 × 0.001 m')
  })

  test('Convert pressed from the keyboard keeps focus, then hands it to Download', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, ROUTE)
    await openBox(page)
    const convert = page.getByTestId('v3d-convert')
    await convert.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('v3d-download')).toBeFocused({ timeout: 15000 })
  })

  test('on a phone, a file opened from below the stage brings the stage back into view', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, ROUTE)
    await openBox(page)
    await page.getByTestId('v3d-convert').scrollIntoViewIfNeeded()
    await expect(page.locator('.v3d-frame')).not.toBeInViewport()
    await input(page).setInputFiles({ name: 'scene.blend', mimeType: 'application/octet-stream', buffer: Buffer.from('BLENDER-v402') })
    await expect(page.getByTestId('v3d-error')).toBeInViewport({ timeout: 5000 })
  })

  test('the up axis turns the model on screen, and Y up and Z up are pressed states', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, ROUTE)
    // 2 wide, 1 deep and 3 tall in the STL's own Z-up numbers.
    await input(page).setInputFiles(boxStl([2, 1, 3]))
    await expect(fact(page, 'triangles')).toHaveText('12', { timeout: 20000 })
    const zUp = page.getByRole('button', { name: 'Z up' })
    const yUp = page.getByRole('button', { name: 'Y up' })
    await expect(zUp, 'an STL did not open as Z up').toHaveAttribute('aria-pressed', 'true')
    await expect(fact(page, 'extent')).toContainText('2 × 3 × 1')
    await yUp.click()
    await expect(yUp).toHaveAttribute('aria-pressed', 'true')
    await expect(fact(page, 'extent')).toContainText('2 × 1 × 3')
    await expect(page.getByRole('status').filter({ hasText: 'read as Y up' })).toHaveCount(1)
  })

  test('For Blender is pressed while its settings hold, and pressing it puts them back', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, ROUTE)
    const blender = page.locator('.tl-toolbar').getByRole('button', { name: 'For Blender' })
    await expect(blender).toHaveAttribute('aria-pressed', 'true')
    await openBox(page)
    await page.getByRole('radio', { name: /^STL \(/ }).check()
    await expect(blender, 'the preset still reads as on with STL chosen').toHaveAttribute('aria-pressed', 'false')
    await blender.click()
    await expect(page.getByRole('radio', { name: /^GLB \(/ })).toBeChecked()
    await expect(blender).toHaveAttribute('aria-pressed', 'true')
  })

  test('a .blend or a .dwg is named with the reason and the way round, not opened', async ({ page }) => {
    watch(page, PERSONA)
    const engine = []
    page.on('request', (r) => { if (/\/assets\/meshEngine-/.test(r.url())) engine.push(r.url()) })
    await go(page, ROUTE)
    await input(page).setInputFiles({ name: 'scene.blend', mimeType: 'application/octet-stream', buffer: Buffer.from('BLENDER-v402') })
    await expect(page.getByTestId('v3d-error')).toContainText("scene.blend can't be opened here")
    await expect(page.getByTestId('v3d-error')).toContainText('File > Export > glTF 2.0')
    await input(page).setInputFiles({ name: 'plan.dwg', mimeType: 'application/octet-stream', buffer: Buffer.from('AC1032') })
    await expect(page.getByTestId('v3d-error')).toContainText('Save it as DXF')
    expect(engine, 'an unsupported file fetched the 3D engine').toEqual([])
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
    // 808 kB three.js engine, so this assertion resolves well inside the 5 s
    // wait below.
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
    // A BUDGET PER ITERATION, on top of the file budget above, the derivation
    // 85-colour-breakpoints and 88 already use. The 30 s default is a budget for a test that opens ONE
    // page; this one opens a fresh context per theme, loads the route, fetches
    // the 808 kB three.js engine into that context's empty cache, parses and
    // draws a model, then walks seven widths — twice, measured at up to 28.4 s
    // on a CI runner. Derived from the arrays that drive the loops, so a width or a
    // theme added raises the budget in the same edit; every wait inside keeps
    // its own backstop (go() 20 s, openBox 20 s), so a real hang still fails
    // there, by name.
    const THEMES = ['light', 'dark']
    const WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1920]
    // Two cold loads in one test: per theme, the slowest single-model test.
    const PAGE_AND_MODEL_MS = SLOWEST_MODEL_TEST_ON_CI_MS
    const PER_WIDTH_MS = 600
    test.setTimeout(10000 + THEMES.length * (PAGE_AND_MODEL_MS + WIDTHS.length * PER_WIDTH_MS))
    for (const theme of THEMES) {
      const context = await browser.newContext({ colorScheme: theme, viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      watch(page, PERSONA)
      await go(page, ROUTE)
      await openBox(page)
      for (const width of WIDTHS) {
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
