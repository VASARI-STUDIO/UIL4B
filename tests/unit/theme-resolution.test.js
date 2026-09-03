// A complete dark theme shipped to every visitor for two months and no visitor
// could reach it. This is the net under the fix.
//
// html[data-theme] is a THREE-state contract expressed in two states, which is
// the part that is easy to get wrong:
//
//   vs-t 'light' / 'dark' → an explicit choice; it beats the OS, both ways.
//   vs-t 'system' / absent / junk → no opinion; prefers-color-scheme decides.
//   html[data-theme] itself → ALWAYS resolved to 'light' or 'dark', never
//                             'system', because every token in global.css hangs
//                             off [data-theme="light"] / [data-theme="dark"] and
//                             neither set is declared on a bare :root.
//
// TWO WRITERS, and they must agree for every input. If they disagree the visitor
// sees one theme painted before hydration and a different one after — the flash
// the boot script exists to prevent. So both are EXECUTED here, not read:
//
//   1. the synchronous boot script in index.html (pre-paint, before React)
//   2. ThemeContext.jsx (every render thereafter)
//
// This is the same shape as reduced-motion-resolution.test.js on purpose. That
// defect shipped because one of two writers was fixed and the other was not; the
// theme has exactly the same two-writer structure, so it gets the same net.
//
// Reading the source with a regex would not do here either: index.html's own
// comment block quotes 'vs-t-lightreset', 'prefers-color-scheme' and both theme
// names, so a source match would pass on prose while the real write came back
// underneath it. Every assertion below runs code.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// ── A DOM small enough to run both writers ──────────────────────────────────

function makeDom({ osDark = false, stored = undefined } = {}) {
  const attrs = new Map()
  const store = new Map()
  if (stored !== undefined) store.set('vs-t', String(stored))

  const listeners = new Set()
  const mq = {
    matches: osDark,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  }

  const dom = {
    // Flip the OS colour scheme on a mounted page, the way sunset does on a
    // phone. Drives the matchMedia listener the fix installs.
    setOs(next) {
      mq.matches = next
      for (const fn of [...listeners]) fn({ matches: next })
    },
    get theme() { return attrs.has('data-theme') ? attrs.get('data-theme') : null },
    get stored() { return store.has('vs-t') ? store.get('vs-t') : null },
    keys: () => [...store.keys()],
    listenerCount: () => listeners.size,
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
      matchMedia: (q) => {
        // The boot script asks the motion question too; only the colour-scheme
        // one is this file's business, and a dead stub for the other keeps the
        // two independent.
        if (/prefers-reduced-motion/.test(q)) {
          return { matches: false, addEventListener() {}, removeEventListener() {} }
        }
        assert.match(q, /prefers-color-scheme:\s*dark/,
          'the theme must resolve off prefers-color-scheme: dark')
        return mq
      },
      dispatchEvent: () => {},
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

const bootScript = (() => {
  const html = read('index.html')
  const blocks = [...html.matchAll(/<script(?![^>]*\b(?:src|type)=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1])
    .filter(s => s.includes('data-theme'))
  assert.equal(blocks.length, 1,
    'expected exactly one inline boot script in index.html writing data-theme; '
    + `found ${blocks.length}. If the boot script moved, point this harness at it — `
    + 'do not delete the test.')
  return blocks[0]
})()

// The executable half only. index.html's comment block names every string this
// file asserts on, so anything that greps the script must grep this, not the raw
// block.
const bootCode = bootScript.replace(/^\s*\/\/.*$/gm, '').trim()

function runBoot(opts) {
  const dom = makeDom(opts)
  vm.runInNewContext(bootScript, dom.sandbox, { filename: 'index.html#boot' })
  return dom
}

test('boot script · the OS decides when the visitor has never chosen', () => {
  assert.equal(runBoot({ osDark: true }).theme, 'dark',
    'a first-time visitor on a dark system was painted light before hydration. '
    + 'That is the whole defect: the theme was never reachable and never offered.')
  assert.equal(runBoot({ osDark: false }).theme, 'light')
})

test('boot script · an explicit choice wins over the OS in BOTH directions', () => {
  assert.equal(runBoot({ osDark: false, stored: 'dark' }).theme, 'dark',
    'explicit dark must survive a light system')
  assert.equal(runBoot({ osDark: true, stored: 'light' }).theme, 'light',
    'explicit light must survive a dark system — that direction is the one a '
    + 'bare @media (prefers-color-scheme) implementation cannot express, and it '
    + 'is why the attribute exists at all')
})

test('boot script · "system" and junk both mean "ask the OS"', () => {
  for (const junk of ['system', '', 'Dark', 'DARK', 'auto', 'true', '0', 'null']) {
    assert.equal(runBoot({ osDark: true, stored: junk }).theme, 'dark',
      `stored ${JSON.stringify(junk)} was treated as an explicit choice (OS dark)`)
    assert.equal(runBoot({ osDark: false, stored: junk }).theme, 'light',
      `stored ${JSON.stringify(junk)} was treated as an explicit choice (OS light)`)
  }
})

test('boot script · it never fabricates a stored choice for a visitor who has none', () => {
  // This is exactly how the old build made dark unreachable: it WROTE
  // vs-t=light for every visitor on their first load, so by the time anything
  // asked "did they choose?" the answer was a fabricated yes. The same mistake
  // as the reduced-motion "false", in a different key.
  const dom = runBoot({ osDark: true })
  assert.equal(dom.stored, null,
    `the boot script persisted vs-t=${dom.stored} for a visitor who never chose. `
    + 'Storage is for choices; resolution belongs to prefers-color-scheme.')
})

test('boot script · vs-t-lightreset is retired, not merely commented out', () => {
  // The one-time light migration from #132 (2026-07-04). Its own comment said
  // "dark returns later as an explicit opt-in"; dark has now returned, so the
  // migration is spent and a returning visitor's stored dark must be honoured
  // rather than reset. Asserted against the executable half only — the comment
  // above it explains the retirement and names the key several times.
  assert.ok(!bootCode.includes('vs-t-lightreset'),
    'the boot script still reads or writes vs-t-lightreset. While it does, the '
    + 'first load of every profile that has not seen it force-resets the stored '
    + 'theme to light, and the new control is a no-op for exactly one visit.')
  const dom = runBoot({ osDark: true, stored: 'dark' })
  assert.equal(dom.theme, 'dark')
  assert.deepEqual(dom.keys(), ['vs-t'],
    `the boot script wrote ${JSON.stringify(dom.keys())} — it must touch no `
    + 'storage key of its own')
})

test('boot script · no matchMedia at all still paints a theme and never throws', () => {
  // Very old engines, and any non-browser prerender host. A throw here would
  // take the reduced-motion attribute in the same try/catch with it.
  const bare = makeDom({ osDark: false })
  delete bare.sandbox.window.matchMedia
  assert.doesNotThrow(() => vm.runInNewContext(bootScript, bare.sandbox))
  assert.equal(bare.sandbox.document.documentElement.getAttribute('data-theme'), 'light')

  const stubborn = makeDom({ osDark: false, stored: 'dark' })
  delete stubborn.sandbox.window.matchMedia
  vm.runInNewContext(bootScript, stubborn.sandbox)
  assert.equal(stubborn.theme, 'dark',
    'an explicit choice must not need matchMedia to be honoured')
})

test('boot script · unreadable storage still resolves off the OS', () => {
  // Safari private browsing, "block all cookies", a sandboxed iframe. The
  // visitor cannot persist a choice; they must still get their OS theme rather
  // than an unthemed page.
  const dom = makeDom({ osDark: true })
  dom.sandbox.localStorage.getItem = () => { throw new Error('storage blocked') }
  dom.sandbox.localStorage.setItem = () => { throw new Error('storage blocked') }
  assert.doesNotThrow(() => vm.runInNewContext(bootScript, dom.sandbox))
  assert.equal(dom.theme, 'dark',
    'with storage unreadable the boot script fell back to a hard-coded theme '
    + 'instead of the OS query')
})

// ── Site 2 · ThemeContext.jsx ───────────────────────────────────────────────
//
// Executed too. The file is ESM + JSX, which node:test cannot import, so the
// four non-JS constructs are rewritten here and everything else — loadPref(),
// osPrefersDark(), the resolution, both effects, the matchMedia listener and
// setTheme's validation — runs as shipped. Every rewrite is anchored and
// asserted: if an anchor stops matching the test FAILS LOUDLY rather than
// quietly testing nothing.

const themeFactory = (() => {
  const src = read('src/contexts/ThemeContext.jsx')
  let out = src
  const rewrite = (re, to, what) => {
    assert.match(out, re,
      `this harness could not find ${what} in ThemeContext.jsx. The file was `
      + 'refactored; update the rewrite below so this test keeps executing the real '
      + 'source. Do NOT delete the test — it is one of the two writers that have '
      + 'to agree.')
    out = out.replace(re, to)
  }

  rewrite(/^import\s*\{([^}]*)\}\s*from\s*'react'\s*$/m, 'const {$1} = __react', 'the react import')
  // The provider's only JSX. Its `value={{…}}` object IS the contract consumers
  // read, so it is kept and returned rather than stubbed away.
  rewrite(
    /return\s*\(\s*<ThemeContext\.Provider\s+value=\{([\s\S]*?)\}>[\s\S]*?<\/ThemeContext\.Provider>\s*\)/,
    'return $1',
    'the provider JSX'
  )
  rewrite(/^export\s+function\s+ThemeProvider/m, 'function ThemeProvider', 'the provider export')
  rewrite(/^export\s+const\s+useTheme/m, 'const useTheme', 'the hook export')
  assert.ok(!/[<>]\s*\/?\s*[A-Z]/.test(out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')),
    'JSX still remains after the rewrite; the harness is out of date')

  const body = `(function(__react){\n${out}\n;return { ThemeProvider, loadPref };\n})`
  return vm.runInNewContext.bind(null, body)
})()

// A React small enough to drive one provider: ordered hooks, lazy useState
// initialisers, useEffect with dependency comparison, and re-render on setState.
function mountProvider(dom) {
  const factory = themeFactory(dom.sandbox, { filename: 'ThemeContext.jsx' })
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

  const { ThemeProvider } = factory(react)

  function render() {
    for (let pass = 0; pass < 20; pass++) {
      cursor = 0
      queued = []
      latest = ThemeProvider({ children: null })
      const run = queued
      queued = []
      for (const fn of run) fn()
      if (!queued.length) return
    }
    assert.fail('ThemeProvider did not settle in 20 render passes (effect loop?)')
  }

  render()
  return { get value() { return latest } }
}

test('ThemeContext · the OS decides when the visitor has never chosen', () => {
  const dark = makeDom({ osDark: true })
  assert.equal(mountProvider(dark).value.theme, 'dark')
  assert.equal(dark.theme, 'dark', 'the attribute must follow the resolved theme')

  const light = makeDom({ osDark: false })
  assert.equal(mountProvider(light).value.theme, 'light')
  assert.equal(light.theme, 'light')
})

test('ThemeContext · an explicit choice wins over the OS in BOTH directions', () => {
  const optDark = makeDom({ osDark: false, stored: 'dark' })
  assert.equal(mountProvider(optDark).value.theme, 'dark')
  assert.equal(optDark.theme, 'dark')

  const optLight = makeDom({ osDark: true, stored: 'light' })
  assert.equal(mountProvider(optLight).value.theme, 'light')
  assert.equal(optLight.theme, 'light')
})

test('ThemeContext · the raw preference is exposed, not just the resolved theme', () => {
  // The control renders `themePref`. If it rendered `theme`, someone on System
  // with a dark device would see "Dark" selected, could not tell the two states
  // apart, and could never get back to System — which is how a three-state
  // control quietly decays into a two-state one.
  const dom = makeDom({ osDark: true })
  const ctx = mountProvider(dom)
  assert.equal(ctx.value.themePref, 'system')
  assert.equal(ctx.value.theme, 'dark')

  const chosen = makeDom({ osDark: true, stored: 'light' })
  assert.equal(mountProvider(chosen).value.themePref, 'light')
})

test('ThemeContext · the OS is followed live while in system', () => {
  const dom = makeDom({ osDark: false })
  const ctx = mountProvider(dom)
  assert.equal(dom.listenerCount(), 1,
    'no matchMedia listener installed — a device switching to dark at sunset '
    + 'would need a tab reload to be believed')
  assert.equal(ctx.value.theme, 'light')

  dom.setOs(true)
  assert.equal(dom.theme, 'dark', 'the OS went dark and the attribute did not follow')

  dom.setOs(false)
  assert.equal(dom.theme, 'light', 'the OS went light and the attribute did not follow')
})

test('ThemeContext · an explicit choice pins the theme against OS changes', () => {
  const dom = makeDom({ osDark: false, stored: 'dark' })
  mountProvider(dom)
  dom.setOs(true)
  assert.equal(dom.theme, 'dark')
  dom.setOs(false)
  assert.equal(dom.theme, 'dark',
    'an explicit dark must not be revoked by the system going light')
})

test('ThemeContext · setTheme moves between all three states and persists them', () => {
  const dom = makeDom({ osDark: true })
  const ctx = mountProvider(dom)
  assert.equal(dom.theme, 'dark')

  ctx.value.setTheme('light')
  assert.equal(dom.theme, 'light', 'an explicit light must override the dark device')
  assert.equal(dom.stored, 'light')

  ctx.value.setTheme('system')
  assert.equal(dom.theme, 'dark', 'System must hand the decision back to the device')
  assert.equal(dom.stored, 'system')
  dom.setOs(false)
  assert.equal(dom.theme, 'light', 'and keep following it afterwards')

  ctx.value.setTheme('nonsense')
  assert.equal(dom.stored, 'system', 'an unrecognised value must be rejected outright')
})

test('ThemeContext · toggleTheme always lands on an explicit value', () => {
  // A single-button caller flipping "out of System" has to land somewhere the
  // visitor can predict: the opposite of what is currently on screen.
  const dom = makeDom({ osDark: true })
  const ctx = mountProvider(dom)
  assert.equal(ctx.value.themePref, 'system')
  ctx.value.toggleTheme()
  assert.equal(dom.stored, 'light')
  assert.equal(dom.theme, 'light')
})

test('ThemeContext · unreadable storage still resolves off the OS', () => {
  const dom = makeDom({ osDark: true })
  dom.sandbox.localStorage.getItem = () => { throw new Error('storage blocked') }
  dom.sandbox.localStorage.setItem = () => { throw new Error('storage blocked') }
  assert.doesNotThrow(() => mountProvider(dom),
    'a blocked localStorage must not take the whole provider down')
  assert.equal(dom.theme, 'dark',
    'with storage unreadable the provider must still follow the OS, not fall '
    + 'back to a hard-coded light')
})

// ── The two writers must agree, for every input ─────────────────────────────

test('the boot script and ThemeContext resolve identically — no flash', () => {
  // Any input where these two disagree is a visible theme flip on hydration.
  // That is the defect the boot script exists to prevent, and it is the one
  // thing neither file can catch on its own.
  const stores = [undefined, 'dark', 'light', 'system', 'junk', '']
  const mismatches = []
  for (const stored of stores) {
    for (const osDark of [false, true]) {
      const boot = runBoot({ osDark, stored }).theme
      const react = mountProvider(makeDom({ osDark, stored })).value.theme
      if (boot !== react) {
        mismatches.push(`  vs-t=${JSON.stringify(stored)} osDark=${osDark}: `
          + `boot painted ${boot}, ThemeContext then rendered ${react}`)
      }
    }
  }
  assert.equal(mismatches.join('\n'), '',
    'pre-paint and post-hydration themes disagree, which is a visible flash:\n'
    + mismatches.join('\n'))
})

// ── The CSS contract the two writers exist to satisfy ───────────────────────

test('global.css declares both themes on [data-theme], never on a bare :root', () => {
  // This is WHY html[data-theme] must always be resolved to a concrete value
  // rather than left as "system" for a media query to interpret. If a future
  // refactor moves one theme onto :root, resolving in JS stops being necessary —
  // and until then, an unresolved attribute paints an unthemed page.
  const css = read('src/styles/global.css').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const t of ['dark', 'light']) {
    assert.ok(new RegExp(`\\[data-theme="${t}"\\]\\{--bg-0:`).test(css),
      `no [data-theme="${t}"] token block found; the theme layer moved and the `
      + 'resolution contract above needs rereading')
  }
  assert.ok(!/@media\s*\(\s*prefers-color-scheme/.test(css),
    'global.css now resolves the colour scheme itself. Two resolvers is one too '
    + 'many: a media-query block cannot see an explicit choice, so it would fight '
    + 'the attribute and re-break the "explicit light on a dark device" direction.')
})
