// What Pro means for the typography tools, pinned.
//
// Founder decision, 2026-09-05, settling [typography-paywall-model]: browsing
// is free, saving is Pro. Anyone may browse fonts, pair them and build a scale
// without an account; what costs money is KEEPING a type system. He chose that
// option because it matches how the colour tools already work, which makes
// consistency with them the requirement rather than a nice-to-have.
//
// So this file guards BOTH halves, and the free half is the one more likely to
// rot. A gate is easy to add and nothing fails when someone adds one too many —
// the product just gets quietly worse, and the thing that sells the tools is
// the browse experience. Every assertion below that says "this is NOT gated" is
// load-bearing.
//
// THE THREE FAILURES THIS EXISTS TO PREVENT:
//
//   1. Gating the catalogue. It is Google Fonts — public by construction — so a
//      gate over it withholds nothing and costs the browse experience. Mobbin
//      has the counter-example in Polywork's "Font Pack 2 · Premium".
//   2. Gating export. Free in colour ("Copy CSS variables" is an ungated item
//      in the very menu the colour save gate lives in) and already SOLD as free
//      on the pricing page. A gate here would contradict a live promise.
//   3. A gate that only looks like one. Twice now: brand hexes rendered as
//      readable text behind a lock, and a prompt library that counted positions
//      in a FILTERED list so the search box walked through it. The rule from
//      utils/lockedPreview.js is that the check belongs where the data is
//      produced. Here that means the at-cap branch renders NO save control —
//      absent, not disabled and not hidden by CSS.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// Comments in this codebase discuss gates at length. Stripping them is what
// separates "the file mentions isPro" from "the file branches on isPro".
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const GALLERY = read('src/pages/FontGallery.jsx')
const MATCHER = read('src/pages/FontMatcher.jsx')
const SCALE = read('src/pages/TypeScale.jsx')
const SAVE = read('src/components/SaveTypeSystem.jsx')
const CSS = read('src/styles/global.css')
const PLANS = read('src/pages/Plans.jsx')

const TOOLS = [
  ['FontGallery', GALLERY],
  ['FontMatcher', MATCHER],
  ['TypeScale', SCALE],
]

// CSS comments are prose, not rules. This file's own stylesheet comment names
// the forbidden rule verbatim ("there is deliberately no `.svt-wall
// .svt-row{display:none}`") so that a later reader knows why it is absent, and
// a scanner that reads comments would report that sentence as the very defect
// it warns against. Strip them first.
const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ')

// The two arms of the at-cap ternary in SaveTypeSystemMenu, read whole.
//
// Split on the delimiters rather than on a lazy regex: `([\s\S]*?)\)` stops at
// the first close paren it meets, which is inside the arm, so the arm comes
// back truncated and every assertion over it becomes a coin toss.
function atCapArms(src) {
  const OPEN = '{quota.atLimit ? ('
  const MID = '\n      ) : ('
  const END = '\n      )}'
  const open = src.indexOf(OPEN)
  if (open === -1) return null
  const mid = src.indexOf(MID, open)
  if (mid === -1) return null
  const end = src.indexOf(END, mid)
  if (end === -1) return null
  return {
    atLimit: src.slice(open + OPEN.length, mid),
    under: src.slice(mid + MID.length, end),
  }
}

// ── The free half ───────────────────────────────────────────────────────────

test('1 · no typography tool gates its own catalogue, controls or previews', () => {
  // The entitlement checks live in ONE component. A tool that grows its own
  // isPro branch has started a second scheme, which is the thing the founder's
  // "it matches the colour tools" reasoning rules out.
  for (const [name, src] of TOOLS) {
    const code = stripComments(src)
    assert.ok(!/\bisPro\b/.test(code),
      `${name} branches on isPro — the typography gate is the shared save slot, not a per-tool check`)
    assert.ok(!/useSubscription\s*\(/.test(code),
      `${name} reads the subscription directly; SaveTypeSystem is the only place that should`)
    assert.ok(!/splitLockedLibrary/.test(code),
      `${name} strips a locked library — the font catalogue is public and browsing it is free`)
  }
})

test('2 · the font gallery raises no paywall at all', () => {
  // Browsing is the whole free tier. The gallery is browse-only: it hands off
  // to Font Pair and Type Scale, and neither the hand-off nor the dossier is a
  // save. Nothing here should be able to raise an upgrade modal.
  const code = stripComments(GALLERY)
  assert.ok(!/openProModal/.test(code), 'FontGallery raises a Pro modal')
  assert.ok(!/useProModal/.test(code), 'FontGallery imports the Pro modal')
  assert.ok(!/SaveTypeSystem/.test(code), 'FontGallery mounts the save gate; it is a browse surface')
})

test('3 · every export and copy action stays ungated', () => {
  // Plans.jsx sells "Unlimited palettes, font pairings, type scales, gradients
  // and exports" in the FREE column, and the comparison table repeats it. A
  // gate on any of these would make the pricing page false.
  const pairs = [
    ['FontMatcher', MATCHER, ['copyImport', 'cssExport']],
    ['TypeScale', SCALE, ['currentExport', 'importUrl']],
  ]
  for (const [name, src, exports_] of pairs) {
    const code = stripComments(src)
    for (const symbol of exports_) {
      assert.ok(code.includes(symbol), `${name} no longer builds ${symbol} — the export path changed`)
    }
    // An onClick that copies must not be wrapped in an entitlement test. There
    // is no isPro in these files at all (test 1), so the only way to gate a
    // copy would be to import the modal — which is equally banned here.
    assert.ok(!/openProModal/.test(code),
      `${name} can raise an upgrade modal; every copy and export on it is meant to be free`)
  }
  // And the promise it has to keep.
  assert.match(PLANS, /Unlimited palettes, font pairings, type scales, gradients and exports/)
  assert.match(PLANS, /<td>Palettes, font pairings, type scales and exports<\/td><td>Unlimited<\/td>/)
})

test('4 · the tools that build a type system offer a way to keep it', () => {
  // Before this change typography had NO save path — the tools wrote to the
  // working kit and stopped — so "saving is Pro" gated nothing. The affordance
  // existing is half the decision.
  for (const [name, src] of [['FontMatcher', MATCHER], ['TypeScale', SCALE]]) {
    assert.match(src, /^import SaveTypeSystem from '\.\.\/components\/SaveTypeSystem'$/m,
      `${name} does not mount the save gate`)
    // Word-boundaried on purpose: /<SaveTypeSystem/ alone is a PREFIX match and
    // stays green against <SaveTypeSystemRemoved, <SaveTypeSystemStub or any
    // other rename that takes the real control off the page.
    assert.match(src, /<SaveTypeSystem[\s/>]/, `${name} imports the save gate but never renders it`)
  }
  // Distinct gate ids, so P-001's funnel can say WHICH surface converted rather
  // than reporting one merged number for both tools.
  const ids = [MATCHER, SCALE].map(src => /gate="([a-z-]+)"/.exec(src)?.[1])
  assert.deepEqual(ids, ['type-save-font-pair', 'type-save-type-scale'])
})

// ── The gate itself ─────────────────────────────────────────────────────────

test('5 · at the cap there is no save control to reveal', () => {
  // THE ASSERTION THIS FILE EXISTS FOR. The wall must REPLACE the save
  // controls, not sit beside them hidden. Structurally: `quota.atLimit` selects
  // between two arms of one ternary, the wall in the true arm and the input in
  // the false arm — so no render can produce both.
  const arms = atCapArms(SAVE)
  assert.ok(arms, 'the at-cap branch is no longer a single ternary on quota.atLimit')

  assert.match(arms.atLimit, /data-testid="type-save-wall"/, 'the at-cap arm does not render the wall')
  assert.ok(!/<input/.test(arms.atLimit), 'the at-cap arm renders an input')
  assert.ok(!/svt-save/.test(arms.atLimit), 'the at-cap arm renders a save button')

  assert.match(arms.under, /<input/, 'the under-cap arm has lost its name field')
  assert.match(arms.under, /svt-save/, 'the under-cap arm has lost its save button')
})

test('6 · the save control is never merely disabled', () => {
  // A disabled button is a client-side suggestion: the handler is still bound,
  // the element is still in the tree, and one attribute removal in devtools
  // brings it back. The gate is absence.
  const code = stripComments(SAVE)
  assert.ok(!/className="[^"]*svt-save[^"]*"[^>]*disabled/.test(code),
    'the save button carries a disabled attribute instead of being absent at the cap')
  assert.ok(!/aria-disabled/.test(code), 'the save gate uses aria-disabled rather than absence')
})

test('7 · no stylesheet rule can hide or reveal a save control', () => {
  // The brand-palette leak was CSS over real values. A rule of the shape
  // `.svt-wall .svt-save{display:none}` would move the gate back into the
  // stylesheet, where it is one toggle from being no gate at all.
  const rules = stripCss(CSS).match(/\.svt-(?:save|input|row)[^{]*\{[^}]*\}/g) || []
  for (const rule of rules) {
    assert.ok(!/display\s*:\s*none/.test(rule), `a stylesheet rule hides a save control: ${rule}`)
    assert.ok(!/visibility\s*:\s*hidden/.test(rule), `a stylesheet rule hides a save control: ${rule}`)
  }
  // And the component's own CSS must exist at all, or the menu ships unstyled.
  assert.match(CSS, /\.svt-menu\{/)
  assert.match(CSS, /\.svt-wall\{/)
})

test('8 · the refusal is re-resolved at commit, not trusted from the render', () => {
  // Belt and braces. The render decides what to DRAW; commit() decides what to
  // DO. If someone later reintroduces a disabled-but-present button, this is
  // the layer that still refuses.
  const code = stripComments(SAVE)
  assert.match(code, /projectQuota\(projects\.length, projectLimit\)\.atLimit/,
    'commit() no longer re-resolves the quota before saving')
  // ...and the innermost layer, which is the one the colour tools already have.
  const ctx = stripComments(read('src/contexts/ProjectContext.jsx'))
  assert.match(ctx, /if \(current\.length >= projectLimit\) \{[\s\S]{0,160}throw new Error/,
    'ProjectContext.saveProject no longer throws at the cap')
})

test('9 · saving needs an account, not a subscription', () => {
  // The colour tools are explicit that saving is FREE and only needs somewhere
  // to save to (PaletteBuilder: requireLogin('save this palette', { free: true });
  // IconLibrary: "Saving is FREE - it just needs an account"). A signed-out
  // visitor who clicks Save must meet a login prompt, never a paywall.
  const code = stripComments(SAVE)
  assert.match(code, /requireLogin\(`save \$\{label\}`, \{ free: true \}\)/,
    'the save trigger no longer opens the FREE login prompt')
  // The Pro modal is reachable only from the cap, never from being signed out.
  const triggerBody = /const trigger = useCallback\(async \(\) => \{([\s\S]*?)\}, \[/.exec(code)?.[1]
  assert.ok(triggerBody, 'the save trigger changed shape')
  assert.ok(!/openProModal|raiseWall/.test(triggerBody),
    'clicking Save while signed out raises the paywall instead of the login prompt')
})

test('10 · the allowance stays quiet until it is worth knowing', () => {
  // P-003: the free tier is a foot in the door, and a counter that starts on
  // the first project turns it into a meter. projectQuota owns that judgement
  // and is pinned exhaustively in project-quota.test.js; this only checks the
  // view actually defers to it rather than always rendering the count.
  const code = stripComments(SAVE)
  assert.match(code, /\{quota\.shouldTell && \(/,
    'the allowance line is no longer conditioned on quota.shouldTell')
})

test('11 · the wall says nothing was taken away, and offers a free way out', () => {
  // The same two jobs Projects.jsx does at the cap. A wall that only sells is
  // how a paid edge reads as the product breaking.
  assert.match(SAVE, /Nothing has been removed and nothing here is locked/)
  assert.match(SAVE, /still\s*\n?\s*yours to build, copy and export/,
    'the wall no longer states that the work itself is unaffected')
  assert.match(SAVE, /free a slot/, 'the wall offers no route that does not involve paying')
  // The overwrite list must survive INTO the wall: at the cap the new slot is
  // withheld, the work is not.
  const arms = atCapArms(SAVE)
  assert.ok(arms, 'the at-cap branch changed shape')
  const afterTernary = SAVE.slice(SAVE.indexOf('{recent.length > 0 &&'))
  assert.ok(!/recent\.length/.test(arms.atLimit),
    'the overwrite list moved inside the at-cap arm; it must be common to both')
  assert.match(afterTernary, /svt-item/, 'the overwrite list is gone')
})
