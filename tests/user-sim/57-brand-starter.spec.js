// THE BRAND STARTER, in a browser.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS PROVES, AND WHY EACH ONE IS HERE
// ─────────────────────────────────────────────────────────────────────────────
//   1. a free account gets EXACTLY ONE successful generation;
//   2. the second is refused, in words, with the quota state on screen;
//   3. a failed provider call does NOT consume the use — and the proof is that
//      a real generation still works afterwards, not merely that a counter
//      still reads 1;
//   4. the result LANDS in the Palette Builder with the values loaded, followed
//      across a real navigation into the real tool;
//   5. /plans prints the same numbers api/ai.js enforces.
//
// Every limit and label below is IMPORTED from src/config/aiGeneration.js
// rather than typed. A spec that hard-codes "1" would keep passing after the
// founder changes the allowance, and would then be asserting the old product.
//
// THE STUB IS AT THE NETWORK, NOT IN THE COMPONENT. page.route intercepts
// /api/ai, so the request body, the headers, the response handling, the meter
// arithmetic and the refusals are all the real code. The one thing the fixture
// supplies is a Firebase ID token, which the sandboxed runner cannot mint
// (identitytoolkit is blocked — see EXPECTED_NOISE in helpers.js).
//
// The signed-in session helper another agent is building had not landed when
// this was written — origin/main was still 5c6603a and no open PR carried it —
// so this uses the mounted-fixture approach, the same one #385 used for the
// User Home and the same one 12-ui-system-builder and the type-save flow use.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'
import {
  FREE_TOTAL_GENERATIONS,
  PRO_MONTHLY_GENERATIONS,
  MIN_PROMPT_CHARS,
  allowanceSentence,
} from '../../src/config/aiGeneration.js'

const FIXTURE = '/tests/user-sim/fixtures/brand-starter.html'

// A brief long enough to clear the floor the server enforces, and a real one —
// a string of 'x' would pass the length check while telling nobody reading this
// file what the tool is for.
const BRIEF = 'A booking app for independent dog groomers. Calm and practical, readable all day.'

// The answer a healthy provider produces, already through the server's
// sanitiser. Fonts are real families from the shipped catalogue, because the
// server refuses anything else and the page renders a live specimen from them.
const STARTER = Object.freeze({
  name: 'Quiet Schedule',
  rationale: 'A calm working palette that stays readable across a full day of scheduling.',
  palette: [
    { role: 'Background', hex: '#FFFFFF' },
    { role: 'Surface', hex: '#F4F5F7' },
    { role: 'Text', hex: '#14161A' },
    { role: 'Primary', hex: '#1F5F9E' },
    { role: 'Accent', hex: '#C2643B' },
  ],
  fonts: {
    heading: { family: 'Manrope', weight: 700, category: 'sans-serif' },
    body: { family: 'Lora', weight: 400, category: 'serif' },
  },
  typeScale: { base: 17, ratio: 1.25 },
})

/**
 * A stand-in for the metered endpoint, counting the way the server counts.
 *
 * `limit` comes from the real config, so this cannot drift from what the
 * product enforces. `failFirst` reproduces the case that matters most: a
 * provider that dies WITHOUT the attempt costing the caller anything — which is
 * exactly what api/ai.js does by placing the usage increment after the runner's
 * early return.
 */
async function stubAi(page, { limit = FREE_TOTAL_GENERATIONS, plan = 'free', startUsed = 0, failFirst = false } = {}) {
  const state = { used: startUsed, calls: [], failuresLeft: failFirst ? 1 : 0 }
  const period = plan === 'pro' ? 'month' : 'lifetime'

  await page.route('**/api/ai', async (route) => {
    const request = route.request()
    state.calls.push({
      method: request.method(),
      auth: request.headers()['authorization'] || '',
      body: JSON.parse(request.postData() || '{}'),
    })

    // Refused before any work, the way the handler refuses before task.run().
    if (state.used >= limit) {
      return route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: plan === 'pro'
            ? `You have used all ${PRO_MONTHLY_GENERATIONS} Brand Starter generations in your plan this month. It resets on the 1st.`
            : 'You have used your one free Brand Starter generation. Pro raises this to a monthly allowance — everything you have already generated stays where it is.',
          generation: { used: state.used, limit, remaining: 0, period },
          plan,
        }),
      })
    }

    // A provider failure. NOTHING is counted — this is the whole point.
    if (state.failuresLeft > 0) {
      state.failuresLeft -= 1
      return route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'The AI provider could not be reached, so nothing was generated. Your allowance is untouched — try again shortly.',
          quotaSpent: false,
        }),
      })
    }

    state.used += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        starter: STARTER,
        provider: 'openrouter',
        plan,
        beta: true,
        generation: { used: state.used, limit, remaining: limit - state.used, period },
      }),
    })
  })

  return state
}

const openFixture = async (page, plan = 'free') => {
  await go(page, plan === 'pro' ? `${FIXTURE}?plan=pro` : FIXTURE)
  await expectRendered(page, 'the Brand Starter fixture')
}

const generate = (page) => page.getByTestId('brand-starter-generate')

async function writeBrief(page, text = BRIEF) {
  await page.locator('#bs-brief').fill(text)
}

test.describe('the Brand Starter, on a free account', () => {
  test('THE POSITIVE CONTROL: one brief produces one real, complete result', async ({ page }) => {
    // Everything else in this file asserts a REFUSAL, and "the second attempt
    // was refused" is trivially true if the first never worked. This is the
    // control that makes the rest mean something.
    watch(page, 'a free user generating their first brand starter')
    const state = await stubAi(page)
    await openFixture(page)

    // The allowance is legible BEFORE the field, not after the refusal.
    await expect(page.getByTestId('brand-starter-allowance'))
      .toContainText(allowanceSentence('free'))
    await expect(page.getByTestId('brand-starter-result')).toHaveCount(0)

    await writeBrief(page)
    await expect(generate(page)).toBeEnabled()
    await generate(page).click()

    const result = page.getByTestId('brand-starter-result')
    await expect(result).toBeVisible()
    await expect(result).toContainText(STARTER.name)
    await expect(result).toContainText(STARTER.rationale)

    // All three artefacts, with their real values — not a heading each.
    for (const swatch of STARTER.palette) {
      await expect(result).toContainText(swatch.hex)
      await expect(result).toContainText(swatch.role)
    }
    await expect(result).toContainText('Manrope')
    await expect(result).toContainText('Lora')
    await expect(page.getByTestId('brand-starter-scale'))
      .toContainText(`${STARTER.typeScale.base}px base · ${STARTER.typeScale.ratio} ratio`)

    // Exactly one provider call, correctly addressed and authenticated.
    expect(state.calls, 'one press must make exactly one request').toHaveLength(1)
    expect(state.calls[0].body.task).toBe('brand-starter')
    expect(state.calls[0].body.description).toBe(BRIEF)
    expect(state.calls[0].auth, 'the request must carry a bearer token').toMatch(/^Bearer .+/)

    // The measured contrast is stated as a fact, with the number in it.
    await expect(page.getByTestId('brand-starter-contrast')).toContainText(':1')
  })

  test('THE ONE THAT MATTERS: the second generation is refused, in words, with the count', async ({ page }) => {
    watch(page, 'a free user who has already used their one generation')
    const state = await stubAi(page)
    await openFixture(page)

    await writeBrief(page)
    await generate(page).click()
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()
    expect(state.used).toBe(FREE_TOTAL_GENERATIONS)

    // The wall appears on the strength of the server's own count, and says the
    // two things a person needs: what ran out, and that it does not come back.
    const wall = page.getByTestId('brand-starter-wall')
    await expect(wall).toBeVisible()
    await expect(wall).toContainText(/one free/i)
    await expect(wall, 'a free allowance must never promise a reset it will not honour')
      .not.toContainText(/resets on the 1st/i)
    await expect(wall.getByRole('link', { name: /Pro/i })).toHaveAttribute('href', '/plans')
    await expect(page.getByTestId('brand-starter-remaining')).toContainText('0 left')

    // …and the control is off, so a second request is never even attempted.
    await expect(generate(page)).toBeDisabled()
    expect(state.calls, 'the client must not fire a request it knows will be refused').toHaveLength(1)

    // The result they already have is STILL THERE. Running out must not take
    // away what they generated — Customer.io's failed extraction leaves the
    // existing style variables untouched below the banner.
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()
    await expect(page.getByTestId('brand-starter-result')).toContainText(STARTER.name)
  })

  test('a server refusal is rendered even when the client thought it had room', async ({ page }) => {
    // The second tab / stale client case: the account is already spent, so the
    // FIRST press this page makes comes back 429. Without this, the wall would
    // only ever be proven on a count this page itself produced.
    watch(page, 'a free user whose account was already spent elsewhere')
    const state = await stubAi(page, { startUsed: FREE_TOTAL_GENERATIONS })
    await openFixture(page)

    await writeBrief(page)
    await expect(generate(page), 'a fresh page cannot know the account is spent').toBeEnabled()
    await generate(page).click()

    await expect(page.getByTestId('brand-starter-wall')).toBeVisible()
    await expect(page.getByTestId('brand-starter-remaining')).toContainText('0 left')
    await expect(generate(page)).toBeDisabled()
    expect(state.calls).toHaveLength(1)
  })

  test('THE ONE THAT MATTERS: a failed provider call does not consume the use', async ({ page }) => {
    // Proven the only way that actually proves it: fail, then succeed. A
    // counter that still reads "1 left" after a failure could be a stale
    // client; a real generation afterwards could not.
    watch(page, 'a free user whose first attempt hits a dead provider')
    const state = await stubAi(page, { failFirst: true })
    await openFixture(page)

    await writeBrief(page)
    await generate(page).click()

    const error = page.getByTestId('brand-starter-error')
    await expect(error).toBeVisible()
    await expect(error, 'the error must say the allowance survived — it is the only thing they are worried about')
      .toContainText(/allowance is untouched/i)
    await expect(page.getByTestId('brand-starter-result')).toHaveCount(0)
    await expect(page.getByTestId('brand-starter-wall')).toHaveCount(0)
    expect(state.used, 'a failed provider call incremented the count').toBe(0)

    // The allowance is intact, and the proof is that it still WORKS.
    await expect(generate(page)).toBeEnabled()
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()
    await expect(page.getByTestId('brand-starter-result')).toContainText(STARTER.name)
    await expect(page.getByTestId('brand-starter-error')).toHaveCount(0)
    expect(state.used).toBe(1)
  })

  test('a brief too short to design from never reaches the provider', async ({ page }) => {
    watch(page, 'a free user typing two words')
    const state = await stubAi(page)
    await openFixture(page)

    await writeBrief(page, 'x'.repeat(MIN_PROMPT_CHARS - 1))
    await expect(generate(page)).toBeDisabled()
    // …and the reason is on screen, next to the control. A disabled button with
    // no explanation is the state this product keeps being told reads as broken.
    await expect(page.getByTestId('brand-starter-too-short')).toContainText(String(MIN_PROMPT_CHARS))
    expect(state.calls, 'a too-short brief must cost nothing').toHaveLength(0)
  })

  test('offline is named as the cause, and the brief is kept', async ({ page, context }) => {
    watch(page, 'a free user who loses their connection')
    const state = await stubAi(page)
    await openFixture(page)
    await writeBrief(page)

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))

    await expect(page.getByTestId('brand-starter-offline')).toBeVisible()
    await expect(page.getByTestId('brand-starter-offline')).toContainText(/allowance/i)
    await expect(generate(page)).toBeDisabled()
    expect(state.calls).toHaveLength(0)
    // The brief they wrote is still there to come back to.
    await expect(page.locator('#bs-brief')).toHaveValue(BRIEF)

    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(generate(page)).toBeEnabled()
  })

  test('the loading state says what is happening, and nothing pretends to be the answer', async ({ page }) => {
    watch(page, 'a free user waiting on a generation')
    let release
    const held = new Promise((resolve) => { release = resolve })
    await page.route('**/api/ai', async (route) => {
      await held
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          starter: STARTER,
          provider: 'openrouter',
          plan: 'free',
          generation: { used: 1, limit: FREE_TOTAL_GENERATIONS, remaining: 0, period: 'lifetime' },
        }),
      })
    })

    await openFixture(page)
    await writeBrief(page)
    await generate(page).click()

    const working = page.getByTestId('brand-starter-working')
    await expect(working).toBeVisible()
    await expect(working).toContainText(/palette/i)
    // No skeleton standing in for a result that has not arrived.
    await expect(page.getByTestId('brand-starter-result')).toHaveCount(0)
    await expect(generate(page)).toBeDisabled()

    release()
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()
    await expect(working).toHaveCount(0)
  })
})

test.describe('the result reaches the real tools', () => {
  test('THE ONE THAT MATTERS: the palette opens in the Palette Builder with the values loaded', async ({ page }) => {
    // Followed across a real navigation into the real tool. A hand-off asserted
    // only as an href is a hand-off nobody has proved arrives.
    watch(page, 'a free user taking their generated palette into the builder')
    await stubAi(page)
    await openFixture(page)
    await writeBrief(page)
    await generate(page).click()
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()

    const href = await page.getByTestId('brand-starter-open-palette').getAttribute('href')
    // The URL is the gallery hand-off format, not a second encoding invented here.
    expect(href).toMatch(/^\/create\/palette\?c=/)
    for (const swatch of STARTER.palette) {
      expect(href, `${swatch.hex} is missing from the hand-off URL`).toContain(swatch.hex.slice(1))
    }

    await go(page, href)
    await expectRendered(page, 'the Palette Builder after a Brand Starter hand-off')

    // THE ARRIVAL. The generated colours are on the board, not merely in the URL.
    for (const swatch of STARTER.palette) {
      await expect(
        page.locator('.plb-col').filter({ hasText: swatch.hex }),
        `${swatch.hex} (${swatch.role}) did not arrive in the Palette Builder`,
      ).toHaveCount(1)
    }
  })

  test('the fonts and the type scale are staged as drafts the destination accepts', async ({ page }) => {
    // The typography hand-offs are in-memory slots rather than URLs, so they are
    // read back through the REAL readPairDraft()/readScaleDraft(), which
    // re-validate on the way out — a draft that appears here is one Font Pair
    // and Type Scale would actually accept, and an invalid one would read null.
    watch(page, 'a free user taking their fonts and scale onward')
    await stubAi(page)
    await openFixture(page)
    await writeBrief(page)
    await generate(page).click()
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()

    const staged = page.getByTestId('fixture-staged')
    await expect(staged, 'nothing may be staged before the visitor asks for it').toContainText('"pair":null')

    await page.getByTestId('brand-starter-open-fonts').click()
    await expect(staged).toContainText('"family":"Manrope"')
    await expect(staged).toContainText('"family":"Lora"')
    await expect(staged).toContainText('"weight":700')

    await page.getByTestId('brand-starter-open-scale').click()
    await expect(staged).toContainText(`"base":${STARTER.typeScale.base}`)
    await expect(staged).toContainText(`"ratio":${STARTER.typeScale.ratio}`)
  })

  test('nothing is applied to the visitor’s work without them asking', async ({ page }) => {
    watch(page, 'a free user checking whether their project just changed')
    await stubAi(page)
    await openFixture(page)
    await writeBrief(page)
    await generate(page).click()

    const result = page.getByTestId('brand-starter-result')
    await expect(result).toBeVisible()
    await expect(result, 'the page must answer "did this just change my project?" before it is asked')
      .toContainText(/Nothing here has been saved or applied/i)
  })
})

test.describe('what the visitor is told about the allowance', () => {
  test('a Pro account is told a different, and true, thing', async ({ page }) => {
    watch(page, 'a Pro user opening the Brand Starter')
    await stubAi(page, { limit: PRO_MONTHLY_GENERATIONS, plan: 'pro' })
    await openFixture(page, 'pro')

    await expect(page.getByTestId('brand-starter-allowance'))
      .toContainText(allowanceSentence('pro'))
    await expect(page.getByTestId('brand-starter-allowance')).toContainText('Pro')

    await writeBrief(page)
    await generate(page).click()
    await expect(page.getByTestId('brand-starter-result')).toBeVisible()

    // Still has room, so no wall — the free tier's one-shot copy must not leak
    // onto a plan it is untrue for.
    await expect(page.getByTestId('brand-starter-wall')).toHaveCount(0)
    await expect(page.getByTestId('brand-starter-remaining'))
      .toContainText(`${PRO_MONTHLY_GENERATIONS - 1} left`)
  })

  test('the tool is labelled beta, in a word, with the limit stated', async ({ page }) => {
    watch(page, 'a visitor judging how finished this feature is')
    await stubAi(page)
    await openFixture(page)

    const beta = page.locator('.bs-beta')
    await expect(beta).toBeVisible()
    await expect(beta).toHaveText('Beta')
    // No icon, no gradient, no animation standing in for the word.
    const decoration = await beta.evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        image: cs.backgroundImage,
        animation: cs.animationName,
        filter: cs.filter,
      }
    })
    expect(decoration.image, 'the beta badge carries a gradient').toBe('none')
    expect(decoration.animation, 'the beta badge animates').toBe('none')
    expect(decoration.filter, 'the beta badge is filtered').toBe('none')
  })
})

test.describe('the pricing page and the server agree', () => {
  test('THE ONE THAT MATTERS: /plans prints the numbers api/ai.js enforces', async ({ page }) => {
    // The rendered half of tests/unit/ai-generation-truth.test.js. A source
    // assertion cannot see a component that stopped rendering, which is exactly
    // why 54-plans-truth.spec.js exists alongside plans-truth.test.js.
    watch(page, 'a visitor pricing the Brand Starter')
    await go(page, '/plans')
    await expectRendered(page, 'the plans page')

    const lists = page.locator('.sub-tier-list')
    await expect(lists.first(), 'the Free tier does not mention the Brand Starter at all')
      .toContainText('Brand Starter')

    // Both tiers state the SAME sentence the tool states and the server
    // enforces. Imported, never typed — if the founder changes the allowance,
    // this follows rather than going stale.
    //
    // WHAT THIS ASSERTION CANNOT SEE, stated so nobody tries to make it:
    // replacing {allowanceSentence('pro')} with the literal string it currently
    // returns leaves this test GREEN, because the rendered DOM is identical.
    // Mutation testing confirmed it survives here. That is not a hole — it is
    // the division of labour tests/unit/plans-truth.test.js already documents:
    // a DOM assertion cannot see a claim that stopped being derived, and a
    // source assertion cannot see a component that stopped rendering. The
    // typed-literal mutation IS killed, by "/plans derives the allowance
    // instead of typing it" in tests/unit/ai-generation-truth.test.js. Both
    // halves are needed and neither subsumes the other.
    await expect(page.locator('.sub-tier-list').first()).toContainText(allowanceSentence('free'))
    await expect(page.locator('.sub-tier-list').nth(1)).toContainText(allowanceSentence('pro'))

    // …and beta is disclosed where the money is, not only on the tool.
    await expect(page.locator('.sub-tier-list .beta-badge').first()).toBeVisible()
    await expect(page.locator('.sub-tier-list .beta-badge').first()).toHaveText('Beta')
  })

  test('the tool is reachable from the AI Studio menu, badged beta', async ({ page }) => {
    // Where a person would actually look for it. The route is live in the tool
    // tree, so the nav derives the row — this proves the derivation reaches the
    // rendered menu rather than stopping at the data.
    watch(page, 'a visitor looking for the AI tools')
    await go(page, '/')
    await expectRendered(page, 'the homepage')

    await page.getByRole('button', { name: /^Create/ }).first().hover()
    const row = page.locator('.pnav-tool', { hasText: 'Brand Starter' }).first()
    await expect(row).toBeVisible()
    await expect(row).toHaveAttribute('href', '/create/auto-builder')
    await expect(row.locator('.beta-badge')).toHaveText('Beta')
    await expect(row.locator('.soon-badge'), 'a live tool must not also be badged Soon').toHaveCount(0)
  })

  test('the route mounts the tool rather than the workshop placeholder', async ({ page }) => {
    // The /create/color lesson: a flag said a tool was live while the route
    // rendered something else entirely. Signed out, the page shows its header
    // and the auth gate — which is the correct signed-out state for a tool that
    // meters against an account.
    watch(page, 'a signed-out visitor opening the Brand Starter')
    await go(page, '/create/auto-builder')
    await expectRendered(page, 'the Brand Starter route')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Brand Starter')
    await expect(page.locator('.bs-beta')).toHaveText('Beta')
    await expect(page.locator('.coming-title'), 'the route still renders the workshop state')
      .toHaveCount(0)
    // Signed out, the gate is what you get — metering follows the account, so
    // there is no anonymous path to a provider call.
    await expect(page.locator('.auth-gate-prompt')).toBeVisible()
    await expect(page.getByTestId('brand-starter-generate')).toHaveCount(0)
  })
})
