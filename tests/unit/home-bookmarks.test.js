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
  CONTRAST_TEXT, CYCLE_MS, FOLDERS, GROUPS, SETS, STEP_MS, TOOLS,
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

// ── the layout below 1024px ─────────────────────────────────────────────────

const PHONE = stripComments(read('src/components/home/BookmarkPhone.jsx'))
const PANE = stripComments(read('src/components/home/BookmarkPhonePane.jsx'))

test('the phone layout shares the section\'s one tour and watches only through the autoplay owner', () => {
  // Mutation: pass `stageEl` alone to the hook, or drop either ref callback from the JSX.
  assert.match(VIEW, /useBookmarkTour\(watched, groupOf, rowsOf\)/)
  assert.match(VIEW, /\[stageEl, phoneStageEl, phonePaneEl\]/)
  assert.match(VIEW, /<BookmarkPhone tour=\{tour\} stageRef=\{setPhoneStageEl\} paneRef=\{setPhonePaneEl\} \/>/)
  assert.match(PHONE, /data-r7ap-stage ref=\{stageRef\}/)
  assert.match(PANE, /data-r7ap-pane ref=\{paneRef\}/)
  // Mutation: add an observer or a scroll listener to the phone files.
  for (const src of [PHONE, PANE]) {
    assert.doesNotMatch(src, /IntersectionObserver/)
    assert.doesNotMatch(src, /['"]scroll['"]|onScroll/)
  }
})

test('the phone layout has its own pause button that reduced motion removes', () => {
  // Mutation: remove the `mode !== 'off'` guard, or point the button at something other than the tour's toggle.
  assert.match(PHONE, /mode !== 'off' \? \(\s*<button type="button" className="bmp-pb"/)
  assert.match(PHONE, /onClick=\{tour\.toggle\}/)
  // Mutation: let the fill render without `run`.
  assert.match(PHONE, /i === open && run \?/)
})

test('a folder button and a pair of bookmarks hand control to the reader through the tour', () => {
  // Mutation: set `onClick` to a local handler that does not call the tour.
  assert.match(PHONE, /onClick=\{tour\.folder\(i\)\.onClick\}/)
  assert.match(PHONE, /onClick=\{\(\) => tour\.togglePair\(p\.j\)\}/)
})

test('every phone pair is two bookmarks that share one tool', () => {
  // The phone draws each folder's bookmarks two at a time under one tool.
  // Mutation: add a bookmark to a folder without its twin, or reorder two rows in ITEMS.
  FOLDERS.forEach((f) => {
    assert.equal(f.items.length % 2, 0, `${f.name} holds an odd number of bookmarks`)
    for (let k = 0; k < f.items.length; k += 2) {
      assert.equal(f.items[k][1], f.items[k + 1][1], `${f.items[k][0]} and ${f.items[k + 1][0]} do not share a tool`)
    }
  })
})

test('the phone toolkit links every tool, grouped by the four folders\' colours', () => {
  // Mutation: filter the list, or link to something other than the tool's own route.
  assert.match(PHONE, /<Link className=\{hot && hot\.j === j \? 'bmp-tool hot' : 'bmp-tool'\} to=\{tool\.href\}/)
  assert.match(PHONE, /TOOLS\.map\(\(tool, j\) => \(tool\.group === g \?/)
  assert.equal(GROUPS.length, FOLDERS.length)
  GROUPS.forEach((_, g) => assert.ok(TOOLS.some((t) => t.group === g), `group ${g} holds no tool`))
  TOOLS.forEach((t) => assert.ok(t.href && t.href.startsWith('/'), `${t.id} has no route`))
})

test('tapping a pair stops the tour, lights its tool, and a second tap or a new folder puts it out', () => {
  // Mutation: drop `stop()`, drop the toggle-off branch, or drop the `at !== open` clause in `lit`.
  assert.match(HOOK, /const togglePair = \(tool\) => \{\s*stop\(\)/)
  assert.match(HOOK, /cur && cur\.j === tool && cur\.src === 'tap' && cur\.at === open \? null : \{ j: tool, ks: rowsOf\(tool\), src: 'tap', at: open \}/)
  assert.match(HOOK, /const lit = hot && hot\.src === 'tap' && hot\.at !== open \? null : hot/)
  // Mutation: return `hot` instead of `lit`, or forget to return togglePair.
  assert.match(HOOK, /hot: lit,/)
  assert.match(HOOK, /\r?\n {4}togglePair,/)
})

test('the tour clock reaches every folder once and the phone and desktop share the folder count', () => {
  // Mutation: change the modulus in `onFillEnd`, or add a fifth folder to one list only.
  assert.match(HOOK, /setOpen\(\(cur\) => \(cur \+ 1\) % FOLDERS\.length\)/)
  assert.equal(FOLDERS.length, 4)
  assert.equal(SETS.length, FOLDERS.length)
})
