// The prompt card preview: its timing helper, and the WIRING that puts it on
// the page.
//
// The helper half is cheap and would pass on its own even if PromptCard never
// called it — which is the exact failure this repo has shipped twice, a correct
// fix with a test that exercised the helper in isolation, so reverting the real
// call site left the whole suite green. The rendered half of this feature lives
// in tests/user-sim/45-prompt-library-gate (the gate, driven through search,
// sort and every category chip) and 54-prompt-preview-motion (the motion
// contract in both directions). What is left for this file is the shape of the
// source and the stylesheet, which those two cannot see cheaply.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  PREVIEW_CHARS_PER_SECOND, PREVIEW_MAX_SECONDS, PREVIEW_MIN_SECONDS, previewDuration,
} from '../../src/utils/promptPreview.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'
import { stripJs as stripComments } from '../helpers/strip-comments.js'
// Reads the WHOLE app stylesheet, not global.css alone. The rules this file
// asserts on were split out of global.css into src/styles/deferred/*.css on
// 2026-09-13; a test that keeps reading one file after a lift like that does
// not go red, it goes VACUOUS. See tests/unit/appStylesheets.js.
import { ALL_CSS } from './appStylesheets.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
// Comments are stripped before matching. global.css and the components are full
// of prose describing these rules, and a rule could otherwise be "proved"
// present by the paragraph explaining it — the failure a previous mutation run
// found in tests/unit/input-specificity.test.js.

test('one pass is clamped at both ends, and junk input cannot produce NaN', () => {
  // A NaN reaching the custom property invalidates the whole `animation`
  // shorthand, which silently means no preview at all rather than a broken one.
  for (const junk of [undefined, null, 0, {}, [], NaN, Symbol.iterator]) {
    const v = previewDuration(junk)
    assert.ok(Number.isFinite(v), `previewDuration(${String(junk)}) returned ${v}`)
    assert.equal(v, PREVIEW_MIN_SECONDS)
  }
  assert.equal(previewDuration(''), PREVIEW_MIN_SECONDS)
  assert.equal(previewDuration('x'.repeat(10)), PREVIEW_MIN_SECONDS, 'a short prompt takes the floor')
  assert.equal(previewDuration('x'.repeat(100000)), PREVIEW_MAX_SECONDS, 'a long prompt takes the ceiling')
  assert.ok(PREVIEW_MIN_SECONDS < PREVIEW_MAX_SECONDS, 'the band is inverted')
})

test('between the clamps the pace is constant, not the duration', () => {
  // The point of timing it at all: two prompts of different lengths scroll at
  // the same characters-per-second, so the long one does not blur past.
  const mid = PREVIEW_CHARS_PER_SECOND * ((PREVIEW_MIN_SECONDS + PREVIEW_MAX_SECONDS) / 2)
  const a = Math.round(mid)
  const b = Math.round(mid * 1.4)
  const da = previewDuration('x'.repeat(a))
  const db = previewDuration('x'.repeat(b))
  assert.ok(db > da, 'a longer prompt did not get a longer pass')
  const paceA = a / da
  const paceB = b / db
  // Within one second of rounding on a ~60 char/s pace.
  assert.ok(Math.abs(paceA - paceB) < PREVIEW_CHARS_PER_SECOND * 0.08,
    `pace drifted: ${paceA.toFixed(1)} vs ${paceB.toFixed(1)} chars/s`)
})

test('the real library lands inside the band, so neither clamp is the common case', () => {
  // Vacuity guard on the two tests above: if every shipped prompt were at a
  // clamp, the pace assertion would be about nothing the product renders.
  const durations = COMMUNITY_PROMPTS.map((p) => previewDuration(p.text))
  assert.ok(durations.length >= 20, 'the library shrank; this fixture is stale')
  const inBand = durations.filter((d) => d > PREVIEW_MIN_SECONDS && d < PREVIEW_MAX_SECONDS)
  assert.ok(inBand.length > durations.length / 2,
    `only ${inBand.length}/${durations.length} shipped prompts are between the clamps`)
})

test('PromptCard actually renders the prompt into the preview, and calls the helper', () => {
  // THE WIRING. Reverting any one of these leaves the helper tests green and
  // the feature gone.
  const src = stripComments(read('src/components/prompt/PromptCard.jsx'))
  assert.match(src, /previewDuration/, 'PromptCard no longer times the pass')
  assert.match(src, /'--pl-preview-dur':\s*`\$\{previewDuration\(text\)\}s`/,
    'the per-card duration is not being written to the custom property')
  assert.match(src, /data-preview/, 'the stable test hook is gone from the preview window')
  assert.match(src, /className="pl-card-preview-text">\{text\}</,
    'the preview no longer renders the prompt text itself')
  // aria-hidden is load-bearing: without it a two-thousand-character prompt
  // becomes the accessible name of a role="button".
  assert.match(src, /className="pl-card-preview"[^>]*aria-hidden="true"/,
    'the preview window is not hidden from the accessibility tree')
  assert.match(src, /aria-label=\{`Open prompt: \$\{name\}`\}/,
    'the card lost its explicit accessible name')
})

test('the preview window is not a scroll container', () => {
  // Lenis intercepts the wheel globally and `allowNestedScroll` hands a gesture
  // to whatever element under the pointer can still scroll. Twenty nested
  // scrollers in a gallery is a fight with the scroll engine; overflow:hidden
  // plus a transform is simply invisible to it. The rendered proof is in
  // 54-prompt-preview-motion; this pins the declaration that makes it true.
  const css = stripComments(ALL_CSS)
  const rule = /\.pl-card-preview\{([^}]*)\}/.exec(css)
  assert.ok(rule, '.pl-card-preview has no rule at all')
  assert.match(rule[1], /overflow:hidden/, 'the preview window is no longer overflow:hidden')
  assert.ok(!/overflow-y:(auto|scroll)/.test(rule[1]), 'the preview window became scrollable')
})

test('the scroll plays on intent, never on its own', () => {
  // WCAG 2.2 SC 2.2.2: automatic motion past five seconds alongside other
  // content needs a pause control, and this layout has nowhere to put one. The
  // animation is therefore declared paused and released by hover and focus.
  const css = stripComments(ALL_CSS)
  const rule = /\.pl-card-preview-text\{([^}]*)\}/.exec(css)
  assert.ok(rule, '.pl-card-preview-text has no rule at all')
  assert.match(rule[1], /animation:pl-preview-scroll/, 'the preview animation is gone')
  assert.match(rule[1], /animation-play-state:paused/,
    'the preview animation is no longer paused by default, so twelve cards autoplay')
  assert.match(css, /\.pl-card:hover \.pl-card-preview-text,\.pl-card:focus-visible \.pl-card-preview-text\{animation-play-state:running\}/,
    'hover and focus no longer release the animation')
  // A card is reached by keyboard, so focus must be in that list.
  assert.match(css, /:focus-visible \.pl-card-preview-text/, 'keyboard focus cannot start the preview')
})

test('the scroll never travels past the end of a prompt that already fits', () => {
  // min(0px, …) is what stops a short prompt sliding up to reveal blank space.
  // Without it the keyframe is a positive translation on every short card.
  const css = stripComments(ALL_CSS)
  const frames = /@keyframes pl-preview-scroll\{([^}]*\}[^}]*)\}/.exec(css)
  assert.ok(frames, 'the preview keyframes are gone')
  assert.match(frames[1], /translateY\(min\(0px,/,
    'the travel is no longer clamped at zero, so a short prompt scrolls into empty space')
  assert.match(frames[1], /var\(--pl-preview-h\)/,
    'the travel no longer reads the window height it is supposed to clear')
})

test('the placeholder block is the same height as the window it stands in for', () => {
  // The teased row has to read as the NEXT ROW of the same library. It was
  // tuned to a literal 104px against a card that was a title and three tags;
  // the card is now an artefact window, so the placeholder reads the height
  // rather than restating it — the rule the .lockt-stripes comment already
  // states for the palette placeholders.
  const css = stripComments(ALL_CSS)
  assert.match(css, /\.pl-gallery\{[^}]*--pl-preview-h:172px/,
    'the gallery no longer publishes the preview window height')
  assert.match(css, /\.lockt-lines\{[^}]*min-height:var\(--pl-preview-h,\s*104px\)/,
    'the locked placeholder restates a height instead of reading the gallery token')
  assert.match(css, /\.pl-gallery\{grid-template-columns:1fr;--pl-preview-h:150px\}/,
    'the narrow band no longer retunes the window height, so the seam drifts there')
})
