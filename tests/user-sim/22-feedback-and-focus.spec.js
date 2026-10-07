// Two accessibility failures from the 2026-08-11 site audit, both verified in a
// real browser before and after.
//
// P2 — /feedback. Four surfaces across the app point here as THE way to report
// a problem (five now, counting the new 404), so it is the last place that
// should be hard to use. Measured on the rendered page: ZERO <label> elements.
// The three `.seg-label` divs look like labels and are not, so neither the
// subject nor the message had an accessible name — a screen-reader user met two
// unnamed fields with only a placeholder, which is not a name and vanishes the
// moment you type. The four type buttons carried no role and no aria-checked,
// so which one was selected lived in a CSS class and nowhere else (1.4.1).
//
// P3 — Focus rings on controls that sit ON a user-chosen colour. Measured
// against the live swatches: `button.plb-tool` at 1.33:1 and `.plb-ramp-bar` at
// 1.80:1, against the 3:1 that 1.4.11 requires. Structural rather than a bad
// colour choice — the background is whatever the user picked, so no single
// accent passes against all of it.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

/** WCAG relative luminance contrast, computed in the page. */
const CONTRAST_FN = `
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4) }
  const lum = (s) => { const m = (s||'').match(/[\\d.]+/g); if(!m) return 0
    return 0.2126*srgb(+m[0])+0.7152*srgb(+m[1])+0.0722*srgb(+m[2]) }
  const ratio = (a,b) => { const [hi,lo] = [lum(a),lum(b)].sort((p,q)=>q-p)
    return +((hi+0.05)/(lo+0.05)).toFixed(2) }
`

test.describe('feedback form is usable and honest', () => {
  test('both fields have a real accessible name', async ({ page }) => {
    watch(page, 'a screen-reader user reporting a bug')
    await go(page, '/feedback')

    // getByLabel resolves through the accessibility tree, so this passes only
    // if the association is real — a placeholder cannot satisfy it.
    await expect(page.getByLabel('Subject')).toBeVisible()
    await expect(page.getByLabel('Message')).toBeVisible()

    const labels = await page.locator('form label').count()
    expect(labels, 'the .seg-label divs must be real <label> elements').toBeGreaterThanOrEqual(2)
  })

  test('the type choice announces which option is selected', async ({ page }) => {
    watch(page, 'a keyboard user choosing a feedback type')
    await go(page, '/feedback')

    const group = page.getByRole('radiogroup')
    await expect(group).toBeVisible()
    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(4)

    // Exactly one checked, and it is conveyed in the tree rather than only by a
    // CSS class.
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)

    // Arrow keys move within the group — a radiogroup is one tab stop.
    const first = radios.first()
    await first.focus()
    await first.press('ArrowRight')
    await expect(radios.nth(1)).toBeFocused()
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')
    await expect(radios.first()).toHaveAttribute('aria-checked', 'false')
  })

  test('an empty submit explains itself, on the field, and moves focus there', async ({ page }) => {
    watch(page, 'a visitor submitting the form before typing anything')
    await go(page, '/feedback')

    await page.locator('.fb-submit').click()

    const message = page.getByLabel('Message')
    // A toast alone was the old behaviour: transient, unattached to the field,
    // and gone before a slow reader reaches it.
    await expect(message).toHaveAttribute('aria-invalid', 'true')
    const error = page.locator('#fb-error')
    await expect(error).toBeVisible()
    await expect(error).toHaveAttribute('role', 'alert')
    await expect(message, 'focus moves to the field that needs fixing').toBeFocused()
    // The error must be reachable FROM the field, not merely nearby.
    await expect(message).toHaveAttribute('aria-describedby', 'fb-error')
  })

  test('typing clears the error rather than leaving a stale one', async ({ page }) => {
    watch(page, 'a visitor correcting an empty submission')
    await go(page, '/feedback')

    await page.locator('.fb-submit').click()
    await expect(page.locator('#fb-error')).toBeVisible()

    await page.getByLabel('Message').fill('The palette tools are unreachable on my phone.')
    await expect(page.locator('#fb-error')).toHaveCount(0)
    await expect(page.getByLabel('Message')).toHaveAttribute('aria-invalid', 'false')
  })

  test('a failed send never claims success', async ({ page }) => {
    // The most important property of a feedback channel: a silently-lost
    // support request is the worst possible failure. /api/* does not exist
    // under `vite preview`, so this exercises the real failure path.
    watch(page, 'a visitor whose submission does not reach the server')
    await go(page, '/feedback')

    await page.getByLabel('Message').fill('Testing the failure path.')
    await page.locator('.fb-submit').click()

    // The success panel must NOT appear.
    await expect(page.locator('.fb-done')).toHaveCount(0)
    await expect(page.locator('#fb-error')).toBeVisible()
    // And the form is still there with the text intact, so nothing is lost.
    await expect(page.getByLabel('Message')).toHaveValue('Testing the failure path.')
  })
})

test.describe('focus is visible on controls sitting on a user-chosen colour', () => {
  test('every palette control clears 3:1 on at least one ring edge', async ({ page }) => {
    watch(page, 'a keyboard user editing a palette')
    await go(page, '/create/palette')
    await expect(page.locator('button.plb-tool').first()).toBeVisible()

    const result = await page.evaluate(`(() => {
      ${CONTRAST_FN}
      const bgOf = (el) => {
        let n = el
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
          n = n.parentElement
        }
        return 'rgb(255,255,255)'
      }
      const bad = []
      let checked = 0
      for (const el of document.querySelectorAll('.plb-col button.plb-tool, .plb-col .plb-ramp, .plb-col .plb-hex, .plb-col .plb-aa--locked')) {
        el.focus()
        if (!el.matches(':focus-visible')) continue
        checked++
        const cs = getComputedStyle(el)
        const bg = bgOf(el)
        const inner = ratio(cs.outlineColor, bg)
        const outerCol = (cs.boxShadow.match(/rgba?\\([^)]+\\)/) || ['rgb(10,10,11)'])[0]
        const outer = ratio(outerCol, bg)
        // 1.4.11 needs ONE edge of the indicator to reach 3:1 against what it
        // sits on. A dual ring works precisely because every colour is far from
        // at least one of white and near-black.
        if (Math.max(inner, outer) < 3) bad.push({ bg, inner, outer })
      }
      return { checked, bad }
    })()`)

    expect(result.checked, 'the palette controls are keyboard-focusable').toBeGreaterThan(10)
    expect(result.bad, `controls whose focus ring is invisible on their own swatch:\n${JSON.stringify(result.bad, null, 2)}`).toEqual([])
  })

  test('the ring is a dual ring, not a single accent that happens to pass here', async ({ page }) => {
    // The seed colour is user-chosen, so a single-colour ring that passes
    // against today's default is luck rather than a fix.
    watch(page, 'a keyboard user on a palette')
    await go(page, '/create/palette')
    const el = page.locator('button.plb-tool').first()
    await el.focus()

    const ring = await el.evaluate((n) => {
      const cs = getComputedStyle(n)
      return { outline: cs.outlineColor, shadow: cs.boxShadow }
    })
    expect(ring.outline, 'the inner ring is white').toMatch(/255,\s*255,\s*255/)
    expect(ring.shadow, 'a dark outer ring backs it').not.toBe('none')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The feedback dialog: one send is one message
// ─────────────────────────────────────────────────────────────────────────────
//
// /api/* does not exist under `vite preview`, so each test stands in for it and
// records what the dialog posts. A `hold` verdict keeps the request unanswered
// until the test releases it, which is what makes "slow network" and "double
// submit" reproducible.
test.describe('the feedback dialog sends each message once', () => {
  /** Stand-in for /api/support. `reply(n)` decides the answer to attempt n (1-based). */
  async function standIn(page, reply = () => ({ status: 200 })) {
    const posted = []
    const gates = []
    await page.route('**/api/support', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}')
      posted.push(body)
      const verdict = reply(posted.length)
      if (verdict.hold) await new Promise((resolve) => gates.push(resolve))
      if (verdict.delayMs) await new Promise((r) => setTimeout(r, verdict.delayMs))
      const status = verdict.status ?? 200
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(status >= 400 ? { error: 'x' } : { ok: true }),
      })
    })
    return { posted, release: () => gates.splice(0).forEach((g) => g()) }
  }

  async function openDialog(page, text = 'The export button does nothing on my phone.') {
    await signIn(page, { plan: 'free' })
    await go(page, '/projects')
    await page.locator('.global-feedback-btn').click()
    await expect(page.locator('.fb-modal')).toBeVisible()
    await page.locator('#fb-message').fill(text)
  }

  const submit = (page) => page.locator('.fb-modal button[type="submit"]')

  test('a double-click, then Enter, then another click make one request', async ({ page }) => {
    watch(page, 'an impatient visitor submitting a bug report')
    const server = await standIn(page, () => ({ delayMs: 700 }))
    await openDialog(page)

    await submit(page).dblclick()
    await page.locator('#fb-subject').press('Enter').catch(() => {})
    await submit(page).click({ force: true, noWaitAfter: true }).catch(() => {})
    // Two submit events inside one task: nothing can have re-rendered between them.
    await page.locator('.fb-modal form').evaluate((form) => { form.requestSubmit(); form.requestSubmit() })

    await expect(page.locator('.fb-success')).toBeVisible()
    expect(server.posted, 'one message must be one request').toHaveLength(1)
  })

  test('the button turns pending at once and the dialog confirms as soon as the server answers', async ({ page }) => {
    watch(page, 'a visitor on a slow connection')
    const server = await standIn(page, () => ({ hold: true }))
    await openDialog(page)

    const clickedAt = Date.now()
    await submit(page).click()
    await expect(submit(page)).toHaveText('Sending...')
    const pendingMs = Date.now() - clickedAt
    await expect(submit(page)).toBeDisabled()
    await expect(submit(page)).toHaveAttribute('aria-busy', 'true')
    expect(pendingMs, `the pending state took ${pendingMs}ms to appear`).toBeLessThan(500)
    await expect(page.locator('.fb-success'), 'success must wait for the server').toHaveCount(0)

    // Let the request sit, then answer it.
    await page.waitForTimeout(1500)
    await expect(page.locator('.fb-success')).toHaveCount(0)
    const answeredAt = Date.now()
    server.release()
    await expect(page.locator('.fb-success')).toBeVisible()
    const confirmMs = Date.now() - answeredAt
    console.log(`feedback-dialog: pending shown in ${pendingMs}ms; confirmed ${confirmMs}ms after the server answered`)
    expect(confirmMs, `the confirmation took ${confirmMs}ms after the answer`).toBeLessThan(1000)
    expect(server.posted).toHaveLength(1)
  })

  test('retrying after a failure reuses the request id, and keeps one local record', async ({ page }) => {
    watch(page, 'a visitor whose first send failed')
    const server = await standIn(page, (n) => (n === 1 ? { status: 502 } : { status: 200 }))
    await openDialog(page)

    await submit(page).click()
    await expect(page.locator('.fb-error')).toBeVisible()
    await submit(page).click()
    await expect(page.locator('.fb-success')).toBeVisible()

    expect(server.posted).toHaveLength(2)
    const [first, second] = server.posted
    expect(first.requestId, 'the request carries an id').toMatch(/^fb-[A-Za-z0-9-]{16,}$/)
    expect(second.requestId, 'a retry of the same message must reuse the id, or the server cannot tell it is a repeat').toBe(first.requestId)

    const local = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-feedback') || '[]'))
    expect(local, 'one message, one local record').toHaveLength(1)
    expect(local[0].id, 'the local record shares the id the server stores, so the admin queue lists it once').toBe(first.requestId)
  })

  test('editing the message after a failure sends it as a new message', async ({ page }) => {
    watch(page, 'a visitor who corrects their message after an error')
    const server = await standIn(page, (n) => (n === 1 ? { status: 502 } : { status: 200 }))
    await openDialog(page, 'First wording.')

    await submit(page).click()
    await expect(page.locator('.fb-error')).toBeVisible()
    await page.locator('#fb-message').fill('Second wording, with the detail I forgot.')
    await submit(page).click()
    await expect(page.locator('.fb-success')).toBeVisible()

    expect(server.posted[1].requestId, 'a changed message under the old id would be dropped as a repeat').not.toBe(server.posted[0].requestId)
  })

  test('a request that never answers is abandoned, reported, and can be retried under the same id', async ({ page }) => {
    watch(page, 'a visitor whose connection stalls')
    await page.clock.install()
    const server = await standIn(page, (n) => (n === 1 ? { hold: true } : { status: 200 }))
    await openDialog(page)

    await submit(page).click()
    await expect(submit(page)).toHaveText('Sending...')
    await page.clock.fastForward(16000)
    await expect(page.locator('.fb-error'), 'a stalled send must end in a visible failure').toBeVisible()
    await expect(submit(page)).toBeEnabled()

    server.release()
    await submit(page).click()
    await expect(page.locator('.fb-success')).toBeVisible()
    expect(server.posted).toHaveLength(2)
    expect(server.posted[1].requestId).toBe(server.posted[0].requestId)
  })

  test('after "Send another", the next message gets its own id', async ({ page }) => {
    watch(page, 'a visitor sending two reports')
    const server = await standIn(page)
    await openDialog(page, 'Same words twice.')

    await submit(page).click()
    await expect(page.locator('.fb-success')).toBeVisible()
    await page.getByRole('button', { name: 'Send another' }).click()
    await page.locator('#fb-message').fill('Same words twice.')
    await submit(page).click()
    await expect(page.locator('.fb-success')).toBeVisible()

    expect(server.posted).toHaveLength(2)
    expect(server.posted[1].requestId, 'a deliberate second send is a second message').not.toBe(server.posted[0].requestId)
    const local = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-feedback') || '[]'))
    expect(local).toHaveLength(2)
  })
})
