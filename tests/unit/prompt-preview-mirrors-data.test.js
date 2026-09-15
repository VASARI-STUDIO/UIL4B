// A COPY OF THREE FACTS, AND THE TEST THAT STOPS IT BECOMING A LIE.
//
// src/data/communityPromptsPreview.js holds a count and three titles so that
// SurfaceLanding — one of the five pages App.jsx loads EAGERLY — can render the
// Prompt Library card without importing COMMUNITY_PROMPTS. It used to import
// the array, and measured on a production build 2026-09-15 that put all 20
// prompts, 27,756 bytes of source, into index-*.js: the chunk every visitor
// downloads on every route, including /privacy and /terms, to print the number
// 20 and three strings.
//
// Computing the values is not an option, because computing them means importing
// the array, which is the thing being avoided. So they are copied — and this is
// the drift test that makes a copy safe, the same shape the repo already uses
// for plans.js ↔ api/_lib/plans.js and DESIGN.md ↔ global.css.
//
// This file is NOT a security guard and must not be mistaken for one. Moving
// bytes to a lazy chunk does not make them secret; a static asset is served to
// anybody who asks. The secrecy question is
// [locked-library-values-still-in-bundle] and is a founder call about a
// serverless route. What is asserted here is that the card stays truthful and
// that the eager page stays light.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'
import { PROMPT_COUNT, PROMPT_PREVIEW_TITLES } from '../../src/data/communityPromptsPreview.js'

test('the count on the /discover card is the real number of prompts', () => {
  assert.equal(PROMPT_COUNT, COMMUNITY_PROMPTS.length,
    `the card says "${PROMPT_COUNT} prompts" and the library holds `
    + `${COMMUNITY_PROMPTS.length}. Update PROMPT_COUNT in communityPromptsPreview.js.`)
})

test('the three preview titles are the first three, in the library order', () => {
  const actual = COMMUNITY_PROMPTS.slice(0, 3).map((p) => p.title || p.name || p.label)
  assert.deepEqual(PROMPT_PREVIEW_TITLES, actual,
    'the titles on the /discover card are no longer the first three prompts. They are '
    + 'a copy kept so an eagerly-loaded page need not import 27.7 KB of prompt data — '
    + 'see the header of communityPromptsPreview.js.')
})

test('no locked prompt title is published on the card', () => {
  // THE ONE THAT IS NOT MERE TIDINESS. This card renders on /discover with no
  // gate in front of it. For a prompt the TITLE is the product, which is why
  // PromptCard's locked branch was deleted rather than left dormant — it used
  // to render `p.title || p.text.slice(0, 60)` into a card it had just
  // declared locked. Reordering COMMUNITY_PROMPTS so a Pro prompt lands in the
  // first three would publish it here, quietly, on a public page.
  const lockedTitles = new Set(COMMUNITY_PROMPTS
    .filter((p) => !p.free)
    .map((p) => p.title || p.name || p.label))

  for (const title of PROMPT_PREVIEW_TITLES) {
    assert.ok(!lockedTitles.has(title),
      `"${title}" belongs to a LOCKED prompt and is being printed on /discover, which `
      + 'has no gate. For a prompt the title is the product.')
  }

  // POSITIVE CONTROL: if every prompt were free the assertion above would pass
  // while testing nothing, and that is also what deleting the `free` flag looks
  // like.
  assert.ok(lockedTitles.size > 0,
    'no prompt is locked, so the check above is vacuous — the free/locked split has '
    + 'gone from communityPrompts.js')
})

test('the preview module does not re-export the prompt data', async () => {
  // The whole point is that importing this module pulls nothing else in. A
  // convenience re-export would silently restore the 27.7 KB to the eager
  // chunk and every assertion above would still pass.
  const mod = await import('../../src/data/communityPromptsPreview.js')
  assert.deepEqual(Object.keys(mod).sort(), ['PROMPT_COUNT', 'PROMPT_PREVIEW_TITLES'],
    'communityPromptsPreview.js exports something beyond the count and the titles. If it '
    + 'now re-exports COMMUNITY_PROMPTS, the eager chunk is carrying the data again.')
})
