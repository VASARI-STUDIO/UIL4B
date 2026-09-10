// The guard on the guard.
//
// A dozen tests in this suite read application source and assert on what they
// find. Every one of them is only as trustworthy as the comment-stripper it
// runs first, because a stripper that blanks too much does not make those tests
// fail — it makes them PASS, over code they can no longer see.
//
// That is not hypothetical. Measured while building #277: the one-line regex
// this module replaced read the slash-star inside `accept="image/*"` in
// ColorStudio.jsx as a block-comment opener, matched to the next closing marker
// 819 lines later, and blanked a third of the file including a price the scan
// existed to check. Every assertion stayed green.
//
// So each case below is written against the specific input that breaks the
// naive form, and the last one measures the whole repository rather than a
// fixture — because the fixture only proves what someone thought to imagine.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  stripComments,
  stripJs,
  stripCss,
  stripHtml,
  stripForPath,
  longestBlankedRun,
} from '../helpers/strip-comments.js'

const ROOT = process.cwd()

function walk(dir, test) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full, test)
    return test.test(entry.name) ? [full] : []
  })
}

// ── The three inputs that break the one-line regex ───────────────────────────

test('a slash-star inside an attribute value is not a comment opener', () => {
  const src = [
    'const KEEP_ME_ONE = 1',
    '<input accept="image/*" />',
    'const KEEP_ME_TWO = 2',
    '/* a real comment */',
    'const KEEP_ME_THREE = 3',
  ].join('\n')
  const out = stripJs(src)
  // This is THE regression. The naive form blanks from `image/` to the `*/`
  // that closes the real comment two lines down, taking KEEP_ME_TWO with it.
  assert.match(out, /KEEP_ME_ONE/)
  assert.match(out, /KEEP_ME_TWO/, 'the attribute value swallowed the code after it')
  assert.match(out, /KEEP_ME_THREE/)
  assert.match(out, /accept="image\/\*"/, 'the attribute itself was damaged')
  assert.ok(!/a real comment/.test(out), 'the real comment survived')
})

test('a URL at the start of a line is not a line comment', () => {
  const src = [
    'const url =',
    '  "https://uil4b.com/pricing"',
    'const KEEP_ME = 1',
  ].join('\n')
  const out = stripJs(src)
  assert.match(out, /https:\/\/uil4b\.com\/pricing/, 'the URL was read as a comment')
  assert.match(out, /KEEP_ME/)
})

test('an escaped slash in a regex literal does not open a comment', () => {
  const src = [
    'const RE = /https?:\\/\\//',
    'const KEEP_ME = 1',
  ].join('\n')
  const out = stripJs(src)
  assert.match(out, /KEEP_ME/, 'the regex literal swallowed the line after it')
})

// ── The two invariants the module promises ───────────────────────────────────

// ── The inputs that make a stripper silently vacuous ────────────────────────
//
// Everything below is a shape where a careless stripper eats CODE. That is the
// failure that fails GREEN: an assertion looking for a forbidden string finds
// nothing, reports success, and is guarding an empty string. Each case here was
// measured against this module on 2026-09-10 before being written down.

test('a CSS string containing a comment opener is not a comment', () => {
  // `content: "/*"` is legal CSS and it appears in generated-content rules. To
  // the regex this module replaced it is the start of a block comment, so
  // everything up to the next closing marker — or the end of the file, if there
  // is none — disappears, taking live declarations with it.
  // The closing marker is supplied by a REAL comment further down, which is
  // what makes this the live shape rather than a curiosity: the naive regex
  // pairs the opener inside the string with that later marker and blanks
  // everything between them. In src/pages/ColorStudio.jsx that span was 819
  // lines, and it included a price the scan existed to check.
  const css = [
    '.a{content:"/*";color:red}',
    '.b{color:blue}',
    '/* a genuine comment, and the closing marker the naive regex pairs with */',
    '.c{color:green}',
  ].join('\n')
  const out = stripCss(css)

  assert.ok(out.includes('color:red'), 'the declaration beside the string must survive')
  assert.ok(out.includes('color:blue'), 'and the whole rule between the two markers')
  assert.ok(out.includes('color:green'), 'and the rule after them')
  assert.ok(!out.includes('a genuine comment'), 'while the real comment is still blanked')
  // Length and line numbers hold across the lot.
  assert.equal(out.length, css.length)
  assert.equal(out.split('\n').length, css.split('\n').length)
})

test('a CSS string containing a CLOSING marker does not end a comment early', () => {
  // The mirror case, and the more dangerous direction: a stray `*/` inside a
  // string can terminate a comment that has not started, leaving real comment
  // text in the output where an assertion can match it.
  const css = '.a{content:"*/"}\n/* a real comment */\n.b{color:blue}'
  const out = stripCss(css)
  assert.ok(out.includes('content:"*/"'), 'the string is code and stays')
  assert.ok(!out.includes('a real comment'), 'and the real comment after it still goes')
  assert.ok(out.includes('color:blue'))
})

test('a template literal is code, including comment-shaped text inside it', () => {
  // Template literals are how this app builds CSS and export payloads, so their
  // contents routinely LOOK like comments. src/utils/styleGuideExport.js and
  // src/utils/brandGuidelines.js are both built this way, and both appear in
  // the differential further down.
  const js = 'const css = `a { /* not a comment */ }`\nconst y = 1'
  assert.equal(stripJs(js), js, 'a block comment inside a template is template text')

  const multi = 'const t = `line1\n// not a comment\nline2`\nconst z = 2'
  assert.equal(stripJs(multi), multi, 'and so is a double slash, across lines')

  const interp = 'const t = `${a / b} /* x */`\nconst w = 3'
  assert.equal(stripJs(interp), interp, 'a division inside an interpolation opens nothing')
})

test('a regex literal survives, slashes and all', () => {
  // `/a\*\/b/` contains an escaped closing marker; `/[/]/` contains a bare
  // slash in a character class. Both are code.
  const starSlash = 'const re = /a\\*\\/b/\nconst q = 4'
  assert.equal(stripJs(starSlash), starSlash)
  const charClass = 'const re = /[/]/\nconst q = 5'
  assert.equal(stripJs(charClass), charClass)
})

test('a TRAILING line comment is stripped, which the regex it replaced missed', () => {
  // The old form was anchored: /^\s*\/\/.*$/gm, so it only ever saw a comment
  // that STARTED a line. A comment after code on the same line survived it
  // untouched — and a forbidden string parked in one would satisfy an assertion
  // looking for the absence of that string. This module strips both, so it is
  // strictly the stricter of the two.
  const js = 'const a = 1 // this is a comment\nconst b = 2'
  const out = stripJs(js)
  assert.ok(!out.includes('this is a comment'), 'a trailing comment must go')
  assert.ok(out.includes('const a = 1'), 'and the code before it must stay')
  assert.ok(out.includes('const b = 2'))

  // And it does that WITHOUT mistaking the double slash in a URL for one.
  const url = 'const u = "https://uil4b.com/x" // trailing\nconst c = 3'
  const urlOut = stripJs(url)
  assert.ok(urlOut.includes('https://uil4b.com/x'), 'the URL is in a string and is code')
  assert.ok(!urlOut.includes('trailing'), 'the real comment after it still goes')
})

test('the documented limitation under-strips rather than over-strips', () => {
  // STATED, NOT HIDDEN. The walk is not a JavaScript parser: a lone apostrophe
  // outside a string — here the one inside the character class /['"]/ — opens a
  // pseudo-string that runs to the next quote of the same kind, so a comment
  // caught inside that span is NOT blanked.
  //
  // This is pinned deliberately, because the DIRECTION is the safety property
  // the whole module rests on. Under-stripping leaves prose where an assertion
  // can see it, so the assertion goes RED and someone looks. Over-stripping
  // removes the code an assertion was checking, so it goes GREEN and nobody
  // ever looks again. If a future change to this walk flips the direction here,
  // that is a much bigger change than it will look like in the diff.
  const js = "const re = /['\"]/\n/* a real comment */\nconst d = 6"
  const out = stripJs(js)
  assert.ok(out.includes('a real comment'),
    'the known limitation: this comment is inside a pseudo-string and survives — '
    + 'a LOUD wrong answer, which is the one worth having')
  assert.ok(out.includes('const d = 6'), 'and crucially, no code was eaten')
})

test('stripping preserves length, so an offset still points at the right place', () => {
  const src = 'const a = 1 /* xx */ + 2 // yy\nconst b = "/* not a comment */"\n'
  const out = stripJs(src)
  assert.equal(out.length, src.length)
})

test('stripping preserves line numbers, so a failure message points at the right line', () => {
  const src = [
    'const a = 1',
    '/* a comment',
    '   spanning',
    '   three lines */',
    'const b = 2',
  ].join('\n')
  const out = stripJs(src)
  assert.equal(out.split('\n').length, src.split('\n').length)
  assert.equal(out.split('\n')[4].trim(), 'const b = 2', 'line 5 moved')
})

// ── The per-language entry points ────────────────────────────────────────────

test('CSS keeps a double slash, because CSS has no line comments', () => {
  // global.css carries https:// inside url(). Treating it as a comment deletes
  // the rest of the declaration — the same fault, pointed the other way.
  const src = 'a{background:url(https://x.test/i.png)}\n/* gone */\nb{color:red}'
  const out = stripCss(src)
  assert.match(out, /url\(https:\/\/x\.test\/i\.png\)/)
  assert.match(out, /b\{color:red\}/)
  assert.ok(!/gone/.test(out))
})

test('HTML copies script and style content through untouched', () => {
  // A closing marker inside an inline script's string must not swallow the
  // rest of the document.
  const src = '<!-- gone -->\n<script>var s = "-->"; var KEEP = 1</script>\n<p>KEEP_TOO</p>'
  const out = stripHtml(src)
  assert.ok(!/gone/.test(out), 'the HTML comment survived')
  assert.match(out, /var KEEP = 1/)
  assert.match(out, /KEEP_TOO/, 'a marker inside the script swallowed the document')
})

test('stripForPath dispatches on extension', () => {
  const withSlashes = 'a{background:url(https://x.test/i.png)}'
  assert.match(stripForPath('x.css', withSlashes), /https:\/\//)
  // The same text as JS: a double slash at that position IS a line comment.
  assert.ok(!/x\.test/.test(stripForPath('x.js', 'const a = 1\n//https://x.test\n')))
})

test('lineComments:false leaves a double slash alone in any source', () => {
  const src = '// kept\n/* gone */'
  const out = stripComments(src, { lineComments: false })
  assert.match(out, /kept/)
  assert.ok(!/gone/.test(out))
})

// ── The canary: measure the repository, not a fixture ────────────────────────
//
// The first version of this canary asked whether any file lost an implausibly
// long RUN of consecutive lines, bounded at 150. It was wrong, and mutation
// testing is what showed it: with the naive regex reinstated, ColorStudio.jsx
// loses 1003 lines — and the longest CONSECUTIVE run is 62, because every blank
// line inside the eaten region resets the counter. The bound was never reached,
// so the canary sat green through the exact regression it was written for.
//
// A ratio bound is no better. This codebase is deliberately heavily commented:
// with the CORRECT stripper, communityDesigns.js is 75% comment lines and five
// more files are over 60%. The naive form's 1003 lines of ColorStudio is 38% of
// that file — indistinguishable from an honest comment ratio.
//
// So measure the thing that is actually true: the correct stripper must eat
// LESS than the broken one on the files that contain the breaking pattern. That
// is a property no regression can satisfy, because a regression makes the two
// agree.

/** The form this module replaced, kept here as the thing to be better than. */
const blank = (s) => s.replace(/[^\n]/g, ' ')
const naiveStrip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .replace(/^[ \t]*\/\/.*$/gm, blank)

const blankedLines = (raw, stripped) => {
  const before = raw.split('\n')
  const after = stripped.split('\n')
  let n = 0
  for (let i = 0; i < before.length; i += 1) {
    if (before[i].trim() && !(after[i] || '').trim()) n += 1
  }
  return n
}

test('the module eats less of the real source than the regex it replaced', () => {
  const files = walk(path.join(ROOT, 'src'), /\.jsx?$/)
  assert.ok(files.length > 100, `expected the app's source, found ${files.length} files`)

  const gaps = []
  const worse = []
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const good = blankedLines(raw, stripJs(raw))
    const bad = blankedLines(raw, naiveStrip(raw))
    if (bad > good) gaps.push([bad - good, path.relative(ROOT, file)])
    if (good > bad) worse.push(`${path.relative(ROOT, file)}: ${good} vs ${bad}`)
  }

  // Direction first: this module must never eat MORE than the naive form
  // anywhere. Over-stripping is the failure that fails green.
  assert.deepEqual(worse, [],
    'This module blanked more lines than the regex it replaced, which is the failure '
    + 'direction that turns a red test green:\n  ' + worse.join('\n  '))

  // Then MAGNITUDE — somewhere in the tree, not in a file named here.
  //
  // This assertion used to name src/pages/ColorStudio.jsx and the
  // `accept="image/*"` attribute inside it, which was where the fault was first
  // measured (correct 385, naive 1003, a gap of 618). That attribute is gone:
  // the file was reworked into the Design System Builder walkthrough and lost
  // half its length, so the assertion went red on 2026-09-10 for a reason that
  // had nothing to do with the stripper.
  //
  // The property being guarded is about the STRIPPER, so it asks the tree. A
  // regression to the naive walk makes the two agree EVERYWHERE, so the biggest
  // gap anywhere collapsing to nothing is the signal, and no single file's
  // refactor can produce it.
  gaps.sort((a, b) => b[0] - a[0])
  const [worstGap, worstFile] = gaps[0] || [0, '(none)']
  assert.ok(worstGap > 100,
    `the largest gap anywhere in src/ is ${worstGap} lines (${worstFile}). `
    + 'Measured 2026-09-10: 178 in src/utils/brandGuidelines.js. A collapse toward '
    + 'zero means the string-aware walk has been lost and this module has '
    + 'regressed to the regex it replaced.')

  // And breadth, so the guard is not resting on one file. Measured 2026-09-10:
  // 19 files across src/ contain a pattern the naive form mis-reads, together
  // worth 3,165 lines of source that a naive scan cannot see.
  assert.ok(gaps.length >= 10,
    `only ${gaps.length} files differ between the two strippers; the measured figure `
    + 'was 19 on 2026-09-10 (14 when this test was written). A sharp drop means this '
    + 'module stopped protecting them.')
})

test('longestBlankedRun still reports what it claims, even though it is not the canary', () => {
  // Kept and tested because the module exports it, and an exported function
  // nothing verifies is the next thing to quietly stop working. It measures
  // CONSECUTIVE blanked lines — which is why it was the wrong tool above.
  const raw = ['code', '/* a', ' b', ' c */', 'code'].join('\n')
  assert.equal(longestBlankedRun(raw, stripJs(raw)), 3)
  const gapped = ['code', '/* a */', '', '/* b */', 'code'].join('\n')
  assert.equal(longestBlankedRun(gapped, stripJs(gapped)), 1,
    'a blank line between two comments must reset the run — this is the behaviour '
    + 'that made it useless as a canary, so it is pinned deliberately')
})
