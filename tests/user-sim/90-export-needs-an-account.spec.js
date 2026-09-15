// COPYING IS FREE FOREVER. TAKING A FILE AWAY NEEDS AN ACCOUNT.
//
// Founder decision, 2026-09-15: "make users have to make an account to use alot
// of the extra feature". The line was chosen from a measurement rather than a
// guess — signed out, pressing each of the fourteen /create tools' own
// take-away control, only TWO asked for an account: /create/palette
// ("Save / export") and /create/type-scale ("Save to a project"). Saving, the
// AI tools, community submissions and checkout had all been gated for months,
// so the product already believed keeping work needed an account and had simply
// never applied that to the file you walk away with.
//
// BOTH HALVES ARE ASSERTED HERE, and that is the whole design:
//
//   * A control that produces a FILE must ask. Gating those is the decision.
//   * A control that COPIES must never ask. Copy CSS, copy a hex, copy an SVG
//     snippet: free, permanently. A copy is how somebody decides the tool is
//     worth an account at all, so gating it would tax the evaluation rather
//     than the value — and it would make /info's promise ("No account needed —
//     open any tool and start working") false.
//
// Half of this cannot be tested by pressing a button on a fresh page: the icon
// download needs an icon chosen and the converter needs a file uploaded, so
// each case drives the tool to the point where it actually hands something
// over. A probe that just clicks the first matching control reports "no control
// found" for those and proves nothing, which is exactly what the first pass at
// this measurement did.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const PERSONA = 'someone trying the tools before signing up for anything'

const png = (name) => ({
  name,
  mimeType: 'image/png',
  // A 1x1 transparent PNG — real bytes, no encoding work.
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
})

/**
 * Count anchor clicks that carry a `download` attribute, which is the shape
 * every one of these call sites uses. A blob download started by a synthetic
 * click does not reliably raise Playwright's own `download` event headlessly,
 * so the anchor is what is watched.
 */
async function watchDownloads(page) {
  await page.evaluate(() => {
    window.__dl = 0
    const real = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function patched() {
      if (this.hasAttribute('download')) window.__dl += 1
      return real.apply(this, arguments)
    }
  })
}
const downloadsSeen = (page) => page.evaluate(() => window.__dl || 0)
const loginOpen = (page) => page.evaluate(() => !!document.querySelector('#ui-login-title'))

test.describe('a file needs a free account', () => {
  test('the palette Save / export control asks before it opens', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/palette')
    await page.waitForSelector('.plb-col', { timeout: 15000 })
    await watchDownloads(page)

    // POSITIVE CONTROL: the board is really on screen, so this is a rendered
    // tool and not an empty route that would satisfy every assertion below.
    expect(await page.locator('.plb-col').count(),
      'the palette board did not render').toBeGreaterThan(2)

    await page.getByRole('button', { name: 'Save / export' }).click()
    await expect(page.locator('#ui-login-title'),
      'Save / export handed over the panel without asking for an account')
      .toBeVisible({ timeout: 10000 })
    expect(await downloadsSeen(page), 'a file was produced anyway').toBe(0)
  })

  // THE NAV'S OWN EXPORT PANEL, which is a DIFFERENT gate from the palette one
  // above and was left untested by the first version of this file.
  //
  // Mutation caught that: deleting ExportPanel's account gate left the palette
  // test green, because pressing "Save / export" on /create/palette hits
  // PaletteBuilder's own `requireLogin('save this palette')` — a gate that has
  // existed for months and says nothing about the new one. The style guide, the
  // Markdown, the PNG and the JPEG are all produced here, from the nav, on any
  // route, and nothing was covering them.
  test('the nav export panel asks before it builds a file', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/tint')
    await watchDownloads(page)

    // `.pnav-export` rather than a name, because the desktop opener is an ICON
    // button carrying only aria-label="Export" — and the route matters too:
    // PillNav hides it on SALES_PATHS, so this has to run on a tool route.
    const openExport = page.locator('.pnav-export').first()
    // POSITIVE CONTROL: without the opener this test never reaches the panel.
    await expect(openExport, 'the nav offers no Export control on a tool route')
      .toBeVisible({ timeout: 15000 })
    await openExport.click()

    // The panel is a lazy chunk, so it arrives a beat after the click. Scope the
    // action to the dialog: the opener itself is still on the page and is also
    // called Export.
    const panel = page.locator('[role="dialog"]').filter({ hasText: /export/i }).first()
    await expect(panel, 'the export panel never opened').toBeVisible({ timeout: 15000 })
    const run = panel.getByRole('button', { name: /^export/i }).last()
    await expect(run, 'the export panel never rendered its own export action')
      .toBeVisible({ timeout: 15000 })
    await run.click()

    await expect(page.locator('#ui-login-title'),
      'the export panel built a file without asking for an account')
      .toBeVisible({ timeout: 10000 })
    expect(await downloadsSeen(page), 'a file was produced anyway').toBe(0)

    // AND IT OPENS ON THE CREATE-ACCOUNT FORM, not "Log in to continue".
    //
    // This gate fires ONLY for somebody the product has no account for — a
    // signed-in visitor never reaches it. Greeting all of them with a sign-in
    // form is the defect LoginPromptContext already records and fixed on the
    // four highest-traffic paths: a control that asks for a new free account
    // and answers "Welcome Back" tells the visitor they already have one.
    await expect(page.locator('#ui-login-title'),
      'the export gate opened on the sign-in form. Everyone who reaches it has no '
      + 'account — that is why it fired — so it must open on create-account. Pass '
      + '`signup: true` in useExportGate.js.')
      .toHaveText(/create your free account/i)

    // It must also say WHICH action was interrupted, or the wall is unexplained.
    await expect(page.getByText(/you were about to export/i),
      'the dialog does not name the action the visitor was taking').toBeVisible()
  })

  test('the icon download asks, after an icon has been chosen', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/icons')
    // The catalogue may be served from the fixture or fall back to the built-in
    // set; either way a cell has to exist before anything can be downloaded.
    await page.waitForSelector('.ic', { timeout: 20000 })
    await page.locator('.ic').first().click()
    await page.waitForTimeout(800)
    await watchDownloads(page)

    // EXACT, NOT A REGEX, and this is not fussiness. The catalogue grid renders
    // an icon whose own accessible name is "downloadLucide", so
    // getByRole('button', { name: /download/i }).first() selects a SEARCH RESULT
    // — a picture of a download arrow — instead of the customizer's Download
    // button, clicks it, and then reports that nothing was gated. That is
    // exactly how the first pass at this test failed.
    const download = page.getByRole('button', { name: 'Download', exact: true })
    // POSITIVE CONTROL: without a reachable download control this test is
    // asserting nothing, and that is what a closed customizer looks like.
    await expect(download, 'no Download control appeared after choosing an icon')
      .toBeVisible({ timeout: 10000 })

    await download.click()
    await expect(page.locator('#ui-login-title'),
      'the icon SVG was handed over without an account')
      .toBeVisible({ timeout: 10000 })
    expect(await downloadsSeen(page), 'the SVG downloaded anyway').toBe(0)
  })

  test('the converter download asks, after a file has been converted', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/file-converter')
    await page.locator('.fc-drop input[type="file"]').setInputFiles([png('holiday.png')])

    // Uploading is not converting. The download control does not exist until the
    // conversion has run, so the tool has to be driven to that point — a test
    // that uploads and then looks for Download finds nothing and proves nothing.
    const convert = page.getByRole('button', { name: /^convert /i })
    await expect(convert, 'the converter offered nothing to convert an uploaded file with')
      .toBeVisible({ timeout: 20000 })
    await convert.click()

    const download = page.getByRole('button', { name: 'Download', exact: true }).first()
    await expect(download, 'the converter produced no download control after converting')
      .toBeVisible({ timeout: 30000 })
    await watchDownloads(page)

    await download.click()
    await expect(page.locator('#ui-login-title'),
      'the converted file was handed over without an account')
      .toBeVisible({ timeout: 10000 })
    expect(await downloadsSeen(page), 'the file downloaded anyway').toBe(0)
  })
})

test.describe('a signed-in visitor is never asked again', () => {
  // THE RISKIER HALF. A gate that over-fires is worse than one that under-fires:
  // showing a sign-up wall to somebody who already HAS an account — or worse, to
  // a paying one — reads as the product being broken, and it would hit them on
  // the action they came for.
  //
  // The failure mode this guards is specific and plausible. useExportGate reads
  // `user` from AuthContext, which is null while the session is still resolving.
  // A visitor who is genuinely signed in but arrives before that resolves would
  // be asked to sign in to their own account. So the assertion is not just "no
  // dialog" — it is that the file is actually produced.
  test('a signed-in visitor exports a converted file without being asked', async ({ page }) => {
    watch(page, 'someone who already signed up, converting a file')
    await signIn(page, {})
    await go(page, '/create/file-converter')
    await page.locator('.fc-drop input[type="file"]').setInputFiles([png('holiday.png')])

    const convert = page.getByRole('button', { name: /^convert /i })
    await expect(convert, 'the converter offered nothing to convert with')
      .toBeVisible({ timeout: 20000 })
    await convert.click()

    const download = page.getByRole('button', { name: 'Download', exact: true }).first()
    await expect(download, 'the converter produced no download control after converting')
      .toBeVisible({ timeout: 30000 })
    await watchDownloads(page)
    await download.click()
    await page.waitForTimeout(1500)

    expect(await loginOpen(page),
      'a signed-in visitor was asked to sign in before their own download')
      .toBe(false)
    // POSITIVE CONTROL, and the real assertion: silence is not success. A gate
    // that quietly returned false would also produce no dialog and no file.
    expect(await downloadsSeen(page),
      'no file was produced — the gate refused a signed-in visitor silently')
      .toBeGreaterThan(0)
  })
})

test.describe('copying stays free, and that is half the decision', () => {
  // If this half ever goes red the gate has been put in the wrong place: the
  // tools are supposed to stay fully usable signed out.
  // The two pages label the control differently — Tint says "Copy CSS" and
  // Gradient says "Copy" — so the name is per route rather than one regex. A
  // loose /copy/i would also match Tint's "Copy row", which copies a single step
  // and would let this pass while saying nothing about the CSS.
  for (const [route, label] of [['/create/tint', 'Copy CSS'], ['/create/gradient', 'Copy']]) {
    test(`${route} copies without asking for anything`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, route)

      const copy = page.getByRole('button', { name: label, exact: true }).first()
      // POSITIVE CONTROL: a route with no copy control cannot demonstrate that
      // copying is free. Waiting on the control itself is also the readiness
      // signal — it exists only once the tool has rendered its output.
      await expect(copy, `${route} exposes no ${label} control`).toBeVisible({ timeout: 15000 })

      await copy.click()
      await page.waitForTimeout(1200)
      expect(await loginOpen(page),
        `${route} asked for an account to COPY. Copying is free forever — only a `
        + 'file needs an account. See src/hooks/useExportGate.js.').toBe(false)
    })
  }
})
