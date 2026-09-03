// `prefers-reduced-motion: reduce` reduced NOTHING for any visitor who had never
// opened Settings, and it did so from TWO places at once.
//
// html[data-reduced-motion] is a three-state contract:
//
//   "true"   → reduce, whatever the OS says
//   "false"  → do NOT reduce, whatever the OS says
//   absent   → no opinion; the OS query decides
//
// global.css spells the third state as
// `@media (prefers-reduced-motion:reduce){ html:not([data-reduced-motion="false"]) … }`
// — ten rule sites use that pattern, including the global clamp near the top of
// the file that forces transition-duration/animation-duration to 0.01ms and
// scroll-behavior to auto document-wide.
//
// Both writers used to emit `String(!!stored.reducedMotion)` unconditionally. For
// a visitor with no stored choice that is `String(!!undefined)` === "false" — a
// FABRICATED explicit opt-out, which by the contract above beats the OS query.
// So all ten rule sites were dead code for every default visitor.
//
// This file is the regression net for that defect CLASS. It has already survived
// one fix attempt by living in two places, so both writers are executed here for
// real — not pattern-matched — and each failure names its own site:
//
//   1. the synchronous boot script in index.html (pre-paint, before React)
//   2. AppearanceContext.jsx (every render thereafter)
//
// Reading the source with a regex would not do. The comments in BOTH files quote
// the very string under test (`String(!!a.reducedMotion)`), so a source match
// would pass on prose while the real write came back underneath it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// ── A DOM small enough to run both writers ──────────────────────────────────

function makeDom({ os = false, stored = null } = {}) {
  const attrs = new Map()
  const store = new Map()
  if (stored !== null) store.set('vs-appearance', JSON.stringify(stored))

  const listeners = new Set()
  const mq = {
    matches: os,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  }

  const dom = {
    // Flip the OS preference on a mounted page, the way a system-settings change
    // does. Drives the matchMedia listener the fix installs.
    setOs(next) {
      mq.matches = next
      for (const fn of [...listeners]) fn({ matches: next })
    },
    get rm() { return attrs.has('data-reduced-motion') ? attrs.get('data-reduced-motion') : null },
    get persisted() {
      const raw = store.get('vs-appearance')
      return raw === undefined ? undefined : JSON.parse(raw)
    },
    listenerCount: () => listeners.size,
    events: [],
  }

  const documentElement = {
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
  }

  dom.sandbox = {
    JSON,
    console,
    document: { documentElement },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    window: {
      // The boot script now asks TWO media queries — prefers-color-scheme for
      // the three-state theme, prefers-reduced-motion for this one. This stub
      // answers the colour-scheme question with a dead "no" so the theme
      // resolves to light (which the assertions below still expect) and keeps
      // asserting that nothing else is being asked. AppearanceContext.jsx only
      // ever asks the motion question, so it still reaches the same `mq`.
      matchMedia: (q) => {
        if (/prefers-color-scheme/.test(q)) {
          return { matches: false, addEventListener() {}, removeEventListener() {} }
        }
        assert.match(q, /prefers-reduced-motion:\s*reduce/,
          'the OS query must be the reduced-motion one')
        return mq
      },
      dispatchEvent: (e) => dom.events.push(e),
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init?.detail }
    },
  }
  dom.sandbox.window.document = dom.sandbox.document
  dom.sandbox.window.localStorage = dom.sandbox.localStorage
  return dom
}

// ── Site 1 · the index.html boot script ─────────────────────────────────────
//
// Extracted and executed, so this asserts what the browser actually does before
// first paint rather than what the file looks like.

const bootScript = (() => {
  const html = read('index.html')
  const blocks = [...html.matchAll(/<script(?![^>]*\b(?:src|type)=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1])
    .filter(s => s.includes('data-reduced-motion'))
  assert.equal(blocks.length, 1,
    'expected exactly one inline boot script in index.html writing data-reduced-motion; '
    + `found ${blocks.length}. If the boot script moved, point this harness at it — `
    + 'do not delete the test.')
  return blocks[0]
})()

function runBoot(opts) {
  const dom = makeDom(opts)
  vm.runInNewContext(bootScript, dom.sandbox, { filename: 'index.html#boot' })
  return dom
}

test('boot script · OS reduce is honoured when the visitor has never chosen', () => {
  const dom = runBoot({ os: true, stored: null })
  assert.notEqual(dom.rm, 'false',
    'index.html boot script wrote an explicit "false" for a visitor who never opened '
    + 'Settings. That value beats @media (prefers-reduced-motion:reduce) in global.css, '
    + 'which kills all ten reduced-motion rule sites — including the global clamp. '
    + 'Only a stored boolean may produce a "false".')
  assert.equal(dom.rm, 'true',
    'with the OS asking for reduced motion and no stored choice, the pre-paint '
    + 'attribute must read "true" so the clamp applies from the first frame')
})

test('boot script · a stored appearance blob with no motion key is still not a choice', () => {
  // The real shape after someone changes something else: the key is simply absent.
  const dom = runBoot({ os: true, stored: { rounding: 'default', density: 'cozy' } })
  assert.equal(dom.rm, 'true',
    'index.html boot script treated a missing reducedMotion key as an explicit opt-out')
})

test('boot script · a non-boolean stored value is not a choice either', () => {
  // Older builds and hand-edited storage can leave junk here; `!!"false"` is true,
  // which would silently force reduce ON for someone who never asked for it.
  for (const junk of ['false', 'true', 0, 1, null]) {
    const off = runBoot({ os: false, stored: { reducedMotion: junk } })
    assert.equal(off.rm, 'false',
      `index.html boot script coerced stored ${JSON.stringify(junk)} into a choice (OS off)`)
    const on = runBoot({ os: true, stored: { reducedMotion: junk } })
    assert.equal(on.rm, 'true',
      `index.html boot script coerced stored ${JSON.stringify(junk)} into a choice (OS on)`)
  }
})

test('boot script · an explicit choice wins over the OS in BOTH directions', () => {
  assert.equal(runBoot({ os: false, stored: { reducedMotion: true } }).rm, 'true',
    'explicit opt-IN must survive an OS that is not asking for reduce')
  assert.equal(runBoot({ os: true, stored: { reducedMotion: false } }).rm, 'false',
    'explicit opt-OUT must survive an OS that IS asking for reduce — that third '
    + 'state is the whole point of the model')
})

test('boot script · it still sets theme, rounding and density, and never throws', () => {
  // The reduced-motion read sits inside the same try/catch as the FOUC fix. A
  // throw there would take the pre-paint theme with it.
  const dom = runBoot({ os: true, stored: null })
  assert.equal(dom.sandbox.document.documentElement.getAttribute('data-rounding'), 'default')
  assert.equal(dom.sandbox.document.documentElement.getAttribute('data-density'), 'cozy')
  assert.equal(dom.sandbox.document.documentElement.getAttribute('data-theme'), 'light')

  // No matchMedia at all (very old engines, and any non-browser prerender host).
  const bare = makeDom({ os: false, stored: null })
  delete bare.sandbox.window.matchMedia
  assert.doesNotThrow(() => vm.runInNewContext(bootScript, bare.sandbox))
  assert.equal(bare.sandbox.document.documentElement.getAttribute('data-theme'), 'light',
    'the theme write must survive a missing matchMedia')
})

// ── Site 2 · AppearanceContext.jsx ──────────────────────────────────────────
//
// Executed too. The file is ESM + JSX, which node:test cannot import, so the
// three non-JS constructs are rewritten here and everything else — DEFAULTS,
// load(), the ?? resolution, applyToDocument, the matchMedia listener — runs as
// shipped. Every rewrite is anchored and asserted: if an anchor stops matching
// the test FAILS LOUDLY rather than quietly testing nothing.

const appearanceFactory = (() => {
  const src = read('src/contexts/AppearanceContext.jsx')
  let out = src
  const rewrite = (re, to, what) => {
    assert.match(out, re,
      `this harness could not find ${what} in AppearanceContext.jsx. The file was `
      + 'refactored; update the rewrite below so this test keeps executing the real '
      + 'source. Do NOT delete the test — it guards a defect that shipped twice.')
    out = out.replace(re, to)
  }

  rewrite(/^import\s*\{([^}]*)\}\s*from\s*'react'\s*$/m, 'const {$1} = __react', 'the react import')
  // The provider's only JSX. Its `value={{…}}` object IS the contract consumers
  // read, so it is kept and returned rather than stubbed away.
  rewrite(
    /return\s*\(\s*<AppearanceContext\.Provider\s+value=\{([\s\S]*?)\}>[\s\S]*?<\/AppearanceContext\.Provider>\s*\)/,
    'return $1',
    'the provider JSX'
  )
  rewrite(/^export\s+function\s+AppearanceProvider/m, 'function AppearanceProvider', 'the provider export')
  rewrite(/^export\s+const\s+useAppearance/m, 'const useAppearance', 'the hook export')
  assert.ok(!/[<>]\s*\/?\s*[A-Z]/.test(out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')),
    'JSX still remains after the rewrite; the harness is out of date')

  const body = `(function(__react){\n${out}\n;return { AppearanceProvider, DEFAULTS, load };\n})`
  return vm.runInNewContext.bind(null, body)
})()

// A React small enough to drive one provider: ordered hooks, lazy useState
// initialisers, useEffect with dependency comparison, and re-render on setState.
function mountProvider(dom) {
  const factory = appearanceFactory(dom.sandbox, { filename: 'AppearanceContext.jsx' })
  const states = []
  const effectDeps = []
  let cursor = 0
  let queued = []
  let latest = null

  const react = {
    createContext: () => ({ Provider: null }),
    useContext: (ctx) => ctx,
    useState(init) {
      const i = cursor++
      if (states.length <= i) states[i] = typeof init === 'function' ? init() : init
      const set = (next) => {
        const value = typeof next === 'function' ? next(states[i]) : next
        if (Object.is(value, states[i])) return
        states[i] = value
        render()
      }
      return [states[i], set]
    },
    useEffect(fn, deps) {
      const i = cursor++
      const prev = effectDeps[i]
      const changed = !prev || !deps || deps.length !== prev.length
        || deps.some((d, k) => !Object.is(d, prev[k]))
      if (changed) { effectDeps[i] = deps; queued.push(fn) }
    },
  }

  const { AppearanceProvider } = factory(react)

  function render() {
    for (let pass = 0; pass < 20; pass++) {
      cursor = 0
      queued = []
      latest = AppearanceProvider({ children: null })
      const run = queued
      queued = []
      for (const fn of run) fn()
      if (!queued.length) return
    }
    assert.fail('AppearanceProvider did not settle in 20 render passes (effect loop?)')
  }

  render()
  return { get value() { return latest } }
}

test('AppearanceContext · OS reduce is honoured when the visitor has never chosen', () => {
  const dom = makeDom({ os: true, stored: null })
  const ctx = mountProvider(dom)
  assert.notEqual(dom.rm, 'false',
    'AppearanceContext wrote an explicit "false" for a visitor who never opened '
    + 'Settings — the same fabricated opt-out the boot script used to write. It beats '
    + '@media (prefers-reduced-motion:reduce) and kills all ten rule sites in global.css. '
    + 'applyToDocument must receive the RESOLVED value (choice ?? OS), and DEFAULTS '
    + 'must leave reducedMotion undefined.')
  assert.equal(dom.rm, 'true')
  assert.equal(ctx.value.reducedMotion, true,
    'consumers (useSmoothScroll, Settings) read the context, so it must carry the '
    + 'resolved boolean, not the raw third state')
})

test('AppearanceContext · with the OS quiet and no choice, nothing is reduced', () => {
  const dom = makeDom({ os: false, stored: null })
  const ctx = mountProvider(dom)
  assert.equal(dom.rm, 'false')
  assert.equal(ctx.value.reducedMotion, false)
})

test('AppearanceContext · an explicit choice wins over the OS in BOTH directions', () => {
  const optIn = makeDom({ os: false, stored: { reducedMotion: true } })
  assert.equal(mountProvider(optIn).value.reducedMotion, true)
  assert.equal(optIn.rm, 'true', 'explicit opt-IN must survive an OS that is not asking')

  const optOut = makeDom({ os: true, stored: { reducedMotion: false } })
  assert.equal(mountProvider(optOut).value.reducedMotion, false)
  assert.equal(optOut.rm, 'false', 'explicit opt-OUT must survive an OS that IS asking')
})

test('AppearanceContext · "auto" is never persisted as a fabricated boolean', () => {
  // This is what stops the bug curing itself into permanence: if the untouched
  // default were written to storage, the next boot would read a real boolean and
  // the visitor would be permanently opted out of their own OS setting.
  const dom = makeDom({ os: true, stored: null })
  mountProvider(dom)
  assert.ok(!Object.prototype.hasOwnProperty.call(dom.persisted, 'reducedMotion'),
    `vs-appearance persisted ${JSON.stringify(dom.persisted)}; a visitor who never `
    + 'chose must not have a reducedMotion boolean written for them')

  const chose = makeDom({ os: false, stored: null })
  const ctx = mountProvider(chose)
  ctx.value.setReducedMotion(true)
  assert.equal(chose.persisted.reducedMotion, true, 'an explicit toggle must persist')
  assert.equal(chose.rm, 'true')
})

test('AppearanceContext · unreadable storage still falls through to the OS', () => {
  // The one path where DEFAULTS.reducedMotion actually reaches the DOM. load()
  // normally overrides it, so a `reducedMotion: false` regression in DEFAULTS is
  // invisible everywhere EXCEPT here — and here is exactly where it matters most:
  // a visitor with storage blocked (Safari private browsing, third-party-blocked
  // iframes, a cookie-hostile profile) would be permanently opted out of their own
  // OS setting with no way to fix it, because Settings cannot persist either.
  const dom = makeDom({ os: true, stored: null })
  dom.sandbox.localStorage.getItem = () => { throw new Error('storage blocked') }
  dom.sandbox.localStorage.setItem = () => { throw new Error('storage blocked') }
  assert.doesNotThrow(() => mountProvider(dom),
    'a blocked localStorage must not take the whole provider down')
  assert.equal(dom.rm, 'true',
    'with storage unreadable, DEFAULTS is what reaches the DOM — so DEFAULTS.reducedMotion '
    + 'must stay undefined (follow the OS), not false')
})

test('AppearanceContext · the OS is followed live while in auto', () => {
  const dom = makeDom({ os: false, stored: null })
  const ctx = mountProvider(dom)
  assert.equal(dom.listenerCount(), 1,
    'no matchMedia listener installed — turning reduce on in system settings would '
    + 'need a tab reload to be believed')
  assert.equal(dom.rm, 'false')

  dom.setOs(true)
  assert.equal(dom.rm, 'true', 'the OS turned reduce ON and the attribute did not follow')
  assert.equal(ctx.value.reducedMotion, true)

  dom.setOs(false)
  assert.equal(dom.rm, 'false', 'the OS turned reduce OFF and the attribute did not follow')
})

test('AppearanceContext · an explicit choice pins the value against OS changes', () => {
  const dom = makeDom({ os: false, stored: { reducedMotion: true } })
  mountProvider(dom)
  dom.setOs(true)
  assert.equal(dom.rm, 'true')
  dom.setOs(false)
  assert.equal(dom.rm, 'true',
    'an explicit opt-in must not be revoked by the OS going quiet')
})

// ── The CSS contract the two writers exist to satisfy ───────────────────────

test('global.css still spells the third state as :not([data-reduced-motion="false"])', () => {
  // If this pattern were ever replaced with a bare `@media (prefers-reduced-motion)`
  // the fix above would be unnecessary — and if it is replaced with something that
  // does not tolerate an ABSENT attribute, the fix silently stops working. Either
  // way this test should be read before the two above are changed.
  const css = read('src/styles/global.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const guarded = css.match(/html(?::not|\s*:not)\(\[data-reduced-motion="false"\]\)/g) || []
  assert.ok(guarded.length >= 10,
    `only ${guarded.length} OS-guarded reduced-motion selectors remain (10 shipped). `
    + 'If a rule was removed, say so in the PR — these had never executed for a '
    + 'default visitor before this fix.')
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{html:not\(\[data-reduced-motion="false"\]\)[^}]*animation-duration:0\.01ms!important/,
    'the document-wide clamp is the rule this whole fix exists to switch on')
})
