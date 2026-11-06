// THE HEADLINE IN THE SERVED SHELL IS THE POSITIONING LINE, NOT A SECOND COPY OF IT.
//
// ── What is being guarded ───────────────────────────────────────────────────
//
// scripts/home-shell.mjs writes the hero headline into `dist/index.html` so the
// homepage's largest paint no longer waits for the entry chunk (the measurement
// is in that file's header). The moment a sentence is rendered from two places,
// the two can disagree — and this particular sentence was ASSEMBLED FROM THE
// APPROVED POSITIONING WORDS, so a shell that drifts
// from src/data/positioning.js is not a typo, it is the product saying something
// it was not meant to say, to the visitor who has not yet loaded the page that says it
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
//   3. IT EMITS THE SAME STRUCTURE THE HYDRATED PAGE RENDERS. Equal text in a
//      different element chain is still a different headline: it would paint at
//      a different size and in a different place, which is a layout shift and a
//      second LCP candidate. The chain is read out of the components themselves.
//
// The chain being compared is `.spectrum > main > section#top.hh-hero >
// .hh-copy > h1.hh-h1` with one `span.hh-h1-mark`, and the component read for
// assertion 3 is src/components/home/HomeHero.jsx.
//
// Break the shell's markup or the module's sentence and the build goes red:
// the pins below read what is emitted, not what is typed.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss, stripJs } from '../helpers/strip-comments.js'
// The front door's headline is held in src/components/spectrum/spectrumHero.js
// and read by both HomeHero.jsx and scripts/home-shell.mjs. The guards below:
// nobody types it, the shell emits exactly it, and in the
// element chain the hydrated page renders.
import { SPECTRUM_HERO, SPECTRUM_HERO_SUB } from '../../src/components/spectrum/spectrumHero.js'
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

const heroHeadlineText = () => SPECTRUM_HERO.text
const HERO_HEADLINE = SPECTRUM_HERO

/** The sentence, minus its full stop, which is what a second copy would carry. */
const PARTS = [SPECTRUM_HERO.text.replace(/\.$/, '')]

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
  assert.match(src, /from '\.\.\/src\/components\/spectrum\/spectrumHero\.js'/,
    'scripts/home-shell.mjs no longer imports from src/components/spectrum/spectrumHero.js, so '
    + 'nothing ties the shell it writes to the sentence the page renders.')
})

// ── 2. What it emits is what the module says ────────────────────────────────

test('the shell renders exactly the headline heroHeadlineText() renders', () => {
  const h1 = /<h1 class="hh-h1">([\s\S]*?)<\/h1>/.exec(homeShellRoot())
  assert.ok(h1, 'the home shell emits no <h1 class="hh-h1"> at all')
  // One heading, one sentence, no per-word wrappers: what a sighted visitor
  // reads and what a screen reader announces are the same node.
  assert.equal(visibleText(h1[1]), heroHeadlineText(),
    'the shell headline and heroHeadlineText() disagree. Both are supposed to be '
    + 'HERO_HEADLINE assembled the same way; if they differ, the served page and the '
    + 'hydrated page say different things.')
  assert.equal([...homeShellRoot().matchAll(/<h1\b/g)].length, 1, 'the shell must emit exactly one h1')
})

test('the shell headline has no word spans', () => {
  const h1 = /<h1 class="hh-h1">([\s\S]*?)<\/h1>/.exec(homeShellRoot())
  assert.ok(h1)
  assert.ok(!/class="sp-w|data-sp-w|sr-only|aria-hidden/.test(h1[1]),
    'the shell headline is split into words again; the hero headline is plain text')
  assert.equal([...h1[1].matchAll(/<span\b/g)].length, 1, 'the headline carries exactly one span, the marked run')
})

test('the marked run is the marked run, not merely present somewhere', () => {
  // scripts/og-cards.mjs throws if the h1 stops highlighting a phrase, because
  // the share card paints the same highlight. The shell must agree with it.
  const shell = homeShellRoot()
  const marked = [...shell.matchAll(/<span class="hh-h1-mark">([\s\S]*?)<\/span>/g)]
    .map((m) => visibleText(m[1]))
  assert.deepEqual(marked, [HERO_HEADLINE.mark])
  // The full stop sits outside the marked run.
  assert.match(shell, new RegExp(`</span>${HERO_HEADLINE.tail.replace('.', '\\.')}</h1>`))
})

test('the shell carries the sub-line the hero renders', () => {
  const sub = /<p class="hh-sub">([\s\S]*?)<\/p>/.exec(homeShellRoot())
  assert.ok(sub, 'the home shell emits no .hh-sub')
  assert.equal(visibleText(sub[1]), SPECTRUM_HERO_SUB)
})

// ── 3. The same structure the hydrated page renders ─────────────────────────

test('the shell h1 uses the element chain HomeHero.jsx renders', () => {
  // Read out of the component rather than restated, so moving the hero's markup
  // fails here instead of silently giving the shell a headline that paints at a
  // different size and in a different place, which is both a layout shift and a
  // second, later LCP candidate.
  const hero = read('src/components/home/HomeHero.jsx')
  for (const needle of [
    '<section id="top" className="hh-hero">',
    '<div className="hh-copy">',
    '<h1 className="hh-h1">',
    '<span className="hh-h1-mark">',
    '<p className="hh-sub">',
  ]) {
    assert.ok(hero.includes(needle), `src/components/home/HomeHero.jsx no longer renders ${needle}; the shell copies a chain that moved`)
  }
  const shell = homeShellRoot()
  for (const needle of [
    '<div class="spectrum">',
    '<main>',
    '<section id="top" class="hh-hero">',
    '<div class="hh-copy">',
    '<h1 class="hh-h1">',
    '<p class="hh-sub">',
  ]) {
    assert.ok(shell.includes(needle), `the home shell no longer emits ${needle}`)
  }
  // The hero is the page's #top block. The old header element holds only the nav.
  assert.ok(!/<header\b/.test(shell), 'the shell hero is wrapped in a <header>; the hero is a section')
})

test('the hero has no entrance on its text, so the shell paints it settled', () => {
  const css = stripCss(read('src/styles/pages/home-hero.css'))
  for (const selector of ['.hh-h1', '.hh-sub', '.hh-copy', '.hh-cta']) {
    const rule = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*\\}`, 'g')
    for (const block of css.match(rule) || []) {
      assert.ok(!/animation|opacity\s*:\s*0\b|transform/.test(block),
        `${selector} animates or starts hidden: ${block}`)
    }
  }
  assert.ok(!/class="hh-[^"]*is-in/.test(homeShellRoot()), 'the shell hero carries an entrance class')
  assert.ok(
    homeShellRoot().indexOf('<main>') < homeShellRoot().indexOf('<div class="boot-decoration"'),
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

test('the shell preloads the Geist file the headline and sub-line are set in, once, in CORS mode', () => {
  const applied = applyHomeShell(read('index.html'))
  const links = applied.match(/<link[^>]*rel="preload"[^>]*>/g) || []
  const geist = links.filter((l) => /fonts\/geist-latin\.woff2/.test(l))
  assert.equal(geist.length, 1, 'exactly one Geist preload in the sales page head')
  assert.match(geist[0], /as="font"/)
  assert.match(geist[0], /type="font\/woff2"/)
  // A font preload without crossorigin mismatches the CORS-mode request and downloads twice.
  assert.match(geist[0], /crossorigin/)
  // Applying it to a shell that already carries it adds nothing.
  assert.equal(applyHomeShell(applied).split('fonts/geist-latin.woff2').length, 2)
  // The preloaded file is the one the Geist @font-face (latin subset) declares.
  assert.match(stripCss(read('src/styles/global.css')), /font-family:\s*'Geist';[^}]*url\('\/fonts\/geist-latin\.woff2'\)/)
  // It belongs to the sales page only: the shared index.html and the generic route shells never carry it.
  assert.doesNotMatch(read('index.html'), /geist-latin\.woff2/)
  assert.doesNotMatch(stripJs(read('scripts/prerender.mjs')), /geist-latin/)
})

test('assertHomeShellApplied fails on a shell whose Geist preload went missing', () => {
  const applied = applyHomeShell(read('index.html'))
  assert.doesNotThrow(() => assertHomeShellApplied(applied, 'x'))
  const without = applied.replace(/<link[^>]*geist-latin\.woff2[^>]*>/, '')
  assert.throws(() => assertHomeShellApplied(without, 'x'), /Geist preload/)
})
