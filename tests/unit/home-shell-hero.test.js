// THE HEADLINE IN THE SERVED SHELL IS THE FOUNDER'S, NOT A SECOND COPY OF IT.
//
// ── What is being guarded ───────────────────────────────────────────────────
//
// scripts/home-shell.mjs writes the hero headline into `dist/index.html` so the
// homepage's largest paint no longer waits for the entry chunk (the measurement
// is in that file's header). The moment a sentence is rendered from two places,
// the two can disagree — and this particular sentence was ASSEMBLED FROM THE
// FOUNDER'S OWN WORDS AND APPROVED BY HIM on 2026-09-10, so a shell that drifts
// from src/data/positioning.js is not a typo, it is the product saying something
// he did not say, to the visitor who has not yet loaded the page that says it
// correctly.
//
// This is the same guard tests/unit/index-html-pricing.test.js is for prices,
// built the same way and for the same reason: scripts/site-pricing.mjs derives
// the amounts, and that test fails the build if a price-shaped string reappears
// in index.html. Here the derived thing is a sentence.
//
// ── The three assertions that matter, and why they are three ────────────────
//
//   1. NEITHER FILE HOLDS THE WORDS. index.html is scanned RAW, comments and
//      all: a comment quoting the headline is a second copy that will be wrong
//      after the next copy decision, and — per the trap this programme hit
//      twice — a well-commented file is exactly where a text search finds the
//      COMMENT and reports a false green. scripts/home-shell.mjs is scanned
//      with comments stripped, because its header legitimately explains what it
//      emits.
//   2. WHAT IT EMITS EQUALS WHAT THE MODULE SAYS. Compared against
//      `heroHeadlineText()`, not against a literal, so moving the sentence in
//      positioning.js moves this expectation with it rather than failing here.
//   3. IT EMITS THE SAME STRUCTURE src/pages/Home.jsx RENDERS. Equal text in a
//      different element chain is still a different headline: it would paint at
//      a different size and in a different place, which is a layout shift and a
//      second LCP candidate. The class chain is read out of Home.jsx itself.
//
// MUTATION-VERIFIED at the call site — see the PR for the evidence that the
// break reached dist/.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'
import { HERO_HEADLINE, heroHeadlineText } from '../../src/data/positioning.js'
import { SESSION_HINT_KEY } from '../../src/utils/sessionHint.js'
import { SITE_ORIGIN } from '../../src/utils/routeMeta.js'
import {
  HOME_SHELL_ROUTES,
  applyHomeShell,
  assertHomeShellApplied,
  homeShellRoot,
} from '../../scripts/home-shell.mjs'

const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

/** Tags out, entities back, whitespace collapsed — what a reader sees. */
const visibleText = (html) => html
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim()

/** Every part of the sentence, as the three pieces that are separately typed. */
const PARTS = [HERO_HEADLINE.lead, HERO_HEADLINE.mark]

// ── 1. Nobody typed it ──────────────────────────────────────────────────────

test('index.html states no headline of its own — positioning.js is the only source', () => {
  // RAW, comments included, for the reason the pricing test scans raw: in a
  // source module a comment quoting the sentence is prose about the sentence.
  // In the served document it is a second copy of an approved claim.
  const html = read('index.html')
  const hits = PARTS.filter((p) => html.includes(p))
  assert.deepEqual(hits, [],
    `index.html contains the hero headline: ${hits.join(' / ')}.\n`
    + 'It is written into the built shell by scripts/home-shell.mjs from '
    + 'src/data/positioning.js. Typing it here — even correctly — restores the '
    + 'two-sources-of-truth defect that module exists to prevent.')
})

test('the generator holds no copy of the sentence either', () => {
  // Comments stripped: home-shell.mjs's header explains what it emits and why,
  // and a guard that fails on its own documentation gets deleted. What must not
  // appear is a string LITERAL — the module is required to import the words.
  const src = stripJs(read('scripts/home-shell.mjs'))
  const hits = PARTS.filter((p) => src.includes(p))
  assert.deepEqual(hits, [],
    `scripts/home-shell.mjs hard-codes the headline: ${hits.join(' / ')}. `
    + 'It must render HERO_HEADLINE, not a copy of it.')
  assert.match(src, /from '\.\.\/src\/data\/positioning\.js'/,
    'scripts/home-shell.mjs no longer imports from src/data/positioning.js, so nothing '
    + 'ties the shell it writes to the sentence the founder approved.')
})

// ── 2. What it emits is what the module says ────────────────────────────────

test('the shell renders exactly the headline heroHeadlineText() renders', () => {
  const h1 = /<h1 class="home-hero-h1">([\s\S]*?)<\/h1>/.exec(homeShellRoot())
  assert.ok(h1, 'the home shell emits no <h1 class="home-hero-h1"> at all')
  assert.equal(visibleText(h1[1]), heroHeadlineText(),
    'the shell\'s headline and heroHeadlineText() disagree. Both are supposed to be '
    + 'HERO_HEADLINE assembled the same way; if they differ, the served page and the '
    + 'hydrated page say different things.')
})

test('the marked run is the marked run, not merely present somewhere', () => {
  // design-language-v2.md budgets one --hi element per viewport and
  // scripts/og-cards.mjs throws if the h1 stops highlighting a phrase, because
  // the share card paints the same highlight. The shell must agree with both.
  const shell = homeShellRoot()
  const marks = [...shell.matchAll(/<mark class="home-mark">([\s\S]*?)<\/mark>/g)]
  assert.equal(marks.length, 1, `expected exactly one <mark class="home-mark">, found ${marks.length}`)
  assert.equal(visibleText(marks[0][1]), HERO_HEADLINE.mark)
})

// ── 3. The same structure the hydrated page renders ─────────────────────────

test('the shell h1 uses the element chain src/pages/Home.jsx uses', () => {
  // Read out of Home.jsx rather than restated, so moving the hero's markup
  // fails here instead of silently giving the shell a headline that paints at a
  // different size and in a different place — which is both a layout shift and
  // a second, later LCP candidate.
  const home = read('src/pages/Home.jsx')
  const jsxH1 = /<h1 className="home-hero-h1">([\s\S]*?)<\/h1>/.exec(home)
  assert.ok(jsxH1, 'src/pages/Home.jsx no longer renders <h1 className="home-hero-h1">')
  const jsxClasses = [...jsxH1[1].matchAll(/className="([^"]+)"/g)].map((m) => m[1])

  const shellH1 = /<h1 class="home-hero-h1">([\s\S]*?)<\/h1>/.exec(homeShellRoot())
  assert.ok(shellH1, 'the home shell emits no <h1 class="home-hero-h1">')
  const shellClasses = [...shellH1[1].matchAll(/class="([^"]+)"/g)].map((m) => m[1])

  assert.deepEqual(shellClasses, jsxClasses,
    'the shell headline and the React headline are built from different elements.\n'
    + `  Home.jsx: ${jsxClasses.join(', ')}\n`
    + `  shell:    ${shellClasses.join(', ')}\n`
    + 'They must be the same chain, in the same order, so ONE set of rules in '
    + 'global.css decides the font, size, wrap points and position of both.')
})

test('the hero sits inside the same box chain the hydrated page builds', () => {
  // `.home-hero`'s own padding is what reserves the fixed nav's height. Lose any
  // of these wrappers and the headline paints somewhere React will not put it.
  const shell = homeShellRoot()
  for (const needle of [
    '<div class="home">',
    '<main>',
    '<header class="home-hero">',
    '<div class="home-hero-core">',
  ]) {
    assert.ok(shell.includes(needle), `the home shell no longer emits ${needle}`)
  }
  assert.ok(
    shell.indexOf('<main>') < shell.indexOf('<div class="boot-decoration"'),
    'the skeleton decoration must come AFTER <main>, or the strip below the hero flows '
    + 'above it and pushes the headline down the page.',
  )
})

// ── The things other suites read through this shell ─────────────────────────

test('the readiness door and 04-premium-home still find what they read', () => {
  const shell = homeShellRoot()
  // tests/user-sim/helpers.js ready() treats the absence of this id as "React
  // has committed something". Rename it and every spec's readiness wait goes
  // blind to the pre-hydration window again.
  assert.match(shell, /<div class="boot-shell boot-shell-home" id="boot-shell">/)
  assert.match(shell, /<span class="boot-status" role="status" aria-live="polite">Loading UIL4B<\/span>/)
  // 04-premium-home asserts a SINGLE aria-hidden decoration wrapper (a locator
  // matching two would fail on strict mode, not on the assertion) and reads a
  // .boot-card's shimmer through it.
  const decorations = [...shell.matchAll(/class="boot-decoration"/g)]
  assert.equal(decorations.length, 1, `expected exactly one .boot-decoration, found ${decorations.length}`)
  assert.match(shell, /<div class="boot-decoration" aria-hidden="true">/)
  assert.ok([...shell.matchAll(/class="boot-card"/g)].length >= 1, 'no .boot-card left to read the shimmer from')
})

// ── The substitution cannot no-op, and cannot be applied everywhere ─────────

test('applyHomeShell refuses a shell it does not recognise', () => {
  // A silent pass-through here would ship the skeleton while the build stayed
  // green — the failure shape scripts/site-pricing.mjs throws to avoid.
  assert.throws(() => applyHomeShell('<html><body>nothing to anchor on</body></html>'),
    /could not find/)
})

test('assertHomeShellApplied fails on a shell whose headline went missing', () => {
  // Anti-vacuity for the build-time check: it has to be able to go red.
  assert.throws(() => assertHomeShellApplied('<div id="root"></div>', 'a test'),
    /without .*the h1/)
  // It also fails on a body that carries the headline but whose <html> lost the
  // attribute — which is the half that keeps the hydrated hero from re-entering,
  // and is not visible anywhere in the markup this function is usually shown.
  assert.throws(() => assertHomeShellApplied(homeShellRoot(), 'a test'),
    /data-hero-prepainted/)
  // The whole applied document is what prerender writes, and it must pass.
  assert.doesNotThrow(() => assertHomeShellApplied(applyHomeShell(read('index.html')), 'a test'))
})

test('applying it to the REAL index.html keeps the head and swaps only #root', () => {
  const applied = applyHomeShell(read('index.html'))
  assertHomeShellApplied(applied, 'the applied index.html')
  // The head survives the splice, which is what this whole assertion block is
  // for. It is NOT a claim that the head's contents were already correct: as of
  // 2026-09-14 `/` shipped four disagreeing descriptions, fixed in the same
  // pass as this line — see tests/unit/index-html-description.test.js.
  assert.match(applied, /<title>[\s\S]*?<\/title>/)
  // The canonical, taken from SITE_ORIGIN rather than typed. #457 moved the
  // advertised host from www to the apex and this assertion went red on a
  // correct page — a host spelled out here is a second place the site's own
  // origin is written down, which is the defect src/utils/routeMeta.js exports
  // SITE_ORIGIN to prevent.
  //
  // THE TRAILING SLASH IS NEW, and the bare origin was the stale side. `/` and
  // `/home` render the same page, and `canonicalUrl()` returns
  // `https://uil4b.com/` for BOTH — so dist/home/index.html shipped the slash
  // while the root shell, the one page that never runs through canonicalUrl(),
  // shipped it without. Two shells for one page, disagreeing on the string that
  // exists to say they are one page.
  assert.match(applied, new RegExp(`<link rel="canonical" href="${SITE_ORIGIN}/">`))
  // And the noscript block — the non-JS reader's page — survives the splice.
  assert.match(applied, /<noscript>/)
  assert.match(applied, /<script type="module" src="\/src\/main\.jsx"><\/script>/)
  // Exactly one #root, and no leftover of the skeleton hero it replaced.
  assert.equal([...applied.matchAll(/<div id="root">/g)].length, 1)
  // The skeleton title ELEMENT, not the class name: `.boot-title`'s rule stays
  // in the shared <style> block because the other 38 route shells still paint
  // it. What must be gone is the empty grey box standing in for this headline.
  assert.ok(!applied.includes('<i class="boot-copy boot-title">'),
    'the generic skeleton title is still in the homepage shell alongside the real headline')
})

// ── The gate in index.html's head ───────────────────────────────────────────
//
// Two visitors must not see the pre-painted headline: a returning signed-in one
// (App.jsx redirects them off `/` and 57-signed-in-session.spec.js requires the
// sales page never paints on the way), and anyone handed the wrong shell — which
// is not hypothetical, because `vite preview` serves dist/index.html for every
// path. The head script answers both. These pin the two values it reads against
// the modules that own them, so a rename fails the build instead of silently
// turning the gate off and leaving the headline on screen for a signed-in user.

test("the gate reads the session hint by sessionHint.js's own key", () => {
  const html = read('index.html')
  const gate = /<script>\s*\/\/ THE GATE ON THE PRE-PAINTED HEADLINE[\s\S]*?<\/script>/.exec(html)
  assert.ok(gate, 'index.html no longer carries the pre-painted-headline gate in its head')
  const code = gate[0].replace(/^\s*\/\/.*$/gm, '')
  assert.ok(code.includes(`'${SESSION_HINT_KEY}'`),
    `the gate does not read '${SESSION_HINT_KEY}'. src/utils/sessionHint.js owns that key; if it `
    + 'moved, the gate is now reading nothing and a returning signed-in visitor sees the sales '
    + 'headline before being redirected off it.')
  assert.ok(code.includes('data-hero-prepainted'),
    'the gate no longer checks the attribute, so it runs its whole body on all 39 shells')
})

test('the gate keeps the headline on exactly the URLs the shell is written for', () => {
  // Read out of HOME_SHELL_ROUTES rather than restated: the set that decides
  // which shells CARRY the headline must be the set that decides which URLs may
  // SHOW it, or one of them is wrong and nothing says which.
  const html = read('index.html')
  const gate = /<script>\s*\/\/ THE GATE ON THE PRE-PAINTED HEADLINE[\s\S]*?<\/script>/.exec(html)
  assert.ok(gate, 'index.html no longer carries the pre-painted-headline gate in its head')
  const code = gate[0].replace(/^\s*\/\/.*$/gm, '')
  const compared = [...code.matchAll(/p===('[^']*')/g)].map((m) => m[1].slice(1, -1))
  assert.deepEqual(compared.sort(), [...HOME_SHELL_ROUTES].sort(),
    `the gate allows ${compared.join(', ')} but scripts/home-shell.mjs writes the headline into `
    + `${[...HOME_SHELL_ROUTES].join(', ')}. A URL in one list and not the other either shows a `
    + 'headline it should not, or throws away the paint it was given.')
})

test('only the sales-page URLs get it', () => {
  // The headline is THIS page's claim. A route shell that painted it before its
  // own page arrived would be telling a visitor something about the wrong page.
  assert.deepEqual([...HOME_SHELL_ROUTES].sort(), ['/', '/home'])
})
