// THE LAST FOUR CELLS UNDER 8.
//
// Six lanes (#447-#452) rated every page of this site out of 10 across eight
// dimensions. Four cells finished below the bar. This file is the rendered
// evidence for the three that engineering could close, and every test in it was
// seen to FAIL against the code as it stood — the mutation for each is named
// above the test it belongs to.
//
//   /feedback        purpose & content 6 → 9. A signed-out submission carried
//                    `email: ""`, the form had nowhere to type one, and the
//                    confirmation said "received and will be reviewed" either
//                    way. The form's own "Help Request" type is the sharp end:
//                    a question asked with no return address, answered with a
//                    green tick. /api/support has always taken the field.
//
//   /create/gradient interaction & states 7 → 9. The stop's hex input reported
//                    `border-width:0px`, `background-color:rgba(0,0,0,0)` and
//                    `padding:0px` in all 22 width/theme cells, beside a
//                    position field that has always had a box. The lane before
//                    this one left it because the value has 12.8px of slack at
//                    320 and a box costs 14px — true of the 80px column, and
//                    not true of the row, which leaves 58px of its first line
//                    empty at every width below 481.
//
//   /create/palette  code quality 7 → 8. 3,528 lines in one component; the
//                    preview block (280 of them) now lives in two modules of
//                    its own. The equivalence evidence is NOT here: it is
//                    64-computed-style-snapshot.spec.js passing on
//                    /create/palette against a baseline that was not
//                    regenerated for the move. What is here is the assertion
//                    that the page still paints all eighteen scenes THROUGH the
//                    module it now imports them from.
//
//   /login           dimensions 3 and 4, 7 → 8. Two non-copy causes, both
//                    measured: a `.fg-loader` turning behind the dialog for as
//                    long as it was open, and an <h2> sitting 8px above the
//                    primary action — less space than any two form fields in
//                    the same dialog get between them. The heading's WORDS are
//                    untouched and stay founder-blocked; see the PR body.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** The full matrix the quality rubric names, including the 1097-1136 band. */
const WIDTHS = [320, 390, 430, 768, 1024, 1097, 1120, 1136, 1280, 1440, 1920]

/** WCAG 2.2 AA 2.5.8 (Target Size, Minimum). */
const MIN_TARGET = 24

/**
 * A context at an exact width and theme: real touch metrics under 700, a
 * desktop above. `vs-t` is the key the theme control persists, written before
 * the boot script runs so the first paint is already in the right theme.
 */
async function at(browser, width, theme = 'light', opts = {}) {
  const ctx = await browser.newContext({
    ...(width < 700
      ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
      : { viewport: { width, height: 900 } }),
    ...(opts.reduced ? { reducedMotion: 'reduce' } : {}),
  })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  if (opts.reduced) {
    // The stored preference, which beats the OS query on this build — see the
    // note at the top of 27-motion-guards.spec.js.
    await ctx.addInitScript(() => {
      try { localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: true })) } catch { /* private mode */ }
    })
  }
  return { ctx, page: await ctx.newPage() }
}

/** Read only once nothing is still moving. Infinite and scroll-driven
 *  animations are not unsettled ones — the long form of this reasoning is in
 *  75-colour-tools-quality.spec.js. */
async function settled(page) {
  await page.waitForFunction(
    () => document.getAnimations().every((a) => {
      if (a.playState === 'finished' || a.playState === 'idle') return true
      if (a.timeline && a.timeline !== document.timeline) return true
      try { return a.effect?.getTiming?.().iterations === Infinity } catch { return true }
    }),
    null, { polling: 'raf', timeout: 6000 },
  )
  await page.evaluate(async () => {
    for (let round = 0; round < 3; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/**
 * Answer /api/support the way the deployed function does, and hand back every
 * body that was posted.
 *
 * `vite preview` serves dist/ statically and runs no Vercel functions, so this
 * endpoint is a permanent 404 here. Fulfilling it is not a workaround for that:
 * it is the only way to read what the CLIENT decided to send, which is the
 * whole subject of the /feedback cell.
 */
async function captureSupport(page, status = 200) {
  const posted = []
  await page.route('**/api/support', async (route) => {
    posted.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({ status, contentType: 'application/json', body: '{"ok":true}' })
  })
  return posted
}

// ─────────────────────────────────────────────────────────────────────────────
// /feedback — a signed-out submission can now be answered, or says it cannot
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/feedback carries a return address, or says there is none', () => {
  // MUTATION: in src/pages/Feedback.jsx change
  //   const email = accountEmail || contact.trim()
  // to
  //   const email = accountEmail
  // — the old behaviour exactly. This test goes red on the payload assertion,
  // and `the confirmation names the address` goes red with it.
  test('a typed address reaches the request body', async ({ page }) => {
    watch(page, 'signed-out visitor reporting a bug')
    const posted = await captureSupport(page)
    await go(page, '/feedback')

    const field = page.locator('#fb-email')
    await expect(field, 'a signed-out visitor has nowhere to leave an address').toBeVisible()
    await expect(page.locator('label[for="fb-email"]')).toHaveText('Email')

    await field.fill('maya@example.com')
    await page.fill('#fb-message', 'The CSS export button did nothing for me.')
    await page.click('.fb-submit')
    await expect(page.locator('.fb-done')).toBeVisible()

    expect(posted, 'exactly one submission should have been posted').toHaveLength(1)
    expect(posted[0].email, 'the address the visitor typed did not go up').toBe('maya@example.com')
    // The contract is unchanged: the same five keys, no more.
    expect(Object.keys(posted[0]).sort()).toEqual(['email', 'message', 'source', 'subject', 'type'])
  })

  // MUTATION: in src/pages/Feedback.jsx replace the whole `{sentTo ? … : …}`
  // ternary inside `.fb-done-reply` with the `sentTo` branch alone. Both
  // confirmation tests below go red, one on each branch.
  test('the confirmation names the address it can reply to', async ({ page }) => {
    watch(page, 'signed-out visitor who left an address')
    await captureSupport(page)
    await go(page, '/feedback')
    await page.fill('#fb-email', 'maya@example.com')
    await page.fill('#fb-message', 'A question about exports.')
    await page.click('.fb-submit')

    const reply = page.locator('.fb-done-reply')
    await expect(reply).toHaveText('A reply can reach you at maya@example.com.')
    // Inside the region the app already announces, so the outcome is spoken
    // rather than only drawn.
    await expect(page.locator('.fb-done')).toHaveAttribute('role', 'status')
  })

  test('with no address, the confirmation says it is one-way', async ({ page }) => {
    watch(page, 'signed-out visitor who left no address')
    const posted = await captureSupport(page)
    await go(page, '/feedback')
    await page.fill('#fb-message', 'Just so you know, the tint tool is great.')
    await page.click('.fb-submit')

    await expect(page.locator('.fb-done-reply'))
      .toHaveText('No email address went with it, so this one is one-way.')
    // And the submission really did go up without one — the sentence is a
    // report, not a decoration.
    expect(posted[0].email).toBe('')
  })

  // MUTATION: in src/pages/Feedback.jsx delete the
  //   if (!accountEmail && !isContactEmail(contact)) {
  // guard and its body. This goes red on `posted` — the request is made, the
  // server answers 400, and the page reports a connection problem.
  test('a malformed address is refused before any request is made', async ({ page }) => {
    watch(page, 'visitor interrupted mid-address')
    // 400 is what api/support.js actually answers a bad address with; if the
    // guard is gone, this is the response the page would be reasoning from.
    const posted = await captureSupport(page, 400)
    await go(page, '/feedback')
    await page.fill('#fb-email', 'bob@')
    await page.fill('#fb-message', 'Cannot export.')
    await page.click('.fb-submit')

    const error = page.locator('#fb-email-error')
    await expect(error).toBeVisible()
    await expect(error).toHaveAttribute('role', 'alert')
    await expect(page.locator('#fb-email')).toHaveAttribute('aria-invalid', 'true')
    // Focus moved to the field, so the reason is reachable rather than
    // announced once and lost — the rule the message field already follows.
    await expect(page.locator('#fb-email')).toBeFocused()
    expect(posted, 'a malformed address must not be sent to the server').toHaveLength(0)
    // And the page has NOT claimed success.
    await expect(page.locator('.fb-done')).toHaveCount(0)
  })

  test('signed in, the account address still goes up and there is no second field', async ({ page }) => {
    watch(page, 'signed-in visitor reporting a bug')
    const posted = await captureSupport(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/feedback')

    await expect(page.locator('#fb-email'), 'a signed-in visitor must not be asked twice').toHaveCount(0)
    await expect(page.locator('.fb-form .fb-sending-as')).toHaveText('Sending as free.user@uil4b.test')

    await page.fill('#fb-message', 'The export button did nothing.')
    await page.click('.fb-submit')
    await expect(page.locator('.fb-done')).toBeVisible()
    expect(posted[0].email, 'the signed-in contract changed').toBe('free.user@uil4b.test')
    await expect(page.locator('.fb-done-reply')).toHaveText('A reply can reach you at free.user@uil4b.test.')
  })

  // The new field must not cost the form its reflow. 320 is the floor the
  // rubric names and the width the Subject field above it already survives.
  for (const width of [320, 1440]) {
    test(`the form still reflows at ${width}`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      watch(page, `signed-out visitor at ${width}`)
      await go(page, '/feedback')
      await settled(page)

      const overflow = await page.evaluate((w) => [...document.querySelectorAll('.fb-form *')]
        .map((el) => ({ cls: el.className, right: el.getBoundingClientRect().right }))
        .filter((r) => r.right > w + 1), width)
      expect(overflow, `${width}: something in the form paints outside the viewport`).toEqual([])

      const hint = page.locator('#fb-email-hint')
      await expect(hint).toHaveText('Optional — but without it there is no way to reply to you.')
      // The hint is a helper, not a control: it must not be the thing that
      // makes the field's own target smaller than the floor.
      const box = await page.locator('#fb-email').boundingBox()
      expect(box.height, `${width}: the email field is ${box.height}px tall`).toBeGreaterThanOrEqual(MIN_TARGET)

      await ctx.close()
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/gradient — the stop's hex looks like something you can type in
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the gradient stop hex reads as a field', () => {
  // MUTATION: in src/styles/global.css, inside the `input.ggn-stop-hex{…}` rule
  // (the one that begins `font-family:var(--mono);padding:5px 6px`), replace
  //   background:var(--ggn-bg);border:1px solid var(--ggn-line)
  // with
  //   background:transparent;border:none
  // — which is what this field declared until 2026-09-11. Every width below
  // goes red, in both themes.
  for (const width of WIDTHS) {
    for (const theme of ['light', 'dark']) {
      test(`it paints a box at ${width} in ${theme}`, async ({ browser }) => {
        const { ctx, page } = await at(browser, width, theme)
        watch(page, `designer typing a hex at ${width} ${theme}`)
        await go(page, '/create/gradient')
        await settled(page)

        // POSITIVE CONTROL: a fresh gradient has three stops, so a page that
        // rendered none cannot pass this vacuously.
        const fields = page.locator('input.ggn-stop-hex')
        await expect(fields).toHaveCount(3)

        const boxes = await page.evaluate(() => [...document.querySelectorAll('input.ggn-stop-hex')].map((el) => {
          const cs = getComputedStyle(el)
          const r = el.getBoundingClientRect()
          return {
            name: el.getAttribute('aria-label'),
            border: parseFloat(cs.borderTopWidth),
            ground: cs.backgroundColor,
            padX: parseFloat(cs.paddingLeft),
            h: +r.height.toFixed(1),
            clipped: el.scrollWidth > el.clientWidth,
            // What the neighbour in the same row has always had, so the
            // assertion is "these two agree" and not "this one has a number".
            posBorder: parseFloat(getComputedStyle(el.closest('.ggn-stop').querySelector('.ggn-stop-pos input')).borderTopWidth),
          }
        }))

        for (const b of boxes) {
          expect(b.border, `${width}/${theme}: ${b.name} has no border`).toBeGreaterThanOrEqual(1)
          expect(b.border, `${width}/${theme}: ${b.name} disagrees with its own row's position field`).toBe(b.posBorder)
          expect(b.ground, `${width}/${theme}: ${b.name} has no ground`).not.toBe('rgba(0, 0, 0, 0)')
          expect(b.padX, `${width}/${theme}: ${b.name} has no inline padding`).toBeGreaterThan(0)
          // The two properties the previous lane bought and this must not spend.
          expect(b.h, `${width}/${theme}: ${b.name} is ${b.h}px tall`).toBeGreaterThanOrEqual(MIN_TARGET)
          expect(b.clipped, `${width}/${theme}: ${b.name} clips its own value`).toBe(false)
        }

        await ctx.close()
      })
    }
  }

  // MUTATION: delete `.ggn-stop-hex-field{grid-column:3/-1}` from the
  // `@media(max-width:480px)` block in src/styles/global.css. The field falls
  // back to the 80px 1fr track, 80 - 14 = 66px of content for a 67.2px value,
  // and this goes red on BOTH assertions — the width and the clipping.
  test('below 481 the field spends the row\'s empty tail, not the value\'s slack', async ({ browser }) => {
    const { ctx, page } = await at(browser, 320)
    watch(page, 'designer editing a gradient on the narrowest phone')
    await go(page, '/create/gradient')
    await settled(page)

    const m = await page.evaluate(() => {
      const el = document.querySelector('input.ggn-stop-hex')
      const row = el.closest('.ggn-stop')
      const cs = getComputedStyle(el)
      // What the widest possible value measures in this exact face.
      const probe = document.createElement('span')
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font};letter-spacing:${cs.letterSpacing}`
      probe.textContent = '#WWWWWW'
      document.body.appendChild(probe)
      const need = probe.getBoundingClientRect().width
      probe.remove()
      return {
        width: +el.getBoundingClientRect().width.toFixed(1),
        content: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        need: +need.toFixed(1),
        rowHeight: +row.getBoundingClientRect().height.toFixed(1),
        rowDisplay: getComputedStyle(row).display,
      }
    })

    expect(m.rowDisplay, 'the ≤480 row is no longer a grid; this test measures the wrong thing').toBe('grid')
    // 144px: the 80px track plus the 58px of columns 4-5 that the position
    // field's `grid-column:3/4` leaves empty on row 1, plus the 6px gap.
    expect(m.width, 'the field did not take the row\'s empty tail').toBeGreaterThanOrEqual(140)
    expect(m.content, `the widest hex needs ${m.need}px and the box gives ${m.content}px`).toBeGreaterThan(m.need)
    // And the row did not get taller to pay for it.
    expect(m.rowHeight, 'the stop row grew').toBeLessThanOrEqual(93)

    await ctx.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/palette — the preview block still paints, from its own module
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the lifted preview module is what /create/palette paints', () => {
  // MUTATION: delete any one entry from `PREVIEW_SCENES.ui` in
  // src/data/palettePreviewScenes.js. This goes red on the count for that tab.
  // Deleting the `import { PREVIEW_SCENES }` line instead takes the whole route
  // down, which this also catches — on the modal never opening.
  test('all eighteen scenes render, each with the full --pv-* role set', async ({ page }) => {
    watch(page, 'designer checking a palette across every preview scene')
    await go(page, '/create/palette')
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(page.locator('.plb-pv').first()).toBeVisible()

    const ROLES = ['--pv-bg', '--pv-surface', '--pv-primary', '--pv-onprimary', '--pv-accent',
      '--pv-text', '--pv-muted', '--pv-border', '--pv-pborder', '--pv-accent-ink', '--pv-primary-ink']

    const seen = new Set()
    for (const tab of ['UI', 'Brand', 'Graphic Design']) {
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')

      const scenes = await page.evaluate((roles) => [...document.querySelectorAll('.plb-preview-grid .plb-pv')].map((el) => {
        const cs = getComputedStyle(el)
        return {
          name: el.dataset.previewScene,
          label: el.getAttribute('aria-label'),
          missing: roles.filter((r) => !cs.getPropertyValue(r).trim()),
        }
      }), ROLES)

      expect(scenes.length, `${tab} does not render six scenes`).toBe(6)
      for (const s of scenes) {
        expect(s.name, `${tab}: a scene rendered with no data-preview-scene`).toBeTruthy()
        expect(s.label, `${tab}/${s.name}: the scene lost its accessible name`).toBe(`${s.name} palette preview`)
        // `pvRef` moved with the components. If it had not, every one of these
        // would resolve to nothing and the scenes would paint unstyled.
        expect(s.missing, `${tab}/${s.name}: pvRef did not write ${s.missing.join(', ')}`).toEqual([])
        seen.add(`${tab}/${s.name}`)
      }
    }
    expect(seen.size, 'eighteen distinct scenes did not render').toBe(18)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /login — nothing turns behind the dialog, and the title has its own space
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the login route paints only what is true', () => {
  // MUTATION: in src/App.jsx delete the line
  //   if (!loading) return null
  // from LoginRoute. Every cell below goes red on the loader.
  for (const width of WIDTHS) {
    for (const theme of ['light', 'dark']) {
      test(`no loading indicator behind the dialog at ${width} in ${theme}`, async ({ browser }) => {
        const { ctx, page } = await at(browser, width, theme)
        watch(page, `visitor arriving on /login at ${width} ${theme}`)
        await go(page, '/login')
        await expect(page.locator('.ui-login')).toBeVisible()
        await settled(page)

        const behind = await page.evaluate(() => {
          const main = document.querySelector('#main, main')
          return {
            loaders: document.querySelectorAll('.fg-loader').length,
            mainText: (main?.innerText || '').trim(),
            // The dialog is what the route's content actually is, and
            // renderState() in helpers.js counts it. Asserted so "main is
            // empty" can never be read as "the page rendered nothing".
            dialog: (document.querySelector('[role="dialog"]')?.innerText || '').length,
          }
        })
        expect(behind.loaders, `${width}/${theme}: a spinner is still turning behind the dialog`).toBe(0)
        expect(behind.mainText, `${width}/${theme}: main is not empty`).toBe('')
        expect(behind.dialog, `${width}/${theme}: the dialog rendered nothing`).toBeGreaterThan(40)

        await ctx.close()
      })
    }
  }

  // The same assertion for a visitor who has asked for less motion. It is not a
  // duplicate: `html[data-reduced-motion="true"] .fg-loader{animation:none}`
  // already stopped the spinning for this person, which made a permanent,
  // MOTIONLESS grey ring the thing behind their dialog — the defect without the
  // one cue that it was a loader.
  for (const width of [390, 1440]) {
    test(`nothing turns behind the dialog at ${width} with reduced motion`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width, 'light', { reduced: true })
      watch(page, `visitor who asked for less motion, on /login at ${width}`)
      await go(page, '/login')
      await expect(page.locator('.ui-login')).toBeVisible()
      await settled(page)
      expect(await page.locator('.fg-loader').count(), 'a ring is still painted behind the dialog').toBe(0)
      await ctx.close()
    })
  }

  // MUTATION: in src/styles/global.css change
  //   .ui-login .ui-modal-body{padding-top:20px}
  // back to `padding-top:8px`. Every width below goes red.
  for (const width of WIDTHS) {
    test(`the dialog title has more space beneath it than its fields do at ${width}`, async ({ browser }) => {
      const { ctx, page } = await at(browser, width)
      watch(page, `visitor reading the login dialog at ${width}`)
      await go(page, '/login')
      await expect(page.locator('.ui-login')).toBeVisible()
      await settled(page)

      const m = await page.evaluate(() => {
        const title = document.querySelector('#ui-login-title')
        const first = document.querySelector('.ui-modal-body .auth-google-btn')
        const form = document.querySelector('.auth-form')
        return {
          gap: +(first.getBoundingClientRect().top - title.getBoundingClientRect().bottom).toFixed(1),
          // The dialog's own rhythm, read rather than hard-coded: the gap
          // between two adjacent form fields.
          fieldGap: parseFloat(getComputedStyle(form).rowGap),
          titleSize: getComputedStyle(title).fontSize,
        }
      })

      // A heading must not be grouped more tightly than the sections under it.
      expect(m.gap, `${width}: the h2 sits ${m.gap}px above the primary action, against a ${m.fieldGap}px field rhythm`)
        .toBeGreaterThanOrEqual(m.fieldGap)
      // The words and the type are untouched — this cell is a SPACING fix and
      // nothing else. `auth.welcomeBack` is founder-blocked.
      expect(m.titleSize).toBe('19px')
      await expect(page.locator('#ui-login-title')).toHaveText('Welcome Back')

      await ctx.close()
    })
  }

  // The short-viewport exemption, which is the half a naive spacing change
  // would have broken. `@media(max-height:460px)` exists because at 844x390
  // this dialog hid 133px below the fold, including the submit button; the
  // 20px above is deliberately NOT spent there.
  //
  // MUTATION: delete the `@media(max-height:460px){.ui-login .ui-modal-body
  // {padding-top:8px}}` block that follows the 20px rule. The gap becomes 20
  // and this goes red — as does the budget assertion, by 12px.
  test('a landscape phone keeps the tighter rhythm and the submit button', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA,
    })
    const page = await ctx.newPage()
    watch(page, 'visitor signing in on a landscape phone')
    await go(page, '/login')
    await expect(page.locator('.ui-login')).toBeVisible()
    await settled(page)

    // Measured twice on the same rendered dialog: as the stylesheet leaves it,
    // and again with the 20px forced back on. The difference is what the
    // exemption is WORTH here, which is a stronger thing to assert than any
    // absolute pixel count — the dialog's content has changed several times
    // since the height query was written and will change again.
    const m = await page.evaluate(() => {
      const dialog = document.querySelector('.ui-login')
      const body = document.querySelector('.ui-login .ui-modal-body')
      const title = document.querySelector('#ui-login-title')
      const first = document.querySelector('.ui-modal-body .auth-google-btn')
      const hidden = () => dialog.scrollHeight - dialog.clientHeight
      const exempt = {
        padTop: getComputedStyle(body).paddingTop,
        gap: +(first.getBoundingClientRect().top - title.getBoundingClientRect().bottom).toFixed(1),
        hidden: hidden(),
        scrolls: dialog.scrollHeight > dialog.clientHeight,
      }
      body.style.paddingTop = '20px'
      void dialog.offsetHeight
      const cost = hidden() - exempt.hidden
      body.style.paddingTop = ''
      return { ...exempt, cost }
    })
    expect(m.padTop, 'the landscape exemption stopped applying').toBe('8px')
    expect(m.gap, 'the title is taking the tall-viewport gap on a landscape phone').toBeLessThan(12)
    // The whole 12px, not some of it — anything less means the two rules are
    // fighting rather than the later one winning outright.
    expect(m.cost, 'spending the title gap here would cost nothing, so the exemption is dead code').toBe(12)
    // And what IS below the fold stays reachable: .ui-modal scrolls, with the
    // pure-CSS scroll shadow that tells the reader there is more.
    expect(m.scrolls, 'the dialog does not scroll, so anything below the fold is lost').toBe(true)

    await ctx.close()
  })
})
