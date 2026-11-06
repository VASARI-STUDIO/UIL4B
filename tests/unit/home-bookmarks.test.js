// THE BOOKMARKS SECTION: SOURCE RULES AND DATA RULES.
//
// The tour must be driven only by the page's one autoplay owner, hold on a
// pause button, and not run at all under reduced motion. The folder, tool and
// timing data the lines and the sub-line depend on must stay consistent.
//
// Each test names the mutation that makes it fail.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { TOOL_COUNT } from '../../src/components/spectrum/spectrumFacts.js'
import { BOOKMARK_COUNT } from '../../src/components/home/bookmarkFolders.js'
import {
  CONTRAST_TEXT, CYCLE_MS, FOLDERS, SETS, STEP_MS, TOOLS,
} from '../../src/components/home/bookmarksData.js'

const HOOK = stripComments(read('src/components/home/useBookmarkTour.js'))
const VIEW = stripComments(read('src/components/home/HomeBookmarks.jsx'))

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

test('the tour is driven by the autoplay owner and watches nothing itself', () => {
  // Mutation: delete the useAutoplaySlot call, or add `new IntersectionObserver` to the hook.
  assert.match(HOOK, /useAutoplaySlot\('tour'/)
  assert.doesNotMatch(HOOK, /IntersectionObserver/)
  assert.doesNotMatch(VIEW, /IntersectionObserver/)
})

test('nothing listens for scroll', () => {
  // Mutation: add `addEventListener('scroll', ...)` or an `onScroll` prop to either file.
  for (const src of [HOOK, VIEW]) {
    assert.doesNotMatch(src, /['"]scroll['"]/)
    assert.doesNotMatch(src, /onScroll/)
  }
})

test('there is a pause button, and reduced motion removes the tour and the button', () => {
  // Mutation: remove the button, or its `mode !== 'off'` guard.
  assert.match(VIEW, /className="bm-pause"/)
  assert.match(VIEW, /mode !== 'off'/)
  assert.match(HOOK, /prefersReducedMotion\(\)/)
  assert.match(HOOK, /reduced \? 'off' : chosen/)
  // Mutation: let the fill render without `run` (the clock only exists while running).
  assert.match(VIEW, /i === open && run \?/)
})

test('every folder holds as many bookmarks as it says', () => {
  // Mutation: add or drop a row in ITEMS, or change a count in bookmarkFolders.js.
  FOLDERS.forEach((f) => assert.equal(f.items.length, f.count, f.name))
  assert.equal(FOLDERS.reduce((n, f) => n + f.items.length, 0), BOOKMARK_COUNT)
  assert.equal(SETS.reduce((n, lines) => n + lines.length, 0), BOOKMARK_COUNT)
})

test('the window lists exactly the live tools', () => {
  // Mutation: add a tool to TOOL_ROWS that is not live, or retire a live one.
  assert.equal(TOOLS.length, TOOL_COUNT)
  assert.equal(new Set(TOOLS.map((t) => t.id)).size, TOOL_COUNT)
})

test('the sample contrast reads 5.6 and the cycle is 12.8 seconds', () => {
  // Mutation: change the foreground or background colour; change STEP_MS.
  assert.equal(CONTRAST_TEXT, '5.6')
  assert.equal(STEP_MS, 3200)
  assert.equal(CYCLE_MS, 12800)
})

test('the sub-line is derived from the two counts, never typed', () => {
  // Mutation: type "13" or "26" into the sub-line.
  assert.match(VIEW, /\{TOOL_COUNT\} tools that would otherwise be \{BOOKMARK_COUNT\} tabs/)
})
