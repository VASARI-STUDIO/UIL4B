// Plan limits: the promise, the belief and the enforcement must be one number.
//
// Three separately-editable places describe what a user may do:
//
//   • src/pages/Plans.jsx            what the user is PROMISED
//   • src/contexts/SubscriptionContext.jsx   what the client BELIEVES
//   • api/_lib/plans.js              what the server ENFORCES  ← the only real one
//
// Nothing stopped them drifting, and they had: the pricing page advertised
// 1,000 AI actions/day on Pro against a free provider tier metered PER PROJECT,
// which is oversold at roughly two simultaneous users. A client that believes a
// larger number than the server grants produces a 429 the user was never warned
// about, and that reads as a broken product rather than a metered one.
//
// These tests make the drift impossible to ship rather than merely regrettable.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PLANS, dailyLimitFor, monthlyLimitFor, planForUser } from '../../api/_lib/plans.js'
import { AI_LIMITS } from '../../src/config/plans.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// Comments explain WHY a number was retired and legitimately name it; only
// what ships to the user can be a false claim. Stripping them first is what
// keeps this test about the product rather than about the prose around it.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const TOOLS = ['alt-text', 'prompts-ai', 'ai-default']

test('the client mirror matches the server exactly, for every tool and both plans', () => {
  // Imported, not parsed: src/config/plans.js is deliberately plain data with no
  // React or Firebase in it, which is exactly what makes it testable here. It is
  // also the file api/_lib/plans.js has named as its counterpart since it was
  // written — it just never existed until the mirror needed a home outside a
  // component module.
  const mirrored = AI_LIMITS
  assert.deepEqual(Object.keys(mirrored).sort(), ['free', 'pro'])

  for (const planId of ['free', 'pro']) {
    for (const tool of TOOLS) {
      assert.equal(dailyLimitFor(PLANS[planId], tool), mirrored[planId].daily,
        `${planId}/${tool}: client daily limit disagrees with the server`)
      assert.equal(monthlyLimitFor(PLANS[planId], tool), mirrored[planId].monthly,
        `${planId}/${tool}: client monthly limit disagrees with the server`)
    }
  }
})

test('the pricing page quotes the numbers the server actually enforces', () => {
  // The page renders its figures from AI_LIMITS rather than hard-coded text, so
  // this asserts the absence of the literals that used to be typed in by hand.
  // "1,000 AI actions per day" was in three places on that page and true in
  // none of them.
  const page = read('src/pages/Plans.jsx')
  assert.ok(page.includes('AI_LIMITS'), 'Plans.jsx must derive its figures from AI_LIMITS')
  const shipped = stripComments(page)
  for (const stale of ['1,000', '1000 AI', '40 AI actions each day']) {
    assert.ok(!shipped.includes(stale), `Plans.jsx still ships the retired figure "${stale}"`)
  }
})

// Every surface that quoted an AI allowance. The figure was wrong in ALL of
// them — including Checkout, which a user reads at the moment they pay — because
// each was typed by hand and nothing tied them together.
//
// 'src/pages/Landing.jsx' WAS AN EIGHTH ENTRY HERE and was removed when that
// page was deleted (`landing-page-orphaned`): it was the superseded predecessor
// homepage, reachable from no route, and its 156 selectors were deleted with
// it. The entry is dropped rather than the test, which still covers the other
// seven. Removing it loses no coverage — a page that cannot render cannot quote
// a retired figure at anyone — and leaving it would have failed the suite with
// ENOENT rather than an assertion, which is how this deletion was noticed at
// all: eslint here runs no-unused-vars with varsIgnorePattern '^[A-Z_]' and is
// therefore blind to an unused React component.
const QUOTA_SURFACES = [
  'src/App.jsx',
  'src/pages/Plans.jsx',
  'src/pages/Checkout.jsx',
  'src/pages/Onboarding.jsx',
  'src/pages/Settings.jsx',
  'src/pages/HelpCentre.jsx',
]

test('no surface anywhere still ships the retired 1,000-per-day promise', () => {
  for (const file of QUOTA_SURFACES) {
    const shipped = stripComments(read(file))
    assert.ok(!/1,000 (?:daily )?AI|1,000 AI actions|1000 AI/.test(shipped),
      `${file} still promises the retired 1,000/day figure`)
  }
})

test('the one-off tier is no longer offered for sale', () => {
  // The founder pulled it: a third billing tab whose checkout stayed disabled
  // pending a live Stripe price. Existing entitlements are still honoured by
  // planForUser — this only asserts it stopped being ADVERTISED.
  const plans = stripComments(read('src/pages/Plans.jsx'))
  assert.ok(!plans.includes("id: 'lifetime'"), 'Plans.jsx must not offer a lifetime billing option')
  assert.ok(!/One-off/.test(plans), 'Plans.jsx must not advertise the One-off tier')
})

test('a monthly ceiling exists and is larger than a single day, on both plans', () => {
  // A monthly cap below or equal to the daily one would make the daily cap
  // unreachable and the plan a lie in the other direction.
  for (const planId of ['free', 'pro']) {
    const daily = dailyLimitFor(PLANS[planId], 'ai-default')
    const monthly = monthlyLimitFor(PLANS[planId], 'ai-default')
    assert.ok(monthly > daily, `${planId}: the monthly ceiling must exceed one day's allowance`)
    // …and below 31 full days, or it never binds and the shared provider pool
    // is protected by nothing but the daily cap.
    assert.ok(monthly < daily * 31, `${planId}: a monthly ceiling above 31 daily allowances never binds`)
  }
})

test('Pro is a real capacity increase over Free', () => {
  assert.ok(dailyLimitFor(PLANS.pro, 'ai-default') > dailyLimitFor(PLANS.free, 'ai-default'))
  assert.ok(monthlyLimitFor(PLANS.pro, 'ai-default') > monthlyLimitFor(PLANS.free, 'ai-default'))
})

test('the server enforces the free ceiling for everyone without an active subscription', () => {
  const cases = [
    ['no subscription at all', {}],
    ['a cancelled subscription', { subscription: { status: 'canceled' } }],
    ['a past-due subscription', { subscription: { status: 'past_due' } }],
    ['an active period that expired days ago', {
      subscription: { status: 'active', currentPeriodEnd: Date.now() - 5 * 86_400_000 },
    }],
    ['a revoked lifetime entitlement', { lifetimeEntitlement: { active: true, revokedAt: Date.now() } }],
  ]
  for (const [label, input] of cases) {
    assert.equal(planForUser(input).id, 'free', `${label} must resolve to Free`)
  }
})

test('an existing lifetime holder keeps Pro even though the tier is no longer sold', () => {
  // The one-off tier was pulled from the pricing page (an unfinished checkout
  // advertised as a product). Removing it from SALE must never remove it from
  // anyone who already holds one.
  assert.equal(planForUser({ lifetimeEntitlement: { active: true } }).id, 'pro')
})

test('no plan copy may claim Pro buys a better AI model — it buys capacity', () => {
  // modelFor returns the same model for both plans today, so "higher-quality
  // models" on a pricing page or in a tool header is an unbacked claim. If the
  // models ever genuinely diverge, this test is the right place to find out
  // that the copy may change too.
  const serverSrc = read('api/_lib/plans.js')
  const freeModel = /free: \{ 'alt-text': process\.env\.GEMINI_ALT_TEXT_MODEL \|\| '([^']+)'/.exec(serverSrc)
  const proModel = /pro: \{ 'alt-text': process\.env\.GEMINI_ALT_TEXT_MODEL \|\| '([^']+)'/.exec(serverSrc)
  assert.ok(freeModel && proModel, 'both plan model defaults must be readable')
  if (freeModel[1] !== proModel[1]) return   // they diverged; the claim is now fair

  for (const file of ['src/pages/Plans.jsx', 'src/pages/AltTextGenerator.jsx']) {
    const text = stripComments(read(file)).toLowerCase()
    for (const claim of ['higher-quality model', 'better model', 'higher quality models', 'higher-quality models']) {
      assert.ok(!text.includes(claim),
        `${file} claims Pro buys "${claim}" while both plans resolve to ${freeModel[1]}`)
    }
  }
})

test('the client quota FALLBACK is the real free limit, not a stale literal', () => {
  // Before the plan snapshot resolves, the AI tools fall back to a default.
  // That default was the literal 40 — the OLD free daily limit — so on first
  // paint a free user was told they had 40 generations when the server grants
  // 5, and could fire eight requests it would reject. A fallback that lies in
  // the generous direction is the worst kind: it only fails at the moment the
  // user is trying to do something.
  for (const file of ['src/pages/AltTextGenerator.jsx', 'src/pages/AiPromptGenerator.jsx']) {
    const src = stripComments(read(file))
    assert.ok(/\?\?\s*AI_LIMITS\.free\.daily/.test(src),
      `${file}: the quota fallback must derive from AI_LIMITS, not a literal`)
    assert.ok(!/\?\?\s*\d+\b/.test(src.split('dailyLimit')[1]?.slice(0, 80) || ''),
      `${file}: a numeric literal is still being used as the quota fallback`)
  }
})
