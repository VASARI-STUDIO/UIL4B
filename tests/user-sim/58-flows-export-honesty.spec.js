// FLOW 2 AND 3 — WHAT THE EXPORT PANEL PROMISES A FREE ACCOUNT, AND WHETHER
// THE FILE IT PRODUCES AGREES.
//
// 57-signed-in-session.spec.js already drives the PRO half of this door: the
// design system book walls a free account and opens for a Pro one. What had no
// rendered coverage is the half a free account actually uses — the formats it
// CAN have, and the two honesty rules the panel owes it:
//
//   1. An UNBUILT format may never offer a working button. `exportFormats.js`
//      marks css/json/tailwind/assets without `live`, and this is the file that
//      already cost this project a false claim: "full design JSON" was sold as a
//      Pro benefit on four paid surfaces while runExport() had no branch that
//      could build one. Somebody could have paid for a file the product cannot
//      make. The panel must therefore refuse in words, not merely fail.
//
//   2. A BUILT free format must produce the artefact — and must carry the
//      watermark, because /plans sells "Exports without the 'Made with UIL4B'
//      footer line" as a reason to pay. That claim is only true if the free
//      export actually HAS the line. A test that checked only the Pro side
//      would let the product start giving the paid benefit away for free and
//      never notice.
//
// ── WHY THIS READS THE DOWNLOADED FILE ─────────────────────────────────────
//
// The style guide is built in the browser and downloaded — a pure function of
// the saved design, with no server round trip and no popup. So the artefact
// itself is available to the test, and asserting on its bytes is stronger than
// asserting on the panel that produced it: a watermark rule that regressed in
// styleGuideExport.js would leave the panel looking perfect.
//
// ── THE POSITIVE CONTROL ───────────────────────────────────────────────────
//
// "The Soon button is disabled" is trivially true of a panel that failed to
// render, so the refusals are paired with the same panel handing over a real
// file one row away; and the Pro "no watermark" claim is paired with the free
// export that does carry it, plus a length check, so an empty file cannot pass.
//
// ── MUTATION ───────────────────────────────────────────────────────────────
//
// Two call sites, broken one at a time in src/components/ExportPanel.jsx:
//
//   `activeFormat?.live ? (…) : (…Export — Soon…)`  →  forced to `true ? …`
//        fails "every unbuilt format … refuses in words"; the control passes.
//   `buildStyleGuideHtml(design, { watermark: !isPro })` → `watermark: false`
//        fails the watermark test on its FREE half only; everything else passes.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

const UNBUILT = EXPORT_FORMATS.filter((f) => !f.live)
const FREE_BUILT = EXPORT_FORMATS.filter((f) => f.live && !f.pro)

async function openPanel(page) {
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  await expect(page.getByRole('dialog', { name: /Export your design system/i })).toBeVisible()
}

/** The bytes the browser actually handed the user. */
async function readDownload(download) {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

/** Drive the panel to the HTML style guide and return the downloaded file. */
async function exportStyleGuide(page, plan) {
  await signIn(page, { plan })
  await go(page, '/create/palette')
  await openPanel(page)
  await page.getByRole('radio', { name: /Style guide \(HTML\)/i }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export HTML', exact: true }).click(),
  ])
  return readDownload(download)
}

test.describe('the export panel, as a free account', () => {
  test('every unbuilt format is badged, and refuses in words when chosen', async ({ page }) => {
    watch(page, 'a designer picking an export format that is not built yet')
    await signIn(page, { plan: 'free' })
    await go(page, '/create/palette')
    await openPanel(page)

    expect(UNBUILT.length, 'this test is vacuous if nothing is unbuilt').toBeGreaterThan(0)

    for (const fmt of UNBUILT) {
      const row = page.getByRole('radio', { name: new RegExp(fmt.name, 'i') })
      await expect(row.locator('.exp-fmt-soon'),
        `${fmt.name} must carry a Soon badge before it is chosen`).toBeVisible()

      await row.click()
      const action = page.getByRole('button', { name: /^Export — Soon$/ })
      await expect(action, `${fmt.name} must not offer a working button`).toBeVisible()
      await expect(action, `${fmt.name}'s button must be disabled, not merely relabelled`)
        .toBeDisabled()
    }
  })

  test('a built free format hands over a real file — the control', async ({ page }) => {
    // Without this, the test above passes for a panel where EVERY button is
    // dead, or which never rendered a format list at all.
    watch(page, 'a free account exporting the style guide it is entitled to')
    expect(FREE_BUILT.some((f) => f.id === 'html'),
      'the control depends on the HTML style guide being free and built').toBe(true)

    const body = await exportStyleGuide(page, 'free')
    expect(body.length, 'the export must be a real document').toBeGreaterThan(500)
    expect(body, 'and must be the style guide, not an error page')
      .toMatch(/palette|colour|color/i)
  })
})

test.describe('the watermark is the thing Pro actually removes', () => {
  test('a free export carries the line', async ({ page }) => {
    watch(page, 'a free account reading the footer of its own export')
    const free = await exportStyleGuide(page, 'free')
    expect(free, 'the free export must carry the line Pro pays to remove')
      .toMatch(/Made with UIL4B/i)
  })

  test('and a Pro export does not — the other half of the same claim', async ({ page }) => {
    watch(page, 'a Pro subscriber checking they got what they paid for')
    const pro = await exportStyleGuide(page, 'pro')
    // The control for the absence: the same document, really built.
    expect(pro.length, 'the Pro export must be a real document').toBeGreaterThan(500)
    expect(pro, 'and Pro must actually get what /plans sells')
      .not.toMatch(/Made with UIL4B/i)
  })
})
