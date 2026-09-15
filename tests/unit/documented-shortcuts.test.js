// A DOCUMENTED SHORTCUT THAT NOTHING BINDS IS WORSE THAN AN UNDOCUMENTED ONE.
//
// /info is the page a visitor opens because something did not work. Measured
// 2026-09-15, two of the four rows in its "Keyboard shortcuts" list were
// instructions that did nothing, and one of them appeared twice on the page:
//
//   Ctrl/⌘ + K — "command palette".  That palette is PillNav's and opens on
//     `/`; PillNav guards the handler with `!e.metaKey && !e.ctrlKey`, so the
//     documented chord is one it explicitly excludes. Listed in the shortcuts
//     table AND in the getting-started list.
//
//     ⌘K itself is NOT unbound, and the distinction matters to anyone reading
//     this later: HomeCommandBar.jsx focuses the homepage search bar on ⌘K and
//     prints a ⌘K keycap next to it, which is honest — that keycap names the
//     control it sits on. /info's error was attributing that one bar's chord to
//     a different, global control on every page.
//   ? — "show all shortcuts".  Bound nowhere in src/. There is no overlay.
//
// Both are the same failure: the sentence was true of some earlier build, the
// binding moved, and nothing could notice. Copy that describes behaviour has to
// be generated from the behaviour or checked against it, and this file is the
// check — the same mirror-plus-drift-test shape the repo uses for plans.js,
// DESIGN.md and the trial ladder.
//
// WHAT THIS CANNOT DO: prove the handler is reachable, or that the key works in
// a browser. It proves the documented key and the bound key are the same
// string, which is the drift that actually happened. The rendered behaviour is
// 26-command-palette's job.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DOCUMENTED_SHORTCUTS, SEARCH_KEY } from '../../src/config/shortcuts.js'

const root = process.cwd()
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

// Comments quote the bindings they explain — shortcuts.js names each binding in
// prose and PillNav.jsx describes its own guard — so a search that does not
// strip them finds the explanation and passes on a file with no handler left.
const code = (rel) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n')

test('every shortcut /info documents is bound in the file it names', () => {
  // POSITIVE CONTROL. Each assertion below is per-row, so an empty table
  // satisfies all of them — which is what deleting the export would look like.
  assert.ok(DOCUMENTED_SHORTCUTS.length >= 3,
    `only ${DOCUMENTED_SHORTCUTS.length} shortcuts are documented, so this test is `
    + 'guarding almost nothing.')

  for (const { keys, what, file, binding } of DOCUMENTED_SHORTCUTS) {
    assert.ok(keys.length > 0 && keys.every((k) => typeof k === 'string' && k),
      `the "${what}" row documents no key`)

    const source = code(file)
    assert.ok(source.includes(binding),
      `/info tells the visitor to press ${keys.join(' + ')} for "${what}", and `
      + `${file} does not contain \`${binding}\`. Either the binding moved and the `
      + 'page is now describing a key that does nothing — which is exactly how '
      + 'Ctrl/⌘ + K survived on this page — or the row should go.')
  }
})

test('the nav reads the search key from the config rather than a literal', () => {
  // The two halves drifted precisely BECAUSE each held its own copy. Pinning
  // the documented string alone would let the handler move back to a literal
  // and start disagreeing again silently.
  const nav = code('src/components/PillNav.jsx')
  assert.ok(nav.includes('SEARCH_KEY'),
    'PillNav.jsx no longer mentions SEARCH_KEY, so the binding and the page that '
    + 'documents it are free to disagree again.')
  assert.ok(!/e\.key === '\/'/.test(nav),
    "PillNav.jsx has gone back to a literal `e.key === '/'`. That is the shape "
    + 'that let /info document a different key for months; import SEARCH_KEY.')
})

test('the shortcuts /info used to claim are not quietly back', () => {
  const page = read('src/pages/InfoCentre.jsx')
  // Comments are NOT stripped here on purpose: the note explaining the deletion
  // quotes the old chord, and the assertion is about what the page RENDERS. So
  // this asserts on the JSX element, which a comment cannot contain.
  assert.ok(!page.includes('<kbd>K</kbd>'),
    'InfoCentre.jsx renders a <kbd>K</kbd> again. The command palette opens on '
    + `\`${SEARCH_KEY}\`; Ctrl/⌘ + K is excluded by the handler's own guard.`)
  assert.ok(!page.includes('<kbd>?</kbd>'),
    'InfoCentre.jsx renders <kbd>?</kbd> again. Nothing in src/ binds `?` and '
    + 'there is no shortcut overlay for it to open.')
})

test('nothing on /info promises a pin, a sidebar or a dashboard', () => {
  // The deleted bullet read: "drag any tool from the sidebar onto the dashboard,
  // or right-click it to pin." WorkspaceContext exports pinned, togglePinned,
  // addPinned and reorderPinned; no file under src/pages or src/components
  // calls any of them, and the page renders no aside, no dashboard and no pin
  // control. Three instructions in one sentence, none of them performable.
  const rendered = read('src/pages/InfoCentre.jsx')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  for (const claim of ['right-click it to pin', 'onto the dashboard', 'from the sidebar']) {
    assert.ok(!rendered.includes(claim),
      `/info promises "${claim}" again, and that UI does not exist. If it has `
      + 'been built, delete this assertion with the commit that built it.')
  }
})
