// THE STRIPE PRODUCT DESCRIPTION MUST NOT PROMISE WHAT THE SERVER REFUSES.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS THE WORST PLACE FOR A FALSE CLAIM
// ─────────────────────────────────────────────────────────────────────────────
// tests/unit/plans-truth.test.js already guards /plans, /checkout, the upgrade
// modal and Settings, because that page had shipped a false claim twice. Every
// one of those is a marketing surface. This string is not: Stripe prints the
// PRODUCT description on the embedded checkout, on the emailed receipt and on
// the invoice. It is the one copy of the promise that reaches a customer with
// money already in hand, and it was the copy nobody went back for.
//
// It read: "1,000 AI actions per day, unlimited project and custom-icon saves,
// advanced colour controls, and full design JSON export." Two of those were
// false:
//
//   · 1,000 A DAY. api/_lib/plans.js has enforced 30 since the limits were
//     derived downward from the shared free-tier ceiling. 33× oversold, on the
//     receipt.
//   · FULL DESIGN JSON EXPORT. `json` in src/config/exportFormats.js has never
//     carried `live: true` — it is a "Soon" badge over a disabled button, and
//     ExportPanel has no branch that could build the file.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE MECHANISM, WHICH IS THE POINT
// ─────────────────────────────────────────────────────────────────────────────
// The sentence is now DERIVED from the same PLANS object the server enforces
// (api/_lib/plans.js `proProductDescription`), the way /plans derives its export
// claims from exportFormats.js. Prose does not go stale loudly; a derivation
// does. This file is what makes it checked, in both directions:
//
//   · the number in the description must BE the number the server enforces;
//   · no unbuilt export format may be named in it;
//   · api/setup-stripe.js may not go back to typing the sentence;
//   · and findOrCreateProduct must CORRECT a live product, because it only ever
//     created — which is how the old sentence survived on real receipts long
//     after the constant was fixable.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import { PLANS, dailyLimitFor, monthlyLimitFor, proProductDescription } from '../../api/_lib/plans.js'
import { AI_LIMITS } from '../../src/config/plans.js'
import { EXPORT_FORMATS, proOnlyFormats, unbuiltFormats } from '../../src/config/exportFormats.js'
import { findOrCreateProduct } from '../../api/setup-stripe.js'

const SETUP = read('api/setup-stripe.js')

test('the comment stripper works, so every source assertion below means something', () => {
  assertStripperWorks(assert)
})

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The numbers on the receipt are the numbers the server enforces
// ─────────────────────────────────────────────────────────────────────────────
test('the product description quotes the enforced Pro limits, not a bigger number', () => {
  const description = proProductDescription()
  const daily = dailyLimitFor(PLANS.pro, 'ai-default')
  const monthly = monthlyLimitFor(PLANS.pro, 'ai-default')

  assert.equal(daily, 30, 'the enforced Pro daily limit moved — this test is asserting a stale number')
  assert.match(description, new RegExp(`\\b${daily}\\b`),
    `the description does not name the enforced daily limit (${daily}): ${description}`)
  assert.match(description, new RegExp(`\\b${monthly}\\b`),
    `the description does not name the enforced monthly limit (${monthly}): ${description}`)

  // The exact claim that shipped, named so it can never come back quietly.
  assert.ok(!/1,?000/.test(description),
    'the Stripe product description is advertising 1,000 AI actions again')
})

test('the description tracks the limits — change one and the sentence changes', () => {
  // The derivation is the whole fix, so prove it derives. A description built
  // from a different plan must quote that plan's numbers, which a hand-typed
  // constant could never do.
  const invented = { limits: { 'ai-default': 7 }, monthlyLimits: { 'ai-default': 70 } }
  const other = proProductDescription(invented)
  assert.match(other, /\b7\b/)
  assert.match(other, /\b70\b/)
  assert.notEqual(other, proProductDescription(), 'proProductDescription ignores its argument — it is not deriving anything')
})

test('the client mirror agrees, so the receipt and the pricing page cannot disagree', () => {
  // plan-limits.test.js already guards the mirror against the server. This adds
  // the receipt to the same chain: a drift anywhere in it is a customer told two
  // different numbers at two different moments of the same purchase.
  assert.equal(AI_LIMITS.pro.daily, dailyLimitFor(PLANS.pro, 'ai-default'))
  assert.equal(AI_LIMITS.pro.monthly, monthlyLimitFor(PLANS.pro, 'ai-default'))
  assert.match(proProductDescription(), new RegExp(`\\b${AI_LIMITS.pro.daily}\\b`))
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · No unbuilt format may be sold on the invoice
// ─────────────────────────────────────────────────────────────────────────────
test('the description names no export format the product cannot build', () => {
  const description = proProductDescription().toLowerCase()
  const unbuilt = unbuiltFormats()
  assert.ok(unbuilt.length > 0, 'nothing is unbuilt any more — this assertion has stopped discriminating')

  // The words a description would use for each unbuilt format. `json` is the one
  // that actually shipped as a paid promise: "full design JSON export".
  const forbidden = {
    json: [/\bjson\b/],
    css: [/\bcss\b/, /custom propert/],
    tailwind: [/\btailwind\b/],
    assets: [/asset bundle/],
  }
  for (const format of unbuilt) {
    for (const pattern of forbidden[format.id] || []) {
      assert.ok(!pattern.test(description),
        `the Stripe product description sells "${format.id}", which src/config/exportFormats.js does not mark live: ${description}`)
    }
  }

  // Positive control: the patterns above are capable of matching. Without this,
  // a typo in one of them would make the loop vacuously pass.
  assert.ok(forbidden.json[0].test('full design json export'),
    'the json pattern cannot match the very sentence that shipped')
})

test('what it DOES sell is built and gated', () => {
  // The other direction. A description that named nothing would pass the test
  // above; Pro has to be described by something it really adds.
  const pro = proOnlyFormats()
  assert.ok(pro.length > 0, 'Pro adds no export at all — the description must stop implying it does')
  const description = proProductDescription().toLowerCase()
  const named = pro.filter((f) => description.includes(f.id))
  assert.ok(named.length > 0,
    `the description names none of the Pro export documents (${pro.map((f) => f.id).join(', ')}): ${description}`)
  for (const format of named) {
    assert.equal(format.live, true)
    assert.equal(format.pro, true)
  }
  assert.equal(EXPORT_FORMATS.some((f) => f.pro && !f.live), false)
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE WIRING. api/setup-stripe.js must not type it, and must correct it.
// ─────────────────────────────────────────────────────────────────────────────
test('api/setup-stripe.js derives the description rather than typing one', () => {
  const src = stripComments(SETUP)
  assert.match(src, /PRODUCT_DESCRIPTION\s*=\s*proProductDescription\(\)/,
    'PRODUCT_DESCRIPTION is not derived from api/_lib/plans.js any more')
  assert.match(src, /import\s*\{[^}]*proProductDescription[^}]*\}\s*from\s*'\.\/_lib\/plans\.js'/,
    'api/setup-stripe.js no longer imports the derivation')
  assert.ok(!/1,000 AI actions/.test(src),
    'the hand-typed 1,000-a-day description is back in api/setup-stripe.js')
  assert.ok(!/full design JSON export/i.test(src),
    'the unbuildable "full design JSON export" claim is back in api/setup-stripe.js')
})

// A Stripe double. Records every call; honours nothing else.
function fakeStripe(products) {
  const calls = []
  return {
    calls,
    products: {
      list: async (args) => { calls.push(['list', args]); return { data: products } },
      create: async (args) => { calls.push(['create', args]); return { id: 'prod_new', ...args } },
      update: async (id, args) => { calls.push(['update', id, args]); return { id, ...args } },
    },
  }
}

test('findOrCreateProduct CORRECTS a live product whose description is stale', async () => {
  // The half that actually reaches a customer. This function only ever created,
  // so once the product existed in Stripe the description on every future
  // receipt was frozen at whatever the code said the day it was first run.
  const stale = {
    id: 'prod_live',
    name: 'UIL4B Pro',
    description: '1,000 AI actions per day, unlimited project and custom-icon saves, advanced colour controls, and full design JSON export.',
  }
  const stripe = fakeStripe([stale])
  const result = await findOrCreateProduct(stripe)

  const update = stripe.calls.find((c) => c[0] === 'update')
  assert.ok(update, 'findOrCreateProduct left a stale live description in place — it only ever creates again')
  assert.equal(update[1], 'prod_live')
  assert.equal(update[2].description, proProductDescription())
  assert.equal(result.description, proProductDescription())

  // It corrects the DESCRIPTION and nothing else. A founder who renamed the
  // product in the dashboard must not have that undone by a price update.
  assert.deepEqual(Object.keys(update[2]), ['description'])
  assert.ok(!stripe.calls.some((c) => c[0] === 'create'), 'it created a duplicate product')
})

test('findOrCreateProduct leaves a correct product completely alone', async () => {
  // Positive control for the test above: the update is conditional, not a write
  // on every POST.
  const stripe = fakeStripe([{ id: 'prod_live', name: 'UIL4B Pro', description: proProductDescription() }])
  const result = await findOrCreateProduct(stripe)
  assert.equal(result.id, 'prod_live')
  assert.ok(!stripe.calls.some((c) => c[0] === 'update'), 'it rewrote a description that was already correct')
  assert.ok(!stripe.calls.some((c) => c[0] === 'create'))
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The founder's half is written down, and written down CORRECTLY
// ─────────────────────────────────────────────────────────────────────────────
// ── docs/OWNER-ACTIONS.md IS LOCAL-ONLY SINCE 2026-09-16 ────────────────────
// Public repository; that document is the current-state list of what is not yet
// secured, so the founder keeps it on his machine and out of every clone
// (.gitignore carries why). Only the founder's HALF of this file needs it. The
// derivation itself — that proProductDescription() matches what the server
// enforces, and that findOrCreateProduct writes that exact string — is code on
// both sides and still runs everywhere, which is the half that protects a
// paying customer. What skips is the check that the runbook still quotes the
// derived sentence, and it skips WITH A REASON: an absent document trivially
// satisfies nothing, and a green line there would say the founder's copy had
// been verified when it had not been read at all.
const OWNER_ACTIONS = path.join(process.cwd(), 'docs/OWNER-ACTIONS.md')
const NO_OWNER_ACTIONS = !fs.existsSync(OWNER_ACTIONS)
  && 'docs/OWNER-ACTIONS.md is not in this checkout — it is local-only, by the founder '
  + 'decision of 2026-09-16 recorded in .gitignore — so the sentence it is supposed to '
  + 'quote cannot be compared here. The derivation either side of it still runs.'

test('docs/OWNER-ACTIONS.md carries the exact sentence, not a paraphrase of it', { skip: NO_OWNER_ACTIONS }, () => {
  // The live Stripe product keeps the old description until someone saves over
  // it — a deploy does not rewrite a Stripe product. So the owner action asks
  // for a specific string, and a string in a document is exactly the thing that
  // goes stale silently. This is the only reason it is safe to write it there.
  const doc = read('docs/OWNER-ACTIONS.md')
  const description = proProductDescription()
  assert.ok(doc.length > 1000,
    `docs/OWNER-ACTIONS.md read as ${doc.length} bytes — too short to be the register, `
    + 'and an empty string would make the two matches below meaningless')
  assert.match(doc, /4\.12/, 'the Stripe product description owner action is missing from the register')
  // The doc wraps the quote across lines; compare on collapsed whitespace.
  const flat = doc.replace(/\s+/g, ' ')
  assert.ok(flat.includes(description.replace(/\s+/g, ' ')),
    `docs/OWNER-ACTIONS.md quotes a description that is not the derived one.\n  wants: ${description}`)
  assert.match(doc, /If you do nothing/, 'the register entry is missing its "If you do nothing" line')
})

test('findOrCreateProduct still creates the product when there is none', async () => {
  const stripe = fakeStripe([{ id: 'prod_other', name: 'Something else' }])
  const result = await findOrCreateProduct(stripe)
  const create = stripe.calls.find((c) => c[0] === 'create')
  assert.ok(create, 'a first run no longer creates the product at all')
  assert.equal(create[1].name, 'UIL4B Pro')
  assert.equal(create[1].description, proProductDescription())
  assert.equal(result.id, 'prod_new')
})
