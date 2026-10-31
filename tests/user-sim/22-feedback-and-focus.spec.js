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

  test('a failed send preserves the message in an alert panel', async ({ page }) => {
    watch(page, 'a visitor whose submission does not reach the server')
    await page.route('**/api/support', route => route.fulfill({ status: 400, body: '{}' }))
    await go(page, '/feedback')
    await page.getByLabel('Message', { exact: true }).fill('Testing the failure path.')
    await page.locator('.fb-submit').click()
    await expect(page.locator('.fb-error')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused()
    await expect(page.getByLabel('Your message')).toHaveValue('Testing the failure path.')
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
// Each surface acknowledges submission while delivery continues in the background.
for (const modal of [true, false]) {
  test.describe(modal ? 'feedback dialog delivery' : 'feedback page delivery', () => {
    const surface = page => page.locator(modal ? '.fb-modal' : '.fb-page')
    const submit = page => surface(page).locator('button[type="submit"]')
    const heading = page => surface(page).getByRole('heading', { name: 'Sent', exact: true })
    const retry = page => surface(page).getByRole('button', { name: 'Try again' })
    const text = 'The export button does nothing on my phone.'

    async function open(page, message = text) {
      if (modal) {
        await signIn(page, { plan: 'free' })
        await go(page, '/projects')
        await page.locator('.global-feedback-btn').click()
      } else await go(page, '/feedback')
      await expect(surface(page).getByRole('status')).toHaveCount(0)
      await surface(page).locator('#fb-message').fill(message)
    }

    async function standIn(page, reply = () => ({ status: 200 })) {
      const posted = []
      const gates = []
      await page.route('**/api/support', async route => {
        posted.push(JSON.parse(route.request().postData() || '{}'))
        const verdict = reply(posted.length)
        if (verdict.hold) await new Promise(resolve => gates.push(resolve))
        await route.fulfill({ status: verdict.status ?? 200, contentType: 'application/json', body: '{}' })
      })
      return { posted, release: () => gates.splice(0).forEach(resolve => resolve()) }
    }

    async function failure(page, server, count = 2) {
      await expect(surface(page).locator('.fb-error')).toHaveAttribute('role', 'alert')
      await expect(retry(page)).toBeFocused()
      await expect(heading(page)).toHaveCount(0)
      await expect(surface(page).getByLabel('Your message')).toHaveValue(text)
      expect(server.posted).toHaveLength(count)
      expect(new Set(server.posted.map(body => body.requestId)).size).toBe(1)
    }

    test('Sent appears on click before the held request answers and receives focus', async ({ page }) => {
      watch(page, 'a visitor on a slow connection')
      const server = await standIn(page, () => ({ hold: true }))
      await open(page)
      await submit(page).click()
      await expect(heading(page)).toBeVisible()
      await expect(heading(page)).toBeFocused()
      await expect(surface(page).getByRole('status')).toContainText('Sent')
      await expect(surface(page).getByText('Thanks — sending your message now.')).toBeVisible()
      await expect(surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })).toBeDisabled()
      await expect.poll(() => server.posted.length).toBe(1)
      expect(server.posted[0].requestId).toMatch(/^fb-[A-Za-z0-9-]{16,}$/)
      server.release()
      await expect(surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })).toBeEnabled()
    })

    test('two submit events in one task send one POST', async ({ page }) => {
      watch(page, 'an impatient visitor submitting feedback')
      const server = await standIn(page, () => ({ hold: true }))
      await open(page)
      await surface(page).locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit() })
      await expect(heading(page)).toBeVisible()
      await expect.poll(() => server.posted.length).toBe(1)
      server.release()
      await expect(surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })).toBeEnabled()
      expect(server.posted).toHaveLength(1)
    })

    test('502 retries once, then Try again sends one more POST with the same id', async ({ page }) => {
      watch(page, 'a visitor recovering a failed delivery')
      const server = await standIn(page, n => ({ status: n <= 2 ? 502 : 200 }))
      await open(page)
      await submit(page).click()
      await failure(page, server)
      await retry(page).click()
      await expect(heading(page)).toBeVisible()
      await expect(surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })).toBeEnabled()
      expect(server.posted).toHaveLength(3)
      expect(server.posted[2]).toEqual(server.posted[0])
      const local = await page.evaluate(() => JSON.parse(localStorage.getItem('vs-feedback') || '[]'))
      expect(local).toHaveLength(1)
      expect(local[0].id).toBe(server.posted[0].requestId)
    })

    test('Edit message keeps the text and unchanged resubmission keeps the id', async ({ page }) => {
      const server = await standIn(page, n => ({ status: n <= 2 ? 502 : 200 }))
      await open(page)
      await submit(page).click()
      await failure(page, server)
      await surface(page).getByRole('button', { name: 'Edit message' }).click()
      await expect(surface(page).locator('#fb-message')).toHaveValue(text)
      await expect(surface(page).locator('#fb-message')).toBeFocused()
      await submit(page).click()
      await expect(surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })).toBeEnabled()
      expect(server.posted).toHaveLength(3)
      expect(server.posted[2].requestId).toBe(server.posted[0].requestId)
    })

    test('editing the text after failure gives the changed message a new id', async ({ page }) => {
      const server = await standIn(page, n => ({ status: n <= 2 ? 502 : 200 }))
      await open(page)
      await submit(page).click()
      await failure(page, server)
      await surface(page).getByRole('button', { name: 'Edit message' }).click()
      await surface(page).locator('#fb-message').fill('More detail about the export.')
      await submit(page).click()
      await expect(surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })).toBeEnabled()
      expect(server.posted).toHaveLength(3)
      expect(server.posted[2].requestId).not.toBe(server.posted[0].requestId)
    })

    test('429 shows the rate limit panel without an automatic retry', async ({ page }) => {
      const server = await standIn(page, () => ({ status: 429 }))
      await open(page)
      await submit(page).click()
      await failure(page, server, 1)
      await expect(surface(page).locator('.fb-error')).toHaveText('Too many messages just now. Try again in a minute.')
      await page.waitForTimeout(1700)
      expect(server.posted).toHaveLength(1)
    })

    test('failure after close or navigation shows an actionable toast and restores the draft', async ({ page }) => {
      const server = await standIn(page, n => n <= 2 ? { hold: true, status: 502 } : { status: 200 })
      await open(page)
      await submit(page).click()
      await expect(heading(page)).toBeVisible()
      if (modal) await surface(page).getByRole('button', { name: 'Close', exact: true }).click()
      else await page.locator('a[href="/projects"]').first().click()
      await expect(surface(page)).toHaveCount(0)
      await expect.poll(() => server.posted.length).toBe(1)
      server.release()
      await expect.poll(() => server.posted.length).toBe(2)
      server.release()
      const toast = page.locator('.toast.show')
      await expect(toast.getByRole('button', { name: 'Try again' })).toBeVisible()
      if (modal) await page.locator('.global-feedback-btn').click()
      else {
        await page.evaluate(() => { history.pushState({}, '', '/feedback'); dispatchEvent(new PopStateEvent('popstate')) })
      }
      await failure(page, server)
      if (modal) await surface(page).getByRole('button', { name: 'Close feedback dialog' }).click()
      await toast.getByRole('button', { name: 'Try again' }).click()
      await expect.poll(() => server.posted.length).toBe(3)
      expect(server.posted[2]).toEqual(server.posted[0])
      if (modal) {
        // It landed while the dialog was closed, so nothing is left to show.
        await page.locator('.global-feedback-btn').click()
        await expect(heading(page)).toHaveCount(0)
        await expect(surface(page).locator('#fb-message')).toHaveValue('')
      } else {
        await expect(heading(page)).toBeVisible()
        await expect(surface(page).getByRole('button', { name: 'Submit another' })).toBeEnabled()
      }
    })

    test('a sent message clears: coming back shows a fresh form, not the old Sent panel', async ({ page }) => {
      const server = await standIn(page)
      await open(page)
      await submit(page).click()
      await expect(heading(page)).toBeVisible()
      await expect(surface(page).getByText("Thanks, we've got it.")).toBeVisible()
      if (modal) {
        await surface(page).getByRole('button', { name: 'Close', exact: true }).click()
        await expect(surface(page)).toHaveCount(0)
        await page.locator('.global-feedback-btn').click()
      } else {
        await page.locator('a[href="/projects"]').first().click()
        await expect(surface(page)).toHaveCount(0)
        await page.evaluate(() => { history.pushState({}, '', '/feedback'); dispatchEvent(new PopStateEvent('popstate')) })
      }
      await expect(surface(page).locator('form')).toBeVisible()
      await expect(heading(page)).toHaveCount(0)
      await expect(surface(page).locator('#fb-message')).toHaveValue('')
      expect(server.posted).toHaveLength(1)
    })

    test('Send another puts focus back in the message field', async ({ page }) => {
      await standIn(page)
      await open(page)
      await submit(page).click()
      const another = surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })
      await expect(another).toBeEnabled()
      await another.click()
      await expect(surface(page).locator('#fb-message')).toBeFocused()
      await expect(surface(page).locator('#fb-message')).toHaveValue('')
    })

    test('the message field stops at the 5000 characters the server accepts', async ({ page }) => {
      await standIn(page)
      await open(page)
      await expect(surface(page).locator('#fb-message')).toHaveAttribute('maxlength', '5000')
    })

    if (modal) test('a crash report opens with its own content after an earlier message was sent', async ({ page }) => {
      await standIn(page)
      await open(page)
      await submit(page).click()
      await expect(heading(page)).toBeVisible()
      await surface(page).getByRole('button', { name: 'Close', exact: true }).click()
      await expect(surface(page)).toHaveCount(0)
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('uil4b:report-problem', {
        cancelable: true,
        detail: { typeId: 'bug', subject: 'Crash on /projects', message: 'Seeded crash text.' },
      })))
      await expect(heading(page)).toHaveCount(0)
      await expect(surface(page).locator('#fb-message')).toHaveValue('Seeded crash text.')
      await expect(surface(page).locator('#fb-subject')).toHaveValue('Crash on /projects')
    })

    if (modal) test('reopening during sending preserves the error when delivery fails', async ({ page }) => {
      const server = await standIn(page, () => ({ hold: true, status: 502 }))
      await open(page)
      await submit(page).click()
      await surface(page).getByRole('button', { name: 'Close', exact: true }).click()
      await page.locator('.global-feedback-btn').click()
      await expect(heading(page)).toBeFocused()
      await expect.poll(() => server.posted.length).toBe(1)
      server.release()
      await expect.poll(() => server.posted.length).toBe(2)
      server.release()
      await failure(page, server)
    })

    test('sending another message creates a fresh id', async ({ page }) => {
      const server = await standIn(page)
      await open(page)
      await submit(page).click()
      const another = surface(page).getByRole('button', { name: modal ? 'Send another' : 'Submit another' })
      await expect(another).toBeEnabled()
      await another.click()
      await surface(page).locator('#fb-message').fill(text)
      await submit(page).click()
      await expect(another).toBeEnabled()
      expect(server.posted).toHaveLength(2)
      expect(server.posted[1].requestId).not.toBe(server.posted[0].requestId)
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Links from outside the app (/support, a failed payment) arrive at /feedback
// with `?from=support` or `?reason=`. They choose the form's starting point;
// a draft kept from a failed send, and the address a payment problem needs,
// take precedence over that.
test.describe('feedback page opened from a link', () => {
  const form = page => page.locator('.fb-page')
  const emailError = page => form(page).locator('#fb-email-error')
  const sent = page => form(page).getByRole('heading', { name: 'Sent', exact: true })
  const message = 'My card was declined twice on the Pro checkout.'

  async function standIn(page, reply = () => ({ status: 200 })) {
    const posted = []
    const gates = []
    await page.route('**/api/support', async route => {
      posted.push(JSON.parse(route.request().postData() || '{}'))
      const verdict = reply(posted.length)
      if (verdict.hold) await new Promise(resolve => gates.push(resolve))
      await route.fulfill({ status: verdict.status ?? 200, contentType: 'application/json', body: '{}' })
    })
    return { posted, release: () => gates.splice(0).forEach(resolve => resolve()) }
  }

  test('?from=support and any ?reason= preselect Help; no link defaults to a feature request', async ({ page }) => {
    const checked = () => form(page).locator('[role="radio"][aria-checked="true"]')
    await go(page, '/feedback?from=support')
    await expect(checked()).toHaveText('Help request')
    await go(page, '/feedback?reason=anything_at_all')
    await expect(checked()).toHaveText('Help request')
    await go(page, '/feedback')
    await expect(checked()).not.toHaveText('Help request')
  })

  test('reason=payment_failed fills the subject and makes the email required', async ({ page }) => {
    await go(page, '/feedback?reason=payment_failed')
    await expect(form(page).locator('#fb-subject')).toHaveValue('Payment failed')
    await expect(form(page).locator('#fb-email')).toHaveAttribute('aria-required', 'true')
    await expect(form(page).getByText('Required — we need your email to reply.')).toBeVisible()
  })

  test('signed out with a blank email: the required-email error shows, no Sent, no request', async ({ page }) => {
    watch(page, 'a visitor whose payment failed')
    const server = await standIn(page)
    await go(page, '/feedback?reason=payment_failed')
    await form(page).locator('#fb-message').fill(message)
    await form(page).locator('button[type="submit"]').click()
    await expect(emailError(page)).toHaveText('Add your email so we can reply about your payment.')
    await expect(emailError(page)).toHaveAttribute('role', 'alert')
    await expect(form(page).locator('#fb-email')).toBeFocused()
    await expect(sent(page)).toHaveCount(0)
    // Give a wrongly-sent request every chance to arrive before counting none.
    await page.waitForTimeout(500)
    expect(server.posted).toHaveLength(0)
  })

  test('signed out with a valid email: Sent shows at once and exactly one request goes up', async ({ page }) => {
    watch(page, 'a visitor whose payment failed')
    const server = await standIn(page, () => ({ hold: true }))
    await go(page, '/feedback?reason=payment_failed')
    await form(page).locator('#fb-email').fill('pat@example.com')
    await form(page).locator('#fb-message').fill(message)
    await form(page).locator('button[type="submit"]').click()
    await expect(sent(page)).toBeVisible()
    await expect.poll(() => server.posted.length).toBe(1)
    expect(server.posted[0]).toMatchObject({
      type: 'help',
      subject: 'Payment failed',
      message,
      email: 'pat@example.com',
    })
    server.release()
    await expect(form(page).getByRole('button', { name: 'Submit another' })).toBeEnabled()
    expect(server.posted).toHaveLength(1)
  })

  test('a draft kept from a failed send is restored, and wins over the link defaults', async ({ page }) => {
    watch(page, 'a visitor retrying after a failed send')
    await standIn(page, () => ({ status: 502 }))
    await go(page, '/feedback')
    await form(page).getByRole('radio', { name: 'Bug Report' }).click()
    await form(page).locator('#fb-subject').fill('Export is broken')
    await form(page).locator('#fb-email').fill('pat@example.com')
    await form(page).locator('#fb-message').fill(message)
    await form(page).locator('button[type="submit"]').click()
    await expect(form(page).locator('.fb-error')).toHaveAttribute('role', 'alert')
    // Leave, then come back through a link that would otherwise preselect Help
    // with the subject "Payment failed".
    await page.locator('a[href="/projects"]').first().click()
    await expect(form(page)).toHaveCount(0)
    await page.evaluate(() => { history.pushState({}, '', '/feedback?reason=payment_failed'); dispatchEvent(new PopStateEvent('popstate')) })
    await expect(form(page).getByLabel('Your message')).toHaveValue(message)
    await form(page).getByRole('button', { name: 'Edit message' }).click()
    await expect(form(page).locator('[role="radio"][aria-checked="true"]')).toHaveText('Bug Report')
    await expect(form(page).locator('#fb-subject')).toHaveValue('Export is broken')
    await expect(form(page).locator('#fb-email')).toHaveValue('pat@example.com')
    await expect(form(page).locator('#fb-message')).toHaveValue(message)
  })
})
