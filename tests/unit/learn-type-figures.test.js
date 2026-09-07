// The two typography guides publish numbers, and the /learn hero promises that
// every figure in a guide is either cited to a linked clause or computed.
//
// tests/unit/learn-articles.test.js guards the JOINS between the registry, the
// prose, the page and the nav; tests/unit/learn-figures.test.js recomputes the
// arithmetic in the two colour guides. Neither says anything about these two,
// and nothing in the build ever would: a wrong aspect value or a stale weight
// range reads exactly like a right one.
//
// So this file does for /learn/typeface-metrics and /learn/font-loading what
// learn-figures.test.js does for the colour pair. The arithmetic is WRITTEN OUT
// here rather than imported — the adjusted-font-size formula, the unicode-range
// interval arithmetic, the weight span — and every number in either guide is
// matched against the result. The product's own facts (the font stacks, the
// declared weight ranges, the four @font-face rules and their character ranges)
// are read back out of src/styles/global.css rather than trusted, which is the
// arrangement the colour guides use for their hexes.
//
// Four failure modes it exists for, all of which would ship green today:
//
//   1. A COPY EDIT THAT ROUNDS. "19.51px" becoming "19.5px" breaks the one
//      thing the worked example is for, and reads better.
//   2. A FONT THAT MOVES. Both guides describe the faces global.css declares.
//      Swapping a family, changing a weight range or re-cutting a subset leaves
//      the prose behind as confident, checkable, wrong.
//   3. A SPEC FIGURE ESCAPING ITS CITATION. "3s", "100ms" and the four Text
//      Spacing multiples are the standards' numbers, not this product's. Stated
//      outside the block that quotes them they become remembered statistics,
//      which is the exact failure this surface exists to avoid.
//   4. A MEASURED TABLE UNWIRED. A component that stops reading the running
//      stylesheet and starts reading a constant passes every render assertion.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { proseOf } from '../../scripts/learn-wordcount.mjs'

/* ── the files under test ────────────────────────────────────────────────── */

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8')
const css = read('src', 'styles', 'global.css')
const metricsSource = read('src', 'data', 'learn', 'typefaceMetrics.jsx')
const loadingSource = read('src', 'data', 'learn', 'fontLoading.jsx')
const metricsTable = read('src', 'components', 'TypeMetricsTable.jsx')
const faceTable = read('src', 'components', 'FontFaceTable.jsx')
const shiftTable = read('src', 'components', 'FallbackShiftTable.jsx')

const metricsProse = proseOf(metricsSource)
const loadingProse = proseOf(loadingSource)

/** The prose with every citation removed — what the guide says in its own voice. */
const uncited = (source) => proseOf(source.replace(/<Spec[\s\S]*?<\/Spec>/g, ' '))

/* ── the product's own type facts, read out of global.css ────────────────── */

/** Every @font-face rule in global.css, parsed. */
function fontFaces() {
  return [...css.matchAll(/@font-face\{([^}]*)\}/g)].map(([, body]) => {
    const value = (name) => {
      const found = new RegExp(`${name}\\s*:\\s*([^;}]+)`).exec(body)
      assert.ok(found, `an @font-face rule in global.css no longer declares ${name}`)
      return found[1].trim()
    }
    return {
      family: value('font-family').replace(/^['"]|['"]$/g, ''),
      weight: value('font-weight'),
      display: value('font-display'),
      range: value('unicode-range'),
      src: value('src'),
    }
  })
}

/**
 * One custom property off the :root block, so a theme block cannot answer
 * instead.
 *
 * Comments are stripped first, and that is not tidiness: the type block in
 * global.css carries a long note that opens "--font: the same Manrope face,
 * named for the job it does". Searching the raw block finds the SENTENCE ABOUT
 * the token before the token, and the first version of this helper returned
 * "the same Manrope face" as the value of --font.
 */
function rootToken(name) {
  const at = css.indexOf(':root{')
  assert.ok(at !== -1, 'global.css no longer opens with a :root block')
  const block = css.slice(at, css.indexOf('}', at)).replace(/\/\*[\s\S]*?\*\//g, ' ')
  const found = new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(block)
  assert.ok(found, `${name} is not declared on :root any more`)
  return found[1].trim()
}

/** The first family in a CSS font stack, unquoted. */
const firstFamily = (stack) => stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '')

/**
 * The [start, end] intervals a unicode-range value covers, written out here
 * rather than imported from the component the guide renders — the point is to
 * disagree with it if it is wrong.
 */
function intervalsOf(range) {
  return range.split(',').map((raw) => {
    const token = raw.trim().replace(/^[Uu]\+/, '')
    if (token.includes('-')) {
      const [a, b] = token.split('-')
      return [parseInt(a, 16), parseInt(b, 16)]
    }
    if (token.includes('?')) {
      return [parseInt(token.replace(/\?/g, '0'), 16), parseInt(token.replace(/\?/g, 'F'), 16)]
    }
    return [parseInt(token, 16), parseInt(token, 16)]
  })
}

const codepointsOf = (range) => {
  const set = new Set()
  for (const [lo, hi] of intervalsOf(range)) {
    assert.ok(Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo, `unparseable range: ${range}`)
    for (let c = lo; c <= hi; c += 1) set.add(c)
  }
  return set
}

test('the guides under test are the ones that are published', () => {
  // Every assertion below reads two files off disk by name. If a guide were
  // renamed the reads would throw, but if the REGISTRY stopped carrying them
  // the files would still be there and every check here would pass while
  // nothing rendered. That is the vacuous pass this catches.
  const slugs = LEARN_ARTICLES.map((a) => a.slug)
  assert.ok(slugs.includes('typeface-metrics'), 'typeface-metrics is not a registered article')
  assert.ok(slugs.includes('font-loading'), 'font-loading is not a registered article')
  assert.ok(metricsProse.length > 3000 && loadingProse.length > 3000, 'a guide lost most of its prose')
})

/* ── What a typeface’s metrics decide ────────────────────────────────────── */

// The CSS Fonts worked example. Both figures are the SPECIFICATION's, quoted in
// the paragraph that attributes them; the third number is what they produce.
const VERDANA_ASPECT = 0.545
const TIMES_ASPECT = 0.447
const AT_PX = 16

test('the worked adjustment prints the size the formula actually produces', () => {
  const adjusted = (VERDANA_ASPECT / TIMES_ASPECT) * AT_PX
  assert.equal(adjusted.toFixed(2), '19.51')

  // Asserted as the PRINTED LINES rather than as bare figures. 0.545 appears
  // twice in this guide — once in the sentence that attributes it and once in
  // the block — so an `includes` on the figure alone is satisfied by whichever
  // copy a mutation has not touched.
  const lines = [
    `c = ( ${VERDANA_ASPECT} / ${TIMES_ASPECT} ) × ${AT_PX}px`,
    `c = ${adjusted.toFixed(2)}px`,
  ]
  for (const line of lines) {
    assert.ok(metricsSource.includes(line), `the worked example no longer prints "${line}"`)
  }

  // And the sentence that reads the block back to the reader quotes the gap it
  // opened up, which is the point of the example rather than a decoration.
  assert.equal(Math.round((adjusted - AT_PX) * 2) / 2, 3.5,
    `the adjustment now opens a gap of ${(adjusted - AT_PX).toFixed(2)}px, not three and a half`)
  assert.match(metricsProse, /Three and a half pixels/)

  // The two aspect values are the specification's, and the guide must say so
  // rather than presenting them as measurements of its own. Asserted on the
  // SOURCE, not on proseOf's output: proseOf drops HTML entities, so the
  // curly apostrophe in "specification's" is not in the prose it returns.
  assert.ok(metricsSource.includes('specification&rsquo;s own worked example'),
    'the guide no longer attributes the two aspect values to the specification')
  assert.match(metricsProse, new RegExp(`aspect value of ${VERDANA_ASPECT}`))
  assert.match(metricsProse, new RegExp(`gives ${TIMES_ASPECT}`))
})

test('THE ONE THAT MATTERS: the metrics table measures the running stylesheet', () => {
  // Not a check of the measurement — a check that the CALL is still the one the
  // guide describes. A component that stops reading --font and starts holding a
  // constant renders an identical-looking table of numbers about nothing.
  assert.match(metricsTable, /getComputedStyle\(document\.documentElement\)/,
    'TypeMetricsTable no longer reads the running stylesheet')
  assert.match(metricsTable, /varName: '--font'/, 'TypeMetricsTable no longer measures --font')
  assert.match(metricsTable, /varName: '--mono'/, 'TypeMetricsTable no longer measures --mono')
  assert.match(metricsTable, /detectCanvasFontRendered\(ctx, name\) !== true/,
    'TypeMetricsTable no longer confirms the family rendered before reporting it')
  assert.match(metricsTable, /actualBoundingBoxAscent/,
    'TypeMetricsTable no longer reads ink extents off the canvas')
  assert.match(metricsTable, /measureText\('x'\)/, 'TypeMetricsTable no longer measures an x')
  assert.match(metricsTable, /measureText\('H'\)/, 'TypeMetricsTable no longer measures an H')
  // The matched-size column is the guide's formula, so its reference size has
  // to be the size the guide works the example at.
  assert.ok(metricsTable.includes(`const AT_PX = ${AT_PX}`),
    `TypeMetricsTable matches at a different size from the ${AT_PX}px the guide works`)
})

test('THE PRECISION ONE: the em is large enough for the decimals the table prints', () => {
  // Found in a browser, not here, and it is the reason this test exists.
  //
  // The table was measured at 100px and printed three decimal places. At 100px
  // Chromium returns the ink extents ALREADY ROUNDED to whole pixels — Manrope's
  // x came back as exactly 54 — so every ratio was a multiple of 0.01 and the
  // third decimal place was always a zero this component had invented. The
  // figures looked more precise than the measurement behind them, which on a
  // surface whose promise is that its figures are checkable is the worst kind of
  // wrong: checkable, and false in the last digit.
  //
  // So this does not check that EM is 1000. It checks the RELATIONSHIP: an ink
  // extent resolved to one pixel at an em of E supports log10(E) decimal places
  // in the ratio, so the em must be at least 10^(places printed). Raising the
  // precision without raising the em fails here, and so does lowering the em.
  const em = Number(/const EM = (\d+)/.exec(metricsTable)?.[1])
  assert.ok(Number.isFinite(em) && em > 0, 'TypeMetricsTable no longer declares an em to measure at')

  const printed = [...metricsTable.matchAll(/r\.(?:aspect|cap)\.toFixed\((\d+)\)/g)].map(([, n]) => Number(n))
  assert.ok(printed.length >= 2,
    'TypeMetricsTable no longer prints the two measured ratios — this check has nothing to guard')

  for (const places of printed) {
    assert.ok(em >= 10 ** places,
      `TypeMetricsTable prints ${places} decimal places from a measurement taken at ${em}px.`
      + ` One pixel of ink at that em is ${(1 / em).toFixed(6)} of an em, so the last`
      + ` ${places - Math.log10(em)} digit(s) cannot be measured and would be invented.`
      + ` Measure at ${10 ** places}px or print ${Math.log10(em)} places.`)
  }

  // A positive control on the arithmetic above: the em that was actually wrong
  // must be rejected by the same rule that accepts the one in the file.
  assert.equal(100 >= 10 ** 3, false, 'the rule this test applies would have passed the defect it exists for')
  // And the guide renders it. A measured table nobody mounts proves nothing.
  assert.match(metricsSource, /<TypeMetricsTable \/>/, 'the guide no longer renders TypeMetricsTable')
  assert.match(metricsSource, /import TypeMetricsTable from '\.\.\/\.\.\/components\/TypeMetricsTable'/)
})

test('the weight range the guide quotes is the one global.css declares', () => {
  const bodyFamily = firstFamily(rootToken('--font'))
  const face = fontFaces().find((f) => f.family === bodyFamily)
  assert.ok(face, `global.css declares no @font-face for ${bodyFamily}, the family --font asks for first`)

  const [low, high] = face.weight.split(/\s+/).map(Number)
  assert.equal(low, 200)
  assert.equal(high, 800)
  // The two derived figures in the sentence, recomputed. font-weight accepts
  // 1 through 1000, so the span the property allows is 999 units wide.
  assert.equal(high - low, 600, `the declared weight span is now ${high - low} units`)
  assert.equal(1000 - 1, 999)

  assert.match(metricsProse, new RegExp(`font-weight: ${low} ${high}`),
    `the guide no longer quotes the declared range ${low} ${high}`)
  assert.match(metricsProse, new RegExp(`${high - low} units of the ${1000 - 1}`),
    'the guide no longer states the span the declared range covers')
})

/* ── What the reader sees before the font arrives ────────────────────────── */

test('the inventory the guide describes is the inventory global.css declares', () => {
  const faces = fontFaces()
  assert.equal(faces.length, 4, `global.css now declares ${faces.length} @font-face rules`)
  const families = [...new Set(faces.map((f) => f.family))]
  assert.equal(families.length, 2, `global.css now declares ${families.length} families`)
  assert.match(loadingProse, /Two families, four rules/)

  for (const family of families) {
    const pair = faces.filter((f) => f.family === family)
    assert.equal(pair.length, 2, `${family} is no longer split into two files`)
    const starts = pair.map((f) => intervalsOf(f.range)[0][0]).sort((a, b) => a - b)
    assert.equal(starts[1], 0x100,
      `${family}'s second file no longer starts at U+0100 but at U+${starts[1].toString(16)}`)
  }
  assert.match(loadingProse, /each family split at U\+0100/)
})

test('every face declares the display policy the guide says it does', () => {
  const displays = [...new Set(fontFaces().map((f) => f.display))]
  assert.deepEqual(displays, ['swap'],
    `the faces now declare ${displays.join(', ')}, not swap alone`)
  assert.match(loadingProse, /Every face declared on this page uses/)
})

test('THE OTHER ONE THAT MATTERS: the two subsets share exactly the code points named', () => {
  // The guide states a count and then names what is in it. Both halves are
  // recomputed: a re-subset that changes the overlap makes the sentence wrong
  // in a way no reviewer would ever see.
  const faces = fontFaces()
  const families = [...new Set(faces.map((f) => f.family))]
  const expected = [0x131, 0x152, 0x153, 0x304, 0x308, 0x329, 0x2020]

  for (const family of families) {
    const [a, b] = faces.filter((f) => f.family === family).map((f) => codepointsOf(f.range))
    const shared = [...a].filter((c) => b.has(c)).sort((m, n) => m - n)
    assert.deepEqual(shared, expected,
      `${family}'s two subsets now share ${shared.map((c) => `U+${c.toString(16).toUpperCase()}`).join(' ')}`)
  }

  assert.equal(expected.length, 7)
  assert.match(loadingProse, /Seven code points appear in both/)
  // And the sentence that lists them has to still be listing these. One dotless
  // i, two ligatures, three combining marks and a dagger.
  assert.match(loadingProse, /the dotless i, the Œ and œ ligatures, three combining marks, and the dagger/)
  assert.deepEqual(expected.filter((c) => c >= 0x300 && c <= 0x36f), [0x304, 0x308, 0x329],
    'the shared combining marks are no longer three')
  assert.ok(expected.includes(0x131), 'U+0131, the dotless i, is no longer shared')
  assert.deepEqual(expected.filter((c) => c === 0x152 || c === 0x153), [0x152, 0x153],
    'the OE ligatures are no longer both shared')
  assert.ok(expected.includes(0x2020), 'U+2020, the dagger, is no longer shared')
})

test('the two loading tables measure rather than restate', () => {
  assert.match(faceTable, /rule instanceof CSSFontFaceRule/,
    'FontFaceTable no longer reads @font-face rules out of the CSSOM')
  assert.match(faceTable, /getPropertyValue\('unicode-range'\)/,
    'FontFaceTable no longer reads each rule’s own character range')
  assert.match(faceTable, /getPropertyValue\('font-display'\)/,
    'FontFaceTable no longer reads each rule’s own display policy')
  assert.match(faceTable, /document\.fonts\?\.check\(/,
    'FontFaceTable no longer asks whether the file has been downloaded')
  assert.match(faceTable, /sizeOf\(intervals\)/,
    'FontFaceTable no longer computes the code-point count from the range')

  assert.match(shiftTable, /getPropertyValue\('--font'\)/,
    'FallbackShiftTable no longer reads the declared stack')
  assert.match(shiftTable, /detectCanvasFontRendered\(ctx, unquote\(entries\[0\]\)\) !== true/,
    'FallbackShiftTable no longer confirms the webfont rendered before comparing against it')
  assert.match(shiftTable, /ctx\.measureText\(SAMPLE\)\.width/,
    'FallbackShiftTable no longer measures the sample')
  assert.match(shiftTable, /entries\.slice\(1\)/,
    'FallbackShiftTable no longer paints the stack with its webfont removed')

  assert.match(loadingSource, /<FallbackShiftTable \/>/, 'the guide no longer renders FallbackShiftTable')
  assert.match(loadingSource, /<FontFaceTable \/>/, 'the guide no longer renders FontFaceTable')
})

/* ── the rule the surface is held to ─────────────────────────────────────── */

test('no standards figure is stated outside the block that cites it', () => {
  // These are the specifications' numbers, not this product's. A guide may
  // quote them inside a <Spec> with a link to the clause, and may reason about
  // them; the moment one appears in a bare paragraph it is a remembered
  // statistic, which is what the /learn hero hint promises there are none of.
  const quotedOnly = [
    ['3s', /\b3s\b/],
    ['100ms', /\b100ms\b/],
    ['200 percent', /\b200 percent\b/],
    ['1.5 times the font size', /\b1\.5 times\b/],
    ['0.12 times the font size', /\b0\.12 times\b/],
    ['0.16 times the font size', /\b0\.16 times\b/],
    ['the 1000 end of font-weight', /\bequal to 1000\b/],
  ]
  for (const [name, pattern] of [...quotedOnly]) {
    for (const [slug, source] of [['typeface-metrics', metricsSource], ['font-loading', loadingSource]]) {
      assert.equal(pattern.exec(uncited(source)), null,
        `${slug} states "${name}" outside a <Spec> — it is a standard's figure and has to carry its clause`)
    }
  }

  // A positive control: the figures ARE in the guides, inside their citations,
  // so the loop above is not passing because the guides stopped citing anything.
  assert.match(metricsProse, /200 percent/)
  assert.match(metricsProse, /1\.5 times/)
  assert.match(loadingProse, /\b3s\b/)
  assert.match(loadingProse, /\b100ms\b/)
})

test('every CLAUSE either guide quotes is listed as one of its sources', () => {
  // This compared BASE URLs in its first form, and a mutation survived it:
  // dropping the size-adjust source from font-loading changed nothing, because
  // the guide's other Level 5 source carried the same base. A reader following
  // the sources list would have found no way to reach the clause the page had
  // just quoted. So the comparison is now on the FULL URL, fragment and all —
  // one entry per clause, not per specification.
  //
  // Normalised only for the slash before the fragment: a guide writes a clause
  // as `${FONTS4}/#anchor`, so the constant has no trailing slash and the href
  // in the sources list does.
  const clause = (href) => href.replace(/\/+#/, '#')

  for (const slug of ['typeface-metrics', 'font-loading']) {
    const article = LEARN_ARTICLES.find((a) => a.slug === slug)
    const source = slug === 'typeface-metrics' ? metricsSource : loadingSource
    const listed = new Set(article.sources.map((s) => clause(s.href)))
    const cited = [...source.matchAll(/href=\{`\$\{([A-Z0-9]+)\}([^`]*)`\}/g)]
    assert.ok(cited.length >= 3, `${slug} carries fewer than three linked clauses`)

    for (const [, constant, fragment] of cited) {
      const declared = new RegExp(`const ${constant} = '([^']+)'`).exec(source)
      assert.ok(declared, `${slug} links through ${constant}, which it does not declare`)
      const full = clause(`${declared[1]}${fragment}`)
      assert.ok(listed.has(full),
        `${slug} quotes ${full}, which is not one of its sources — a reader following the`
        + ' list cannot reach the clause the page just put in front of them')
    }

    // A positive control on the loop: it must be comparing something, and the
    // set it compares against must not be empty.
    assert.ok(listed.size >= 3, `${slug} lists fewer than three sources to check against`)
    assert.ok([...cited].some(([, , fragment]) => fragment.includes('#')),
      `${slug} quotes no clause with a fragment, so the check above is comparing bases again`)
  }
})
