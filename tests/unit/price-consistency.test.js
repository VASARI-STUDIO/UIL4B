// One ladder, quoted identically everywhere. The founder's requirement, from
// the 2026-08-20 batch, was "make sure anywhere you show pricing you show the
// same pricing."
//
// Half of that is already guarded. tests/unit/price-ladder.test.js ties
// src/config/planLadder.js to api/_lib/pricing.js, so the client fallback and
// the server fallback cannot drift apart.
//
// This file guards the other half: the amounts a visitor actually reads. Those
// live in JSX, and at least one surface types them by hand. src/pages/Home.jsx
// carries a second, hand-keyed copy of the ladder in its `PRICE_LADDER`
// constant, and the comment above it explains why — the price service knows
// only monthly and yearly, so reading half the panel live and hard-coding the
// other half would put two different numbers for the same plan on one page.
// That decision stands. The problem was never that the panel is hard-coded; it
// is that the hard-coding was unverified. Nothing made the typed $7 and the
// ladder's $7 stay the same $7.
//
// So: walk src/, find every price-shaped string a user could read, and require
// each one to be an amount the ladder can actually produce.
//
// ── Design notes, because the obvious version of this test is worthless ──────
//
// SCANNED BY SHAPE, NOT BY FILENAME. This deliberately does NOT assert on
// Home.jsx. That page is being redesigned in a separate tool; if the panel
// moves to a new component, or a future surface quotes a price, the guard has
// to pick it up on its own. A test pinned to today's filenames would go quiet
// at exactly the moment it was needed.
//
// THE LADDER IS IMPORTED, NOT SCRAPED. planLadder.js carries an explicit .js
// on its own import so plain Node ESM can load it. The allowed amounts are
// computed by the module's own arithmetic — resolvePlanLadder() and
// formatMoney() — rather than re-derived here. Re-implementing the rounding is
// how two copies drift in the first place.
//
// COMMENTS ARE STRIPPED FIRST. Several files, planLadder.js loudest among them,
// discuss the ladder in prose. A comment that mentions $7 is not a price shown
// to a user, and matching it would make this test pass for the wrong reason.
// The stripper is string-aware for a reason recorded in its own comment.
//
// THE ALLOWLIST IS KEYED ON FILE **AND** CONTEXT, never on the amount. The app
// renders fake money inside UI mock-ups — an order summary in PaletteBuilder
// and UiSystemLab — and those mock-ups contain $18 and $84 and $110. $18 is a
// real ladder amount. An allowlist that said "ignore $18" would punch a hole in
// the guard on the exact tier it was meant to protect, so every entry below
// names a file and a surrounding context and says why.
//
// TWO ENTRIES CAME OFF THIS LIST when the surfaces they excused turned out to
// be unreachable and were deleted: src/components/UIPreviewModal.jsx (a
// specimen pricing card in a preview modal nothing rendered) and
// src/pages/ColorStudio.jsx (a fake analytics dashboard in the "see it shipped"
// preview scenes, which no shipped route could reach). Neither removal had to
// be remembered. "No allowlist entry outlives the thing it excuses" at the foot
// of this file failed on both the moment the markup went, which is exactly what
// a file-keyed allowlist needs: a stale entry never fires, so it cannot
// announce itself, and it would sit there excusing $18 in a file that no longer
// exists until something recreated that path.
//
// IT FAILS LOUDLY IF IT MATCHES NOTHING. This repository has been bitten twice
// by scanning tests that silently matched zero files and passed green. The
// population assertions below are not boilerplate.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  APPROVED_CURRENCY,
  PLAN_LADDER,
  formatMoney,
  resolvePlanLadder,
} from '../../src/config/planLadder.js'
import { PRICE_SYMBOLS } from '../../src/utils/currency.js'
import { stripComments } from '../helpers/strip-comments.js'

const REPO = process.cwd()
const SRC = path.join(REPO, 'src')

// .js and .jsx are where prices are written. .css is scanned because a
// `content:` rule can put text on screen, and .json because src/locales/*.json
// used to carry dead "price" keys quoting $4.99 — the very drift that started
// all of this.
const SCANNED = /\.(?:jsx?|css|json)$/

// ── THE INTERNAL BOARDS ARE PROSE, NOT A SURFACE ────────────────────────────
//
// This file already strips comments before scanning, and says why: "a comment
// that mentions $7 is not a price shown to a user, and matching it would make
// this test pass for the wrong reason." src/data/pipeline.js and
// src/data/moduleBoard.js are that same prose in a string literal instead of a
// comment — the engineering backlog and the module status board — and the
// stripper has no way to tell the difference, so they were being scanned.
//
// They are not shown to anyone. tests/unit/admin-chunk-carries-no-backlog.test.js
// proves they reach no client chunk at all; the founder reads them through
// GET /api/ai?backlog=1 behind requireAdmin(). A price in a note is a record of
// what something cost, not an offer. tests/unit/no-orphan-routes.test.js
// excludes the same two files for the same reason, in its words: "a route is
// not reachable because we wrote about it."
//
// MEASURED 2026-09-16, and this is why it matters rather than being tidy.
// Across src/, 28 price-shaped strings; 7 of them were in ONE pipeline.js row
// ($48, $48.00, $4.00 — a note about a yearly total), and all 7 survived the
// allowlist and were counted as CHECKED. The "checked >= 6" floor at the foot
// of this file — the assertion whose whole job is to prove the guard still has
// teeth — was therefore being held up by a backlog note. The two prices this
// guard actually compares against the ladder on a rendered surface are in
// Plans.jsx and Settings.jsx, and there are two of them.
//
// That came to light because the boards left the repository on 2026-09-16 (the
// founder's decision; .gitignore carries it), so CI runs without them and the
// floor failed. The floor was wrong before they left, and is honest now.
const NOT_A_SURFACE = new Set([
  path.join(SRC, 'data', 'pipeline.js'),
  path.join(SRC, 'data', 'moduleBoard.js'),
])

const rel = (file) => path.relative(REPO, file).split(path.sep).join('/')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    if (NOT_A_SURFACE.has(full)) return []
    return SCANNED.test(entry.name) ? [full] : []
  })
}

// Currency symbols, inverted out of the app's own table so a newly supported
// currency is scanned without editing this file. Only the single-character
// symbols are usable as a scan trigger: 'A$', 'NZ$', 'C$' and 'S$' all end in
// '$' and are therefore caught anyway, and 'Fr' cannot be told apart from prose.
const CURRENCY_OF_SYMBOL = Object.fromEntries(
  Object.entries(PRICE_SYMBOLS)
    .filter(([, symbol]) => symbol.length === 1)
    .map(([code, symbol]) => [symbol, code]),
)

// A currency symbol followed by a number. The digit run may not end on a
// comma — without that, "$4," in prose reads as the amount "$4,". The k/m
// suffix is captured so a match like "$48.2k" is reported as what it is rather
// than silently truncated to "$48.2".
const PRICE = new RegExp(
  `[${Object.keys(CURRENCY_OF_SYMBOL).map((s) => `\\${s}`).join('')}]`
  + '\\s?\\d(?:[\\d,]*\\d)?(?:\\.\\d{1,2})?[kKmM]?',
  'g',
)

// How much source either side of a match the allowlist's context regex sees.
const WINDOW = 400

// ── The stripper ────────────────────────────────────────────────────────────
//
// tests/helpers/strip-comments.js, which is where the ~40 lines that used to
// sit here now live — unchanged, and shared with the rest of the unit suite.
//
// The reasoning is kept in that module's header rather than duplicated: a
// naive `src.replace(/\/\*[\s\S]*?\*\//g, '')` reads the `/*` inside an
// `accept="image/*"` attribute as a comment opener and blanks everything to the
// next closing marker — 819 lines, and a price with them, when this guard was
// written. Nothing goes red; the scan simply stops being able to see.
//
// PROVEN EQUIVALENT before the copy was removed, on 2026-09-10: the private
// implementation and the shared one produced byte-identical output on all 635
// .js/.jsx/.css/.json files in src/, api/ and tests/, in BOTH lineComments
// modes — 1,270 comparisons, 0 differences. The canary below now exercises the
// shared module, so this file is one of the places a regression there is felt.


// ── What is genuinely not a plan price ──────────────────────────────────────
//
// Every entry names a FILE and a CONTEXT. Never an amount on its own: three of
// the fake amounts below ($18, $84 in one summary, $8 in another) sit in the
// same numeric neighbourhood as the ladder, and $18 IS the quarterly tier. An
// amount-keyed allowlist would blind the guard to the tier it was written for.
//
// If you are adding an entry, the question to answer in `why` is not "why does
// this fail" but "why is this number not something a user could mistake for
// what we charge."
const NOT_A_PLAN_PRICE = [
  {
    file: 'src/components/UiSystemLab.jsx',
    context: /uis-checkout-grid|Order summary|Canvas field bag|Studio notebook|Standard delivery/,
    why: 'CommerceScene renders a fake checkout so the generated UI system can be '
      + 'seen on a realistic surface. The order totals are set dressing for a bag '
      + 'and a notebook, not tiers of UIL4B.',
  },
  {
    // Was src/pages/PaletteBuilder.jsx until 2026-09-11, when the preview block
    // moved to its own module. The entry follows the code rather than being
    // widened to cover both files — "no allowlist entry outlives the thing it
    // excuses" below is what forced the choice, and it is the right one: an
    // allowlist naming a file that no longer renders fake money is an excuse
    // with nothing behind it.
    file: 'src/components/palette/PalettePreview.jsx',
    context: /plb-pv-checkout|plb-pv-finance|Order summary|Canvas field bag|Studio notebook|Available balance|Recent transactions/,
    why: 'The palette preview scenes — "Commerce checkout" and "Finance overview" — '
      + 'are mock-ups a palette is judged against. Same fake order as UiSystemLab, '
      + 'plus an invented account balance.',
  },
  {
    file: 'src/components/spectrum/SpectrumBench.jsx',
    context: /SURFACE AND INK|Total £48\.00|Pay now/,
    why: 'The front door\'s Palette builder window, from the Spectrum design: '
      + 'a "Surface and ink" preview that paints the chosen surface and primary on a '
      + 'sample checkout ("Total £48.00", "Pay now"). Set dressing a palette is judged '
      + 'against, in pounds, and not a tier of UIL4B.',
  },
  {
    file: 'src/data/communityPrompts.js',
    // Excused only while the surrounding text says nothing about our own plans:
    // a prompt that quoted a UIL4B tier would still be checked against the ladder.
    context: /^(?![\s\S]*(?:UIL4B (?:Pro|plans?)|\/plans\b))/,
    why: 'Community prompts describe pages for invented businesses (a plumber\'s '
      + 'call-out fee, a restaurant\'s set menu, a builder\'s contract sums) and '
      + 'quote those businesses\' prices so the prompt yields a believable page. '
      + 'They are in the prompt text a user copies, not tiers of UIL4B.',
  },
  {
    file: 'src/pages/PaletteBuilder.jsx',
    context: /\.replace\(/,
    why: 'Not money at all: normaliseForFilter uses the character class /[$5]/ and '
      + 'the backreference "$1". A dollar sign in regex syntax is punctuation.',
  },
  {
    file: 'src/pages/IconLibrary.jsx',
    context: /\.replace\(/,
    why: 'Not money at all: normalizeCustomBase substitutes with the backreference '
      + '"$1" when rewriting an SVG stroke and fill.',
  },
  // FOUR MORE ENTRIES CAME OFF for the same reason, on 2026-09-06:
  // src/pages/DocsDesign.jsx, DocsMarketing.jsx, DocsSocial.jsx and
  // DocsThemes.jsx. They were unrouted, unimported draft Learn pages — absent
  // from every sourcemap in a production build — and the dead-source sweep
  // deleted them. As with the two above, the removal did not have to be
  // remembered: "no allowlist entry outlives the thing it excuses" went red on
  // all four the moment the files went, which is the third time that assertion
  // has paid for itself.
]

// ── The allowed amounts, computed from the ladder ────────────────────────────
function allowedLabels() {
  // No live prices, so every tier resolves to its approved fallback — the same
  // amount the app shows when /api/get-prices cannot answer, and the only
  // amount a hard-coded surface could ever legitimately match.
  const resolved = resolvePlanLadder()
  const monthly = resolved.find((plan) => plan.id === 'monthly')
  const labels = new Set()

  // $0. The Free tier is free by definition and no ladder change can move it,
  // so it is allowed everywhere rather than allowlisted per surface — Plans,
  // Settings, Onboarding and Landing all quote it.
  labels.add(formatMoney(0, APPROVED_CURRENCY))

  for (const plan of resolved) {
    // The total, e.g. "$48 billed yearly".
    labels.add(plan.totalLabel)
    // The per-month figure. $4 is legitimate because the module divides 48 by
    // 12 — this is why the arithmetic is imported rather than repeated.
    labels.add(plan.perMonthLabel)
    // What the copy is entitled to claim the tier saves over paying monthly,
    // e.g. "Save $3 a quarter" is 7 x 3 - 18.
    if (monthly && typeof monthly.perMonth === 'number' && typeof plan.total === 'number') {
      const saved = monthly.perMonth * plan.months - plan.total
      if (saved > 0) labels.add(formatMoney(saved, plan.currency))
    }
  }

  labels.delete(null)
  return labels
}

// Put a matched string into the same form formatMoney() emits, so "$4.00" and
// "$4" are one amount while "€4" stays a different one — we never hard-code a
// non-USD price, the service is the only source of those.
function normalise(text) {
  if (/[kKmM]$/.test(text)) return null
  const currency = CURRENCY_OF_SYMBOL[text[0]]
  const amount = Number(text.slice(1).replace(/[\s,]/g, ''))
  if (!currency || !Number.isFinite(amount)) return null
  return formatMoney(amount, currency)
}

function scan() {
  const files = walk(SRC)
  const occurrences = []

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    // CSS has no line comments; JSON has no comments at all, but running the
    // same string-aware pass over it is harmless and keeps one code path.
    const code = stripComments(raw, { lineComments: /\.jsx?$/.test(file) })
    const lines = raw.split('\n')
    for (const match of code.matchAll(PRICE)) {
      const line = code.slice(0, match.index).split('\n').length
      occurrences.push({
        file: rel(file),
        line,
        text: match[0],
        source: (lines[line - 1] || '').trim(),
        window: code.slice(
          Math.max(0, match.index - WINDOW),
          match.index + match[0].length + WINDOW,
        ),
      })
    }
  }
  return { files, occurrences }
}

function excusedBy(hit) {
  return NOT_A_PLAN_PRICE.find((entry) => entry.file === hit.file && entry.context.test(hit.window))
}

const report = (hit) => {
  const where = `${hit.file}:${hit.line}`
  const snippet = hit.source.length > 110 ? `${hit.source.slice(0, 110)}…` : hit.source
  return `  ${hit.text.padEnd(12)} ${where}\n      ${snippet}`
}

test('every price shown in src agrees with src/config/planLadder.js', () => {
  const allowed = allowedLabels()
  const { occurrences } = scan()
  const offenders = occurrences.filter((hit) => {
    if (excusedBy(hit)) return false
    const label = normalise(hit.text)
    return !(label && allowed.has(label))
  })

  assert.ok(offenders.length === 0,
    `${offenders.length} price${offenders.length === 1 ? '' : 's'} on screen `
    + 'disagree with the plan ladder:\n\n'
    + offenders.map(report).join('\n')
    + `\n\nThe ladder allows: ${[...allowed].sort().join(', ')}`
    + '\n(totals, per-month figures and savings-vs-monthly, computed from '
    + 'src/config/planLadder.js, plus $0 for the Free tier.)'
    + '\n\nEither the surface is quoting an amount we do not charge, or the ladder '
    + 'moved and this surface did not follow. Fix the surface, or — if the amount '
    + 'is not a plan price at all — add a file-and-context entry to '
    + 'NOT_A_PLAN_PRICE in this file with a reason. Never allowlist a bare amount.')
})

test('the scan sees a real population, so it cannot pass by finding nothing', () => {
  // Not boilerplate. A file-walking test that silently matches zero files is
  // green and worthless, and this repository has shipped that twice.
  const { files, occurrences } = scan()
  assert.ok(files.length >= 150,
    `expected to walk the whole of src/, found only ${files.length} files`)
  // 30 → 20 on 2026-09-06, and the reason matters more than the number. The
  // dead-source sweep deleted four unrouted Learn drafts whose mock-ups held 22
  // fake amounts, so the RAW population fell 51 → 29 and the old floor failed on
  // a tree that had lost no coverage at all. Measured either side, with the same
  // allowlist: files 300 → 283, occurrences 51 → 29, CHECKED 10 → 10. The
  // unchanged number is the one that matters — every price this guard actually
  // compares against the ladder is still here; what left was allowlisted mock
  // money in files nothing could render. The floor below is re-set against 29
  // with headroom, and `checked >= 6` underneath is untouched.
  //
  // 20 → 18 on 2026-09-16, when the two internal boards stopped being scanned
  // (see NOT_A_SURFACE at the top for why they never should have been). They
  // held 7 of the 28 hits, so the raw population is 21 and the old floor of 20
  // would have been one hit from failing on a tree that lost no coverage.
  assert.ok(occurrences.length >= 18,
    `expected src/ to be full of price-shaped strings, found only ${occurrences.length}`)

  // The stronger half of the bound: prices that were actually COMPARED, rather
  // than waved through by the allowlist. If this drops, either the app stopped
  // quoting prices in code or NOT_A_PLAN_PRICE has grown wide enough to swallow
  // the thing it was meant to leave exposed.
  //
  // 6 → 2 on 2026-09-16, AND THIS IS THE FLOOR BEING CORRECTED RATHER THAN
  // LOWERED. All 7 board hits were CHECKED — they are real ladder amounts
  // quoted inside one backlog note — so "six prices are still being compared"
  // was, for as long as it has existed, five prose mentions and one or two
  // surfaces. What the guard compares today is Plans.jsx and Settings.jsx: two
  // literal amounts, because every other surface now renders the ladder through
  // its own arithmetic instead of typing the number, which is the outcome this
  // whole file was arguing for.
  //
  // So two is the truth, and a floor that says two is worth more than a floor
  // of six that a note can satisfy. RAISE IT the day a surface starts quoting
  // an amount literally again; do not let it fall below two without asking
  // whether anything is being compared at all.
  const checked = occurrences.filter((hit) => !excusedBy(hit))
  assert.ok(checked.length >= 2,
    `only ${checked.length} price-shaped strings survived the allowlist to be checked `
    + 'against the ladder — the guard is close to guarding nothing')
})

test('the allowed set is derived from the ladder and is not empty', () => {
  const allowed = allowedLabels()
  assert.ok(allowed.size >= 6,
    `the ladder produced only ${allowed.size} allowed amounts (${[...allowed].join(', ')})`)
  for (const label of allowed) {
    assert.match(label, new RegExp(`^${PRICE.source}$`),
      `"${label}" is not price-shaped, so the scan could never match it`)
  }
  // Every tier has to contribute, or a tier has quietly stopped being covered.
  for (const plan of PLAN_LADDER) {
    assert.ok(allowed.has(formatMoney(plan.approvedTotal, APPROVED_CURRENCY)),
      `${plan.id}: its approved total is not in the allowed set`)
  }
})

test('the stripper removes comments and nothing else', () => {
  // The failure this exists for, measured while writing this file: a naive
  // `src.replace(/\/\*[\s\S]*?\*\//g, '')` read the `/*` inside ColorStudio's
  // `accept="image/*"` as an opening comment and blanked 819 lines, taking a
  // price with it. Nothing went red. The guard simply stopped looking at a
  // third of the file, which is the worst way for a test to fail.
  const strip = (src) => stripComments(src, { lineComments: true })

  // Removed: prose is not a price, however precisely it quotes one.
  assert.ok(!strip('/* the ladder is $7 monthly */').includes('$7'), 'block comment')
  assert.ok(!strip('  // the ladder is $7 monthly').includes('$7'), 'whole-line comment')
  assert.ok(!strip('const months = 1 // $7 every month').includes('$7'), 'trailing comment')

  // Kept: everything a user could actually read.
  assert.ok(strip("total: '$7 billed monthly'").includes('$7'), 'string literal')
  assert.ok(strip('<span>$7</span>').includes('$7'), 'JSX text')
  assert.ok(strip('const t = `from ${x} $7`').includes('$7'), 'template literal')

  // Kept, and these are the hostile ones: a slash-star or a double-slash that
  // is not a comment at all must not open one.
  assert.ok(strip('<input accept="image/*" />\nconst p = "$7"').includes('$7'),
    'an accept="image/*" attribute was read as an opening block comment — this is '
    + 'the exact bug that blanked 819 lines of ColorStudio.jsx')
  assert.ok(strip('u.replace(/https?:\\/\\//, "") + "$7"').includes('$7'),
    'an escaped forward slash inside a regex was read as the start of a line comment')
  assert.ok(strip('const u = "https://uil4b.com"; const p = "$7"').includes('$7'),
    'the // in a URL inside a string was read as the start of a line comment')

  // Line numbers have to survive, or a failure message points at the wrong code.
  const sample = 'a\n/* two\nline */\nb'
  assert.equal(strip(sample).split('\n').length, sample.split('\n').length,
    'the stripper changed the line count, so reported line numbers are wrong')
})

test('no file loses a large block of code to the stripper', () => {
  // A repo-wide canary for the same bug, since the stripper failing silently is
  // the whole danger. The longest genuine comment in src/ is 49 lines; the
  // ColorStudio miss blanked 819. Anything past 150 consecutive content lines
  // is the stripper eating code, not prose.
  const overrun = []
  for (const file of walk(SRC)) {
    const raw = fs.readFileSync(file, 'utf8')
    const code = stripComments(raw, { lineComments: /\.jsx?$/.test(file) })
    const before = raw.split('\n')
    const after = code.split('\n')
    let run = 0
    let worst = 0
    for (let i = 0; i < before.length; i += 1) {
      const had = before[i].trim().length > 0
      const has = (after[i] || '').trim().length > 0
      if (had && !has) { run += 1; worst = Math.max(worst, run) } else run = 0
    }
    if (worst > 150) overrun.push(`${rel(file)} (${worst} lines blanked)`)
  }
  assert.deepEqual(overrun, [],
    'the stripper blanked a run of lines far longer than any real comment in this '
    + 'repository, which means it is eating code and the scan is running blind there')
})

test('no allowlist entry outlives the thing it excuses', () => {
  // A stale entry is a permanent hole. If a mock-up is deleted or reworded, the
  // entry that excused it has to go with it.
  const { occurrences } = scan()
  const used = new Set(occurrences.map(excusedBy).filter(Boolean))
  const dead = NOT_A_PLAN_PRICE.filter((entry) => !used.has(entry))
  assert.deepEqual(dead.map((entry) => `${entry.file} ${entry.context}`), [],
    'these NOT_A_PLAN_PRICE entries no longer excuse anything. Delete them — an '
    + 'allowlist entry with nothing behind it is a hole waiting for a future price.')
})
