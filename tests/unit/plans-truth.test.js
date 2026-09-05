// THE PRICING PAGE MUST NOT ADVERTISE A CAPABILITY THE PRODUCT DOES NOT HAVE.
//
// This page has now shipped a false claim twice, and both times the mechanism
// was identical: a capability was DESCRIBED in copy instead of DERIVED from the
// thing that implements it, and prose does not go stale loudly.
//
//   1. It advertised 1,000 AI actions a day against a provider tier metered per
//      project rather than per user. Fixed by importing AI_LIMITS.
//   2. It sold "full design JSON" as a Pro benefit — on /plans twice, on
//      /checkout at the moment money changes hands, in the upgrade modal and in
//      Settings — while `json` in the export table has never carried
//      `live: true`. It renders a "Soon" badge over a disabled button, and
//      ExportPanel's runExport() has no branch that could build one. Somebody
//      could have paid $48 for a file the product cannot make.
//
// The second one is the reason src/config/exportFormats.js exists: the page now
// reads the same array that renders the buttons. That makes the claim derivable,
// and this file is what makes it CHECKED.
//
// WHAT THIS GUARDS, in both directions:
//   · no format may be sold as a Pro benefit unless it is built AND gated;
//   · no unbuilt format may appear as a benefit anywhere on a paid surface;
//   · the page may not go back to typing numbers it should be importing.
//
// The rendered half of this — that the DOM a visitor actually receives obeys the
// same rule — is tests/user-sim/52-plans-truth.spec.js. Both halves exist
// because a source-text assertion cannot see a component that stopped
// rendering, and a DOM assertion cannot see a claim that only appears when
// signed in.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  EXPORT_FORMATS,
  assertFormatsCoherent,
  freeFormats,
  liveFormats,
  proOnlyFormats,
  unbuiltFormats,
} from '../../src/config/exportFormats.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const PLANS = read('src/pages/Plans.jsx')
const CHECKOUT = read('src/pages/Checkout.jsx')
const MODAL = read('src/components/ProUpgradeModal.jsx')
const SETTINGS = read('src/pages/Settings.jsx')
const PANEL = read('src/components/ExportPanel.jsx')

// Every surface that sells Pro. A claim is only dangerous where money is being
// asked for, so these are the files the format rules apply to.
const PAID_SURFACES = [
  ['Plans.jsx', PLANS],
  ['Checkout.jsx', CHECKOUT],
  ['ProUpgradeModal.jsx', MODAL],
  ['Settings.jsx', SETTINGS],
]

test('the export table is internally coherent — nothing is Pro without being built', () => {
  // The invariant everything else rests on. A format flagged `pro` but not
  // `live` is a paid promise of a file that cannot be produced, which is
  // exactly what "full design JSON" was in prose form.
  assert.ok(assertFormatsCoherent(EXPORT_FORMATS))

  // And the helper actually refuses that shape, rather than returning true for
  // anything handed to it.
  assert.throws(
    () => assertFormatsCoherent([{ id: 'ghost', name: 'Ghost export', pro: true }]),
    /paid promise/,
    'assertFormatsCoherent accepts a Pro format that is not live',
  )
})

test('the table still describes a real offer — the arithmetic is not vacuous', () => {
  // Guards against the cheap way to make every other test in this file pass:
  // emptying the array, or marking everything live. Both would be green
  // otherwise, and both would be wrong.
  assert.ok(EXPORT_FORMATS.length >= 5, 'the export table has been gutted')
  assert.ok(freeFormats().length > 0, 'no format is available on Free — the page sells nothing honestly')
  assert.ok(proOnlyFormats().length > 0, 'no format is Pro-gated — then Pro must stop claiming an export benefit')
  assert.ok(unbuiltFormats().length > 0,
    'nothing is unbuilt any more — good news, but this suite is now testing an empty set: '
    + 'delete the unbuilt assertions deliberately rather than letting them pass vacuously')
  assert.equal(liveFormats().length, freeFormats().length + proOnlyFormats().length)
})

// The regions of a file that SELL — the benefit lists a buyer reads as "this is
// what I get". Scoped deliberately: /plans also NAMES the unbuilt formats in
// order to disclose them, which is the opposite of selling them, so a file-wide
// ban would forbid the honest disclosure. Checking the whole file for a nearby
// "Soon" is not good enough either — once the page discloses anything, every
// sale elsewhere in it would pass. The benefit list is the thing to check.
function sellingRegions(src) {
  const code = stripComments(src)
  const regions = []
  // Plan feature lists, on /plans and in Settings' upgrade panel.
  for (const m of code.matchAll(/<ul className="sub-tier-list">([\s\S]*?)<\/ul>/g)) regions.push(m[1])
  // The flat benefit arrays: Checkout's FEATURES and the upgrade modal's.
  for (const m of code.matchAll(/const [A-Z_]*FEATURES[A-Z_]* = \[([\s\S]*?)\]/g)) regions.push(m[1])
  for (const m of code.matchAll(/const PRO_[A-Z_]+ = \[([\s\S]*?)\]/g)) regions.push(m[1])
  return regions
}

test('the selling regions this test scopes to actually exist', () => {
  // Without this, a rename of `sub-tier-list` or `FEATURES` would empty every
  // region and the central guard below would pass by having nothing to read —
  // the precise way a scoped assertion rots into a no-op.
  for (const [name, src] of PAID_SURFACES) {
    const regions = sellingRegions(src)
    assert.ok(regions.length > 0,
      `${name} exposes no recognisable benefit list — sellingRegions() has gone blind and the guard below is vacuous`)
    assert.ok(regions.join('').trim().length > 40, `${name}'s benefit list parsed empty`)
  }

  // /plans sells TWO tiers, so it must yield at least two regions. Mutation
  // testing caught this: renaming only ONE of the two `sub-tier-list` lists
  // left the suite green, because a single surviving region satisfied
  // `length > 0` while claims in the renamed list had become invisible.
  // Partial blindness is the realistic failure, not total blindness.
  assert.ok(sellingRegions(PLANS).length >= 2,
    'Plans.jsx yields fewer than two benefit lists — it sells two tiers, so one of them is no longer being read')

  // And the parser must actually be reaching the export claims, not just some
  // arbitrary list. At least one region has to name a real format.
  const known = EXPORT_FORMATS.map((f) => f.name)
  const plansRegions = sellingRegions(PLANS).join('')
  assert.ok(known.some((n) => plansRegions.includes(n)) || /listNames|PRO_EXPORTS|FREE_EXPORTS/.test(plansRegions),
    'no export claim is visible inside the parsed benefit lists — the format guard is reading the wrong region')
})

test('no paid surface sells a format that is not built', () => {
  // THE CENTRAL GUARD. An unbuilt format's name must never appear in a benefit
  // list on a surface that asks for money. This is the assertion that would
  // have caught "full design JSON" on the checkout page.
  for (const format of unbuiltFormats()) {
    for (const [name, src] of PAID_SURFACES) {
      for (const region of sellingRegions(src)) {
        assert.ok(!region.includes(format.name),
          `${name} lists the unbuilt format "${format.name}" as a benefit — `
          + 'nobody can receive it on any plan; that is the "full design JSON" defect returning',
        )
      }
    }
  }
})

test('…and the built ones are the only export benefits claimed', () => {
  // The other direction: a benefit list naming an export format must name one
  // that exists. Catches a typo'd or invented format name, which reads exactly
  // like a real claim to a buyer.
  const known = new Set(EXPORT_FORMATS.map((f) => f.name))
  for (const [name, src] of PAID_SURFACES) {
    for (const region of sellingRegions(src)) {
      for (const m of region.matchAll(/([A-Z][A-Za-z0-9 ]*?(?:tokens|theme|bundle))\b/g)) {
        const claimed = m[1].trim()
        assert.ok(known.has(claimed),
          `${name} claims an export format "${claimed}" that is not in the export table at all`)
      }
    }
  }
})

test('the specific claim that shipped — "design JSON" — is gone from every paid surface', () => {
  // Named rather than left to the general rule above, because this exact string
  // was live on four surfaces including the checkout page, and a regression
  // should say so by name instead of reporting a generic format mismatch.
  for (const [name, src] of PAID_SURFACES) {
    const code = stripComments(src)
    assert.ok(!/design JSON/i.test(code),
      `${name} sells "design JSON" again — there is still no JSON export; `
      + 'see src/config/exportFormats.js, where `json` carries no live flag',
    )
  }
})

test('Plans.jsx derives its figures instead of typing them', () => {
  // The page's own rule, enforced. Each of these must be IMPORTED, because each
  // one has a module that also drives the behaviour it describes.
  for (const symbol of ['AI_LIMITS', 'FREE_SAVE_LIMITS', 'COLOUR_SYSTEMS', 'BRAND_PALETTES']) {
    assert.match(PLANS, new RegExp(`import[^\\n]*\\b${symbol}\\b`),
      `Plans.jsx no longer imports ${symbol} — a typed figure has replaced a derived one`)
  }
  assert.match(PLANS, /from '\.\.\/config\/exportFormats'/,
    'Plans.jsx no longer reads the export table, so its export claims are prose again')

  const code = stripComments(PLANS)

  // The AI numbers must not be spelled out. These are the values that shipped
  // wrong once; a literal reappearing is the regression.
  for (const literal of ['1,000', '1000 AI']) {
    assert.ok(!code.includes(literal), `Plans.jsx contains the literal ${literal}`)
  }

  // The counts the page quotes must come from .length, never from a digit. If
  // someone hard-codes "7 of 37" and the arrays change, the page lies silently.
  assert.ok(!/\b7 of 37\b/.test(code), 'Plans.jsx hard-codes the brand palette split')
  assert.ok(!/\b2 of 8\b/.test(code), 'Plans.jsx hard-codes the colour system split')
  assert.match(code, /BRANDS_TOTAL|BRAND_PALETTES\.length/, 'the brand total is not derived')
  assert.match(code, /SYSTEMS_TOTAL|COLOUR_SYSTEMS\.length/, 'the colour system total is not derived')
})

test('the export panel and the pricing page read ONE table', () => {
  // The whole arrangement collapses if ExportPanel re-declares its own list —
  // the page would then be derived from an array nobody renders. This is the
  // wiring, and it is asserted at the call site rather than on the helper.
  assert.match(PANEL, /import \{ EXPORT_FORMATS \} from '\.\.\/config\/exportFormats'/,
    'ExportPanel no longer imports the shared table')
  assert.match(PANEL, /const FORMATS = EXPORT_FORMATS/,
    'ExportPanel has re-declared its own format list; the pricing page is now derived from a dead array')

  // …and the panel must still gate on the same flag it badges with.
  const code = stripComments(PANEL)
  assert.match(code, /FORMATS\.find\(f => f\.id === format\)\?\.pro && !isPro/,
    'the export entitlement gate no longer reads the shared table')
})

test('Pro is only sold on export benefits that exist', () => {
  // Whatever Pro claims about export, at least one gated-and-built format must
  // back it. If proOnlyFormats() ever empties, the Pro card must lose the line
  // rather than keep an empty promise — so the assertion is on the pairing, not
  // on the sentence.
  const claimsExportBenefit = /no “Made with UIL4B” line|watermark-free|credit line/i.test(stripComments(PLANS))
  if (claimsExportBenefit) {
    assert.ok(freeFormats().length > 0,
      'Pro claims a cleaner version of an export that no free user can produce')
  }
  for (const format of proOnlyFormats()) {
    assert.ok(format.live, `${format.id} is sold as Pro but is not live`)
  }
})

test('the free tier limits quoted on the page are the ones the product enforces', () => {
  // Cross-checks the two mirrors rather than trusting either. plan-limits.test.js
  // already pins src/config/plans.js against api/_lib/plans.js; this pins the
  // PAGE to the config, which is the hop that was never checked.
  assert.equal(typeof FREE_SAVE_LIMITS.projects, 'number')
  assert.ok(FREE_SAVE_LIMITS.projects > 0, 'a cap of zero is not a tier this page can describe')

  const code = stripComments(PLANS)

  // The page states where the wall is as "your Nth project". That sentence is
  // only true if N is the cap plus one, so it is written as an expression.
  assert.match(code, /FREE_SAVE_LIMITS\.projects \+ 1/,
    'the paywall position is typed rather than computed from the cap')

  // Mutation testing caught the weakness in the assertion above: the page says
  // "your Nth project" in THREE places, so hard-coding one of them left the
  // expression present elsewhere and the suite green. Ban the typed ordinal
  // outright — that is the thing that actually goes stale when the cap moves.
  const ordinal = /\b\d+(?:st|nd|rd|th) project\b/.exec(code)
  assert.equal(ordinal, null,
    `Plans.jsx hard-codes the paywall position as "${ordinal && ordinal[0]}" — `
    + 'it must be computed from FREE_SAVE_LIMITS.projects, or it will contradict the cap the product enforces')
})
