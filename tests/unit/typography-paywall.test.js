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
//
// ── WHAT CHANGED, AND WHY (2026-09-08) ──────────────────────────────────────
//
// The innermost layer of the gate — ProjectContext.saveProject refusing a save
// at the cap — used to be one regex: `if (current.length >= projectLimit) {`
// followed within 160 characters by `throw new Error`. That proved the source
// contained a comparison and a throw. It could not tell `>=` from `>` (a
// fourth project on a three-project plan), could not see whether
// duplicateProject answers to the same cap, could not see whether the limit
// came from the plan or from a constant, and would have stayed green on a
// throw that fired for Pro too.
//
// So the provider is now EXECUTED. ProjectContext.jsx cannot be imported by
// node --test (extensionless relative imports, React, the Firestore SDK), so
// its JSX is compiled by the same oxc transform Vite uses for the app, its
// eight imports are replaced by stubs (a React small enough to run one render:
// state slots, refs, memo, callbacks, and effects that do NOT run — the sync
// and the auto-created default project are other files' concerns), and the
// context value the Provider hands its children is read straight off the
// element it returns. The store is a localStorage the test can seed and read
// back. Same harness shape as modal-contract.test.js.
//
// WHAT STAYS A SOURCE ASSERTION, and why:
//   · Tests 1–3 sweep FontGallery, FontMatcher and TypeScale for the ABSENCE
//     of a gate (no isPro, no useSubscription, no openProModal). An absence has
//     no behavioural equivalent short of rendering every page in every plan
//     state, and .jsx cannot be loaded here anyway; the thing guarded is that
//     the pages do not contain a second scheme.
//   · Tests 4–7 and 9–11 read the shape of SaveTypeSystem.jsx and global.css.
//     The wall's real behaviour — one input and one save button under the cap,
//     none at all at it, nothing merely hidden — is rendered through the real
//     stylesheet and measured by tests/user-sim/51-typography-paywall.spec.js
//     ("under the cap the save works; at the cap there is nothing to reveal",
//     "no save control anywhere is merely hidden"). These are the fast
//     structural layer over the same rule, and the wiring lines (the gate ids,
//     the `free: true` login prompt, commit() re-resolving the quota) are
//     source by nature.
//   · Plans.jsx copy: the page copy is the artefact.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { transformWithOxc } from 'vite'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { stripCss } from '../helpers/strip-comments.js'
// Reads the WHOLE app stylesheet, not global.css alone. The rules this file
// asserts on were split out of global.css into src/styles/deferred/*.css on
// 2026-09-13; a test that keeps reading one file after a lift like that does
// not go red, it goes VACUOUS. See tests/unit/appStylesheets.js.
import { ALL_CSS } from './appStylesheets.js'

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
const CSS = ALL_CSS
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

// ── Loading ProjectContext.jsx ──────────────────────────────────────────────

const CTX_PATH = 'src/contexts/ProjectContext.jsx'
const { code: ctxCompiled } = await transformWithOxc(read(CTX_PATH), CTX_PATH, {
  lang: 'jsx',
  jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' },
})

const ALICE = { uid: 'alice-uid', email: 'Alice@Example.com' }   // mixed case on purpose
const ALICE_KEY = 'alice@example.com'                             // the key the store uses
const FREE = { id: 'free', limits: { projects: FREE_SAVE_LIMITS.projects } }
const PRO = { id: 'pro', limits: { projects: Infinity } }

const project = (i) => ({
  id: `p${i}`, name: `Project ${i}`, design: { ...DEFAULT_DESIGN },
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
})
const projects = (n) => Array.from({ length: n }, (_, i) => project(i + 1))

/**
 * Execute the provider once, as React would for one render, and hand back the
 * context value it gives its children plus the store and the activation log.
 */
function loadProjectContext({ user = ALICE, plan = FREE, saved = [] } = {}) {
  let out = ctxCompiled

  const rewrite = (re, to, what) => {
    assert.match(out, re,
      `this harness could not find ${what} in the compiled ${CTX_PATH}. The file was refactored; `
      + 'update the rewrite so this test keeps executing the real source. Do NOT delete the '
      + 'test — it is the innermost layer of the save cap, and the regex it replaced could not '
      + 'tell >= from >.')
    out = out.replace(re, to)
  }

  const IMPORT = /^import\s[\s\S]*?\sfrom\s+["'][^"']+["'];?\r?\n/m
  let imports = 0
  while (IMPORT.test(out)) { rewrite(IMPORT, '', `import #${imports + 1}`); imports += 1 }
  assert.ok(imports >= 5, `${CTX_PATH} has ${imports} imports; the harness expected its React and utils block`)
  assert.ok(!/^\s*import\s/m.test(out), `${CTX_PATH} still has an import the harness did not strip`)

  rewrite(/^export \{ DEFAULT_DESIGN \};?\r?\n/m, '', 'the DEFAULT_DESIGN re-export')
  rewrite(/^export function ProjectProvider/m, 'function ProjectProvider', 'the provider export')
  rewrite(/^export const useProject/m, 'const useProject', 'the hook export')
  assert.ok(!/^\s*export\s/m.test(out), `${CTX_PATH} still has an export the harness did not strip`)

  const store = new Map()
  if (user) store.set('vs-projects', JSON.stringify({ [ALICE_KEY]: saved }))
  const activations = []

  // A React small enough to run one render of one provider.
  const slots = []
  let cursor = 0
  const notModelled = (name) => () => { throw new Error(`${name} is not modelled by this harness`) }
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    createContext: () => ({ Provider: 'ProjectContext.Provider' }),
    useContext: () => null,
    useState: (init) => {
      const i = cursor++
      if (slots.length <= i) slots[i] = typeof init === 'function' ? init() : init
      const set = (next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }
      return [slots[i], set]
    },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef: (v) => ({ current: v }),
    useEffect: () => {},
    h: (type, props, ...children) => ({ type, props, children }),
    trackActivation: (...args) => activations.push(args),
    loadFirestore: notModelled('loadFirestore'),
    mergeProjects: notModelled('mergeProjects'),
    projectListsEqual: notModelled('projectListsEqual'),
    mergeTombstones: notModelled('mergeTombstones'),
    pruneTombstones: (t) => t,
    readRemoteProjects: notModelled('readRemoteProjects'),
    writeRemoteProjects: notModelled('writeRemoteProjects'),
    syncFailureMessage: notModelled('syncFailureMessage'),
    classifyError: notModelled('classifyError'),
    reportSyncFailure() {}, reportSyncNotice() {}, reportSyncOk() {},
    useAuth: () => ({ user }),
    useSubscription: () => ({ plan }),
    DEFAULT_DESIGN,
  }

  const body = `(function(){\n${out}\n;return { ProjectProvider };\n})()`
  const { ProjectProvider } = vm.runInNewContext(body, sandbox, { filename: CTX_PATH })

  /** One render. The Provider element's `value` prop IS the context. */
  const render = () => {
    cursor = 0
    const element = ProjectProvider({ children: null })
    assert.equal(element.type, 'ProjectContext.Provider', 'the provider no longer renders its context Provider')
    return element.props.value
  }

  const stored = () => JSON.parse(store.get('vs-projects') || '{}')[ALICE_KEY] || []
  return { render, stored, activations }
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
  //
  // ── CHANGED 2026-09-05, and the reason matters more than the strings ───────
  //
  // These two assertions used to pin the words "…, gradients and exports" and
  // "…, type scales and exports". Both sentences were removed from /plans in
  // the pricing-page overhaul, because "and exports" was READ as all nine
  // export formats when four of them are not built and one is Pro-gated. The
  // page was overstating the free tier.
  //
  // What is pinned here instead is the PROPERTY those sentences existed to
  // guarantee, which has not changed and must not: on Free, using these tools
  // is UNLIMITED AND UNMETERED. That is the whole justification for the
  // typography tools having no gate on copy or export, which is what the rest
  // of this test enforces. The quantity promise is intact; only the claim about
  // which FORMATS you get was removed, and formats are not what this test is
  // about.
  //
  // Written as two halves rather than one long literal so a future copy edit
  // fails on the half it actually broke.
  assert.match(PLANS, /Unlimited palettes, font pairings, type scales and gradients/,
    'the Free card no longer promises unlimited use of the typography tools — '
    + 'if that promise is really gone, the ungated copy/export assertions above must be reconsidered too')
  assert.match(PLANS, /none of it metered/,
    'the Free card no longer says the typography tools are unmetered')
  assert.match(PLANS, /<td>Palettes, font pairings, type scales and gradients<\/td><td>Unlimited<\/td>/,
    'the comparison table no longer repeats the unlimited promise')

  // The export promise is now format-specific and is guarded separately, by
  // tests/unit/plans-truth.test.js, against src/config/exportFormats.js — the
  // array that renders the buttons. It is deliberately NOT restated here: this
  // file is about the typography paywall, and a copy of that rule living in two
  // places is how the two drift apart.
  assert.match(PLANS, /Number of exports<\/td><td>Unlimited<\/td>/,
    'the page no longer states that the NUMBER of exports is unlimited on Free — '
    + 'that is the half of the export promise this test depends on')
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
  // the false arm — so no render can produce both. Rendered and counted for
  // real in tests/user-sim/51-typography-paywall.spec.js.
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
  // the layer that still refuses. A wiring line, so a source assertion.
  const code = stripComments(SAVE)
  assert.match(code, /projectQuota\(projects\.length, projectLimit\)\.atLimit/,
    'commit() no longer re-resolves the quota before saving')
})

// ── The innermost layer, EXECUTED ───────────────────────────────────────────

test('8a · the harness really runs the provider, so nothing below is vacuous', () => {
  const { render } = loadProjectContext({ saved: projects(1) })
  const value = render()
  assert.equal(typeof value.saveProject, 'function', 'the context value has no saveProject')
  assert.equal(value.canSaveProjects, true, 'a signed-in user cannot save at all')
  assert.equal(value.projectLimit, FREE_SAVE_LIMITS.projects, 'the free limit is not the one src/config/plans.js quotes')
  assert.equal(value.projects.length, 1, 'the provider did not read the seeded store')
})

test('8b · ProjectContext.saveProject refuses at the cap, and says how many the plan allows', () => {
  // The colour tools already have this layer; without it the typography wall
  // is a suggestion. `>=` rather than `>`: at exactly the limit there is no
  // slot, and the regex this replaced could not tell the two apart.
  const LIMIT = FREE_SAVE_LIMITS.projects
  const { render, stored, activations } = loadProjectContext({ saved: projects(LIMIT) })
  const value = render()
  assert.equal(value.atProjectLimit, true, 'a full free account does not report itself at the limit')
  assert.throws(() => value.saveProject('One more'),
    new RegExp(`up to ${LIMIT} projects`),
    'a save at the cap went through, or the refusal does not say what the cap is')
  assert.equal(stored().length, LIMIT, 'the refused save still wrote a project')
  assert.deepEqual(activations, [], 'a refused save counted as an activation')
})

test('8c · under the cap the save goes through, is kept, and is the activation moment', () => {
  const LIMIT = FREE_SAVE_LIMITS.projects
  const { render, stored, activations } = loadProjectContext({ saved: projects(LIMIT - 1) })
  const value = render()
  assert.equal(value.atProjectLimit, false)
  const id = value.saveProject('  Editorial system  ')
  assert.ok(id, 'a save under the cap returned no id')
  const kept = stored()
  assert.equal(kept.length, LIMIT, 'the save was not written through to the store')
  assert.equal(kept.at(-1).id, id)
  assert.equal(kept.at(-1).name, 'Editorial system', 'the name is not trimmed')
  assert.deepEqual(activations, [['project', 'save']], 'a genuine first save did not fire the activation event')

  // The slot the save just took is the last one: the very next save refuses.
  assert.throws(() => render().saveProject('And another'), new RegExp(`up to ${LIMIT} projects`))
})

test('8d · a blank project is a container, not work — no activation', () => {
  const { render, activations } = loadProjectContext({ saved: [] })
  render().saveProject('', { blank: true })
  assert.deepEqual(activations, [], 'creating an empty shell was counted as the first real win')
})

test('8e · duplicating is a new save and answers to the same cap', () => {
  // A duplicate button that quietly created a fourth project on a
  // three-project plan would be the cap leaking, and the cap is what Pro sells.
  const LIMIT = FREE_SAVE_LIMITS.projects
  const full = loadProjectContext({ saved: projects(LIMIT) })
  assert.throws(() => full.render().duplicateProject('p1'), new RegExp(`up to ${LIMIT} projects`),
    'duplicate at the cap created a project')
  assert.equal(full.stored().length, LIMIT)

  const room = loadProjectContext({ saved: projects(LIMIT - 1) })
  const id = room.render().duplicateProject('p1')
  const kept = room.stored()
  assert.equal(kept.length, LIMIT, 'the duplicate was not written through')
  assert.equal(kept.at(-1).id, id)
  assert.equal(kept.at(-1).name, 'Project 1 copy')
  assert.notEqual(id, 'p1', 'the copy reused the source id')
})

test('8f · Pro has no cap, and the limit comes from the plan rather than the context', () => {
  // The number lives in SubscriptionContext (mirrored from src/config/plans.js).
  // If the provider ever grew its own constant, changing the plan would stop
  // changing the cap — so the plan is varied here and the cap has to follow.
  const pro = loadProjectContext({ plan: PRO, saved: projects(10) })
  const value = pro.render()
  assert.equal(value.projectLimit, Infinity)
  assert.equal(value.atProjectLimit, false, 'a Pro account with ten projects reports itself capped')
  assert.ok(value.saveProject('Eleventh'), 'Pro was refused a save')
  assert.equal(pro.stored().length, 11)

  const wider = loadProjectContext({ plan: { id: 'free', limits: { projects: 5 } }, saved: projects(3) })
  const w = wider.render()
  assert.equal(w.projectLimit, 5, 'the cap ignored the plan')
  assert.equal(w.atProjectLimit, false, 'three of five reports itself at the limit — the cap is hard-coded to three')
  assert.ok(w.saveProject('Fourth'))

  const unlimited = loadProjectContext({ plan: { id: 'free' }, saved: projects(3) })
  assert.equal(unlimited.render().projectLimit, Infinity, 'a plan with no limits block is treated as capped')
})

test('9 · saving needs an account, not a subscription', () => {
  // The colour tools are explicit that saving is FREE and only needs somewhere
  // to save to (PaletteBuilder: requireLogin('save this palette', { free: true });
  // IconLibrary: "Saving is FREE - it just needs an account"). A signed-out
  // visitor who clicks Save must meet a login prompt, never a paywall.
  const code = stripComments(SAVE)
  // The options are matched as a SET rather than as one exact literal. This
  // read `{ free: true }` character for character and went red on 2026-09-18
  // for a change that strengthened the very thing it was protecting: adding
  // `signup: true`, so a visitor with no account meets the create-account form
  // instead of "Log in to continue" at the moment they first try to keep their
  // work. What matters is which flags are on, not the order they are written.
  const opts = /requireLogin\(`save \$\{label\}`, \{([^}]*)\}\)/.exec(code)?.[1]
  assert.ok(opts, 'the save trigger no longer opens a login prompt for `save ${label}`')
  assert.match(opts, /free:\s*true/,
    'the save trigger no longer opens the FREE login prompt')
  assert.match(opts, /signup:\s*true/,
    'the save trigger greets somebody with no account with "Log in to continue" — '
    + 'this branch only runs for a visitor who cannot save, so signed out means no account')
  // The Pro modal is reachable only from the cap, never from being signed out.
  const triggerBody = /const trigger = useCallback\(async \(\) => \{([\s\S]*?)\}, \[/.exec(code)?.[1]
  assert.ok(triggerBody, 'the save trigger changed shape')
  assert.ok(!/openProModal|raiseWall/.test(triggerBody),
    'clicking Save while signed out raises the paywall instead of the login prompt')

  // And the innermost layer agrees, EXECUTED: signed out, the context refuses
  // with a sign-in message — on the Pro plan as much as on Free — and reports
  // that saving is not available at all rather than that the cap is reached.
  for (const plan of [FREE, PRO]) {
    const value = loadProjectContext({ user: null, plan }).render()
    assert.equal(value.canSaveProjects, false, `${plan.id}: signed out reports it can save`)
    assert.equal(value.projects.length, 0)
    assert.throws(() => value.saveProject('Anything'), /Sign in/,
      `${plan.id}: a signed-out save was refused for the wrong reason, or not refused`)
  }
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
