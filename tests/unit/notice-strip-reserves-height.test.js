// THE NOTICE STRIP HAS A HEIGHT, AND EVERY "JUST BELOW THE NAV" OFFSET HAS TO
// KNOW ABOUT IT.
//
// Until 2026-09-15 the offline banner and the sync notice were each a
// position:fixed card at `calc(var(--nav-h) + 10px)`. That coordinate is where
// .plb-toolbar, .uis-command, .lbry-toolbar and .pgl-section-head all park,
// because each of them derives from the same nav height — so the notice covered
// the toolbar of whatever tool was open. The founder reported it on the Palette
// Builder on 2026-09-14 and decided the notices move into the page flow.
//
// The fix is one token. `--chrome-h` is nav-top + nav-h + notice-h, every offset
// derives from it, and NoticeStack.jsx publishes --notice-h from the measured
// strip. The failure mode this file exists to catch is the easy one: someone
// writes `top:calc(var(--nav-top) + var(--nav-h))` by hand in a new rule, which
// looks right, resolves correctly while no notice is showing, and puts that
// element back under the banner the moment one appears.
//
// The behaviour is proved in tests/user-sim/33-offline-state.spec.js, which
// measures the real strip against the real toolbar. This is the source guard,
// because a new rule in a stylesheet no browser test visits would not be seen
// there at all.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.join(process.cwd(), 'src', 'styles')

/** Every .css file under src/styles, with its repo-relative name. */
function sheets(dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) sheets(full, out)
    else if (entry.name.endsWith('.css')) {
      out.push([path.relative(process.cwd(), full).split(path.sep).join('/'), fs.readFileSync(full, 'utf8')])
    }
  }
  return out
}

const globalCss = () => sheets().find(([n]) => n.endsWith('global.css'))[1]

/** Every declaration mentioning --nav-h or --nav-top, WITH the selector it sits
    under. The selector is half the fact: `top:calc(var(--nav-top) +
    var(--nav-h))` is correct on .notice-stack and wrong on anything else, so an
    exemption keyed on the declaration alone would excuse every copy of it. */
function navDeclarations() {
  const found = []
  for (const [name, src] of sheets()) {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
    // `[^{}]*` for the body, so a rule nested inside an @media is matched on
    // its own and carries its own selector rather than the at-rule prelude.
    for (const rule of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = rule[1].trim().replace(/\s+/g, ' ')
      for (const decl of rule[2].split(';')) {
        if (/var\(--nav-(?:h|top)\)/.test(decl)) {
          found.push({ file: name, key: selector + ' :: ' + decl.trim() })
        }
      }
    }
  }
  return found
}

// The three places ALLOWED to compute the nav offset by hand, and why each is.
const EXEMPT = [
  // The token itself.
  ':root :: --chrome-h:calc(var(--nav-top) + var(--nav-h) + var(--notice-h))',
  // The nav's own box. It is the thing being measured, not an offset from it.
  '.pnav :: height:var(--nav-h)',
  // The strip's own top. A strip offset by its own height walks down the page.
  '.notice-stack :: top:calc(var(--nav-top) + var(--nav-h))',
]

test('--chrome-h folds the notice height into the nav offset', () => {
  const css = globalCss()
  assert.ok(css.includes('--notice-h:0px'),
    '--notice-h must be declared on :root, or every offset that folds it breaks')
  assert.ok(css.includes('--chrome-h:calc(var(--nav-top) + var(--nav-h) + var(--notice-h))'),
    '--chrome-h no longer includes the notice height')
  assert.ok(css.includes('--nav-clear:calc(var(--chrome-h) + 8px)'),
    '--nav-clear must derive from --chrome-h so its consumers inherit the notice height')
})

test('no rule computes the offset below the nav by hand', () => {
  const offenders = navDeclarations()
    .filter(({ key }) => !EXEMPT.includes(key))
    .map(({ file, key }) => file + ': ' + key)
  assert.deepEqual(offenders, [],
    'use var(--chrome-h) or var(--nav-clear) — a hand-rolled offset sits under the notice strip')
})

test('the exemptions are real rules, not three strings nothing matches', () => {
  // POSITIVE CONTROL for the scanner. The test above is "this list is empty",
  // which a regex that silently stopped matching would also satisfy. Every
  // exemption must be found in the stylesheets, which proves the scan ran and
  // that the allowlist describes the file rather than the other way round.
  const keys = navDeclarations().map((d) => d.key)
  for (const e of EXEMPT) {
    assert.ok(keys.includes(e), 'the scanner no longer sees ' + e)
  }
})

test('the strip reserves room rather than floating over the page', () => {
  const css = globalCss()
  const rule = css.match(/\.notice-stack\{[^}]*\}/)
  assert.ok(rule, '.notice-stack has no rule')
  // Fixed is correct HERE and only here: the nav is fixed, so a flow element at
  // the top of the document would render behind it. What makes the strip not an
  // overlay is that its height is published and folded into --chrome-h.
  assert.match(rule[0], /position:fixed/)
  assert.ok(css.includes('.notice-stack:empty{display:none}'),
    'an empty strip must collapse, or it reserves a band of chrome on every page')
  // Below the nav's own z-index, which 33-offline-state.spec.js also checks
  // against the live DOM: the nav is how someone leaves a page that is broken.
  const z = Number(rule[0].match(/z-index:(\d+)/)[1])
  assert.ok(z < 120, 'the strip is at z-index ' + z + ', on top of the nav')
})

test('neither notice positions itself any more', () => {
  // POSITIVE CONTROL for the token assertions. All of them would still pass if
  // the two notices had kept their own position:fixed and simply ignored the
  // strip they now live in.
  const css = globalCss()
  for (const cls of ['offline-banner', 'sync-notice']) {
    // indexOf rather than a built RegExp: the selector is a literal and a
    // pattern assembled from a string needs escapes that read as noise here.
    const at = css.indexOf(String.fromCharCode(46) + cls + String.fromCharCode(123))
    assert.ok(at >= 0, cls + ' has no rule in global.css')
    const rule = [css.slice(at, css.indexOf(String.fromCharCode(125), at) + 1)]
    assert.doesNotMatch(rule[0], /position:fixed/, cls + ' still positions itself')
    assert.match(rule[0], /margin:0 auto/, cls + ' is no longer a centred row in the strip')
  }
})

test('NoticeStack publishes the height it measures', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/components/NoticeStack.jsx'), 'utf8')
  assert.match(src, /setProperty\('--notice-h'/, 'the strip no longer publishes its height')
  assert.match(src, /removeProperty\('--notice-h'/, 'the reserved height is never given back')
  assert.match(src, /document\.documentElement/,
    'the property must be written on :root — a custom property is resolved where it is used')
  assert.match(src, /ResizeObserver/,
    'a measured strip needs an observer; the sentence rewraps and the message length is unknown')
})
